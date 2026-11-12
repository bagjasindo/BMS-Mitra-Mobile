async function financeRhppRealPage(){
  const [sr,rr,ar,br,cr]=await Promise.all([
    db.from('rhpp_system_final').select('*').order('created_at',{ascending:false}),
    db.from('rhpp_real').select('*').order('created_at',{ascending:false}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('contracts').select('id,number').is('cycle_id',null)
  ]);
  const systems=sr.data||[],reals=rr.data||[],assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[];
  const err=[sr,rr,ar,br,cr].find(x=>x.error)?.error;
  const canInput=['ADMIN','KEUANGAN'].includes(profile.role);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  window.__financeRhppRealState=window.__financeRhppRealState||{selected:'',barn:'',assignment:'',status:'',shown:false,editRealId:''};
  const st=window.__financeRhppRealState;
  if(st.barn===undefined)st.barn='';
  if(st.assignment===undefined)st.assignment='';

  let cards=systems.map(s=>{
    const a=assignments.find(x=>x.id===s.contract_assignment_id);
    const b=barns.find(x=>x.id===s.barn_id);
    const k=contractsRows.find(x=>x.id===a?.master_contract_id);
    const real=reals.find(x=>x.contract_assignment_id===s.contract_assignment_id);
    const diff=real?prodNum(real.amount)-prodNum(s.system_amount):null;
    const diffLabel=diff===null?'MENUNGGU':diff===0?'SESUAI':diff>0?'REAL LEBIH BESAR':'REAL LEBIH KECIL';
    return {s,a,b,k,real,diff,diffLabel};
  });

  cards=cards.filter(x=>{
    if(st.barn&&x.s.barn_id!==st.barn)return false;
    if(st.assignment&&x.s.contract_assignment_id!==st.assignment)return false;
    if(st.status==='WAITING'&&x.real)return false;
    if(st.status==='DONE'&&!x.real)return false;
    return true;
  });
  const rhppBarns=[...new Map(systems.map(s=>{const b=barns.find(x=>x.id===s.barn_id);return b?[b.id,b]:null}).filter(Boolean)).values()];
  const rhppCycles=assignments.filter(a=>(!st.barn||a.barn_id===st.barn)&&systems.some(s=>s.contract_assignment_id===a.id));

  if(st.selected&&!systems.some(x=>x.contract_assignment_id===st.selected)){
    st.selected='';
  }

  let html=RHPP_SCREEN_STYLE+'<div class="rhpp-ui"><section class="panel"><h3>RHPP Real Keuangan</h3><p class="muted">Data CLOSED wajib dipilih berdasarkan Kandang dan Siklus agar periode tidak tertukar. Input nominal sesuai PDF RHPP Real; tanggal penerimaan dipilih sesuai uang benar-benar diterima dan nominal langsung masuk Arus Kas.</p>'+
    '<form id="rhppRealFilter" class="form-vertical">'+
      '<label>Kandang<select name="barn" id="rhppRealBarn"><option value="">Semua Kandang</option>'+rhppBarns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Siklus<select name="assignment" id="rhppRealCycle"><option value="">Semua Siklus</option>'+rhppCycles.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date))+'</option>').join('')+'</select></label>'+
      '<label>Status<select name="status"><option value="" '+(!st.status?'selected':'')+'>Semua</option><option value="WAITING" '+(st.status==='WAITING'?'selected':'')+'>Menunggu Input</option><option value="DONE" '+(st.status==='DONE'?'selected':'')+'>Sudah Input</option></select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>';

  if(!systems.length){
    html+='<section class="panel"><p>Belum ada RHPP Sistem Final dari Administrator.</p></section>';
    html+='</div>';layout(html);if(err)msg(err.message);return;
  }

  if(st.shown)html+='<section class="panel"><h3>Daftar RHPP Real</h3>'+
    '<div class="tablewrap"><table><thead><tr><th>Kandang</th><th>Kontrak</th><th>Close Sistem</th><th>RHPP Sistem</th><th>Status Real</th><th>Selisih</th><th>Aksi</th></tr></thead><tbody>'+
    cards.map(x=>'<tr>'+
      '<td>'+esc(x.b?shortBarnLabel(x.b):'-')+'</td>'+
      '<td>'+esc(shortContractLabel(x.k?.number)||'-')+'</td>'+
      '<td>'+prodDateId(x.s.closed_on)+'</td>'+
      '<td>Rp '+prodFmt(x.s.system_amount,0)+'</td>'+
      '<td><strong>'+(x.real?'SUDAH INPUT':'MENUNGGU')+'</strong></td>'+
      '<td>'+(x.real?'Rp '+prodFmt(x.diff,0):'-')+'</td>'+
      '<td><button type="button" data-open-rhpp-real="'+esc(x.s.contract_assignment_id)+'">'+(st.selected===x.s.contract_assignment_id?'Tutup':'Buka')+'</button></td>'+
    '</tr>').join('')+
    '</tbody></table></div>'+
    (!cards.length?'<p class="muted">Tidak ada data sesuai filter.</p>':'')+
    '</section>';

  const selected=st.shown?systems.find(x=>x.contract_assignment_id===st.selected):null;
  if(selected){
    const a=assignments.find(x=>x.id===selected.contract_assignment_id);
    const b=barns.find(x=>x.id===selected.barn_id);
    const k=contractsRows.find(x=>x.id===a?.master_contract_id);
    const real=reals.find(x=>x.contract_assignment_id===selected.contract_assignment_id);
    const editingReal=real&&st.editRealId===real.id;
    const diff=real?prodNum(real.amount)-prodNum(selected.system_amount):null;
    const diffLabel=diff===null?'MENUNGGU':diff===0?'SESUAI':diff>0?'REAL LEBIH BESAR':'REAL LEBIH KECIL';

    html+='<section class="panel" id="rhppRealDetail">'+
      '<div class="rhpp-section-head"><div><h3>'+esc(assignmentIdentity(assignments,barns,contractsRows,a))+'</h3>'+
      '<p class="muted">RHPP Sistem Close '+prodDateId(selected.closed_on)+'</p></div><div class="report-actions"><button type="button" id="rhppRealPrint">Cetak / PDF</button><button type="button" id="rhppRealPrintExcel">Excel</button></div></div>'+
      '<div class="tablewrap"><table><tbody>'+
        '<tr><td>RHPP Sistem Final</td><td><strong>Rp '+prodFmt(selected.system_amount,0)+'</strong></td></tr>'+
        '<tr><td>RHPP Real Diterima</td><td><strong>'+(real?'Rp '+prodFmt(real.amount,0):'MENUNGGU INPUT KEUANGAN')+'</strong></td></tr>'+
        '<tr><td>Selisih Real − Sistem</td><td><strong>'+(real?'Rp '+prodFmt(diff,0):'-')+'</strong></td></tr>'+
        '<tr><td>Status Selisih</td><td><strong>'+diffLabel+'</strong></td></tr>'+
      '</tbody></table></div>'+
      (real?
        (canInput?
          (editingReal?
            '<form class="form-vertical" data-rhpp-real-edit-form="'+esc(real.id)+'">'+
              '<label>Tanggal RHPP Real<input name="received_on" type="date" value="'+esc(real.received_on||today)+'" required></label>'+
              '<label>Nominal RHPP Real sesuai PDF<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+fmtNumber(real.amount)+'" required></label>'+
              '<label>Referensi<input name="reference" value="'+esc(real.reference||'')+'" placeholder="Opsional"></label>'+
              '<label>Catatan<textarea name="notes">'+esc(real.notes||'')+'</textarea></label>'+
              '<div class="report-actions"><button type="submit">Simpan Koreksi</button><button type="button" id="rhppRealEditCancel">Batal Koreksi</button>'+adminDeleteTxnButton('rhpp_real',real.id)+'</div>'+
            '</form>':
            '<div class="report-actions"><button type="button" id="rhppRealEdit">Koreksi RHPP Real</button>'+adminDeleteTxnButton('rhpp_real',real.id)+'</div>'+
            '<p class="muted">RHPP Real tersimpan '+prodDateId(real.received_on)+'. Gunakan Koreksi jika tanggal/nominal salah.</p>'
          ):
          '<p class="muted">RHPP Real tersimpan '+prodDateId(real.received_on)+'.</p>'
        ):
        canInput?
          '<form class="form-vertical" data-rhpp-real-form="'+esc(selected.contract_assignment_id)+'">'+
            '<label>Tanggal Uang Diterima<input name="received_on" type="date" value="'+esc(today)+'" required></label>'+
            '<label>Referensi / Bukti<input name="reference" placeholder="Nomor transfer / RHPP"></label>'+
            '<label>Nominal RHPP Real sesuai PDF<input name="amount" type="text" inputmode="decimal" data-number="1" required placeholder="Rp"></label>'+
            '<p class="muted">Gunakan tanggal uang benar-benar diterima. Setelah disimpan, nominal otomatis masuk Arus Kas sebagai RHPP REAL.</p>'+
            '<button type="submit">Simpan RHPP Real</button>'+
          '</form>':
          '<p class="muted">Menunggu Keuangan menginput RHPP Real.</p>'
      )+
    '</section>';
  }

  html+='</div>';
  layout(html);bindNumberInputs();if(err)msg(err.message);const rhppRealPrint=document.getElementById('rhppRealPrint');if(rhppRealPrint)rhppRealPrint.onclick=()=>printFinanceDocument('rhppRealDetail','RHPP Real');const rhppRealExcel=document.getElementById('rhppRealPrintExcel');if(rhppRealExcel)rhppRealExcel.onclick=()=>exportFinanceDocumentExcel('rhppRealDetail','RHPP Real');

  const filter=document.getElementById('rhppRealFilter');
  const rhppBarn=document.getElementById('rhppRealBarn');
  if(rhppBarn)rhppBarn.onchange=async()=>{st.barn=rhppBarn.value||'';st.assignment='';st.selected='';st.shown=false;await financeRhppRealPage();};
  if(filter)filter.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(filter);
    st.barn=String(fd.get('barn')||'');
    st.assignment=String(fd.get('assignment')||'');
    st.status=String(fd.get('status')||'');
    st.selected='';
    st.shown=true;
    await financeRhppRealPage();
  };

  root.querySelectorAll('[data-open-rhpp-real]').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.openRhppReal;
    st.selected=st.selected===id?'':id;st.editRealId='';
    await financeRhppRealPage();
  });

  const editBtn=document.getElementById('rhppRealEdit');if(editBtn)editBtn.onclick=async()=>{const real=reals.find(x=>x.contract_assignment_id===st.selected);if(real)st.editRealId=real.id;await financeRhppRealPage();document.querySelector('[data-rhpp-real-edit-form]')?.scrollIntoView({behavior:'smooth',block:'start'});};
  const editCancel=document.getElementById('rhppRealEditCancel');if(editCancel)editCancel.onclick=async()=>{st.editRealId='';await financeRhppRealPage();};
  bindAdminTransactionDeletes(()=>{st.editRealId='';st.selected='';return financeRhppRealPage();});

  if(canInput)root.querySelectorAll('[data-rhpp-real-edit-form]').forEach(form=>form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<0)return msg('Nominal RHPP Real tidak valid.');
    if(!await appConfirm('Koreksi RHPP Real menjadi Rp '+prodFmt(amount,0)+'? Arus Kas dan laba/rugi terkait akan mengikuti nilai baru.'))return;
    const {error}=await db.rpc('finance_correct_rhpp_real_v1',{
      p_id:form.dataset.rhppRealEditForm,p_received_on:String(fd.get('received_on')||''),
      p_amount:amount,p_reference:String(fd.get('reference')||'')||null,p_notes:String(fd.get('notes')||'')||null
    });
    if(error)return msg(error.message);
    st.editRealId='';
    await financeRhppRealPage();
    msg('Koreksi RHPP Real berhasil disimpan.',true);
  });

  if(canInput)root.querySelectorAll('[data-rhpp-real-form]').forEach(form=>form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    const amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<0)return msg('Nominal RHPP Real tidak valid.');
    if(!await appConfirm('Simpan RHPP Real sebesar Rp '+prodFmt(amount,0)+'? Nominal akan masuk Arus Kas dan dapat dikoreksi dari menu ini bila terjadi salah input.'))return;
    const {error}=await db.rpc('finance_save_rhpp_real_atomic',{
      p_contract_assignment_id:form.dataset.rhppRealForm,
      p_amount:amount,
      p_received_on:String(fd.get('received_on')||''),
      p_reference:String(fd.get('reference')||'').trim()||null,
      p_notes:null
    });
    if(error)return msg(error.message);
    st.selected='';
    await financeRhppRealPage();
    msg('RHPP Real berhasil disimpan dan otomatis masuk Arus Kas sesuai tanggal penerimaan.',true);
  });
}

