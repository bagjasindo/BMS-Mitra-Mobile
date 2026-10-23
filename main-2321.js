const createClient=window.supabase?.createClient;
if(!createClient){
  const app=document.getElementById('app');
  if(app)app.innerHTML='<main class="login"><h1>BMS Mobile</h1><p class="error">Library aplikasi gagal dimuat. Silakan muat ulang halaman.</p></main>';
  throw new Error('Supabase client library failed to load');
}

const db=createClient('https://mqqrfhwqgcpkjeaasdsr.supabase.co','sb_publishable_iJ0t2vhUt-iSwIN8Tky8IQ_XBnonQn4',{global:{fetch:BMSCore.createFetch(window.fetch.bind(window),()=>session?.user?.id)}});
const root=document.getElementById('app');
const BMS_PRINT_LOGO='data:image/jpeg;base64,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';
let session=null,profile=null,tab='dashboard',assignments=[],barns=[],items=[],suppliers=[],employees=[],advances=[],pplUsers=[],contracts=[],contractReadiness=[];
let navInitialCollapsePending=true;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNumber=v=>{
  if(v===null||v===undefined||v==='') return '';
  const n=Number(v);
  if(!Number.isFinite(n)) return esc(v);
  const dec=Math.abs(n-Math.trunc(n))>1e-9;
  return new Intl.NumberFormat('id-ID',{minimumFractionDigits:dec?2:0,maximumFractionDigits:dec?2:0}).format(n);
};
const autoCodeTabs=new Set(['kandang','item','supplier','karyawan']);
const shortBarnName=name=>{
  const n=String(name||'').trim();
  return n.replace(/^Internal\s+/i,'Int.');
};
const shortBarnLabel=b=>b?(shortBarnName(b.name)||b.name):'-';
const shortContractLabel=name=>String(name||'').replace(/^Kontrak\s+/i,'').trim();
const assignmentIdentity=(rows,barnRows,contractRows,a)=>{
  if(!a)return '-';
  const b=(barnRows||[]).find(x=>x.id===a.barn_id);
  return (b?shortBarnLabel(b):'-')+' · S'+(assignmentCycleNo(rows,a)||'-');
};
const assignmentActiveBarnLabel=(barnRows,a)=>{
  const b=a&&(barnRows||[]).find(x=>x.id===a.barn_id);
  return b?shortBarnLabel(b):'-';
};
const assignmentLabel=id=>{const a=assignments.find(x=>x.id===id);return assignmentIdentity(assignments,barns,contracts,a)};
const assignmentCycleNo=(rows,a)=>{
  if(!a)return 0;
  const same=(rows||[]).filter(x=>x.barn_id===a.barn_id).slice().sort((x,y)=>{
    const xd=String(x.start_date||x.created_at||''),yd=String(y.start_date||y.created_at||'');
    return xd.localeCompare(yd)||String(x.created_at||'').localeCompare(String(y.created_at||''))||String(x.id||'').localeCompare(String(y.id||''));
  });
  const idx=same.findIndex(x=>x.id===a.id);
  return idx>=0?idx+1:0;
};
const assignmentCycleLabel=(rows,a)=>'Siklus '+(assignmentCycleNo(rows,a)||'-');
const cellValue=(row,f)=>f[2]==='number'?fmtNumber(row[f[0]]):f[2]==='supplier'?esc(suppliers.find(s=>s.id===row[f[0]])?.name||''):f[2]==='assignment'?esc(assignmentLabel(row[f[0]])):f[2]==='barn'?esc(shortBarnLabel(barns.find(b=>b.id===row[f[0]]))):esc(row[f[0]]);
const formatInputID=v=>{
  let s=String(v??'').replace(/\s/g,'').replace(/\./g,'').replace(/[^0-9,]/g,'');
  let [i,d]=s.split(',');
  i=(i||'0').replace(/^0+(?=\d)/,'');
  i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  if(d!==undefined) return i+','+d.slice(0,2);
  return i;
};
const normalizeInputID=v=>{
  const s=String(v??'').trim().replace(/\./g,'').replace(',','.');
  if(s==='') return null;
  const n=Number(s);
  return Number.isFinite(n)?n:null;
};
const bindItemUnit=()=>{
  if(tab!=='item')return;
  const form=document.getElementById('entry');
  if(!form)return;
  const cat=form.elements.category;
  const unit=form.elements.unit;
  if(!cat||!unit)return;
  if(!document.getElementById('ovk-units')){
    const dl=document.createElement('datalist');
    dl.id='ovk-units';
    ['BOTOL','SACHET','LITER','ML','GRAM','KG','VIAL','AMPUL','TABLET','DOS'].forEach(v=>{
      const o=document.createElement('option');o.value=v;dl.appendChild(o);
    });
    form.appendChild(dl);
  }
  const sync=()=>{
    unit.removeAttribute('list');
    unit.placeholder='';
    if(cat.value==='DOC'){
      unit.value='EKOR';
      unit.readOnly=true;
    }else if(cat.value==='PAKAN'){
      unit.value='ZAK';
      unit.readOnly=true;
    }else if(cat.value==='OVK'){
      if(unit.readOnly)unit.value='';
      unit.readOnly=false;
      unit.setAttribute('list','ovk-units');
      unit.placeholder='Pilih/ketik satuan OVK';
    }else{
      if(unit.readOnly)unit.value='';
      unit.readOnly=false;
      unit.placeholder='Masukkan satuan';
    }
  };
  cat.addEventListener('change',sync);
  sync();
};
const bindComputedWeights=()=>{
  const form=document.getElementById('entry');
  if(!form)return;
  const show=(key,val)=>{
    const el=form.querySelector('[data-computed="'+key+'"]');
    if(el)el.value=val==null||!Number.isFinite(val)?'':new Intl.NumberFormat('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}).format(val);
  };
  const calc=()=>{
    if(tab==='recording'){
      const n=normalizeInputID(form.elements.sample_count?.value);
      const w=normalizeInputID(form.elements.sample_weight_total_kg?.value);
      show('avg_weight_kg',n>0&&w!=null?w/n:null);
    }else if(tab==='chick_in'){
      const n=normalizeInputID(form.elements.sample_count?.value);
      const w=normalizeInputID(form.elements.sample_weight_total_g?.value);
      show('avg_weight',n>0&&w!=null?w/n:null);
    }else if(tab==='panen'){
      const n=normalizeInputID(form.elements.birds?.value);
      const w=normalizeInputID(form.elements.net_weight_kg?.value);
      show('avg_weight_kg',n>0&&w!=null?w/n:null);
    }
  };
  form.querySelectorAll('input').forEach(el=>el.addEventListener('input',calc));
  calc();
};
const bindNumberInputs=()=>{
  root.querySelectorAll('input[data-number="1"]').forEach(el=>{
    el.addEventListener('input',()=>{el.value=formatInputID(el.value)});
    el.addEventListener('blur',()=>{
      if(el.value.includes(',')){
        const [i,d='']=el.value.split(',');
        el.value=i+','+(d+'00').slice(0,2);
      }
    });
  });
};



const txnListState=(rows,key,dateKey,size=5,barns=null,barnKey='barn_id',opts={})=>{
  window.__bmsTxnList=window.__bmsTxnList||{};
  const st=window.__bmsTxnList[key]||{from:'',to:'',barn:'',assignment:'',status:'',shown:false};
  if(st.assignment===undefined)st.assignment='';
  if(st.status===undefined)st.status='';
  if(st.shown===undefined)st.shown=false;
  if(!st.barn)st.assignment='';
  const filtered=rows.filter(x=>
    (!st.barn||String(x?.[barnKey]||'')===st.barn)&&
    (!opts.assignmentKey||!st.assignment||String(x?.[opts.assignmentKey]||'')===st.assignment)&&
    (!opts.statusKey||!st.status||String(x?.[opts.statusKey]||'')===st.status)&&
    (!st.from||String(x?.[dateKey]||'')>=st.from)&&
    (!st.to||String(x?.[dateKey]||'')<=st.to)
  );
  window.__bmsTxnList[key]=st;
  const pplFilter=profile?.role==='PPL';
  const allBarnLabel=pplFilter?'Semua Kandang Saya':'Semua Kandang';
  const allCycleLabel=pplFilter?'Semua Siklus Saya':'Semua Siklus';
  const barnControl=barns?'<label>Pilih Kandang<select data-txn-barn="'+key+'"><option value="">'+allBarnLabel+'</option>'+barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc((b.code?b.code+' · ':'')+(b.name||''))+'</option>').join('')+'</select></label>':'';
  const cycleRows=(opts.assignments||[]).filter(a=>!st.barn||!a.barn_id||String(a.barn_id)===String(st.barn));
  const assignmentControl=opts.assignments?.length?'<label>Pilih Siklus<select data-txn-assignment="'+key+'" '+(!st.barn?'disabled':'')+'><option value="">'+allCycleLabel+'</option>'+cycleRows.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(a.label||a.id)+'</option>').join('')+'</select></label>':'';
  const statusControl=opts.statusOptions?.length?'<label>Status<select data-txn-status="'+key+'"><option value="">Semua Status</option>'+opts.statusOptions.map(v=>'<option value="'+esc(v)+'" '+(st.status===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>':'';
  return {
    key,st,total:st.shown?filtered.length:0,rows:st.shown?filtered:[],assignmentOptions:opts.assignments||[],
    controls:'<div class="form-vertical compact-form" style="margin-bottom:12px">'+barnControl+assignmentControl+statusControl+'<label>Tanggal Dari<input type="date" data-txn-from="'+key+'" value="'+esc(st.from||'')+'"></label><label>Tanggal Sampai<input type="date" data-txn-to="'+key+'" value="'+esc(st.to||'')+'"></label><div class="inline-actions"><button type="button" data-txn-search="'+key+'">Tampilkan</button><button type="button" data-txn-reset="'+key+'">Reset</button></div></div>',
    pager:st.shown?'<p class="muted" style="margin-top:10px">'+filtered.length+' data ditampilkan.</p>':'<p class="muted" style="margin-top:10px">Riwayat belum ditampilkan.</p>'
  };
};
const bindTableExportActions=({tableId,printId,pdfId,excelId,title,filename,filterText='',dropLast=false})=>{
  const table=document.getElementById(tableId);
  if(!table)return;
  const cleanTable=()=>{
    const x=table.cloneNode(true);
    if(dropLast)x.querySelectorAll('tr').forEach(tr=>{if(tr.cells.length)tr.deleteCell(tr.cells.length-1);});
    return x;
  };
  const reportHtml=async()=>{
    const {data:company}=await db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle();
    const t=cleanTable();
    return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}h2{margin:0 0 5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body>'+
      '<div class="head"><img src="'+esc(company?.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company?.company_name||company?.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company?.address||'')+'</div><div>'+esc([company?.phone,company?.email].filter(Boolean).join(' · '))+'</div></div></div>'+
      '<h2>'+esc(title)+'</h2>'+(filterText?'<p>'+esc(filterText)+'</p>':'')+t.outerHTML+'</body></html>';
  };
  const printBtn=document.getElementById(printId),pdfBtn=document.getElementById(pdfId),excelBtn=document.getElementById(excelId);
  if(printBtn)printBtn.onclick=async()=>{const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');w.document.write(await reportHtml());w.document.close();setTimeout(()=>{w.focus();w.print();},500);};
  if(pdfBtn)pdfBtn.onclick=async()=>{try{await BMSCore.savePdfHtml(await reportHtml(),filename+'.pdf')}catch(error){msg(error?.message||'PDF gagal dibuat.')}};
  if(excelBtn)excelBtn.onclick=()=>{const t=cleanTable();const html='<html><head><meta charset="utf-8"></head><body><h2>'+esc(title)+'</h2>'+(filterText?'<p>'+esc(filterText)+'</p>':'')+t.outerHTML+'</body></html>';const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename+'.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
};
const bindHtmlExportActions=({elementId,printId,pdfId,excelId,title,filename,filterText=''})=>{
  const source=document.getElementById(elementId);if(!source)return;
  const clean=()=>{const x=source.cloneNode(true);x.querySelectorAll('[data-export-skip]').forEach(n=>n.remove());return x;};
  const reportHtml=async()=>{
    const {data:company}=await db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle();
    const x=clean();
    return '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>@page{size:A4 landscape;margin:7mm}body{font-family:Arial,sans-serif;font-size:9px}.head{display:flex;gap:8px;align-items:center;border-bottom:1px solid #555;padding-bottom:5px;margin-bottom:7px}.head img{width:52px;height:52px;object-fit:contain}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px;text-align:left}th{background:#eee}</style></head><body><div class="head"><img src="'+esc(company?.logo_url||BMS_PRINT_LOGO)+'"><div><h2>'+esc(company?.company_name||company?.legal_name||'Nama perusahaan belum diisi')+'</h2><div>'+esc(company?.address||'')+'</div><div>'+esc([company?.phone,company?.email].filter(Boolean).join(' · '))+'</div></div></div><h2>'+esc(title)+'</h2>'+(filterText?'<p>'+esc(filterText)+'</p>':'')+x.outerHTML+'</body></html>';
  };
  const p=document.getElementById(printId),d=document.getElementById(pdfId),e=document.getElementById(excelId);
  if(p)p.onclick=async()=>{const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');w.document.write(await reportHtml());w.document.close();setTimeout(()=>{w.focus();w.print();},500);};
  if(d)d.onclick=async()=>{try{await BMSCore.savePdfHtml(await reportHtml(),filename+'.pdf')}catch(error){msg(error?.message||'PDF gagal dibuat.')}};
  if(e)e.onclick=()=>{const x=clean();const html='<html><head><meta charset="utf-8"></head><body><h2>'+esc(title)+'</h2>'+(filterText?'<p>'+esc(filterText)+'</p>':'')+x.outerHTML+'</body></html>';const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml(html)]);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename+'.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
};
const bindTxnList=(x,render)=>{
  const barn=root.querySelector('[data-txn-barn="'+x.key+'"]'),assignment=root.querySelector('[data-txn-assignment="'+x.key+'"]'),status=root.querySelector('[data-txn-status="'+x.key+'"]'),from=root.querySelector('[data-txn-from="'+x.key+'"]'),to=root.querySelector('[data-txn-to="'+x.key+'"]'),search=root.querySelector('[data-txn-search="'+x.key+'"]'),reset=root.querySelector('[data-txn-reset="'+x.key+'"]');
  if(barn&&assignment)barn.onchange=()=>{
    const bid=barn.value||'';
    const rows=x.assignmentOptions.filter(a=>!bid||!a.barn_id||String(a.barn_id)===String(bid));
    assignment.disabled=!bid;
    assignment.innerHTML='<option value="">'+(profile?.role==='PPL'?'Semua Siklus Saya':'Semua Siklus')+'</option>'+rows.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.label||a.id)+'</option>').join('');
  };
  if(search)search.onclick=()=>{
    x.st.barn=barn?.value||'';
    x.st.assignment=x.st.barn?(assignment?.value||''):'';
    x.st.status=status?.value||'';
    x.st.from=from?.value||'';
    x.st.to=to?.value||'';
    if(x.st.from&&x.st.to&&x.st.from>x.st.to){const t=x.st.from;x.st.from=x.st.to;x.st.to=t}
    x.st.shown=true;
    render();
  };
  if(reset)reset.onclick=()=>{
    x.st.barn='';x.st.assignment='';x.st.status='';x.st.from='';x.st.to='';x.st.shown=false;
    render();
  };
};
const roles={finance_mandiri_piutang:['ADMIN','KEUANGAN'],finance_mandiri_penerimaan:['ADMIN','KEUANGAN'],finance_mandiri_hutang:['ADMIN','KEUANGAN'],finance_mandiri_pembayaran:['ADMIN','KEUANGAN'],finance_mandiri_laporan:['ADMIN','KEUANGAN'],logistik_pembelian_mandiri:['ADMIN','LOGISTIK'],logistik_pakan_luar:['ADMIN','LOGISTIK'],logistik_doc_luar:['ADMIN','LOGISTIK'],logistik_ovk1_luar:['ADMIN','LOGISTIK'],logistik_beli_peralatan:['ADMIN','LOGISTIK'],marketing_pelanggan:['ADMIN','MARKETING'],kandang:['ADMIN'],liga_abk:['ADMIN','PPL'],rekap_produksi:['ADMIN','PPL'],item:['ADMIN'],supplier:['ADMIN'],supplier_sapronak:['ADMIN'],supplier_daging:['ADMIN'],kontrak:['ADMIN'],harga_hidup:['ADMIN'],bonus_kontrak:['ADMIN'],standar_performa:['ADMIN'],chick_in:['ADMIN','PPL'],sapronak:['ADMIN','LOGISTIK'],recording:['ADMIN','PPL'],kunjungan:['ADMIN','PPL'],panen:['ADMIN','MARKETING'],ekspedisi:['ADMIN','LOGISTIK','MARKETING'],estimasi:['ADMIN','PPL'],rhpp:['ADMIN','OWNER'],finance_rhpp_real:['ADMIN','KEUANGAN','OWNER'],bop:['ADMIN','KEUANGAN'],laba_rugi_kandang:['ADMIN','KEUANGAN','OWNER'],laba_rugi_global:['ADMIN','KEUANGAN','OWNER'],perawatan_kandang:['ADMIN','KEUANGAN'],aset_kandang:['ADMIN','KEUANGAN'],hutang_supplier:['ADMIN','KEUANGAN'],finance_pembelian_langsung:['ADMIN','KEUANGAN'],finance_beli_stok:['ADMIN','KEUANGAN'],logistik_stok_barang:['ADMIN','LOGISTIK'],logistik_kirim_stok:['ADMIN','LOGISTIK'],bop_umum:['ADMIN','KEUANGAN'],arus_kas:['ADMIN','KEUANGAN'],laporan_keuangan:['ADMIN','KEUANGAN'],form_pengajuan_kas:['ADMIN','KEUANGAN'],perusahaan:['ADMIN'],karyawan:['ADMIN'],kasbon:['ADMIN','KEUANGAN'],cicilan:['ADMIN','KEUANGAN'],gaji_abk:['ADMIN','KEUANGAN'],expedisi_master:['ADMIN'],expedisi_usaha:['ADMIN','LOGISTIK'],expedisi_pembayaran:['ADMIN','KEUANGAN'],bop_expedisi:['ADMIN','KEUANGAN'],perawatan_expedisi:['ADMIN','KEUANGAN'],laporan_expedisi:['ADMIN','KEUANGAN','OWNER']};
const visibleTabs={
  ADMIN:['dashboard','finance_mandiri_piutang','finance_mandiri_penerimaan','finance_mandiri_hutang','finance_mandiri_pembayaran','finance_mandiri_laporan','kandang','item','supplier_sapronak','supplier_daging','marketing_pelanggan','kontrak','harga_hidup','bonus_kontrak','standar_performa','reset_klasemen','karyawan','pengguna','perusahaan','logistik_kontrak','logistik_pembelian_mandiri','logistik_pengiriman','logistik_kiriman_luar','logistik_pakan_luar','logistik_doc_luar','logistik_ovk1_luar','logistik_beli_peralatan','logistik_stok_barang','logistik_kirim_stok','logistik_retur_luar','logistik_retur','logistik_retur_sebagian','logistik_laporan','chick_in','recording','kunjungan','estimasi','liga_abk','ppl_liga_kandang_view','rekap_produksi','ppl_rhpp_view','ppl_rhpp_abk_view','laporan','marketing_panen_kontrak','marketing_panen_mandiri','marketing_tambah_daging','marketing_laporan','rhpp','rhpp_history','finance_rhpp_real','bop','laba_rugi_kandang','laba_rugi_global','perawatan_kandang','aset_kandang','hutang_supplier','finance_pembelian_langsung','finance_beli_stok','bop_umum','form_pengajuan_kas','expedisi_master','expedisi_usaha','expedisi_pembayaran','bop_expedisi','perawatan_expedisi','laporan_expedisi','kasbon','cicilan','arus_kas','laporan_keuangan','owner_logistics_report','owner_marketing_report','owner_finance_report','owner_production_report','owner_ppl_report','admin_cycle_lock','admin_log_aktivitas','arsip_data','profil'],
  LOGISTIK:['dashboard','logistik_kontrak','logistik_pembelian_mandiri','logistik_pengiriman','logistik_kiriman_luar','logistik_pakan_luar','logistik_doc_luar','logistik_ovk1_luar','logistik_beli_peralatan','logistik_stok_barang','logistik_kirim_stok','logistik_retur_luar','logistik_retur','logistik_retur_sebagian','expedisi_usaha','logistik_laporan','profil'],
  PPL:['dashboard','chick_in','recording','kunjungan','estimasi','liga_abk','ppl_liga_kandang_view','rekap_produksi','ppl_rhpp_view','ppl_rhpp_abk_view','laporan','profil'],
  MARKETING:['dashboard','kandang','kontrak','harga_hidup','marketing_pelanggan','marketing_panen_kontrak','marketing_panen_mandiri','marketing_tambah_daging','marketing_laporan','profil'],
  KEUANGAN:['dashboard','finance_mandiri_piutang','finance_mandiri_penerimaan','finance_mandiri_hutang','finance_mandiri_pembayaran','finance_mandiri_laporan','expedisi_pembayaran','bop_expedisi','perawatan_expedisi','laporan_expedisi','finance_rhpp_real','bop','laba_rugi_kandang','laba_rugi_global','perawatan_kandang','aset_kandang','hutang_supplier','finance_pembelian_langsung','finance_beli_stok','bop_umum','form_pengajuan_kas','kasbon','cicilan','arus_kas','laporan_keuangan','profil'],
  OWNER:['dashboard','rhpp','rhpp_history','laporan_expedisi','finance_rhpp_real','laba_rugi_kandang','laba_rugi_global','owner_logistics_report','owner_marketing_report','owner_finance_report','owner_production_report','owner_ppl_report','profil']
};
for(const role of ['ADMIN','LOGISTIK','KEUANGAN','PPL']){if(visibleTabs[role])visibleTabs[role].push('inventori_fisik');}
visibleTabs.ADMIN.push('master_peralatan_kandang');
const canViewTab=k=>profile?.role==='OWNER'||k==='profil'||Boolean(profile?.role&&visibleTabs[profile.role]?.includes(k));
const modules={
  kandang:{table:'barns',fields:[['name','Nama'],['capacity','Kapasitas','number'],['kind','Jenis','select:OPEN_HOUSE,SEMI_CLOSE_HOUSE,CLOSE_HOUSE'],['location','Lokasi']]},
  item:{table:'items',fields:[['name','Nama'],['category','Jenis','select:DOC,PAKAN,OVK1,OVK2,LAINNYA'],['feed_phase','Fase Pakan'],['unit','Satuan'],['supplier_id','Supplier','supplier'],['kg_per_unit','Kg / Satuan','number']]},
  supplier:{table:'suppliers',fields:[['name','Nama Supplier'],['address','Alamat'],['phone','Telepon/WhatsApp'],['contact_person','Kontak Person'],['bank_name','Bank'],['bank_account_number','No. Rekening'],['bank_account_name','Atas Nama Rekening'],['tax_number','NPWP'],['business_id','NIB/No. Usaha'],['notes','Catatan']]},
  kontrak:{table:'contracts',fields:[['number','Nomor Kontrak'],['contract_date','Tanggal','date'],['integrator','Perusahaan Inti'],['doc_price','Harga DOC (Rp/ekor)','number'],['pre_starter_price','Harga Pre Starter (Rp/kg)','number'],['starter_price','Harga Starter (Rp/kg)','number'],['finisher_price','Harga Finisher (Rp/kg)','number'],['ovk_price_basis','Dasar Harga OVK','select:FIXED,DISTRIBUTOR_PLUS_VAT'],['ovk_price','Harga OVK Tetap (Rp)','number'],['ovk_vat_percent','PPN OVK (%)','number'],['harvest_price','Harga Panen Dasar (Rp/kg)','number'],['signed_reference','Referensi Kontrak Ditandatangani']]},
  harga_hidup:{table:'contract_live_prices',fields:[['contract_id','Kontrak','contract'],['min_weight_kg','Bobot minimum (kg)','number'],['max_weight_kg','Batas atas bobot, tidak termasuk (kg)','number'],['price_per_kg','Harga per kg (Rp)','number']]},
  bonus_kontrak:{table:'contract_bonuses',fields:[['contract_id','Kontrak','contract'],['metric','Dasar bonus','select:IP,FCR_DIFFERENCE,DEPLETION,OTHER'],['min_value','Batas minimum','number'],['max_value','Batas maksimum','number'],['rupiah_per_kg','Tambahan Rp/kg','number'],['notes','Keterangan']]},
  standar_performa:{table:'performance_standards',fields:[['contract_id','Kontrak','contract'],['age_days','Umur (hari)','number'],['std_feed_g_per_bird','Standar Pakan (g/ekor)','number'],['std_body_weight_g','Standar BW (g)','number'],['std_fcr','Standar FCR','number']]},
  chick_in:{table:'chick_ins',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['arrived_on','Tanggal Datang','date'],['hatchery','Hatchery'],['strain','Strain'],['shipped','Jumlah Dikirim','number'],['received','Jumlah Diterima','number'],['doa','DOA','number'],['sample_count','Jumlah Sampel DOC','number'],['sample_weight_total_g','Total Bobot Sampel DOC (g)','number'],['avg_weight','Bobot Rata-rata DOC (g)','computed'],['delivery_number','Nomor DO']]},
  sapronak:{table:'supplies',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['item_id','Item','item'],['quantity','Jumlah','number'],['received_on','Tanggal','date'],['delivery_number','Nomor DO']]},
  recording:{table:'recordings',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['recorded_on','Tanggal','date'],['age_days','Umur (hari)','number'],['mortality','Mortalitas','number'],['culling','Afkir','number'],['feed_kg','Pakan (kg)','number'],['feed_item_id','Jenis Pakan','item'],['feed_bags_in','Zak Masuk','number'],['feed_bags_out','Zak Keluar','number'],['feed_bags_balance','Sisa Zak','number'],['sample_count','Jumlah Sampel','number'],['sample_weight_total_kg','Total Bobot Sampel (kg)','number'],['avg_weight_kg','Bobot Rata-rata (kg)','computed'],['actual_fcr','FCR Aktual','number'],['ip','IP Aktual','number'],['temperature','Suhu','number'],['humidity','Kelembapan','number'],['medication_notes','Program Obat'],['notes','Catatan']]},
  kunjungan:{table:'visits',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['visited_on','Tanggal Kunjungan','date'],['findings','Temuan'],['recommendation','Rekomendasi'],['follow_up','Tindak lanjut'],['follow_up_status','Status']]},
  panen:{table:'harvests',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['harvested_on','Tanggal Panen','date'],['transaction_number','Nomor Transaksi'],['delivery_number','Nomor DO'],['birds','Jumlah Ekor','number'],['net_weight_kg','Berat Bersih (kg)','number'],['avg_weight_kg','Bobot Rata-rata (kg)','computed'],['price_per_kg','Harga per kg','number'],['buyer','Pembeli'],['vehicle','Kendaraan'],['driver','Sopir']]},
  rhpp:{table:'rhpp_real',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['amount','RHPP Real (Rp)','number'],['received_on','Tanggal Diterima','date'],['reference','Referensi'],['notes','Catatan']]},
  bop:{table:'bop',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['incurred_on','Tanggal','date'],['category','Kategori','select:OVK,TENAGA_KERJA,TRANSPORTASI,LISTRIK,PERBAIKAN,LAINNYA'],['amount','Nominal (Rp)','number'],['reference','Referensi'],['notes','Catatan']]}
  ,aset_kandang:{table:'barn_assets',fields:[['barn_id','Kandang','barn'],['name','Nama Aset'],['category','Kategori','select:PERALATAN,MESIN,BANGUNAN,INSTALASI,KENDARAAN,LAINNYA'],['quantity','Jumlah','number'],['unit','Satuan'],['acquired_on','Tanggal Perolehan','date'],['acquisition_value','Nilai Perolehan Total (Rp)','number'],['condition','Kondisi','select:BAIK,PERLU_PERBAIKAN,RUSAK'],['status','Status','select:AKTIF,DIPINDAHKAN,DIJUAL,DINONAKTIFKAN'],['notes','Catatan']]}
  ,ekspedisi:{table:'expeditions',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['departed_on','Tanggal','date'],['destination','Tujuan'],['vehicle','Kendaraan'],['driver','Sopir'],['cargo','Muatan'],['reference','Referensi'],['notes','Catatan']]}
  ,estimasi:{table:'rhpp_estimates',fields:[['contract_assignment_id','Kandang / Kontrak Logistik','assignment'],['estimated_on','Tanggal Estimasi','date'],['age_days','Umur (hari)','number'],['projected_amount','Proyeksi RHPP','number'],['notes','Catatan']]}
  ,perusahaan:{table:'company_profile',fields:[['company_name','Nama Perusahaan'],['legal_name','Nama Legal'],['address','Alamat'],['phone','Telepon'],['email','Email'],['website','Website'],['tax_number','NPWP'],['business_id','Nomor Usaha'],['bank_name','Bank Perusahaan'],['bank_account_number','No. Rekening Perusahaan'],['bank_account_name','Atas Nama Rekening'],['signatory_name','Penandatangan'],['signatory_title','Jabatan']]}
  ,karyawan:{table:'employees',fields:[['name','Nama'],['kind','Jenis','select:KARYAWAN,ABK'],['phone','Telepon'],['job_title','Jabatan'],['joined_on','Tanggal Masuk','date'],['notes','Catatan']]}
  ,kasbon:{table:'advances',fields:[['employee_id','Karyawan','employee'],['advanced_on','Tanggal Kasbon','date'],['amount','Nominal','number'],['description','Keterangan'],['reference','Referensi']]}
  ,cicilan:{table:'advance_payments',fields:[['advance_id','Kasbon','advance'],['paid_on','Tanggal Bayar','date'],['amount','Nominal','number'],['method','Metode'],['reference','Referensi'],['notes','Catatan']]}
};
const title={master_peralatan_kandang:'Master Peralatan Kandang',inventori_fisik:'Inventori Peralatan Kandang',finance_mandiri_piutang:'Piutang Penjualan',finance_mandiri_penerimaan:'Penerimaan Penjualan',finance_mandiri_hutang:'Hutang Supplier Mandiri',finance_mandiri_pembayaran:'Pembayaran Supplier',finance_mandiri_laporan:'Laporan Mandiri',dashboard:'Dashboard',reset_klasemen:'Reset Klasemen ABK',owner_logistics_report:'Laporan Logistik',owner_marketing_report:'Laporan Marketing',owner_finance_report:'Laporan Keuangan',owner_production_report:'Laporan Produksi',owner_ppl_report:'Laporan PPL',supplier_sapronak:'Master Supplier Sapronak',supplier_daging:'Master Supplier Daging',logistik_kontrak:'Buat Siklus',logistik_pembelian_mandiri:'Pembelian Mandiri',logistik_pengiriman:'Pengiriman',logistik_kiriman_luar:'Sapronak Luar',logistik_pakan_luar:'Pakan Luar',logistik_doc_luar:'DOC Luar',logistik_ovk1_luar:'OVK1 / Obat Luar',logistik_beli_peralatan:'Beli Peralatan',logistik_stok_barang:'Stok Barang',logistik_kirim_stok:'Kirim Barang dari Gudang',logistik_retur:'Retur RHPP',logistik_retur_sebagian:'Retur Bermasalah',logistik_retur_luar:'Retur Tambah Sapronak',logistik_laporan:'Laporan Logistik',marketing_pelanggan:'Master Pelanggan',marketing_panen_kontrak:'Panen Mitra',marketing_panen_mandiri:'Panen Mandiri',marketing_tambah_daging:'Tambah Daging',marketing_laporan:'Laporan Marketing',kandang:'Master Kandang',item:'Master Sapronak',supplier:'Master Supplier',kontrak:'Master Kontrak',harga_hidup:'Harga Ayam Hidup',bonus_kontrak:'Bonus Kontrak',standar_performa:'Master Performa',chick_in:'Chick-In / DOC Masuk',sapronak:'Sapronak',recording:'Recording PPL',kunjungan:'Kunjungan PPL',panen:'Panen',ekspedisi:'Ekspedisi',estimasi:'Estimasi',liga_abk:'Liga ABK',ppl_liga_kandang_view:'Lihat Liga per Kandang',rekap_produksi:'Rekap Produksi PPL',ppl_rhpp_view:'Lihat RHPP',ppl_rhpp_abk_view:'Lihat RHPP ABK',rhpp:'CEK RHPP',rhpp_history:'Cetak RHPP',finance_rhpp_real:'RHPP Real',bop:'BOP Produksi',laba_rugi_kandang:'Laba/Rugi Kandang',laba_rugi_global:'Laba/Rugi Global',perawatan_kandang:'Perawatan Kandang',aset_kandang:'Aset Kandang / Kantor',hutang_supplier:'Hutang Supplier Mitra',finance_pembelian_langsung:'Beli Aset',finance_beli_stok:'Pembelian Barang',bop_umum:'BOP Umum',expedisi_master:'Master Data Expedisi',expedisi_usaha:'Expedisi',expedisi_pembayaran:'Penerimaan Expedisi',bop_expedisi:'BOP Expedisi',perawatan_expedisi:'Perawatan Expedisi',laporan_expedisi:'Laporan Expedisi',arus_kas:'Arus Kas',laporan_keuangan:'Laporan Keuangan',form_pengajuan_kas:'Form Pengajuan Kas',perusahaan:'Data Perusahaan',karyawan:'Master Karyawan',kasbon:'Kasbon',cicilan:'Bayar Kasbon',gaji_abk:'Gaji ABK',laporan:'Laporan',pengguna:'Master Pengguna',admin_cycle_lock:'Buka/Tutup Siklus',admin_log_aktivitas:'Log Aktivitas Pengguna',arsip_data:'Arsip Data',profil:'Profil'};
const submitGuardSkip=form=>{
  const id=String(form?.id||'');
  return id==='auth'||form?.dataset?.noSubmitGuard==='1'||/(filter|search|history)/i.test(id);
};
const submitButtonSet=(btn,label)=>{
  if(!btn)return;
  if(btn.tagName==='INPUT')btn.value=label;
  else btn.textContent=label;
};
const actionButtonStart=(btn,label='Memproses...')=>{
  if(!btn||btn.dataset.bmsActionBusy==='1')return false;
  btn.dataset.bmsActionBusy='1';
  btn.dataset.bmsActionOriginal=btn.textContent||'Aksi';
  btn.disabled=true;
  btn.textContent=label;
  return true;
};
const actionButtonFinish=async(btn,ok=true,successLabel='Terhapus ✓',failureLabel='Gagal — coba lagi')=>{
  if(!btn)return;
  btn.textContent=ok?successLabel:failureLabel;
  await new Promise(resolve=>setTimeout(resolve,ok?850:1500));
  if(!ok){
    btn.disabled=false;
    btn.textContent=btn.dataset.bmsActionOriginal||'Hapus';
  }
  delete btn.dataset.bmsActionBusy;
  delete btn.dataset.bmsActionOriginal;
};
const applyPendingSubmitFeedback=()=>{
  const fb=window.__bmsPendingSubmitFeedback;
  if(!fb||Date.now()>fb.expires){window.__bmsPendingSubmitFeedback=null;return;}
  const form=fb.formId?document.getElementById(fb.formId):null;
  const btn=form?.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
  if(!btn)return;
  const original=btn.tagName==='INPUT'?btn.value:btn.textContent;
  submitButtonSet(btn,fb.ok?'✓ Tersimpan':'✕ Belum tersimpan');
  btn.disabled=!!fb.ok;
  if(fb.message)btn.title=String(fb.message);
  window.setTimeout(()=>{
    if(!btn.isConnected)return;
    btn.disabled=false;
    submitButtonSet(btn,original||'Simpan');
    btn.removeAttribute('title');
  },fb.ok?3000:3000);
  window.__bmsPendingSubmitFeedback=null;
};
const releaseSubmitGuard=(form,feedback=null)=>{
  if(!form||form.dataset?.bmsSubmitting!=='1')return;
  form.dataset.bmsSubmitting='0';
  const btn=form.__bmsSubmitButton;
  const original=btn?.dataset?.bmsOriginalLabel||'Simpan';
  if(btn&&feedback){
    submitButtonSet(btn,feedback.ok?'✓ Tersimpan':'✕ Belum tersimpan');
    btn.disabled=!!feedback.ok;
    if(feedback.message)btn.title=String(feedback.message);
    window.__bmsPendingSubmitFeedback={
      formId:String(form.id||''),
      ok:!!feedback.ok,
      message:String(feedback.message||''),
      expires:Date.now()+(feedback.ok?4500:4000)
    };
    window.setTimeout(()=>{
      if(!btn.isConnected)return;
      btn.disabled=false;
      submitButtonSet(btn,original);
      delete btn.dataset.bmsOriginalLabel;
      btn.removeAttribute('title');
    },feedback.ok?3000:3000);
  }else if(btn){
    btn.disabled=false;
    submitButtonSet(btn,original);
    delete btn.dataset.bmsOriginalLabel;
  }
  form.__bmsSubmitButton=null;
  if(window.__bmsSubmittingForm===form)window.__bmsSubmittingForm=null;
};
document.addEventListener('submit',ev=>{
  const form=ev.target;
  if(!(form instanceof HTMLFormElement)||submitGuardSkip(form))return;
  if(form.dataset.bmsSubmitting==='1'){
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const btn=form.__bmsSubmitButton;
    if(btn)submitButtonSet(btn,'Menyimpan…');
    return;
  }
  form.dataset.bmsSubmitting='1';
  window.__bmsSubmittingForm=form;
  const btn=ev.submitter||form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
  if(btn){
    form.__bmsSubmitButton=btn;
    btn.dataset.bmsOriginalLabel=btn.tagName==='INPUT'?btn.value:btn.textContent;
    btn.disabled=true;
    submitButtonSet(btn,'Menyimpan…');
  }
  window.setTimeout(()=>{
    if(form.dataset?.bmsSubmitting==='1'){
      const btn=form.__bmsSubmitButton;if(btn){submitButtonSet(btn,'Masih memproses…');btn.title='Tunggu hasil penyimpanan. Permintaan belum selesai.';}
    }
  },60000);
},true);
window.addEventListener('unhandledrejection',()=>{
  const form=window.__bmsSubmittingForm;
  if(form)releaseSubmitGuard(form,{ok:false,message:'Terjadi kesalahan saat menyimpan.'});
});
const msg=(s,ok=false)=>{
  const submitting=window.__bmsSubmittingForm;
  if(submitting){
    releaseSubmitGuard(submitting,{ok,message:s});
    return;
  }
  let e=document.getElementById('message');
  if(e){e.textContent=s;e.className=ok?'success':'error'}
};
const transactionDeleteImpact=(table)=>{
  const impacts={
    logistics_shipments:'pengiriman dan rincian stok/logistik yang terkait dapat berubah',
    logistics_external_shipments:'pengiriman sapronak luar dan rincian terkait dapat berubah',
    logistics_returns:'retur Mitra dan stok/rekap terkait dapat berubah',
    logistics_external_returns:'retur sapronak luar dan stok/rekap terkait dapat berubah',
    logistics_mandiri_purchases:'pembelian Mandiri, hutang supplier, alokasi kandang, dan laporan terkait dapat berubah',
    marketing_contract_harvests:'panen, penjualan/piutang, RHPP/laba-rugi, dan laporan terkait dapat berubah',
    marketing_external_meat_purchases:'transaksi tambah daging dan laporan terkait dapat berubah',
    chick_ins:'populasi awal, recording, estimasi, dan laporan produksi dapat berubah',
    recordings:'rekaman produksi, FCR/IP, estimasi, dan laporan produksi dapat berubah',
    visits:'riwayat kunjungan PPL akan berubah',
    production_estimates:'estimasi produksi dan rincian ukuran terkait dapat berubah',
    bop:'BOP Produksi, Arus Kas, dan laba/rugi siklus dapat berubah',
    barn_maintenance_costs:'Perawatan Kandang, Arus Kas, dan laporan perusahaan dapat berubah',
    bop_outside:'BOP Umum, Arus Kas, dan laporan global dapat berubah',
    finance_expedition_trips:'trip, invoice/BOP/riwayat Expedisi yang terkait dapat berubah',
    finance_expedition_invoices:'invoice, piutang, penerimaan, dan laporan Expedisi dapat berubah',
    finance_expedition_payments:'penerimaan kas, piutang, dan laporan Expedisi dapat berubah',
    finance_expedition_bop:'BOP Expedisi dan laba/rugi Expedisi dapat berubah',
    finance_expedition_maintenance:'perawatan dan laba/rugi Expedisi dapat berubah',
    advances:'kasbon, sisa kasbon, Arus Kas, dan pembayaran terkait dapat berubah',
    advance_payments:'sisa kasbon dan Arus Kas dapat berubah',
    supplier_payments:'sisa hutang supplier dan Arus Kas dapat berubah',
    finance_mandiri_sales_receipts:'penerimaan Mandiri, sisa piutang, dan Arus Kas dapat berubah',
    finance_mandiri_supplier_payments:'pembayaran supplier Mandiri, sisa hutang, dan Arus Kas dapat berubah',
    rhpp_real:'status final Mitra, Arus Kas, dan laba/rugi dapat berubah',
    abk_cycle_salaries:'gaji ABK, potongan kasbon, dan Arus Kas dapat berubah'
  };
  return impacts[table]||'laporan dan saldo yang memakai transaksi ini dapat berubah';
};
const roleDeleteTables={
  PPL:['chick_ins','recordings','visits','production_estimates'],
  MARKETING:['marketing_contract_harvests','marketing_external_meat_purchases'],
  LOGISTIK:['logistics_shipments','logistics_external_shipments','logistics_returns','logistics_external_returns','logistics_mandiri_purchases'],
  KEUANGAN:['bop','barn_maintenance_costs','bop_outside','finance_expedition_trips','finance_expedition_invoices','finance_expedition_payments','finance_expedition_bop','finance_expedition_maintenance','advances','advance_payments','supplier_payments','finance_mandiri_sales_receipts','finance_mandiri_supplier_payments','rhpp_real','abk_cycle_salaries']
};
const canRoleDeleteTxn=table=>profile?.role!=='OWNER'&&(profile?.role==='ADMIN'||(roleDeleteTables[profile?.role]||[]).includes(table));
const adminDeleteTxnButton=(table,id,label='Hapus')=>canRoleDeleteTxn(table)?'<button type="button" class="btn-danger" data-admin-delete-table="'+esc(table)+'" data-admin-delete-id="'+esc(id)+'">'+esc(label)+'</button>':'';
const bindAdminTransactionDeletes=(rerender)=>{
  root.querySelectorAll('[data-admin-delete-table]').forEach(btn=>btn.onclick=async()=>{
    const table=btn.dataset.adminDeleteTable||'',id=btn.dataset.adminDeleteId||'';
    if(!canRoleDeleteTxn(table))return msg('Akun ini tidak berwenang menghapus transaksi tersebut.');
    const impact=transactionDeleteImpact(table);
    const ok=await appConfirm('PERINGATAN HAPUS TRANSAKSI\n\nJika transaksi ini dihapus, '+impact+'.\n\nTransaksi pada siklus CLOSED tetap terkunci. Pastikan data memang salah dan tidak lagi diperlukan.\n\nLanjutkan hapus?');
    if(!ok)return;
    if(!actionButtonStart(btn,'Menghapus...'))return;
    const {error}=await db.rpc('role_delete_transaction_v1',{p_table:table,p_id:String(id)});
    if(error){
      const detail=String(error.message||'Transaksi gagal dihapus.');
      msg(detail);
      await actionButtonFinish(btn,false,'Terhapus ✓','Gagal');
      if(btn.dataset.mobileActionIcon==='1'){
        btn.textContent='🗑️';
        btn.setAttribute('aria-label',btn.dataset.mobileActionLabel||'Hapus');
        btn.setAttribute('title',detail);
      }
      return;
    }
    await actionButtonFinish(btn,true);
    if(typeof rerender==='function')await rerender();
  });
};
const appDeviceType=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')?'HP':'DESKTOP';
async function logAppActivity(eventType,tabKey=tab,detail={}){
  try{
    if(!session?.user?.id)return;
    await db.rpc('log_user_activity',{
      p_event_type:String(eventType||'ACTIVITY'),
      p_tab_key:tabKey||null,
      p_device_type:appDeviceType(),
      p_detail:{
        ...detail,
        path:location.pathname||'/',
        user_agent:String(navigator.userAgent||'').slice(0,300)
      }
    });
  }catch(_){}
}

