// Inventori fisik terpisah dari perolehan aset dan laporan keuangan.
async function barnEquipmentMasterPage(){
  if(profile?.role!=='ADMIN')return layout('<section class="panel">Master peralatan hanya untuk Administrator.</section>');
  const {data,error}=await db.from('barn_equipment_types').select('*').order('name');
  const rows=data||[];
  const unitOptions=['UNIT','PCS','BUAH','SET','PAKET','PASANG','ROLL','METER','LITER','KG','ZAK','BOX','DUS','BOTOL'];
  const state=window.__barnEquipmentMasterState||{query:'',editId:''};
  window.__barnEquipmentMasterState=state;
  const unitSelect='<select name="unit" required>'+unitOptions.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select>';
  layout('<section class="panel"><h3>Master Peralatan Kandang</h3><p class="muted">Kode dibuat otomatis saat disimpan. Kategori tersimpan otomatis sebagai PERALATAN.</p>'+
    '<form id="equipmentTypeForm" class="form-vertical">'+
    '<label>Kode Peralatan<input id="equipmentCodePreview" readonly value="Otomatis saat disimpan"></label>'+
    '<label>Nama Peralatan<input name="name" required maxlength="150" placeholder="Contoh: Tempat Pakan"></label>'+
    '<label>Satuan'+unitSelect+'</label>'+
    '<label>Keterangan<input name="notes"></label>'+
    '<div class="report-actions"><button type="submit" id="equipmentSave">Simpan Master</button><button type="button" id="equipmentCancelEdit" hidden>Batal Edit</button></div></form></section>'+
    '<section class="panel"><h3>Daftar Master</h3>'+
    '<label>Cari Peralatan<input id="equipmentMasterSearch" type="search" placeholder="Cari kode, nama, satuan, atau keterangan" value="'+esc(state.query)+'"></label>'+
    '<p class="muted" id="equipmentSearchCount"></p>'+
    '<div class="tablewrap"><table><thead><tr><th>Kode</th><th>Nama Peralatan</th><th>Satuan</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="equipmentMasterRows"></tbody></table></div></section>');
  if(error)msg(error.message);
  const form=document.getElementById('equipmentTypeForm');
  const search=document.getElementById('equipmentMasterSearch');
  const list=document.getElementById('equipmentMasterRows');
  const count=document.getElementById('equipmentSearchCount');
  const cancel=document.getElementById('equipmentCancelEdit');
  const codePreview=document.getElementById('equipmentCodePreview');
  const applyEdit=()=>{
    const item=rows.find(x=>x.id===state.editId);
    if(!item){state.editId='';form.reset();codePreview.value='Otomatis saat disimpan';cancel.hidden=true;return;}
    codePreview.value=item.code;
    form.elements.name.value=item.name||'';
    if(!unitOptions.includes(item.unit)){
      const option=document.createElement('option');option.value=item.unit;option.textContent=item.unit;form.elements.unit.appendChild(option);
    }
    form.elements.unit.value=item.unit||'UNIT';
    form.elements.notes.value=item.notes||'';
    cancel.hidden=false;
  };
  const redraw=()=>{
    const term=state.query.trim().toLocaleLowerCase('id-ID');
    const filtered=rows.filter(x=>[x.code,x.name,x.unit,x.notes].some(v=>String(v||'').toLocaleLowerCase('id-ID').includes(term)));
    count.textContent=filtered.length+' dari '+rows.length+' peralatan';
    list.innerHTML=filtered.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.unit)+'</td><td>'+(x.active?'Aktif':'Nonaktif')+'</td><td><button type="button" data-equipment-edit="'+esc(x.id)+'">Edit</button></td></tr>').join('')||'<tr><td colspan="5">Peralatan tidak ditemukan.</td></tr>';
    list.querySelectorAll('[data-equipment-edit]').forEach(btn=>btn.onclick=()=>{
      state.editId=btn.dataset.equipmentEdit;
      applyEdit();form.scrollIntoView({behavior:'smooth',block:'start'});
    });
  };
  search.oninput=()=>{state.query=search.value;redraw();};
  cancel.onclick=()=>{state.editId='';applyEdit();};
  applyEdit();redraw();
  form.onsubmit=async ev=>{
    ev.preventDefault();
    const f=new FormData(form);
    const obj={name:String(f.get('name')||'').trim(),unit:String(f.get('unit')||'').trim().toUpperCase(),notes:String(f.get('notes')||'').trim()};
    if(!obj.name||!obj.unit)return msg('Nama dan satuan wajib diisi.');
    // Kode dan kategori tidak dikirim saat edit; kode ditetapkan oleh trigger database saat insert.
    const result=state.editId
      ?await db.from('barn_equipment_types').update(obj).eq('id',state.editId)
      :await db.from('barn_equipment_types').insert({...obj,category:'PERALATAN',code:'AUTO'});
    if(result.error)return msg(result.error.message);
    state.editId='';
    await barnEquipmentMasterPage();msg('Master peralatan tersimpan.',true);
  };
}
async function barnPhysicalInventoryPage(){
  const role=profile?.role||'';
  if(!['ADMIN','OWNER','KEUANGAN','LOGISTIK','PPL'].includes(role))return layout('<section class="panel">Akses ditolak.</section>');
  const canWrite=['ADMIN','LOGISTIK'].includes(role);
  const [br,typesRes,invRes]=await Promise.all([
    db.from('barns').select('id,code,name').order('code'),
    db.from('barn_equipment_types').select('id,code,name,unit,category,active').order('name'),
    db.from('barn_equipment_inventory').select('*').order('checked_on',{ascending:false})
  ]);
  const firstError=[br,typesRes,invRes].find(r=>r.error)?.error;
  if(firstError)return layout('<section class="panel"><h3>Inventori Peralatan Kandang</h3><p class="error">'+esc(firstError.message)+'</p></section>');
  const barnsRows=br.data||[],types=typesRes.data||[],entries=invRes.data||[];
  const old=window.__barnInventoryState||{barnId:'',shown:false,editId:''};
  window.__barnInventoryState=old;
  const found=entries.find(x=>x.id===old.editId);
  const barnOptions=barnsRows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.name)+'</option>').join('');
  const typeOptions=types.filter(x=>x.active||x.id===found?.equipment_type_id).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.code+' · '+x.name+' ('+x.unit+')')+'</option>').join('');
  const filtered=old.shown?entries.filter(x=>!old.barnId||x.barn_id===old.barnId):[];
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const typeOf=id=>types.find(x=>x.id===id)||{};
  const barnOf=id=>barnsRows.find(x=>x.id===id)||{};
  const tableRows=filtered.slice().sort((a,b)=>String(barnOf(a.barn_id).code||'').localeCompare(String(barnOf(b.barn_id).code||''))||String(typeOf(a.equipment_type_id).name||'').localeCompare(String(typeOf(b.equipment_type_id).name||'')));
  // Cetak opname juga menampilkan item master yang belum pernah dicatat.
  const printRows=tableRows.slice();
  const printBarns=old.barnId?barnsRows.filter(b=>b.id===old.barnId):barnsRows;
  for(const b of printBarns){
    for(const t of types.filter(x=>x.active)){
      if(!printRows.some(x=>x.barn_id===b.id&&x.equipment_type_id===t.id)){
        printRows.push({barn_id:b.id,equipment_type_id:t.id,quantity:null,condition:'-',checked_on:null,location_notes:'',notes:''});
      }
    }
  }
  printRows.sort((a,b)=>String(barnOf(a.barn_id).code||'').localeCompare(String(barnOf(b.barn_id).code||''))||String(typeOf(a.equipment_type_id).name||'').localeCompare(String(typeOf(b.equipment_type_id).name||'')));
  const table='<div class="tablewrap"><table><thead><tr><th>No.</th><th>Kandang</th><th>Kode</th><th>Nama Peralatan</th><th>Jumlah Data</th><th>Kondisi</th><th>Terakhir Dicek</th><th>Letak/Keterangan</th><th>Jumlah Fisik Dicek</th></tr></thead><tbody>'+
    printRows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(barnOf(x.barn_id).name||'-')+'</td><td>'+esc(typeOf(x.equipment_type_id).code||'-')+'</td><td>'+esc(typeOf(x.equipment_type_id).name||'-')+'</td><td>'+(x.quantity==null?'-':fmtNumber(x.quantity))+' '+esc(typeOf(x.equipment_type_id).unit||'')+'</td><td>'+esc(x.condition)+'</td><td>'+esc(x.checked_on||'-')+'</td><td>'+esc([x.location_notes,x.notes].filter(Boolean).join(' · ')||'-')+'</td><td>____________</td></tr>').join('')+
    '</tbody></table></div>';
  const formHtml=canWrite?'<section class="panel"><h3>Input / Koreksi Inventori Fisik</h3><p class="muted">Pencatatan ini tidak memengaruhi stok gudang, transaksi pembelian, RHPP maupun laba/rugi.</p>'+
    '<form id="physicalInventoryForm" class="form-vertical"><label>Kandang<select name="barn_id" required><option value="">Pilih Kandang</option>'+barnOptions+'</select></label>'+
    '<label>Jenis Peralatan<select name="equipment_type_id" required><option value="">Pilih Peralatan</option>'+typeOptions+'</select></label>'+
    '<label>Jumlah Fisik<input name="quantity" type="number" min="0" step="0.01" required></label>'+
    '<label>Kondisi<select name="condition"><option>BAIK</option><option>PERLU_PERBAIKAN</option><option>RUSAK</option></select></label>'+
    '<label>Tanggal Pengecekan<input type="date" name="checked_on" required value="'+today+'"></label>'+
    '<label>Lokasi Penyimpanan<input name="location_notes" placeholder="Contoh: Gudang Kandang 1"></label>'+
    '<label>Catatan<input name="notes"></label><div class="report-actions"><button type="submit">Simpan Inventori</button><button type="button" id="inventoryReset">Batal Edit</button></div></form></section>':'';
  layout(formHtml+'<section class="panel"><h3>Daftar Inventori Fisik Peralatan Kandang</h3>'+
    '<div class="form-vertical"><label>Filter Kandang<select id="inventoryBarnFilter"><option value="">Semua Kandang</option>'+barnOptions+'</select></label>'+
    '<div class="report-actions"><button id="inventoryShow" type="button">Tampilkan Daftar</button><button id="inventoryPrint" type="button">Cetak List Inventori Fisik</button></div></div>'+
    '<div id="inventoryPrintArea"><h3>LIST INVENTORI FISIK PERALATAN KANDANG</h3><p>Lokasi: '+esc(old.barnId?(barnOf(old.barnId).name||'-'):'Semua Kandang')+' · Tanggal cetak: '+esc(today)+'</p>'+table+
    '<p>Petugas pemeriksa: ________________________ &nbsp;&nbsp; Tanda tangan: ________________________</p></div>'+
    (canWrite&&old.shown?'<div class="tablewrap"><table><thead><tr><th>Peralatan</th><th>Kandang</th><th>Aksi</th></tr></thead><tbody>'+tableRows.map(x=>'<tr><td>'+esc(typeOf(x.equipment_type_id).name||'-')+'</td><td>'+esc(barnOf(x.barn_id).name||'-')+'</td><td><button data-inventory-edit="'+esc(x.id)+'" type="button">Edit Data</button></td></tr>').join('')+'</tbody></table></div>':'')+
    '</section>');
  const filter=document.getElementById('inventoryBarnFilter');filter.value=old.barnId;
  filter.onchange=()=>{old.barnId=filter.value;old.shown=false;};
  document.getElementById('inventoryShow').onclick=async()=>{old.shown=true;await barnPhysicalInventoryPage();};
  document.getElementById('inventoryPrint').onclick=async()=>{if(!old.shown){old.shown=true;await barnPhysicalInventoryPage();}printFinanceDocument('inventoryPrintArea','List Inventori Fisik Peralatan Kandang');};
  if(canWrite){
    const form=document.getElementById('physicalInventoryForm');
    if(found){
      for(const key of ['barn_id','equipment_type_id','quantity','condition','checked_on','location_notes','notes'])if(form.elements[key])form.elements[key].value=found[key]??'';
    }
    document.getElementById('inventoryReset').onclick=async()=>{old.editId='';await barnPhysicalInventoryPage();};
    form.onsubmit=async ev=>{
      ev.preventDefault();const f=new FormData(form);
      const obj={barn_id:String(f.get('barn_id')||''),equipment_type_id:String(f.get('equipment_type_id')||''),quantity:Number(f.get('quantity')),condition:String(f.get('condition')),checked_on:String(f.get('checked_on')),location_notes:String(f.get('location_notes')||'').trim(),notes:String(f.get('notes')||'').trim()};
      if(!obj.barn_id||!obj.equipment_type_id||!Number.isFinite(obj.quantity)||obj.quantity<0)return msg('Periksa isian inventori.');
      const duplicate=entries.find(x=>x.barn_id===obj.barn_id&&x.equipment_type_id===obj.equipment_type_id&&x.condition===obj.condition&&x.id!==old.editId);
      if(duplicate)return msg('Jenis peralatan dan kondisi ini sudah tercatat di kandang tersebut. Gunakan Edit Data agar tidak menggandakan jumlah.');
      const res=old.editId?await db.from('barn_equipment_inventory').update(obj).eq('id',old.editId):await db.from('barn_equipment_inventory').insert(obj);
      if(res.error)return msg(res.error.message);
      old.editId='';old.barnId=obj.barn_id;old.shown=true;await barnPhysicalInventoryPage();msg('Inventori fisik tersimpan.',true);
    };
    root.querySelectorAll('[data-inventory-edit]').forEach(btn=>btn.onclick=async()=>{old.editId=btn.dataset.inventoryEdit;await barnPhysicalInventoryPage();});
  }
}
