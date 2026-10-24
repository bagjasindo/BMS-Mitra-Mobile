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
  for(const name of ['/main-2321.js','/bms-core.js','/bms-data-config.js','/vendor/supabase-2.57.0.js'])assert.ok(shell.includes(name),name+' was not cached');
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
  const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(__dirname,'output/login-mobile.png'),Buffer.from(shot.data,'base64'));
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  console.log('PASS: mobile login fits a 390px viewport');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{socket?.close();browser.kill('SIGTERM');server.close()});
