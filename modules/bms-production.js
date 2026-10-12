const prodDateAdd=BMSCore.dateAdd;
async function productionBase(options={}){
  const includeRhppCosts=options.includeRhppCosts!==false;
  const [ar,br,cr,cir,abr,er,ir,psr,mhr,lpr,costr]=await Promise.all([
    db.from('logistics_contract_assignments').select('id,barn_id,ppl_id,master_contract_id,performance_template_name,start_date,active,created_at,cycle_type').order('created_at',{ascending:false}),
    db.from('barns').select('id,code,name,active').order('code'),
    db.from('contracts').select('id,number,doc_price,pre_starter_price,starter_price,finisher_price,ovk_price,ovk_price_basis,ovk_vat_percent').is('cycle_id',null),
    db.from('chick_ins').select('*').order('arrived_on',{ascending:false}),
    db.from('logistics_contract_assignment_abks').select('id,contract_assignment_id,abk_id,initial_birds,feed_pre_bags,feed_starter_bags,feed_finisher_bags,basics_locked_at'),
    db.from('employees').select('id,code,name,kind,active').eq('kind','ABK').order('code'),
    db.from('items').select('id,code,name,category,feed_phase,unit,kg_per_unit,active').eq('active',true).order('code'),
    db.from('performance_standards').select('*'),
    db.from('marketing_contract_harvests').select('id,contract_assignment_id,harvested_on,birds,net_weight_kg,avg_weight_kg,total_amount'),
    db.from('contract_live_prices').select('contract_id,min_weight_kg,max_weight_kg,price_per_kg').order('min_weight_kg'),
    includeRhppCosts
      ? db.from('logistics_rhpp_cost_summary').select('contract_assignment_id,doc_cost,feed_cost,ovk_cost,net_sapronak_cost')
      : Promise.resolve({data:[],error:null})
  ]);
  const err=[ar,br,cr,cir,abr,er,ir,psr,mhr,lpr,costr].find(x=>x.error)?.error;
  const allAssignments=ar.data||[];
  const assignments=profile?.role==='PPL'?allAssignments.filter(a=>a.ppl_id===session?.user?.id):allAssignments;
  const allowedIds=new Set(assignments.map(a=>a.id));
  const allowedBarnIds=new Set(assignments.map(a=>a.barn_id).filter(Boolean));
  const scoped=x=>profile?.role==='PPL'?(x||[]).filter(v=>allowedIds.has(v.contract_assignment_id)):(x||[]);
  const visibleBarns=profile?.role==='PPL'?(br.data||[]).filter(b=>allowedBarnIds.has(b.id)):(br.data||[]);
  return {err,assignments,barns:visibleBarns,masters:cr.data||[],chicks:scoped(cir.data),links:scoped(abr.data),abks:er.data||[],items:ir.data||[],feedItems:(ir.data||[]).filter(i=>i.category==='PAKAN'),standards:psr.data||[],harvests:scoped(mhr.data),livePrices:lpr.data||[],rhppCosts:scoped(costr.data),scopeRows:scoped};
}
function estimateContractLivePrice(d,a,bw){
  const w=prodNum(bw);
  const row=(d.livePrices||[]).find(p=>
    p.contract_id===a?.master_contract_id&&
    w>=prodNum(p.min_weight_kg)&&
    (p.max_weight_kg==null||w<prodNum(p.max_weight_kg))
  );
  return prodNum(row?.price_per_kg);
}
function estimateContractHarvestValue(d,a,harvests){
  return (harvests||[]).reduce((sum,h)=>{
    const birds=prodNum(h.birds);
    const kg=prodNum(h.net_weight_kg);
    const bw=prodNum(h.avg_weight_kg)||(birds>0?kg/birds:0);
    return sum+kg*estimateContractLivePrice(d,a,bw);
  },0);
}
function estimateStandardFcr(d,a,age){
  const rows=(d.standards||[])
    .filter(s=>s.contract_id===a?.master_contract_id&&s.template_name===a?.performance_template_name&&s.std_fcr!=null)
    .sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days));
  if(!rows.length)return 0;
  const target=prodNum(age);
  const exact=rows.find(s=>prodNum(s.age_days)===target);
  if(exact)return prodNum(exact.std_fcr);
  const lower=[...rows].reverse().find(s=>prodNum(s.age_days)<=target);
  const upper=rows.find(s=>prodNum(s.age_days)>=target);
  if(lower&&upper&&prodNum(upper.age_days)!==prodNum(lower.age_days)){
    const span=prodNum(upper.age_days)-prodNum(lower.age_days);
    const ratio=(target-prodNum(lower.age_days))/span;
    return prodNum(lower.std_fcr)+(prodNum(upper.std_fcr)-prodNum(lower.std_fcr))*ratio;
  }
  return prodNum((lower||upper)?.std_fcr);
}
function estimateFeedPricePerKg(contract,item){
  const phase=String(item?.feed_phase||'').toLowerCase();
  if(phase.includes('pre'))return prodNum(contract?.pre_starter_price);
  if(phase.includes('starter'))return prodNum(contract?.starter_price);
  if(phase.includes('fin'))return prodNum(contract?.finisher_price);
  return 0;
}
function estimateSapronakSnapshot({d,a,ci,recToDate,shipments,shipmentItems,externalShipments,externalShipmentItems,returns,returnItems,items,estimatedOn,officialFeedStock=[]}){
  const contract=d.masters.find(c=>c.id===a?.master_contract_id);
  const until=String(estimatedOn||'');
  const shipIds=new Set((shipments||[])
    .filter(s=>s.contract_assignment_id===a?.id&&(!until||String(s.shipment_date||'')<=until))
    .map(s=>s.id));
  const externalShipIds=new Set((externalShipments||[])
    .filter(s=>s.contract_assignment_id===a?.id&&(!until||String(s.shipment_date||'')<=until))
    .map(s=>s.id));
  const returnIds=new Set((returns||[])
    .filter(r=>r.contract_assignment_id===a?.id&&(!until||String(r.return_date||'')<=until))
    .map(r=>r.id));

  const incoming=new Map(), returned=new Map(), used=new Map();
  const ensure=(map,itemId)=>{
    if(!map.has(itemId))map.set(itemId,{qty:0,kg:0,value:0});
    return map.get(itemId);
  };
  (shipmentItems||[]).filter(v=>shipIds.has(v.shipment_id)).forEach(v=>{
    const x=ensure(incoming,v.item_id);
    x.qty+=prodNum(v.quantity);x.kg+=prodNum(v.quantity_kg);x.value+=prodNum(v.quantity)*prodNum(v.unit_price);
  });
  (externalShipmentItems||[]).filter(v=>externalShipIds.has(v.external_shipment_id)).forEach(v=>{
    const x=ensure(incoming,v.item_id);
    x.qty+=prodNum(v.quantity);x.kg+=prodNum(v.quantity_kg);
    x.value+=prodNum(v.quantity)*prodNum(v.purchase_unit_price);
  });
  (returnItems||[]).filter(v=>returnIds.has(v.return_id)).forEach(v=>{
    const x=ensure(returned,v.item_id);
    x.qty+=prodNum(v.quantity);x.kg+=prodNum(v.quantity_kg);x.value+=prodNum(v.quantity)*prodNum(v.unit_price);
  });
  (recToDate||[]).filter(r=>r.feed_item_id&&prodNum(r.feed_kg)>0).forEach(r=>{
    used.set(r.feed_item_id,prodNum(used.get(r.feed_item_id))+prodNum(r.feed_kg));
  });

  const rows=[];
  const initial=ci?Math.max(0,prodNum(ci.received)-prodNum(ci.doa)):0;
  const docPrice=prodNum(contract?.doc_price);
  rows.push({
    key:'DOC',category:'DOC',label:'DOC / Chick-In',unit:'EKOR',
    incoming:initial,usedOrReturn:0,balance:initial,price:docPrice,value:initial*docPrice,
    source:'CHICK_IN'
  });

  for(const stock of officialFeedStock||[]){
    const item=(items||[]).find(i=>i.id===stock.item_id)||{
      id:stock.item_id,code:stock.code,name:stock.name,category:'PAKAN',feed_phase:null,unit:stock.unit,kg_per_unit:stock.kg_per_unit
    };
    const kgPerUnit=prodNum(stock.kg_per_unit||item.kg_per_unit);
    const usedKg=prodNum(stock.used_units)*kgPerUnit;
    const balanceKg=prodNum(stock.remaining_kg);
    const availableKg=usedKg+balanceKg;
    const priceKg=estimateFeedPricePerKg(contract,item);
    rows.push({
      key:stock.item_id,category:'PAKAN',
      label:[item.name,item.feed_phase].filter(Boolean).join(' · '),
      unit:'Kg',incoming:availableKg,usedOrReturn:usedKg,balance:balanceKg,
      price:priceKg,value:usedKg*priceKg,source:'PRODUCTION_FEED_STOCK_AS_OF'
    });
  }

  const itemIds=new Set([...incoming.keys(),...returned.keys(),...used.keys()]);
  for(const itemId of itemIds){
    const item=(items||[]).find(i=>i.id===itemId);
    if(!item||item.category==='DOC'||item.category==='PAKAN')continue;
    const inc=incoming.get(itemId)||{qty:0,kg:0,value:0};
    const ret=returned.get(itemId)||{qty:0,kg:0,value:0};

    const netQty=inc.qty-ret.qty;
    const netValue=inc.value-ret.value;
    const price=netQty!==0?netValue/netQty:(inc.qty?inc.value/inc.qty:0);
    rows.push({
      key:itemId,category:item.category||'LAINNYA',label:item.name||item.code||'Sapronak',
      unit:item.unit||'satuan',incoming:inc.qty,usedOrReturn:ret.qty,balance:netQty,
      price,value:netValue,source:'LOGISTIK'
    });
  }

  const order={DOC:1,PAKAN:2,OVK:3,LAINNYA:4};
  rows.sort((u,v)=>(order[u.category]||9)-(order[v.category]||9)||String(u.label).localeCompare(String(v.label)));
  return {
    rows,
    totalCost:rows.reduce((sum,r)=>sum+prodNum(r.value),0),
    feedUsedKg:rows.filter(r=>r.category==='PAKAN').reduce((sum,r)=>sum+prodNum(r.usedOrReturn),0),
    feedIncomingKg:rows.filter(r=>r.category==='PAKAN').reduce((sum,r)=>sum+prodNum(r.incoming),0),
    feedBalanceKg:rows.filter(r=>r.category==='PAKAN').reduce((sum,r)=>sum+prodNum(r.balance),0)
  };
}
function prodAssignmentOption(d,a){
  return assignmentIdentity(d.assignments,d.barns,d.masters,a);
}
function prodActiveBarnOption(d,a){
  return assignmentIdentity(d.assignments,d.barns,d.masters,a);
}
async function chickInPage(){
  const d=await productionBase();
  window.__chickInEdit=window.__chickInEdit||'';
  const editRow=d.chicks.find(x=>x.id===window.__chickInEdit)||null;
  const optionHtml=d.assignments.filter(a=>a.active).map(a=>'<option value="'+esc(a.id)+'" '+(editRow?.contract_assignment_id===a.id?'selected':'')+'>'+esc(prodAssignmentOption(d,a))+'</option>').join('');

  let html='<section class="panel"><h3>'+(editRow?'Edit Chick-In / DOC Masuk':'Chick-In / DOC Masuk')+'</h3><form id="prodChick" class="form-vertical">'+
    '<label>Kandang Aktif<select name="assignment" required '+(editRow?'disabled':'')+'><option value="">Pilih</option>'+optionHtml+'</select></label>'+
    '<input type="hidden" name="date" value="'+esc(editRow?.arrived_on||prodToday())+'">'+
    '<label>DOC In<input type="text" inputmode="numeric" data-number="1" name="received" value="'+(editRow?fmtNumber(editRow.received):'')+'" required></label>'+
    '<label>DOC Mati Box<input type="text" inputmode="numeric" data-number="1" name="doa" value="'+(editRow?fmtNumber(editRow.doa||0):'0')+'" required></label>'+
    '<label>Bobot Rata2<input type="text" inputmode="decimal" data-number="1" name="avg_weight" value="'+(editRow&&prodNum(editRow.avg_weight)>0?fmtNumber(editRow.avg_weight):'')+'" placeholder="Opsional, gram"></label>'+
    '<label>Nomor DO<input name="delivery_number" value="'+esc(editRow&&String(editRow.delivery_number||'').match(/^DOC-PLACEHOLDER-/i)?'':(editRow?.delivery_number||''))+'" placeholder="Opsional"></label>'+
    '<p id="prodChickNet" class="muted">Populasi awal bersih: 0 ekor</p>'+
    '<section class="panel" style="margin:0"><h4>Pembagian ABK</h4>'+
      '<p class="muted">Pilih ABK kandang dan bagi jumlah DOC datang. Total ABK wajib sama dengan DOC In/Kedatangan. DOC Mati Box tetap dicatat terpisah. Data ini langsung menjadi dasar Liga ABK.</p>'+
      '<div id="chickAbkRows"></div>'+
      '<button type="button" id="addChickAbk">+ Tambah ABK</button>'+
      '<p id="chickAbkTotal" class="muted">Pembagian ABK: 0 / 0 ekor</p>'+
    '</section>'+
    '<div class="inline-actions"><button type="submit">'+(editRow?'Simpan Perubahan':'Simpan Chick-In')+'</button>'+(editRow?'<button type="button" id="chickEditCancel">Batal Edit</button>':'')+'</div></form></section>';

  html+='<section class="panel"><h3>Data Chick-In</h3><div class="tablewrap"><table><thead><tr>'+
    '<th>Kandang / Kontrak</th><th>DOC In</th><th>DOC Mati Box</th><th>Populasi Awal Bersih</th><th>ABK</th><th>Bobot Rata2</th><th>Nomor DO</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    d.chicks.filter(x=>x.contract_assignment_id).map(x=>{
      const a=d.assignments.find(a=>a.id===x.contract_assignment_id);
      const net=Math.max(0,prodNum(x.received)-prodNum(x.doa));
      const weight=prodNum(x.avg_weight)>0?prodFmt(x.avg_weight,2)+' g':'-';
      const rawDo=String(x.delivery_number||'').trim();
      const doText=(!rawDo||/^DOC-PLACEHOLDER-/i.test(rawDo))?'-':rawDo;
      const links=d.links.filter(l=>l.contract_assignment_id===x.contract_assignment_id);
      const abkText=links.length?links.map(l=>{
        const e=d.abks.find(v=>v.id===l.abk_id);
        return (e?.name||e?.code||'ABK')+' '+prodFmt(l.initial_birds,0);
      }).join(' · '):'-';
      return '<tr><td>'+esc(a?prodAssignmentOption(d,a):'-')+'</td><td>'+prodFmt(x.received,0)+'</td><td>'+prodFmt(x.doa,0)+'</td><td><strong>'+prodFmt(net,0)+'</strong></td><td>'+esc(abkText)+'</td><td>'+weight+'</td><td>'+esc(doText)+'</td><td>'+(a?.active?'<div class="inline-actions"><button type="button" data-edit-chick="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('chick_ins',x.id)+'</div>':'<strong>Terkunci</strong>')+'</td></tr>';
    }).join('')+
    '</tbody></table></div></section>';

  layout(html);
  bindNumberInputs();
  if(d.err)msg(d.err.message);

  const form=document.getElementById('prodChick');
  const netEl=document.getElementById('prodChickNet');
  const abkRowsEl=document.getElementById('chickAbkRows');
  const abkTotalEl=document.getElementById('chickAbkTotal');
  const addAbkBtn=document.getElementById('addChickAbk');
  let chickAbks=[];

  if(!editRow){
    form.assignment.onchange=async()=>{
      const existing=d.chicks.find(x=>x.contract_assignment_id===form.assignment.value);
      if(existing){
        window.__chickInEdit=existing.id;
        await chickInPage();
        msg('Chick-In siklus ini sudah ada. Form otomatis masuk mode Edit.',true);
      }
    };
  }

  const currentAssignmentId=()=>editRow?.contract_assignment_id||form.assignment.value||'';
  const activeAbks=d.abks.filter(e=>e.active);

  const syncAbkRows=()=>{
    abkRowsEl.querySelectorAll('[data-chick-abk-id]').forEach(sel=>{
      const idx=Number(sel.dataset.chickAbkId);
      if(chickAbks[idx])chickAbks[idx].abk_id=sel.value;
    });
    abkRowsEl.querySelectorAll('[data-chick-abk-pop]').forEach(inp=>{
      const idx=Number(inp.dataset.chickAbkPop);
      if(chickAbks[idx])chickAbks[idx].initial_birds=Math.trunc(normalizeInputID(inp.value)||0);
    });
  };

  const netPopulation=()=>Math.max(0,(normalizeInputID(form.received.value)||0));

  const updateTotals=()=>{
    const net=netPopulation();
    const total=chickAbks.reduce((s,x)=>s+Math.max(0,Math.trunc(prodNum(x.initial_birds))),0);
    netEl.textContent='Dasar Pembagian ABK / DOC Datang: '+net.toLocaleString('id-ID')+' ekor';
    const diff=net-total;
    abkTotalEl.innerHTML='Pembagian ABK: <strong>'+total.toLocaleString('id-ID')+' / '+net.toLocaleString('id-ID')+' ekor</strong>'+(diff===0&&net>0?' · SESUAI':(' · Sisa '+diff.toLocaleString('id-ID')+' ekor'));
  };

  const renderAbkRows=()=>{
    abkRowsEl.innerHTML=chickAbks.map((row,idx)=>{
      const used=new Set(chickAbks.filter((x,i)=>i!==idx&&x.abk_id).map(x=>x.abk_id));
      const choices=activeAbks.filter(e=>!used.has(e.id)||e.id===row.abk_id);
      return '<div class="form-vertical compact-form" style="margin-bottom:10px">'+
        '<label>ABK<select data-chick-abk-id="'+idx+'" required><option value="">Pilih ABK</option>'+
          choices.map(e=>'<option value="'+esc(e.id)+'" '+(e.id===row.abk_id?'selected':'')+'>'+esc((e.code?e.code+' · ':'')+e.name)+'</option>').join('')+
        '</select></label>'+
        '<label>Populasi Awal ABK (ekor)<input type="text" data-number="1" inputmode="numeric" data-chick-abk-pop="'+idx+'" value="'+(row.initial_birds?fmtNumber(row.initial_birds):'')+'" placeholder="Contoh: 8.250" required></label>'+
        (chickAbks.length>1?'<button type="button" data-remove-chick-abk="'+idx+'">Hapus ABK</button>':'')+
      '</div>';
    }).join('');
    bindNumberInputs();
    abkRowsEl.querySelectorAll('[data-chick-abk-id]').forEach(sel=>sel.onchange=()=>{
      syncAbkRows();renderAbkRows();updateTotals();
    });
    abkRowsEl.querySelectorAll('[data-chick-abk-pop]').forEach(inp=>inp.oninput=()=>{
      const idx=Number(inp.dataset.chickAbkPop);
      if(chickAbks[idx])chickAbks[idx].initial_birds=Math.trunc(normalizeInputID(inp.value)||0);
      updateTotals();
    });
    abkRowsEl.querySelectorAll('[data-remove-chick-abk]').forEach(btn=>btn.onclick=()=>{
      syncAbkRows();
      chickAbks.splice(Number(btn.dataset.removeChickAbk),1);
      renderAbkRows();
      updateTotals();
    });
  };

  const loadAssignmentAbks=(assignmentId)=>{
    const existing=d.links.filter(l=>l.contract_assignment_id===assignmentId);
    chickAbks=existing.length
      ?existing.map(l=>({abk_id:l.abk_id,initial_birds:Math.trunc(prodNum(l.initial_birds))}))
      :[{abk_id:'',initial_birds:0}];
    renderAbkRows();
    updateTotals();
  };

  addAbkBtn.onclick=()=>{
    syncAbkRows();
    if(chickAbks.filter(x=>x.abk_id).length>=activeAbks.length)return msg('Semua ABK aktif sudah dipilih.');
    chickAbks.push({abk_id:'',initial_birds:0});
    renderAbkRows();
    updateTotals();
  };

  const calc=()=>{
    form.received.value=formatInputID(form.received.value);
    form.doa.value=formatInputID(form.doa.value);
    if(form.avg_weight.value)form.avg_weight.value=formatInputID(form.avg_weight.value);
    updateTotals();
  };

  if(editRow)loadAssignmentAbks(editRow.contract_assignment_id);
  else loadAssignmentAbks(form.assignment.value);

  if(!editRow)form.assignment.onchange=()=>loadAssignmentAbks(form.assignment.value);
  form.received.oninput=calc;
  form.doa.oninput=calc;
  form.avg_weight.oninput=calc;
  calc();

  root.querySelectorAll('[data-edit-chick]').forEach(btn=>btn.onclick=async()=>{
    window.__chickInEdit=btn.dataset.editChick||'';
    await chickInPage();
    document.getElementById('prodChick')?.scrollIntoView({behavior:'smooth',block:'start'});
  });

  const cancel=document.getElementById('chickEditCancel');
  if(cancel)cancel.onclick=async()=>{window.__chickInEdit='';await chickInPage();};
  bindAdminTransactionDeletes(()=>{window.__chickInEdit='';return chickInPage();});

  form.onsubmit=async e=>{
    e.preventDefault();
    syncAbkRows();
    const assignmentId=currentAssignmentId();
    const a=d.assignments.find(x=>x.id===assignmentId);
    if(!a)return msg('Pilih kandang/siklus aktif dari Logistik.');

    const received=Math.trunc(normalizeInputID(form.received.value)||0);
    const doa=Math.trunc(normalizeInputID(form.doa.value)||0);
    const avgWeight=form.avg_weight.value?normalizeInputID(form.avg_weight.value):null;
    if(received<=0)return msg('Jumlah DOC Masuk harus lebih dari 0 ekor.');
    if(doa<0||doa>=received)return msg('DOC Mati Box harus lebih kecil dari DOC In.');
    if(avgWeight!==null&&avgWeight<=0)return msg('Bobot Rata2 harus lebih dari 0 gram atau dikosongkan.');

    const allocations=chickAbks.filter(x=>x.abk_id).map(x=>({
      abk_id:x.abk_id,
      initial_birds:Math.trunc(prodNum(x.initial_birds))
    }));
    if(!allocations.length)return msg('Pilih minimal 1 ABK.');
    if(allocations.some(x=>x.initial_birds<=0))return msg('Populasi Awal setiap ABK wajib lebih dari 0.');
    if(new Set(allocations.map(x=>x.abk_id)).size!==allocations.length)return msg('ABK tidak boleh dipilih dua kali.');

    const net=received;
    const total=allocations.reduce((s,x)=>s+x.initial_birds,0);
    if(total!==net)return msg('Total Populasi Awal ABK '+fmtNumber(total)+' harus sama dengan DOC In/Kedatangan '+fmtNumber(net)+' ekor.');

    const rawDo=String(form.delivery_number.value||'').trim();
    const {error}=await db.rpc('save_chick_in_with_abks_v1',{
      p_chick_id:editRow?.id||null,
      p_assignment_id:a.id,
      p_arrived_on:form.date.value,
      p_received:received,
      p_doa:doa,
      p_avg_weight:avgWeight,
      p_delivery_number:rawDo&&!/^DOC-PLACEHOLDER-/i.test(rawDo)?rawDo:null,
      p_abks:allocations
    });
    if(error)return msg('Gagal menyimpan Chick-In: '+error.message);

    window.__chickInEdit='';
    await chickInPage();
    msg(editRow?'Chick-In dan pembagian ABK berhasil diperbarui.':'Chick-In dan pembagian ABK berhasil disimpan ke Liga ABK.',true);
  };
}

