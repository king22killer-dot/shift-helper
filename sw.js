const CACHE='shift-helper-v21';
const ASSETS=['./','./index.html','./manifest.json','./icon-180.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('shift-helper-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  // 圖示字型（Google Fonts）先用快取，離線也有圖示
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(ch=>ch.put(req,c)).catch(()=>{});return r;})));
    return;
  }
  if(u.origin!==location.origin)return;
  // 待辦的行事曆檔：App 把內容放在 ?d=（base64url），這裡轉成真正的 .ics 回應，iPhone 才會出現「加入行事曆」
  if(u.pathname.endsWith('/todo.ics')){
    const d=(u.searchParams.get('d')||'').replace(/-/g,'+').replace(/_/g,'/');
    let body='';
    try{const bin=atob(d+'==='.slice((d.length+3)%4));body=Uint8Array.from(bin,c=>c.charCodeAt(0))}catch(err){}
    e.respondWith(new Response(body,{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'inline; filename="todo.ics"'}}));
    return;
  }
  e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(ch=>ch.put(req,c)).catch(()=>{});return r;}).catch(()=>caches.match(req)));
});
