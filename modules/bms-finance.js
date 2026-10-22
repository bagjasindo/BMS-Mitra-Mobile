async function financeBopPage(){
  const [br,ar,cr,bopr,accessr,abr,er]=await Promise.all([
    db.from('barns').select('id,code,name').order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,created_at').order('start_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('bop').select('id,contract_assignment_id,barn_id,incurred_on,category,amount,paid_by,source_type,source_id,reference,notes').order('incurred_on',{ascending:false}).order('id',{ascending:false}),
    db.from('finance_bop_period_access').select('contract_assignment_id,is_open'),
    db.from('logistics_contract_assignment_abks').select('contract_assignment_id,abk_id'),
    db.from('employees').select('id,code,name,kind').eq('kind','ABK')
  ]);
  const barns=br.data||[],assignments=ar.data||[],contractsRows=cr.data||[],rows=bopr.data||[],abkLinks=abr.data||[],abkEmployees=er.data||[];
  const bopAccess=new Map((accessr.data||[]).map(x=>[x.contract_assignment_id,x.is_open]));
  const err=[br,ar,cr,bopr,accessr,abr,er].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  window.__financeBopState=window.__financeBopState||{barn:'',assignment:'',abk:'',filterBarn:'',filterAssignment:'',from:'',to:'',shown:false,editId:''};
  const st=window.__financeBopState;
  const editRow=rows.find(x=>x.id===st.editId)||null;
  const selectedBarn=editRow?.barn_id||st.barn||'';
  const cycleOptions=selectedBarn?assignments.filter(a=>a.barn_id===selectedBarn):[];
  const selectedAssignment=editRow?.contract_assignment_id||st.assignment||'';
  const selectedAbk=(editRow?.source_type==='ABK_WAGE'?editRow.source_id:st.abk)||'';
  const assignmentAbkIds=new Set(abkLinks.filter(x=>x.contract_assignment_id===selectedAssignment).map(x=>x.abk_id));
  const assignmentAbks=abkEmployees.filter(x=>assignmentAbkIds.has(x.id));
  const abkName=id=>{const e=abkEmployees.find(x=>x.id===id);return e?(e.code?e.code+' · ':'')+e.name:'-';};

  const filterRows=st.shown?rows.filter(x=>
    (!st.filterBarn||x.barn_id===st.filterBarn)&&
    (!st.filterAssignment||x.contract_assignment_id===st.filterAssignment)&&
    (!st.from||String(x.incurred_on||'')>=st.from)&&
    (!st.to||String(x.incurred_on||'')<=st.to)
  ):[];
  const wageRows=filterRows.filter(x=>x.category==='UPAH_ABK'&&x.source_type==='ABK_WAGE'&&x.source_id);
  const wageByAbk=new Map();
  wageRows.forEach(x=>wageByAbk.set(x.source_id,(wageByAbk.get(x.source_id)||0)+prodNum(x.amount)));
  const wageRecap=[...wageByAbk.entries()].map(([abkId,amount])=>({abkId,amount})).sort((a,b)=>abkName(a.abkId).localeCompare(abkName(b.abkId),'id'));
  const wageTotal=wageRecap.reduce((n,x)=>n+x.amount,0);

  const assignmentText=id=>{
    const a=assignments.find(x=>x.id===id);
    if(!a)return '-';
    const b=barns.find(x=>x.id===a.barn_id);
    const k=contractsRows.find(x=>x.id===a.master_contract_id);
    return (b?shortBarnLabel(b):'-')+' · '+assignmentCycleLabel(assignments,a)+' · '+(k?.number||'-')+' · '+(a.active?'PROSES':bopAccess.get(a.id)?'CLOSED · BOP TERBUKA':'CLOSED · BOP TERKUNCI');
  };

  let html='<section class="panel"><h3>'+(editRow?'Edit BOP Produksi':'Tambah BOP Produksi')+'</h3>'+
    '<p class="muted">Khusus biaya operasional satu siklus. Gaji ABK, listrik, gas, air, sekam, sanitasi, transportasi dan kebutuhan produksi dicatat di sini. Perawatan jangka panjang gunakan menu Perawatan Kandang.</p>'+
    '<form id="bopKandangForm" class="form-vertical">'+
      '<label>Kandang<select id="bopBarn" name="barn_id" required><option value="">Pilih Kandang</option>'+
        barns.map(b=>'<option value="'+esc(b.id)+'" '+(selectedBarn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+
      '</select></label>'+
      '<label>Siklus / Periode<select id="bopAssignment" name="contract_assignment_id" required '+(!selectedBarn?'disabled':'')+'><option value="">Pilih Siklus / Periode</option>'+
        cycleOptions.map(a=>'<option value="'+esc(a.id)+'" '+(selectedAssignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':bopAccess.get(a.id)?'CLOSED · BOP TERBUKA':'CLOSED · BOP TERKUNCI'))+'</option>').join('')+
      '</select></label>'+
      '<label>Tanggal<input name="incurred_on" type="date" value="'+esc(editRow?.incurred_on||today)+'" required></label>'+
      '<label>Kategori<select name="category" required>'+
        '<option value="">Pilih Kategori</option>'+
        '<option value="OVK" '+(editRow?.category==='OVK'?'selected':'')+'>OVK</option>'+
        '<option value="UPAH_ABK" '+(editRow?.category==='UPAH_ABK'?'selected':'')+'>Upah ABK</option>'+
        '<option value="KONSUMSI" '+(editRow?.category==='KONSUMSI'?'selected':'')+'>Konsumsi</option>'+
        (editRow?.category==='TENAGA_KERJA'?'<option value="TENAGA_KERJA" selected>Tenaga Kerja (histori lama)</option>':'')+
        '<option value="TRANSPORTASI" '+(editRow?.category==='TRANSPORTASI'?'selected':'')+'>Transportasi</option>'+
        '<option value="LISTRIK" '+(editRow?.category==='LISTRIK'?'selected':'')+'>Listrik</option>'+
        '<option value="GAS" '+(editRow?.category==='GAS'?'selected':'')+'>Gas</option>'+
        '<option value="AIR" '+(editRow?.category==='AIR'?'selected':'')+'>Air</option>'+
        '<option value="SEKAM" '+(editRow?.category==='SEKAM'?'selected':'')+'>Sekam</option>'+
        '<option value="SANITASI" '+(editRow?.category==='SANITASI'?'selected':'')+'>Sanitasi</option>'+
        '<option value="OPERASIONAL" '+(editRow?.category==='OPERASIONAL'?'selected':'')+'>Operasional Produksi Lain</option>'+

        '<option value="LAINNYA" '+(editRow?.category==='LAINNYA'?'selected':'')+'>Lainnya</option>'+
      '</select></label>'+
      '<label id="bopAbkWrap" style="display:'+(editRow?.category==='UPAH_ABK'?'':'none')+'">Nama ABK<select id="bopAbk" name="abk_id"><option value="">Pilih ABK</option>'+
        assignmentAbks.map(e=>'<option value="'+esc(e.id)+'" '+(selectedAbk===e.id?'selected':'')+'>'+esc((e.code?e.code+' · ':'')+e.name)+'</option>').join('')+
      '</select></label>'+
      '<p class="muted">Untuk kategori Upah ABK, Nama ABK wajib dipilih dari ABK yang terdaftar pada siklus tersebut. Transaksi tetap menjadi BOP Produksi dan masuk Arus Kas sebagai pengeluaran.</p>'+
      '<label>No. Bukti / Referensi<input name="reference" value="'+esc(editRow?.reference||'')+'" placeholder="Nomor nota / transfer / bukti Excel"></label>'+
      '<label>Nominal (Rp)<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(editRow?fmtNumber(editRow.amount):'')+'" required></label>'+
      ''+
      '<label>Catatan<textarea name="notes" placeholder="Opsional">'+esc(editRow?.notes||'')+'</textarea></label>'+
      '<p class="muted">Siklus CLOSED dapat dilengkapi BOP setelah ADMIN membuka pencatatan. Status produksi tetap CLOSED.</p>'+
      (profile?.role==='ADMIN'?'<div class="report-actions"><button type="button" id="bopAccessOpen">Buka Pencatatan BOP</button><button type="button" id="bopAccessLock">Kunci Pencatatan BOP</button></div>':'')+
      '<div class="report-actions"><button type="submit">'+(editRow?'Simpan Perubahan':'Simpan')+'</button>'+(editRow?'<button type="button" id="bopEditCancel">Batal Edit</button>':'')+'</div>'+
    '</form></section>'+
    '<section class="panel" id="bopKandangPrintArea"><div class="rhpp-section-head"><div><h3>Data BOP Produksi</h3></div><div class="report-actions"><button type="button" id="bopKandangPrint">Cetak / PDF</button><button type="button" id="bopKandangPrintExcel">Excel</button></div></div>'+
      '<form id="bopKandangFilter" class="form-vertical">'+
        '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.filterBarn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
        '<label>Siklus<select name="assignment" '+(!st.filterBarn?'disabled':'')+'><option value="">Semua Siklus</option>'+
          assignments.filter(a=>a.barn_id===st.filterBarn).map(a=>'<option value="'+esc(a.id)+'" '+(st.filterAssignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':bopAccess.get(a.id)?'CLOSED · BOP TERBUKA':'CLOSED · BOP TERKUNCI'))+'</option>').join('')+
        '</select></label>'+
        '<label>Tanggal Dari<input name="from" type="date" value="'+esc(st.from||'')+'"></label>'+
        '<label>Tanggal Sampai<input name="to" type="date" value="'+esc(st.to||'')+'"></label>'+
        '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="bopKandangReset">Reset</button></div>'+
      '</form>'+
      (st.shown?
        '<div class="rhpp-summary-card"><span>Total BOP</span><strong>Rp '+prodFmt(filterRows.reduce((n,x)=>n+prodNum(x.amount),0),0)+'</strong></div>'+
        '<div class="rhpp-section-head"><div><h4>Rekap Upah ABK</h4><p class="muted">Hanya transaksi kategori Upah ABK pada hasil filter ini.</p></div></div>'+
        (wageRecap.length?
          '<div class="tablewrap"><table><thead><tr><th>Nama ABK</th><th>Total Upah Tercatat</th></tr></thead><tbody>'+
            wageRecap.map(x=>'<tr><td>'+esc(abkName(x.abkId))+'</td><td><strong>Rp '+prodFmt(x.amount,0)+'</strong></td></tr>').join('')+
          '</tbody><tfoot><tr><th>TOTAL UPAH ABK</th><th>Rp '+prodFmt(wageTotal,0)+'</th></tr></tfoot></table></div>'
          :'<p class="muted">Belum ada transaksi Upah ABK pada hasil filter ini.</p>')+
        '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Siklus</th><th>Kategori</th><th>ABK</th><th>Nominal</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>'+
          filterRows.map(x=>{const a=assignments.find(v=>v.id===x.contract_assignment_id);return '<tr><td>'+prodDateId(x.incurred_on)+'</td><td>'+esc(a?assignmentCycleLabel(assignments,a):'-')+'</td><td>'+esc(String(x.category||'').replaceAll('_',' '))+'</td><td>'+esc(x.source_type==='ABK_WAGE'?abkName(x.source_id):'-')+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>'+esc(financeOriginalNoteDisplay(x.notes))+'</td><td><div class="inline-actions"><button type="button" data-edit-bop="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('bop',x.id)+'</div></td></tr>';}).join('')+
        '</tbody><tfoot><tr><th colspan="4">TOTAL BOP</th><th>Rp '+prodFmt(filterRows.reduce((n,x)=>n+prodNum(x.amount),0),0)+'</th><th></th><th></th></tr></tfoot></table></div>'+(filterRows.length?'':'<p class="muted">Tidak ada BOP sesuai filter.</p>')
        :'<p class="muted">Pilih filter lalu tekan Tampilkan.</p>')+
    '</section>';

  layout(html);
  bindNumberInputs();
  if(err)msg(err.message);

  const barnSel=document.getElementById('bopBarn');
  if(barnSel)barnSel.onchange=async()=>{
    st.barn=barnSel.value||'';
    st.assignment='';st.abk='';
    await financeBopPage();
  };
  const assignmentSel=document.getElementById('bopAssignment');
  if(assignmentSel)assignmentSel.onchange=async()=>{st.assignment=assignmentSel.value||'';st.abk='';await financeBopPage();};
  const categorySel=document.querySelector('#bopKandangForm select[name="category"]');
  const abkWrap=document.getElementById('bopAbkWrap'),abkSel=document.getElementById('bopAbk');
  const syncBopAbk=()=>{const wage=categorySel?.value==='UPAH_ABK';if(abkWrap)abkWrap.style.display=wage?'':'none';if(abkSel)abkSel.required=!!wage;};
  if(categorySel)categorySel.onchange=syncBopAbk;
  syncBopAbk();

  const form=document.getElementById('bopKandangForm');
  const setBopAccess=async isOpen=>{
    const id=String(form?.elements.contract_assignment_id.value||'');
    const a=assignments.find(x=>x.id===id);
    if(!a)return msg('Pilih kandang dan siklus dahulu.');
    if(a.active)return msg('Siklus PROSES sudah dapat dicatat BOP. Pilih siklus CLOSED.');
    if(!await appConfirm((isOpen?'Buka':'Kunci')+' pencatatan BOP untuk '+assignmentText(id)+'? Status produksi tetap CLOSED.'))return;
    const result=await db.rpc('admin_set_finance_bop_period_access',{p_assignment_id:id,p_is_open:isOpen});
    if(result.error)return msg(result.error.message);
    st.barn=a.barn_id;st.assignment=id;
    await financeBopPage();msg(isOpen?'Pencatatan BOP dibuka; produksi tetap CLOSED.':'Pencatatan BOP dikunci kembali.',true);
  };
  const openBop=document.getElementById('bopAccessOpen'),lockBop=document.getElementById('bopAccessLock');
  if(openBop)openBop.onclick=()=>setBopAccess(true);
  if(lockBop)lockBop.onclick=()=>setBopAccess(false);
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    const assignmentId=String(fd.get('contract_assignment_id')||'');
    const a=assignments.find(x=>x.id===assignmentId);
    if(!a)return msg('Pilih siklus / periode.');
    const amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<0)return msg('Nominal BOP tidak valid.');
    const category=String(fd.get('category')||'');
    const abkId=String(fd.get('abk_id')||'');
    if(category==='UPAH_ABK'&&!assignmentAbks.some(x=>x.id===abkId))return msg('Pilih Nama ABK yang terdaftar pada siklus ini.');
    const payload={
      contract_assignment_id:assignmentId,
      barn_id:a.barn_id,
      incurred_on:fd.get('incurred_on'),
      category,
      amount,
      paid_by:'COMPANY',reference:String(fd.get('reference')||'').trim()||null,
      notes:fd.get('notes')||null,
      source_type:category==='UPAH_ABK'?'ABK_WAGE':(editRow?.source_type==='ABK_WAGE'?null:editRow?.source_type||null),
      source_id:category==='UPAH_ABK'?abkId:(editRow?.source_type==='ABK_WAGE'?null:editRow?.source_id||null)
    };
    if(payload.reference&&rows.some(x=>x.id!==editRow?.id&&String(x.reference||'').trim().toLowerCase()===payload.reference.toLowerCase()))return msg('Nomor bukti sudah tercatat di kamar ini. Periksa transaksi lama; jangan input ulang.');
    if(!await appConfirm('Tujuan: '+'BOP Produksi · '+assignmentText(assignmentId)+'\nTanggal: '+payload.incurred_on+'\nNominal: Rp '+prodFmt(amount,0)+'\n\nSimpan transaksi?'))return;
    const {error}=editRow?await db.from('bop').update(payload).eq('id',editRow.id):await db.from('bop').insert(payload);
    if(error)return msg(error.message);
    st.editId='';
    const keepBarn=st.barn,keepAssignment=st.assignment;
    await financeBopPage();
    window.__financeBopState.barn=keepBarn;
    window.__financeBopState.assignment=keepAssignment;
    msg(editRow?'BOP Produksi berhasil diperbarui.':'BOP Produksi berhasil disimpan ke '+assignmentText(assignmentId)+'.',true);
  };

  root.querySelectorAll('[data-edit-bop]').forEach(btn=>btn.onclick=async()=>{st.editId=btn.dataset.editBop||'';const row=rows.find(x=>x.id===st.editId);if(row){st.barn=row.barn_id||'';st.assignment=row.contract_assignment_id||'';}await financeBopPage();document.getElementById('bopKandangForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('bopEditCancel');if(cancelEdit)cancelEdit.onclick=async()=>{st.editId='';await financeBopPage();};
  bindAdminTransactionDeletes(()=>financeBopPage());
  const filter=document.getElementById('bopKandangFilter');
  if(filter){
    filter.elements.barn.onchange=async()=>{
      st.filterBarn=filter.elements.barn.value||'';
      st.filterAssignment='';
      st.shown=false;
      await financeBopPage();
    };
    filter.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(filter);
      st.filterBarn=String(fd.get('barn')||'');
      st.filterAssignment=st.filterBarn?String(fd.get('assignment')||''):'';
      st.from=String(fd.get('from')||'');
      st.to=String(fd.get('to')||'');
      if(st.from&&st.to&&st.from>st.to){const t=st.from;st.from=st.to;st.to=t;}
      st.shown=true;
      await financeBopPage();
    };
  }
  const bopPrint=document.getElementById('bopKandangPrint');if(bopPrint)bopPrint.onclick=()=>printFinanceDocument('bopKandangPrintArea','Laporan BOP Produksi');const bopExcel=document.getElementById('bopKandangPrintExcel');if(bopExcel)bopExcel.onclick=()=>exportFinanceDocumentExcel('bopKandangPrintArea','Laporan BOP Produksi');
  const reset=document.getElementById('bopKandangReset');
  if(reset)reset.onclick=async()=>{
    st.filterBarn='';st.filterAssignment='';st.from='';st.to='';st.shown=false;
    await financeBopPage();
  };
}


async function financeMaintenancePage(){
  const [br,mr,ar]=await Promise.all([
    db.from('barns').select('id,code,name').order('code',{ascending:true}),
    db.from('barn_maintenance_costs').select('id,barn_id,incurred_on,category,amount,paid_by,reference,notes,created_at').order('incurred_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('barn_assets').select('reference').not('reference','is',null)
  ]);
  const assetRefs=new Set((ar.data||[]).map(x=>String(x.reference||'').trim()).filter(Boolean));
  const barns=br.data||[],rows=(mr.data||[]).filter(x=>!assetRefs.has(String(x.reference||'').trim()));
  const err=[br,mr,ar].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  window.__financeMaintenanceState=window.__financeMaintenanceState||{filterBarn:'',from:'',to:'',shown:false,editId:''};
  const st=window.__financeMaintenanceState;
  const editRow=rows.find(x=>x.id===st.editId)||null;
  const barnName=id=>{const b=barns.find(x=>x.id===id);return b?shortBarnLabel(b):'-';};
  const visible=st.shown?rows.filter(x=>
    (!st.filterBarn||x.barn_id===st.filterBarn)&&
    (!st.from||String(x.incurred_on||'')>=st.from)&&
    (!st.to||String(x.incurred_on||'')<=st.to)
  ):[];
  const totalVisible=visible.reduce((n,x)=>n+prodNum(x.amount),0);

  let html='<section class="panel"><h3>'+(editRow?'Edit Perawatan Kandang':'Perawatan Kandang')+'</h3>'+
    '<p class="muted"><strong>Tidak terkait siklus produksi.</strong> Perawatan melekat ke kandang fisik dan dapat dicatat kapan saja: sebelum chick-in, saat produksi, setelah panen, atau saat kandang kosong.</p>'+
    '<form id="maintenanceForm" class="form-vertical">'+
      '<label>Kandang<select name="barn_id" required><option value="">Pilih Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(editRow?.barn_id===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Tanggal<input name="incurred_on" type="date" value="'+esc(editRow?.incurred_on||today)+'" required></label>'+
      '<label>Jenis<select name="category" required><option value="">Pilih Jenis</option><option value="TENAGA_KERJA_PERAWATAN" '+(editRow?.category==='TENAGA_KERJA_PERAWATAN'?'selected':'')+'>Tenaga Kerja Perawatan</option><option value="PERBAIKAN_BANGUNAN" '+(editRow?.category==='PERBAIKAN_BANGUNAN'?'selected':'')+'>Perbaikan Bangunan</option><option value="PERBAIKAN_LISTRIK" '+(editRow?.category==='PERBAIKAN_LISTRIK'?'selected':'')+'>Perbaikan Listrik</option><option value="PERBAIKAN_AIR" '+(editRow?.category==='PERBAIKAN_AIR'?'selected':'')+'>Perbaikan Air / Plumbing</option><option value="PERBAIKAN_PERALATAN" '+(editRow?.category==='PERBAIKAN_PERALATAN'?'selected':'')+'>Perbaikan Peralatan Kandang</option><option value="PENGGANTIAN_KOMPONEN" '+(editRow?.category==='PENGGANTIAN_KOMPONEN'?'selected':'')+'>Penggantian Komponen</option><option value="RENOVASI" '+(editRow?.category==='RENOVASI'?'selected':'')+'>Renovasi</option><option value="PERAWATAN_JANGKA_PANJANG" '+(editRow?.category==='PERAWATAN_JANGKA_PANJANG'?'selected':'')+'>Perawatan Jangka Panjang</option><option value="PERALATAN" '+(editRow?.category==='PERALATAN'?'selected':'')+'>Peralatan Kandang</option><option value="LAINNYA" '+(editRow?.category==='LAINNYA'?'selected':'')+'>Lainnya</option></select></label>'+
      '<p class="muted">Transaksi ini mencatat biaya usaha. Sumber uang pembayaran tidak dibedakan di sistem.</p>'+
      '<label>No. Bukti / Referensi<input name="reference" value="'+esc(editRow?.reference||'')+'" placeholder="Nomor nota / transfer / bukti Excel"></label>'+
      '<label>Nominal (Rp)<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(editRow?fmtNumber(editRow.amount):'')+'" required></label>'+
      '<label>Catatan<textarea name="notes" placeholder="Contoh: ganti dinamo blower">'+esc(editRow?.notes||'')+'</textarea></label>'+
      '<div class="report-actions"><button type="submit">'+(editRow?'Simpan Perubahan':'Simpan Perawatan')+'</button>'+(editRow?'<button type="button" id="maintenanceEditCancel">Batal Edit</button>':'')+'</div>'+
    '</form></section>'+
    '<section class="panel" id="maintenancePrintArea"><div class="rhpp-section-head"><div><h3>Riwayat Perawatan Kandang</h3></div><div class="report-actions"><button type="button" id="maintenancePrint">Cetak / PDF</button><button type="button" id="maintenancePrintExcel">Excel</button></div></div>'+
      '<form id="maintenanceFilter" class="form-vertical">'+
        '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.filterBarn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
        '<label>Tanggal Dari<input name="from" type="date" value="'+esc(st.from||'')+'"></label>'+
        '<label>Tanggal Sampai<input name="to" type="date" value="'+esc(st.to||'')+'"></label>'+
        '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="maintenanceReset">Reset</button></div>'+
      '</form>'+
      (st.shown?
        '<div class="rhpp-summary-card"><span>Total Perawatan</span><strong>Rp '+prodFmt(totalVisible,0)+'</strong></div>'+
        '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Kandang</th><th>Jenis</th><th>Nominal</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>'+
          visible.map(x=>'<tr><td>'+prodDateId(x.incurred_on)+'</td><td>'+esc(barnName(x.barn_id))+'</td><td>'+esc(String(x.category||'').replaceAll('_',' '))+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>'+esc(financeOriginalNoteDisplay(x.notes))+'</td><td><div class="inline-actions"><button type="button" data-edit-maintenance="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('barn_maintenance_costs',x.id)+'</div></td></tr>').join('')+
        '</tbody><tfoot><tr><th colspan="3">TOTAL</th><th>Rp '+prodFmt(totalVisible,0)+'</th><th></th><th></th></tr></tfoot></table></div>'+
        (visible.length?'':'<p class="muted">Belum ada perawatan sesuai filter.</p>')
        :'<p class="muted">Pilih filter lalu tekan Tampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);

  const form=document.getElementById('maintenanceForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    const barnId=String(fd.get('barn_id')||'');
    if(!barns.find(x=>x.id===barnId))return msg('Pilih kandang.');
    const amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<=0)return msg('Nominal perawatan harus lebih dari 0.');
    const payload={contract_assignment_id:null,barn_id:barnId,incurred_on:String(fd.get('incurred_on')||''),category:String(fd.get('category')||''),amount,paid_by:'COMPANY',reference:String(fd.get('reference')||'').trim()||null,notes:String(fd.get('notes')||'')||null};
    if(payload.reference&&rows.some(x=>x.id!==editRow?.id&&String(x.reference||'').trim().toLowerCase()===payload.reference.toLowerCase()))return msg('Nomor bukti sudah tercatat di kamar ini. Periksa transaksi lama; jangan input ulang.');
    if(!await appConfirm('Tujuan: '+'Perawatan Kandang · '+barnName(barnId)+'\nTanggal: '+payload.incurred_on+'\nNominal: Rp '+prodFmt(amount,0)+'\n\nSimpan transaksi?'))return;
    const {error}=editRow?await db.from('barn_maintenance_costs').update(payload).eq('id',editRow.id):await db.from('barn_maintenance_costs').insert(payload);
    if(error)return msg(error.message);
    st.editId='';
    await financeMaintenancePage();
    msg(editRow?'Perawatan kandang berhasil diperbarui.':'Perawatan kandang tersimpan tanpa siklus produksi.',true);
  };

  root.querySelectorAll('[data-edit-maintenance]').forEach(btn=>btn.onclick=async()=>{st.editId=btn.dataset.editMaintenance||'';await financeMaintenancePage();document.getElementById('maintenanceForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('maintenanceEditCancel');if(cancelEdit)cancelEdit.onclick=async()=>{st.editId='';await financeMaintenancePage();};
  bindAdminTransactionDeletes(()=>{st.editId='';return financeMaintenancePage();});
  const filter=document.getElementById('maintenanceFilter');
  if(filter)filter.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(filter);
    st.filterBarn=String(fd.get('barn')||'');
    st.from=String(fd.get('from')||'');
    st.to=String(fd.get('to')||'');
    if(st.from&&st.to&&st.from>st.to){const t=st.from;st.from=st.to;st.to=t;}
    st.shown=true;
    await financeMaintenancePage();
  };
  const reset=document.getElementById('maintenanceReset');
  if(reset)reset.onclick=async()=>{
    st.filterBarn='';st.from='';st.to='';st.shown=false;
    await financeMaintenancePage();
  };
  const print=document.getElementById('maintenancePrint');
  if(print)print.onclick=()=>printFinanceDocument('maintenancePrintArea','Laporan Perawatan Kandang');const maintenanceExcel=document.getElementById('maintenancePrintExcel');if(maintenanceExcel)maintenanceExcel.onclick=()=>exportFinanceDocumentExcel('maintenancePrintArea','Laporan Perawatan Kandang');
}

async function logisticsEquipmentPurchasePage(editId=null){
  const [br,sr,ir,pr,ar,cpr,pyr]=await Promise.all([
    db.from('barns').select('id,code,name,active').order('code',{ascending:true}),
    db.from('suppliers').select('id,code,name,active,supplier_type').eq('active',true).order('code',{ascending:true}),
    db.from('items').select('id,code,name,category,ovk_type,unit,active').eq('active',true).eq('category','OVK').eq('ovk_type','OVK2').order('code',{ascending:true}),
    db.from('logistics_equipment_purchases').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('barn_assets').select('id,reference'),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle(),
    db.from('supplier_payments').select('source_id').eq('source_type','BELI_PERALATAN')
  ]);
  const barns=br.data||[],suppliers=sr.data||[],equipment=ir.data||[],purchases=pr.data||[],assets=ar.data||[],company=cpr.data||{},paidEquipment=new Set((pyr.data||[]).map(x=>x.source_id));
  window.__equipmentPurchaseHistoryFilter=window.__equipmentPurchaseHistoryFilter||{supplier:'',barn:'',from:'',to:'',shown:false};
  const equipmentHistoryFilter=window.__equipmentPurchaseHistoryFilter;
  const equipmentHistoryRows=equipmentHistoryFilter.shown?purchases.filter(p=>
    (!equipmentHistoryFilter.supplier||p.supplier_id===equipmentHistoryFilter.supplier)&&
    (!equipmentHistoryFilter.barn||p.barn_id===equipmentHistoryFilter.barn)&&
    (!equipmentHistoryFilter.from||String(p.purchase_date||'')>=equipmentHistoryFilter.from)&&
    (!equipmentHistoryFilter.to||String(p.purchase_date||'')<=equipmentHistoryFilter.to)
  ):[];
  const err=[br,sr,ir,pr,ar,cpr,pyr].find(x=>x.error)?.error;
  const selected=editId?purchases.find(x=>x.id===editId):null;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const itemName=id=>{const x=equipment.find(v=>v.id===id);return x?x.code+' · '+x.name:'-'};
  const supplierName=id=>{const x=suppliers.find(v=>v.id===id);return x?((x.code||'')+' · '+x.name):'-'};
  const barnName=id=>{const x=barns.find(v=>v.id===id);return x?shortBarnLabel(x):'-'};
  const assetRef=id=>assets.find(x=>x.id===id)?.reference||'-';

  let html='<section class="panel"><h3>'+(selected?'Koreksi Beli Peralatan':'Beli Peralatan · OVK2')+'</h3>'+
    '<p class="muted">Khusus barang Master Data berjenis <strong>OVK2 / Peralatan</strong>. Saat disimpan, sistem otomatis membuat Aset per Kandang dan Hutang Supplier. Tidak masuk BOP atau RHPP.</p>'+
    '<form id="equipmentPurchaseForm" class="form-vertical">'+
      '<input type="hidden" name="id" value="'+esc(selected?.id||'')+'">'+
      '<label>Tanggal Pembelian<input type="date" name="purchase_date" value="'+esc(selected?.purchase_date||today)+'" required></label>'+
      '<label>Supplier<select name="supplier_id" required><option value="">Pilih Supplier</option>'+suppliers.map(s=>'<option value="'+esc(s.id)+'" '+(selected?.supplier_id===s.id?'selected':'')+'>'+esc((s.code||'')+' · '+s.name)+'</option>').join('')+'</select></label>'+
      '<label>Peralatan OVK2<select name="item_id" required><option value="">Pilih Peralatan</option>'+equipment.map(i=>'<option value="'+esc(i.id)+'" '+(selected?.item_id===i.id?'selected':'')+'>'+esc(i.code+' · '+i.name+' · '+(i.unit||'-'))+'</option>').join('')+'</select></label>'+
      '<label>Kandang Tujuan<select name="barn_id" required><option value="">Pilih Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(selected?.barn_id===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Jumlah<input type="text" name="quantity" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.quantity):'')+'" required></label>'+
      '<label>Harga Beli / Satuan<input type="text" name="purchase_unit_price" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.purchase_unit_price):'')+'" required></label>'+
      '<label>No. Nota / Referensi<input name="reference_number" value="'+esc(selected?.reference_number||'')+'"></label>'+
      '<label>Catatan<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<div class="inline-actions"><button type="submit">'+(selected?'Simpan Koreksi':'Simpan Pembelian Peralatan')+'</button>'+(selected?'<button type="button" id="equipmentEditCancel">Batal Koreksi</button>':'')+'</div>'+
    '</form>'+
    (!equipment.length?'<p class="error">Belum ada barang OVK2 di Master Sapronak. Tambahkan/ubah barang menjadi Kategori OVK · Jenis OVK2 terlebih dahulu.</p>':'')+
    '</section>';

  html+='<section class="panel"><h3>Riwayat Beli Peralatan</h3>'+
    '<form id="equipmentPurchaseHistoryForm" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Supplier<select name="supplier"><option value="">Semua Supplier</option>'+suppliers.map(s=>'<option value="'+esc(s.id)+'" '+(equipmentHistoryFilter.supplier===s.id?'selected':'')+'>'+esc((s.code||'')+' · '+s.name)+'</option>').join('')+'</select></label>'+
      '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(equipmentHistoryFilter.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(equipmentHistoryFilter.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(equipmentHistoryFilter.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="equipmentPurchaseHistoryReset">Reset</button></div>'+
    '</form>'+
    (equipmentHistoryFilter.shown?'<div class="report-actions"><button type="button" id="equipmentHistoryPrint">Cetak</button> <button type="button" id="equipmentHistoryPdf">PDF</button> <button type="button" id="equipmentHistoryExcel">Excel</button></div><div class="tablewrap"><table id="equipmentHistoryTable"><thead><tr>'+
    '<th>Tanggal</th><th>Supplier</th><th>Peralatan</th><th>Kandang</th><th>Jumlah</th><th>Harga/Satuan</th><th>Total</th><th>Aset</th><th>Referensi</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    equipmentHistoryRows.map(p=>'<tr><td>'+esc(p.purchase_date||'')+'</td><td>'+esc(supplierName(p.supplier_id))+'</td><td>'+esc(itemName(p.item_id))+'</td><td>'+esc(barnName(p.barn_id))+'</td><td>'+fmtNumber(p.quantity)+'</td><td>Rp '+fmtNumber(p.purchase_unit_price)+'</td><td><strong>Rp '+fmtNumber(prodNum(p.quantity)*prodNum(p.purchase_unit_price))+'</strong></td><td>'+esc(assetRef(p.asset_id))+'</td><td>'+esc(p.reference_number||'-')+'</td><td>'+(paidEquipment.has(p.id)?'<strong>Terkunci · sudah dibayar</strong>':'<button type="button" data-edit-equipment="'+esc(p.id)+'">Edit</button> <button type="button" data-delete-equipment="'+esc(p.id)+'">Hapus</button>')+'</td></tr>').join('')+
    '</tbody></table></div>'+(equipmentHistoryRows.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);
  const equipmentHistoryForm=document.getElementById('equipmentPurchaseHistoryForm');
  const equipmentHistoryReset=document.getElementById('equipmentPurchaseHistoryReset');
  if(equipmentHistoryForm)equipmentHistoryForm.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(equipmentHistoryForm);
    equipmentHistoryFilter.supplier=String(fd.get('supplier')||'');equipmentHistoryFilter.barn=String(fd.get('barn')||'');equipmentHistoryFilter.from=String(fd.get('from')||'');equipmentHistoryFilter.to=String(fd.get('to')||'');
    if(equipmentHistoryFilter.from&&equipmentHistoryFilter.to&&equipmentHistoryFilter.from>equipmentHistoryFilter.to){const t=equipmentHistoryFilter.from;equipmentHistoryFilter.from=equipmentHistoryFilter.to;equipmentHistoryFilter.to=t}
    equipmentHistoryFilter.shown=true;await logisticsEquipmentPurchasePage();
  };
  if(equipmentHistoryReset)equipmentHistoryReset.onclick=async()=>{window.__equipmentPurchaseHistoryFilter={supplier:'',barn:'',from:'',to:'',shown:false};await logisticsEquipmentPurchasePage();};

  if(equipmentHistoryFilter.shown){
    const historyTable=document.getElementById('equipmentHistoryTable');
    const equipmentReportHtml=()=>{
      const supplier=suppliers.find(x=>x.id===equipmentHistoryFilter.supplier),barn=barns.find(x=>x.id===equipmentHistoryFilter.barn);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Beli Peralatan</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Beli Peralatan</h2><p>Periode: '+esc(equipmentHistoryFilter.from||'-')+' s/d '+esc(equipmentHistoryFilter.to||'-')+' · Supplier: '+esc(supplier?.name||'Semua Supplier')+' · Kandang: '+esc(barn?shortBarnLabel(barn):'Semua Kandang')+'</p>'+
        (historyTable?(()=>{const t=historyTable.cloneNode(true);t.querySelectorAll('tr').forEach(r=>{if(r.cells.length)r.deleteCell(r.cells.length-1)});return t.outerHTML})():'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const printEquipmentHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=equipmentReportHtml();w.document.write(pdf?html.replace('<title>Riwayat Beli Peralatan</title>','<title>Riwayat_Beli_Peralatan_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('equipmentHistoryPrint'),pdfBtn=document.getElementById('equipmentHistoryPdf'),excelBtn=document.getElementById('equipmentHistoryExcel');
    if(printBtn)printBtn.onclick=()=>printEquipmentHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(equipmentReportHtml(),'Riwayat_Beli_Peralatan.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const t=historyTable.cloneNode(true);t.querySelectorAll('tr').forEach(r=>{if(r.cells.length)r.deleteCell(r.cells.length-1)});const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Beli Peralatan</h2>'+t.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Beli_Peralatan.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };

  const form=document.getElementById('equipmentPurchaseForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    if(!equipment.length)return msg('Belum ada barang OVK2 di Master Data.');
    const fd=new FormData(form);
    const quantity=normalizeInputID(fd.get('quantity')),price=normalizeInputID(fd.get('purchase_unit_price'));
    if(quantity===null||quantity<=0)return msg('Jumlah pembelian tidak valid.');
    if(price===null||price<0)return msg('Harga pembelian tidak valid.');
    const item=equipment.find(x=>x.id===String(fd.get('item_id')||''));
    if(!item)return msg('Pilih peralatan OVK2 dari Master Data.');
    if(!await appConfirm('Simpan pembelian '+item.name+' dan otomatis buat Aset per Kandang serta Hutang Supplier?'))return;
    const {error}=await db.rpc('save_logistics_equipment_purchase_atomic',{
      p_id:String(fd.get('id')||'')||null,p_supplier_id:String(fd.get('supplier_id')||''),p_item_id:item.id,p_barn_id:String(fd.get('barn_id')||''),
      p_purchase_date:String(fd.get('purchase_date')||''),p_quantity:quantity,p_purchase_unit_price:price,
      p_reference_number:String(fd.get('reference_number')||'')||null,p_notes:String(fd.get('notes')||'')||null
    });
    if(error)return msg(error.message);
    await logisticsEquipmentPurchasePage();
    msg(selected?'Koreksi pembelian peralatan tersimpan dan aset terkait ikut diperbarui.':'Pembelian peralatan tersimpan. Aset dan Hutang Supplier dibuat otomatis tanpa masuk BOP/RHPP.',true);
  };
  root.querySelectorAll('[data-edit-equipment]').forEach(btn=>btn.onclick=()=>logisticsEquipmentPurchasePage(btn.dataset.editEquipment));
  root.querySelectorAll('[data-delete-equipment]').forEach(btn=>btn.onclick=async()=>{if(!await appConfirm('Hapus pembelian peralatan ini beserta aset terkait?'))return;const {error}=await db.rpc('delete_logistics_equipment_purchase_atomic',{p_id:btn.dataset.deleteEquipment});if(error)return msg(error.message);await logisticsEquipmentPurchasePage();msg('Pembelian peralatan dan aset terkait dihapus.',true);});
  const cancel=document.getElementById('equipmentEditCancel');if(cancel)cancel.onclick=()=>logisticsEquipmentPurchasePage();
}


async function financeStockPurchasePage(editId=null){
  const [shr,sir,ahr,adr,br]=await Promise.all([
    db.from('finance_stock_purchase_invoices').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('warehouse_stock_items').select('*').order('created_at',{ascending:true}),
    db.from('finance_asset_purchase_invoices').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_direct_purchases').select('id,invoice_id,standard_name,description,quantity,unit,unit_price,total_amount,linked_id').eq('purchase_type','ASSET').order('created_at',{ascending:true}),
    db.from('barns').select('id,code,name,active').eq('active',true).order('code',{ascending:true})
  ]);
  const stockInvoices=shr.data||[],stockItems=sir.data||[],assetInvoices=ahr.data||[],assetDetails=adr.data||[],barns=br.data||[];
  const selected=editId?stockInvoices.find(x=>x.id===editId):null;
  const err=[shr,sir,ahr,adr,br].find(x=>x.error)?.error;
  const today=prodToday();
  const stockLines=id=>stockItems.filter(x=>x.invoice_id===id);
  const assetLines=id=>assetDetails.filter(x=>x.invoice_id===id);
  const barnLabel=id=>{const x=barns.find(b=>b.id===id);return x?shortBarnLabel(x):'-';};

  window.__financeGoodsHistory=window.__financeGoodsHistory||{from:'',to:'',shown:false};
  const goodsHistoryState=window.__financeGoodsHistory;
  const history=[
    ...stockInvoices.map(h=>({
      id:h.id,source:'STOCK',date:h.purchase_date,created_at:h.created_at||'',reference:h.reference||'',supplier:h.supplier_name||'',
      destination:'Gudang',total:h.total_amount,method:h.payment_method,
      items:stockLines(h.id).map(x=>x.standard_name+' ('+prodFmt(x.quantity,2)+' '+x.unit+' · '+(x.stock_kind==='HABIS_PAKAI'?'Habis Pakai':'Aset')+')').join(', ')
    })),
    ...assetInvoices.map(h=>({
      id:h.id,source:'ASSET',date:h.purchase_date,created_at:h.created_at||'',reference:h.reference||'',supplier:h.supplier_name||'',
      destination:h.asset_location_type==='KANTOR'?'Kantor':barnLabel(h.barn_id),total:h.total_amount,method:h.payment_method,
      items:assetLines(h.id).map(x=>x.standard_name+' ('+prodFmt(x.quantity,2)+' '+x.unit+')').join(', ')
    }))
  ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const visibleHistory=goodsHistoryState.shown?history.filter(h=>
    (!goodsHistoryState.from||String(h.date||'')>=goodsHistoryState.from)&&
    (!goodsHistoryState.to||String(h.date||'')<=goodsHistoryState.to)
  ):[];

  let html='<section class="panel"><h3>'+(selected?'Koreksi Pembelian Stok Gudang':'Pembelian Barang')+'</h3>'+
    '<p class="muted"><strong>Satu pintu pembelian.</strong> Pilih tujuan <strong>Gudang</strong> jika barang belum dipakai. Pilih <strong>Kandang/Kantor</strong> jika barang langsung ditempatkan sebagai aset. Aset Kandang/Kantor akan dibuat otomatis.</p>'+
    '<form id="financeGoodsPurchaseForm" class="form-vertical"><input type="hidden" name="invoice_id" value="'+esc(selected?.id||'')+'">'+
      '<label>Tanggal Pembelian<input type="date" name="purchase_date" value="'+esc(selected?.purchase_date||today)+'" required></label>'+
      '<label>Supplier<input name="supplier_name" value="'+esc(selected?.supplier_name||'')+'" placeholder="Masukkan nama supplier"></label>'+
      '<label>Tujuan Barang<select name="destination_type" id="goodsDestination" required '+(selected?'disabled':'')+'><option value="GUDANG" '+(selected?'selected':'')+'>Gudang</option><option value="KANDANG">Kandang</option><option value="KANTOR">Kantor</option></select></label>'+
      '<label id="goodsBarnWrap" style="display:none">Kandang<select name="barn_id" id="goodsBarn"><option value="">Pilih Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'">'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Metode Pembayaran<select name="payment_method" required><option value="TRANSFER" '+(selected?.payment_method==='TRANSFER'?'selected':'')+'>Transfer</option><option value="TUNAI" '+(selected?.payment_method==='TUNAI'?'selected':'')+'>Tunai</option></select></label>'+
      '<label>Referensi / No. Nota<input name="reference" value="'+esc(selected?.reference||'')+'"></label>'+
      '<label>Catatan Nota<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<div class="tablewrap"><table><thead><tr><th>Nama Barang</th><th>Deskripsi</th><th>Jenis</th><th>Jumlah</th><th>Satuan</th><th>Harga/Satuan</th><th>Total</th><th></th></tr></thead><tbody id="goodsPurchaseRows"></tbody></table></div>'+
      '<div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-top:.75rem"><button type="button" id="addGoodsPurchaseItem">+ Barang</button><strong>Total Nota: <span id="goodsPurchaseTotal">Rp 0</span></strong></div>'+
      '<div class="inline-actions"><button type="submit">'+(selected?'Simpan Koreksi':'Simpan Pembelian')+'</button>'+(selected?'<button type="button" id="financeGoodsEditCancel">Batal Koreksi</button>':'')+'</div>'+
    '</form></section>';

  html+='<section class="panel"><h3>Riwayat Pembelian Barang</h3>'+
    '<form id="financeGoodsHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(goodsHistoryState.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(goodsHistoryState.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="financeGoodsHistoryReset">Reset</button></div>'+
    '</form>'+
    (goodsHistoryState.shown?'<div class="report-actions"><button type="button" id="goodsHistoryPrint">Cetak</button> <button type="button" id="goodsHistoryPdf">PDF</button> <button type="button" id="goodsHistoryExcel">Excel</button></div><div class="tablewrap"><table id="goodsHistoryTable"><thead><tr><th>Tanggal</th><th>No. Nota</th><th>Supplier</th><th>Tujuan</th><th>Barang</th><th>Total</th><th>Metode</th><th>Aksi</th></tr></thead><tbody>'+
    visibleHistory.map(h=>'<tr><td>'+prodDateId(h.date)+'</td><td>'+esc(h.reference||'-')+'</td><td>'+esc(h.supplier||'-')+'</td><td>'+esc(h.destination)+'</td><td>'+esc(h.items||'-')+'</td><td>Rp '+prodFmt(h.total,0)+'</td><td>'+esc(h.method||'-')+'</td><td>'+(h.source==='STOCK'?'<button type="button" data-edit-stock-invoice="'+esc(h.id)+'">Edit</button> '+(profile.role==='ADMIN'?'<button type="button" data-delete-stock-invoice="'+esc(h.id)+'">Hapus</button>':''):'Koreksi di menu Beli Aset')+'</td></tr>').join('')+
    '</tbody></table></div>'+(visibleHistory.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+'</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);

  const goodsHistoryFilter=document.getElementById('financeGoodsHistoryFilter');
  const goodsHistoryReset=document.getElementById('financeGoodsHistoryReset');
  if(goodsHistoryFilter)goodsHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(goodsHistoryFilter);goodsHistoryState.from=String(fd.get('from')||'');goodsHistoryState.to=String(fd.get('to')||'');if(goodsHistoryState.from&&goodsHistoryState.to&&goodsHistoryState.from>goodsHistoryState.to){const t=goodsHistoryState.from;goodsHistoryState.from=goodsHistoryState.to;goodsHistoryState.to=t}goodsHistoryState.shown=true;await financeStockPurchasePage();};
  if(goodsHistoryReset)goodsHistoryReset.onclick=async()=>{window.__financeGoodsHistory={from:'',to:'',shown:false};await financeStockPurchasePage();};
  if(goodsHistoryState.shown)bindTableExportActions({tableId:'goodsHistoryTable',printId:'goodsHistoryPrint',pdfId:'goodsHistoryPdf',excelId:'goodsHistoryExcel',title:'Riwayat Pembelian Barang',filename:'Riwayat_Pembelian_Barang',filterText:'Periode '+(goodsHistoryState.from||'-')+' s/d '+(goodsHistoryState.to||'-'),dropLast:true});

  const form=document.getElementById('financeGoodsPurchaseForm');
  const tbody=document.getElementById('goodsPurchaseRows');
  const totalEl=document.getElementById('goodsPurchaseTotal');
  const destination=document.getElementById('goodsDestination');
  const barnWrap=document.getElementById('goodsBarnWrap');
  const barnEl=document.getElementById('goodsBarn');

  const recalc=()=>{
    let t=0;
    tbody.querySelectorAll('tr').forEach(tr=>{
      const q=prodNum(tr.querySelector('[name="quantity"]')?.value);
      const p=prodNum(tr.querySelector('[name="unit_price"]')?.value);
      const v=q*p;t+=v;
      const e=tr.querySelector('.goodsLineTotal');if(e)e.textContent='Rp '+prodFmt(v,0);
    });
    totalEl.textContent='Rp '+prodFmt(t,0);
  };

  const syncDestination=()=>{
    const d=destination.value;
    barnWrap.style.display=d==='KANDANG'?'':'none';
    if(d!=='KANDANG')barnEl.value='';
    tbody.querySelectorAll('[name="stock_kind"]').forEach(sel=>{
      sel.disabled=d!=='GUDANG';
      if(d!=='GUDANG')sel.value='ASET';
      sel.title=d==='GUDANG'?'Jenis menentukan perilaku saat barang dikirim dari gudang':'Tujuan langsung Kandang/Kantor selalu menjadi aset';
    });
  };

  const addRow=(seed={})=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td><input name="standard_name" value="'+esc(seed.standard_name||'')+'" required></td><td><input name="description" value="'+esc(seed.description||'')+'"></td>'+
      '<td><select name="stock_kind" required><option value="ASET" '+(seed.stock_kind==='ASET'?'selected':'')+'>Aset</option><option value="HABIS_PAKAI" '+(seed.stock_kind==='HABIS_PAKAI'?'selected':'')+'>Habis Pakai</option></select></td>'+
      '<td><input name="quantity" data-number="1" inputmode="decimal" value="'+(seed.quantity!=null?prodFmt(seed.quantity,2):'')+'" required></td>'+
      '<td><input name="unit" value="'+esc(seed.unit||'')+'" placeholder="UNIT/PCS/ROLL" required></td>'+
      '<td><input name="unit_price" data-number="1" inputmode="decimal" value="'+(seed.unit_price!=null?prodFmt(seed.unit_price,0):'')+'" required></td>'+
      '<td class="goodsLineTotal">Rp 0</td><td><button type="button" class="removeGoodsPurchaseItem">Hapus</button></td>';
    tbody.appendChild(tr);bindNumberInputs();
    tr.querySelectorAll('input').forEach(x=>x.addEventListener('input',recalc));
    tr.querySelector('.removeGoodsPurchaseItem').onclick=()=>{if(tbody.children.length>1)tr.remove();recalc();syncDestination();};
    recalc();syncDestination();
  };

  document.getElementById('addGoodsPurchaseItem').onclick=()=>addRow();
  destination.onchange=syncDestination;
  if(selected){const lines=stockLines(selected.id);if(lines.length)lines.forEach(addRow);else addRow();syncDestination();}else addRow();

  form.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const d=selected?'GUDANG':String(fd.get('destination_type')||'GUDANG');
    const lines=[...tbody.querySelectorAll('tr')].map(tr=>({
      standard_name:String(tr.querySelector('[name="standard_name"]').value||'').trim(),
      description:String(tr.querySelector('[name="description"]').value||'').trim(),
      stock_kind:d==='GUDANG'?String(tr.querySelector('[name="stock_kind"]').value||'ASET'):'ASET',
      quantity:prodNum(tr.querySelector('[name="quantity"]').value),
      unit:String(tr.querySelector('[name="unit"]').value||'').trim().toUpperCase(),
      unit_price:prodNum(tr.querySelector('[name="unit_price"]').value)
    }));
    if(lines.some(x=>!x.standard_name||!x.unit||x.quantity<=0||x.unit_price<0))return msg('Lengkapi nama, jumlah, satuan, dan harga setiap barang.');
    if(d==='KANDANG'&&!fd.get('barn_id'))return msg('Pilih kandang tujuan.');
    const destinationLabel=d==='GUDANG'?'Gudang':d==='KANTOR'?'Kantor':barnLabel(String(fd.get('barn_id')||''));
    if(!await appConfirm('Simpan '+lines.length+' barang ke '+destinationLabel+'?'))return;

    let error=null;
    if(d==='GUDANG'){
      ({error}=selected?await db.rpc('finance_correct_stock_invoice_atomic',{p_invoice_id:selected.id,
        p_purchase_date:String(fd.get('purchase_date')||''),
        p_supplier_name:String(fd.get('supplier_name')||'')||null,
        p_payment_method:String(fd.get('payment_method')||''),
        p_reference:String(fd.get('reference')||'')||null,
        p_notes:String(fd.get('notes')||'')||null,
        p_items:lines
      }):await db.rpc('finance_save_stock_invoice_atomic',{
        p_purchase_date:String(fd.get('purchase_date')||''),
        p_supplier_name:String(fd.get('supplier_name')||'')||null,
        p_payment_method:String(fd.get('payment_method')||''),
        p_reference:String(fd.get('reference')||'')||null,
        p_notes:String(fd.get('notes')||'')||null,
        p_items:lines
      }));
    }else{
      ({error}=await db.rpc('finance_save_asset_invoice_atomic',{
        p_purchase_date:String(fd.get('purchase_date')||''),
        p_supplier_name:String(fd.get('supplier_name')||'')||null,
        p_asset_location_type:d,
        p_barn_id:d==='KANDANG'?String(fd.get('barn_id')||''):null,
        p_payment_method:String(fd.get('payment_method')||''),
        p_reference:String(fd.get('reference')||'')||null,
        p_notes:String(fd.get('notes')||'')||null,
        p_items:lines.map(x=>({standard_name:x.standard_name,description:x.description,quantity:x.quantity,unit:x.unit,unit_price:x.unit_price}))
      }));
    }
    if(error)return msg(error.message);
    await financeStockPurchasePage();
    msg(selected?'Koreksi pembelian stok tersimpan.':(d==='GUDANG'?'Pembelian tersimpan dan stok gudang otomatis bertambah.':'Pembelian tersimpan dan aset tujuan otomatis dibuat.'),true);
  };
  root.querySelectorAll('[data-edit-stock-invoice]').forEach(btn=>btn.onclick=()=>financeStockPurchasePage(btn.dataset.editStockInvoice));
  root.querySelectorAll('[data-delete-stock-invoice]').forEach(btn=>btn.onclick=async()=>{if(!await appConfirm('Hapus nota stok ini? Hanya bisa jika belum pernah dikirim dari gudang.'))return;const {error}=await db.rpc('finance_delete_stock_invoice_atomic',{p_invoice_id:btn.dataset.deleteStockInvoice});if(error)return msg(error.message);await financeStockPurchasePage();msg('Nota stok dihapus.',true);});
  const cancel=document.getElementById('financeGoodsEditCancel');if(cancel)cancel.onclick=()=>financeStockPurchasePage();
}

async function logisticsWarehouseStockPage(){
  const [ir,hr,sr]=await Promise.all([
    db.from('warehouse_stock_items').select('*').order('created_at',{ascending:false}),
    db.from('finance_stock_purchase_invoices').select('id,purchase_date,supplier_name,reference').order('purchase_date',{ascending:false}),
    db.from('warehouse_stock_shipments').select('stock_item_id,quantity')
  ]);
  const items=ir.data||[],headers=hr.data||[],ships=sr.data||[];
  const err=[ir,hr,sr].find(x=>x.error)?.error;
  const sent=id=>ships.filter(x=>x.stock_item_id===id).reduce((n,x)=>n+prodNum(x.quantity),0);
  let html='<section class="panel"><h3>Stok Barang</h3><p class="muted"><strong>OTOMATIS.</strong> Stok masuk berasal dari Keuangan → Pembelian Barang. Stok keluar berasal dari Logistik → Kirim Barang dari Gudang.</p><div class="report-actions"><button type="button" id="warehouseStockPrint">Cetak</button> <button type="button" id="warehouseStockPdf">PDF</button> <button type="button" id="warehouseStockExcel">Excel</button></div><div class="tablewrap"><table id="warehouseStockTable"><thead><tr><th>Barang</th><th>Jenis</th><th>Supplier</th><th>Tanggal Masuk</th><th>Masuk</th><th>Sudah Dikirim</th><th>Sisa Gudang</th><th>Nilai Sisa</th></tr></thead><tbody>'+
    items.map(x=>{const h=headers.find(v=>v.id===x.invoice_id),s=sent(x.id),r=Math.max(0,prodNum(x.quantity)-s);return '<tr><td><strong>'+esc(x.standard_name)+'</strong><br><small>'+esc(x.description||'')+'</small></td><td>'+esc(x.stock_kind==='HABIS_PAKAI'?'Habis Pakai':'Aset')+'</td><td>'+esc(h?.supplier_name||'-')+'</td><td>'+prodDateId(h?.purchase_date||'')+'</td><td>'+prodFmt(x.quantity,2)+' '+esc(x.unit)+'</td><td>'+prodFmt(s,2)+' '+esc(x.unit)+'</td><td><strong>'+prodFmt(r,2)+' '+esc(x.unit)+'</strong></td><td>Rp '+prodFmt(r*prodNum(x.unit_price),0)+'</td></tr>';}).join('')+
    '</tbody></table></div>'+(items.length?'':'<p>Belum ada stok gudang.</p>')+'</section>';
  layout(html);if(err)msg(err.message);
  attachListFilter({tableId:'warehouseStockTable',fields:[{label:'Barang',col:0,placeholder:'Cari barang'},{label:'Jenis',col:1,placeholder:'Aset / Habis Pakai'},{label:'Supplier',col:2,placeholder:'Cari supplier'},{label:'Tanggal Masuk',col:3,placeholder:'YYYY-MM-DD'}]});
  bindTableExportActions({tableId:'warehouseStockTable',printId:'warehouseStockPrint',pdfId:'warehouseStockPdf',excelId:'warehouseStockExcel',title:'Stok Barang Gudang',filename:'Stok_Barang_Gudang'});
}

async function logisticsWarehouseSendPage(editId=null){
  const [ir,hr,sr,br]=await Promise.all([
    db.from('warehouse_stock_items').select('*').order('created_at',{ascending:false}),
    db.from('finance_stock_purchase_invoices').select('id,purchase_date,supplier_name,reference').order('purchase_date',{ascending:false}),
    db.from('warehouse_stock_shipments').select('*').order('shipment_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('barns').select('id,code,name,active').eq('active',true).order('code')
  ]);
  const items=ir.data||[],headers=hr.data||[],ships=sr.data||[],barns=br.data||[];
  const selected=editId?ships.find(x=>x.id===editId):null;
  window.__warehouseSendHistoryFilter=window.__warehouseSendHistoryFilter||{item:'',destination:'',barn:'',from:'',to:'',shown:false};
  const warehouseHistoryFilter=window.__warehouseSendHistoryFilter;
  const warehouseHistoryRows=warehouseHistoryFilter.shown?ships.filter(s=>
    (!warehouseHistoryFilter.item||s.stock_item_id===warehouseHistoryFilter.item)&&
    (!warehouseHistoryFilter.destination||s.destination_type===warehouseHistoryFilter.destination)&&
    (!warehouseHistoryFilter.barn||s.barn_id===warehouseHistoryFilter.barn)&&
    (!warehouseHistoryFilter.from||String(s.shipment_date||'')>=warehouseHistoryFilter.from)&&
    (!warehouseHistoryFilter.to||String(s.shipment_date||'')<=warehouseHistoryFilter.to)
  ):[];
  const err=[ir,hr,sr,br].find(x=>x.error)?.error;
  const sent=id=>ships.filter(x=>x.stock_item_id===id&&(!selected||x.id!==selected.id)).reduce((n,x)=>n+prodNum(x.quantity),0);
  const remain=x=>Math.max(0,prodNum(x.quantity)-sent(x.id));
  const available=items.filter(x=>remain(x)>0||x.id===selected?.stock_item_id);
  const itemLabel=x=>x.standard_name+' · sisa '+prodFmt(remain(x),2)+' '+x.unit;
  let html='<section class="panel"><h3>'+(selected?'Koreksi Pengiriman Gudang':'Kirim Barang dari Gudang')+'</h3><p class="muted">Pengiriman mengurangi stok gudang. Barang berjenis <strong>Aset</strong> otomatis masuk Aset Kandang/Kantor saat dikirim; barang <strong>Habis Pakai</strong> hanya mengurangi stok.</p>'+
    '<form id="warehouseSendForm" class="form-vertical"><input type="hidden" name="shipment_id" value="'+esc(selected?.id||'')+'"><label>Tanggal Kirim<input type="date" name="shipment_date" value="'+esc(selected?.shipment_date||prodToday())+'" required></label>'+
    (selected?'<input type="hidden" name="stock_item_id" value="'+esc(selected.stock_item_id)+'"><label>Barang<input value="'+esc(items.find(x=>x.id===selected.stock_item_id)?.standard_name||'-')+'" readonly></label>':'<label>Barang<select name="stock_item_id" required><option value="">Pilih Barang</option>'+available.map(x=>'<option value="'+esc(x.id)+'">'+esc(itemLabel(x))+'</option>').join('')+'</select></label>')+
    '<label>Tujuan<select name="destination_type" id="warehouseDestination" required><option value="KANDANG" '+(selected?.destination_type==='KANDANG'?'selected':'')+'>Kandang</option><option value="KANTOR" '+(selected?.destination_type==='KANTOR'?'selected':'')+'>Kantor</option></select></label>'+
    '<label id="warehouseBarnWrap">Kandang<select name="barn_id"><option value="">Pilih Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(selected?.barn_id===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
    '<label>Jumlah Kirim<input name="quantity" data-number="1" inputmode="decimal" value="'+(selected?prodFmt(selected.quantity,2):'')+'" required></label>'+
    '<label>Referensi<input name="reference" value="'+esc(selected?.reference||'')+'"></label><label>Catatan<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
    '<div class="inline-actions"><button type="submit">'+(selected?'Simpan Koreksi':'Kirim Barang')+'</button>'+(selected?'<button type="button" id="warehouseSendCancel">Batal Koreksi</button>':'')+'</div></form></section>';
  html+='<section class="panel"><h3>Riwayat Pengiriman Gudang</h3>'+
    '<p class="muted">Pilih filter lalu klik Tampilkan untuk melihat riwayat distribusi stok.</p>'+
    '<form id="warehouseSendHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Barang<select name="item"><option value="">Semua Barang</option>'+items.map(x=>'<option value="'+esc(x.id)+'" '+(warehouseHistoryFilter.item===x.id?'selected':'')+'>'+esc(x.standard_name)+'</option>').join('')+'</select></label>'+
      '<label>Tujuan<select name="destination"><option value="">Semua Tujuan</option><option value="KANDANG" '+(warehouseHistoryFilter.destination==='KANDANG'?'selected':'')+'>Kandang</option><option value="KANTOR" '+(warehouseHistoryFilter.destination==='KANTOR'?'selected':'')+'>Kantor</option></select></label>'+
      '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(warehouseHistoryFilter.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(warehouseHistoryFilter.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(warehouseHistoryFilter.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="warehouseSendHistoryReset">Reset</button></div>'+
    '</form>'+
    (warehouseHistoryFilter.shown?'<div class="report-actions"><button type="button" id="warehouseSendPrint">Cetak</button> <button type="button" id="warehouseSendPdf">PDF</button> <button type="button" id="warehouseSendExcel">Excel</button></div><div class="tablewrap"><table id="warehouseSendTable"><thead><tr><th>Tanggal</th><th>Barang</th><th>Jumlah</th><th>Tujuan</th><th>Status</th><th>Referensi</th><th>Aksi</th></tr></thead><tbody>'+
      warehouseHistoryRows.map(s=>{const x=items.find(v=>v.id===s.stock_item_id),b=barns.find(v=>v.id===s.barn_id);return '<tr><td>'+prodDateId(s.shipment_date)+'</td><td>'+esc(x?.standard_name||'-')+'</td><td>'+prodFmt(s.quantity,2)+' '+esc(x?.unit||'')+'</td><td>'+esc(s.destination_type==='KANTOR'?'Kantor':shortBarnLabel(b))+'</td><td>'+(s.make_asset?'Menjadi Aset':'Distribusi / Pemakaian')+'</td><td>'+esc(s.reference||'-')+'</td><td><button type="button" data-edit-warehouse-send="'+esc(s.id)+'">Edit</button> <button type="button" data-delete-warehouse-send="'+esc(s.id)+'">Hapus</button></td></tr>';}).join('')+
      '</tbody></table></div>'+(warehouseHistoryRows.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';
  layout(html);bindNumberInputs();if(err)msg(err.message);
  const warehouseSendHistoryForm=document.getElementById('warehouseSendHistoryFilter');
  const warehouseSendHistoryReset=document.getElementById('warehouseSendHistoryReset');
  if(warehouseSendHistoryForm)warehouseSendHistoryForm.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(warehouseSendHistoryForm);
    warehouseHistoryFilter.item=String(fd.get('item')||'');
    warehouseHistoryFilter.destination=String(fd.get('destination')||'');
    warehouseHistoryFilter.barn=String(fd.get('barn')||'');
    warehouseHistoryFilter.from=String(fd.get('from')||'');
    warehouseHistoryFilter.to=String(fd.get('to')||'');
    if(warehouseHistoryFilter.from&&warehouseHistoryFilter.to&&warehouseHistoryFilter.from>warehouseHistoryFilter.to){
      const t=warehouseHistoryFilter.from;warehouseHistoryFilter.from=warehouseHistoryFilter.to;warehouseHistoryFilter.to=t;
    }
    warehouseHistoryFilter.shown=true;
    await logisticsWarehouseSendPage();
  };
  if(warehouseSendHistoryReset)warehouseSendHistoryReset.onclick=async()=>{
    window.__warehouseSendHistoryFilter={item:'',destination:'',barn:'',from:'',to:'',shown:false};
    await logisticsWarehouseSendPage();
  };
  if(warehouseHistoryFilter.shown)bindTableExportActions({tableId:'warehouseSendTable',printId:'warehouseSendPrint',pdfId:'warehouseSendPdf',excelId:'warehouseSendExcel',title:'Riwayat Pengiriman Gudang',filename:'Riwayat_Pengiriman_Gudang',filterText:'Periode '+(warehouseHistoryFilter.from||'-')+' s/d '+(warehouseHistoryFilter.to||'-'),dropLast:true});

  const dest=document.getElementById('warehouseDestination'),wrap=document.getElementById('warehouseBarnWrap');
  const sync=()=>{wrap.style.display=dest.value==='KANDANG'?'':'none';if(dest.value==='KANTOR')wrap.querySelector('select').value='';};dest.onchange=sync;sync();
  document.getElementById('warehouseSendForm').onsubmit=async e=>{
    e.preventDefault();const fd=new FormData(e.target),id=String(fd.get('stock_item_id')||''),x=items.find(v=>v.id===id),q=prodNum(fd.get('quantity'));
    if(!x)return msg('Pilih barang gudang.');if(q<=0||q>remain(x))return msg('Jumlah kirim melebihi stok yang tersedia.');
    if(String(fd.get('destination_type'))==='KANDANG'&&!fd.get('barn_id'))return msg('Pilih kandang tujuan.');
    if(!await appConfirm('Kirim '+prodFmt(q,2)+' '+x.unit+' '+x.standard_name+' dari gudang?'))return;
    const shipmentId=String(fd.get('shipment_id')||'');
    const {error}=shipmentId
      ?await db.rpc('correct_warehouse_stock_shipment_atomic',{p_id:shipmentId,p_shipment_date:String(fd.get('shipment_date')||''),p_destination_type:String(fd.get('destination_type')||''),p_barn_id:String(fd.get('barn_id')||'')||null,p_quantity:q,p_reference:String(fd.get('reference')||'')||null,p_notes:String(fd.get('notes')||'')||null})
      :await db.rpc('logistics_send_warehouse_stock_atomic',{p_stock_item_id:id,p_shipment_date:String(fd.get('shipment_date')||''),p_destination_type:String(fd.get('destination_type')||''),p_barn_id:String(fd.get('barn_id')||'')||null,p_quantity:q,p_make_asset:false,p_reference:String(fd.get('reference')||'')||null,p_notes:String(fd.get('notes')||'')||null});
    if(error)return msg(error.message);
    await logisticsWarehouseSendPage();msg(shipmentId?'Koreksi pengiriman gudang tersimpan dan aset terkait ikut diperbarui.':'Barang berhasil dikirim dan stok gudang otomatis berkurang.',true);
  };
  root.querySelectorAll('[data-edit-warehouse-send]').forEach(btn=>btn.onclick=()=>logisticsWarehouseSendPage(btn.dataset.editWarehouseSend));
  root.querySelectorAll('[data-delete-warehouse-send]').forEach(btn=>btn.onclick=async()=>{if(!await appConfirm('Hapus pengiriman gudang ini dan kembalikan stok?'))return;const {error}=await db.rpc('delete_warehouse_stock_shipment_atomic',{p_id:btn.dataset.deleteWarehouseSend});if(error)return msg(error.message);await logisticsWarehouseSendPage();msg('Pengiriman dihapus, stok gudang kembali, dan aset terkait dibatalkan.',true);});
  const cancel=document.getElementById('warehouseSendCancel');if(cancel)cancel.onclick=()=>logisticsWarehouseSendPage();
}

async function financeDirectPurchasePage(editId=null){
  const [hr,dr,br]=await Promise.all([
    db.from('finance_asset_purchase_invoices').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_direct_purchases').select('id,invoice_id,standard_name,description,quantity,unit,unit_price,total_amount,linked_id').eq('purchase_type','ASSET').order('created_at',{ascending:true}),
    db.from('barns').select('id,code,name,active').order('code',{ascending:true})
  ]);
  const invoices=hr.data||[],details=dr.data||[],barns=br.data||[];
  const selected=editId?invoices.find(x=>x.id===editId):null;
  window.__financeAssetHistory=window.__financeAssetHistory||{from:'',to:'',shown:false};
  const assetHistoryState=window.__financeAssetHistory;
  const visibleAssetInvoices=assetHistoryState.shown?invoices.filter(h=>
    (!assetHistoryState.from||String(h.purchase_date||'')>=assetHistoryState.from)&&
    (!assetHistoryState.to||String(h.purchase_date||'')<=assetHistoryState.to)
  ):[];
  const err=[hr,dr,br].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const standardNames=[...new Map(details.filter(x=>x.standard_name).map(x=>[String(x.standard_name).trim().toLowerCase(),x.standard_name])).values()];
  const latestByName=name=>details.slice().reverse().find(x=>String(x.standard_name||'').trim().toLowerCase()===String(name||'').trim().toLowerCase());
  const barnLabel=id=>{const x=barns.find(b=>b.id===id);return x?shortBarnLabel(x):'-'};
  const invoiceItems=id=>details.filter(x=>x.invoice_id===id);

  let html='<section class="panel"><h3>'+(selected?'Koreksi Nota Aset':'Beli Aset')+'</h3>'+
    '<p class="muted">Satu nota dapat berisi beberapa aset. Isi data nota sekali, lalu tambahkan setiap barang dengan tombol <strong>+ Barang</strong>. Setiap barang menjadi aset tersendiri, sedangkan Arus Kas tetap dihitung satu kali sebesar total nota.</p>'+
    '<form id="financeAssetInvoiceForm" class="form-vertical"><input type="hidden" name="invoice_id" value="'+esc(selected?.id||'')+'">'+
      '<label>Tanggal Pembelian<input type="date" name="purchase_date" value="'+esc(selected?.purchase_date||today)+'" required></label>'+
      '<label>Supplier<input name="supplier_name" value="'+esc(selected?.supplier_name||'')+'" placeholder="Masukkan nama supplier"></label>'+
      '<label>Lokasi Aset<select name="asset_location_type" id="assetLocationType" required><option value="KANDANG" '+(selected?.asset_location_type!=='KANTOR'?'selected':'')+'>Kandang</option><option value="KANTOR" '+(selected?.asset_location_type==='KANTOR'?'selected':'')+'>Kantor</option></select></label>'+
      '<label id="directBarnWrap">Kandang<select name="barn_id" id="directBarn"><option value="">Pilih Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(selected?.barn_id===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Metode Pembayaran<select name="payment_method" required><option value="TRANSFER" '+(selected?.payment_method==='TRANSFER'?'selected':'')+'>Transfer</option><option value="TUNAI" '+(selected?.payment_method==='TUNAI'?'selected':'')+'>Tunai</option></select></label>'+
      '<label>Referensi / No. Nota<input name="reference" value="'+esc(selected?.reference||'')+'"></label>'+
      '<label>Catatan Nota<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<datalist id="assetStandardNames">'+standardNames.map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist>'+
      '<div class="tablewrap"><table><thead><tr><th>Nama Standar</th><th>Deskripsi</th><th>Jumlah</th><th>Satuan</th><th>Harga/Satuan</th><th>Total</th><th></th></tr></thead><tbody id="assetItemRows"></tbody></table></div>'+
      '<div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-top:.75rem">'+(selected?'':'<button type="button" id="addAssetItem">+ Barang</button>')+'<strong>Total Nota: <span id="assetInvoiceTotal">Rp 0</span></strong></div>'+
      '<div class="inline-actions"><button type="submit">'+(selected?'Simpan Koreksi':'Simpan Nota Aset')+'</button>'+(selected?'<button type="button" id="assetInvoiceCancel">Batal Koreksi</button>':'')+'</div>'+
    '</form></section>';

  html+='<section class="panel"><h3>Riwayat Nota Aset</h3>'+
    '<form id="financeAssetHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(assetHistoryState.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(assetHistoryState.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="financeAssetHistoryReset">Reset</button></div>'+
    '</form>'+
    (assetHistoryState.shown?'<div class="report-actions"><button type="button" id="assetHistoryPrint">Cetak</button> <button type="button" id="assetHistoryPdf">PDF</button> <button type="button" id="assetHistoryExcel">Excel</button></div><div class="tablewrap"><table id="assetHistoryTable"><thead><tr>'+
    '<th>Tanggal</th><th>No. Nota</th><th>Supplier</th><th>Lokasi</th><th>Barang</th><th>Jumlah Jenis</th><th>Total Nota</th><th>Metode</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    visibleAssetInvoices.map(h=>{
      const lines=invoiceItems(h.id);
      const names=lines.map(x=>x.standard_name+' ('+prodFmt(x.quantity,2)+' '+(x.unit||'')+')').join(', ');
      const loc=h.asset_location_type==='KANTOR'?'Kantor':barnLabel(h.barn_id);
      return '<tr><td>'+prodDateId(h.purchase_date)+'</td><td>'+esc(h.reference||'-')+'</td><td>'+esc(h.supplier_name||'-')+'</td><td>'+esc(loc)+'</td><td>'+esc(names||'-')+'</td><td>'+lines.length+'</td><td><strong>Rp '+prodFmt(h.total_amount,0)+'</strong></td><td>'+esc(h.payment_method||'-')+'</td><td><button type="button" data-edit-asset-invoice="'+esc(h.id)+'">Edit</button> '+(profile.role==='ADMIN'?'<button type="button" data-delete-asset-invoice="'+esc(h.id)+'">Hapus</button>':'')+'</td></tr>';
    }).join('')+
    '</tbody></table></div>'+(visibleAssetInvoices.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+'</section>';

  layout(html);if(err)msg(err.message);
  const assetHistoryFilter=document.getElementById('financeAssetHistoryFilter');
  const assetHistoryReset=document.getElementById('financeAssetHistoryReset');
  if(assetHistoryFilter)assetHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(assetHistoryFilter);assetHistoryState.from=String(fd.get('from')||'');assetHistoryState.to=String(fd.get('to')||'');if(assetHistoryState.from&&assetHistoryState.to&&assetHistoryState.from>assetHistoryState.to){const t=assetHistoryState.from;assetHistoryState.from=assetHistoryState.to;assetHistoryState.to=t}assetHistoryState.shown=true;await financeDirectPurchasePage();};
  if(assetHistoryReset)assetHistoryReset.onclick=async()=>{window.__financeAssetHistory={from:'',to:'',shown:false};await financeDirectPurchasePage();};
  if(assetHistoryState.shown)bindTableExportActions({tableId:'assetHistoryTable',printId:'assetHistoryPrint',pdfId:'assetHistoryPdf',excelId:'assetHistoryExcel',title:'Riwayat Nota Aset',filename:'Riwayat_Nota_Aset',filterText:'Periode '+(assetHistoryState.from||'-')+' s/d '+(assetHistoryState.to||'-'),dropLast:true});

  const form=document.getElementById('financeAssetInvoiceForm');
  const locationType=document.getElementById('assetLocationType');
  const barn=form?.elements.barn_id;
  const barnWrap=document.getElementById('directBarnWrap');
  const rowsEl=document.getElementById('assetItemRows');
  const totalEl=document.getElementById('assetInvoiceTotal');

  const syncLocation=()=>{
    const isBarn=locationType?.value!=='KANTOR';
    if(barnWrap)barnWrap.style.display=isBarn?'':'none';
    if(barn)barn.required=isBarn;
    if(!isBarn&&barn)barn.value='';
  };
  if(locationType)locationType.onchange=syncLocation;
  syncLocation();

  const calcInvoice=()=>{
    let total=0;
    rowsEl?.querySelectorAll('tr').forEach(row=>{
      const q=normalizeInputID(row.querySelector('.asset-qty')?.value);
      const p=normalizeInputID(row.querySelector('.asset-price')?.value);
      const line=(q!=null&&p!=null)?q*p:0;
      const lineEl=row.querySelector('.asset-line-total');
      if(lineEl)lineEl.textContent='Rp '+prodFmt(line,0);
      total+=line;
    });
    if(totalEl)totalEl.textContent='Rp '+prodFmt(total,0);
    return total;
  };

  const bindRow=row=>{
    const name=row.querySelector('.asset-name');
    const unit=row.querySelector('.asset-unit');
    const canonical=()=>{
      const hit=latestByName(name?.value);
      if(hit&&name){
        name.value=hit.standard_name;
        if(unit&&!unit.value)unit.value=hit.unit||'';
      }
    };
    if(name){name.onchange=canonical;name.onblur=canonical;}
    row.querySelectorAll('.asset-qty,.asset-price').forEach(el=>el.addEventListener('input',calcInvoice));
    const del=row.querySelector('.asset-remove');
    if(del)del.onclick=()=>{
      const all=rowsEl.querySelectorAll('tr');
      if(all.length<=1)return msg('Minimal satu barang harus ada.');
      row.remove();calcInvoice();
    };
  };

  const addRow=(seed={})=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td><input class="asset-name" list="assetStandardNames" autocomplete="off" placeholder="Contoh: Pompa Air" value="'+esc(seed.standard_name||'')+'"></td>'+
      '<td><input class="asset-description" placeholder="Keterangan barang" value="'+esc(seed.description||'')+'"></td>'+
      '<td><input class="asset-qty" type="text" data-number="1" inputmode="decimal" value="'+esc(seed.quantity||'')+'"></td>'+
      '<td><input class="asset-unit" placeholder="UNIT / PCS" value="'+esc(seed.unit||'')+'"></td>'+
      '<td><input class="asset-price" type="text" data-number="1" inputmode="decimal" value="'+esc(seed.unit_price||'')+'"></td>'+
      '<td><strong class="asset-line-total">Rp 0</strong></td>'+
      '<td>'+(selected?'':'<button type="button" class="asset-remove btn-danger">Hapus</button>')+'</td>';
    rowsEl.appendChild(tr);bindRow(tr);bindNumberInputs();calcInvoice();
  };
  const addAssetBtn=document.getElementById('addAssetItem');if(addAssetBtn)addAssetBtn.onclick=()=>addRow();
  if(selected){const lines=invoiceItems(selected.id);if(lines.length)lines.forEach(x=>addRow({standard_name:x.standard_name,description:x.description,quantity:prodFmt(x.quantity,2),unit:x.unit,unit_price:prodFmt(x.unit_price,0)}));else addRow();}else addRow();

  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    const items=[];
    for(const row of rowsEl.querySelectorAll('tr')){
      const name=String(row.querySelector('.asset-name')?.value||'').trim();
      const description=String(row.querySelector('.asset-description')?.value||'').trim();
      const q=normalizeInputID(row.querySelector('.asset-qty')?.value);
      const unit=String(row.querySelector('.asset-unit')?.value||'').trim();
      const price=normalizeInputID(row.querySelector('.asset-price')?.value);
      if(!name)return msg('Nama Standar setiap barang wajib diisi.');
      if(q===null||q<=0)return msg('Jumlah setiap barang harus lebih dari 0.');
      if(!unit)return msg('Satuan setiap barang wajib diisi.');
      if(price===null||price<0)return msg('Harga setiap barang tidak valid.');
      const hit=latestByName(name);
      items.push({
        standard_name:hit?.standard_name||name,
        description:description||null,
        quantity:q,
        unit:(hit?.unit&&unit===String(hit.unit))?hit.unit:unit,
        unit_price:price
      });
    }
    if(!items.length)return msg('Minimal satu barang wajib diisi.');
    const total=calcInvoice();
    const loc=String(fd.get('asset_location_type')||'KANDANG');
    const info=loc==='KANTOR'?'Kantor':barnLabel(String(fd.get('barn_id')||''));
    if(!await appConfirm('Simpan 1 nota dengan '+items.length+' barang, total Rp '+prodFmt(total,0)+' ke '+info+'?'))return;
    const invoiceId=String(fd.get('invoice_id')||'');
    const {error}=await db.rpc(invoiceId?'finance_correct_asset_invoice_atomic':'finance_save_asset_invoice_atomic',{
      ...(invoiceId?{p_invoice_id:invoiceId}:{}),
      p_purchase_date:String(fd.get('purchase_date')||''),
      p_supplier_name:String(fd.get('supplier_name')||'')||null,
      p_asset_location_type:loc,
      p_barn_id:String(fd.get('barn_id')||'')||null,
      p_payment_method:String(fd.get('payment_method')||''),
      p_reference:String(fd.get('reference')||'')||null,
      p_notes:String(fd.get('notes')||'')||null,
      p_items:items
    });
    if(error)return msg(error.message);
    await financeDirectPurchasePage();
    msg(invoiceId?'Koreksi nota aset tersimpan dan aset terkait diperbarui.':'Nota aset tersimpan. '+items.length+' barang dibuat sebagai aset terpisah dan Arus Kas dihitung satu kali sebesar total nota.',true);
  };
  root.querySelectorAll('[data-edit-asset-invoice]').forEach(btn=>btn.onclick=()=>financeDirectPurchasePage(btn.dataset.editAssetInvoice));
  root.querySelectorAll('[data-delete-asset-invoice]').forEach(btn=>btn.onclick=async()=>{if(!await appConfirm('Hapus nota aset ini beserta aset terkait?'))return;const {error}=await db.rpc('finance_delete_asset_invoice_atomic',{p_invoice_id:btn.dataset.deleteAssetInvoice});if(error)return msg(error.message);await financeDirectPurchasePage();msg('Nota aset dan aset terkait dihapus.',true);});
  const cancel=document.getElementById('assetInvoiceCancel');if(cancel)cancel.onclick=()=>financeDirectPurchasePage();
}

async function financeSupplierPayablesPage(){
  const [pr,ar,br,cr,pyr]=await Promise.all([
    db.rpc('finance_supplier_payables_v1'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('supplier_payments').select('*').order('paid_on',{ascending:false}).order('created_at',{ascending:false})
  ]);
  const rows=pr.data||[],assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[],payments=pyr.data||[];
  const err=[pr,ar,br,cr,pyr].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  window.__supplierPayableState=window.__supplierPayableState||{status:'OPEN',supplier:'',selected:'',editPaymentId:'',historyFrom:'',historyTo:'',historyShown:false};
  const st=window.__supplierPayableState;
  const editPayment=payments.find(x=>x.id===st.editPaymentId)||null;
  if(editPayment)st.selected=editPayment.source_type+':'+editPayment.source_id;
  const suppliers=[...new Map(rows.map(x=>[x.supplier_id,{id:x.supplier_id,name:x.supplier_name,code:x.supplier_code}])).values()];
  const visible=rows.filter(x=>
    (!st.supplier||x.supplier_id===st.supplier)&&
    (st.status==='ALL'||(st.status==='OPEN'&&x.status!=='LUNAS')||x.status===st.status)
  );
  const totalTagihan=visible.reduce((n,x)=>n+prodNum(x.total_amount),0);
  const totalBayar=visible.reduce((n,x)=>n+prodNum(x.paid_amount),0);
  const totalSisa=visible.reduce((n,x)=>n+prodNum(x.balance),0);
  const identity=id=>{const a=assignments.find(x=>x.id===id);return a?assignmentIdentity(assignments,barns,contractsRows,a):'-';};
  const sourceLabel=t=>t==='SAPRONAK_LUAR'?'Sapronak Tambahan':t==='TAMBAH_DAGING'?'Tambah Daging':t==='BELI_PERALATAN'?'Beli Peralatan':'-';
  const payableLocation=x=>x.source_type==='BELI_PERALATAN'?([x.barn_code,x.barn_name].filter(Boolean).join(' · ')||'-'):identity(x.contract_assignment_id);
  const selected=rows.find(x=>x.source_type+':'+x.source_id===st.selected);
  const visiblePayments=st.historyShown?payments.filter(p=>
    (!st.historyFrom||String(p.paid_on||'')>=st.historyFrom)&&
    (!st.historyTo||String(p.paid_on||'')<=st.historyTo)
  ):[];

  let html='<section class="panel"><h3>Hutang Supplier</h3>'+
    '<p class="muted"><strong>OTOMATIS.</strong> Hutang muncul dari Sapronak Tambahan Logistik, Beli Peralatan Logistik, dan Tambah Daging Marketing. Keuangan tidak membuat tagihan atau nama barang ulang.</p>'+
    '<form id="supplierPayableFilter" class="form-vertical">'+
      '<label>Supplier<select name="supplier"><option value="">Semua Supplier</option>'+suppliers.map(x=>'<option value="'+esc(x.id)+'" '+(st.supplier===x.id?'selected':'')+'>'+esc((x.code||'')+' · '+x.name)+'</option>').join('')+'</select></label>'+
      '<label>Status<select name="status"><option value="OPEN" '+(st.status==='OPEN'?'selected':'')+'>Belum Lunas + Sebagian</option><option value="BELUM_LUNAS" '+(st.status==='BELUM_LUNAS'?'selected':'')+'>Belum Lunas</option><option value="SEBAGIAN" '+(st.status==='SEBAGIAN'?'selected':'')+'>Sebagian</option><option value="LUNAS" '+(st.status==='LUNAS'?'selected':'')+'>Lunas</option><option value="ALL" '+(st.status==='ALL'?'selected':'')+'>Semua</option></select></label>'+
      '<button type="submit">Tampilkan</button></form></section>'+
    '<section class="panel" id="supplierPayablePrintArea"><div class="rhpp-section-head"><div><h3>Daftar Hutang Supplier</h3></div><div class="report-actions"><button type="button" id="supplierPayablePrint">Cetak / PDF</button><button type="button" id="supplierPayablePrintExcel">Excel</button></div></div>'+
      '<div class="rhpp-summary-cards"><div class="rhpp-summary-card"><span>Total Tagihan</span><strong>Rp '+prodFmt(totalTagihan,0)+'</strong></div><div class="rhpp-summary-card"><span>Sudah Dibayar</span><strong>Rp '+prodFmt(totalBayar,0)+'</strong></div><div class="rhpp-summary-card"><span>Sisa Hutang</span><strong>Rp '+prodFmt(totalSisa,0)+'</strong></div></div>'+
      '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Sumber</th><th>Kandang / Siklus</th><th>Referensi</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
      visible.map(x=>'<tr><td>'+prodDateId(x.transaction_date)+'</td><td>'+esc((x.supplier_code||'')+' · '+x.supplier_name)+'</td><td>'+esc(sourceLabel(x.source_type))+'</td><td>'+esc(payableLocation(x))+'</td><td>'+esc(x.reference||'-')+'</td><td>Rp '+prodFmt(x.total_amount,0)+'</td><td>Rp '+prodFmt(x.paid_amount,0)+'</td><td><strong>Rp '+prodFmt(x.balance,0)+'</strong></td><td><strong>'+esc(String(x.status||'').replaceAll('_',' '))+'</strong></td><td>'+(x.status!=='LUNAS'?'<button type="button" data-pay-supplier="'+esc(x.source_type+':'+x.source_id)+'">Bayar</button>':'-')+'</td></tr>').join('')+
      '</tbody></table></div>'+(visible.length?'':'<p class="muted">Tidak ada hutang supplier sesuai filter.</p>')+'</section>';

  if(selected&&(selected.status!=='LUNAS'||editPayment)){
    const bank=[selected.supplier_bank_name,selected.supplier_bank_account_number,selected.supplier_bank_account_name].filter(Boolean).join(' · ');
    html+='<section class="panel"><h3>'+(editPayment?'Edit Pembayaran Supplier':'Bayar Hutang Supplier')+'</h3>'+
      '<p><strong>'+esc(selected.supplier_name)+'</strong> · '+esc(sourceLabel(selected.source_type))+'</p>'+
      '<p class="muted">Sisa hutang: <strong>Rp '+prodFmt(selected.balance,0)+'</strong>'+(bank?' · Rekening: '+esc(bank):'')+'</p>'+
      '<form id="supplierPaymentForm" class="form-vertical">'+
        '<label>Tanggal Bayar<input name="paid_on" type="date" value="'+esc(editPayment?.paid_on||today)+'" required></label>'+
        '<label>Nominal Bayar<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+fmtNumber(editPayment?editPayment.amount:selected.balance)+'" required></label>'+
        '<label>Metode<select name="method" required><option value="TRANSFER" '+((editPayment?.method||'TRANSFER')==='TRANSFER'?'selected':'')+'>Transfer</option><option value="TUNAI" '+(editPayment?.method==='TUNAI'?'selected':'')+'>Tunai</option></select></label>'+
        '<label>Referensi / No. Transfer<input name="reference" value="'+esc(editPayment?.reference||'')+'" placeholder="Opsional"></label>'+
        '<label>Catatan<input name="notes" value="'+esc(editPayment?.notes||'')+'" placeholder="Opsional"></label>'+
        '<div class="report-actions"><button type="submit">'+(editPayment?'Simpan Perubahan':'Simpan Pembayaran')+'</button><button type="button" id="supplierPaymentCancel">Batal</button>'+(editPayment?adminDeleteTxnButton('supplier_payments',editPayment.id):'')+'</div>'+
      '</form></section>';
  }

  html+='<section class="panel"><h3>Riwayat Pembayaran Supplier</h3>'+
    '<form id="supplierPaymentHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(st.historyFrom||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(st.historyTo||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="supplierPaymentHistoryReset">Reset</button></div>'+
    '</form>'+
    (st.historyShown?'<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Sumber</th><th>Nominal</th><th>Metode</th><th>Referensi</th><th>Aksi</th></tr></thead><tbody>'+
      visiblePayments.map(p=>{const row=rows.find(x=>x.source_type===p.source_type&&x.source_id===p.source_id);return '<tr><td>'+prodDateId(p.paid_on)+'</td><td>'+esc(row?.supplier_name||'-')+'</td><td>'+esc(sourceLabel(p.source_type))+'</td><td>Rp '+prodFmt(p.amount,0)+'</td><td>'+esc(p.method||'-')+'</td><td>'+esc(p.reference||'-')+'</td><td><div class="inline-actions"><button type="button" data-edit-supplier-payment="'+esc(p.id)+'">Edit</button>'+adminDeleteTxnButton('supplier_payments',p.id)+'</div></td></tr>';}).join('')+
      '</tbody></table></div>'+(visiblePayments.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);
  const supplierPaymentHistoryFilter=document.getElementById('supplierPaymentHistoryFilter');
  const supplierPaymentHistoryReset=document.getElementById('supplierPaymentHistoryReset');
  if(supplierPaymentHistoryFilter)supplierPaymentHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(supplierPaymentHistoryFilter);st.historyFrom=String(fd.get('from')||'');st.historyTo=String(fd.get('to')||'');if(st.historyFrom&&st.historyTo&&st.historyFrom>st.historyTo){const t=st.historyFrom;st.historyFrom=st.historyTo;st.historyTo=t}st.historyShown=true;await financeSupplierPayablesPage();};
  if(supplierPaymentHistoryReset)supplierPaymentHistoryReset.onclick=async()=>{st.historyFrom='';st.historyTo='';st.historyShown=false;await financeSupplierPayablesPage();};

  const filter=document.getElementById('supplierPayableFilter');
  if(filter)filter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(filter);st.supplier=String(fd.get('supplier')||'');st.status=String(fd.get('status')||'OPEN');st.selected='';await financeSupplierPayablesPage();};
  root.querySelectorAll('[data-pay-supplier]').forEach(btn=>btn.onclick=async()=>{st.selected=btn.dataset.paySupplier||'';st.editPaymentId='';await financeSupplierPayablesPage();});
  root.querySelectorAll('[data-edit-supplier-payment]').forEach(btn=>btn.onclick=async()=>{st.editPaymentId=btn.dataset.editSupplierPayment||'';const p=payments.find(x=>x.id===st.editPaymentId);if(p)st.selected=p.source_type+':'+p.source_id;await financeSupplierPayablesPage();document.getElementById('supplierPaymentForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancel=document.getElementById('supplierPaymentCancel');if(cancel)cancel.onclick=async()=>{st.selected='';st.editPaymentId='';await financeSupplierPayablesPage();};
  bindAdminTransactionDeletes(()=>{st.editPaymentId='';return financeSupplierPayablesPage();});
  const print=document.getElementById('supplierPayablePrint');if(print)print.onclick=()=>printFinanceDocument('supplierPayablePrintArea','Laporan Hutang Supplier');const supplierExcel=document.getElementById('supplierPayablePrintExcel');if(supplierExcel)supplierExcel.onclick=()=>exportFinanceDocumentExcel('supplierPayablePrintArea','Laporan Hutang Supplier');
  const form=document.getElementById('supplierPaymentForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    if(!selected)return msg('Pilih tagihan supplier.');
    const fd=new FormData(form),amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<=0)return msg('Nominal pembayaran tidak valid.');
    const maxAmount=prodNum(selected.balance)+prodNum(editPayment?.amount);
    if(amount>maxAmount+0.0001)return msg('Nominal pembayaran melebihi sisa hutang Rp '+prodFmt(maxAmount,0)+'.');
    if(!await appConfirm('Bayar '+selected.supplier_name+' sebesar Rp '+prodFmt(amount,0)+'?'))return;
    let result;
    if(editPayment){
      result=await db.rpc('finance_correct_supplier_payment_v1',{
        p_id:editPayment.id,p_paid_on:String(fd.get('paid_on')||''),p_amount:amount,
        p_method:String(fd.get('method')||'TRANSFER'),p_reference:String(fd.get('reference')||'')||null,
        p_notes:String(fd.get('notes')||'')||null
      });
    }else{
      result=await db.rpc('finance_save_supplier_payment_atomic',{
        p_source_type:selected.source_type,p_source_id:selected.source_id,
        p_paid_on:String(fd.get('paid_on')||''),p_amount:amount,p_method:String(fd.get('method')||'TRANSFER'),
        p_reference:String(fd.get('reference')||'')||null,p_notes:String(fd.get('notes')||'')||null
      });
    }
    const {error}=result;
    if(error)return msg(error.message);
    st.selected='';st.editPaymentId='';
    await financeSupplierPayablesPage();
    msg(editPayment?'Pembayaran supplier berhasil diperbarui.':'Pembayaran supplier tersimpan. Sisa hutang dan Arus Kas sudah diperbarui otomatis.',true);
  };
}

function financeGeneralExpenseWarnings(scope,category,notes){
  const warnings=[];
  if(scope==='LUAR_KANTOR'&&category==='LISTRIK')warnings.push('Listrik kantor sebaiknya dicatat sebagai Kantor.');
  if(scope==='KANTOR'&&category==='BBM')warnings.push('BBM perjalanan sebaiknya dicatat sebagai Luar Kantor.');
  const text=String(notes||'').toLowerCase();
  if(/\b(kandang|doc|pakan|ovk|sekam|sapronak|panen)\b/.test(text))warnings.push(/\b(perbaikan|perawatan|renovasi|lampu|atap)\b/.test(text)?'Perbaikan khusus kandang dicatat di Perawatan Kandang.':'Biaya produksi kandang dicatat di BOP Produksi; pembelian sapronak atau tambah daging melalui modul sumber.');
  if(/\b(expedisi|ekspedisi|trip|ongkos kirim)\b/.test(text))warnings.push('Biaya trip usaha dicatat di BOP Expedisi.');
  return warnings;
}

async function financeBopGeneralPage(){
  const {data,error}=await db.from('bop_outside').select('*').order('incurred_on',{ascending:false}).order('created_at',{ascending:false});
  const allRows=data||[];
  window.__financeBopGeneralState=window.__financeBopGeneralState||{editId:'',scopeFilter:''};
  const scopeFilter=window.__financeBopGeneralState.scopeFilter||'';
  const rows=allRows.filter(x=>!scopeFilter||x.expense_scope===scopeFilter);
  const isSalary=x=>x.category==='GAJI'||x.category==='TENAGA_KERJA'&&/\b(gaji|salary)\b/i.test(String(x.notes||''));
  const salaryRows=rows.filter(isSalary),operationalRows=rows.filter(x=>!isSalary(x));
  const salaryTotal=salaryRows.reduce((n,x)=>n+prodNum(x.amount),0),operationalTotal=operationalRows.reduce((n,x)=>n+prodNum(x.amount),0);
  window.__financeBopGeneralState=window.__financeBopGeneralState||{editId:''};
  const editState=window.__financeBopGeneralState,editRow=allRows.find(x=>x.id===editState.editId)||null;
  const txn=txnListState(rows,'bop_outside','incurred_on',5);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  const bopUmumLabels={GAJI:'Gaji',INSENTIF:'Insentif',BBM:'BBM',PAJAK:'Pajak',LISTRIK:'Listrik',SERVIS:'Servis',ATK:'ATK',KONSUMSI:'Konsumsi',LANGGANAN:'Langganan',SUMBANGAN:'Sumbangan',LAINNYA:'Lainnya',TENAGA_KERJA:'Tenaga Kerja',TRANSPORTASI:'Transportasi',PERBAIKAN:'Perbaikan',ADMINISTRASI:'Administrasi'};
  let html='<section class="panel"><h3>Ringkasan Biaya Perusahaan</h3><p class="muted">Gaji karyawan ditampilkan terpisah agar angka BOP Umum tidak tercampur. Keduanya tetap masuk Arus Kas satu kali dari transaksi sumber.</p><div class="rhpp-summary-cards">'+
    '<div class="rhpp-summary-card"><span>BOP Umum selain gaji</span><strong>Rp '+prodFmt(operationalTotal,0)+'</strong><small>'+operationalRows.length+' transaksi</small></div>'+
    '<div class="rhpp-summary-card"><span>Gaji Karyawan</span><strong>Rp '+prodFmt(salaryTotal,0)+'</strong><small>'+salaryRows.length+' transaksi</small></div>'+
    '<div class="rhpp-summary-card"><span>Total Biaya Perusahaan</span><strong>Rp '+prodFmt(operationalTotal+salaryTotal,0)+'</strong></div></div></section>'+
    '<section class="panel"><h3>'+(editRow?'Edit BOP Umum':'Tambah BOP Umum')+'</h3>'+
    '<p class="muted">Pilih Kantor atau Luar Kantor. Biaya khusus kandang masuk BOP Produksi atau Perawatan Kandang; biaya trip usaha masuk Expedisi.</p>'+
    '<form id="bopOutsideForm" class="form-vertical">'+
      '<label>Tanggal<input name="incurred_on" type="date" value="'+esc(editRow?.incurred_on||today)+'" required></label>'+
      '<label>Jenis<select name="expense_scope" required><option value="">Pilih Jenis</option><option value="KANTOR" '+(editRow?.expense_scope==='KANTOR'?'selected':'')+'>Kantor</option><option value="LUAR_KANTOR" '+(editRow?.expense_scope==='LUAR_KANTOR'?'selected':'')+'>Luar Kantor</option></select></label>'+
      '<label>Kategori<select name="category" required><option value="">Pilih Kategori</option>'+
      ['GAJI','INSENTIF','BBM','PAJAK','LISTRIK','SERVIS','ATK','KONSUMSI','LANGGANAN','SUMBANGAN','LAINNYA'].map(k=>'<option value="'+k+'" '+(editRow?.category===k?'selected':'')+'>'+bopUmumLabels[k]+'</option>').join('')+
      (editRow&&['TENAGA_KERJA','TRANSPORTASI','PERBAIKAN','ADMINISTRASI'].includes(editRow.category)?'<option value="'+esc(editRow.category)+'" selected>'+esc(bopUmumLabels[editRow.category])+' (lama)</option>':'')+
      '</select></label><p id="bopScopeWarning" role="status" aria-live="polite" class="muted"></p>'+
      '<p class="muted">Transaksi ini mencatat biaya usaha. Sumber uang pembayaran tidak dibedakan di sistem.</p>'+
      '<label>No. Bukti / Referensi<input name="reference" value="'+esc(editRow?.reference||'')+'" placeholder="Nomor nota / transfer / bukti Excel"></label>'+
      '<label>Nominal (Rp)<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(editRow?fmtNumber(editRow.amount):'')+'" required></label>'+
      ''+
      '<label>Rincian transaksi<textarea name="notes" placeholder="Contoh: gaji Juli 2026 / bensin Om Burhan / kopi kantor" required>'+esc(editRow?.notes||'')+'</textarea></label>'+
      '<div class="report-actions"><button type="submit">'+(editRow?'Simpan Perubahan':'Simpan')+'</button>'+(editRow?'<button type="button" id="bopOutsideEditCancel">Batal Edit</button>':'')+'</div>'+
    '</form></section>'+
    '<section class="panel" id="bopUmumPrintArea"><div class="rhpp-section-head"><div><h3>Data BOP Umum</h3></div><div class="report-actions"><button type="button" id="bopUmumPrint">Cetak / PDF</button><button type="button" id="bopUmumPrintExcel">Excel</button></div></div>'+'<label>Jenis laporan<select id="bopGeneralScopeFilter"><option value="">Semua</option><option value="KANTOR" '+(scopeFilter==='KANTOR'?'selected':'')+'>Kantor</option><option value="LUAR_KANTOR" '+(scopeFilter==='LUAR_KANTOR'?'selected':'')+'>Luar Kantor</option></select></label>'+txn.controls+
      '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Nominal</th><th>Referensi</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>'+
      txn.rows.map(x=>'<tr><td>'+prodDateId(x.incurred_on)+'</td><td>'+esc(x.expense_scope==='KANTOR'?'Kantor':x.expense_scope==='LUAR_KANTOR'?'Luar Kantor':'Belum ditentukan')+'</td><td>'+esc(bopUmumLabels[x.category]||String(x.category||'').replaceAll('_',' '))+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>'+esc(x.reference||'-')+'</td><td>'+esc(financeOriginalNoteDisplay(x.notes))+'</td><td><div class="inline-actions"><button type="button" data-edit-bop-outside="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('bop_outside',x.id)+'</div></td></tr>').join('')+
      '</tbody></table></div>'+
      (!txn.total?'<p>Belum ada data.</p>':'')+txn.pager+
    '</section>';

  layout(html);
  bindNumberInputs();
  document.getElementById('bopGeneralScopeFilter').onchange=async ev=>{editState.scopeFilter=ev.target.value;await financeBopGeneralPage();};
  bindTxnList(txn,()=>financeBopGeneralPage());const bopUmumPrint=document.getElementById('bopUmumPrint');if(bopUmumPrint)bopUmumPrint.onclick=()=>printFinanceDocument('bopUmumPrintArea','Laporan BOP Umum');const bopUmumExcel=document.getElementById('bopUmumPrintExcel');if(bopUmumExcel)bopUmumExcel.onclick=()=>exportFinanceDocumentExcel('bopUmumPrintArea','Laporan BOP Umum');
  if(error)msg(error.message);

  root.querySelectorAll('[data-edit-bop-outside]').forEach(btn=>btn.onclick=async()=>{editState.editId=btn.dataset.editBopOutside||'';await financeBopGeneralPage();document.getElementById('bopOutsideForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('bopOutsideEditCancel');if(cancelEdit)cancelEdit.onclick=async()=>{editState.editId='';await financeBopGeneralPage();};
  bindAdminTransactionDeletes(()=>{editState.editId='';return financeBopGeneralPage();});
  const form=document.getElementById('bopOutsideForm');
  const showScopeWarning=()=>{
    if(!form)return [];
    const warnings=financeGeneralExpenseWarnings(form.elements.expense_scope.value,form.elements.category.value,form.elements.notes.value);
    const target=document.getElementById('bopScopeWarning');
    if(target){target.textContent=warnings.join(' ');target.className=warnings.length?'error':'muted';}
    return warnings;
  };
  if(form){['expense_scope','category'].forEach(k=>form.elements[k].addEventListener('change',showScopeWarning));form.elements.notes.addEventListener('input',showScopeWarning);showScopeWarning();}
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    const amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<0)return msg('Nominal BOP Umum tidak valid.');
    const payload={
      incurred_on:fd.get('incurred_on'),
      category:fd.get('category'),
      expense_scope:String(fd.get('expense_scope')||''),
      amount,
      paid_by:'COMPANY',
      reference:String(fd.get('reference')||'').trim()||null,
      notes:String(fd.get('notes')||'').trim()||null
    };
    if(!['KANTOR','LUAR_KANTOR'].includes(payload.expense_scope))return msg('Pilih Kantor atau Luar Kantor.');
    if(!payload.notes)return msg('Isi rincian transaksi agar tujuan biaya jelas.');
    const warnings=showScopeWarning();
    if(warnings.length&&!await appConfirm('PERINGATAN TUJUAN BIAYA\n\n'+warnings.join('\n')+'\n\nPeriksa jenis, kategori, dan menu tujuan. Tetap simpan sebagai BOP Umum?'))return;
    if(payload.reference&&allRows.some(x=>x.id!==editRow?.id&&String(x.reference||'').trim().toLowerCase()===payload.reference.toLowerCase()))return msg('Nomor bukti sudah tercatat di kamar ini. Periksa transaksi lama; jangan input ulang.');
    if(!await appConfirm('Tujuan: '+'BOP Umum'+'\nJenis: '+(payload.expense_scope==='KANTOR'?'Kantor':'Luar Kantor')+'\nKategori: '+bopUmumLabels[payload.category]+'\nTanggal: '+payload.incurred_on+'\nNominal: Rp '+prodFmt(amount,0)+'\n\nSimpan transaksi?'))return;
    const {error}=editRow?await db.from('bop_outside').update(payload).eq('id',editRow.id):await db.from('bop_outside').insert(payload);
    if(error)return msg(error.message);
    editState.editId='';
    await financeBopGeneralPage();
    msg(editRow?'BOP Umum berhasil diperbarui.':'BOP Umum berhasil disimpan.',true);
  };
}




async function financeExpeditionMasterPage(){
  const [dr,vr,cr,rr,der]=await Promise.all([
    db.from('expedition_drivers').select('*').order('code',{ascending:true}),
    db.from('expedition_vehicles').select('*').order('plate_number',{ascending:true}),
    db.from('expedition_customers').select('*').order('code',{ascending:true}),
    db.from('expedition_routes').select('*').order('code',{ascending:true}),
    db.from('expedition_destinations').select('*').order('code',{ascending:true})
  ]);
  const drivers=dr.data||[],vehicles=vr.data||[],customers=cr.data||[],routes=rr.data||[],destinations=der.data||[];
  const err=[dr,vr,cr,rr,der].find(x=>x.error)?.error;
  const expMasterCodes=[
    {key:'Driver',table:'expedition_drivers',rows:drivers,prefix:'DRV'},
    {key:'Route',table:'expedition_routes',rows:routes,prefix:'RTE'},
    {key:'Destination',table:'expedition_destinations',rows:destinations,prefix:'DST'},
    {key:'Customer',table:'expedition_customers',rows:customers,prefix:'CUST-EXP'}
  ];
  const nextExpCode=(rows,prefix)=>{
    const used=new Set((rows||[]).map(x=>String(x.code||'').toUpperCase()));
    let max=0;
    for(const row of rows||[]){
      const code=String(row.code||'').toUpperCase();
      if(!code.startsWith(prefix+'-'))continue;
      const suffix=code.slice(prefix.length+1);
      if(/^\d+$/.test(suffix))max=Math.max(max,Number(suffix));
    }
    let candidate;
    do{max++;candidate=prefix+'-'+String(max).padStart(3,'0');}while(used.has(candidate));
    return candidate;
  };
  const createMasterCode=async(table,prefix)=>{
    const {data,error}=await db.from(table).select('code');
    if(error)throw error;
    return nextExpCode(data||[],prefix);
  };
  const saveExpMaster=async(table,form,payload)=>{
    if(profile?.role!=='ADMIN')return {error:{message:'Hanya Administrator dapat mengubah Master Expedisi.'}};
    const id=form.dataset.editId||'';
    if(id)return db.from(table).update(payload).eq('id',id);
    const spec=expMasterCodes.find(x=>x.table===table);
    if(!spec)return db.from(table).insert(payload);
    for(let attempt=0;attempt<3;attempt++){
      try{payload.code=await createMasterCode(table,spec.prefix);}
      catch(error){return {error};}
      const result=await db.from(table).insert(payload);
      if(!result.error||result.error.code!=='23505')return result;
    }
    return {error:{message:'Kode otomatis sedang digunakan. Silakan simpan ulang.'}};
  };


  let html='<section class="panel"><h3>Master Data Expedisi</h3><p class="muted">Acuan untuk Data / Operasional dan hasil cetak Invoice Expedisi. Hanya Administrator yang mengubah master.</p><div class="report-actions"><button type="button" id="expMasterPrint">Cetak</button> <button type="button" id="expMasterPdf">PDF</button> <button type="button" id="expMasterExcel">Excel Semua Master</button></div></section>'+
    '<section class="panel"><h3>Master Sopir</h3><form id="expDriverForm" class="form-vertical">'+
      '<label>Kode<input name="code" readonly placeholder="Otomatis: DRV-001"></label>'+
      '<label>Nama Sopir<input name="name" required></label>'+
      '<label>No. HP<input name="phone"></label><label>No. SIM<input name="license_number"></label>'+
      '<label>Status<select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>'+
      '<button type="submit">Simpan Sopir</button></form>'+
      '<div class="tablewrap"><table id="expDriverTable"><thead><tr><th>Kode</th><th>Nama</th><th>HP</th><th>SIM</th><th>Status</th></tr></thead><tbody>'+
      drivers.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.phone||'-')+'</td><td>'+esc(x.license_number||'-')+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td></tr>').join('')+
      '</tbody></table></div></section>'+
    '<section class="panel"><h3>Master Kendaraan</h3><form id="expVehicleForm" class="form-vertical">'+
      '<label>No. Polisi<input name="plate_number" required placeholder="D 9399 UA"></label>'+
      '<label>Jenis Kendaraan<input name="vehicle_type"></label>'+
      '<label>Kapasitas Qty<input name="capacity_qty" type="text" inputmode="decimal" data-number="1"></label>'+
      '<label>Status<select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>'+
      '<button type="submit">Simpan Kendaraan</button></form>'+
      '<div class="tablewrap"><table id="expVehicleTable"><thead><tr><th>No. Polisi</th><th>Jenis</th><th>Kapasitas</th><th>Status</th></tr></thead><tbody>'+
      vehicles.map(x=>'<tr><td>'+esc(x.plate_number)+'</td><td>'+esc(x.vehicle_type||'-')+'</td><td>'+prodFmt(x.capacity_qty||0,0)+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td></tr>').join('')+
      '</tbody></table></div></section>'+
    '<section class="panel"><h3>Master Rute Expedisi</h3><form id="expRouteForm" class="form-vertical">'+
      '<label>Kode Rute<input name="code" readonly placeholder="Otomatis: RTE-001"></label>'+
      '<label>Zona / Rute<input name="route_name" required placeholder="Cirebon-Majalengka"></label>'+
      '<label>Harga Trip Default<input name="default_trip_price" type="text" inputmode="decimal" data-number="1" required></label>'+
      '<label>Status<select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>'+
      '<label>Catatan<input name="notes"></label>'+
      '<button type="submit">Simpan Rute</button></form>'+
      '<div class="tablewrap"><table id="expRouteTable"><thead><tr><th>Kode</th><th>Zona / Rute</th><th>Harga Trip</th><th>Status</th></tr></thead><tbody>'+
      routes.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.route_name)+'</td><td>Rp '+prodFmt(x.default_trip_price,0)+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td></tr>').join('')+
      '</tbody></table></div>'+
      '<div style="margin-top:14px"><h4>Biaya BOP Standar per Rute</h4><p class="muted">Isi sekali. Keuangan nanti cukup klik Masukkan BOP pada Trip.</p>'+
      '<form id="expRouteBopForm" class="form-vertical">'+
        '<label>Pilih Rute<select name="route_id" id="expRouteBopRoute" required><option value="">Pilih Rute</option>'+routes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.route_name)+'</option>').join('')+'</select></label>'+
        '<label>Operasional (total OP buku besar)<input name="bop_operasional" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>BBM<input name="bop_bbm" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>Tol<input name="bop_tol" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>Uang Jalan<input name="bop_uang_jalan" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>Makan Sopir<input name="bop_makan_sopir" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>Bongkar / Muat<input name="bop_bongkar_muat" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<button type="submit">Simpan Biaya BOP Rute</button>'+
      '</form></div></section>'+
    '<section class="panel"><h3>Master Tujuan Expedisi</h3><form id="expDestinationForm" class="form-vertical">'+
      '<label>Kode Tujuan<input name="code" readonly placeholder="Otomatis: DST-001"></label>'+
      '<label>Nama Tujuan<input name="name" required placeholder="Kandang Putri A"></label>'+
      '<label>Alamat / Lokasi<textarea name="address"></textarea></label>'+
      '<label>Status<select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>'+
      '<label>Catatan<input name="notes"></label>'+
      '<button type="submit">Simpan Tujuan</button></form>'+
      '<div class="tablewrap"><table id="expDestinationTable"><thead><tr><th>Kode</th><th>Tujuan</th><th>Alamat / Lokasi</th><th>Status</th></tr></thead><tbody>'+
      destinations.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.address||'-')+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td></tr>').join('')+
      '</tbody></table></div></section>'+
    '<section class="panel"><h3>Master Pelanggan Expedisi</h3><form id="expCustomerForm" class="form-vertical">'+
      '<label>Kode<input name="code" readonly placeholder="Otomatis: CUST-EXP-001"></label>'+
      '<label>Nama Pelanggan<input name="name" required></label>'+
      '<label>Alamat<textarea name="address"></textarea></label><label>Telepon<input name="phone"></label>'+
      '<label>NPWP<input name="tax_number"></label>'+
      '<label>Status<select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>'+
      '<button type="submit">Simpan Pelanggan</button></form>'+
      '<div class="tablewrap"><table id="expCustomerTable"><thead><tr><th>Kode</th><th>Pelanggan</th><th>Alamat</th><th>Telepon</th><th>Status</th></tr></thead><tbody>'+
      customers.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.address||'-')+'</td><td>'+esc(x.phone||'-')+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td></tr>').join('')+
      '</tbody></table></div></section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);
  if(profile?.role==='ADMIN'){
    for(const spec of expMasterCodes){
      const form=document.getElementById('exp'+spec.key+'Form');
      if(!form)continue;
      const field=form.elements.code;
      if(field){field.value=nextExpCode(spec.rows,spec.prefix);field.readOnly=true;}
    }
  }

  if(profile?.role==='ADMIN'){
    const editGroups=[
      {key:'Driver',rows:drivers,fields:['code','name','phone','license_number','active']},
      {key:'Vehicle',rows:vehicles,fields:['plate_number','vehicle_type','capacity_qty','active']},
      {key:'Route',rows:routes,fields:['code','route_name','default_trip_price','active','notes']},
      {key:'Destination',rows:destinations,fields:['code','name','address','active','notes']},
      {key:'Customer',rows:customers,fields:['code','name','address','phone','tax_number','active']}
    ];
    for(const group of editGroups){
      const table=document.getElementById('exp'+group.key+'Table');
      const form=document.getElementById('exp'+group.key+'Form');
      if(!table||!form)continue;
      const header=table.querySelector('thead tr');
      if(header){const th=document.createElement('th');th.textContent='Aksi';header.appendChild(th);}
      table.querySelectorAll('tbody tr').forEach((tr,i)=>{
        const item=group.rows[i];if(!item)return;
        const td=document.createElement('td'),button=document.createElement('button');
        button.type='button';button.textContent='Edit';
        button.onclick=()=>{
          form.dataset.editId=item.id;
          for(const field of group.fields){
            const input=form.elements[field];if(!input)continue;
            const value=item[field];
            input.value=field==='active'?String(value!==false):(['capacity_qty','default_trip_price'].includes(field)?fmtNumber(value??0):String(value??''));
          }
          const submit=form.querySelector('button[type="submit"]');
          if(submit)submit.textContent='Simpan Perubahan';
          cancel.hidden=false;
          form.scrollIntoView({behavior:'smooth',block:'start'});
        };
        td.appendChild(button);tr.appendChild(td);
      });
      const cancel=document.createElement('button');
      cancel.type='button';cancel.textContent='Batal Edit';cancel.hidden=true;
      cancel.onclick=()=>{
        form.reset();delete form.dataset.editId;cancel.hidden=true;
        const spec=expMasterCodes.find(x=>x.key===group.key);
        if(spec&&form.elements.code)form.elements.code.value=nextExpCode(spec.rows,spec.prefix);
        const submit=form.querySelector('button[type="submit"]');
        if(submit)submit.textContent='Simpan '+({Driver:'Sopir',Vehicle:'Kendaraan',Route:'Rute',Destination:'Tujuan',Customer:'Pelanggan'}[group.key]);
      };
      form.appendChild(cancel);
    }
  }

  attachListFilter({tableId:'expDriverTable',fields:[{label:'Kode',col:0,placeholder:'Cari kode'},{label:'Nama',col:1,placeholder:'Cari sopir'},{label:'Status',col:4,placeholder:'AKTIF / NONAKTIF'}]});
  attachListFilter({tableId:'expVehicleTable',fields:[{label:'No. Polisi',col:0,placeholder:'Cari kendaraan'},{label:'Jenis',col:1,placeholder:'Cari jenis'},{label:'Status',col:3,placeholder:'AKTIF / NONAKTIF'}]});
  attachListFilter({tableId:'expRouteTable',fields:[{label:'Kode',col:0,placeholder:'Cari kode'},{label:'Rute',col:1,placeholder:'Cari rute'},{label:'Status',col:3,placeholder:'AKTIF / NONAKTIF'}]});
  attachListFilter({tableId:'expDestinationTable',fields:[{label:'Kode',col:0,placeholder:'Cari kode'},{label:'Tujuan',col:1,placeholder:'Cari tujuan'},{label:'Alamat',col:2,placeholder:'Cari alamat'},{label:'Status',col:3,placeholder:'AKTIF / NONAKTIF'}]});
  attachListFilter({tableId:'expCustomerTable',fields:[{label:'Kode',col:0,placeholder:'Cari kode'},{label:'Pelanggan',col:1,placeholder:'Cari pelanggan'},{label:'Status',col:4,placeholder:'AKTIF / NONAKTIF'}]});
  const masterTables=[['Master Sopir','expDriverTable'],['Master Kendaraan','expVehicleTable'],['Master Rute','expRouteTable'],['Master Tujuan','expDestinationTable'],['Master Pelanggan','expCustomerTable']];
  const masterBody=()=>masterTables.map(([t,id])=>{const copy=document.getElementById(id).cloneNode(true);copy.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length&&tr.cells[tr.cells.length-1].textContent.trim()==='Aksi')tr.deleteCell(-1);else if(tr.cells.length&&tr.cells[tr.cells.length-1].querySelector('button'))tr.deleteCell(-1);});return '<h3>'+esc(t)+'</h3>'+copy.outerHTML;}).join('');
  const printMaster=async pdf=>{const {data:company}=await db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle();const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+(pdf?'Master_Expedisi_PDF':'Master Expedisi')+'</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;margin-bottom:8px}.head img{width:52px;height:52px;object-fit:contain}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body><div class="head"><img src="'+esc(company?.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company?.company_name||company?.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company?.address||'')+'</div></div></div><h2>Master Data Expedisi</h2>'+masterBody()+'</body></html>');w.document.close();setTimeout(()=>{w.focus();w.print();},500);};
  document.getElementById('expMasterPrint').onclick=()=>printMaster(false);
  document.getElementById('expMasterPdf').onclick=()=>BMSCore.savePdfHtml('<html><head><meta charset="utf-8"></head><body><h2>Master Data Expedisi</h2>'+masterBody()+'</body></html>','Master_Expedisi.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
  document.getElementById('expMasterExcel').onclick=()=>{const sheets=masterTables.map(([name,id])=>{const table=document.getElementById(id),rows=[...table.rows].map(tr=>[...tr.cells].filter(td=>!td.querySelector('button')&&td.textContent.trim()!=='Aksi').map(td=>td.textContent.trim()));return {name,rows};});BMSCore.downloadWorkbook(sheets,'Master_Expedisi');};

  const d=document.getElementById('expDriverForm');if(d)d.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(d);
    const {error}=await saveExpMaster('expedition_drivers',d,{code:String(fd.get('code')||'').trim(),name:String(fd.get('name')||'').trim(),phone:String(fd.get('phone')||'')||null,license_number:String(fd.get('license_number')||'')||null,active:String(fd.get('active'))==='true'});
    if(error)return msg(error.message);await financeExpeditionMasterPage();msg('Master sopir tersimpan.',true);
  };
  const v=document.getElementById('expVehicleForm');if(v)v.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(v),cap=normalizeInputID(fd.get('capacity_qty'));
    const {error}=await saveExpMaster('expedition_vehicles',v,{plate_number:String(fd.get('plate_number')||'').trim().toUpperCase(),vehicle_type:String(fd.get('vehicle_type')||'')||null,capacity_qty:cap,active:String(fd.get('active'))==='true'});
    if(error)return msg(error.message);await financeExpeditionMasterPage();msg('Master kendaraan tersimpan.',true);
  };
  const r=document.getElementById('expRouteForm');if(r)r.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(r),price=normalizeInputID(fd.get('default_trip_price'));
    if(price===null||price<0)return msg('Harga trip tidak valid.');
    const {error}=await saveExpMaster('expedition_routes',r,{code:String(fd.get('code')||'').trim(),route_name:String(fd.get('route_name')||'').trim(),default_trip_price:price,active:String(fd.get('active'))==='true',notes:String(fd.get('notes')||'')||null});
    if(error)return msg(error.message);await financeExpeditionMasterPage();msg('Master rute tersimpan.',true);
  };
  const rb=document.getElementById('expRouteBopForm'),rbRoute=document.getElementById('expRouteBopRoute');
  const syncRouteBopForm=()=>{
    if(!rb||!rbRoute)return;
    const x=routes.find(v=>v.id===rbRoute.value);
    for(const k of ['bop_operasional','bop_bbm','bop_tol','bop_uang_jalan','bop_makan_sopir','bop_bongkar_muat']){
      rb.elements[k].value=fmtNumber(prodNum(x?.[k]||0));
    }
  };
  if(rbRoute)rbRoute.onchange=syncRouteBopForm;
  if(rb)rb.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(rb),id=String(fd.get('route_id')||'');
    if(!id)return msg('Pilih rute.');
    const payload={};
    for(const k of ['bop_operasional','bop_bbm','bop_tol','bop_uang_jalan','bop_makan_sopir','bop_bongkar_muat']){
      const v=normalizeInputID(fd.get(k)); if(v===null||v<0)return msg('Biaya BOP rute tidak valid.'); payload[k]=v;
    }
    const {error}=await db.from('expedition_routes').update(payload).eq('id',id);
    if(error)return msg(error.message);
    await financeExpeditionMasterPage();msg('Biaya BOP standar rute tersimpan.',true);
  };
  const de=document.getElementById('expDestinationForm');if(de)de.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(de);
    const {error}=await saveExpMaster('expedition_destinations',de,{
      code:String(fd.get('code')||'').trim(),
      name:String(fd.get('name')||'').trim(),
      address:String(fd.get('address')||'')||null,
      active:String(fd.get('active'))==='true',
      notes:String(fd.get('notes')||'')||null
    });
    if(error)return msg(error.message);await financeExpeditionMasterPage();msg('Master tujuan tersimpan.',true);
  };
  const c=document.getElementById('expCustomerForm');if(c)c.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(c);
    const {error}=await saveExpMaster('expedition_customers',c,{code:String(fd.get('code')||'').trim(),name:String(fd.get('name')||'').trim(),address:String(fd.get('address')||'')||null,phone:String(fd.get('phone')||'')||null,tax_number:String(fd.get('tax_number')||'')||null,active:String(fd.get('active'))==='true'});
    if(error)return msg(error.message);await financeExpeditionMasterPage();msg('Master pelanggan tersimpan.',true);
  };
}


async function financeExpeditionPaymentPage(){
  const [ir,sr,pr]=await Promise.all([
    db.from('finance_expedition_invoices').select('*').order('invoice_date',{ascending:false}).order('created_at',{ascending:false}),
    db.rpc('finance_expedition_summary_v1'),
    db.from('finance_expedition_payments').select('*').order('paid_on',{ascending:false}).order('created_at',{ascending:false})
  ]);
  const invoices=ir.data||[],summaries=sr.data||[],payments=pr.data||[];
  const err=[ir,sr,pr].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const invoiceLabel=id=>{
    const i=invoices.find(x=>x.id===id),x=summaries.find(v=>v.invoice_id===id);
    return i?i.invoice_number+' · '+i.customer_name+' · Sisa Rp '+prodFmt(x?.receivable||0,0):'-';
  };
  const totalInvoice=summaries.reduce((n,x)=>n+prodNum(x.invoice_total),0);
  const totalPaid=summaries.reduce((n,x)=>n+prodNum(x.paid_total),0);
  const totalReceivable=summaries.reduce((n,x)=>n+prodNum(x.receivable),0);
  window.__fxPaymentEdit=window.__fxPaymentEdit||'';
  window.__fxPaymentHistory=window.__fxPaymentHistory||{from:'',to:'',shown:false};
  const fxHistoryState=window.__fxPaymentHistory;
  const fxHistoryRows=fxHistoryState.shown?payments.filter(p=>
    (!fxHistoryState.from||String(p.paid_on||'')>=fxHistoryState.from)&&
    (!fxHistoryState.to||String(p.paid_on||'')<=fxHistoryState.to)
  ):[];
  const editPayment=payments.find(x=>x.id===window.__fxPaymentEdit)||null;

  let html='<section class="panel"><h3>Penerimaan Expedisi</h3><p class="muted">Khusus Keuangan / Administrator. Pembayaran otomatis mengurangi piutang invoice Expedisi.</p>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Invoice</span><strong>Rp '+prodFmt(totalInvoice,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sudah Dibayar</span><strong>Rp '+prodFmt(totalPaid,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sisa Piutang</span><strong>Rp '+prodFmt(totalReceivable,0)+'</strong></div>'+
    '</div></section>'+
    '<section class="panel"><h3>'+(editPayment?'Edit Penerimaan Expedisi':'Catat Pembayaran')+'</h3><form id="fxPaymentForm" class="form-vertical">'+
      '<label>Invoice<select name="invoice_id" required><option value="">Pilih Invoice</option>'+
        summaries.filter(x=>(prodNum(x.receivable)>0||x.invoice_id===editPayment?.invoice_id)&&x.status!=="VOID").map(x=>'<option value="'+esc(x.invoice_id)+'" '+(editPayment?.invoice_id===x.invoice_id?'selected':'')+'>'+esc(invoiceLabel(x.invoice_id))+'</option>').join('')+
      '</select></label>'+
      '<label>Tanggal Bayar<input name="paid_on" type="date" value="'+esc(editPayment?.paid_on||today)+'" required></label>'+
      '<label>Nominal<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(editPayment?fmtNumber(editPayment.amount):'')+'" required></label>'+
      '<label>Metode<select name="method"><option value="TRANSFER" '+((editPayment?.method||'TRANSFER')==='TRANSFER'?'selected':'')+'>Transfer</option><option value="TUNAI" '+(editPayment?.method==='TUNAI'?'selected':'')+'>Tunai</option></select></label>'+
      '<label>Referensi<input name="reference" value="'+esc(editPayment?.reference||'')+'" placeholder="Opsional"></label>'+
      '<label>Catatan<textarea name="notes">'+esc(editPayment?.notes||'')+'</textarea></label>'+
      '<div class="report-actions"><button type="submit">'+(editPayment?'Simpan Perubahan':'Simpan Pembayaran')+'</button>'+(editPayment?'<button type="button" id="fxPaymentCancelEdit">Batal Edit</button>'+adminDeleteTxnButton('finance_expedition_payments',editPayment.id):'')+'</div>'+
    '</form></section>'+
    '<section class="panel"><h3>Piutang Invoice Expedisi</h3><div class="tablewrap"><table><thead><tr><th>No Invoice</th><th>Pelanggan</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Status</th></tr></thead><tbody>'+
      summaries.map(x=>'<tr><td>'+esc(x.invoice_number)+'</td><td>'+esc(x.customer_name)+'</td><td>Rp '+prodFmt(x.invoice_total,0)+'</td><td>Rp '+prodFmt(x.paid_total,0)+'</td><td><strong>Rp '+prodFmt(x.receivable,0)+'</strong></td><td>'+esc(x.status)+'</td></tr>').join('')+
    '</tbody></table></div></section>'+
    '<section class="panel"><h3>Riwayat Penerimaan Expedisi</h3>'+
      '<form id="fxPaymentHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
        '<label>Tanggal Dari<input type="date" name="from" value="'+esc(fxHistoryState.from||'')+'"></label>'+
        '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(fxHistoryState.to||'')+'"></label>'+
        '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="fxPaymentHistoryReset">Reset</button></div>'+
      '</form>'+
      (fxHistoryState.shown?'<div class="report-actions"><button type="button" id="fxPaymentHistoryPrint">Cetak</button> <button type="button" id="fxPaymentHistoryPdf">PDF</button> <button type="button" id="fxPaymentHistoryExcel">Excel</button></div><div class="tablewrap"><table id="fxPaymentHistoryTable"><thead><tr><th>Tanggal</th><th>Invoice</th><th>Metode</th><th>Nominal</th><th>Referensi</th><th>Aksi</th></tr></thead><tbody>'+fxHistoryRows.map(p=>{const i=invoices.find(x=>x.id===p.invoice_id);return '<tr><td>'+prodDateId(p.paid_on)+'</td><td>'+esc(i?.invoice_number||'-')+'</td><td>'+esc(p.method||'-')+'</td><td>Rp '+prodFmt(p.amount,0)+'</td><td>'+esc(p.reference||'-')+'</td><td><div class="inline-actions"><button type="button" data-edit-exp-payment="'+esc(p.id)+'">Edit</button>'+adminDeleteTxnButton('finance_expedition_payments',p.id)+'</div></td></tr>';}).join('')+'</tbody></table></div>'+(fxHistoryRows.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);

  const fxPaymentHistoryFilter=document.getElementById('fxPaymentHistoryFilter');
  const fxPaymentHistoryReset=document.getElementById('fxPaymentHistoryReset');
  if(fxPaymentHistoryFilter)fxPaymentHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(fxPaymentHistoryFilter);fxHistoryState.from=String(fd.get('from')||'');fxHistoryState.to=String(fd.get('to')||'');if(fxHistoryState.from&&fxHistoryState.to&&fxHistoryState.from>fxHistoryState.to){const t=fxHistoryState.from;fxHistoryState.from=fxHistoryState.to;fxHistoryState.to=t}fxHistoryState.shown=true;await financeExpeditionPaymentPage();};
  if(fxPaymentHistoryReset)fxPaymentHistoryReset.onclick=async()=>{window.__fxPaymentHistory={from:'',to:'',shown:false};await financeExpeditionPaymentPage();};
  if(fxHistoryState.shown)bindTableExportActions({tableId:'fxPaymentHistoryTable',printId:'fxPaymentHistoryPrint',pdfId:'fxPaymentHistoryPdf',excelId:'fxPaymentHistoryExcel',title:'Riwayat Penerimaan Expedisi',filename:'Riwayat_Penerimaan_Expedisi',filterText:'Periode '+(fxHistoryState.from||'-')+' s/d '+(fxHistoryState.to||'-'),dropLast:true});

  root.querySelectorAll('[data-edit-exp-payment]').forEach(btn=>btn.onclick=async()=>{window.__fxPaymentEdit=btn.dataset.editExpPayment||'';await financeExpeditionPaymentPage();document.getElementById('fxPaymentForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('fxPaymentCancelEdit');if(cancelEdit)cancelEdit.onclick=async()=>{window.__fxPaymentEdit='';await financeExpeditionPaymentPage();};
  bindAdminTransactionDeletes(()=>{window.__fxPaymentEdit='';return financeExpeditionPaymentPage();});
  const pf=document.getElementById('fxPaymentForm');
  if(pf)pf.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(pf),id=String(fd.get('invoice_id')||''),amount=normalizeInputID(fd.get('amount'));
    const x=summaries.find(v=>v.invoice_id===id);
    if(!x)return msg('Pilih invoice.');
    const maxAmount=prodNum(x.receivable)+prodNum(editPayment?.amount);
    if(amount===null||amount<=0||amount>maxAmount)return msg('Nominal pembayaran tidak valid atau melebihi piutang Rp '+prodFmt(maxAmount,0)+'.');
    let result;
    if(editPayment){
      result=await db.from('finance_expedition_payments').update({
        invoice_id:id,paid_on:String(fd.get('paid_on')||''),amount,
        method:String(fd.get('method')||'TRANSFER'),reference:String(fd.get('reference')||'')||null,notes:String(fd.get('notes')||'')||null
      }).eq('id',editPayment.id);
    }else{
      result=await db.rpc('finance_save_expedition_payment_atomic',{
        p_invoice_id:id,p_paid_on:String(fd.get('paid_on')||''),p_amount:amount,
        p_method:String(fd.get('method')||'TRANSFER'),p_reference:String(fd.get('reference')||'')||null,p_notes:String(fd.get('notes')||'')||null
      });
    }
    const {error}=result;
    if(error)return msg(error.message);
    window.__fxPaymentEdit='';
    await financeExpeditionPaymentPage();msg(editPayment?'Penerimaan Expedisi berhasil diperbarui.':'Penerimaan Expedisi tersimpan dan piutang diperbarui.',true);
  };
}

async function financeExpeditionBusinessPage(){
  const [tr,tdr,ir,iir,pr,sr,cpr,dr,vr,cur,rr,der,itr]=await Promise.all([
    db.from('finance_expedition_trips').select('*').order('trip_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_trip_destinations').select('*').order('line_no',{ascending:true}),
    db.from('finance_expedition_invoices').select('*').order('invoice_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_invoice_items').select('invoice_id,trip_id'),
    db.from('finance_expedition_payments').select('*').order('paid_on',{ascending:false}),
    db.rpc('finance_expedition_summary_v1'),
    db.from('company_profile').select('*').eq('id',true).maybeSingle(),
    db.from('expedition_drivers').select('*').eq('active',true).order('name',{ascending:true}),
    db.from('expedition_vehicles').select('*').eq('active',true).order('plate_number',{ascending:true}),
    db.from('expedition_customers').select('*').eq('active',true).order('name',{ascending:true}),
    db.from('expedition_routes').select('*').eq('active',true).order('route_name',{ascending:true}),
    db.from('expedition_destinations').select('*').eq('active',true).order('name',{ascending:true}),
    db.from('items').select('id,name,category,feed_phase,unit').eq('category','PAKAN').order('name',{ascending:true})
  ]);
  const trips=tr.data||[],tripDetails=tdr.data||[],invoices=ir.data||[],links=iir.data||[],payments=pr.data||[],summaries=sr.data||[],company=cpr.data||{};
  const drivers=dr.data||[],vehicles=vr.data||[],customers=cur.data||[],routes=rr.data||[],destinations=der.data||[],feedItems=itr.data||[];
  const err=[tr,tdr,ir,iir,pr,sr,cpr,dr,vr,cur,rr,der,itr].find(x=>x.error)?.error;
  const role=profile?.role||'';
  const canOps=['ADMIN','LOGISTIK'].includes(role);
  const canReport=['ADMIN','LOGISTIK','KEUANGAN','OWNER'].includes(role);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const used=new Set(links.map(x=>x.trip_id));
  const unbilled=trips.filter(x=>!used.has(x.id)&&x.reference!=='KAS_JALAN_PENDING_SJ');
  const tripTotal=t=>prodNum(t.trip_price)+prodNum(t.additional)-prodNum(t.deduction);
  const detailsForTrip=id=>tripDetails.filter(x=>x.trip_id===id).sort((a,b)=>prodNum(a.line_no)-prodNum(b.line_no));
  const destinationText=t=>{const ds=detailsForTrip(t.id);return ds.length?ds.map(x=>x.destination_name).join(' • '):(t.destination||'-');};
  const cargoText=t=>{const ds=detailsForTrip(t.id);return ds.length?ds.map(x=>[x.cargo,prodNum(x.qty)?prodFmt(x.qty,Number.isInteger(prodNum(x.qty))?0:2):'',x.unit||''].filter(Boolean).join(' ')).join(' • '):(t.cargo||'-');};
  const totalQtyFor=t=>{const ds=detailsForTrip(t.id);return ds.length?ds.reduce((n,x)=>n+prodNum(x.qty),0):prodNum(t.total_qty);};
  const invoiceTrips=id=>links.filter(x=>x.invoice_id===id).map(x=>trips.find(t=>t.id===x.trip_id)).filter(Boolean).sort((a,b)=>String(a.trip_date||'').localeCompare(String(b.trip_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id||'').localeCompare(String(b.id||'')));
  const sumFor=id=>summaries.find(x=>x.invoice_id===id);
  const invoiceLabel=id=>{const i=invoices.find(x=>x.id===id),x=sumFor(id);return i?i.invoice_number+' · '+i.customer_name+' · Sisa Rp '+prodFmt(x?.receivable||0,0):'-';};
  const totalInvoice=summaries.reduce((n,x)=>n+prodNum(x.invoice_total),0);
  const totalPaid=summaries.reduce((n,x)=>n+prodNum(x.paid_total),0);
  const totalReceivable=summaries.reduce((n,x)=>n+prodNum(x.receivable),0);
  window.__fxTripEdit=window.__fxTripEdit||'';
  window.__fxInvoiceEdit=window.__fxInvoiceEdit||'';
  const selectedTripEdit=trips.find(x=>x.id===window.__fxTripEdit)||null;
  const selectedInvoiceEdit=invoices.find(x=>x.id===window.__fxInvoiceEdit)||null;
  window.__fxSjPendingEdit=window.__fxSjPendingEdit||'';
  const pendingSj=trips.filter(x=>x.reference==='KAS_JALAN_PENDING_SJ');
  const selectedSj=pendingSj.find(x=>x.id===window.__fxSjPendingEdit)||null;
  const selectedInvoiceTripIds=new Set(selectedInvoiceEdit?links.filter(x=>x.invoice_id===selectedInvoiceEdit.id).map(x=>x.trip_id):[]);
  const invoiceAvailable=selectedInvoiceEdit?trips.filter(t=>!used.has(t.id)||selectedInvoiceTripIds.has(t.id)):unbilled;

  let html='<section class="panel"><h3>Expedisi</h3><p class="muted"><strong>Unit usaha terpisah dari RHPP/Kandang.</strong> '+
    (role==='LOGISTIK'?'Logistik mengelola Trip dan Invoice.':role==='KEUANGAN'?'Keuangan mengelola Pembayaran, Piutang dan BOP Expedisi.':role==='OWNER'?'Owner melihat laporan Expedisi.':'Administrator memiliki akses penuh.')+
    '</p></section>';

  if(canOps&&pendingSj.length){
    html+='<section class="panel"><h3>Antrean Surat Jalan dari Keuangan</h3><p class="muted">Kas Jalan sudah dicatat Keuangan. Logistik melengkapi SJ/MTS setelah dokumen kembali.</p>'+
      '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Sopir</th><th>Truk</th><th>Rute</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
      pendingSj.map(t=>'<tr><td>'+prodDateId(t.trip_date)+'</td><td>'+esc(t.driver||'-')+'</td><td>'+esc(t.vehicle||'-')+'</td><td>'+esc(t.zone||'-')+'</td><td><span class="finance-status finance-status-wait">MENUNGGU SURAT JALAN</span></td><td><button type="button" data-complete-sj="'+esc(t.id)+'">Lengkapi SJ</button></td></tr>').join('')+
      '</tbody></table></div></section>';
  }
  if(canOps&&selectedSj){
    const route=routes.find(x=>x.route_name===selectedSj.zone);
    html+='<section class="panel"><h3>Lengkapi Surat Jalan / MTS</h3><form id="fxCompleteSjForm" class="form-vertical">'+
      '<label>Tanggal Trip<input type="text" value="'+esc(prodDateId(selectedSj.trip_date))+'" readonly></label>'+
      '<label>Sopir / Truk<input type="text" value="'+esc((selectedSj.driver||'-')+' · '+(selectedSj.vehicle||'-'))+'" readonly></label>'+
      '<label>Rute<input type="text" value="'+esc(selectedSj.zone||'-')+'" readonly></label>'+
      '<label>No. Surat Jalan / MTS<input name="mts_sj" required></label><label>RR<input name="rr"></label>'+
      '<label>Tujuan<select name="destination_id" required><option value="">Pilih Tujuan</option>'+destinations.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
      '<label>Muatan<select name="cargo" required><option value="">Pilih Muatan</option>'+feedItems.map(x=>'<option value="'+esc(x.name.trim())+'">'+esc(x.name.trim())+'</option>').join('')+'</select></label>'+
      '<label>Qty<input name="qty" type="text" inputmode="decimal"></label><label>Satuan<select name="unit"><option value="zak">zak</option><option value="kg">kg</option><option value="ekor">ekor</option><option value="unit">unit</option></select></label>'+
      '<label>Harga Trip<input name="trip_price" type="text" inputmode="decimal" data-number="1" value="'+fmtNumber(route?.default_trip_price||0)+'" required></label>'+
      '<label>Tambahan<input name="additional" type="text" inputmode="decimal" data-number="1" value="0"></label><label>Potongan<input name="deduction" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
      '<label>Catatan<textarea name="notes">'+esc(selectedSj.notes||'')+'</textarea></label>'+
      '<div class="inline-actions"><button type="submit">Simpan & Tandai Lengkap</button><button type="button" id="fxCompleteSjCancel" class="btn-secondary">Batal</button></div></form></section>';
  }

  if(canReport){
    html+='<section class="panel"><h3>Ringkasan Expedisi</h3><div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Invoice</span><strong>Rp '+prodFmt(totalInvoice,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Kas Diterima</span><strong>Rp '+prodFmt(totalPaid,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Piutang</span><strong>Rp '+prodFmt(totalReceivable,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Trip Belum Ditagihkan</span><strong>'+unbilled.length+'</strong></div>'+
    '</div></section>';
  }

  if(canOps&&selectedTripEdit){
    const editDetails=detailsForTrip(selectedTripEdit.id);
    html+='<section class="panel"><h3>Koreksi Trip Expedisi</h3><p class="muted">Perubahan trip yang sudah masuk invoice akan divalidasi agar total invoice tidak lebih kecil dari pembayaran yang sudah diterima.</p>'+
      '<form id="fxTripCorrectionForm" class="form-vertical">'+
        '<label>Tanggal<input name="trip_date" type="date" value="'+esc(selectedTripEdit.trip_date||today)+'" required></label>'+
        '<label>MTS/SJ<input name="mts_sj" value="'+esc(selectedTripEdit.mts_sj||'')+'"></label>'+
        '<label>RR<input name="rr" value="'+esc(selectedTripEdit.rr||'')+'"></label>'+
        '<label>Sopir<select name="driver" required><option value="">Pilih Sopir</option>'+drivers.map(x=>'<option value="'+esc(x.name)+'" '+(selectedTripEdit.driver===x.name?'selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
        '<label>Truk<select name="vehicle" required><option value="">Pilih Kendaraan</option>'+vehicles.map(x=>'<option value="'+esc(x.plate_number)+'" '+(selectedTripEdit.vehicle===x.plate_number?'selected':'')+'>'+esc(x.plate_number+(x.vehicle_type?' · '+x.vehicle_type:''))+'</option>').join('')+'</select></label>'+
        '<label>Zona / Rute<select name="route_id" required><option value="">Pilih Rute</option>'+routes.map(x=>'<option value="'+esc(x.id)+'" '+(selectedTripEdit.zone===x.route_name?'selected':'')+'>'+esc(x.code+' · '+x.route_name+' · Rp '+prodFmt(x.default_trip_price,0))+'</option>').join('')+'</select></label>'+
        '<input type="hidden" name="zone" value="'+esc(selectedTripEdit.zone||'')+'">'+
        '<fieldset><legend>Detail Tujuan / Muatan</legend>'+
          (editDetails.length?editDetails.map((d,idx)=>'<div class="fx-destination-row" data-correction-line="'+idx+'">'+
            '<label>Tujuan<select name="dest_'+idx+'" required><option value="">Pilih Tujuan</option>'+destinations.map(x=>'<option value="'+esc(x.id)+'" '+(d.destination_id===x.id?'selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
            '<label>Jenis Muatan<input name="cargo_'+idx+'" value="'+esc(d.cargo||'')+'" required></label>'+
            '<label>Qty<input name="qty_'+idx+'" type="text" inputmode="decimal" value="'+(d.qty==null?'':fmtNumber(d.qty))+'"></label>'+
            '<label>Satuan<select name="unit_'+idx+'"><option value="zak" '+(d.unit==='zak'?'selected':'')+'>zak</option><option value="kg" '+(d.unit==='kg'?'selected':'')+'>kg</option><option value="ekor" '+(d.unit==='ekor'?'selected':'')+'>ekor</option><option value="unit" '+(d.unit==='unit'?'selected':'')+'>unit</option></select></label>'+
          '</div>').join(''):'<p class="muted">Detail tujuan lama tidak ditemukan. Gunakan data tujuan yang sudah ada di trip.</p>')+
        '</fieldset>'+
        '<label>Harga Trip<input name="trip_price" type="text" inputmode="decimal" data-number="1" value="'+fmtNumber(selectedTripEdit.trip_price)+'" required></label>'+
        '<label>Tambahan<input name="additional" type="text" inputmode="decimal" data-number="1" value="'+fmtNumber(selectedTripEdit.additional||0)+'"></label>'+
        '<label>Potongan<input name="deduction" type="text" inputmode="decimal" data-number="1" value="'+fmtNumber(selectedTripEdit.deduction||0)+'"></label>'+
        '<label>Catatan<textarea name="notes">'+esc(selectedTripEdit.notes||'')+'</textarea></label>'+
        '<div class="inline-actions"><button type="submit">Simpan Koreksi</button><button type="button" id="fxTripCorrectionCancel" class="btn-secondary">Batal</button>'+(profile?.role==='ADMIN'?'<button type="button" id="fxTripCorrectionDelete" class="btn-danger">Hapus Trip</button>':'')+'</div>'+
      '</form></section>';
  }

  if(canOps&&selectedInvoiceEdit){
    const currentSummary=sumFor(selectedInvoiceEdit.id);
    html+='<section class="panel"><h3>Koreksi Invoice Expedisi</h3><p class="muted">No. Invoice tetap <strong>'+esc(selectedInvoiceEdit.invoice_number)+'</strong>. Total baru tidak boleh lebih kecil dari pembayaran yang sudah diterima Rp '+prodFmt(currentSummary?.paid_total||0,0)+'.</p>'+
      '<form id="fxInvoiceCorrectionForm" class="form-vertical">'+
        '<label>Tanggal Invoice<input name="invoice_date" type="date" value="'+esc(selectedInvoiceEdit.invoice_date||today)+'" required></label>'+
        '<label>Jatuh Tempo<input name="due_date" type="date" value="'+esc(selectedInvoiceEdit.due_date||'')+'"></label>'+
        '<label>Tagihan Kepada<select name="customer_id" required><option value="">Pilih Pelanggan</option>'+customers.map(x=>'<option value="'+esc(x.id)+'" '+(selectedInvoiceEdit.customer_name===x.name?'selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
        '<fieldset class="fx-trip-picker"><legend>Pilih Trip</legend><div class="fx-trip-list">'+
          invoiceAvailable.map(t=>'<label class="fx-trip-option"><input type="checkbox" name="trip_ids" value="'+esc(t.id)+'" '+(selectedInvoiceTripIds.has(t.id)?'checked':'')+'><span class="fx-trip-checkmark"></span><span class="fx-trip-text"><strong>'+esc(prodDateId(t.trip_date)+' · '+(t.mts_sj||'-'))+'</strong><small>'+esc(destinationText(t)+' · Rp '+prodFmt(tripTotal(t),0))+'</small></span></label>').join('')+
        '</div></fieldset>'+
        '<label>Catatan<textarea name="notes">'+esc(selectedInvoiceEdit.notes||'')+'</textarea></label>'+
        '<div class="inline-actions"><button type="submit">Simpan Koreksi</button><button type="button" id="fxInvoiceCorrectionCancel" class="btn-secondary">Batal</button>'+(profile?.role==='ADMIN'?'<button type="button" id="fxInvoiceCorrectionDelete" class="btn-danger">Hapus Invoice</button>':'')+'</div>'+
      '</form></section>';
  }

  if(canOps){
    html+='<section class="panel"><h3>Tambah Trip Expedisi</h3>'+
      '<form id="fxTripForm" class="form-vertical">'+
        '<label>Tanggal<input name="trip_date" type="date" value="'+today+'" required></label>'+
        '<label>MTS/SJ<input name="mts_sj"></label><label>RR<input name="rr"></label>'+
        '<label>Sopir<select name="driver" required><option value="">Pilih Sopir</option>'+drivers.map(x=>'<option value="'+esc(x.name)+'">'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
        '<label>Truk<select name="vehicle" required><option value="">Pilih Kendaraan</option>'+vehicles.map(x=>'<option value="'+esc(x.plate_number)+'">'+esc(x.plate_number+(x.vehicle_type?' · '+x.vehicle_type:''))+'</option>').join('')+'</select></label>'+
        '<label>Zona / Rute<select id="fxRouteSelect" name="route_id" required><option value="">Pilih Rute</option>'+routes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.route_name+' · Rp '+prodFmt(x.default_trip_price,0))+'</option>').join('')+'</select></label>'+
        '<input type="hidden" name="zone">'+
        '<fieldset><legend>Detail Tujuan / Muatan</legend><p class="muted">Satu trip boleh memiliki beberapa kandang/tujuan. Harga trip tetap dihitung satu kali.</p>'+
          '<div id="fxTripDestinations"></div>'+
          '<button type="button" id="fxAddDestination">+ Tambah Tujuan / Muatan</button>'+
        '</fieldset>'+
        '<label>Harga Trip<input id="fxTripPrice" name="trip_price" type="text" inputmode="decimal" data-number="1" required readonly></label>'+
        '<label>Tambahan<input name="additional" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>Potongan<input name="deduction" type="text" inputmode="decimal" data-number="1" value="0"></label>'+
        '<label>Catatan<textarea name="notes"></textarea></label><button type="submit">Simpan Trip</button>'+
      '</form></section>'+
      '<section class="panel"><h3>Daftar Trip Expedisi</h3><div class="form-vertical" id="expTripFilter" style="margin-bottom:12px"><label>Cari Trip (MTS/SJ, Sopir, Tujuan, Muatan)<input id="expTripSearch" type="search" placeholder="Ketik untuk mencari..."></label><label>Status<select id="expTripStatus"><option value="BELUM INVOICE">Belum Invoice</option><option value="SUDAH INVOICE">Sudah Invoice</option><option value="">Semua Status</option></select></label><label>Tanggal Awal<input id="expTripFrom" type="date"></label><label>Tanggal Akhir<input id="expTripTo" type="date"></label><button type="button" id="expTripReset">Reset Filter</button></div><p class="muted" id="expTripCount"></p><div class="tablewrap"><table id="expTripListTable"><thead><tr><th>Tanggal</th><th>MTS/SJ</th><th>Sopir</th><th>Truk</th><th>Tujuan</th><th>Muatan</th><th>Total Trip</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
        trips.map(t=>{const billed=used.has(t.id);return '<tr><td>'+prodDateId(t.trip_date)+'</td><td>'+esc(t.mts_sj||'-')+'</td><td>'+esc(t.driver||'-')+'</td><td>'+esc(t.vehicle||'-')+'</td><td>'+esc(destinationText(t))+'</td><td>'+esc(cargoText(t))+'</td><td>Rp '+prodFmt(tripTotal(t),0)+'</td><td>'+(billed?'SUDAH INVOICE':'BELUM INVOICE')+'</td><td><div class="inline-actions"><button type="button" data-edit-exp-trip="'+esc(t.id)+'">Koreksi</button>'+(profile?.role==='ADMIN'?'<button type="button" class="btn-danger" data-delete-exp-trip="'+esc(t.id)+'">Hapus</button>':'')+'</div></td></tr>';}).join('')+
      '</tbody></table></div><div class="report-actions" style="margin-top:10px"><button type="button" id="expTripPrev">Sebelumnya</button><span id="expTripPageLabel"></span><button type="button" id="expTripNext">Berikutnya</button></div>'+(trips.length?'':'<p class="muted">Belum ada trip Expedisi.</p>')+'</section>'+
      '<section class="panel"><h3>Buat Invoice Expedisi</h3><p class="muted"><strong>No. Invoice otomatis.</strong> Format: 001/BMS-BSI/FMC/'+today.slice(0,4)+' dan naik berurutan sesuai tahun invoice.</p><form id="fxInvoiceForm" class="form-vertical">'+
        '<label>Tanggal Invoice<input name="invoice_date" type="date" value="'+today+'" required></label>'+
        '<label>Jatuh Tempo<input name="due_date" type="date"></label>'+
        '<label>Tagihan Kepada<select id="fxCustomerSelect" name="customer_id" required><option value="">Pilih Pelanggan</option>'+customers.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
        '<input type="hidden" name="customer_name"><textarea name="customer_address" style="display:none"></textarea>'+
        '<p id="fxCustomerInfo" class="muted"></p><fieldset class="fx-trip-picker"><legend>Pilih Trip</legend>'+
          '<div class="fx-trip-list">'+
          unbilled.map(t=>'<label class="fx-trip-option"><input type="checkbox" name="trip_ids" value="'+esc(t.id)+'"><span class="fx-trip-checkmark"></span><span class="fx-trip-text"><strong>'+esc(prodDateId(t.trip_date)+' · '+(t.mts_sj||'-'))+'</strong><small>'+esc(destinationText(t)+' · Rp '+prodFmt(tripTotal(t),0))+'</small></span></label>').join('')+
          '</div>'+
          (unbilled.length?'':'<p class="muted">Belum ada trip tersedia.</p>')+
        '</fieldset><label>Catatan<textarea name="notes"></textarea></label><button type="submit" '+(!unbilled.length?'disabled':'')+'>Buat Invoice</button>'+
      '</form></section>';
  }

  html+='<section class="panel" id="fxInvoiceReport"><div class="rhpp-section-head"><div><h3>Invoice & Piutang Expedisi</h3></div><div class="report-actions"><button type="button" id="fxReportPrint">Cetak / PDF</button><button type="button" id="fxReportPrintExcel">Excel</button></div></div>'+
    '<div class="form-vertical" id="fxInvoiceFilters" style="margin-bottom:12px">'+
      '<label>Cari Invoice / Pelanggan<input id="fxInvoiceSearch" type="search" placeholder="Nomor invoice atau nama pelanggan"></label>'+
      '<label>Status<select id="fxInvoiceStatus"><option value="">Semua Status</option><option value="UNPAID">Belum Lunas</option><option value="PAID">Lunas</option><option value="VOID">Void</option></select></label>'+
      '<label>Tanggal Awal<input type="date" id="fxInvoiceFrom"></label>'+
      '<label>Tanggal Akhir<input type="date" id="fxInvoiceTo"></label>'+
      '<button type="button" id="fxInvoiceFilterReset">Reset Filter</button></div>'+
    '<p class="muted" id="fxInvoiceCount"></p>'+
    '<div class="tablewrap"><table id="fxInvoiceListTable"><thead><tr><th>No Invoice</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Pelanggan</th><th>Total</th><th>Dibayar</th><th>Piutang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
      summaries.map(x=>'<tr><td>'+esc(x.invoice_number)+'</td><td>'+prodDateId(x.invoice_date)+'</td><td>'+(x.due_date?prodDateId(x.due_date):'-')+'</td><td>'+esc(x.customer_name)+'</td><td>Rp '+prodFmt(x.invoice_total,0)+'</td><td>Rp '+prodFmt(x.paid_total,0)+'</td><td><strong>Rp '+prodFmt(x.receivable,0)+'</strong></td><td>'+esc(x.status)+'</td><td><div class="inline-actions"><button type="button" data-fx-print="'+esc(x.invoice_id)+'">Cetak Invoice</button><button type="button" data-fx-excel="'+esc(x.invoice_id)+'">Excel</button>'+(canOps?'<button type="button" data-edit-exp-invoice="'+esc(x.invoice_id)+'">Koreksi</button>':'')+(profile?.role==='ADMIN'?'<button type="button" class="btn-danger" data-delete-exp-invoice="'+esc(x.invoice_id)+'">Hapus</button>':'')+'</div></td></tr>').join('')+
    '</tbody></table></div><div class="report-actions" style="margin-top:10px"><button type="button" id="fxInvoicePrev">Sebelumnya</button><span id="fxInvoicePageLabel"></span><button type="button" id="fxInvoiceNext">Berikutnya</button></div>'+(summaries.length?'':'<p class="muted">Belum ada invoice Expedisi.</p>')+'</section>';


  layout(html);bindNumberInputs();if(err)msg(err.message);
  const invoiceList=document.getElementById('fxInvoiceListTable');
  if(invoiceList){
    const allRows=[...invoiceList.querySelectorAll('tbody tr')];
    const search=document.getElementById('fxInvoiceSearch');
    const status=document.getElementById('fxInvoiceStatus');
    const from=document.getElementById('fxInvoiceFrom');
    const to=document.getElementById('fxInvoiceTo');
    const reset=document.getElementById('fxInvoiceFilterReset');
    const prev=document.getElementById('fxInvoicePrev');
    const next=document.getElementById('fxInvoiceNext');
    const count=document.getElementById('fxInvoiceCount');
    const label=document.getElementById('fxInvoicePageLabel');
    let page=0;
    const dateIso=value=>{const parts=String(value||'').split('/');return parts.length===3?parts[2]+'-'+parts[1]+'-'+parts[0]:'';};
    const update=()=>{
      const q=search.value.trim().toLowerCase(),state=status.value;
      const matches=allRows.filter(tr=>{
        const c=tr.cells,st=(c[7]?.textContent||'').trim().toUpperCase();
        const outstanding=prodNum(summaries.find(x=>x.invoice_number===c[0]?.textContent.trim())?.receivable||0);
        const matchStatus=!state||(state==='VOID'?st==='VOID':state==='PAID'?st==='PAID'||(st!=='VOID'&&outstanding<=0):st!=='VOID'&&outstanding>0);
        const d=dateIso(c[1]?.textContent.trim());
        return (!q||[0,3].some(i=>c[i]?.textContent.toLowerCase().includes(q)))&&matchStatus&&(!from.value||d>=from.value)&&(!to.value||d<=to.value);
      });
      const pages=Math.max(1,Math.ceil(matches.length/10));page=Math.min(page,pages-1);
      const visible=new Set(matches.slice(page*10,page*10+10));
      allRows.forEach(tr=>{tr.hidden=!visible.has(tr);tr.style.display=visible.has(tr)?'':'none';});
      count.textContent=matches.length+' dari '+allRows.length+' invoice';
      label.textContent='Halaman '+(page+1)+' / '+pages;
      prev.disabled=page<=0;next.disabled=page>=pages-1;
    };
    [search,status,from,to].forEach(el=>el.addEventListener(el===search?'input':'change',()=>{page=0;update();}));
    prev.onclick=()=>{page=Math.max(0,page-1);update();};
    next.onclick=()=>{page++;update();};
    reset.onclick=()=>{search.value='';status.value='';from.value='';to.value='';page=0;update();};
    update();
  }

  // Paginate the existing trip table without changing transactional handlers.
  const expTripTable=document.getElementById('expTripListTable');
  if(expTripTable){
    const allTripRows=[...expTripTable.querySelectorAll('tbody tr')];
    const search=document.getElementById('expTripSearch'),status=document.getElementById('expTripStatus');
    const from=document.getElementById('expTripFrom'),to=document.getElementById('expTripTo');
    const prev=document.getElementById('expTripPrev'),next=document.getElementById('expTripNext');
    const count=document.getElementById('expTripCount'),pageLabel=document.getElementById('expTripPageLabel');
    let page=0;
    const refresh=()=>{
      const phrase=String(search.value||'').trim().toLowerCase(),selected=status.value;
      const matched=allTripRows.filter(tr=>{
        const cells=tr.cells;
        const date=cells[0]?.textContent.trim().split('/');
        const iso=date?.length===3?date[2]+'-'+date[1]+'-'+date[0]:'';
        return (!phrase||[1,2,3,4,5].some(i=>cells[i]?.textContent.toLowerCase().includes(phrase)))&&
          (!selected||cells[7]?.textContent.trim()===selected)&&
          (!from.value||iso>=from.value)&&(!to.value||iso<=to.value);
      });
      const pages=Math.max(1,Math.ceil(matched.length/10));
      page=Math.min(page,pages-1);
      const shown=new Set(matched.slice(page*10,page*10+10));
      allTripRows.forEach(tr=>{tr.hidden=!shown.has(tr);tr.style.display=shown.has(tr)?'':'none';});
      count.textContent=matched.length+' dari '+allTripRows.length+' trip';
      pageLabel.textContent='Halaman '+(page+1)+' / '+pages;
      prev.disabled=page===0;next.disabled=page>=pages-1;
    };
    [search,status,from,to].forEach(el=>el.addEventListener(el===search?'input':'change',()=>{page=0;refresh();}));
    prev.onclick=()=>{page--;refresh();};
    next.onclick=()=>{page++;refresh();};
    document.getElementById('expTripReset').onclick=()=>{search.value='';status.value='BELUM INVOICE';from.value='';to.value='';page=0;refresh();};
    refresh();
  }

  if(role==='LOGISTIK')document.getElementById('fxTripForm')?.closest('section')?.remove();

  root.querySelectorAll('[data-complete-sj]').forEach(btn=>btn.onclick=async()=>{window.__fxSjPendingEdit=btn.dataset.completeSj||'';await financeExpeditionBusinessPage();document.getElementById('fxCompleteSjForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const sjCancel=document.getElementById('fxCompleteSjCancel');if(sjCancel)sjCancel.onclick=async()=>{window.__fxSjPendingEdit='';await financeExpeditionBusinessPage();};
  const sjForm=document.getElementById('fxCompleteSjForm');
  if(sjForm&&selectedSj)sjForm.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(sjForm),dest=destinations.find(x=>x.id===String(fd.get('destination_id')||'')),qtyRaw=String(fd.get('qty')||''),qty=qtyRaw?normalizeInputID(qtyRaw):null,tripPrice=normalizeInputID(fd.get('trip_price')),additional=normalizeInputID(fd.get('additional'))||0,deduction=normalizeInputID(fd.get('deduction'))||0;
    if(!dest)return msg('Pilih tujuan.');if(tripPrice===null||tripPrice<0)return msg('Harga Trip tidak valid.');
    const detail=[{destination_id:dest.id,destination_name:dest.name,cargo:String(fd.get('cargo')||''),qty,unit:String(fd.get('unit')||'zak'),notes:null,line_no:1}];
    const {error}=await db.rpc('logistics_complete_expedition_sj_v1',{p_trip_id:selectedSj.id,p_mts_sj:String(fd.get('mts_sj')||''),p_rr:String(fd.get('rr')||'')||null,p_trip_price:tripPrice,p_additional:additional,p_deduction:deduction,p_notes:String(fd.get('notes')||'')||null,p_destinations:detail});
    if(error)return msg(error.message);window.__fxSjPendingEdit='';await financeExpeditionBusinessPage();msg('Surat Jalan/MTS lengkap. Trip siap diproses berikutnya.',true);
  };

  const reportPrint=document.getElementById('fxReportPrint');if(reportPrint)reportPrint.onclick=()=>printFinanceDocument('fxInvoiceReport','Laporan Invoice dan Piutang Expedisi');const fxReportExcel=document.getElementById('fxReportPrintExcel');if(fxReportExcel)fxReportExcel.onclick=()=>exportFinanceDocumentExcel('fxInvoiceReport','Laporan Invoice dan Piutang Expedisi');

  const tf=document.getElementById('fxTripForm');
  const routeSel=document.getElementById('fxRouteSelect');
  if(tf&&routeSel){
    const syncRoute=()=>{
      const r=routes.find(x=>x.id===routeSel.value);
      tf.elements.zone.value=r?.route_name||'';
      const price=document.getElementById('fxTripPrice');
      if(price)price.value=r?fmtNumber(r.default_trip_price):'';
    };
    routeSel.onchange=syncRoute;
  }
  const destWrap=document.getElementById('fxTripDestinations');
  const addDestBtn=document.getElementById('fxAddDestination');
  const destinationOptions='<option value="">Pilih Tujuan</option>'+destinations.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.name)+'</option>').join('');
  const addDestinationRow=()=>{
    if(!destWrap)return;
    const row=document.createElement('div');row.className='fx-destination-row';row.style.cssText='display:flex;flex-direction:column;gap:8px;margin:10px 0;padding:12px;border:1px solid #d7dde5;border-radius:10px;background:#fff';
    row.innerHTML='<label>Tujuan<select class="fx-dest-id" required>'+destinationOptions+'</select></label>'+
      '<label>Jenis Muatan<input class="fx-dest-cargo-search" autocomplete="off" placeholder="Cari: BFP, CBC, BSC, Tongwai..." required></label>'+
      '<input type="hidden" class="fx-dest-cargo">'+
      '<div class="fx-cargo-suggestions search-suggestions"></div>'+
      '<label>Qty<input class="fx-dest-qty" type="text" inputmode="decimal"></label>'+
      '<label>Satuan<select class="fx-dest-unit"><option value="zak">zak</option><option value="kg">kg</option><option value="ekor">ekor</option><option value="unit">unit</option></select></label>'+
      '<button type="button" class="fx-remove-dest">Hapus Tujuan</button>';
    const cargoSearch=row.querySelector('.fx-dest-cargo-search');
    const cargoHidden=row.querySelector('.fx-dest-cargo');
    const cargoSuggestions=row.querySelector('.fx-cargo-suggestions');
    const renderCargoSuggestions=()=>{
      const q=String(cargoSearch.value||'').trim().toLowerCase();
      cargoHidden.value='';
      if(!q){cargoSuggestions.innerHTML='';return;}
      const found=feedItems.filter(x=>{
        const hay=(x.name+' '+(x.feed_phase||'')+' '+(x.unit||'')).toLowerCase();
        return hay.includes(q);
      }).slice(0,8);
      cargoSuggestions.innerHTML=found.length
        ?found.map(x=>'<button type="button" class="search-suggestion" data-cargo-id="'+esc(x.id)+'"><strong>'+esc(x.name.trim())+'</strong><small>'+esc((x.feed_phase||'')+(x.unit?' · '+String(x.unit).toLowerCase():''))+'</small></button>').join('')
        :'<div class="search-empty">Jenis muatan tidak ditemukan di Master Sapronak.</div>';
      cargoSuggestions.querySelectorAll('[data-cargo-id]').forEach(btn=>btn.onclick=()=>{
        const item=feedItems.find(x=>x.id===btn.dataset.cargoId);
        if(!item)return;
        cargoSearch.value=item.name.trim();
        cargoHidden.value=item.name.trim();
        cargoSuggestions.innerHTML='';
      });
    };
    cargoSearch.oninput=renderCargoSuggestions;
    cargoSearch.onfocus=()=>{if(cargoSearch.value)renderCargoSuggestions();};
    cargoSearch.onblur=()=>setTimeout(()=>{
      if(!cargoHidden.value){
        const exact=feedItems.find(x=>x.name.trim().toLowerCase()===String(cargoSearch.value||'').trim().toLowerCase());
        if(exact){cargoSearch.value=exact.name.trim();cargoHidden.value=exact.name.trim();}
      }
      cargoSuggestions.innerHTML='';
    },180);
    row.querySelector('.fx-remove-dest').onclick=()=>{if(destWrap.children.length>1)row.remove();else msg('Minimal satu tujuan wajib ada.');};
    destWrap.appendChild(row);
  };
  if(addDestBtn)addDestBtn.onclick=addDestinationRow;
  if(destWrap&&!destWrap.children.length)addDestinationRow();

  if(tf)tf.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(tf);
    const tripPrice=normalizeInputID(fd.get('trip_price')),additional=normalizeInputID(fd.get('additional'))||0,deduction=normalizeInputID(fd.get('deduction'))||0;
    if(tripPrice===null||tripPrice<0||additional<0||deduction<0)return msg('Nilai trip tidak valid.');
    const detailRows=[...tf.querySelectorAll('.fx-destination-row')];
    const detailData=detailRows.map((row,idx)=>{
      const destinationId=row.querySelector('.fx-dest-id')?.value||'';
      const d=destinations.find(x=>x.id===destinationId);
      const qtyRaw=row.querySelector('.fx-dest-qty')?.value||'';
      const qty=qtyRaw===''?null:normalizeInputID(qtyRaw);
      return {
        destination_id:destinationId,
        destination_name:d?.name||'',
        cargo:String(row.querySelector('.fx-dest-cargo')?.value||'').trim(),
        qty:qty,
        unit:String(row.querySelector('.fx-dest-unit')?.value||'').trim(),
        notes:null,
        line_no:idx+1
      };
    });
    if(!detailData.length||detailData.some(x=>!x.destination_id||!x.destination_name))return msg('Pilih tujuan untuk setiap baris.');
    if(detailData.some(x=>!x.cargo))return msg('Pilih Jenis Muatan dari hasil pencarian Master Sapronak.');
    if(detailData.some(x=>x.qty!==null&&(x.qty<0||!Number.isFinite(x.qty))))return msg('Qty tujuan tidak valid.');
    const {error}=await db.rpc('finance_save_expedition_trip_atomic',{
      p_trip_date:String(fd.get('trip_date')||''),p_mts_sj:String(fd.get('mts_sj')||'')||null,p_rr:String(fd.get('rr')||'')||null,
      p_driver:String(fd.get('driver')||''),p_vehicle:String(fd.get('vehicle')||''),p_zone:String(fd.get('zone')||''),
      p_trip_price:tripPrice,p_additional:additional,p_deduction:deduction,p_notes:String(fd.get('notes')||'')||null,
      p_destinations:detailData
    });
    if(error)return msg(error.message);await financeExpeditionBusinessPage();msg('Trip Expedisi dengan '+detailData.length+' tujuan berhasil disimpan.',true);
  };

  const inf=document.getElementById('fxInvoiceForm');
  const customerSel=document.getElementById('fxCustomerSelect');
  if(inf&&customerSel){
    const syncCustomer=()=>{
      const c=customers.find(x=>x.id===customerSel.value);
      inf.elements.customer_name.value=c?.name||'';
      inf.elements.customer_address.value=c?.address||'';
      const info=document.getElementById('fxCustomerInfo');
      if(info)info.textContent=c?((c.address||'-')+(c.phone?' · '+c.phone:'')):'';
    };
    customerSel.onchange=syncCustomer;
  }
  if(inf)inf.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(inf),ids=fd.getAll('trip_ids').map(String);
    if(!ids.length)return msg('Pilih minimal satu trip.');
    const {error}=await db.rpc('finance_create_expedition_invoice_atomic',{
      p_invoice_number:null,p_invoice_date:String(fd.get('invoice_date')||''),p_due_date:String(fd.get('due_date')||'')||null,
      p_customer_name:String(fd.get('customer_name')||''),p_customer_address:String(fd.get('customer_address')||'')||null,p_trip_ids:ids,p_notes:String(fd.get('notes')||'')||null
    });
    if(error)return msg(error.message);await financeExpeditionBusinessPage();msg('Invoice Expedisi berhasil dibuat.',true);
  };



  const deleteTrip=async id=>{
    if(profile?.role!=='ADMIN')return msg('Hanya ADMIN yang boleh menghapus trip.');
    if(!await appConfirm('PERINGATAN HAPUS TRIP EXPEDISI\n\nTrip akan dihapus bersama detail tujuan dan BOP terkait. Jika trip sudah masuk invoice, sistem akan menolak penghapusan.\n\nLanjutkan hapus?'))return;
    const {error}=await db.rpc('admin_delete_expedition_trip_v1',{p_trip_id:id});
    if(error)return msg(error.message);
    window.__fxTripEdit='';await financeExpeditionBusinessPage();msg('Trip Expedisi berhasil dihapus oleh ADMIN.',true);
  };
  root.querySelectorAll('[data-edit-exp-trip]').forEach(btn=>btn.onclick=async()=>{window.__fxTripEdit=btn.dataset.editExpTrip||'';window.__fxInvoiceEdit='';await financeExpeditionBusinessPage();document.getElementById('fxTripCorrectionForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  root.querySelectorAll('[data-delete-exp-trip]').forEach(btn=>btn.onclick=()=>deleteTrip(btn.dataset.deleteExpTrip));
  const tripCancel=document.getElementById('fxTripCorrectionCancel');if(tripCancel)tripCancel.onclick=async()=>{window.__fxTripEdit='';await financeExpeditionBusinessPage();};
  const tripDelete=document.getElementById('fxTripCorrectionDelete');if(tripDelete&&selectedTripEdit)tripDelete.onclick=()=>deleteTrip(selectedTripEdit.id);

  const tripCorrection=document.getElementById('fxTripCorrectionForm');
  if(tripCorrection&&selectedTripEdit)tripCorrection.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(tripCorrection);
    const route=routes.find(x=>x.id===String(fd.get('route_id')||''));
    const tripPrice=normalizeInputID(fd.get('trip_price')),additional=normalizeInputID(fd.get('additional'))||0,deduction=normalizeInputID(fd.get('deduction'))||0;
    if(!route||tripPrice===null||tripPrice<0||additional<0||deduction<0)return msg('Nilai atau rute trip tidak valid.');
    const editDetails=detailsForTrip(selectedTripEdit.id);
    const detailData=editDetails.map((d,idx)=>{
      const destinationId=String(fd.get('dest_'+idx)||''),dest=destinations.find(x=>x.id===destinationId);
      const qtyRaw=String(fd.get('qty_'+idx)||''),qty=qtyRaw===''?null:normalizeInputID(qtyRaw);
      return {destination_id:destinationId,destination_name:dest?.name||'',cargo:String(fd.get('cargo_'+idx)||'').trim(),qty,unit:String(fd.get('unit_'+idx)||'').trim(),notes:null,line_no:idx+1};
    });
    if(!detailData.length||detailData.some(x=>!x.destination_id||!x.destination_name||!x.cargo))return msg('Detail tujuan/muatan tidak lengkap.');
    const {error}=await db.rpc('finance_correct_expedition_trip_v1',{
      p_trip_id:selectedTripEdit.id,p_trip_date:String(fd.get('trip_date')||''),p_mts_sj:String(fd.get('mts_sj')||'')||null,p_rr:String(fd.get('rr')||'')||null,
      p_driver:String(fd.get('driver')||''),p_vehicle:String(fd.get('vehicle')||''),p_zone:route.route_name,
      p_trip_price:tripPrice,p_additional:additional,p_deduction:deduction,p_notes:String(fd.get('notes')||'')||null,p_destinations:detailData
    });
    if(error)return msg(error.message);
    window.__fxTripEdit='';await financeExpeditionBusinessPage();msg('Koreksi Trip Expedisi berhasil disimpan.',true);
  };

  const deleteInvoice=async id=>{
    if(profile?.role!=='ADMIN')return msg('Hanya ADMIN yang boleh menghapus invoice.');
    if(!await appConfirm('PERINGATAN HAPUS INVOICE EXPEDISI\n\nTrip di invoice akan kembali menjadi belum ditagihkan. Jika invoice sudah memiliki pembayaran, sistem akan menolak sampai pembayaran dikoreksi atau dihapus.\n\nLanjutkan hapus?'))return;
    const {error}=await db.rpc('admin_delete_expedition_invoice_v1',{p_invoice_id:id});
    if(error)return msg(error.message);
    window.__fxInvoiceEdit='';await financeExpeditionBusinessPage();msg('Invoice Expedisi berhasil dihapus oleh ADMIN.',true);
  };
  root.querySelectorAll('[data-edit-exp-invoice]').forEach(btn=>btn.onclick=async()=>{window.__fxInvoiceEdit=btn.dataset.editExpInvoice||'';window.__fxTripEdit='';await financeExpeditionBusinessPage();document.getElementById('fxInvoiceCorrectionForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  root.querySelectorAll('[data-delete-exp-invoice]').forEach(btn=>btn.onclick=()=>deleteInvoice(btn.dataset.deleteExpInvoice));
  const invoiceCancel=document.getElementById('fxInvoiceCorrectionCancel');if(invoiceCancel)invoiceCancel.onclick=async()=>{window.__fxInvoiceEdit='';await financeExpeditionBusinessPage();};
  const invoiceDelete=document.getElementById('fxInvoiceCorrectionDelete');if(invoiceDelete&&selectedInvoiceEdit)invoiceDelete.onclick=()=>deleteInvoice(selectedInvoiceEdit.id);

  const invoiceCorrection=document.getElementById('fxInvoiceCorrectionForm');
  if(invoiceCorrection&&selectedInvoiceEdit)invoiceCorrection.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(invoiceCorrection),ids=fd.getAll('trip_ids').map(String),customer=customers.find(x=>x.id===String(fd.get('customer_id')||''));
    if(!customer||!ids.length)return msg('Pilih pelanggan dan minimal satu trip.');
    const {error}=await db.rpc('finance_correct_expedition_invoice_v1',{
      p_invoice_id:selectedInvoiceEdit.id,p_invoice_date:String(fd.get('invoice_date')||''),p_due_date:String(fd.get('due_date')||'')||null,
      p_customer_name:customer.name,p_customer_address:customer.address||null,p_trip_ids:ids,p_notes:String(fd.get('notes')||'')||null
    });
    if(error)return msg(error.message);
    window.__fxInvoiceEdit='';await financeExpeditionBusinessPage();msg('Koreksi Invoice Expedisi berhasil disimpan.',true);
  };

  document.querySelectorAll('[data-fx-excel]').forEach(btn=>btn.onclick=()=>{
    const id=btn.dataset.fxExcel,i=invoices.find(x=>x.id===id),its=invoiceTrips(id),x=sumFor(id);if(!i)return;
    const rows=its.map((t,idx)=>{
      const ds=detailsForTrip(t.id);
      const dest=ds.length?ds.map(v=>v.destination_name).join(' / '):(t.destination||'-');
      const cargo=ds.length?ds.map(v=>[v.cargo,prodNum(v.qty)?prodFmt(v.qty,Number.isInteger(prodNum(v.qty))?0:2):'',v.unit||''].filter(Boolean).join(' ')).join(' / '):(t.cargo||'-');
      return '<tr><td>'+(idx+1)+'</td><td>'+prodDateId(t.trip_date)+'</td><td>'+esc(t.mts_sj||'-')+'</td><td>'+esc(t.rr||'-')+'</td><td>'+esc(t.driver||'-')+'</td><td>'+esc(t.vehicle||'-')+'</td><td>'+esc(t.zone||'-')+'</td><td>'+esc(dest)+'</td><td>'+esc(cargo)+'</td><td>'+prodFmt(totalQtyFor(t),Number.isInteger(totalQtyFor(t))?0:2)+'</td><td>'+prodNum(t.trip_price)+'</td><td>'+prodNum(t.additional)+'</td><td>'+prodNum(t.deduction)+'</td><td>'+tripTotal(t)+'</td></tr>';
    }).join('');
    const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+
      '<h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2>'+
      '<h3>Invoice '+esc(i.invoice_number)+'</h3>'+
      '<p>Tanggal: '+prodDateId(i.invoice_date)+' | Jatuh Tempo: '+(i.due_date?prodDateId(i.due_date):'-')+' | Pelanggan: '+esc(i.customer_name)+'</p>'+
      '<table border="1"><thead><tr><th>No</th><th>Tanggal</th><th>MTS/SJ</th><th>RR</th><th>Sopir</th><th>Truk</th><th>Zona</th><th>Tujuan</th><th>Jenis Pakan / Qty</th><th>Total Qty</th><th>Harga Trip</th><th>Tambahan</th><th>Potongan</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<p><strong>Total Invoice: '+(x?.invoice_total===null||x?.invoice_total===undefined?'-':prodNum(x.invoice_total))+'</strong></p></body></html>';
    const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=(String(i.invoice_number||'Invoice').replace(/[^a-z0-9_-]+/gi,'_'))+'.xlsx';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });

  document.querySelectorAll('[data-fx-print]').forEach(btn=>btn.onclick=()=>{
    const id=btn.dataset.fxPrint,i=invoices.find(x=>x.id===id),its=invoiceTrips(id),x=sumFor(id);if(!i)return;
    const rows=its.map((t,idx)=>{
      const ds=detailsForTrip(t.id);
      const destHtml=ds.length?ds.map(x=>esc(x.destination_name)).join('<br>'):esc(t.destination||'-');
      const cargoHtml=ds.length?ds.map(x=>esc([x.cargo,prodNum(x.qty)?prodFmt(x.qty,Number.isInteger(prodNum(x.qty))?0:2):'',x.unit||''].filter(Boolean).join(' '))).join('<br>'):esc(t.cargo||'-');
      return '<tr>'+
      '<td>'+(idx+1)+'</td><td>'+prodDateId(t.trip_date)+'</td><td>'+esc(t.mts_sj||'-')+'</td><td>'+esc(t.rr||'-')+'</td>'+
      '<td>'+esc(t.driver||'-')+'</td><td>'+esc(t.vehicle||'-')+'</td><td>'+esc(t.zone||'-')+'</td><td>'+destHtml+'</td>'+
      '<td>'+cargoHtml+'</td><td>'+prodFmt(totalQtyFor(t),Number.isInteger(totalQtyFor(t))?0:2)+'</td><td>Rp '+prodFmt(t.trip_price,0)+'</td>'+
      '<td>'+(prodNum(t.additional)?'Rp '+prodFmt(t.additional,0):'-')+'</td><td>'+(prodNum(t.deduction)?'Rp '+prodFmt(t.deduction,0):'-')+'</td>'+
      '<td>Rp '+prodFmt(tripTotal(t),0)+'</td></tr>';
    }).join('');
    const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
    const logo=new URL('./assets/bms_express_logo.jpg',location.href).href;
    const comp=company.company_name||company.legal_name||'Nama perusahaan belum diisi';
    const sign=company.signatory_name||'-';
    w.document.write('<html><head><meta charset="utf-8"><title>'+esc(i.invoice_number)+'</title><style>'+
      '@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#222;font-size:9px}'+
      '.top{display:grid;grid-template-columns:1fr 1fr;align-items:start;border-bottom:1px solid #aaa;padding-bottom:12px;margin-bottom:12px}.brand{display:flex;gap:12px;align-items:flex-start}.brand img{width:78px;height:78px;object-fit:contain}.brand h2{font-size:18px;margin:8px 0 5px}.invoice{text-align:right}.invoice h1{font-size:28px;margin:4px 0 10px}.invoice div{margin:3px 0;font-size:11px}'+
      '.bill{margin:8px 0 12px;font-size:11px}.bill strong{display:block;margin-bottom:7px}.bill .name{font-weight:700;margin-bottom:5px}'+
      'table{width:100%;border-collapse:collapse;table-layout:auto}th{background:#2f86bd;color:white;padding:5px 4px;font-size:8px;white-space:nowrap}td{padding:4px;border-bottom:1px solid #ddd;font-size:8px;vertical-align:top}tbody tr:nth-child(even){background:#f7f7f7}'+
      '.total{display:flex;justify-content:flex-end;gap:45px;font-weight:700;font-size:15px;padding:15px 8px 18px;border-bottom:1px solid #aaa}.foot{display:grid;grid-template-columns:1fr 260px;gap:30px;margin-top:14px;font-size:11px}.pay h3,.sign h3{margin:0 0 10px;font-size:12px}.pay div{margin:8px 0}.sign{text-align:left}.sign-space{height:62px;border-bottom:1px solid #777;margin-bottom:8px}.pagefoot{display:flex;justify-content:space-between;margin-top:25px;font-size:8px;color:#555}'+
      '</style></head><body>'+
      '<div class="top"><div class="brand"><img src="'+esc(logo)+'"><div><h2>'+esc(comp)+'</h2><div>'+esc(company.address||'').replaceAll('\n','<br>')+'</div></div></div>'+
      '<div class="invoice"><h1>INVOICE</h1><div>No: '+esc(i.invoice_number)+'</div><div>Tanggal: '+prodDateId(i.invoice_date)+'</div><div>Jatuh Tempo: '+(i.due_date?prodDateId(i.due_date):'-')+'</div></div></div>'+
      '<div class="bill"><strong>Tagihan Kepada:</strong><div class="name">'+esc(i.customer_name)+'</div><div>'+esc(i.customer_address||'')+'</div></div>'+
      '<table><thead><tr><th>No</th><th>Tanggal</th><th>MTS/SJ</th><th>RR</th><th>Sopir</th><th>Truk</th><th>Zona</th><th>Tujuan</th><th>Jenis Pakan / Qty</th><th>Total Qty</th><th>Harga Trip</th><th>Tambahan</th><th>Potongan</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div class="total"><span>TOTAL INVOICE</span><span>Rp '+prodFmt(x?.invoice_total||0,0)+'</span></div>'+
      '<div class="foot"><div class="pay"><h3>PEMBAYARAN</h3><div>Bank '+esc(company.bank_name||'-')+'</div><div>No. Rekening : '+esc(company.bank_account_number||'-')+'</div><div>a.n. '+esc(company.bank_account_name||comp)+'</div></div>'+
      '<div class="sign"><h3>Hormat Kami,</h3><div class="sign-space"></div><strong>'+esc(sign)+'</strong></div></div>'+
      '<div class="pagefoot"><span>BMS Invoice System</span><span>Halaman 1</span></div>'+
      '</body></html>');
    w.document.close();setTimeout(()=>{w.focus();w.print();},400);
  });
}


async function financeExpeditionMaintenancePage(){
  const [mr,vr]=await Promise.all([
    db.from('finance_expedition_maintenance').select('*').order('incurred_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('expedition_vehicles').select('plate_number,vehicle_type,active').eq('active',true).order('plate_number',{ascending:true})
  ]);
  const rows=mr.data||[],vehicles=vr.data||[],err=(mr.error||vr.error);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const total=rows.reduce((n,x)=>n+prodNum(x.amount),0);
  window.__fxMaintenanceHistory=window.__fxMaintenanceHistory||{vehicle:'',category:'',from:'',to:'',shown:false};
  const mh=window.__fxMaintenanceHistory;
  const historyRows=mh.shown?rows.filter(x=>(!mh.vehicle||x.vehicle===mh.vehicle)&&(!mh.category||x.category===mh.category)&&(!mh.from||String(x.incurred_on||'')>=mh.from)&&(!mh.to||String(x.incurred_on||'')<=mh.to)):[];
  window.__fxMaintenanceEdit=window.__fxMaintenanceEdit||'';
  const editId=window.__fxMaintenanceEdit;
  const selected=rows.find(x=>x.id===editId)||null;

  let html='<section class="panel"><h3>Perawatan Expedisi</h3><p class="muted">Halaman ini khusus untuk input dan koreksi biaya perawatan. Riwayat lengkap ada di Laporan Expedisi → Servis / Perawatan.</p>'+
    '<div class="rhpp-summary-cards"><div class="rhpp-summary-card"><span>Total Perawatan</span><strong>Rp '+prodFmt(total,0)+'</strong></div></div></section>'+
    '<section class="panel"><h3>'+(selected?'Koreksi Perawatan Expedisi':'Tambah Biaya Perawatan')+'</h3><form id="fxMaintenanceForm" class="form-vertical">'+
      '<label>Tanggal<input name="incurred_on" type="date" value="'+esc(selected?.incurred_on||today)+'" required></label>'+
      '<label>Kategori<select name="category" required>'+
        ['SERVIS','BAN','PAJAK_KENDARAAN','PERBAIKAN','LAINNYA'].map(v=>'<option value="'+v+'" '+((selected?.category||'SERVIS')===v?'selected':'')+'>'+esc(v==='PAJAK_KENDARAAN'?'Pajak Kendaraan':v.charAt(0)+v.slice(1).toLowerCase())+'</option>').join('')+
      '</select></label>'+
      '<label>Kendaraan<select name="vehicle"><option value="">Tidak terkait kendaraan tertentu</option>'+vehicles.map(v=>'<option value="'+esc(v.plate_number)+'" '+(selected?.vehicle===v.plate_number?'selected':'')+'>'+esc(v.plate_number+(v.vehicle_type?' · '+v.vehicle_type:''))+'</option>').join('')+'</select></label>'+
      '<label>Nominal<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(selected?esc(fmtNumber(selected.amount)):'')+'" required></label>'+
      '<label>Catatan<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<div class="inline-actions"><button type="submit">'+(selected?'Simpan Koreksi':'Simpan Perawatan')+'</button>'+(selected?'<button type="button" id="fxMaintenanceCancel" class="btn-secondary">Batal Koreksi</button>'+adminDeleteTxnButton('finance_expedition_maintenance',selected.id):'')+'</div>'+
    '</form></section>'+
    '<section class="panel"><h3>Koreksi Data Perawatan</h3>'+
      '<label>Pilih data yang akan dikoreksi<select id="fxMaintenanceEditSelect"><option value="">Tambah data baru / tidak ada koreksi</option>'+
        rows.map(x=>'<option value="'+esc(x.id)+'" '+(editId===x.id?'selected':'')+'>'+esc(prodDateId(x.incurred_on)+' · '+String(x.category||'').replaceAll('_',' ')+' · '+(x.vehicle||'-')+' · Rp '+prodFmt(x.amount,0))+'</option>').join('')+
      '</select></label>'+
    '</section>'+
    '<section class="panel"><h3>Riwayat Perawatan Expedisi</h3><form id="fxMaintenanceHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Kendaraan<select name="vehicle"><option value="">Semua Kendaraan</option>'+vehicles.map(v=>'<option value="'+esc(v.plate_number)+'" '+(mh.vehicle===v.plate_number?'selected':'')+'>'+esc(v.plate_number)+'</option>').join('')+'</select></label>'+
      '<label>Kategori<select name="category"><option value="">Semua Kategori</option>'+['SERVIS','BAN','PAJAK_KENDARAAN','PERBAIKAN','LAINNYA'].map(v=>'<option value="'+v+'" '+(mh.category===v?'selected':'')+'>'+v.replaceAll('_',' ')+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(mh.from||'')+'"></label><label>Tanggal Sampai<input type="date" name="to" value="'+esc(mh.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="fxMaintenanceHistoryReset">Reset</button></div></form>'+
      (mh.shown?'<div class="report-actions"><button type="button" id="fxMaintenancePrint">Cetak</button> <button type="button" id="fxMaintenancePdf">PDF</button> <button type="button" id="fxMaintenanceExcel">Excel</button></div><div class="tablewrap"><table id="fxMaintenanceHistoryTable"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Kendaraan</th><th>Nominal</th><th>Referensi</th><th>Catatan</th></tr></thead><tbody>'+historyRows.map(x=>'<tr><td>'+prodDateId(x.incurred_on)+'</td><td>'+esc(String(x.category||'').replaceAll('_',' '))+'</td><td>'+esc(x.vehicle||'-')+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>'+esc(x.reference||'-')+'</td><td>'+esc(x.notes||'-')+'</td></tr>').join('')+'</tbody></table></div>'+(historyRows.length?'':'<p class="muted">Data tidak ditemukan.</p>'):'<p class="muted">Pilih filter lalu tekan Tampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);

  const mhf=document.getElementById('fxMaintenanceHistoryFilter');if(mhf)mhf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(mhf);mh.vehicle=String(fd.get('vehicle')||'');mh.category=String(fd.get('category')||'');mh.from=String(fd.get('from')||'');mh.to=String(fd.get('to')||'');if(mh.from&&mh.to&&mh.from>mh.to){const t=mh.from;mh.from=mh.to;mh.to=t}mh.shown=true;await financeExpeditionMaintenancePage();};
  const mhr=document.getElementById('fxMaintenanceHistoryReset');if(mhr)mhr.onclick=async()=>{window.__fxMaintenanceHistory={vehicle:'',category:'',from:'',to:'',shown:false};await financeExpeditionMaintenancePage();};
  if(mh.shown)bindTableExportActions({tableId:'fxMaintenanceHistoryTable',printId:'fxMaintenancePrint',pdfId:'fxMaintenancePdf',excelId:'fxMaintenanceExcel',title:'Riwayat Perawatan Expedisi',filename:'Riwayat_Perawatan_Expedisi',filterText:'Periode '+(mh.from||'-')+' s/d '+(mh.to||'-')});
  const editSelect=document.getElementById('fxMaintenanceEditSelect');
  if(editSelect)editSelect.onchange=async()=>{
    window.__fxMaintenanceEdit=editSelect.value||'';
    await financeExpeditionMaintenancePage();
  };

  const cancel=document.getElementById('fxMaintenanceCancel');
  if(cancel)cancel.onclick=async()=>{
    window.__fxMaintenanceEdit='';
    await financeExpeditionMaintenancePage();
  };

  bindAdminTransactionDeletes(()=>{window.__fxMaintenanceEdit='';return financeExpeditionMaintenancePage();});

  const form=document.getElementById('fxMaintenanceForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),amount=normalizeInputID(fd.get('amount'));
    if(amount===null||amount<0)return msg('Nominal perawatan tidak valid.');
    const payload={
      incurred_on:String(fd.get('incurred_on')||''),
      category:String(fd.get('category')||''),
      vehicle:String(fd.get('vehicle')||'')||null,
      amount,
      notes:String(fd.get('notes')||'')||null
    };
    let result;
    if(selected){
      result=await db.from('finance_expedition_maintenance').update(payload).eq('id',selected.id);
    }else{
      result=await db.from('finance_expedition_maintenance').insert({...payload,reference:null});
    }
    if(result.error)return msg(result.error.message);
    window.__fxMaintenanceEdit='';
    await financeExpeditionMaintenancePage();
    msg(selected?'Koreksi perawatan Expedisi tersimpan.':'Biaya perawatan Expedisi tersimpan.',true);
  };
}

async function financeExpeditionProfitLossPage(){
  const [tr,ir,iir,pr,sr,br,mr,cr]=await Promise.all([
    db.from('finance_expedition_trips').select('*').order('trip_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_invoices').select('*').order('invoice_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_invoice_items').select('invoice_id,trip_id'),
    db.from('finance_expedition_payments').select('*').order('paid_on',{ascending:false}).order('created_at',{ascending:false}),
    db.rpc('finance_expedition_summary_v1'),
    db.from('finance_expedition_bop').select('*').order('incurred_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_maintenance').select('*').order('incurred_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('expedition_customers').select('id,code,name,active').order('name',{ascending:true})
  ]);
  const trips=tr.data||[],invoices=ir.data||[],links=iir.data||[],payments=pr.data||[],summaries=sr.data||[],bops=br.data||[],maintenance=mr.data||[],customers=cr.data||[];
  const err=[tr,ir,iir,pr,sr,br,mr,cr].find(x=>x.error)?.error;

  window.__fxReportState=window.__fxReportState||{view:'RINGKASAN',from:'',to:'',customer:'',vehicle:'',route:'',status:''};
  const st=window.__fxReportState;
  const views=[
    ['RINGKASAN','Ringkasan'],['PENDAPATAN','Pendapatan'],['PENERIMAAN','Penerimaan Kas'],['PIUTANG','Piutang'],
    ['BOP','Kas Jalan / BOP'],['PERAWATAN','Servis / Perawatan'],['BUKU_BESAR','Buku Besar'],['LABA_RUGI','Laba / Rugi']
  ];
  const tripById=id=>trips.find(x=>x.id===id);
  const invoiceById=id=>invoices.find(x=>x.id===id);
  const summaryById=id=>summaries.find(x=>x.invoice_id===id);
  const invoiceIdsForTrip=id=>links.filter(x=>x.trip_id===id).map(x=>x.invoice_id);
  const customerForTrip=id=>{
    const iid=invoiceIdsForTrip(id)[0],inv=invoiceById(iid);
    return inv?.customer_name||'';
  };
  const routes=[...new Set(trips.map(x=>x.zone).filter(Boolean).concat(bops.map(x=>x.route).filter(Boolean)))].sort((a,b)=>String(a).localeCompare(String(b)));
  const vehicles=[...new Set(trips.map(x=>x.vehicle).filter(Boolean).concat(maintenance.map(x=>x.vehicle).filter(Boolean)))].sort((a,b)=>String(a).localeCompare(String(b)));
  const customerNames=[...new Set(customers.map(x=>x.name).filter(Boolean).concat(invoices.map(x=>x.customer_name).filter(Boolean)))].sort((a,b)=>String(a).localeCompare(String(b)));
  const inDate=(d)=>!d?false:(!st.from||String(d)>=st.from)&&(!st.to||String(d)<=st.to);
  const tripIdsForInvoice=id=>links.filter(x=>x.invoice_id===id).map(x=>x.trip_id);
  const invoiceMatches=(inv)=>{
    if(!inv)return false;
    if(!inDate(inv.invoice_date))return false;
    if(st.customer&&inv.customer_name!==st.customer)return false;
    if(st.status&&inv.status!==st.status)return false;
    const ids=tripIdsForInvoice(inv.id),ts=ids.map(tripById).filter(Boolean);
    if(st.vehicle&&!ts.some(t=>String(t.vehicle||'')===st.vehicle))return false;
    if(st.route&&!ts.some(t=>String(t.zone||'')===st.route))return false;
    return true;
  };

  const reportInvoices=invoices.filter(invoiceMatches);
  const reportPayments=payments.filter(p=>{
    const inv=invoiceById(p.invoice_id); if(!inv||!inDate(p.paid_on))return false;
    if(st.customer&&inv.customer_name!==st.customer)return false;
    if(st.status&&inv.status!==st.status)return false;
    const ids=tripIdsForInvoice(inv.id),ts=ids.map(tripById).filter(Boolean);
    if(st.vehicle&&!ts.some(t=>String(t.vehicle||'')===st.vehicle))return false;
    if(st.route&&!ts.some(t=>String(t.zone||'')===st.route))return false;
    return true;
  });
  const reportBops=bops.filter(x=>{
    if(!inDate(x.incurred_on))return false;
    const t=tripById(x.trip_id);
    if(st.vehicle&&String(x.vehicle||t?.vehicle||'')!==st.vehicle)return false;
    if(st.route&&String(x.route||t?.zone||'')!==st.route)return false;
    if(st.customer&&t&&customerForTrip(t.id)!==st.customer)return false;
    if(st.customer&&!t)return false;
    return true;
  });
  const reportMaint=maintenance.filter(x=>{
    if(!inDate(x.incurred_on))return false;
    if(st.vehicle&&String(x.vehicle||'')!==st.vehicle)return false;
    return true;
  });

  const revenueRows=[];
  for(const inv of reportInvoices){
    for(const l of links.filter(x=>x.invoice_id===inv.id)){
      const t=tripById(l.trip_id); if(!t)continue;
      revenueRows.push({invoice:inv,trip:t,amount:prodNum(t.trip_price)+prodNum(t.additional)-prodNum(t.deduction)});
    }
  }
  const revenueTotal=revenueRows.reduce((n,x)=>n+x.amount,0);
  const cashTotal=reportPayments.reduce((n,x)=>n+prodNum(x.amount),0);
  const bopTotal=reportBops.reduce((n,x)=>n+prodNum(x.amount),0);
  const maintenanceTotal=reportMaint.reduce((n,x)=>n+prodNum(x.amount),0);
  const receivableTotal=reportInvoices.reduce((n,i)=>n+prodNum(summaryById(i.id)?.receivable||0),0);
  const operationalProfit=revenueTotal-bopTotal;
  const netProfit=operationalProfit-maintenanceTotal;

  const showCustomer=['RINGKASAN','PENDAPATAN','PENERIMAAN','PIUTANG','BUKU_BESAR','LABA_RUGI'].includes(st.view);
  const showVehicle=['RINGKASAN','PENDAPATAN','PENERIMAAN','BOP','PERAWATAN','BUKU_BESAR','LABA_RUGI'].includes(st.view);
  const showRoute=['RINGKASAN','PENDAPATAN','PENERIMAAN','BOP','BUKU_BESAR','LABA_RUGI'].includes(st.view);
  const showStatus=['PENDAPATAN','PENERIMAAN','PIUTANG'].includes(st.view);

  let body='';
  if(st.view==='RINGKASAN'||st.view==='LABA_RUGI'){
    if(st.view==='RINGKASAN'){
      body='<div class="rhpp-summary-cards">'+
        '<div class="rhpp-summary-card"><span>Pendapatan</span><strong>Rp '+prodFmt(revenueTotal,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Penerimaan Kas</span><strong>Rp '+prodFmt(cashTotal,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Piutang</span><strong>Rp '+prodFmt(receivableTotal,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Kas Jalan / BOP</span><strong>Rp '+prodFmt(bopTotal,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Servis / Perawatan</span><strong>Rp '+prodFmt(maintenanceTotal,0)+'</strong></div>'+
        '<div class="rhpp-summary-card rhpp-summary-value"><span>Laba Bersih</span><strong>Rp '+prodFmt(netProfit,0)+'</strong></div>'+
      '</div>';
    }else{
      body='<div class="tablewrap"><table><thead><tr><th>Komponen</th><th>Nilai</th></tr></thead><tbody>'+
        '<tr><td>Pendapatan Expedisi</td><td>Rp '+prodFmt(revenueTotal,0)+'</td></tr>'+
        '<tr><td>Kas Jalan / BOP Operasional</td><td>Rp '+prodFmt(bopTotal,0)+'</td></tr>'+
        '<tr><td><strong>Laba Operasional</strong></td><td><strong>Rp '+prodFmt(operationalProfit,0)+'</strong></td></tr>'+
        '<tr><td>Servis / Perawatan</td><td>Rp '+prodFmt(maintenanceTotal,0)+'</td></tr>'+
        '<tr><td><strong>Laba Bersih Expedisi</strong></td><td><strong>Rp '+prodFmt(netProfit,0)+'</strong></td></tr>'+
        '</tbody></table></div>'+
        '<div class="rhpp-summary-cards" style="margin-top:14px">'+
          '<div class="rhpp-summary-card"><span>Pendapatan</span><strong>Rp '+prodFmt(revenueTotal,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Penerimaan Kas</span><strong>Rp '+prodFmt(cashTotal,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Piutang</span><strong>Rp '+prodFmt(receivableTotal,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Kas Jalan / BOP</span><strong>Rp '+prodFmt(bopTotal,0)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Servis / Perawatan</span><strong>Rp '+prodFmt(maintenanceTotal,0)+'</strong></div>'+
          '<div class="rhpp-summary-card rhpp-summary-value"><span>Laba Bersih</span><strong>Rp '+prodFmt(netProfit,0)+'</strong></div>'+
        '</div>';
    }
  }else if(st.view==='PENDAPATAN'){
    const historicalRevenueRows=revenueRows.filter(x=>String(x.trip.reference||'').startsWith('HIST-BRU-')||String(x.trip.zone||'').trim().toUpperCase()==='HISTORIS BRU');
    const regularRevenueRows=revenueRows.filter(x=>!historicalRevenueRows.includes(x));
    const historicalRevenueTotal=historicalRevenueRows.reduce((n,x)=>n+x.amount,0);
    const regularRevenueTotal=regularRevenueRows.reduce((n,x)=>n+x.amount,0);
    body='<div class="tablewrap"><table><thead><tr><th>Tgl Invoice</th><th>Invoice</th><th>Pelanggan</th><th>Tgl Trip</th><th>SJ</th><th>Rute</th><th>Kendaraan</th><th>Tujuan</th><th>Pendapatan</th></tr></thead><tbody>'+
      revenueRows.map(x=>'<tr><td>'+prodDateId(x.invoice.invoice_date)+'</td><td>'+esc(x.invoice.invoice_number)+'</td><td>'+esc(x.invoice.customer_name)+'</td><td>'+prodDateId(x.trip.trip_date)+'</td><td>'+esc(x.trip.mts_sj||'-')+'</td><td>'+esc(x.trip.zone||'-')+'</td><td>'+esc(x.trip.vehicle||'-')+'</td><td>'+esc(x.trip.destination||'-')+'</td><td>Rp '+prodFmt(x.amount,0)+'</td></tr>').join('')+
      '</tbody></table></div>'+
      (revenueRows.length?'<div class="panel" style="margin-top:14px"><table><tbody>'+
        '<tr><td><strong>Trip Reguler</strong></td><td>'+regularRevenueRows.length+' trip</td><td style="text-align:right"><strong>Rp '+prodFmt(regularRevenueTotal,0)+'</strong></td></tr>'+
        '<tr><td><strong>Historis BRU</strong></td><td>'+historicalRevenueRows.length+' data</td><td style="text-align:right"><strong>Rp '+prodFmt(historicalRevenueTotal,0)+'</strong></td></tr>'+
        '<tr><td><strong>GRAND TOTAL</strong></td><td><strong>'+revenueRows.length+' data</strong></td><td style="text-align:right"><strong>Rp '+prodFmt(revenueTotal,0)+'</strong></td></tr>'+
      '</tbody></table></div>':'<p class="muted">Tidak ada pendapatan pada filter ini.</p>');
  }else if(st.view==='PENERIMAAN'){
    body='<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Pelanggan</th><th>Invoice</th><th>Metode</th><th>Referensi</th><th>Nominal</th><th>Catatan</th></tr></thead><tbody>'+
      reportPayments.map(p=>{const i=invoiceById(p.invoice_id);return '<tr><td>'+prodDateId(p.paid_on)+'</td><td>'+esc(i?.customer_name||'-')+'</td><td>'+esc(i?.invoice_number||'-')+'</td><td>'+esc(p.method||'-')+'</td><td>'+esc(p.reference||'-')+'</td><td>Rp '+prodFmt(p.amount,0)+'</td><td>'+esc(p.notes||'-')+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      (reportPayments.length?'<div class="rhpp-summary-cards" style="margin-top:14px"><div class="rhpp-summary-card"><span>Total Kas Diterima</span><strong>Rp '+prodFmt(cashTotal,0)+'</strong></div><div class="rhpp-summary-card"><span>Jumlah Penerimaan</span><strong>'+reportPayments.length+'</strong></div></div>':'<p class="muted">Tidak ada penerimaan kas pada filter ini.</p>');
  }else if(st.view==='PIUTANG'){
    const rows=reportInvoices.map(i=>({i,s:summaryById(i.id)}));
    body='<div class="tablewrap"><table><thead><tr><th>Invoice</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Pelanggan</th><th>Tagihan</th><th>Dibayar</th><th>Sisa</th><th>Status</th></tr></thead><tbody>'+
      rows.map(x=>'<tr><td>'+esc(x.i.invoice_number)+'</td><td>'+prodDateId(x.i.invoice_date)+'</td><td>'+(x.i.due_date?prodDateId(x.i.due_date):'-')+'</td><td>'+esc(x.i.customer_name)+'</td><td>Rp '+prodFmt(x.s?.invoice_total||0,0)+'</td><td>Rp '+prodFmt(x.s?.paid_total||0,0)+'</td><td><strong>Rp '+prodFmt(x.s?.receivable||0,0)+'</strong></td><td>'+esc(x.i.status)+'</td></tr>').join('')+
      '</tbody></table></div>'+
      (rows.length?'<div class="rhpp-summary-cards" style="margin-top:14px"><div class="rhpp-summary-card"><span>Total Piutang</span><strong>Rp '+prodFmt(receivableTotal,0)+'</strong></div><div class="rhpp-summary-card"><span>Jumlah Invoice</span><strong>'+rows.length+'</strong></div></div>':'<p class="muted">Tidak ada piutang pada filter ini.</p>');
  }else if(st.view==='BOP'){
    body='<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>SJ</th><th>Rute</th><th>Kendaraan</th><th>Kategori</th><th>Nominal</th><th>Sumber</th><th>Catatan</th></tr></thead><tbody>'+
      reportBops.map(x=>{const t=tripById(x.trip_id);return '<tr><td>'+prodDateId(x.incurred_on)+'</td><td>'+esc(t?.mts_sj||'-')+'</td><td>'+esc(x.route||t?.zone||'-')+'</td><td>'+esc(x.vehicle||t?.vehicle||'-')+'</td><td>'+esc(String(x.category||'').replaceAll('_',' '))+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>'+esc(x.reference==='AUTO_TRIP'?'Input OP per Trip':(x.reference||'Manual'))+'</td><td>'+esc(financeOriginalNoteDisplay(x.notes))+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      (reportBops.length?'<div class="rhpp-summary-cards" style="margin-top:14px"><div class="rhpp-summary-card"><span>Total Kas Jalan / BOP</span><strong>Rp '+prodFmt(bopTotal,0)+'</strong></div><div class="rhpp-summary-card"><span>Jumlah Transaksi</span><strong>'+reportBops.length+'</strong></div></div>':'<p class="muted">Tidak ada BOP pada filter ini.</p>');
  }else if(st.view==='PERAWATAN'){
    body='<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Kendaraan</th><th>Nominal</th><th>Referensi</th><th>Catatan</th></tr></thead><tbody>'+
      reportMaint.map(x=>'<tr><td>'+prodDateId(x.incurred_on)+'</td><td>'+esc(String(x.category||'').replaceAll('_',' '))+'</td><td>'+esc(x.vehicle||'-')+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>'+esc(x.reference||'-')+'</td><td>'+esc(x.notes||'-')+'</td></tr>').join('')+
      '</tbody></table></div>'+
      (reportMaint.length?'<div class="rhpp-summary-cards" style="margin-top:14px"><div class="rhpp-summary-card"><span>Total Servis / Perawatan</span><strong>Rp '+prodFmt(maintenanceTotal,0)+'</strong></div><div class="rhpp-summary-card"><span>Jumlah Transaksi</span><strong>'+reportMaint.length+'</strong></div></div>':'<p class="muted">Tidak ada perawatan pada filter ini.</p>');
  }else if(st.view==='BUKU_BESAR'){
    const ledger=[];
    reportPayments.forEach(p=>{const i=invoiceById(p.invoice_id);ledger.push({date:p.paid_on,type:'KAS MASUK',detail:'Penerimaan '+(i?.customer_name||'Expedisi')+(i?.invoice_number?' · '+i.invoice_number:''),debit:prodNum(p.amount),credit:0,ref:p.reference||''});});
    reportBops.forEach(x=>{const t=tripById(x.trip_id);ledger.push({date:x.incurred_on,type:'KAS KELUAR',detail:'Kas Jalan/BOP '+(x.route||t?.zone||'Expedisi'),debit:0,credit:prodNum(x.amount),ref:x.reference||''});});
    reportMaint.forEach(x=>ledger.push({date:x.incurred_on,type:'KAS KELUAR',detail:'Servis/Perawatan '+String(x.category||'').replaceAll('_',' '),debit:0,credit:prodNum(x.amount),ref:x.reference||''}));
    ledger.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.type).localeCompare(String(b.type)));
    let running=0;
    const rows=ledger.map(x=>{running+=x.debit-x.credit;return {...x,balance:running};});
    body='<div class="rhpp-summary-cards"><div class="rhpp-summary-card"><span>Kas Masuk</span><strong>Rp '+prodFmt(cashTotal,0)+'</strong></div><div class="rhpp-summary-card"><span>Kas Keluar</span><strong>Rp '+prodFmt(bopTotal+maintenanceTotal,0)+'</strong></div><div class="rhpp-summary-card rhpp-summary-value"><span>Saldo Bersih</span><strong>Rp '+prodFmt(cashTotal-bopTotal-maintenanceTotal,0)+'</strong></div></div>'+
      '<p class="muted">Buku Besar Expedisi menampilkan arus kas aktual: penerimaan pelanggan, Kas Jalan/BOP, dan servis/perawatan. Pendapatan invoice yang belum diterima tidak ditambahkan lagi agar kas tidak dihitung dua kali.</p>'+
      '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Rincian</th><th>Referensi</th><th>Masuk</th><th>Keluar</th><th>Saldo</th></tr></thead><tbody>'+
      rows.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.type)+'</td><td>'+esc(x.detail)+'</td><td>'+esc(x.ref||'-')+'</td><td>'+(x.debit?'Rp '+prodFmt(x.debit,0):'-')+'</td><td>'+(x.credit?'Rp '+prodFmt(x.credit,0):'-')+'</td><td><strong>Rp '+prodFmt(x.balance,0)+'</strong></td></tr>').join('')+
      '</tbody></table></div>'+(rows.length?'':'<p class="muted">Tidak ada transaksi kas pada filter ini.</p>');
  }

  let html='<section class="panel"><div class="rhpp-section-head"><div><h3>Laporan Expedisi</h3><p class="muted">Pusat pemeriksaan Expedisi. Input tetap dilakukan dari menu operasional masing-masing.</p></div><div class="report-actions"><button type="button" id="fxReportCenterPrint">Cetak / PDF</button><button type="button" id="fxReportCenterPrintExcel">Excel</button></div></div>'+
    '<div class="form-vertical compact-form">'+
      '<label>Pilih Laporan<select id="fxReportView">'+views.map(v=>'<option value="'+v[0]+'" '+(st.view===v[0]?'selected':'')+'>'+v[1]+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input id="fxReportFrom" type="date" value="'+esc(st.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input id="fxReportTo" type="date" value="'+esc(st.to||'')+'"></label>'+
      (showCustomer?'<label>Pelanggan<select id="fxReportCustomer"><option value="">Semua Pelanggan</option>'+customerNames.map(v=>'<option value="'+esc(v)+'" '+(st.customer===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>':'')+
      (showVehicle?'<label>Kendaraan<select id="fxReportVehicle"><option value="">Semua Kendaraan</option>'+vehicles.map(v=>'<option value="'+esc(v)+'" '+(st.vehicle===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>':'')+
      (showRoute?'<label>Rute<select id="fxReportRoute"><option value="">Semua Rute</option>'+routes.map(v=>'<option value="'+esc(v)+'" '+(st.route===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>':'')+
      (showStatus?'<label>Status<select id="fxReportStatus"><option value="">Semua Status</option><option value="ISSUED" '+(st.status==='ISSUED'?'selected':'')+'>ISSUED</option><option value="PAID" '+(st.status==='PAID'?'selected':'')+'>PAID</option><option value="VOID" '+(st.status==='VOID'?'selected':'')+'>VOID</option></select></label>':'')+
      '<div class="inline-actions"><button type="button" id="fxReportApply">Terapkan</button><button type="button" id="fxReportReset">Reset Filter</button></div>'+
    '</div></section>'+
    '<section class="panel" id="fxReportCenterPrintArea"><h3>'+esc(views.find(v=>v[0]===st.view)?.[1]||'Laporan Expedisi')+'</h3>'+body+'</section>';

  layout(html);if(err)msg(err.message);
  const view=document.getElementById('fxReportView');
  if(view)view.onchange=async()=>{st.view=view.value||'RINGKASAN';st.status='';await financeExpeditionProfitLossPage();};
  const apply=document.getElementById('fxReportApply');
  if(apply)apply.onclick=async()=>{
    st.from=document.getElementById('fxReportFrom')?.value||'';
    st.to=document.getElementById('fxReportTo')?.value||'';
    st.customer=document.getElementById('fxReportCustomer')?.value||'';
    st.vehicle=document.getElementById('fxReportVehicle')?.value||'';
    st.route=document.getElementById('fxReportRoute')?.value||'';
    st.status=document.getElementById('fxReportStatus')?.value||'';
    await financeExpeditionProfitLossPage();
  };
  const reset=document.getElementById('fxReportReset');
  if(reset)reset.onclick=async()=>{window.__fxReportState={view:st.view,from:'',to:'',customer:'',vehicle:'',route:'',status:''};await financeExpeditionProfitLossPage();};
  const p=document.getElementById('fxReportCenterPrint');if(p)p.onclick=()=>printFinanceDocument('fxReportCenterPrintArea','Laporan Expedisi - '+(views.find(v=>v[0]===st.view)?.[1]||'Ringkasan'));const fxCenterExcel=document.getElementById('fxReportCenterPrintExcel');if(fxCenterExcel)fxCenterExcel.onclick=()=>exportFinanceDocumentExcel('fxReportCenterPrintArea','Laporan Expedisi - '+(views.find(v=>v[0]===st.view)?.[1]||'Ringkasan'));
}

async function financeExpeditionBopPage(){
  const [br,tr,dr,vr,rr]=await Promise.all([
    db.from('finance_expedition_bop').select('*').order('incurred_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_trips').select('id,trip_date,mts_sj,driver,vehicle,zone,destination,reference').order('trip_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('expedition_drivers').select('id,code,name').eq('active',true).order('name',{ascending:true}),
    db.from('expedition_vehicles').select('id,plate_number,vehicle_type').eq('active',true).order('plate_number',{ascending:true}),
    db.from('expedition_routes').select('id,code,route_name').eq('active',true).order('route_name',{ascending:true})
  ]);
  const rows=br.data||[],trips=tr.data||[],drivers=dr.data||[],vehicles=vr.data||[],routes=rr.data||[],err=[br,tr,dr,vr,rr].find(x=>x.error)?.error;
  const autoRows=rows.filter(x=>x.reference==='AUTO_TRIP');
  const autoTotalFor=id=>autoRows.filter(x=>x.trip_id===id).reduce((n,x)=>n+prodNum(x.amount),0);
  const isHistorical=t=>String(t.reference||'').startsWith('HIST-BRU-')||String(t.zone||'').trim().toUpperCase()==='HISTORIS BRU';
  const physicalTrips=trips.filter(t=>!isHistorical(t));

  window.__fxBopFilter=window.__fxBopFilter||'BELUM';
  window.__fxBopSelected=window.__fxBopSelected||null;
  const bopFilter=window.__fxBopFilter;
  const selectedId=window.__fxBopSelected;
  const selectedTrip=physicalTrips.find(t=>t.id===selectedId)||null;
  const selectedAmount=selectedTrip?autoTotalFor(selectedTrip.id):0;
  const selectedDone=selectedAmount>0;

  const visibleTrips=physicalTrips.filter(t=>{
    const done=autoTotalFor(t.id)>0;
    return bopFilter==='SEMUA'||(bopFilter==='SUDAH'?done:!done);
  });
  const countDone=physicalTrips.filter(t=>autoTotalFor(t.id)>0).length;
  const countPending=physicalTrips.length-countDone;

  let html='<section class="panel"><h3>BOP / Kas Jalan Expedisi</h3><p class="muted">Keuangan mencatat Kas Jalan saat diajukan sopir. Data otomatis masuk antrean Logistik dengan status MENUNGGU SURAT JALAN. Logistik melengkapi SJ/MTS setelah dokumen kembali.</p></section>'+
    '<section class="panel"><h3>Input Kas Jalan</h3><form id="fxKasJalanForm" class="form-vertical">'+
      '<label>Tanggal Jalan<input name="trip_date" type="date" required></label>'+
      '<label>Sopir<select name="driver" required><option value="">Pilih Sopir</option>'+drivers.map(x=>'<option value="'+esc(x.name)+'">'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
      '<label>Truk<select name="vehicle" required><option value="">Pilih Truk</option>'+vehicles.map(x=>'<option value="'+esc(x.plate_number)+'">'+esc(x.plate_number+(x.vehicle_type?' · '+x.vehicle_type:''))+'</option>').join('')+'</select></label>'+
      '<label>Rute<select name="zone" required><option value="">Pilih Rute</option>'+routes.map(x=>'<option value="'+esc(x.route_name)+'">'+esc(x.code+' · '+x.route_name)+'</option>').join('')+'</select></label>'+
      '<label>Nominal Kas Jalan<input name="amount" type="text" inputmode="decimal" data-number="1" placeholder="Contoh: 685.000" required></label>'+
      '<label>Catatan<textarea name="notes" placeholder="Opsional"></textarea></label>'+
      '<button type="submit">Simpan Kas Jalan</button></form></section>';

  if(selectedTrip){
    html+='<section class="panel"><h3>'+(selectedDone?'Koreksi BOP Expedisi':'Isi BOP Expedisi')+'</h3>'+
      '<form id="fxBopEntryForm" class="form-vertical">'+
        '<label>Tanggal Trip<input type="text" value="'+esc(prodDateId(selectedTrip.trip_date))+'" readonly></label>'+
        '<label>MTS/SJ<input type="text" value="'+esc(selectedTrip.mts_sj||'-')+'" readonly></label>'+
        '<label>Rute<input type="text" value="'+esc(selectedTrip.zone||'-')+'" readonly></label>'+
        '<label>Sopir / Truk<input type="text" value="'+esc((selectedTrip.driver||'-')+' · '+(selectedTrip.vehicle||'-'))+'" readonly></label>'+
        '<label>Nominal OP<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(selectedDone?esc(fmtNumber(selectedAmount)):'')+'" placeholder="Contoh: 685.000" required></label>'+
        '<div class="inline-actions"><button type="submit">'+(selectedDone?'Simpan Koreksi':'Simpan BOP')+'</button><button type="button" id="fxBopCancel" class="btn-secondary">Batal</button>'+(selectedDone&&profile?.role==='ADMIN'?'<button type="button" id="fxBopDelete" class="btn-danger">Hapus BOP</button>':'')+'</div>'+
      '</form></section>';
  }

  html+='<section class="panel"><div style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-bottom:12px">'+
      '<div><h3 style="margin-bottom:4px">Trip Belum / Sudah Masuk BOP</h3><p class="muted" style="margin:0">Belum: '+countPending+' · Sudah: '+countDone+' · Total trip fisik: '+physicalTrips.length+'</p></div>'+
      '<label style="min-width:220px">Filter Status<select id="fxBopStatusFilter"><option value="BELUM" '+(bopFilter==='BELUM'?'selected':'')+'>Belum Masuk</option><option value="SUDAH" '+(bopFilter==='SUDAH'?'selected':'')+'>Sudah Masuk</option><option value="SEMUA" '+(bopFilter==='SEMUA'?'selected':'')+'>Semua</option></select></label>'+
    '</div>'+
    '<div class="report-actions"><button type="button" id="fxBopHistoryPrint">Cetak</button> <button type="button" id="fxBopHistoryPdf">PDF</button> <button type="button" id="fxBopHistoryExcel">Excel</button></div><div class="tablewrap"><table id="fxBopHistoryTable"><thead><tr><th>Tanggal</th><th>MTS/SJ</th><th>Rute</th><th>Sopir / Truk</th><th>Nominal OP</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
      visibleTrips.map(t=>{
        const posted=autoTotalFor(t.id),done=posted>0;
        return '<tr><td>'+prodDateId(t.trip_date)+'</td><td>'+esc(t.mts_sj||'-')+'</td><td>'+esc(t.zone||'-')+'</td>'+
          '<td>'+esc((t.driver||'-')+' · '+(t.vehicle||'-'))+'</td>'+
          '<td>'+(done?'<strong>Rp '+prodFmt(posted,0)+'</strong>':'-')+'</td>'+
          '<td>'+(done?'<span class="pill">SUDAH MASUK</span>':'<span class="finance-status finance-status-wait">BELUM</span>')+'</td>'+
          '<td><button type="button" data-select-exp-bop="'+esc(t.id)+'">'+(done?'Koreksi':'Isi BOP')+'</button></td></tr>';
      }).join('')+
    '</tbody></table></div>'+(visibleTrips.length?'':'<p class="muted">'+(bopFilter==='BELUM'&&countPending===0?'Semua trip sudah masuk BOP. Tidak ada trip yang menunggu input.':'Tidak ada trip pada filter ini.')+'</p>')+'</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);
  bindTableExportActions({tableId:'fxBopHistoryTable',printId:'fxBopHistoryPrint',pdfId:'fxBopHistoryPdf',excelId:'fxBopHistoryExcel',title:'BOP Expedisi',filename:'BOP_Expedisi',filterText:'Status '+bopFilter,dropLast:true});

  const kasForm=document.getElementById('fxKasJalanForm');
  if(kasForm){
    const d=kasForm.elements.trip_date;if(d&&!d.value)d.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    kasForm.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(kasForm),amount=normalizeInputID(fd.get('amount'));
      if(amount===null||amount<=0)return msg('Nominal Kas Jalan harus lebih dari nol.');
      const {error}=await db.rpc('finance_create_expedition_kas_jalan_v1',{p_trip_date:String(fd.get('trip_date')||''),p_driver:String(fd.get('driver')||''),p_vehicle:String(fd.get('vehicle')||''),p_zone:String(fd.get('zone')||''),p_amount:amount,p_notes:String(fd.get('notes')||'')||null});
      if(error)return msg(error.message);await financeExpeditionBopPage();msg('Kas Jalan tersimpan dan masuk antrean Surat Jalan Logistik.',true);
    };
  }

  const filter=document.getElementById('fxBopStatusFilter');
  if(filter)filter.onchange=async()=>{
    window.__fxBopFilter=filter.value||'BELUM';
    window.__fxBopSelected=null;
    await financeExpeditionBopPage();
  };

  document.querySelectorAll('[data-select-exp-bop]').forEach(btn=>btn.onclick=async()=>{
    window.__fxBopSelected=btn.dataset.selectExpBop||null;
    await financeExpeditionBopPage();
    document.getElementById('fxBopEntryForm')?.scrollIntoView({behavior:'smooth',block:'start'});
  });

  const cancel=document.getElementById('fxBopCancel');
  if(cancel)cancel.onclick=async()=>{window.__fxBopSelected=null;await financeExpeditionBopPage();};

  const deleteBop=document.getElementById('fxBopDelete');
  if(deleteBop&&selectedTrip)deleteBop.onclick=async()=>{if(profile?.role!=='ADMIN')return msg('Hanya ADMIN yang boleh menghapus BOP Expedisi.');if(!await appConfirm('PERINGATAN HAPUS BOP EXPEDISI\n\nBOP trip ini akan dihapus dari Arus Kas dan laba/rugi Expedisi. Trip tetap ada dan statusnya kembali BELUM MASUK BOP.\n\nLanjutkan hapus?'))return;const {error}=await db.rpc('admin_delete_expedition_trip_bop_v1',{p_trip_id:selectedTrip.id});if(error)return msg(error.message);window.__fxBopSelected=null;await financeExpeditionBopPage();msg('BOP Expedisi berhasil dihapus oleh ADMIN.',true);};

  const form=document.getElementById('fxBopEntryForm');
  if(form&&selectedTrip)form.onsubmit=async ev=>{
    ev.preventDefault();
    const amount=normalizeInputID(new FormData(form).get('amount'));
    if(amount===null||amount<=0)return msg('Isi nominal OP lebih dari nol.');
    const submit=form.querySelector('button[type="submit"]');
    if(submit){submit.disabled=true;submit.textContent='Menyimpan...';}
    const result=selectedDone
      ?await db.rpc('finance_correct_expedition_trip_op',{p_trip_id:selectedTrip.id,p_amount:amount})
      :await db.rpc('finance_post_expedition_bop_for_trip',{p_trip_id:selectedTrip.id,p_operational_override:amount});
    if(result.error){
      if(submit){submit.disabled=false;submit.textContent=selectedDone?'Simpan Koreksi':'Simpan BOP';}
      return msg(result.error.message);
    }
    window.__fxBopSelected=null;
    await financeExpeditionBopPage();
    msg((selectedDone?'Koreksi BOP Expedisi tersimpan: Rp ':'BOP Expedisi tersimpan: Rp ')+prodFmt(result.data||0,0)+'.',true);
  };

}

async function financeAdvancePage(){
  const [er,vr,pr]=await Promise.all([
    db.from('employees').select('id,code,name,kind,active').eq('active',true).order('code',{ascending:true}),
    db.from('advances').select('id,employee_id,advanced_on,amount,description,reference,created_at').order('advanced_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('advance_payments').select('advance_id,amount')
  ]);
  const employees=er.data||[],rows=vr.data||[],payments=pr.data||[];
  const err=[er,vr,pr].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const paid=id=>payments.filter(x=>x.advance_id===id).reduce((n,x)=>n+prodNum(x.amount),0);
  const emp=id=>{const x=employees.find(e=>e.id===id);return x?x.code+' · '+x.name:'-'};
  window.__financeAdvanceFilter=window.__financeAdvanceFilter||{employee:'',from:'',to:'',status:''};
  const af=window.__financeAdvanceFilter;
  const filteredRows=rows.filter(x=>{
    const bal=Math.max(0,prodNum(x.amount)-paid(x.id));
    if(af.employee&&x.employee_id!==af.employee)return false;
    if(af.from&&String(x.advanced_on||'')<af.from)return false;
    if(af.to&&String(x.advanced_on||'')>af.to)return false;
    if(af.status==='OPEN'&&bal<=0.0001)return false;
    if(af.status==='PAID'&&bal>0.0001)return false;
    return true;
  });
  const totalKasbon=filteredRows.reduce((n,x)=>n+prodNum(x.amount),0);
  const totalBayar=filteredRows.reduce((n,x)=>n+paid(x.id),0);
  const totalSisa=Math.max(0,totalKasbon-totalBayar);
  window.__financeAdvanceEdit=window.__financeAdvanceEdit||'';
  const editId=window.__financeAdvanceEdit,editRow=rows.find(x=>x.id===editId)||null;

  let html='<section class="panel"><h3>'+(editRow?'Edit Kasbon Karyawan / ABK':'Kasbon Karyawan / ABK')+'</h3>'+
    '<p class="muted">Kasbon adalah urusan pribadi karyawan/ABK dengan perusahaan. Tidak terkait kandang, siklus, RHPP, atau produksi.</p>'+
    '<form id="financeAdvanceForm" class="form-vertical">'+
      '<label>Karyawan / ABK<select name="employee_id" required><option value="">Pilih</option>'+
        employees.map(x=>'<option value="'+esc(x.id)+'" '+(editRow?.employee_id===x.id?'selected':'')+'>'+esc(x.code+' · '+x.name+' · '+(x.kind==='ABK'?'ABK':'KARYAWAN'))+'</option>').join('')+
      '</select></label>'+
      '<label>Tanggal Kasbon<input name="advanced_on" type="date" value="'+esc(editRow?.advanced_on||today)+'" required></label>'+
      '<label>Nominal Kasbon<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(editRow?fmtNumber(editRow.amount):'')+'" required></label>'+
      '<label>Keterangan<input name="description" value="'+esc(editRow?.description||'')+'" placeholder="Contoh: Kasbon pribadi"></label>'+
      '<div class="report-actions"><button type="submit">'+(editRow?'Simpan Perubahan':'Simpan Kasbon')+'</button>'+(editRow?'<button type="button" id="advanceEditCancel">Batal Edit</button>':'')+'</div>'+
    '</form></section>'+
    '<section class="panel" id="advancePrintArea">'+
      '<div class="rhpp-section-head"><div><h3>Rincian Kasbon</h3><p class="muted">Kasbon · Sudah Bayar · Sisa Kasbon.</p></div><div class="report-actions"><button type="button" id="advancePrint">Cetak / PDF</button><button type="button" id="advancePrintExcel">Excel</button></div></div>'+
      '<form id="advanceFilterForm" class="filter-grid">'+
        '<label>Karyawan / ABK<select name="employee"><option value="">Semua</option>'+employees.map(e=>'<option value="'+esc(e.id)+'" '+(af.employee===e.id?'selected':'')+'>'+esc(e.code+' · '+e.name)+'</option>').join('')+'</select></label>'+
        '<label>Dari Tanggal<input type="date" name="from" value="'+esc(af.from)+'"></label>'+
        '<label>Sampai Tanggal<input type="date" name="to" value="'+esc(af.to)+'"></label>'+
        '<label>Status<select name="status"><option value="">Semua</option><option value="OPEN" '+(af.status==='OPEN'?'selected':'')+'>Belum Lunas</option><option value="PAID" '+(af.status==='PAID'?'selected':'')+'>Lunas</option></select></label>'+
        '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="advanceFilterReset">Reset</button></div>'+
      '</form>'+
      '<div class="rhpp-summary-cards">'+
        '<div class="rhpp-summary-card"><span>Total Kasbon</span><strong>Rp '+prodFmt(totalKasbon,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Bayar</span><strong>Rp '+prodFmt(totalBayar,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Sisa Kasbon</span><strong>Rp '+prodFmt(totalSisa,0)+'</strong></div>'+
      '</div>'+
      '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Karyawan / ABK</th><th>Keterangan</th><th>Kasbon</th><th>Sudah Bayar</th><th>Sisa Kasbon</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
      filteredRows.map(x=>{const p=paid(x.id),bal=Math.max(0,prodNum(x.amount)-p);return '<tr><td>'+prodDateId(x.advanced_on)+'</td><td>'+esc(emp(x.employee_id))+'</td><td>'+esc(x.description||'-')+'</td><td>Rp '+prodFmt(x.amount,0)+'</td><td>Rp '+prodFmt(p,0)+'</td><td><strong>Rp '+prodFmt(bal,0)+'</strong></td><td>'+(bal<=0.0001?'<strong>LUNAS</strong>':'BELUM LUNAS')+'</td><td><div class="inline-actions"><button type="button" data-edit-advance="'+esc(x.id)+'">Edit</button>'+adminDeleteTxnButton('advances',x.id)+'</div></td></tr>';}).join('')+
      '</tbody></table></div>'+(filteredRows.length?'':'<p class="muted">Tidak ada data kasbon sesuai filter.</p>')+
    '</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);
  const advanceFilterForm=document.getElementById('advanceFilterForm');
  if(advanceFilterForm)advanceFilterForm.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(advanceFilterForm);af.employee=String(fd.get('employee')||'');af.from=String(fd.get('from')||'');af.to=String(fd.get('to')||'');af.status=String(fd.get('status')||'');await financeAdvancePage();};
  const advanceFilterReset=document.getElementById('advanceFilterReset');
  if(advanceFilterReset)advanceFilterReset.onclick=async()=>{window.__financeAdvanceFilter={employee:'',from:'',to:'',status:''};await financeAdvancePage();};
  const advancePrint=document.getElementById('advancePrint');
  if(advancePrint)advancePrint.onclick=()=>printFinanceDocument('advancePrintArea','Rincian Kasbon Karyawan dan ABK');const advanceExcel=document.getElementById('advancePrintExcel');if(advanceExcel)advanceExcel.onclick=()=>exportFinanceDocumentExcel('advancePrintArea','Rincian Kasbon Karyawan dan ABK');

  root.querySelectorAll('[data-edit-advance]').forEach(btn=>btn.onclick=async()=>{window.__financeAdvanceEdit=btn.dataset.editAdvance||'';await financeAdvancePage();document.getElementById('financeAdvanceForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('advanceEditCancel');if(cancelEdit)cancelEdit.onclick=async()=>{window.__financeAdvanceEdit='';await financeAdvancePage();};
  bindAdminTransactionDeletes(()=>{window.__financeAdvanceEdit='';return financeAdvancePage();});
  const form=document.getElementById('financeAdvanceForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),amount=normalizeInputID(fd.get('amount'));
    const employeeId=String(fd.get('employee_id')||'');
    if(!employees.find(x=>x.id===employeeId))return msg('Pilih karyawan / ABK.');
    if(amount===null||amount<=0)return msg('Nominal kasbon tidak valid.');
    const alreadyPaid=editRow?paid(editRow.id):0;
    if(editRow&&amount<alreadyPaid)return msg('Nominal Kasbon tidak boleh lebih kecil dari total yang sudah dibayar Rp '+prodFmt(alreadyPaid,0)+'.');
    let result;
    if(editRow){
      result=await db.rpc('finance_correct_employee_advance_v1',{p_id:editRow.id,p_employee_id:employeeId,p_advanced_on:String(fd.get('advanced_on')||''),p_amount:amount,p_description:String(fd.get('description')||'')||null});
    }else{
      result=await db.rpc('finance_save_employee_advance_atomic',{p_employee_id:employeeId,p_advanced_on:String(fd.get('advanced_on')||''),p_amount:amount,p_contract_assignment_id:null,p_description:String(fd.get('description')||'')||null,p_reference:null});
    }
    const {error}=result;
    if(error)return msg(error.message);
    window.__financeAdvanceEdit='';
    await financeAdvancePage();
    msg(editRow?'Kasbon berhasil diperbarui.':'Kasbon berhasil disimpan.',true);
  };
}

async function financeAdvancePaymentPage(){
  const [vr,pr,er]=await Promise.all([
    db.from('advances').select('id,employee_id,advanced_on,amount,description,reference,created_at').order('advanced_on',{ascending:true}),
    db.from('advance_payments').select('id,advance_id,paid_on,amount,method,reference,notes,created_at').order('paid_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('employees').select('id,code,name,kind,active').eq('active',true).order('name',{ascending:true})
  ]);
  const advances=vr.data||[],payments=pr.data||[],employees=er.data||[];
  const err=[vr,pr,er].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const paid=id=>payments.filter(x=>x.advance_id===id).reduce((n,x)=>n+prodNum(x.amount),0);
  const open=advances.map(a=>({...a,balance:Math.max(0,prodNum(a.amount)-paid(a.id))})).filter(a=>a.balance>0.0001);
  const emp=id=>{const e=employees.find(x=>x.id===id);return e?e.code+' · '+e.name:'-'};

  window.__financeAdvancePaymentState=window.__financeAdvancePaymentState||{employee:'',editId:'',filterEmployee:'',from:'',to:''};
  const st=window.__financeAdvancePaymentState;
  const editPayment=payments.find(x=>x.id===st.editId)||null;
  if(editPayment){const ea=advances.find(x=>x.id===editPayment.advance_id);if(ea)st.employee=ea.employee_id;}
  const employeeOpen=st.employee?open.filter(a=>a.employee_id===st.employee):[];
  const filteredPayments=payments.filter(p=>{const a=advances.find(x=>x.id===p.advance_id);if(st.filterEmployee&&a?.employee_id!==st.filterEmployee)return false;if(st.from&&String(p.paid_on||'')<st.from)return false;if(st.to&&String(p.paid_on||'')>st.to)return false;return true;});

  let html='<section class="panel"><h3>'+(editPayment?'Edit Bayar Kasbon':'Bayar Kasbon')+'</h3><p class="muted">Pilih karyawan/ABK, pilih kasbon yang masih memiliki sisa, lalu catat pembayaran.</p>'+
    '<form id="advancePaymentForm" class="form-vertical">'+
      '<label>Karyawan / ABK<select id="advancePaymentEmployee" required><option value="">Pilih</option>'+
        employees.map(e=>'<option value="'+esc(e.id)+'" '+(st.employee===e.id?'selected':'')+'>'+esc(e.code+' · '+e.name+' · '+(e.kind==='ABK'?'ABK':'KARYAWAN'))+'</option>').join('')+
      '</select></label>'+
      '<label>Kasbon Aktif<select name="advance_id" required '+(!st.employee?'disabled':'')+'><option value="">Pilih Kasbon</option>'+advances.filter(a=>a.employee_id===st.employee&&(a.id===editPayment?.advance_id||open.some(o=>o.id===a.id))).map(a=>'<option value="'+esc(a.id)+'" '+(editPayment?.advance_id===a.id?'selected':'')+'>'+esc(prodDateId(a.advanced_on)+' · '+(a.description||'Kasbon'))+'</option>').join('')+'</select></label>'+
      (st.employee&&!employeeOpen.length?'<p class="muted">Tidak ada kasbon yang masih memiliki sisa.</p>':'')+
      '<label>Tanggal Bayar<input name="paid_on" type="date" value="'+esc(editPayment?.paid_on||today)+'" required></label>'+
      '<label>Nominal Bayar<input name="amount" type="text" inputmode="decimal" data-number="1" value="'+(editPayment?fmtNumber(editPayment.amount):'')+'" required></label>'+
      '<label>Metode<select name="method" required><option value="TUNAI" '+(editPayment?.method==='TUNAI'?'selected':'')+'>Tunai</option><option value="TRANSFER" '+(editPayment?.method==='TRANSFER'?'selected':'')+'>Transfer</option></select></label>'+
      '<label>Catatan<input name="notes" value="'+esc(editPayment?.notes||'')+'"></label>'+
      '<div class="report-actions"><button type="submit" '+(!editPayment&&!employeeOpen.length?'disabled':'')+'>'+(editPayment?'Simpan Perubahan':'Simpan Pembayaran')+'</button>'+(editPayment?'<button type="button" id="advancePaymentEditCancel">Batal Edit</button>':'')+'</div>'+
    '</form></section>'+
    '<section class="panel" id="advancePaymentPrintArea">'+
      '<div class="rhpp-section-head"><div><h3>Rincian Bayar Kasbon</h3><p class="muted">Menampilkan asal kasbon dan setiap transaksi pembayarannya.</p></div><div class="report-actions"><button type="button" id="advancePaymentPrint">Cetak / PDF</button><button type="button" id="advancePaymentPrintExcel">Excel</button></div></div>'+
      '<form id="advancePaymentFilterForm" class="filter-grid">'+
        '<label>Karyawan / ABK<select name="employee"><option value="">Semua</option>'+employees.map(e=>'<option value="'+esc(e.id)+'" '+(st.filterEmployee===e.id?'selected':'')+'>'+esc(e.code+' · '+e.name)+'</option>').join('')+'</select></label>'+
        '<label>Tanggal Bayar Dari<input type="date" name="from" value="'+esc(st.from)+'"></label>'+
        '<label>Tanggal Bayar Sampai<input type="date" name="to" value="'+esc(st.to)+'"></label>'+
        '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="advancePaymentFilterReset">Reset</button></div>'+
      '</form>'+
      '<div class="tablewrap"><table><thead><tr><th>Karyawan / ABK</th><th>Tanggal Kasbon</th><th>Nominal Kasbon</th><th>Keterangan Kasbon</th><th>Tanggal Bayar</th><th>Nominal Bayar</th><th>Metode</th><th>Sisa Setelah Bayar</th><th>Aksi</th></tr></thead><tbody>'+
      filteredPayments.map(p=>{const a=advances.find(x=>x.id===p.advance_id),allFor=payments.filter(x=>x.advance_id===p.advance_id).filter(x=>String(x.paid_on||'')<=String(p.paid_on||'')).reduce((n,x)=>n+prodNum(x.amount),0),bal=Math.max(0,prodNum(a?.amount)-allFor);return '<tr><td>'+esc(emp(a?.employee_id))+'</td><td>'+prodDateId(a?.advanced_on)+'</td><td>Rp '+prodFmt(a?.amount,0)+'</td><td>'+esc(a?.description||'-')+'</td><td>'+prodDateId(p.paid_on)+'</td><td>Rp '+prodFmt(p.amount,0)+'</td><td>'+esc(String(p.method||'').replaceAll('_',' '))+'</td><td><strong>Rp '+prodFmt(bal,0)+'</strong></td><td><div class="inline-actions"><button type="button" data-edit-advance-payment="'+esc(p.id)+'">Edit</button>'+adminDeleteTxnButton('advance_payments',p.id)+'</div></td></tr>';}).join('')+
      '</tbody></table></div>'+(filteredPayments.length?'':'<p class="muted">Tidak ada pembayaran kasbon sesuai filter.</p>')+
    '</section>';
  layout(html);bindNumberInputs();if(err)msg(err.message);

  const advancePaymentFilterForm=document.getElementById('advancePaymentFilterForm');
  if(advancePaymentFilterForm)advancePaymentFilterForm.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(advancePaymentFilterForm);st.filterEmployee=String(fd.get('employee')||'');st.from=String(fd.get('from')||'');st.to=String(fd.get('to')||'');await financeAdvancePaymentPage();};
  const advancePaymentFilterReset=document.getElementById('advancePaymentFilterReset');
  if(advancePaymentFilterReset)advancePaymentFilterReset.onclick=async()=>{st.filterEmployee='';st.from='';st.to='';await financeAdvancePaymentPage();};
  const advancePaymentPrint=document.getElementById('advancePaymentPrint');
  if(advancePaymentPrint)advancePaymentPrint.onclick=()=>printFinanceDocument('advancePaymentPrintArea','Rincian Bayar Kasbon');const advancePaymentExcel=document.getElementById('advancePaymentPrintExcel');if(advancePaymentExcel)advancePaymentExcel.onclick=()=>exportFinanceDocumentExcel('advancePaymentPrintArea','Rincian Bayar Kasbon');
  const employeeSel=document.getElementById('advancePaymentEmployee');
  if(employeeSel)employeeSel.onchange=async()=>{
    st.employee=employeeSel.value||'';
    await financeAdvancePaymentPage();
  };

  root.querySelectorAll('[data-edit-advance-payment]').forEach(btn=>btn.onclick=async()=>{st.editId=btn.dataset.editAdvancePayment||'';await financeAdvancePaymentPage();document.getElementById('advancePaymentForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('advancePaymentEditCancel');if(cancelEdit)cancelEdit.onclick=async()=>{st.editId='';await financeAdvancePaymentPage();};
  bindAdminTransactionDeletes(()=>{st.editId='';return financeAdvancePaymentPage();});
  const form=document.getElementById('advancePaymentForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),id=String(fd.get('advance_id')||''),a=advances.find(x=>x.id===id),amount=normalizeInputID(fd.get('amount'));
    if(!st.employee)return msg('Pilih karyawan / ABK.');
    if(!a)return msg('Pilih kasbon aktif.');
    const otherPaid=payments.filter(x=>x.advance_id===id&&x.id!==editPayment?.id).reduce((n,x)=>n+prodNum(x.amount),0),maxPay=Math.max(0,prodNum(a.amount)-otherPaid);
    if(amount===null||amount<=0||amount>maxPay)return msg('Nominal bayar tidak valid atau melebihi sisa kasbon Rp '+prodFmt(maxPay,0)+'.');
    const payload={advance_id:id,paid_on:fd.get('paid_on'),amount,method:fd.get('method'),reference:null,notes:fd.get('notes')||null};
    const {error}=editPayment?await db.rpc('finance_correct_advance_payment_v1',{p_id:editPayment.id,p_advance_id:id,p_paid_on:fd.get('paid_on'),p_amount:amount,p_method:fd.get('method'),p_notes:fd.get('notes')||null}):await db.from('advance_payments').insert(payload);
    if(error)return msg(error.message);
    st.editId='';
    await financeAdvancePaymentPage();
    msg(editPayment?'Pembayaran kasbon berhasil diperbarui.':'Pembayaran kasbon berhasil disimpan.',true);
  };
}

async function financeSalaryPage(){
  const [br,ar,cr,lr,er,vr,pr,sr]=await Promise.all([
    db.from('barns').select('id,code,name').order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,created_at').order('start_date',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('logistics_contract_assignment_abks').select('contract_assignment_id,abk_id'),
    db.from('employees').select('id,code,name,kind').eq('kind','ABK'),
    db.from('advances').select('id,employee_id,contract_assignment_id,amount,advanced_on,created_at'),
    db.from('advance_payments').select('advance_id,amount'),
    db.from('abk_cycle_salaries').select('*').order('paid_on',{ascending:false})
  ]);
  const barns=br.data||[],assignments=ar.data||[],contractsRows=cr.data||[],links=lr.data||[],employees=er.data||[],advances=vr.data||[],payments=pr.data||[],salaries=sr.data||[];
  const err=[br,ar,cr,lr,er,vr,pr,sr].find(x=>x.error)?.error;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  window.__financeSalaryState=window.__financeSalaryState||{barn:'',assignment:'',abk:'',editId:'',historyFrom:'',historyTo:'',historyShown:false};
  const st=window.__financeSalaryState;
  const editSalary=salaries.find(x=>x.id===st.editId)||null;
  if(editSalary){const a=assignments.find(x=>x.id===editSalary.contract_assignment_id);if(a){st.barn=a.barn_id;st.assignment=a.id;st.abk=editSalary.abk_id;}}
  const cycles=st.barn?assignments.filter(a=>a.barn_id===st.barn):[];
  const abkIds=new Set(links.filter(x=>x.contract_assignment_id===st.assignment).map(x=>x.abk_id));
  const abks=employees.filter(e=>abkIds.has(e.id));
  const paid=id=>payments.filter(x=>x.advance_id===id).reduce((n,x)=>n+prodNum(x.amount),0);
  const balance=(abkId,assignmentId)=>advances.filter(a=>a.employee_id===abkId&&a.contract_assignment_id===assignmentId).reduce((n,a)=>n+Math.max(0,prodNum(a.amount)-paid(a.id)),0);
  const currentBalance=st.abk&&st.assignment?balance(st.abk,st.assignment):0;
  const salaryHistoryRows=st.historyShown?salaries.filter(s=>
    (!st.historyFrom||String(s.paid_on||'')>=st.historyFrom)&&
    (!st.historyTo||String(s.paid_on||'')<=st.historyTo)
  ):[];
  const emp=id=>{const e=employees.find(x=>x.id===id);return e?e.code+' · '+e.name:'-'};
  const ident=id=>{const a=assignments.find(x=>x.id===id);return a?assignmentIdentity(assignments,barns,contractsRows,a):'-';};

  let html='<section class="panel"><h3>'+(editSalary?'Koreksi Gaji ABK per Siklus':'Gaji ABK per Siklus')+'</h3><p class="muted">Gaji bruto menjadi beban TENAGA KERJA pada BOP siklus. Potongan kasbon mengurangi saldo kasbon; kas keluar saat gajian hanya gaji bersih.</p>'+
    '<form id="salaryForm" class="form-vertical">'+
      '<label>Kandang<select id="salaryBarn" required><option value="">Pilih Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Siklus<select id="salaryCycle" required '+(!st.barn?'disabled':'')+'><option value="">Pilih Siklus</option>'+cycles.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+'</select></label>'+
      '<label>ABK<select id="salaryAbk" required '+(!st.assignment?'disabled':'')+'><option value="">Pilih ABK</option>'+abks.map(e=>'<option value="'+esc(e.id)+'" '+(st.abk===e.id?'selected':'')+'>'+esc(e.code+' · '+e.name)+'</option>').join('')+'</select></label>'+
      '<div class="rhpp-summary-card"><span>Saldo Kasbon Siklus</span><strong>Rp '+prodFmt(currentBalance,0)+'</strong></div>'+
      '<label>Gaji Bruto Siklus<input name="gross_salary" type="text" inputmode="decimal" data-number="1" value="'+(editSalary?fmtNumber(editSalary.gross_salary):'')+'" required></label>'+
      '<label>Potongan Kasbon<input name="advance_deduction" type="text" inputmode="decimal" data-number="1" value="'+(editSalary?fmtNumber(editSalary.advance_deduction):'0')+'"></label>'+
      '<label>Tanggal Bayar<input name="paid_on" type="date" value="'+esc(editSalary?.paid_on||today)+'" required></label>'+
      '<label>Catatan<input name="notes" value="'+esc(editSalary?.notes||'')+'"></label>'+
      '<div class="report-actions"><button type="submit">'+(editSalary?'Simpan Koreksi':'Simpan Gaji Siklus')+'</button>'+(editSalary?'<button type="button" id="salaryEditCancel">Batal Koreksi</button>'+(profile?.role==='ADMIN'?'<button type="button" id="salaryAdminDelete" class="btn-danger">Hapus</button>':''):'')+'</div>'+
    '</form></section>'+
    '<section class="panel" id="salaryPrintArea"><div class="rhpp-section-head"><div><h3>Riwayat Gaji ABK</h3></div><div class="report-actions"><button type="button" id="salaryPrint">Cetak / PDF</button><button type="button" id="salaryPrintExcel">Excel</button></div></div>'+
      '<form id="salaryHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
        '<label>Tanggal Dari<input type="date" name="from" value="'+esc(st.historyFrom||'')+'"></label>'+
        '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(st.historyTo||'')+'"></label>'+
        '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="salaryHistoryReset">Reset</button></div>'+
      '</form>'+
      (st.historyShown?'<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Kandang / Siklus</th><th>ABK</th><th>Gaji Bruto</th><th>Potongan Kasbon</th><th>Gaji Dibayar</th><th>Aksi</th></tr></thead><tbody>'+
      salaryHistoryRows.map(s=>'<tr><td>'+prodDateId(s.paid_on)+'</td><td>'+esc(ident(s.contract_assignment_id))+'</td><td>'+esc(emp(s.abk_id))+'</td><td>Rp '+prodFmt(s.gross_salary,0)+'</td><td>Rp '+prodFmt(s.advance_deduction,0)+'</td><td><strong>Rp '+prodFmt(s.net_paid,0)+'</strong></td><td><div class="inline-actions"><button type="button" data-edit-salary="'+esc(s.id)+'">Koreksi</button>'+(profile?.role==='ADMIN'?'<button type="button" class="btn-danger" data-delete-salary="'+esc(s.id)+'">Hapus</button>':'')+'</div></td></tr>').join('')+
    '</tbody></table></div>'+(salaryHistoryRows.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+'</section>';
  layout(html);bindNumberInputs();if(err)msg(err.message);

  const salaryHistoryFilter=document.getElementById('salaryHistoryFilter');
  const salaryHistoryReset=document.getElementById('salaryHistoryReset');
  if(salaryHistoryFilter)salaryHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(salaryHistoryFilter);st.historyFrom=String(fd.get('from')||'');st.historyTo=String(fd.get('to')||'');if(st.historyFrom&&st.historyTo&&st.historyFrom>st.historyTo){const t=st.historyFrom;st.historyFrom=st.historyTo;st.historyTo=t}st.historyShown=true;await financeSalaryPage();};
  if(salaryHistoryReset)salaryHistoryReset.onclick=async()=>{st.historyFrom='';st.historyTo='';st.historyShown=false;await financeSalaryPage();};

  const salaryPrint=document.getElementById('salaryPrint');if(salaryPrint)salaryPrint.onclick=()=>printFinanceDocument('salaryPrintArea','Laporan Gaji ABK per Siklus');const salaryExcel=document.getElementById('salaryPrintExcel');if(salaryExcel)salaryExcel.onclick=()=>exportFinanceDocumentExcel('salaryPrintArea','Laporan Gaji ABK per Siklus');
  const b=document.getElementById('salaryBarn'),cy=document.getElementById('salaryCycle'),ab=document.getElementById('salaryAbk');
  if(b)b.onchange=async()=>{st.barn=b.value||'';st.assignment='';st.abk='';await financeSalaryPage();};
  if(cy)cy.onchange=async()=>{st.assignment=cy.value||'';st.abk='';await financeSalaryPage();};
  if(ab)ab.onchange=async()=>{st.abk=ab.value||'';await financeSalaryPage();};
  root.querySelectorAll('[data-edit-salary]').forEach(btn=>btn.onclick=async()=>{st.editId=btn.dataset.editSalary||'';await financeSalaryPage();document.getElementById('salaryForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancelEdit=document.getElementById('salaryEditCancel');if(cancelEdit)cancelEdit.onclick=async()=>{st.editId='';await financeSalaryPage();};
  const deleteSalary=async id=>{if(profile?.role!=='ADMIN')return msg('Hanya ADMIN yang boleh menghapus transaksi gaji.');if(!await appConfirm('PERINGATAN HAPUS GAJI ABK\n\nGaji ini terhubung ke BOP Tenaga Kerja, potongan kasbon, dan Arus Kas. Jika dihapus, ketiganya akan dikembalikan menyesuaikan.\n\nLanjutkan hapus?'))return;const {error}=await db.rpc('admin_delete_abk_salary_v1',{p_id:id});if(error)return msg(error.message);st.editId='';await financeSalaryPage();msg('Transaksi gaji dan data turunannya berhasil dihapus oleh ADMIN.',true);};
  root.querySelectorAll('[data-delete-salary]').forEach(btn=>btn.onclick=()=>deleteSalary(btn.dataset.deleteSalary));
  const salaryAdminDelete=document.getElementById('salaryAdminDelete');if(salaryAdminDelete&&editSalary)salaryAdminDelete.onclick=()=>deleteSalary(editSalary.id);
  const form=document.getElementById('salaryForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    if(!st.assignment||!st.abk)return msg('Pilih Kandang, Siklus, dan ABK.');
    const fd=new FormData(form),gross=normalizeInputID(fd.get('gross_salary')),ded=normalizeInputID(fd.get('advance_deduction'))||0;
    if(gross===null||gross<0)return msg('Gaji bruto tidak valid.');
    const allowedBalance=currentBalance+prodNum(editSalary?.advance_deduction);
    if(ded<0||ded>gross||ded>allowedBalance)return msg('Potongan kasbon tidak valid. Maksimal Rp '+prodFmt(allowedBalance,0)+'.');
    const result=editSalary
      ?await db.rpc('finance_correct_abk_salary_v1',{p_id:editSalary.id,p_gross_salary:gross,p_advance_deduction:ded,p_paid_on:String(fd.get('paid_on')||''),p_notes:String(fd.get('notes')||'')||null})
      :await db.rpc('finance_save_abk_salary_atomic',{p_contract_assignment_id:st.assignment,p_abk_id:st.abk,p_gross_salary:gross,p_advance_deduction:ded,p_paid_on:String(fd.get('paid_on')||''),p_reference:null,p_notes:String(fd.get('notes')||'')||null});
    const {error}=result;
    if(error)return msg(error.message);
    st.editId='';st.abk='';
    await financeSalaryPage();msg(editSalary?'Koreksi Gaji ABK berhasil disimpan.':'Gaji ABK per siklus berhasil disimpan.',true);
  };
}


async function financeMandiriReceiptsPage(){
  const [hr,ar,br,rr,cr]=await Promise.all([
    db.from('marketing_contract_harvests').select('id,contract_assignment_id,barn_id,harvested_on,buyer_id,buyer_name,total_amount,transaction_number').order('harvested_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('finance_mandiri_sales_receipts').select('id,harvest_id,received_on,amount,method,reference,notes,created_at').order('received_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null)
  ]);
  const assignments=ar.data||[],barns=br.data||[],receipts=rr.data||[],contractsRows=cr.data||[];
  const assignmentMap=new Map(assignments.map(a=>[a.id,a]));
  const harvests=(hr.data||[]).filter(h=>assignmentMap.get(h.contract_assignment_id)?.cycle_type==='MANDIRI');
  const err=[hr,ar,br,rr,cr].find(x=>x.error)?.error;
  const paidByHarvest=new Map();
  receipts.forEach(r=>paidByHarvest.set(r.harvest_id,(paidByHarvest.get(r.harvest_id)||0)+prodNum(r.amount)));
  const rows=harvests.map(h=>{
    const paid=paidByHarvest.get(h.id)||0,total=prodNum(h.total_amount),remaining=Math.max(0,total-paid);
    return {...h,paid,remaining,status:remaining<=0.005?'LUNAS':paid>0?'SEBAGIAN':'BELUM DITERIMA'};
  });
  window.__financeMandiriReceiptState=window.__financeMandiriReceiptState||{selected:'',status:'',editReceiptId:'',historyFrom:'',historyTo:'',historyShown:false};
  const st=window.__financeMandiriReceiptState;
  const editReceipt=receipts.find(x=>x.id===st.editReceiptId)||null;
  if(editReceipt)st.selected=editReceipt.harvest_id||st.selected;
  if(st.selected&&!rows.some(x=>x.id===st.selected))st.selected='';
  const shown=rows.filter(x=>!st.status||x.status===st.status);
  const selected=rows.find(x=>x.id===st.selected);
  const totalSales=rows.reduce((n,x)=>n+prodNum(x.total_amount),0);
  const totalReceived=rows.reduce((n,x)=>n+x.paid,0);
  const totalReceivable=rows.reduce((n,x)=>n+x.remaining,0);
  let html='<section class="panel"><h3>Penerimaan Penjualan Mandiri</h3>'+
    '<p class="muted">Panen Mandiri dari Marketing otomatis muncul di sini sebagai tagihan pelanggan. Keuangan hanya mengonfirmasi uang yang benar-benar diterima. Setelah disimpan, penerimaan otomatis masuk Arus Kas sebagai PENJUALAN MANDIRI.</p>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Penjualan</span><strong>Rp '+prodFmt(totalSales,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sudah Diterima</span><strong>Rp '+prodFmt(totalReceived,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sisa Piutang</span><strong>Rp '+prodFmt(totalReceivable,0)+'</strong></div>'+
    '</div>'+
    '<label>Status<select id="mandiriReceiptStatus"><option value="">Semua</option><option value="BELUM DITERIMA" '+(st.status==='BELUM DITERIMA'?'selected':'')+'>Belum Diterima</option><option value="SEBAGIAN" '+(st.status==='SEBAGIAN'?'selected':'')+'>Sebagian</option><option value="LUNAS" '+(st.status==='LUNAS'?'selected':'')+'>Lunas</option></select></label>'+
  '</section>';

  if(selected&&(selected.remaining>0.005||editReceipt)){
    const a=assignmentMap.get(selected.contract_assignment_id);
    html+='<section class="panel"><h3>'+(editReceipt?'Edit Penerimaan':'Konfirmasi Penerimaan')+'</h3>'+
      '<p class="muted">'+esc(selected.buyer_name||'Pelanggan')+' · '+esc(a?assignmentIdentity(assignments,barns,contractsRows,a):'')+' · Sisa piutang Rp '+prodFmt(selected.remaining,0)+'</p>'+
      '<form id="mandiriReceiptForm" class="form-vertical">'+
        '<label>Tanggal Diterima<input type="date" name="received_on" value="'+esc(editReceipt?.received_on||prodToday())+'" required></label>'+
        '<label>Nominal Diterima<input type="text" name="amount" inputmode="decimal" data-number="1" value="'+fmtNumber(editReceipt?editReceipt.amount:selected.remaining)+'" required></label>'+
        '<label>Metode<select name="method" required><option value="TRANSFER" '+((editReceipt?.method||'TRANSFER')==='TRANSFER'?'selected':'')+'>Transfer</option><option value="TUNAI" '+(editReceipt?.method==='TUNAI'?'selected':'')+'>Tunai</option><option value="LAINNYA" '+(editReceipt?.method==='LAINNYA'?'selected':'')+'>Lainnya</option></select></label>'+
        '<label>Referensi / No Transfer<input name="reference" value="'+esc(editReceipt?.reference||'')+'"></label>'+
        '<label>Catatan<textarea name="notes">'+esc(editReceipt?.notes||'')+'</textarea></label>'+
        '<div class="report-actions"><button type="submit">'+(editReceipt?'Simpan Perubahan':'Simpan Penerimaan')+'</button><button type="button" id="cancelMandiriReceipt">Batal</button>'+(editReceipt?adminDeleteTxnButton('finance_mandiri_sales_receipts',editReceipt.id):'')+'</div>'+
      '</form></section>';
  }

  html+='<section class="panel"><h3>Daftar Penjualan Mandiri</h3><div class="tablewrap"><table><thead><tr>'+
    '<th>Tanggal Panen</th><th>Kandang / Siklus</th><th>Pelanggan</th><th>Nilai Penjualan</th><th>Diterima</th><th>Sisa</th><th>Status</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    shown.map(x=>{const a=assignmentMap.get(x.contract_assignment_id);return '<tr>'+
      '<td>'+prodDateId(x.harvested_on)+'</td>'+
      '<td>'+esc(a?assignmentIdentity(assignments,barns,contractsRows,a):'-')+'</td>'+
      '<td>'+esc(x.buyer_name||'-')+'</td>'+
      '<td>Rp '+prodFmt(x.total_amount,0)+'</td>'+
      '<td>Rp '+prodFmt(x.paid,0)+'</td>'+
      '<td><strong>Rp '+prodFmt(x.remaining,0)+'</strong></td>'+
      '<td><strong>'+esc(x.status)+'</strong></td>'+
      '<td>'+(x.remaining>0.005?'<button type="button" data-receive-mandiri="'+esc(x.id)+'">Konfirmasi Penerimaan</button>':'Lunas')+'</td>'+
    '</tr>';}).join('')+
    '</tbody></table></div>'+(shown.length?'':'<p class="muted">Tidak ada data sesuai filter.</p>')+'</section>';

  const selectedReceiptBase=selected?receipts.filter(r=>r.harvest_id===selected.id):receipts;
  const selectedReceiptRows=st.historyShown?selectedReceiptBase.filter(r=>
    (!st.historyFrom||String(r.received_on||'')>=st.historyFrom)&&
    (!st.historyTo||String(r.received_on||'')<=st.historyTo)
  ):[];
  html+='<section class="panel"><h3>Riwayat Penerimaan'+(selected?' Penjualan Dipilih':'')+'</h3>'+
    '<form id="mandiriReceiptHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(st.historyFrom||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(st.historyTo||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="mandiriReceiptHistoryReset">Reset</button></div>'+
    '</form>'+
    (st.historyShown?'<div class="report-actions"><button type="button" id="mandiriReceiptHistoryPrint">Cetak</button> <button type="button" id="mandiriReceiptHistoryPdf">PDF</button> <button type="button" id="mandiriReceiptHistoryExcel">Excel</button></div><div class="tablewrap"><table id="mandiriReceiptHistoryTable"><thead><tr><th>Tanggal</th><th>Metode</th><th>Nominal</th><th>Referensi</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>'+selectedReceiptRows.map(r=>'<tr><td>'+prodDateId(r.received_on)+'</td><td>'+esc(r.method)+'</td><td>Rp '+prodFmt(r.amount,0)+'</td><td>'+esc(r.reference||'-')+'</td><td>'+esc(financeOriginalNoteDisplay(r.notes))+'</td><td><div class="inline-actions"><button type="button" data-edit-mandiri-receipt="'+esc(r.id)+'">Edit</button>'+adminDeleteTxnButton('finance_mandiri_sales_receipts',r.id)+'</div></td></tr>').join('')+
    '</tbody></table></div>'+(selectedReceiptRows.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+'</section>';

  layout(html);bindNumberInputs();if(err)msg(err.message);
  const mandiriReceiptHistoryFilter=document.getElementById('mandiriReceiptHistoryFilter');
  const mandiriReceiptHistoryReset=document.getElementById('mandiriReceiptHistoryReset');
  if(mandiriReceiptHistoryFilter)mandiriReceiptHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(mandiriReceiptHistoryFilter);st.historyFrom=String(fd.get('from')||'');st.historyTo=String(fd.get('to')||'');if(st.historyFrom&&st.historyTo&&st.historyFrom>st.historyTo){const t=st.historyFrom;st.historyFrom=st.historyTo;st.historyTo=t}st.historyShown=true;await financeMandiriReceiptsPage();};
  if(mandiriReceiptHistoryReset)mandiriReceiptHistoryReset.onclick=async()=>{st.historyFrom='';st.historyTo='';st.historyShown=false;await financeMandiriReceiptsPage();};
  if(st.historyShown)bindTableExportActions({tableId:'mandiriReceiptHistoryTable',printId:'mandiriReceiptHistoryPrint',pdfId:'mandiriReceiptHistoryPdf',excelId:'mandiriReceiptHistoryExcel',title:'Riwayat Penerimaan Penjualan Mandiri',filename:'Riwayat_Penerimaan_Mandiri',filterText:'Periode '+(st.historyFrom||'-')+' s/d '+(st.historyTo||'-'),dropLast:true});

  const status=document.getElementById('mandiriReceiptStatus');
  if(status)status.onchange=async()=>{st.status=status.value||'';st.selected='';await financeMandiriReceiptsPage();};
  root.querySelectorAll('[data-receive-mandiri]').forEach(btn=>btn.onclick=async()=>{st.selected=btn.dataset.receiveMandiri;await financeMandiriReceiptsPage();const receiptForm=document.getElementById('mandiriReceiptForm');if(receiptForm)receiptForm.scrollIntoView({behavior:'smooth',block:'start'});});
  root.querySelectorAll('[data-edit-mandiri-receipt]').forEach(btn=>btn.onclick=async()=>{st.editReceiptId=btn.dataset.editMandiriReceipt||'';const r=receipts.find(x=>x.id===st.editReceiptId);if(r)st.selected=r.harvest_id||'';await financeMandiriReceiptsPage();document.getElementById('mandiriReceiptForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancel=document.getElementById('cancelMandiriReceipt');if(cancel)cancel.onclick=async()=>{st.selected='';st.editReceiptId='';await financeMandiriReceiptsPage();};
  bindAdminTransactionDeletes(()=>{st.editReceiptId='';return financeMandiriReceiptsPage();});
  const form=document.getElementById('mandiriReceiptForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const current=rows.find(x=>x.id===st.selected);if(!current)return msg('Penjualan Mandiri tidak ditemukan.');
    const fd=new FormData(form),amount=normalizeInputID(fd.get('amount'));
    if(!(amount>0))return msg('Nominal penerimaan harus lebih dari nol.');
    const maxAmount=current.remaining+prodNum(editReceipt?.amount);
    if(amount-maxAmount>0.005)return msg('Nominal melebihi batas penerimaan Rp '+prodFmt(maxAmount,0)+'.');
    if(!await appConfirm('Konfirmasi penerimaan Rp '+prodFmt(amount,0)+' dari '+(current.buyer_name||'pelanggan')+'?'))return;
    let result;
    if(editReceipt){
      result=await db.rpc('finance_correct_mandiri_receipt_v1',{
        p_id:editReceipt.id,p_received_on:fd.get('received_on'),p_amount:amount,p_method:fd.get('method'),
        p_reference:String(fd.get('reference')||'').trim()||null,p_notes:String(fd.get('notes')||'').trim()||null
      });
    }else{
      result=await db.rpc('finance_receive_mandiri_sale_atomic',{
        p_harvest_id:current.id,p_received_on:fd.get('received_on'),p_amount:amount,p_method:fd.get('method'),
        p_reference:String(fd.get('reference')||'').trim()||null,p_notes:String(fd.get('notes')||'').trim()||null
      });
    }
    const {error}=result;
    if(error)return msg(error.message);
    st.selected='';st.editReceiptId='';
    await financeMandiriReceiptsPage();
    msg(editReceipt?'Penerimaan penjualan Mandiri berhasil diperbarui.':'Penerimaan penjualan Mandiri tersimpan dan otomatis masuk Arus Kas.',true);
  };
}



async function financeMandiriReceivablePage(){
  const [hr,ar,br,rr,cr]=await Promise.all([
    db.from('marketing_contract_harvests').select('id,contract_assignment_id,barn_id,harvested_on,buyer_name,total_amount,transaction_number').order('harvested_on',{ascending:false}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('finance_mandiri_sales_receipts').select('harvest_id,amount'),
    db.from('contracts').select('id,number').is('cycle_id',null)
  ]);
  const assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[],receipts=rr.data||[];
  const map=new Map(assignments.map(a=>[a.id,a]));
  const paid=new Map();receipts.forEach(r=>paid.set(r.harvest_id,(paid.get(r.harvest_id)||0)+prodNum(r.amount)));
  const rows=(hr.data||[]).filter(h=>map.get(h.contract_assignment_id)?.cycle_type==='MANDIRI').map(h=>{
    const received=paid.get(h.id)||0,total=prodNum(h.total_amount),balance=Math.max(0,total-received);
    return {...h,received,balance,status:balance<=0.005?'LUNAS':received>0?'SEBAGIAN':'BELUM BAYAR'};
  });
  const sales=rows.reduce((n,x)=>n+prodNum(x.total_amount),0),received=rows.reduce((n,x)=>n+x.received,0),balance=rows.reduce((n,x)=>n+x.balance,0);
  let html='<section class="panel"><h3>Piutang Penjualan Mandiri</h3><p class="muted">READ ONLY. Panen Mandiri dari Marketing otomatis menjadi piutang pelanggan. Penerimaan uang dilakukan dari submenu Penerimaan Penjualan.</p>'+
    '<div class="rhpp-summary-cards"><div class="rhpp-summary-card"><span>Total Penjualan</span><strong>Rp '+prodFmt(sales,0)+'</strong></div><div class="rhpp-summary-card"><span>Sudah Diterima</span><strong>Rp '+prodFmt(received,0)+'</strong></div><div class="rhpp-summary-card"><span>Sisa Piutang</span><strong>Rp '+prodFmt(balance,0)+'</strong></div></div></section>'+
    '<section class="panel"><div class="report-actions"><button type="button" id="mandiriReceivablePrint">Cetak</button> <button type="button" id="mandiriReceivablePdf">PDF</button> <button type="button" id="mandiriReceivableExcel">Excel</button></div><div class="tablewrap"><table id="mandiriReceivableTable"><thead><tr><th>Tanggal</th><th>Kandang / Siklus</th><th>Pelanggan</th><th>No. Transaksi</th><th>Penjualan</th><th>Diterima</th><th>Sisa Piutang</th><th>Status</th></tr></thead><tbody>'+
    rows.map(x=>{const a=map.get(x.contract_assignment_id);return '<tr><td>'+prodDateId(x.harvested_on)+'</td><td>'+esc(a?assignmentIdentity(assignments,barns,contractsRows,a):'-')+'</td><td>'+esc(x.buyer_name||'-')+'</td><td>'+esc(x.transaction_number||'-')+'</td><td>Rp '+prodFmt(x.total_amount,0)+'</td><td>Rp '+prodFmt(x.received,0)+'</td><td><strong>Rp '+prodFmt(x.balance,0)+'</strong></td><td><strong>'+esc(x.status)+'</strong></td></tr>';}).join('')+
    '</tbody></table></div>'+(rows.length?'':'<p class="muted">Belum ada penjualan Mandiri.</p>')+'</section>';
  layout(html);const err=[hr,ar,br,rr,cr].find(x=>x.error)?.error;if(err)msg(err.message);
  bindTableExportActions({tableId:'mandiriReceivableTable',printId:'mandiriReceivablePrint',pdfId:'mandiriReceivablePdf',excelId:'mandiriReceivableExcel',title:'Piutang Penjualan Mandiri',filename:'Piutang_Penjualan_Mandiri'});
}

async function financeMandiriSupplierDebtPage(){
  const [pr,sr,ir,pyr]=await Promise.all([
    db.from('logistics_mandiri_purchases').select('id,supplier_id,item_id,purchase_date,quantity,purchase_unit_price,reference_number,notes').order('purchase_date',{ascending:false}),
    db.from('suppliers').select('id,name'),
    db.from('items').select('id,name,unit,category'),
    db.from('finance_mandiri_supplier_payments').select('purchase_id,amount')
  ]);
  const purchases=pr.data||[],suppliers=sr.data||[],items=ir.data||[],payments=pyr.data||[];
  const paidByPurchase=new Map();
  payments.forEach(p=>paidByPurchase.set(p.purchase_id,(paidByPurchase.get(p.purchase_id)||0)+prodNum(p.amount)));
  const rows=purchases.map(p=>{
    const total=prodNum(p.quantity)*prodNum(p.purchase_unit_price);
    const paid=paidByPurchase.get(p.id)||0;
    const balance=Math.max(0,total-paid);
    return {...p,total,paid,balance,status:balance<=0.005?'LUNAS':paid>0?'SEBAGIAN':'BELUM BAYAR'};
  });
  window.__mandiriDebtFilter=window.__mandiriDebtFilter||{supplier:'',status:'',from:'',to:'',shown:false};
  const debtFilter=window.__mandiriDebtFilter;
  const visibleRows=debtFilter.shown?rows.filter(x=>(!debtFilter.supplier||x.supplier_id===debtFilter.supplier)&&(!debtFilter.status||x.status===debtFilter.status)&&(!debtFilter.from||String(x.purchase_date||'')>=debtFilter.from)&&(!debtFilter.to||String(x.purchase_date||'')<=debtFilter.to)):[];
  const totalDebt=rows.reduce((n,x)=>n+x.total,0);
  const totalPaid=rows.reduce((n,x)=>n+x.paid,0);
  const totalBalance=rows.reduce((n,x)=>n+x.balance,0);

  let html='<section class="panel"><h3>Hutang Supplier Mandiri</h3>'+
    '<p class="muted">Sumber hutang otomatis dari Pembelian Mandiri Logistik. Pembayaran dicatat melalui submenu Pembayaran Supplier.</p>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Pembelian</span><strong>Rp '+prodFmt(totalDebt,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sudah Dibayar</span><strong>Rp '+prodFmt(totalPaid,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sisa Hutang</span><strong>Rp '+prodFmt(totalBalance,0)+'</strong></div>'+
    '</div></section>'+
    '<section class="panel"><h3>Riwayat Hutang Supplier Mandiri</h3><form id="mandiriDebtFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Supplier<select name="supplier"><option value="">Semua Supplier</option>'+suppliers.map(s=>'<option value="'+esc(s.id)+'" '+(debtFilter.supplier===s.id?'selected':'')+'>'+esc(s.name||'-')+'</option>').join('')+'</select></label>'+
      '<label>Status<select name="status"><option value="">Semua Status</option>'+['BELUM BAYAR','SEBAGIAN','LUNAS'].map(v=>'<option value="'+v+'" '+(debtFilter.status===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(debtFilter.from||'')+'"></label><label>Tanggal Sampai<input type="date" name="to" value="'+esc(debtFilter.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="mandiriDebtReset">Reset</button></div></form>'+
      (debtFilter.shown?'<div class="report-actions"><button type="button" id="mandiriDebtPrint">Cetak</button> <button type="button" id="mandiriDebtPdf">PDF</button> <button type="button" id="mandiriDebtExcel">Excel</button></div><div class="tablewrap"><table id="mandiriDebtTable"><thead><tr><th>Tanggal</th><th>Supplier</th><th>Item</th><th>Jumlah</th><th>Harga Beli</th><th>Nilai</th><th>Dibayar</th><th>Sisa Hutang</th><th>Status</th><th>Referensi</th></tr></thead><tbody>'+
    visibleRows.map(p=>{const s=suppliers.find(x=>x.id===p.supplier_id),i=items.find(x=>x.id===p.item_id);return '<tr>'+
      '<td>'+prodDateId(p.purchase_date)+'</td>'+
      '<td>'+esc(s?.name||'-')+'</td>'+
      '<td>'+esc(i?.name||'-')+'</td>'+
      '<td>'+prodFmt(p.quantity,2)+' '+esc(i?.unit||'')+'</td>'+
      '<td>Rp '+prodFmt(p.purchase_unit_price,0)+'</td>'+
      '<td>Rp '+prodFmt(p.total,0)+'</td>'+
      '<td>Rp '+prodFmt(p.paid,0)+'</td>'+
      '<td><strong>Rp '+prodFmt(p.balance,0)+'</strong></td>'+
      '<td><strong>'+esc(p.status)+'</strong></td>'+
      '<td>'+esc(p.reference_number||'-')+'</td>'+
    '</tr>';}).join('')+
    '</tbody></table></div>'+(visibleRows.length?'':'<p class="muted">Data hutang tidak ditemukan.</p>'):'<p class="muted">Pilih filter lalu tekan Tampilkan.</p>')+'</section>';
  layout(html);
  const err=[pr,sr,ir,pyr].find(x=>x.error)?.error;if(err)msg(err.message);
  const df=document.getElementById('mandiriDebtFilter');if(df)df.onsubmit=async e=>{e.preventDefault();const fd=new FormData(df);debtFilter.supplier=String(fd.get('supplier')||'');debtFilter.status=String(fd.get('status')||'');debtFilter.from=String(fd.get('from')||'');debtFilter.to=String(fd.get('to')||'');if(debtFilter.from&&debtFilter.to&&debtFilter.from>debtFilter.to){const t=debtFilter.from;debtFilter.from=debtFilter.to;debtFilter.to=t}debtFilter.shown=true;await financeMandiriSupplierDebtPage();};
  const drs=document.getElementById('mandiriDebtReset');if(drs)drs.onclick=async()=>{window.__mandiriDebtFilter={supplier:'',status:'',from:'',to:'',shown:false};await financeMandiriSupplierDebtPage();};
  if(debtFilter.shown)bindTableExportActions({tableId:'mandiriDebtTable',printId:'mandiriDebtPrint',pdfId:'mandiriDebtPdf',excelId:'mandiriDebtExcel',title:'Hutang Supplier Mandiri',filename:'Hutang_Supplier_Mandiri',filterText:'Periode '+(debtFilter.from||'-')+' s/d '+(debtFilter.to||'-')});
}

async function financeMandiriSupplierPaymentPage(){
  const [pr,sr,ir,pyr]=await Promise.all([
    db.from('logistics_mandiri_purchases').select('id,supplier_id,item_id,purchase_date,quantity,purchase_unit_price,reference_number,notes').order('purchase_date',{ascending:false}),
    db.from('suppliers').select('id,name'),
    db.from('items').select('id,name,unit,category'),
    db.from('finance_mandiri_supplier_payments').select('id,purchase_id,paid_on,amount,method,reference,notes,created_at').order('paid_on',{ascending:false}).order('created_at',{ascending:false})
  ]);
  const purchases=pr.data||[],suppliers=sr.data||[],items=ir.data||[],payments=pyr.data||[];
  const paidByPurchase=new Map();
  payments.forEach(p=>paidByPurchase.set(p.purchase_id,(paidByPurchase.get(p.purchase_id)||0)+prodNum(p.amount)));
  const rows=purchases.map(p=>{
    const total=prodNum(p.quantity)*prodNum(p.purchase_unit_price);
    const paid=paidByPurchase.get(p.id)||0;
    const balance=Math.max(0,total-paid);
    return {...p,total,paid,balance,status:balance<=0.005?'LUNAS':paid>0?'SEBAGIAN':'BELUM BAYAR'};
  });

  window.__financeMandiriSupplierPaymentState=window.__financeMandiriSupplierPaymentState||{selected:'',status:'',editPaymentId:'',historyFrom:'',historyTo:'',historyShown:false};
  const st=window.__financeMandiriSupplierPaymentState;
  const editPayment=payments.find(x=>x.id===st.editPaymentId)||null;
  if(editPayment)st.selected=editPayment.purchase_id||st.selected;
  if(st.selected&&!rows.some(x=>x.id===st.selected))st.selected='';
  const shown=rows.filter(x=>!st.status||x.status===st.status);
  const selected=rows.find(x=>x.id===st.selected);
  const totalDebt=rows.reduce((n,x)=>n+x.total,0);
  const totalPaid=rows.reduce((n,x)=>n+x.paid,0);
  const totalBalance=rows.reduce((n,x)=>n+x.balance,0);

  let html='<section class="panel"><h3>Pembayaran Supplier Mandiri</h3>'+
    '<p class="muted">Pembayaran dapat parsial. Setiap pembayaran otomatis mengurangi hutang dan masuk Arus Kas sebagai BAYAR SUPPLIER MANDIRI.</p>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Hutang</span><strong>Rp '+prodFmt(totalDebt,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sudah Dibayar</span><strong>Rp '+prodFmt(totalPaid,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Sisa Hutang</span><strong>Rp '+prodFmt(totalBalance,0)+'</strong></div>'+
    '</div>'+
    '<label>Status<select id="mandiriSupplierPaymentStatus"><option value="">Semua</option><option value="BELUM BAYAR" '+(st.status==='BELUM BAYAR'?'selected':'')+'>Belum Bayar</option><option value="SEBAGIAN" '+(st.status==='SEBAGIAN'?'selected':'')+'>Sebagian</option><option value="LUNAS" '+(st.status==='LUNAS'?'selected':'')+'>Lunas</option></select></label>'+
    '</section>';

  if(selected&&(selected.balance>0.005||editPayment)){
    const s=suppliers.find(x=>x.id===selected.supplier_id),i=items.find(x=>x.id===selected.item_id);
    html+='<section class="panel"><h3>'+(editPayment?'Edit Pembayaran Supplier':'Konfirmasi Pembayaran Supplier')+'</h3>'+
      '<p class="muted">'+esc(s?.name||'Supplier')+' · '+esc(i?.name||'-')+' · Sisa hutang Rp '+prodFmt(selected.balance,0)+'</p>'+
      '<form id="mandiriSupplierPaymentForm" class="form-vertical">'+
        '<label>Tanggal Bayar<input type="date" name="paid_on" value="'+esc(editPayment?.paid_on||prodToday())+'" required></label>'+
        '<label>Nominal Bayar<input type="text" name="amount" inputmode="decimal" data-number="1" value="'+fmtNumber(editPayment?editPayment.amount:selected.balance)+'" required></label>'+
        '<label>Metode<select name="method" required><option value="TRANSFER" '+((editPayment?.method||'TRANSFER')==='TRANSFER'?'selected':'')+'>Transfer</option><option value="TUNAI" '+(editPayment?.method==='TUNAI'?'selected':'')+'>Tunai</option><option value="LAINNYA" '+(editPayment?.method==='LAINNYA'?'selected':'')+'>Lainnya</option></select></label>'+
        '<label>Referensi / No Transfer<input name="reference" value="'+esc(editPayment?.reference||'')+'"></label>'+
        '<label>Catatan<textarea name="notes">'+esc(editPayment?.notes||'')+'</textarea></label>'+
        '<div class="report-actions"><button type="submit">'+(editPayment?'Simpan Perubahan':'Simpan Pembayaran')+'</button><button type="button" id="cancelMandiriSupplierPayment">Batal</button>'+(editPayment?adminDeleteTxnButton('finance_mandiri_supplier_payments',editPayment.id):'')+'</div>'+
      '</form></section>';
  }

  html+='<section class="panel"><h3>Daftar Hutang Mandiri</h3><div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Item</th><th>Nilai</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    shown.map(x=>{const s=suppliers.find(v=>v.id===x.supplier_id),i=items.find(v=>v.id===x.item_id);return '<tr>'+
      '<td>'+prodDateId(x.purchase_date)+'</td>'+
      '<td>'+esc(s?.name||'-')+'</td>'+
      '<td>'+esc(i?.name||'-')+'</td>'+
      '<td>Rp '+prodFmt(x.total,0)+'</td>'+
      '<td>Rp '+prodFmt(x.paid,0)+'</td>'+
      '<td><strong>Rp '+prodFmt(x.balance,0)+'</strong></td>'+
      '<td><strong>'+esc(x.status)+'</strong></td>'+
      '<td>'+(x.balance>0.005?'<button type="button" data-pay-mandiri-supplier="'+esc(x.id)+'">Bayar</button>':'Lunas')+'</td>'+
    '</tr>';}).join('')+
    '</tbody></table></div>'+(shown.length?'':'<p class="muted">Tidak ada data sesuai filter.</p>')+'</section>';

  const historyBase=selected?payments.filter(p=>p.purchase_id===selected.id):payments;
  const history=st.historyShown?historyBase.filter(p=>
    (!st.historyFrom||String(p.paid_on||'')>=st.historyFrom)&&
    (!st.historyTo||String(p.paid_on||'')<=st.historyTo)
  ):[];
  html+='<section class="panel"><h3>Riwayat Pembayaran'+(selected?' Hutang Dipilih':'')+'</h3>'+
    '<form id="mandiriSupplierHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(st.historyFrom||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(st.historyTo||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="mandiriSupplierHistoryReset">Reset</button></div>'+
    '</form>'+
    (st.historyShown?'<div class="report-actions"><button type="button" id="mandiriSupplierHistoryPrint">Cetak</button> <button type="button" id="mandiriSupplierHistoryPdf">PDF</button> <button type="button" id="mandiriSupplierHistoryExcel">Excel</button></div><div class="tablewrap"><table id="mandiriSupplierHistoryTable"><thead><tr><th>Tanggal</th><th>Supplier</th><th>Nominal</th><th>Metode</th><th>Referensi</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>'+
      history.map(p=>{const pur=purchases.find(x=>x.id===p.purchase_id),s=suppliers.find(x=>x.id===pur?.supplier_id);return '<tr><td>'+prodDateId(p.paid_on)+'</td><td>'+esc(s?.name||'-')+'</td><td>Rp '+prodFmt(p.amount,0)+'</td><td>'+esc(p.method)+'</td><td>'+esc(p.reference||'-')+'</td><td>'+esc(financeOriginalNoteDisplay(p.notes))+'</td><td><div class="inline-actions"><button type="button" data-edit-mandiri-supplier-payment="'+esc(p.id)+'">Edit</button>'+adminDeleteTxnButton('finance_mandiri_supplier_payments',p.id)+'</div></td></tr>';}).join('')+
      '</tbody></table></div>'+(history.length?'':'<p class="muted">Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();
  const err=[pr,sr,ir,pyr].find(x=>x.error)?.error;if(err)msg(err.message);

  const mandiriSupplierHistoryFilter=document.getElementById('mandiriSupplierHistoryFilter');
  const mandiriSupplierHistoryReset=document.getElementById('mandiriSupplierHistoryReset');
  if(mandiriSupplierHistoryFilter)mandiriSupplierHistoryFilter.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(mandiriSupplierHistoryFilter);st.historyFrom=String(fd.get('from')||'');st.historyTo=String(fd.get('to')||'');if(st.historyFrom&&st.historyTo&&st.historyFrom>st.historyTo){const t=st.historyFrom;st.historyFrom=st.historyTo;st.historyTo=t}st.historyShown=true;await financeMandiriSupplierPaymentPage();};
  if(mandiriSupplierHistoryReset)mandiriSupplierHistoryReset.onclick=async()=>{st.historyFrom='';st.historyTo='';st.historyShown=false;await financeMandiriSupplierPaymentPage();};
  if(st.historyShown)bindTableExportActions({tableId:'mandiriSupplierHistoryTable',printId:'mandiriSupplierHistoryPrint',pdfId:'mandiriSupplierHistoryPdf',excelId:'mandiriSupplierHistoryExcel',title:'Riwayat Pembayaran Supplier Mandiri',filename:'Riwayat_Pembayaran_Supplier_Mandiri',filterText:'Periode '+(st.historyFrom||'-')+' s/d '+(st.historyTo||'-'),dropLast:true});

  const status=document.getElementById('mandiriSupplierPaymentStatus');
  if(status)status.onchange=async()=>{st.status=status.value||'';st.selected='';await financeMandiriSupplierPaymentPage();};
  root.querySelectorAll('[data-pay-mandiri-supplier]').forEach(btn=>btn.onclick=async()=>{st.selected=btn.dataset.payMandiriSupplier;await financeMandiriSupplierPaymentPage();const paymentForm=document.getElementById('mandiriSupplierPaymentForm');if(paymentForm)paymentForm.scrollIntoView({behavior:'smooth',block:'start'});});
  root.querySelectorAll('[data-edit-mandiri-supplier-payment]').forEach(btn=>btn.onclick=async()=>{st.editPaymentId=btn.dataset.editMandiriSupplierPayment||'';const p=payments.find(x=>x.id===st.editPaymentId);if(p)st.selected=p.purchase_id||'';await financeMandiriSupplierPaymentPage();document.getElementById('mandiriSupplierPaymentForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const cancel=document.getElementById('cancelMandiriSupplierPayment');
  if(cancel)cancel.onclick=async()=>{st.selected='';st.editPaymentId='';await financeMandiriSupplierPaymentPage();};
  bindAdminTransactionDeletes(()=>{st.editPaymentId='';return financeMandiriSupplierPaymentPage();});
  const form=document.getElementById('mandiriSupplierPaymentForm');
  if(form)form.onsubmit=async ev=>{
    ev.preventDefault();
    const current=rows.find(x=>x.id===st.selected);if(!current)return msg('Hutang supplier Mandiri tidak ditemukan.');
    const fd=new FormData(form),amount=normalizeInputID(fd.get('amount'));
    if(!(amount>0))return msg('Nominal pembayaran harus lebih dari nol.');
    const maxAmount=current.balance+prodNum(editPayment?.amount);
    if(amount-maxAmount>0.005)return msg('Nominal melebihi batas pembayaran Rp '+prodFmt(maxAmount,0)+'.');
    if(!await appConfirm('Konfirmasi pembayaran supplier Rp '+prodFmt(amount,0)+'?'))return;
    let result;
    if(editPayment){
      result=await db.rpc('finance_correct_mandiri_supplier_payment_v1',{
        p_id:editPayment.id,p_paid_on:fd.get('paid_on'),p_amount:amount,p_method:fd.get('method'),
        p_reference:String(fd.get('reference')||'').trim()||null,p_notes:String(fd.get('notes')||'').trim()||null
      });
    }else{
      result=await db.rpc('finance_pay_mandiri_supplier_atomic',{
        p_purchase_id:current.id,p_paid_on:fd.get('paid_on'),p_amount:amount,p_method:fd.get('method'),
        p_reference:String(fd.get('reference')||'').trim()||null,p_notes:String(fd.get('notes')||'').trim()||null
      });
    }
    const {error}=result;
    if(error)return msg(error.message);
    st.selected='';st.editPaymentId='';
    await financeMandiriSupplierPaymentPage();
    msg(editPayment?'Pembayaran supplier Mandiri berhasil diperbarui.':'Pembayaran supplier Mandiri tersimpan, hutang berkurang, dan Arus Kas diperbarui.',true);
  };
}
async function financeMandiriReportPage(){
  const [xr,ar,br,cr]=await Promise.all([
    db.rpc('finance_cycle_profit_loss_v2'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('contracts').select('id,number').is('cycle_id',null)
  ]);
  const assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[];
  const amap=new Map(assignments.map(a=>[a.id,a]));
  const rows=(xr.data||[]).filter(x=>amap.get(x.contract_assignment_id)?.cycle_type==='MANDIRI');
  const sales=rows.reduce((n,x)=>n+prodNum(x.rhpp_real),0),bop=rows.reduce((n,x)=>n+prodNum(x.bop_produksi),0),sap=rows.reduce((n,x)=>n+prodNum(x.sapronak_luar),0),meat=rows.reduce((n,x)=>n+prodNum(x.tambah_daging),0);
  const net=sales-bop-sap-meat;
  let html='<section class="panel"><h3>Laporan Keuangan Mandiri</h3><p class="muted">Khusus siklus Mandiri. Tidak mencampur RHPP Real Mitra. Laba Operasional belum mengurangi Perawatan Jangka Panjang.</p>'+
    '<div class="rhpp-summary-cards"><div class="rhpp-summary-card"><span>Penjualan Mandiri</span><strong>Rp '+prodFmt(sales,0)+'</strong></div><div class="rhpp-summary-card"><span>BOP Produksi</span><strong>Rp '+prodFmt(bop,0)+'</strong></div><div class="rhpp-summary-card"><span>Biaya Sapronak</span><strong>Rp '+prodFmt(sap,0)+'</strong></div><div class="rhpp-summary-card"><span>Laba Operasional (Sebelum Perawatan)</span><strong>Rp '+prodFmt(net,0)+'</strong></div></div></section>'+
    '<section class="panel"><div class="report-actions"><button type="button" id="mandiriReportPrint">Cetak</button> <button type="button" id="mandiriReportPdf">PDF</button> <button type="button" id="mandiriReportExcel">Excel</button></div><div class="tablewrap"><table id="mandiriReportTable"><thead><tr><th>Kandang / Siklus</th><th>Status</th><th>Penjualan</th><th>BOP</th><th>Sapronak</th><th>Tambah Daging</th><th>Laba Operasional</th></tr></thead><tbody>'+
    rows.map(x=>{const a=amap.get(x.contract_assignment_id);const n=prodNum(x.rhpp_real)-prodNum(x.bop_produksi)-prodNum(x.sapronak_luar)-prodNum(x.tambah_daging);return '<tr><td>'+esc(a?assignmentIdentity(assignments,barns,contractsRows,a):'-')+'</td><td>'+esc(x.active?'PROSES':'CLOSED')+'</td><td>Rp '+prodFmt(x.rhpp_real,0)+'</td><td>Rp '+prodFmt(x.bop_produksi,0)+'</td><td>Rp '+prodFmt(x.sapronak_luar,0)+'</td><td>Rp '+prodFmt(x.tambah_daging,0)+'</td><td><strong>Rp '+prodFmt(n,0)+'</strong></td></tr>';}).join('')+
    '</tbody></table></div>'+(rows.length?'':'<p class="muted">Belum ada siklus Mandiri.</p>')+'</section>';
  layout(html);const err=[xr,ar,br,cr].find(x=>x.error)?.error;if(err)msg(err.message);
  bindTableExportActions({tableId:'mandiriReportTable',printId:'mandiriReportPrint',pdfId:'mandiriReportPdf',excelId:'mandiriReportExcel',title:'Laporan Keuangan Mandiri',filename:'Laporan_Keuangan_Mandiri'});
}


async function financeCashflowPage(){
  const [xr,bar,assr,cr,cpr,aar]=await Promise.all([
    db.rpc('finance_cashflow_entries_v6'),
    db.from('barns').select('id,code,name'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle(),
    db.from('barn_assets').select('reference').not('reference','is',null)
  ]);
  const assetCashRefs=new Set((aar.data||[]).map(x=>String(x.reference||'').trim()).filter(Boolean));
  const rows=(xr.data||[]).map(x=>({
    date:x.txn_date,type:x.txn_type,
    source:(x.source==='PERAWATAN KANDANG'&&assetCashRefs.has(String(x.reference||'').trim()))?'BELI ASET':x.source,
    amount:prodNum(x.amount),
    barn_id:x.barn_id||'',assignment_id:x.contract_assignment_id||'',
    detail:x.detail||'',reference:x.reference||''
  })).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const barns=bar.data||[],assignments=assr.data||[],contractsRows=cr.data||[],company=cpr.data||{};
  const err=[xr,bar,assr,cr,cpr,aar].find(x=>x.error)?.error;
  const sourceOptions=[
    'RHPP REAL','BOP PRODUKSI','BOP UMUM','KASBON','CICILAN KASBON','GAJI ABK',
    'BAYAR HUTANG SUPPLIER','PENJUALAN MANDIRI','BAYAR SUPPLIER MANDIRI',
    'PENDAPATAN EXPEDISI','BOP EXPEDISI','PERAWATAN KANDANG','PERAWATAN EXPEDISI',
    'BELI ASET','BELI UNTUK STOK'
  ];
  window.__financeCashflowState=window.__financeCashflowState||{from:'',to:'',barn:'',assignment:'',source:'',shown:false};
  const st=window.__financeCashflowState;
  if(st.source===undefined)st.source='';
  const visible=st.shown?rows.filter(x=>
    (!st.from||x.date>=st.from)&&
    (!st.to||x.date<=st.to)&&
    (!st.barn||x.barn_id===st.barn)&&
    (!st.assignment||x.assignment_id===st.assignment)&&
    (!st.source||x.source===st.source)
  ):[];
  const masuk=visible.filter(x=>x.type==='MASUK').reduce((n,x)=>n+x.amount,0);
  const keluar=visible.filter(x=>x.type==='KELUAR').reduce((n,x)=>n+x.amount,0);
  const saldo=masuk-keluar;
  const bySource=new Map();
  visible.forEach(x=>{
    const k=x.source||'LAINNYA';
    const v=bySource.get(k)||{source:k,count:0,masuk:0,keluar:0};
    v.count++;
    v[x.type==='MASUK'?'masuk':'keluar']+=x.amount;
    bySource.set(k,v);
  });
  const sourceRows=[...bySource.values()].sort((a,b)=>a.source.localeCompare(b.source));
  const barnName=id=>barns.find(b=>b.id===id)?.name||'-';
  const txnLocation=x=>{
    if(x.assignment_id){
      const a=assignments.find(v=>v.id===x.assignment_id);
      if(a)return assignmentIdentity(assignments,barns,contractsRows,a);
    }
    return x.barn_id?barnName(x.barn_id):'-';
  };
  const periodLabel=(st.from||st.to)?((st.from?prodDateId(st.from):'Awal')+' s/d '+(st.to?prodDateId(st.to):'Sekarang')):'Semua tanggal';
  const categoryLabel=st.source||'Semua Kategori';

  let html='<section class="panel"><h3>Arus Kas Otomatis</h3><p class="muted"><strong>READ ONLY.</strong> Data ditarik otomatis dari transaksi sumber. Gunakan filter Kategori / Sumber untuk melihat dan mencetak rincian transaksi yang diminta Owner.</p>'+
    '<form id="cashflowFilter" class="form-vertical" data-no-submit-guard="1">'+
    '<label>Tanggal Awal<input type="date" name="from" value="'+esc(st.from||'')+'"></label>'+
    '<label>Tanggal Akhir<input type="date" name="to" value="'+esc(st.to||'')+'"></label>'+
    '<label>Kategori / Sumber<select name="source"><option value="">Semua Kategori</option>'+sourceOptions.map(s=>'<option value="'+esc(s)+'" '+(st.source===s?'selected':'')+'>'+esc(s.replaceAll('_',' '))+'</option>').join('')+'</select></label>'+
    '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
    '<label>Siklus<select name="assignment" '+(!st.barn?'disabled':'')+'><option value="">Semua Siklus</option>'+assignments.filter(a=>a.barn_id===st.barn).map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+'</select></label>'+
    '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="cashflowReset">Reset</button></div>'+
    '</form></section>';

  if(st.shown)html+='<section class="panel" id="cashflowPrintArea">'+
    '<div class="rhpp-section-head"><div><h3>Rincian Arus Kas · '+esc(categoryLabel)+'</h3>'+
    '<p class="muted">Periode: '+esc(periodLabel)+' · '+visible.length+' transaksi</p></div>'+
    '<div class="report-actions"><button type="button" id="cashflowPrint">Cetak / PDF</button><button type="button" id="cashflowPrintExcel">Excel</button></div></div>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Kas Masuk</span><strong>Rp '+prodFmt(masuk,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Kas Keluar</span><strong>Rp '+prodFmt(keluar,0)+'</strong></div>'+
      '<div class="rhpp-summary-card"><span>Selisih Kas Periode</span><strong>Rp '+prodFmt(saldo,0)+'</strong></div>'+

    '</div>'+
    '<h4>Ringkasan per Kategori</h4>'+
    '<div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Transaksi</th><th>Masuk</th><th>Keluar</th></tr></thead><tbody>'+
    sourceRows.map(x=>'<tr><td>'+esc(x.source)+'</td><td>'+x.count+'</td><td>Rp '+prodFmt(x.masuk,0)+'</td><td>Rp '+prodFmt(x.keluar,0)+'</td></tr>').join('')+
    '</tbody></table></div>'+
    '<h4>Rincian Transaksi</h4>'+
    '<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Kandang / Siklus</th><th>Keterangan / Catatan</th><th>Referensi</th><th>Masuk</th><th>Keluar</th></tr></thead><tbody>'+
    visible.map(x=>'<tr><td>'+prodDateId(x.date)+'</td><td>'+esc(x.type)+'</td><td>'+esc(x.source)+'</td><td>'+esc(txnLocation(x))+'</td><td>'+esc(financeOriginalNoteDisplay(x.detail))+'</td><td>'+esc(financeShortReferenceDisplay(x.reference))+'</td><td>'+(x.type==='MASUK'?'Rp '+prodFmt(x.amount,0):'-')+'</td><td>'+(x.type==='KELUAR'?'Rp '+prodFmt(x.amount,0):'-')+'</td></tr>').join('')+
    '</tbody></table></div>'+
    (visible.length?'':'<p class="muted">Tidak ada transaksi sesuai filter.</p>')+
  '</section>';

  layout(html);
  if(err)msg(err.message);
  const cashflowPrint=document.getElementById('cashflowPrint');
  if(cashflowPrint)cashflowPrint.onclick=()=>printFinanceDocument('cashflowPrintArea','Rincian Arus Kas - '+categoryLabel);const cashflowExcel=document.getElementById('cashflowPrintExcel');if(cashflowExcel)cashflowExcel.onclick=()=>exportFinanceDocumentExcel('cashflowPrintArea','Rincian Arus Kas - '+categoryLabel);
  const form=document.getElementById('cashflowFilter');
  const reset=document.getElementById('cashflowReset');
  if(form){
    form.elements.barn.onchange=async()=>{
      st.barn=form.elements.barn.value||'';
      st.assignment='';
      st.shown=false;
      await financeCashflowPage();
    };
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(form);
      st.from=String(fd.get('from')||'');
      st.to=String(fd.get('to')||'');
      st.source=String(fd.get('source')||'');
      st.barn=String(fd.get('barn')||'');
      st.assignment=st.barn?String(fd.get('assignment')||''):'';
      if(st.from&&st.to&&st.from>st.to){const t=st.from;st.from=st.to;st.to=t;}
      st.shown=true;
      await financeCashflowPage();
    };
  }
  if(reset)reset.onclick=async()=>{
    st.from='';st.to='';st.source='';st.barn='';st.assignment='';st.shown=false;
    await financeCashflowPage();
  };
}

async function financeBarnProfitLossPage(){
  const [xr,ar,br,cr,rr]=await Promise.all([
    db.rpc('finance_cycle_profit_loss_v2'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name').order('code',{ascending:true}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('rhpp_real').select('contract_assignment_id')
  ]);
  const rows=xr.data||[],assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[];
  const err=[xr,ar,br,cr,rr].find(x=>x.error)?.error;
  const realIds=new Set((rr.data||[]).map(x=>x.contract_assignment_id).filter(Boolean));

  window.__financeBarnProfitState=window.__financeBarnProfitState||{barn:'',assignment:'',shown:false};
  const st=window.__financeBarnProfitState;
  const cycleOptions=assignments.filter(a=>!st.barn||a.barn_id===st.barn);
  const assignmentOf=x=>assignments.find(a=>a.id===x.contract_assignment_id);
  const isMandiri=x=>assignmentOf(x)?.cycle_type==='MANDIRI';
  const statusOf=x=>x.active?'PROSES':(isMandiri(x)||realIds.has(x.contract_assignment_id))?'FINAL':'MENUNGGU RHPP REAL';
  const filtered=st.shown?rows.filter(x=>
    statusOf(x)==='FINAL'&&
    (!st.barn||x.barn_id===st.barn)&&
    (!st.assignment||x.contract_assignment_id===st.assignment)
  ):[];
  const finalRows=filtered.filter(x=>statusOf(x)==='FINAL');
  const sum=(arr,k)=>arr.reduce((n,x)=>n+prodNum(x[k]),0);
  const totalRhpp=sum(finalRows,'rhpp_real');
  const totalRhppMitra=sum(finalRows.filter(x=>!isMandiri(x)),'rhpp_real');
  const totalPenjualanMandiri=sum(finalRows.filter(isMandiri),'rhpp_real');
  const totalBop=sum(finalRows,'bop_produksi');
  const totalSapronakLuar=sum(finalRows,'sapronak_luar');
  const totalTambahDaging=sum(finalRows,'tambah_daging');
  const totalNet=finalRows.reduce((n,x)=>n+(prodNum(x.rhpp_real)-prodNum(x.bop_produksi)-prodNum(x.sapronak_luar)-prodNum(x.tambah_daging)),0);

  let html='<section class="panel"><h3>Laba/Rugi Kandang</h3>'+
    '<p class="muted">Khusus usaha kandang. Expedisi dan Perawatan Kandang tidak masuk ke perhitungan ini. Perawatan tetap terpisah dan baru digabung pada laba/rugi global.</p>'+
    '<form id="barnProfitFilter" class="form-vertical">'+
      '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Siklus<select name="assignment"><option value="">Semua Siklus</option>'+cycleOptions.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+'</select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>';

  if(st.shown){
    html+='<section class="panel" id="barnProfitPrintArea">'+
      '<div class="rhpp-section-head"><div><h3>Ringkasan Laba/Rugi Kandang</h3></div><div class="report-actions"><button type="button" id="barnProfitPrint">Cetak / PDF</button><button type="button" id="barnProfitPrintExcel">Excel</button></div></div>'+
      '<div class="rhpp-summary-cards">'+
        '<div class="rhpp-summary-card"><span>Pendapatan Kandang</span><strong>Rp '+prodFmt(totalRhpp,0)+'</strong><small>RHPP Real Mitra + Penjualan Mandiri</small></div>'+
        '<div class="rhpp-summary-card"><span>RHPP Real Mitra</span><strong>Rp '+prodFmt(totalRhppMitra,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Penjualan Mandiri</span><strong>Rp '+prodFmt(totalPenjualanMandiri,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>BOP Produksi</span><strong>Rp '+prodFmt(totalBop,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Biaya Sapronak / Tambahan</span><strong>Rp '+prodFmt(totalSapronakLuar+totalTambahDaging,0)+'</strong><small>Termasuk stok BMS dari retur dan pemindahan kandang</small></div>'+
        '<div class="rhpp-summary-card"><span>Laba/Rugi Kandang</span><strong>Rp '+prodFmt(totalNet,0)+'</strong><small>'+finalRows.length+' siklus · perawatan terpisah</small></div>'+
      '</div>'+
      '<div class="tablewrap"><table><thead><tr>'+
        '<th>Kandang / Siklus</th><th>Jenis</th><th>RHPP Real Mitra</th><th>Penjualan Mandiri</th><th>BOP Produksi</th><th>Biaya Sapronak</th><th>Tambah Daging</th><th>Laba/Rugi Kandang</th>'+
      '</tr></thead><tbody>'+
      filtered.map(x=>{
        const a=assignments.find(v=>v.id===x.contract_assignment_id);
        const status=statusOf(x);
        const ident=a?assignmentIdentity(assignments,barns,contractsRows,a):(x.barn_code+' · '+x.barn_name);
        return '<tr>'+
          '<td>'+esc(ident)+'</td>'+
          '<td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td>'+
          '<td>'+(isMandiri(x)?'—':'Rp '+prodFmt(x.rhpp_real,0))+'</td>'+
          '<td>'+(isMandiri(x)?'Rp '+prodFmt(x.rhpp_real,0):'—')+'</td>'+
          '<td>Rp '+prodFmt(x.bop_produksi,0)+'</td>'+
          '<td>Rp '+prodFmt(x.sapronak_luar,0)+'</td>'+
          '<td>Rp '+prodFmt(x.tambah_daging,0)+'</td>'+
          '<td><strong>Rp '+prodFmt(prodNum(x.rhpp_real)-prodNum(x.bop_produksi)-prodNum(x.sapronak_luar)-prodNum(x.tambah_daging),0)+'</strong></td>'+
        '</tr>';
      }).join('')+
      '</tbody></table></div>'+
      (!filtered.length?'<p class="muted">Tidak ada data sesuai filter.</p>':'')+
    '</section>';
  }

  layout(html);if(err)msg(err.message);
  const form=document.getElementById('barnProfitFilter');
  if(form){
    form.elements.barn.onchange=async()=>{
      st.barn=form.elements.barn.value||'';
      st.assignment='';
      st.shown=false;
      await financeBarnProfitLossPage();
    };
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(form);
      st.barn=String(fd.get('barn')||'');
      st.assignment=String(fd.get('assignment')||'');
      st.shown=true;
      await financeBarnProfitLossPage();
    };
  }
  const p=document.getElementById('barnProfitPrint');
  if(p)p.onclick=()=>printFinanceDocument('barnProfitPrintArea','Laba Rugi Kandang');const barnProfitExcel=document.getElementById('barnProfitPrintExcel');if(barnProfitExcel)barnProfitExcel.onclick=()=>exportFinanceDocumentExcel('barnProfitPrintArea','Laba Rugi Kandang');
}


async function financeGlobalProfitLossPage(){
  const [xr,rr,ar,br,cr,er,mr,gr,kmr]=await Promise.all([
    db.rpc('finance_cycle_profit_loss_v2'),
    db.from('rhpp_real').select('contract_assignment_id'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.rpc('finance_expedition_profit_loss_v2'),
    db.from('finance_expedition_maintenance').select('incurred_on,category,vehicle,amount,notes'),
    db.from('bop_outside').select('incurred_on,expense_scope,category,amount,notes'),
    db.from('barn_maintenance_costs').select('barn_id,incurred_on,category,amount,notes')
  ]);
  const rows=xr.data||[],assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[];
  const exp=(er.data||[])[0]||{};
  const expMaint=mr.data||[],bopUmumRows=gr.data||[],barnMaintRows=kmr.data||[];
  const err=[xr,rr,ar,br,cr,er,mr,gr,kmr].find(x=>x.error)?.error;
  const realIds=new Set((rr.data||[]).map(x=>x.contract_assignment_id).filter(Boolean));
  const assignmentOf=x=>assignments.find(a=>a.id===x.contract_assignment_id);
  const finalRows=rows.filter(x=>{
    const a=assignmentOf(x);
    return !x.active&&(a?.cycle_type==='MANDIRI'||realIds.has(x.contract_assignment_id));
  });
  const sum=(arr,k)=>arr.reduce((n,x)=>n+prodNum(x[k]),0);

  const totalRevenue=sum(finalRows,'rhpp_real');
  const totalRhppMitra=sum(finalRows.filter(x=>assignmentOf(x)?.cycle_type!=='MANDIRI'),'rhpp_real');
  const totalPenjualanMandiri=sum(finalRows.filter(x=>assignmentOf(x)?.cycle_type==='MANDIRI'),'rhpp_real');
  const totalBop=sum(finalRows,'bop_produksi');
  const totalSapronak=sum(finalRows,'sapronak_luar');
  const totalTambahDaging=sum(finalRows,'tambah_daging');
  const labaKandang=sum(finalRows,'laba_operasional_produksi');
  const perawatanKandang=barnMaintRows.reduce((n,x)=>n+prodNum(x.amount),0);

  const pendapatanExp=prodNum(exp.expedition_revenue);
  const bopExp=prodNum(exp.operational_bop);
  const labaExp=prodNum(exp.operational_profit);
  const perawatanExp=prodNum(exp.maintenance_bop);
  const bopKantorRows=bopUmumRows.filter(x=>x.expense_scope==='KANTOR');
  const bopLuarKantorRows=bopUmumRows.filter(x=>x.expense_scope!=='KANTOR');
  const bopKantor=bopKantorRows.reduce((n,x)=>n+prodNum(x.amount),0);
  const bopLuarKantor=bopLuarKantorRows.reduce((n,x)=>n+prodNum(x.amount),0);
  const bopUmum=bopKantor+bopLuarKantor;
  const labaUsaha=labaKandang+labaExp;
  const biayaGlobal=perawatanKandang+perawatanExp+bopKantor+bopLuarKantor;
  const labaGlobal=labaUsaha-biayaGlobal;

  const groupTotal=(rows,key)=>{
    const m=new Map();
    rows.forEach(x=>{
      const k=String(x[key]||'LAINNYA').replaceAll('_',' ');
      m.set(k,(m.get(k)||0)+prodNum(x.amount));
    });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
  };
  const barnMaintGroup=groupTotal(barnMaintRows,'category');
  const expMaintGroup=groupTotal(expMaint,'category');
  const bopKantorGroup=groupTotal(bopKantorRows,'category');
  const bopLuarKantorGroup=groupTotal(bopLuarKantorRows,'category');

  let html='<section class="panel" id="globalProfitPrintArea">'+
    '<div class="rhpp-section-head"><div><h3>Laba/Rugi Global</h3>'+
    '<p class="muted">Kumulatif kandang membaca MITRA + MANDIRI sebagai satu usaha kandang. Jenis siklus hanya ditampilkan sebagai identitas pada rincian, bukan dipisah dalam subtotal.</p></div>'+
    '<div class="report-actions"><button type="button" id="globalProfitPrint">Cetak / PDF</button><button type="button" id="globalProfitPrintExcel">Excel</button></div></div>'+
    '<div class="rhpp-summary-cards">'+
      '<div class="rhpp-summary-card"><span>Total Pendapatan Kandang</span><strong>Rp '+prodFmt(totalRevenue,0)+'</strong><small>'+finalRows.length+' siklus final</small></div>'+
      '<div class="rhpp-summary-card"><span>Laba/Rugi Kandang</span><strong>Rp '+prodFmt(labaKandang,0)+'</strong><small>Setelah BOP, sapronak, tambah daging</small></div>'+
      '<div class="rhpp-summary-card"><span>Laba/Rugi Expedisi</span><strong>Rp '+prodFmt(labaExp,0)+'</strong><small>Sebelum perawatan Expedisi</small></div>'+
      '<div class="rhpp-summary-card"><span>Laba/Rugi Global</span><strong>Rp '+prodFmt(labaGlobal,0)+'</strong><small>Hasil akhir perusahaan</small></div>'+
    '</div>'+

    '<h3>1. Kumulatif Usaha Kandang</h3>'+
    '<div class="tablewrap"><table><tbody>'+
      '<tr><td>RHPP Real Mitra</td><td>Rp '+prodFmt(totalRhppMitra,0)+'</td></tr>'+
      '<tr><td>Penjualan Mandiri</td><td>Rp '+prodFmt(totalPenjualanMandiri,0)+'</td></tr>'+
      '<tr><td>Total Pendapatan Kandang</td><td><strong>Rp '+prodFmt(totalRevenue,0)+'</strong></td></tr>'+
      '<tr><td>Total BOP Produksi</td><td>Rp '+prodFmt(totalBop,0)+'</td></tr>'+
      '<tr><td>Total Biaya Sapronak</td><td>Rp '+prodFmt(totalSapronak,0)+'</td></tr>'+
      '<tr><td>Total Tambah Daging</td><td>Rp '+prodFmt(totalTambahDaging,0)+'</td></tr>'+
      '<tr><td><strong>Laba/Rugi Kandang</strong></td><td><strong>Rp '+prodFmt(labaKandang,0)+'</strong></td></tr>'+
    '</tbody></table></div>'+

    '<div class="tablewrap"><table><thead><tr><th>Kandang / Siklus</th><th>Jenis</th><th>RHPP Real Mitra</th><th>Penjualan Mandiri</th><th>BOP</th><th>Biaya Sapronak</th><th>Tambah Daging</th><th>Laba/Rugi</th></tr></thead><tbody>'+
      finalRows.map(x=>{
        const a=assignmentOf(x);
        const ident=a?assignmentIdentity(assignments,barns,contractsRows,a):(x.barn_code+' · '+x.barn_name);
        return '<tr><td>'+esc(ident)+'</td><td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td>'+
          '<td>'+(a?.cycle_type==='MANDIRI'?'—':'Rp '+prodFmt(x.rhpp_real,0))+'</td>'+
          '<td>'+(a?.cycle_type==='MANDIRI'?'Rp '+prodFmt(x.rhpp_real,0):'—')+'</td><td>Rp '+prodFmt(x.bop_produksi,0)+'</td>'+
          '<td>Rp '+prodFmt(x.sapronak_luar,0)+'</td><td>Rp '+prodFmt(x.tambah_daging,0)+'</td>'+
          '<td><strong>Rp '+prodFmt(x.laba_operasional_produksi,0)+'</strong></td></tr>';
      }).join('')+
    '</tbody></table></div>'+

    '<h3>2. Usaha Expedisi</h3>'+
    '<div class="tablewrap"><table><tbody>'+
      '<tr><td>Pendapatan Expedisi</td><td>Rp '+prodFmt(pendapatanExp,0)+'</td></tr>'+
      '<tr><td>BOP Expedisi</td><td>Rp '+prodFmt(bopExp,0)+'</td></tr>'+
      '<tr><td><strong>Laba/Rugi Expedisi</strong></td><td><strong>Rp '+prodFmt(labaExp,0)+'</strong></td></tr>'+
    '</tbody></table></div>'+

    '<h3>3. Biaya Global / Pengurang Akhir</h3>'+
    '<div class="tablewrap"><table><tbody>'+
      '<tr><td>Perawatan Kandang</td><td>Rp '+prodFmt(perawatanKandang,0)+'</td></tr>'+
      '<tr><td>Perawatan Expedisi</td><td>Rp '+prodFmt(perawatanExp,0)+'</td></tr>'+
      '<tr><td>BOP Kantor</td><td>Rp '+prodFmt(bopKantor,0)+'</td></tr>'+
      '<tr><td>BOP Umum / Luar Kantor</td><td>Rp '+prodFmt(bopLuarKantor,0)+'</td></tr>'+
      '<tr><td><strong>Total BOP Umum</strong></td><td><strong>Rp '+prodFmt(bopUmum,0)+'</strong></td></tr>'+

      '<tr><td><strong>Total Biaya Global</strong></td><td><strong>Rp '+prodFmt(biayaGlobal,0)+'</strong></td></tr>'+
    '</tbody></table></div>'+
    (barnMaintGroup.length?'<h4>Rincian Perawatan Kandang</h4><div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Nominal</th></tr></thead><tbody>'+barnMaintGroup.map(x=>'<tr><td>'+esc(x[0])+'</td><td>Rp '+prodFmt(x[1],0)+'</td></tr>').join('')+'</tbody></table></div>':'')+
    (expMaintGroup.length?'<h4>Rincian Perawatan Expedisi</h4><div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Nominal</th></tr></thead><tbody>'+expMaintGroup.map(x=>'<tr><td>'+esc(x[0])+'</td><td>Rp '+prodFmt(x[1],0)+'</td></tr>').join('')+'</tbody></table></div>':'')+
    (bopKantorGroup.length?'<h4>Rincian BOP Kantor</h4><div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Nominal</th></tr></thead><tbody>'+bopKantorGroup.map(x=>'<tr><td>'+esc(x[0])+'</td><td>Rp '+prodFmt(x[1],0)+'</td></tr>').join('')+'</tbody></table></div>':'')+
    (bopLuarKantorGroup.length?'<h4>Rincian BOP Umum / Luar Kantor</h4><div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Nominal</th></tr></thead><tbody>'+bopLuarKantorGroup.map(x=>'<tr><td>'+esc(x[0])+'</td><td>Rp '+prodFmt(x[1],0)+'</td></tr>').join('')+'</tbody></table></div>':'')+

    '<h3>4. Hasil Akhir Global</h3>'+
    '<div class="tablewrap"><table><tbody>'+
      '<tr><td>Laba/Rugi Kandang</td><td>Rp '+prodFmt(labaKandang,0)+'</td></tr>'+
      '<tr><td>Laba/Rugi Expedisi</td><td>Rp '+prodFmt(labaExp,0)+'</td></tr>'+
      '<tr><td>Total Laba Usaha</td><td>Rp '+prodFmt(labaUsaha,0)+'</td></tr>'+
      '<tr><td>Total Biaya Global</td><td>(Rp '+prodFmt(biayaGlobal,0)+')</td></tr>'+
      '<tr><td><strong>LABA/RUGI GLOBAL</strong></td><td><strong>Rp '+prodFmt(labaGlobal,0)+'</strong></td></tr>'+
    '</tbody></table></div>'+
  '</section>';

  layout(html);if(err)msg(err.message);
  const p=document.getElementById('globalProfitPrint');
  if(p)p.onclick=()=>printFinanceDocument('globalProfitPrintArea','Laba Rugi Global');const globalProfitExcel=document.getElementById('globalProfitPrintExcel');if(globalProfitExcel)globalProfitExcel.onclick=()=>exportFinanceDocumentExcel('globalProfitPrintArea','Laba Rugi Global');
}

async function financeReportPage(){
  const [xr,ar,br,cr,rr,mfr]=await Promise.all([
    db.rpc('finance_cycle_profit_loss_v2'),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type'),
    db.from('barns').select('id,code,name'),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('rhpp_real').select('contract_assignment_id'),
    db.from('production_mandiri_final').select('contract_assignment_id,source_reference')
  ]);
  const rows=xr.data||[],assignments=ar.data||[],barns=br.data||[],contractsRows=cr.data||[];
  const realIds=new Set((rr.data||[]).map(x=>x.contract_assignment_id).filter(Boolean));
  const mandiriFinalMap=new Map((mfr.data||[]).map(x=>[x.contract_assignment_id,x]));
  const err=[xr,ar,br,cr,rr,mfr].find(x=>x.error)?.error;
  window.__financeReportState=window.__financeReportState||{barn:'',assignment:'',kind:'',status:'',from:'',to:'',shown:false};
  const st=window.__financeReportState;
  if(st.kind===undefined)st.kind='';
  if(st.status===undefined)st.status='';
  if(st.shown===undefined)st.shown=false;

  const assignmentOf=x=>assignments.find(a=>a.id===x.contract_assignment_id);
  const isMandiri=x=>assignmentOf(x)?.cycle_type==='MANDIRI';
  const cycleStatus=x=>x.active?'PROSES':(isMandiri(x)||realIds.has(x.contract_assignment_id))?'FINAL':'MENUNGGU RHPP REAL';
  const validationStatus=x=>{
    const status=cycleStatus(x);
    if(status!=='FINAL')return status;
    if(isMandiri(x)){
      if(!mandiriFinalMap.has(x.contract_assignment_id))return 'BELUM LENGKAP';
      if(!(prodNum(x.rhpp_real)>0))return 'BELUM LENGKAP';
      if(!(prodNum(x.sapronak_luar)>0))return 'BELUM LENGKAP';
    }else if(!realIds.has(x.contract_assignment_id)){
      return 'MENUNGGU RHPP REAL';
    }
    return 'PASS';
  };
  const cycleIncome=x=>validationStatus(x)==='PASS'?prodNum(x.rhpp_real):null;
  const cycleCost=x=>prodNum(x.bop_produksi)+prodNum(x.sapronak_luar)+prodNum(x.tambah_daging);
  const cycleProfit=x=>validationStatus(x)==='PASS'?cycleIncome(x)-cycleCost(x):null;

  const visible=st.shown?rows.filter(x=>{
    const a=assignmentOf(x),d=String(a?.start_date||''),status=cycleStatus(x),kind=a?.cycle_type||'MITRA';
    return (!st.barn||x.barn_id===st.barn)&&
      (!st.assignment||x.contract_assignment_id===st.assignment)&&
      (!st.kind||kind===st.kind)&&
      (!st.status||status===st.status)&&
      (!st.from||d>=st.from)&&
      (!st.to||d<=st.to);
  }):[];

  const finalRows=visible.filter(x=>validationStatus(x)==='PASS');
  const incompleteRows=visible.filter(x=>cycleStatus(x)==='FINAL'&&validationStatus(x)!=='PASS');
  const waitingRows=visible.filter(x=>cycleStatus(x)==='MENUNGGU RHPP REAL');
  const processRows=visible.filter(x=>cycleStatus(x)==='PROSES');
  const totalIncome=finalRows.reduce((n,x)=>n+cycleIncome(x),0);
  const totalCost=finalRows.reduce((n,x)=>n+cycleCost(x),0);
  const totalProfit=totalIncome-totalCost;

  let html='<section class="panel"><h3>Laporan Laba/Rugi</h3>'+
    '<p class="muted">Ringkasan hasil operasional per siklus. MITRA memakai RHPP Real sebagai pendapatan final. MANDIRI memakai penjualan aktual. PASS berarti sumber final tersedia dan hitungan laba/rugi dapat dihitung; PASS bukan berarti harus untung.</p>'+
    '<form id="financeReportFilter" class="form-vertical" data-no-submit-guard="1">'+
      '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Siklus<select name="assignment" '+(!st.barn?'disabled':'')+'><option value="">Semua Siklus</option>'+assignments.filter(a=>a.barn_id===st.barn).map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+'</select></label>'+
      '<label>Jenis Siklus<select name="kind"><option value="">Semua</option><option value="MITRA" '+(st.kind==='MITRA'?'selected':'')+'>MITRA</option><option value="MANDIRI" '+(st.kind==='MANDIRI'?'selected':'')+'>MANDIRI</option></select></label>'+
      '<label>Status<select name="status"><option value="">Semua</option><option value="PROSES" '+(st.status==='PROSES'?'selected':'')+'>PROSES</option><option value="MENUNGGU RHPP REAL" '+(st.status==='MENUNGGU RHPP REAL'?'selected':'')+'>MENUNGGU RHPP REAL</option><option value="FINAL" '+(st.status==='FINAL'?'selected':'')+'>FINAL</option></select></label>'+
      '<label>Mulai Siklus Dari<input name="from" type="date" value="'+esc(st.from||'')+'"></label>'+
      '<label>Mulai Siklus Sampai<input name="to" type="date" value="'+esc(st.to||'')+'"></label>'+
      '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="financeReportReset">Reset</button></div>'+
    '</form></section>';

  if(st.shown){
    html+='<section class="panel" id="companyProfitPrintArea">'+
      '<div class="rhpp-section-head"><div><h3>Ringkasan</h3><p class="muted">Ringkasan hanya menjumlahkan siklus FINAL. Siklus PROSES dan MENUNGGU tidak dipaksa menjadi laba/rugi final.</p></div><div class="report-actions"><button type="button" id="financeReportPrint">Cetak / PDF</button><button type="button" id="financeReportPrintExcel">Excel</button></div></div>'+
      '<div class="rhpp-summary-cards">'+
        '<div class="rhpp-summary-card"><span>Total Pendapatan Final</span><strong>Rp '+prodFmt(totalIncome,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Biaya Siklus Final</span><strong>Rp '+prodFmt(totalCost,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Laba/Rugi Operasional</span><strong>Rp '+prodFmt(totalProfit,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Siklus PASS</span><strong>'+finalRows.length+'</strong><small>FINAL dan dapat dihitung</small></div>'+
        '<div class="rhpp-summary-card"><span>Menunggu Final</span><strong>'+(processRows.length+waitingRows.length+incompleteRows.length)+'</strong><small>'+processRows.length+' PROSES · '+waitingRows.length+' menunggu RHPP Real · '+incompleteRows.length+' belum lengkap</small></div>'+
      '</div>'+
    '</section>';

    html+='<section class="panel" id="cycleProfitLossPrintArea"><h3>Rincian Laba/Rugi per Siklus</h3>'+
      '<div class="tablewrap"><table><thead><tr>'+
        '<th>Kandang / Siklus</th><th>Jenis</th><th>Pendapatan</th><th>BOP Produksi</th><th>Sapronak / Pembelian</th><th>Tambah Daging</th><th>Total Biaya</th><th>Laba / Rugi</th><th>Validasi</th>'+
      '</tr></thead><tbody>'+
      visible.map(x=>{
        const a=assignmentOf(x),status=cycleStatus(x),income=cycleIncome(x),cost=cycleCost(x),profit=cycleProfit(x);
        return '<tr>'+
          '<td>'+esc(a?assignmentIdentity(assignments,barns,contractsRows,a):(x.barn_code+' · '+x.barn_name))+'</td>'+
          '<td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td>'+
          '<td>'+(income===null?'Belum Final':'Rp '+prodFmt(income,0))+'</td>'+
          '<td>Rp '+prodFmt(x.bop_produksi,0)+'</td>'+
          '<td>Rp '+prodFmt(x.sapronak_luar,0)+'</td>'+
          '<td>Rp '+prodFmt(x.tambah_daging,0)+'</td>'+
          '<td><strong>Rp '+prodFmt(cost,0)+'</strong></td>'+
          '<td><strong>'+(profit===null?'Belum dihitung':'Rp '+prodFmt(profit,0))+'</strong></td>'+
          '<td><strong>'+esc(validationStatus(x))+'</strong></td>'+
        '</tr>';
      }).join('')+
      '</tbody></table></div>'+
      (visible.length?'':'<p class="muted">Tidak ada data sesuai filter.</p>')+
    '</section>';

    if(st.assignment){
      const selected=visible.find(x=>x.contract_assignment_id===st.assignment);
      if(selected){
        const a=assignmentOf(selected),status=cycleStatus(selected),income=cycleIncome(selected),cost=cycleCost(selected),profit=cycleProfit(selected);
        html+='<section class="panel" id="cycleSummaryPrintArea"><h3>Detail Siklus Dipilih</h3>'+
          '<div class="rhpp-summary-cards">'+
            '<div class="rhpp-summary-card"><span>Status</span><strong>'+esc(status)+'</strong></div>'+
            '<div class="rhpp-summary-card"><span>Jenis</span><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></div>'+
            '<div class="rhpp-summary-card"><span>Validasi</span><strong>'+esc(validationStatus(selected))+'</strong></div>'+
          '</div>'+
          '<div class="tablewrap"><table><tbody>'+
            (!isMandiri(selected)?'<tr><td>RHPP Sistem</td><td>Rp '+prodFmt(selected.rhpp_system,0)+'</td></tr>':'')+
            '<tr><td>'+(isMandiri(selected)?'Penjualan Mandiri':'RHPP Real')+'</td><td><strong>'+(income===null?'Belum Final':'Rp '+prodFmt(income,0))+'</strong></td></tr>'+
            '<tr><td>BOP Produksi</td><td>Rp '+prodFmt(selected.bop_produksi,0)+'</td></tr>'+
            '<tr><td>'+(isMandiri(selected)?'Pembelian / Sapronak Mandiri':'Sapronak Luar')+'</td><td>Rp '+prodFmt(selected.sapronak_luar,0)+'</td></tr>'+
            '<tr><td>Tambah Daging</td><td>Rp '+prodFmt(selected.tambah_daging,0)+'</td></tr>'+
            '<tr><td><strong>Total Biaya</strong></td><td><strong>Rp '+prodFmt(cost,0)+'</strong></td></tr>'+
            '<tr><td><strong>Laba / Rugi Operasional</strong></td><td><strong>'+(profit===null?'Belum dihitung':'Rp '+prodFmt(profit,0))+'</strong></td></tr>'+
          '</tbody></table></div>'+
        '</section>';
      }
    }
  }

  layout(html);if(err)msg(err.message);
  const financeReportPrint=document.getElementById('financeReportPrint');
  if(financeReportPrint)financeReportPrint.onclick=()=>printFinanceDocument(st.assignment?['companyProfitPrintArea','cycleProfitLossPrintArea','cycleSummaryPrintArea']:['companyProfitPrintArea','cycleProfitLossPrintArea'],'Laporan Laba Rugi');const financeReportExcel=document.getElementById('financeReportPrintExcel');if(financeReportExcel)financeReportExcel.onclick=()=>exportFinanceDocumentExcel(st.assignment?['companyProfitPrintArea','cycleProfitLossPrintArea','cycleSummaryPrintArea']:['companyProfitPrintArea','cycleProfitLossPrintArea'],'Laporan Laba Rugi');
  const form=document.getElementById('financeReportFilter');
  const reset=document.getElementById('financeReportReset');
  if(form){
    form.elements.barn.onchange=async()=>{st.barn=form.elements.barn.value||'';st.assignment='';st.shown=false;await financeReportPage();};
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(form);
      st.barn=String(fd.get('barn')||'');
      st.assignment=st.barn?String(fd.get('assignment')||''):'';
      st.kind=String(fd.get('kind')||'');
      st.status=String(fd.get('status')||'');
      st.from=String(fd.get('from')||'');
      st.to=String(fd.get('to')||'');
      if(st.from&&st.to&&st.from>st.to){const t=st.from;st.from=st.to;st.to=t;}
      st.shown=true;
      await financeReportPage();
    };
  }
  if(reset)reset.onclick=async()=>{st.barn='';st.assignment='';st.kind='';st.status='';st.from='';st.to='';st.shown=false;await financeReportPage();};
}


async function financeCashRequestPage(editId=null){
  if(editId!==null)window.__cashRequestEditId=editId;
  const [rr,ir,br,cr]=await Promise.all([
    db.from('finance_cash_requests').select('*').order('request_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_cash_request_items').select('*').order('sort_order',{ascending:true}),
    db.from('barns').select('id,code,name,location').order('code',{ascending:true}),
    db.from('company_profile').select('*').eq('id',true).maybeSingle()
  ]);
  const err=[rr,ir,br,cr].find(x=>x.error)?.error;if(err)return layout('<section class="panel"><h3>Form Pengajuan Kas</h3><p class="error">'+esc(err.message)+'</p></section>');
  const requests=rr.data||[],items=ir.data||[],barnRows=br.data||[],company=cr.data||{};
  const editRequest=requests.find(r=>r.id===window.__cashRequestEditId&&r.status==='DRAFT')||null;
  if(window.__cashRequestEditId&&!editRequest)window.__cashRequestEditId='';
  const emptyGroup=()=>({type:'KANDANG',name:'',items:[{description:'',amount:'',remarks:''}]});
  if(editRequest&&window.__cashRequestLoadedId!==editRequest.id){
    const grouped=new Map();
    items.filter(x=>x.request_id===editRequest.id).forEach(x=>{
      const raw=String(x.group_name||''),type=raw==='BOP UMUM'?'BOP_UMUM':raw==='BOP KANTOR'?'BOP_KANTOR':/^KANDANG\\s+/.test(raw)?'KANDANG':'PROYEK';
      const name=type==='KANDANG'?raw.replace(/^KANDANG\\s+/,''):type==='BOP_UMUM'?'BOP UMUM':type==='BOP_KANTOR'?'BOP KANTOR':raw;
      const key=type+'|'+name;
      if(!grouped.has(key))grouped.set(key,{type,name,items:[]});
      grouped.get(key).items.push({description:x.description||'',amount:String(x.amount??''),remarks:x.remarks||''});
    });
    window.__cashRequestGroups=[...grouped.values()];
    if(!window.__cashRequestGroups.length)window.__cashRequestGroups=[emptyGroup()];
    window.__cashRequestLoadedId=editRequest.id;
  }
  if(!editRequest&&window.__cashRequestLoadedId){window.__cashRequestGroups=null;window.__cashRequestLoadedId='';}
  window.__cashRequestGroups=window.__cashRequestGroups||[emptyGroup()];
  const groups=window.__cashRequestGroups;
  const barnOptions='<option value="">Pilih Kandang</option>'+barnRows.map(b=>'<option value="'+esc(b.name||b.code||b.location||'')+'">'+esc(b.name||b.code||b.location||'-')+'</option>').join('');
  const groupHtml=groups.map((g,gi)=>{
    const nameField=g.type==='KANDANG'?'<select data-cr-name="'+gi+'">'+barnOptions.replace('value="'+esc(g.name)+'"','value="'+esc(g.name)+'" selected')+'</select>':g.type==='PROYEK'?'<input data-cr-name="'+gi+'" value="'+esc(g.name||'')+'" placeholder="Nama proyek / kelompok">':'<input data-cr-name="'+gi+'" value="'+esc(g.type==='BOP_UMUM'?'BOP UMUM':g.type==='BOP_KANTOR'?'BOP KANTOR':g.name||'')+'" readonly>';
    const rows=(g.items||[]).map((x,ii)=>'<tr><td>'+(ii+1)+'</td><td><input data-cr-desc="'+gi+'-'+ii+'" value="'+esc(x.description||'')+'" placeholder="Uraian kebutuhan"></td><td><input data-cr-amount="'+gi+'-'+ii+'" type="text" inputmode="decimal" autocomplete="off" value="'+esc(x.amount?Number(x.amount).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}):'')+'" placeholder="0,00"></td><td><input data-cr-remarks="'+gi+'-'+ii+'" value="'+esc(x.remarks||'')+'" placeholder="Keterangan"></td><td><button type="button" data-cr-remove-item="'+gi+'-'+ii+'">Hapus</button></td></tr>').join('');
    return '<section class="panel cash-request-group"><div class="form-grid"><label>Jenis Kelompok<select data-cr-type="'+gi+'"><option value="KANDANG" '+(g.type==='KANDANG'?'selected':'')+'>Kandang</option><option value="BOP_UMUM" '+(g.type==='BOP_UMUM'?'selected':'')+'>BOP Umum</option><option value="BOP_KANTOR" '+(g.type==='BOP_KANTOR'?'selected':'')+'>BOP Kantor</option><option value="PROYEK" '+(g.type==='PROYEK'?'selected':'')+'>Proyek / Lainnya</option></select></label><label>Nama Kelompok'+nameField+'</label></div><div class="tablewrap"><table><thead><tr><th>No</th><th>Uraian</th><th>Jumlah</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="inline-actions"><button type="button" data-cr-add-item="'+gi+'">Tambah Rincian</button>'+(groups.length>1?'<button type="button" data-cr-remove-group="'+gi+'">Hapus Kelompok</button>':'')+'</div></section>';
  }).join('');
  const history=requests.map(r=>{const total=items.filter(x=>x.request_id===r.id).reduce((s,x)=>s+Number(x.amount||0),0);return '<tr><td>'+prodDateId(r.request_date)+'</td><td>'+esc(r.request_number)+'</td><td>'+esc(r.status)+'</td><td>Rp '+prodFmt(total,0)+'</td><td class="inline-actions"><button type="button" data-cr-view="'+r.id+'">Lihat</button><button type="button" data-cr-print="'+r.id+'">Cetak</button><button type="button" data-cr-excel="'+r.id+'">Excel</button>'+(r.status==='DRAFT'?'<button type="button" data-cr-edit="'+r.id+'">Edit</button><button type="button" data-cr-delete="'+r.id+'">Hapus</button>':'')+'</td></tr>';}).join('');
  layout('<section class="panel"><h3>Form Pengajuan Kas</h3><p class="muted"><strong>Catatan pengajuan mandiri.</strong> Jenis Kandang, BOP Umum, BOP Kantor, dan Proyek hanya untuk pengelompokan dokumen. Tidak terhubung ke realisasi BOP, Arus Kas, Kasbon, Hutang, RHPP, atau Laba/Rugi.</p><form id="cashRequestForm"><div class="form-vertical compact-form"><label>Tanggal Pengajuan<input id="crDate" type="date" required value="'+esc(editRequest?.request_date||new Date().toISOString().slice(0,10))+'"></label><label>Perihal<input id="crSubject" value="'+esc(editRequest?.subject||'PENGAJUAN KAS')+'" required></label><label>Catatan<input id="crNotes" value="'+esc(editRequest?.notes||'')+'"></label></div><div id="cashRequestGroups">'+groupHtml+'</div><div class="inline-actions"><button type="button" id="crAddGroup">Tambah Kelompok</button><button type="submit">'+(editRequest?'Simpan Perubahan':'Simpan Draft')+'</button>'+(editRequest?'<button type="button" id="crEditCancel">Batal Edit</button>':'')+'</div></form></section><section class="panel"><h3>Riwayat Pengajuan Kas</h3><div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>No. Pengajuan</th><th>Status</th><th>Total</th><th>Aksi</th></tr></thead><tbody>'+history+'</tbody></table></div></section>');
  const formatCashRequestAmount=v=>{const raw=String(v||'').replace(/[^0-9,]/g,'').replace(/,/g,'');if(!raw)return '';return Number(raw).toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});};
  root.querySelectorAll('[data-cr-amount]').forEach(inp=>{inp.addEventListener('focus',()=>{const n=Number(String(inp.value||'0').replace(/\./g,'').replace(',','.'))||0;inp.value=n?n.toLocaleString('id-ID',{maximumFractionDigits:0}):'';});inp.addEventListener('blur',()=>{inp.value=formatCashRequestAmount(inp.value);});});
  const readGroups=()=>groups.map((g,gi)=>{
    const type=root.querySelector('[data-cr-type="'+gi+'"]')?.value||g.type||'KANDANG';
    let name=root.querySelector('[data-cr-name="'+gi+'"]')?.value.trim()||'';
    if(type==='BOP_UMUM')name='BOP UMUM';else if(type==='BOP_KANTOR')name='BOP KANTOR';else if(type==='KANDANG'&&name)name='KANDANG '+name;
    return {type,name,items:(g.items||[]).map((x,ii)=>({description:root.querySelector('[data-cr-desc="'+gi+'-'+ii+'"]')?.value.trim()||'',amount:Number(String(root.querySelector('[data-cr-amount="'+gi+'-'+ii+'"]')?.value||'0').replace(/\./g,'').replace(',','.'))||0,remarks:root.querySelector('[data-cr-remarks="'+gi+'-'+ii+'"]')?.value.trim()||''}))};
  });
  const keep=()=>{window.__cashRequestGroups=readGroups().map(g=>({...g,name:g.type==='KANDANG'?g.name.replace(/^KANDANG\s+/,''):g.name}));};
  root.querySelectorAll('[data-cr-type]').forEach(sel=>sel.onchange=()=>{keep();const gi=Number(sel.dataset.crType),g=window.__cashRequestGroups[gi];if(g.type==='BOP_UMUM')g.name='BOP UMUM';else if(g.type==='BOP_KANTOR')g.name='BOP KANTOR';else g.name='';financeCashRequestPage();});
  document.getElementById('crAddGroup').onclick=()=>{keep();window.__cashRequestGroups.push(emptyGroup());financeCashRequestPage();};
  root.querySelectorAll('[data-cr-add-item]').forEach(btn=>btn.onclick=()=>{keep();window.__cashRequestGroups[Number(btn.dataset.crAddItem)].items.push({description:'',amount:'',remarks:''});financeCashRequestPage();});
  root.querySelectorAll('[data-cr-remove-item]').forEach(btn=>btn.onclick=()=>{keep();const [gi,ii]=btn.dataset.crRemoveItem.split('-').map(Number),g=window.__cashRequestGroups[gi];g.items.splice(ii,1);if(!g.items.length)g.items.push({description:'',amount:'',remarks:''});financeCashRequestPage();});
  root.querySelectorAll('[data-cr-remove-group]').forEach(btn=>btn.onclick=()=>{keep();window.__cashRequestGroups.splice(Number(btn.dataset.crRemoveGroup),1);if(!window.__cashRequestGroups.length)window.__cashRequestGroups=[emptyGroup()];financeCashRequestPage();});
  document.getElementById('cashRequestForm').onsubmit=async e=>{
    e.preventDefault();const gs=readGroups(),rows=[];gs.forEach(g=>g.items.forEach(x=>{if(g.name&&x.description&&x.amount>0)rows.push({group_name:g.name,description:x.description,amount:x.amount,remarks:x.remarks});}));if(!rows.length)return msg('Isi minimal satu kelompok dan satu rincian pengajuan.');
    const date=document.getElementById('crDate').value,subject=document.getElementById('crSubject').value.trim(),notes=document.getElementById('crNotes').value.trim(),no='PK-'+String(date).replaceAll('-','')+'-'+String(Date.now()).slice(-6);
    let requestId=editRequest?.id||'';
    if(editRequest){
      const {error:ue}=await db.from('finance_cash_requests').update({request_date:date,subject,notes}).eq('id',editRequest.id).eq('status','DRAFT');
      if(ue)return msg(ue.message);
      requestId=editRequest.id;
      const {error:ie}=await db.from('finance_cash_request_items').insert(rows.map((x,i)=>({...x,request_id:requestId,sort_order:i+1})));
      if(ie)return msg('Header diperbarui, tetapi rincian lama dipertahankan karena rincian baru gagal disimpan: '+ie.message);
      const oldIds=items.filter(x=>x.request_id===requestId).map(x=>x.id).filter(Boolean);
      if(oldIds.length){const {error:de}=await db.from('finance_cash_request_items').delete().in('id',oldIds);if(de)return msg('Rincian baru tersimpan, tetapi rincian lama belum terhapus. Periksa sebelum mengedit ulang. '+de.message);}
      msg('Draft pengajuan kas berhasil diperbarui.',true);
    }else{
      const {data:req,error}=await db.from('finance_cash_requests').insert({request_number:no,request_date:date,subject,notes,status:'DRAFT'}).select('id').single();if(error)return msg(error.message);
      const {error:ie}=await db.from('finance_cash_request_items').insert(rows.map((x,i)=>({...x,request_id:req.id,sort_order:i+1})));if(ie){await db.from('finance_cash_requests').delete().eq('id',req.id);return msg(ie.message);}
      msg('Draft pengajuan tersimpan.',true);
    }
    window.__cashRequestGroups=[emptyGroup()];window.__cashRequestEditId='';window.__cashRequestLoadedId='';await financeCashRequestPage();
  };
  const docHtml=id=>{const r=requests.find(x=>x.id===id);if(!r)return '';const its=items.filter(x=>x.request_id===id),names=[...new Set(its.map(x=>x.group_name))],total=its.reduce((s,x)=>s+Number(x.amount||0),0);const body=names.map(g=>'<tr><th colspan="4">'+esc(g)+'</th></tr>'+its.filter(x=>x.group_name===g).map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.description)+'</td><td style="text-align:right">'+prodFmt(x.amount,0)+'</td><td>'+esc(x.remarks||'')+'</td></tr>').join('')).join('');return '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}.head{text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #111;padding:6px}.total{font-weight:700}</style></head><body><div class="head"><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><hr><h3>FORM PENGAJUAN KAS</h3></div><p><b>No:</b> '+esc(r.request_number)+'<br><b>Perihal:</b> '+esc(r.subject)+'<br><b>Tgl. Pengajuan:</b> '+prodDateId(r.request_date)+'</p><table><thead><tr><th>NO</th><th>URAIAN</th><th>JUMLAH</th><th>KET.</th></tr></thead><tbody>'+body+'<tr class="total"><td colspan="2">TOTAL</td><td style="text-align:right">'+prodFmt(total,0)+'</td><td></td></tr></tbody></table></body></html>';};
  root.querySelectorAll('[data-cr-edit]').forEach(btn=>btn.onclick=async()=>{window.__cashRequestGroups=null;window.__cashRequestLoadedId='';window.__cashRequestEditId=btn.dataset.crEdit||'';await financeCashRequestPage();root.querySelector('#cashRequestForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const crEditCancel=document.getElementById('crEditCancel');if(crEditCancel)crEditCancel.onclick=async()=>{window.__cashRequestGroups=[emptyGroup()];window.__cashRequestEditId='';window.__cashRequestLoadedId='';await financeCashRequestPage();};
  root.querySelectorAll('[data-cr-view],[data-cr-print]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.crView||btn.dataset.crPrint,w=window.open('','_blank');if(!w)return msg('Popup diblokir browser.');w.document.write(docHtml(id));w.document.close();if(btn.dataset.crPrint)setTimeout(()=>w.print(),300);});
  root.querySelectorAll('[data-cr-excel]').forEach(btn=>btn.onclick=()=>{const html=bmsExcelHtml(docHtml(btn.dataset.crExcel)),blob=BMSCore.excelBlob(['\ufeff'+html]),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Form_Pengajuan_Kas.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  root.querySelectorAll('[data-cr-delete]').forEach(btn=>btn.onclick=async()=>{if(!await appConfirm('Hapus draft pengajuan ini?'))return;const {error}=await db.from('finance_cash_requests').delete().eq('id',btn.dataset.crDelete).eq('status','DRAFT');if(error)return msg(error.message);await financeCashRequestPage();});
}