async function recordingPplPage(){
  const d=await productionBase();
  const [rr,sr]=await Promise.all([
    db.from('recordings').select('*').not('contract_assignment_id','is',null).order('recorded_on'),
    db.from('recording_weight_samples').select('*')
  ]);
  const recs=d.scopeRows(rr.data||[]),samples=sr.data||[];
  const recordingAssignmentId=window.__pplRecordingAssignment||'';
  const historyAssignmentIds=[...new Set(recs.map(r=>r.contract_assignment_id).filter(Boolean))];
  const historyAssignments=d.assignments.filter(a=>historyAssignmentIds.includes(a.id));
  let historyAssignmentId=window.__pplRecordingHistoryAssignment||recordingAssignmentId||'';
  if(historyAssignmentId&&!historyAssignmentIds.includes(historyAssignmentId))historyAssignmentId='';
  const historyRecs=historyAssignmentId?recs.filter(r=>r.contract_assignment_id===historyAssignmentId):[];
  window.__bmsTxnList=window.__bmsTxnList||{};
  let html='<section class="panel"><h3>Recording Harian PPL</h3><p class="muted">Isi data lapangan saja. FCR, ADG, IP dan perbandingan standar dihitung otomatis oleh sistem.</p><form id="prodRec" class="form-vertical">'+
    '<div class="panel" style="padding:14px"><h4>1. Pilih Kandang</h4>'+
      '<label>Kandang Aktif<select name="assignment" required><option value="">Pilih Kandang</option>'+d.assignments.filter(a=>a.active&&d.chicks.some(c=>c.contract_assignment_id===a.id)).map(a=>'<option value="'+esc(a.id)+'" '+(recordingAssignmentId===a.id?'selected':'')+'>'+esc(prodActiveBarnOption(d,a))+'</option>').join('')+'</select></label>'+
      '<div id="prodRecAge" class="rhpp-summary-card" style="margin-top:10px"><span>Umur Saat Ini</span><strong>1 Hari</strong></div>'+
    '</div>'+
    '<div class="panel" style="padding:14px"><h4 id="prodRecDayTitle">2. Isi Data Hari ke-1</h4>'+
      '<label>Pakan yang Dipakai<select name="feed_item" required><option value="">Pilih kandang dulu</option></select></label>'+
      '<p id="prodRecStock" class="muted">Sisa stok: -</p>'+
      '<label>Jumlah Pakan Dipakai (Zak/Satuan)<input type="number" name="feed_units" min="0" step="0.01" required placeholder="Contoh: 10"></label>'+
      '<p id="prodRecKg" class="muted">Pemakaian: 0 Kg</p>'+
      '<label>Ayam Mati Hari Ini (ekor)<input type="number" name="mortality" min="0" value="0" required></label>'+
      '<label>Afkir / Dimusnahkan Hari Ini (ekor)<input type="number" name="culling" min="0" value="0" required></label>'+
      '<div><strong>Bobot Sampel Ayam (Kg/ekor)</strong><p class="muted">Isi dalam Kg desimal. Contoh: 63 gram = 0,063 · 500 gram = 0,500 · 630 gram = 0,630 · 850 gram = 0,850 · 1.200 gram = 1,200. Minimal satu sampel.</p><div id="weightRows"></div><button type="button" id="addWeight">+ Tambah Sampel Ayam</button></div>'+
    '</div>'+
    '<div class="panel" style="padding:14px"><h4>3. Simpan</h4>'+
      '<label>Catatan (opsional)<textarea name="notes" placeholder="Contoh: ayam aktif, litter kering"></textarea></label>'+
      '<label>Foto (opsional)<input type="file" name="photo" accept="image/*"></label>'+
      '<p class="muted">Foto dikompres otomatis sebelum disimpan · target sekitar 30 KB.</p>'+
      '<div class="inline-actions"><button id="prodRecSave">Simpan Data Hari Ini</button><button type="button" id="prodRecCancel" style="display:none">Batal Edit</button></div>'+
    '</div></form></section>';

  const metricRows=[];
  for(const r of recs){
    const a=d.assignments.find(x=>x.id===r.contract_assignment_id),ci=d.chicks.find(x=>x.contract_assignment_id===r.contract_assignment_id);
    if(!a||!ci)continue;
    const prev=recs.filter(x=>x.contract_assignment_id===r.contract_assignment_id&&prodNum(x.age_days)<=prodNum(r.age_days));
    const cumDead=prev.reduce((s,x)=>s+prodNum(x.mortality)+prodNum(x.culling),0);
    const cumFeed=prev.reduce((s,x)=>s+prodNum(x.feed_kg),0);
    const initial=prodNum(ci.received)-prodNum(ci.doa);
    const harvestsBeforeRecording=d.harvests
      .filter(h=>h.contract_assignment_id===r.contract_assignment_id&&h.harvested_on<r.recorded_on);
    const harvestedToDate=harvestsBeforeRecording.reduce((s,h)=>s+prodNum(h.birds),0);
    const harvestedKgToDate=harvestsBeforeRecording.reduce((s,h)=>s+prodNum(h.net_weight_kg),0);
    const population=Math.max(0,initial-cumDead-harvestedToDate);
    const ws=samples.filter(s=>s.recording_id===r.id).map(s=>prodNum(s.weight_g));
    const bwg=ws.length?ws.reduce((s,x)=>s+x,0)/ws.length:prodNum(r.avg_weight_kg)*1000;
    const bwkg=bwg/1000,standingBiomass=population*bwkg,totalProducedKg=standingBiomass+harvestedKgToDate;
    const fcr=totalProducedKg>0?cumFeed/totalProducedKg:0;
    const depl=initial>0?cumDead/initial*100:0;
    const age=prodNum(r.age_days);
    const ip=age>0&&fcr>0?((100-depl)*bwkg*100)/(age*fcr):0;
    const adg=age>0?(bwg-prodNum(ci.avg_weight))/age:0;
    const fi=initial>0?cumFeed*1000/initial:0;
    const st=d.standards.find(s=>(a.cycle_type==='MANDIRI'||s.contract_id===a.master_contract_id)&&s.template_name===a.performance_template_name&&prodNum(s.age_days)===age);
    const stdFeedTotalKg=st?.std_feed_g_per_bird?prodNum(st.std_feed_g_per_bird)*initial/1000:null;
    metricRows.push({r,a,population,depl,bwg,cumFeed,fi,fcr,adg,ip,st,stdFeedTotalKg});
  }

  const selectedHistoryAssignment=d.assignments.find(a=>a.id===historyAssignmentId);
  const recordingHistoryLabel=a=>{
    const b=d.barns.find(x=>x.id===a?.barn_id);
    return (b?shortBarnLabel(b):'-')+' · S'+(assignmentCycleNo(d.assignments,a)||'-');
  };
  html+='<section class="panel"><h3>Riwayat Recording Harian</h3>'+
    '<p class="muted">Pilih kandang / siklus untuk menampilkan seluruh history recording harian yang sudah tersimpan.</p>'+
    '<label>Pilih Kandang / Siklus<select id="prodRecHistoryAssignment"><option value="">Pilih History Recording</option>'+
      historyAssignments.map(a=>'<option value="'+esc(a.id)+'" '+(historyAssignmentId===a.id?'selected':'')+'>'+esc(recordingHistoryLabel(a)+(a.active?' · AKTIF':' · SELESAI'))+'</option>').join('')+
    '</select></label>'+
    (selectedHistoryAssignment?'<p class="muted" style="margin-top:8px">Menampilkan: <strong>'+esc(recordingHistoryLabel(selectedHistoryAssignment))+'</strong></p><div class="report-actions"><button type="button" id="recordingHistoryPrint">Cetak</button> <button type="button" id="recordingHistoryPdf">PDF</button> <button type="button" id="recordingHistoryExcel">Excel</button></div>':'')+
    '<div class="tablewrap"><table id="recordingHistoryTable"><thead><tr><th>Kandang</th><th>Hari</th><th>Pop.</th><th>M+A</th><th>Depl.</th><th>BW A/S</th><th>Pakan A/S</th><th>FI</th><th>FCR</th><th>ADG</th><th>IP</th><th>Aksi</th></tr></thead><tbody id="prodPerfBody"></tbody></table></div>'+
    '<p id="prodPerfPage" class="muted" style="margin-top:10px"></p>'+
    '</section>';
  layout(html);
  if(d.err||rr.error||sr.error)msg((d.err||rr.error||sr.error).message);

  const selectedRecordingIds=new Set(historyRecs.map(x=>x.id));
  const sortedRows=metricRows.filter(x=>selectedRecordingIds.has(x.r.id)).slice().sort((a,b)=>{
    const dayDiff=prodNum(b.r.age_days)-prodNum(a.r.age_days);
    if(dayDiff)return dayDiff;
    return String(b.r.recorded_on||'').localeCompare(String(a.r.recorded_on||''));
  });
  const renderPerf=()=>{
    const rows=sortedRows;
    document.getElementById('prodPerfBody').innerHTML=rows.map(x=>{
      const dead=prodNum(x.r.mortality)+prodNum(x.r.culling);
      return '<tr><td>'+esc(recordingHistoryLabel(x.a))+'</td><td><strong>'+prodFmt(x.r.age_days,0)+'</strong></td><td>'+prodFmt(x.population,0)+'</td><td>'+prodFmt(dead,0)+'</td>'+
      '<td>'+prodFmt(x.depl,2)+'%</td>'+
      '<td>'+prodFmt(x.bwg,0)+'/'+(x.st?.std_body_weight_g?prodFmt(x.st.std_body_weight_g,0):'-')+'g</td>'+
      '<td>'+prodFmt(x.cumFeed,0)+'/'+(x.stdFeedTotalKg!=null?prodFmt(x.stdFeedTotalKg,0):'-')+'Kg</td>'+
      '<td>'+prodFmt(x.fi,0)+'</td><td>'+prodFmt(x.fcr,2)+'</td><td>'+prodFmt(x.adg,1)+'</td><td>'+prodFmt(x.ip,1)+'</td>'+
      '<td><div class="inline-actions"><button type="button" data-edit-recording="'+esc(x.r.id)+'">Edit</button>'+adminDeleteTxnButton('recordings',x.r.id)+'</div></td></tr>';
    }).join('');
    document.getElementById('prodPerfPage').textContent=historyAssignmentId?(sortedRows.length+' data recording · terbaru ke terlama'):'Pilih kandang / siklus untuk menampilkan history recording.';
    document.querySelectorAll('[data-edit-recording]').forEach(b=>b.onclick=()=>startEdit(b.dataset.editRecording));
    bindAdminTransactionDeletes(()=>recordingPplPage());
  };
  const historySelect=document.getElementById('prodRecHistoryAssignment');
  if(historySelect)historySelect.onchange=async()=>{
    window.__pplRecordingHistoryAssignment=historySelect.value||'';
    await recordingPplPage();
  };
  if(selectedHistoryAssignment)bindTableExportActions({tableId:'recordingHistoryTable',printId:'recordingHistoryPrint',pdfId:'recordingHistoryPdf',excelId:'recordingHistoryExcel',title:'Riwayat Recording Harian',filename:'Riwayat_Recording_'+recordingHistoryLabel(selectedHistoryAssignment).replace(/[^A-Za-z0-9_-]+/g,'_'),dropLast:true});

  const f=document.getElementById('prodRec'),wr=document.getElementById('weightRows'),saveBtn=document.getElementById('prodRecSave'),cancelBtn=document.getElementById('prodRecCancel');
  let weights=[0],editingId=null,editingDay=null,feedStock=[];

  const syncWeightsFromDom=()=>{
    wr.querySelectorAll('[data-weight]').forEach(x=>{const i=Number(x.dataset.weight);if(weights[i]!=null)weights[i]=prodNum(x.value)});
  };
  const renderWeights=()=>{
    wr.innerHTML=weights.map((v,i)=>'<div class="inline-actions"><input type="number" min="0.001" step="0.001" inputmode="decimal" data-weight="'+i+'" placeholder="Contoh: 0,063" value="'+(v||'')+'" required><span class="muted">Kg/ekor</span>'+(weights.length>1?'<button type="button" data-del-weight="'+i+'">Hapus</button>':'')+'</div>').join('');
    wr.querySelectorAll('[data-weight]').forEach(x=>x.oninput=()=>weights[Number(x.dataset.weight)]=prodNum(x.value));
    wr.querySelectorAll('[data-del-weight]').forEach(x=>x.onclick=()=>{syncWeightsFromDom();weights.splice(Number(x.dataset.delWeight),1);renderWeights()});
  };
  document.getElementById('addWeight').onclick=()=>{syncWeightsFromDom();weights.push(0);renderWeights()};
  renderWeights();

  const compressRecordingPhoto=async(file,targetBytes=30*1024)=>{
    if(!file)return null;
    if(!String(file.type||'').startsWith('image/'))throw new Error('File foto harus berupa gambar.');
    if(file.size>15*1024*1024)throw new Error('Foto sumber maksimal 15 MB.');
    const objectUrl=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{
        const el=new Image();
        el.onload=()=>resolve(el);
        el.onerror=()=>reject(new Error('Foto tidak dapat dibaca.'));
        el.src=objectUrl;
      });
      let width=img.naturalWidth||img.width;
      let height=img.naturalHeight||img.height;
      if(!width||!height)throw new Error('Ukuran foto tidak valid.');
      const maxSide=800;
      const initialScale=Math.min(1,maxSide/Math.max(width,height));
      width=Math.max(1,Math.round(width*initialScale));
      height=Math.max(1,Math.round(height*initialScale));

      const toBlob=(canvas,quality)=>new Promise((resolve,reject)=>{
        canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Kompresi foto gagal.')),'image/jpeg',quality);
      });
      let best=null;
      for(let sizePass=0;sizePass<5;sizePass++){
        const canvas=document.createElement('canvas');
        canvas.width=width;
        canvas.height=height;
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx)throw new Error('Browser tidak mendukung kompresi foto.');
        ctx.fillStyle='#fff';
        ctx.fillRect(0,0,width,height);
        ctx.drawImage(img,0,0,width,height);

        for(const quality of [0.78,0.68,0.58,0.48,0.38,0.30]){
          const blob=await toBlob(canvas,quality);
          best=blob;
          if(blob.size<=targetBytes)break;
        }
        if(best&&best.size<=targetBytes)break;
        width=Math.max(320,Math.round(width*0.82));
        height=Math.max(240,Math.round(height*0.82));
      }
      if(!best)throw new Error('Kompresi foto gagal.');
      return await new Promise((resolve,reject)=>{
        const rd=new FileReader();
        rd.onload=()=>resolve({dataUrl:String(rd.result||''),bytes:best.size});
        rd.onerror=()=>reject(new Error('Hasil kompresi foto gagal dibaca.'));
        rd.readAsDataURL(best);
      });
    }finally{
      URL.revokeObjectURL(objectUrl);
    }
  };

  const todayID=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const realAgeFor=assignmentId=>{
    const ci=d.chicks.find(x=>x.contract_assignment_id===assignmentId);
    if(!ci?.arrived_on)return 0;
    const start=Date.parse(ci.arrived_on+'T00:00:00Z');
    const today=Date.parse(todayID()+'T00:00:00Z');
    return Math.max(0,Math.floor((today-start)/86400000));
  };
  const missingDaysFor=assignmentId=>{
    const age=realAgeFor(assignmentId);
    const used=new Set(recs.filter(r=>r.contract_assignment_id===assignmentId).map(r=>prodNum(r.age_days)).filter(n=>n>=1&&n<=age));
    const missing=[];
    for(let day=1;day<=age;day++)if(!used.has(day))missing.push(day);
    return missing;
  };
  const targetDayFor=assignmentId=>{
    const missing=missingDaysFor(assignmentId);
    return missing.length?missing[0]:realAgeFor(assignmentId);
  };
  let currentDay=1;

  const calc=()=>{
    const actualAge=f.assignment.value?realAgeFor(f.assignment.value):0;
    currentDay=editingId?editingDay:(f.assignment.value?targetDayFor(f.assignment.value):0);
    const ageBox=document.getElementById('prodRecAge');
    const dayTitle=document.getElementById('prodRecDayTitle');
    if(dayTitle)dayTitle.textContent=currentDay>0?'2. Isi Data Hari ke-'+currentDay:'2. Recording dimulai H+1 setelah DOC datang';
    if(ageBox){
      if(editingId){
        ageBox.innerHTML='<span>Hari Recording</span><strong>'+currentDay+' Hari · Mode Edit</strong>';
      }else if(f.assignment.value){
        const missing=missingDaysFor(f.assignment.value);
        if(actualAge===0){
          ageBox.innerHTML='<span>Umur Saat Ini</span><strong>Hari 0 · DOC baru datang</strong>'+
            '<small class="muted" style="display:block;margin-top:6px">Recording Hari 1 dimulai besok (H+1 setelah DOC datang).</small>';
        }else{
          ageBox.innerHTML='<span>Umur Saat Ini</span><strong>'+actualAge+' Hari</strong>'+
            (missing.length?'<small class="muted" style="display:block;margin-top:6px">Belum terisi: Hari '+missing.join(', ')+'</small>':'<small class="muted" style="display:block;margin-top:6px">Recording sampai hari ini lengkap.</small>')+
            '<small style="display:block;margin-top:6px"><strong>Form ini akan mengisi Hari '+currentDay+'</strong></small>';
        }
      }else{
        ageBox.innerHTML='<span>Umur Saat Ini</span><strong>1 Hari</strong><small class="muted" style="display:block;margin-top:6px">Pilih kandang untuk melihat umur dan hari yang belum terisi.</small>';
      }
    }
    const stock=feedStock.find(x=>x.item_id===f.feed_item.value);
    const used=prodNum(f.feed_units.value);
    document.getElementById('prodRecStock').textContent=stock?'Sisa stok tersedia: '+prodFmt(stock.remaining_units,2)+' '+(stock.unit||'Satuan')+' ('+prodFmt(stock.remaining_kg,2)+' Kg)':'Sisa stok: -';
    document.getElementById('prodRecKg').textContent='Pemakaian: '+prodFmt(used*prodNum(stock?.kg_per_unit),2)+' Kg';
  };

  const refreshFeedStock=async(selectedItem=null)=>{
    feedStock=[];
    f.feed_item.innerHTML='<option value="">Memuat pakan tersedia...</option>';
    document.getElementById('prodRecStock').textContent='Sisa stok: -';
    if(!f.assignment.value){f.feed_item.innerHTML='<option value="">Pilih Kandang / Kontrak dulu</option>';return}
    const {data,error}=await db.rpc('production_feed_stock',{p_contract_assignment_id:f.assignment.value});
    if(error){f.feed_item.innerHTML='<option value="">Gagal memuat stok</option>';return msg(error.message)}
    const editRec=editingId?recs.find(x=>x.id===editingId):null;
    feedStock=(data||[]).map(x=>{
      const y={...x};
      if(editRec&&editRec.contract_assignment_id===f.assignment.value&&editRec.feed_item_id===x.item_id){
        y.remaining_units=prodNum(y.remaining_units)+prodNum(editRec.feed_quantity_units);
        y.remaining_kg=prodNum(y.remaining_kg)+prodNum(editRec.feed_kg);
      }
      return y;
    }).filter(x=>prodNum(x.remaining_units)>0);
    f.feed_item.innerHTML='<option value="">Pilih Pakan</option>'+feedStock.map(x=>{
      const shortName=String(x.name||'').replace(/^Pakan\s+/i,'');
      return '<option value="'+esc(x.item_id)+'">'+esc(x.code+' · '+shortName+' · '+prodFmt(x.remaining_units,2)+' '+(x.unit||'Satuan')+' · '+prodFmt(x.remaining_kg,2)+' Kg')+'</option>'
    }).join('');
    if(!feedStock.length)f.feed_item.innerHTML='<option value="">Tidak ada stok pakan tersedia</option>';
    if(selectedItem)f.feed_item.value=selectedItem;
    calc();
  };

  const resetEdit=async()=>{
    editingId=null;editingDay=null;f.assignment.disabled=false;f.reset();weights=[0];renderWeights();
    saveBtn.textContent='Simpan Data Hari Ini';cancelBtn.style.display='none';feedStock=[];
    f.feed_item.innerHTML='<option value="">Pilih Kandang / Kontrak dulu</option>';calc();
  };
  cancelBtn.onclick=resetEdit;

  async function startEdit(id){
    const r=recs.find(x=>x.id===id);if(!r)return;
    editingId=r.id;editingDay=prodNum(r.age_days);
    f.assignment.value=r.contract_assignment_id;f.assignment.disabled=true;
    f.mortality.value=prodNum(r.mortality);f.culling.value=prodNum(r.culling);
    f.feed_units.value=prodNum(r.feed_quantity_units);f.notes.value=r.notes||'';
    const ws=samples.filter(x=>x.recording_id===r.id).map(x=>prodNum(x.weight_g)/1000);
    weights=ws.length?ws:[prodNum(r.avg_weight_kg)];renderWeights();
    saveBtn.textContent='Simpan Perubahan';cancelBtn.style.display='';
    await refreshFeedStock(r.feed_item_id);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  f.assignment.onchange=async()=>{
    window.__pplRecordingAssignment=f.assignment.value||'';
    if(f.assignment.value)window.__pplRecordingHistoryAssignment=f.assignment.value;
    await recordingPplPage();
  };
  f.feed_item.onchange=calc;f.feed_units.oninput=calc;calc();renderPerf();

  const autoLoadCurrentRecording=async()=>{
    if(!f.assignment.value||editingId)return false;
    const targetDay=targetDayFor(f.assignment.value);
    const existing=recs.find(r=>
      r.contract_assignment_id===f.assignment.value&&
      prodNum(r.age_days)===prodNum(targetDay)
    );
    if(!existing)return false;
    await startEdit(existing.id);
    return true;
  };

  if(f.assignment.value){
    const opened=await autoLoadCurrentRecording();
    if(!opened)await refreshFeedStock();
  }else{
    const eligible=d.assignments.filter(a=>a.active&&d.chicks.some(c=>c.contract_assignment_id===a.id));
    if(eligible.length===1){
      f.assignment.value=eligible[0].id;
      window.__pplRecordingAssignment=eligible[0].id;
      window.__pplRecordingHistoryAssignment=eligible[0].id;
      calc();
      const opened=await autoLoadCurrentRecording();
      if(!opened)await refreshFeedStock();
    }
  }

  f.onsubmit=async e=>{
    e.preventDefault();
    const a=d.assignments.find(x=>x.id===f.assignment.value),ci=a&&d.chicks.find(x=>x.contract_assignment_id===a.id),stock=feedStock.find(x=>x.item_id===f.feed_item.value);
    if(!a||!ci||!stock)return msg('Lengkapi kontrak, Chick-In dan pakan tersedia.');
    if(weights.some(x=>x<=0))return msg('Bobot sampel wajib diisi.');
    if(weights.some(x=>x>10))return msg('Bobot sampel harus diisi dalam Kg. Contoh: 1.87 untuk 1.870 gram, bukan 1870.');
    const feedUnits=prodNum(f.feed_units.value);
    if(feedUnits<=0)return msg('Jumlah pakan dipakai harus lebih dari 0.');
    const {data:latestStockRows,error:latestStockError}=await db.rpc('production_feed_stock',{p_contract_assignment_id:a.id});
    if(latestStockError)return msg('Gagal mengecek stok pakan terbaru: '+latestStockError.message);
    let latestStock=(latestStockRows||[]).find(x=>x.item_id===stock.item_id)||null;
    if(editingId){
      const editRec=recs.find(x=>x.id===editingId);
      if(editRec&&editRec.feed_item_id===stock.item_id&&latestStock){
        latestStock={...latestStock,remaining_units:prodNum(latestStock.remaining_units)+prodNum(editRec.feed_quantity_units)};
      }
    }
    if(!latestStock||prodNum(latestStock.remaining_units)<=0){
      await refreshFeedStock();
      return msg('Stok pakan yang dipilih sudah habis. Pilih pakan lain yang masih tersedia.');
    }
    if(feedUnits>prodNum(latestStock.remaining_units)){
      await refreshFeedStock(stock.item_id);
      return msg('Pemakaian melebihi sisa stok terbaru. Sisa '+prodFmt(latestStock.remaining_units,2)+' '+(latestStock.unit||'Satuan')+'.');
    }
    currentDay=editingId?editingDay:targetDayFor(a.id);
    if(!editingId&&currentDay<1)return msg('Hari DOC datang adalah Hari 0. Recording Hari 1 baru dapat diisi mulai besok.');
    if(!editingId&&recs.some(r=>r.contract_assignment_id===a.id&&prodNum(r.age_days)===currentDay)){
      return msg('Recording Hari '+currentDay+' sudah diisi. Gunakan tombol Edit pada riwayat recording.');
    }
    const wasEdit=!!editingId;
    let photo=editingId?(recs.find(x=>x.id===editingId)?.photo_data||null):null;
    const file=f.photo.files?.[0];
    if(file){
      try{
        saveBtn.textContent='Mengompres foto...';
        const compressed=await compressRecordingPhoto(file);
        photo=compressed.dataUrl;
      }catch(error){
        saveBtn.textContent=wasEdit?'Simpan Perubahan':'Simpan Data Hari Ini';
        return msg(error.message||'Kompresi foto gagal.');
      }
    }
    const avg=weights.reduce((s,x)=>s+x,0)/weights.length;
    const {error:saveError}=await db.rpc('save_recording_atomic',{
      p_id:editingId||null,
      p_assignment_id:a.id,
      p_barn_id:a.barn_id,
      p_recorded_on:prodDateAdd(ci.arrived_on,currentDay),
      p_age_days:currentDay,
      p_mortality:Math.trunc(prodNum(f.mortality.value)),
      p_culling:Math.trunc(prodNum(f.culling.value)),
      p_feed_item_id:stock.item_id,
      p_feed_quantity_units:feedUnits,
      p_sample_count:weights.length,
      p_sample_weight_total_kg:weights.reduce((s,x)=>s+x,0),
      p_notes:f.notes.value||null,
      p_photo_data:photo,
      p_weights:weights.map(weight_kg=>({weight_g:weight_kg*1000}))
    });
    if(saveError)return msg(saveError.message);
    await recordingPplPage();msg(wasEdit?'Recording PPL berhasil diperbarui.':'Recording PPL tersimpan dan performa dihitung otomatis.',true);
  };
}
async function productionVisitPage(){
  const d=await productionBase();
  const vr=await db.from('visits').select('*').not('contract_assignment_id','is',null).order('visited_on',{ascending:false});
  const rows=d.scopeRows(vr.data||[]);
  const visitAssignmentId=window.__pplVisitAssignment||'';
  const eligibleVisits=d.assignments.filter(a=>a.active&&d.chicks.some(c=>c.contract_assignment_id===a.id));
  // Filter riwayat berdiri sendiri dari form input. Siklus CLOSED tetap dapat dicari.
  const historyAssignments=d.assignments.filter(a=>d.chicks.some(c=>c.contract_assignment_id===a.id));
  const historyBarns=d.barns.filter(b=>historyAssignments.some(a=>a.barn_id===b.id));
  const historyOptions=historyAssignments.map(a=>({id:a.id,barn_id:a.barn_id,label:prodAssignmentOption(d,a)}));
  const txnVisit=txnListState(rows,'pplVisit','visited_on',5,historyBarns,'barn_id',{assignmentKey:'contract_assignment_id',assignments:historyOptions});
  const shownVisits=txnVisit.rows;
  let html='<section class="panel"><h3>Kunjungan PPL</h3><form id="prodVisit" class="form-vertical">'+
    '<label>Kandang Aktif<select name="assignment" required><option value="">Pilih</option>'+eligibleVisits.map(a=>'<option value="'+esc(a.id)+'" '+(visitAssignmentId===a.id?'selected':'')+'>'+esc(prodActiveBarnOption(d,a))+'</option>').join('')+'</select></label>'+
    '<label>Tanggal Kunjungan<input type="date" name="date" value="'+prodToday()+'" required></label>'+
    '<label>Temuan<textarea name="findings" required></textarea></label>'+
    '<label>Tindakan / Rekomendasi<textarea name="recommendation" required></textarea></label>'+
    '<label>Tindak Lanjut<textarea name="follow_up" required></textarea></label>'+
    '<label>Status Tindak Lanjut<select name="follow_up_status" required><option value="BELUM">BELUM</option><option value="PROSES">PROSES</option><option value="SELESAI">SELESAI</option></select></label>'+
    '<label>Catatan<textarea name="notes"></textarea></label>'+
    '<div class="inline-actions"><button id="prodVisitSave">Simpan Kunjungan</button><button type="button" id="prodVisitCancel" style="display:none">Batal Edit</button></div>'+
    '</form></section>';
  html+='<section class="panel"><h3>Riwayat Kunjungan</h3>'+
    '<p class="muted">Filter riwayat terpisah dari form input. Pilih kandang, lalu siklus bila diperlukan.</p>'+
    txnVisit.controls+
    '<div class="tablewrap"><table><thead><tr><th>Kandang</th><th>Tanggal</th><th>Temuan</th><th>Rekomendasi</th><th>Tindak Lanjut</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>'+
    shownVisits.map(x=>{const a=d.assignments.find(a=>a.id===x.contract_assignment_id);return '<tr><td>'+esc(a?prodAssignmentOption(d,a):'-')+'</td><td>'+prodDateId(x.visited_on)+'</td><td>'+esc(x.findings||'-')+'</td><td>'+esc(x.recommendation||'-')+'</td><td>'+esc(x.follow_up||'-')+'</td><td>'+esc(x.follow_up_status||'-')+'</td><td>'+esc(x.notes||'-')+'</td><td><div class="inline-actions"><button type="button" data-edit-visit="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('visits',x.id)+'</div></td></tr>'}).join('')+
    '</tbody></table></div>'+(!txnVisit.total?'<p>Data Kunjungan tidak ditemukan.</p>':'')+txnVisit.pager+'</section>';
  layout(html);
  bindTxnList(txnVisit,productionVisitPage);
  if(d.err||vr.error)msg((d.err||vr.error).message);

  const f=document.getElementById('prodVisit');
  const saveBtn=document.getElementById('prodVisitSave');
  const cancelBtn=document.getElementById('prodVisitCancel');
  let editingId=null;

  const reset=()=>{
    editingId=null;
    f.reset();
    f.date.value=prodToday();
    f.assignment.disabled=false;
    saveBtn.textContent='Simpan Kunjungan';
    cancelBtn.style.display='none';
  };
  cancelBtn.onclick=reset;

  f.assignment.onchange=async()=>{
    window.__pplVisitAssignment=f.assignment.value||'';
    await productionVisitPage();
  };

  root.querySelectorAll('[data-edit-visit]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.id===btn.dataset.editVisit);if(!x)return;
    editingId=x.id;
    f.assignment.value=x.contract_assignment_id||'';
    f.assignment.disabled=true;
    f.date.value=x.visited_on||prodToday();
    f.findings.value=x.findings||'';
    f.recommendation.value=x.recommendation||'';
    f.follow_up.value=x.follow_up||'';
    f.follow_up_status.value=x.follow_up_status||'BELUM';
    f.notes.value=x.notes||'';
    saveBtn.textContent='Update Kunjungan';
    cancelBtn.style.display='';
    window.scrollTo({top:0,behavior:'smooth'});
  });

  f.onsubmit=async e=>{
    e.preventDefault();
    const a=d.assignments.find(x=>x.id===f.assignment.value);
    if(!a)return msg('Pilih kontrak aktif.');
    const payload={
      contract_assignment_id:a.id,
      barn_id:a.barn_id,
      visited_on:f.date.value,
      findings:f.findings.value.trim()||null,
      recommendation:f.recommendation.value.trim()||null,
      follow_up:f.follow_up.value.trim()||null,
      follow_up_status:f.follow_up_status.value,
      notes:f.notes.value.trim()||null
    };
    const wasEdit=!!editingId;
    const q=editingId?db.from('visits').update(payload).eq('id',editingId):db.from('visits').insert(payload);
    const {error}=await q;
    if(error)return msg(error.message);
    window.__pplVisitAssignment=a.id;
    await productionVisitPage();
    msg(wasEdit?'Kunjungan PPL berhasil diperbarui.':'Kunjungan PPL tersimpan.',true);
  };
}
async function productionEstimatePage(){
  const d=await productionBase();
  const [er,sr,rr,bonusR,shipR,shipItemR,extShipR,extShipItemR,returnR,returnItemR,itemR]=await Promise.all([
    db.from('production_estimates').select('*').order('estimated_on',{ascending:false}),
    db.from('production_estimate_sizes').select('*'),
    db.from('recordings').select('contract_assignment_id,recorded_on,mortality,culling,feed_kg,feed_item_id').not('contract_assignment_id','is',null),
    db.from('contract_bonuses').select('contract_id,metric,min_value,max_value,rupiah_per_kg'),
    db.from('logistics_shipments').select('id,contract_assignment_id,shipment_date'),
    db.from('logistics_shipment_items').select('shipment_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('logistics_external_shipments').select('id,contract_assignment_id,shipment_date'),
    db.from('logistics_external_shipment_items').select('external_shipment_id,item_id,quantity,quantity_kg,purchase_unit_price'),
    db.from('logistics_returns').select('id,contract_assignment_id,return_date'),
    db.from('logistics_return_items').select('return_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('items').select('id,code,name,category,feed_phase,unit,kg_per_unit')
  ]);
  const rows=d.scopeRows(er.data||[]),sizes=sr.data||[],recs=d.scopeRows(rr.data||[]),bonusRows=bonusR.data||[];
  const sapShipments=d.scopeRows(shipR.data||[]),sapShipmentItems=shipItemR.data||[];
  const sapExternalShipments=d.scopeRows(extShipR.data||[]),sapExternalShipmentItems=extShipItemR.data||[];
  const sapReturns=d.scopeRows(returnR.data||[]),sapReturnItems=returnItemR.data||[],sapItems=itemR.data||[];
  const eligibleAssignments=d.assignments.filter(a=>a.active&&d.chicks.some(c=>c.contract_assignment_id===a.id));
  const estimateAssignmentId=window.__pplEstimateAssignment||(eligibleAssignments.length===1?eligibleAssignments[0].id:'');
  if(estimateAssignmentId)window.__pplEstimateAssignment=estimateAssignmentId;

  // Riwayat Estimasi berdiri sendiri dari form input: pilih Kandang -> Siklus -> Tampilkan.
  // Siklus historis/CLOSED tetap tersedia selama mempunyai Chick-In. Hanya data estimasi nyata umur >= 23 yang ditampilkan.
  const historyAssignments=d.assignments.filter(a=>d.chicks.some(c=>c.contract_assignment_id===a.id));
  const historyBarns=d.barns.filter(b=>historyAssignments.some(a=>a.barn_id===b.id));
  window.__pplEstimateHistory=window.__pplEstimateHistory||{barn:'',assignment:'',shown:false};
  const estimateHistoryState=window.__pplEstimateHistory;
  if(estimateHistoryState.assignment&&!historyAssignments.some(a=>a.id===estimateHistoryState.assignment)){
    estimateHistoryState.assignment='';estimateHistoryState.shown=false;
  }
  if(estimateHistoryState.barn&&!historyBarns.some(b=>b.id===estimateHistoryState.barn)){
    estimateHistoryState.barn='';estimateHistoryState.assignment='';estimateHistoryState.shown=false;
  }
  const historyEstimates=estimateHistoryState.shown&&estimateHistoryState.assignment
    ?rows.filter(x=>{
      if(x.contract_assignment_id!==estimateHistoryState.assignment)return false;
      const ci=d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id);
      return ci&&prodAge(ci.arrived_on,x.estimated_on)>=23;
    }).sort((x,y)=>{
      const ci=d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id);
      return prodAge(ci?.arrived_on,x.estimated_on)-prodAge(ci?.arrived_on,y.estimated_on)
        ||String(x.estimated_on||'').localeCompare(String(y.estimated_on||''));
    })
    :[];
  const pageRows=historyEstimates;
  const historyStockResponses=await Promise.all(pageRows.map(x=>
    db.rpc('production_feed_stock_as_of',{
      p_contract_assignment_id:x.contract_assignment_id,
      p_as_of_date:x.estimated_on
    })
  ));
  const historyStockByEstimate=new Map(
    pageRows.map((x,i)=>[x.id,historyStockResponses[i]?.data||[]])
  );

  const calcFinance=(a,ci,sz)=>{
    let revenue=0,totalBirds=0,totalBiomass=0;
    for(const row of sz){
      const bw=prodNum(row.bw_kg),birds=prodNum(row.birds);
      revenue+=birds*bw*estimateContractLivePrice(d,a,bw);
      totalBirds+=birds;
      totalBiomass+=birds*bw;
    }
    const avgBw=totalBirds?totalBiomass/totalBirds:0;
    return {revenue,avgBw};
  };

  let html='<section class="panel"><h3>Estimasi</h3><p class="muted">Simulasi produksi memakai kematian/culling dari Recording sebagai acuan sisa ayam dan Panen aktual Marketing. Estimasi tidak memengaruhi RHPP.</p>'+
    '<form id="prodEst" class="form-vertical estimate-form">'+
    '<label>Kandang Aktif<select name="assignment" required><option value="">Pilih</option>'+eligibleAssignments.map(a=>'<option value="'+esc(a.id)+'" '+(estimateAssignmentId===a.id?'selected':'')+'>'+esc(prodActiveBarnOption(d,a))+'</option>').join('')+'</select></label>'+
    '<input type="hidden" name="date">'+
    '<p id="estDate" class="muted">Tanggal Estimasi: -</p>'+
    '<p id="estAge" class="muted">Umur: -</p>'+
    '<p id="estActualHarvest" class="muted">Panen aktual Marketing: -</p>'+
    '<p id="estExisting" class="muted"></p>'+
    '<label>Sisa Ayam Real (ekor)<input type="number" min="0" name="remaining" readonly required></label>'+
    '<p id="estUnallocated" class="muted"><strong>Sisa Belum Terbagi: 0 ekor</strong></p>'+
    '<div><strong>Ukuran / BW</strong><div id="estSizes"></div><button type="button" id="addEstSize">+ Tambah Ukuran</button></div>'+
    '<p class="muted"><strong>Sumber aktual simulasi:</strong> kematian/culling dari Recording + transaksi Panen Marketing yang sudah tersimpan.</p>'+
    '<label>Catatan<textarea name="notes"></textarea></label>'+
    '<div id="estPreview"></div>'+
    '<div class="inline-actions"><button id="estSave">Simpan Estimasi</button><button type="button" id="estCancel" style="display:none">Batal Edit</button></div>'+
    '</form></section>';

  const selectedEstimateHistoryAssignment=d.assignments.find(a=>a.id===estimateHistoryState.assignment);
  const estimateHistoryCards=pageRows.map(x=>{
    const a=d.assignments.find(a=>a.id===x.contract_assignment_id);
    const ci=d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id);
    const sz=sizes.filter(s=>s.estimate_id===x.id);
    const estimateBirds=sz.reduce((s,v)=>s+prodNum(v.birds),0);
    const estimateBio=sz.reduce((s,v)=>s+prodNum(v.birds)*prodNum(v.bw_kg),0);
    const initial=ci?Math.max(0,prodNum(ci.received)-prodNum(ci.doa)):0;

    const recToDate=recs.filter(r=>r.contract_assignment_id===x.contract_assignment_id&&String(r.recorded_on||'')<=String(x.estimated_on||''));
    const mortalityBirds=recToDate.reduce((sum,r)=>sum+prodNum(r.mortality)+prodNum(r.culling),0);
    const feedKg=recToDate.reduce((sum,r)=>sum+prodNum(r.feed_kg),0);

    // Estimasi dibuat sebelum panen Marketing pada tanggal yang sama.
    const priorHarvests=d.harvests.filter(h=>h.contract_assignment_id===x.contract_assignment_id&&h.harvested_on<x.estimated_on);
    const harvestedBirds=priorHarvests.reduce((sum,h)=>sum+prodNum(h.birds),0);
    const harvestedKg=priorHarvests.reduce((sum,h)=>sum+prodNum(h.net_weight_kg),0);
    const priorRevenue=estimateContractHarvestValue(d,a,priorHarvests);

    const outBirds=harvestedBirds+estimateBirds;
    const totalProjectedKg=harvestedKg+estimateBio;
    const bw=outBirds>0?totalProjectedKg/outBirds:0;
    const fc=initial>0?feedKg*1000/initial:0;
    const mort=initial>0?mortalityBirds/initial*100:0;
    const fcr=totalProjectedKg>0?feedKg/totalProjectedKg:0;
    const survival=initial>0?Math.min(100,outBirds/initial*100):0;
    const projectedAge=ci?prodAge(ci.arrived_on,x.estimated_on):0;
    const harvestedAgeWeight=ci?priorHarvests.reduce((sum,h)=>sum+prodAge(ci.arrived_on,h.harvested_on)*prodNum(h.birds),0):0;
    const age=outBirds>0?(harvestedAgeWeight+projectedAge*estimateBirds)/outBirds:projectedAge;
    const ip=age>0&&fcr>0?(survival*bw*100)/(age*fcr):0;

    const dyn=calcFinance(a,ci,sz);
    const projectedRemainingRevenue=dyn.revenue;
    const totalProjection=priorRevenue+projectedRemainingRevenue;
    const fcrStd=estimateStandardFcr(d,a,age);
    const matchBonus=(metric,value)=>prodNum(bonusRows.find(v=>
      v.contract_id===a?.master_contract_id&&
      v.metric===metric&&
      (v.min_value==null||value>=prodNum(v.min_value))&&
      (v.max_value==null||value<prodNum(v.max_value))
    )?.rupiah_per_kg);
    const sapSnapshot=estimateSapronakSnapshot({
      d,a,ci,recToDate,
      shipments:sapShipments,shipmentItems:sapShipmentItems,
      externalShipments:sapExternalShipments,externalShipmentItems:sapExternalShipmentItems,
      returns:sapReturns,returnItems:sapReturnItems,
      items:sapItems,estimatedOn:x.estimated_on,
      officialFeedStock:historyStockByEstimate.get(x.id)||[]
    });
    const sapronakCost=sapSnapshot.totalCost;
    const ipBonus=totalProjectedKg*matchBonus('IP',ip);
    const fcrDiff=fcrStd>0?fcrStd-fcr:0;
    const fcrBonus=fcrDiff>0?totalProjectedKg*matchBonus('FCR_DIFFERENCE',fcrDiff):0;
    const depletionBonus=totalProjectedKg*matchBonus('DEPLETION',mort);
    const farmerProfit=totalProjection-sapronakCost+ipBonus+fcrBonus+depletionBonus;
    const revenuePerBird=initial>0?farmerProfit/initial:0;

    const sapronakHtml=sapSnapshot.rows.length
      ?'<div class="tablewrap estimate-sapronak-table"><table><thead><tr><th>Sapronak</th><th>Masuk Bersih</th><th>Terpakai / Retur</th><th>Sisa / Bersih</th><th>Harga Kontrak</th><th>Beban Estimasi</th></tr></thead><tbody>'+
        sapSnapshot.rows.map(r=>{
          const balanceClass=prodNum(r.balance)<0?' class="num error"':' class="num"';
          return '<tr><td>'+esc(r.label)+'</td>'+
            '<td class="num">'+prodFmt(r.incoming,r.category==='DOC'?0:2)+' '+esc(r.unit)+'</td>'+
            '<td class="num">'+prodFmt(r.usedOrReturn,r.category==='DOC'?0:2)+' '+esc(r.unit)+'</td>'+
            '<td'+balanceClass+'><strong>'+prodFmt(r.balance,r.category==='DOC'?0:2)+' '+esc(r.unit)+'</strong></td>'+
            '<td class="num">Rp '+prodFmt(r.price,0)+'/'+esc(r.unit)+'</td>'+
            '<td class="num">Rp '+prodFmt(r.value,0)+'</td></tr>';
        }).join('')+
        '<tr class="estimate-sapronak-total"><td colspan="5"><strong>Total Beban Sapronak Estimasi</strong></td><td class="num"><strong>Rp '+prodFmt(sapSnapshot.totalCost,0)+'</strong></td></tr>'+
        '</tbody></table></div>'+
        '<div class="estimate-sapronak-meta"><span>Pakan masuk bersih: <strong>'+prodFmt(sapSnapshot.feedIncomingKg,0)+' Kg</strong></span><span>Pakan terpakai Recording: <strong>'+prodFmt(sapSnapshot.feedUsedKg,0)+' Kg</strong></span><span>Sisa/selisih stok: <strong>'+prodFmt(sapSnapshot.feedBalanceKg,0)+' Kg</strong></span></div>'
      :'<p class="muted">Belum ada sumber sapronak untuk estimasi ini.</p>';

    const harvestContractRows=[
      ...priorHarvests.map((h,i)=>{
        const birds=prodNum(h.birds),kg=prodNum(h.net_weight_kg);
        const rowBw=prodNum(h.avg_weight_kg)||(birds>0?kg/birds:0);
        const price=estimateContractLivePrice(d,a,rowBw);
        return {label:'Aktual '+(i+1),birds,bw:rowBw,kg,price,value:kg*price};
      }),
      ...sz.map((v,i)=>{
        const birds=prodNum(v.birds),rowBw=prodNum(v.bw_kg),kg=birds*rowBw;
        const price=estimateContractLivePrice(d,a,rowBw);
        return {label:'Proyeksi '+(i+1),birds,bw:rowBw,kg,price,value:kg*price};
      })
    ];
    const harvestContractHtml=harvestContractRows.length
      ?'<div class="tablewrap estimate-harvest-contract-table"><table><thead><tr><th>Jenis</th><th>Ekor</th><th>BW</th><th>Total Kg</th><th>Harga Kontrak/Kg</th><th>Nilai</th></tr></thead><tbody>'+
        harvestContractRows.map(r=>'<tr><td>'+esc(r.label)+'</td><td class="num">'+prodFmt(r.birds,0)+'</td><td class="num">'+prodFmt(r.bw,3)+' Kg</td><td class="num">'+prodFmt(r.kg,2)+' Kg</td><td class="num">Rp '+prodFmt(r.price,0)+'</td><td class="num">Rp '+prodFmt(r.value,0)+'</td></tr>').join('')+
        '<tr class="estimate-harvest-contract-total"><td colspan="3"><strong>Total Panen Kontrak</strong></td><td class="num"><strong>'+prodFmt(totalProjectedKg,2)+' Kg</strong></td><td></td><td class="num"><strong>Rp '+prodFmt(totalProjection,0)+'</strong></td></tr>'+
        '</tbody></table></div>'
      :'<p class="muted">Belum ada rincian panen kontrak.</p>';

    const economicHtml=
      '<div class="estimate-economy-grid">'+
        '<div><span>Total Nilai Panen Kontrak</span><strong>Rp '+prodFmt(totalProjection,0)+'</strong></div>'+
        '<div><span>Total Beban Sapronak Estimasi</span><strong>Rp '+prodFmt(sapronakCost,0)+'</strong></div>'+
        '<div><span>Bonus IP</span><strong>Rp '+prodFmt(ipBonus,0)+'</strong></div>'+
        '<div><span>Bonus FCR</span><strong>Rp '+prodFmt(fcrBonus,0)+'</strong></div>'+
        '<div><span>Bonus Deplesi</span><strong>Rp '+prodFmt(depletionBonus,0)+'</strong></div>'+
        '<div><span>Laba Estimasi</span><strong>Rp '+prodFmt(farmerProfit,0)+'</strong></div>'+
        '<div class="estimate-economy-total"><span>Pend./Ekor</span><strong>Rp '+prodFmt(revenuePerBird,0)+'</strong></div>'+
      '</div>';
    return '<article class="estimate-history-card">'+
      '<div class="estimate-history-head"><div><h4>Umur '+prodAge(ci?.arrived_on,x.estimated_on)+' hari</h4><p>'+prodDateId(x.estimated_on)+' · '+esc(a?prodAssignmentOption(d,a):'-')+'</p></div><div class="inline-actions"><button type="button" data-edit-est="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('production_estimates',x.id)+'</div></div>'+
      '<div class="estimate-history-grid estimate-history-performance">'+
        '<div><span>IN</span><strong>'+prodFmt(initial,0)+'</strong></div>'+
        '<div><span>OUT</span><strong>'+prodFmt(outBirds,0)+'</strong></div>'+
        '<div><span>Umur Rata2</span><strong>'+prodFmt(age,2)+' hari</strong></div>'+
        '<div><span>Kg Panen</span><strong>'+prodFmt(totalProjectedKg,0)+' Kg</strong></div>'+
        '<div><span>Mort</span><strong>'+prodFmt(mort,2)+'%</strong></div>'+
        '<div><span>Pakan</span><strong>'+prodFmt(feedKg,0)+' Kg</strong></div>'+
        '<div><span>BW</span><strong>'+prodFmt(bw,3)+' Kg</strong></div>'+
        '<div><span>FC</span><strong>'+prodFmt(fc,0)+' g/ekor</strong></div>'+
        '<div><span>IP</span><strong>'+prodFmt(ip,1)+'</strong></div>'+
        '<div class="estimate-history-total"><span>Pend./Ekor Kontrak</span><strong>Rp '+prodFmt(revenuePerBird,0)+'</strong></div>'+
      '</div>'+
      '<div class="estimate-history-sapronak"><div class="estimate-history-subtitle">Rekap Sapronak · Harga Kontrak</div>'+sapronakHtml+'</div>'+
      '<div class="estimate-history-sizes"><div class="estimate-history-subtitle">Rincian Panen · Harga Kontrak per Kg</div>'+harvestContractHtml+'</div>'+
      '<div class="estimate-history-sizes"><div class="estimate-history-subtitle">Ringkasan Ekonomi Estimasi</div>'+economicHtml+'</div>'+
      (x.notes?'<div class="estimate-history-notes"><span>Catatan</span><p>'+esc(x.notes)+'</p></div>':'')+
    '</article>';
  }).join('');

  const historyAssignmentOptions=historyAssignments
    .filter(a=>!estimateHistoryState.barn||a.barn_id===estimateHistoryState.barn)
    .sort((a,b)=>String(b.start_date||'').localeCompare(String(a.start_date||'')));
  html+='<section class="panel"><div class="rhpp-section-head"><div><h3>Riwayat Estimasi</h3>'+
    '<p class="muted">Pilih Kandang dan Siklus untuk melihat seluruh isian Estimasi yang tersimpan mulai umur 23 hari sampai estimasi terakhir/panen.</p></div>'+
    (estimateHistoryState.shown&&selectedEstimateHistoryAssignment?'<span class="pill">'+historyEstimates.length+' estimasi</span>':'')+'</div>'+
    '<form id="estimateHistoryFilter" class="form-vertical" data-no-submit-guard="1">'+
      '<label>Kandang<select name="barn" required><option value="">Pilih Kandang</option>'+
        historyBarns.map(b=>'<option value="'+esc(b.id)+'" '+(estimateHistoryState.barn===b.id?'selected':'')+'>'+esc(b.name||'-')+'</option>').join('')+
      '</select></label>'+
      '<label>Siklus<select name="assignment" required '+(estimateHistoryState.barn?'':'disabled')+'><option value="">Pilih Siklus</option>'+
        historyAssignmentOptions.map(a=>'<option value="'+esc(a.id)+'" '+(estimateHistoryState.assignment===a.id?'selected':'')+'>'+esc(prodAssignmentOption(d,a))+'</option>').join('')+
      '</select></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button></div>'+
    '</form>'+
    (estimateHistoryState.shown&&selectedEstimateHistoryAssignment?'<div class="report-actions"><button type="button" id="estimateHistoryPrint">Cetak</button> <button type="button" id="estimateHistoryPdf">PDF</button> <button type="button" id="estimateHistoryExcel">Excel</button></div>':'')+
    '<div id="estimateHistoryOutput" class="estimate-history-list">'+(
      !estimateHistoryState.shown
        ?'<p class="muted">Pilih Kandang dan Siklus, lalu tekan Tampilkan.</p>'
        :(estimateHistoryCards||'<p class="muted">Belum ada isian Estimasi tersimpan mulai umur 23 hari pada siklus ini.</p>')
    )+'</div>'+
    '<p class="muted estimate-history-foot">Urutan riwayat berdasarkan umur ayam: Hari 23, 24, 25, dan seterusnya. Hari yang tidak pernah mempunyai isian Estimasi tidak dibuat sebagai data. Sumber sistematis Estimasi tetap memakai data tersimpan dan Estimasi tidak mengubah RHPP.</p></section>';

  layout(html);
  if(d.err||er.error||sr.error||rr.error||bonusR.error||shipR.error||shipItemR.error||extShipR.error||extShipItemR.error||returnR.error||returnItemR.error||itemR.error)msg((d.err||er.error||sr.error||rr.error||bonusR.error||shipR.error||shipItemR.error||extShipR.error||extShipItemR.error||returnR.error||returnItemR.error||itemR.error).message);

  bindAdminTransactionDeletes(()=>productionEstimatePage());
  if(estimateHistoryState.shown&&selectedEstimateHistoryAssignment)bindHtmlExportActions({elementId:'estimateHistoryOutput',printId:'estimateHistoryPrint',pdfId:'estimateHistoryPdf',excelId:'estimateHistoryExcel',title:'Riwayat Estimasi',filename:'Riwayat_Estimasi',filterText:prodAssignmentOption(d,selectedEstimateHistoryAssignment)});

  const historyFilter=document.getElementById('estimateHistoryFilter');
  if(historyFilter){
    const hb=historyFilter.elements.barn,ha=historyFilter.elements.assignment;
    hb.onchange=()=>{
      const bid=hb.value||'';
      estimateHistoryState.barn=bid;
      estimateHistoryState.assignment='';
      estimateHistoryState.shown=false;
      const opts=historyAssignments
        .filter(a=>a.barn_id===bid)
        .sort((a,b)=>String(b.start_date||'').localeCompare(String(a.start_date||'')));
      ha.disabled=!bid;
      ha.innerHTML='<option value="">Pilih Siklus</option>'+opts.map(a=>'<option value="'+esc(a.id)+'">'+esc(prodAssignmentOption(d,a))+'</option>').join('');
    };
    ha.onchange=()=>{estimateHistoryState.assignment=ha.value||'';estimateHistoryState.shown=false;};
    historyFilter.onsubmit=async e=>{
      e.preventDefault();
      estimateHistoryState.barn=hb.value||'';
      estimateHistoryState.assignment=ha.value||'';
      if(!estimateHistoryState.barn||!estimateHistoryState.assignment)return msg('Pilih Kandang dan Siklus.');
      estimateHistoryState.shown=true;
      await productionEstimatePage();
    };
  }

  const f=document.getElementById('prodEst');
  const holder=document.getElementById('estSizes');
  const saveBtn=document.getElementById('estSave');
  const cancelBtn=document.getElementById('estCancel');
  let draft=[{birds:0,bw:0}],editingId=null;

  const birdInt=v=>{
    const digits=String(v??'').replace(/\D/g,'');
    return digits?Number(digits):0;
  };
  const birdFmt=v=>{
    const n=Math.max(0,Math.trunc(Number(v)||0));
    return n?new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(n):'';
  };
  const updateUnallocated=()=>{
    const real=Math.trunc(prodNum(f.remaining.value));
    const allocated=draft.reduce((s,x)=>s+Math.trunc(Number(x.birds)||0),0);
    const left=real-allocated;
    const el=document.getElementById('estUnallocated');
    if(el)el.innerHTML='<strong>Sisa Belum Terbagi: '+prodFmt(Math.max(0,left),0)+' ekor</strong>'+(left<0?' <span class="error">· Melebihi sisa real '+prodFmt(Math.abs(left),0)+' ekor</span>':'');
    return left;
  };

  const currentFinancial=()=>{
    const a=d.assignments.find(x=>x.id===f.assignment.value);
    const ci=a&&d.chicks.find(c=>c.contract_assignment_id===a.id);
    return calcFinance(a,ci,draft.map(x=>({birds:x.birds,bw_kg:x.bw})));
  };
  const preview=()=>{
    const a=d.assignments.find(x=>x.id===f.assignment.value),ci=a&&d.chicks.find(c=>c.contract_assignment_id===a.id);
    const age=ci&&f.date.value?prodAge(ci.arrived_on,f.date.value):0;
    const priorHarvests=a?d.harvests.filter(h=>h.contract_assignment_id===a.id&&h.harvested_on<f.date.value):[];
    const harvBirds=priorHarvests.reduce((s,h)=>s+prodNum(h.birds),0);
    const harvKg=priorHarvests.reduce((s,h)=>s+prodNum(h.net_weight_kg),0);
    const priorRevenue=estimateContractHarvestValue(d,a,priorHarvests);
    const birds=draft.reduce((s,x)=>s+prodNum(x.birds),0);
    const bio=draft.reduce((s,x)=>s+prodNum(x.birds)*prodNum(x.bw),0);
    const totalProjectedBirds=harvBirds+birds;
    const totalProjectedBio=harvKg+bio;
    const bw=totalProjectedBirds?totalProjectedBio/totalProjectedBirds:0;
    const fin=currentFinancial();
    const totalRevenue=priorRevenue+fin.revenue;
    document.getElementById('estAge').textContent='Umur: '+(ci?age+' hari':'-');
    document.getElementById('estActualHarvest').textContent='Panen aktual sebelum tanggal estimasi: '+prodFmt(harvBirds,0)+' ekor';
    document.getElementById('estPreview').innerHTML=
      '<div class="panel estimate-summary-panel"><h4 style="margin-top:0">Ringkasan Estimasi</h4>'+
        '<div class="estimate-summary-grid">'+
          '<div class="rhpp-summary-card"><span>BW Proyeksi Gabungan</span><strong>'+prodFmt(bw,3)+' Kg</strong></div>'+
          '<div class="rhpp-summary-card"><span>Nilai Panen Aktual (Kontrak)</span><strong>Rp '+prodFmt(priorRevenue,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Proyeksi Sisa Panen</span><strong>Rp '+prodFmt(fin.revenue,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Proyeksi Panen</span><strong>Rp '+prodFmt(totalRevenue,0)+'</strong></div>'+
        '</div>'+
        '<p class="muted" style="margin:10px 0 0">Kematian/culling hanya diambil dari Recording untuk Estimasi. Data ini tidak masuk RHPP.</p>'+
      '</div>';
  };
  const syncEstimateDraftFromDom=()=>{
    holder.querySelectorAll('[data-est-birds]').forEach(x=>{const i=Number(x.dataset.estBirds);if(draft[i])draft[i].birds=birdInt(x.value)});
    holder.querySelectorAll('[data-est-bw]').forEach(x=>{const i=Number(x.dataset.estBw);if(draft[i])draft[i].bw=prodNum(x.value)});
  };
  const renderSizes=()=>{
    holder.innerHTML=draft.map((x,i)=>'<div class="est-size-row"><strong>Ukuran '+(i+1)+'</strong><label>Jumlah Ayam (ekor)<input type="text" inputmode="numeric" data-est-birds="'+i+'" value="'+birdFmt(x.birds)+'" placeholder="Contoh: 7.697" required></label><label>BW (kg)<input type="number" min="0.01" step="0.001" data-est-bw="'+i+'" value="'+(prodNum(x.bw)||'')+'" placeholder="Contoh: 1.15" required></label>'+(draft.length>1?'<button type="button" data-est-del="'+i+'">Hapus Ukuran</button>':'')+'</div>').join('');
    holder.querySelectorAll('[data-est-birds]').forEach(x=>x.oninput=()=>{
      const i=Number(x.dataset.estBirds);draft[i].birds=birdInt(x.value);x.value=birdFmt(draft[i].birds);updateUnallocated();preview();
    });
    holder.querySelectorAll('[data-est-bw]').forEach(x=>x.oninput=()=>{draft[Number(x.dataset.estBw)].bw=prodNum(x.value);preview()});
    holder.querySelectorAll('[data-est-del]').forEach(x=>x.onclick=()=>{syncEstimateDraftFromDom();draft.splice(Number(x.dataset.estDel),1);renderSizes();updateUnallocated();preview()});
  };
  document.getElementById('addEstSize').onclick=()=>{syncEstimateDraftFromDom();draft.push({birds:0,bw:0});renderSizes();updateUnallocated();preview()};

  const syncEstimateDate=()=>{
    const a=d.assignments.find(x=>x.id===f.assignment.value),ci=a&&d.chicks.find(c=>c.contract_assignment_id===a.id);
    if(!a||!ci){f.date.value='';document.getElementById('estDate').textContent='Tanggal Estimasi: -';return}
    const marketingHarvests=d.harvests
      .filter(h=>h.contract_assignment_id===a.id)
      .sort((x,y)=>String(y.harvested_on||'').localeCompare(String(x.harvested_on||'')));
    const today=prodToday();
    const minDate=prodDateAdd(ci.arrived_on,22);
    const latestHarvest=marketingHarvests[0]?.harvested_on||'';
    const autoDate=[today,minDate,latestHarvest].filter(Boolean).sort().pop();
    f.date.value=autoDate;
    document.getElementById('estDate').textContent='Tanggal Estimasi: '+prodDateId(autoDate);
  };
  const syncExistingState=()=>{
    if(editingId)return;
    const existing=rows.find(x=>x.contract_assignment_id===f.assignment.value&&x.estimated_on===f.date.value);
    const el=document.getElementById('estExisting');
    if(existing){
      el.textContent='Estimasi umur '+prodAge(d.chicks.find(c=>c.contract_assignment_id===existing.contract_assignment_id)?.arrived_on,existing.estimated_on)+' sudah tersimpan. Gunakan tombol Edit pada Riwayat Estimasi.';
      saveBtn.disabled=true;
    }else{
      el.textContent='';
      saveBtn.disabled=false;
    }
  };
  f.assignment.onchange=()=>{
    window.__pplEstimateAssignment=f.assignment.value||'';
    syncEstimateDate();
    const a=d.assignments.find(x=>x.id===f.assignment.value),ci=a&&d.chicks.find(c=>c.contract_assignment_id===a.id);
    if(a&&ci&&f.date.value){
      const death=recs
        .filter(r=>r.contract_assignment_id===a.id&&r.recorded_on<=f.date.value)
        .reduce((sum,r)=>sum+prodNum(r.mortality)+prodNum(r.culling),0);
      const harv=d.harvests
        .filter(h=>h.contract_assignment_id===a.id&&h.harvested_on<=f.date.value)
        .reduce((sum,h)=>sum+prodNum(h.birds),0);
      f.remaining.value=Math.max(0,prodNum(ci.received)-prodNum(ci.doa)-death-harv);
    }else f.remaining.value='';
    draft=[{birds:0,bw:0}];renderSizes();updateUnallocated();syncExistingState();preview();
  };

  const resetEdit=()=>{
    editingId=null;f.assignment.disabled=false;f.notes.value='';saveBtn.textContent='Simpan Estimasi';cancelBtn.style.display='none';
    if(eligibleAssignments.length===1){f.assignment.value=eligibleAssignments[0].id;f.assignment.onchange()}
    else{f.assignment.value='';f.assignment.onchange()}
  };
  cancelBtn.onclick=resetEdit;

  root.querySelectorAll('[data-edit-est]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.id===btn.dataset.editEst);if(!x)return;
    editingId=x.id;
    f.assignment.value=x.contract_assignment_id;
    f.assignment.disabled=true;
    f.date.value=x.estimated_on;
    document.getElementById('estDate').textContent='Tanggal Estimasi: '+prodDateId(x.estimated_on);
    f.remaining.value=prodNum(x.remaining_birds);
    f.notes.value=x.notes||'';
    draft=sizes.filter(s=>s.estimate_id===x.id).map(s=>({birds:prodNum(s.birds),bw:prodNum(s.bw_kg)}));
    if(!draft.length)draft=[{birds:0,bw:0}];
    renderSizes();updateUnallocated();saveBtn.disabled=false;saveBtn.textContent='Update Estimasi';cancelBtn.style.display='';
    document.getElementById('estExisting').textContent='Mode Edit Estimasi umur '+prodAge(d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id)?.arrived_on,x.estimated_on)+'.';
    preview();window.scrollTo({top:0,behavior:'smooth'});
  });

  renderSizes();syncEstimateDate();updateUnallocated();preview();
  if(eligibleAssignments.length===1){f.assignment.value=eligibleAssignments[0].id;f.assignment.onchange()}

  f.onsubmit=async e=>{
    e.preventDefault();
    const a=d.assignments.find(x=>x.id===f.assignment.value),ci=a&&d.chicks.find(c=>c.contract_assignment_id===a.id);
    if(!a||!ci)return msg('Pilih kontrak aktif yang sudah Chick-In.');
    if(prodAge(ci.arrived_on,f.date.value)<23)return msg('Estimasi dimulai umur 23 hari.');
    if(!editingId&&rows.some(x=>x.contract_assignment_id===a.id&&x.estimated_on===f.date.value))return msg('Estimasi umur ini sudah tersimpan. Gunakan Edit.');
    if(draft.some(x=>x.birds<=0||x.bw<=0))return msg('Isi jumlah ayam dan BW untuk semua ukuran.');
    const left=updateUnallocated();
    if(left<0)return msg('Jumlah ayam per ukuran melebihi Sisa Ayam Real.');
    if(left>0)return msg('Masih ada '+prodFmt(left,0)+' ekor yang belum terbagi ke ukuran.');
    const fin=currentFinancial();
    const priorHarvests=d.harvests
      .filter(h=>h.contract_assignment_id===a.id&&h.harvested_on<=f.date.value);
    const priorRevenue=estimateContractHarvestValue(d,a,priorHarvests);
    const projectedRemainingRevenue=draft.reduce((sum,x)=>{
      return sum+prodNum(x.birds)*prodNum(x.bw)*estimateContractLivePrice(d,a,x.bw);
    },0);
    const saveRevenue=priorRevenue+projectedRemainingRevenue;
    const saveProfit=0;
    const savePerChick=0;
    const wasEdit=!!editingId;
    const {error:saveError}=await db.rpc('save_production_estimate_atomic',{
      p_id:editingId||null,
      p_assignment_id:a.id,
      p_barn_id:a.barn_id,
      p_estimated_on:f.date.value,
      p_remaining_birds:Math.trunc(prodNum(f.remaining.value)),
      p_feed_used_kg:0,
      p_notes:f.notes.value||null,
      p_estimated_revenue:saveRevenue,
      p_estimated_cost:0,
      p_estimated_profit:saveProfit,
      p_profit_per_chick_in:savePerChick,
      p_sizes:draft.map(x=>({birds:Math.trunc(prodNum(x.birds)),bw_kg:prodNum(x.bw)}))
    });
    if(saveError)return msg(saveError.message);
    window.__pplEstimateAssignment=a.id;
    await productionEstimatePage();
    msg(wasEdit?'Estimasi berhasil diperbarui.':'Estimasi performa tersimpan.',true);
  };
}
const leagueAbkName=e=>e?.name||'-';
const leagueBarnName=(d,a)=>{
  const b=a&&d.barns.find(x=>x.id===a.barn_id);
  if(!b)return '-';
  const n=String(b.name||'').trim();
  return n.replace(/^Internal\s+/i,'Int.');
};
const leagueAssignmentLabel=(d,a)=>leagueBarnName(d,a);