async function start(){
  login();
  try{
    const sessionResult=await Promise.race([
      db.auth.getSession(),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Pemulihan sesi terlalu lama')),5000))
    ]);
    session=sessionResult?.data?.session||null;
    if(!session)return;
    const r=await db.from('profiles').select('role,full_name,active').eq('user_id',session.user.id).single();
    profile=r.data;navInitialCollapsePending=true;
    if(!profile?.active){
      root.innerHTML='<main class="login"><h1>Akses belum aktif</h1><p>Administrator perlu membuat profil role untuk akun Anda.</p><button id="logout">Keluar</button></main>';
      document.getElementById('logout').onclick=logout;
      return;
    }
    await logAppActivity('SESSION_START',tab,{role:profile.role});
    await render();
  }catch(error){
    login();
    msg('Koneksi awal gagal: '+(error?.message||'tidak diketahui')+'. Silakan coba masuk kembali.');
  }
}
function login(){
  root.innerHTML='<div class="login-shell"><main class="login">'+
    '<img class="login-logo" src="./assets/bms_login_logo.jpg" alt="Logo BMS">'+
    '<h1>BMS Mobile</h1><p>Masuk dengan akun yang diberikan Administrator.</p>'+
    '<form id="auth">'+
      '<label>Email<input name="email" type="email" required autocomplete="username"></label>'+
      '<label>Kata sandi<span class="login-password"><input name="password" type="password" required autocomplete="current-password" minlength="8"><button type="button" id="togglePassword" aria-label="Lihat kata sandi" aria-pressed="false">Lihat</button></span></label>'+
      '<button type="submit" id="loginSubmit">Masuk</button>'+
    '</form><p id="message" role="status" aria-live="polite"></p>'+
    '<footer>Bagjasindo Mandiri Sindangkasih @gunzleite</footer>'+
  '</main></div>';
  const pass=root.querySelector('input[name="password"]');
  const toggle=document.getElementById('togglePassword');
  toggle.onclick=()=>{
    const visible=pass.type==='password';
    pass.type=visible?'text':'password';
    toggle.textContent=visible?'Sembunyikan':'Lihat';
    toggle.setAttribute('aria-label',visible?'Sembunyikan kata sandi':'Lihat kata sandi');
    toggle.setAttribute('aria-pressed',visible?'true':'false');
    pass.focus();
  };
  document.getElementById('auth').onsubmit=async e=>{
    e.preventDefault();
    const button=document.getElementById('loginSubmit');
    button.disabled=true;
    button.textContent='Sedang masuk…';
    msg('Memeriksa akun…',true);
    try{
      const fd=new FormData(e.target);
      const {error}=await db.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
      if(error){
        const detail=String(error.message||'').toLowerCase();
        msg(detail.includes('invalid login')?'Email atau kata sandi salah.':detail.includes('fetch')||detail.includes('network')?'Koneksi bermasalah. Coba lagi.':'Gagal masuk. Periksa akun atau hubungi Administrator.');
        return;
      }
      resetAppSessionState();
      await start();
      await logAppActivity('LOGIN',tab,{role:profile?.role||''});
    }catch(_){msg('Koneksi bermasalah. Coba lagi.')}
    finally{if(button.isConnected){button.disabled=false;button.textContent='Masuk'}}
  };
}
let legacyDataLoaded=false;

