async function companyProfilePage(){
  const {data,error}=await db.from('company_profile').select('*').eq('id',true).maybeSingle();
  const x=data||{};
  let html='<section class="panel"><h3>Data Perusahaan</h3>'+
    '<p class="muted">Data ini menjadi kop resmi Cetak/PDF laporan.</p>'+
    '<form id="companyProfileForm" class="form-vertical">'+
      '<label>Logo Perusahaan<input type="file" id="companyLogoFile" accept="image/png,image/jpeg,image/webp"></label>'+
      '<div id="companyLogoPreview">'+(x.logo_url?'<img src="'+esc(x.logo_url)+'" alt="Logo Perusahaan" style="max-width:180px;max-height:120px;object-fit:contain;background:#fff;padding:8px;border-radius:8px">':'<p class="muted">Belum ada logo.</p>')+'</div>'+
      '<input type="hidden" name="logo_url" id="companyLogoData" value="'+esc(x.logo_url||'')+'">'+
      '<label>Nama Perusahaan<input name="company_name" value="'+esc(x.company_name||'')+'" required></label>'+
      '<label>Nama Legal<input name="legal_name" value="'+esc(x.legal_name||'')+'"></label>'+
      '<label>Alamat<textarea name="address" required>'+esc(x.address||'')+'</textarea></label>'+
      '<label>Telepon / WhatsApp<input name="phone" value="'+esc(x.phone||'')+'"></label>'+
      '<label>Email<input type="email" name="email" value="'+esc(x.email||'')+'"></label>'+
      '<label>Website<input name="website" value="'+esc(x.website||'')+'"></label>'+
      '<label>NPWP<input name="tax_number" value="'+esc(x.tax_number||'')+'"></label>'+
      '<label>Nomor Usaha<input name="business_id" value="'+esc(x.business_id||'')+'"></label>'+
      '<label>Penandatangan<input name="signatory_name" value="'+esc(x.signatory_name||'')+'"></label>'+
      '<label>Jabatan Penandatangan<input name="signatory_title" value="'+esc(x.signatory_title||'')+'"></label>'+
      '<button type="submit">Simpan Data Perusahaan</button>'+
    '</form></section>';
  layout(html);
  if(error)msg(error.message);
  const file=document.getElementById('companyLogoFile');
  const logoData=document.getElementById('companyLogoData');
  const preview=document.getElementById('companyLogoPreview');
  file.onchange=()=>{
    const picked=file.files&&file.files[0];
    if(!picked)return;
    if(!/^image\/(png|jpeg|webp)$/.test(picked.type))return msg('Logo harus PNG, JPG, atau WEBP.');
    if(picked.size>1024*1024)return msg('Ukuran logo maksimal 1 MB.');
    const reader=new FileReader();
    reader.onload=()=>{
      logoData.value=String(reader.result||'');
      preview.innerHTML='<img src="'+esc(logoData.value)+'" alt="Logo Perusahaan" style="max-width:180px;max-height:120px;object-fit:contain;background:#fff;padding:8px;border-radius:8px">';
    };
    reader.readAsDataURL(picked);
  };
  document.getElementById('companyProfileForm').onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(ev.currentTarget);
    const payload={
      id:true,
      logo_url:fd.get('logo_url')||null,
      company_name:fd.get('company_name'),
      legal_name:fd.get('legal_name')||null,
      address:fd.get('address'),
      phone:fd.get('phone')||null,
      email:fd.get('email')||null,
      website:fd.get('website')||null,
      tax_number:fd.get('tax_number')||null,
      business_id:fd.get('business_id')||null,
      signatory_name:fd.get('signatory_name')||null,
      signatory_title:fd.get('signatory_title')||null,
      updated_at:new Date().toISOString()
    };
    const {error}=await db.from('company_profile').upsert(payload);
    if(error)return msg(error.message);
    await companyProfilePage();
    msg('Data Perusahaan dan logo berhasil disimpan.',true);
  };
}

async function contractMasterPage(){
  const can=roles.kontrak.includes(profile.role);
  const [kr,pr,br]=await Promise.all([
    db.from('contracts').select('*').is('cycle_id',null).order('contract_date',{ascending:false,nullsFirst:false}).order('number',{ascending:true}),
    db.from('contract_live_prices').select('*').order('min_weight_kg',{ascending:true}),
    db.from('contract_bonuses').select('*').order('metric',{ascending:true}).order('min_value',{ascending:true})
  ]);

  const templates=kr.data||[];
  const selectedId=sessionStorage.getItem('bms_selected_contract_template');
  const selected=templates.find(x=>x.id===selectedId)||templates.find(x=>x.number==='MASTER-001')||templates[0]||null;
  const prices=selected?(pr.data||[]).filter(x=>x.contract_id===selected.id):[];
  const bonuses=selected?(br.data||[]).filter(x=>x.contract_id===selected.id):[];
  const ipRows=bonuses.filter(x=>x.metric==='IP');
  const fcrRows=bonuses.filter(x=>x.metric==='FCR_DIFFERENCE');
  const depletionRows=bonuses.filter(x=>x.metric==='DEPLETION');
  const contractLocked=!!selected?.frozen_at;
  const canEditContract=can&&!contractLocked;

  let html='<section class="panel"><h3>Master Kontrak</h3><p class="muted">Master kontrak dipilih saat Logistik membuat Siklus Mitra per kandang.</p>'+
    (selected?(contractLocked?'<p><strong>Status: TERKUNCI</strong> · '+esc(prodDateId(String(selected.frozen_at).slice(0,10)))+' · revisi wajib Buat Kontrak Baru.</p>':'<p><strong>Status: BELUM DIKUNCI</strong> · setelah final, tekan Kunci Kontrak agar historinya tidak dapat berubah.</p>'):'');

  if(can){
    html+='<form id="contractInfoForm" class="form-vertical">'+
      '<input type="hidden" name="id" value="'+(selected?esc(selected.id):'')+'">'+
      '<label>Nama Kontrak<input name="number" value="'+(selected?esc(selected.number):'')+'" placeholder="Contoh: Bounty September 2026" required '+(contractLocked?'readonly':'')+'></label>'+
      '<label>Tanggal Berlaku<input name="contract_date" type="date" value="'+(selected&&selected.contract_date?esc(selected.contract_date):'')+'" '+(contractLocked?'disabled':'')+'></label>'+
      '<label>Template Performa<select name="performance_template_name" '+(contractLocked?'disabled':'')+'>'+
        '<option value="Performa Bounty" '+(selected?.performance_template_name==='Performa Bounty'?'selected':'')+'>Performa Bounty</option>'+
        '<option value="Performa BMS" '+(selected?.performance_template_name==='Performa BMS'?'selected':'')+'>Performa BMS</option>'+
      '</select></label>'+
      '<label>Keterangan<textarea name="signed_reference" placeholder="Keterangan kontrak" '+(contractLocked?'readonly':'')+'>'+(selected?esc(selected.signed_reference||''):'')+'</textarea></label>'+
      '<div class="form-actions">'+
        (canEditContract?'<button type="submit">Simpan Kontrak</button>':'')+
        '<button type="button" id="newContractTemplate">Buat Kontrak Baru</button>'+
        (selected&&!contractLocked?'<button type="button" id="lockContractTemplate">Kunci Kontrak</button>':'')+
      '</div>'+
    '</form>';
  }
  html+='</section>';

  html+='<section class="panel"><h3>Harga Sapronak Kontrak</h3>';
  if(canEditContract&&selected){
    html+='<form id="sapronakContractPriceForm" class="form-vertical compact-form">'+
      '<label>DOC (Rp/ekor)<input name="doc_price" data-number="1" inputmode="decimal" value="'+fmtNumber(selected.doc_price||0)+'" required></label>'+
      '<label>Pre Starter (Rp/kg)<input name="pre_starter_price" data-number="1" inputmode="decimal" value="'+fmtNumber(selected.pre_starter_price||0)+'" required></label>'+
      '<label>Starter (Rp/kg)<input name="starter_price" data-number="1" inputmode="decimal" value="'+fmtNumber(selected.starter_price||0)+'" required></label>'+
      '<label>Finisher (Rp/kg)<input name="finisher_price" data-number="1" inputmode="decimal" value="'+fmtNumber(selected.finisher_price||0)+'" required></label>'+
      '<label>Dasar Harga OVK<select name="ovk_price_basis"><option value="FIXED" '+(selected.ovk_price_basis==='FIXED'?'selected':'')+'>Harga Tetap</option><option value="DISTRIBUTOR_PLUS_VAT" '+(selected.ovk_price_basis==='DISTRIBUTOR_PLUS_VAT'?'selected':'')+'>Distributor + PPN</option></select></label>'+
      '<label>Harga OVK Tetap / Satuan<input name="ovk_price" data-number="1" inputmode="decimal" value="'+fmtNumber(selected.ovk_price||0)+'"></label>'+
      '<label>PPN OVK (%)<input name="ovk_vat_percent" data-number="1" inputmode="decimal" value="'+(selected.ovk_vat_percent==null?'':fmtNumber(selected.ovk_vat_percent))+'"></label>'+
      '<button type="submit">Simpan Harga Sapronak</button>'+
    '</form>';
  }
  html+='</section>';

  html+='<section class="panel"><h3>Harga Ayam Hidup</h3>';
  if(canEditContract&&selected){
    html+='<form id="priceRowForm" class="form-vertical compact-form">'+
      '<input type="hidden" name="id">'+
      '<label>Bobot Minimum (kg)<input name="min_weight_kg" data-number="1" inputmode="decimal" required></label>'+
      '<label>Bobot Maksimum (kg)<input name="max_weight_kg" data-number="1" inputmode="decimal" placeholder="Kosong = tanpa batas atas"></label>'+
      '<label>Harga (Rp/kg)<input name="price_per_kg" data-number="1" inputmode="decimal" required></label>'+
      '<button type="submit">Simpan Baris Harga</button>'+
    '</form>';
  }
  html+='<div class="tablewrap"><table><thead><tr><th>Bobot Min</th><th>Bobot Max</th><th>Harga/kg</th>'+(can?'<th>Aksi</th>':'')+'</tr></thead><tbody>'+
    prices.map(x=>'<tr><td>'+fmtNumber(x.min_weight_kg)+'</td><td>'+(x.max_weight_kg==null?'Tanpa batas':fmtNumber(x.max_weight_kg))+'</td><td>Rp '+fmtNumber(x.price_per_kg)+'</td>'+(can?'<td>'+(contractLocked?'Terkunci':'<button type="button" data-edit-price="'+esc(x.id)+'">Edit</button>')+'</td>':'')+'</tr>').join('')+
    '</tbody></table></div></section>';

  html+='<section class="panel"><h3>Bonus IP</h3>';
  if(canEditContract&&selected){
    html+='<form id="ipRowForm" class="form-vertical compact-form">'+
      '<input type="hidden" name="id">'+
      '<label>IP Minimum<input name="min_value" data-number="1" inputmode="decimal"></label>'+
      '<label>IP Maksimum<input name="max_value" data-number="1" inputmode="decimal"></label>'+
      '<label>Bonus (Rp/kg)<input name="rupiah_per_kg" data-number="1" inputmode="decimal" required></label>'+
      '<label>Keterangan<input name="notes"></label>'+
      '<button type="submit">Simpan Bonus IP</button>'+
    '</form>';
  }
  html+='<div class="tablewrap"><table><thead><tr><th>Min</th><th>Max</th><th>Bonus/kg</th><th>Keterangan</th>'+(can?'<th>Aksi</th>':'')+'</tr></thead><tbody>'+
    ipRows.map(x=>'<tr><td>'+(x.min_value==null?'-':fmtNumber(x.min_value))+'</td><td>'+(x.max_value==null?'-':fmtNumber(x.max_value))+'</td><td>Rp '+fmtNumber(x.rupiah_per_kg)+'</td><td>'+esc(x.notes||'')+'</td>'+(can?'<td>'+(contractLocked?'Terkunci':'<button type="button" data-edit-ip="'+esc(x.id)+'">Edit</button>')+'</td>':'')+'</tr>').join('')+
    '</tbody></table></div></section>';

  html+='<section class="panel"><h3>Bonus FCR</h3>';
  if(canEditContract&&selected){
    html+='<form id="fcrRowForm" class="form-vertical compact-form">'+
      '<input type="hidden" name="id">'+
      '<label>Selisih FCR Minimum<input name="min_value" data-number="1" inputmode="decimal"></label>'+
      '<label>Selisih FCR Maksimum<input name="max_value" data-number="1" inputmode="decimal"></label>'+
      '<label>Bonus (Rp/kg)<input name="rupiah_per_kg" data-number="1" inputmode="decimal" required></label>'+
      '<label>Keterangan<input name="notes"></label>'+
      '<button type="submit">Simpan Bonus FCR</button>'+
    '</form>';
  }
  html+='<div class="tablewrap"><table><thead><tr><th>Min</th><th>Max</th><th>Bonus/kg</th><th>Keterangan</th>'+(can?'<th>Aksi</th>':'')+'</tr></thead><tbody>'+
    fcrRows.map(x=>'<tr><td>'+(x.min_value==null?'-':fmtNumber(x.min_value))+'</td><td>'+(x.max_value==null?'-':fmtNumber(x.max_value))+'</td><td>Rp '+fmtNumber(x.rupiah_per_kg)+'</td><td>'+esc(x.notes||'')+'</td>'+(can?'<td>'+(contractLocked?'Terkunci':'<button type="button" data-edit-fcr="'+esc(x.id)+'">Edit</button>')+'</td>':'')+'</tr>').join('')+
    '</tbody></table></div></section>';

  html+='<section class="panel"><h3>Bonus Deplesi</h3>';
  if(canEditContract&&selected){
    html+='<form id="depletionRowForm" class="form-vertical compact-form">'+
      '<input type="hidden" name="id">'+
      '<label>Deplesi Minimum (%)<input name="min_value" data-number="1" inputmode="decimal"></label>'+
      '<label>Deplesi Maksimum (%)<input name="max_value" data-number="1" inputmode="decimal"></label>'+
      '<label>Bonus (Rp/kg)<input name="rupiah_per_kg" data-number="1" inputmode="decimal" required></label>'+
      '<label>Keterangan<input name="notes"></label>'+
      '<button type="submit">Simpan Bonus Deplesi</button>'+
    '</form>';
  }
  html+='<div class="tablewrap"><table><thead><tr><th>Min %</th><th>Max %</th><th>Bonus/kg</th><th>Keterangan</th>'+(can?'<th>Aksi</th>':'')+'</tr></thead><tbody>'+
    depletionRows.map(x=>'<tr><td>'+(x.min_value==null?'-':fmtNumber(x.min_value))+'</td><td>'+(x.max_value==null?'-':fmtNumber(x.max_value))+'</td><td>Rp '+fmtNumber(x.rupiah_per_kg)+'</td><td>'+esc(x.notes||'')+'</td>'+(can?'<td>'+(contractLocked?'Terkunci':'<button type="button" data-edit-depletion="'+esc(x.id)+'">Edit</button>')+'</td>':'')+'</tr>').join('')+
    '</tbody></table></div></section>';

  html+='<section class="panel"><h3>Template Kontrak</h3><p class="muted">Penggunaan kontrak dilakukan dari menu Logistik → Buat Siklus, lalu pilih Mitra.</p>';
  html+='<div class="report-actions"><button type="button" id="contractTemplatePrint">Cetak</button> <button type="button" id="contractTemplatePdf">PDF</button> <button type="button" id="contractTemplateExcel">Excel</button></div><div class="tablewrap"><table id="contractTemplateTable"><thead><tr><th>Nama Kontrak</th><th>Tanggal Berlaku</th><th>Performa</th><th>Harga</th><th>Bonus IP</th><th>Bonus FCR / Deplesi</th><th>Aksi</th></tr></thead><tbody>'+
    templates.map(t=>{
      const tPrices=(pr.data||[]).filter(x=>x.contract_id===t.id);
      const tBonuses=(br.data||[]).filter(x=>x.contract_id===t.id);
      const tip=tBonuses.filter(x=>x.metric==='IP');
      const tfcr=tBonuses.filter(x=>x.metric==='FCR_DIFFERENCE');
      const tdep=tBonuses.filter(x=>x.metric==='DEPLETION');
      return '<tr><td>'+esc(t.number)+'</td><td>'+esc(t.contract_date||'-')+'</td><td>'+esc(t.performance_template_name||'-')+'</td><td>'+tPrices.length+' baris</td><td>'+tip.length+' baris</td><td>'+tfcr.length+' baris / Deplesi '+tdep.length+'</td><td>'+
        '<button type="button" data-contract-view="'+esc(t.id)+'">Lihat</button> '+
        (can&&!t.frozen_at?'<button type="button" data-contract-edit="'+esc(t.id)+'">Edit</button> ':'')+
        (t.frozen_at?'<strong>Terkunci</strong> ':'')+

      '</td></tr>';
    }).join('')+
    '</tbody></table></div></section>';

  layout(html);
  bindNumberInputs();
  attachListFilter({tableId:'contractTemplateTable',fields:[
    {label:'Nama Kontrak',col:0,placeholder:'Nama kontrak'},
    {label:'Tanggal Berlaku',col:1,placeholder:'YYYY-MM-DD'},
    {label:'Performa',col:2,placeholder:'Template performa'}
  ]});
  bindTableExportActions({tableId:'contractTemplateTable',printId:'contractTemplatePrint',pdfId:'contractTemplatePdf',excelId:'contractTemplateExcel',title:'Master Kontrak',filename:'Master_Kontrak',dropLast:true});

  if(!can)return;

  const cf=document.getElementById('contractInfoForm');
  const lockBtn=document.getElementById('lockContractTemplate');
  if(lockBtn)lockBtn.onclick=async()=>{
    if(!selected||selected.frozen_at)return;
    if(!confirm('Kunci kontrak '+selected.number+'? Setelah dikunci kontrak, harga, bonus, dan performa terkait tidak dapat diubah. Revisi harus membuat kontrak baru.'))return;
    if(!actionButtonStart(lockBtn,'Mengunci...'))return;
    const {error}=await db.from('contracts').update({frozen_at:new Date().toISOString()}).eq('id',selected.id).is('frozen_at',null);
    if(error){await actionButtonFinish(lockBtn,false,'Terkunci ✓','Gagal — coba lagi');return msg(error.message);}
    await actionButtonFinish(lockBtn,true,'Terkunci ✓');
    await contractMasterPage();
  };
  document.getElementById('newContractTemplate').onclick=()=>{
    cf.reset();
    cf.elements.id.value='';
    cf.elements.performance_template_name.value='Performa Bounty';
    msg('Form kontrak baru siap diisi.',true);
  };

  cf.onsubmit=async ev=>{
    ev.preventDefault();
    if(contractLocked)return msg('Kontrak sudah terkunci. Buat kontrak baru untuk revisi.');
    const fd=new FormData(cf);
    const id=fd.get('id');
    const o={
      number:fd.get('number'),
      contract_date:fd.get('contract_date')||null,
      performance_template_name:fd.get('performance_template_name'),
      signed_reference:fd.get('signed_reference')||null
    };
    let result;
    if(id) result=await db.from('contracts').update(o).eq('id',id);
    else result=await db.from('contracts').insert({
      ...o,doc_price:0,pre_starter_price:0,starter_price:0,finisher_price:0,
      ovk_price:0,harvest_price:0,ovk_price_basis:'FIXED'
    }).select('id').single();
    if(result.error)return msg(result.error.message);
    if(result.data?.id)sessionStorage.setItem('bms_selected_contract_template',result.data.id);
    await load();msg('Kontrak tersimpan.',true);
  };

  const sapronakContractPriceForm=document.getElementById('sapronakContractPriceForm');
  if(sapronakContractPriceForm){
    sapronakContractPriceForm.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(ev.currentTarget);
      const payload={
        doc_price:normalizeInputID(fd.get('doc_price'))||0,
        pre_starter_price:normalizeInputID(fd.get('pre_starter_price'))||0,
        starter_price:normalizeInputID(fd.get('starter_price'))||0,
        finisher_price:normalizeInputID(fd.get('finisher_price'))||0,
        ovk_price_basis:fd.get('ovk_price_basis')||'FIXED',
        ovk_price:normalizeInputID(fd.get('ovk_price'))||0,
        ovk_vat_percent:normalizeInputID(fd.get('ovk_vat_percent'))
      };
      const {error}=await db.from('contracts').update(payload).eq('id',selected.id);
      if(error)return msg(error.message);
      await contractMasterPage();msg('Harga Sapronak kontrak diperbarui.',true);
    };
  }

  const priceForm=document.getElementById('priceRowForm');
  if(priceForm){
    root.querySelectorAll('[data-edit-price]').forEach(btn=>btn.onclick=()=>{
      const x=prices.find(v=>v.id===btn.dataset.editPrice);if(!x)return;
      priceForm.elements.id.value=x.id;
      priceForm.elements.min_weight_kg.value=fmtNumber(x.min_weight_kg);
      priceForm.elements.max_weight_kg.value=x.max_weight_kg==null?'':fmtNumber(x.max_weight_kg);
      priceForm.elements.price_per_kg.value=fmtNumber(x.price_per_kg);
      priceForm.scrollIntoView({behavior:'smooth',block:'start'});
    });
    priceForm.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(priceForm),id=fd.get('id');
      const o={contract_id:selected.id,min_weight_kg:normalizeInputID(fd.get('min_weight_kg')),max_weight_kg:normalizeInputID(fd.get('max_weight_kg')),price_per_kg:normalizeInputID(fd.get('price_per_kg'))};
      const q=id?db.from('contract_live_prices').update(o).eq('id',id):db.from('contract_live_prices').insert(o);
      const {error}=await q;if(error)return msg(error.message);
      await contractMasterPage();msg('Harga ayam hidup tersimpan.',true);
    };
  }

  const setupBonus=(formId,metric,buttonAttr,rows)=>{
    const form=document.getElementById(formId);if(!form)return;
    root.querySelectorAll('['+buttonAttr+']').forEach(btn=>btn.onclick=()=>{
      const x=rows.find(v=>v.id===btn.getAttribute(buttonAttr));if(!x)return;
      form.elements.id.value=x.id;
      form.elements.min_value.value=x.min_value==null?'':fmtNumber(x.min_value);
      form.elements.max_value.value=x.max_value==null?'':fmtNumber(x.max_value);
      form.elements.rupiah_per_kg.value=fmtNumber(x.rupiah_per_kg);
      form.elements.notes.value=x.notes||'';
      form.scrollIntoView({behavior:'smooth',block:'start'});
    });
    form.onsubmit=async ev=>{
      ev.preventDefault();const fd=new FormData(form),id=fd.get('id');
      const o={contract_id:selected.id,metric,min_value:normalizeInputID(fd.get('min_value')),max_value:normalizeInputID(fd.get('max_value')),rupiah_per_kg:normalizeInputID(fd.get('rupiah_per_kg')),notes:fd.get('notes')||null};
      const q=id?db.from('contract_bonuses').update(o).eq('id',id):db.from('contract_bonuses').insert(o);
      const {error}=await q;if(error)return msg(error.message);
      await contractMasterPage();msg(metric==='IP'?'Bonus IP tersimpan.':metric==='DEPLETION'?'Bonus Deplesi tersimpan.':'Bonus FCR tersimpan.',true);
    };
  };

  setupBonus('ipRowForm','IP','data-edit-ip',ipRows);
  setupBonus('fcrRowForm','FCR_DIFFERENCE','data-edit-fcr',fcrRows);
  setupBonus('depletionRowForm','DEPLETION','data-edit-depletion',depletionRows);

  root.querySelectorAll('[data-contract-view]').forEach(btn=>btn.onclick=()=>{
    sessionStorage.setItem('bms_selected_contract_template',btn.dataset.contractView);
    contractMasterPage();
  });

  root.querySelectorAll('[data-contract-edit]').forEach(btn=>btn.onclick=()=>{
    sessionStorage.setItem('bms_selected_contract_template',btn.dataset.contractEdit);
    contractMasterPage();
  });

}

async function performanceMasterPage(){
  const can=roles.standar_performa.includes(profile.role);
  const kr=await db.from('contracts').select('id,number').order('number',{ascending:true});
  const master=(kr.data||[]).find(x=>x.number==='MASTER-001')||(kr.data||[])[0];
  if(!master)return layout('<section class="panel"><p>Master Kontrak belum tersedia.</p></section>');

  const rr=await db.from('performance_standards').select('*').eq('contract_id',master.id).order('template_name',{ascending:true}).order('age_days',{ascending:true});
  const all=rr.data||[];
  const templates=[...new Set(all.map(x=>x.template_name).filter(Boolean))];
  const selected=sessionStorage.getItem('bms_perf_template')||templates[0]||'';
  const rows=all.filter(x=>x.template_name===selected);

  let html='<section class="panel"><h3>Master Performa</h3>'+
    '<label>Pilih Template Performa<select id="perfTemplateSelect">'+
      templates.map(name=>'<option value="'+esc(name)+'" '+(name===selected?'selected':'')+'>'+esc(name)+'</option>').join('')+
    '</select></label>'+
    '<p class="muted">Pilih satu template. Data template yang dipilih tampil di bawah.</p>';

  if(can&&selected){
    html+='<form id="perfEdit" class="form-vertical">'+
      '<input type="hidden" name="id">'+
      '<label>Umur (hari)<input name="age_days" data-number="1" inputmode="numeric" required></label>'+
      '<label>Standar Pakan (g/ekor)<input name="std_feed_g_per_bird" data-number="1" inputmode="decimal"></label>'+
      '<label>Standar BW (g)<input name="std_body_weight_g" data-number="1" inputmode="decimal"></label>'+
      '<label>Standar FCR<input name="std_fcr" data-number="1" inputmode="decimal"></label>'+
      '<button type="submit">Simpan Perubahan</button>'+
    '</form>';
  }

  html+='<div class="report-actions"><button type="button" id="performanceMasterPrint">Cetak</button> <button type="button" id="performanceMasterPdf">PDF</button> <button type="button" id="performanceMasterExcel">Excel</button></div><div class="tablewrap"><table id="performanceMasterTable"><thead><tr><th>Umur</th><th>Std Pakan g/ekor</th><th>Std BW g</th><th>Std FCR</th>'+(can?'<th>Aksi</th>':'')+'</tr></thead><tbody>'+
    rows.map(x=>'<tr><td>'+fmtNumber(x.age_days)+'</td><td>'+(x.std_feed_g_per_bird==null?'-':fmtNumber(x.std_feed_g_per_bird))+'</td><td>'+(x.std_body_weight_g==null?'-':fmtNumber(x.std_body_weight_g))+'</td><td>'+(x.std_fcr==null?'-':fmtNumber(x.std_fcr))+'</td>'+(can?'<td><button type="button" data-edit-perf="'+esc(x.id)+'">Edit</button></td>':'')+'</tr>').join('')+
    '</tbody></table></div></section>';

  layout(html);
  bindNumberInputs();
  attachListFilter({tableId:'performanceMasterTable',fields:[
    {label:'Umur',col:0,placeholder:'Umur hari'},
    {label:'Std Pakan',col:1,placeholder:'Standar pakan'},
    {label:'Std BW',col:2,placeholder:'Standar BW'},
    {label:'Std FCR',col:3,placeholder:'Standar FCR'}
  ]});
  bindTableExportActions({tableId:'performanceMasterTable',printId:'performanceMasterPrint',pdfId:'performanceMasterPdf',excelId:'performanceMasterExcel',title:'Master Performa '+selected,filename:'Master_Performa_'+String(selected||'Template').replace(/[^A-Za-z0-9_-]+/g,'_'),dropLast:can});

  const sel=document.getElementById('perfTemplateSelect');
  if(sel)sel.onchange=()=>{
    sessionStorage.setItem('bms_perf_template',sel.value);
    performanceMasterPage();
  };

  if(!can||!selected)return;
  const pf=document.getElementById('perfEdit');
  root.querySelectorAll('[data-edit-perf]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.id===btn.dataset.editPerf);if(!x)return;
    pf.elements.id.value=x.id;
    pf.elements.age_days.value=fmtNumber(x.age_days);
    pf.elements.std_feed_g_per_bird.value=x.std_feed_g_per_bird==null?'':fmtNumber(x.std_feed_g_per_bird);
    pf.elements.std_body_weight_g.value=x.std_body_weight_g==null?'':fmtNumber(x.std_body_weight_g);
    pf.elements.std_fcr.value=x.std_fcr==null?'':fmtNumber(x.std_fcr);
    pf.scrollIntoView({behavior:'smooth',block:'start'});
  });
  pf.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(pf),id=fd.get('id');
    const o={
      contract_id:master.id,
      template_name:selected,
      age_days:normalizeInputID(fd.get('age_days')),
      std_feed_g_per_bird:normalizeInputID(fd.get('std_feed_g_per_bird')),
      std_body_weight_g:normalizeInputID(fd.get('std_body_weight_g')),
      std_fcr:normalizeInputID(fd.get('std_fcr'))
    };
    const q=id?db.from('performance_standards').update(o).eq('id',id):db.from('performance_standards').insert(o);
    const {error}=await q;if(error)return msg(error.message);
    await performanceMasterPage();msg('Template performa diperbarui.',true);
  };
}

