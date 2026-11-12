// Real Chromium checks against the local app. No production account or transaction is used.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),profile=path.join(__dirname,'output/chrome-profile');
const server=require('node:http').createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.webmanifest':'application/manifest+json'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file))}
  catch{res.writeHead(404);res.end('Not found')}
});
server.listen(8787,'127.0.0.1');
const executable=process.env.BMS_TEST_CHROMIUM;
if(!executable)throw new Error('Set BMS_TEST_CHROMIUM to a local Chromium executable.');
fs.rmSync(profile,{recursive:true,force:true});fs.mkdirSync(profile,{recursive:true});
const browser=spawn(executable,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-proxy-server','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9393','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let errors='';browser.stderr.on('data',x=>errors+=x.toString());
let socket;const pending=new Map();let serial=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function command(method,params={}){const id=++serial;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await command('Runtime.evaluate',{expression:expression.includes(';')?'(async()=>{'+expression+'})()':'(async()=>('+expression+'))()',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await wait(100)}throw new Error('Browser condition timed out: '+expression)}
(async()=>{
  let pages;
  for(let i=0;i<300;i++){try{pages=await (await fetch('http://127.0.0.1:9393/json/list')).json();if(pages.length)break}catch{}await wait(100)}
  if(!pages?.length)throw new Error('Chromium did not start: '+errors.slice(-2000));
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});
  socket.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result)}});
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Page.addScriptToEvaluateOnNewDocument',{source:"window.__auditErrors=[];addEventListener('error',e=>window.__auditErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__auditErrors.push(String(e.reason)));caches.open('another-app-cache').then(c=>c.put('/OtherApp/sentinel',new Response('preserved')));"});
  await command('Page.navigate',{url:'http://127.0.0.1:8787/'});
  await until("!!document.querySelector('#auth input[name=email]')&&!!window.BMSCore");
  await evaluate('navigator.serviceWorker.ready');
  await until("!!navigator.serviceWorker.controller&&!!document.querySelector('#auth')&&!!document.querySelector('.login-logo')");
  assert.deepEqual(await evaluate('window.__auditErrors'),[]);
  await until("document.querySelector('.login-logo')?.getAttribute('alt')==='Logo BMS'");
  assert.equal(await evaluate("(await caches.keys()).includes('another-app-cache')"),true);
  const shell=await evaluate("const keys=(await caches.keys()).filter(k=>k.startsWith('bms-pwa-shell-'));if(keys.length!==1)throw new Error('Expected exactly one active BMS cache, got '+keys.join(','));return (await (await caches.open(keys[0])).keys()).map(r=>new URL(r.url).pathname)");
  for(const name of ['/main-2321.js','/bms-core.js','/bms-data-config.js','/vendor/supabase-2.57.0.js','/bms-typography.css'])assert.ok(shell.includes(name),name+' was not cached');
  console.log('PASS: login loads without errors, local dependencies cached, other app cache preserved');

  await evaluate("document.querySelector('#togglePassword').click()");assert.equal(await evaluate("document.querySelector('input[name=password]').type"),'text');
  await evaluate("document.querySelector('#togglePassword').click()");assert.equal(await evaluate("document.querySelector('input[name=password]').type"),'password');
  console.log('PASS: login password visibility toggle');

  await evaluate("window.__auditTimers=[];const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>ms===60000?(window.__auditTimers.push(fn),0):original(fn,ms,...args);const form=document.createElement('form');form.id='auditPaymentForm';form.innerHTML='<button type=submit>Simpan</button>';document.body.appendChild(form);form.onsubmit=async e=>{e.preventDefault();if(!await appConfirm('Uji batal dan simpan'))return;msg('Tersimpan',true)};form.requestSubmit();");
  assert.equal(await evaluate("document.querySelector('#auditPaymentForm button').disabled"),true);
  await evaluate('window.__auditTimers.shift()()');
  assert.equal(await evaluate("document.querySelector('#auditPaymentForm button').disabled"),true);
  assert.equal(await evaluate("document.querySelector('#auditPaymentForm button').textContent"),'Masih memproses…');
  await evaluate("document.querySelector('.app-confirm [data-cancel]').click()");
  assert.equal(await evaluate("document.querySelector('#auditPaymentForm button').disabled"),false);
  await evaluate("document.querySelector('#auditPaymentForm').requestSubmit();document.querySelector('.app-confirm [data-accept]').click()");
  await until("document.querySelector('#auditPaymentForm button').textContent==='✓ Tersimpan'");
  console.log('PASS: timeout keeps submit locked, cancel releases immediately, subsequent save shows success');

  await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await command('Page.reload');await until("!!document.querySelector('#auth')&&!!window.BMSCore");
  assert.deepEqual(await evaluate('window.__auditErrors'),[]);
  console.log('PASS: cached application shell loads offline');
  await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const editActions=await evaluate("const box=document.createElement('div');box.id='auditEditActions';box.innerHTML='<button>Simpan Perubahan</button><button>Batal Edit</button><button>Batal Koreksi</button><button>Edit</button><button>Hapus</button>';document.body.appendChild(box);decorateMobileActionIcons(box);decorateMobileActionIcons(box);return [...box.querySelectorAll('button')].map(b=>({text:b.textContent,icon:b.dataset.mobileActionIcon||null}));");
  assert.deepEqual(editActions,[
    {text:'Simpan Perubahan',icon:null},{text:'Batal Edit',icon:null},
    {text:'Batal Koreksi',icon:null},{text:'✏️',icon:'1'},{text:'🗑️',icon:'1'}
  ]);
  await evaluate("document.querySelector('#auditEditActions').remove()");
  console.log('PASS: mobile save/cancel keep labels; edit and delete retain distinct icons');
  const feedCard=await evaluate(`
    const originalRpc=db.rpc,originalLeague=loadAbkLeagueSetting,originalProfile=profile;
    try{
      profile={role:'ADMIN'};
      loadAbkLeagueSetting=async()=>({data:null});
      db.rpc=async()=>({data:{feed_monitoring_version:1,
        assignments:[{id:'A',barn_id:'B',active:true,cycle_type:'MITRA'}],
        barns:[{id:'B',name:'Kandang Uji'}],chicks:[{contract_assignment_id:'A',received:1000,doa:0,arrived_on:'2026-10-01'}],
        items:[{id:'F',category:'PAKAN',unit:'ZAK',kg_per_unit:50}],
        shipments:[{id:'S',contract_assignment_id:'A'}],shipment_items:[{shipment_id:'S',item_id:'F',quantity:100}],
        recordings:[{id:'R',contract_assignment_id:'A',recorded_on:'2026-11-01',age_days:31,feed_kg:150,feed_item_id:'F',feed_quantity_units:3}],
        recording_feed_items:[{recording_id:'R',item_id:'F',quantity_units:3,kg_per_unit:50}]
      }});
      const model=await buildDashboardModel(),box=document.createElement('section');
      box.id='auditFeedCard';box.innerHTML=model.mainHtml;document.querySelector('#app').appendChild(box);
      box.querySelector('details').open=true;
      return {text:box.textContent,overflow:box.scrollWidth>innerWidth};
    }finally{db.rpc=originalRpc;loadAbkLeagueSetting=originalLeague;profile=originalProfile;}
  `);
  assert.match(feedCard.text,/Sisa Pakan/);
  assert.match(feedCard.text,/4\.850,00 kg \/ 97,00 zak/);
  assert.match(feedCard.text,/150,00 kg \/ 3,00 zak/);
  assert.match(feedCard.text,/Riwayat pemakaian harian/);
  assert.equal(feedCard.overflow,false);
  const barnHeader=await evaluate(`
    const head=document.querySelector('#auditFeedCard .owner-barn-head');
    const alert=head.querySelector('.owner-alert');
    const meta=head.querySelector('small');
    return {emphasis:getComputedStyle(meta.querySelector('strong')).display,
      direction:getComputedStyle(head).flexDirection,
      alertWrap:getComputedStyle(alert).whiteSpace,
      alertFits:alert.scrollWidth<=alert.clientWidth+1,
      alertBelow:alert.getBoundingClientRect().top>=meta.getBoundingClientRect().bottom};
  `);
  assert.equal(barnHeader.emphasis,'inline');
  assert.equal(barnHeader.direction,'column');
  assert.equal(barnHeader.alertWrap,'normal');
  assert.equal(barnHeader.alertFits,true);
  assert.equal(barnHeader.alertBelow,true);
  await command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  assert.equal(await evaluate("document.querySelector('#auditFeedCard').scrollWidth<=innerWidth"),true);
  await evaluate("document.querySelector('#auditFeedCard').remove()");
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  console.log('PASS: feed card shows actual kg/zak, daily history and fits mobile/desktop widths');
  await evaluate(`
    const box=document.createElement('section');box.id='auditTypography';box.className='panel';
    box.innerHTML='<header><h2>Judul Halaman</h2></header><h3>Judul Panel</h3><form><label>Nama Kandang<input placeholder="Cari kandang"></label><button type="button">Simpan Perubahan</button><div class="app-select-control"><input class="app-select-input"><div class="app-select-results open"><button type="button">Pilihan kandang</button></div></div></form><p class="muted">Catatan pendukung</p><div class="tablewrap"><table><thead><tr><th>Uraian</th><th>Jumlah</th></tr></thead><tbody><tr><td>Pakan</td><td>1.234,00 kg</td></tr></tbody></table></div><div class="owner-metrics"><div><span>Sisa Ayam</span><b>12.345</b></div></div><div class="owner-estimate-metrics"><div><span>Pakan</span><b>1.234 kg</b></div></div><div class="dashboard-feed-summary"><div><span>Sisa Pakan</span><strong>4.850,00 kg / 97,00 zak</strong><small>Recording terakhir</small></div></div><button type="button" class="mobile-icon-action">✏️</button>';
    document.querySelector('#app').appendChild(box);
  `);
  for(const width of [390,768,1280]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<901});
    const fonts=await evaluate(`
      const box=document.querySelector('#auditTypography');
      const selectors=['header h2','h3','label','input','form>button','.app-select-input','.app-select-results button','.muted','th','td','.owner-metrics span','.owner-metrics b','.owner-estimate-metrics span','.owner-estimate-metrics b','.dashboard-feed-summary span','.dashboard-feed-summary strong','.dashboard-feed-summary small','button.mobile-icon-action'];
      return {sizes:selectors.map(s=>getComputedStyle(box.querySelector(s)).fontSize),overflow:box.scrollWidth>innerWidth,buttonHeight:box.querySelector('form>button').getBoundingClientRect().height};
    `);
    assert.deepEqual(fonts.sizes,[width<901?'20px':'24px','16px','14px','14px','14px','14px','14px','12px','13px','13px','12px','18px','12px','18px','12px','16px','12px','18px']);
    assert.equal(fonts.overflow,false,'typography overflows at '+width+'px');
    if(width<901)assert.ok(fonts.buttonHeight>=40);
  }
  await evaluate("document.querySelector('#auditTypography').remove()");
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  console.log('PASS: unified computed font scale and readable forms/tables/dashboard at 390px, 768px and 1280px');
  await evaluate(`
    window.__workSmoke={rpc:db.rpc,profile,tab,calls:0};
    profile={role:'ADMIN',full_name:'Uji Administrator'};tab='admin_kinerja';
    db.rpc=async(name,params)=>{
      if(name!=='admin_work_performance_v1')throw new Error('Unexpected RPC: '+name);
      window.__workSmoke.calls++;
      return {data:{from:params.p_from,to:params.p_to,users:[{id:'P',name:'Petugas PPL',role:'PPL',active:true},{id:'K',name:'Petugas Keuangan',role:'KEUANGAN',active:true}],stats:[
        {actor:'P',category:'PPL',input_date:'2026-11-01',new_count:2,on_time:1,late:1,delay_days:2},
        {actor:'K',category:'KEUANGAN',input_date:'2026-11-02',new_count:1,on_time:1}
      ],coverage:[],recording_coverage:[{actor:'P',barn:'Kandang A',expected_days:2,recorded_days:1}]}};
    };
    await adminWorkPerformancePage({from:'2026-11-01',to:'2026-11-03',actor:'',role:'',category:''});
  `);
  assert.equal(await evaluate("document.querySelectorAll('nav [data-tab=admin_kinerja]').length"),1);
  assert.equal(await evaluate("document.querySelectorAll('#workPerformanceUsers tbody tr').length"),2);
  assert.equal(await evaluate("!!document.querySelector('#workPerformanceReport svg[role=img]')"),true);
  assert.match(await evaluate("document.querySelector('#workPerformanceReport').textContent"),/66,7%/);
  for(const width of [390,768,1280]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<901});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'performance page overflows at '+width);
  }
  await evaluate("const f=document.querySelector('#workPerformanceFilter');f.elements.role.value='PPL';f.elements.category.value='PPL';f.requestSubmit()");
  await until("document.querySelectorAll('#workPerformanceUsers tbody tr').length===1");
  assert.match(await evaluate("document.querySelector('#workPerformanceReport').textContent"),/50%/);
  assert.equal(await evaluate("document.querySelector('#workPerformanceFilter button[type=submit]').disabled"),false);
  await evaluate("db.rpc=async()=>({error:{message:'Koneksi uji terputus'}});await adminWorkPerformancePage()");
  assert.match(await evaluate("document.querySelector('#workPerformanceError').textContent"),/Koneksi uji terputus/);
  await evaluate(`
    for(const role of ['OWNER','PPL','LOGISTIK','MARKETING','KEUANGAN']){
      profile={role,full_name:'Uji'};
      if(canViewTab('admin_kinerja'))throw new Error('Performance nav allowed to '+role);
      db.rpc=async()=>{throw new Error('Unauthorized RPC called')};
      await adminWorkPerformancePage();
      if(!document.body.textContent.includes('khusus Administrator'))throw new Error('Missing access guard');
    }
    db.rpc=window.__workSmoke.rpc;profile=window.__workSmoke.profile;tab=window.__workSmoke.tab;
    bmsWorkPerformanceState=null;delete window.__workSmoke;login();
  `);
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  console.log('PASS: Admin work performance charts, role/category filters, recording completeness, error handling and non-admin guards');
  await evaluate(`
    window.__expSmoke={from:db.from,profile,tab};profile={role:'LOGISTIK',full_name:'Uji Logistik'};tab='logistik_laporan_expedisi';
    const tables={finance_expedition_trips:[{id:'A',trip_date:prodToday(),mts_sj:'SJ-1',driver:'A',vehicle:'D 1'},{id:'B',trip_date:prodToday(),reference:'KAS_JALAN_PENDING_SJ',driver:'B',vehicle:'D 2'},{id:'C',trip_date:prodToday(),mts_sj:'SJ-3',driver:'A',vehicle:'D 1'}],finance_expedition_trip_destinations:[{trip_id:'A',line_no:1,destination_name:'Kandang A',cargo:'Pakan',qty:10,unit:'zak'},{trip_id:'A',line_no:2,destination_name:'Kandang B',cargo:'Pakan',qty:100,unit:'kg'}],finance_expedition_invoice_items:[{invoice_id:'I',trip_id:'A'}],finance_expedition_invoices:[{id:'I',invoice_number:'INV-1',status:'ISSUED'}]};
    db.from=table=>{if(!tables[table])throw new Error('Unexpected report source');const q={select:columns=>{if(/trip_price|amount|paid_total|receivable/.test(columns))throw new Error('Unexpected financial data');return q},order:()=>q,then:resolve=>Promise.resolve({data:tables[table]}).then(resolve)};return q};
    await logisticsExpeditionReportPage();
  `);
  assert.equal(await evaluate("document.querySelectorAll('nav [data-tab=logistik_laporan_expedisi]').length"),1);
  assert.equal(await evaluate("canViewTab('laporan_expedisi')"),false);
  assert.equal(await evaluate("document.querySelectorAll('#expLogTrips tbody tr').length"),3);
  assert.match(await evaluate("document.querySelector('#expLogReport').textContent"),/10 zak.*100 kg/);
  for(const width of [390,768,1280]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<901});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Logistics report overflows at '+width);
  }
  await evaluate("const f=document.querySelector('#expLogFilter');f.elements.status.value='MENUNGGU SJ';f.requestSubmit()");
  assert.equal(await evaluate("document.querySelectorAll('#expLogTrips tbody tr').length"),1);
  assert.match(await evaluate("document.querySelector('#expLogTrips').textContent"),/MENUNGGU SJ/);
  await evaluate("document.querySelector('#expLogReset').click()");
  assert.equal(await evaluate("document.querySelectorAll('#expLogTrips tbody tr').length"),3);
  assert.equal(await evaluate("typeof document.querySelector('#expLogPdf').onclick"),'function');
  await evaluate("db.from=window.__expSmoke.from;profile=window.__expSmoke.profile;tab=window.__expSmoke.tab;delete window.__expSmoke;login()");
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  console.log('PASS: Logistics expedition report navigation, filters, distinct units, export bindings and restricted finance access');
  await evaluate(`
    window.__rhppSmoke={from:db.from,rpc:db.rpc,profile,tab};profile={role:'ADMIN',full_name:'Uji RHPP'};tab='keuangan_rhpp';
    const tables={items:[{id:'d',name:'Bounty',category:'DOC',unit:'ekor'},{id:'v',name:'Vitamin Uji',category:'OVK',unit:'botol'}],logistics_shipments:[{id:'s',contract_assignment_id:'a',shipment_date:'2026-10-02',delivery_number:'DO-001'}],logistics_shipment_items:[{shipment_id:'s',item_id:'d',quantity:8100,unit_price:9000}],logistics_returns:[{id:'r',contract_assignment_id:'a',return_date:'2026-11-01',reference:'RT-001'}],logistics_return_items:[{return_id:'r',item_id:'v',quantity:2,unit_price:10000}],chick_ins:[{contract_assignment_id:'a',received:8100,doa:2}],company_profile:{company_name:'BMS'}};
    db.from=name=>{const q={select:()=>q,order:()=>q,eq:()=>q,maybeSingle:()=>q,then:resolve=>Promise.resolve({data:tables[name]||[]}).then(resolve)};return q};
    db.rpc=async()=>({data:[{contract_assignment_id:'a',active:true,barn_code:'KD-004',barn_name:'Randegan',chick_in_birds:8100,main_doc_cost:72900000,total_harvest_birds:6800,total_harvest_kg:12001.1,net_feed_kg:18200,sapronak_cost:100000000,farmer_profit:1234567}]});
    window.__financeRhppState={assignment:'a'};await financeRhppPage();
  `);
  assert.match(await evaluate("document.querySelector('#rhppExportArea').textContent"),/RT-001.*Vitamin Uji.*botol.*20.000/);
  assert.match(await evaluate("document.querySelector('#rhppExportArea').textContent"),/DOA \(catatan\)/);
  assert.equal(await evaluate("typeof document.querySelector('#rhppPrint').onclick"),'function');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-rhpp-report-group]')].map(g=>g.dataset.rhppReportGroup)"),['supplies','harvest','returns','production','calculation']);
  for(const width of [390,768,1280]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<901});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'RHPP page overflows at '+width);
  }
  await evaluate(`
    const area=document.querySelector('#rhppExportArea'),doc=new DOMParser().parseFromString(rhppDocumentHtml(area,{company_name:'BMS'}),'text/html');
    const cells=node=>[...node.querySelectorAll('th,td')].map(n=>n.textContent);
    if(JSON.stringify(cells(area))!==JSON.stringify(cells(doc)))throw new Error('RHPP print differs from screen');
    if(doc.querySelector('button,select'))throw new Error('RHPP controls leaked into print');
    db.from=window.__rhppSmoke.from;db.rpc=window.__rhppSmoke.rpc;profile=window.__rhppSmoke.profile;tab=window.__rhppSmoke.tab;delete window.__rhppSmoke;login();
  `);
  console.log('PASS: RHPP shipment/return details, DOA note, shared export values and mobile/tablet/desktop layout');
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(__dirname,'output/login-mobile.png'),Buffer.from(shot.data,'base64'));
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  console.log('PASS: mobile login fits a 390px viewport');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{socket?.close();browser.kill('SIGTERM');server.close()});