async function ownerProfitLossPage(){
  const [xr,rr,br,ar,cr]=await Promise.all([
    db.rpc('finance_cycle_profit_loss_v2'),
    db.from('rhpp_real').select('contract_assignment_id'),
    db.from('barns').select('id,code,name'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('contracts').select('id,number').is('cycle_id',null)
  ]);
  const rows=xr.data||[],barns=br.data||[],assignments=ar.data||[],contractsRows=cr.data||[];
  const err=[xr,rr,br,ar,cr].find(x=>x.error)?.error;
  const realIds=new Set((rr.data||[]).map(x=>x.contract_assignment_id).filter(Boolean));
  const assignmentOf=x=>assignments.find(a=>a.id===x.contract_assignment_id);
  const finalRows=rows.filter(x=>{
    const a=assignmentOf(x);
    return !x.active&&(a?.cycle_type==='MANDIRI'||realIds.has(x.contract_assignment_id));
  });
  const sum=(arr,k)=>arr.reduce((n,x)=>n+prodNum(x[k]),0);
  const totalRevenue=sum(finalRows,'rhpp_real');
  const totalBop=sum(finalRows,'bop_produksi');
  const totalSapronak=sum(finalRows,'sapronak_luar');
  const totalMeat=sum(finalRows,'tambah_daging');
  const totalMaint=sum(finalRows,'perawatan_jangka_panjang');
  const totalOperational=sum(finalRows,'laba_operasional_produksi');
  const totalNet=sum(finalRows,'laba_bersih_akhir');

  let html='<section class="panel"><h3>Owner · Laba/Rugi Kandang</h3>'+
    '<p class="muted">Semua siklus FINAL MITRA + MANDIRI dibaca bersama. Angka kumulatif tidak dipisah berdasarkan jenis siklus.</p>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Pendapatan Kandang</span><strong>Rp '+prodFmt(totalRevenue,0)+'</strong><small>MITRA + MANDIRI</small></div>'+
      '<div class="rhpp-summary-card"><span>Total BOP Produksi</span><strong>Rp '+prodFmt(totalBop,0)+'</strong><small>Seluruh kandang final</small></div>'+
      '<div class="rhpp-summary-card"><span>Total Biaya Sapronak</span><strong>Rp '+prodFmt(totalSapronak,0)+'</strong><small>Seluruh kandang final</small></div>'+
      '<div class="rhpp-summary-card"><span>Laba Bersih Kandang</span><strong>Rp '+prodFmt(totalNet,0)+'</strong><small>Setelah perawatan kandang</small></div>'+
    '</div></section>';

  if(!finalRows.length){
    html+='<section class="panel"><p>Belum ada siklus FINAL yang dapat dihitung.</p></section>';
    layout(html);if(err)msg(err.message);return;
  }

  html+='<section class="panel"><div class="tablewrap"><table><thead><tr>'+
    '<th>Kandang / Siklus</th><th>Jenis</th><th>Pendapatan</th><th>BOP</th><th>Biaya Sapronak</th><th>Tambah Daging</th><th>Perawatan</th><th>Laba Operasional</th><th>Laba Bersih</th>'+
    '</tr></thead><tbody>'+
    finalRows.map(x=>{
      const a=assignmentOf(x);
      const ident=a?assignmentIdentity(assignments,barns,contractsRows,a):(x.barn_code+' · '+x.barn_name);
      return '<tr><td>'+esc(ident)+'</td><td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td>'+
        '<td>Rp '+prodFmt(x.rhpp_real,0)+'</td>'+
        '<td>Rp '+prodFmt(x.bop_produksi,0)+'</td>'+
        '<td>Rp '+prodFmt(x.sapronak_luar,0)+'</td>'+
        '<td>Rp '+prodFmt(x.tambah_daging,0)+'</td>'+
        '<td>Rp '+prodFmt(x.perawatan_jangka_panjang,0)+'</td>'+
        '<td><strong>Rp '+prodFmt(x.laba_operasional_produksi,0)+'</strong></td>'+
        '<td><strong>Rp '+prodFmt(x.laba_bersih_akhir,0)+'</strong></td></tr>';
    }).join('')+
    '</tbody><tfoot>'+
      '<tr><th colspan="2">TOTAL KUMULATIF</th><th>Rp '+prodFmt(totalRevenue,0)+'</th><th>Rp '+prodFmt(totalBop,0)+'</th><th>Rp '+prodFmt(totalSapronak,0)+'</th><th>Rp '+prodFmt(totalMeat,0)+'</th><th>Rp '+prodFmt(totalMaint,0)+'</th><th>Rp '+prodFmt(totalOperational,0)+'</th><th>Rp '+prodFmt(totalNet,0)+'</th></tr>'+
    '</tfoot></table></div></section>';

  layout(html);if(err)msg(err.message);
}

async function financeRhppPage(options={}){
  window.__financeRhppState=window.__financeRhppState||{assignment:''};
  const [pr,rr,hr,mr,sr,sir,rtr,rir,ir,esr,esir,errh,erir,tir,cir,cpr,lrf]=await Promise.all([
    db.rpc('finance_rhpp_summary_v6'),
    db.from('rhpp_system_final').select('*').order('created_at',{ascending:false}),
    db.from('marketing_contract_harvests').select('*').order('harvested_on',{ascending:true}).order('created_at',{ascending:true}),
    db.from('marketing_external_meat_purchases').select('*').order('purchase_date',{ascending:true}).order('created_at',{ascending:true}),
    db.from('logistics_shipments').select('id,contract_assignment_id,shipment_date,delivery_number,shipping_note_number,notes'),
    db.from('logistics_shipment_items').select('shipment_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('logistics_returns').select('id,contract_assignment_id,return_date,reference,notes'),
    db.from('logistics_return_items').select('return_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('items').select('id,code,name,category,feed_phase,unit,kg_per_unit'),
    db.from('logistics_external_shipments').select('id,contract_assignment_id,shipment_date,reference_number,notes'),
    db.from('logistics_external_shipment_items').select('external_shipment_id,item_id,quantity,quantity_kg,purchase_unit_price'),
    db.from('logistics_external_returns').select('id,contract_assignment_id,return_date,reference,status,notes,external_shipment_id'),
    db.from('logistics_external_return_items').select('external_return_id,item_id,quantity,quantity_kg,purchase_unit_price'),
    db.from('logistics_external_return_transfers').select('target_contract_assignment_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('chick_ins').select('contract_assignment_id,arrived_on,received,doa'),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email,website').eq('id',true).maybeSingle(),
    db.from('logistics_mitra_retained_feed').select('id,return_id,return_item_id,source_assignment_id,item_id,quantity,unit_price,created_at')
  ]);
  const rows=pr.data||[],finals=rr.data||[],harvests=hr.data||[],meats=mr.data||[],ships=sr.data||[],shipItems=sir.data||[],returns=rtr.data||[],returnItems=rir.data||[],items=ir.data||[];
  const extShips=esr.data||[],extShipItems=esir.data||[],extReturns=errh.data||[],extReturnItems=erir.data||[],transfersIn=tir.data||[],chickIns=cir.data||[],company=cpr.data||{};
  const err=[pr,rr,hr,mr,sr,sir,rtr,rir,ir,esr,esir,errh,erir,tir,cir,cpr,lrf].find(x=>x.error)?.error;

  if(err){layout('<section class="panel"><h3>Cek RHPP belum dapat dimuat</h3><p>Data tidak lengkap. Muat ulang sebelum memeriksa, mencetak, atau melakukan Close.</p></section>');msg(err.message);return;}

  let html=RHPP_SCREEN_STYLE+'<div class="rhpp-ui"><div class="rhpp-page" id="rhppExportArea"><section class="panel rhpp-panel rhpp-intro"><div class="rhpp-section-head"><div><h3>RHPP Otomatis</h3>'+
    '<p class="muted">RHPP dihitung langsung dari Chick-In, Logistik, Retur, Panen Marketing, Master Performa, dan Bonus Kontrak. BOP kandang tidak masuk RHPP.</p></div></div></section>';

  if(!rows.length){
    html+='<section class="panel rhpp-panel"><p>Belum ada data yang dapat dihitung.</p></section></div>';
    layout(html);
    if(err)msg(err.message);
    return;
  }

  const reportRows=options.historyAssignment?rows.map(x=>{
    const f=finals.find(v=>v.contract_assignment_id===x.contract_assignment_id);
    if(!f)return x;
    const frozen={...x};
    for(const key of ['chick_in_birds','total_harvest_birds','total_harvest_kg','avg_bw_kg','weighted_age','mortality_pct','net_feed_kg','fcr_actual','fcr_standard','ip','harvest_value','main_doc_cost','main_feed_cost','main_ovk_cost','main_other_cost','main_return_cost','external_sapronak_cost','sapronak_cost','external_meat_cost','total_rhpp_cost','base_profit','bonus_ip_rate','bonus_ip','bonus_fc_rate','bonus_fc','profit_per_chick_in','profit_per_harvested_bird'])frozen[key]=f[key];
    frozen.bonus_mortality=f.bonus_depletion;frozen.bonus_mortality_rate=f.bonus_depletion_rate;
    frozen.diff_fcr=f.fcr_standard==null||f.fcr_actual==null?null:Number(f.fcr_standard)-Number(f.fcr_actual);
    frozen.farmer_profit=Number(f.system_amount)+Number(f.external_meat_cost||0)+Number(f.external_sapronak_cost||0);
    return frozen;
  }):rows;
  const activeRows=reportRows.filter(x=>options.historyAssignment?x.contract_assignment_id===options.historyAssignment:!!x.active);
  if(options.historyAssignment)window.__financeRhppState.assignment=options.historyAssignment;
  let selectedAssignment=window.__financeRhppState.assignment||'';
  if(selectedAssignment&&!activeRows.some(x=>x.contract_assignment_id===selectedAssignment)){
    selectedAssignment='';
    window.__financeRhppState.assignment='';
  }
  if(!options.historyAssignment)html+='<section data-rhpp-controls class="panel rhpp-panel"><h3>Pilih Kandang</h3>'+
    '<p class="muted">Pilih kandang terlebih dahulu untuk membuka rincian RHPP. Satu kandang ditampilkan dalam satu waktu.</p>'+
    '<label>Kandang / Periode<select id="rhppBarnSelect"><option value="">Pilih kandang</option>'+
      activeRows.map(x=>'<option value="'+esc(x.contract_assignment_id)+'" '+(selectedAssignment===x.contract_assignment_id?'selected':'')+'>'+
        esc((x.barn_code||'')+' · '+(x.barn_name||'')+' · '+(x.contract_number||'')+' · Aktif')+
      '</option>').join('')+
    '</select></label></section>';

  if(!activeRows.length){
    html+='<section class="panel rhpp-panel"><p class="muted">Tidak ada periode kandang aktif. Periode yang sudah Closed disembunyikan dari daftar.</p></section></div>';
    layout(html);
    if(err)msg(err.message);
    return;
  }

  if(!selectedAssignment||!activeRows.some(x=>x.contract_assignment_id===selectedAssignment)){
    html+='<section class="panel rhpp-panel"><p class="muted">Belum ada kandang dipilih. Rincian RHPP tidak ditampilkan.</p></section></div>';
    layout(html);
    if(err)msg(err.message);
    const sel=document.getElementById('rhppBarnSelect');
    if(sel)sel.onchange=async()=>{
      window.__financeRhppState.assignment=sel.value||'';
      await financeRhppPage();
    };
    return;
  }

  html+='<section data-rhpp-controls class="panel rhpp-panel"><div class="report-actions"><button type="button" id="rhppPrint">Cetak</button><button type="button" id="rhppPdf">PDF</button><button type="button" id="rhppExcel">Excel</button></div></section>';
  if(options.historyAssignment)html+='<section data-rhpp-controls class="panel"><button type="button" id="rhppHistoryBack">Kembali Pilih Siklus</button><p>Angka ringkasan memakai catatan final saat periode ditutup. Rincian transaksi asal ditampilkan untuk audit.</p></section>';
  const selectedRows=activeRows.filter(x=>x.contract_assignment_id===selectedAssignment);
  selectedRows.forEach(x=>{
    const fin=finals.find(r=>r.contract_assignment_id===x.contract_assignment_id);
    const ready=!fin&&!!x.active&&prodNum(x.chick_in_birds)>0&&prodNum(x.total_harvest_birds)>0&&prodNum(x.total_harvest_kg)>0&&prodNum(x.net_feed_kg)>0&&prodNum(x.sapronak_cost)>0;
    const status=fin?'CLOSED · RHPP SISTEM FINAL':ready?'DATA TERSEDIA · PERLU VERIFIKASI AKHIR':'BELUM SIAP';
    const hs=harvests.filter(h=>h.contract_assignment_id===x.contract_assignment_id);
    const ms=meats.filter(m=>m.contract_assignment_id===x.contract_assignment_id);
    const actualHarvestBirds=hs.reduce((s,h)=>s+prodNum(h.birds),0);
    const actualHarvestKg=hs.reduce((s,h)=>s+prodNum(h.net_weight_kg),0);
    const actualHarvestValue=hs.reduce((s,h)=>s+prodNum(h.total_amount),0);
    const meatBirds=ms.reduce((s,m)=>s+prodNum(m.birds),0);
    const meatKg=ms.reduce((s,m)=>s+prodNum(m.weight_kg),0);
    const rhppGross=prodNum(x.farmer_profit);
    const companyExtraCost=prodNum(x.external_meat_cost)+prodNum(x.external_sapronak_cost);
    const companyNet=rhppGross-companyExtraCost;
    const ci=chickIns.find(v=>v.contract_assignment_id===x.contract_assignment_id);
    const docLines=shipItems.filter(v=>ships.some(h=>h.id===v.shipment_id&&h.contract_assignment_id===x.contract_assignment_id)&&items.some(i=>i.id===v.item_id&&i.category==='DOC'));
    const docQuantity=docLines.reduce((sum,v)=>sum+prodNum(v.quantity),0);
    const effectiveDocPrice=docQuantity>0?docLines.reduce((sum,v)=>sum+prodNum(v.quantity)*prodNum(v.unit_price),0)/docQuantity:null;

    const shipIds=new Set(ships.filter(s=>s.contract_assignment_id===x.contract_assignment_id).map(s=>s.id));
    const retIds=new Set(returns.filter(r=>r.contract_assignment_id===x.contract_assignment_id).map(r=>r.id));
    const feedMap=new Map();
    shipItems.filter(v=>shipIds.has(v.shipment_id)).forEach(v=>{
      const it=items.find(i=>i.id===v.item_id);
      if(it?.category!=='PAKAN')return;
      const key='MAIN:'+v.item_id;
      const o=feedMap.get(key)||{name:'Utama · '+(it?.name||'-'),inQty:0,inKg:0,retQty:0,retKg:0,inValue:0,retValue:0};
      o.inQty+=prodNum(v.quantity);o.inKg+=prodNum(v.quantity_kg);o.inValue+=prodNum(v.quantity)*prodNum(v.unit_price);feedMap.set(key,o);
    });
    returnItems.filter(v=>retIds.has(v.return_id)).forEach(v=>{
      const it=items.find(i=>i.id===v.item_id);
      if(it?.category!=='PAKAN')return;
      const key='MAIN:'+v.item_id;
      const o=feedMap.get(key)||{name:'Utama · '+(it?.name||'-'),inQty:0,inKg:0,retQty:0,retKg:0,inValue:0,retValue:0};
      o.retQty+=prodNum(v.quantity);o.retKg+=prodNum(v.quantity_kg);o.retValue+=prodNum(v.quantity)*prodNum(v.unit_price);feedMap.set(key,o);
    });

    const extShipIds=new Set(extShips.filter(s=>s.contract_assignment_id===x.contract_assignment_id).map(s=>s.id));
    const extRetIds=new Set(extReturns.filter(r=>r.contract_assignment_id===x.contract_assignment_id).map(r=>r.id));
    extShipItems.filter(v=>extShipIds.has(v.external_shipment_id)).forEach(v=>{
      const it=items.find(i=>i.id===v.item_id);
      if(it?.category!=='PAKAN')return;
      const key='EXT:'+v.item_id;
      const o=feedMap.get(key)||{name:'Tambah Sapronak · '+(it?.name||'-'),inQty:0,inKg:0,retQty:0,retKg:0,inValue:0,retValue:0};
      o.inQty+=prodNum(v.quantity);o.inKg+=prodNum(v.quantity_kg);o.inValue+=prodNum(v.quantity)*prodNum(v.purchase_unit_price);feedMap.set(key,o);
    });
    extReturnItems.filter(v=>extRetIds.has(v.external_return_id)).forEach(v=>{
      const it=items.find(i=>i.id===v.item_id);
      if(it?.category!=='PAKAN')return;
      const key='EXT:'+v.item_id;
      const o=feedMap.get(key)||{name:'Tambah Sapronak · '+(it?.name||'-'),inQty:0,inKg:0,retQty:0,retKg:0,inValue:0,retValue:0};
      o.retQty+=prodNum(v.quantity);o.retKg+=prodNum(v.quantity_kg);o.retValue+=prodNum(v.quantity)*prodNum(v.purchase_unit_price);feedMap.set(key,o);
    });
    transfersIn.filter(v=>v.target_contract_assignment_id===x.contract_assignment_id).forEach(v=>{
      const it=items.find(i=>i.id===v.item_id);
      if(it?.category!=='PAKAN')return;
      const key='TRANSFER:'+v.item_id;
      const o=feedMap.get(key)||{name:'Alih Masuk · '+(it?.name||'-'),inQty:0,inKg:0,retQty:0,retKg:0,inValue:0,retValue:0};
      o.inQty+=prodNum(v.quantity);o.inKg+=prodNum(v.quantity_kg);o.inValue+=prodNum(v.quantity)*prodNum(v.unit_price);feedMap.set(key,o);
    });
    const feedRows=[...feedMap.values()];
    const contractFeedRows=feedRows.filter(v=>String(v.name||'').startsWith('Utama · '));
    const extraFeedRows=feedRows.filter(v=>!String(v.name||'').startsWith('Utama · '));
    const contractFeedNetValue=contractFeedRows.reduce((sum,v)=>sum+prodNum(v.inValue)-prodNum(v.retValue),0);
    const extraFeedNetValue=extraFeedRows.reduce((sum,v)=>sum+prodNum(v.inValue)-prodNum(v.retValue),0);

    html+='<section class="panel rhpp-panel rhpp-head"><div class="rhpp-section-head"><div><h3>Identitas Siklus</h3><p class="muted">Ringkasan periode yang sedang diperiksa.</p></div><span class="rhpp-count">'+status+'</span></div>'+
      '<div class="tablewrap"><table><tbody>'+
        '<tr><td>Kandang / Peternak</td><td><strong>'+esc((x.barn_code||'')+' · '+(x.barn_name||''))+'</strong></td></tr>'+
        '<tr><td>Kontrak</td><td>'+esc(x.contract_number||'-')+'</td></tr>'+
        '<tr><td>Tanggal Chick-In</td><td>'+prodDateId(ci?.arrived_on)+'</td></tr>'+
        '<tr><td>Populasi Chick-In</td><td>'+prodFmt(x.chick_in_birds,0)+' ekor</td></tr>'+
        '<tr><td>Status RHPP</td><td><strong>'+status+'</strong></td></tr>'+
        (fin?'<tr><td>Tanggal Penutupan Periode</td><td>'+prodDateId(fin.closed_on)+'</td></tr>':'')+
      '</tbody></table></div></section>'+
      '<section class="panel rhpp-panel rhpp-wide"><div class="rhpp-section-head"><div><h3>Rincian DOC & Kontrak</h3><p class="muted">Acuan awal populasi dan biaya DOC yang sudah dipakai oleh perhitungan RHPP.</p></div></div>'+
      '<div class="tablewrap"><table><tbody>'+
        '<tr><td>Kontrak</td><td>'+esc(x.contract_number||'-')+'</td></tr>'+
        '<tr><td>DOC Diterima</td><td>'+prodFmt(ci?.received,0)+' ekor</td></tr>'+
        '<tr><td>DOA (catatan)</td><td>'+prodFmt(ci?.doa,0)+' ekor · '+(fin?'populasi historis mengikuti catatan final saat ditutup':'tidak mengurangi populasi dan nilai DOC RHPP')+'</td></tr>'+
        '<tr><td>'+ (fin?'Populasi Dasar RHPP (final saat ditutup)':'Populasi Dasar RHPP (DOC Diterima)') +'</td><td><strong>'+prodFmt(x.chick_in_birds,0)+' ekor</strong></td></tr>'+
        '<tr><td>Harga DOC / Ekor</td><td>Rp '+(effectiveDocPrice===null?'-':prodFmt(effectiveDocPrice,2))+'</td></tr>'+
        '<tr><td>Total Nilai DOC</td><td><strong>Rp '+prodFmt(x.main_doc_cost,0)+'</strong></td></tr>'+
      '</tbody></table></div>'+
      '<div class="rhpp-summary-cards">'+
        '<div class="rhpp-summary-card"><span>Panen Aktual</span><strong>'+prodFmt(actualHarvestBirds,0)+' ekor · '+prodFmt(actualHarvestKg,2)+' Kg</strong></div>'+
        '<div class="rhpp-summary-card"><span>Tambah Daging</span><strong>'+prodFmt(meatBirds,0)+' ekor · '+prodFmt(meatKg,2)+' Kg</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Performa RHPP</span><strong>'+prodFmt(x.total_harvest_birds,0)+' ekor · '+prodFmt(x.total_harvest_kg,2)+' Kg</strong><small>Panen Aktual + Tambah Daging</small></div>'+
      '</div></section>';

    html+=rhppLogisticsDetails(x.contract_assignment_id,{ships,shipItems,returns,returnItems,items,extShips,extShipItems,extReturns,extReturnItems,retained:lrf.data||[]});

    html+='<section class="panel rhpp-panel rhpp-wide rhpp-harvest"><div class="rhpp-section-head"><div><h3>Rincian Panen</h3><p class="muted">Panen Aktual dan Tambah Daging menjadi satu sumber performa RHPP, namun tetap ditandai terpisah agar mudah diaudit.</p></div><span class="rhpp-count">'+(hs.length+ms.length)+' transaksi</span></div>'+
      '<div class="tablewrap rhpp-harvest-wrap"><table class="rhpp-harvest-table"><thead><tr>'+
      '<th class="rhpp-sticky-col">Tanggal</th><th>Sumber</th><th>Keterangan</th><th class="num">Ekor</th><th class="num">Berat (Kg)</th><th class="num">BW</th><th class="num">Harga/Kg</th><th class="num rhpp-money-col">Nilai Produksi</th>'+
      '</tr></thead><tbody>'+
      hs.map(h=>'<tr><td class="rhpp-sticky-col">'+prodDateId(h.harvested_on)+'</td><td><strong>PANEN AKTUAL</strong></td><td>'+esc([h.buyer_name,h.vehicle_number].filter(Boolean).join(' · ')||'-')+'</td><td class="num">'+prodFmt(h.birds,0)+'</td><td class="num">'+prodFmt(h.net_weight_kg,2)+'</td><td class="num">'+prodFmt(h.avg_weight_kg,3)+'</td><td class="num">Rp '+prodFmt(h.price_per_kg,0)+'</td><td class="num rhpp-money-col">Rp '+prodFmt(h.total_amount,0)+'</td></tr>').join('')+
      ms.map(m=>{const n=prodNum(m.birds),kg=prodNum(m.weight_kg),bw=n>0?kg/n:0,total=kg*prodNum(m.purchase_price_per_kg);return '<tr><td class="rhpp-sticky-col">'+prodDateId(m.purchase_date)+'</td><td><strong>TAMBAH DAGING</strong></td><td>'+esc(m.product_name||'Daging/Ayam')+'</td><td class="num">'+(n>0?prodFmt(n,0):'-')+'</td><td class="num">'+prodFmt(kg,2)+'</td><td class="num">'+(bw>0?prodFmt(bw,3):'-')+'</td><td class="num">Rp '+prodFmt(m.purchase_price_per_kg,0)+'</td><td class="num rhpp-money-col">Rp '+prodFmt(total,0)+'</td></tr>';}).join('')+
      '<tr class="rhpp-total-row"><th colspan="3">TOTAL PANEN AKTUAL</th><th class="num">'+prodFmt(actualHarvestBirds,0)+'</th><th class="num">'+prodFmt(actualHarvestKg,2)+'</th><th class="num">'+prodFmt(actualHarvestBirds>0?actualHarvestKg/actualHarvestBirds:0,3)+'</th><th></th><th class="num">Rp '+prodFmt(actualHarvestValue,0)+'</th></tr>'+
      '<tr class="rhpp-total-row"><th colspan="3">TOTAL TAMBAH DAGING</th><th class="num">'+prodFmt(meatBirds,0)+'</th><th class="num">'+prodFmt(meatKg,2)+'</th><th class="num">'+prodFmt(meatBirds>0?meatKg/meatBirds:0,3)+'</th><th></th><th class="num">Rp '+prodFmt(x.external_meat_cost,0)+'</th></tr>'+
      '<tr class="rhpp-total-row"><th colspan="3">TOTAL PERFORMA RHPP</th><th class="num">'+prodFmt(x.total_harvest_birds,0)+'</th><th class="num">'+prodFmt(x.total_harvest_kg,2)+'</th><th class="num">'+prodFmt(x.avg_bw_kg,3)+'</th><th></th><th class="num">Rp '+prodFmt(x.harvest_value,0)+'</th></tr>'+
      '</tbody></table></div>'+
      '</section>';

    html+='<section class="panel rhpp-panel rhpp-wide rhpp-feed-panel"><h3>Pemakaian Pakan & Retur</h3><div class="tablewrap"><table class="rhpp-feed-table"><thead><tr>'+
      '<th>Jenis</th><th class="num">Masuk</th><th class="num">Retur</th><th class="num">Bersih</th><th class="num">Bersih Kg</th><th class="num">Nilai Bersih</th>'+
      '</tr></thead><tbody>'+
      contractFeedRows.map(v=>{const parts=String(v.name||'').split(' · '),kind=parts[0]||'',item=parts.slice(1).join(' · ')||kind;return '<tr><td class="rhpp-feed-name"><span class="rhpp-feed-kind">'+esc(kind)+'</span><strong>'+esc(item)+'</strong></td><td class="num">'+prodFmt(v.inQty,2)+'</td><td class="num">'+prodFmt(v.retQty,2)+'</td><td class="num">'+prodFmt(v.inQty-v.retQty,2)+'</td><td class="num">'+prodFmt(v.inKg-v.retKg,2)+'</td><td class="num">Rp '+prodFmt(prodNum(v.inValue)-prodNum(v.retValue),0)+'</td></tr>';}).join('')+
      '<tr class="rhpp-total-row"><th>PAKAN KONTRAK · DASAR FCR RHPP</th><th></th><th></th><th></th><th class="num">'+prodFmt(x.net_feed_kg,2)+'</th><th class="num">Rp '+prodFmt(contractFeedNetValue,0)+'</th></tr>'+
      '</tbody></table></div></section>'+
      (extraFeedRows.length?'<section class="panel rhpp-panel rhpp-wide"><div class="rhpp-section-head"><div><h3>Tambah Sapronak Perusahaan · Di luar RHPP</h3><p class="muted">Hanya untuk audit operasional, hutang supplier, dan laba/rugi perusahaan. Tidak masuk FCR, IP, pakan kontrak, atau biaya RHPP.</p></div><span class="rhpp-count">'+extraFeedRows.length+' item</span></div><div class="tablewrap"><table><thead><tr><th>Jenis</th><th class="num">Masuk</th><th class="num">Retur</th><th class="num">Bersih</th><th class="num">Bersih Kg</th><th class="num">Nilai Bersih</th></tr></thead><tbody>'+
      extraFeedRows.map(v=>{const parts=String(v.name||'').split(' · '),kind=parts[0]||'',item=parts.slice(1).join(' · ')||kind;return '<tr><td class="rhpp-feed-name"><span class="rhpp-feed-kind">'+esc(kind)+'</span><strong>'+esc(item)+'</strong></td><td class="num">'+prodFmt(v.inQty,2)+'</td><td class="num">'+prodFmt(v.retQty,2)+'</td><td class="num">'+prodFmt(v.inQty-v.retQty,2)+'</td><td class="num">'+prodFmt(v.inKg-v.retKg,2)+'</td><td class="num">Rp '+prodFmt(prodNum(v.inValue)-prodNum(v.retValue),0)+'</td></tr>';}).join('')+
      '<tr class="rhpp-total-row"><th>TOTAL TAMBAH SAPRONAK · DI LUAR RHPP</th><th></th><th></th><th></th><th class="num">'+prodFmt(x.external_feed_kg,2)+'</th><th class="num">Rp '+prodFmt(extraFeedNetValue,0)+'</th></tr>'+
      '</tbody></table></div></section>':'');

    html+=rhppContractCalculation(x);

    html+='<div class="rhpp-grid">'+
      '<section class="panel rhpp-panel"><h3>Ringkasan Produksi</h3><div class="tablewrap"><table><tbody>'+
        '<tr><td>Nama Kandang / Peternak</td><td>'+esc(x.barn_name||'-')+'</td></tr>'+
        '<tr><td>Populasi Chick-In</td><td>'+prodFmt(x.chick_in_birds,0)+'</td></tr>'+
        '<tr><td>Panen Aktual (Ekor)</td><td>'+prodFmt(actualHarvestBirds,0)+'</td></tr>'+
        '<tr><td>Panen Aktual (Kg)</td><td>'+prodFmt(actualHarvestKg,2)+'</td></tr>'+
        '<tr><td>Tambah Daging (Ekor)</td><td>'+prodFmt(meatBirds,0)+'</td></tr>'+
        '<tr><td>Tambah Daging (Kg)</td><td>'+prodFmt(meatKg,2)+'</td></tr>'+
        '<tr><td><strong>Total Performa RHPP (Ekor)</strong></td><td><strong>'+prodFmt(x.total_harvest_birds,0)+'</strong></td></tr>'+
        '<tr><td><strong>Total Performa RHPP (Kg)</strong></td><td><strong>'+prodFmt(x.total_harvest_kg,2)+'</strong></td></tr>'+
        '<tr><td>Bobot Rata-rata (BW, kg/ekor)</td><td>'+prodFmt(x.avg_bw_kg,3)+'</td></tr>'+
        '<tr><td>Umur Panen (hari)</td><td>'+prodFmt(x.weighted_age,2)+'</td></tr>'+
      '</tbody></table></div></section>'+

      '<section class="panel rhpp-panel"><h3>Kinerja Produksi</h3><div class="tablewrap"><table><tbody>'+
        '<tr><td>Deplesi hitung (DOC dikurangi ekor performa)</td><td>'+prodFmt(x.mortality_pct,2)+'%</td></tr>'+
        '<tr><td>Bobot Badan (BW, kg/ekor)</td><td>'+prodFmt(x.avg_bw_kg,3)+'</td></tr>'+
        '<tr><td><strong>Pakan Kontrak Bersih · Dasar FCR</strong></td><td><strong>'+prodFmt(x.net_feed_kg,2)+'</strong></td></tr>'+
        '<tr><td>Pakan Tambahan Perusahaan · Di luar RHPP</td><td>'+prodFmt(x.external_feed_kg,2)+'</td></tr>'+
        '<tr><td>Umur Panen (hari)</td><td>'+prodFmt(x.weighted_age,2)+'</td></tr>'+
        '<tr><td>FCR</td><td>'+prodFmt(x.fcr_actual,3)+'</td></tr>'+
        '<tr><td>FCR Standar</td><td>'+prodFmt(x.fcr_standard,3)+'</td></tr>'+
        '<tr><td>Selisih FCR (standar − aktual)</td><td>'+prodFmt(x.diff_fcr,3)+'</td></tr>'+
        '<tr><td>Indeks Prestasi (IP)</td><td>'+prodFmt(x.ip,2)+'</td></tr>'+
      '</tbody></table></div></section>'+

      '<section class="panel rhpp-panel"><h3>Penyesuaian Biaya Perusahaan</h3><p class="muted">Dikurangi setelah RHPP kontrak selesai. Tidak mengubah FCR, IP, mortalitas, atau perhitungan performa RHPP.</p><div class="tablewrap"><table><tbody>'+
        '<tr><td>Nilai RHPP Kontrak</td><td>Rp '+prodFmt(rhppGross,0)+'</td></tr>'+
        '<tr><td>Kurang: Tambah Daging</td><td>- Rp '+prodFmt(x.external_meat_cost,0)+'</td></tr>'+
        '<tr><td>Kurang: Tambah Sapronak / Pakan</td><td>- Rp '+prodFmt(x.external_sapronak_cost,0)+'</td></tr>'+
        '<tr><td><strong>Total Biaya Tambahan Perusahaan</strong></td><td><strong>- Rp '+prodFmt(companyExtraCost,0)+'</strong></td></tr>'+
        '<tr><td><strong>HASIL AKHIR SETELAH BIAYA TAMBAHAN</strong></td><td><strong>Rp '+prodFmt(companyNet,0)+'</strong></td></tr>'+
      '</tbody></table></div>'+
      '<p><strong>Status: '+status+'</strong></p>'+
      (fin?'<p class="muted">Close Produksi '+prodDateId(fin.closed_on)+' · RHPP Sistem Rp '+prodFmt(fin.system_amount,0)+'</p>':ready?(profile.role==='ADMIN'?'<button type="button" class="btn-danger-soft" data-close-rhpp="'+esc(x.contract_assignment_id)+'">Deal & Close Produksi</button>':'<p class="muted">RHPP siap diperiksa. Close Produksi hanya untuk Administrator.</p>'):'<p class="muted">Lengkapi data operasional sebelum Close</p>')+
      '</section>'+
    '</div>';
  });

  html+='<section data-rhpp-controls class="panel rhpp-panel rhpp-control"><h3>Kontrol RHPP Produksi</h3><p class="muted">Administrator periksa RHPP Sistem terlebih dahulu. Jika sudah deal, klik Close Produksi. Setelah Close, seluruh transaksi operasional periode terkunci. RHPP Real tetap menjadi urusan Keuangan.</p></section></div>';

  layout(html);
  if(err)msg(err.message);
  const back=document.getElementById('rhppHistoryBack');if(back)back.onclick=options.onBack;
  const rhppBarnSelect=document.getElementById('rhppBarnSelect');
  if(rhppBarnSelect)rhppBarnSelect.onchange=async()=>{
    window.__financeRhppState.assignment=rhppBarnSelect.value||'';
    await financeRhppPage();
  };

  const rhppExport=document.getElementById('rhppExportArea');
  rhppOrganizeReport(rhppExport);
  const reportRow=activeRows.find(v=>v.contract_assignment_id===selectedAssignment);
  const reportFile='RHPP_'+(reportRow?.barn_code||'Kandang')+'_'+(chickIns.find(v=>v.contract_assignment_id===selectedAssignment)?.arrived_on||'Periode')+'_'+(options.historyAssignment?'CLOSED':'CEK');
  // Screen, print, PDF and Excel use the same rendered values; no second financial calculation.
  const rhppDocHtml=()=>rhppDocumentHtml(rhppExport,company);
  const rhppPrintOpen=(pdf=false)=>{
    const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
    w.document.write(rhppDocHtml(pdf));w.document.close();
    setTimeout(()=>{w.focus();w.print();},500);
  };
  const printBtn=document.getElementById('rhppPrint');
  const pdfBtn=document.getElementById('rhppPdf');
  const excelBtn=document.getElementById('rhppExcel');
  if(printBtn)printBtn.onclick=()=>rhppPrintOpen(false);
  if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(rhppDocHtml(true),reportFile+'.pdf',{pageSize:'landscape'}).catch(error=>msg(error?.message||'PDF gagal dibuat.'));
  if(excelBtn)excelBtn.onclick=()=>{
    const blob=BMSCore.excelBlob([rhppDocHtml()]);
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=reportFile+'.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  if(profile.role==='ADMIN')root.querySelectorAll('[data-close-rhpp]').forEach(btn=>btn.onclick=async()=>{
    const x=rows.find(v=>v.contract_assignment_id===btn.dataset.closeRhpp);
    if(!x)return;
    if(!await appConfirm('Seluruh kiriman, retur, panen, dan nilai akhir pada Cek RHPP sudah diperiksa serta DEAL? Status data tersedia tidak menjamin panen selesai. Close Produksi akan mengunci seluruh transaksi operasional periode ini.'))return;
    const {error}=await db.rpc('admin_close_production_atomic',{p_contract_assignment_id:x.contract_assignment_id});
    if(error)return msg(error.message);
    await financeRhppPage();
    msg('Produksi berhasil di-Close. RHPP Sistem terkunci dan menunggu RHPP Real dari Keuangan.',true);
  });
}

async function employeeMasterPage(){
  const can=profile.role==='ADMIN';
  const {data,error}=await db.from('employees').select('*').order('code',{ascending:true});
  const rows=data||[];
  let html='<section class="panel"><h3>Master Karyawan</h3>';
  if(can){
    html+='<form id="employeeForm" class="form-vertical">'+
      '<input type="hidden" name="id">'+
      '<label>Nama<input name="name" required></label>'+
      '<label>Jenis<select name="kind"><option value="KARYAWAN">KARYAWAN</option><option value="ABK">ABK</option></select></label>'+
      '<label>Telepon<input name="phone"></label>'+
      '<label>Jabatan<input name="job_title"></label>'+
      '<label>Tanggal Masuk<input name="joined_on" type="date"></label>'+
      '<label>Catatan<textarea name="notes"></textarea></label>'+
      '<button type="submit" id="employeeSave">Simpan</button>'+
      '<button type="button" id="employeeCancelEdit" hidden>Batal Edit</button>'+
    '</form>';
  }
  html+='<div class="tablewrap"><table id="employeeMasterTable"><thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Telepon</th><th>Jabatan</th><th>Tanggal Masuk</th><th>Status</th>'+(can?'<th>Aksi</th>':'')+'</tr></thead><tbody>'+
    rows.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.kind)+'</td><td>'+esc(x.phone||'')+'</td><td>'+esc(x.job_title||'')+'</td><td>'+esc(x.joined_on||'')+'</td><td>'+(x.active?'Aktif':'Nonaktif')+'</td>'+(can?'<td><button type="button" data-edit-employee="'+esc(x.id)+'">Edit</button> <button type="button" data-toggle-employee="'+esc(x.id)+'">'+(x.active?'Nonaktifkan':'Aktifkan')+'</button></td>':'')+'</tr>').join('')+
    '</tbody></table></div>'+(!rows.length?'<p>Belum ada data.</p>':'')+'</section>';
  layout(html);
  attachListFilter({tableId:'employeeMasterTable',fields:[
    {label:'Kode',col:0,placeholder:'Kode'},
    {label:'Nama',col:1,placeholder:'Nama'},
    {label:'Jenis',col:2,type:'select',options:['KARYAWAN','ABK']},
    {label:'Telepon',col:3,placeholder:'Telepon'},
    {label:'Jabatan',col:4,placeholder:'Jabatan'},
    {label:'Tanggal Masuk',col:5,placeholder:'YYYY-MM-DD'},
    {label:'Status',col:6,type:'select',options:['Aktif','Nonaktif']}
  ]});
  if(error)msg(error.message);
  if(!can)return;
  const form=document.getElementById('employeeForm');
  const save=document.getElementById('employeeSave');
  const cancel=document.getElementById('employeeCancelEdit');
  const reset=()=>{
    form.reset();
    form.elements.id.value='';
    save.textContent='Simpan';
    cancel.hidden=true;
  };
  cancel.onclick=reset;
  root.querySelectorAll('[data-edit-employee]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.id===btn.dataset.editEmployee);if(!x)return;
    form.elements.id.value=x.id;
    form.elements.name.value=x.name||'';
    form.elements.kind.value=x.kind||'KARYAWAN';
    form.elements.phone.value=x.phone||'';
    form.elements.job_title.value=x.job_title||'';
    form.elements.joined_on.value=x.joined_on||'';
    form.elements.notes.value=x.notes||'';
    save.textContent='Simpan Perubahan';
    cancel.hidden=false;
    form.scrollIntoView({behavior:'smooth',block:'start'});
  });
  root.querySelectorAll('[data-toggle-employee]').forEach(btn=>btn.onclick=async()=>{
    const x=rows.find(v=>v.id===btn.dataset.toggleEmployee);if(!x)return;
    const {error}=await db.from('employees').update({active:!x.active}).eq('id',x.id);
    if(error)return msg(error.message);
    await employeeMasterPage();
    msg(x.active?'Karyawan/ABK dinonaktifkan.':'Karyawan/ABK diaktifkan kembali.',true);
  });
  form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),id=fd.get('id');
    const o={
      name:fd.get('name'),
      kind:fd.get('kind'),
      phone:fd.get('phone')||null,
      job_title:fd.get('job_title')||null,
      joined_on:fd.get('joined_on')||null,
      notes:fd.get('notes')||null
    };
    const q=id?db.from('employees').update(o).eq('id',id):db.from('employees').insert(o);
    const {error}=await q;
    if(error)return msg(error.message);
    await employeeMasterPage();
    msg(id?'Data karyawan diperbarui.':'Data karyawan tersimpan.',true);
  };
}

