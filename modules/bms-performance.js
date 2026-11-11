const BMS_WORK_CATEGORIES=['PPL','LOGISTIK','MARKETING','KEUANGAN'];
let bmsWorkPerformanceState=null,bmsWorkPerformanceRequest=0;
function summarizeWorkPerformance(data,filter={}){
  const users=(data.users||[]).filter(u=>(!filter.role||u.role===filter.role)&&(!filter.actor||u.id===filter.actor));
  const ids=new Set(users.map(u=>u.id));
  const stats=(data.stats||[]).filter(s=>ids.has(s.actor)&&(!filter.category||s.category===filter.category));
  const empty=()=>({new_count:0,changed_count:0,deleted_count:0,on_time:0,late:0,unassessed:0,delay_days:0});
  const add=(a,b)=>{for(const k of Object.keys(empty()))a[k]+=Number(b[k]||0);return a};
  const finish=a=>({...a,assessed:a.on_time+a.late,rate:a.on_time+a.late?a.on_time/(a.on_time+a.late)*100:null,delay:a.on_time+a.late?a.delay_days/(a.on_time+a.late):null});
  const byUser=users.map(u=>({...u,...finish(stats.filter(s=>s.actor===u.id).reduce(add,empty()))}));
  const categories=BMS_WORK_CATEGORIES.filter(c=>!filter.category||c===filter.category).map(category=>({category,...finish(stats.filter(s=>s.category===category).reduce(add,empty()))}));
  const byDate=new Map();for(const s of stats){if(!byDate.has(s.input_date))byDate.set(s.input_date,{date:s.input_date,...empty()});add(byDate.get(s.input_date),s)}
  const daily=[];for(let date=data.from;date&&date<=data.to&&daily.length<366;date=BMSCore.dateAdd(date,1))daily.push(byDate.get(date)||{date,...empty()});
  return {users:byUser,categories,daily,total:finish(stats.reduce(add,empty()))};
}
function workPerformanceBars(rows,labelKey,valueKey,percent=false){
  const max=percent?100:Math.max(1,...rows.map(r=>Number(r[valueKey]||0)));
  return '<div class="work-bars">'+rows.map(r=>'<div class="work-bar-row"><span>'+esc(r[labelKey]||'-')+'</span><div class="work-bar-track"><div style="width:'+Math.max(0,Number(r[valueKey]||0))/max*100+'%"></div></div><strong>'+fmtNumber(Math.round(Number(r[valueKey]||0)*10)/10)+(percent?'%':'')+'</strong></div>').join('')+'</div>';
}
function workPerformanceTrend(rows){
  if(!rows.some(r=>r.new_count>0))return '<p class="muted">Belum ada input baru tercatat pada periode/filter ini.</p>';
  const w=800,h=210,pad=35,plotH=140,step=(w-pad*2)/rows.length,max=Math.max(1,...rows.map(r=>r.new_count));
  const colours={on_time:'#087f5b',late:'#b45309',unassessed:'#64748b'};
  let bars='';rows.forEach((row,i)=>{let y=pad+plotH;for(const k of ['on_time','late','unassessed']){const height=Number(row[k]||0)/max*plotH;y-=height;bars+='<rect x="'+(pad+i*step+step*.1)+'" y="'+y+'" width="'+Math.max(.5,step*.8)+'" height="'+height+'" fill="'+colours[k]+'"><title>'+esc(row.date)+' · '+esc(({on_time:'Tepat waktu',late:'Terlambat',unassessed:'Belum dinilai'})[k])+': '+Number(row[k]||0)+'</title></rect>';}
    if(i%Math.ceil(rows.length/6)===0||i===rows.length-1)bars+='<text x="'+(pad+i*step)+'" y="'+(h-12)+'" font-size="12">'+esc(row.date.slice(5))+'</text>';
  });
  return '<div class="tablewrap work-chart"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jumlah input baru per tanggal simpan dalam WIB; rincian tersedia pada tabel harian" viewBox="0 0 '+w+' '+h+'"><text x="5" y="'+pad+'" font-size="12">'+max+'</text><text x="15" y="'+(pad+plotH)+'" font-size="12">0</text><path d="M '+pad+' '+pad+' V '+(pad+plotH)+' H '+(w-pad)+'" stroke="#94a3b8" fill="none"/>'+bars+'</svg></div><p class="work-legend"><span>Hijau: tepat waktu</span><span>Cokelat: terlambat</span><span>Abu-abu: belum dinilai</span></p>';
}
async function adminWorkPerformancePage(nextState=null){
  if(profile?.role!=='ADMIN')return layout('<section class="panel"><h3>Akses Dikunci</h3><p>Penilaian Kinerja Akun khusus Administrator.</p></section>');
  const today=prodToday();
  const state=nextState||bmsWorkPerformanceState||{from:BMSCore.dateAdd(today,-29),to:today,actor:'',role:'',category:''};
  bmsWorkPerformanceState={...state};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(state.from)||!/^\d{4}-\d{2}-\d{2}$/.test(state.to)||state.from>state.to||(new Date(state.to+'T00:00:00Z')-new Date(state.from+'T00:00:00Z'))/86400000>365)return msg('Pilih tanggal awal/akhir yang valid, maksimal 366 hari.');
  const request=++bmsWorkPerformanceRequest,actor=session?.user?.id;
  layout('<section class="panel"><h3>Penilaian Kinerja Akun</h3><p role="status">Memuat audit kinerja…</p></section>');
  let result;
  try{result=await db.rpc('admin_work_performance_v1',{p_from:state.from,p_to:state.to})}
  catch(error){result={error:{message:error?.message||'Koneksi terputus. Coba lagi.'}}}
  const {data,error}=result;
  if(request!==bmsWorkPerformanceRequest||tab!=='admin_kinerja'||profile?.role!=='ADMIN'||session?.user?.id!==actor)return;
  if(error){layout('<section class="panel"><h3>Penilaian Kinerja Akun</h3><p id="workPerformanceError" role="alert">Data belum dapat dimuat. '+esc(error.message||'Coba lagi.')+'</p><button id="workRetry" type="button">Coba Lagi</button></section>');document.getElementById('workRetry').onclick=()=>adminWorkPerformancePage(state);return;}
  const model=summarizeWorkPerformance(data||{},state),t=model.total;
  const n=v=>fmtNumber(v),pct=v=>v===null?'-':new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(v)+'%',delay=v=>v===null?'-':fmtNumber(Math.round(v*100)/100)+' hari';
  const option=(v,label,current)=>'<option value="'+esc(v)+'"'+(v===current?' selected':'')+'>'+esc(label)+'</option>';
  let html='<section class="panel"><h3>Penilaian Kinerja Akun</h3><p class="muted">Indikator aktivitas input berdasarkan audit server. Ketepatan waktu memakai hari kalender WIB, bukan durasi mengerjakan tugas.</p><form id="workPerformanceFilter" class="form-vertical">'+
    '<label>Dari tanggal simpan<input name="from" type="date" required value="'+esc(state.from)+'"></label><label>Sampai tanggal simpan<input name="to" type="date" required value="'+esc(state.to)+'"></label>'+
    '<label>Peran akun saat ini<select name="role">'+option('','Semua Peran',state.role)+['ADMIN','PPL','LOGISTIK','MARKETING','KEUANGAN','OWNER'].map(r=>option(r,r,state.role)).join('')+'</select></label>'+
    '<label>Pengguna<select name="actor">'+option('','Semua Pengguna',state.actor)+(data.users||[]).map(u=>option(u.id,(u.name||'Tanpa nama')+' · '+u.role+(u.active?'':' · Nonaktif'),state.actor)).join('')+'</select></label>'+
    '<label>Kategori pekerjaan<select name="category">'+option('','Semua Kategori',state.category)+BMS_WORK_CATEGORIES.map(c=>option(c,c,state.category)).join('')+'</select></label>'+
    '<div class="inline-actions"><button type="submit">Tampilkan</button><button type="button" id="workPerformanceReset">30 Hari Terakhir</button></div></form></section>';
  html+='<div class="report-actions"><button id="workPerformancePrint" type="button">Cetak</button><button id="workPerformancePdf" type="button">PDF</button><button id="workPerformanceExcel" type="button">Excel</button></div><section id="workPerformanceReport"><section class="panel"><h3>Ringkasan Kinerja Input</h3><p>'+prodDateId(data.from)+' – '+prodDateId(data.to)+' · WIB · '+esc(state.role||'Semua peran')+' · '+esc(state.category||'Semua kategori')+' · '+esc((data.users||[]).find(u=>u.id===state.actor)?.name||'Semua pengguna')+'</p>'+
    '<div class="work-kpis"><div><span>Input baru</span><strong>'+n(t.new_count)+'</strong></div><div><span>Tepat waktu / dapat dinilai</span><strong>'+n(t.on_time)+' / '+n(t.assessed)+'</strong><small>'+pct(t.rate)+'</small></div><div><span>Terlambat</span><strong>'+n(t.late)+'</strong></div><div><span>Rata-rata jeda input</span><strong>'+delay(t.delay)+'</strong></div><div><span>Belum dapat dinilai</span><strong>'+n(t.unassessed)+'</strong></div></div>'+
    '<p class="muted">Tepat waktu = tanggal simpan sama dengan tanggal kegiatan. Terlambat = selisih hari positif. Tanggal kosong/tidak valid/di masa depan dikeluarkan dari persentase. Jeda dihitung dalam hari kalender, bukan jam. Nol aktivitas bukan bukti petugas tidak bekerja.</p></section>'+
    '<section class="panel"><h3>Grafik Input Harian</h3>'+workPerformanceTrend(model.daily)+'</section>'+
    '<section class="panel"><h3>Grafik per Kategori Pekerjaan</h3>'+workPerformanceBars(model.categories,'category','new_count')+'</section>'+
    '<section class="panel"><h3>Grafik per Akun</h3>'+workPerformanceBars(model.users,'name','new_count')+'</section>'+
    '<section class="panel"><h3>Grafik Ketepatan Waktu per Akun</h3>'+(model.users.some(u=>u.assessed)?workPerformanceBars(model.users.filter(u=>u.assessed),'name','rate',true):'<p class="muted">Belum ada input yang dapat dinilai.</p>')+'</section>'+
    '<section class="panel"><h3>Rincian per Akun</h3><div class="tablewrap"><table id="workPerformanceUsers"><thead><tr><th>Nama / Peran Saat Ini</th><th>Input Baru</th><th>Tepat Waktu</th><th>Terlambat</th><th>Belum Dinilai</th><th>% Tepat Waktu</th><th>Rata-rata Jeda</th><th>Data Diubah</th><th>Data Dihapus</th></tr></thead><tbody>'+model.users.map(u=>'<tr><td>'+esc(u.name||'-')+' · '+esc(u.role)+(u.active?'':' · Nonaktif')+'</td><td>'+n(u.new_count)+'</td><td>'+n(u.on_time)+'</td><td>'+n(u.late)+'</td><td>'+n(u.unassessed)+'</td><td>'+pct(u.rate)+'</td><td>'+delay(u.delay)+'</td><td>'+n(u.changed_count)+'</td><td>'+n(u.deleted_count)+'</td></tr>').join('')+(model.users.length?'':'<tr><td colspan="9">Tidak ada akun sesuai filter.</td></tr>')+'</tbody></table></div><p class="muted">Perubahan/penghapusan dihitung per data per petugas per tanggal. Pembaruan otomatis saat pembuatan data dikecualikan. Perubahan bukan otomatis kesalahan; tidak ada potongan nilai.</p></section>'+
    '<section class="panel"><h3>Rincian per Kategori</h3><div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Input Baru</th><th>Tepat Waktu</th><th>Terlambat</th><th>Belum Dinilai</th><th>% Tepat Waktu</th></tr></thead><tbody>'+model.categories.map(c=>'<tr><td>'+esc(c.category)+'</td><td>'+n(c.new_count)+'</td><td>'+n(c.on_time)+'</td><td>'+n(c.late)+'</td><td>'+n(c.unassessed)+'</td><td>'+pct(c.rate)+'</td></tr>').join('')+'</tbody></table></div></section>'+
    '<details class="panel"><summary>Rincian Harian dan Cakupan Audit</summary><div class="tablewrap"><table><thead><tr><th>Tanggal Simpan WIB</th><th>Input Baru</th><th>Tepat Waktu</th><th>Terlambat</th><th>Belum Dinilai</th></tr></thead><tbody>'+model.daily.map(d=>'<tr><td>'+prodDateId(d.date)+'</td><td>'+n(d.new_count)+'</td><td>'+n(d.on_time)+'</td><td>'+n(d.late)+'</td><td>'+n(d.unassessed)+'</td></tr>').join('')+'</tbody></table></div><p class="muted">Hanya transaksi utama, bukan baris rincian barang/sampel. Histori sebelum audit tersedia tidak direkonstruksi. Input tanpa akun teridentifikasi: '+n(data.unattributed||0)+' (seluruh periode; tidak dibebankan ke petugas). Belum ada target tugas sehingga kelengkapan seluruh pekerjaan belum dapat dinilai.</p><div class="tablewrap"><table><thead><tr><th>Kategori / Sumber</th><th>Audit Aktif</th><th>Awal Histori Input</th></tr></thead><tbody>'+(data.coverage||[]).map(c=>'<tr><td>'+esc(c.category)+' · '+esc(c.table)+'</td><td>'+(c.audited?'Ya':'Belum terdeteksi')+'</td><td>'+esc(c.first_audit?prodDateId(String(c.first_audit).slice(0,10)):'Belum ada histori')+'</td></tr>').join('')+'</tbody></table></div></details></section>';
  if((!state.category||state.category==='PPL')&&(!state.role||state.role==='PPL')){
    const coverage=(data.recording_coverage||[]).filter(c=>!state.actor||c.actor===state.actor);
    html+='<section class="panel"><h3>Kelengkapan Recording Kandang Aktif</h3><p class="muted">Dihitung dari H+1 kedatangan DOC sampai kemarin, dalam periode pilihan. Penanggung jawab adalah PPL saat ini; bukan histori penugasan. Tidak dicampurkan ke persentase ketepatan waktu akun.</p><div class="tablewrap"><table><thead><tr><th>Kandang</th><th>PPL Saat Ini</th><th>Hari Wajib</th><th>Hari Terisi</th><th>Belum Terisi</th></tr></thead><tbody>'+coverage.map(c=>'<tr><td>'+esc(c.barn)+'</td><td>'+esc((data.users||[]).find(u=>u.id===c.actor)?.name||'Belum ditugaskan')+'</td><td>'+n(c.expected_days)+'</td><td>'+n(c.recorded_days)+'</td><td>'+n(Math.max(0,c.expected_days-c.recorded_days))+'</td></tr>').join('')+'</tbody></table></div>'+(coverage.length?'':'<p class="muted">Tidak ada kandang aktif sesuai filter.</p>')+'</section>';
  }
  layout(html);
  bindHtmlExportActions({elementId:'workPerformanceReport',printId:'workPerformancePrint',pdfId:'workPerformancePdf',excelId:'workPerformanceExcel',title:'Penilaian Kinerja Akun',filename:'Penilaian_Kinerja_Akun'});
  const form=document.getElementById('workPerformanceFilter');
  form.onsubmit=async event=>{event.preventDefault();const fd=new FormData(form);await adminWorkPerformancePage(Object.fromEntries(['from','to','role','actor','category'].map(k=>[k,String(fd.get(k)||'')])));releaseSubmitGuard(form);};
  document.getElementById('workPerformanceReset').onclick=()=>adminWorkPerformancePage({from:BMSCore.dateAdd(today,-29),to:today,actor:'',role:'',category:''});
}
