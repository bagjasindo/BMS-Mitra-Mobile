const CACHE_PREFIX='bms-pwa-shell-';
const CACHE_NAME=CACHE_PREFIX+'v2387-expedition-date-order';
const SHELL=[
  './',
  './index.html',
  './style.css?v=2386-classic-restored',
  './mobile-form-responsive.css?v=2386-classic-restored',
  './vendor/supabase-2.57.0.js',
  './bms-data-config.js?v=2386-classic-restored',
  './bms-core.js?v=2386-classic-restored',
  './main-2321.js?v=2386-classic-restored',
  './modules/bms-master-logistics.js?v=2386-classic-restored',
  './modules/bms-production.js?v=2386-classic-restored',
  './modules/bms-finance.js?v=2387-expedition-date-order',
  './modules/bms-admin.js?v=2386-classic-restored',
  './modules/bms-rhpp-users.js?v=2386-classic-restored',
  './modules/bms-dashboard-reports.js?v=2386-classic-restored',
  './bms-start.js?v=2386-classic-restored',
  './assets/bms_login_logo.jpg',
  './assets/bms_app_icon_180.png?v=6-original-20261001',
  './assets/bms_app_icon_192.png?v=6-original-20261001',
  './assets/bms_app_icon_512.png?v=6-original-20261001',
  './assets/bms_express_logo.jpg',
  './assets/bms_favicon.ico?v=7-desktop',
  './manifest.webmanifest?v=6-original-20261001'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Never cache API responses or another application's resources.
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        if(!res.ok)return res;
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy)).catch(()=>{});
        return res;
      }).catch(async()=>await caches.match('./index.html')||new Response('Aplikasi belum tersedia. Sambungkan internet lalu muat ulang.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}}))
    );
    return;
  }

  if(url.origin===self.location.origin && (
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.webmanifest')
  )){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(res=>{
        if(!res.ok)return res;
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
        return res;
      }).catch(async()=>await caches.match(req)||new Response('Komponen belum tersedia.',{status:503}))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      if(res.ok&&url.origin===self.location.origin){
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});
      }
      return res;
    }))
  );
});


self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});
