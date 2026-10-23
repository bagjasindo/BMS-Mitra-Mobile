async function barnMasterPage(){
  const m=modules.kandang;
  const {data,error}=await db.from('barns').select('*').order('code',{ascending:true});
  const rows=data||[];
  const kinds=[...new Set(rows.map(x=>String(x.kind||'').trim()).filter(Boolean))].sort();

  let html='<section class="panel"><h3>Tambah / Edit '+title.kandang+'</h3>'+
    '<form id="barnMasterEntry" class="form-vertical">'+
      '<input type="hidden" name="id">'+
      m.fields.map(field).join('')+
      '<div class="report-actions"><button type="submit" id="barnMasterSave">Simpan</button><button type="button" id="barnMasterCancel" hidden>Batal Edit</button></div>'+
    '</form></section>'+
    '<section class="panel"><h3>Data '+title.kandang+'</h3>'+
      '<form id="barnMasterFilter" class="form-vertical">'+
        '<label>Kode<input name="code" placeholder="Contoh: KD-001"></label>'+
        '<label>Nama<input name="name" placeholder="Nama kandang"></label>'+
        '<label>Kapasitas Minimum<input name="capacity_min" type="text" inputmode="numeric" data-number="1" placeholder="Contoh: 8000"></label>'+
        '<label>Kapasitas Maksimum<input name="capacity_max" type="text" inputmode="numeric" data-number="1" placeholder="Contoh: 40000"></label>'+
        '<label>Jenis<select name="kind"><option value="">Semua Jenis</option>'+kinds.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select></label>'+
        '<label>Lokasi<input name="location" placeholder="Cari lokasi"></label>'+
        '<label>Status<select name="status"><option value="">Semua Status</option><option value="AKTIF">Aktif</option><option value="NONAKTIF">Nonaktif</option></select></label>'+
        '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="barnMasterFilterReset">Reset Filter</button></div>'+
      '</form>'+
      '<div id="barnMasterResult"><p class="muted">Pilih filter lalu tekan Tampilkan.</p></div>'+
    '</section>';

  layout(html);
  bindNumberInputs();

  const entry=document.getElementById('barnMasterEntry');
  const save=document.getElementById('barnMasterSave');
  const cancel=document.getElementById('barnMasterCancel');
  const filter=document.getElementById('barnMasterFilter');
  const result=document.getElementById('barnMasterResult');

  const resetEntry=()=>{
    entry.reset();
    entry.elements.id.value='';
    save.textContent='Simpan';
    cancel.hidden=true;
  };
  cancel.onclick=resetEntry;

  const renderRows=filtered=>{
    result.innerHTML=filtered.length
      ?'<div class="tablewrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Kapasitas</th><th>Jenis</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
        filtered.map(x=>'<tr><td>'+esc(x.code||'')+'</td><td>'+esc(x.name||'')+'</td><td>'+fmtNumber(x.capacity||0)+'</td><td>'+esc(x.kind||'')+'</td><td>'+esc(x.location||'-')+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td><td><button type="button" data-edit-barn="'+esc(x.id)+'">Edit</button> <button type="button" data-toggle-barn="'+esc(x.id)+'">'+(x.active?'Nonaktifkan':'Aktifkan')+'</button></td></tr>').join('')+
        '</tbody></table></div>'
      :'<p class="muted">Data tidak ditemukan.</p>';

    result.querySelectorAll('[data-toggle-barn]').forEach(btn=>btn.onclick=async()=>{const x=rows.find(v=>v.id===btn.dataset.toggleBarn);if(!x)return;const {error}=await db.from('barns').update({active:!x.active}).eq('id',x.id);if(error)return msg(error.message);await barnMasterPage();msg(x.active?'Kandang dinonaktifkan.':'Kandang diaktifkan.',true);});
    result.querySelectorAll('[data-edit-barn]').forEach(btn=>btn.onclick=()=>{
      const x=rows.find(v=>v.id===btn.dataset.editBarn);
      if(!x)return;
      entry.elements.id.value=x.id;
      for(const [key] of m.fields){
        if(entry.elements[key])entry.elements[key].value=x[key]??'';
      }
      save.textContent='Simpan Perubahan';
      cancel.hidden=false;
      entry.scrollIntoView({behavior:'smooth',block:'start'});
    });
  };

  filter.onsubmit=ev=>{
    ev.preventDefault();
    const fd=new FormData(filter);
    const code=String(fd.get('code')||'').trim().toLowerCase();
    const name=String(fd.get('name')||'').trim().toLowerCase();
    const minCap=normalizeInputID(fd.get('capacity_min'));
    const maxCap=normalizeInputID(fd.get('capacity_max'));
    const kind=String(fd.get('kind')||'');
    const location=String(fd.get('location')||'').trim().toLowerCase();
    const status=String(fd.get('status')||'');

    const filtered=rows.filter(x=>
      (!code||String(x.code||'').toLowerCase().includes(code))&&
      (!name||String(x.name||'').toLowerCase().includes(name))&&
      (minCap==null||Number(x.capacity||0)>=minCap)&&
      (maxCap==null||Number(x.capacity||0)<=maxCap)&&
      (!kind||String(x.kind||'')===kind)&&
      (!location||String(x.location||'').toLowerCase().includes(location))&&
      (!status||(status==='AKTIF'?x.active:!x.active))
    );
    renderRows(filtered);
  };

  document.getElementById('barnMasterFilterReset').onclick=()=>{
    filter.reset();
    result.innerHTML='<p class="muted">Pilih filter lalu tekan Tampilkan.</p>';
  };

  entry.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(entry);
    const id=String(fd.get('id')||'');
    const payload={};
    for(const [k,,t] of m.fields){
      let v=fd.get(k);
      if(v!==''&&v!=null){
        const nv=t==='number'?normalizeInputID(v):v;
        if(nv!==null)payload[k]=nv;
      }else payload[k]=null;
    }

    const q=id
      ?db.from('barns').update(payload).eq('id',id)
      :db.from('barns').insert(payload);
    const {error:saveError}=await q;
    if(saveError)return msg(saveError.message);
    legacyDataLoaded=false;
    dashboardDataLoaded=false;
    await barnMasterPage();
    msg(id?'Master Kandang diperbarui.':'Master Kandang tersimpan.',true);
  };

  if(error)msg(error.message);
}