function resetAppSessionState(){
  if(window.__legacyTxnDeleteCapture){
    root.removeEventListener('click',window.__legacyTxnDeleteCapture,true);
  }
  const stateKeys=[
    '__adminRhppHistoryState','__bmsDashboardChicks','__bmsPendingSubmitFeedback','__bmsSubmittingForm','__bmsTxnList',
    '__chickInEdit','__closedCycleFilter','__companyFeedMoveEdit','__companyFeedMoveHistoryFilter',
    '__equipmentPurchaseHistoryFilter','__externalReturnTransferHistoryFilter','__financeAdvanceEdit',
    '__financeAdvancePaymentState','__financeAssetHistory','__financeBarnProfitState','__financeBopGeneralState',
    '__financeBopState','__financeCashflowState','__financeGoodsHistory','__financeMaintenanceState',
    '__financeMandiriReceiptState','__financeMandiriSupplierPaymentState','__financeReportState',
    '__financeRhppRealState','__financeRhppState','__financeSalaryState','__fxBopFilter','__fxBopSelected',
    '__fxInvoiceEdit','__fxMaintenanceEdit','__fxPaymentEdit','__fxPaymentHistory','__fxReportState','__fxTripEdit',
    '__leagueAbkHistoryFilter','__leagueAbkState','__leagueByBarnState','__legacyTxnDeleteCapture',
    '__logisticsDraftItems','__logisticsReturnDraftItems','__mandiriPurchaseHistoryFilter','__partialReturnEdit',
    '__partialReturnHistoryFilter','__pplEstimateAssignment','__pplRecordingAssignment','__pplRecordingHistoryAssignment',
    '__pplRhppAbkViewState','__pplRhppViewState','__pplVisitAssignment','__productionRecapState',
    '__productionReportState','__shippingHistoryFilter','__supplierPayableState','__warehouseSendHistoryFilter'
  ];
  stateKeys.forEach(k=>{try{delete window[k]}catch(_){window[k]=undefined}});
  try{sessionStorage.removeItem('bms_perf_template')}catch(_){}
  try{sessionStorage.removeItem('bms_selected_contract_template')}catch(_){}
  if(typeof searchableSelectObservers!=='undefined'){
    searchableSelectObservers.splice(0).forEach(o=>{try{o.disconnect()}catch(_){}})
  }
  tab='dashboard';
  assignments=[];barns=[];items=[];suppliers=[];employees=[];advances=[];pplUsers=[];contracts=[];contractReadiness=[];
  legacyDataLoaded=false;
  navInitialCollapsePending=true;
  session=null;
  profile=null;
  document.body.classList.remove('mobile-menu-open');
}