function profilePage(){
  const email=session?.user?.email||'-';
  layout(
    '<section class="panel"><h3>Profil</h3>'+
    '<p><strong>Nama</strong><br>'+esc(profile.full_name||'-')+'</p>'+
    '<p><strong>Role</strong><br>'+esc(profile.role||'-')+'</p>'+
    '<p><strong>Email</strong><br>'+esc(email)+'</p>'+
    '</section>'+
    '<section class="panel"><h3>Ubah Password</h3>'+
    '<form id="profilePasswordForm" class="form-vertical">'+
      '<label>Password Baru<div class="password-wrap"><input id="profilePassword1" name="password" type="password" autocomplete="new-password" required><button type="button" data-toggle-password="profilePassword1">Lihat</button></div></label>'+
      '<label>Konfirmasi Password Baru<div class="password-wrap"><input id="profilePassword2" name="confirm_password" type="password" autocomplete="new-password" required><button type="button" data-toggle-password="profilePassword2">Lihat</button></div></label>'+
      '<button type="submit">Simpan Password</button>'+
    '</form>'+
    '</section>'+
    '<section class="panel"><button id="profileLogout">Keluar</button></section>'
  );

  document.querySelectorAll('[data-toggle-password]').forEach(btn=>btn.onclick=()=>{
    const input=document.getElementById(btn.dataset.togglePassword);
    if(!input)return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    btn.textContent=show?'Tutup':'Lihat';
  });

  document.getElementById('profilePasswordForm').onsubmit=async ev=>{
    ev.preventDefault();
    const f=ev.currentTarget;
    const p1=f.elements.password.value;
    const p2=f.elements.confirm_password.value;
    if(p1!==p2)return msg('Konfirmasi password tidak sama.');
    const {error}=await db.auth.updateUser({password:p1});
    if(error)return msg(error.message);
    f.reset();
    document.querySelectorAll('[data-toggle-password]').forEach(btn=>{
      const input=document.getElementById(btn.dataset.togglePassword);
      if(input)input.type='password';
      btn.textContent='Lihat';
    });
    msg('Password berhasil diperbarui.',true);
  };

  document.getElementById('profileLogout').onclick=logout;
}
function field([key,label,type]){let options=type==='assignment'?assignments.filter(a=>a.active).map(a=>[a.id,assignmentActiveBarnLabel(barns,a)]):type==='barn'?barns.map(b=>[b.id,shortBarnLabel(b)]):type==='item'?items.map(i=>[i.id,i.code+' · '+i.name]):type==='supplier'?suppliers.filter(s=>s.active&&s.supplier_type==='SAPRONAK').map(s=>[s.id,s.code+' · '+s.name]):type==='contract'?contracts.map(k=>[k.id,k.number]):type==='employee'?employees.map(e=>[e.id,e.code+' · '+e.name]):type==='abk'?employees.filter(e=>e.kind==='ABK').map(e=>[e.id,e.code+' · '+e.name]):type==='ppl'?pplUsers.map(p=>[p.user_id,p.full_name]):type==='advance'?advances.filter(a=>a.balance>0).map(a=>[a.id,'Sisa Rp '+a.balance]):null;const required=new Set(['contract_assignment_id','contract_id','barn_id','employee_id','advance_id','code','name','unit','capacity','kind','initial_population','company_name','number','contract_date','integrator','arrived_on','shipped','received','doa','item_id','quantity','received_on','recorded_on','age_days','visited_on','harvested_on','transaction_number','birds','net_weight_kg','price_per_kg','incurred_on','acquired_on','acquisition_value','category','amount','advanced_on','paid_on','method','departed_on','destination','estimated_on','min_weight_kg','price_per_kg','metric','rupiah_per_kg','std_body_weight_g','std_fcr','std_feed_g_per_bird']);let input=type==='computed'?'<input type="text" data-computed="'+key+'" readonly tabindex="-1">':options?'<select name="'+key+'" '+(required.has(key)?'required':'')+'><option value="">Pilih '+label+'</option>'+options.map(([v,t])=>'<option value="'+esc(v)+'">'+esc(t)+'</option>').join('')+'</select>':type?.startsWith('select:')?'<select name="'+key+'">'+type.slice(7).split(',').map(v=>'<option>'+esc(v)+'</option>').join('')+'</select>':'<input name="'+key+'" type="'+(type==='number'?'text':(type||'text'))+'" '+(type==='number'?'data-number="1" inputmode="decimal" autocomplete="off"':'')+(required.has(key)?' required':'')+'>';return '<label>'+label+input+'</label>'}
async function logisticsContractPage(){
  const [br,cr,pr,ar,er,abr,ppr,txShip,txExtShip,txReturn,txChick,txRec,txVisit,txEstimate,txHarvest,txMeat,txBop,txAdvance,txSalary,txRhppReal,txRhppFinal,txMandiriAlloc,txFeedMove]=await Promise.all([
    db.from('barns').select('id,code,name,location,kind,active').eq('active',true).order('code',{ascending:true}),
    db.from('contracts').select('id,number,contract_date,performance_template_name').is('cycle_id',null).order('contract_date',{ascending:false,nullsFirst:false}).order('number',{ascending:true}),
    db.from('performance_standards').select('contract_id,template_name').order('template_name',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,performance_template_name,start_date,active,created_at,ppl_id,cycle_type').order('created_at',{ascending:false}),
    db.from('employees').select('id,code,name,kind,active').eq('kind','ABK').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_contract_assignment_abks').select('id,contract_assignment_id,abk_id,initial_birds,feed_pre_bags,feed_starter_bags,feed_finisher_bags,basics_locked_at,created_at').order('created_at',{ascending:true}),
    db.from('profiles').select('user_id,full_name,role,active').eq('role','PPL').eq('active',true).order('full_name',{ascending:true}),
    db.from('logistics_shipments').select('contract_assignment_id'),
    db.from('logistics_external_shipments').select('contract_assignment_id'),
    db.from('logistics_returns').select('contract_assignment_id'),
    db.from('chick_ins').select('contract_assignment_id'),
    db.from('recordings').select('contract_assignment_id'),
    db.from('visits').select('contract_assignment_id'),
    db.from('production_estimates').select('contract_assignment_id'),
    db.from('marketing_contract_harvests').select('contract_assignment_id'),
    db.from('marketing_external_meat_purchases').select('contract_assignment_id'),
    db.from('bop').select('contract_assignment_id'),
    db.from('advances').select('contract_assignment_id'),
    db.from('abk_cycle_salaries').select('contract_assignment_id'),
    db.from('rhpp_real').select('contract_assignment_id'),
    db.from('rhpp_system_final').select('contract_assignment_id'),
    db.from('logistics_mandiri_purchase_allocations').select('contract_assignment_id'),
    db.from('logistics_company_feed_movements').select('contract_assignment_id')
  ]);

  const barns=br.data||[];
  const masters=cr.data||[];
  const perfRows=pr.data||[];
  const allAssignments=ar.data||[];
  const activeAssignments=allAssignments.filter(x=>x.active);
  const closedAssignments=allAssignments.filter(x=>!x.active);
  window.__closedCycleFilter=window.__closedCycleFilter||{barn:'',type:'',ppl:'',from:'',to:'',shown:false};
  const closedFilter=window.__closedCycleFilter;
  const closedHistoryRows=closedFilter.shown?closedAssignments.filter(a=>
    (!closedFilter.barn||a.barn_id===closedFilter.barn)&&
    (!closedFilter.type||(a.cycle_type||'MITRA')===closedFilter.type)&&
    (!closedFilter.ppl||a.ppl_id===closedFilter.ppl)&&
    (!closedFilter.from||String(a.start_date||'')>=closedFilter.from)&&
    (!closedFilter.to||String(a.start_date||'')<=closedFilter.to)
  ):[];
  const abks=er.data||[];
  const abkLinks=abr.data||[];
  const ppls=ppr.data||[];
  const pplName=id=>ppls.find(x=>x.user_id===id)?.full_name||'-';
  const lockedBarnIds=new Set(activeAssignments.map(x=>x.barn_id));
  const availableBarns=barns.filter(x=>!lockedBarnIds.has(x.id));
  const abkName=id=>{const x=abks.find(a=>a.id===id);return x?x.code+' · '+x.name:'-'};
  const linksFor=id=>abkLinks.filter(x=>x.contract_assignment_id===id);
  const transactionAssignmentIds=new Set(
    [txShip,txExtShip,txReturn,txChick,txRec,txVisit,txEstimate,txHarvest,txMeat,txBop,txAdvance,txSalary,txRhppReal,txRhppFinal,txMandiriAlloc,txFeedMove]
      .flatMap(r=>(r.data||[]).map(x=>x.contract_assignment_id).filter(Boolean))
  );
  const hasAssignmentTransactions=id=>transactionAssignmentIds.has(id);

  let html='<section class="panel"><h3>Buat Siklus</h3>'+
    '<form id="logisticsContractForm" class="form-vertical">'+
      '<label>Cari / Pilih Kandang<input id="contractBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" required></label>'+
      '<input type="hidden" name="barn_id" id="contractBarnId">'+
      '<div id="contractBarnSuggestions" class="search-suggestions"></div>'+
      '<label>Jenis Siklus<select name="cycle_type" id="logisticsCycleType" required><option value="MITRA">Mitra</option><option value="MANDIRI">Mandiri</option></select></label>'+
      '<label id="logisticsContractWrap">Pilih Kontrak<select name="master_contract_id" id="logisticsMasterContract" required><option value="">Pilih Kontrak</option>'+
        masters.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.number)+(x.contract_date?' · '+esc(x.contract_date):'')+'</option>').join('')+
      '</select></label>'+
      '<label id="logisticsPerformanceWrap">Pilih Performa<select name="performance_template_name" id="logisticsPerformance" required><option value="">Pilih Performa</option></select></label>'+
      '<label>Tanggal Mulai<input type="date" name="start_date" id="logisticsStartDate" required></label>'+
      '<label>Pilih PPL<select name="ppl_id" id="logisticsPpl" required><option value="">Pilih PPL</option>'+ppls.map(x=>'<option value="'+esc(x.user_id)+'">'+esc(x.full_name)+'</option>').join('')+'</select></label>'+
      '<button type="submit">Simpan</button>'+
    '</form>'+
    '<p class="muted">Mitra memakai Master Kontrak. Mandiri berjalan tanpa kontrak dan harga beli/jual aktual.</p>'+(!availableBarns.length?'<p class="muted">Semua kandang sedang memiliki siklus aktif.</p>':'')+
    '</section>';

  html+='<section class="panel"><h3>Siklus Aktif per Kandang</h3><div class="tablewrap"><table><thead><tr><th>Kandang</th><th>Siklus</th><th>Jenis</th><th>Kontrak</th><th>Performa</th><th>PPL</th><th>ABK</th><th>Tanggal Mulai</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    activeAssignments.map(a=>{
      const b=barns.find(x=>x.id===a.barn_id);
      const k=masters.find(x=>x.id===a.master_contract_id);
      const ls=linksFor(a.id);
      return '<tr><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td><strong>'+esc(assignmentCycleLabel(allAssignments,a))+'</strong></td><td><strong>'+esc(a.cycle_type||'MITRA')+'</strong></td><td>'+esc(a.cycle_type==='MANDIRI'?'MANDIRI':(shortContractLabel(k?.number)||'-'))+'</td><td>'+esc(a.performance_template_name||'-')+'</td><td>'+esc(pplName(a.ppl_id))+'</td><td>'+ls.length+' ABK</td><td>'+esc(a.start_date||'-')+'</td><td><span class="pill">AKTIF</span></td><td><div class="table-actions"><button type="button" class="btn-secondary" data-contract-detail="'+esc(a.id)+'">Edit</button>'+(hasAssignmentTransactions(a.id)?'':'<button type="button" class="btn-danger-soft" data-delete-cycle="'+esc(a.id)+'">Hapus</button>')+'</div></td></tr>';
    }).join('')+
    '</tbody></table></div>'+(!activeAssignments.length?'<p>Belum ada kontrak kandang aktif.</p>':'')+'</section>'+
    '<section class="panel"><h3>Riwayat Siklus Closed</h3><p class="muted">Pilih filter lalu klik Tampilkan. ADMIN tetap dapat melakukan koreksi melalui tombol Edit bila diperlukan.</p>'+
    '<form id="closedCycleFilterForm" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(closedFilter.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Jenis Siklus<select name="type"><option value="">Semua Jenis</option><option value="MITRA" '+(closedFilter.type==='MITRA'?'selected':'')+'>MITRA</option><option value="MANDIRI" '+(closedFilter.type==='MANDIRI'?'selected':'')+'>MANDIRI</option></select></label>'+
      '<label>PPL<select name="ppl"><option value="">Semua PPL</option>'+ppls.map(x=>'<option value="'+esc(x.user_id)+'" '+(closedFilter.ppl===x.user_id?'selected':'')+'>'+esc(x.full_name)+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(closedFilter.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(closedFilter.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="closedCycleFilterReset">Reset</button></div>'+
    '</form>'+
    (closedFilter.shown?'<div class="tablewrap"><table><thead><tr><th>Kandang</th><th>Siklus</th><th>Jenis</th><th>Kontrak</th><th>Performa</th><th>PPL</th><th>ABK</th><th>Tanggal Mulai</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    closedHistoryRows.map(a=>{
      const b=barns.find(x=>x.id===a.barn_id);
      const k=masters.find(x=>x.id===a.master_contract_id);
      const ls=linksFor(a.id);
      return '<tr><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td><strong>'+esc(assignmentCycleLabel(allAssignments,a))+'</strong></td><td>'+esc(a.cycle_type||'MITRA')+'</td><td>'+esc(a.cycle_type==='MANDIRI'?'MANDIRI':(shortContractLabel(k?.number)||'-'))+'</td><td>'+esc(a.performance_template_name||'-')+'</td><td>'+esc(pplName(a.ppl_id))+'</td><td>'+ls.length+' ABK</td><td>'+esc(a.start_date||'-')+'</td><td><span class="pill">CLOSED</span></td><td><div class="table-actions"><button type="button" class="btn-secondary" data-contract-detail="'+esc(a.id)+'">Edit</button>'+(hasAssignmentTransactions(a.id)?'':'<button type="button" class="btn-danger-soft" data-delete-cycle="'+esc(a.id)+'">Hapus</button>')+'</div></td></tr>';
    }).join('')+
    '</tbody></table></div>'+(closedHistoryRows.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>'+
    '<section class="panel" id="contractActiveDetail" hidden><h3>Detail Siklus</h3><div id="contractActiveDetailBody"></div></section>';

  layout(html);
  bindNumberInputs();
  const contractPageErrors=[br,cr,pr,ar,er,abr,ppr,txShip,txExtShip,txReturn,txChick,txRec,txVisit,txEstimate,txHarvest,txMeat,txBop,txAdvance,txSalary,txRhppReal,txRhppFinal,txMandiriAlloc,txFeedMove];
  const contractPageError=contractPageErrors.find(x=>x?.error)?.error;
  if(contractPageError)msg(contractPageError.message);

  const closedCycleFilterForm=document.getElementById('closedCycleFilterForm');
  const closedCycleFilterReset=document.getElementById('closedCycleFilterReset');
  if(closedCycleFilterForm)closedCycleFilterForm.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(closedCycleFilterForm);
    closedFilter.barn=String(fd.get('barn')||'');
    closedFilter.type=String(fd.get('type')||'');
    closedFilter.ppl=String(fd.get('ppl')||'');
    closedFilter.from=String(fd.get('from')||'');
    closedFilter.to=String(fd.get('to')||'');
    if(closedFilter.from&&closedFilter.to&&closedFilter.from>closedFilter.to){
      const t=closedFilter.from;closedFilter.from=closedFilter.to;closedFilter.to=t;
    }
    closedFilter.shown=true;
    await logisticsContractPage();
  };
  if(closedCycleFilterReset)closedCycleFilterReset.onclick=async()=>{
    window.__closedCycleFilter={barn:'',type:'',ppl:'',from:'',to:'',shown:false};
    await logisticsContractPage();
  };

  const contractSelect=document.getElementById('logisticsMasterContract');
  const perfSelect=document.getElementById('logisticsPerformance');
  const cycleTypeSelect=document.getElementById('logisticsCycleType');
  const contractWrap=document.getElementById('logisticsContractWrap');
  const performanceWrap=document.getElementById('logisticsPerformanceWrap');
  const syncCycleType=()=>{
    const mandiri=cycleTypeSelect?.value==='MANDIRI';
    if(contractWrap)contractWrap.hidden=mandiri;
    if(performanceWrap)performanceWrap.hidden=false;
    if(contractSelect){contractSelect.required=!mandiri;contractSelect.disabled=mandiri;if(mandiri)contractSelect.value='';}
    if(perfSelect){perfSelect.required=true;perfSelect.disabled=false;}
    if(mandiri){
      const names=[...new Set(perfRows.map(x=>x.template_name).filter(Boolean))];
      perfSelect.innerHTML='<option value="">Pilih Performa</option>'+names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
    }else if(contractSelect){contractSelect.dispatchEvent(new Event('change'));}
  };
  if(cycleTypeSelect)cycleTypeSelect.onchange=syncCycleType;
  syncCycleType();
  const startDateInput=document.getElementById('logisticsStartDate');
  if(startDateInput&&!startDateInput.value){
    startDateInput.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }
  const barnSearch=document.getElementById('contractBarnSearch');
  const barnIdInput=document.getElementById('contractBarnId');
  const barnSuggestions=document.getElementById('contractBarnSuggestions');
  const refreshPerformance=()=>{
    const contractId=contractSelect.value;
    const names=[...new Set(perfRows.filter(x=>x.contract_id===contractId).map(x=>x.template_name).filter(Boolean))];
    perfSelect.innerHTML='<option value="">Pilih Performa</option>'+
      names.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
  };

  const renderBarnSuggestions=()=>{
    const q=(barnSearch.value||'').trim().toLowerCase();
    barnIdInput.value='';
    const rows=q?availableBarns.filter(x=>[x.code,x.name,x.location,x.kind].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5):[];
    barnSuggestions.innerHTML=rows.map(x=>'<button type="button" class="search-suggestion" data-barn-id="'+esc(x.id)+'"><strong>'+esc(x.code+' · '+x.name)+'</strong><br><small>'+esc([x.location,x.kind].filter(Boolean).join(' · '))+'</small></button>').join('');
    if(q&&!rows.length)barnSuggestions.innerHTML='<div class="search-empty">Kandang tidak ditemukan.</div>';
    barnSuggestions.querySelectorAll('[data-barn-id]').forEach(btn=>btn.onclick=()=>{
      const b=availableBarns.find(x=>x.id===btn.dataset.barnId);
      if(!b)return;
      barnSearch.value=shortBarnLabel(b);
      barnIdInput.value=b.id;
      barnSuggestions.innerHTML='';
    });
  };

  contractSelect.onchange=refreshPerformance;
  barnSearch.oninput=renderBarnSuggestions;
  barnSearch.onfocus=renderBarnSuggestions;
  refreshPerformance();

  document.getElementById('logisticsContractForm').onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(ev.currentTarget);
    if(!fd.get('barn_id'))return msg('Kandang wajib dipilih.');
    const cycleType=String(fd.get('cycle_type')||'MITRA');
    const payload={
      barn_id:fd.get('barn_id'),
      cycle_type:cycleType,
      master_contract_id:cycleType==='MANDIRI'?null:fd.get('master_contract_id'),
      performance_template_name:fd.get('performance_template_name'),
      start_date:fd.get('start_date'),
      ppl_id:fd.get('ppl_id')
    };
    const {error}=await db.from('logistics_contract_assignments').insert(payload);
    if(error)return msg(error.message);
    await logisticsContractPage();
    msg((cycleType==='MANDIRI'?'Siklus Mandiri':'Siklus Mitra')+' berhasil dibuat. ABK dipilih oleh PPL saat Chick-In / DOC Masuk.',true);
  };

  const detailPanel=document.getElementById('contractActiveDetail');
  const detailBody=document.getElementById('contractActiveDetailBody');
  const renderContractDetail=id=>{
    const a=allAssignments.find(x=>x.id===id);if(!a)return;
    const b=barns.find(x=>x.id===a.barn_id),k=masters.find(x=>x.id===a.master_contract_id),ls=linksFor(a.id);
    const active=!!a.active;
    let detail='<div class="contract-detail-head"><div><strong>'+esc(b?shortBarnLabel(b):'-')+' · '+esc(assignmentCycleLabel(allAssignments,a))+' · '+esc(a.cycle_type||'MITRA')+'</strong><div class="muted">'+esc(a.cycle_type==='MANDIRI'?('Mandiri · '+(a.performance_template_name||'-')+' · harga aktual'):((shortContractLabel(k?.number)||'-')+' · '+(a.performance_template_name||'-')))+'</div></div><span class="pill">'+(active?'AKTIF':'CLOSED')+'</span></div>';
    if(active){
      detail+='<div class="return-grid">'+
        '<label>Tanggal Mulai<input type="date" data-start-date="'+esc(a.id)+'" value="'+esc(a.start_date||'')+'"></label>'+
        '<label>PPL Penanggung Jawab<select data-ppl-id="'+esc(a.id)+'"><option value="">Pilih PPL</option>'+ppls.map(x=>'<option value="'+esc(x.user_id)+'" '+(x.user_id===a.ppl_id?'selected':'')+'>'+esc(x.full_name)+'</option>').join('')+'</select></label>'+
        '<div class="inline-actions contract-detail-actions"><button type="button" data-save-logistics-start="'+esc(a.id)+'">Simpan Tanggal</button><button type="button" data-save-ppl="'+esc(a.id)+'">Simpan PPL</button></div>'+
      '</div>';
    }else{
      detail+='<div class="tablewrap"><table><tbody><tr><td>Tanggal Mulai</td><td>'+esc(a.start_date||'-')+'</td></tr><tr><td>PPL</td><td>'+esc(pplName(a.ppl_id))+'</td></tr><tr><td>Status</td><td>CLOSED · read-only</td></tr></tbody></table></div>';
    }
    detail+='<h4>ABK Kandang</h4>';
    detail+=ls.length
      ?ls.map(x=>'<div class="contract-abk-row"><div><strong>'+esc(abkName(x.abk_id))+'</strong><div class="muted">Populasi Awal</div></div><strong>'+(x.initial_birds==null?'-':fmtNumber(x.initial_birds))+' ekor</strong></div>').join('')
      :'<p class="muted">Belum ada ABK. ABK dipilih oleh PPL saat Chick-In / DOC Masuk.</p>';
    detail+='<p class="muted">Pengelolaan ABK dan Populasi Awal dilakukan dari Produksi / PPL → Chick-In / DOC Masuk agar menjadi sumber yang sama untuk Liga ABK.</p>';
    if(active&&a.cycle_type==='MANDIRI'&&profile.role==='ADMIN')detail+='<div class="inline-actions"><button type="button" class="btn-danger-soft" data-close-mandiri="'+esc(a.id)+'">Close Siklus Mandiri</button></div>';
    detailBody.innerHTML=detail;
    detailPanel.hidden=false;
    if(active||profile.role==='ADMIN'){bindNumberInputs();bindContractDetailActions();}
    detailPanel.scrollIntoView({behavior:'smooth',block:'start'});
  };

  const bindContractDetailActions=()=>{
    detailBody.querySelectorAll('[data-add-abk]').forEach(btn=>btn.onclick=async()=>{
      const select=detailBody.querySelector('[data-add-abk-select="'+btn.dataset.addAbk+'"]');
      const pop=detailBody.querySelector('[data-add-abk-pop="'+btn.dataset.addAbk+'"]');
      const initial=Math.trunc(normalizeInputID(pop?.value)||0);
      if(!select?.value)return msg('Pilih ABK yang akan ditambahkan.');
      if(initial<=0)return msg('Populasi Awal ABK wajib diisi.');
      const {error}=await db.from('logistics_contract_assignment_abks').insert({contract_assignment_id:btn.dataset.addAbk,abk_id:select.value,initial_birds:initial});
      if(error)return msg(error.message);
      await logisticsContractPage();msg('ABK dan Populasi Awal berhasil ditambahkan.',true);
    });
    detailBody.querySelectorAll('[data-save-closed-abk-pop]').forEach(btn=>btn.onclick=async()=>{
      const input=detailBody.querySelector('[data-closed-abk-pop="'+btn.dataset.saveClosedAbkPop+'"]');
      const initial=Math.trunc(normalizeInputID(input?.value)||0);
      if(initial<=0)return msg('Populasi Awal ABK wajib lebih dari 0.');
      if(!await appConfirm('Koreksi Populasi Awal ABK pada siklus CLOSED menjadi '+fmtNumber(initial)+' ekor?'))return;
      const {error}=await db.rpc('admin_correct_closed_abk_population_v1',{p_link_id:btn.dataset.saveClosedAbkPop,p_initial_birds:initial});
      if(error)return msg(error.message);
      await logisticsContractPage();
      msg('Populasi Awal ABK siklus CLOSED berhasil dikoreksi.',true);
    });
    detailBody.querySelectorAll('[data-save-abk-pop]').forEach(btn=>btn.onclick=async()=>{
      const input=detailBody.querySelector('[data-abk-pop="'+btn.dataset.saveAbkPop+'"]');
      const initial=Math.trunc(normalizeInputID(input?.value)||0);
      if(initial<=0)return msg('Populasi Awal ABK wajib lebih dari 0.');
      const {error}=await db.from('logistics_contract_assignment_abks').update({initial_birds:initial}).eq('id',btn.dataset.saveAbkPop);
      if(error)return msg(error.message);
      await logisticsContractPage();msg('Populasi Awal ABK diperbarui.',true);
    });
    detailBody.querySelectorAll('[data-remove-abk]').forEach(btn=>btn.onclick=async()=>{
      const {error}=await db.from('logistics_contract_assignment_abks').delete().eq('id',btn.dataset.removeAbk);
      if(error)return msg(error.message);
      await logisticsContractPage();msg('ABK dilepas dari kontrak kandang.',true);
    });
    detailBody.querySelectorAll('[data-save-ppl]').forEach(btn=>btn.onclick=async()=>{
      const select=detailBody.querySelector('[data-ppl-id="'+btn.dataset.savePpl+'"]');
      if(!select?.value)return msg('PPL penanggung jawab wajib dipilih.');
      if(!actionButtonStart(btn,'Menyimpan...'))return;
      const {error}=await db.from('logistics_contract_assignments').update({ppl_id:select.value}).eq('id',btn.dataset.savePpl);
      if(error){await actionButtonFinish(btn,false,'Tersimpan ✓');return;}
      await actionButtonFinish(btn,true,'Tersimpan ✓');
      await logisticsContractPage();
    });
    detailBody.querySelectorAll('[data-close-mandiri]').forEach(btn=>btn.onclick=async()=>{
      if(!await appConfirm('Close Siklus Mandiri? Pastikan Chick-In dan Panen Mandiri sudah lengkap. Setelah Close transaksi periode terkunci.'))return;
      const {error}=await db.rpc('admin_close_mandiri_cycle_atomic',{p_contract_assignment_id:btn.dataset.closeMandiri});
      if(error)return msg(error.message);
      await logisticsContractPage();msg('Siklus Mandiri berhasil di-Close.',true);
    });
    detailBody.querySelectorAll('[data-save-logistics-start]').forEach(btn=>btn.onclick=async()=>{
      const input=detailBody.querySelector('[data-start-date="'+btn.dataset.saveLogisticsStart+'"]');
      const value=input?.value||'';
      if(!value)return msg('Tanggal mulai wajib diisi.');
      if(!actionButtonStart(btn,'Menyimpan...'))return;
      const {error}=await db.from('logistics_contract_assignments').update({start_date:value}).eq('id',btn.dataset.saveLogisticsStart);
      if(error){await actionButtonFinish(btn,false,'Tersimpan ✓');return;}
      await actionButtonFinish(btn,true,'Tersimpan ✓');
      await logisticsContractPage();
    });
  };

  root.querySelectorAll('[data-contract-detail]').forEach(btn=>btn.onclick=()=>renderContractDetail(btn.dataset.contractDetail));
  root.querySelectorAll('[data-delete-cycle]').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.deleteCycle;
    const a=allAssignments.find(x=>x.id===id);
    if(!a)return;
    if(hasAssignmentTransactions(id))return msg('Siklus sudah memiliki transaksi. Hanya dapat diedit, tidak dapat dihapus.');
    if(profile.role!=='ADMIN')return msg('Hanya Administrator yang dapat menghapus siklus.');
    if(!await appConfirm('Hapus siklus kosong ini? Data ABK yang hanya terikat ke siklus ini juga akan dilepas.'))return;
    if(!actionButtonStart(btn,'Menghapus...'))return;
    const {error}=await db.from('logistics_contract_assignments').delete().eq('id',id);
    if(error){await actionButtonFinish(btn,false);return;}
    await actionButtonFinish(btn,true);
    await logisticsContractPage();
  });

}

function normalizeOptionalShippingNote(value){
  const note=String(value||'').trim();
  return note==='-'?'':note;
}
function findDuplicateShippingNote(rows,value,exceptId=''){
  const note=normalizeOptionalShippingNote(value).toLowerCase();
  if(!note)return null;
  return (rows||[]).find(row=>normalizeOptionalShippingNote(row.shipping_note_number).toLowerCase()===note&&row.id!==exceptId)||null;
}