async function loadAbkLeagueSetting(){
  const {data,error}=await db.from('abk_league_settings').select('id,season_start,reset_count,updated_at').eq('id',true).maybeSingle();
  return {data:data||null,error};
}

async function resetKlasemenAbkPage(){
  const leagueSetting=await loadAbkLeagueSetting();
  const current=leagueSetting.data?.season_start||prodToday();
  layout('<section class="panel"><h3>Reset Klasemen ABK</h3>'+
    '<p class="muted">Atur tanggal awal musim klasemen. Histori lama tetap tersimpan dan tidak dihapus.</p>'+
    '<form id="abkSeasonReset" class="form-vertical">'+
      '<label>Awal Musim<input type="date" name="season_start" value="'+esc(current)+'" required></label>'+
      '<button type="submit">Reset Klasemen dari Tanggal Ini</button>'+
    '</form>'+
    '<p class="muted">Periode klasemen aktif sejak '+prodDateId(current)+'.</p></section>');
  if(leagueSetting.error)msg(leagueSetting.error.message);
  const seasonForm=document.getElementById('abkSeasonReset');
  if(seasonForm)seasonForm.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(seasonForm),start=String(fd.get('season_start')||'');
    if(!start)return msg('Tanggal awal musim wajib diisi.');
    const {error}=await db.from('abk_league_settings').upsert({
      id:true,
      season_start:start,
      reset_count:prodNum(leagueSetting.data?.reset_count)+1,
      updated_by:session.user.id,
      updated_at:new Date().toISOString()
    });
    if(error)return msg(error.message);
    await resetKlasemenAbkPage();
    msg('Klasemen dimulai ulang dari '+prodDateId(start)+'. Histori lama tetap tersimpan.',true);
  };
}