async function itemMasterPage(){
  await ensureLegacyData();
  const m=modules.item;
  const {data,error}=await db.from('items').select('*').order('code',{ascending:true});
  const rows=data||[];
  const supplierRows=suppliers.filter(x=>x.supplier_type==='SAPRONAK');
  const phases=[...new Set(rows.map(x=>String(x.feed_phase||'').trim()).filter(Boolean))].sort();
  const units=[...new Set(rows.map(x=>String(x.unit||'').trim()).filter(Boolean))].sort();

  let html='<section class="panel"><h3>Tambah / Edit '+title.item+'</h3>'+
    '<form id="itemMasterEntry" class="form-vertical">'+
      '<input type="hidden" name="id">'+
      m.fields.map(field).join('')+

      '<div class="report-actions"><button type="submit" id="itemMasterSave">Simpan</button><button type="button" id="itemMasterCancel" hidden>Batal Edit</button></div>'+
    '</form></section>'+
    '<section class="panel"><h3>Data '+title.item+'</h3>'+
      '<form id="itemMasterFilter" class="form-vertical">'+
        '<label>Kode<input name="code" placeholder="Contoh: SP-001"></label>'+
        '<label>Nama<input name="name" placeholder="Nama barang"></label>'+
        '<label>Jenis<select name="category"><option value="">Semua Jenis</option><option value="DOC">DOC</option><option value="PAKAN">PAKAN</option><option value="OVK1">OVK1 / Obat</option><option value="OVK2">OVK2 / Peralatan</option><option value="LAINNYA">LAINNYA</option></select></label>'+
        '<label>Fase Pakan<select name="feed_phase"><option value="">Semua Fase Pakan</option>'+phases.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select></label>'+
        '<label>Satuan<select name="unit"><option value="">Semua Satuan</option>'+units.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select></label>'+
        '<label>Supplier<select name="supplier_id"><option value="">Semua Supplier</option>'+supplierRows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||x.code||'-')+'</option>').join('')+'</select></label>'+
        '<label>Status<select name="status"><option value="">Semua Status</option><option value="AKTIF">Aktif</option><option value="NONAKTIF">Nonaktif</option></select></label>'+
        '<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" id="itemMasterFilterReset">Reset Filter</button></div>'+
      '</form>'+
      '<div id="itemMasterResult"><p class="muted">Pilih filter lalu tekan Tampilkan.</p></div>'+
    '</section>';

  layout(html);
  bindNumberInputs();

  const entry=document.getElementById('itemMasterEntry');
  const save=document.getElementById('itemMasterSave');
  const cancel=document.getElementById('itemMasterCancel');
  const filter=document.getElementById('itemMasterFilter');
  const result=document.getElementById('itemMasterResult');

  const syncUnit=()=>{
    const cat=entry.elements.category;
    const unit=entry.elements.unit;
    if(!cat||!unit)return;
    if(!document.getElementById('ovk-units')){
      const dl=document.createElement('datalist');
      dl.id='ovk-units';
      ['BOTOL','SACHET','LITER','ML','GRAM','KG','VIAL','AMPUL','TABLET','DOS','PCS','UNIT'].forEach(v=>{
        const o=document.createElement('option');o.value=v;dl.appendChild(o);
      });
      entry.appendChild(dl);
    }
    const apply=()=>{
      unit.removeAttribute('list');
      unit.placeholder='';
      if(cat.value==='DOC'){unit.value='EKOR';unit.readOnly=true;}
      else if(cat.value==='PAKAN'){unit.value='ZAK';unit.readOnly=true;}
      else if(cat.value==='OVK1'||cat.value==='OVK2'){
        if(unit.readOnly)unit.value='';
        unit.readOnly=false;unit.setAttribute('list','ovk-units');unit.placeholder='Pilih/ketik satuan OVK';
      }else{
        if(unit.readOnly)unit.value='';
        unit.readOnly=false;unit.placeholder='Masukkan satuan';
      }
    };
    cat.onchange=apply;apply();
  };
  syncUnit();

  const resetEntry=()=>{
    entry.reset();
    entry.elements.id.value='';
    save.textContent='Simpan';
    cancel.hidden=true;
    syncUnit();
  };
  cancel.onclick=resetEntry;

  const renderRows=filtered=>{
    result.innerHTML=filtered.length
      ?'<div class="tablewrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Fase Pakan</th><th>Satuan</th><th>Supplier</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
        filtered.map(x=>{
          const sup=supplierRows.find(v=>v.id===x.supplier_id);
          const jenis=x.category==='OVK'?(x.ovk_type==='OVK2'?'OVK2 / Peralatan':'OVK1 / Obat'):(x.category||'-'); return '<tr><td>'+esc(x.code||'')+'</td><td>'+esc(x.name||'')+'</td><td>'+esc(jenis)+'</td><td>'+esc(x.feed_phase||'-')+'</td><td>'+esc(x.unit||'')+'</td><td>'+esc(sup?.name||'-')+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td><td><button type="button" data-edit-item="'+esc(x.id)+'">Edit</button> <button type="button" data-toggle-item="'+esc(x.id)+'">'+(x.active?'Nonaktifkan':'Aktifkan')+'</button></td></tr>';
        }).join('')+
        '</tbody></table></div>'
      :'<p class="muted">Data tidak ditemukan.</p>';

    result.querySelectorAll('[data-toggle-item]').forEach(btn=>btn.onclick=async()=>{const x=rows.find(v=>v.id===btn.dataset.toggleItem);if(!x)return;const {error}=await db.from('items').update({active:!x.active}).eq('id',x.id);if(error)return msg(error.message);await itemMasterPage();msg(x.active?'Item dinonaktifkan.':'Item diaktifkan.',true);});
    result.querySelectorAll('[data-edit-item]').forEach(btn=>btn.onclick=()=>{
      const x=rows.find(v=>v.id===btn.dataset.editItem);
      if(!x)return;
      entry.elements.id.value=x.id;
      for(const [key] of m.fields){
        if(!entry.elements[key])continue;
        if(key==='category')entry.elements[key].value=x.category==='OVK'?(x.ovk_type==='OVK2'?'OVK2':'OVK1'):(x[key]??'');
        else entry.elements[key].value=x[key]??'';
      }
      save.textContent='Simpan Perubahan';
      cancel.hidden=false;
      syncUnit();
      entry.scrollIntoView({behavior:'smooth',block:'start'});
    });
  };

  filter.onsubmit=ev=>{
    ev.preventDefault();
    const fd=new FormData(filter);
    const code=String(fd.get('code')||'').trim().toLowerCase();
    const name=String(fd.get('name')||'').trim().toLowerCase();
    const category=String(fd.get('category')||'');
    const phase=String(fd.get('feed_phase')||'');
    const unit=String(fd.get('unit')||'');
    const supplierId=String(fd.get('supplier_id')||'');
    const status=String(fd.get('status')||'');
    const filtered=rows.filter(x=>
      (!code||String(x.code||'').toLowerCase().includes(code))&&
      (!name||String(x.name||'').toLowerCase().includes(name))&&
      (!category||(category==='OVK1'?x.category==='OVK'&&x.ovk_type!=='OVK2':category==='OVK2'?x.category==='OVK'&&x.ovk_type==='OVK2':String(x.category||'')===category))&&
      (!phase||String(x.feed_phase||'')===phase)&&
      (!unit||String(x.unit||'')===unit)&&
      (!supplierId||String(x.supplier_id||'')===supplierId)&&
      (!status||(status==='AKTIF'?x.active:!x.active))
    );
    renderRows(filtered);
  };

  document.getElementById('itemMasterFilterReset').onclick=()=>{
    filter.reset();
    result.innerHTML='<p class="muted">Pilih filter lalu tekan Tampilkan.</p>';
  };

  entry.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(entry);
    const id=String(fd.get('id')||'');
    const payload={};
    for(const [k,,t] of m.fields){
      let v=fd.get(k);
      if(v!==''&&v!=null){
        const nv=t==='number'?normalizeInputID(v):v;
        if(nv!==null)payload[k]=nv;
      }else payload[k]=null;
    }
    if(payload.category==='OVK1'||payload.category==='OVK2'){
      payload.ovk_type=payload.category;
      payload.category='OVK';
    }else payload.ovk_type=null;

    const q=id
      ?db.from('items').update(payload).eq('id',id)
      :db.from('items').insert(payload);
    const {error:saveError}=await q;
    if(saveError)return msg(saveError.message);
    legacyDataLoaded=false;
    await itemMasterPage();
    msg(id?'Master Sapronak diperbarui.':'Master Sapronak tersimpan.',true);
  };

  if(error)msg(error.message);
}

