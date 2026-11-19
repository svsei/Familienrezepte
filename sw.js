/* App-Shell & öffentliche Food-Fotos offline zwischenspeichern.
   Private Rezepte und Supabase-API-Antworten werden NIE durch diesen Service Worker gecacht. */
const CACHE='familienkueche-static-v4-2';
const ASSETS=['./','./index.html','./styles.css','./config.js','./cloud.js','./app.js','./recipe-admin.js','./recipe-admin.css','./images/rezept-neu.svg','./manifest.webmanifest','./icon-192.png','./icon-512.png',
 ...['soba','mujadara','kokos','blumenkohl','lachs','shawarma','rigatoni','paccheri','koefte','roesti','airfryer','brot','hummus','edamame-creme','paprika-creme','hafer-beere','hafer-overnight','hafer-birne','hafer-mango','hafer-apfel','hafer-chia','hafer-schoko','hafer-kuerbis'].map(n=>'./images/'+n+'.webp')];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 // Network first: Konfiguration & App-Code nicht ewig veralten lassen.
 const path=new URL(e.request.url).pathname;
 const code=/\/(index\.html|config\.js|cloud\.js|app\.js|recipe-admin\.js|recipe-admin\.css|styles\.css)$/.test(path)||path==='/';
 if(code){e.respondWith(fetch(e.request).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(e.request,res.clone()));return res}).catch(()=>caches.match(e.request)));return;}
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(e.request,res.clone()));return res})));
});
