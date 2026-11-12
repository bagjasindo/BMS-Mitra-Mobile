function logisticsExpeditionReportModel(data,filter={}){
  const details=new Map(),invoices=new Map((data.invoices||[]).map(x=>[x.id,x])),links=new Map();
  for(const d of data.destinations||[]){if(!details.has(d.trip_id))details.set(d.trip_id,[]);details.get(d.trip_id).push(d)}
  for(const l of data.links||[]){if(!links.has(l.trip_id))links.set(l.trip_id,new Set());links.get(l.trip_id).add(l.invoice_id)}
  const quantities=new Map(),byCrew=new Map();
  const numeric=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const rows=(data.trips||[]).map(t=>{
    const ds=(details.get(t.id)||[]).slice().sort((a,b)=>Number(a.line_no||0)-Number(b.line_no||0));
    const ids=[...(links.get(t.id)||[])],billed=ids.map(id=>invoices.get(id)).filter(Boolean);
    const status=t.reference==='KAS_JALAN_PENDING_SJ'?'MENUNGGU SJ':ids.length?'SUDAH INVOICE':'BELUM INVOICE';
    const quantityLines=ds.length?ds.map(d=>({quantity:numeric(d.qty),unit:String(d.unit||'').trim().toLowerCase()})):[{quantity:numeric(t.total_qty),unit:''}];
    return {...t,status,quantityLines,destination:ds.length?ds.map(d=>d.destination_name||'-').join(' • '):(t.destination||'-'),cargo:ds.length?ds.map(d=>d.cargo||'-').join(' • '):(t.cargo||'-'),invoice:billed.map(i=>(i.invoice_number||'-')+(i.status?' ('+i.status+')':'')).join(' • ')||(ids.length?'Nomor belum tersedia':'-')};
  }).filter(t=>(!filter.from||String(t.trip_date||'')>=filter.from)&&(!filter.to||String(t.trip_date||'')<=filter.to)&&(!filter.driver||t.driver===filter.driver)&&(!filter.vehicle||t.vehicle===filter.vehicle)&&(!filter.status||t.status===filter.status)&&(!filter.search||[t.mts_sj,t.rr,t.zone,t.destination,t.cargo,t.invoice,t.driver,t.vehicle].join(' ').toLowerCase().includes(filter.search.toLowerCase())));
  let unknownQuantity=0;
  for(const t of rows){for(const q of t.quantityLines){if(q.quantity===null||!q.unit){unknownQuantity++;continue;}quantities.set(q.unit,(quantities.get(q.unit)||0)+q.quantity)}
    const key=JSON.stringify([t.driver||'-',t.vehicle||'-']);if(!byCrew.has(key))byCrew.set(key,{driver:t.driver||'-',vehicle:t.vehicle||'-',trips:0,pending:0});const crew=byCrew.get(key);crew.trips++;if(t.status==='MENUNGGU SJ')crew.pending++;
  }
  return {rows,quantities:[...quantities].map(([unit,quantity])=>({unit,quantity})),unknownQuantity,crew:[...byCrew.values()],pending:rows.filter(r=>r.status==='MENUNGGU SJ').length,billed:rows.filter(r=>r.status==='SUDAH INVOICE').length,unbilled:rows.filter(r=>r.status==='BELUM INVOICE').length};
}
async function logisticsExpeditionReportPage(){
  if(!['ADMIN','LOGISTIK','OWNER'].includes(profile?.role))return layout('<section class="panel"><h3>Akses Dikunci</h3><p>Laporan operasional Expedisi khusus Logistik, Administrator, dan Owner.</p></section>');
  const selectedRole=profile.role,selectedActor=session?.user?.id;
  layout('<section class="panel"><h3>Laporan Expedisi Logistik</h3><p>Memuat laporan…</p></section>');
  let results;
  try{results=await Promise.all([
    db.from('finance_expedition_trips').select('id,trip_date,mts_sj,rr,driver,vehicle,zone,destination,cargo,total_qty,reference,created_at').order('trip_date',{ascending:false}).order('created_at',{ascending:false}),
    db.from('finance_expedition_trip_destinations').select('trip_id,line_no,destination_name,cargo,qty,unit'),
    db.from('finance_expedition_invoice_items').select('invoice_id,trip_id'),
    db.from('finance_expedition_invoices').select('id,invoice_number,status')
  ]);}catch(error){results=[{error:{message:error?.message||'Koneksi terputus. Coba lagi.'}}]}
  if(tab!=='logistik_laporan_expedisi'||profile?.role!==selectedRole||session?.user?.id!==selectedActor)return;
  const error=results.find(r=>r.error)?.error;
  if(error){layout('<section class="panel"><h3>Laporan Expedisi Logistik</h3><p>'+esc(error.message||'Data belum dapat dimuat.')+'</p><button type="button" id="expLogRetry">Coba Lagi</button></section>');document.getElementById('expLogRetry').onclick=logisticsExpeditionReportPage;return;}
  const data={trips:results[0].data||[],destinations:results[1].data||[],links:results[2].data||[],invoices:results[3].data||[]};
  const options=(key)=>[...new Set(data.trips.map(t=>t[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
  const today=prodToday();
  layout('<section class="panel"><h3>Laporan Expedisi Logistik</h3><p class="muted">Rekap operasional trip, Surat Jalan/MTS dan status invoice. Periode berdasarkan tanggal trip.</p><form id="expLogFilter" class="form-vertical"><label>Tanggal awal<input type="date" name="from" value="'+BMSCore.dateAdd(today,-29)+'"></label><label>Tanggal akhir<input type="date" name="to" value="'+today+'"></label><label>Sopir<select name="driver"><option value="">Semua Sopir</option>'+options('driver')+'</select></label><label>Kendaraan<select name="vehicle"><option value="">Semua Kendaraan</option>'+options('vehicle')+'</select></label><label>Status<select name="status"><option value="">Semua Status</option><option>MENUNGGU SJ</option><option>BELUM INVOICE</option><option>SUDAH INVOICE</option></select></label><label>Cari SJ/MTS, rute, tujuan, atau muatan<input name="search" type="search"></label><div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="expLogReset">Semua Data</button></div></form></section><div class="report-actions"><button type="button" id="expLogPrint">Cetak</button><button type="button" id="expLogPdf">PDF</button><button type="button" id="expLogExcel">Excel</button></div><div id="expLogReport"></div>');
  const form=document.getElementById('expLogFilter'),report=document.getElementById('expLogReport');
  const renderReport=()=>{
    const fd=new FormData(form),filter=Object.fromEntries(['from','to','driver','vehicle','status','search'].map(k=>[k,String(fd.get(k)||'').trim()]));
    if(filter.from&&filter.to&&filter.from>filter.to){msg('Tanggal awal harus sebelum atau sama dengan tanggal akhir.');return;}
    const m=logisticsExpeditionReportModel(data,filter),n=v=>fmtNumber(v);
    const quantity=t=>t.quantityLines.map(q=>(q.quantity===null?'-':n(q.quantity))+' '+esc(q.unit||'(satuan belum tercatat)')).join(' • ');
    const dateLabel=(filter.from?prodDateId(filter.from):'Awal data')+' – '+(filter.to?prodDateId(filter.to):'Akhir data');
    const filters=dateLabel+' · '+(filter.driver||'Semua Sopir')+' · '+(filter.vehicle||'Semua Kendaraan')+' · '+(filter.status||'Semua Status')+(filter.search?' · Cari: '+filter.search:'');
    report.innerHTML='<section class="panel"><h3>Ringkasan Expedisi Logistik</h3><p>'+esc(filters)+'</p><div class="rhpp-summary-cards"><div class="rhpp-summary-card"><span>Total Trip</span><strong>'+m.rows.length+'</strong></div><div class="rhpp-summary-card"><span>Menunggu Surat Jalan</span><strong>'+m.pending+'</strong></div><div class="rhpp-summary-card"><span>Belum Invoice</span><strong>'+m.unbilled+'</strong></div><div class="rhpp-summary-card"><span>Sudah Invoice</span><strong>'+m.billed+'</strong></div></div><h4>Total Muatan per Satuan</h4><p>'+(m.quantities.map(q=>n(q.quantity)+' '+esc(q.unit)).join(' · ')||'Belum ada jumlah dengan satuan tercatat.')+'</p>'+(m.unknownQuantity?'<p class="muted">'+m.unknownQuantity+' rincian belum memiliki jumlah/satuan lengkap; tidak dimasukkan ke total muatan.</p>':'')+'</section>'+
      '<section class="panel"><h3>Rincian Trip</h3><div class="tablewrap"><table id="expLogTrips"><thead><tr><th>Tanggal</th><th>SJ/MTS</th><th>RR</th><th>Sopir</th><th>Kendaraan</th><th>Rute</th><th>Tujuan</th><th>Muatan</th><th>Jumlah</th><th>Status</th><th>Invoice</th></tr></thead><tbody>'+m.rows.map(t=>'<tr><td>'+prodDateId(t.trip_date)+'</td><td>'+esc(t.mts_sj||'-')+'</td><td>'+esc(t.rr||'-')+'</td><td>'+esc(t.driver||'-')+'</td><td>'+esc(t.vehicle||'-')+'</td><td>'+esc(t.zone||'-')+'</td><td>'+esc(t.destination)+'</td><td>'+esc(t.cargo)+'</td><td>'+quantity(t)+'</td><td>'+esc(t.status)+'</td><td>'+esc(t.invoice)+'</td></tr>').join('')+(m.rows.length?'':'<tr><td colspan="11">Tidak ada trip sesuai filter.</td></tr>')+'</tbody></table></div></section>'+
      '<section class="panel"><h3>Rekap Sopir / Kendaraan</h3><div class="tablewrap"><table><thead><tr><th>Sopir</th><th>Kendaraan</th><th>Jumlah Trip</th><th>Menunggu SJ</th></tr></thead><tbody>'+m.crew.map(c=>'<tr><td>'+esc(c.driver)+'</td><td>'+esc(c.vehicle)+'</td><td>'+c.trips+'</td><td>'+c.pending+'</td></tr>').join('')+'</tbody></table></div></section>';
    bindHtmlExportActions({elementId:'expLogReport',printId:'expLogPrint',pdfId:'expLogPdf',excelId:'expLogExcel',title:'Laporan Expedisi Logistik',filename:'Laporan_Expedisi_Logistik',filterText:filters});
  };
  form.onsubmit=e=>{e.preventDefault();renderReport();releaseSubmitGuard(form);};
  document.getElementById('expLogReset').onclick=()=>{form.reset();form.elements.from.value='';form.elements.to.value='';renderReport();};
  renderReport();
}