async function adminUserActivityLogPage(){
  if(!['ADMIN','OWNER'].includes(profile?.role))return layout('<section class="panel"><h3>Akses Dikunci</h3><p class="muted">Hanya Administrator dan Owner yang dapat melihat Log Aktivitas Pengguna.</p></section>');

  const [lr,ar,pr]=await Promise.all([
    db.from('user_activity_logs').select('id,actor,event_type,tab_key,device_type,detail,occurred_at').order('occurred_at',{ascending:false}).limit(500),
    db.from('audit_events').select('id,actor,action,table_name,record_id,occurred_at').order('occurred_at',{ascending:false}).limit(500),
    db.from('profiles').select('user_id,full_name,role,active')
  ]);
  const err=[lr,ar,pr].find(x=>x.error)?.error;
  const logs=lr.data||[],audits=ar.data||[],profiles=pr.data||[];
  const pmap=new Map(profiles.map(p=>[p.user_id,p]));
  const nameFor=id=>{const p=pmap.get(id);return p?(p.full_name||'-')+' · '+(p.role||'-'):'User '+String(id||'').slice(0,8)};
  const dt=v=>v?new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'medium'}).format(new Date(v)):'-';

  let html='<section class="panel"><h3>Log Aktivitas Pengguna</h3>'+
    '<p class="muted">Khusus Administrator. Log sistem bersifat baca saja dan tidak dapat diedit dari halaman ini.</p>'+
    '<form id="activityLogFilter" class="form-vertical compact-form">'+
      '<label>Pengguna<select name="actor"><option value="">Semua Pengguna</option>'+profiles.map(p=>'<option value="'+esc(p.user_id)+'">'+esc((p.full_name||'-')+' · '+p.role)+'</option>').join('')+'</select></label>'+
      '<label>Aktivitas<select name="event"><option value="">Semua Aktivitas</option><option>LOGIN</option><option>LOGOUT</option><option>SESSION_START</option><option>MENU_OPEN</option></select></label>'+
      '<label>Perangkat<select name="device"><option value="">Semua Perangkat</option><option>HP</option><option>DESKTOP</option></select></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="activityLogReset">Reset</button></div>'+
    '</form>'+
    '<p id="activityLogCount" class="muted"></p>'+
    '<div class="report-actions"><button type="button" id="activityLogPrint">Cetak</button> <button type="button" id="activityLogPdf">PDF</button> <button type="button" id="activityLogExcel">Excel</button></div>'+
    '<div class="tablewrap"><table id="activityLogTable"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Perangkat</th><th>Menu</th><th>Detail</th></tr></thead><tbody id="activityLogBody"></tbody></table></div>'+
    '</section>'+
    '<section class="panel"><h3>Audit Perubahan Data</h3><p class="muted">Riwayat INSERT / UPDATE / DELETE yang sudah dicatat backend.</p>'+
    '<div class="report-actions"><button type="button" id="auditLogPrint">Cetak</button> <button type="button" id="auditLogPdf">PDF</button> <button type="button" id="auditLogExcel">Excel</button></div>'+
    '<div class="tablewrap"><table id="auditLogTable"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Tabel</th><th>ID Data</th></tr></thead><tbody>'+
    audits.map(x=>'<tr><td>'+esc(dt(x.occurred_at))+'</td><td>'+esc(nameFor(x.actor))+'</td><td>'+esc(x.action||'-')+'</td><td>'+esc(x.table_name||'-')+'</td><td>'+esc(x.record_id||'-')+'</td></tr>').join('')+
    '</tbody></table></div>'+(audits.length?'':'<p class="muted">Belum ada audit perubahan data.</p>')+'</section>';

  layout(html);
  if(err)msg(err.message);

  const form=document.getElementById('activityLogFilter'),body=document.getElementById('activityLogBody'),count=document.getElementById('activityLogCount');
  const renderRows=()=>{
    const fd=new FormData(form),actor=String(fd.get('actor')||''),event=String(fd.get('event')||''),device=String(fd.get('device')||'');
    const rows=logs.filter(x=>(!actor||x.actor===actor)&&(!event||x.event_type===event)&&(!device||x.device_type===device));
    body.innerHTML=rows.map(x=>'<tr><td>'+esc(dt(x.occurred_at))+'</td><td>'+esc(nameFor(x.actor))+'</td><td>'+esc(x.event_type||'-')+'</td><td>'+esc(x.device_type||'-')+'</td><td>'+esc(title[x.tab_key]||x.tab_key||'-')+'</td><td>'+esc(x.detail?.label||x.detail?.role||'-')+'</td></tr>').join('');
    count.textContent=rows.length+' aktivitas ditampilkan (maksimal 500 log terbaru).';
    if(!rows.length)body.innerHTML='<tr><td colspan="6" class="muted">Belum ada aktivitas sesuai filter.</td></tr>';
  };
  form.onsubmit=e=>{e.preventDefault();renderRows()};
  document.getElementById('activityLogReset').onclick=()=>{form.reset();renderRows()};
  renderRows();
  bindTableExportActions({tableId:'activityLogTable',printId:'activityLogPrint',pdfId:'activityLogPdf',excelId:'activityLogExcel',title:'Log Aktivitas Pengguna',filename:'Log_Aktivitas_Pengguna'});
  bindTableExportActions({tableId:'auditLogTable',printId:'auditLogPrint',pdfId:'auditLogPdf',excelId:'auditLogExcel',title:'Audit Perubahan Data',filename:'Audit_Perubahan_Data'});
}