async function logout(){
  await logAppActivity('LOGOUT',tab,{role:profile?.role||''});
  await db.auth.signOut();
  resetAppSessionState();
  login();
}
async function load(){
  legacyDataLoaded=false;
  await render();
}
async function ensureLegacyData(){
  if(legacyDataLoaded)return;
  const [ar,b,i,su,e,a,p,k]=await Promise.all([
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type').order('created_at',{ascending:false}),
    db.from('barns').select('id,code,name'),
    db.from('items').select('id,code,name,supplier_id'),
    db.from('suppliers').select('id,code,name,active,supplier_type').order('code',{ascending:true}),
    db.from('employees').select('id,code,name,kind'),
    db.from('advance_balances').select('id,amount,balance'),
    db.from('profiles').select('user_id,full_name').eq('role','PPL').eq('active',true),
    db.from('contracts').select('id,number,cycle_id').is('cycle_id',null)
  ]);
  const err=[ar,b,i,su,e,a,p,k].find(x=>x.error)?.error;
  if(err)throw err;
  assignments=ar.data||[];barns=b.data||[];items=i.data||[];suppliers=su.data||[];employees=e.data||[];advances=a.data||[];pplUsers=p.data||[];contracts=k.data||[];contractReadiness=[];
  legacyDataLoaded=true;
}