async function users(){
  if(!['ADMIN','OWNER'].includes(profile.role))return layout('<p>Akses hanya untuk Administrator dan Owner.</p>');
  if(profile.role==='OWNER'){
    const {data,error}=await db.from('profiles').select('user_id,full_name,role,active').order('full_name',{ascending:true});
    const rows=data||[];
    const rolesList=['ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER'];
    layout('<section class="panel"><h3>Master Pengguna</h3><p class="muted">Mode Owner · baca saja. Pembuatan, perubahan role, aktivasi/nonaktif, dan password tetap khusus Administrator.</p>'+
      '<div class="tablewrap"><table id="usersMasterTable"><thead><tr><th>Nama</th><th>Role</th><th>Status</th></tr></thead><tbody>'+
      rows.map(x=>'<tr><td>'+esc(x.full_name||'-')+'</td><td>'+esc(x.role||'-')+'</td><td>'+(x.active?'Aktif':'Nonaktif')+'</td></tr>').join('')+
      '</tbody></table></div>'+(!rows.length?'<p>Belum ada pengguna.</p>':'')+'</section>');
    attachListFilter({tableId:'usersMasterTable',fields:[
      {label:'Nama',col:0,placeholder:'Nama pengguna'},
      {label:'Role',col:1,type:'select',options:rolesList},
      {label:'Status',col:2,type:'select',options:['Aktif','Nonaktif']}
    ]});
    if(error)msg(error.message);
    return;
  }

  const {data,error}=await db.rpc('admin_list_bms_users');
  const rows=data||[];
  const rolesList=['ADMIN','LOGISTIK','PPL','MARKETING','KEUANGAN','OWNER'];

  let html='<section class="panel"><h3>Master Pengguna</h3>'+
    '<form id="createUserForm" class="form-vertical">'+
      '<label>Nama<input name="name" required></label>'+
      '<label>Email<input name="email" type="email" required></label>'+
      '<label>Role<select name="role">'+rolesList.map(r=>'<option value="'+r+'">'+r+'</option>').join('')+'</select></label>'+
      '<label>Password Awal<div class="password-wrap"><input id="newUserPassword1" name="password" type="password" autocomplete="new-password" required><button type="button" data-toggle-user-password="newUserPassword1">Lihat</button></div></label>'+
      '<label>Konfirmasi Password<div class="password-wrap"><input id="newUserPassword2" name="confirm_password" type="password" autocomplete="new-password" required><button type="button" data-toggle-user-password="newUserPassword2">Lihat</button></div></label>'+
      '<button type="submit">Buat Pengguna</button>'+
    '</form>'+
    '<p class="muted">Akun dibuat langsung oleh Administrator dan tidak memerlukan konfirmasi email.</p>'+
    '</section>';

  html+='<section class="panel"><h3>Daftar Pengguna</h3><div class="tablewrap"><table id="usersMasterTable"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    rows.map(x=>'<tr><td>'+esc(x.full_name)+'</td><td>'+esc(x.email||'')+'</td><td>'+esc(x.role)+'</td><td>'+(x.active?'Aktif':'Nonaktif')+'</td><td>'+
      '<button type="button" data-edit-user="'+esc(x.user_id)+'">Edit</button> '+
      '<button type="button" data-toggle-user="'+esc(x.user_id)+'">'+(x.active?'Nonaktifkan':'Aktifkan')+'</button>'+
    '</td></tr>').join('')+
    '</tbody></table></div>'+(!rows.length?'<p>Belum ada pengguna.</p>':'')+'</section>';

  html+='<section class="panel" id="editUserPanel" hidden><h3>Edit Pengguna</h3>'+
    '<form id="editUserForm" class="form-vertical">'+
      '<input type="hidden" name="user_id">'+
      '<label>Nama<input name="name" required></label>'+
      '<label>Email<input name="email" type="email" readonly></label>'+
      '<label>Role<select name="role">'+rolesList.map(r=>'<option value="'+r+'">'+r+'</option>').join('')+'</select></label>'+
      '<label>Status<select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>'+
      '<button type="submit">Simpan Perubahan</button>'+
      '<button type="button" id="cancelUserEdit">Batal</button>'+
    '</form></section>';

  layout(html);
  attachListFilter({tableId:'usersMasterTable',fields:[
    {label:'Nama',col:0,placeholder:'Nama pengguna'},
    {label:'Email',col:1,placeholder:'Email'},
    {label:'Role',col:2,type:'select',options:rolesList},
    {label:'Status',col:3,type:'select',options:['Aktif','Nonaktif']}
  ]});
  if(error)msg(error.message);

  document.querySelectorAll('[data-toggle-user-password]').forEach(btn=>btn.onclick=()=>{
    const input=document.getElementById(btn.dataset.toggleUserPassword);
    if(!input)return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    btn.textContent=show?'Tutup':'Lihat';
  });

  document.getElementById('createUserForm').onsubmit=async ev=>{
    ev.preventDefault();
    const form=ev.currentTarget;
    const fd=new FormData(form);
    const p1=fd.get('password');
    const p2=fd.get('confirm_password');
    if(p1!==p2)return msg('Konfirmasi password tidak sama.');
    if(String(p1).length<8)return msg('Password minimal 8 karakter.');

    const {data:fnData,error:fnError}=await db.functions.invoke('admin-create-bms-user',{
      body:{
        name:fd.get('name'),
        email:fd.get('email'),
        role:fd.get('role'),
        password:p1
      }
    });
    if(fnError)return msg(fnError.message);
    if(fnData?.error)return msg(fnData.error);
    await users();
    msg('Pengguna berhasil dibuat dan langsung aktif.',true);
  };

  const panel=document.getElementById('editUserPanel');
  const editForm=document.getElementById('editUserForm');
  document.getElementById('cancelUserEdit').onclick=()=>{panel.hidden=true;editForm.reset();};

  root.querySelectorAll('[data-edit-user]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.user_id===btn.dataset.editUser);if(!x)return;
    editForm.elements.user_id.value=x.user_id;
    editForm.elements.name.value=x.full_name||'';
    editForm.elements.email.value=x.email||'';
    editForm.elements.role.value=x.role;
    editForm.elements.active.value=String(!!x.active);
    panel.hidden=false;
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  });

  root.querySelectorAll('[data-toggle-user]').forEach(btn=>btn.onclick=async()=>{
    const x=rows.find(v=>v.user_id===btn.dataset.toggleUser);if(!x)return;
    const {error}=await db.rpc('admin_update_bms_user',{
      p_user_id:x.user_id,
      p_name:x.full_name,
      p_role:x.role,
      p_active:!x.active
    });
    if(error)return msg(error.message);
    await users();
    msg(x.active?'Pengguna dinonaktifkan.':'Pengguna diaktifkan kembali.',true);
  });

  editForm.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(editForm);
    const {error}=await db.rpc('admin_update_bms_user',{
      p_user_id:fd.get('user_id'),
      p_name:fd.get('name'),
      p_role:fd.get('role'),
      p_active:fd.get('active')==='true'
    });
    if(error)return msg(error.message);
    await users();
    msg('Data pengguna diperbarui.',true);
  };
}