async function adminDataArchivePage(){
  if(!['ADMIN','OWNER'].includes(profile?.role))return layout('<section class="panel"><h3>Akses Dikunci</h3><p class="muted">Hanya Administrator dan Owner yang dapat melihat Arsip Data.</p></section>');
  if(profile?.role==='OWNER')return layout('<section class="panel"><h3>Arsip Data</h3><p class="muted">Mode Owner · baca saja. Menu tersedia untuk melihat fungsi arsip/recovery, tetapi export dan backup tetap khusus Administrator.</p><div class="owner-empty-ok">Backup/recovery dikelola Administrator. Tidak ada aksi perubahan untuk akun Owner.</div></section>');
  layout('<section class="panel"><h3>Arsip Data</h3><p class="muted">Seluruh tabel diambil dalam satu snapshot. Excel memiliki satu sheet per tabel. Backup pemulihan mencakup data dan akun, disimpan terenkripsi.</p><label>Password backup<input id="archiveBackupPassword" type="password" minlength="12" autocomplete="new-password" placeholder="Minimal 12 karakter"></label><p class="muted">Simpan password backup di tempat aman. File hanya dapat dibuka dengan password tersebut.</p><div class="inline-actions"><button type="button" id="exportAllDataBtn">Export Semua Data Excel</button><button type="button" id="exportAllBackupBtn">Simpan Backup Terenkripsi</button></div><p id="exportAllDataStatus" class="muted"></p></section>');
  const buttons=[document.getElementById('exportAllDataBtn'),document.getElementById('exportAllBackupBtn')],status=document.getElementById('exportAllDataStatus');
  const run=async kind=>{
    const password=document.getElementById('archiveBackupPassword').value;
    if(kind==='json'&&password.length<12)return msg('Password backup minimal 12 karakter.');
    buttons.forEach(b=>b.disabled=true);status.textContent='Mengambil snapshot seluruh data…';
    try{
      const {data:archive,error}=await db.rpc(kind==='json'?'bms_export_recovery_document':'bms_export_archive');if(error)throw error;
      const names=Object.keys(archive.tables||{}).sort();
      if(names.length!==archive.table_count||names.some(n=>(archive.tables[n]||[]).length!==archive.row_counts[n]))throw new Error('Jumlah data tidak sesuai manifest backup.');
      const date=String(archive.generated_at).slice(0,10),base='BMS_SEMUA_DATA_'+date;
      if(kind==='json'){status.textContent='Mengenkripsi backup pemulihan…';BMSCore.download(await BMSCore.encryptRecovery(archive,password),base+'.bmsbackup')}
      else{
        const sheets=[{name:'BMS_MANIFEST',rows:[['Tabel','Jumlah baris','Checksum snapshot'],...names.map(n=>[n,archive.row_counts[n],archive.checksum])]}];
        for(const name of names){const rows=archive.tables[name],cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];sheets.push({name,rows:[cols.length?cols:['Tidak ada data'],...rows.map(r=>cols.map(c=>r[c]))]})}
        BMSCore.downloadWorkbook(sheets,base);
      }
      status.textContent='Export selesai: '+names.length+' tabel, '+Object.values(archive.row_counts).reduce((a,b)=>a+Number(b),0)+' baris.';
      msg('Export seluruh data berhasil.',true);
    }catch(error){status.textContent='Export gagal: '+(error?.message||'tidak diketahui');msg(status.textContent)}
    finally{if(kind==='json')document.getElementById('archiveBackupPassword').value='';buttons.forEach(b=>b.disabled=false)}
  };
  buttons[0].onclick=()=>run('excel');buttons[1].onclick=()=>run('json');
}