const NAV_SECTIONS=[
  {label:'Master Data',items:['master_peralatan_kandang','kandang','item','supplier_sapronak','supplier_daging','marketing_pelanggan','kontrak','standar_performa','reset_klasemen','karyawan','pengguna','perusahaan','expedisi_master']},
  {label:'Logistik',items:['inventori_fisik','logistik_kontrak','logistik_pembelian_mandiri','logistik_pengiriman','logistik_kiriman_luar','logistik_retur_luar','logistik_beli_peralatan','logistik_stok_barang','logistik_kirim_stok','logistik_laporan']},
  {label:'Produksi / PPL',items:['chick_in','recording','kunjungan','estimasi','liga_abk','rekap_produksi','ppl_rhpp_view','laporan']},
  {label:'Marketing',items:['marketing_panen_kontrak','marketing_panen_mandiri','marketing_tambah_daging','marketing_laporan']},
  {label:'Keuangan',items:['rhpp','rhpp_history','finance_rhpp_real','bop','laba_rugi_kandang','perawatan_kandang','hutang_supplier','finance_pembelian_langsung','kasbon','cicilan','bop_umum','arus_kas','laporan_keuangan']},
  {label:'Owner',items:['laba_rugi_global','owner_logistics_report','owner_marketing_report','owner_finance_report','owner_production_report','owner_ppl_report']}
];
const navLabel=(key)=>title[key];
const navButton=(key)=>{
  const allowed=canViewTab(key);
  const classes=[tab===key?'active':'',allowed?'':'nav-locked'].filter(Boolean).join(' ');
  return '<button data-tab="'+key+'" class="'+classes+'"'+(allowed?'':' disabled aria-disabled="true" title="Akses dikunci untuk akun ini"')+'>'+esc(navLabel(key)||key)+'</button>';
};
function pplAppNav(){
  return navButton('dashboard')+navButton('inventori_fisik')+
    navButton('chick_in')+
    navButton('recording')+
    navButton('kunjungan')+
    navButton('estimasi')+
    navButton('liga_abk')+
    navButton('ppl_liga_kandang_view')+
    navButton('rekap_produksi')+
    navButton('ppl_rhpp_view')+
    navButton('ppl_rhpp_abk_view')+
    navButton('laporan')+
    navButton('profil');
}

function appNav(){
  if(profile?.role==='PPL')return pplAppNav();
  let html=navButton('dashboard');
  if(['ADMIN','OWNER'].includes(profile?.role)){
    const adminRhppActive=['rhpp','rhpp_history','admin_cycle_lock','admin_log_aktivitas','arsip_data'].includes(tab);
    html+='<details class="nav-group"'+(adminRhppActive?' open':'')+'><summary>Administrator</summary><div class="nav-sub">'+
      navButton('rhpp')+
      navButton('rhpp_history')+
      navButton('admin_cycle_lock')+
      navButton('admin_log_aktivitas')+
      navButton('arsip_data')+
      '</div></details>';
  }

  for(const section of NAV_SECTIONS){
    if(section.label==='Keuangan'){
      // Navigasi Keuangan diringkas hanya pada level UI.
      // Halaman, tabel, RPC, rumus, dan alur transaksi tetap memakai fungsi lama.
      const transactionItems=[
        'bop','bop_umum','form_pengajuan_kas','perawatan_kandang','kasbon','cicilan',
        'finance_beli_stok','finance_pembelian_langsung','aset_kandang'
      ].filter(canViewTab);
      const billingItems=[
        'finance_rhpp_real','hutang_supplier',
        'finance_mandiri_piutang','finance_mandiri_penerimaan',
        'finance_mandiri_hutang','finance_mandiri_pembayaran'
      ].filter(canViewTab);
      const expeditionItems=[
        'expedisi_pembayaran','bop_expedisi','perawatan_expedisi'
      ].filter(canViewTab);
      const reportItems=[
        'arus_kas','laba_rugi_kandang','finance_mandiri_laporan',
        'laporan_expedisi','laporan_keuangan'
      ].filter(canViewTab);
      const legacyFinanceItems=['rhpp','rhpp_history']
        .filter(key=>canViewTab(key)&&profile?.role!=='ADMIN');
      const allFinance=[
        ...transactionItems,...billingItems,...expeditionItems,...reportItems,...legacyFinanceItems
      ];
      if(allFinance.length){
        const subgroup=(label,items)=>{
          if(!items.length)return '';
          const opened=items.includes(tab)?' open':'';
          return '<details class="nav-subgroup"'+opened+'><summary>'+esc(label)+'</summary><div class="nav-child-item">'+items.map(navButton).join('')+'</div></details>';
        };
        html+='<details class="nav-group"'+(allFinance.includes(tab)?' open':'')+'><summary>Keuangan</summary><div class="nav-sub">'+
          subgroup('Transaksi',transactionItems)+
          subgroup('Tagihan & Pembayaran',billingItems)+
          subgroup('Expedisi',expeditionItems)+
          subgroup('Laporan',reportItems)+
          (legacyFinanceItems.length?subgroup('RHPP',legacyFinanceItems):'')+
          '</div></details>';
      }
      continue;
    }

    const items=section.items;
    const logisticsNested=['logistik_retur','logistik_retur_sebagian','logistik_retur_luar','logistik_pakan_luar','logistik_doc_luar','logistik_ovk1_luar','logistik_beli_peralatan'];
    const sectionActive=items.includes(tab)||(section.label==='Logistik'&&(logisticsNested.includes(tab)||tab==='expedisi_usaha'));
    const open=sectionActive?' open':'';
    let itemHtml=items.map(key=>{
      if(section.label==='Produksi / PPL'&&key==='liga_abk'){
        const leagueOpen=['liga_abk','ppl_liga_kandang_view'].includes(tab)?' open':'';
        return '<details class="nav-subgroup"'+leagueOpen+'><summary>Liga ABK</summary><div class="nav-child-item">'+
          navButton('liga_abk')+
          navButton('ppl_liga_kandang_view')+
          '</div></details>';
      }
      if(section.label==='Produksi / PPL'&&key==='ppl_rhpp_view'){
        const rhppOpen=['ppl_rhpp_view','ppl_rhpp_abk_view'].includes(tab)?' open':'';
        return '<details class="nav-subgroup nav-rhpp-subgroup"'+rhppOpen+'><summary>Lihat RHPP</summary><div class="nav-rhpp-items">'+
          navButton('ppl_rhpp_view')+
          navButton('ppl_rhpp_abk_view')+
          '</div></details>';
      }
      if(section.label==='Logistik'&&key==='logistik_pengiriman'){
        const shipOpen=(tab==='logistik_pengiriman'||tab==='logistik_retur'||tab==='logistik_retur_sebagian')?' open':'';
        return '<details class="nav-subgroup"'+shipOpen+'><summary>Pengiriman</summary><div class="nav-child-item">'+
          navButton('logistik_pengiriman').replace('>'+esc(navLabel('logistik_pengiriman')||'logistik_pengiriman')+'<','>Sapronak Kontrak<')+
          navButton('logistik_retur').replace('>'+esc(navLabel('logistik_retur')||'logistik_retur')+'<','>Retur<')+
          navButton('logistik_retur_sebagian')+
          '</div></details>';
      }
      if(section.label==='Logistik'&&key==='logistik_kiriman_luar'){
        const extOpen=['logistik_kiriman_luar','logistik_pakan_luar','logistik_doc_luar','logistik_ovk1_luar','logistik_retur_luar'].includes(tab)?' open':'';
        return '<details class="nav-subgroup"'+extOpen+'><summary>Sapronak Luar</summary><div class="nav-child-item">'+
          navButton('logistik_kiriman_luar').replace('>'+esc(navLabel('logistik_kiriman_luar')||'logistik_kiriman_luar')+'<','>Beli Sapronak<')+
          navButton('logistik_retur_luar').replace('>'+esc(navLabel('logistik_retur_luar')||'logistik_retur_luar')+'<','>Retur Sapronak Luar<')+
          '</div></details>';
      }
      if(section.label==='Logistik'&&key==='logistik_retur_luar')return '';
      if(section.label==='Logistik'&&key==='logistik_beli_peralatan'){
        const equipmentOpen=tab==='logistik_beli_peralatan'?' open':'';
        return '<details class="nav-subgroup"'+equipmentOpen+'><summary>Beli Peralatan</summary><div class="nav-child-item">'+
          navButton('logistik_beli_peralatan').replace('>'+esc(navLabel('logistik_beli_peralatan')||'logistik_beli_peralatan')+'<','>OVK2 / Peralatan<')+
          '</div></details>';
      }
      return navButton(key);
    }).join('');
    if(section.label==='Logistik'&&canViewTab('expedisi_usaha')){
      const expOpen=tab==='expedisi_usaha'?' open':'';
      itemHtml+='<details class="nav-subgroup"'+expOpen+'><summary>Expedisi</summary><div class="nav-child-item">'+
        navButton('expedisi_usaha').replace('>'+esc(navLabel('expedisi_usaha')||'expedisi_usaha')+'<','>Data / Operasional<')+
        '</div></details>';
    }
    html+='<details class="nav-group"'+open+'><summary>'+esc(section.label)+'</summary><div class="nav-sub">'+itemHtml+'</div></details>';

  }

  html+=navButton('profil');
  return html;
}

