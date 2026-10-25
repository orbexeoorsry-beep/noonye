import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const port = 32000 + Math.floor(Math.random() * 10000);
const instrumentation = path.join(tmpdir(), `noon-assistant-preload-${process.pid}.mjs`);
const countsFile = path.join(tmpdir(), `noon-assistant-counts-${process.pid}.json`);
writeFileSync(instrumentation, `
import express from ${JSON.stringify(import.meta.resolve('express'))};
import fs from 'node:fs';
import http from 'node:http'; import https from 'node:https'; import net from 'node:net';
const counts = { parser: 0, outbound: [] };
const persist=()=>fs.writeFileSync(${JSON.stringify(countsFile)},JSON.stringify(counts));
const originalJson = express.json;
express.json = (...args) => { const middleware = originalJson(...args); return (req,res,next) => { counts.parser++; persist(); middleware(req,res,next); }; };
for (const mod of [http, https]) { const old=mod.request; mod.request=function(...args){ if(!String(args[0]).includes('127.0.0.1')&&!String(args[0]).includes('localhost')){counts.outbound.push('http.request');persist();} return old.apply(this,args); }; }
const oldFetch=globalThis.fetch; globalThis.fetch=(...args)=>{ counts.outbound.push('fetch'); persist(); return oldFetch(...args); };
const oldConnect=net.connect; net.connect=function(...args){ counts.outbound.push('net.connect'); persist(); return oldConnect.apply(this,args); };
process.on('exit',persist);
`);
writeFileSync(countsFile, JSON.stringify({ parser: 0, outbound: [] }));
const child = spawn('node', ['--import', instrumentation, 'server.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'production' }, stdio: ['ignore','pipe','pipe'] });
let logs=''; child.stdout.on('data',x=>logs+=x); child.stderr.on('data',x=>logs+=x);
function req(body?:string, headers:Record<string,string>={}) { return new Promise<{status:number,text:string}>((resolve,reject)=>{const r=http.request({hostname:'127.0.0.1',port,path:'/api/assistant/explain',method:'POST',headers:{...headers,...(body===undefined?{}:{'content-type':'application/json','content-length':String(Buffer.byteLength(body))})}},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode||0,text}));});r.on('error',reject);if(body!==undefined)r.end(body);else r.end();});}
try {
 let ready=false; for(let i=0;i<100;i++){try{const r=await req('{}');if(r.status===503){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,100));} assert.ok(ready,'production server not ready');
 for(const body of ['{"selectedText":"SYNTHETIC_SECRET_TEXT"}','{malformed SYNTHETIC_MALFORMED}','x'.repeat(6*1024*1024)]){const r=await req(body);assert.deepEqual(r,{status:503,text:'Assistant unavailable'});}
 const head=http.request({hostname:'127.0.0.1',port,path:'/api/assistant/explain',method:'POST',headers:{'content-type':'application/json','transfer-encoding':'chunked'}}); const response=await new Promise<number>((resolve,reject)=>{head.on('response',r=>{r.resume();r.on('end',()=>resolve(r.statusCode||0));});head.on('error',reject);head.flushHeaders();}); assert.equal(response,503,'headers-only stream rejected before any body');
 await new Promise(r=>setTimeout(r,100)); const exited=once(child,'exit').catch(()=>{}); child.kill('SIGTERM'); await Promise.race([exited,new Promise(r=>setTimeout(r,1000))]);
 const stats=JSON.parse(readFileSync(countsFile,'utf8')); assert.equal(stats.parser,0,'express.json parser must never run on blocked endpoint'); assert.deepEqual(stats.outbound,[],'server must make no outbound network attempts');
 assert.ok(!logs.includes('SYNTHETIC_SECRET_TEXT')&&!logs.includes('SYNTHETIC_MALFORMED')&&!logs.includes('entity.parse.failed'));
 console.log(`PASS production server: valid/malformed/6MiB/header-only all 503; parser invocations=${stats.parser}; outbound attempts=${stats.outbound.length}; no body/error logs`);
} finally { if(child.exitCode===null){const exited=once(child,'exit').catch(()=>{});child.kill('SIGTERM');await Promise.race([exited,new Promise(r=>setTimeout(r,1000))]);} try{unlinkSync(instrumentation);unlinkSync(countsFile);}catch{} }