async function assetMasterPage(){
  const [ar,br]=await Promise.all([
    db.from('barn_assets').select('*').order('acquired_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('barns').select('id,code,name').order('code',{ascending:true})
  ]);
  const rows=ar.data||[],barnRows=br.data||[],err=ar.error||br.error;
  window.__assetMasterFilter=window.__assetMasterFilter||{barn:'',location:'',name:'',status:'',shown:false};
  const st=window.__assetMasterFilter;
  const filtered=st.shown?rows.filter(x=>(!st.barn||x.barn_id===st.barn)&&(!st.location||x.location_type===st.location)&&(!st.name||String(x.name||'').toLowerCase().includes(st.name))&&(!st.status||String(x.status||'')===st.status)):[];
  let html='<section class="panel"><h3>Aset Kandang / Kantor</h3><p class="muted">READ ONLY. Sumber aset tetap berasal dari transaksi pembelian/distribusi.</p>'+
    '<form id="assetMasterFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Lokasi<select name="location"><option value="">Semua Lokasi</option><option value="KANDANG" '+(st.location==='KANDANG'?'selected':'')+'>Kandang</option><option value="KANTOR" '+(st.location==='KANTOR'?'selected':'')+'>Kantor</option></select></label>'+
      '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barnRows.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Nama Aset<input name="name" value="'+esc(st.name||'')+'" placeholder="Cari nama aset"></label>'+
      '<label>Status<select name="status"><option value="">Semua Status</option>'+['AKTIF','DIPINDAHKAN','DIJUAL','DINONAKTIFKAN'].map(v=>'<option value="'+v+'" '+(st.status===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="assetMasterReset">Reset</button></div></form>'+
    (st.shown?'<div class="report-actions"><button type="button" id="assetMasterPrint">Cetak</button> <button type="button" id="assetMasterPdf">PDF</button> <button type="button" id="assetMasterExcel">Excel</button></div><div class="tablewrap"><table id="assetMasterTable"><thead><tr><th>Tanggal</th><th>Lokasi</th><th>Nama</th><th>Kategori</th><th>Jumlah</th><th>Satuan</th><th>Nilai</th><th>Kondisi</th><th>Status</th></tr></thead><tbody>'+
      filtered.map(x=>'<tr><td>'+prodDateId(x.acquired_on||'')+'</td><td>'+esc(x.location_type==='KANTOR'?'Kantor':shortBarnLabel(barnRows.find(b=>b.id===x.barn_id)))+'</td><td>'+esc(x.name||'-')+'</td><td>'+esc(x.category||'-')+'</td><td>'+prodFmt(x.quantity,2)+'</td><td>'+esc(x.unit||'-')+'</td><td>Rp '+prodFmt(x.acquisition_value,0)+'</td><td>'+esc(x.condition||'-')+'</td><td>'+esc(x.status||'-')+'</td></tr>').join('')+'</tbody></table></div>'+(filtered.length?'':'<p class="muted">Data aset tidak ditemukan.</p>'):'<p class="muted">Pilih filter lalu tekan Tampilkan.</p>')+'</section>';
  layout(html);if(err)msg(err.message);
  const form=document.getElementById('assetMasterFilter');if(form)form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);st.location=String(fd.get('location')||'');st.barn=String(fd.get('barn')||'');st.name=String(fd.get('name')||'').trim().toLowerCase();st.status=String(fd.get('status')||'');st.shown=true;await assetMasterPage();};
  const reset=document.getElementById('assetMasterReset');if(reset)reset.onclick=async()=>{window.__assetMasterFilter={barn:'',location:'',name:'',status:'',shown:false};await assetMasterPage();};
  if(st.shown)bindTableExportActions({tableId:'assetMasterTable',printId:'assetMasterPrint',pdfId:'assetMasterPdf',excelId:'assetMasterExcel',title:'Daftar Aset',filename:'Daftar_Aset'});
}

async function render(){if(!canViewTab(tab))return layout('<section class="panel"><h3>Akses Dikunci</h3><p class="muted">Menu ini terlihat pada semua akun, tetapi akun '+esc(profile.role)+' tidak memiliki hak akses untuk membukanya.</p></section>');if(['owner_logistics_report','owner_marketing_report','owner_finance_report','owner_production_report','owner_ppl_report'].includes(tab)&&['OWNER','ADMIN'].includes(profile.role))return ownerReportPendingPage();if(tab==='dashboard')return dashboard();if(tab==='master_peralatan_kandang')return barnEquipmentMasterPage();if(tab==='inventori_fisik')return barnPhysicalInventoryPage();if(tab==='finance_mandiri_piutang')return financeMandiriReceivablePage();if(tab==='finance_mandiri_penerimaan')return financeMandiriReceiptsPage();if(tab==='finance_mandiri_hutang')return financeMandiriSupplierDebtPage();if(tab==='finance_mandiri_pembayaran')return financeMandiriSupplierPaymentPage();if(tab==='finance_mandiri_laporan')return financeMandiriReportPage();if(tab==='kandang')return barnMasterPage();if(tab==='item')return itemMasterPage();if(tab==='supplier_sapronak')return supplierMasterPage('SAPRONAK');if(tab==='supplier_daging')return supplierMasterPage('DAGING');if(tab==='logistik_kontrak')return logisticsContractPage();if(tab==='logistik_pembelian_mandiri')return logisticsMandiriPurchasePage();if(tab==='logistik_pengiriman')return logisticsShippingPage();if(['logistik_kiriman_luar','logistik_pakan_luar','logistik_doc_luar','logistik_ovk1_luar'].includes(tab))return logisticsExternalShippingPage();if(tab==='logistik_beli_peralatan')return logisticsEquipmentPurchasePage();if(tab==='marketing_pelanggan')return marketingCustomerPage();if(tab==='marketing_panen_kontrak')return marketingContractHarvestPage(null,'MITRA');if(tab==='marketing_panen_mandiri')return marketingContractHarvestPage(null,'MANDIRI');if(tab==='marketing_tambah_daging')return marketingExternalMeatPage();if(tab==='marketing_laporan')return marketingReports();if(tab==='logistik_retur')return logisticsReturnPage();if(tab==='logistik_retur_sebagian')return logisticsPartialReturnPage();if(tab==='logistik_retur_luar')return logisticsExternalReturnPage();if(tab==='kontrak')return contractMasterPage();if(tab==='standar_performa')return performanceMasterPage();if(tab==='reset_klasemen')return resetKlasemenAbkPage();if(tab==='karyawan')return employeeMasterPage();if(tab==='profil')return profilePage();if(tab==='perusahaan')return companyProfilePage();if(tab==='admin_cycle_lock')return adminCycleLockPage();if(tab==='admin_log_aktivitas')return adminUserActivityLogPage();if(tab==='arsip_data')return adminDataArchivePage();if(tab==='logistik_laporan')return logisticsReports();if(tab==='chick_in')return chickInPage();if(tab==='recording')return recordingPplPage();if(tab==='kunjungan')return productionVisitPage();if(tab==='estimasi')return productionEstimatePage();if(tab==='liga_abk')return leagueAbkPage();if(tab==='ppl_liga_kandang_view')return leagueByBarnViewPage();if(tab==='rekap_produksi')return productionRecapPage();if(tab==='ppl_rhpp_view')return pplRhppViewPage();if(tab==='ppl_rhpp_abk_view')return pplRhppAbkViewPage();if(tab==='rhpp_history')return adminRhppHistoryPage();if(tab==='rhpp')return ['ADMIN','OWNER'].includes(profile.role)?financeRhppPage():financeRhppRealPage();if(tab==='finance_rhpp_real')return financeRhppRealPage();if(tab==='bop')return financeBopPage();if(tab==='form_pengajuan_kas')return financeCashRequestPage();if(tab==='laba_rugi_kandang')return financeBarnProfitLossPage();if(tab==='laba_rugi_global')return financeGlobalProfitLossPage();if(tab==='perawatan_kandang')return financeMaintenancePage();if(tab==='aset_kandang')return assetMasterPage();if(tab==='finance_pembelian_langsung')return financeDirectPurchasePage();if(tab==='finance_beli_stok')return financeStockPurchasePage();if(tab==='logistik_stok_barang')return logisticsWarehouseStockPage();if(tab==='logistik_kirim_stok')return logisticsWarehouseSendPage();if(tab==='hutang_supplier')return financeSupplierPayablesPage();if(tab==='bop_umum')return financeBopGeneralPage();if(tab==='expedisi_master')return financeExpeditionMasterPage();if(tab==='expedisi_usaha')return financeExpeditionBusinessPage();if(tab==='expedisi_pembayaran')return financeExpeditionPaymentPage();if(tab==='bop_expedisi')return financeExpeditionBopPage();if(tab==='perawatan_expedisi')return financeExpeditionMaintenancePage();if(tab==='laporan_expedisi')return financeExpeditionProfitLossPage();if(tab==='kasbon')return financeAdvancePage();if(tab==='cicilan')return financeAdvancePaymentPage();if(tab==='gaji_abk')return financeSalaryPage();if(tab==='arus_kas')return financeCashflowPage();if(tab==='laporan_keuangan')return financeReportPage();if(tab==='laporan'&&profile.role==='LOGISTIK')return logisticsReports();if(tab==='laporan')return reports();if(tab==='pengguna')return users();await ensureLegacyData();const m=modules[tab],can=roles[tab].includes(profile.role);const {data,error}=await db.from(m.table).select('*').order(tab==='kandang'?'created_at':tab==='siklus'?'created_at':tab==='sapronak'?'created_at':tab==='rhpp'?'created_at':'id',{ascending:false});const rows=data||[];const dateField=(m.fields.find(f=>f[2]==='date')||[])[0]||null;const genericBarnField=m.fields.some(f=>f[2]==='barn');const txnGeneric=dateField?txnListState(rows,'generic_'+tab,dateField,5,genericBarnField?barns:null,'barn_id'):null;const displayRows=txnGeneric?txnGeneric.rows:rows;let html=['kontrak','harga_hidup','bonus_kontrak','standar_performa'].includes(tab)?'<p>Masukkan angka dari kontrak yang ditandatangani. Periksa ulang foto acuan sebelum menyimpan harga atau ambang performa.</p>':tab==='aset_kandang'?'<p><strong>Daftar Aset otomatis.</strong> Aset berasal dari Keuangan → Pembelian Barang langsung ke Kandang/Kantor atau dari Logistik → Kirim Barang dari Gudang. Menu ini tidak dipakai untuk input pembelian.</p>':'';if(tab==='aset_kandang'){
  const grouped=new Map();
  rows.forEach(x=>{
    const key=[x.location_type||'KANDANG',x.barn_id||'',String(x.name||'').trim().toLowerCase(),String(x.unit||'').trim().toUpperCase()].join('|');
    const g=grouped.get(key)||{location_type:x.location_type||'KANDANG',barn_id:x.barn_id,name:x.name||'-',unit:x.unit||'-',quantity:0,value:0,entries:0};
    g.quantity+=prodNum(x.quantity);g.value+=prodNum(x.acquisition_value);g.entries+=1;grouped.set(key,g);
  });
  const summary=[...grouped.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  html+='<section class="panel"><h3>Rekap Kumulatif Aset</h3><p class="muted">Dikelompokkan otomatis berdasarkan Nama Standar + Lokasi + Satuan. Riwayat pembelian asli tetap tersimpan per tanggal.</p><div class="tablewrap"><table><thead><tr><th>Lokasi</th><th>Nama Standar</th><th>Jumlah Total</th><th>Nilai Total</th><th>Transaksi</th></tr></thead><tbody>'+
    summary.map(x=>'<tr><td>'+esc(x.location_type==='KANTOR'?'Kantor':shortBarnLabel(barns.find(b=>b.id===x.barn_id)))+'</td><td><strong>'+esc(x.name)+'</strong></td><td>'+prodFmt(x.quantity,2)+' '+esc(x.unit)+'</td><td>Rp '+prodFmt(x.value,0)+'</td><td>'+x.entries+'</td></tr>').join('')+
    '</tbody></table></div>'+(summary.length?'':'<p class="muted">Belum ada aset.</p>')+'</section>';
}html+=(can&&tab!=='aset_kandang')?'<section class="panel"><h3>Tambah '+title[tab]+'</h3><form id="entry">'+m.fields.map(field).join('')+(tab==='kontrak'?'<button type="button" id="fillPhoto">Isi harga sapronak dari foto</button>':'')+'<button>Simpan</button></form></section>':'';if(tab==='kontrak'){html+='<section class="panel"><h3>Status Kelengkapan Kontrak</h3><div class="tablewrap"><table><tr><th>Kontrak</th><th>Status</th><th>Komponen kurang</th></tr>'+contractReadiness.map(x=>'<tr><td>'+esc(x.number)+'</td><td>'+(x.is_complete?'Lengkap':'Belum Lengkap')+'</td><td>'+esc((x.missing_components||[]).join(', ')||'-')+'</td></tr>').join('')+'</table></div>'+(!contractReadiness.length?'<p>Belum ada kontrak.</p>':'')+'</section>';}{const displayFields=(autoCodeTabs.has(tab)?[['code','Kode'],...m.fields]:m.fields).slice(0,6);html+='<section class="panel"><h3>Data '+title[tab]+'</h3>'+(txnGeneric?txnGeneric.controls:'')+'<div class="tablewrap"><table><thead><tr>'+displayFields.map(f=>'<th>'+f[1]+'</th>').join('')+'</tr></thead><tbody>'+displayRows.map(row=>'<tr>'+displayFields.map(f=>'<td>'+cellValue(row,f)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(!(txnGeneric?txnGeneric.total:rows.length)?'<p>Belum ada data.</p>':'')+(txnGeneric?txnGeneric.pager:'')+'</section>';}layout(html);bindNumberInputs();bindComputedWeights();bindItemUnit();if(txnGeneric)bindTxnList(txnGeneric,()=>render());if(error)msg(error.message);if(tab==='kontrak'&&can)document.getElementById('fillPhoto').onclick=()=>{const f=document.getElementById('entry');for(const [k,v] of Object.entries({doc_price:9000,pre_starter_price:10350,starter_price:10100,finisher_price:10000,ovk_price_basis:'DISTRIBUTOR_PLUS_VAT'}))f.elements[k].value=v;msg('Harga sapronak dari foto terisi. Verifikasi kontrak dan isi persentase PPN sebelum menyimpan.',true)};if(can&&tab!=='aset_kandang')document.getElementById('entry').onsubmit=async e=>{e.preventDefault();let o={};for(const [k,,t] of m.fields){let v=new FormData(e.target).get(k);if(v!==''&&v!=null){const nv=t==='number'?normalizeInputID(v):v;if(nv!==null)o[k]=nv}}const {error}=tab==='perusahaan'?await db.from(m.table).upsert({id:true,...o}):await db.from(m.table).insert(o);if(error)msg(error.message);else {await load();msg('Data tersimpan.',true)}}}