async function adminCycleLockPage(){
  if(!['ADMIN','OWNER'].includes(profile?.role))return layout('<section class="panel"><h3>Akses Ditolak</h3><p>Hanya Administrator dan Owner.</p></section>');
  const ownerReadOnly=profile?.role==='OWNER';

  const [br,ar,cr,far]=await Promise.all([
    db.from('barns').select('id,code,name,active').order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,performance_template_name,start_date,active,created_at,cycle_type').order('start_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('finance_bop_period_access').select('contract_assignment_id,is_open')
  ]);
  const err=[br,ar,cr,far].find(x=>x.error)?.error;
  const barns=br.data||[], assignments=ar.data||[], contracts=cr.data||[];
  const bopAccess=new Map((far.data||[]).map(x=>[x.contract_assignment_id,!!x.is_open]));
  const barnLabel=b=>b?shortBarnLabel(b):'-';
  const contractLabel=a=>{
    if((a.cycle_type||'MITRA')==='MANDIRI')return 'MANDIRI';
    const k=contracts.find(x=>x.id===a.master_contract_id);
    return shortContractLabel(k?.number)||'-';
  };

  let html='<section class="panel"><h3>Buka / Tutup Siklus</h3>'+
    '<p class="muted">'+(ownerReadOnly?'Mode Owner: lihat status siklus dan akses BOP saja. Tidak ada aksi perubahan.':'Khusus Administrator. Pilih satu kandang untuk membuka / menutup satu siklus. Pilih <strong>Semua Kandang</strong> untuk membuka / mengunci <strong>BOP semua siklus CLOSED saja</strong>. Siklus yang masih PROSES tidak disentuh.')+'</p>'+
    '<div class="form-vertical">'+
      '<label>Pilih Kandang<select id="adminCycleBarn"><option value="">Pilih Kandang</option><option value="__ALL__">Semua Kandang</option>'+barns.map(b=>'<option value="'+esc(b.id)+'">'+esc(barnLabel(b))+'</option>').join('')+'</select></label>'+
      '<label>Pilih Siklus<select id="adminCycleAssignment" disabled><option value="">Pilih Siklus</option></select></label>'+
      '<div id="adminCycleState" class="panel" style="margin:0" hidden></div>'+
      '<div class="report-actions"><button type="button" id="adminCycleAction" disabled>Pilih Siklus</button><button type="button" id="adminBopAllOpen" hidden>Buka BOP Semua Siklus CLOSED</button><button type="button" id="adminBopAllClean" hidden>Bersihkan Data Lama BOP CLOSED</button><button type="button" id="adminBopAllLock" hidden>Kunci BOP Semua Siklus CLOSED</button></div>'+
    '</div></section>';
  layout(html);
  if(err)msg(err.message);

  const barnSel=document.getElementById('adminCycleBarn');
  const cycleSel=document.getElementById('adminCycleAssignment');
  const state=document.getElementById('adminCycleState');
  const action=document.getElementById('adminCycleAction');
  const openAll=document.getElementById('adminBopAllOpen');
  const cleanAll=document.getElementById('adminBopAllClean');
  const lockAll=document.getElementById('adminBopAllLock');

  const selectedAssignment=()=>assignments.find(x=>x.id===cycleSel.value)||null;
  const closedAssignments=()=>assignments.filter(a=>!a.active);

  const renderBulkState=()=>{
    const closed=closedAssignments();
    const process=assignments.filter(a=>a.active).length;
    const opened=closed.filter(a=>bopAccess.get(a.id)).length;
    state.hidden=false;
    state.innerHTML='<strong>Semua Kandang · BOP Siklus CLOSED</strong>'+
      '<div class="muted">Aksi massal ini hanya mengubah akses pencatatan BOP. Siklus PROSES tetap aktif dan tidak disentuh.</div>'+
      '<p>CLOSED: <strong>'+closed.length+'</strong> · BOP terbuka: <strong>'+opened+'</strong> · BOP terkunci: <strong>'+(closed.length-opened)+'</strong> · PROSES tidak disentuh: <strong>'+process+'</strong></p>';
    action.hidden=true;
    openAll.hidden=ownerReadOnly;
    cleanAll.hidden=ownerReadOnly;
    lockAll.hidden=ownerReadOnly;
  };

  const renderState=()=>{
    if(barnSel.value==='__ALL__'){renderBulkState();return;}
    action.hidden=ownerReadOnly;openAll.hidden=true;cleanAll.hidden=true;lockAll.hidden=true;
    const a=selectedAssignment();
    if(!a){
      state.hidden=true;
      action.disabled=true;
      action.textContent='Pilih Siklus';
      return;
    }
    const b=barns.find(x=>x.id===a.barn_id);
    state.hidden=false;
    state.innerHTML='<strong>'+esc(barnLabel(b))+' · '+esc(assignmentCycleLabel(assignments,a))+'</strong>'+
      '<div class="muted">'+esc((a.cycle_type||'MITRA')+' · '+contractLabel(a)+' · '+(a.performance_template_name||'-')+' · Mulai '+(a.start_date||'-'))+'</div>'+
      '<p>Status: <strong>'+(a.active?'TERBUKA / AKTIF':'CLOSED / TERKUNCI')+'</strong></p>';
    action.disabled=false;
    action.textContent=a.active?'Tutup Siklus':'Buka Siklus';
  };

  barnSel.onchange=()=>{
    if(barnSel.value==='__ALL__'){
      cycleSel.disabled=true;
      cycleSel.innerHTML='<option value="">Semua Siklus CLOSED</option>';
      renderBulkState();
      return;
    }
    const rows=assignments.filter(a=>a.barn_id===barnSel.value);
    cycleSel.disabled=!barnSel.value;
    cycleSel.innerHTML='<option value="">Pilih Siklus</option>'+rows.map(a=>
      '<option value="'+esc(a.id)+'">'+esc(assignmentCycleLabel(assignments,a)+' · '+(a.start_date||'-')+' · '+(a.active?'TERBUKA':'CLOSED'))+'</option>'
    ).join('');
    renderState();
  };
  cycleSel.onchange=renderState;
  if(ownerReadOnly)return;

  const setAllBopAccess=async isOpen=>{
    const targets=closedAssignments().filter(a=>bopAccess.get(a.id)!==isOpen);
    if(!targets.length)return msg(isOpen?'Semua BOP siklus CLOSED sudah terbuka.':'Semua BOP siklus CLOSED sudah terkunci.');
    const verb=isOpen?'Buka':'Kunci';
    if(!await appConfirm(verb+' pencatatan BOP untuk '+targets.length+' siklus CLOSED di semua kandang?\n\nSiklus PROSES tidak disentuh. Status produksi semua siklus CLOSED tetap CLOSED.'))return;
    const btn=isOpen?openAll:lockAll;
    if(!actionButtonStart(btn,verb+' '+targets.length+' siklus...'))return;
    let ok=0,failed=[];
    for(const a of targets){
      const result=await db.rpc('admin_set_finance_bop_period_access',{p_assignment_id:a.id,p_is_open:isOpen});
      if(result.error)failed.push(result.error.message);
      else ok++;
    }
    await logAppActivity(isOpen?'ADMIN_BOP_ALL_OPEN':'ADMIN_BOP_ALL_LOCK','admin_cycle_lock',{count:ok,failed:failed.length});
    if(failed.length){
      await actionButtonFinish(btn,false,'','Gagal '+failed.length+' siklus');
      msg(ok+' berhasil, '+failed.length+' gagal. '+failed[0]);
      return;
    }
    await actionButtonFinish(btn,true,isOpen?'BOP Semua Terbuka ✓':'BOP Semua Terkunci ✓');
    await adminCycleLockPage();
    msg(isOpen?'BOP semua siklus CLOSED berhasil dibuka. Siklus PROSES tidak disentuh.':'BOP semua siklus CLOSED berhasil dikunci kembali. Siklus PROSES tidak disentuh.',true);
  };
  openAll.onclick=()=>setAllBopAccess(true);
  cleanAll.onclick=async()=>{
    if(!await appConfirm('Bersihkan data lama BOP pada semua siklus CLOSED yang pencatatan BOP-nya sedang terbuka?\n\nYang dibersihkan hanya catatan teknis lama, penanda MIGRATION BB-197, dan 2 baris Rp0 sisa pemindahan. Siklus PROSES tidak disentuh.'))return;
    if(!actionButtonStart(cleanAll,'Membersihkan BOP...'))return;
    const result=await db.rpc('admin_cleanup_closed_bop_legacy_v1');
    if(result.error){
      await actionButtonFinish(cleanAll,false,'','Gagal');
      return msg(result.error.message);
    }
    const x=result.data||{};
    await logAppActivity('ADMIN_BOP_CLEANUP_CLOSED','admin_cycle_lock',x);
    await actionButtonFinish(cleanAll,true,'Data BOP Bersih ✓');
    msg('BOP CLOSED selesai dibersihkan. Catatan: '+Number(x.notes_cleaned||0)+' · MIGRATION: '+Number(x.migration_cleared||0)+' · Rp0 dihapus: '+Number(x.zero_rows_deleted||0)+'.',true);
  };
  lockAll.onclick=()=>setAllBopAccess(false);

  action.onclick=async()=>{
    const a=selectedAssignment();
    if(!a)return;
    const b=barns.find(x=>x.id===a.barn_id);
    const label=barnLabel(b)+' · '+assignmentCycleLabel(assignments,a);
    if(a.active){
      if(!await appConfirm('Tutup '+label+'?\n\nSistem akan validasi data dan membuat ulang snapshot final. Setelah berhasil, transaksi siklus ini kembali terkunci.'))return;
      const {error}=await db.rpc('admin_reclose_cycle_v1',{p_contract_assignment_id:a.id});
      if(error)return msg(error.message);
      await logAppActivity('ADMIN_CYCLE_CLOSE','admin_cycle_lock',{assignment_id:a.id,barn_id:a.barn_id});
      await adminCycleLockPage();
      msg('Siklus berhasil ditutup dan dikunci kembali.',true);
    }else{
      if(!await appConfirm('Buka '+label+' untuk koreksi?\n\nSemua transaksi yang terikat ke siklus ini akan dapat diedit kembali sesuai hak menu. Siklus lain tetap terkunci.'))return;
      const {error}=await db.rpc('admin_reopen_cycle_v1',{p_contract_assignment_id:a.id});
      if(error)return msg(error.message);
      await logAppActivity('ADMIN_CYCLE_OPEN','admin_cycle_lock',{assignment_id:a.id,barn_id:a.barn_id});
      await adminCycleLockPage();
      msg('Siklus berhasil dibuka untuk koreksi.',true);
    }
  };
}

function ownerReportPendingPage(){
  if(tab==='owner_logistics_report')return logisticsReports();
  if(tab==='owner_marketing_report')return marketingReports();
  if(tab==='owner_finance_report')return financeReportPage();
  if(tab==='owner_production_report')return reports();
  if(tab==='owner_ppl_report')return productionRecapPage();
  return;
}


const NAV_SVG={
  dashboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>',
  grid:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  truck:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  production:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V8l4-3 4 3 3-2 3 2v11"/><path d="M8 19v-5h3v5"/><path d="M14 12h2M14 15h2"/></svg>',
  chart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></svg>',
  file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 11h5v4h-5a2 2 0 1 1 0-4Z"/></svg>',
  user:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6"/></svg>',
  box:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>',
  clipboard:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
  users:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6"/><path d="M14 15c3.4-.2 5.5 1.5 6 5"/></svg>',
  building:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V5l7-3 7 3v16"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>',
  report:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V4h14v16z"/><path d="M8 15v2M12 11v6M16 7v10"/></svg>'
};
function navIconForTab(k){
  const map={
    dashboard:'dashboard',
    kandang:'building',item:'box',supplier_sapronak:'users',supplier_daging:'users',kontrak:'file',standar_performa:'chart',reset_klasemen:'chart',karyawan:'users',pengguna:'users',perusahaan:'building',
    logistik_kontrak:'file',logistik_pengiriman:'truck',logistik_kiriman_luar:'box',logistik_retur_luar:'box',logistik_retur:'truck',logistik_retur_sebagian:'truck',logistik_laporan:'report',
    chick_in:'production',recording:'clipboard',kunjungan:'clipboard',estimasi:'chart',liga_abk:'chart',rekap_produksi:'report',ppl_rhpp_view:'file',ppl_rhpp_abk_view:'file',rhpp_history:'file',
    marketing_panen_kontrak:'chart',marketing_panen_mandiri:'chart',marketing_tambah_daging:'box',marketing_laporan:'report',
    rhpp:'file',form_pengajuan_kas:'clipboard',admin_log_aktivitas:'clipboard',arsip_data:'file',finance_rhpp_real:'file',bop:'wallet',bop_umum:'wallet',expedisi_usaha:'truck',bop_expedisi:'wallet',perawatan_expedisi:'wallet',laporan_expedisi:'report',kasbon:'wallet',cicilan:'wallet',arus_kas:'chart',laporan_keuangan:'report',
    laporan:'report',profil:'user',harga_hidup:'chart',bonus_kontrak:'chart'
  };
  return NAV_SVG[map[k]||'grid'];
}
function navIconForGroup(label){
  const x=String(label||'').trim().toLowerCase();
  if(x.includes('master')||x.includes('referensi'))return NAV_SVG.grid;
  if(x.includes('logistik')||x.includes('sapronak'))return NAV_SVG.truck;
  if(x.includes('produksi'))return NAV_SVG.production;
  if(x.includes('marketing'))return NAV_SVG.chart;
  if(x.includes('keuangan')||x.includes('biaya')||x.includes('kasbon'))return NAV_SVG.wallet;
  return NAV_SVG.grid;
}
function decorateNavigation(rootEl){
  rootEl.querySelectorAll('#appSidebar nav button[data-tab]').forEach(btn=>{
    if(btn.querySelector('.nav-icon'))return;
    const icon=document.createElement('span');icon.className='nav-icon';icon.innerHTML=navIconForTab(btn.dataset.tab);
    const label=document.createElement('span');label.className='nav-label';label.textContent=btn.textContent.trim();
    btn.textContent='';btn.append(icon,label);
  });
  rootEl.querySelectorAll('#appSidebar summary').forEach(summary=>{
    if(summary.querySelector('.nav-icon'))return;
    const labelText=summary.textContent.trim();
    const icon=document.createElement('span');icon.className='nav-icon';icon.innerHTML=navIconForGroup(labelText);
    const label=document.createElement('span');label.className='nav-label';label.textContent=labelText;
    summary.textContent='';summary.append(icon,label);
  });
}
const searchableSelectObservers=[];
function enhanceSearchableSelects(){
  root.querySelectorAll('main select:not([multiple])').forEach(select=>{
    if(select.dataset.searchEnhanced)return;
    select.dataset.searchEnhanced='1';
    select.classList.add('app-select-native');
    const control=document.createElement('span');
    control.className='app-select-control';
    const input=document.createElement('input');
    input.type='search';
    input.className='app-select-input';
    input.autocomplete='off';
    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','false');
    const list=document.createElement('span');
    list.className='app-select-results';
    list.setAttribute('role','listbox');
    control.append(input,list);
    select.insertAdjacentElement('afterend',control);
    const label=()=>select.selectedOptions[0]?.textContent?.trim()||'';
    const sync=()=>{
      input.value=label();
      input.disabled=select.disabled;
      input.placeholder='Cari pilihan';
      input.setAttribute('aria-label',(select.closest('label')?.firstChild?.textContent?.trim()||'Pilih data')+' - cari pilihan');
    };
    const close=()=>{list.classList.remove('open');input.setAttribute('aria-expanded','false')};
    const draw=(query='')=>{
      const term=query.toLocaleLowerCase('id').trim();
      const all=Array.from(select.options).filter(o=>!o.disabled&&o.textContent.toLocaleLowerCase('id').includes(term));
      const matches=all.slice(0,60);
      list.innerHTML=matches.length?matches.map(o=>{
        const index=Array.prototype.indexOf.call(select.options,o);
        return '<button type="button" role="option" aria-selected="'+(o.selected?'true':'false')+'" data-option-index="'+index+'">'+esc(o.textContent.trim())+'</button>';
      }).join(''):'<span class="app-select-empty">Pilihan tidak ditemukan.</span>';
      if(all.length>60)list.innerHTML+='<span class="app-select-empty">Ketik lebih spesifik untuk melihat hasil lain.</span>';
      list.classList.add('open');
      input.setAttribute('aria-expanded','true');
    };
    input.addEventListener('focus',()=>{if(!select.disabled){input.select();draw()}});
    input.addEventListener('input',()=>{
      select.value='';
      input.removeAttribute('aria-invalid');
      draw(input.value);
    });
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();input.value=label();input.blur()}
      if(e.key==='ArrowDown'&&list.classList.contains('open')){e.preventDefault();list.querySelector('button')?.focus()}
    });
    list.addEventListener('click',e=>{
      const choice=e.target.closest('[data-option-index]');
      if(!choice)return;
      const option=select.options[Number(choice.dataset.optionIndex)];
      if(!option)return;
      select.value=option.value;
      sync();
      close();
      select.dispatchEvent(new Event('input',{bubbles:true}));
      select.dispatchEvent(new Event('change',{bubbles:true}));
    });
    list.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();input.focus()}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        const buttons=Array.from(list.querySelectorAll('button'));
        const index=buttons.indexOf(document.activeElement);
        buttons[Math.max(0,Math.min(buttons.length-1,index+(e.key==='ArrowDown'?1:-1)))]?.focus();
      }
    });
    select.addEventListener('change',sync);
    select.addEventListener('invalid',e=>{e.preventDefault();input.setAttribute('aria-invalid','true');input.focus()});
    const observer=new MutationObserver(sync);
    observer.observe(select,{childList:true,attributes:true});
    searchableSelectObservers.push(observer);
    sync();
  });
}
let searchableSelectEnhanceQueued=false;
new MutationObserver(()=>{
  if(searchableSelectEnhanceQueued)return;
  searchableSelectEnhanceQueued=true;
  requestAnimationFrame(()=>{searchableSelectEnhanceQueued=false;enhanceSearchableSelects()});
}).observe(root,{childList:true,subtree:true});
document.addEventListener('click',e=>{
  if(e.target.closest('.app-select-control'))return;
  document.querySelectorAll('.app-select-results.open').forEach(list=>{
    list.classList.remove('open');
    list.previousElementSibling?.setAttribute('aria-expanded','false');
    const select=list.parentElement?.previousElementSibling;
    if(select?.tagName==='SELECT')list.previousElementSibling.value=select.selectedOptions[0]?.textContent?.trim()||'';
  });
});

