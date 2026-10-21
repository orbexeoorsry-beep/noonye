import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const port=43000+Math.floor(Math.random()*10000);
const server=spawn('node_modules/.bin/tsx',['server.ts'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'development'},stdio:'ignore'});
let browser;
try {
 let ready=false; for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,100));} assert.ok(ready,'local app did not become ready');
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']}); const page=await browser.newPage(); const requests=[]; page.on('request',r=>{if(r.url().includes('/api/assistant/explain'))requests.push(r.url());}); await page.goto(`http://127.0.0.1:${port}/`);
 await page.locator('button').filter({hasText:/Continue Reading|متابعة القراءة/}).first().click();
 const button=page.locator('button[title="Assistant temporarily unavailable"]'); await button.waitFor({state:'attached',timeout:15000});
 const controls=await button.evaluate(el=>{let count=0;el.addEventListener('click',()=>count++); el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); el.focus();el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));el.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));return {disabled:el.disabled,ariaDisabled:el.getAttribute('aria-disabled'),clickCount:count};});
 assert.equal(controls.disabled,true); assert.equal(controls.ariaDisabled,'true'); await button.click({force:true}).catch(()=>{}); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
 const result=await page.evaluate(async()=>{const {aiGateway}=await import('/src/services/aiGateway.ts');const original=window.fetch;let fetchCalls=0;window.fetch=(...args)=>{fetchCalls++;return original(...args);};const common={pageNumber:2,selectionType:'text',language:'en',bookTitle:'Synthetic book',lessonTitle:'Synthetic lesson',lessonContext:'Synthetic lesson context',studentLevel:'Synthetic level'};const text=await aiGateway.execute('explain',{...common,selectedText:'Synthetic question'});const image=await aiGateway.execute('explainImage',{...common,selectedImage:'data:image/png;base64,c3ludGhldGlj',selectionType:'image'});window.fetch=original;return {fetchCalls,textSuccess:text.success,imageSuccess:image.success};});
 assert.deepEqual(result,{fetchCalls:0,textSuccess:false,imageSuccess:false});assert.equal(requests.length,0); console.log('PASS: actual disabled assistant UI control blocked DOM click/Enter/Space/forced click; synthetic text/image/context gateway issued zero fetch and zero /api/assistant/explain requests');
} finally {await browser?.close();server.kill('SIGTERM');}