async function logisticsShippingPage(editId=null){
  const [br,ir,sr,sir,ar,kr,cpr]=await Promise.all([
    db.from('barns').select('id,code,name,location,kind,active').eq('active',true).order('code',{ascending:true}),
    db.from('items').select('id,code,name,category,feed_phase,unit,kg_per_unit,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_shipments').select('*').order('shipment_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('logistics_shipment_items').select('*').order('created_at',{ascending:false}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,performance_template_name,active,created_at,cycle_type').order('created_at',{ascending:false}),
    db.from('contracts').select('id,number,pre_starter_price,starter_price,finisher_price,doc_price,ovk_price_basis,ovk_price,ovk_vat_percent').is('cycle_id',null),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle()
  ]);

  const barns=br.data||[], itemsAll=ir.data||[], shipments=sr.data||[], shipmentItems=sir.data||[], assignments=ar.data||[], masters=kr.data||[], company=cpr.data||{};
  const shippingHistoryState=window.__shippingHistoryFilter||{barn_id:'',assignment_id:'',date_from:'',date_to:'',shown:false};
  window.__shippingHistoryFilter=shippingHistoryState;
  const historyAssignments=assignments.filter(a=>(a.cycle_type||'MITRA')==='MITRA'&&(!shippingHistoryState.barn_id||a.barn_id===shippingHistoryState.barn_id));
  const shownShipments=shippingHistoryState.shown?shipments.filter(s=>
    (!shippingHistoryState.barn_id||s.barn_id===shippingHistoryState.barn_id)&&
    (!shippingHistoryState.assignment_id||s.contract_assignment_id===shippingHistoryState.assignment_id)&&
    (!shippingHistoryState.date_from||String(s.shipment_date||'')>=shippingHistoryState.date_from)&&
    (!shippingHistoryState.date_to||String(s.shipment_date||'')<=shippingHistoryState.date_to)
  ):[];
  const activeAssignments=assignments.filter(a=>a.active&&(a.cycle_type||'MITRA')==='MITRA');
  const activeByBarn=new Map(activeAssignments.map(a=>[a.barn_id,a]));
  const selectableBarns=barns.filter(b=>activeByBarn.has(b.id));
  const selected=editId?shipments.find(x=>x.id===editId):null;
  const selectedAssignment=selected?assignments.find(a=>a.id===selected.contract_assignment_id):null;
  const locked=selected?selectedAssignment?.active===false:false;
  let draftItems=selected?shipmentItems.filter(x=>x.shipment_id===selected.id).map(x=>({item_id:x.item_id,quantity:x.quantity,unit_price:x.unit_price,id:x.id})):[];
  window.__logisticsDraftItems=draftItems;

  const todayID=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  let html='<section class="panel"><h3>Pengiriman</h3>'+
    '<p class="muted">Pengiriman ini khusus Siklus Mitra. Pilih kandang dengan Siklus Mitra aktif, No. SJ boleh dikosongkan, lalu tambahkan Sapronak dan jumlah kiriman.</p>'+
    '<form id="logisticsShippingForm" class="form-vertical">'+
      '<input type="hidden" name="shipment_id" value="'+(selected?esc(selected.id):'')+'">'+
      '<label>Cari / Pilih Kandang<input id="shippingBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" value="'+(selected?esc((barns.find(b=>b.id===selected.barn_id)?.code||'')+' · '+(barns.find(b=>b.id===selected.barn_id)?.name||'')):'')+'" '+(selected?'readonly':(locked?'disabled':''))+' required></label>'+
      '<input type="hidden" name="barn_id" id="shippingBarnId" value="'+(selected?esc(selected.barn_id):'')+'">'+
      '<div id="shippingBarnSuggestions" class="search-suggestions"></div>'+
      '<label>Tanggal Pengiriman<input type="date" name="shipment_date" value="'+esc(selected?.shipment_date||todayID())+'" '+(locked?'disabled':'')+' required></label>'+
      '<label>No. SJ Kiriman (Opsional)<input name="shipping_note_number" placeholder="Boleh dikosongkan" value="'+esc(selected?.shipping_note_number||'')+'" '+(locked?'disabled':'')+'></label>'+
      '<label>Catatan<textarea name="notes" '+(locked?'disabled':'')+'>'+esc(selected?.notes||'')+'</textarea></label>'+
    '</form>';

  if(!locked){
    html+='<div class="form-vertical compact-form" id="shippingItemAdder">'+
      '<label>Cari / Pilih Sapronak<input id="shippingItemSearch" autocomplete="off" placeholder="Ketik kode atau nama sapronak"></label>'+
      '<input type="hidden" id="shippingItem">'+
      '<div id="shippingItemSuggestions" class="search-suggestions"></div>'+
      '<label id="shippingQtyLabel">Jumlah<input id="shippingQty" data-number="1" inputmode="decimal" placeholder="Masukkan jumlah"></label>'+
      '<label>Harga Kontrak / Satuan<input id="shippingPrice" data-number="1" inputmode="decimal" placeholder="Otomatis dari kontrak"></label>'+
      '<p id="shippingQtyInfo" class="muted"></p>'+
      '<button type="button" id="addShippingItem">Tambah Sapronak</button>'+
    '</div>';
  }

  html+='<div class="tablewrap"><table><thead><tr><th>Kode</th><th>Sapronak</th><th>Jumlah</th><th>Satuan</th><th>Kg</th><th>Harga/Satuan</th><th>Total</th>'+(locked?'':'<th>Aksi</th>')+'</tr></thead><tbody id="shippingDraftBody"></tbody></table></div>';

  if(locked){
    html+='<p><strong>Status: Terkunci</strong> — Kontrak Logistik periode ini sudah CLOSED.</p>';
  }else{
    html+='<button type="button" id="saveShippingDraft">'+(selected?'Simpan Perubahan':'Simpan Draft')+'</button>';
    if(selected) html+=' <button type="button" id="cancelShippingEdit">Batal Edit</button>';
  }
  html+='</section>';

  html+='<section class="panel"><h3>Riwayat Pengiriman</h3>'+
    '<div class="form-vertical compact-form">'+
      '<label>Pilih Kandang<select id="shippingHistoryBarn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(shippingHistoryState.barn_id===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Pilih Siklus<select id="shippingHistoryCycle"><option value="">Semua Siklus</option>'+historyAssignments.map(a=>'<option value="'+esc(a.id)+'" '+(shippingHistoryState.assignment_id===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(assignments,a)+' · '+(a.start_date||'-')+' · '+(a.active?'AKTIF':'CLOSED'))+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" id="shippingHistoryDateFrom" value="'+esc(shippingHistoryState.date_from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" id="shippingHistoryDateTo" value="'+esc(shippingHistoryState.date_to||'')+'"></label>'+
      '<div class="inline-actions"><button type="button" id="shippingHistoryApply">Tampilkan</button><button type="button" id="shippingHistoryReset">Reset</button></div>'+
      '<p class="muted">Semua kiriman sesuai kandang, siklus, dan tanggal ditampilkan sekaligus tanpa pagination.</p>'+
    '</div>'+
    (shippingHistoryState.shown?'<div class="report-actions"><button type="button" id="shippingHistoryPrint">Cetak</button> <button type="button" id="shippingHistoryPdf">PDF</button> <button type="button" id="shippingHistoryExcel">Excel</button></div><div class="tablewrap"><table id="shippingHistoryTable"><thead><tr><th>Kandang</th><th>Tanggal</th><th>No. SJ</th><th>Sapronak</th><th>Jumlah</th><th>Satuan</th><th>Kg</th><th>Harga/Satuan</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    shownShipments.flatMap(s=>{
      const b=barns.find(x=>x.id===s.barn_id), a=assignments.find(x=>x.id===s.contract_assignment_id);
      const isLocked=a?.active===false;
      const details=shipmentItems.filter(x=>x.shipment_id===s.id);
      if(!details.length){
        return ['<tr><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td>'+esc(s.shipment_date||'-')+'</td><td>'+esc(s.shipping_note_number||'-')+'</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>'+(isLocked?'Terkunci':'Draft')+'</td><td>'+(isLocked?'<button type="button" data-view-shipment="'+esc(s.id)+'">Lihat</button>':'<button type="button" data-view-shipment="'+esc(s.id)+'">Edit</button>'+(profile.role==='ADMIN'?' <button type="button" data-delete-shipment="'+esc(s.id)+'">Hapus</button>':''))+'</td></tr>'];
      }
      return details.map((d,idx)=>{
        const i=itemsAll.find(x=>x.id===d.item_id);
        const kg=d.quantity_kg!=null?d.quantity_kg:(i?.category==='PAKAN'?Number(d.quantity)*Number(i.kg_per_unit||50):null);
        return '<tr><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td>'+esc(s.shipment_date||'-')+'</td><td>'+esc(s.shipping_note_number||'-')+'</td><td>'+esc(i?.name||'-')+'</td><td>'+fmtNumber(d.quantity)+'</td><td>'+esc(i?.unit||'-')+'</td><td>'+fmtNumber(kg)+'</td><td>'+fmtNumber(d.unit_price)+'</td><td>'+fmtNumber(Number(d.quantity||0)*Number(d.unit_price||0))+'</td><td>'+(isLocked?'Terkunci':'Draft')+'</td><td>'+(idx===0?(isLocked?'<button type="button" data-view-shipment="'+esc(s.id)+'">Lihat</button>':'<button type="button" data-view-shipment="'+esc(s.id)+'">Edit</button>'+(profile.role==='ADMIN'?' <button type="button" data-delete-shipment="'+esc(s.id)+'">Hapus</button>':'')):'')+'</td></tr>';
      });
    }).join('')+
    '</tbody></table></div>'+(!shownShipments.length?'<p>Data pengiriman tidak ditemukan.</p>':''):'<p class="muted">Riwayat belum ditampilkan.</p>')+'<p class="muted">Riwayat lengkap tersedia di Laporan Logistik.</p></section>';

  layout(html);
  bindNumberInputs();

  const shippingHistoryBarn=document.getElementById('shippingHistoryBarn');
  const shippingHistoryCycle=document.getElementById('shippingHistoryCycle');
  const shippingHistoryDateFrom=document.getElementById('shippingHistoryDateFrom');
  const shippingHistoryDateTo=document.getElementById('shippingHistoryDateTo');
  const shippingHistoryApply=document.getElementById('shippingHistoryApply');
  const shippingHistoryReset=document.getElementById('shippingHistoryReset');

  if(shippingHistoryBarn)shippingHistoryBarn.onchange=()=>{
    window.__shippingHistoryFilter={
      barn_id:shippingHistoryBarn.value,
      assignment_id:'',
      date_from:shippingHistoryDateFrom?.value||'',
      date_to:shippingHistoryDateTo?.value||'',
      shown:false
    };
    logisticsShippingPage();
  };

  if(shippingHistoryCycle)shippingHistoryCycle.onchange=()=>{
    window.__shippingHistoryFilter={
      barn_id:shippingHistoryBarn?.value||'',
      assignment_id:shippingHistoryCycle.value,
      date_from:shippingHistoryDateFrom?.value||'',
      date_to:shippingHistoryDateTo?.value||'',
      shown:false
    };
  };

  if(shippingHistoryApply)shippingHistoryApply.onclick=()=>{
    window.__shippingHistoryFilter={
      barn_id:shippingHistoryBarn?.value||'',
      assignment_id:shippingHistoryCycle?.value||'',
      date_from:shippingHistoryDateFrom?.value||'',
      date_to:shippingHistoryDateTo?.value||'',
      shown:true
    };
    logisticsShippingPage();
  };

  if(shippingHistoryReset)shippingHistoryReset.onclick=()=>{
    window.__shippingHistoryFilter={barn_id:'',assignment_id:'',date_from:'',date_to:'',shown:false};
    logisticsShippingPage();
  };

  if(shippingHistoryState.shown){
    const historyTable=document.getElementById('shippingHistoryTable');
    const reportHtml=()=>{
      const b=barns.find(x=>x.id===shippingHistoryState.barn_id),a=assignments.find(x=>x.id===shippingHistoryState.assignment_id);
      const table=historyTable?historyTable.cloneNode(true):null;
      if(table){
        table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      }
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Pengiriman Sapronak</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Pengiriman Sapronak</h2><p>Periode: '+esc(shippingHistoryState.date_from||'-')+' s/d '+esc(shippingHistoryState.date_to||'-')+' · Kandang: '+esc(b?shortBarnLabel(b):'Semua Kandang')+' · Siklus: '+esc(a?assignmentCycleLabel(assignments,a):'Semua Siklus')+'</p>'+
        (table?table.outerHTML:'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const doPrint=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=reportHtml();w.document.write(pdf?html.replace('<title>Riwayat Pengiriman Sapronak</title>','<title>Riwayat_Pengiriman_Sapronak_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('shippingHistoryPrint'),pdfBtn=document.getElementById('shippingHistoryPdf'),excelBtn=document.getElementById('shippingHistoryExcel');
    if(printBtn)printBtn.onclick=()=>doPrint(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(reportHtml(),'Riwayat_Pengiriman_Sapronak.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const table=historyTable.cloneNode(true);
      table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Pengiriman Sapronak</h2>'+table.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Pengiriman_Sapronak.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };

  const barnSearch=document.getElementById('shippingBarnSearch');
  const barnIdInput=document.getElementById('shippingBarnId');
  const barnSuggestions=document.getElementById('shippingBarnSuggestions');
  if(barnSearch&&barnIdInput&&barnSuggestions&&!locked&&!selected){
    const renderShippingBarnSuggestions=()=>{
      const q=(barnSearch.value||'').trim().toLowerCase();
      barnIdInput.value='';
      const rows=q?selectableBarns.filter(x=>{
        const a=activeByBarn.get(x.id), k=masters.find(v=>v.id===a?.master_contract_id);
        const hay=[x.code,x.name,x.location,x.kind,'kontrak aktif',k?.number,a?.performance_template_name].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      }).slice(0,5):[];
      barnSuggestions.innerHTML=rows.map(x=>{
        const a=activeByBarn.get(x.id), k=masters.find(v=>v.id===a?.master_contract_id);
        return '<button type="button" class="search-suggestion" data-barn-id="'+esc(x.id)+'"><strong>'+esc(x.code+' · '+x.name)+'</strong><br><small>'+esc([x.location,k?.number,a?.performance_template_name].filter(Boolean).join(' · '))+'</small></button>';
      }).join('');
      if(q&&!rows.length)barnSuggestions.innerHTML='<div class="search-empty">Kandang tidak ditemukan atau belum memiliki kontrak aktif.</div>';
      barnSuggestions.querySelectorAll('[data-barn-id]').forEach(btn=>btn.onclick=()=>{
        const b=selectableBarns.find(x=>x.id===btn.dataset.barnId);
        if(!b)return;
        barnSearch.value=shortBarnLabel(b);
        barnIdInput.value=b.id;
        barnSuggestions.innerHTML='';
        if(typeof updateQtyContext==='function')updateQtyContext(true);
      });
    };
    barnSearch.oninput=renderShippingBarnSuggestions;
    barnSearch.onfocus=renderShippingBarnSuggestions;
  }

  const shippingItem=document.getElementById('shippingItem');
  const shippingItemSearch=document.getElementById('shippingItemSearch');
  const shippingItemSuggestions=document.getElementById('shippingItemSuggestions');
  const shippingQty=document.getElementById('shippingQty');
  const shippingPrice=document.getElementById('shippingPrice');
  const shippingQtyLabel=document.getElementById('shippingQtyLabel');
  const shippingQtyInfo=document.getElementById('shippingQtyInfo');

  const contractUnitPriceForItem=(item)=>{
    if(!item)return null;
    const barnId=document.getElementById('shippingBarnId')?.value;
    const a=selectedAssignment||activeByBarn.get(barnId);
    const k=masters.find(v=>v.id===a?.master_contract_id);
    if(!a||!k)return null;
    if(item.category==='PAKAN'){
      const kg=Number(item.kg_per_unit||50);
      const phase=String(item.feed_phase||'').trim().toLowerCase();
      let perKg=0;
      if(phase.includes('pre'))perKg=Number(k.pre_starter_price||0);
      else if(phase.includes('fin'))perKg=Number(k.finisher_price||0);
      else if(phase.includes('starter'))perKg=Number(k.starter_price||0);
      return perKg>0&&kg>0?perKg*kg:null;
    }
    if(item.category==='DOC'){
      const p=Number(k.doc_price||0);
      return p>0?p:null;
    }
    if(item.category==='OVK'&&k.ovk_price_basis==='FIXED'){
      const p=Number(k.ovk_price||0);
      return p>0?p:null;
    }
    return null;
  };

  const updateQtyContext=(forcePrice=false)=>{
    if(!shippingItem||!shippingQtyLabel||!shippingQtyInfo)return;
    const item=itemsAll.find(x=>x.id===shippingItem.value);
    if(!item){
      shippingQtyLabel.firstChild.textContent='Jumlah';
      shippingQtyInfo.textContent='';
      return;
    }
    shippingQtyLabel.firstChild.textContent='Jumlah ('+(item.unit||'-')+')';
    const autoPrice=contractUnitPriceForItem(item);
    if(shippingPrice){
      const autoLocked=autoPrice!=null&&(item.category==='DOC'||item.category==='PAKAN'||item.category==='OVK');
      shippingPrice.readOnly=!!autoLocked;
      if(autoPrice!=null&&(forcePrice||!shippingPrice.value||autoLocked)){
        shippingPrice.value=formatInputID(String(autoPrice));
      }
      if(autoPrice==null&&item.category==='OVK'){
        shippingPrice.readOnly=false;
      }
    }
    if(item.category==='PAKAN'){
      const kg=Number(item.kg_per_unit||50);
      shippingQtyInfo.textContent=autoPrice!=null
        ?'Pakan: 1 '+(item.unit||'ZAK')+' = '+fmtNumber(kg)+' kg. Harga kontrak otomatis: Rp '+fmtNumber(autoPrice)+' / '+(item.unit||'ZAK')+'. Bisa dikoreksi sebelum Close.'
        :'Harga kontrak belum ditemukan untuk kandang/fase pakan ini. Pilih kandang aktif yang memiliki kontrak.';
    }else if(item.category==='DOC'){
      shippingQtyInfo.textContent=autoPrice!=null
        ?'Harga DOC kontrak otomatis: Rp '+fmtNumber(autoPrice)+' / '+(item.unit||'EKOR')+'. Bisa dikoreksi sebelum Close.'
        :'Harga DOC kontrak belum ditemukan.';
    }else if(item.category==='OVK'){
      const barnId=document.getElementById('shippingBarnId')?.value;
      const a=activeByBarn.get(barnId);
      const k=masters.find(v=>v.id===a?.master_contract_id);
      if(autoPrice!=null)shippingQtyInfo.textContent='OVK: harga tetap kontrak otomatis Rp '+fmtNumber(autoPrice)+' / '+(item.unit||'satuan')+'.';
      else shippingQtyInfo.textContent='OVK: dasar kontrak Distributor + PPN'+(k?.ovk_vat_percent!=null?' '+fmtNumber(k.ovk_vat_percent)+'%':'')+'. Isi Harga/Satuan final sesuai invoice.';
    }else shippingQtyInfo.textContent='Satuan kiriman: '+(item.unit||'-');
  };
  if(shippingItemSearch&&shippingItemSuggestions&&shippingItem){
    const renderShippingItemSuggestions=()=>{
      const q=(shippingItemSearch.value||'').trim().toLowerCase();
      shippingItem.value='';
      const rows=q?itemsAll.filter(x=>[x.code,x.name,x.category,x.unit].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5):[];
      shippingItemSuggestions.innerHTML=rows.map(x=>'<button type="button" class="search-suggestion" data-shipping-item="'+esc(x.id)+'"><strong>'+esc(x.code+' · '+x.name)+'</strong><br><small>'+esc([x.category,x.unit].filter(Boolean).join(' · '))+'</small></button>').join('');
      if(q&&!rows.length)shippingItemSuggestions.innerHTML='<div class="search-empty">Sapronak tidak ditemukan.</div>';
      shippingItemSuggestions.querySelectorAll('[data-shipping-item]').forEach(btn=>btn.onclick=()=>{
        const item=itemsAll.find(x=>x.id===btn.dataset.shippingItem);
        if(!item)return;
        shippingItem.value=item.id;
        shippingItemSearch.value=item.code+' · '+item.name;
        shippingItemSuggestions.innerHTML='';
        if(shippingPrice)shippingPrice.value='';
        updateQtyContext(true);
      });
      if(shippingPrice)shippingPrice.value='';
      updateQtyContext();
    };
    shippingItemSearch.oninput=renderShippingItemSuggestions;
    shippingItemSearch.onfocus=renderShippingItemSuggestions;
  }
  updateQtyContext();

  const renderDraftItems=()=>{
    const body=document.getElementById('shippingDraftBody'); if(!body)return;
    const arr=window.__logisticsDraftItems||[];
    body.innerHTML=arr.map((x,idx)=>{
      const i=itemsAll.find(v=>v.id===x.item_id);
      const kg=i?.category==='PAKAN'?Number(x.quantity)*Number(i.kg_per_unit||50):null;
      const qtyCell=selected&&!locked
        ?'<input type="text" data-number="1" inputmode="decimal" data-edit-draft-qty="'+idx+'" value="'+formatInputID(String(x.quantity??''))+'" style="min-width:110px">'
        :fmtNumber(x.quantity);
      return '<tr><td>'+esc(i?.code||'-')+'</td><td>'+esc(i?.name||'-')+'</td><td>'+qtyCell+'</td><td>'+esc(i?.unit||'-')+'</td><td>'+fmtNumber(kg)+'</td><td>'+fmtNumber(x.unit_price)+'</td><td>'+fmtNumber(Number(x.quantity||0)*Number(x.unit_price||0))+'</td>'+
        (locked?'':'<td><button type="button" data-remove-draft="'+idx+'">Hapus</button></td>')+'</tr>';
    }).join('');
    if(!locked){
      bindNumberInputs();
      body.querySelectorAll('[data-edit-draft-qty]').forEach(inp=>inp.oninput=()=>{
        const arr=window.__logisticsDraftItems||[];
        const idx=Number(inp.dataset.editDraftQty);
        const qty=normalizeInputID(inp.value);
        if(arr[idx]&&qty!=null&&qty>=0)arr[idx].quantity=qty;
      });
      body.querySelectorAll('[data-remove-draft]').forEach(btn=>btn.onclick=()=>{
        const arr=window.__logisticsDraftItems||[];
        arr.splice(Number(btn.dataset.removeDraft),1);
        renderDraftItems();
      });
    }
  };
  renderDraftItems();

  if(!locked){
    document.getElementById('addShippingItem').onclick=()=>{
      const itemId=shippingItem.value;
      const qty=normalizeInputID(shippingQty.value);
      let price=normalizeInputID(shippingPrice?.value||'');
      if(!itemId||qty==null||qty<=0)return msg('Pilih Sapronak dan isi jumlah kiriman yang benar.');
      {
        const item=itemsAll.find(x=>x.id===itemId);
        const autoPrice=contractUnitPriceForItem(item);
        if(autoPrice!=null){
          price=autoPrice;
          if(shippingPrice)shippingPrice.value=formatInputID(String(autoPrice));
        }
      }
      if(price==null||price<0)return msg('Harga kontrak tidak ditemukan. Periksa kandang aktif dan Master Kontrak.');
      const arr=window.__logisticsDraftItems||[];
      const exists=arr.find(x=>x.item_id===itemId&&Number(x.unit_price||0)===Number(price));
      if(exists) exists.quantity=Number(exists.quantity)+Number(qty);
      else arr.push({item_id:itemId,quantity:qty,unit_price:price});
      shippingItem.value='';
      if(shippingItemSearch)shippingItemSearch.value='';
      if(shippingItemSuggestions)shippingItemSuggestions.innerHTML='';
      shippingQty.value='';
      if(shippingPrice)shippingPrice.value='';
      updateQtyContext();
      renderDraftItems();
    };

    document.getElementById('saveShippingDraft').onclick=async()=>{
      const fd=new FormData(document.getElementById('logisticsShippingForm'));
      const barnId=fd.get('barn_id');
      const assignment=selectedAssignment||activeByBarn.get(barnId);
      const arr=window.__logisticsDraftItems||[];
      if(!barnId)return msg('Kandang transaksi tidak ditemukan.');
      if(!assignment)return msg('Siklus transaksi tidak ditemukan atau belum dibuka oleh Administrator.');
      const sj=normalizeOptionalShippingNote(fd.get('shipping_note_number'));
      const duplicate=findDuplicateShippingNote(shipments,sj,fd.get('shipment_id'));
      if(duplicate)return msg('No. SJ '+sj+' sudah pernah digunakan. Gunakan No. SJ lain.');
      if(!arr.length)return msg('Tambahkan minimal satu Sapronak dan jumlah kirimannya.');
      if(arr.some(x=>!Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0))return msg('Jumlah kiriman harus lebih dari 0.');

      const shipmentId=fd.get('shipment_id')||null;
      const {error:saveError}=await db.rpc('save_logistics_shipment_atomic',{
        p_id:shipmentId,
        p_barn_id:barnId,
        p_assignment_id:assignment.id,
        p_shipment_date:fd.get('shipment_date'),
        p_shipping_note_number:sj||null,
        p_notes:fd.get('notes')||null,
        p_items:arr.map(x=>({item_id:x.item_id,quantity:x.quantity,unit_price:x.unit_price}))
      });
      if(saveError)return msg(saveError.message);

      window.__logisticsDraftItems=[];
      await logisticsShippingPage();
      msg(shipmentId?'Pengiriman berhasil diperbarui.':'Draft pengiriman tersimpan.',true);
    };
    if(selected) document.getElementById('cancelShippingEdit').onclick=()=>logisticsShippingPage();
  }

  root.querySelectorAll('[data-view-shipment]').forEach(btn=>btn.onclick=()=>logisticsShippingPage(btn.dataset.viewShipment));
  root.querySelectorAll('[data-delete-shipment]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus draft pengiriman ini?'))return;
    const {error}=await db.from('logistics_shipments').delete().eq('id',btn.dataset.deleteShipment);
    if(error)return msg(error.message);
    await logisticsShippingPage();
    msg('Draft pengiriman dihapus.',true);
  });
  const err=br.error||ir.error||sr.error||sir.error||ar.error||kr.error||cpr.error;
  if(err)msg(err.message);
}

async function logisticsExternalShippingPage(editId=null){
  const [br,sr,ir,ar,hr,hir,cpr]=await Promise.all([
    db.from('barns').select('id,code,name,location,active').eq('active',true).order('code',{ascending:true}),
    db.from('suppliers').select('id,code,name,active,supplier_type').eq('active',true).eq('supplier_type','SAPRONAK').order('code',{ascending:true}),
    db.from('items').select('id,code,name,category,feed_phase,unit,kg_per_unit,supplier_id,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,active,start_date,cycle_type').order('created_at',{ascending:false}),
    db.from('logistics_external_shipments').select('*').order('shipment_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('logistics_external_shipment_items').select('*').order('created_at',{ascending:false}),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle()
  ]);
  const barns=br.data||[], supplierRows=sr.data||[], itemRows=ir.data||[], assignments=ar.data||[];
  const headers=hr.data||[], detailRows=hir.data||[], company=cpr.data||{};
  const txnExternal=txnListState(headers,'externalSapronak','shipment_date',5,barns),shownHeaders=txnExternal.rows;
  const activeAssignments=assignments.filter(a=>a.active&&(a.cycle_type||'MITRA')==='MITRA');
  const activeByBarn=new Map(activeAssignments.map(a=>[a.barn_id,a]));
  const allowedBarns=barns.filter(b=>activeByBarn.has(b.id));
  const selected=editId?headers.find(h=>h.id===editId):null;
  const selectedDetail=selected?detailRows.find(d=>d.external_shipment_id===selected.id):null;
  const selectedItem=selectedDetail?itemRows.find(i=>i.id===selectedDetail.item_id):null;
  const todayID=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  let html='<section class="panel"><h3>'+(selected?'Edit Tambah Sapronak':'Tambah Sapronak')+'</h3>'+
    '<p class="muted">Jumlah dicatat dalam satuan barang. Konversi Kg/Satuan dari Master Sapronak. Harga/Satuan dan Harga/Kg dihitung otomatis.</p>'+
    '<form id="externalShippingForm" class="form-vertical">'+
      '<input type="hidden" name="header_id" value="'+esc(selected?.id||'')+'">'+
      '<input type="hidden" name="detail_id" value="'+esc(selectedDetail?.id||'')+'">'+
      '<label>Cari / Pilih Kandang<input id="externalBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" value="'+(selected?esc(shortBarnLabel(barns.find(b=>b.id===selected.barn_id))):'')+'" required></label>'+
      '<input type="hidden" name="barn_id" id="externalBarnId" value="'+esc(selected?.barn_id||'')+'">'+
      '<div id="externalBarnSuggestions" class="search-suggestions"></div>'+
      '<label>Tanggal Kiriman<input type="date" name="shipment_date" value="'+esc(selected?.shipment_date||todayID())+'" required></label>'+
      '<label>Supplier<select name="supplier_id" id="externalSupplier" required><option value="">Pilih Supplier</option>'+
        supplierRows.map(s=>'<option value="'+esc(s.id)+'" '+(selected?.supplier_id===s.id?'selected':'')+'>'+esc(s.code+' · '+s.name)+'</option>').join('')+
      '</select></label>'+
      '<label>Cari / Pilih Sapronak<input id="externalItemSearch" autocomplete="off" placeholder="Pilih supplier lalu ketik kode / nama" value="'+esc(selectedItem?(selectedItem.code+' · '+selectedItem.name):'')+'"></label>'+
      '<input type="hidden" name="item_id" id="externalItem" value="'+esc(selectedDetail?.item_id||'')+'">'+
      '<div id="externalItemSuggestions" class="search-suggestions"></div>'+
      '<label>Jumlah (Satuan)<input name="quantity" id="externalQty" data-number="1" inputmode="decimal" value="'+(selectedDetail?fmtNumber(selectedDetail.quantity):'')+'" required></label>'+
      '<label>Konversi Kg / Satuan<input id="externalKgPerUnit" readonly tabindex="-1"></label>'+
      '<label>Total Berat (Kg)<input id="externalTotalKg" readonly tabindex="-1"></label>'+
      '<label>Harga Beli / Satuan<input name="purchase_unit_price" id="externalPrice" data-number="1" inputmode="decimal" value="'+(selectedDetail?fmtNumber(selectedDetail.purchase_unit_price):'')+'" required></label>'+
      '<label>Harga Beli / Kg<input id="externalPriceKg" data-number="1" inputmode="decimal" placeholder="Otomatis dari harga/satuan"></label>'+
      '<label>Total Pembelian<input id="externalTotal" readonly tabindex="-1"></label>'+
      '<label>No. Nota / Referensi<input name="reference_number" value="'+esc(selected?.reference_number||'')+'"></label>'+
      '<label>Catatan<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<button type="submit">'+(selected?'Simpan Perubahan':'Simpan Tambah Sapronak')+'</button>'+
      (selected?' <button type="button" id="cancelExternalEdit">Batal Edit</button>':'')+
    '</form></section>';

  html+='<section class="panel"><h3>Riwayat Tambah Sapronak</h3>'+txnExternal.controls+(txnExternal.st.shown?'<div class="report-actions"><button type="button" id="externalHistoryPrint">Cetak</button> <button type="button" id="externalHistoryPdf">PDF</button> <button type="button" id="externalHistoryExcel">Excel</button></div>':'')+'<div class="tablewrap"><table id="externalHistoryTable"><thead><tr>'+
    '<th>Tanggal</th><th>Kandang</th><th>Supplier</th><th>Sapronak</th><th>Jumlah</th><th>Satuan</th><th>Kg/Satuan</th><th>Total Kg</th><th>Harga/Satuan</th><th>Harga/Kg</th><th>Total</th><th>Referensi</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    shownHeaders.map(h=>{
      const b=barns.find(x=>x.id===h.barn_id);
      const s=supplierRows.find(x=>x.id===h.supplier_id);
      const d=detailRows.find(x=>x.external_shipment_id===h.id);
      const it=d?itemRows.find(x=>x.id===d.item_id):null;
      const total=d?Number(d.quantity||0)*Number(d.purchase_unit_price||0):0;
      const a=assignments.find(v=>v.id===h.contract_assignment_id);
      const isLocked=!a?.active;
      const kgPerUnit=Number(it?.kg_per_unit||0);
      const priceKg=kgPerUnit>0?Number(d?.purchase_unit_price||0)/kgPerUnit:null;
      return '<tr><td>'+esc(h.shipment_date||'')+'</td><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td>'+esc(s?s.name:'-')+'</td><td>'+esc(it?it.code+' · '+it.name:'-')+'</td><td>'+fmtNumber(d?.quantity)+'</td><td>'+esc(it?.unit||'-')+'</td><td>'+(kgPerUnit>0?fmtNumber(kgPerUnit):'-')+'</td><td>'+fmtNumber(d?.quantity_kg)+'</td><td>Rp '+fmtNumber(d?.purchase_unit_price)+'</td><td>'+(priceKg==null?'-':'Rp '+fmtNumber(priceKg))+'</td><td>Rp '+fmtNumber(total)+'</td><td>'+esc(h.reference_number||'-')+'</td><td>'+(isLocked?'<strong>Terkunci</strong>':'<button type="button" data-edit-external="'+esc(h.id)+'">Edit</button> <button type="button" data-delete-external="'+esc(h.id)+'">Hapus</button>')+'</td></tr>';
    }).join('')+
    '</tbody></table></div>'+(!txnExternal.total?'<p>Data Tambah Sapronak tidak ditemukan.</p>':'')+txnExternal.pager+'</section>';

  layout(html);
  [br,sr,ir,ar,hr,hir,cpr].forEach(x=>{if(x.error)msg(x.error.message)});
  bindNumberInputs();
  bindTxnList(txnExternal,()=>logisticsExternalShippingPage());

  if(txnExternal.st.shown){
    const historyTable=document.getElementById('externalHistoryTable');
    const externalReportHtml=()=>{
      const table=historyTable?historyTable.cloneNode(true):null;
      if(table)table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const b=barns.find(x=>x.id===txnExternal.st.barn);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Tambah Sapronak</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:8.5px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Tambah Sapronak</h2><p>Periode: '+esc(txnExternal.st.from||'-')+' s/d '+esc(txnExternal.st.to||'-')+' · Kandang: '+esc(b?shortBarnLabel(b):'Semua Kandang')+'</p>'+
        (table?table.outerHTML:'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const printExternalHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=externalReportHtml();w.document.write(pdf?html.replace('<title>Riwayat Tambah Sapronak</title>','<title>Riwayat_Tambah_Sapronak_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('externalHistoryPrint'),pdfBtn=document.getElementById('externalHistoryPdf'),excelBtn=document.getElementById('externalHistoryExcel');
    if(printBtn)printBtn.onclick=()=>printExternalHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(externalReportHtml(),'Riwayat_Tambah_Sapronak.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const table=historyTable.cloneNode(true);
      table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Tambah Sapronak</h2>'+table.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Tambah_Sapronak.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };

  const form=document.getElementById('externalShippingForm');
  const externalBarnSearch=document.getElementById('externalBarnSearch');
  const externalBarnId=document.getElementById('externalBarnId');
  const externalBarnSuggestions=document.getElementById('externalBarnSuggestions');
  if(externalBarnSearch&&externalBarnId&&externalBarnSuggestions){
    externalBarnSearch.oninput=()=>{
      const q=(externalBarnSearch.value||'').trim().toLowerCase();
      externalBarnId.value='';
      const rows=q?allowedBarns.filter(b=>[b.code,b.name,b.location].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5):[];
      externalBarnSuggestions.innerHTML=rows.map(b=>'<button type="button" class="search-suggestion" data-external-barn="'+esc(b.id)+'"><strong>'+esc(shortBarnLabel(b))+'</strong><small>'+esc(b.location||'')+'</small></button>').join('');
      if(q&&!rows.length)externalBarnSuggestions.innerHTML='<div class="search-empty">Kandang aktif tidak ditemukan.</div>';
      externalBarnSuggestions.querySelectorAll('[data-external-barn]').forEach(btn=>btn.onclick=()=>{
        const b=allowedBarns.find(x=>x.id===btn.dataset.externalBarn);if(!b)return;
        externalBarnId.value=b.id;externalBarnSearch.value=shortBarnLabel(b);externalBarnSuggestions.innerHTML='';
      });
    };
  }

  const supplierEl=document.getElementById('externalSupplier');
  const itemEl=document.getElementById('externalItem');
  const itemSearchEl=document.getElementById('externalItemSearch');
  const itemSuggestionsEl=document.getElementById('externalItemSuggestions');
  const qtyEl=document.getElementById('externalQty');
  const kgPerUnitEl=document.getElementById('externalKgPerUnit');
  const totalKgEl=document.getElementById('externalTotalKg');
  const priceEl=document.getElementById('externalPrice');
  const priceKgEl=document.getElementById('externalPriceKg');
  const totalEl=document.getElementById('externalTotal');
  let priceSource='unit';

  const currentItem=()=>itemRows.find(i=>i.id===itemEl.value);
  const calcAll=()=>{
    const it=currentItem();
    const kg=Number(it?.kg_per_unit||0);
    const q=normalizeInputID(qtyEl.value)||0;
    let unitPrice=normalizeInputID(priceEl.value)||0;
    let kgPrice=normalizeInputID(priceKgEl.value)||0;
    kgPerUnitEl.value=kg>0?fmtNumber(kg)+' Kg':'Tidak memakai konversi Kg';
    totalKgEl.value=q&&kg>0?fmtNumber(q*kg):'';
    priceKgEl.disabled=!(kg>0);
    if(kg>0){
      if(priceSource==='kg'&&kgPrice>0){
        unitPrice=kgPrice*kg;
        priceEl.value=fmtNumber(unitPrice);
      }else if(unitPrice>0){
        kgPrice=unitPrice/kg;
        priceKgEl.value=fmtNumber(kgPrice);
      }
    }else{
      priceKgEl.value='';
    }
    totalEl.value=q&&unitPrice?'Rp '+fmtNumber(q*unitPrice):'';
  };
  const renderExternalItemSuggestions=()=>{
    const sid=supplierEl.value;
    const q=(itemSearchEl?.value||'').trim().toLowerCase();
    if(!sid){
      itemEl.value='';
      if(itemSuggestionsEl)itemSuggestionsEl.innerHTML='<div class="search-empty">Pilih Supplier terlebih dahulu.</div>';
      calcAll();
      return;
    }
    const filtered=q?itemRows.filter(i=>i.supplier_id===sid && [i.code,i.name,i.category,i.unit].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5):[];
    if(itemSuggestionsEl){
      itemSuggestionsEl.innerHTML=filtered.map(i=>'<button type="button" class="search-suggestion" data-external-item="'+esc(i.id)+'"><strong>'+esc(i.code+' · '+i.name)+'</strong><br><small>'+esc([i.category,i.unit,i.kg_per_unit?fmtNumber(i.kg_per_unit)+' Kg':null].filter(Boolean).join(' · '))+'</small></button>').join('');
      if(q&&!filtered.length)itemSuggestionsEl.innerHTML='<div class="search-empty">Sapronak tidak ditemukan untuk Supplier ini.</div>';
      itemSuggestionsEl.querySelectorAll('[data-external-item]').forEach(btn=>btn.onclick=()=>{
        const item=itemRows.find(i=>i.id===btn.dataset.externalItem);
        if(!item)return;
        itemEl.value=item.id;
        itemSearchEl.value=item.code+' · '+item.name;
        itemSuggestionsEl.innerHTML='';
        priceSource='unit';
        calcAll();
      });
    }
  };
  const refreshItems=()=>{
    const current=itemRows.find(i=>i.id===itemEl.value);
    if(!current||current.supplier_id!==supplierEl.value){
      itemEl.value='';
      if(itemSearchEl)itemSearchEl.value='';
    }
    if(itemSuggestionsEl)itemSuggestionsEl.innerHTML='';
    calcAll();
  };

  supplierEl.onchange=()=>{refreshItems();};
  if(itemSearchEl){
    itemSearchEl.oninput=()=>{itemEl.value='';renderExternalItemSuggestions();calcAll();};
    itemSearchEl.onfocus=renderExternalItemSuggestions;
  }
  qtyEl.addEventListener('input',calcAll);
  priceEl.addEventListener('input',()=>{priceSource='unit';calcAll();});
  priceKgEl.addEventListener('input',()=>{priceSource='kg';calcAll();});

  if(supplierEl.value)refreshItems();
  if(selectedDetail){
    itemEl.value=selectedDetail.item_id;
    if(itemSearchEl&&selectedItem)itemSearchEl.value=selectedItem.code+' · '+selectedItem.name;
    calcAll();
  }

  form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    const barnId=fd.get('barn_id');
    const assignment=activeByBarn.get(barnId);
    if(!assignment)return msg('Kandang belum memiliki kontrak Logistik aktif.');
    const supplierId=fd.get('supplier_id');
    const itemId=fd.get('item_id');
    const it=itemRows.find(i=>i.id===itemId);
    if(!it||it.supplier_id!==supplierId)return msg('Sapronak tidak sesuai Supplier.');
    const quantity=normalizeInputID(fd.get('quantity'));
    const price=normalizeInputID(fd.get('purchase_unit_price'));
    if(!(quantity>0))return msg('Jumlah harus lebih dari 0.');
    if(price===null||price<0)return msg('Harga beli tidak valid.');

    const headerId=fd.get('header_id')||null;
    const detailId=fd.get('detail_id')||null;
    const {error:saveError}=await db.rpc('save_external_sapronak_atomic',{
      p_header_id:headerId,
      p_detail_id:detailId,
      p_assignment_id:assignment.id,
      p_barn_id:barnId,
      p_supplier_id:supplierId,
      p_shipment_date:fd.get('shipment_date'),
      p_reference_number:fd.get('reference_number')||null,
      p_notes:fd.get('notes')||null,
      p_item_id:itemId,
      p_quantity:quantity,
      p_purchase_unit_price:price
    });
    if(saveError)return msg(saveError.message);
    await logisticsExternalShippingPage();
    msg(headerId?'Tambah Sapronak berhasil diperbarui.':'Tambah Sapronak berhasil disimpan.',true);
  };

  document.querySelectorAll('[data-edit-external]').forEach(btn=>btn.onclick=()=>logisticsExternalShippingPage(btn.dataset.editExternal));
  document.querySelectorAll('[data-delete-external]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus data Tambah Sapronak ini?'))return;
    const {error}=await db.from('logistics_external_shipments').delete().eq('id',btn.dataset.deleteExternal);
    if(error)return msg(error.message);
    await logisticsExternalShippingPage();
    msg('Data Tambah Sapronak berhasil dihapus.',true);
  });
  const cancel=document.getElementById('cancelExternalEdit');
  if(cancel)cancel.onclick=()=>logisticsExternalShippingPage();
}