async function leagueByBarnViewPage(){
  const d=await productionBase({includeRhppCosts:false});
  const leagueSetting=await loadAbkLeagueSetting();
  const [rr,sr,cr,br,finalR]=await Promise.all([
    db.from('production_abk_results').select('*'),
    db.from('production_abk_result_sizes').select('*'),
    db.from('contracts').select('id,doc_price,pre_starter_price,starter_price,finisher_price'),
    db.from('contract_bonuses').select('contract_id,metric,min_value,max_value,rupiah_per_kg'),
    db.from('production_cycle_final_unified').select('contract_assignment_id')
  ]);
  const allowedAssignmentIds=new Set(d.assignments.map(a=>a.id));
  const rows=(rr.data||[]).filter(x=>allowedAssignmentIds.has(x.contract_assignment_id));
  const allowedResultIds=new Set(rows.map(x=>x.id));
  const sizes=(sr.data||[]).filter(x=>allowedResultIds.has(x.result_id));
  const leagueContracts=cr.data||[],leagueBonuses=br.data||[];
  const closedFinalAssignmentIds=new Set((finalR.data||[]).map(x=>x.contract_assignment_id).filter(Boolean));
  const seasonStart=leagueSetting.data?.season_start||'0000-00-00';
  const err=[{error:d.err},leagueSetting,rr,sr,cr,br,finalR].find(x=>x?.error)?.error;
  if(err)return layout('<section class="panel"><h3>Lihat Liga per Kandang</h3><p class="error">'+esc(err.message)+'</p></section>');

  window.__leagueByBarnState=window.__leagueByBarnState||{barn:'',assignment:''};
  const st=window.__leagueByBarnState;
  const abkReferenceContractId=a=>{
    if(a?.master_contract_id)return a.master_contract_id;
    if(a?.cycle_type!=='MANDIRI')return '';
    const ids=[...new Set((d.livePrices||[]).map(p=>p.contract_id).filter(Boolean))];
    return ids.length===1?ids[0]:'';
  };
  const calcResult=x=>{
    const a=d.assignments.find(a=>a.id===x.contract_assignment_id);
    const ci=d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id);
    const link=d.links.find(l=>l.contract_assignment_id===x.contract_assignment_id&&l.abk_id===x.abk_id);
    const refContractId=abkReferenceContractId(a);
    const sz=sizes.filter(v=>v.result_id===x.id);
    const birds=sz.reduce((sum,v)=>sum+prodNum(v.birds),0);
    const kg=sz.reduce((sum,v)=>sum+prodNum(v.weight_kg),0);
    const bw=birds?kg/birds:0;
    const feed=(prodNum(link?.feed_pre_bags)+prodNum(link?.feed_starter_bags)+prodNum(link?.feed_finisher_bags))*50;
    const fcr=kg?feed/kg:0;
    const age=birds&&ci?sz.reduce((sum,v)=>sum+prodAge(ci.arrived_on,v.harvest_date)*prodNum(v.birds),0)/birds:0;
    const initial=prodNum(link?.initial_birds);
    const survival=initial?Math.min(100,birds/initial*100):0;
    const ip=initial&&age&&fcr?(survival*bw*100)/(age*fcr):0;
    let revenue=0;
    for(const z of sz){
      const av=prodNum(z.birds)?prodNum(z.weight_kg)/prodNum(z.birds):0;
      const p=d.livePrices.find(p=>p.contract_id===refContractId&&av>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||av<prodNum(p.max_weight_kg)));
      revenue+=prodNum(z.weight_kg)*prodNum(p?.price_per_kg);
    }
    const contract=leagueContracts.find(c=>c.id===refContractId);
    const sapronakCost=
      initial*prodNum(contract?.doc_price)+
      prodNum(link?.feed_pre_bags)*50*prodNum(contract?.pre_starter_price)+
      prodNum(link?.feed_starter_bags)*50*prodNum(contract?.starter_price)+
      prodNum(link?.feed_finisher_bags)*50*prodNum(contract?.finisher_price);
    const matchBonus=(metric,value)=>prodNum(leagueBonuses.find(b=>
      b.contract_id===refContractId&&b.metric===metric&&
      (b.min_value==null||value>=prodNum(b.min_value))&&
      (b.max_value==null||value<prodNum(b.max_value))
    )?.rupiah_per_kg);
    const ipBonus=kg*matchBonus('IP',ip);
    const perfRows=d.standards
      .filter(v=>(a?.cycle_type==='MANDIRI'||v.contract_id===a?.master_contract_id)&&v.template_name===a?.performance_template_name&&v.std_fcr!=null)
      .sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days));
    let stdFcr=0;
    if(perfRows.length){
      const exact=perfRows.find(v=>prodNum(v.age_days)===age);
      if(exact)stdFcr=prodNum(exact.std_fcr);
      else{
        const lower=[...perfRows].reverse().find(v=>prodNum(v.age_days)<=age);
        const upper=perfRows.find(v=>prodNum(v.age_days)>=age);
        if(lower&&upper&&prodNum(upper.age_days)!==prodNum(lower.age_days)){
          const ratio=(age-prodNum(lower.age_days))/(prodNum(upper.age_days)-prodNum(lower.age_days));
          stdFcr=prodNum(lower.std_fcr)+(prodNum(upper.std_fcr)-prodNum(lower.std_fcr))*ratio;
        }else stdFcr=prodNum((lower||upper)?.std_fcr);
      }
    }
    const fcrDiff=stdFcr?stdFcr-fcr:0;
    const fcrBonus=fcrDiff>0?kg*matchBonus('FCR_DIFFERENCE',fcrDiff):0;
    const profit=revenue-sapronakCost+ipBonus+fcrBonus;
    const perBird=birds?profit/birds:0;
    return {...x,a,birds,kg,bw,feed,fcr,ip,initial,profit,perBird,complete:!!link?.basics_locked_at&&initial>0&&birds>0&&kg>0&&feed>0};
  };

  const calculated=rows.map(calcResult);
  const selectableAssignments=d.assignments.filter(a=>a.active===true||closedFinalAssignmentIds.has(a.id));
  const barnIds=[...new Set(selectableAssignments.map(a=>a.barn_id).filter(Boolean))];
  const barnRows=d.barns.filter(b=>barnIds.includes(b.id)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  if(st.barn&&!barnRows.some(b=>b.id===st.barn)){st.barn='';st.assignment='';}
  const assignmentRows=st.barn?selectableAssignments
    .filter(a=>a.barn_id===st.barn)
    .sort((u,v)=>String(v.start_date||'').localeCompare(String(u.start_date||''))):[];
  if(st.assignment&&!assignmentRows.some(a=>a.id===st.assignment))st.assignment='';

  const scoped=st.assignment?calculated.filter(x=>
    x.complete&&
    x.contract_assignment_id===st.assignment&&
    (x.a?.active===true||closedFinalAssignmentIds.has(x.contract_assignment_id))
  ):[];
  const map=new Map();
  scoped.forEach(x=>{
    if(!map.has(x.abk_id))map.set(x.abk_id,{...x,birds:0,kg:0,feed:0,profit:0,ipWeighted:0,totalPopulation:0,periods:0});
    const g=map.get(x.abk_id);
    g.birds+=prodNum(x.birds);
    g.kg+=prodNum(x.kg);
    g.feed+=prodNum(x.feed);
    g.profit+=prodNum(x.profit);
    g.totalPopulation+=prodNum(x.initial);
    g.ipWeighted+=prodNum(x.ip)*prodNum(x.birds);
    g.periods+=1;
    g.a=x.a;
  });
  const league=[...map.values()].map(g=>({
    ...g,
    bw:g.birds?g.kg/g.birds:0,
    fcr:g.kg?g.feed/g.kg:0,
    ip:g.birds?g.ipWeighted/g.birds:0,
    perBird:g.birds?g.profit/g.birds:0
  })).filter(g=>d.abks.find(e=>e.id===g.abk_id)?.active!==false);

  const max=k=>Math.max(...league.map(x=>prodNum(x[k])),0);
  const min=k=>Math.min(...league.map(x=>prodNum(x[k])).filter(v=>v>0),0);
  league.forEach(x=>{
    const hi=k=>max(k)?prodNum(x[k])/max(k):0;
    const lo=k=>prodNum(x[k])>0&&min(k)>0?min(k)/prodNum(x[k]):0;
    x.score=hi('perBird')*.50+lo('fcr')*.30+hi('ip')*.20;
  });
  league.sort((a,b)=>b.score-a.score);

  const selectedBarn=d.barns.find(b=>b.id===st.barn);
  const selectedAssignment=d.assignments.find(a=>a.id===st.assignment);
  let html='<section class="panel"><h3>Lihat Liga per Kandang</h3><p class="muted">Pilih kandang, lalu pilih siklus PROSES atau CLOSED. Sumber dan bobot sama dengan Liga ABK utama.</p>'+
    '<form id="leagueByBarnFilter" class="form-vertical" data-no-submit-guard="1">'+
      '<label>Kandang<select id="leagueByBarnSelect" required><option value="">Pilih Kandang</option>'+
        barnRows.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+
      '</select></label>'+
      '<label>Siklus<select id="leagueByBarnAssignment" required '+(!st.barn?'disabled':'')+'><option value="">Pilih Siklus</option>'+
        assignmentRows.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(d.assignments,a)+' · '+(a.cycle_type||'MITRA')+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+
      '</select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>';

  if(st.assignment){
    html+='<section class="panel"><div class="owner-section-title"><div><h3>Liga ABK · '+esc(selectedBarn?shortBarnLabel(selectedBarn):'-')+' · '+esc(assignmentCycleLabel(d.assignments,selectedAssignment))+'</h3>'+
      '<p class="muted">'+(selectedAssignment?.active?'Status PROSES · ranking sementara dari data Liga ABK yang sudah masuk':'Status CLOSED · hasil final')+' · Pendapatan/Ekor 50% · FCR 30% · IP 20%</p></div><span class="owner-trophy">🏆</span></div>'+
      '<div class="report-actions"><button type="button" id="leagueBarnPrint">Cetak</button> <button type="button" id="leagueBarnPdf">PDF</button> <button type="button" id="leagueBarnExcel">Excel</button></div><div class="tablewrap"><table id="leagueBarnTable" class="owner-table"><thead><tr><th>Peringkat</th><th>ABK</th><th class="num">Siklus</th><th class="num">Total Populasi</th><th class="num">Total Ekor Panen</th><th class="num">Pendapatan/Ekor</th><th class="num">IP</th><th class="num">FCR</th><th class="num">BW</th></tr></thead><tbody>'+
      league.map((x,i)=>{
        const e=d.abks.find(v=>v.id===x.abk_id);
        const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
        return '<tr><td class="owner-rank">'+medal+'</td><td><strong>'+esc(leagueAbkName(e))+'</strong></td><td class="num">'+prodFmt(x.periods,0)+'</td><td class="num">'+prodFmt(x.totalPopulation,0)+'</td><td class="num">'+prodFmt(x.birds,0)+'</td><td class="num">Rp '+prodFmt(x.perBird,0)+'</td><td class="num">'+prodFmt(x.ip,2)+'</td><td class="num">'+prodFmt(x.fcr,3)+'</td><td class="num">'+prodFmt(x.bw,3)+'</td></tr>';
      }).join('')+
      '</tbody></table></div>'+(league.length?'':'<p class="muted">Belum ada hasil Liga ABK lengkap untuk siklus ini.</p>')+'</section>';
  }

  layout(html);
  if(st.assignment)bindTableExportActions({tableId:'leagueBarnTable',printId:'leagueBarnPrint',pdfId:'leagueBarnPdf',excelId:'leagueBarnExcel',title:'Liga ABK per Kandang',filename:'Liga_ABK_per_Kandang',filterText:(selectedBarn?shortBarnLabel(selectedBarn):'-')+' · '+assignmentCycleLabel(d.assignments,selectedAssignment)});
  const form=document.getElementById('leagueByBarnFilter');
  const select=document.getElementById('leagueByBarnSelect');
  const assignment=document.getElementById('leagueByBarnAssignment');
  if(form)form.onsubmit=e=>{e.preventDefault();if(!select?.value)return msg('Pilih kandang.');if(!assignment?.value)return msg('Pilih siklus.');st.barn=select.value;st.assignment=assignment.value;leagueByBarnViewPage();};
  if(select)select.onchange=()=>{st.barn=select.value||'';st.assignment='';leagueByBarnViewPage();};
}

async function leagueAbkPage(editSizeId=null){
  window.__leagueAbkState=window.__leagueAbkState||{assignment:'',abk:''};
  window.__leagueAbkHistoryFilter=window.__leagueAbkHistoryFilter||{barn:'',assignment:'',abk:'',status:'',from:'',to:'',shown:false};
  const d=await productionBase({includeRhppCosts:false});
  const leagueSetting=await loadAbkLeagueSetting();
  const [rr,sr,cr,br,finalR]=await Promise.all([
    db.from('production_abk_results').select('*'),
    db.from('production_abk_result_sizes').select('*').order('harvest_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('contracts').select('id,doc_price,pre_starter_price,starter_price,finisher_price'),
    db.from('contract_bonuses').select('contract_id,metric,min_value,max_value,rupiah_per_kg'),
    db.from('production_cycle_final_unified').select('contract_assignment_id')
  ]);
  const rows=rr.data||[],sizes=sr.data||[],leagueContracts=cr.data||[],leagueBonuses=br.data||[];
  const closedFinalAssignmentIds=new Set((finalR.data||[]).map(x=>x.contract_assignment_id).filter(Boolean));
  const seasonStart=leagueSetting.data?.season_start||'0000-00-00';
  const abkReferenceContractId=a=>{
    if(a?.master_contract_id)return a.master_contract_id;
    if(a?.cycle_type!=='MANDIRI')return '';
    const ids=[...new Set((d.livePrices||[]).map(p=>p.contract_id).filter(Boolean))];
    return ids.length===1?ids[0]:'';
  };

  const calcResult=x=>{
    const a=d.assignments.find(a=>a.id===x.contract_assignment_id);
    const ci=d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id);
    const link=d.links.find(l=>l.contract_assignment_id===x.contract_assignment_id&&l.abk_id===x.abk_id);
    const refContractId=abkReferenceContractId(a);
    const sz=sizes.filter(s=>s.result_id===x.id);
    const birds=sz.reduce((s,v)=>s+prodNum(v.birds),0);
    const kg=sz.reduce((s,v)=>s+prodNum(v.weight_kg),0);
    const bw=birds?kg/birds:0;
    const feed=(prodNum(link?.feed_pre_bags)+prodNum(link?.feed_starter_bags)+prodNum(link?.feed_finisher_bags))*50;
    const fcr=kg?feed/kg:0;
    const weightedAge=birds&&ci?sz.reduce((s,v)=>s+prodAge(ci.arrived_on,v.harvest_date)*prodNum(v.birds),0)/birds:0;
    const initialShare=prodNum(link?.initial_birds);
    const surv=initialShare?Math.min(100,birds/initialShare*100):0;
    const ip=initialShare&&weightedAge&&fcr?(surv*bw*100)/(weightedAge*fcr):0;
    let revenue=0;
    for(const s of sz){
      const av=prodNum(s.birds)?prodNum(s.weight_kg)/prodNum(s.birds):0;
      const p=d.livePrices.find(p=>p.contract_id===refContractId&&av>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||av<prodNum(p.max_weight_kg)));
      revenue+=prodNum(s.weight_kg)*prodNum(p?.price_per_kg);
    }

    const contract=leagueContracts.find(c=>c.id===refContractId);
    const sapronakCost=
      initialShare*prodNum(contract?.doc_price)+
      prodNum(link?.feed_pre_bags)*50*prodNum(contract?.pre_starter_price)+
      prodNum(link?.feed_starter_bags)*50*prodNum(contract?.starter_price)+
      prodNum(link?.feed_finisher_bags)*50*prodNum(contract?.finisher_price);

    const matchBonus=(metric,value)=>{
      const row=leagueBonuses.find(b=>
        b.contract_id===refContractId&&
        b.metric===metric&&
        (b.min_value==null||value>=prodNum(b.min_value))&&
        (b.max_value==null||value<prodNum(b.max_value))
      );
      return prodNum(row?.rupiah_per_kg);
    };

    const ipBonus=kg*matchBonus('IP',ip);
    const perfRows=d.standards
      .filter(s=>(a?.cycle_type==='MANDIRI'||s.contract_id===a?.master_contract_id)&&s.template_name===a?.performance_template_name&&s.std_fcr!=null)
      .sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days));
    let stdFcr=0;
    if(perfRows.length){
      const exact=perfRows.find(s=>prodNum(s.age_days)===weightedAge);
      if(exact){
        stdFcr=prodNum(exact.std_fcr);
      }else{
        const lower=[...perfRows].reverse().find(s=>prodNum(s.age_days)<=weightedAge);
        const upper=perfRows.find(s=>prodNum(s.age_days)>=weightedAge);
        if(lower&&upper&&prodNum(upper.age_days)!==prodNum(lower.age_days)){
          const span=prodNum(upper.age_days)-prodNum(lower.age_days);
          const ratio=(weightedAge-prodNum(lower.age_days))/span;
          stdFcr=prodNum(lower.std_fcr)+(prodNum(upper.std_fcr)-prodNum(lower.std_fcr))*ratio;
        }else{
          stdFcr=prodNum((lower||upper)?.std_fcr);
        }
      }
    }
    const fcrDiff=stdFcr?stdFcr-fcr:0;
    const fcrBonus=fcrDiff>0?kg*matchBonus('FCR_DIFFERENCE',fcrDiff):0;

    const profit=revenue-sapronakCost+ipBonus+fcrBonus;
    const perBird=birds?profit/birds:0;

    return {...x,a,birds,kg,bw,feed,fcr,stdFcr,fcrDiff,age:weightedAge,initialBirds:initialShare,survival:surv,ip,revenue,sapronakCost,ipBonus,fcrBonus,profit,perBird,complete:!!link?.basics_locked_at&&initialShare>0&&birds>0&&kg>0&&feed>0};
  };

  const calculated=rows.map(calcResult);
  const seasonal=calculated.filter(x=>x.complete&&x.a?.active===false&&closedFinalAssignmentIds.has(x.contract_assignment_id)&&String(x.harvest_date||'')>=seasonStart);
  const cumulativeMap=new Map();
  seasonal.forEach(x=>{
    if(!cumulativeMap.has(x.abk_id))cumulativeMap.set(x.abk_id,{...x,birds:0,kg:0,feed:0,profit:0,ipWeighted:0,periods:0});
    const g=cumulativeMap.get(x.abk_id);
    g.birds+=prodNum(x.birds);g.kg+=prodNum(x.kg);g.feed+=prodNum(x.feed);g.profit+=prodNum(x.profit);g.ipWeighted+=prodNum(x.ip)*prodNum(x.birds);g.periods+=1;g.a=x.a;
  });
  const eligible=[...cumulativeMap.values()].map(g=>({...g,bw:g.birds?g.kg/g.birds:0,fcr:g.kg?g.feed/g.kg:0,ip:g.birds?g.ipWeighted/g.birds:0,perBird:g.birds?g.profit/g.birds:0}));
  const max=k=>Math.max(...eligible.map(x=>prodNum(x[k])),0),min=k=>Math.min(...eligible.map(x=>prodNum(x[k])).filter(v=>v>0),0);
  eligible.forEach(x=>{const hi=k=>max(k)?prodNum(x[k])/max(k):0;const lo=k=>prodNum(x[k])>0&&min(k)>0?min(k)/prodNum(x[k]):0;x._score=hi('perBird')*.35+hi('ip')*.30+lo('fcr')*.20+hi('bw')*.15});
  eligible.sort((a,b)=>b._score-a._score);eligible.forEach((x,i)=>x.rank=i+1);

  let history=sizes.map(s=>{
    const r=rows.find(x=>x.id===s.result_id),a=r&&d.assignments.find(x=>x.id===r.contract_assignment_id),e=r&&d.abks.find(x=>x.id===r.abk_id);
    const ci=a&&d.chicks.find(c=>c.contract_assignment_id===a.id);
    const bw=prodNum(s.birds)?prodNum(s.weight_kg)/prodNum(s.birds):0;
    const refContractId=abkReferenceContractId(a);
    const price=d.livePrices.find(p=>p.contract_id===refContractId&&bw>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||bw<prodNum(p.max_weight_kg)));
    const pricePerKg=prodNum(price?.price_per_kg);
    const amount=prodNum(s.weight_kg)*pricePerKg;
    const age=ci&&s.harvest_date?prodAge(ci.arrived_on,s.harvest_date):0;
    return {s,r,a,e,bw,age,pricePerKg,amount};
  }).filter(x=>x.r).sort((a,b)=>String(b.s.harvest_date||'').localeCompare(String(a.s.harvest_date||'')));
  const selected=editSizeId?history.find(x=>x.s.id===editSizeId):null;
  const hf=window.__leagueAbkHistoryFilter;
  const historyAssignments=d.assignments.filter(a=>history.some(x=>x.r?.contract_assignment_id===a.id));
  const historyBarnIds=new Set(historyAssignments.map(a=>a.barn_id));
  const historyBarns=d.barns.filter(b=>historyBarnIds.has(b.id));
  const historyAbkIds=new Set(history.map(x=>x.r?.abk_id).filter(Boolean));
  const historyAbks=d.abks.filter(a=>historyAbkIds.has(a.id));
  const visibleHistory=selected?[selected]:(hf.shown?history.filter(x=>
    (!hf.barn||x.a?.barn_id===hf.barn)&&
    (!hf.assignment||x.r?.contract_assignment_id===hf.assignment)&&
    (!hf.abk||x.r?.abk_id===hf.abk)&&
    (!hf.status||(hf.status==='PROSES'?x.a?.active===true:x.a?.active===false))&&
    (!hf.from||String(x.s.harvest_date||'')>=hf.from)&&
    (!hf.to||String(x.s.harvest_date||'')<=hf.to)
  ):[]);

  let html='<section class="panel"><h3>'+(selected?'Edit Panen ABK':'Liga ABK')+'</h3>'+
    '<p class="muted">Pilih kandang dan ABK, cek Populasi Awal dari Chick-In, kunci Pakan, lalu input Panen. Liga bersifat kumulatif MITRA + MANDIRI; ABK MANDIRI tetap dinilai dengan harga acuan kontrak.</p>'+
    '<form id="abkForm" class="form-vertical">'+
      '<label>Kandang Aktif<select name="assignment" required '+(selected?'disabled':'')+'><option value="">Pilih</option>'+
        d.assignments.filter(a=>a.active&&d.chicks.some(c=>c.contract_assignment_id===a.id)).map(a=>'<option value="'+esc(a.id)+'" '+(selected?.r.contract_assignment_id===a.id?'selected':'')+'>'+esc(leagueAssignmentLabel(d,a))+'</option>').join('')+
      '</select></label>'+
      '<label>ABK<select name="abk" required '+(selected?'disabled':'')+'><option value="">Pilih kontrak dulu</option></select></label>'+
      '<section class="panel" style="margin:0"><h4>Data ABK</h4>'+
        '<label>Populasi Awal ABK (ekor)<input name="initial_birds" data-number="1" inputmode="decimal" readonly></label>'+
        '<p class="muted">Populasi Awal mengikuti pembagian ABK saat Chick-In / DOC Masuk dan tidak dapat diubah dari Liga ABK.</p>'+
        '<p class="muted">Penempatan Pakan mengikuti kontrak aktif. Input dalam zak, 1 zak = 50 kg.</p>'+
        '<label>Pre Starter (zak)<input name="pre_bags" data-number="1" inputmode="decimal" placeholder="Contoh: 24"></label>'+
        '<label>Starter (zak)<input name="starter_bags" data-number="1" inputmode="decimal" placeholder="Contoh: 70"></label>'+
        '<label>Finisher (zak)<input name="finisher_bags" data-number="1" inputmode="decimal" placeholder="Contoh: 96"></label>'+
        (['ADMIN','PPL'].includes(profile.role)?'<button type="button" id="lockAbkBasics">Simpan & Kunci Pakan</button>':'')+
        '<p class="muted">Pakan dan Panen ABK mengikuti kontrak aktif dan terkunci saat periode kontrak ditutup.</p>'+
        '<p id="abkBasicsStatus" class="muted">Pilih ABK untuk melihat status.</p>'+
      '</section>'+
      '<fieldset id="abkHarvestFields" disabled style="border:0;padding:0;margin:0">'+
        '<h4>Panen ABK</h4>'+
        '<p class="muted">Satu tanggal boleh memiliki beberapa transaksi panen. Setiap Simpan menambah transaksi baru.</p>'+
        '<label>Tanggal Panen<input type="date" name="date" value="'+esc(selected?.s.harvest_date||prodToday())+'" required></label>'+
        '<p id="abkAge" class="muted">Umur panen: -</p>'+
        '<label>Ekor<input name="birds" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.s.birds):'')+'" placeholder="Contoh: 1.920" required></label>'+
        '<label>KG<input name="kg" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.s.weight_kg):'')+'" placeholder="Contoh: 3.096,70" required></label>'+
        '<button>'+(selected?'Simpan Perubahan':'Simpan Panen ABK')+'</button>'+
        (selected?' <button type="button" id="cancelAbkEdit">Batal Edit</button>':'')+
      '</fieldset>'+
    '</form></section>';

  const cycleFilterRows=historyAssignments.filter(a=>!hf.barn||a.barn_id===hf.barn);
  const abkFilterRows=historyAbks.filter(e=>history.some(x=>
    x.r?.abk_id===e.id&&
    (!hf.barn||x.a?.barn_id===hf.barn)&&
    (!hf.assignment||x.r?.contract_assignment_id===hf.assignment)
  ));
  html+='<section class="panel"><h3>Riwayat Panen ABK Lengkap</h3>'+
    '<form id="abkHistoryFilter" class="form-vertical compact-form" style="margin-bottom:10px">'+
      '<label>Pilih Kandang<select name="barn"><option value="">Semua Kandang</option>'+historyBarns.map(b=>'<option value="'+esc(b.id)+'" '+(hf.barn===b.id?'selected':'')+'>'+esc((b.code?b.code+' · ':'')+(b.name||''))+'</option>').join('')+'</select></label>'+
      '<label>Pilih Siklus<select name="assignment" '+(!hf.barn?'disabled':'')+'><option value="">Semua Siklus</option>'+cycleFilterRows.map(a=>'<option value="'+esc(a.id)+'" '+(hf.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(d.assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'AKTIF':'CLOSED'))+'</option>').join('')+'</select></label>'+
      '<label>Pilih ABK<select name="abk"><option value="">Semua ABK</option>'+abkFilterRows.map(e=>'<option value="'+esc(e.id)+'" '+(hf.abk===e.id?'selected':'')+'>'+esc(leagueAbkName(e))+'</option>').join('')+'</select></label>'+
      '<label>Status<select name="status"><option value="">Semua Status</option><option value="PROSES" '+(hf.status==='PROSES'?'selected':'')+'>PROSES</option><option value="CLOSED" '+(hf.status==='CLOSED'?'selected':'')+'>CLOSED</option></select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(hf.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(hf.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Cari</button><button type="button" id="abkHistoryReset">Reset</button></div>'+
    '</form>'+
    '<p class="muted">'+(hf.shown?'Total '+visibleHistory.length+' transaksi sesuai filter. Geser kanan/kiri untuk melihat seluruh rincian.':'Pilih filter lalu klik Cari untuk menampilkan riwayat.')+'</p>'+
    (hf.shown?
      '<div class="report-actions"><button type="button" id="abkHistoryPrint">Cetak</button> <button type="button" id="abkHistoryPdf">PDF</button> <button type="button" id="abkHistoryExcel">Excel</button></div><div class="tablewrap" style="overflow-x:auto;max-height:none"><table id="abkHistoryTable" style="min-width:820px"><thead><tr><th>Tanggal</th><th>ABK</th><th>Kandang</th><th>Status</th><th>Umur</th><th>Ekor</th><th>KG</th><th>BW</th><th>Aksi</th></tr></thead><tbody>'+
      visibleHistory.map(x=>{const locked=!x.a?.active;return '<tr><td>'+prodDateId(x.s.harvest_date)+'</td><td>'+esc(leagueAbkName(x.e))+'</td><td>'+esc(leagueBarnName(d,x.a))+'</td><td>'+(locked?'CLOSED':'PROSES')+'</td><td>'+prodFmt(x.age,0)+' hari</td><td>'+fmtNumber(x.s.birds)+'</td><td>'+fmtNumber(x.s.weight_kg)+'</td><td>'+prodFmt(x.bw,2)+' kg</td><td>'+(locked?'<strong>Terkunci</strong>':'<button type="button" data-edit-abk-harvest="'+esc(x.s.id)+'">Edit</button> <button type="button" data-delete-abk-harvest="'+esc(x.s.id)+'">Hapus</button>')+'</td></tr>'}).join('')+
      '</tbody></table></div>'+(!visibleHistory.length?'<p>Data riwayat tidak ditemukan sesuai filter.</p>':'')
      :''
    )+'</section>';



  layout(html);
  if(d.err||rr.error||sr.error)msg((d.err||rr.error||sr.error).message);
  bindNumberInputs();
  if(hf.shown)bindTableExportActions({tableId:'abkHistoryTable',printId:'abkHistoryPrint',pdfId:'abkHistoryPdf',excelId:'abkHistoryExcel',title:'Riwayat Panen ABK',filename:'Riwayat_Panen_ABK',filterText:'Periode '+(hf.from||'-')+' s/d '+(hf.to||'-'),dropLast:true});

  const historyFilter=document.getElementById('abkHistoryFilter');
  if(historyFilter&&!selected){
    const barnSel=historyFilter.elements.barn;
    const cycleSel=historyFilter.elements.assignment;
    const abkSel=historyFilter.elements.abk;
    barnSel.onchange=()=>{
      const bid=barnSel.value||'';
      const rows=historyAssignments.filter(a=>!bid||a.barn_id===bid);
      cycleSel.disabled=!bid;
      cycleSel.innerHTML='<option value="">Semua Siklus</option>'+rows.map(a=>'<option value="'+esc(a.id)+'">'+esc(assignmentCycleLabel(d.assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'AKTIF':'CLOSED'))+'</option>').join('');
      const ids=new Set(history.filter(x=>!bid||x.a?.barn_id===bid).map(x=>x.r?.abk_id).filter(Boolean));
      abkSel.innerHTML='<option value="">Semua ABK</option>'+d.abks.filter(e=>ids.has(e.id)).map(e=>'<option value="'+esc(e.id)+'">'+esc(leagueAbkName(e))+'</option>').join('');
    };
    cycleSel.onchange=()=>{
      const aid=cycleSel.value||'';
      const bid=barnSel.value||'';
      const ids=new Set(history.filter(x=>
        (!bid||x.a?.barn_id===bid)&&
        (!aid||x.r?.contract_assignment_id===aid)
      ).map(x=>x.r?.abk_id).filter(Boolean));
      abkSel.innerHTML='<option value="">Semua ABK</option>'+d.abks.filter(e=>ids.has(e.id)).map(e=>'<option value="'+esc(e.id)+'">'+esc(leagueAbkName(e))+'</option>').join('');
    };
    historyFilter.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(historyFilter);
      let from=String(fd.get('from')||''),to=String(fd.get('to')||'');
      if(from&&to&&from>to){const t=from;from=to;to=t;}
      window.__leagueAbkHistoryFilter={
        barn:String(fd.get('barn')||''),
        assignment:String(fd.get('barn')||'')?String(fd.get('assignment')||''):'',
        abk:String(fd.get('abk')||''),
        status:String(fd.get('status')||''),
        from,to,shown:true
      };
      await leagueAbkPage();
    };
    const resetHistory=document.getElementById('abkHistoryReset');
    if(resetHistory)resetHistory.onclick=async()=>{
      window.__leagueAbkHistoryFilter={barn:'',assignment:'',abk:'',status:'',from:'',to:'',shown:false};
      await leagueAbkPage();
    };
  }

  const f=document.getElementById('abkForm');
  if(!selected&&window.__leagueAbkState.assignment){
    const savedAssignment=d.assignments.find(a=>a.id===window.__leagueAbkState.assignment&&a.active);
    if(savedAssignment)f.assignment.value=savedAssignment.id;
  }
  const harvestFields=document.getElementById('abkHarvestFields');
  const savePopulationButton=document.getElementById('saveAbkPopulation');
  const lockButton=document.getElementById('lockAbkBasics');

  const syncAbkContext=()=>{
    const link=d.links.find(l=>l.contract_assignment_id===f.assignment.value&&l.abk_id===f.abk.value);
    const a=d.assignments.find(x=>x.id===f.assignment.value);
    const locked=!!link?.basics_locked_at;
    const cycleActive=!!a?.active;
    f.initial_birds.value=link?.initial_birds?fmtNumber(link.initial_birds):'';
    f.pre_bags.value=link?.feed_pre_bags!=null?prodFmt(link.feed_pre_bags,2):'';
    f.starter_bags.value=link?.feed_starter_bags!=null?prodFmt(link.feed_starter_bags,2):'';
    f.finisher_bags.value=link?.feed_finisher_bags!=null?prodFmt(link.feed_finisher_bags,2):'';

    f.initial_birds.readOnly=true;
    [f.pre_bags,f.starter_bags,f.finisher_bags].forEach(inp=>inp.readOnly=!cycleActive||!['ADMIN','PPL'].includes(profile.role));
    if(savePopulationButton)savePopulationButton.disabled=!link;
    if(lockButton){
      lockButton.hidden=!cycleActive;
      lockButton.disabled=!cycleActive||!link||!prodNum(link?.initial_birds);
      lockButton.textContent=locked?'Simpan Perubahan Pakan':'Simpan & Kunci Pakan';
    }
    const status=document.getElementById('abkBasicsStatus');
    if(status)status.textContent=!link?'Pilih ABK untuk melihat status.':
      'Populasi '+(link.initial_birds?fmtNumber(link.initial_birds)+' ekor':'belum diisi')+
      ' · Pakan '+(locked?(cycleActive?'TERSIMPAN · masih bisa dikoreksi selama PROSES · ':'TERKUNCI CLOSED · ')+prodFmt(prodNum(link.feed_pre_bags)+prodNum(link.feed_starter_bags)+prodNum(link.feed_finisher_bags),2)+' zak':'belum dikunci');
    harvestFields.disabled=!locked;

    const ci=d.chicks.find(c=>c.contract_assignment_id===f.assignment.value);
    document.getElementById('abkAge').textContent='Umur panen: '+(ci&&f.date.value?prodAge(ci.arrived_on,f.date.value)+' hari':'-');
  };

  const refreshAbk=()=>{
    const current=f.abk.value;
    const links=d.links.filter(l=>l.contract_assignment_id===f.assignment.value),ids=new Set(links.map(l=>l.abk_id));
    f.abk.innerHTML='<option value="">Pilih ABK</option>'+d.abks.filter(a=>ids.has(a.id)).map(a=>'<option value="'+esc(a.id)+'">'+esc(leagueAbkName(a))+'</option>').join('');
    if(selected)f.abk.value=selected.r.abk_id;
    else if(ids.has(window.__leagueAbkState.abk))f.abk.value=window.__leagueAbkState.abk;
    else if(ids.has(current))f.abk.value=current;
    window.__leagueAbkState.assignment=f.assignment.value||'';
    window.__leagueAbkState.abk=f.abk.value||'';
    syncAbkContext();
  };

  refreshAbk();
  if(!selected)f.assignment.onchange=()=>{
    window.__leagueAbkState.assignment=f.assignment.value||'';
    window.__leagueAbkState.abk='';
    refreshAbk();
  };
  f.abk.onchange=async()=>{
    window.__leagueAbkState.assignment=f.assignment.value||'';
    window.__leagueAbkState.abk=f.abk.value||'';
    await leagueAbkPage();
  };
  f.date.onchange=syncAbkContext;

  if(savePopulationButton)savePopulationButton.onclick=async()=>{
    const link=d.links.find(l=>l.contract_assignment_id===f.assignment.value&&l.abk_id===f.abk.value);
    if(!link)return msg('Pilih Kandang / Kontrak dan ABK terlebih dahulu.');
    const initialBirds=Math.trunc(normalizeInputID(f.initial_birds.value)||0);
    if(initialBirds<=0)return msg('Populasi Awal ABK wajib lebih dari 0.');
    const {error}=await db.rpc('save_production_abk_initial_population_atomic',{
      p_link_id:link.id,
      p_initial_birds:initialBirds
    });
    if(error)return msg(error.message);
    window.__leagueAbkState.assignment=f.assignment.value||'';
    window.__leagueAbkState.abk=f.abk.value||'';
    await leagueAbkPage();
    msg('Populasi Awal ABK tersimpan.',true);
  };

  if(lockButton)lockButton.onclick=async()=>{
    const a=d.assignments.find(x=>x.id===f.assignment.value);
    const link=d.links.find(l=>l.contract_assignment_id===f.assignment.value&&l.abk_id===f.abk.value);
    if(!a||!link)return msg('Pilih Kandang / Kontrak dan ABK terlebih dahulu.');
    const initialBirds=prodNum(link.initial_birds);
    const pre=normalizeInputID(f.pre_bags.value),starter=normalizeInputID(f.starter_bags.value),finisher=normalizeInputID(f.finisher_bags.value);
    if(initialBirds<=0)return msg('Populasi Awal ABK belum tersedia dari Chick-In. Periksa pembagian ABK di Chick-In / DOC Masuk.');
    if(pre==null||starter==null||finisher==null||pre<0||starter<0||finisher<0)return msg('Total Penempatan Pakan harus berupa angka yang benar.');
    if(pre+starter+finisher<=0)return msg('Total Penempatan Pakan wajib diisi.');
    const {error}=await db.rpc('lock_production_abk_basics_atomic',{
      p_link_id:link.id,
      p_initial_birds:initialBirds,
      p_feed_pre_bags:pre,
      p_feed_starter_bags:starter,
      p_feed_finisher_bags:finisher
    });
    if(error)return msg(error.message);
    window.__leagueAbkState.assignment=f.assignment.value||'';
    window.__leagueAbkState.abk=f.abk.value||'';
    await leagueAbkPage();
    msg(link.basics_locked_at?'Perubahan Pakan ABK tersimpan.':'Penempatan Pakan ABK tersimpan. Silakan lanjut ke Panen.',true);
  };

  f.onsubmit=async e=>{
    e.preventDefault();
    const a=d.assignments.find(x=>x.id===f.assignment.value);
    const link=d.links.find(l=>l.contract_assignment_id===f.assignment.value&&l.abk_id===f.abk.value);
    if(!a||!f.abk.value)return msg('Pilih kontrak dan ABK.');
    if(!link?.basics_locked_at)return msg('Simpan & Kunci Pakan ABK terlebih dahulu.');
    const birds=normalizeInputID(f.birds.value),kg=normalizeInputID(f.kg.value);
    if(!(birds>0))return msg('Ekor harus lebih dari 0.');
    if(!(kg>0))return msg('KG harus lebih dari 0.');
    if(!Number.isInteger(birds))return msg('Ekor harus berupa jumlah ayam bulat.');

    const rpc=selected?'update_production_abk_harvest_atomic':'save_production_abk_harvest_atomic';
    const params=selected?{
      p_size_id:selected.s.id,
      p_harvest_date:f.date.value,
      p_birds:birds,
      p_weight_kg:kg,
      p_feed_pre_kg:0,
      p_feed_starter_kg:0,
      p_feed_finisher_kg:0
    }:{
      p_assignment_id:a.id,
      p_barn_id:a.barn_id,
      p_abk_id:f.abk.value,
      p_harvest_date:f.date.value,
      p_birds:birds,
      p_weight_kg:kg,
      p_feed_pre_kg:0,
      p_feed_starter_kg:0,
      p_feed_finisher_kg:0
    };
    const {error}=await db.rpc(rpc,params);
    if(error)return msg(error.message);
    window.__leagueAbkState.assignment=f.assignment.value||'';
    window.__leagueAbkState.abk=f.abk.value||'';
    await leagueAbkPage();
    msg(selected?'Panen ABK berhasil diperbarui.':'Panen ABK tersimpan sebagai transaksi baru.',true);
  };

  document.querySelectorAll('[data-edit-abk-harvest]').forEach(btn=>btn.onclick=()=>leagueAbkPage(btn.dataset.editAbkHarvest));
  document.querySelectorAll('[data-delete-abk-harvest]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus transaksi Panen ABK ini?'))return;
    const {error}=await db.rpc('delete_production_abk_harvest_atomic',{p_size_id:btn.dataset.deleteAbkHarvest});
    if(error)return msg(error.message);
    await leagueAbkPage();
    msg('Panen ABK berhasil dihapus.',true);
  });
  const cancel=document.getElementById('cancelAbkEdit');
  if(cancel)cancel.onclick=()=>leagueAbkPage();
}
function productionProcessSnapshot(d,a,recs,samples){
  const ci=d.chicks.find(x=>x.contract_assignment_id===a.id);
  const rows=recs.filter(x=>x.contract_assignment_id===a.id)
    .sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days)||String(u.recorded_on||'').localeCompare(String(v.recorded_on||'')));
  const latest=rows[rows.length-1]||null;
  const chickIn=ci?Math.max(0,prodNum(ci.received)-prodNum(ci.doa)):0;
  const mortBirds=rows.reduce((s,x)=>s+prodNum(x.mortality)+prodNum(x.culling),0);
  const mortPct=chickIn?Math.min(100,mortBirds/chickIn*100):0;
  const hs=d.harvests.filter(h=>h.contract_assignment_id===a.id);
  const chickOut=hs.reduce((s,h)=>s+prodNum(h.birds),0);
  const harvestedKg=hs.reduce((s,h)=>s+prodNum(h.net_weight_kg),0);
  const currentBirds=Math.max(0,chickIn-mortBirds-chickOut);
  const ws=latest?samples.filter(s=>s.recording_id===latest.id).map(s=>prodNum(s.weight_g)).filter(v=>v>0):[];
  const currentBw=ws.length?ws.reduce((s,x)=>s+x,0)/ws.length/1000:prodNum(latest?.avg_weight_kg);
  const currentKg=currentBirds*Math.max(0,currentBw);
  const performanceBirds=chickOut+currentBirds;
  const performanceKg=harvestedKg+currentKg;
  const harvestAgeWeight=ci?hs.reduce((s,h)=>s+prodAge(ci.arrived_on,h.harvested_on)*prodNum(h.birds),0):0;
  const currentAge=prodNum(latest?.age_days);
  const age=performanceBirds?(harvestAgeWeight+currentAge*currentBirds)/performanceBirds:currentAge;
  const feed=rows.reduce((s,x)=>s+prodNum(x.feed_kg),0);
  const avg=performanceBirds?performanceKg/performanceBirds:0;
  const fcr=performanceKg?feed/performanceKg:0;
  const survival=chickIn?Math.min(100,(chickIn-mortBirds)/chickIn*100):0;
  const ip=age&&fcr&&avg?(survival*avg*100)/(age*fcr):0;
  return {chickIn,chickOut,mortBirds,mortPct,kg:harvestedKg,avg,age,feed,fcr,ip,performanceBirds,performanceKg,currentBirds,currentBw};
}

