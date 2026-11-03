import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const evidence = path.resolve(process.env.PWA_EVIDENCE || 'test-evidence/pwa');
await mkdir(evidence, { recursive:true });
const tmp = await mkdtemp(path.join(os.tmpdir(),'noon-pwa-test-'));
const A=path.join(tmp,'A'), B=path.join(tmp,'B');
await cp('dist',path.join(A,'dist'),{recursive:true});
await cp('dist',path.join(B,'dist'),{recursive:true});
await writeFile(path.join(B,'dist/index.html'),(await readFile(path.join(B,'dist/index.html'),'utf8')).replace('</head>','<meta name="synthetic-release" content="B" /></head>'));
execFileSync(process.execPath,[path.resolve('scripts/generate-pwa-sw.mjs')],{cwd:B});
let active=A, blocked=null, corrupt=false;
const requests=[];
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost'); requests.push({path:u.pathname,method:req.method});
  if(u.pathname===blocked){res.writeHead(corrupt?200:503,{'Cache-Control':'no-store','Content-Type':'application/manifest+json'});res.end(corrupt?'SYNTHETIC_PRIVATE_SENTINEL':'Synthetic missing asset');return;}
  if (/^\/(api|profile|account|settings|students|uploads)(\/|$)/.test(u.pathname)||u.pathname.endsWith('.pdf')) { res.writeHead(200,{'Content-Type':u.pathname.endsWith('.pdf')?'application/pdf':'application/json','Cache-Control':'no-store'});res.end('SYNTHETIC_PRIVATE_SENTINEL');return; }
  try {
    const f=path.join(active,'dist',u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
    if(!f.startsWith(path.join(active,'dist')+'/'))throw Error('Path');
    const body=await readFile(f);
    const type= f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':/\.(m?js)$/.test(f)?'text/javascript':f.endsWith('.png')?'image/png':f.endsWith('.webmanifest')?'application/manifest+json':'application/octet-stream';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Service-Worker-Allowed':'/'});res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;