async function logisticsMandiriPurchasePage(editId=null){
  const [sr,ir,ar,br,pr,alr,cpr]=await Promise.all([
    db.from('suppliers').select('id,code,name,active,supplier_type').eq('active',true).eq('supplier_type','SAPRONAK').order('code',{ascending:true}),
    db.from('items').select('id,code,name,category,unit,kg_per_unit,supplier_id,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,start_date,active,cycle_type').order('start_date',{ascending:false}),
    db.from('barns').select('id,code,name,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_mandiri_purchases').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('logistics_mandiri_purchase_allocations').select('*').order('created_at',{ascending:true}),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle()
  ]);
  const suppliers=sr.data||[],items=ir.data||[],assignments=ar.data||[],barns=br.data||[],purchases=pr.data||[],allocations=alr.data||[],company=cpr.data||{};
  window.__mandiriPurchaseHistoryFilter=window.__mandiriPurchaseHistoryFilter||{supplier:'',item:'',assignment:'',from:'',to:'',shown:false};
  const mandiriHistoryFilter=window.__mandiriPurchaseHistoryFilter;
  const mandiriHistoryRows=mandiriHistoryFilter.shown?purchases.filter(p=>{
    const aa=allocations.filter(x=>x.purchase_id===p.id);
    return (!mandiriHistoryFilter.supplier||p.supplier_id===mandiriHistoryFilter.supplier)&&
      (!mandiriHistoryFilter.item||p.item_id===mandiriHistoryFilter.item)&&
      (!mandiriHistoryFilter.assignment||aa.some(x=>x.contract_assignment_id===mandiriHistoryFilter.assignment))&&
      (!mandiriHistoryFilter.from||String(p.purchase_date||'')>=mandiriHistoryFilter.from)&&
      (!mandiriHistoryFilter.to||String(p.purchase_date||'')<=mandiriHistoryFilter.to);
  }):[];
  const activeMandiri=assignments.filter(a=>a.active&&a.cycle_type==='MANDIRI');
  const selected=editId?purchases.find(x=>x.id===editId):null;
  const selectedAlloc=selected?allocations.filter(x=>x.purchase_id===selected.id):[];
  const today=prodToday();
  const assignmentText=a=>{
    const b=barns.find(x=>x.id===a.barn_id);
    return (b?shortBarnLabel(b):'-')+' · '+assignmentCycleLabel(assignments,a)+' · MANDIRI';
  };
  const lockedPurchase=p=>allocations.filter(x=>x.purchase_id===p.id).some(x=>!assignments.find(a=>a.id===x.contract_assignment_id)?.active);

  let html='<section class="panel"><h3>'+(selected?'Edit Pembelian Mandiri':'Pembelian Mandiri')+'</h3>'+
    '<p class="muted">Input pembelian sekali, lalu bagi langsung ke satu atau beberapa kandang Mandiri. Sisa yang belum dibagi tercatat sebagai stok gudang pembelian.</p>'+
    '<form id="mandiriPurchaseForm" class="form-vertical">'+
      '<input type="hidden" name="purchase_id" value="'+esc(selected?.id||'')+'">'+
      '<label>Tanggal Pembelian<input type="date" name="purchase_date" value="'+esc(selected?.purchase_date||today)+'" required></label>'+
      '<label>Supplier<select name="supplier_id" id="mandiriPurchaseSupplier" required><option value="">Pilih Supplier</option>'+
        suppliers.map(x=>'<option value="'+esc(x.id)+'" '+(selected?.supplier_id===x.id?'selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>').join('')+
      '</select></label>'+
      '<label>Barang (Pakan / OVK / DOC)<select name="item_id" id="mandiriPurchaseItem" required><option value="">Pilih Barang</option></select></label>'+
      '<label>Jumlah Pembelian<input type="text" name="quantity" id="mandiriPurchaseQty" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.quantity):'')+'" required></label>'+
      '<label>Harga Beli / Satuan<input type="text" name="purchase_unit_price" id="mandiriPurchasePrice" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.purchase_unit_price):'')+'" required></label>'+
      '<label>Total Pembelian<input id="mandiriPurchaseTotal" readonly tabindex="-1"></label>'+
      '<label>No. Nota / Referensi<input name="reference_number" value="'+esc(selected?.reference_number||'')+'"></label>'+
      '<label>Catatan<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<section class="panel" style="margin:0"><h4>Kirim / Bagi Pakan, OVK, atau DOC ke Kandang Mandiri</h4><div id="mandiriAllocationRows"></div><button type="button" id="addMandiriAllocation">+ Tambah Kandang</button><p id="mandiriAllocationSummary" class="muted"></p></section>'+
      '<button type="submit">'+(selected?'Simpan Perubahan':'Simpan Pembelian Mandiri')+'</button>'+
      (selected?'<button type="button" id="cancelMandiriPurchase">Batal Edit</button>':'')+
    '</form></section>';

  html+='<section class="panel"><h3>Riwayat Pembelian Mandiri</h3>'+
    '<p class="muted">Pilih filter lalu klik Tampilkan untuk melihat riwayat pembelian.</p>'+
    '<form id="mandiriPurchaseHistoryFilter" class="form-vertical compact-form" data-no-submit-guard="1">'+
      '<label>Supplier<select name="supplier"><option value="">Semua Supplier</option>'+suppliers.map(x=>'<option value="'+esc(x.id)+'" '+(mandiriHistoryFilter.supplier===x.id?'selected':'')+'>'+esc(x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
      '<label>Barang<select name="item"><option value="">Semua Barang</option>'+items.map(x=>'<option value="'+esc(x.id)+'" '+(mandiriHistoryFilter.item===x.id?'selected':'')+'>'+esc(x.category+' · '+x.code+' · '+x.name)+'</option>').join('')+'</select></label>'+
      '<label>Kandang / Siklus<select name="assignment"><option value="">Semua Kandang / Siklus</option>'+assignments.filter(a=>a.cycle_type==='MANDIRI').map(a=>'<option value="'+esc(a.id)+'" '+(mandiriHistoryFilter.assignment===a.id?'selected':'')+'>'+esc(assignmentText(a)+(a.active?' · AKTIF':' · CLOSED'))+'</option>').join('')+'</select></label>'+
      '<label>Tanggal Dari<input type="date" name="from" value="'+esc(mandiriHistoryFilter.from||'')+'"></label>'+
      '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(mandiriHistoryFilter.to||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="mandiriPurchaseHistoryReset">Reset</button></div>'+
    '</form>'+
    (mandiriHistoryFilter.shown?'<div class="report-actions"><button type="button" id="mandiriPurchasePrint">Cetak</button> <button type="button" id="mandiriPurchasePdf">PDF</button> <button type="button" id="mandiriPurchaseExcel">Excel</button></div><div class="tablewrap"><table><thead><tr>'+
      '<th>Tanggal</th><th>Supplier</th><th>Barang</th><th>Jumlah</th><th>Harga/Satuan</th><th>Total</th><th>Terdistribusi</th><th>Sisa Gudang</th><th>Tujuan</th><th>Aksi</th>'+
      '</tr></thead><tbody>'+
      mandiriHistoryRows.map(p=>{
        const sup=suppliers.find(x=>x.id===p.supplier_id),it=items.find(x=>x.id===p.item_id);
        const aa=allocations.filter(x=>x.purchase_id===p.id);
        const allocated=aa.reduce((n,x)=>n+prodNum(x.quantity),0);
        const targets=aa.map(x=>{const a=assignments.find(v=>v.id===x.contract_assignment_id);return (a?assignmentText(a):'-')+' ('+fmtNumber(x.quantity)+' '+(it?.unit||'')+')';}).join('<br>');
        const locked=lockedPurchase(p);
        return '<tr><td>'+esc(p.purchase_date||'')+'</td><td>'+esc(sup?.name||'-')+'</td><td>'+esc((it?.code?it.code+' · ':'')+(it?.name||'-'))+'</td><td>'+fmtNumber(p.quantity)+' '+esc(it?.unit||'')+'</td><td>Rp '+fmtNumber(p.purchase_unit_price)+'</td><td>Rp '+fmtNumber(prodNum(p.quantity)*prodNum(p.purchase_unit_price))+'</td><td>'+fmtNumber(allocated)+'</td><td><strong>'+fmtNumber(Math.max(0,prodNum(p.quantity)-allocated))+'</strong></td><td>'+targets+'</td><td>'+(locked?'<strong>Terkunci</strong>':'<button type="button" data-edit-mandiri-purchase="'+esc(p.id)+'">Edit</button> <button type="button" data-delete-mandiri-purchase="'+esc(p.id)+'">Hapus</button>')+'</td></tr>';
      }).join('')+
      '</tbody></table></div>'+(mandiriHistoryRows.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();
  const err=[sr,ir,ar,br,pr,alr,cpr].find(x=>x.error)?.error;if(err)msg(err.message);
  const mandiriPurchaseHistoryForm=document.getElementById('mandiriPurchaseHistoryFilter');
  const mandiriPurchaseHistoryReset=document.getElementById('mandiriPurchaseHistoryReset');
  if(mandiriPurchaseHistoryForm)mandiriPurchaseHistoryForm.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(mandiriPurchaseHistoryForm);
    mandiriHistoryFilter.supplier=String(fd.get('supplier')||'');
    mandiriHistoryFilter.item=String(fd.get('item')||'');
    mandiriHistoryFilter.assignment=String(fd.get('assignment')||'');
    mandiriHistoryFilter.from=String(fd.get('from')||'');
    mandiriHistoryFilter.to=String(fd.get('to')||'');
    if(mandiriHistoryFilter.from&&mandiriHistoryFilter.to&&mandiriHistoryFilter.from>mandiriHistoryFilter.to){
      const t=mandiriHistoryFilter.from;mandiriHistoryFilter.from=mandiriHistoryFilter.to;mandiriHistoryFilter.to=t;
    }
    mandiriHistoryFilter.shown=true;
    await logisticsMandiriPurchasePage();
  };
  if(mandiriPurchaseHistoryReset)mandiriPurchaseHistoryReset.onclick=async()=>{
    window.__mandiriPurchaseHistoryFilter={supplier:'',item:'',assignment:'',from:'',to:'',shown:false};
    await logisticsMandiriPurchasePage();
  };

  if(mandiriHistoryFilter.shown){
    const historyReportRows=()=>mandiriHistoryRows.map(p=>{
      const sup=suppliers.find(x=>x.id===p.supplier_id),it=items.find(x=>x.id===p.item_id);
      const aa=allocations.filter(x=>x.purchase_id===p.id);
      const allocated=aa.reduce((n,x)=>n+prodNum(x.quantity),0);
      const targets=aa.map(x=>{const a=assignments.find(v=>v.id===x.contract_assignment_id);return (a?assignmentText(a):'-')+' ('+fmtNumber(x.quantity)+' '+(it?.unit||'')+')';}).join(' | ');
      return {
        date:p.purchase_date||'',supplier:sup?.name||'-',item:(it?.code?it.code+' · ':'')+(it?.name||'-'),
        quantity:prodNum(p.quantity),unit:it?.unit||'',unit_price:prodNum(p.purchase_unit_price),
        total:prodNum(p.quantity)*prodNum(p.purchase_unit_price),allocated,
        remaining:Math.max(0,prodNum(p.quantity)-allocated),targets,reference:p.reference_number||'-'
      };
    });
    const historyReportHtml=()=>{
      const rows=historyReportRows(),f=mandiriHistoryFilter;
      const supplier=suppliers.find(x=>x.id===f.supplier),item=items.find(x=>x.id===f.item),assignment=assignments.find(x=>x.id===f.assignment);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Pembelian Mandiri</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}h2{margin:0 0 5px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Pembelian Mandiri</h2><p>Periode: '+esc(f.from||'-')+' s/d '+esc(f.to||'-')+' · Supplier: '+esc(supplier?.name||'Semua')+' · Barang: '+esc(item?.name||'Semua')+' · Kandang/Siklus: '+esc(assignment?assignmentText(assignment):'Semua')+'</p>'+
        '<table><thead><tr><th>Tanggal</th><th>Supplier</th><th>Barang</th><th>Jumlah</th><th>Harga/Satuan</th><th>Total</th><th>Terdistribusi</th><th>Sisa Gudang</th><th>Tujuan</th><th>Referensi</th></tr></thead><tbody>'+
        rows.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.supplier)+'</td><td>'+esc(x.item)+'</td><td>'+fmtNumber(x.quantity)+' '+esc(x.unit)+'</td><td>Rp '+fmtNumber(x.unit_price)+'</td><td>Rp '+fmtNumber(x.total)+'</td><td>'+fmtNumber(x.allocated)+'</td><td>'+fmtNumber(x.remaining)+'</td><td>'+esc(x.targets||'-')+'</td><td>'+esc(x.reference)+'</td></tr>').join('')+
        '</tbody></table></body></html>';
    };
    const printHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=historyReportHtml();
      w.document.write(pdf?html.replace('<title>Riwayat Pembelian Mandiri</title>','<title>Riwayat_Pembelian_Mandiri_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('mandiriPurchasePrint'),pdfBtn=document.getElementById('mandiriPurchasePdf'),excelBtn=document.getElementById('mandiriPurchaseExcel');
    if(printBtn)printBtn.onclick=()=>printHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(reportHtml(),'Riwayat_Pembelian_Mandiri.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      const rows=historyReportRows();
      BMSCore.downloadWorkbook([{name:'Pembelian Mandiri',rows:[
        ['Tanggal','Supplier','Barang','Jumlah','Satuan','Harga/Satuan','Total','Terdistribusi','Sisa Gudang','Tujuan','Referensi'],
        ...rows.map(x=>[x.date,x.supplier,x.item,x.quantity,x.unit,x.unit_price,x.total,x.allocated,x.remaining,x.targets,x.reference])
      ]}],'Riwayat_Pembelian_Mandiri');
    };
  };

  const form=document.getElementById('mandiriPurchaseForm');
  const supplierEl=document.getElementById('mandiriPurchaseSupplier');
  const itemEl=document.getElementById('mandiriPurchaseItem');
  const qtyEl=document.getElementById('mandiriPurchaseQty');
  const priceEl=document.getElementById('mandiriPurchasePrice');
  const totalEl=document.getElementById('mandiriPurchaseTotal');
  const rowsEl=document.getElementById('mandiriAllocationRows');
  const summaryEl=document.getElementById('mandiriAllocationSummary');

  const draft=selectedAlloc.length?selectedAlloc.map(x=>({assignment_id:x.contract_assignment_id,quantity:prodNum(x.quantity)})):[{assignment_id:'',quantity:0}];

  const refreshItems=()=>{
    const sid=supplierEl.value;
    const current=selected?.item_id||itemEl.value;
    const list=items.filter(x=>sid&&(x.supplier_id===sid||!x.supplier_id));
    itemEl.innerHTML='<option value="">Pilih Barang</option>'+list.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===current?'selected':'')+'>'+esc(x.category+' · '+x.code+' · '+x.name+' · '+(x.unit||'-'))+'</option>').join('');
    if(!list.some(x=>x.id===itemEl.value))itemEl.value='';
  };
  const syncDraft=()=>{
    rowsEl.querySelectorAll('[data-mandiri-alloc-assignment]').forEach(el=>{const i=Number(el.dataset.mandiriAllocAssignment);if(draft[i])draft[i].assignment_id=el.value;});
    rowsEl.querySelectorAll('[data-mandiri-alloc-qty]').forEach(el=>{const i=Number(el.dataset.mandiriAllocQty);if(draft[i])draft[i].quantity=normalizeInputID(el.value)||0;});
  };
  const updateTotals=()=>{
    const q=normalizeInputID(qtyEl.value)||0,p=normalizeInputID(priceEl.value)||0;
    totalEl.value=q&&p?'Rp '+fmtNumber(q*p):'';
    syncDraft();
    const used=draft.reduce((n,x)=>n+prodNum(x.quantity),0);
    const rem=q-used;
    summaryEl.textContent='Terdistribusi: '+fmtNumber(used)+' · Sisa Gudang: '+fmtNumber(Math.max(0,rem))+(rem<0?' · MELEBIHI PEMBELIAN':'');
  };
  const renderAllocations=()=>{
    rowsEl.innerHTML=draft.map((r,i)=>{
      const used=new Set(draft.filter((x,j)=>j!==i&&x.assignment_id).map(x=>x.assignment_id));
      return '<div class="return-grid" style="margin-bottom:8px"><label>Kandang / Siklus<select data-mandiri-alloc-assignment="'+i+'" required><option value="">Pilih Kandang Mandiri</option>'+
        activeMandiri.filter(a=>!used.has(a.id)||a.id===r.assignment_id).map(a=>'<option value="'+esc(a.id)+'" '+(a.id===r.assignment_id?'selected':'')+'>'+esc(assignmentText(a))+'</option>').join('')+
        '</select></label><label>Jumlah<input type="text" data-number="1" inputmode="decimal" data-mandiri-alloc-qty="'+i+'" value="'+(r.quantity?fmtNumber(r.quantity):'')+'" required></label>'+
        (draft.length>1?'<button type="button" data-remove-mandiri-alloc="'+i+'">Hapus</button>':'')+'</div>';
    }).join('');
    bindNumberInputs();
    rowsEl.querySelectorAll('[data-mandiri-alloc-assignment]').forEach(el=>el.onchange=()=>{syncDraft();renderAllocations();});
    rowsEl.querySelectorAll('[data-mandiri-alloc-qty]').forEach(el=>el.oninput=updateTotals);
    rowsEl.querySelectorAll('[data-remove-mandiri-alloc]').forEach(btn=>btn.onclick=()=>{syncDraft();draft.splice(Number(btn.dataset.removeMandiriAlloc),1);renderAllocations();});
    updateTotals();
  };
  supplierEl.onchange=()=>{selected&&(selected.item_id=null);refreshItems();};
  qtyEl.oninput=updateTotals;priceEl.oninput=updateTotals;
  refreshItems();if(selected)itemEl.value=selected.item_id;
  renderAllocations();
  document.getElementById('addMandiriAllocation').onclick=()=>{syncDraft();draft.push({assignment_id:'',quantity:0});renderAllocations();};

  form.onsubmit=async ev=>{
    ev.preventDefault();syncDraft();
    const fd=new FormData(form);
    const quantity=normalizeInputID(fd.get('quantity')),price=normalizeInputID(fd.get('purchase_unit_price'));
    const valid=draft.filter(x=>x.assignment_id&&prodNum(x.quantity)>0);
    if(!(quantity>0))return msg('Jumlah pembelian harus lebih dari 0.');
    if(price===null||price<0)return msg('Harga beli tidak valid.');
    if(!valid.length)return msg('Pilih minimal satu kandang Mandiri untuk distribusi.');
    if(new Set(valid.map(x=>x.assignment_id)).size!==valid.length)return msg('Kandang tujuan tidak boleh duplikat.');
    const allocated=valid.reduce((n,x)=>n+prodNum(x.quantity),0);
    if(allocated>quantity)return msg('Total distribusi melebihi jumlah pembelian.');
    const {error}=await db.rpc('save_mandiri_purchase_atomic',{
      p_purchase_id:fd.get('purchase_id')||null,
      p_supplier_id:fd.get('supplier_id'),
      p_item_id:fd.get('item_id'),
      p_purchase_date:fd.get('purchase_date'),
      p_quantity:quantity,
      p_purchase_unit_price:price,
      p_reference_number:String(fd.get('reference_number')||'')||null,
      p_notes:String(fd.get('notes')||'')||null,
      p_allocations:valid
    });
    if(error)return msg(error.message);
    await logisticsMandiriPurchasePage();msg('Pembelian Mandiri dan distribusi kandang tersimpan.',true);
  };
  root.querySelectorAll('[data-edit-mandiri-purchase]').forEach(btn=>btn.onclick=()=>logisticsMandiriPurchasePage(btn.dataset.editMandiriPurchase));
  root.querySelectorAll('[data-delete-mandiri-purchase]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus Pembelian Mandiri ini beserta distribusinya?'))return;
    const {error}=await db.rpc('delete_mandiri_purchase_atomic',{p_purchase_id:btn.dataset.deleteMandiriPurchase});
    if(error)return msg(error.message);
    await logisticsMandiriPurchasePage();msg('Pembelian Mandiri dihapus.',true);
  });
  const cancel=document.getElementById('cancelMandiriPurchase');if(cancel)cancel.onclick=()=>logisticsMandiriPurchasePage();
}