async function productionRecapPage(){
  const d=await productionBase();
  const [cpr,pr,abr,absr,fr]=await Promise.all([
    db.from('company_profile').select('company_name,legal_name,address,phone,email,website,logo_url').eq('id',true).maybeSingle(),
    db.rpc('production_ppl_directory'),
    db.from('production_abk_results').select('*'),
    db.from('production_abk_result_sizes').select('*').order('harvest_date',{ascending:true}).order('created_at',{ascending:true}),
    db.from('production_cycle_final_unified').select('contract_assignment_id,chick_in_birds,depletion_birds,mortality_pct,total_harvest_birds,total_harvest_kg,avg_bw_kg,weighted_age,net_feed_kg,fcr_actual,ip,closed_on,cycle_type')
  ]);
  const company=cpr.data||{};
  const pplRows=pr.data||[];
  const abkResults=d.scopeRows(abr.data||[]);
  const abkSizes=absr.data||[];
  const finals=fr.data||[];

  const dateOfAssignment=a=>{
    const ci=d.chicks.find(c=>c.contract_assignment_id===a.id);
    return ci?.arrived_on||a.start_date||'';
  };
  const allDates=d.assignments.map(dateOfAssignment).filter(Boolean).sort();
  const minDate=allDates[0]||prodToday();
  const maxDate=allDates[allDates.length-1]||prodToday();

  window.__productionRecapState=window.__productionRecapState||{
    from:minDate,to:maxDate,barn:'',ppl:'',assignment:'',status:'',shown:false
  };
  const st=window.__productionRecapState;
  if(st.barn===undefined)st.barn='';
  if(st.ppl===undefined)st.ppl='';
  if(st.assignment===undefined)st.assignment='';
  if(st.status===undefined)st.status='';
  let from=st.from||minDate;
  let to=st.to||maxDate;
  if(from>to){const t=from;from=to;to=t;}

  const pplName=id=>pplRows.find(p=>p.user_id===id)?.full_name||'-';
  const barnIds=new Set(d.assignments.map(a=>a.barn_id));
  const filterBarns=d.barns.filter(b=>barnIds.has(b.id));
  const filterPplIds=[...new Set(d.assignments.map(a=>a.ppl_id).filter(Boolean))];
  const filterPpls=filterPplIds.map(id=>({id,name:pplName(id)})).sort((a,b)=>a.name.localeCompare(b.name));
  const cycleCandidates=d.assignments.filter(a=>
    (!st.barn||a.barn_id===st.barn)&&
    (!st.ppl||a.ppl_id===st.ppl)
  );

  const inRange=d.assignments.filter(a=>{
    const dt=dateOfAssignment(a);
    return dt&&dt>=from&&dt<=to&&
      (!st.barn||a.barn_id===st.barn)&&
      (!st.ppl||a.ppl_id===st.ppl)&&
      (!st.assignment||a.id===st.assignment)&&
      (!st.status||(st.status==='PROSES'?a.active===true:a.active===false));
  });

  const cycleMap=new Map();
  [...d.assignments].sort((a,b)=>String(dateOfAssignment(a)).localeCompare(String(dateOfAssignment(b)))).forEach(a=>{
    const arr=cycleMap.get(a.barn_id)||[];
    arr.push(a.id);
    cycleMap.set(a.barn_id,arr);
  });

  // Acuan utama Rekap Produksi PPL adalah Liga ABK.
  // Untuk siklus historis CLOSED yang belum pernah memiliki data Liga ABK,
  // gunakan snapshot final produksi yang sudah tersimpan agar tidak tampil 0 palsu.
  const rows=inRange.map(a=>{
    const ci=d.chicks.find(c=>c.contract_assignment_id===a.id);
    const b=d.barns.find(x=>x.id===a.barn_id);
    const cycles=cycleMap.get(a.barn_id)||[];
    const links=d.links.filter(l=>l.contract_assignment_id===a.id);
    const resultRows=abkResults.filter(r=>r.contract_assignment_id===a.id);
    const resultIds=new Set(resultRows.map(r=>r.id));
    const sizes=abkSizes.filter(s=>resultIds.has(s.result_id));
    const hasLeagueData=resultRows.length>0&&sizes.some(s=>prodNum(s.birds)>0||prodNum(s.weight_kg)>0);

    if(!hasLeagueData&&!a.active){
      const final=finals.find(f=>f.contract_assignment_id===a.id);
      if(final){
        const chickIn=prodNum(final.chick_in_birds);
        const chickOut=prodNum(final.total_harvest_birds);
        const mortPct=Math.max(0,Math.min(100,prodNum(final.mortality_pct)));
        const mortBirds=Math.max(0,chickIn-chickOut);
        const kg=prodNum(final.total_harvest_kg);
        const avg=prodNum(final.avg_bw_kg);
        const age=prodNum(final.weighted_age);
        const feed=prodNum(final.net_feed_kg);
        const fcr=prodNum(final.fcr_actual);
        const ip=prodNum(final.ip);
        return {
          a,b,ci,ppl:pplName(a.ppl_id),status:'CLOSED',
          chickIn,chickOut,mortBirds,mortPct,kg,avg,age,feed,fcr,ip,
          performanceBirds:chickOut,performanceKg:kg,
          cycle:Math.max(1,cycles.indexOf(a.id)+1),
          source:'FINAL_HISTORIS'
        };
      }
    }

    const chickIn=links.reduce((sum,l)=>sum+prodNum(l.initial_birds),0);
    const chickOut=sizes.reduce((sum,s)=>sum+prodNum(s.birds),0);
    const kg=sizes.reduce((sum,s)=>sum+prodNum(s.weight_kg),0);
    const feed=links.reduce((sum,l)=>sum+
      (prodNum(l.feed_pre_bags)+prodNum(l.feed_starter_bags)+prodNum(l.feed_finisher_bags))*50,0);
    const mortBirds=Math.max(0,chickIn-chickOut);
    const mortPct=chickIn?Math.min(100,mortBirds/chickIn*100):0;
    const avg=chickOut?kg/chickOut:0;
    const ageWeight=ci?sizes.reduce((sum,s)=>sum+prodAge(ci.arrived_on,s.harvest_date)*prodNum(s.birds),0):0;
    const age=chickOut?ageWeight/chickOut:0;
    const fcr=kg?feed/kg:0;
    const survival=chickIn?Math.min(100,chickOut/chickIn*100):0;
    const ip=age&&fcr&&avg?(survival*avg*100)/(age*fcr):0;

    return {
      a,b,ci,ppl:pplName(a.ppl_id),status:a.active?'PROSES':'CLOSED',
      chickIn,chickOut,mortBirds,mortPct,kg,avg,age,feed,fcr,ip,
      performanceBirds:chickOut,performanceKg:kg,
      cycle:Math.max(1,cycles.indexOf(a.id)+1),
      source:'LIGA_ABK'
    };
  }).sort((x,y)=>String(dateOfAssignment(x.a)).localeCompare(String(dateOfAssignment(y.a))));

  const totals=rows.reduce((o,x)=>{
    const pb=prodNum(x.performanceBirds||x.chickOut),pk=prodNum(x.performanceKg||x.kg);
    o.chickIn+=x.chickIn;o.chickOut+=x.chickOut;o.mortBirds+=x.mortBirds;
    o.kg+=x.kg;o.feed+=x.feed;o.performanceBirds+=pb;o.performanceKg+=pk;o.ageWeight+=x.age*Math.max(1,pb);
    return o;
  },{chickIn:0,chickOut:0,mortBirds:0,kg:0,feed:0,performanceBirds:0,performanceKg:0,ageWeight:0});
  const ageWeightBase=rows.reduce((sum,x)=>sum+Math.max(1,prodNum(x.performanceBirds||x.chickOut)),0);
  const totalAge=ageWeightBase?totals.ageWeight/ageWeightBase:0;
  const totalAvg=totals.performanceBirds?totals.performanceKg/totals.performanceBirds:0;
  const totalMortPct=totals.chickIn?Math.min(100,totals.mortBirds/totals.chickIn*100):0;
  const totalFcr=totals.performanceKg?totals.feed/totals.performanceKg:0;
  const totalSurvival=totals.chickIn?Math.min(100,(totals.chickIn-totals.mortBirds)/totals.chickIn*100):0;
  const totalIp=totalAge&&totalFcr&&totalAvg?(totalSurvival*totalAvg*100)/(totalAge*totalFcr):0;

  const scopeLabel=profile?.role==='PPL'?'Kandang yang menjadi penugasan PPL ini':'Seluruh kandang / PPL';
  const fileBase=('Rekap_Produksi_PPL_'+from+'_sampai_'+to).replace(/[^A-Za-z0-9_-]+/g,'_');
  const filterSummary=[
    st.barn?(filterBarns.find(b=>b.id===st.barn)?.name||''):'',
    st.ppl?(filterPpls.find(p=>p.id===st.ppl)?.name||''):'',
    st.assignment?(assignmentCycleLabel(d.assignments,d.assignments.find(a=>a.id===st.assignment))):'',
    st.status||''
  ].filter(Boolean).join(' · ');

  let html='<section class="panel"><div class="rhpp-section-head"><div><h3>Rekap Produksi PPL</h3>'+
    '<p class="muted">'+scopeLabel+' · acuan resmi: Liga ABK (populasi ABK, pakan ABK terkunci, dan panen ABK). Filter tanggal berdasarkan Chick-In.</p></div></div>'+
    '<form id="productionRecapFilter" class="form-vertical compact-form">'+
      '<label>Pilih Kandang<select name="barn"><option value="">Semua Kandang</option>'+
        filterBarns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+
      '</select></label>'+
      '<label>Pilih PPL<select name="ppl"><option value="">Semua PPL</option>'+
        filterPpls.map(p=>'<option value="'+esc(p.id)+'" '+(st.ppl===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+
      '</select></label>'+
      '<label>Pilih Siklus<select name="assignment"><option value="">Semua Siklus</option>'+
        cycleCandidates.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(d.assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+
      '</select></label>'+
      '<label>Status<select name="status"><option value="">Semua Status</option><option value="PROSES" '+(st.status==='PROSES'?'selected':'')+'>PROSES</option><option value="CLOSED" '+(st.status==='CLOSED'?'selected':'')+'>CLOSED</option></select></label>'+
      '<label>Tanggal Mulai<input type="date" name="from" value="'+esc(from)+'" required></label>'+
      '<label>Tanggal Akhir<input type="date" name="to" value="'+esc(to)+'" required></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="productionRecapReset">Reset</button></div>'+
    '</form></section>';

  html+='<div id="productionRecapExportArea" style="display:'+(st.shown?'':'none')+'"><section class="panel">'+
    '<div class="rhpp-section-head"><div><h3>REKAP PRODUKSI</h3><p class="muted">'+prodDateId(from)+' s/d '+prodDateId(to)+(filterSummary?' · '+esc(filterSummary):'')+'</p></div>'+
    '<div class="report-actions"><button type="button" id="productionRecapPrint">Cetak</button><button type="button" id="productionRecapPdf">PDF</button><button type="button" id="productionRecapExcel">Excel</button></div></div>'+
    '<div class="tablewrap"><table style="min-width:1450px"><thead><tr>'+
      '<th>NO</th><th>NAMA KANDANG</th><th>SIKLUS</th><th>PPL / PIC</th><th>STATUS</th><th>UMUR</th><th>CHICK IN</th><th>CHICK OUT</th><th>MORT (%)</th><th>TONASE PANEN (Kg)</th><th>BW (Kg)</th><th>PAKAN KUMULATIF ABK (Kg)</th><th>FCR</th><th>IP</th>'+
    '</tr></thead><tbody>'+
    rows.map((x,i)=>'<tr>'+
      '<td>'+(i+1)+'</td>'+
      '<td>'+esc(x.b?shortBarnLabel(x.b):'-')+'</td>'+
      '<td>'+esc(assignmentCycleLabel(d.assignments,x.a))+'</td>'+
      '<td>'+esc(x.ppl)+'</td>'+
      '<td>'+esc(x.status)+'</td>'+
      '<td>'+prodFmt(x.age,2)+'</td>'+
      '<td>'+prodFmt(x.chickIn,0)+'</td>'+
      '<td>'+prodFmt(x.chickOut,0)+'</td>'+
      '<td>'+prodFmt(x.mortPct,2)+'</td>'+
      '<td>'+prodFmt(x.kg,2)+'</td>'+
      '<td>'+prodFmt(x.avg,2)+'</td>'+
      '<td>'+prodFmt(x.feed,0)+'</td>'+
      '<td>'+prodFmt(x.fcr,3)+'</td>'+
      '<td>'+prodFmt(x.ip,2)+'</td>'+
    '</tr>').join('')+
    (rows.length?'<tr><th colspan="5">TOTAL</th>'+
      '<th>'+prodFmt(totalAge,2)+'</th>'+
      '<th>'+prodFmt(totals.chickIn,0)+'</th>'+
      '<th>'+prodFmt(totals.chickOut,0)+'</th>'+
      '<th>'+prodFmt(totalMortPct,2)+'</th>'+
      '<th>'+prodFmt(totals.kg,2)+'</th>'+
      '<th>'+prodFmt(totalAvg,2)+'</th>'+
      '<th>'+prodFmt(totals.feed,0)+'</th>'+
      '<th>'+prodFmt(totalFcr,3)+'</th>'+
      '<th>'+prodFmt(totalIp,2)+'</th></tr>':'')+
    '</tbody></table></div>'+(rows.length?'':'<p>Belum ada data sesuai filter.</p>')+
    '</section></div>';

  layout(html);
  if(d.err||cpr.error||pr.error||abr.error||absr.error||fr.error)msg((d.err||cpr.error||pr.error||abr.error||absr.error||fr.error).message);

  const form=document.getElementById('productionRecapFilter');
  if(form){
    const barnSel=form.elements.barn,pplSel=form.elements.ppl,cycleSel=form.elements.assignment;
    const refreshCycles=()=>{
      const barnId=barnSel.value||'',pplId=pplSel.value||'';
      const items=d.assignments.filter(a=>
        (!barnId||a.barn_id===barnId)&&
        (!pplId||a.ppl_id===pplId)
      );
      const current=cycleSel.value;
      cycleSel.innerHTML='<option value="">Semua Siklus</option>'+items.map(a=>'<option value="'+esc(a.id)+'">'+esc(assignmentCycleLabel(d.assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('');
      if(items.some(a=>a.id===current))cycleSel.value=current;
    };
    barnSel.onchange=refreshCycles;
    pplSel.onchange=refreshCycles;
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(form),f=String(fd.get('from')||''),t=String(fd.get('to')||'');
      if(!f||!t)return msg('Tanggal mulai dan akhir wajib diisi.');
      window.__productionRecapState={
        from:f,to:t,
        barn:String(fd.get('barn')||''),
        ppl:String(fd.get('ppl')||''),
        assignment:String(fd.get('assignment')||''),
        status:String(fd.get('status')||''),
        shown:true
      };
      await productionRecapPage();
    };
    const reset=document.getElementById('productionRecapReset');
    if(reset)reset.onclick=async()=>{
      window.__productionRecapState={from:minDate,to:maxDate,barn:'',ppl:'',assignment:'',status:'',shown:false};
      await productionRecapPage();
    };
  }

  const exportArea=document.getElementById('productionRecapExportArea');
  const exportHtml=()=>{
    const clone=exportArea?.cloneNode(true);if(!clone)return '';
    clone.querySelectorAll('button,.report-actions').forEach(x=>x.remove());
    return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(fileBase)+'</title>'+
      '<style>@page{size:A4 landscape;margin:6mm}body{font-family:Arial,sans-serif;color:#111;font-size:7.5px}.head{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px}.head h2{margin:0 0 3px;font-size:14px}.head div{font-size:8px}.panel{border:0!important;padding:0!important}.muted{color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #444;padding:3px;text-align:center;white-space:nowrap}th:nth-child(2),td:nth-child(2),th:nth-child(3),td:nth-child(3){text-align:left}.tablewrap{overflow:visible!important}</style></head><body>'+
      '<div class="head">'+'<img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'" style="max-height:36px;float:left;margin-right:9px;object-fit:contain">'+
      '<h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2>'+
      (company.address?'<div>'+esc(company.address)+'</div>':'')+
      (company.phone?'<div>Tel/WA: '+esc(company.phone)+'</div>':'')+
      '</div>'+clone.innerHTML+'</body></html>';
  };
  const openPrint=()=>{
    const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
    w.document.write(exportHtml());w.document.close();
    setTimeout(()=>{w.focus();w.print();},450);
  };
  const printBtn=document.getElementById('productionRecapPrint');
  const pdfBtn=document.getElementById('productionRecapPdf');
  const excelBtn=document.getElementById('productionRecapExcel');
  if(printBtn)printBtn.onclick=openPrint;
  if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(exportHtml(),fileBase+'.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
  if(excelBtn)excelBtn.onclick=()=>{
    const clone=exportArea?.cloneNode(true);if(!clone)return;
    clone.querySelectorAll('button,.report-actions').forEach(x=>x.remove());
    const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml('<html><head><meta charset="utf-8"></head><body><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><h3>Rekap Produksi PPL</h3><p>'+prodDateId(from)+' s/d '+prodDateId(to)+(filterSummary?' · '+esc(filterSummary):'')+'</p>'+clone.innerHTML+'</body></html>')]);
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=fileBase+'.xlsx';document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}
async function pplRhppAbkViewPage(){
  const d=await productionBase({includeRhppCosts:false});
  const [rr,sr,cr,br,cpr]=await Promise.all([
    db.from('production_abk_results').select('*'),
    db.from('production_abk_result_sizes').select('*').order('harvest_date',{ascending:true}).order('created_at',{ascending:true}),
    db.from('contracts').select('id,number,contract_date,performance_template_name,doc_price,pre_starter_price,starter_price,finisher_price'),
    db.from('contract_bonuses').select('contract_id,metric,min_value,max_value,rupiah_per_kg'),
    db.from('company_profile').select('company_name,legal_name,address,phone,email,website,logo_url').eq('id',true).maybeSingle()
  ]);
  const rows=rr.data||[],sizes=sr.data||[],leagueContracts=cr.data||[],leagueBonuses=br.data||[],company=cpr.data||{};
  const err=[{error:d.err},rr,sr,cr,br,cpr].find(x=>x?.error)?.error;
  if(err)return layout('<section class="panel"><h3>Lihat RHPP ABK</h3><p class="error">'+esc(err.message)+'</p></section>');

  window.__pplRhppAbkViewState=window.__pplRhppAbkViewState||{barn:'',assignment:'',abk:''};
  const st=window.__pplRhppAbkViewState;
  const assignmentRows=d.assignments.filter(a=>d.links.some(l=>l.contract_assignment_id===a.id));
  const barnRows=d.barns.filter(b=>assignmentRows.some(a=>a.barn_id===b.id));
  const barnAssignments=st.barn?assignmentRows.filter(a=>a.barn_id===st.barn):[];
  if(st.assignment&&!barnAssignments.some(a=>a.id===st.assignment))st.assignment='';
  const assignmentAbkIds=st.assignment?new Set(d.links.filter(l=>l.contract_assignment_id===st.assignment).map(l=>l.abk_id)):new Set();
  const abkRows=st.assignment?d.abks.filter(a=>assignmentAbkIds.has(a.id)):[];
  if(st.abk&&!abkRows.some(a=>a.id===st.abk))st.abk='';

  const abkReferenceContractId=a=>{
    if(a?.master_contract_id)return a.master_contract_id;
    if(a?.cycle_type!=='MANDIRI')return '';
    const ids=[...new Set((d.livePrices||[]).map(p=>p.contract_id).filter(Boolean))];
    return ids.length===1?ids[0]:'';
  };
  const calcResult=x=>{
    const a=d.assignments.find(a=>a.id===x.contract_assignment_id);
    const ci=d.chicks.find(c=>c.contract_assignment_id===x.contract_assignment_id);
    const link=d.links.find(l=>l.contract_assignment_id===x.contract_assignment_id&&l.abk_id===x.abk_id);
    const refContractId=abkReferenceContractId(a);
    const sz=sizes.filter(v=>v.result_id===x.id);
    const birds=sz.reduce((sum,v)=>sum+prodNum(v.birds),0);
    const kg=sz.reduce((sum,v)=>sum+prodNum(v.weight_kg),0);
    const bw=birds?kg/birds:0;
    const feed=(prodNum(link?.feed_pre_bags)+prodNum(link?.feed_starter_bags)+prodNum(link?.feed_finisher_bags))*50;
    const fcr=kg?feed/kg:0;
    const age=birds&&ci?sz.reduce((sum,v)=>sum+prodAge(ci.arrived_on,v.harvest_date)*prodNum(v.birds),0)/birds:0;
    const initial=prodNum(link?.initial_birds);
    const survival=initial?Math.min(100,birds/initial*100):0;
    const mortality=Math.max(0,100-survival);
    const ip=initial&&age&&fcr?(survival*bw*100)/(age*fcr):0;
    let revenue=0;
    for(const z of sz){
      const av=prodNum(z.birds)?prodNum(z.weight_kg)/prodNum(z.birds):0;
      const p=d.livePrices.find(p=>p.contract_id===refContractId&&av>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||av<prodNum(p.max_weight_kg)));
      revenue+=prodNum(z.weight_kg)*prodNum(p?.price_per_kg);
    }
    const contract=leagueContracts.find(c=>c.id===refContractId);
    const docCost=initial*prodNum(contract?.doc_price);
    const feedCost=
      prodNum(link?.feed_pre_bags)*50*prodNum(contract?.pre_starter_price)+
      prodNum(link?.feed_starter_bags)*50*prodNum(contract?.starter_price)+
      prodNum(link?.feed_finisher_bags)*50*prodNum(contract?.finisher_price);
    const sapronakCost=docCost+feedCost;
    const matchBonus=(metric,value)=>prodNum(leagueBonuses.find(b=>
      b.contract_id===refContractId&&b.metric===metric&&
      (b.min_value==null||value>=prodNum(b.min_value))&&
      (b.max_value==null||value<prodNum(b.max_value))
    )?.rupiah_per_kg);
    const ipRate=matchBonus('IP',ip);
    const ipBonus=kg*ipRate;
    const perfRows=d.standards
      .filter(v=>(a?.cycle_type==='MANDIRI'||v.contract_id===a?.master_contract_id)&&v.template_name===a?.performance_template_name&&v.std_fcr!=null)
      .sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days));
    let stdFcr=0;
    if(perfRows.length){
      const exact=perfRows.find(v=>prodNum(v.age_days)===age);
      if(exact)stdFcr=prodNum(exact.std_fcr);
      else{
        const lower=[...perfRows].reverse().find(v=>prodNum(v.age_days)<=age);
        const upper=perfRows.find(v=>prodNum(v.age_days)>=age);
        if(lower&&upper&&prodNum(upper.age_days)!==prodNum(lower.age_days)){
          const ratio=(age-prodNum(lower.age_days))/(prodNum(upper.age_days)-prodNum(lower.age_days));
          stdFcr=prodNum(lower.std_fcr)+(prodNum(upper.std_fcr)-prodNum(lower.std_fcr))*ratio;
        }else stdFcr=prodNum((lower||upper)?.std_fcr);
      }
    }
    const fcrDiff=stdFcr?stdFcr-fcr:0;
    const fcrRate=fcrDiff>0?matchBonus('FCR_DIFFERENCE',fcrDiff):0;
    const fcrBonus=fcrDiff>0?kg*fcrRate:0;
    const baseProfit=revenue-sapronakCost;
    const profit=baseProfit+ipBonus+fcrBonus;
    const perBird=birds?profit/birds:0;
    const avgLivePrice=kg?revenue/kg:0;
    const feedPerBird=initial?feed*1000/initial:0;
    return {...x,a,ci,link,birds,kg,bw,feed,feedPerBird,fcr,stdFcr,age,initial,survival,mortality,ip,revenue,docCost,feedCost,sapronakCost,ipRate,ipBonus,fcrDiff,fcrRate,fcrBonus,baseProfit,profit,perBird,avgLivePrice};
  };

  const selectedResult=st.assignment&&st.abk
    ?rows.map(calcResult).find(x=>x.contract_assignment_id===st.assignment&&x.abk_id===st.abk)
    :null;
  const selectedAssignment=st.assignment?d.assignments.find(x=>x.id===st.assignment):null;
  const selectedContractId=abkReferenceContractId(selectedAssignment);
  const selectedContract=selectedContractId?leagueContracts.find(x=>x.id===selectedContractId):null;
  const selectedLivePrices=selectedContractId?(d.livePrices||[]).filter(x=>x.contract_id===selectedContractId):[];
  const selectedHarvestRows=selectedResult
    ?sizes.filter(x=>x.result_id===selectedResult.id).map(x=>{
      const birds=prodNum(x.birds),kg=prodNum(x.weight_kg),bw=birds?kg/birds:0;
      const priceRow=selectedLivePrices.find(p=>bw>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||bw<prodNum(p.max_weight_kg)));
      const price=prodNum(priceRow?.price_per_kg);
      return {...x,bw,price,value:kg*price};
    })
    :[];

  let html=RHPP_SCREEN_STYLE+'<div class="rhpp-ui"><section class="panel"><h3>Lihat RHPP ABK</h3><p class="muted">Pilih kandang, siklus, lalu ABK. Sumber data tetap dari Liga ABK.</p>'+
    '<form id="pplRhppAbkFilter" class="form-vertical" data-no-submit-guard="1">'+
      '<label>Kandang<select id="pplRhppAbkBarn" required><option value="">Pilih Kandang</option>'+barnRows.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Siklus<select id="pplRhppAbkAssignment" required '+(!st.barn?'disabled':'')+'><option value="">Pilih Siklus</option>'+barnAssignments.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(d.assignments,a)+' · '+(a.cycle_type||'MITRA')+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+'</select></label>'+
      '<label>ABK<select id="pplRhppAbkAbk" required '+(!st.assignment?'disabled':'')+'><option value="">Pilih ABK</option>'+abkRows.map(a=>'<option value="'+esc(a.id)+'" '+(st.abk===a.id?'selected':'')+'>'+esc(leagueAbkName(a))+'</option>').join('')+'</select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>';

  if(st.assignment&&st.abk){
    const a=d.assignments.find(x=>x.id===st.assignment);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const e=d.abks.find(x=>x.id===st.abk);
    const link=d.links.find(x=>x.contract_assignment_id===st.assignment&&x.abk_id===st.abk);
    const r=selectedResult;
    const money=v=>'Rp '+prodFmt(v,0);
    const moneyMaybe=v=>v===null||v===undefined||v===''?'-':money(v);

    html+='<style>.ui-abk-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px}.ui-abk-head h2{margin:0;color:#0b5f8f}.rhpp-page .rhpp-panel{border:1px solid #d7e5ec!important;border-radius:10px!important;padding:14px!important;background:#fff!important}.rhpp-page .rhpp-section-head h3,.rhpp-page .rhpp-panel h3{color:#0b5f8f}.rhpp-page table{font-size:13px}.rhpp-page th,.rhpp-page td{padding:8px 10px!important}.rhpp-page thead th{background:#12a8d4!important;color:#fff!important}.rhpp-page{display:grid;gap:12px}.rhpp-page .rhpp-summary-card{border-radius:9px}.rhpp-page .rhpp-control{margin-top:0!important}</style><section class="panel"><div class="ui-abk-head"><div><h2>RHPP ABK</h2><div class="muted">Tampilan audit per ABK · sumber Liga ABK</div></div><div class="report-actions"><button type="button" id="pplRhppAbkPrintTop">Print</button><button type="button" id="pplRhppAbkPdfTop">PDF</button><button type="button" id="pplRhppAbkExcelTop">Excel</button></div></div></section><div class="rhpp-page" id="pplRhppAbkExportArea">'+
      '<section class="panel rhpp-panel rhpp-head"><h3>'+esc(leagueAbkName(e))+' · '+esc(b?shortBarnLabel(b):'-')+'</h3>'+
        '<p class="muted">'+esc(assignmentCycleLabel(d.assignments,a))+' · Status: <strong>'+(a?.active?'PROSES':'CLOSED')+'</strong></p>'+
        '<p class="muted"><strong>Kontrak Acuan Penilaian:</strong> '+esc(selectedContract?.number||'-')+(a?.cycle_type==='MANDIRI'?' · acuan pembanding MANDIRI':'')+'</p>'+
      '</section>';
    if(r){html+='<div class="ui-rhpp-kpis">'+
      '<div class="ui-rhpp-kpi"><span>Populasi Awal</span><strong>'+prodFmt(r.initial,0)+'</strong></div>'+
      '<div class="ui-rhpp-kpi"><span>Panen</span><strong>'+prodFmt(r.birds,0)+' ekor</strong></div>'+
      '<div class="ui-rhpp-kpi"><span>Total Berat</span><strong>'+prodFmt(r.kg,2)+' kg</strong></div>'+
      '<div class="ui-rhpp-kpi"><span>BW Rata-rata</span><strong>'+prodFmt(r.bw,2)+' kg</strong></div>'+
      '<div class="ui-rhpp-kpi"><span>FCR</span><strong>'+prodFmt(r.fcr,3)+'</strong></div>'+
      '<div class="ui-rhpp-kpi"><span>IP</span><strong>'+prodFmt(r.ip,0)+'</strong></div>'+
    '</div>';}


    if(r){
      html+='<section class="panel rhpp-panel rhpp-wide rhpp-harvest"><div class="rhpp-section-head"><div><h3>Rincian Panen ABK</h3><p class="muted">Data panen Liga ABK yang menjadi sumber nilai produksi RHPP ABK.</p></div><span class="rhpp-count">'+selectedHarvestRows.length+' transaksi</span></div>'+
        '<div class="tablewrap rhpp-harvest-wrap"><table class="rhpp-harvest-table"><thead><tr>'+
          '<th>Tanggal</th><th class="num">Ekor</th><th class="num">Berat (Kg)</th><th class="num">BW</th><th class="num">Harga Kontrak/Kg</th><th class="num rhpp-money-col">Nilai Produksi</th>'+
        '</tr></thead><tbody>'+
          selectedHarvestRows.map(x=>'<tr><td>'+prodDateId(x.harvest_date)+'</td><td class="num">'+prodFmt(x.birds,0)+'</td><td class="num">'+prodFmt(x.weight_kg,2)+'</td><td class="num">'+prodFmt(x.bw,3)+'</td><td class="num">'+money(x.price)+'</td><td class="num rhpp-money-col">'+money(x.value)+'</td></tr>').join('')+
          '<tr class="rhpp-total-row"><th>TOTAL PANEN</th><th class="num">'+prodFmt(r.birds,0)+'</th><th class="num">'+prodFmt(r.kg,2)+'</th><th class="num">'+prodFmt(r.bw,3)+'</th><th></th><th class="num">'+moneyMaybe(r.revenue)+'</th></tr>'+
        '</tbody></table></div>'+
        '<div class="rhpp-summary-cards">'+
          '<div class="rhpp-summary-card"><span>Total Ekor</span><strong>'+prodFmt(r.birds,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Berat</span><strong>'+prodFmt(r.kg,2)+' Kg</strong></div>'+
          '<div class="rhpp-summary-card"><span>BW Rata-rata</span><strong>'+prodFmt(r.bw,3)+' Kg</strong></div>'+
          '<div class="rhpp-summary-card rhpp-summary-value"><span>Nilai Produksi</span><strong>'+moneyMaybe(r.revenue)+'</strong></div>'+
        '</div></section>';



      html+='<section class="panel rhpp-panel rhpp-wide"><div class="rhpp-section-head"><div><h3>DOC ABK</h3><p class="muted">Biaya DOC mengikuti populasi awal ABK dan harga DOC kontrak.</p></div></div>'+
        '<div class="tablewrap"><table><thead><tr><th>Tanggal DOC</th><th>ABK</th><th class="num">Qty Ekor</th><th class="num">Harga/Ekor</th><th class="num">Total</th></tr></thead><tbody>'+
          '<tr><td>'+prodDateId(r.ci?.arrived_on)+'</td><td>'+esc(leagueAbkName(e))+'</td><td class="num">'+prodFmt(r.initial,0)+'</td><td class="num">'+moneyMaybe(selectedContract?.doc_price)+'</td><td class="num">'+moneyMaybe(r.docCost)+'</td></tr>'+
        '</tbody></table></div></section>';

            html+='<section class="panel rhpp-panel rhpp-wide rhpp-feed-panel"><h3>Pemakaian Pakan ABK</h3>'+
        '<div class="tablewrap"><table class="rhpp-feed-table"><thead><tr><th>Jenis</th><th class="num">Zak</th><th class="num">Kg</th><th class="num">Harga/Kg</th><th class="num">Nilai</th></tr></thead><tbody>'+
          '<tr><td>Pre Starter</td><td class="num">'+prodFmt(link?.feed_pre_bags,2)+'</td><td class="num">'+prodFmt(prodNum(link?.feed_pre_bags)*50,2)+'</td><td class="num">'+money(selectedContract?.pre_starter_price)+'</td><td class="num">'+money(prodNum(link?.feed_pre_bags)*50*prodNum(selectedContract?.pre_starter_price))+'</td></tr>'+
          '<tr><td>Starter</td><td class="num">'+prodFmt(link?.feed_starter_bags,2)+'</td><td class="num">'+prodFmt(prodNum(link?.feed_starter_bags)*50,2)+'</td><td class="num">'+money(selectedContract?.starter_price)+'</td><td class="num">'+money(prodNum(link?.feed_starter_bags)*50*prodNum(selectedContract?.starter_price))+'</td></tr>'+
          '<tr><td>Finisher</td><td class="num">'+prodFmt(link?.feed_finisher_bags,2)+'</td><td class="num">'+prodFmt(prodNum(link?.feed_finisher_bags)*50,2)+'</td><td class="num">'+money(selectedContract?.finisher_price)+'</td><td class="num">'+money(prodNum(link?.feed_finisher_bags)*50*prodNum(selectedContract?.finisher_price))+'</td></tr>'+
          '<tr class="rhpp-total-row"><th>TOTAL PAKAN</th><th class="num">'+prodFmt(prodNum(link?.feed_pre_bags)+prodNum(link?.feed_starter_bags)+prodNum(link?.feed_finisher_bags),2)+'</th><th class="num">'+prodFmt(r.feed,2)+'</th><th></th><th class="num">'+moneyMaybe(r.feedCost)+'</th></tr>'+
        '</tbody></table></div></section>';
      html+='<section class="panel rhpp-panel rhpp-wide"><div class="rhpp-section-head"><div><h3>OVK ABK</h3><p class="muted">Format disamakan dengan RHPP utama. Saat ini OVK tidak dialokasikan per ABK di Liga ABK, sehingga tidak dimasukkan ke nilai RHPP ABK.</p></div></div>'+
        '<div class="tablewrap"><table><thead><tr><th>Jenis</th><th class="num">Qty</th><th>Satuan</th><th class="num">Harga</th><th class="num">Total</th></tr></thead><tbody>'+
          '<tr><td>OVK</td><td class="num">-</td><td>-</td><td class="num">-</td><td class="num">Tidak dialokasikan</td></tr>'+
        '</tbody></table></div></section>';




            html+='<div class="rhpp-grid">'+
        '<section class="panel rhpp-panel"><h3>Ringkasan Produksi ABK</h3><div class="tablewrap"><table><tbody>'+
          '<tr><td>Nama Kandang / Peternak</td><td>'+esc(b?shortBarnLabel(b):'-')+'</td></tr>'+
          '<tr><td>Nama ABK</td><td>'+esc(leagueAbkName(e))+'</td></tr>'+
          '<tr><td>Tanggal Chick-In</td><td>'+prodDateId(r.ci?.arrived_on)+'</td></tr>'+
          '<tr><td>Populasi Awal</td><td>'+prodFmt(r.initial,0)+'</td></tr>'+
          '<tr><td>Total Panen (Ekor)</td><td>'+prodFmt(r.birds,0)+'</td></tr>'+
          '<tr><td>Total Panen (Kg)</td><td>'+prodFmt(r.kg,2)+'</td></tr>'+
          '<tr><td>BW Rataan</td><td>'+prodFmt(r.bw,3)+'</td></tr>'+
        '</tbody></table></div></section>'+
        '<section class="panel rhpp-panel"><h3>Kinerja Produksi ABK</h3><div class="tablewrap"><table><tbody>'+
          '<tr><td>Mortalitas / Selisih</td><td>'+prodFmt(r.mortality,2)+'%</td></tr>'+
          '<tr><td>Total Pakan</td><td>'+prodFmt(r.feed,2)+' Kg</td></tr>'+
          '<tr><td>Pakan Per Ekor</td><td>'+prodFmt(r.feedPerBird,0)+' gr/ekor</td></tr>'+
          '<tr><td>Umur Panen</td><td>'+prodFmt(r.age,2)+' hari</td></tr>'+
          '<tr><td>FCR</td><td>'+prodFmt(r.fcr,3)+'</td></tr>'+
          '<tr><td>FCR Standar</td><td>'+prodFmt(r.stdFcr,3)+'</td></tr>'+
          '<tr><td>DIFF FCR</td><td>'+prodFmt(r.fcrDiff,3)+'</td></tr>'+
          '<tr><td>Indeks Prestasi</td><td>'+prodFmt(r.ip,2)+'</td></tr>'+
        '</tbody></table></div></section>'+
        '<section class="panel rhpp-panel"><h3>Perhitungan RHPP ABK</h3><div class="tablewrap"><table><tbody>'+
          '<tr><td>Nilai Produksi</td><td>'+moneyMaybe(r.revenue)+'</td></tr>'+
          '<tr><td>DOC</td><td>'+moneyMaybe(r.docCost)+'</td></tr>'+
          '<tr><td>Pakan</td><td>'+moneyMaybe(r.feedCost)+'</td></tr>'+
          '<tr><td>Total Sapronak</td><td>'+moneyMaybe(r.sapronakCost)+'</td></tr>'+
          '<tr><td>Laba Dasar</td><td>'+moneyMaybe(r.baseProfit)+'</td></tr>'+
        '</tbody></table></div></section>'+
        '<section class="panel rhpp-panel"><h3>Nilai RHPP ABK</h3><div class="tablewrap"><table><tbody>'+
          '<tr><td>Bonus IP</td><td>'+moneyMaybe(r.ipBonus)+' ('+prodFmt(r.ipRate,0)+'/kg)</td></tr>'+
          '<tr><td>Bonus FCR</td><td>'+moneyMaybe(r.fcrBonus)+' ('+prodFmt(r.fcrRate,0)+'/kg)</td></tr>'+
          '<tr><td><strong>RHPP ABK</strong></td><td><strong>'+moneyMaybe(r.profit)+'</strong></td></tr>'+
          '<tr><td>Hasil / Ekor Panen</td><td>'+moneyMaybe(r.perBird)+'</td></tr>'+
        '</tbody></table></div></section>'+
      '</div>';
    }else{
      html+='<section class="panel rhpp-panel"><p class="muted">Data hasil Liga ABK untuk pilihan ini belum tersedia.</p></section>';
    }

    html+='<section class="panel rhpp-panel rhpp-control"><div class="rhpp-section-head"><div><h3>Keterangan</h3><p class="muted">Mortalitas '+prodFmt(r?.mortality,2)+'% · BW '+prodFmt(r?.bw,3)+' Kg · FCR '+prodFmt(r?.fcr,3)+' · Umur '+prodFmt(r?.age,2)+' hari · IP '+prodFmt(r?.ip,2)+' · '+(a?.active?'Siklus masih PROSES, belum final.':'Siklus CLOSED / final.')+'</p></div>'+
      '<div class="report-actions"><button type="button" id="pplRhppAbkPrint">Print</button><button type="button" id="pplRhppAbkPdf">PDF</button><button type="button" id="pplRhppAbkExcel">Excel</button></div></div></section>'+
    '</div>';
  }
  html+='</div>';
  layout(html);

  const form=document.getElementById('pplRhppAbkFilter');
  const barn=document.getElementById('pplRhppAbkBarn');
  const assignment=document.getElementById('pplRhppAbkAssignment');
  const abk=document.getElementById('pplRhppAbkAbk');
  if(barn)barn.onchange=()=>{st.barn=barn.value;st.assignment='';st.abk='';pplRhppAbkViewPage();};
  if(assignment)assignment.onchange=()=>{st.assignment=assignment.value;st.abk='';pplRhppAbkViewPage();};
  if(form)form.onsubmit=e=>{
    e.preventDefault();
    if(!barn?.value)return msg('Pilih kandang.');
    if(!assignment?.value)return msg('Pilih siklus.');
    if(!abk?.value)return msg('Pilih ABK.');
    st.barn=barn.value;st.assignment=assignment.value;st.abk=abk.value;
    pplRhppAbkViewPage();
  };

  if(st.assignment&&st.abk){
    const exportArea=document.getElementById('pplRhppAbkExportArea');
    const a=d.assignments.find(x=>x.id===st.assignment);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const e=d.abks.find(x=>x.id===st.abk);
    const fileBase=('RHPP_ABK_'+(e?.code||e?.name||'ABK')+'_'+(b?.code||'Kandang')+'_'+String(a?.start_date||'Siklus')).replace(/[^A-Za-z0-9_-]+/g,'_');
    const docHtml=()=>{
      const clone=exportArea?.cloneNode(true);if(!clone)return '';
      clone.querySelectorAll('button,.report-actions,style').forEach(x=>x.remove());
      return rhppPrintShell('RHPP ABK',company,clone.outerHTML);
    };
    const openPrint=()=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      w.document.write(docHtml());w.document.close();setTimeout(()=>{w.focus();w.print();},450);
    };
    const pBtn=document.getElementById('pplRhppAbkPrint');
    const pdfBtn=document.getElementById('pplRhppAbkPdf');
    const xBtn=document.getElementById('pplRhppAbkExcel');
    const pBtnTop=document.getElementById('pplRhppAbkPrintTop');
    const pdfBtnTop=document.getElementById('pplRhppAbkPdfTop');
    const xBtnTop=document.getElementById('pplRhppAbkExcelTop');
    if(pBtn)pBtn.onclick=openPrint;
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(docHtml(),fileBase+'.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(pBtnTop)pBtnTop.onclick=openPrint;
    if(pdfBtnTop)pdfBtnTop.onclick=()=>BMSCore.savePdfHtml(docHtml(),fileBase+'.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    const exportAbkExcel=()=>{
      const clone=exportArea?.cloneNode(true);if(!clone)return;
      clone.querySelectorAll('button,.report-actions').forEach(x=>x.remove());
      const exportCompany=company.company_name||company.legal_name||'Nama perusahaan belum diisi';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml('<html><head><meta charset="utf-8"></head><body><h2>'+esc(exportCompany)+'</h2><h3>RHPP ABK</h3>'+clone.innerHTML+'</body></html>')]);
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=fileBase+'.xlsx';document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    if(xBtn)xBtn.onclick=exportAbkExcel;
    if(xBtnTop)xBtnTop.onclick=exportAbkExcel;
  }
}

const RHPP_SCREEN_STYLE='<style>'+
'.rhpp-ui .panel,.rhpp-page .panel{border:1px solid #d7e5ec!important;border-radius:12px!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,50,70,.04);padding:16px!important}'+
'.rhpp-ui h2,.rhpp-ui h3,.rhpp-page h2,.rhpp-page h3{color:#0b5f8f}'+
'.rhpp-ui .rhpp-section-head,.rhpp-page .rhpp-section-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}'+
'.rhpp-ui .rhpp-count,.rhpp-page .rhpp-count{display:inline-flex;align-items:center;border-radius:999px;background:#e9f7fb;color:#0b5f8f;padding:5px 10px;font-weight:700;font-size:12px}'+
'.rhpp-ui .tablewrap,.rhpp-page .tablewrap{overflow:auto;border-radius:9px;border:1px solid #e1eaf0}'+
'.rhpp-ui .tablewrap table,.rhpp-page .tablewrap table{width:100%;border-collapse:collapse;background:#fff}'+
'.rhpp-ui .tablewrap th,.rhpp-ui .tablewrap td,.rhpp-page .tablewrap th,.rhpp-page .tablewrap td{padding:9px 10px;border-bottom:1px solid #edf2f5;font-size:13px;vertical-align:middle}'+
'.rhpp-ui .tablewrap thead th,.rhpp-page .tablewrap thead th{background:#12a8d4!important;color:#fff!important;font-weight:700}'+
'.rhpp-ui .tablewrap tbody tr:last-child td,.rhpp-page .tablewrap tbody tr:last-child td{border-bottom:0}'+
'.rhpp-ui .num,.rhpp-page .num{text-align:right}'+
'.rhpp-ui .report-actions,.rhpp-page .report-actions{display:flex;gap:8px;flex-wrap:wrap}'+
'.rhpp-ui .report-actions button,.rhpp-page .report-actions button{border-radius:8px}'+
'.rhpp-ui .form-vertical,.rhpp-page .form-vertical{gap:10px}'+
'.rhpp-ui select,.rhpp-ui input,.rhpp-ui textarea,.rhpp-page select,.rhpp-page input,.rhpp-page textarea{border-radius:8px}'+
'.rhpp-ui .rhpp-summary-cards,.rhpp-page .rhpp-summary-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}'+
'.rhpp-ui .rhpp-summary-card,.rhpp-page .rhpp-summary-card{border:1px solid #d7e5ec;border-radius:10px;padding:12px;background:#fff}'+
'.rhpp-ui .rhpp-summary-card span,.rhpp-page .rhpp-summary-card span{display:block;color:#64748b;font-size:12px;margin-bottom:4px}'+
'.rhpp-ui .rhpp-summary-card strong,.rhpp-page .rhpp-summary-card strong{font-size:17px;color:#102a43}'+
'.rhpp-ui .rhpp-total-row th,.rhpp-ui .rhpp-total-row td,.rhpp-page .rhpp-total-row th,.rhpp-page .rhpp-total-row td{background:#eef8fc!important;font-weight:800}'+
'.rhpp-ui .muted,.rhpp-page .muted{color:#64748b}'+
'.rhpp-ui .ui-rhpp-head,.rhpp-page .ui-rhpp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}'+
'.rhpp-ui .ui-rhpp-title h2,.rhpp-page .ui-rhpp-title h2{margin:0;color:#0b5f8f}'+
'.rhpp-ui .ui-rhpp-status,.rhpp-page .ui-rhpp-status{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:#e9f7fb;color:#0b5f8f;font-weight:700;font-size:12px}'+
'.rhpp-ui .ui-rhpp-kpis,.rhpp-page .ui-rhpp-kpis{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px}'+
'.rhpp-ui .ui-rhpp-kpi,.rhpp-page .ui-rhpp-kpi{border:1px solid #d7e5ec;border-radius:10px;padding:12px;background:#fff}'+
'.rhpp-ui .ui-rhpp-kpi span,.rhpp-page .ui-rhpp-kpi span{display:block;color:#64748b;font-size:12px;margin-bottom:4px}'+
'.rhpp-ui .ui-rhpp-kpi strong,.rhpp-page .ui-rhpp-kpi strong{font-size:18px;color:#102a43}'+
'.rhpp-ui .ui-rhpp-grid,.rhpp-page .ui-rhpp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}'+
'.rhpp-ui .ui-rhpp-card,.rhpp-page .ui-rhpp-card{border:1px solid #d7e5ec;border-radius:10px;background:#fff;overflow:hidden}'+
'.rhpp-ui .ui-rhpp-card h3,.rhpp-page .ui-rhpp-card h3{margin:0;padding:10px 12px;background:#eef8fc;color:#0b5f8f;font-size:14px}'+
'.rhpp-ui .ui-rhpp-card table,.rhpp-page .ui-rhpp-card table{width:100%;border-collapse:collapse}'+
'.rhpp-ui .ui-rhpp-card td,.rhpp-ui .ui-rhpp-card th,.rhpp-page .ui-rhpp-card td,.rhpp-page .ui-rhpp-card th{padding:8px 10px;border-top:1px solid #edf2f5;font-size:13px}'+
'.rhpp-ui .ui-rhpp-card td:last-child,.rhpp-page .ui-rhpp-card td:last-child{text-align:right;font-weight:700}'+
'.rhpp-ui .ui-rhpp-wide,.rhpp-page .ui-rhpp-wide{grid-column:1/-1}'+
'.rhpp-ui .ui-rhpp-profit,.rhpp-page .ui-rhpp-profit{color:#111!important;font-weight:800!important}'+
'.rhpp-ui .ui-rhpp-loss,.rhpp-page .ui-rhpp-loss{color:#d9272e!important;font-weight:800!important}'+
'@media(max-width:980px){.rhpp-ui .ui-rhpp-kpis,.rhpp-page .ui-rhpp-kpis{grid-template-columns:repeat(3,1fr)}.rhpp-ui .ui-rhpp-grid,.rhpp-page .ui-rhpp-grid{grid-template-columns:1fr}}'+
'@media(max-width:900px){.rhpp-ui .rhpp-summary-cards,.rhpp-page .rhpp-summary-cards{grid-template-columns:repeat(2,1fr)}}'+
'@media(max-width:600px){.rhpp-ui .ui-rhpp-kpis,.rhpp-page .ui-rhpp-kpis{grid-template-columns:repeat(2,1fr)}}'+
'</style>';
const RHPP_PRINT_STYLE='<style>'+
'@page{size:A4 portrait;margin:8mm}'+
'*{box-sizing:border-box}'+
'html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#17212b;font-size:10px;line-height:1.35;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'+
'.print-sheet{width:194mm;max-width:194mm;margin:0 auto;padding:0}'+
'.print-head{display:grid;grid-template-columns:31mm 1fr;gap:6mm;align-items:center;border-bottom:2px solid #0b5f8f;padding:0 0 3.5mm;margin:0 0 3.5mm}'+
'.print-logo{width:29mm;height:20mm;object-fit:contain;display:block}'+
'.print-company{min-width:0}'+
'.print-company strong{display:block;color:#0b5f8f;font-size:15px;line-height:1.15;margin-bottom:1mm;letter-spacing:.1px}'+
'.print-company div{font-size:9px;line-height:1.35;color:#526273}'+
'.print-title-wrap{text-align:center;margin:0 0 4mm;padding:0 2mm}'+
'.print-title{color:#0b5f8f;font-size:17px;line-height:1.15;font-weight:800;letter-spacing:.15px;margin:0}'+
'.print-subtitle{margin-top:1mm;color:#6b7d8c;font-size:9px;font-weight:600}'+
'#pplRhppExportArea,#pplRhppAbkExportArea{border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;background:#fff!important}'+
'.panel{border:1px solid #cbd9e2!important;border-radius:5px!important;box-shadow:none!important;background:#fff!important;padding:0!important;margin:0 0 3mm!important;overflow:hidden}'+
'.report-actions,button{display:none!important}'+
'.muted{color:#667788!important;font-size:9px!important}'+
'.ui-rhpp-head,.ui-abk-head,.rhpp-section-head{display:flex!important;justify-content:space-between;gap:8px;align-items:flex-start;padding:2.3mm 2.6mm!important;background:#f7fbfd!important;border-bottom:1px solid #d9e6ed!important}'+
'.ui-rhpp-title h2,.ui-abk-head h2,.rhpp-head h3{margin:0!important;color:#103f69!important;font-size:14px!important;line-height:1.2!important}'+
'.ui-rhpp-status{display:inline-block!important;padding:.6mm 1.8mm!important;border-radius:99px!important;background:#e6f7fa!important;color:#0b7285!important;font-size:8px!important;font-weight:800!important}'+
'.ui-rhpp-kpis,.rhpp-summary-cards{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:2.5mm!important;margin:0 0 3mm!important}'+
'.ui-rhpp-kpi,.rhpp-summary-card{border:1px solid #cfdee7!important;border-radius:4px!important;padding:2.6mm 2.8mm!important;background:#fbfdfe!important;min-height:17mm!important}'+
'.ui-rhpp-kpi span,.rhpp-summary-card span{display:block!important;color:#6a7c8d!important;font-size:8px!important;line-height:1.2!important;margin-bottom:1mm!important}'+
'.ui-rhpp-kpi strong,.rhpp-summary-card strong{display:block!important;color:#102f4c!important;font-size:12px!important;line-height:1.15!important;font-weight:800!important}'+
'.ui-rhpp-grid,.rhpp-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:3mm!important;margin-bottom:3mm!important}'+
'.ui-rhpp-card,.rhpp-panel{border:1px solid #cbd9e2!important;border-radius:4px!important;padding:0!important;margin:0!important;background:#fff!important;overflow:hidden!important}'+
'.ui-rhpp-card h3,.rhpp-panel h3,.rhpp-section-head h3{margin:0!important;padding:2.1mm 2.5mm!important;background:#0b5f8f!important;color:#fff!important;font-size:10px!important;line-height:1.2!important;font-weight:800!important}'+
'.ui-rhpp-card table,.tablewrap table,.rhpp-panel table,.ui-rhpp-table table{width:100%!important;border-collapse:collapse!important;table-layout:auto!important}'+
'.ui-rhpp-card th,.ui-rhpp-card td,.tablewrap th,.tablewrap td,.rhpp-panel th,.rhpp-panel td,.ui-rhpp-table th,.ui-rhpp-table td{border:.35px solid #aebfca!important;padding:1.8mm 2mm!important;font-size:9px!important;line-height:1.25!important;vertical-align:middle!important;color:#253746!important}'+
'.ui-rhpp-card td:first-child{color:#56697a!important}'+
'.ui-rhpp-card td:last-child{font-weight:700!important}'+
'.ui-rhpp-card thead th,.tablewrap thead th,.rhpp-panel thead th,.ui-rhpp-table thead th{background:#14a9cc!important;color:#fff!important;font-weight:800!important;text-align:center!important;white-space:normal!important}'+
'.num{text-align:right!important}'+
'.ui-rhpp-wide,.rhpp-wide{grid-column:1/-1!important}'+
'.rhpp-total-row th,.rhpp-total-row td,.total th,.total td{background:#edf6fa!important;font-weight:800!important;color:#173e5e!important}'+
'.ui-rhpp-profit,.profit-total td{color:#111!important;font-weight:800!important}'+
'.ui-rhpp-loss,.loss-total td{color:#d9272e!important;font-weight:800!important}'+
'.tablewrap,.ui-rhpp-table,.rhpp-harvest-wrap{overflow:visible!important;border:0!important}'+
'.rhpp-page{display:grid!important;gap:3mm!important}'+
'.rhpp-control{display:none!important}'+
'.print-footer{margin-top:4mm;padding-top:2mm;border-top:1px solid #d8e2e8;display:flex;justify-content:space-between;gap:10px;color:#758595;font-size:8px}'+
'@media print{html,body{font-size:10px}.panel,.ui-rhpp-card,.rhpp-panel,.ui-rhpp-kpi,.rhpp-summary-card{break-inside:avoid}.tablewrap table,.ui-rhpp-table table{break-inside:auto}tr{break-inside:avoid;break-after:auto}thead{display:table-header-group}}'+
'</style>';
const rhppPrintShell=(title,company,body)=>{
  const logo=company?.logo_url||BMS_PRINT_LOGO;
  const companyName=company?.company_name||company?.legal_name||'BMS Mobile';
  const addr=company?.address||'';
  const phone=company?.phone?('Tel/WA: '+company.phone):'';
  const email=company?.email||'';
  const docTitle=String(title||'RHPP').toUpperCase().includes('ABK')
    ?'REKAP HASIL PEMELIHARAAN PETERNAK (RHPP ABK)'
    :'REKAP HASIL PEMELIHARAAN PETERNAK (RHPP)';
  const stamp=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date())+' WIB';
  return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title>'+RHPP_PRINT_STYLE+'</head><body><div class="print-sheet">'+
    '<div class="print-head"><img class="print-logo" src="'+esc(logo)+'" alt="BMS"><div class="print-company"><strong>'+esc(companyName)+'</strong>'+
    (addr?'<div>'+esc(addr)+'</div>':'')+(phone?'<div>'+esc(phone)+'</div>':'')+(email?'<div>'+esc(email)+'</div>':'')+'</div></div>'+
    '<div class="print-title-wrap"><div class="print-title">'+esc(docTitle)+'</div><div class="print-subtitle">Dokumen Sistem BMS · A4 Portrait</div></div>'+
    body+
    '<div class="print-footer"><span>'+esc(companyName)+'</span><span>Dicetak: '+esc(stamp)+'</span></div>'+
    '</div></body></html>';
};