function appConfirm(message){
  return new Promise(resolve=>{
    const shade=document.createElement('div');
    shade.className='app-confirm-shade';
    shade.innerHTML='<div class="app-confirm" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle">'+
      '<h3 id="appConfirmTitle">Konfirmasi</h3><p></p>'+
      '<div class="app-confirm-actions"><button type="button" data-cancel>Batal</button><button type="button" data-accept>Ya, lanjutkan</button></div></div>';
    shade.querySelector('p').textContent=message;
    document.body.appendChild(shade);
    const prior=document.activeElement;
    const submittingForm=window.__bmsSubmittingForm;
    const finish=ok=>{document.removeEventListener('keydown',onKey);shade.remove();if(!ok)releaseSubmitGuard(submittingForm);prior?.focus?.();resolve(ok)};
    const onKey=e=>{if(e.key==='Escape')finish(false)};
    document.addEventListener('keydown',onKey);
    shade.querySelector('[data-cancel]').onclick=()=>finish(false);
    shade.querySelector('[data-accept]').onclick=()=>finish(true);
    shade.onclick=e=>{if(e.target===shade)finish(false)};
    shade.querySelector('[data-cancel]').focus();
  });
}
function decorateMobileActionIcons(scope=root){
  const mobile=window.matchMedia('(max-width:700px)').matches;
  scope.querySelectorAll('button').forEach(btn=>{
    if(!mobile){if(btn.dataset.mobileActionIcon==='1'){btn.textContent=btn.dataset.mobileActionLabel||btn.textContent;delete btn.dataset.mobileActionIcon;}return;}
    if(btn.closest('nav,.mobile-topbar,.mobile-drawer-head,.app-confirm-actions,.app-select-results,.search-suggestions'))return;
    const label=String(btn.textContent||'').trim();
    if(!label||btn.dataset.mobileActionIcon==='1')return;
    const low=label.toLowerCase();
    let icon='';
    if(/hapus|delete|remove/.test(low))icon='🗑️';
    else if(/edit|koreksi|ubah/.test(low))icon='✏️';
    else if(/cetak|print/.test(low))icon='🖨️';
    else if(/excel/.test(low))icon='📊';
    else if(/pdf|dokumen/.test(low))icon='📄';
    else if(/lihat|detail|view/.test(low))icon='👁️';
    else if(/lengkapi/.test(low))icon='📝';
    else return;
    btn.dataset.mobileActionLabel=label;
    btn.dataset.mobileActionIcon='1';
    btn.textContent=icon;
    btn.setAttribute('aria-label',label);
    btn.setAttribute('title',label);
    btn.classList.add('mobile-icon-action');
  });
}
window.addEventListener('resize',()=>requestAnimationFrame(()=>decorateMobileActionIcons(root)));

function updateTableScrollHints(){
  root.querySelectorAll('.tablewrap').forEach(el=>{
    const overflow=el.scrollWidth>el.clientWidth+2;
    el.classList.toggle('has-overflow',overflow);
    if(overflow)el.setAttribute('aria-label','Tabel dapat digeser ke samping');
    else el.removeAttribute('aria-label');
  });
}
window.addEventListener('resize',()=>requestAnimationFrame(updateTableScrollHints));

function enforceOwnerReadOnly(){
  if(profile?.role!=='OWNER')return;
  const mutationText=/\b(simpan|tambah|buat|edit|ubah|koreksi|hapus|delete|remove|kirim|bayar|terima|proses|posting|verifikasi|approve|setujui|tolak|void|batalkan transaksi|aktifkan|nonaktifkan|buka siklus|tutup siklus|buka bop|kunci bop|bersihkan data|reset klasemen)\b/i;
  const mutationData=/^(data-(?:edit|delete|remove|toggle|save|submit|approve|reject|void|post|send|pay|receive|close|open|reset)|formaction)$/i;
  const isMutationButton=btn=>{
    const label=String(btn.textContent||btn.getAttribute('aria-label')||btn.title||'').trim();
    if(mutationText.test(label))return true;
    return [...btn.attributes].some(a=>mutationData.test(a.name));
  };
  root.querySelectorAll('form').forEach(form=>{
    const mutating=[...form.querySelectorAll('button,input[type="submit"],input[type="button"]')].some(el=>isMutationButton(el));
    if(!mutating)return;
    form.querySelectorAll('input,select,textarea').forEach(el=>{
      if(['hidden','search'].includes(String(el.type||'').toLowerCase()))return;
      el.disabled=true;
    });
    form.querySelectorAll('button,input[type="submit"],input[type="button"]').forEach(btn=>{
      if(!isMutationButton(btn))return;
      btn.disabled=true;btn.hidden=true;
    });
  });
  root.querySelectorAll('button').forEach(btn=>{
    if(btn.hasAttribute('data-tab')||btn.closest('nav,.mobile-topbar,.mobile-drawer-head'))return;
    if(isMutationButton(btn)){btn.disabled=true;btn.hidden=true;}
  });
  root.querySelectorAll('[contenteditable="true"]').forEach(el=>el.setAttribute('contenteditable','false'));
}

// Large transaction/history tables: compact global filter, at most ten rows per page.
// Existing custom filters, report tables, and invoice/trip pagination stay untouched.
function enhanceGlobalHistoryTables(){
  const panels=[...root.querySelectorAll('main section.panel')];
  for(const panel of panels){
    const heading=String(panel.querySelector('h3,h4')?.textContent||'').trim();
    if(!/^(riwayat|data |daftar |rincian |stok |antrean )/i.test(heading))continue;
    if(/laporan|rekap|laba|arus kas|rhpp|ringkasan/i.test(heading))continue;
    if(panel.querySelector('form, .report-actions, [id$="Filter"], [id$="Filters"]'))continue;
    const tables=[...panel.querySelectorAll('table')];
    if(tables.length!==1)continue;
    const table=tables[0],rows=[...table.querySelectorAll('tbody > tr')];
    if(rows.length<=10||table.dataset.globalFilterReady==='1')continue;
    if(/^(expTripListTable|fxInvoiceListTable|expDriverTable|expVehicleTable|expRouteTable|expDestinationTable|expCustomerTable|warehouseStockTable|contractTemplateTable|performanceMasterTable|marketingCustomerTable|supplierTypedTable|employeeMasterTable|usersMasterTable)$/.test(table.id||''))continue;
    table.dataset.globalFilterReady='1';
    const box=document.createElement('div');
    box.className='bms-table-quick-filter';
    box.style.cssText='display:flex;flex-wrap:wrap;align-items:end;gap:8px;margin:10px 0';
    const searchWrap=document.createElement('label');
    searchWrap.textContent='Cari data';
    searchWrap.style.cssText='flex:1 1 180px;min-width:145px;font-size:12px';
    const search=document.createElement('input');
    search.type='search';search.placeholder='Cari nomor, nama, atau referensi';
    search.style.cssText='display:block;width:100%;margin-top:4px';
    searchWrap.appendChild(search);
    const statusWrap=document.createElement('label');
    statusWrap.textContent='Status';statusWrap.style.cssText='flex:0 1 170px;font-size:12px';
    const status=document.createElement('select');status.style.cssText='display:block;width:100%;margin-top:4px';
    const statuses=[...new Set(rows.map(tr=>[...tr.cells].slice(1).map(td=>td.textContent.trim()).find(v=>/^(aktif|nonaktif|closed|proses|pending|selesai|paid|issued|void|belum invoice|sudah invoice|lunas|belum lunas)$/i.test(v))).filter(Boolean))];
    status.add(new Option('Semua status',''));
    statuses.forEach(v=>status.add(new Option(v,v)));
    statusWrap.appendChild(status);
    const reset=document.createElement('button');reset.type='button';reset.textContent='Reset Filter';
    box.append(searchWrap);
    if(statuses.length)box.append(statusWrap);
    box.append(reset);
    const controls=document.createElement('div');
    controls.className='report-actions';
    controls.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
    const info=document.createElement('span');info.style.fontSize='12px';
    const previous=document.createElement('button');previous.type='button';previous.textContent='Sebelumnya';
    const pageLabel=document.createElement('span');pageLabel.style.fontSize='12px';
    const next=document.createElement('button');next.type='button';next.textContent='Berikutnya';
    controls.append(info,previous,pageLabel,next);
    table.closest('.tablewrap')?.before(box);
    table.closest('.tablewrap')?.after(controls);
    let page=0;
    const renderPage=()=>{
      const text=search.value.trim().toLowerCase(),selected=status.value.toLowerCase();
      const matched=rows.filter(tr=>{
        const full=tr.textContent.toLowerCase();
        return (!text||full.includes(text))&&(!selected||[...tr.cells].some(td=>td.textContent.trim().toLowerCase()===selected));
      });
      const pages=Math.max(1,Math.ceil(matched.length/10));
      page=Math.min(page,pages-1);
      const active=new Set(matched.slice(page*10,(page+1)*10));
      rows.forEach(tr=>{const show=active.has(tr);tr.hidden=!show;tr.style.display=show?'':'none';});
      info.textContent=matched.length+' dari '+rows.length+' data';
      pageLabel.textContent='Halaman '+(page+1)+' / '+pages;
      previous.disabled=page===0;next.disabled=page>=pages-1;
    };
    search.addEventListener('input',()=>{page=0;renderPage();});
    status.addEventListener('change',()=>{page=0;renderPage();});
    reset.addEventListener('click',()=>{search.value='';status.value='';page=0;renderPage();});
    previous.addEventListener('click',()=>{page=Math.max(0,page-1);renderPage();});
    next.addEventListener('click',()=>{page++;renderPage();});
    renderPage();
  }
}