async function marketingCustomerPage(){
  const {data,error}=await db.from('marketing_customers').select('*').order('name',{ascending:true});
  const rows=data||[];
  let html='<section class="panel"><h3>Master Pelanggan</h3><p class="muted">Dipakai untuk penjualan Panen Mandiri.</p>'+
    '<form id="marketingCustomerForm" class="form-vertical"><input type="hidden" name="id">'+
      '<label>Nama Pelanggan<input name="name" required></label>'+
      '<label>Alamat<textarea name="address"></textarea></label>'+
      '<label>Telepon / WhatsApp<input name="phone"></label>'+
      '<label>Catatan<textarea name="notes"></textarea></label>'+
      '<button type="submit" id="marketingCustomerSave">Simpan Pelanggan</button><button type="button" id="marketingCustomerCancel" hidden>Batal Edit</button>'+
    '</form></section>'+
    '<section class="panel"><h3>Data Pelanggan</h3><div class="tablewrap"><table id="marketingCustomerTable"><thead><tr><th>Nama</th><th>Alamat</th><th>Telepon</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
      rows.map(x=>'<tr><td>'+esc(x.name||'')+'</td><td>'+esc(x.address||'-')+'</td><td>'+esc(x.phone||'-')+'</td><td>'+(x.active?'AKTIF':'NONAKTIF')+'</td><td><button type="button" data-edit-marketing-customer="'+esc(x.id)+'">Edit</button> <button type="button" data-toggle-marketing-customer="'+esc(x.id)+'">'+(x.active?'Nonaktifkan':'Aktifkan')+'</button></td></tr>').join('')+
    '</tbody></table></div>'+(!rows.length?'<p>Belum ada pelanggan.</p>':'')+'</section>';
  layout(html);if(error)msg(error.message);
  attachListFilter({tableId:'marketingCustomerTable',fields:[{label:'Nama',col:0,placeholder:'Cari pelanggan'},{label:'Alamat',col:1,placeholder:'Cari alamat'},{label:'Telepon',col:2,placeholder:'Cari telepon'},{label:'Status',col:3,placeholder:'AKTIF / NONAKTIF'}]});
  const form=document.getElementById('marketingCustomerForm'),save=document.getElementById('marketingCustomerSave'),cancel=document.getElementById('marketingCustomerCancel');
  const reset=()=>{form.reset();form.elements.id.value='';save.textContent='Simpan Pelanggan';cancel.hidden=true;};
  cancel.onclick=reset;
  root.querySelectorAll('[data-edit-marketing-customer]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.id===btn.dataset.editMarketingCustomer);if(!x)return;
    ['id','name','address','phone','notes'].forEach(k=>{form.elements[k].value=x[k]||'';});
    save.textContent='Simpan Perubahan';cancel.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'});
  });
  root.querySelectorAll('[data-toggle-marketing-customer]').forEach(btn=>btn.onclick=async()=>{
    const x=rows.find(v=>v.id===btn.dataset.toggleMarketingCustomer);if(!x)return;
    const {error}=await db.from('marketing_customers').update({active:!x.active,updated_at:new Date().toISOString()}).eq('id',x.id);
    if(error)return msg(error.message);
    await marketingCustomerPage();msg(x.active?'Pelanggan dinonaktifkan.':'Pelanggan diaktifkan.',true);
  });
  form.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(form),id=fd.get('id');
    const payload={name:String(fd.get('name')||'').trim(),address:String(fd.get('address')||'')||null,phone:String(fd.get('phone')||'')||null,notes:String(fd.get('notes')||'')||null,updated_at:new Date().toISOString()};
    if(!payload.name)return msg('Nama pelanggan wajib diisi.');
    const q=id?db.from('marketing_customers').update(payload).eq('id',id):db.from('marketing_customers').insert(payload);
    const {error}=await q;if(error)return msg(error.message);
    await marketingCustomerPage();msg(id?'Pelanggan diperbarui.':'Pelanggan tersimpan.',true);
  };
}