const results={origin,tests:[],audits:{},externalRequests:[]};
const pass=(s)=>{results.tests.push(s);console.log('PASS '+s);};
const poll=async(fn,message)=>{for(let i=0;i<150;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error(message);};
const cacheState=page=>page.evaluate(async()=>{const out={};for(const name of await caches.keys()){const c=await caches.open(name);out[name]=await Promise.all((await c.keys()).map(async r=>({url:r.url,text:(await c.match(r)).headers.get('content-type')})));}return out;});
const ownNames=async page=>Object.keys(await cacheState(page)).filter(x=>x.startsWith('noon-shell-'));
let context;
try {
  for(const lang of ['ar','en']) {
    context=await chromium.launchPersistentContext(path.join(tmp,'profile-'+lang),{headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await context.addInitScript(lang=>{localStorage.setItem('noon_language',lang);window.__installPrompt=false;window.addEventListener('beforeinstallprompt',()=>window.__installPrompt=true);},lang);
    const page=await context.newPage();
    page.on('request',r=>{if(new URL(r.url()).origin!==origin)results.externalRequests.push(r.url());});
    await page.goto(origin);await page.locator('main').waitFor();
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await page.reload();
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.equal(await page.locator('html').getAttribute('dir'),lang==='ar'?'rtl':'ltr');
    const layout=async label=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${lang} ${label} horizontal overflow`);await page.screenshot({path:path.join(evidence,`mobile-${lang}-${label}.png`),fullPage:true});};
    await layout('home');
    const nav=page.getByRole('navigation',{name:lang==='ar'?'التنقل الرئيسي':'Main navigation',exact:true});
    await nav.getByRole('button').nth(1).click();await layout('library');
    await nav.getByRole('button').nth(2).click();await layout('progress');
    await page.goto(origin+'/#add-book');await page.locator('input[type=file]').waitFor({state:'attached'});await layout('add-book');
    await page.goto(origin);await page.getByRole('button',{name:lang==='ar'?'الإعدادات':'Settings',exact:true}).click();await layout('settings');
    await page.goto(origin);
    const cdp=await context.newCDPSession(page);
    const manifestAudit=await cdp.send('Page.getAppManifest');
    const installability=await cdp.send('Page.getInstallabilityErrors');
    results.audits[lang]={manifest:manifestAudit,installability,beforeinstallprompt:await page.evaluate(()=>window.__installPrompt)};
    assert.deepEqual(manifestAudit.errors,[]);
    assert.deepEqual(installability.installabilityErrors,[]);
    const manifest=JSON.parse(manifestAudit.data);
    assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
    for(const size of [192,512])assert.ok(manifest.icons.some(i=>i.sizes===`${size}x${size}`));
    assert.ok(await page.locator('link[rel=apple-touch-icon]').count());
    assert.ok(await page.locator('meta[name=theme-color]').count());
    pass(`${lang}: 390x844 direction, home/library/progress/add-book/settings without horizontal overflow; Chromium manifest/installability CDP audits clean`);
    if(lang==='ar'){await context.close();context=null;continue;}
    // Persist a valid synthetic PDF through the real file-input/IndexedDB flow.
    const stream='BT /F1 18 Tf 40 740 Td (SYNTHETIC PWA PDF ONLY) Tj ET';
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    await page.goto(origin+'/#add-book');
    await page.locator('input[type=file]').setInputFiles({name:'Synthetic-PWA-Only.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
    await page.getByRole('button',{name:/Open Book in Viewer|فتح الكتاب/}).waitFor({timeout:20000});
    await page.getByRole('button',{name:/Open Book in Viewer|فتح الكتاب/}).click();
    await page.locator('canvas').first().waitFor({timeout:15000});
    await page.screenshot({path:path.join(evidence,'synthetic-pdf-online.png'),fullPage:true});
    const idbRead=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('noon_learning_db',2);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('documents_blobs');const q=tx.objectStore('documents_blobs').getAll();q.onsuccess=async()=>{const vals=await Promise.all(q.result.map(async x=>({id:x.id,text:await x.blob.text(),size:x.blob.size})));db.close();resolve(vals);};};}));
    const before=await idbRead();assert.ok(before.some(x=>x.text.includes('SYNTHETIC PWA PDF ONLY')));
    await page.goto(origin);
    const sensitive=['/api/student','/profile','/account','/settings','/students/fixture','/uploads/fixture.pdf','/fixture.pdf','/?student=fixture'];
    await page.evaluate(async paths=>{for(const p of paths){await fetch(p);await fetch(p,{method:'POST',body:'SYNTHETIC_ONLY'});}},sensitive);
    const cacheA=await cacheState(page);await writeFile(path.join(evidence,'cache-A.json'),JSON.stringify(cacheA,null,2));
    assert.equal((await ownNames(page)).length,1);
    for(const entries of Object.values(cacheA))for(const e of entries){const u=new URL(e.url);assert.equal(u.origin,origin);assert.ok(u.pathname==='/'||u.pathname==='/manifest.webmanifest'||u.pathname.startsWith('/assets/')||u.pathname.startsWith('/icons/'));assert.equal(u.search,'');assert.ok(!u.pathname.endsWith('.pdf'));}
    for(const name of await page.evaluate(()=>caches.keys())){const leaks=await page.evaluate(async n=>{const c=await caches.open(n);for(const r of await c.keys()){const text=await (await c.match(r)).text();if(text.includes('SYNTHETIC_PRIVATE_SENTINEL')||text.includes('SYNTHETIC PWA PDF ONLY'))return true;}return false;},name);assert.equal(leaks,false);}
    pass('Cache API contains only explicit static shell/assets; no synthetic API/profile/settings/PDF/student response or content');
    await context.setOffline(true);await page.reload();await page.locator('main').waitFor();
    assert.deepEqual(await idbRead(),before);
    for(const p of sensitive){assert.equal(await page.evaluate(async p=>{try{await fetch(p);return true;}catch{return false;}},p),false,`sensitive offline ${p}`);}
    for(const headers of [{Authorization:'Bearer SYNTHETIC_ONLY'},{Range:'bytes=0-50'}])assert.equal(await page.evaluate(async headers=>{try{await fetch('/',{headers});return true;}catch{return false;}},headers),false,'Authorization/Range must bypass offline cache');
    const staticJs=Object.values(cacheA).flat().find(e=>new URL(e.url).pathname.endsWith('.js')).url;
    assert.equal(await page.evaluate(async u=>{try{await fetch(u+'?private=fixture');return true;}catch{return false;}},staticJs),false,'Static asset query must bypass cache');
    await page.screenshot({path:path.join(evidence,'offline-shell.png'),fullPage:true});
    // A previously saved PDF remains locally available, not copied into Cache API.
    const nav2=page.getByRole('navigation',{name:'Main navigation',exact:true});await nav2.getByRole('button').nth(1).click();
    await page.getByText('Synthetic-PWA-Only',{exact:true}).first().click();
    await page.locator('canvas').first().waitFor({timeout:15000});
    await poll(()=>page.locator('canvas').first().evaluate(c=>{const ctx=c.getContext('2d'),p=ctx.getImageData(0,0,c.width,c.height).data;let light=0,dark=0;for(let i=0;i<p.length;i+=4){if(p[i+3]&&p[i]>230)light++;if(p[i+3]&&p[i]<80)dark++;}return light>100&&dark>20;}),'Offline synthetic PDF canvas not actually rendered');
    await page.screenshot({path:path.join(evidence,'synthetic-pdf-offline.png'),fullPage:true});
    pass('Offline root shell loads; sensitive paths/queries fail network-only; existing IndexedDB synthetic PDF retained and opened offline');
    await context.setOffline(false);await page.goto(origin);
    const oldNames=await ownNames(page);
    await page.evaluate(async()=>{const c=await caches.open('unrelated-cache-test');await c.put('/unrelated-static',new Response('synthetic'));});
    // A broken new release must not remove the active cache.
    active=B;blocked='/manifest.webmanifest';
    await page.evaluate(async()=>{try{await (await navigator.serviceWorker.getRegistration()).update();}catch{}});
    await poll(async()=>{const st=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.installing&&!r.waiting;});return st;},'Broken update settled');
    assert.deepEqual(await ownNames(page),oldNames);pass('Failed new release install preserves active cache (atomic failure rollback)');
    corrupt=true;
    await page.evaluate(async()=>{try{await (await navigator.serviceWorker.getRegistration()).update();}catch{}});
    await poll(()=>page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.installing&&!r.waiting;}),'Integrity rejection settled');
    assert.deepEqual(await ownNames(page),oldNames);
    pass('HTTP 200 substituted/personalized asset fails build-integrity validation; old cache preserved');
    blocked=null;corrupt=false;
    await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
    await poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),'Updated release did not wait');
    assert.deepEqual(await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {active:r.active.state,waiting:r.waiting.state};}),{active:'activated',waiting:'installed'});
    pass('Successful B update waits; active page not force-reloaded or skipWaiting');
    await page.close();await new Promise(r=>setTimeout(r,400));
    const next=await context.newPage();await next.goto(origin);await next.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await poll(async()=>{const n=await ownNames(next);return n.length===1&&n[0]!==oldNames[0];},'B did not activate/clean A');
    assert.ok((await next.evaluate(()=>caches.keys())).includes('unrelated-cache-test'));
    assert.deepEqual(await next.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('noon_learning_db',2);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('documents_blobs').objectStore('documents_blobs').getAll();q.onsuccess=async()=>{const out=await Promise.all(q.result.map(async x=>({id:x.id,text:await x.blob.text(),size:x.blob.size})));db.close();resolve(out);};};})),before);
    await writeFile(path.join(evidence,'cache-B.json'),JSON.stringify(await cacheState(next),null,2));
    pass('B activation removes old own-prefix A cache only; unrelated cache and IndexedDB preserved');
    active=A;await next.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
    await poll(()=>next.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),'Rollback A not waiting');
    await next.close();await new Promise(r=>setTimeout(r,400));const rolled=await context.newPage();await rolled.goto(origin);await rolled.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await poll(async()=>JSON.stringify(await ownNames(rolled))===JSON.stringify(oldNames),'Rollback failed');
    await context.setOffline(true);await rolled.reload();await rolled.locator('main').waitFor();
    await writeFile(path.join(evidence,'cache-rollback.json'),JSON.stringify(await cacheState(rolled),null,2));
    pass('Rollback to exact A activates on fresh load, cleans B, and restores usable offline shell');
    await context.close();context=null;
  }
  results.ok=true;
} catch(error){results.ok=false;results.error=String(error.stack||error);const last=context?.pages().at(-1);if(last){await last.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});results.failureBody=await last.locator('body').innerText().catch(()=>null);}throw error;} finally {
  results.requests=requests;await writeFile(path.join(evidence,'pwa-browser-results.json'),JSON.stringify(results,null,2));
  await context?.close();await new Promise(r=>server.close(r));await rm(tmp,{recursive:true,force:true});
}