function layout(content){
  searchableSelectObservers.splice(0).forEach(observer=>observer.disconnect());
  const navHtml=appNav();
  root.innerHTML=
    '<div class="mobile-topbar">'+
      '<button type="button" id="mobileMenuToggle" class="mobile-menu-toggle" aria-label="Buka menu" aria-expanded="false">☰</button>'+
      '<strong>'+(profile?.role==='PPL'?'BMS Mobile · PPL':'BMS Mobile')+'</strong>'+
      '<span>'+esc(profile.role)+'</span>'+
    '</div>'+
    '<div id="mobileNavBackdrop" class="mobile-nav-backdrop"></div>'+
    '<div class="shell">'+
      '<aside id="appSidebar">'+
        '<div class="mobile-drawer-head"><strong>BMS Mobile</strong><button type="button" id="mobileMenuClose" aria-label="Tutup menu">×</button></div>'+
        '<h1>'+(profile?.role==='PPL'?'BMS Mobile · PPL':'BMS Mobile')+'</h1><nav>'+navHtml+'</nav><footer>Bagjasindo Mandiri Sindangkasih @gunzleite</footer>'+
      '</aside>'+
      '<main><header><div><h2>'+title[tab]+'</h2><small>'+esc(profile.full_name)+' · '+esc(profile.role)+'</small></div></header><p id="message"></p>'+content+'</main>'+
    '</div>';
  const legacyTxnDeleteMap={
    'delete-shipment':'logistics_shipments',
    'delete-external':'logistics_external_shipments',
    'delete-mandiri-purchase':'logistics_mandiri_purchases',
    'delete-harvest':'marketing_contract_harvests',
    'delete-bl':'marketing_external_meat_purchases',
    'delete-ext-return':'logistics_external_returns',
    'delete-return':'logistics_returns'
  };
  const legacyTxnSelectors=Object.keys(legacyTxnDeleteMap).map(k=>'[data-'+k+']');
  Object.entries(legacyTxnDeleteMap).forEach(([attr,table])=>{
    if(!canRoleDeleteTxn(table))root.querySelectorAll('[data-'+attr+']').forEach(el=>el.remove());
  });
  if(profile?.role!=='ADMIN')root.querySelectorAll('[data-delete-abk-harvest]').forEach(el=>el.remove());
  {
    if(window.__legacyTxnDeleteCapture)root.removeEventListener('click',window.__legacyTxnDeleteCapture,true);
    window.__legacyTxnDeleteCapture=async ev=>{
      const btn=ev.target?.closest?.(legacyTxnSelectors.join(','));
      if(!btn)return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      const attr=Object.keys(legacyTxnDeleteMap).find(k=>btn.hasAttribute('data-'+k));
      if(btn.hasAttribute('data-delete-abk-harvest')){
        if(profile?.role!=='ADMIN')return;
        const ok=await appConfirm('PERINGATAN HAPUS TRANSAKSI\n\nPanen ABK ini memengaruhi klasemen/kinerja ABK dan rekap produksi. Pastikan transaksi memang salah.\n\nLanjutkan hapus?');
        if(!ok)return;
        if(!actionButtonStart(btn,'Menghapus...'))return;
        const {error}=await db.rpc('delete_production_abk_harvest_atomic',{p_size_id:btn.getAttribute('data-delete-abk-harvest')});
        if(error){await actionButtonFinish(btn,false);return;}
        await actionButtonFinish(btn,true);
        await render();return;
      }
      if(!attr)return;
      const table=legacyTxnDeleteMap[attr],id=btn.getAttribute('data-'+attr);
      const ok=await appConfirm('PERINGATAN HAPUS TRANSAKSI\n\nJika transaksi ini dihapus, '+transactionDeleteImpact(table)+'.\n\nPastikan data memang salah dan tidak lagi diperlukan.\n\nLanjutkan hapus?');
      if(!ok)return;
      if(!actionButtonStart(btn,'Menghapus...'))return;
      if(!canRoleDeleteTxn(table))return msg('Akun ini tidak berwenang menghapus transaksi tersebut.');
      const {error}=await db.rpc('role_delete_transaction_v1',{p_table:table,p_id:String(id||'')});
      if(error){msg(String(error.message||'Transaksi gagal dihapus.'));await actionButtonFinish(btn,false,'Terhapus ✓','Gagal');return;}
      await actionButtonFinish(btn,true);
      await render();
    };
    root.addEventListener('click',window.__legacyTxnDeleteCapture,true);
  }
  decorateNavigation(root);
  enforceOwnerReadOnly();
  applyPendingSubmitFeedback();
  if(profile?.role!=='ADMIN'){
    root.querySelectorAll([
      '[data-delete-exp-trip]',
      '[data-delete-exp-invoice]',
      '[data-delete-abk-harvest]',
      '[data-remove-abk]',
      '#fxTripCorrectionDelete',
      '#fxInvoiceCorrectionDelete'
    ].join(',')).forEach(el=>el.remove());
  }
  enhanceSearchableSelects();
  decorateMobileActionIcons(root);
  requestAnimationFrame(updateTableScrollHints);
  requestAnimationFrame(enhanceGlobalHistoryTables);
  if(navInitialCollapsePending){root.querySelectorAll('details.nav-group').forEach(d=>d.open=false);navInitialCollapsePending=false;}
  const sidebar=document.getElementById('appSidebar');
  const backdrop=document.getElementById('mobileNavBackdrop');
  const toggle=document.getElementById('mobileMenuToggle');
  const closeBtn=document.getElementById('mobileMenuClose');
  const setMenu=open=>{
    if(!sidebar||!backdrop)return;
    sidebar.classList.toggle('mobile-open',!!open);
    backdrop.classList.toggle('show',!!open);
    document.body.classList.toggle('mobile-menu-open',!!open);
    if(toggle)toggle.setAttribute('aria-expanded',open?'true':'false');
  };
  if(toggle)toggle.onclick=()=>setMenu(true);
  if(closeBtn)closeBtn.onclick=()=>setMenu(false);
  if(backdrop)backdrop.onclick=()=>setMenu(false);
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{setMenu(false);tab=b.dataset.tab;logAppActivity('MENU_OPEN',tab,{label:title[tab]||tab});render()});
  const mq=window.matchMedia('(min-width:901px)');
  const syncMenu=()=>{if(mq.matches)setMenu(false);};
  if(mq.addEventListener)mq.addEventListener('change',syncMenu);else if(mq.addListener)mq.addListener(syncMenu);
}

async function printFinanceDocument(sectionIds,heading){
  const ids=Array.isArray(sectionIds)?sectionIds:[sectionIds];
  const sections=ids.map(id=>document.getElementById(id)).filter(Boolean);
  if(!sections.length)return msg('Bagian yang akan dicetak belum tersedia.');
  const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  const w=mobile?null:window.open('','_blank');
  if(!mobile&&!w)return msg('Popup cetak diblokir browser.');
  const {data:company,error}=await db.from('company_profile').select('*').eq('id',true).maybeSingle();
  if(error){if(w)w.close();return msg(error.message);}
  const cp=company||{};
  const reportLogo=/Expedisi/i.test(heading||'')?new URL('./assets/bms_express_logo.jpg',location.href).href:(cp.logo_url||BMS_PRINT_LOGO);
  const body=sections.map(el=>{
    const clone=el.cloneNode(true);
    clone.querySelectorAll('button,form,.report-actions').forEach(x=>x.remove());
    return clone.innerHTML;
  }).join('<div class="print-gap"></div>');
  const generated=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'long',timeStyle:'short'}).format(new Date());
  const isCashflowDetail=/Rincian Arus Kas/i.test(String(heading||''));
  const cashflowPrintCss=isCashflowDetail
    ?'body{font-size:9px!important;max-width:281mm!important}h2{font-size:15px!important}h3{font-size:11px!important}h4{font-size:10px!important}table{table-layout:fixed!important}th,td{font-size:8.5px!important;padding:4px 4px!important;line-height:1.3!important;vertical-align:top!important}th:nth-child(1),td:nth-child(1){width:10%}th:nth-child(2),td:nth-child(2){width:7%}th:nth-child(3),td:nth-child(3){width:13%}th:nth-child(4),td:nth-child(4){width:17%}th:nth-child(5),td:nth-child(5){width:28%;white-space:normal!important;overflow-wrap:anywhere!important}th:nth-child(6),td:nth-child(6){width:11%;white-space:normal!important;overflow-wrap:anywhere!important}th:nth-child(7),td:nth-child(7),th:nth-child(8),td:nth-child(8){width:7%;text-align:right;white-space:nowrap!important}.rhpp-summary-card span{font-size:8.5px!important}.rhpp-summary-card strong{font-size:11px!important}.muted{font-size:8.5px!important}'
    :'';
  const printHtml='<html><head><meta charset="utf-8"><title>'+esc(heading||'Laporan')+'</title><style>'+
    '@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:8px;line-height:1.2;margin:0 auto;max-width:281mm}'+
    '.print-head{border-bottom:1px solid #222;padding-bottom:4px;margin-bottom:6px;min-height:38px}.print-head h2{margin:0 0 2px;font-size:14px}.print-head div{margin:1px 0;font-size:8px}.print-head img{max-height:34px!important}'+
    'h2{font-size:13px;margin:5px 0}h3{font-size:10px;margin:7px 0 4px}h4{font-size:9px;margin:6px 0 3px}p{margin:3px 0}'+
    'table{width:100%;border-collapse:collapse;margin:4px 0;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #bbb;padding:2.5px 3px;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere}th{background:#f3f3f3;font-size:7px}td{font-size:7px}'+
    '.rhpp-summary-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;margin:3px 0}.rhpp-summary-card{border:0!important;border-bottom:1px solid #ccc!important;padding:3px 2px!important;min-width:0}.rhpp-summary-card span{display:block;font-size:7.5px}.rhpp-summary-card strong{display:block;margin-top:1px;font-size:9px}.rhpp-summary-card small{font-size:7px}'+
    '.muted{color:#444;font-size:7.5px}.print-gap{height:4px}.tablewrap{overflow:visible!important;width:100%}.panel{border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;background:#fff!important}'+
    '.total{margin:4px 0!important}.report-actions,.inline-actions,button,form{display:none!important}'+
    '@media print{html,body{width:100%;height:auto}.page-break{break-before:page}.avoid-break{break-inside:avoid;page-break-inside:avoid}}'+
    cashflowPrintCss+
    '</style></head><body>'+
    '<div class="print-head">'+'<img src="'+esc(reportLogo)+'" style="max-height:42px;float:right;object-fit:contain">'+
    '<h2>'+esc(cp.company_name||cp.legal_name||'Nama perusahaan belum diisi')+'</h2>'+
    (cp.address?'<div>'+esc(cp.address)+'</div>':'')+
    (cp.phone?'<div>Tel/WA: '+esc(cp.phone)+'</div>':'')+
    (cp.email?'<div>Email: '+esc(cp.email)+'</div>':'')+
    '</div><h2>'+esc(heading||'Laporan')+'</h2><div style="margin-bottom:10px">Dicetak: '+esc(generated)+'</div>'+body+
    '</body></html>';
  if(mobile){
    try{await BMSCore.savePdfHtml(printHtml,String(heading||'Laporan').replace(/[^A-Za-z0-9_-]+/g,'_')+'.pdf')}catch(error){msg(error?.message||'PDF gagal dibuat.')}
    return;
  }
  w.document.write(printHtml);w.document.close();
  const logo=w.document.querySelector('.print-head img');
  let printed=false;
  const print=()=>{if(!printed&&!w.closed){printed=true;w.focus();w.print();}};
  if(logo&&!logo.complete){logo.onload=print;logo.onerror=print;setTimeout(print,1500);}
  else setTimeout(print,100);
}


const BMS_EXCEL_EXPORT_STYLE='<style>'+
'body{font-family:Arial,sans-serif;font-size:11pt;color:#111;background:#fff}'+
'h1,h2,h3{margin:4px 0 8px 0;font-weight:700}'+
'table{border-collapse:collapse!important;width:auto!important;table-layout:auto!important;margin:8px 0 14px 0}'+
'th,td{border:1px solid #b7c3cc!important;padding:5px 8px!important;vertical-align:middle!important;white-space:nowrap}'+
'th{font-weight:700!important;text-align:center!important;background:#e8f1f5!important}'+
'td.num,.num{text-align:right!important;mso-number-format:#,##0.00}'+
'td:first-child,th:first-child{min-width:42px}'+
'td:nth-child(2),th:nth-child(2){min-width:90px}'+
'td:nth-child(3),th:nth-child(3){min-width:110px}'+
'td:nth-child(n+4),th:nth-child(n+4){min-width:95px}'+
'td:last-child,th:last-child{max-width:320px}'+
'.muted,small{font-size:10pt}'+
'.tablewrap{overflow:visible!important}'+
'.report-actions,.inline-actions,button,form{display:none!important}'+
'</style>';
function bmsExcelHtml(html){
  const src=String(html||'');
  return src.includes('</head>')?src.replace('</head>',BMS_EXCEL_EXPORT_STYLE+'</head>'):BMS_EXCEL_EXPORT_STYLE+src;
}

async function exportFinanceDocumentExcel(sectionIds,heading){
  const ids=Array.isArray(sectionIds)?sectionIds:[sectionIds];
  const sections=ids.map(id=>document.getElementById(id)).filter(Boolean);
  if(!sections.length)return msg('Bagian yang akan diexport belum tersedia.');
  const {data:company,error}=await db.from('company_profile').select('*').eq('id',true).maybeSingle();
  if(error)return msg(error.message);
  const cp=company||{};
  const body=sections.map(el=>{
    const clone=el.cloneNode(true);
    clone.querySelectorAll('button,form,.report-actions,.inline-actions').forEach(x=>x.remove());
    return clone.innerHTML;
  }).join('<br>');
  const title=String(heading||'Laporan').trim();
  const html=bmsExcelHtml('<!doctype html><html><head><meta charset="utf-8"></head><body>'+
    '<h2>'+esc(cp.company_name||cp.legal_name||'Nama perusahaan belum diisi')+'</h2>'+
    '<h3>'+esc(title)+'</h3>'+body+'</body></html>');
  const blob=BMSCore.excelBlob(['\ufeff'+html]);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=(title.replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'')||'Laporan')+'.xlsx';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