async function marketingContractHarvestPage(editId=null,mode='MITRA'){
  const [br,ar,cr,hr,lpr,cur,cpr]=await Promise.all([
    db.from('barns').select('id,code,name,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type').order('start_date',{ascending:false}),
    db.from('contracts').select('id,number,doc_price,pre_starter_price,starter_price,finisher_price,ovk_price,ovk_price_basis,ovk_vat_percent').is('cycle_id',null),
    db.from('marketing_contract_harvests').select('*').order('harvested_on',{ascending:false}).order('created_at',{ascending:false}),
    db.from('contract_live_prices').select('contract_id,min_weight_kg,max_weight_kg,price_per_kg').order('min_weight_kg'),
    db.from('marketing_customers').select('id,name,address,phone,active').eq('active',true).order('name',{ascending:true}),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle()
  ]);
  const barns=br.data||[],assignments=ar.data||[],contractsRows=cr.data||[],livePrices=lpr.data||[],customers=cur.data||[],company=cpr.data||{};
  const assignmentsById=new Map(assignments.map(a=>[a.id,a]));
  const rows=(hr.data||[]).filter(h=>(assignmentsById.get(h.contract_assignment_id)?.cycle_type||'MITRA')===mode);
  const txnHarvest=txnListState(rows,'marketingHarvest'+mode,'harvested_on',5,barns,'barn_id',{assignmentKey:'contract_assignment_id',assignments:assignments.filter(a=>(a.cycle_type||'MITRA')===mode).map(a=>({id:a.id,barn_id:a.barn_id,label:assignmentCycleLabel(assignments,a)+' · '+mode+' · '+(a.active?'AKTIF':'CLOSED')}))}),pageRows=txnHarvest.rows;
  const activeAssignments=assignments.filter(a=>a.active&&(a.cycle_type||'MITRA')===mode);
  const activeByBarn=new Map(activeAssignments.map(a=>[a.barn_id,a]));
  const allowedBarns=barns.filter(b=>activeByBarn.has(b.id));
  const selected=editId?rows.find(x=>x.id===editId):null;
  const todayID=prodToday();

  let html='<section class="panel"><h3>'+(selected?'Edit Panen ':'Panen ')+mode+'</h3>'+
    '<p class="muted">'+(mode==='MANDIRI'?'Pilih pelanggan dan isi harga jual aktual.':'Harga panen otomatis mengikuti kontrak Mitra.')+'</p>'+
    '<form id="contractHarvestForm" class="form-vertical">'+
      '<input type="hidden" name="id" value="'+esc(selected?.id||'')+'">'+
      '<label>Cari / Pilih Kandang<input id="harvestBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" value="'+(selected?esc(shortBarnLabel(barns.find(b=>b.id===selected.barn_id))):'')+'" required></label>'+
      '<input type="hidden" name="barn_id" id="harvestBarnId" value="'+esc(selected?.barn_id||'')+'">'+
      '<div id="harvestBarnSuggestions" class="search-suggestions"></div>'+
      '<div id="harvestCycleInfo" class="muted"></div>'+
      '<label>Tanggal<input type="date" name="harvested_on" value="'+esc(selected?.harvested_on||todayID)+'" required></label>'+
      (mode==='MITRA'?'<div id="harvestMitraBuyer"><label>Pembeli / RPA<input name="buyer_name" value="'+esc(selected?.buyer_name||'')+'"></label></div>':'<div id="harvestMandiriBuyer"><label>Pelanggan<select name="buyer_id" id="harvestBuyerId" required><option value="">Pilih Pelanggan</option>'+customers.map(c=>'<option value="'+esc(c.id)+'" '+(selected?.buyer_id===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label></div>')+
      '<label>No Mobil<input name="vehicle_number" value="'+esc(selected?.vehicle_number||'')+'" required></label>'+
      '<label>Ekor<input name="birds" id="contractHarvestBirds" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.birds):'')+'" required></label>'+
      '<label>KG<input name="net_weight_kg" id="contractHarvestWeight" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.net_weight_kg):'')+'" required></label>'+
      (mode==='MANDIRI'?'<div id="harvestMandiriPrice"><label>Harga Jual / Kg<input name="manual_price_per_kg" id="harvestManualPrice" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.price_per_kg):'')+'" required></label></div>':'')+
      '<label>Harga / Kg<input id="harvestPricePreview" readonly tabindex="-1"></label>'+
      '<label>Total Penjualan<input id="harvestTotalPreview" readonly tabindex="-1"></label>'+
      '<button type="submit">'+(selected?'Simpan Perubahan':'Simpan Panen')+'</button>'+
      (selected?' <button type="button" id="cancelHarvestEdit">Batal Edit</button>':'')+
    '</form></section>';

  html+='<section class="panel"><h3>Riwayat Panen '+mode+'</h3>'+txnHarvest.controls+(txnHarvest.st.shown?'<div class="report-actions">'+(mode==='MITRA'?'<button type="button" id="harvestMitraHistoryPrint">Cetak</button> <button type="button" id="harvestMitraHistoryPdf">PDF</button> <button type="button" id="harvestMitraHistoryExcel">Excel</button>':'<button type="button" id="harvestMandiriHistoryPrint">Cetak</button> <button type="button" id="harvestMandiriHistoryPdf">PDF</button> <button type="button" id="harvestMandiriHistoryExcel">Excel</button>')+'</div>':'')+'<div class="tablewrap"><table id="harvestHistoryTable"><thead><tr>'+
    '<th>Tanggal</th><th>Kandang / Siklus</th><th>Jenis</th><th>Pembeli</th><th>No Mobil</th><th>Ekor</th><th>KG</th><th>Harga/Kg</th><th>Total</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    pageRows.map(x=>{
      const a=assignments.find(v=>v.id===x.contract_assignment_id);
      const isLocked=!a?.active;
      return '<tr><td>'+esc(x.harvested_on||'')+'</td><td>'+esc(assignmentIdentity(assignments,barns,contractsRows,a))+'</td><td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td><td>'+esc(x.buyer_name||'-')+'</td><td>'+esc(x.vehicle_number||'-')+'</td><td>'+fmtNumber(x.birds)+'</td><td>'+fmtNumber(x.net_weight_kg)+'</td><td>Rp '+fmtNumber(x.price_per_kg)+'</td><td>Rp '+fmtNumber(x.total_amount)+'</td><td>'+(isLocked?'<strong>Terkunci</strong>':'<button type="button" data-edit-harvest="'+esc(x.id)+'">Edit</button> <button type="button" data-delete-harvest="'+esc(x.id)+'">Hapus</button>')+'</td></tr>';
    }).join('')+
    '</tbody></table></div>'+(!txnHarvest.total?'<p>Data Panen tidak ditemukan.</p>':'')+txnHarvest.pager+'</section>';

  layout(html);bindNumberInputs();bindTxnList(txnHarvest,()=>marketingContractHarvestPage(null,mode));
  const err=[br,ar,cr,hr,lpr,cur,cpr].find(x=>x.error)?.error;if(err)msg(err.message);
  if(mode==='MITRA'&&txnHarvest.st.shown){
    const historyTable=document.getElementById('harvestHistoryTable');
    const harvestReportHtml=()=>{
      const table=historyTable?historyTable.cloneNode(true):null;
      if(table)table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const b=barns.find(x=>x.id===txnHarvest.st.barn);
      const a=assignments.find(x=>x.id===txnHarvest.st.assignment);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Panen Mitra</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Panen Mitra</h2><p>Periode: '+esc(txnHarvest.st.from||'-')+' s/d '+esc(txnHarvest.st.to||'-')+' · Kandang: '+esc(b?shortBarnLabel(b):'Semua Kandang')+' · Siklus: '+esc(a?assignmentCycleLabel(assignments,a):'Semua Siklus')+'</p>'+
        (table?table.outerHTML:'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const printHarvestHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=harvestReportHtml();w.document.write(pdf?html.replace('<title>Riwayat Panen Mitra</title>','<title>Riwayat_Panen_Mitra_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('harvestMitraHistoryPrint'),pdfBtn=document.getElementById('harvestMitraHistoryPdf'),excelBtn=document.getElementById('harvestMitraHistoryExcel');
    if(printBtn)printBtn.onclick=()=>printHarvestHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(harvestReportHtml(),mode==='MITRA'?'Riwayat_Panen_Mitra.pdf':'Riwayat_Panen_Mandiri.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const table=historyTable.cloneNode(true);
      table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Panen Mitra</h2>'+table.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Panen_Mitra.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };
  if(mode==='MANDIRI'&&txnHarvest.st.shown){
    const historyTable=document.getElementById('harvestHistoryTable');
    const harvestReportHtml=()=>{
      const table=historyTable?historyTable.cloneNode(true):null;
      if(table)table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const b=barns.find(x=>x.id===txnHarvest.st.barn);
      const a=assignments.find(x=>x.id===txnHarvest.st.assignment);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Panen Mandiri</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Panen Mandiri</h2><p>Periode: '+esc(txnHarvest.st.from||'-')+' s/d '+esc(txnHarvest.st.to||'-')+' · Kandang: '+esc(b?shortBarnLabel(b):'Semua Kandang')+' · Siklus: '+esc(a?assignmentCycleLabel(assignments,a):'Semua Siklus')+'</p>'+
        (table?table.outerHTML:'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const printHarvestHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=harvestReportHtml();w.document.write(pdf?html.replace('<title>Riwayat Panen Mandiri</title>','<title>Riwayat_Panen_Mandiri_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('harvestMandiriHistoryPrint'),pdfBtn=document.getElementById('harvestMandiriHistoryPdf'),excelBtn=document.getElementById('harvestMandiriHistoryExcel');
    if(printBtn)printBtn.onclick=()=>printHarvestHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(harvestReportHtml(),mode==='MITRA'?'Riwayat_Panen_Mitra.pdf':'Riwayat_Panen_Mandiri.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const table=historyTable.cloneNode(true);
      table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Panen Mandiri</h2>'+table.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Panen_Mandiri.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };

  const harvestBarnSearch=document.getElementById('harvestBarnSearch');
  const harvestBarnId=document.getElementById('harvestBarnId');
  const harvestBarnSuggestions=document.getElementById('harvestBarnSuggestions');
  const cycleInfo=document.getElementById('harvestCycleInfo');
  const mitraBuyer=document.getElementById('harvestMitraBuyer');
  const mandiriBuyer=document.getElementById('harvestMandiriBuyer');
  const mandiriPrice=document.getElementById('harvestMandiriPrice');
  const buyerId=document.getElementById('harvestBuyerId');
  const manualPrice=document.getElementById('harvestManualPrice');
  const birds=document.getElementById('contractHarvestBirds');
  const weight=document.getElementById('contractHarvestWeight');
  const pricePreview=document.getElementById('harvestPricePreview');
  const totalPreview=document.getElementById('harvestTotalPreview');

  const currentAssignment=()=>activeByBarn.get(harvestBarnId.value);
  const updateHarvestMode=()=>{
    const a=currentAssignment();
    const mandiri=a?.cycle_type==='MANDIRI';
    cycleInfo.textContent=a?(assignmentCycleLabel(assignments,a)+' · '+(mandiri?'MANDIRI':'MITRA')):'';
    if(mitraBuyer)mitraBuyer.hidden=!!mandiri;
    if(mandiriBuyer)mandiriBuyer.hidden=!mandiri;
    if(mandiriPrice)mandiriPrice.hidden=!mandiri;
    if(buyerId)buyerId.required=!!mandiri;
    if(manualPrice)manualPrice.required=!!mandiri;
    const n=normalizeInputID(birds.value)||0,w=normalizeInputID(weight.value)||0,avg=n>0?w/n:0;
    let price=0;
    if(a&&mandiri){
      price=normalizeInputID(manualPrice.value)||0;
      pricePreview.value=price?'Rp '+fmtNumber(price):'Input manual';
    }else if(a&&avg>0){
      const row=livePrices.find(p=>p.contract_id===a.master_contract_id&&avg>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||avg<prodNum(p.max_weight_kg)));
      price=prodNum(row?.price_per_kg);
      pricePreview.value=price?'Rp '+fmtNumber(price):'Harga kontrak belum tersedia';
    }else pricePreview.value='';
    totalPreview.value=w>0&&price>0?'Rp '+fmtNumber(w*price):'';
  };

  const renderBarnSuggestions=()=>{
    const q=(harvestBarnSearch.value||'').trim().toLowerCase();
    harvestBarnId.value='';updateHarvestMode();
    const list=q?allowedBarns.filter(b=>[b.code,b.name].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5):[];
    harvestBarnSuggestions.innerHTML=list.map(b=>{const a=activeByBarn.get(b.id);return '<button type="button" class="search-suggestion" data-harvest-barn="'+esc(b.id)+'"><strong>'+esc(shortBarnLabel(b))+'</strong><small>'+esc((a?.cycle_type||'MITRA')+' · '+assignmentCycleLabel(assignments,a))+'</small></button>';}).join('');
    if(q&&!list.length)harvestBarnSuggestions.innerHTML='<div class="search-empty">Kandang aktif tidak ditemukan.</div>';
    harvestBarnSuggestions.querySelectorAll('[data-harvest-barn]').forEach(btn=>btn.onclick=()=>{
      const b=allowedBarns.find(x=>x.id===btn.dataset.harvestBarn);if(!b)return;
      harvestBarnId.value=b.id;harvestBarnSearch.value=shortBarnLabel(b);harvestBarnSuggestions.innerHTML='';updateHarvestMode();
    });
  };
  harvestBarnSearch.oninput=renderBarnSuggestions;
  birds.oninput=updateHarvestMode;weight.oninput=updateHarvestMode;if(manualPrice)manualPrice.oninput=updateHarvestMode;
  if(selected)updateHarvestMode();

  const form=document.getElementById('contractHarvestForm');
  form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),barnId=fd.get('barn_id'),assignment=activeByBarn.get(barnId);
    if(!assignment||assignment.cycle_type!==mode)return msg('Pilih kandang dengan siklus '+mode+' aktif.');
    const n=normalizeInputID(fd.get('birds')),w=normalizeInputID(fd.get('net_weight_kg'));
    if(!(n>0))return msg('Ekor harus lebih dari 0.');
    if(!(w>0))return msg('KG harus lebih dari 0.');
    const avg=w/n;
    let price=0,buyer=null,buyerName=null;
    if(assignment.cycle_type==='MANDIRI'){
      price=normalizeInputID(fd.get('manual_price_per_kg'))||0;
      buyer=String(fd.get('buyer_id')||'');
      if(!(price>0))return msg('Harga jual Mandiri wajib lebih dari 0.');
      if(!buyer)return msg('Pilih pelanggan Mandiri.');
      buyerName=customers.find(c=>c.id===buyer)?.name||null;
    }else{
      const priceRow=livePrices.find(p=>p.contract_id===assignment.master_contract_id&&avg>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||avg<prodNum(p.max_weight_kg)));
      if(!priceRow)return msg('Harga kontrak untuk BW rata-rata '+prodFmt(avg,3)+' Kg belum tersedia.');
      price=prodNum(priceRow.price_per_kg);
      buyerName=String(fd.get('buyer_name')||'').trim()||null;
    }
    const payload={
      contract_assignment_id:assignment.id,barn_id:barnId,harvested_on:fd.get('harvested_on'),
      birds:n,net_weight_kg:w,price_per_kg:price,buyer_id:buyer||null,buyer_name:buyerName,
      vehicle_number:String(fd.get('vehicle_number')||'').trim()||null,transaction_number:null,notes:null
    };
    const id=fd.get('id');
    const q=id?db.from('marketing_contract_harvests').update(payload).eq('id',id):db.from('marketing_contract_harvests').insert(payload);
    const {error}=await q;if(error)return msg(error.message);
    await marketingContractHarvestPage(null,mode);msg(id?'Panen berhasil diperbarui.':'Panen berhasil disimpan.',true);
  };

  root.querySelectorAll('[data-edit-harvest]').forEach(btn=>btn.onclick=()=>marketingContractHarvestPage(btn.dataset.editHarvest,mode));
  root.querySelectorAll('[data-delete-harvest]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus data Panen ini?'))return;
    const {error}=await db.from('marketing_contract_harvests').delete().eq('id',btn.dataset.deleteHarvest);
    if(error)return msg(error.message);
    await marketingContractHarvestPage(null,mode);msg('Panen berhasil dihapus.',true);
  });
  const cancel=document.getElementById('cancelHarvestEdit');if(cancel)cancel.onclick=()=>marketingContractHarvestPage(null,mode);
}
async function marketingExternalMeatPage(editId=null){
  const [sr,pr,br,ar,cr,lpr]=await Promise.all([
    db.from('suppliers').select('id,code,name,active,supplier_type').eq('active',true).eq('supplier_type','DAGING').order('code',{ascending:true}),
    db.from('marketing_external_meat_purchases').select('*').order('purchase_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('barns').select('id,code,name,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type').order('start_date',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('contract_live_prices').select('contract_id,min_weight_kg,max_weight_kg,price_per_kg').order('min_weight_kg')
  ]);
  const supplierRows=sr.data||[], rows=pr.data||[], barnRows=br.data||[], assignments=ar.data||[], contractsRows=cr.data||[], livePrices=lpr.data||[];
  const txnMeat=txnListState(rows,'marketingMeat','purchase_date',5,barnRows,'barn_id',{assignmentKey:'contract_assignment_id',assignments:assignments.map(a=>({id:a.id,barn_id:a.barn_id,label:assignmentCycleLabel(assignments,a)+' · '+(a.active?'AKTIF':'CLOSED')}))}),shownMeat=txnMeat.rows;
  const activeAssignments=assignments.filter(a=>a.active);
  const activeByBarn=new Map(activeAssignments.map(a=>[a.barn_id,a]));
  const allowedBarns=barnRows.filter(b=>activeByBarn.has(b.id));
  const selected=editId?rows.find(x=>x.id===editId):null;
  const todayID=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  let html='<section class="panel"><h3>'+(selected?'Edit Tambah Daging':'Tambah Daging')+'</h3>'+
    '<p class="muted">Pembelian ayam/daging luar untuk mengisi kebutuhan RHPP perusahaan. Wajib dikaitkan ke kandang dan kontrak aktif.</p>'+
    '<form id="externalMeatForm" class="form-vertical">'+
      '<input type="hidden" name="id" value="'+esc(selected?.id||'')+'">'+
      '<label>Cari / Pilih Kandang<input id="meatBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" value="'+(selected?esc(shortBarnLabel(barnRows.find(b=>b.id===selected.barn_id))):'')+'" required></label>'+
      '<input type="hidden" name="barn_id" id="meatBarnId" value="'+esc(selected?.barn_id||'')+'">'+
      '<div id="meatBarnSuggestions" class="search-suggestions"></div>'+
      '<label>Tanggal Pembelian<input type="date" name="purchase_date" value="'+esc(selected?.purchase_date||todayID())+'" required></label>'+
      '<label>Supplier<select name="supplier_id" required><option value="">Pilih Supplier</option>'+
        supplierRows.map(s=>'<option value="'+esc(s.id)+'" '+(selected?.supplier_id===s.id?'selected':'')+'>'+esc(s.code+' · '+s.name)+'</option>').join('')+
      '</select></label>'+
      '<label>Jenis / Nama Barang<input name="product_name" value="'+esc(selected?.product_name||'Daging/Ayam')+'" required></label>'+
      '<label>Ekor<input name="birds" id="meatBirds" data-number="1" inputmode="numeric" value="'+(selected?.birds?fmtNumber(selected.birds):'')+'" required></label>'+
      '<label>Berat (Kg)<input name="weight_kg" id="meatWeight" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.weight_kg):'')+'" required></label>'+
      '<label>BW Rata-rata<input id="meatAvgWeight" readonly tabindex="-1"></label>'+
      '<label>Harga Beli Aktual / Kg<input name="purchase_price_per_kg" id="meatPurchasePrice" data-number="1" inputmode="decimal" value="'+(selected?fmtNumber(selected.purchase_price_per_kg):'')+'" required></label>'+
      '<label>Harga Kontrak RHPP / Kg<input id="meatPrice" readonly tabindex="-1"></label>'+
      '<label>Total Pembelian Aktual<input id="meatTotal" readonly tabindex="-1"></label>'+
      '<label>No. Nota / Referensi<input name="reference_number" value="'+esc(selected?.reference_number||'')+'"></label>'+
      '<label>Catatan<textarea name="notes">'+esc(selected?.notes||'')+'</textarea></label>'+
      '<button type="submit">'+(selected?'Simpan Perubahan':'Simpan Tambah Daging')+'</button>'+
      (selected?' <button type="button" id="cancelBlEdit">Batal Edit</button>':'')+
    '</form></section>';

  html+='<section class="panel"><h3>Riwayat Tambah Daging</h3>'+txnMeat.controls+(txnMeat.st.shown?'<div class="report-actions"><button type="button" id="meatHistoryPrint">Cetak</button> <button type="button" id="meatHistoryPdf">PDF</button> <button type="button" id="meatHistoryExcel">Excel</button></div>':'')+'<div class="tablewrap"><table id="meatHistoryTable"><thead><tr>'+
    '<th>Tanggal</th><th>Kandang</th><th>Kontrak</th><th>Supplier</th><th>Barang</th><th>Ekor</th><th>Kg</th><th>BW</th><th>Harga Beli/Kg</th><th>Harga Kontrak RHPP/Kg</th><th>Total Beli</th><th>Referensi</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    shownMeat.map(x=>{
      const s=supplierRows.find(v=>v.id===x.supplier_id),b=barnRows.find(v=>v.id===x.barn_id),a=assignments.find(v=>v.id===x.contract_assignment_id),k=contractsRows.find(v=>v.id===a?.master_contract_id);
      const isLocked=!a?.active;
      const total=Number(x.weight_kg||0)*Number(x.purchase_price_per_kg||0);
      const avg=Number(x.birds||0)>0?Number(x.weight_kg||0)/Number(x.birds):0;
      const contractRow=livePrices.find(p=>p.contract_id===a?.master_contract_id&&avg>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||avg<prodNum(p.max_weight_kg)));
      const contractPrice=prodNum(contractRow?.price_per_kg);
      return '<tr><td>'+esc(x.purchase_date||'')+'</td><td>'+esc(assignmentIdentity(assignments,barnRows,contractsRows,a))+'</td><td>'+esc(shortContractLabel(k?.number)||'-')+'</td><td>'+esc(s?s.name:'-')+'</td><td>'+esc(x.product_name||'')+'</td><td>'+ (x.birds?fmtNumber(x.birds):'-') +'</td><td>'+fmtNumber(x.weight_kg)+'</td><td>'+(avg?fmtNumber(avg,3):'-')+'</td><td>Rp '+fmtNumber(x.purchase_price_per_kg)+'</td><td>'+(contractPrice?'Rp '+fmtNumber(contractPrice):'-')+'</td><td>Rp '+fmtNumber(total)+'</td><td>'+esc(x.reference_number||'-')+'</td><td>'+(isLocked?'<strong>Terkunci</strong>':'<button type="button" data-edit-bl="'+esc(x.id)+'">Edit</button> <button type="button" data-delete-bl="'+esc(x.id)+'">Hapus</button>')+'</td></tr>';
    }).join('')+
    '</tbody></table></div>'+(!txnMeat.total?'<p>Data Tambah Daging tidak ditemukan.</p>':'')+txnMeat.pager+'</section>';

  layout(html);
  if(txnMeat.st.shown)bindTableExportActions({tableId:'meatHistoryTable',printId:'meatHistoryPrint',pdfId:'meatHistoryPdf',excelId:'meatHistoryExcel',title:'Riwayat Tambah Daging',filename:'Riwayat_Tambah_Daging',filterText:'Periode '+(txnMeat.st.from||'-')+' s/d '+(txnMeat.st.to||'-'),dropLast:true});
  [sr,pr,br,ar,cr,lpr].forEach(x=>{if(x.error)msg(x.error.message)});
  bindNumberInputs();
  bindTxnList(txnMeat,()=>marketingExternalMeatPage());

  const meatBarnSearch=document.getElementById('meatBarnSearch');
  const meatBarnId=document.getElementById('meatBarnId');
  const meatBarnSuggestions=document.getElementById('meatBarnSuggestions');
  if(meatBarnSearch&&meatBarnId&&meatBarnSuggestions){
    meatBarnSearch.oninput=()=>{
      const q=(meatBarnSearch.value||'').trim().toLowerCase();
      meatBarnId.value='';
      const rows=q?allowedBarns.filter(b=>{
        const a=activeByBarn.get(b.id),k=contractsRows.find(x=>x.id===a?.master_contract_id);
        return [b.code,b.name,shortContractLabel(k?.number),a?.start_date].filter(Boolean).join(' ').toLowerCase().includes(q);
      }).slice(0,5):[];
      meatBarnSuggestions.innerHTML=rows.map(b=>{
        const a=activeByBarn.get(b.id),k=contractsRows.find(x=>x.id===a?.master_contract_id);
        return '<button type="button" class="search-suggestion" data-meat-barn="'+esc(b.id)+'"><strong>'+esc(shortBarnLabel(b))+'</strong><small>'+esc([shortContractLabel(k?.number),a?.start_date].filter(Boolean).join(' · '))+'</small></button>';
      }).join('');
      if(q&&!rows.length)meatBarnSuggestions.innerHTML='<div class="search-empty">Kandang aktif tidak ditemukan.</div>';
      meatBarnSuggestions.querySelectorAll('[data-meat-barn]').forEach(btn=>btn.onclick=()=>{
        const b=allowedBarns.find(x=>x.id===btn.dataset.meatBarn);if(!b)return;
        meatBarnId.value=b.id;meatBarnSearch.value=shortBarnLabel(b);meatBarnSuggestions.innerHTML='';contractPrice();
      });
    };
  }

  const form=document.getElementById('externalMeatForm'),birds=document.getElementById('meatBirds'),weight=document.getElementById('meatWeight'),purchasePrice=document.getElementById('meatPurchasePrice'),avgWeight=document.getElementById('meatAvgWeight'),price=document.getElementById('meatPrice'),total=document.getElementById('meatTotal');
  const contractPrice=()=>{
    const a=activeByBarn.get(meatBarnId.value),n=normalizeInputID(birds.value)||0,w=normalizeInputID(weight.value)||0;
    const avg=n>0?w/n:0;
    if(avgWeight)avgWeight.value=avg?fmtNumber(avg,3)+' Kg':'';
    if(!a||!avg){price.value='';total.value='';return 0;}
    const row=livePrices.find(p=>p.contract_id===a.master_contract_id&&avg>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||avg<prodNum(p.max_weight_kg)));
    const p=row?prodNum(row.price_per_kg):0;
    price.value=p?'Rp '+fmtNumber(p):'Harga kontrak BW belum tersedia';
    const actual=normalizeInputID(purchasePrice?.value)||0;
    total.value=actual&&w?'Rp '+fmtNumber(w*actual):'';
    return p;
  };
  birds.addEventListener('input',contractPrice);weight.addEventListener('input',contractPrice);purchasePrice?.addEventListener('input',contractPrice);contractPrice();

  form.onsubmit=async ev=>{
    ev.preventDefault();
    const fd=new FormData(form),barnId=fd.get('barn_id'),assignment=activeByBarn.get(barnId);
    if(!assignment)return msg('Kandang belum memiliki kontrak Logistik aktif.');
    const n=normalizeInputID(fd.get('birds')),w=normalizeInputID(fd.get('weight_kg')),contract=contractPrice(),buyPrice=normalizeInputID(fd.get('purchase_price_per_kg'));
    if(!(n>0))return msg('Ekor harus lebih dari 0.');
    if(!(w>0))return msg('Berat harus lebih dari 0 Kg.');
    if(!(buyPrice>0))return msg('Harga beli aktual per Kg harus lebih dari 0.');
    if(!(contract>0))return msg('Harga kontrak untuk BW '+fmtNumber(w/n,3)+' Kg belum tersedia.');
    const payload={contract_assignment_id:assignment.id,barn_id:barnId,supplier_id:fd.get('supplier_id'),purchase_date:fd.get('purchase_date'),product_name:fd.get('product_name'),birds:n,weight_kg:w,purchase_price_per_kg:buyPrice,reference_number:fd.get('reference_number')||null,notes:fd.get('notes')||null};
    const id=fd.get('id');
    const q=id?db.from('marketing_external_meat_purchases').update(payload).eq('id',id):db.from('marketing_external_meat_purchases').insert(payload);
    const {error}=await q;
    if(error)return msg(error.message);
    await marketingExternalMeatPage();
    msg(id?'Tambah Daging berhasil diperbarui.':'Tambah Daging berhasil disimpan dan terkait ke RHPP kandang.',true);
  };

  document.querySelectorAll('[data-edit-bl]').forEach(btn=>btn.onclick=()=>marketingExternalMeatPage(btn.dataset.editBl));
  document.querySelectorAll('[data-delete-bl]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus data Tambah Daging ini?'))return;
    const {error}=await db.from('marketing_external_meat_purchases').delete().eq('id',btn.dataset.deleteBl);
    if(error)return msg(error.message);
    await marketingExternalMeatPage();
    msg('Tambah Daging berhasil dihapus.',true);
  });
  const cancel=document.getElementById('cancelBlEdit');if(cancel)cancel.onclick=()=>marketingExternalMeatPage();
}
async function logisticsExternalReturnPage(editId=null){
  const [br,ar,ir,sr,supr,er,rr,rir,tr,cpr]=await Promise.all([
    db.from('barns').select('id,code,name,location,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,active,cycle_type').order('created_at',{ascending:false}),
    db.from('items').select('id,code,name,unit,kg_per_unit,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_external_shipments').select('*').order('shipment_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('suppliers').select('id,code,name').eq('supplier_type','SAPRONAK').order('code',{ascending:true}),
    db.from('logistics_external_shipment_items').select('*').order('created_at',{ascending:false}),
    db.from('logistics_external_returns').select('*').order('return_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('logistics_external_return_items').select('*').order('created_at',{ascending:false}),
    db.from('logistics_external_return_transfers').select('*').order('created_at',{ascending:false}),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle()
  ]);
  const barns=br.data||[],assignments=ar.data||[],items=ir.data||[],heads=sr.data||[],suppliers=supr.data||[],details=er.data||[],returns=rr.data||[],returnItems=rir.data||[],transfers=tr.data||[],company=cpr.data||{};
  window.__externalReturnTransferHistoryFilter=window.__externalReturnTransferHistoryFilter||{source:'',target:'',from:'',to:'',shown:false};
  const extTransferHistoryFilter=window.__externalReturnTransferHistoryFilter;
  const activeAssignments=assignments.filter(a=>a.active&&(a.cycle_type||'MITRA')==='MITRA'),activeByBarn=new Map(activeAssignments.map(a=>[a.barn_id,a]));
  const selected=editId?returns.find(r=>r.id===editId):null;
  const selectedItem=selected?returnItems.find(x=>x.external_return_id===selected.id):null;
  const sourceById=new Map(details.map(x=>[x.id,x]));
  const headById=new Map(heads.map(x=>[x.id,x]));
  const usedQty=(sourceItemId,excludeReturnId=null)=>returnItems.reduce((n,x)=>{
    if(x.external_shipment_item_id!==sourceItemId)return n;
    if(excludeReturnId&&x.external_return_id===excludeReturnId)return n;
    return n+prodNum(x.quantity);
  },0);
  const remaining=(d,excludeReturnId=null)=>Math.max(0,prodNum(d.quantity)-usedQty(d.id,excludeReturnId));
  const transferredQty=returnItemId=>transfers.reduce((n,t)=>n+(t.external_return_item_id===returnItemId?prodNum(t.quantity):0),0);
  const transferableQty=ri=>Math.max(0,prodNum(ri?.quantity)-transferredQty(ri?.id));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  let html='<section class="panel"><h3>Retur Tambah Sapronak</h3>'+
    '<p class="muted">Retur pembelian luar disimpan sebagai Draft terlebih dahulu. Draft menjadi stok retur dan belum memindahkan biaya ke kandang lain. Biaya baru berpindah dari siklus asal ke siklus tujuan saat tombol Kirim digunakan; Arus Kas perusahaan tidak berubah.</p>'+
    '<form id="extReturnForm" class="return-form"><div class="return-grid">'+
      '<label>Cari / Pilih Kandang<input id="extReturnBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" value="'+(selected?esc(shortBarnLabel(barns.find(b=>b.id===selected.barn_id))):'')+'" required></label>'+
      '<input type="hidden" id="extReturnBarnId" value="'+esc(selected?.barn_id||'')+'">'+
      '<label>Tanggal Retur<input type="date" id="extReturnDate" value="'+esc(selected?.return_date||today)+'" required></label>'+
      '<div id="extReturnBarnSuggestions" class="search-suggestions return-span-2"></div>'+
      '<label class="return-span-2">Cari Pembelian Luar<input id="extReturnItemSearch" autocomplete="off" placeholder="Ketik kode / nama sapronak"></label>'+
      '<input type="hidden" id="extReturnSourceItem" value="'+esc(selectedItem?.external_shipment_item_id||'')+'">'+
      '<div id="extReturnItemSuggestions" class="search-suggestions return-span-2"></div>'+
      '<label>Jumlah Retur<input id="extReturnQty" data-number="1" inputmode="decimal" value="'+(selectedItem?fmtNumber(selectedItem.quantity):'')+'" required></label>'+
      '<label>Referensi<input id="extReturnRef" value="'+esc(selected?.reference||'')+'" placeholder="Opsional"></label>'+
      '<label class="return-span-2">Catatan<input id="extReturnNotes" value="'+esc(selected?.notes||'')+'" placeholder="Opsional"></label>'+
    '</div>'+
    '<p id="extReturnInfo" class="muted compact-note"></p>'+
    '<div class="inline-actions"><button type="submit">'+(selected?'Simpan Perubahan Draft':'Simpan Draft')+'</button>'+
      (selected?'<button type="button" id="cancelExtReturn">Batal</button>':'')+
    '</div></form></section>'+
    '<section class="panel" id="extTransferPanel" style="display:none"><h3>Kirim Stok Retur ke Kandang Lain</h3>'+
      '<input type="hidden" id="extTransferReturnItem">'+
      '<p id="extTransferSourceInfo" class="muted"></p>'+
      '<div class="return-grid">'+
        '<label>Cari Kandang Tujuan<input id="extTransferBarnSearch" autocomplete="off" placeholder="Ketik nama kandang aktif"></label>'+
        '<input type="hidden" id="extTransferAssignment">'+
        '<label>Jumlah Kirim<input id="extTransferQty" data-number="1" inputmode="decimal" placeholder="Jumlah"></label>'+
        '<div id="extTransferBarnSuggestions" class="search-suggestions return-span-2"></div>'+
        '<label>Tanggal Kirim<input type="date" id="extTransferDate" value="'+today+'"></label>'+
        '<label>Catatan<input id="extTransferNotes" placeholder="Opsional"></label>'+
      '</div>'+
      '<div class="inline-actions"><button type="button" id="saveExtTransfer">Kirim</button><button type="button" id="cancelExtTransfer">Batal</button></div>'+
    '</section>';

  const draftReturns=returns.filter(r=>{
    const ri=returnItems.find(x=>x.external_return_id===r.id);
    return ri&&transferableQty(ri)>0;
  });
  const sentRows=(extTransferHistoryFilter.shown?transfers.filter(t=>
    (!extTransferHistoryFilter.source||t.source_barn_id===extTransferHistoryFilter.source)&&
    (!extTransferHistoryFilter.target||t.target_barn_id===extTransferHistoryFilter.target)&&
    (!extTransferHistoryFilter.from||String(t.transferred_on||'')>=extTransferHistoryFilter.from)&&
    (!extTransferHistoryFilter.to||String(t.transferred_on||'')<=extTransferHistoryFilter.to)
  ):[]).map(t=>{
    const ri=returnItems.find(x=>x.id===t.external_return_item_id),r=returns.find(x=>x.id===ri?.external_return_id),it=items.find(x=>x.id===t.item_id),src=barns.find(x=>x.id===t.source_barn_id),dst=barns.find(x=>x.id===t.target_barn_id);
    return {t,ri,r,it,src,dst};
  });

  html+='<section class="panel"><h3>Stok Retur / Draft</h3><p class="muted">Barang di bagian ini belum seluruhnya dikirim ke kandang tujuan.</p><div class="tablewrap compact-table"><table><thead><tr>'+
    '<th>Tanggal</th><th>Kandang Asal</th><th>Supplier</th><th>Sapronak</th><th>Jumlah Retur</th><th>Sisa Draft</th><th>Satuan</th><th>Status</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
    draftReturns.map(r=>{
      const ri=returnItems.find(x=>x.external_return_id===r.id),it=items.find(x=>x.id===ri?.item_id),sup=suppliers.find(x=>x.id===r.supplier_id),b=barns.find(x=>x.id===r.barn_id),a=assignments.find(x=>x.id===r.contract_assignment_id);
      const leftTransfer=transferableQty(ri);
      const hasOtherActive=activeAssignments.some(x=>x.barn_id!==r.barn_id);
      const sendButton=hasOtherActive
        ?'<button type="button" class="btn-secondary" data-transfer-ext-return="'+esc(ri.id)+'">Kirim</button>'
        :'<button type="button" class="btn-secondary" disabled title="Belum ada kandang aktif lain">Kirim</button>';
      const canEdit=a?.active&&r.status==='DRAFT'&&transferredQty(ri.id)<=0;
      const statusLabel=r.status==='PARTIAL'?'PARSIAL':'DRAFT';
      return '<tr><td>'+esc(r.return_date||'-')+'</td><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td>'+esc(sup?.name||'-')+'</td><td>'+esc(it?it.code+' · '+it.name:'-')+'</td><td>'+fmtNumber(ri?.quantity)+'</td><td><strong>'+fmtNumber(leftTransfer)+'</strong></td><td>'+esc(it?.unit||'-')+'</td><td><span class="pill">'+statusLabel+'</span></td><td>'+sendButton+' '+(canEdit?'<button type="button" data-edit-ext-return="'+esc(r.id)+'">Edit Draft</button> <button type="button" data-delete-ext-return="'+esc(r.id)+'">Hapus Draft</button>':'')+'</td></tr>';
    }).join('')+
    '</tbody></table></div>'+(!draftReturns.length?'<p>Tidak ada stok retur yang menunggu dikirim.</p>':'')+'</section>'+
    '<section class="panel"><h3>Riwayat Pengiriman Stok Retur</h3>'+
      '<form id="externalReturnTransferHistoryForm" class="form-vertical compact-form" data-no-submit-guard="1">'+
        '<label>Dari Kandang<select name="source"><option value="">Semua Kandang Asal</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(extTransferHistoryFilter.source===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
        '<label>Ke Kandang<select name="target"><option value="">Semua Kandang Tujuan</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(extTransferHistoryFilter.target===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
        '<label>Tanggal Dari<input type="date" name="from" value="'+esc(extTransferHistoryFilter.from||'')+'"></label>'+
        '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(extTransferHistoryFilter.to||'')+'"></label>'+
        '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="externalReturnTransferHistoryReset">Reset</button></div>'+
      '</form>'+
      (extTransferHistoryFilter.shown?'<div class="report-actions"><button type="button" id="externalReturnHistoryPrint">Cetak</button> <button type="button" id="externalReturnHistoryPdf">PDF</button> <button type="button" id="externalReturnHistoryExcel">Excel</button></div><div class="tablewrap compact-table"><table id="externalReturnHistoryTable"><thead><tr><th>Tanggal</th><th>Dari</th><th>Ke</th><th>Sapronak</th><th>Jumlah</th><th>Satuan</th><th>Status</th></tr></thead><tbody>'+
      sentRows.map(x=>'<tr><td>'+esc(x.t.transferred_on||'-')+'</td><td>'+esc(x.src?shortBarnLabel(x.src):'-')+'</td><td>'+esc(x.dst?shortBarnLabel(x.dst):'-')+'</td><td>'+esc(x.it?x.it.code+' · '+x.it.name:'-')+'</td><td>'+fmtNumber(x.t.quantity)+'</td><td>'+esc(x.it?.unit||'-')+'</td><td><span class="pill">TERKIRIM</span></td></tr>').join('')+
      '</tbody></table></div>'+(sentRows.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);
  bindNumberInputs();
  const err=[br,ar,ir,sr,supr,er,rr,rir,tr,cpr].find(x=>x?.error)?.error;if(err)msg(err.message);
  const extTransferHistoryForm=document.getElementById('externalReturnTransferHistoryForm');
  const extTransferHistoryReset=document.getElementById('externalReturnTransferHistoryReset');
  if(extTransferHistoryForm)extTransferHistoryForm.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(extTransferHistoryForm);
    extTransferHistoryFilter.source=String(fd.get('source')||'');extTransferHistoryFilter.target=String(fd.get('target')||'');extTransferHistoryFilter.from=String(fd.get('from')||'');extTransferHistoryFilter.to=String(fd.get('to')||'');
    if(extTransferHistoryFilter.from&&extTransferHistoryFilter.to&&extTransferHistoryFilter.from>extTransferHistoryFilter.to){const t=extTransferHistoryFilter.from;extTransferHistoryFilter.from=extTransferHistoryFilter.to;extTransferHistoryFilter.to=t}
    extTransferHistoryFilter.shown=true;await logisticsExternalReturnPage();
  };
  if(extTransferHistoryReset)extTransferHistoryReset.onclick=async()=>{window.__externalReturnTransferHistoryFilter={source:'',target:'',from:'',to:'',shown:false};await logisticsExternalReturnPage();};

  if(extTransferHistoryFilter.shown){
    const historyTable=document.getElementById('externalReturnHistoryTable');
    const extReturnReportHtml=()=>{
      const src=barns.find(x=>x.id===extTransferHistoryFilter.source),dst=barns.find(x=>x.id===extTransferHistoryFilter.target);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Retur Sapronak Luar</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Retur Sapronak Luar</h2><p>Periode: '+esc(extTransferHistoryFilter.from||'-')+' s/d '+esc(extTransferHistoryFilter.to||'-')+' · Dari: '+esc(src?shortBarnLabel(src):'Semua Kandang')+' · Ke: '+esc(dst?shortBarnLabel(dst):'Semua Kandang')+'</p>'+
        (historyTable?historyTable.outerHTML:'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const printExtReturnHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=extReturnReportHtml();w.document.write(pdf?html.replace('<title>Riwayat Retur Sapronak Luar</title>','<title>Riwayat_Retur_Sapronak_Luar_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('externalReturnHistoryPrint'),pdfBtn=document.getElementById('externalReturnHistoryPdf'),excelBtn=document.getElementById('externalReturnHistoryExcel');
    if(printBtn)printBtn.onclick=()=>printExtReturnHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(extReturnReportHtml(),'Riwayat_Retur_Sapronak_Luar.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Retur Sapronak Luar</h2>'+historyTable.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Retur_Sapronak_Luar.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };

  const barnSearch=document.getElementById('extReturnBarnSearch'),barnId=document.getElementById('extReturnBarnId'),barnSugs=document.getElementById('extReturnBarnSuggestions');
  const itemSearch=document.getElementById('extReturnItemSearch'),sourceInput=document.getElementById('extReturnSourceItem'),itemSugs=document.getElementById('extReturnItemSuggestions'),info=document.getElementById('extReturnInfo');
  const availableBarns=barns.filter(b=>activeByBarn.has(b.id));
  const currentAssignment=()=>activeByBarn.get(barnId.value);
  const currentSource=()=>sourceById.get(sourceInput.value);

  const setInfo=()=>{
    const d=currentSource();if(!d){info.textContent='';return}
    const h=headById.get(d.external_shipment_id),it=items.find(x=>x.id===d.item_id),sup=suppliers.find(x=>x.id===h?.supplier_id),left=remaining(d,selected?.id||null);
    info.textContent='Pembelian '+(h?.shipment_date||'-')+' · '+(sup?.name||'-')+' · Sisa bisa diretur '+prodFmt(left,2)+' '+(it?.unit||'Satuan')+' · Harga beli Rp '+prodFmt(d.purchase_unit_price,0);
  };

  const renderBarn=()=>{
    const q=(barnSearch.value||'').trim().toLowerCase();
    if(!q){barnSugs.innerHTML='';return}
    barnId.value='';
    const rows=availableBarns.filter(b=>[b.code,b.name,b.location].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5);
    barnSugs.innerHTML=rows.map(b=>'<button type="button" class="search-suggestion" data-ext-barn="'+esc(b.id)+'"><strong>'+esc(b.code+' · '+b.name)+'</strong></button>').join('');
    if(!rows.length)barnSugs.innerHTML='<div class="search-empty">Kandang aktif tidak ditemukan.</div>';
    barnSugs.querySelectorAll('[data-ext-barn]').forEach(btn=>btn.onclick=()=>{const b=availableBarns.find(x=>x.id===btn.dataset.extBarn);barnId.value=b.id;barnSearch.value=shortBarnLabel(b);barnSugs.innerHTML='';sourceInput.value='';itemSearch.value='';itemSugs.innerHTML='';setInfo()});
  };
  barnSearch.oninput=renderBarn;

  const renderItems=()=>{
    const q=(itemSearch.value||'').trim().toLowerCase(),a=currentAssignment();
    sourceInput.value='';
    if(!q){itemSugs.innerHTML='';setInfo();return}
    if(!a){itemSugs.innerHTML='<div class="search-empty">Pilih kandang terlebih dahulu.</div>';return}
    const rows=details.filter(d=>{
      const h=headById.get(d.external_shipment_id),it=items.find(x=>x.id===d.item_id);
      return h?.contract_assignment_id===a.id&&remaining(d,selected?.id||null)>0&&[it?.code,it?.name,h?.shipment_date].filter(Boolean).join(' ').toLowerCase().includes(q);
    }).slice(0,5);
    itemSugs.innerHTML=rows.map(d=>{const h=headById.get(d.external_shipment_id),it=items.find(x=>x.id===d.item_id),sup=suppliers.find(x=>x.id===h?.supplier_id);return '<button type="button" class="search-suggestion" data-ext-source="'+esc(d.id)+'"><strong>'+esc((it?.code||'')+' · '+(it?.name||''))+'</strong><small>'+esc((h?.shipment_date||'-')+' · '+(sup?.name||'-')+' · Sisa '+prodFmt(remaining(d,selected?.id||null),2)+' '+(it?.unit||''))+'</small></button>'}).join('');
    if(!rows.length)itemSugs.innerHTML='<div class="search-empty">Pembelian luar tidak ditemukan / sudah habis diretur.</div>';
    itemSugs.querySelectorAll('[data-ext-source]').forEach(btn=>btn.onclick=()=>{const d=sourceById.get(btn.dataset.extSource),it=items.find(x=>x.id===d?.item_id);sourceInput.value=d.id;itemSearch.value=(it?.code||'')+' · '+(it?.name||'');itemSugs.innerHTML='';setInfo()});
    setInfo();
  };
  itemSearch.oninput=renderItems;

  if(selectedItem){
    const d=sourceById.get(selectedItem.external_shipment_item_id),it=items.find(x=>x.id===d?.item_id);
    if(it)itemSearch.value=it.code+' · '+it.name;
    setInfo();
  }

  document.getElementById('extReturnForm').onsubmit=async e=>{
    e.preventDefault();
    const d=currentSource(),qty=normalizeInputID(document.getElementById('extReturnQty').value);
    if(!barnId.value||!currentAssignment())return msg('Pilih kandang aktif.');
    if(!d)return msg('Pilih pembelian Tambah Sapronak yang akan diretur.');
    if(!(qty>0))return msg('Jumlah retur harus lebih dari 0.');
    const max=remaining(d,selected?.id||null);if(qty>max)return msg('Jumlah retur melebihi sisa. Maksimal '+prodFmt(max,2)+'.');
    const {error}=await db.rpc('save_external_sapronak_return_atomic',{
      p_id:selected?.id||null,p_external_shipment_item_id:d.id,p_return_date:document.getElementById('extReturnDate').value,
      p_reference:document.getElementById('extReturnRef').value||null,p_notes:document.getElementById('extReturnNotes').value||null,p_quantity:qty
    });
    if(error)return msg(error.message);
    await logisticsExternalReturnPage();
    msg(selected?'Draft retur diperbarui.':'Draft retur tersimpan dan masuk Stok Retur.',true);
  };
  const transferPanel=document.getElementById('extTransferPanel');
  const transferReturnItem=document.getElementById('extTransferReturnItem');
  const transferSourceInfo=document.getElementById('extTransferSourceInfo');
  const transferBarnSearch=document.getElementById('extTransferBarnSearch');
  const transferAssignment=document.getElementById('extTransferAssignment');
  const transferBarnSugs=document.getElementById('extTransferBarnSuggestions');
  const transferQty=document.getElementById('extTransferQty');

  root.querySelectorAll('[data-transfer-ext-return]').forEach(btn=>btn.onclick=()=>{
    const ri=returnItems.find(x=>x.id===btn.dataset.transferExtReturn);
    const erow=returns.find(x=>x.id===ri?.external_return_id);
    const it=items.find(x=>x.id===ri?.item_id);
    if(!ri||!erow)return;
    transferReturnItem.value=ri.id;
    transferAssignment.value='';
    transferBarnSearch.value='';
    transferQty.value='';
    transferBarnSugs.innerHTML='';
    const left=transferableQty(ri);
    transferSourceInfo.textContent=(it?.code||'')+' · '+(it?.name||'')+' · Stok draft tersedia '+prodFmt(left,2)+' '+(it?.unit||'');
    transferPanel.style.display='';
    transferPanel.scrollIntoView({behavior:'smooth',block:'start'});
  });

  if(transferBarnSearch){
    transferBarnSearch.oninput=()=>{
      const sourceRi=returnItems.find(x=>x.id===transferReturnItem.value);
      const sourceReturn=returns.find(x=>x.id===sourceRi?.external_return_id);
      const q=(transferBarnSearch.value||'').trim().toLowerCase();
      transferAssignment.value='';
      if(!q){transferBarnSugs.innerHTML='';return}
      const rows=activeAssignments.filter(a=>a.barn_id!==sourceReturn?.barn_id).map(a=>({a,b:barns.find(x=>x.id===a.barn_id)})).filter(x=>x.b&&[x.b.code,x.b.name,x.b.location].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5);
      transferBarnSugs.innerHTML=rows.map(x=>'<button type="button" class="search-suggestion" data-transfer-assignment="'+esc(x.a.id)+'"><strong>'+esc(shortBarnLabel(x.b))+'</strong></button>').join('');
      if(!rows.length)transferBarnSugs.innerHTML='<div class="search-empty">Kandang aktif lain tidak ditemukan.</div>';
      transferBarnSugs.querySelectorAll('[data-transfer-assignment]').forEach(b=>b.onclick=()=>{
        const a=activeAssignments.find(x=>x.id===b.dataset.transferAssignment),barn=barns.find(x=>x.id===a?.barn_id);
        if(!a||!barn)return;
        transferAssignment.value=a.id;
        transferBarnSearch.value=shortBarnLabel(barn);
        transferBarnSugs.innerHTML='';
      });
    };
  }

  const cancelTransfer=document.getElementById('cancelExtTransfer');
  if(cancelTransfer)cancelTransfer.onclick=()=>{transferPanel.style.display='none';};

  const saveTransfer=document.getElementById('saveExtTransfer');
  if(saveTransfer)saveTransfer.onclick=async()=>{
    const ri=returnItems.find(x=>x.id===transferReturnItem.value);
    const qty=normalizeInputID(transferQty.value);
    if(!ri)return msg('Pilih stok retur yang akan dikirim.');
    if(!transferAssignment.value)return msg('Pilih kandang tujuan aktif.');
    if(!(qty>0))return msg('Jumlah kirim harus lebih dari 0.');
    const max=transferableQty(ri);
    if(qty>max)return msg('Jumlah kirim melebihi stok draft. Maksimal '+prodFmt(max,2)+'.');
    const {error}=await db.rpc('transfer_external_sapronak_return_atomic',{
      p_external_return_item_id:ri.id,
      p_target_assignment_id:transferAssignment.value,
      p_quantity:qty,
      p_transferred_on:document.getElementById('extTransferDate').value,
      p_notes:document.getElementById('extTransferNotes').value||null
    });
    if(error)return msg(error.message);
    await logisticsExternalReturnPage();
    msg('Stok retur berhasil dikirim ke kandang tujuan.',true);
  };

  root.querySelectorAll('[data-edit-ext-return]').forEach(btn=>btn.onclick=()=>logisticsExternalReturnPage(btn.dataset.editExtReturn));
  root.querySelectorAll('[data-delete-ext-return]').forEach(btn=>btn.onclick=async()=>{if(!await appConfirm('Hapus Draft Retur ini?'))return;const {error}=await db.from('logistics_external_returns').delete().eq('id',btn.dataset.deleteExtReturn);if(error)return msg(error.message);await logisticsExternalReturnPage();msg('Draft retur dihapus.',true)});
  const cancel=document.getElementById('cancelExtReturn');if(cancel)cancel.onclick=()=>logisticsExternalReturnPage();
}

async function logisticsReturnPage(editId=null){
  const [br,ir,rr,rir,ar,kr,cpr,sr,sir]=await Promise.all([
    db.from('barns').select('id,code,name,location,kind,active').eq('active',true).order('code',{ascending:true}),
    db.from('items').select('id,code,name,category,unit,kg_per_unit,active').eq('active',true).order('code',{ascending:true}),
    db.from('logistics_returns').select('*').order('return_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('logistics_return_items').select('*').order('created_at',{ascending:false}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,performance_template_name,active,created_at,cycle_type').order('created_at',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle(),
    db.from('logistics_shipments').select('id,contract_assignment_id'),
    db.from('logistics_shipment_items').select('shipment_id,item_id,quantity,quantity_kg')
  ]);

  const barns=br.data||[], itemsAll=ir.data||[], returns=rr.data||[], returnItems=rir.data||[], assignments=ar.data||[], masters=kr.data||[], company=cpr.data||{}, shipments=sr.data||[], shipmentItems=sir.data||[];
  const txnReturn=txnListState(returns,'logisticsReturn','return_date',5,barns),shownReturns=txnReturn.rows;
  const activeAssignments=assignments.filter(a=>a.active&&(a.cycle_type||'MITRA')==='MITRA');
  const activeByBarn=new Map(activeAssignments.map(a=>[a.barn_id,a]));
  const selectableBarns=barns.filter(b=>activeByBarn.has(b.id));
  const selected=editId?returns.find(x=>x.id===editId):null;
  const selectedAssignment=selected?assignments.find(a=>a.id===selected.contract_assignment_id):null;
  const locked=selected?selectedAssignment?.active===false:false;
  let draftItems=selected?returnItems.filter(x=>x.return_id===selected.id).map(x=>({item_id:x.item_id,quantity:x.quantity,id:x.id})):[];
  window.__logisticsReturnDraftItems=draftItems;

  const todayID=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  let html='<section class="panel"><h3>Retur</h3>'+
    '<p class="muted">Retur mengikuti Kontrak Logistik aktif. Pilih kandang, tambahkan Sapronak yang diretur, lalu Simpan Draft. Harga Retur mengikuti harga kontrak.</p>'+
    '<form id="logisticsReturnForm" class="form-vertical">'+
      '<input type="hidden" name="return_id" value="'+(selected?esc(selected.id):'')+'">'+
      '<label>Cari / Pilih Kandang<input id="returnBarnSearch" autocomplete="off" placeholder="Contoh: cicurug" value="'+(selected?esc((barns.find(b=>b.id===selected.barn_id)?.code||'')+' · '+(barns.find(b=>b.id===selected.barn_id)?.name||'')):'')+'" '+(locked?'disabled':'')+' required></label>'+
      '<input type="hidden" name="barn_id" id="returnBarnId" value="'+(selected?esc(selected.barn_id):'')+'">'+
      '<div id="returnBarnSuggestions" class="search-suggestions"></div>'+
      '<label>Tanggal Retur<input type="date" name="return_date" value="'+esc(selected?.return_date||todayID())+'" '+(locked?'disabled':'')+' required></label>'+
      '<label>Referensi<input name="reference" value="'+esc(selected?.reference||'')+'" '+(locked?'disabled':'')+'></label>'+
      '<label>Catatan<textarea name="notes" '+(locked?'disabled':'')+'>'+esc(selected?.notes||'')+'</textarea></label>'+
    '</form>';

  if(!locked){
    html+='<div class="form-vertical compact-form">'+
      '<label>Cari / Pilih Sapronak<input id="returnItemSearch" autocomplete="off" placeholder="Pilih sapronak yang pernah dikirim ke kandang ini"></label>'+
      '<input type="hidden" id="returnItem">'+
      '<div id="returnItemSuggestions" class="search-suggestions"></div>'+
      '<p id="returnFeedStockInfo" class="muted">Pilih kandang untuk melihat sisa pakan sesuai recording.</p>'+
      '<label id="returnQtyLabel">Jumlah Retur<input id="returnQty" data-number="1" inputmode="decimal"></label>'+
      '<p id="returnQtyInfo" class="muted"></p>'+
      '<button type="button" id="addReturnItem">Tambah Retur</button>'+
    '</div>';
  }

  html+='<div class="tablewrap"><table><thead><tr><th>Kode</th><th>Sapronak</th><th>Jumlah</th><th>Satuan</th><th>Kg</th>'+(locked?'':'<th>Aksi</th>')+'</tr></thead><tbody id="returnDraftBody"></tbody></table></div>';
  if(locked) html+='<p><strong>Status: Terkunci</strong> — Kontrak Logistik periode ini sudah CLOSED.</p>';
  else{
    html+='<button type="button" id="saveReturnDraft">Simpan Draft</button>';
    if(selected) html+=' <button type="button" id="cancelReturnEdit">Batal Edit</button>';
  }
  html+='</section>';

  html+='<section class="panel"><h3>Riwayat Retur</h3>'+txnReturn.controls+(txnReturn.st.shown?'<div class="report-actions"><button type="button" id="returnHistoryPrint">Cetak</button> <button type="button" id="returnHistoryPdf">PDF</button> <button type="button" id="returnHistoryExcel">Excel</button></div>':'')+'<div class="tablewrap"><table id="returnHistoryTable"><thead><tr><th>Kandang</th><th>Tanggal</th><th>Referensi</th><th>Sapronak</th><th>Jumlah</th><th>Satuan</th><th>Kg</th><th>Harga/Satuan</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    shownReturns.flatMap(r=>{
      const b=barns.find(x=>x.id===r.barn_id), a=assignments.find(x=>x.id===r.contract_assignment_id);
      const isLocked=a?.active===false;
      const details=returnItems.filter(x=>x.return_id===r.id);
      if(!details.length){
        return ['<tr><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td>'+esc(r.return_date||'-')+'</td><td>'+esc(r.reference||'-')+'</td><td>-</td><td>-</td><td>-</td><td>-</td><td>'+(isLocked?'Terkunci':'Draft')+'</td><td>'+(isLocked?'<button type="button" data-view-return="'+esc(r.id)+'">Lihat</button>':'<button type="button" data-view-return="'+esc(r.id)+'">Edit</button> <button type="button" data-delete-return="'+esc(r.id)+'">Hapus</button>')+'</td></tr>'];
      }
      return details.map((d,idx)=>{
        const i=itemsAll.find(x=>x.id===d.item_id);
        const kg=d.quantity_kg!=null?d.quantity_kg:(i?.category==='PAKAN'?Number(d.quantity)*Number(i.kg_per_unit||50):null);
        return '<tr><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td>'+esc(r.return_date||'-')+'</td><td>'+esc(r.reference||'-')+'</td><td>'+esc(i?.name||'-')+'</td><td>'+fmtNumber(d.quantity)+'</td><td>'+esc(i?.unit||'-')+'</td><td>'+fmtNumber(kg)+'</td><td>'+fmtNumber(d.unit_price)+'</td><td>'+fmtNumber(Number(d.quantity||0)*Number(d.unit_price||0))+'</td><td>'+(isLocked?'Terkunci':'Draft')+'</td><td>'+(idx===0?(isLocked?'<button type="button" data-view-return="'+esc(r.id)+'">Lihat</button>':'<button type="button" data-view-return="'+esc(r.id)+'">Edit</button> <button type="button" data-delete-return="'+esc(r.id)+'">Hapus</button>'):'')+'</td></tr>';
      });
    }).join('')+
    '</tbody></table></div>'+(!txnReturn.total?'<p>Data Retur tidak ditemukan.</p>':'')+txnReturn.pager+'<p class="muted">Riwayat lengkap tersedia di Laporan Logistik.</p></section>';

  layout(html);
  bindNumberInputs();
  bindTxnList(txnReturn,()=>logisticsReturnPage());

  if(txnReturn.st.shown){
    const historyTable=document.getElementById('returnHistoryTable');
    const returnReportHtml=()=>{
      const table=historyTable?historyTable.cloneNode(true):null;
      if(table)table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const b=barns.find(x=>x.id===txnReturn.st.barn);
      return '<!doctype html><html><head><meta charset="utf-8"><title>Riwayat Retur Sapronak</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
        '<div class="head"><img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company.address||'')+'</div><div>'+esc([company.phone,company.email].filter(Boolean).join(' · '))+'</div></div></div>'+
        '<h2>Riwayat Retur Sapronak</h2><p>Periode: '+esc(txnReturn.st.from||'-')+' s/d '+esc(txnReturn.st.to||'-')+' · Kandang: '+esc(b?shortBarnLabel(b):'Semua Kandang')+'</p>'+
        (table?table.outerHTML:'<p>Tidak ada data.</p>')+'</body></html>';
    };
    const printReturnHistory=pdf=>{
      const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
      const html=returnReportHtml();w.document.write(pdf?html.replace('<title>Riwayat Retur Sapronak</title>','<title>Riwayat_Retur_Sapronak_PDF</title>'):html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    };
    const printBtn=document.getElementById('returnHistoryPrint'),pdfBtn=document.getElementById('returnHistoryPdf'),excelBtn=document.getElementById('returnHistoryExcel');
    if(printBtn)printBtn.onclick=()=>printReturnHistory(false);
    if(pdfBtn)pdfBtn.onclick=()=>BMSCore.savePdfHtml(returnReportHtml(),'Riwayat_Retur_Sapronak.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
    if(excelBtn)excelBtn.onclick=()=>{
      if(!historyTable)return;
      const table=historyTable.cloneNode(true);
      table.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
      const html='<html><head><meta charset="utf-8"></head><body><h2>Riwayat Retur Sapronak</h2>'+table.outerHTML+'</body></html>';
      const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Riwayat_Retur_Sapronak.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  };

  const returnBarnSearch=document.getElementById('returnBarnSearch');
  const returnBarnId=document.getElementById('returnBarnId');
  const returnBarnSuggestions=document.getElementById('returnBarnSuggestions');
  if(returnBarnSearch&&returnBarnId&&returnBarnSuggestions&&!locked){
    const renderReturnBarnSuggestions=()=>{
      const q=(returnBarnSearch.value||'').trim().toLowerCase();
      returnBarnId.value='';
      const rows=q?selectableBarns.filter(x=>{
        const a=activeByBarn.get(x.id), k=masters.find(v=>v.id===a?.master_contract_id);
        const hay=[x.code,x.name,x.location,x.kind,'kontrak aktif',k?.number,a?.performance_template_name].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      }).slice(0,5):[];
      returnBarnSuggestions.innerHTML=rows.map(x=>{
        const a=activeByBarn.get(x.id), k=masters.find(v=>v.id===a?.master_contract_id);
        return '<button type="button" class="search-suggestion" data-barn-id="'+esc(x.id)+'"><strong>'+esc(x.code+' · '+x.name)+'</strong><br><small>'+esc([x.location,k?.number,a?.performance_template_name].filter(Boolean).join(' · '))+'</small></button>';
      }).join('');
      if(q&&!rows.length)returnBarnSuggestions.innerHTML='<div class="search-empty">Kandang tidak ditemukan atau belum memiliki kontrak aktif.</div>';
      returnBarnSuggestions.querySelectorAll('[data-barn-id]').forEach(btn=>btn.onclick=async()=>{
        const b=selectableBarns.find(x=>x.id===btn.dataset.barnId);
        if(!b)return;
        returnBarnSearch.value=shortBarnLabel(b);
        returnBarnId.value=b.id;
        returnBarnSuggestions.innerHTML='';
        if(returnItemSearch)returnItemSearch.value='';
        if(returnItem)returnItem.value='';
        await refreshReturnFeedStock();
      });
    };
    returnBarnSearch.oninput=renderReturnBarnSuggestions;
    returnBarnSearch.onfocus=renderReturnBarnSuggestions;
  }

  const returnItem=document.getElementById('returnItem');
  const returnItemSearch=document.getElementById('returnItemSearch');
  const returnItemSuggestions=document.getElementById('returnItemSuggestions');
  const returnQty=document.getElementById('returnQty');
  const returnQtyLabel=document.getElementById('returnQtyLabel');
  const returnQtyInfo=document.getElementById('returnQtyInfo');
  const returnFeedStockInfo=document.getElementById('returnFeedStockInfo');
  let returnFeedStock=[];
  let rerenderReturnItemSuggestions=()=>{};
  const returnStockFor=itemId=>returnFeedStock.find(x=>x.item_id===itemId);
  const selectedReturnAssignment=()=>activeByBarn.get(returnBarnId?.value||'');
  const returnShipmentRows=assignmentId=>shipmentItems.filter(line=>shipments.some(sh=>sh.id===line.shipment_id&&sh.contract_assignment_id===assignmentId));
  const shippedQuantity=(assignmentId,itemId)=>returnShipmentRows(assignmentId).filter(line=>line.item_id===itemId).reduce((sum,line)=>sum+Number(line.quantity||0),0);
  const returnedQuantity=(assignmentId,itemId)=>returns.filter(r=>r.contract_assignment_id===assignmentId).reduce((sum,r)=>sum+returnItems.filter(line=>line.return_id===r.id&&line.item_id===itemId).reduce((n,line)=>n+Number(line.quantity||0),0),0);
  const currentEditedReturnQuantity=itemId=>selected?returnItems.filter(line=>line.return_id===selected.id&&line.item_id===itemId).reduce((sum,line)=>sum+Number(line.quantity||0),0):0;
  const availableReturnItems=()=>{
    const assignment=selectedReturnAssignment();
    if(!assignment)return [];
    const itemIds=[...new Set(returnShipmentRows(assignment.id).filter(line=>itemsAll.find(item=>item.id===line.item_id)?.category!=='DOC').map(line=>line.item_id))];
    return itemIds.map(itemId=>{
      const item=itemsAll.find(x=>x.id===itemId);
      if(!item)return null;
      const sent=shippedQuantity(assignment.id,itemId),returned=returnedQuantity(assignment.id,itemId),stock=returnStockFor(itemId);
      const remaining=item.category==='PAKAN'?Number(stock?.remaining_units||0):Math.max(0,sent-returned+currentEditedReturnQuantity(itemId));
      const kgPerUnit=Number(item.kg_per_unit||50);
      const remainingKg=item.category==='PAKAN'?(stock?.remaining_kg!=null?Number(stock.remaining_kg):remaining*kgPerUnit):0;
      return {...item,sent_quantity:sent,remaining_quantity:remaining,remaining_kg:remainingKg};
    }).filter(Boolean);
  };
  const refreshReturnFeedStock=async()=>{
    const assignment=selectedReturnAssignment();
    if(!assignment){returnFeedStock=[];if(returnFeedStockInfo)returnFeedStockInfo.textContent='Pilih kandang untuk melihat sisa pakan sesuai recording.';updateReturnQtyContext();if(returnItemSearch?.value)rerenderReturnItemSuggestions();return}
    if(returnFeedStockInfo)returnFeedStockInfo.textContent='Memuat sisa pakan dari recording...';
    const {data,error}=await db.rpc('production_feed_stock',{p_contract_assignment_id:assignment.id});
    if(error){returnFeedStock=[];if(returnFeedStockInfo)returnFeedStockInfo.textContent='Sisa pakan recording tidak dapat dimuat.';msg(error.message);return}
    returnFeedStock=(data||[]).map(x=>({...x}));
    if(selected){
      returnItems.filter(x=>x.return_id===selected.id).forEach(x=>{
        const item=itemsAll.find(i=>i.id===x.item_id);
        let stock=returnStockFor(x.item_id);
        if(!stock){stock={item_id:x.item_id,remaining_units:0,remaining_kg:0};returnFeedStock.push(stock)}
        const kgPerUnit=Number(item?.kg_per_unit||50),qty=Number(x.quantity||0);
        stock.remaining_units=Number(stock.remaining_units||0)+qty;
        stock.remaining_kg=Number(stock.remaining_kg!=null?stock.remaining_kg:0)+qty*kgPerUnit;
      });
    }
    const feeds=returnFeedStock.filter(x=>itemsAll.find(i=>i.id===x.item_id)?.category==='PAKAN'&&Number(x.remaining_units||0)>0);
    if(returnFeedStockInfo)returnFeedStockInfo.textContent=feeds.length
      ?'Sisa pakan sesuai recording: '+feeds.map(x=>{const item=itemsAll.find(i=>i.id===x.item_id),unit=item?.unit||'zak',kg=Number(item?.kg_per_unit||50),remainingKg=x.remaining_kg!=null?Number(x.remaining_kg):Number(x.remaining_units||0)*kg;return (item?.name||'Pakan')+' '+fmtNumber(x.remaining_units)+' '+unit+' / '+fmtNumber(remainingKg)+' kg'}).join(' · ')
      :'Tidak ada sisa pakan tercatat sesuai recording.';
    updateReturnQtyContext();
    if(returnItemSearch?.value)rerenderReturnItemSuggestions();
  };
  const updateReturnQtyContext=()=>{
    if(!returnItem||!returnQtyLabel||!returnQtyInfo)return;
    const item=itemsAll.find(x=>x.id===returnItem.value);
    if(!item){
      returnQtyLabel.firstChild.textContent='Jumlah Retur';
      returnQtyInfo.textContent='';
      return;
    }
    returnQtyLabel.firstChild.textContent='Jumlah Retur ('+(item.unit||'-')+')';
    if(item.category==='PAKAN'){
      const kg=Number(item.kg_per_unit||50),stock=returnStockFor(item.id);
      const remaining=Number(stock?.remaining_units||0),remainingKg=stock?.remaining_kg!=null?Number(stock.remaining_kg):remaining*kg;
      returnQtyInfo.textContent='Pakan: 1 '+(item.unit||'ZAK')+' = '+fmtNumber(kg)+' kg · Sisa sesuai recording: '+fmtNumber(remaining)+' '+(item.unit||'ZAK')+' / '+fmtNumber(remainingKg)+' kg.';
    }else returnQtyInfo.textContent='Satuan retur: '+(item.unit||'-');
  };
  if(returnItemSearch&&returnItemSuggestions&&returnItem){
    const renderReturnItemSuggestions=()=>{
      const q=(returnItemSearch.value||'').trim().toLowerCase();
      returnItem.value='';
      const rows=availableReturnItems().filter(x=>!q||[x.code,x.name,x.category,x.unit].filter(Boolean).join(' ').toLowerCase().includes(q));
      returnItemSuggestions.innerHTML=rows.map(x=>'<button type="button" class="search-suggestion" data-return-item="'+esc(x.id)+'"><strong>'+esc(x.code+' · '+x.name)+'</strong><br><small>'+esc([x.category,x.unit,'sisa '+fmtNumber(x.remaining_quantity)+' '+(x.unit||'satuan')].filter(Boolean).join(' · ')+(x.category==='PAKAN'?' / '+fmtNumber(x.remaining_kg)+' kg':''))+'</small></button>').join('');
      if(!rows.length)returnItemSuggestions.innerHTML='<div class="search-empty">'+(selectedReturnAssignment()?'Belum ada barang yang dikirim ke kandang ini.':'Pilih kandang untuk melihat barang yang dikirim.')+'</div>';
      returnItemSuggestions.querySelectorAll('[data-return-item]').forEach(btn=>btn.onclick=()=>{
        const item=itemsAll.find(x=>x.id===btn.dataset.returnItem);
        if(!item)return;
        returnItem.value=item.id;
        returnItemSearch.value=item.code+' · '+item.name;
        returnItemSuggestions.innerHTML='';
        updateReturnQtyContext();
      });
      updateReturnQtyContext();
    };
    rerenderReturnItemSuggestions=renderReturnItemSuggestions;
    returnItemSearch.oninput=renderReturnItemSuggestions;
    returnItemSearch.onfocus=renderReturnItemSuggestions;
  }
  updateReturnQtyContext();
  if(selected&&!locked)refreshReturnFeedStock();

  const renderDraft=()=>{
    const body=document.getElementById('returnDraftBody'); if(!body)return;
    const arr=window.__logisticsReturnDraftItems||[];
    body.innerHTML=arr.map((x,idx)=>{
      const i=itemsAll.find(v=>v.id===x.item_id);
      const kg=i?.category==='PAKAN'?Number(x.quantity)*Number(i.kg_per_unit||50):null;
      return '<tr><td>'+esc(i?.code||'-')+'</td><td>'+esc(i?.name||'-')+'</td><td>'+fmtNumber(x.quantity)+'</td><td>'+esc(i?.unit||'-')+'</td><td>'+fmtNumber(kg)+'</td>'+
        (locked?'':'<td><button type="button" data-remove-return="'+idx+'">Hapus</button></td>')+'</tr>';
    }).join('');
    if(!locked) body.querySelectorAll('[data-remove-return]').forEach(btn=>btn.onclick=()=>{
      const arr=window.__logisticsReturnDraftItems||[];
      arr.splice(Number(btn.dataset.removeReturn),1);
      renderDraft();
    });
  };
  renderDraft();

  if(!locked){
    document.getElementById('addReturnItem').onclick=()=>{
      const itemId=returnItem.value;
      const qty=normalizeInputID(returnQty.value);
      if(!itemId||qty==null||qty<=0)return msg('Pilih Sapronak dan isi jumlah retur yang benar.');
      const arr=window.__logisticsReturnDraftItems||[];
      const exists=arr.find(x=>x.item_id===itemId);
      if(exists) exists.quantity=Number(exists.quantity)+Number(qty);
      else arr.push({item_id:itemId,quantity:qty});
      returnItem.value='';
      if(returnItemSearch)returnItemSearch.value='';
      if(returnItemSuggestions)returnItemSuggestions.innerHTML='';
      returnQty.value='';
      updateReturnQtyContext();
      renderDraft();
    };

    document.getElementById('saveReturnDraft').onclick=async()=>{
      const form=document.getElementById('logisticsReturnForm');
      const fd=new FormData(form);
      let barnId=String(fd.get('barn_id')||'');
      if(!barnId){
        const q=String(returnBarnSearch?.value||'').trim().toLowerCase();
        const matches=selectableBarns.filter(x=>[x.code,x.name,x.location].filter(Boolean).join(' ').toLowerCase().includes(q));
        if(matches.length===1)barnId=matches[0].id;
        else if(selectableBarns.length===1)barnId=selectableBarns[0].id;
      }
      const assignment=activeByBarn.get(barnId);
      const arr=window.__logisticsReturnDraftItems||[];
      if(!barnId)return msg('Pilih kandang dari daftar.');
      if(!assignment)return msg('Kandang belum memiliki kontrak Logistik aktif.');
      if(!arr.length)return msg('Tambahkan minimal satu Sapronak retur.');

      const returnId=fd.get('return_id')||null;
      const {error:saveError}=await db.rpc('save_logistics_return_atomic',{
        p_id:returnId,
        p_barn_id:barnId,
        p_assignment_id:assignment.id,
        p_return_date:fd.get('return_date'),
        p_reference:fd.get('reference')||null,
        p_notes:fd.get('notes')||null,
        p_items:arr.map(x=>({item_id:x.item_id,quantity:x.quantity}))
      });
      if(saveError)return msg(saveError.message);

      window.__logisticsReturnDraftItems=[];
      await logisticsReturnPage();
      msg(returnId?'Retur berhasil diperbarui.':'Draft retur tersimpan.',true);
    };
    if(selected) document.getElementById('cancelReturnEdit').onclick=()=>logisticsReturnPage();
  }

  root.querySelectorAll('[data-view-return]').forEach(btn=>btn.onclick=()=>logisticsReturnPage(btn.dataset.viewReturn));
  root.querySelectorAll('[data-delete-return]').forEach(btn=>btn.onclick=async()=>{
    if(!await appConfirm('Hapus draft retur ini?'))return;
    const {error}=await db.from('logistics_returns').delete().eq('id',btn.dataset.deleteReturn);
    if(error)return msg(error.message);
    await logisticsReturnPage();
    msg('Draft retur dihapus.',true);
  });
  const err=br.error||ir.error||rr.error||rir.error||ar.error||kr.error||cpr.error||sr.error||sir.error;
  if(err)msg(err.message);
}

async function logisticsPartialReturnPage(){
  const [br,ir,ar,rr,rir,lr,mr]=await Promise.all([
    db.from('barns').select('id,code,name').order('code'),
    db.from('items').select('id,code,name,category,unit,kg_per_unit').eq('category','PAKAN').eq('active',true).order('code'),
    db.from('logistics_contract_assignments').select('id,barn_id,start_date,cycle_type,active').order('start_date',{ascending:false}),
    db.from('logistics_returns').select('id,return_date,reference,notes,contract_assignment_id').order('created_at',{ascending:false}),
    db.from('logistics_return_items').select('id,return_id,item_id,quantity'),
    db.from('logistics_mitra_retained_feed').select('*').order('created_at',{ascending:false}),
    db.from('logistics_company_feed_movements').select('*').order('created_at',{ascending:false})
  ]);
  const barns=br.data||[],items=ir.data||[],assignments=ar.data||[],returns=rr.data||[],returnItems=rir.data||[],lots=lr.data||[],moves=mr.data||[];
  window.__partialReturnHistoryFilter=window.__partialReturnHistoryFilter||{barn:'',from:'',to:'',shown:false};
  window.__companyFeedMoveHistoryFilter=window.__companyFeedMoveHistoryFilter||{barn:'',from:'',to:'',shown:false};
  const partialHistoryFilter=window.__partialReturnHistoryFilter;
  const moveHistoryFilter=window.__companyFeedMoveHistoryFilter;
  const partialHistoryRows=partialHistoryFilter.shown?lots.filter(l=>{
    const a=assignments.find(x=>x.id===l.source_assignment_id),r=returns.find(x=>x.id===l.return_id);
    return (!partialHistoryFilter.barn||a?.barn_id===partialHistoryFilter.barn)&&
      (!partialHistoryFilter.from||String(r?.return_date||'')>=partialHistoryFilter.from)&&
      (!partialHistoryFilter.to||String(r?.return_date||'')<=partialHistoryFilter.to);
  }):[];
  const moveHistoryRows=moveHistoryFilter.shown?moves.filter(m=>{
    const a=assignments.find(x=>x.id===m.contract_assignment_id);
    return (!moveHistoryFilter.barn||a?.barn_id===moveHistoryFilter.barn)&&
      (!moveHistoryFilter.from||String(m.transferred_on||'')>=moveHistoryFilter.from)&&
      (!moveHistoryFilter.to||String(m.transferred_on||'')<=moveHistoryFilter.to);
  }):[];
  const mitra=assignments.filter(a=>a.active&&(a.cycle_type||'MITRA')==='MITRA');
  const targets=assignments.filter(a=>a.active);
  const label=a=>{const b=barns.find(x=>x.id===a?.barn_id);return (b?.code||'-')+' · '+(b?.name||'-')+' · '+(a?.cycle_type||'MITRA');};
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const balance=l=>Number(l.quantity)+moves.filter(m=>m.retained_feed_id===l.id).reduce((n,m)=>n+(m.direction==='OUT'?Number(m.quantity):-Number(m.quantity)),0);
  const lotLabel=l=>{const a=assignments.find(x=>x.id===l.source_assignment_id),i=items.find(x=>x.id===l.item_id);return (i?.name||'-')+' · asal '+label(a);};

  window.__partialReturnEdit=window.__partialReturnEdit||'';
  window.__companyFeedMoveEdit=window.__companyFeedMoveEdit||'';
  const editLot=lots.find(x=>x.id===window.__partialReturnEdit)||null;
  const editMove=moves.find(x=>x.id===window.__companyFeedMoveEdit)||null;
  const editReturn=editLot?returns.find(x=>x.id===editLot.return_id):null;
  const editReturnItem=editLot?returnItems.find(x=>x.id===editLot.return_item_id):null;

  let html='<section class="panel"><h3>'+(editLot?'Edit Retur Mitra Diterima Sebagian':'Retur Mitra Diterima Sebagian')+'</h3>'+
    '<p class="muted">Gunakan menu ini hanya saat jumlah fisik yang kembali lebih besar daripada yang diterima inti. Jika diterima seluruhnya, gunakan menu Retur biasa.</p>'+
    '<form id="partialReturnForm" class="form-vertical">'+
      '<label>Kandang Mitra asal<select name="assignment" required '+(editLot?'disabled':'')+'><option value="">Pilih kandang</option>'+mitra.map(a=>'<option value="'+esc(a.id)+'" '+(editLot?.source_assignment_id===a.id?'selected':'')+'>'+esc(label(a))+'</option>').join('')+'</select></label>'+
      '<label>Pakan<select name="item" required '+(editLot?'disabled':'')+'><option value="">Pilih pakan</option>'+items.map(i=>'<option value="'+esc(i.id)+'" '+(editLot?.item_id===i.id?'selected':'')+'>'+esc(i.code+' · '+i.name+' ('+i.unit+')')+'</option>').join('')+'</select></label>'+
      '<label>Sisa fisik di kandang<input name="physical" data-number="1" inputmode="decimal" value="'+(editLot?fmtNumber(Number(editReturnItem?.quantity||0)+Number(editLot.quantity)):'')+'" required></label>'+
      '<label>Diterima oleh inti<input name="accepted" data-number="1" inputmode="decimal" value="'+(editLot?fmtNumber(editReturnItem?.quantity||0):'0')+'" required></label>'+
      '<p class="muted">Selisih otomatis menjadi stok BMS. Contoh: fisik 20, diterima inti 10, stok BMS 10.</p>'+
      '<label>Tanggal Retur<input name="date" type="date" value="'+esc(editReturn?.return_date||today)+'" required></label>'+
      '<label>Referensi<input name="reference" value="'+esc(editReturn?.reference||'')+'"></label>'+
      '<label>Catatan<input name="notes" value="'+esc(editReturn?.notes||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">'+(editLot?'Simpan Perubahan':'Simpan Retur Sebagian')+'</button>'+(editLot?'<button type="button" id="partialReturnEditCancel">Batal Edit</button>'+(profile?.role==='ADMIN'?'<button type="button" id="partialReturnDelete" class="btn-danger">Hapus</button>':''):'')+'</div>'+
    '</form></section>'+
    '<section class="panel"><h3>Stok BMS dari Retur Mitra</h3><div class="tablewrap"><table><thead><tr><th>Asal</th><th>Pakan</th><th>Jumlah Awal</th><th>Sisa Gudang</th><th>Harga Kontrak/Zak</th></tr></thead><tbody>'+
      lots.map(l=>'<tr><td>'+esc(label(assignments.find(a=>a.id===l.source_assignment_id)))+'</td><td>'+esc(items.find(i=>i.id===l.item_id)?.name||'-')+'</td><td>'+fmtNumber(l.quantity)+'</td><td>'+fmtNumber(balance(l))+'</td><td>Rp '+fmtNumber(l.unit_price)+'</td></tr>').join('')+
      '</tbody></table></div>'+(lots.length?'':'<p>Belum ada stok BMS dari retur sebagian.</p>')+
    '<form id="companyFeedMoveForm" class="form-vertical">'+
      '<label>Stok asal<select name="lot" required '+(editMove?'disabled':'')+'><option value="">Pilih stok</option>'+lots.map(l=>'<option value="'+esc(l.id)+'" '+(editMove?.retained_feed_id===l.id?'selected':'')+'>'+esc(lotLabel(l)+' · sisa '+fmtNumber(balance(l)))+'</option>').join('')+'</select></label>'+
      '<label>Arah<select name="direction"><option value="IN" '+((editMove?.direction||'IN')==='IN'?'selected':'')+'>Kirim ke kandang</option><option value="OUT" '+(editMove?.direction==='OUT'?'selected':'')+'>Kembali ke stok BMS dari kandang</option></select></label>'+
      '<label>Kandang<select name="assignment" required><option value="">Pilih kandang</option>'+targets.map(a=>'<option value="'+esc(a.id)+'" '+(editMove?.contract_assignment_id===a.id?'selected':'')+'>'+esc(label(a))+'</option>').join('')+'</select></label>'+
      '<label>Jumlah zak<input name="quantity" data-number="1" inputmode="decimal" value="'+(editMove?fmtNumber(editMove.quantity):'')+'" required></label>'+
      '<label>Tanggal<input name="date" type="date" value="'+esc(editMove?.transferred_on||today)+'" required></label>'+
      '<label>Referensi<input name="reference" value="'+esc(editMove?.reference||'')+'"></label>'+
      '<div class="inline-actions"><button type="submit">'+(editMove?'Simpan Perubahan':'Catat Pemindahan')+'</button>'+(editMove?'<button type="button" id="companyFeedMoveEditCancel">Batal Edit</button>'+(profile?.role==='ADMIN'?'<button type="button" id="companyFeedMoveDelete" class="btn-danger">Hapus</button>':''):'')+'</div>'+
    '</form></section>'+
    '<section class="panel"><h3>Riwayat Retur Sebagian</h3>'+
      '<form id="partialReturnHistoryForm" class="form-vertical compact-form" data-no-submit-guard="1">'+
        '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(partialHistoryFilter.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
        '<label>Tanggal Dari<input type="date" name="from" value="'+esc(partialHistoryFilter.from||'')+'"></label>'+
        '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(partialHistoryFilter.to||'')+'"></label>'+
        '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="partialReturnHistoryReset">Reset</button></div>'+
      '</form>'+
      (partialHistoryFilter.shown?'<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Asal</th><th>Pakan</th><th>Fisik</th><th>Diterima Inti</th><th>Stok BMS</th><th>Harga/Zak</th><th>Referensi</th><th>Aksi</th></tr></thead><tbody>'+
      partialHistoryRows.map(l=>{const r=returns.find(x=>x.id===l.return_id),ri=returnItems.find(x=>x.id===l.return_item_id);return '<tr><td>'+esc(r?.return_date||'-')+'</td><td>'+esc(label(assignments.find(a=>a.id===l.source_assignment_id)))+'</td><td>'+esc(items.find(i=>i.id===l.item_id)?.name||'-')+'</td><td>'+fmtNumber(Number(ri?.quantity||0)+Number(l.quantity))+'</td><td>'+fmtNumber(ri?.quantity||0)+'</td><td>'+fmtNumber(l.quantity)+'</td><td>Rp '+fmtNumber(l.unit_price)+'</td><td>'+esc(r?.reference||'-')+'</td><td><div class="inline-actions"><button type="button" data-edit-partial-return="'+esc(l.id)+'">Edit</button>'+(profile?.role==='ADMIN'?'<button type="button" class="btn-danger" data-delete-partial-return="'+esc(l.id)+'">Hapus</button>':'')+'</div></td></tr>';}).join('')+
      '</tbody></table></div>'+(partialHistoryRows.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>'+
    '<section class="panel"><h3>Riwayat Pemindahan Stok BMS</h3>'+
      '<form id="companyFeedMoveHistoryForm" class="form-vertical compact-form" data-no-submit-guard="1">'+
        '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(moveHistoryFilter.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
        '<label>Tanggal Dari<input type="date" name="from" value="'+esc(moveHistoryFilter.from||'')+'"></label>'+
        '<label>Tanggal Sampai<input type="date" name="to" value="'+esc(moveHistoryFilter.to||'')+'"></label>'+
        '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="companyFeedMoveHistoryReset">Reset</button></div>'+
      '</form>'+
      (moveHistoryFilter.shown?'<div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Asal Pakan</th><th>Kandang</th><th>Arah</th><th>Zak</th><th>Nilai</th><th>Referensi</th><th>Aksi</th></tr></thead><tbody>'+
      moveHistoryRows.map(m=>{const l=lots.find(x=>x.id===m.retained_feed_id);return '<tr><td>'+esc(m.transferred_on)+'</td><td>'+esc(l?lotLabel(l):'-')+'</td><td>'+esc(label(assignments.find(a=>a.id===m.contract_assignment_id)))+'</td><td>'+esc(m.direction==='IN'?'Ke kandang':'Kembali ke BMS')+'</td><td>'+fmtNumber(m.quantity)+'</td><td>Rp '+fmtNumber(Number(m.quantity)*Number(l?.unit_price||0))+'</td><td>'+esc(m.reference||'-')+'</td><td><div class="inline-actions"><button type="button" data-edit-company-feed-move="'+esc(m.id)+'">Edit</button>'+(profile?.role==='ADMIN'?'<button type="button" class="btn-danger" data-delete-company-feed-move="'+esc(m.id)+'">Hapus</button>':'')+'</div></td></tr>';}).join('')+
      '</tbody></table></div>'+(moveHistoryRows.length?'':'<p>Data riwayat tidak ditemukan.</p>'):'<p class="muted">Riwayat belum ditampilkan.</p>')+
    '</section>';

  layout(html);bindNumberInputs();
  const error=[br,ir,ar,rr,rir,lr,mr].find(x=>x.error)?.error;if(error)msg(error.message);
  const partialHistoryForm=document.getElementById('partialReturnHistoryForm');
  const partialHistoryReset=document.getElementById('partialReturnHistoryReset');
  if(partialHistoryForm)partialHistoryForm.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(partialHistoryForm);
    partialHistoryFilter.barn=String(fd.get('barn')||'');partialHistoryFilter.from=String(fd.get('from')||'');partialHistoryFilter.to=String(fd.get('to')||'');
    if(partialHistoryFilter.from&&partialHistoryFilter.to&&partialHistoryFilter.from>partialHistoryFilter.to){const t=partialHistoryFilter.from;partialHistoryFilter.from=partialHistoryFilter.to;partialHistoryFilter.to=t}
    partialHistoryFilter.shown=true;await logisticsPartialReturnPage();
  };
  if(partialHistoryReset)partialHistoryReset.onclick=async()=>{window.__partialReturnHistoryFilter={barn:'',from:'',to:'',shown:false};await logisticsPartialReturnPage();};
  const moveHistoryForm=document.getElementById('companyFeedMoveHistoryForm');
  const moveHistoryReset=document.getElementById('companyFeedMoveHistoryReset');
  if(moveHistoryForm)moveHistoryForm.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(moveHistoryForm);
    moveHistoryFilter.barn=String(fd.get('barn')||'');moveHistoryFilter.from=String(fd.get('from')||'');moveHistoryFilter.to=String(fd.get('to')||'');
    if(moveHistoryFilter.from&&moveHistoryFilter.to&&moveHistoryFilter.from>moveHistoryFilter.to){const t=moveHistoryFilter.from;moveHistoryFilter.from=moveHistoryFilter.to;moveHistoryFilter.to=t}
    moveHistoryFilter.shown=true;await logisticsPartialReturnPage();
  };
  if(moveHistoryReset)moveHistoryReset.onclick=async()=>{window.__companyFeedMoveHistoryFilter={barn:'',from:'',to:'',shown:false};await logisticsPartialReturnPage();};

  root.querySelectorAll('[data-edit-partial-return]').forEach(btn=>btn.onclick=async()=>{window.__partialReturnEdit=btn.dataset.editPartialReturn||'';window.__companyFeedMoveEdit='';await logisticsPartialReturnPage();document.getElementById('partialReturnForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const partialCancel=document.getElementById('partialReturnEditCancel');if(partialCancel)partialCancel.onclick=async()=>{window.__partialReturnEdit='';await logisticsPartialReturnPage();};
  const deletePartial=async id=>{
    if(profile?.role!=='ADMIN')return msg('Hanya ADMIN yang boleh menghapus retur sebagian.');
    if(!await appConfirm('PERINGATAN HAPUS RETUR SEBAGIAN\n\nStok BMS hasil retur akan ikut dihapus. Jika stok sudah pernah dipindahkan, sistem akan menolak penghapusan.\n\nLanjutkan hapus?'))return;
    const {error}=await db.rpc('admin_delete_mitra_split_return_v1',{p_retained_feed_id:id});
    if(error)return msg(error.message);
    window.__partialReturnEdit='';await logisticsPartialReturnPage();msg('Retur sebagian berhasil dihapus oleh ADMIN.',true);
  };
  root.querySelectorAll('[data-delete-partial-return]').forEach(btn=>btn.onclick=()=>deletePartial(btn.dataset.deletePartialReturn));
  const partialDelete=document.getElementById('partialReturnDelete');if(partialDelete&&editLot)partialDelete.onclick=()=>deletePartial(editLot.id);

  root.querySelectorAll('[data-edit-company-feed-move]').forEach(btn=>btn.onclick=async()=>{window.__companyFeedMoveEdit=btn.dataset.editCompanyFeedMove||'';window.__partialReturnEdit='';await logisticsPartialReturnPage();document.getElementById('companyFeedMoveForm')?.scrollIntoView({behavior:'smooth',block:'start'});});
  const moveCancel=document.getElementById('companyFeedMoveEditCancel');if(moveCancel)moveCancel.onclick=async()=>{window.__companyFeedMoveEdit='';await logisticsPartialReturnPage();};
  const deleteMove=async id=>{
    if(profile?.role!=='ADMIN')return msg('Hanya ADMIN yang boleh menghapus pemindahan stok.');
    if(!await appConfirm('PERINGATAN HAPUS PEMINDAHAN STOK BMS\n\nSaldo stok BMS dan alokasi kandang akan berubah. Sistem akan menolak jika penghapusan membuat saldo stok negatif.\n\nLanjutkan hapus?'))return;
    const {error}=await db.rpc('admin_delete_company_feed_movement_v1',{p_id:id});
    if(error)return msg(error.message);
    window.__companyFeedMoveEdit='';await logisticsPartialReturnPage();msg('Pemindahan stok berhasil dihapus oleh ADMIN.',true);
  };
  root.querySelectorAll('[data-delete-company-feed-move]').forEach(btn=>btn.onclick=()=>deleteMove(btn.dataset.deleteCompanyFeedMove));
  const moveDelete=document.getElementById('companyFeedMoveDelete');if(moveDelete&&editMove)moveDelete.onclick=()=>deleteMove(editMove.id);

  document.getElementById('partialReturnForm').onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(ev.target),physical=normalizeInputID(fd.get('physical')),accepted=normalizeInputID(fd.get('accepted'));
    if(physical==null||physical<=0||accepted==null||accepted<0||accepted>=physical)return msg('Jumlah fisik harus lebih besar dari jumlah yang diterima inti. Angka diterima inti boleh nol.');
    if(editLot){
      const {error}=await db.rpc('logistics_correct_mitra_split_return_v1',{
        p_retained_feed_id:editLot.id,p_return_date:fd.get('date'),p_physical_quantity:physical,p_accepted_quantity:accepted,
        p_reference:fd.get('reference')||null,p_notes:fd.get('notes')||null
      });
      if(error)return msg(error.message);
      window.__partialReturnEdit='';await logisticsPartialReturnPage();msg('Retur sebagian berhasil diperbarui.',true);return;
    }
    const a=mitra.find(x=>x.id===fd.get('assignment'));if(!a)return msg('Pilih siklus Mitra aktif.');
    const {error}=await db.rpc('save_mitra_split_return_atomic',{
      p_barn_id:a.barn_id,p_assignment_id:a.id,p_return_date:fd.get('date'),p_reference:fd.get('reference')||null,p_notes:fd.get('notes')||null,
      p_items:[{item_id:fd.get('item'),physical_quantity:physical,accepted_quantity:accepted}]
    });
    if(error)return msg(error.message);await logisticsPartialReturnPage();msg('Retur sebagian dan stok BMS tercatat.',true);
  };

  document.getElementById('companyFeedMoveForm').onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(ev.target),qty=normalizeInputID(fd.get('quantity'));
    if(qty==null||qty<=0)return msg('Jumlah perpindahan harus lebih dari nol.');
    if(editMove){
      const {error}=await db.rpc('logistics_correct_company_feed_movement_v1',{
        p_id:editMove.id,p_contract_assignment_id:fd.get('assignment'),p_direction:fd.get('direction'),
        p_quantity:qty,p_transferred_on:fd.get('date'),p_reference:fd.get('reference')||null
      });
      if(error)return msg(error.message);
      window.__companyFeedMoveEdit='';await logisticsPartialReturnPage();msg('Pemindahan stok BMS berhasil diperbarui.',true);return;
    }
    const {error}=await db.rpc('move_company_feed_atomic',{
      p_retained_feed_id:fd.get('lot'),p_contract_assignment_id:fd.get('assignment'),p_direction:fd.get('direction'),
      p_quantity:qty,p_transferred_on:fd.get('date'),p_reference:fd.get('reference')||null
    });
    if(error)return msg(error.message);await logisticsPartialReturnPage();msg('Pemindahan stok BMS tercatat.',true);
  };
}

function attachListFilter({tableId,fields}){
  const table=document.getElementById(tableId);
  if(!table||table.dataset.filterReady==='1')return;
  table.dataset.filterReady='1';
  const wrap=table.closest('.tablewrap')||table;
  const form=document.createElement('form');
  form.className='form-vertical master-filter-form';
  form.innerHTML=fields.map((f,i)=>{
    const name='f'+i;
    if(f.type==='select'){
      return '<label>'+esc(f.label)+'<select name="'+name+'"><option value="">'+esc(f.allLabel||('Semua '+f.label))+'</option>'+(f.options||[]).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'</select></label>';
    }
    return '<label>'+esc(f.label)+'<input name="'+name+'" placeholder="'+esc(f.placeholder||'')+'"></label>';
  }).join('')+'<div class="report-actions"><button type="submit">Tampilkan</button><button type="button" data-list-filter-reset>Reset Filter</button></div>';
  wrap.parentNode.insertBefore(form,wrap);
  wrap.style.display='none';
  const rows=[...table.querySelectorAll('tbody tr')];
  form.onsubmit=ev=>{
    ev.preventDefault();
    const fd=new FormData(form);
    rows.forEach(row=>{
      const cells=[...row.cells];
      const ok=fields.every((f,i)=>{
        const q=String(fd.get('f'+i)||'').trim().toLowerCase();
        if(!q)return true;
        const txt=String(cells[f.col]?.textContent||'').trim().toLowerCase();
        return f.type==='select'?txt===q:txt.includes(q);
      });
      row.style.display=ok?'':'none';
    });
    wrap.style.display='';
  };
  form.querySelector('[data-list-filter-reset]').onclick=()=>{
    form.reset();
    rows.forEach(row=>row.style.display='');
    wrap.style.display='none';
  };
}

async function supplierMasterPage(type){
  const isMeat=type==='DAGING';
  const label=isMeat?'Supplier Daging':'Supplier Sapronak';
  const {data,error}=await db.from('suppliers').select('*').eq('supplier_type',type).order('code',{ascending:true});
  const rows=data||[];
  const html='<section class="panel"><h3>'+label+'</h3>'+
    '<form id="supplierTypedForm" class="form-vertical">'+
      '<input type="hidden" name="id">'+
      '<label>Nama Supplier<input name="name" required></label>'+
      '<label>Alamat<textarea name="address"></textarea></label>'+
      '<label>Telepon/WhatsApp<input name="phone"></label>'+
      '<label>Kontak Person<input name="contact_person"></label>'+
      '<label>Bank<input name="bank_name"></label>'+
      '<label>No. Rekening<input name="bank_account_number"></label>'+
      '<label>Atas Nama Rekening<input name="bank_account_name"></label>'+
      '<label>NPWP<input name="tax_number"></label>'+
      '<label>NIB/No. Usaha<input name="business_id"></label>'+
      '<label>Catatan<textarea name="notes"></textarea></label>'+
      '<button type="submit" id="supplierTypedSave">Simpan</button>'+
      '<button type="button" id="supplierTypedCancel" hidden>Batal Edit</button>'+
    '</form></section>'+
    '<section class="panel"><h3>Data '+label+'</h3><div class="tablewrap"><table id="supplierTypedTable"><thead><tr>'+
      '<th>Kode</th><th>Nama</th><th>Telepon</th><th>Kontak</th><th>Bank</th><th>Status</th><th>Aksi</th>'+
    '</tr></thead><tbody>'+
      rows.map(x=>'<tr><td>'+esc(x.code||'')+'</td><td>'+esc(x.name||'')+'</td><td>'+esc(x.phone||'-')+'</td><td>'+esc(x.contact_person||'-')+'</td><td>'+esc(x.bank_name||'-')+'</td><td>'+(x.active?'Aktif':'Nonaktif')+'</td><td><button type="button" data-edit-typed-supplier="'+esc(x.id)+'">Edit</button> <button type="button" data-toggle-typed-supplier="'+esc(x.id)+'">'+(x.active?'Nonaktifkan':'Aktifkan')+'</button></td></tr>').join('')+
    '</tbody></table></div>'+(!rows.length?'<p>Belum ada '+label+'.</p>':'')+'</section>';
  layout(html);
  attachListFilter({tableId:'supplierTypedTable',fields:[
    {label:'Kode',col:0,placeholder:'Kode supplier'},
    {label:'Nama',col:1,placeholder:'Nama supplier'},
    {label:'Telepon',col:2,placeholder:'Telepon'},
    {label:'Kontak',col:3,placeholder:'Kontak person'},
    {label:'Bank',col:4,placeholder:'Bank'},
    {label:'Status',col:5,type:'select',options:['Aktif','Nonaktif']}
  ]});
  if(error)msg(error.message);
  const form=document.getElementById('supplierTypedForm'),save=document.getElementById('supplierTypedSave'),cancel=document.getElementById('supplierTypedCancel');
  const reset=()=>{form.reset();form.elements.id.value='';save.textContent='Simpan';cancel.hidden=true;};
  cancel.onclick=reset;
  root.querySelectorAll('[data-edit-typed-supplier]').forEach(btn=>btn.onclick=()=>{
    const x=rows.find(v=>v.id===btn.dataset.editTypedSupplier);if(!x)return;
    ['id','name','address','phone','contact_person','bank_name','bank_account_number','bank_account_name','tax_number','business_id','notes'].forEach(k=>{if(form.elements[k])form.elements[k].value=x[k]||'';});
    save.textContent='Simpan Perubahan';cancel.hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'});
  });
  root.querySelectorAll('[data-toggle-typed-supplier]').forEach(btn=>btn.onclick=async()=>{
    const x=rows.find(v=>v.id===btn.dataset.toggleTypedSupplier);if(!x)return;
    const {error}=await db.from('suppliers').update({active:!x.active}).eq('id',x.id);
    if(error)return msg(error.message);
    await supplierMasterPage(type);msg(x.active?label+' dinonaktifkan.':label+' diaktifkan.',true);
  });
  form.onsubmit=async ev=>{
    ev.preventDefault();const fd=new FormData(form),id=fd.get('id');
    const payload={supplier_type:type,name:fd.get('name'),address:fd.get('address')||null,phone:fd.get('phone')||null,contact_person:fd.get('contact_person')||null,bank_name:fd.get('bank_name')||null,bank_account_number:fd.get('bank_account_number')||null,bank_account_name:fd.get('bank_account_name')||null,tax_number:fd.get('tax_number')||null,business_id:fd.get('business_id')||null,notes:fd.get('notes')||null};
    const q=id?db.from('suppliers').update(payload).eq('id',id):db.from('suppliers').insert(payload);
    const {error}=await q;if(error)return msg(error.message);
    await load();tab=isMeat?'supplier_daging':'supplier_sapronak';await supplierMasterPage(type);msg(id?label+' diperbarui.':label+' tersimpan.',true);
  };
}


const prodNum=v=>Number(v||0);
const prodFmt=(v,d=2)=>{const n=Number(v||0);const dec=d===0?0:2;return n.toLocaleString('id-ID',{minimumFractionDigits:dec,maximumFractionDigits:dec})};
const prodDateId=v=>{if(!v)return '-';const m=String(v).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v)};
const financeOriginalNoteDisplay=v=>{
  let s=String(v||'').trim();
  if(!s)return '-';
  if(/^Reklasifikasi/i.test(s)&&/Sumber\s+sebelumnya\s*:/i.test(s)){
    s=s.replace(/^.*Sumber\s+sebelumnya\s*:\s*/is,'').replace(/[ .;|-]+$/,'').trim();
    return s||'-';
  }
  if(/^Sumber\s+Excel\s+lama\s+kategori/i.test(s))return '-';
  s=s.replace(/^\s*(?:Sumber\s+DATA\s+PETERNAKAN[^:]*:|Import\s+Excel\s+Operasional[^:]*:|Import\s+Excel[^:]*:|Import\s+Buku\s+Besar\s+BMS\s+Express\s*:|Buku\s+Besar\s+PT\s+BMS\s+baris[^:]*:|Upah\s+kerja\s+selama\s+periode\s*;\s*rincian\s+DATA\s+PETERNAKAN\s*:)[\s]*/is,'').trim();
  s=s.replace(/^\s*Alokasi\s+sumber\s+BB-[^ ]+\s+total\s+Rp[0-9.]+\.\s*/is,'').trim();
  s=s.replace(/^\s*Migrasi\s+data\s+lama\.\s*/is,'').trim();
  s=s.replace(/\s*\|\s*(?:Sesuai\s+arahan|Koreksi|Reklasifikasi)\s*:?.*$/is,'').trim();
  s=s.replace(/\s*[·|]\s*sumber\s+Excel\s+lama.*$/is,'').trim();
  s=s.replace(/\.\s*(?:BMS\s+(?:GROUP|[1-4])(?:\s|\.|$)|Tujuan(?:\s+ditetapkan)?\s*:|Source\s|Qty\s|Nota\s+real\s|Aset\s|Barang\s|Seluruh\s+BB-|Alat\/peralatan\s|Kode\s+sumber\s).*$/is,'').trim();
  s=s.replace(/\s*(?:[.;]\s*)?(?:Sumber\s+(?:Excel\s+)?Data\s+Lama|Sumber\s+Data\s+Lama|Alokasi\s+upah|Ongkos\s+angkut\s+GROUP|GROUP\s+dibagi\s+rata|Nama\s+kandang\s+pada\s+uraian|Tujuan\s+[A-Za-z]|Perawatan\s+kandang\s+tanpa\s+siklus|Tanpa\s+siklus(?:\s+produksi)?|Keterangan\s+asli\s+BMS|tanggal\s+asli|Kode\s+sumber|sesuai\s+(?:arahan|instruksi|konfirmasi)|Reklasifikasi).*$/is,'').trim();
  s=s.replace(/[ .;|-]+$/,'').trim();
  return s||'-';
};
const financeShortReferenceDisplay=v=>{
  const s=String(v||'').trim();
  if(!s)return '-';
  if(/^IMP-/i.test(s)){
    const last=s.split('-').filter(Boolean).pop();
    return last||s;
  }
  return s;
};
const prodToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Satu sumber umur produksi untuk seluruh modul PPL/Produksi.
// Tanggal DOC datang = Hari 0, H+1 = umur 1.
const prodAge=(a,b)=>{
  if(!a||!b)return 0;
  const start=Date.parse(String(a).slice(0,10)+'T00:00:00Z');
  const end=Date.parse(String(b).slice(0,10)+'T00:00:00Z');
  return Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,Math.floor((end-start)/86400000)):0;
};