async function pplRhppViewPage(){
  const d=await productionBase();
  const [fr,cpr,sr,cr,br,shr,shir,itr,supr]=await Promise.all([
    db.from('production_cycle_final_unified').select('*').order('created_at',{ascending:false}),
    db.from('company_profile').select('company_name,legal_name,address,phone,email,website,logo_url').eq('id',true).maybeSingle(),
    db.rpc('finance_rhpp_summary_v6'),
    db.from('contracts').select('id,number,contract_date,performance_template_name,doc_price,pre_starter_price,starter_price,finisher_price'),
    db.from('contract_bonuses').select('contract_id,metric,min_value,max_value,rupiah_per_kg'),
    db.from('logistics_shipments').select('id,contract_assignment_id,shipment_date,shipping_note_number'),
    db.from('logistics_shipment_items').select('shipment_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('items').select('id,name,category,feed_phase,unit,kg_per_unit,supplier_id'),
    db.from('suppliers').select('id,name')
  ]);
  const finals=fr.data||[],company=cpr.data||{},summaries=sr.data||[],rhppContracts=cr.data||[],rhppBonuses=br.data||[];
  const rhppShipments=shr.data||[],rhppShipmentItems=shir.data||[],rhppItems=itr.data||[],rhppSuppliers=supr.data||[];
  const barnsForAssignments=[...new Map(d.assignments.map(a=>{
    const b=d.barns.find(x=>x.id===a.barn_id);
    return b?[b.id,b]:null;
  }).filter(Boolean)).values()];
  window.__pplRhppViewState=window.__pplRhppViewState||{barn:'',assignment:''};
  let selectedBarn=window.__pplRhppViewState.barn||'';
  let selectedAssignment=window.__pplRhppViewState.assignment||'';
  const barnAssignments=selectedBarn?d.assignments.filter(a=>a.barn_id===selectedBarn):[];
  if(selectedAssignment&&!barnAssignments.some(a=>a.id===selectedAssignment)){
    selectedAssignment='';
    window.__pplRhppViewState.assignment='';
  }

  let html=RHPP_SCREEN_STYLE+'<div class="rhpp-ui"><section class="panel"><h3>Lihat RHPP</h3><p class="muted">Pilih kandang, lalu pilih siklus. Data CLOSED membaca snapshot final MITRA maupun MANDIRI.</p>'+
    '<form id="pplRhppViewForm" class="form-vertical">'+
      '<label>Kandang<select id="pplRhppBarn" required><option value="">Pilih Kandang</option>'+
        barnsForAssignments.map(b=>'<option value="'+esc(b.id)+'" '+(selectedBarn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+
      '</select></label>'+
      '<label>Siklus<select id="pplRhppCycle" required '+(!selectedBarn?'disabled':'')+'><option value="">Pilih Siklus</option>'+
        barnAssignments.map(a=>'<option value="'+esc(a.id)+'" '+(selectedAssignment===a.id?'selected':'')+'>'+
          esc(assignmentCycleLabel(d.assignments,a)+' · '+(a.cycle_type||'MITRA')+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+
        '</option>').join('')+
      '</select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>';

  if(selectedAssignment){
    const a=d.assignments.find(x=>x.id===selectedAssignment);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const ci=d.chicks.find(x=>x.contract_assignment_id===selectedAssignment);
    const fin=finals.find(x=>x.contract_assignment_id===selectedAssignment);
    const live=summaries.find(x=>x.contract_assignment_id===selectedAssignment);
    const contract=d.masters.find(x=>x.id===a?.master_contract_id);
    const auditLivePrices=(d.livePrices||[]).filter(x=>x.contract_id===a?.master_contract_id);
    const isMandiri=String(a?.cycle_type||'').toUpperCase()==='MANDIRI'||!a?.master_contract_id;
    const auditHarvestRows=(d.harvests||[]).filter(x=>x.contract_assignment_id===selectedAssignment).map(x=>{
      const birds=prodNum(x.birds),kg=prodNum(x.net_weight_kg),bw=prodNum(x.avg_weight_kg)||(birds?kg/birds:0);
      const priceRow=auditLivePrices.find(p=>bw>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||bw<prodNum(p.max_weight_kg)));
      const savedPrice=prodNum(x.price_per_kg)>0?prodNum(x.price_per_kg):(kg>0&&prodNum(x.total_amount)>0?prodNum(x.total_amount)/kg:0);
      const contractPrice=prodNum(priceRow?.price_per_kg);
      const rhppPrice=isMandiri?savedPrice:(contractPrice>0?contractPrice:savedPrice);
      const savedValue=prodNum(x.total_amount);
      const rhppValue=isMandiri?(savedValue>0?savedValue:kg*rhppPrice):(rhppPrice>0?kg*rhppPrice:savedValue);
      return {...x,bw,rhppPrice,rhppValue};
    });
    const closed=!!fin;
    const src=closed?{
      chick_in_birds:fin.chick_in_birds,
      total_harvest_birds:fin.total_harvest_birds,
      total_harvest_kg:fin.total_harvest_kg,
      avg_bw_kg:fin.avg_bw_kg,
      weighted_age:fin.weighted_age,
      mortality_pct:fin.mortality_pct,
      net_feed_kg:fin.net_feed_kg,
      fcr_actual:fin.fcr_actual,
      fcr_standard:fin.fcr_standard,
      ip:fin.ip,
      harvest_value:fin.harvest_value,
      main_doc_cost:fin.main_doc_cost,
      main_feed_cost:fin.main_feed_cost,
      main_return_cost:fin.main_return_cost,
      sapronak_cost:fin.sapronak_cost,
      base_profit:fin.base_profit,
      bonus_ip_rate:fin.bonus_ip_rate,
      bonus_ip:fin.bonus_ip,
      bonus_fc_rate:fin.bonus_fc_rate,
      bonus_fc:fin.bonus_fc,
      bonus_mortality_rate:fin.bonus_depletion_rate,
      bonus_mortality:fin.bonus_depletion,
      farmer_profit:fin.system_amount,
      profit_per_chick_in:fin.profit_per_chick_in,
      std_bw_kg:fin.std_bw_kg
    }:live;

    const chickIn=prodNum(src?.chick_in_birds||((ci?.received||0)-(ci?.doa||0)));
    const harvestBirds=prodNum(src?.total_harvest_birds);
    const harvestKg=prodNum(src?.total_harvest_kg);
    const avgBw=prodNum(src?.avg_bw_kg);
    const feedKg=prodNum(src?.net_feed_kg);
    const feedPerBird=chickIn>0?feedKg*1000/chickIn:0;
    const avgLivePrice=harvestKg>0?prodNum(src?.harvest_value)/harvestKg:0;
    const hasValue=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
    const docUnitPrice=hasValue(src?.main_doc_cost)&&chickIn>0?prodNum(src.main_doc_cost)/chickIn:(hasValue(contract?.doc_price)?prodNum(contract.doc_price):null);
    const feedUnitPrice=hasValue(src?.main_feed_cost)&&feedKg>0?prodNum(src.main_feed_cost)/feedKg:null;
    const money=v=>'Rp '+prodFmt(v,0);
    const moneyMaybe=v=>hasValue(v)?money(v):'-';
    const numMaybe=(v,digits=2,suffix='')=>hasValue(v)?prodFmt(v,digits)+suffix:'-';
    const harvestPriceLabel=isMandiri?'Harga Aktual/Kg':'Harga RHPP/Kg';
    const harvestValueLabel=isMandiri?'Nilai Aktual':'Nilai RHPP';
    const profit=prodNum(src?.farmer_profit);
    const profitClass=profit<0?'ui-rhpp-loss':'ui-rhpp-profit';
    const assignmentShipIds=new Set(rhppShipments.filter(x=>x.contract_assignment_id===selectedAssignment).map(x=>x.id));
    const feedDetailRows=rhppShipmentItems.filter(x=>assignmentShipIds.has(x.shipment_id)).map(x=>{
      const item=rhppItems.find(i=>i.id===x.item_id);
      if(!item||String(item.category||'').toUpperCase()!=='PAKAN')return null;
      const ship=rhppShipments.find(s=>s.id===x.shipment_id);
      const kg=prodNum(x.quantity_kg)||prodNum(x.quantity)*prodNum(item.kg_per_unit);
      return {date:ship?.shipment_date,sj:ship?.shipping_note_number||'-',name:item.name||'Pakan',qty:prodNum(x.quantity),unit:item.unit||'-',kg};
    }).filter(Boolean).sort((u,v)=>String(u.date||'').localeCompare(String(v.date||'')));
    const ovkDetailRows=rhppShipmentItems.filter(x=>assignmentShipIds.has(x.shipment_id)).map(x=>{
      const item=rhppItems.find(i=>i.id===x.item_id);
      const cat=String(item?.category||'').toUpperCase();
      if(!item||!['OVK','OVK1'].includes(cat))return null;
      const ship=rhppShipments.find(s=>s.id===x.shipment_id);
      const supplier=rhppSuppliers.find(s=>s.id===item.supplier_id)?.name||'-';
      return {date:ship?.shipment_date,sj:ship?.shipping_note_number||'-',name:item.name||'OVK',qty:prodNum(x.quantity),unit:item.unit||'-',supplier};
    }).filter(Boolean).sort((u,v)=>String(u.date||'').localeCompare(String(v.date||'')));
    html+='<style>'+
      '.ui-rhpp-shell{display:grid;gap:14px}.ui-rhpp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.ui-rhpp-title h2{margin:0;color:#0b5f8f}.ui-rhpp-status{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:#e9f7fb;color:#0b5f8f;font-weight:700;font-size:12px}.ui-rhpp-kpis{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px}.ui-rhpp-kpi{border:1px solid #d7e5ec;border-radius:10px;padding:12px;background:#fff}.ui-rhpp-kpi span{display:block;color:#64748b;font-size:12px;margin-bottom:4px}.ui-rhpp-kpi strong{font-size:18px;color:#102a43}.ui-rhpp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.ui-rhpp-card{border:1px solid #d7e5ec;border-radius:10px;background:#fff;overflow:hidden}.ui-rhpp-card h3{margin:0;padding:10px 12px;background:#eef8fc;color:#0b5f8f;font-size:14px}.ui-rhpp-card table{width:100%;border-collapse:collapse}.ui-rhpp-card td,.ui-rhpp-card th{padding:8px 10px;border-top:1px solid #edf2f5;font-size:13px}.ui-rhpp-card td:last-child,.ui-rhpp-card th.num{text-align:right;font-weight:700}.ui-rhpp-wide{grid-column:1/-1}.ui-rhpp-table{overflow:auto}.ui-rhpp-table table{min-width:760px}.ui-rhpp-table thead th{background:#12a8d4;color:#fff;border-top:0}.ui-rhpp-profit{color:#111!important;font-weight:800!important}.ui-rhpp-loss{color:#d9272e!important;font-weight:800!important}@media(max-width:980px){.ui-rhpp-kpis{grid-template-columns:repeat(3,1fr)}.ui-rhpp-grid{grid-template-columns:1fr}}@media(max-width:600px){.ui-rhpp-kpis{grid-template-columns:repeat(2,1fr)}}'+
    '</style>'+
    '<section class="panel ui-rhpp-shell" id="pplRhppExportArea">'+
      '<div class="ui-rhpp-head"><div class="ui-rhpp-title"><h2>'+esc(b?shortBarnLabel(b):'RHPP')+'</h2><div class="muted">'+esc(assignmentCycleLabel(d.assignments,a))+' · '+esc(a.cycle_type||'MITRA')+' · <span class="ui-rhpp-status">'+(closed?'FINAL / CLOSED':'PROSES')+'</span></div></div>'+
      '<div class="report-actions"><button type="button" id="pplRhppPrint">Print</button><button type="button" id="pplRhppPdf">PDF</button><button type="button" id="pplRhppExcel">Excel</button></div></div>'+
      '<div class="ui-rhpp-kpis">'+
        '<div class="ui-rhpp-kpi"><span>Populasi DOC</span><strong>'+prodFmt(chickIn,0)+'</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>Panen</span><strong>'+prodFmt(harvestBirds,0)+' ekor</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>Total Berat</span><strong>'+prodFmt(harvestKg,2)+' kg</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>BW Rata-rata</span><strong>'+prodFmt(avgBw,2)+' kg</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>FCR</span><strong>'+prodFmt(src?.fcr_actual,3)+'</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>IP</span><strong>'+prodFmt(src?.ip,0)+'</strong></div>'+
      '</div>'+
      '<div class="ui-rhpp-grid">'+
        '<div class="ui-rhpp-card"><h3>Identitas Siklus</h3><table><tbody>'+
          '<tr><td>Kandang</td><td>'+esc(b?shortBarnLabel(b):'-')+'</td></tr>'+
          '<tr><td>Tanggal Chick-In</td><td>'+prodDateId(closed?fin?.chick_in_date:ci?.arrived_on)+'</td></tr>'+
          '<tr><td>Harga DOC</td><td>'+moneyMaybe(docUnitPrice)+'</td></tr>'+
          '<tr><td>Harga Pakan Rata-rata</td><td>'+moneyMaybe(feedUnitPrice)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card"><h3>Kinerja Produksi</h3><table><tbody>'+
          '<tr><td>Mortalitas</td><td>'+prodFmt(src?.mortality_pct,2)+' %</td></tr>'+
          '<tr><td>Total Pakan</td><td>'+prodFmt(feedKg,2)+' kg</td></tr>'+
          '<tr><td>Pakan / Ekor</td><td>'+prodFmt(feedPerBird,0)+' gr</td></tr>'+
          '<tr><td>Umur Panen</td><td>'+prodFmt(src?.weighted_age,2)+' hari</td></tr>'+
          '<tr><td>FCR Standar</td><td>'+numMaybe(src?.fcr_standard,3)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card"><h3>Biaya Sapronak</h3><table><tbody>'+
          '<tr><td>DOC</td><td>'+moneyMaybe(src?.main_doc_cost)+'</td></tr>'+
          '<tr><td>Pakan</td><td>'+moneyMaybe(src?.main_feed_cost)+'</td></tr>'+
          '<tr><td>Retur</td><td>'+moneyMaybe(src?.main_return_cost)+'</td></tr>'+
          '<tr><td>Total Sapronak</td><td>'+money(src?.sapronak_cost)+'</td></tr>'+
          '<tr><td>Nilai Produksi</td><td>'+money(src?.harvest_value)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card"><h3>Nilai RHPP</h3><table><tbody>'+
          '<tr><td>Laba Dasar</td><td>'+money(src?.base_profit)+'</td></tr>'+
          '<tr><td>Bonus IP</td><td>'+money(src?.bonus_ip)+'</td></tr>'+
          '<tr><td>Bonus FCR</td><td>'+money(src?.bonus_fc)+'</td></tr>'+
          '<tr><td>Bonus Mortalitas</td><td>'+money(src?.bonus_mortality)+'</td></tr>'+
          '<tr><td><strong>Hasil RHPP</strong></td><td class="'+profitClass+'">'+money(profit)+'</td></tr>'+
          '<tr><td>Hasil / Ekor</td><td>'+money(src?.profit_per_chick_in)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card ui-rhpp-wide"><h3>Rincian Panen</h3><div class="ui-rhpp-table"><table><thead><tr><th>Tanggal</th><th class="num">Ekor</th><th class="num">Kg</th><th class="num">BW</th><th class="num">'+harvestPriceLabel+'</th><th class="num">'+harvestValueLabel+'</th></tr></thead><tbody>'+
          auditHarvestRows.map(x=>'<tr><td>'+prodDateId(x.harvested_on)+'</td><td>'+prodFmt(x.birds,0)+'</td><td>'+prodFmt(x.net_weight_kg,2)+'</td><td>'+prodFmt(x.bw,3)+'</td><td>'+moneyMaybe(x.rhppPrice||null)+'</td><td>'+moneyMaybe(x.rhppValue||null)+'</td></tr>').join('')+
          '<tr class="rhpp-total-row"><th>TOTAL PANEN</th><th class="num">'+prodFmt(harvestBirds,0)+'</th><th class="num">'+prodFmt(harvestKg,2)+'</th><th class="num">'+prodFmt(avgBw,3)+'</th><th></th><th class="num">'+money(src?.harvest_value)+'</th></tr>'+
        '</tbody></table></div></div>'+
        '<div class="ui-rhpp-card ui-rhpp-wide"><h3>DOC</h3><div class="ui-rhpp-table"><table><thead><tr><th>Tanggal DOC</th><th class="num">Qty Ekor</th><th class="num">Harga/Ekor</th><th class="num">Total</th></tr></thead><tbody>'+
          '<tr><td>'+prodDateId(closed?fin?.chick_in_date:ci?.arrived_on)+'</td><td class="num">'+prodFmt(chickIn,0)+'</td><td class="num">'+moneyMaybe(docUnitPrice)+'</td><td class="num">'+moneyMaybe(src?.main_doc_cost)+'</td></tr>'+
        '</tbody></table></div></div>'+
        '<div class="ui-rhpp-card ui-rhpp-wide"><h3>Pemakaian / Kiriman Pakan</h3><div class="ui-rhpp-table"><table><thead><tr><th>Tanggal</th><th>Pakan</th><th>No. Surat Jalan</th><th class="num">Qty</th><th>Satuan</th><th class="num">Berat (Kg)</th></tr></thead><tbody>'+
          (feedDetailRows.length?feedDetailRows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.sj)+'</td><td class="num">'+prodFmt(x.qty,2)+'</td><td>'+esc(x.unit)+'</td><td class="num">'+prodFmt(x.kg,2)+'</td></tr>').join(''):'<tr><td colspan="6" class="muted">Belum ada rincian kiriman pakan.</td></tr>')+
          '<tr class="rhpp-total-row"><th colspan="5">TOTAL PAKAN RHPP</th><th class="num">'+prodFmt(feedKg,2)+'</th></tr>'+
        '</tbody></table></div></div>'+
        '<div class="ui-rhpp-card ui-rhpp-wide"><h3>OVK</h3><div class="ui-rhpp-table"><table><thead><tr><th>Tanggal</th><th>OVK</th><th>No. Surat Jalan</th><th>Supplier</th><th class="num">Qty</th><th>Satuan</th></tr></thead><tbody>'+
          (ovkDetailRows.length?ovkDetailRows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.sj)+'</td><td>'+esc(x.supplier)+'</td><td class="num">'+prodFmt(x.qty,2)+'</td><td>'+esc(x.unit)+'</td></tr>').join(''):'<tr><td colspan="6" class="muted">Belum ada rincian OVK.</td></tr>')+
        '</tbody></table></div></div>'+

      '</div>'+
      (!src?'<p class="muted">Ringkasan RHPP belum tersedia untuk siklus ini.</p>':'')+
      (!closed?'<p class="muted">Periode masih PROSES. Nilai final tersedia setelah siklus ditutup.</p>':'')+
    '</section>';
  }

  html+='</div>';
  layout(html);
  if(d.err||fr.error||cpr.error||sr.error||cr.error||br.error||shr.error||shir.error||itr.error||supr.error)msg((d.err||fr.error||cpr.error||sr.error||cr.error||br.error||shr.error||shir.error||itr.error||supr.error).message);
  const barnSel=document.getElementById('pplRhppBarn');
  const cycleSel=document.getElementById('pplRhppCycle');
  if(barnSel)barnSel.onchange=async()=>{
    window.__pplRhppViewState={barn:barnSel.value||'',assignment:''};
    await pplRhppViewPage();
  };
  const form=document.getElementById('pplRhppViewForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    if(!barnSel?.value)return msg('Pilih kandang.');
    if(!cycleSel?.value)return msg('Pilih siklus.');
    window.__pplRhppViewState={barn:barnSel.value,assignment:cycleSel.value};
    await pplRhppViewPage();
  };

  if(selectedAssignment){
    const exportArea=document.getElementById('pplRhppExportArea');
    const a=d.assignments.find(x=>x.id===selectedAssignment);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const fileBase=('RHPP_'+(b?.code||'Kandang')+'_'+String(a?.start_date||'Siklus')).replace(/[^A-Za-z0-9_-]+/g,'_');
    const docHtml=()=>{
      const clone=exportArea?.cloneNode(true);if(!clone)return '';
      clone.querySelectorAll('button,.report-actions,style').forEach(x=>x.remove());
      return rhppPrintShell('RHPP',company,clone.outerHTML);
    };
    const openPrint=()=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      w.document.write(docHtml());w.document.close();
      setTimeout(()=>{w.focus();w.print();},450);
    };
    const pBtn=document.getElementById('pplRhppPrint');
    const pdfBtn=document.getElementById('pplRhppPdf');
    const xBtn=document.getElementById('pplRhppExcel');
    if(pBtn)pBtn.onclick=openPrint;
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(docHtml(),fileBase+'.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(xBtn)xBtn.onclick=()=>{
      // Excel must use a flat, table-based layout: grid/flex cards render as a single narrow column in mobile spreadsheet apps.
      const clone=exportArea?.cloneNode(true);if(!clone)return;
      clone.querySelectorAll('button,.report-actions,style').forEach(el=>el.remove());
      clone.querySelectorAll('.ui-rhpp-head,.ui-rhpp-kpis,.ui-rhpp-grid').forEach(el=>{
        el.removeAttribute('class');
        el.style.display='block';el.style.width='100%';el.style.margin='0 0 12px 0';
      });
      clone.querySelectorAll('.ui-rhpp-card').forEach(el=>{
        el.removeAttribute('class');el.style.display='block';el.style.width='100%';el.style.margin='0 0 12px 0';el.style.border='1px solid #b8cbd8';
      });
      clone.querySelectorAll('h2,h3').forEach(el=>{
        el.style.backgroundColor='#d9eaf7';el.style.color='#123b5d';el.style.fontWeight='bold';el.style.padding='8px';el.style.textAlign='left';
      });
      clone.querySelectorAll('table').forEach(table=>{
        table.style.width='100%';table.style.tableLayout='fixed';table.style.borderCollapse='collapse';table.style.marginBottom='8px';
        table.querySelectorAll('td,th').forEach(cell=>{
          cell.style.border='1px solid #cbd5e1';cell.style.padding='6px';cell.style.verticalAlign='top';cell.style.fontSize='10pt';cell.style.whiteSpace='normal';
        });
        if(table.querySelectorAll('tr').length && table.querySelector('tbody tr td') && table.querySelectorAll('tbody tr td').length===2){
          table.querySelectorAll('tbody tr').forEach(row=>{
            const cells=row.querySelectorAll('td');
            if(cells.length===2){cells[0].style.width='68%';cells[1].style.width='32%';cells[1].style.textAlign='right';}
          });
        }
      });
      clone.querySelectorAll('.ui-rhpp-kpi').forEach(el=>{el.style.display='block';el.style.width='100%';el.style.padding='5px';el.style.borderBottom='1px solid #d8e2ea';});
      const html='<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:10pt}table{mso-width-source:userset;border-collapse:collapse;table-layout:fixed;width:100%}td,th{border:1px solid #cbd5e1;padding:6px;vertical-align:top;white-space:normal}h2,h3{background:#d9eaf7;color:#123b5d;padding:8px} @page{size:A4 portrait;margin:12mm}</style></head><body><h2>'+esc(company.company_name||company.legal_name||'PT Bagjasindo Mandiri Sindangkasih')+'</h2><h3>REKAP HASIL PEMELIHARAAN PETERNAK (RHPP)</h3>'+clone.innerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+html]);
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=fileBase+'.xls';document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
}

async function adminRhppHistoryPage(){
  const d=await productionBase();
  const [fr,cpr,sr,hdr,shr,shir,rrr,rir,itr,ctr,supr,ppr,bdr]=await Promise.all([
    db.from('production_cycle_final_unified').select('*').order('created_at',{ascending:false}),
    db.from('company_profile').select('company_name,legal_name,address,phone,email,website,logo_url,bank_name,bank_account_number,bank_account_name').eq('id',true).maybeSingle(),
    db.rpc('finance_rhpp_summary_v6'),
    db.from('marketing_contract_harvests').select('id,contract_assignment_id,harvested_on,birds,net_weight_kg,avg_weight_kg,price_per_kg,total_amount,buyer_name,vehicle_number').order('harvested_on',{ascending:true}),
    db.from('logistics_shipments').select('id,contract_assignment_id,shipment_date,shipping_note_number'),
    db.from('logistics_shipment_items').select('shipment_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('logistics_returns').select('id,contract_assignment_id,return_date,reference,notes'),
    db.from('logistics_return_items').select('return_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('items').select('id,name,category,feed_phase,unit,kg_per_unit,supplier_id'),
    db.from('contracts').select('id,number,doc_price,pre_starter_price,starter_price,finisher_price').is('cycle_id',null),
    db.from('suppliers').select('id,name'),
    db.from('profiles').select('user_id,full_name').eq('role','PPL'),
    db.from('barns').select('id,location')
  ]);
  const finals=fr.data||[],company=cpr.data||{},summaries=sr.data||[];
  const harvestDetails=hdr.data||[],shipments=shr.data||[],shipmentItems=shir.data||[];
  const returns=rrr.data||[],returnItems=rir.data||[],printItems=itr.data||[],printFeedItems=printItems.filter(i=>i.category==='PAKAN'),printOvkItems=printItems.filter(i=>['OVK','OVK1'].includes(String(i.category||'').toUpperCase())),printContracts=ctr.data||[];
  const printSuppliers=supr.data||[],printPpl=ppr.data||[],printBarnDetails=bdr.data||[];
  const historyOnly=true;
  const viewAssignments=d.assignments.filter(a=>!a.active||finals.some(f=>f.contract_assignment_id===a.id));
  const barnsForAssignments=[...new Map(viewAssignments.map(a=>{
    const b=d.barns.find(x=>x.id===a.barn_id);
    return b?[b.id,b]:null;
  }).filter(Boolean)).values()];
  window.__adminRhppHistoryState=window.__adminRhppHistoryState||{barn:'',assignment:''};
  let selectedBarn=window.__adminRhppHistoryState.barn||'';
  let selectedAssignment=window.__adminRhppHistoryState.assignment||'';
  const barnAssignments=selectedBarn?viewAssignments.filter(a=>a.barn_id===selectedBarn):[];
  if(selectedAssignment&&!barnAssignments.some(a=>a.id===selectedAssignment)){
    selectedAssignment='';
    window.__adminRhppHistoryState.assignment='';
  }

  const missingFinal=selectedAssignment&&!finals.some(f=>f.contract_assignment_id===selectedAssignment);
  if(missingFinal){selectedAssignment='';window.__adminRhppHistoryState.assignment='';}
  let html=RHPP_SCREEN_STYLE+'<div class="rhpp-ui"><section class="panel"><h3>'+(historyOnly?'Riwayat RHPP':'Lihat RHPP')+'</h3><p class="muted">'+(historyOnly?'Pilih kandang dan siklus CLOSED. Riwayat memakai snapshot final MITRA maupun MANDIRI saat produksi ditutup dan hanya untuk dilihat/cetak.':'Pilih kandang, lalu pilih siklus. Data CLOSED ditampilkan sebagai ringkasan RHPP Sistem.')+'</p>'+
    '<form id="pplRhppViewForm" class="form-vertical">'+
      '<label>Kandang<select id="pplRhppBarn" required><option value="">Pilih Kandang</option>'+
        barnsForAssignments.map(b=>'<option value="'+esc(b.id)+'" '+(selectedBarn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+
      '</select></label>'+
      '<label>Siklus<select id="pplRhppCycle" required '+(!selectedBarn?'disabled':'')+'><option value="">Pilih Siklus</option>'+
        barnAssignments.map(a=>'<option value="'+esc(a.id)+'" '+(selectedAssignment===a.id?'selected':'')+'>'+
          esc(assignmentCycleLabel(d.assignments,a)+' · '+(a.cycle_type||'MITRA')+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+
        '</option>').join('')+
      '</select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form>'+(missingFinal?'<p class="muted">Snapshot final RHPP untuk siklus ini belum tersedia atau tidak dapat dibaca oleh akun ini. Hubungi Administrator untuk memeriksa akses baca data final; tidak ada data yang diubah.</p>':'')+'</section>';

  if(selectedAssignment){
    const a=d.assignments.find(x=>x.id===selectedAssignment);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const ci=d.chicks.find(x=>x.contract_assignment_id===selectedAssignment);
    const fin=finals.find(x=>x.contract_assignment_id===selectedAssignment);
    const live=summaries.find(x=>x.contract_assignment_id===selectedAssignment);
    const contract=d.masters.find(x=>x.id===a?.master_contract_id);
    const closed=!!fin;
    const src=closed?{
      chick_in_birds:fin.chick_in_birds,
      total_harvest_birds:fin.total_harvest_birds,
      total_harvest_kg:fin.total_harvest_kg,
      avg_bw_kg:fin.avg_bw_kg,
      weighted_age:fin.weighted_age,
      mortality_pct:fin.mortality_pct,
      net_feed_kg:fin.net_feed_kg,
      fcr_actual:fin.fcr_actual,
      fcr_standard:fin.fcr_standard,
      ip:fin.ip,
      harvest_value:fin.harvest_value,
      main_doc_cost:fin.main_doc_cost,
      main_feed_cost:fin.main_feed_cost,
      main_return_cost:fin.main_return_cost,
      sapronak_cost:fin.sapronak_cost,
      base_profit:fin.base_profit,
      bonus_ip_rate:fin.bonus_ip_rate,
      bonus_ip:fin.bonus_ip,
      bonus_fc_rate:fin.bonus_fc_rate,
      bonus_fc:fin.bonus_fc,
      bonus_mortality_rate:fin.bonus_depletion_rate,
      bonus_mortality:fin.bonus_depletion,
      farmer_profit:fin.system_amount,
      profit_per_chick_in:fin.profit_per_chick_in,
      std_bw_kg:fin.std_bw_kg
    }:live;

    const chickIn=prodNum(src?.chick_in_birds||((ci?.received||0)-(ci?.doa||0)));
    const harvestBirds=prodNum(src?.total_harvest_birds);
    const harvestKg=prodNum(src?.total_harvest_kg);
    const avgBw=prodNum(src?.avg_bw_kg);
    const feedKg=prodNum(src?.net_feed_kg);
    const feedPerBird=chickIn>0?feedKg*1000/chickIn:0;
    const avgLivePrice=harvestKg>0?prodNum(src?.harvest_value)/harvestKg:0;
    const docUnitPrice=chickIn>0?prodNum(src?.main_doc_cost)/chickIn:prodNum(contract?.doc_price);
    const feedUnitPrice=feedKg>0?prodNum(src?.main_feed_cost)/feedKg:0;
    const screenMoney=v=>'Rp '+prodFmt(v,0);
    const screenProfit=prodNum(src?.farmer_profit);
    const screenProfitClass=screenProfit<0?'ui-rhpp-loss':'ui-rhpp-profit';
    const screenHarvestRows=harvestDetails.filter(h=>h.contract_assignment_id===selectedAssignment).slice().sort((u,v)=>String(u.harvested_on||'').localeCompare(String(v.harvested_on||'')));
    const screenShipmentIds=new Set(shipments.filter(x=>x.contract_assignment_id===selectedAssignment).map(x=>x.id));
    const screenFeedRows=shipmentItems.filter(x=>screenShipmentIds.has(x.shipment_id)).map(x=>{
      const item=printFeedItems.find(i=>i.id===x.item_id);if(!item)return null;
      const ship=shipments.find(s=>s.id===x.shipment_id);
      const kg=prodNum(x.quantity_kg)||prodNum(x.quantity)*prodNum(item.kg_per_unit);
      return {date:ship?.shipment_date,sj:ship?.shipping_note_number||'-',name:item.name||'Pakan',qty:prodNum(x.quantity),kg,unit:item.unit||'-'};
    }).filter(Boolean).sort((u,v)=>String(u.date||'').localeCompare(String(v.date||'')));
    const screenOvkRows=shipmentItems.filter(x=>screenShipmentIds.has(x.shipment_id)).map(x=>{
      const item=printOvkItems.find(i=>i.id===x.item_id);if(!item)return null;
      const ship=shipments.find(s=>s.id===x.shipment_id);
      const supplier=printSuppliers.find(v=>v.id===item.supplier_id)?.name||'-';
      return {date:ship?.shipment_date,sj:ship?.shipping_note_number||'-',name:item.name||'OVK',qty:prodNum(x.quantity),unit:item.unit||'-',supplier};
    }).filter(Boolean).sort((u,v)=>String(u.date||'').localeCompare(String(v.date||'')));
    html+='<style>'+
      '.rhpp-history-pro{display:grid;gap:16px}.rhpp-history-pro .ui-rhpp-head{padding:2px 0 4px}.rhpp-history-pro .ui-rhpp-title h2{font-size:24px;letter-spacing:-.3px}.rhpp-history-pro .ui-rhpp-kpi{min-height:78px;display:flex;flex-direction:column;justify-content:center;box-shadow:0 2px 8px rgba(15,73,110,.04)}.rhpp-history-pro .ui-rhpp-card{box-shadow:0 3px 12px rgba(15,73,110,.045)}.rhpp-history-pro .ui-rhpp-card h3{font-size:15px;padding:12px 14px;border-bottom:1px solid #dbeaf1}.rhpp-history-pro .ui-rhpp-card td{padding:10px 12px}.rhpp-history-pro .ui-rhpp-card td:first-child{color:#607386}.rhpp-detail{grid-column:1/-1;border:1px solid #d7e5ec;border-radius:10px;background:#fff;overflow:hidden}.rhpp-detail-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 13px;background:#eef8fc;color:#0b5f8f}.rhpp-detail-head h3{margin:0;font-size:15px}.rhpp-detail-head span{font-size:11px;color:#698092}.rhpp-detail-scroll{overflow:auto}.rhpp-detail table{width:100%;border-collapse:collapse;min-width:760px}.rhpp-detail th{background:#0b5f8f!important;color:#fff!important;text-align:left;padding:9px 10px;font-size:12px;white-space:nowrap}.rhpp-detail td{padding:9px 10px;border-top:1px solid #e7eef3;font-size:12.5px}.rhpp-detail .num{text-align:right}.rhpp-detail tbody tr:hover{background:#f7fbfd}.rhpp-detail .total td{background:#eef8fc;font-weight:800;color:#123b6d}.rhpp-detail .empty{text-align:center;color:#8192a2;padding:18px}.rhpp-history-pro .ui-rhpp-profit{color:#111!important}.rhpp-history-pro .ui-rhpp-loss{color:#d9272e!important}'+
    '</style>'+
    '<section class="panel rhpp-history-pro" id="pplRhppExportArea">'+
      '<div class="ui-rhpp-head"><div class="ui-rhpp-title"><h2>'+esc(b?shortBarnLabel(b):'RHPP')+'</h2>'+
        '<div class="muted">'+esc(assignmentCycleLabel(d.assignments,a))+' · '+esc(a.cycle_type||'MITRA')+' · <span class="ui-rhpp-status">FINAL / CLOSED</span>'+(fin?' · Close '+prodDateId(fin.closed_on):'')+'</div></div>'+
        '<div class="report-actions"><button type="button" id="pplRhppPrint">Print</button><button type="button" id="pplRhppPdf">PDF</button><button type="button" id="pplRhppExcel">Excel</button></div>'+
      '</div>'+
      '<div class="ui-rhpp-kpis" style="margin-top:14px">'+
        '<div class="ui-rhpp-kpi"><span>Populasi DOC</span><strong>'+prodFmt(chickIn,0)+'</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>Panen</span><strong>'+prodFmt(harvestBirds,0)+' ekor</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>Total Berat</span><strong>'+prodFmt(harvestKg,2)+' kg</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>BW Rata-rata</span><strong>'+prodFmt(avgBw,2)+' kg</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>FCR</span><strong>'+prodFmt(src?.fcr_actual,3)+'</strong></div>'+
        '<div class="ui-rhpp-kpi"><span>IP</span><strong>'+prodFmt(src?.ip,0)+'</strong></div>'+
      '</div>'+
      '<div class="ui-rhpp-grid" style="margin-top:14px">'+
        '<div class="ui-rhpp-card"><h3>Identitas Siklus</h3><table><tbody>'+
          '<tr><td>Kandang</td><td>'+esc(b?shortBarnLabel(b):'-')+'</td></tr>'+
          '<tr><td>Siklus</td><td>'+esc(assignmentCycleLabel(d.assignments,a))+'</td></tr>'+
          '<tr><td>Tanggal Chick-In</td><td>'+prodDateId(closed?fin?.chick_in_date:ci?.arrived_on)+'</td></tr>'+
          '<tr><td>DOC Masuk</td><td>'+prodFmt(chickIn,0)+' ekor</td></tr>'+
          '<tr><td>Harga DOC</td><td>'+screenMoney(docUnitPrice)+'</td></tr>'+
          '<tr><td>Harga Pakan Rata-rata</td><td>'+screenMoney(feedUnitPrice)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card"><h3>Kinerja Produksi</h3><table><tbody>'+
          '<tr><td>Mortalitas</td><td>'+prodFmt(src?.mortality_pct,2)+' %</td></tr>'+
          '<tr><td>Total Pakan</td><td>'+prodFmt(feedKg,2)+' kg</td></tr>'+
          '<tr><td>Pakan / Ekor</td><td>'+prodFmt(feedPerBird,0)+' gr</td></tr>'+
          '<tr><td>Umur Panen</td><td>'+prodFmt(src?.weighted_age,2)+' hari</td></tr>'+
          '<tr><td>FCR Aktual</td><td>'+prodFmt(src?.fcr_actual,3)+'</td></tr>'+
          '<tr><td>FCR Standar</td><td>'+prodFmt(src?.fcr_standard,3)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card"><h3>Biaya Sapronak</h3><table><tbody>'+
          '<tr><td>DOC</td><td>'+screenMoney(src?.main_doc_cost)+'</td></tr>'+
          '<tr><td>Pakan</td><td>'+screenMoney(src?.main_feed_cost)+'</td></tr>'+
          '<tr><td>Retur</td><td>'+screenMoney(src?.main_return_cost)+'</td></tr>'+
          '<tr><td>Total Sapronak</td><td>'+screenMoney(src?.sapronak_cost)+'</td></tr>'+
          '<tr><td>Nilai Produksi</td><td>'+screenMoney(src?.harvest_value)+'</td></tr>'+
        '</tbody></table></div>'+
        '<div class="ui-rhpp-card"><h3>Nilai RHPP</h3><table><tbody>'+
          '<tr><td>Laba Dasar</td><td>'+screenMoney(src?.base_profit)+'</td></tr>'+
          '<tr><td>Bonus IP</td><td>'+screenMoney(src?.bonus_ip)+'</td></tr>'+
          '<tr><td>Bonus FCR</td><td>'+screenMoney(src?.bonus_fc)+'</td></tr>'+
          '<tr><td>Bonus Mortalitas</td><td>'+screenMoney(src?.bonus_mortality)+'</td></tr>'+
          '<tr><td><strong>Hasil RHPP</strong></td><td class="'+screenProfitClass+'">'+screenMoney(screenProfit)+'</td></tr>'+
          '<tr><td>Hasil / Ekor</td><td>'+screenMoney(src?.profit_per_chick_in)+'</td></tr>'+
        '</tbody></table></div>'+
      '</div>'+
      '<div class="rhpp-detail"><div class="rhpp-detail-head"><h3>Rincian Panen</h3><span>'+screenHarvestRows.length+' transaksi</span></div><div class="rhpp-detail-scroll"><table><thead><tr><th>Tanggal</th><th>Pembeli / RPA</th><th>No. Kendaraan</th><th class="num">Ekor</th><th class="num">Kg</th><th class="num">BW</th><th class="num">Harga/Kg</th><th class="num">Nilai</th></tr></thead><tbody>'+
        (screenHarvestRows.length?screenHarvestRows.map(x=>'<tr><td>'+prodDateId(x.harvested_on)+'</td><td>'+esc(x.buyer_name||'-')+'</td><td>'+esc(x.vehicle_number||'-')+'</td><td class="num">'+prodFmt(x.birds,0)+'</td><td class="num">'+prodFmt(x.net_weight_kg,2)+'</td><td class="num">'+prodFmt(x.avg_weight_kg,3)+'</td><td class="num">'+screenMoney(x.price_per_kg)+'</td><td class="num">'+screenMoney(x.total_amount)+'</td></tr>').join(''):'<tr><td colspan="8" class="empty">Belum ada data panen.</td></tr>')+
        '<tr class="total"><td colspan="3">TOTAL PANEN</td><td class="num">'+prodFmt(harvestBirds,0)+'</td><td class="num">'+prodFmt(harvestKg,2)+'</td><td class="num">'+prodFmt(avgBw,3)+'</td><td></td><td class="num">'+screenMoney(src?.harvest_value)+'</td></tr>'+
      '</tbody></table></div></div>'+
      '<div class="rhpp-detail"><div class="rhpp-detail-head"><h3>Rincian Kiriman Pakan</h3><span>'+screenFeedRows.length+' baris</span></div><div class="rhpp-detail-scroll"><table><thead><tr><th>Tanggal</th><th>Pakan</th><th>No. Surat Jalan</th><th class="num">Qty</th><th>Satuan</th><th class="num">Berat (Kg)</th></tr></thead><tbody>'+
        (screenFeedRows.length?screenFeedRows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.sj)+'</td><td class="num">'+prodFmt(x.qty,2)+'</td><td>'+esc(x.unit)+'</td><td class="num">'+prodFmt(x.kg,2)+'</td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada kiriman pakan.</td></tr>')+
      '</tbody></table></div></div>'+
      '<div class="rhpp-detail"><div class="rhpp-detail-head"><h3>Rincian Kiriman OVK</h3><span>'+screenOvkRows.length+' baris</span></div><div class="rhpp-detail-scroll"><table><thead><tr><th>Tanggal</th><th>OVK</th><th>No. Surat Jalan</th><th>Supplier</th><th class="num">Qty</th><th>Satuan</th></tr></thead><tbody>'+
        (screenOvkRows.length?screenOvkRows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.sj)+'</td><td>'+esc(x.supplier)+'</td><td class="num">'+prodFmt(x.qty,2)+'</td><td>'+esc(x.unit)+'</td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada kiriman OVK.</td></tr>')+
      '</tbody></table></div></div>'+
      '<p class="muted" style="margin:0">View Cetak RHPP menampilkan data audit yang sama dengan hasil cetak. Print/PDF tetap memakai snapshot dan sumber data BMS yang sama.</p>'+
    '</section>';  }

  html+='</div>';
  layout(html);
  if(d.err||fr.error||cpr.error||sr.error||hdr.error||shr.error||shir.error||rrr.error||rir.error||itr.error||ctr.error||supr.error||ppr.error||bdr.error)msg((d.err||fr.error||cpr.error||sr.error||hdr.error||shr.error||shir.error||rrr.error||rir.error||itr.error||ctr.error||supr.error||ppr.error||bdr.error).message);
  const barnSel=document.getElementById('pplRhppBarn');
  const cycleSel=document.getElementById('pplRhppCycle');
  if(barnSel)barnSel.onchange=async()=>{
    window.__adminRhppHistoryState={barn:barnSel.value||'',assignment:''};
    await adminRhppHistoryPage();
  };
  const form=document.getElementById('pplRhppViewForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    if(!barnSel?.value)return msg('Pilih kandang.');
    if(!cycleSel?.value)return msg('Pilih siklus.');
    window.__adminRhppHistoryState={barn:barnSel.value,assignment:cycleSel.value};
    await adminRhppHistoryPage();
  };

  if(selectedAssignment){
    const exportArea=document.getElementById('pplRhppExportArea');
    const a=d.assignments.find(x=>x.id===selectedAssignment);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const fileBase=('RHPP_'+(b?.code||'Kandang')+'_'+String(a?.start_date||'Siklus')).replace(/[^A-Za-z0-9_-]+/g,'_');
    const docHtml=()=>{
      const fin=finals.find(x=>x.contract_assignment_id===selectedAssignment);
      const live=summaries.find(x=>x.contract_assignment_id===selectedAssignment);
      const ci=d.chicks.find(x=>x.contract_assignment_id===selectedAssignment);
      const contract=printContracts.find(x=>x.id===a?.master_contract_id)||d.masters.find(x=>x.id===a?.master_contract_id)||{};
      const src=fin||live||{};
      const hs=harvestDetails.filter(h=>h.contract_assignment_id===selectedAssignment).slice().sort((u,v)=>String(u.harvested_on||'').localeCompare(String(v.harvested_on||'')));
      const hasValue=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
      const chickIn=prodNum(src.chick_in_birds||((ci?.received||0)-(ci?.doa||0)));
      const feedKg=hasValue(src.net_feed_kg)?prodNum(src.net_feed_kg):0;
      const docPrice=hasValue(src.main_doc_cost)&&chickIn>0?prodNum(src.main_doc_cost)/chickIn:(hasValue(contract?.doc_price)?prodNum(contract.doc_price):null);
      const harvestBirds=prodNum(src.total_harvest_birds);
      const harvestKg=prodNum(src.total_harvest_kg);
      const avgBw=prodNum(src.avg_bw_kg);
      const avgLivePrice=harvestKg>0&&hasValue(src.harvest_value)?prodNum(src.harvest_value)/harvestKg:null;
      const fcrDiff=hasValue(src.fcr_actual)&&hasValue(src.fcr_standard)?prodNum(src.fcr_actual)-prodNum(src.fcr_standard):null;
      const hasilPlasma=hasValue(src.system_amount)?prodNum(src.system_amount):(hasValue(src.farmer_profit)?prodNum(src.farmer_profit):null);
      const pplName=printPpl.find(x=>x.user_id===a?.ppl_id)?.full_name||'-';
      const barnLocation=printBarnDetails.find(x=>x.id===a?.barn_id)?.location||'-';
      const money=v=>prodFmt(v,0);
      const moneySafe=v=>hasValue(v)?money(v):'-';
      const n2=v=>prodFmt(v,2);
      const nSafe=(v,d=2)=>hasValue(v)?prodFmt(v,d):'-';
      const priceForPhase=phase=>{
        const p=String(phase||'').toUpperCase();
        if(p==='PRE_STARTER')return hasValue(contract.pre_starter_price)?prodNum(contract.pre_starter_price):null;
        if(p==='STARTER')return hasValue(contract.starter_price)?prodNum(contract.starter_price):null;
        if(p==='FINISHER')return hasValue(contract.finisher_price)?prodNum(contract.finisher_price):null;
        return null;
      };
      const phaseLabel=phase=>{
        const p=String(phase||'').toUpperCase();
        if(p==='PRE_STARTER')return 'PRE-STATER';
        if(p==='STARTER')return 'STARTER';
        if(p==='FINISHER')return 'FINISHER';
        return phase||'PAKAN';
      };
      const assignmentShipIds=new Set(shipments.filter(x=>x.contract_assignment_id===selectedAssignment).map(x=>x.id));
      const assignmentReturnIds=new Set(returns.filter(x=>x.contract_assignment_id===selectedAssignment).map(x=>x.id));
      const feedTxnRows=[];
      shipmentItems.filter(x=>assignmentShipIds.has(x.shipment_id)).forEach(x=>{
        const item=printFeedItems.find(i=>i.id===x.item_id); if(!item)return;
        const ship=shipments.find(r=>r.id===x.shipment_id);
        const kg=prodNum(x.quantity_kg)||prodNum(x.quantity)*prodNum(item.kg_per_unit);
        const phasePrice=priceForPhase(item.feed_phase);
        const savedUnitPrice=hasValue(x.unit_price)?prodNum(x.unit_price):null;
        const price=phasePrice!==null?phasePrice:(savedUnitPrice!==null?(prodNum(item.kg_per_unit)>0?savedUnitPrice/prodNum(item.kg_per_unit):savedUnitPrice):null);
        feedTxnRows.push({date:ship?.shipment_date,name:item.name||phaseLabel(item.feed_phase),sj:ship?.shipping_note_number||'-',qty:prodNum(x.quantity),dir:'',mut:0,price,total:kg*price});
      });
      returnItems.filter(x=>assignmentReturnIds.has(x.return_id)).forEach(x=>{
        const item=printFeedItems.find(i=>i.id===x.item_id); if(!item)return;
        const ret=returns.find(r=>r.id===x.return_id);
        const kg=prodNum(x.quantity_kg)||prodNum(x.quantity)*prodNum(item.kg_per_unit);
        const phasePrice=priceForPhase(item.feed_phase);
        const savedUnitPrice=hasValue(x.unit_price)?prodNum(x.unit_price):null;
        const price=phasePrice!==null?phasePrice:(savedUnitPrice!==null?(prodNum(item.kg_per_unit)>0?savedUnitPrice/prodNum(item.kg_per_unit):savedUnitPrice):null);
        feedTxnRows.push({date:ret?.return_date,name:item.name||phaseLabel(item.feed_phase),sj:ret?.reference||'-',qty:0,dir:'Ke Retur',mut:-prodNum(x.quantity),price,total:kg*price});
      });
      feedTxnRows.sort((u,v)=>String(u.date||'').localeCompare(String(v.date||'')));
      const totalFeedQty=feedTxnRows.reduce((n,x)=>n+prodNum(x.qty),0);
      const totalFeedMut=feedTxnRows.reduce((n,x)=>n+prodNum(x.mut),0);
      const avgFeedPrice=feedKg>0&&hasValue(src.main_feed_cost)?prodNum(src.main_feed_cost)/feedKg:null;

      const ovkRows=[];
      shipmentItems.filter(x=>assignmentShipIds.has(x.shipment_id)).forEach(x=>{
        const item=printOvkItems.find(i=>i.id===x.item_id); if(!item)return;
        const ship=shipments.find(r=>r.id===x.shipment_id);
        const supplier=printSuppliers.find(v=>v.id===item.supplier_id)?.name||'-';
        ovkRows.push({date:ship?.shipment_date,name:item.name||'OVK',qty:prodNum(x.quantity),unit:item.unit||'-',sj:ship?.shipping_note_number||'-',supplier,price:prodNum(x.unit_price),total:prodNum(x.quantity)*prodNum(x.unit_price)});
      });
      const ovkTotal=ovkRows.length?ovkRows.reduce((n,x)=>n+prodNum(x.total),0):(hasValue(src.main_ovk_cost)?prodNum(src.main_ovk_cost):null);

      const bmsLogo=company?.logo_url||BMS_PRINT_LOGO;
      const companyHeader=[
        company.company_name||company.legal_name||'Nama perusahaan belum diisi',
        company.address||'',
        company.phone?('Tel/WA: '+company.phone):'',
        company.email||''
      ].filter(Boolean);
      const topInfo='<table class="meta"><tbody>'+
        '<tr><th>Plasma</th><td>'+esc(b?shortBarnLabel(b):'-')+'</td></tr>'+
        '<tr><th>Populasi</th><td>'+prodFmt(chickIn,0)+'</td></tr>'+
        '<tr><th>Alamat</th><td>'+esc(barnLocation)+'</td></tr>'+
        '<tr><th>Periode</th><td>'+esc(assignmentCycleLabel(d.assignments,a))+'</td></tr>'+
        '<tr><th>Kontrak</th><td>'+esc(contract.number||'-')+'</td></tr>'+
        '<tr><th>PPL</th><td>'+esc(pplName)+'</td></tr>'+
      '</tbody></table>';

      const docCostKnown=src.main_doc_cost!==null&&src.main_doc_cost!==undefined&&src.main_doc_cost!=='';
      const docPriceKnown=Number.isFinite(Number(docPrice))&&Number(docPrice)>0;
      const docRows='<tr><td>'+prodDateId(fin?.chick_in_date||ci?.arrived_on)+'</td><td>'+esc(ci?.hatchery||ci?.strain||'DOC')+'</td><td>'+esc(ci?.delivery_number||'-')+'</td><td class="n">'+prodFmt(chickIn,0)+'</td><td>Ekor</td><td class="n">'+(docPriceKnown?money(docPrice):'-')+'</td><td class="n">'+(docCostKnown?moneySafe(src.main_doc_cost):'-')+'</td></tr>'+
        '<tr class="total"><td colspan="3"></td><td class="n">'+prodFmt(chickIn,0)+'</td><td></td><td></td><td class="n">'+(docCostKnown?moneySafe(src.main_doc_cost):'-')+'</td></tr>';

      const feedRowsHtml=(feedTxnRows.length?feedTxnRows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.sj)+'</td><td class="n">'+n2(x.qty)+'</td><td>'+esc(x.dir)+'</td><td class="n">'+n2(x.mut)+'</td><td class="n">'+money(x.price)+'</td><td class="n">'+money(x.total)+'</td></tr>').join(''):'<tr><td colspan="8" class="c">Tidak ada rincian pakan.</td></tr>')+
        '<tr class="total"><td colspan="3"></td><td class="n">'+n2(totalFeedQty)+'</td><td></td><td class="n">'+n2(totalFeedMut)+'</td><td></td><td class="n">'+moneySafe(src.main_feed_cost)+'</td></tr>'+
        '<tr class="total"><td colspan="5"></td><td class="n">'+n2(feedKg)+'</td><td class="n">'+moneySafe(avgFeedPrice)+'</td><td></td></tr>';

      const ovkRowsHtml=ovkRows.length?ovkRows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.name)+'</td><td class="n">'+n2(x.qty)+'</td><td>'+esc(x.unit)+'</td><td>'+esc(x.sj)+'</td><td>'+esc(x.supplier)+'</td><td class="n">'+money(x.price)+'</td><td class="n">'+money(x.total)+'</td></tr>').join('')+'<tr class="total"><td colspan="2"></td><td class="n">'+n2(ovkRows.reduce((n,x)=>n+x.qty,0))+'</td><td colspan="4"></td><td class="n">'+moneySafe(ovkTotal)+'</td></tr>':
        '<tr><td>-</td><td>OVK</td><td class="n">-</td><td>-</td><td>-</td><td>-</td><td class="n">-</td><td class="n">'+moneySafe(ovkTotal)+'</td></tr>';

      const chickInDate=String(fin?.chick_in_date||ci?.arrived_on||'');
      const ageAtHarvest=date=>{
        if(!chickInDate||!date)return '';
        const a0=new Date(chickInDate+'T00:00:00'),b0=new Date(String(date).slice(0,10)+'T00:00:00');
        const days=Math.round((b0-a0)/86400000);
        return Number.isFinite(days)?days:'';
      };
      const harvestRowsHtml=hs.map(h=>'<tr><td>'+prodDateId(h.harvested_on)+'</td><td>'+esc(h.id?String(h.id).slice(0,6).toUpperCase():'-')+'</td><td>'+esc(h.buyer_name||'-')+'</td><td class="n">'+prodFmt(h.birds,0)+'</td><td class="n">'+n2(h.net_weight_kg)+'</td><td class="n">'+n2(h.avg_weight_kg)+'</td><td class="n">'+prodFmt(ageAtHarvest(h.harvested_on),0)+'</td><td class="n">'+money(h.price_per_kg)+'</td><td class="n">'+money(h.total_amount)+'</td></tr>').join('')+
        '<tr class="total"><td colspan="3"></td><td class="n">'+prodFmt(harvestBirds,0)+'</td><td class="n">'+n2(harvestKg)+'</td><td class="n">'+n2(avgBw)+'</td><td class="n">'+n2(src.weighted_age)+'</td><td class="n">'+money(avgLivePrice)+'</td><td class="n">'+moneySafe(src.harvest_value)+'</td></tr>';

      const bonusDepletion=prodNum(src.bonus_depletion||src.bonus_mortality);
      const bonusDepletionRate=prodNum(src.bonus_depletion_rate||src.bonus_mortality_rate);
      const profitClass=v=>prodNum(v)<0?'loss-total':'profit-total';
      const resultRows=
        '<tr><td>Penjualan Ayam</td><td class="n">'+moneySafe(src.harvest_value)+'</td></tr>'+
        '<tr><td>Pembelian Sapronak</td><td class="n">'+moneySafe(src.sapronak_cost)+'</td></tr>'+
        '<tr><td>Total Kenaikan Harga Kontrak Dari Pasar</td><td class="n">-</td></tr>'+
        '<tr><td>Total Tambahan Harga Kontrak Dari FCR</td><td class="n">'+moneySafe(src.bonus_fc)+'</td></tr>'+
        '<tr><td>Total Tambahan Harga Kontrak Dari IP</td><td class="n">'+moneySafe(src.bonus_ip)+'</td></tr>'+
        '<tr><td>Total Tambahan Harga Kontrak Dari Deplesi</td><td class="n">'+money(bonusDepletion)+'</td></tr>'+
        '<tr class="'+profitClass(hasilPlasma)+'"><td>Hasil Plasma</td><td class="n">'+money(hasilPlasma)+'</td></tr>'+
        '<tr class="'+profitClass(src.profit_per_chick_in)+'"><td>Hasil Plasma Per Ekor</td><td class="n">'+moneySafe(src.profit_per_chick_in)+'</td></tr>'+
        '<tr><td>Potongan Jaminan</td><td class="n">-</td></tr>'+
        '<tr class="'+profitClass(hasilPlasma)+'"><td>Hasil Plasma Akhir Setelah Dikurangi Pot.</td><td class="n">'+money(hasilPlasma)+'</td></tr>';

      const bonusRows=
        '<tr><td>PERHITUNGAN SELISIH PASAR</td><td class="n">-</td><td class="n">-</td><td class="n">-</td><td class="n">-</td><td class="n">-</td></tr>'+
        '<tr><td>PERHITUNGAN FCR</td><td class="n">'+prodFmt(src.fcr_actual,3)+'</td><td class="n">'+nSafe(src.fcr_standard,3)+'</td><td class="n">'+nSafe(fcrDiff,3)+'</td><td class="n">'+moneySafe(src.bonus_fc_rate)+'</td><td class="n">'+moneySafe(src.bonus_fc)+'</td></tr>'+
        '<tr><td>PERHITUNGAN IP</td><td class="n">'+prodFmt(src.ip,0)+'</td><td class="n">-</td><td class="n">-</td><td class="n">'+moneySafe(src.bonus_ip_rate)+'</td><td class="n">'+moneySafe(src.bonus_ip)+'</td></tr>'+
        '<tr><td>PERHITUNGAN DEPLESI</td><td class="n">'+prodFmt(src.mortality_pct,2)+'</td><td class="n">-</td><td class="n">-</td><td class="n">'+money(bonusDepletionRate)+'</td><td class="n">'+money(bonusDepletion)+'</td></tr>';

      return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(fileBase)+'</title><style>'+
        '@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#10233f;font-size:7.2px;line-height:1.28;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.sheet{width:194mm;max-width:194mm;margin:0 auto}.top{display:grid;grid-template-columns:24% 44% 32%;align-items:start;min-height:25mm;border-bottom:2px solid #0b5f8f;padding-bottom:2mm;margin-bottom:2mm}.logo-wrap{display:flex;align-items:flex-start;justify-content:flex-start;padding-top:.5mm}.logo{width:26mm;height:18mm;object-fit:contain;display:block}.title{text-align:center;padding-top:2.5mm}.company-head{font-size:4.8px;line-height:1.15;margin-bottom:1.5mm;color:#223}.company-head strong{display:block;font-size:5.5px;color:#0b5f8f;margin-bottom:.4mm}.title h2{font-size:11px;margin:0 0 1mm;font-weight:800;color:#0b5f8f}.title p{font-size:7px;margin:0;color:#52677b}.meta{width:100%;border-collapse:collapse;font-size:6.8px}.meta th,.meta td{border:.4px solid #9fb2bd;padding:1.4px 1.7px}.meta th{width:41%;text-align:left}.section-label{display:block;width:100%;background:#0b5f8f!important;color:#fff!important;font-weight:800;padding:2.1mm 2.6mm;margin:3mm 0 0;font-size:8px;letter-spacing:.1px;border-radius:2px 2px 0 0}.tbl{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 2mm}.tbl th,.tbl td{border:.35px solid #9fb2bd;padding:1.6mm 1.35mm;vertical-align:middle;white-space:normal;overflow-wrap:anywhere}.tbl thead{display:table-header-group}.tbl thead th{background:#12a8d4!important;color:#fff!important;font-weight:800;text-align:center}.tbl tbody tr:nth-child(even){background:#fafafa}.tbl .total td,.tbl .total th{background:#f2f2f2!important}.tbl .n{text-align:right}.tbl .c{text-align:center}.tbl .total td,.tbl .total th{font-weight:700}.summary td:first-child{width:84%}.summary td:last-child{width:16%;font-weight:700}.profit-total td{color:#000!important;font-weight:800}.loss-total td{color:#d9272e!important;font-weight:800}.bonus-title{text-align:center;font-weight:800;border:.35px solid #0b5f8f;color:#0b5f8f;padding:2mm;margin-top:2mm}.bonus thead th{background:#fff!important;color:#000!important}.bottom{display:grid;grid-template-columns:48% 4% 48%;margin-top:.8mm}.mini{width:100%;border-collapse:collapse}.mini td{border:.35px solid #000;padding:.9px 1.2px}.mini td:first-child{width:60%}.bank{border:.35px solid #000;padding:1.5px;min-height:13mm}.bank div{margin-bottom:.3px}.muted-line{height:2px}.nowrap{white-space:nowrap}</style></head><body>'+
        '<div class="sheet"><div class="top"><div class="logo-wrap"><img class="logo" src="'+esc(bmsLogo)+'" alt="BMS"></div><div class="title"><div class="company-head">'+companyHeader.map((x,i)=>i===0?'<strong>'+esc(x)+'</strong>':'<div>'+esc(x)+'</div>').join('')+'</div><h2>REKAP HASIL PEMELIHARAAN PETERNAK (RHPP)</h2><p>Dokumen RHPP Sistem BMS</p></div><div>'+topInfo+'</div></div>'+

        '<div class="section-label">IDENTITAS SIKLUS</div>'+
        '<table class="tbl"><tbody>'+
          '<tr><td style="width:22%"><strong>Kandang / Peternak</strong></td><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td style="width:18%"><strong>Siklus</strong></td><td>'+esc(assignmentCycleLabel(d.assignments,a))+'</td></tr>'+
          '<tr><td><strong>Tanggal Chick-In</strong></td><td>'+prodDateId(fin?.chick_in_date||ci?.arrived_on)+'</td><td><strong>Status</strong></td><td>FINAL / CLOSED</td></tr>'+
          '<tr><td><strong>Populasi DOC</strong></td><td>'+prodFmt(chickIn,0)+' ekor</td><td><strong>PPL</strong></td><td>'+esc(pplName)+'</td></tr>'+
        '</tbody></table>'+
        '<div class="section-label">KINERJA PRODUKSI</div>'+
        '<table class="tbl"><thead><tr><th>Panen Ekor</th><th>Total Kg</th><th>BW</th><th>Mortalitas</th><th>Umur</th><th>FCR Aktual</th><th>FCR Standar</th><th>IP</th></tr></thead><tbody>'+
          '<tr><td class="n">'+prodFmt(harvestBirds,0)+'</td><td class="n">'+n2(harvestKg)+'</td><td class="n">'+prodFmt(avgBw,3)+'</td><td class="n">'+prodFmt(src.mortality_pct,2)+'%</td><td class="n">'+prodFmt(src.weighted_age,2)+'</td><td class="n">'+prodFmt(src.fcr_actual,3)+'</td><td class="n">'+nSafe(src.fcr_standard,3)+'</td><td class="n">'+prodFmt(src.ip,0)+'</td></tr>'+
        '</tbody></table>'+
        '<div class="section-label">BIAYA SAPRONAK</div>'+
        '<table class="tbl"><thead><tr><th>DOC</th><th>Pakan</th><th>OVK</th><th>Retur</th><th>Tambah Sapronak</th><th>Total Sapronak</th></tr></thead><tbody>'+
          '<tr><td class="n">'+moneySafe(src.main_doc_cost)+'</td><td class="n">'+moneySafe(src.main_feed_cost)+'</td><td class="n">'+moneySafe(ovkTotal)+'</td><td class="n">- '+moneySafe(src.main_return_cost)+'</td><td class="n">'+moneySafe(src.external_sapronak_cost)+'</td><td class="n"><strong>'+moneySafe(src.sapronak_cost)+'</strong></td></tr>'+
        '</tbody></table>'+
        '<div class="section-label">DOC</div>'+
        '<table class="tbl"><thead><tr><th style="width:12%">Tanggal</th><th style="width:32%">DOC</th><th style="width:23%">No. SJ</th><th style="width:8%">Qty</th><th style="width:8%">Satuan</th><th style="width:8%">Harga</th><th style="width:9%">Total</th></tr></thead><tbody>'+docRows+'</tbody></table>'+

        '<div class="section-label">RINCIAN KIRIMAN PAKAN</div>'+
        '<table class="tbl"><thead><tr><th style="width:11%">Tanggal</th><th style="width:27%">Pakan</th><th style="width:20%">No. SJ</th><th style="width:7%">Qty</th><th style="width:12%">Dari/Ke</th><th style="width:7%">Qty</th><th style="width:8%">Harga</th><th style="width:8%">Total</th></tr></thead><tbody>'+feedRowsHtml+'</tbody></table>'+

        '<div class="section-label">RINCIAN KIRIMAN OVK</div>'+
        '<table class="tbl"><thead><tr><th style="width:11%">Tanggal</th><th style="width:27%">Obat</th><th style="width:7%">Qty</th><th style="width:8%">Satuan</th><th style="width:17%">No. SJ</th><th style="width:15%">Supplier</th><th style="width:7%">Harga</th><th style="width:8%">Total</th></tr></thead><tbody>'+ovkRowsHtml+'</tbody></table>'+

        '<div class="section-label">RINCIAN PANEN</div>'+
        '<table class="tbl"><thead><tr><th style="width:10%">Tanggal</th><th style="width:10%">LBSI</th><th style="width:20%">Broker</th><th style="width:8%">Ekor</th><th style="width:12%">Kg</th><th style="width:8%">Rata2</th><th style="width:7%">Umur</th><th style="width:10%">Kontrak</th><th style="width:15%">Total</th></tr></thead><tbody>'+harvestRowsHtml+'</tbody></table>'+

        '<div class="section-label">NILAI RHPP</div><table class="tbl summary"><tbody>'+resultRows+'</tbody></table>'+

        '<div class="section-label">KINERJA PRODUKSI & PERHITUNGAN BONUS</div>'+
        '<table class="tbl bonus"><thead><tr><th style="width:28%">JENIS PERHITUNGAN</th><th style="width:14%">ACTUAL</th><th style="width:15%">STD/KONTRAK</th><th style="width:14%">SELISIH</th><th style="width:15%">TAMBAHAN RP/KG</th><th style="width:14%">TOTAL</th></tr></thead><tbody>'+bonusRows+'</tbody></table>'+

        '<div class="bottom"><div><strong>KETERANGAN :</strong><table class="mini"><tbody>'+
          '<tr><td>Mortalitas</td><td class="n">'+prodFmt(src.mortality_pct,2)+'</td></tr>'+
          '<tr><td>BW rata2</td><td class="n">'+prodFmt(avgBw,2)+'</td></tr>'+
          '<tr><td>FCR</td><td class="n">'+prodFmt(src.fcr_actual,3)+'</td></tr>'+
          '<tr><td>Umur</td><td class="n">'+prodFmt(src.weighted_age,2)+'</td></tr>'+
          '<tr><td>IP</td><td class="n">'+prodFmt(src.ip,0)+'</td></tr>'+
        '</tbody></table></div><div></div><div class="bank">'+
          '<div>BANK * : '+esc(company.bank_name||'-')+'</div>'+
          '<div>CABANG, KOTA * : -</div>'+
          '<div>NO REK * : '+esc(company.bank_account_number||'-')+'</div>'+
          '<div>AN * : '+esc(company.bank_account_name||'-')+'</div>'+
        '</div></div>'+
        '</div></body></html>';
    };
    const openPrint=()=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      w.document.write(docHtml());w.document.close();
      setTimeout(()=>{w.focus();w.print();},450);
    };
    const pBtn=document.getElementById('pplRhppPrint');
    const pdfBtn=document.getElementById('pplRhppPdf');
    const xBtn=document.getElementById('pplRhppExcel');
    if(pBtn)pBtn.onclick=openPrint;
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(docHtml(),fileBase+'.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(xBtn)xBtn.onclick=()=>{
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(docHtml())]);
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=fileBase+'.xlsx';document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
}
