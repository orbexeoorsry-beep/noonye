import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AccountStore } from '../server/features/accounts/store';
import { ClassroomStore } from '../server/features/classrooms/store';

test('role dashboards: real school management, scoped histories, SQL progress, revocation and restart', {timeout:120000}, async () => {
  const directory=mkdtempSync(path.join(tmpdir(),'noon-role-dashboard-browser-'));
  const database=path.join(directory,'synthetic.sqlite');
  const password='synthetic-dashboard-browser-password';
  const seed=new AccountStore(database), rooms=new ClassroomStore(seed);
  const school=await seed.bootstrapSchool('role-preview','مدرسة اصطناعية — محلية وتحت المراجعة','role-admin',password,'مدير اصطناعي');
  const foreign=await seed.bootstrapSchool('foreign-preview','مدرسة أخرى معزولة','foreign-admin',password,'مدير مدرسة أخرى');
  const adminToken=await seed.login('role-preview','role-admin',password);
  const foreignToken=await seed.login('foreign-preview','foreign-admin',password);
  const teacher=await seed.createMember(adminToken,school.schoolId,{username:'role-teacher',password,displayName:'معلّم اصطناعي',role:'teacher'});
  const otherTeacher=await seed.createMember(adminToken,school.schoolId,{username:'other-teacher',password,displayName:'معلم فصل غير مسند',role:'teacher'});
  const student=await seed.createMember(adminToken,school.schoolId,{username:'role-student',password,displayName:'طالب اصطناعي أول',role:'student'});
  const peer=await seed.createMember(adminToken,school.schoolId,{username:'role-peer',password,displayName:'طالب اصطناعي آخر',role:'student'});
  const otherClass=rooms.createClass(adminToken,school.schoolId,{name:'فصل آخر غير مسند للمعلم'});
  seed.db.prepare('INSERT INTO class_members(class_id,user_id,role) VALUES(?,?,?)').run(otherClass.id,otherTeacher.id,'teacher');
  const foreignClass=rooms.createClass(foreignToken,foreign.schoolId,{name:'فصل المدرسة الأخرى السري'});
  const foreignTeacher=await seed.createMember(foreignToken,foreign.schoolId,{username:'foreign-teacher',password,displayName:'معلم المدرسة الأخرى',role:'teacher'});
  const foreignStudent=await seed.createMember(foreignToken,foreign.schoolId,{username:'foreign-student',password,displayName:'طالب المدرسة الأخرى',role:'student'});
  for(const member of [foreignTeacher,foreignStudent])seed.db.prepare('INSERT INTO class_members(class_id,user_id,role) VALUES(?,?,?)').run(foreignClass.id,member.id,member.role);
  const ft=await seed.login('foreign-preview','foreign-teacher',password),fs=await seed.login('foreign-preview','foreign-student',password);
  const hiddenReading=rooms.createReading(ft,foreignClass.id,{title:'قراءة مدرسة أخرى غير مرئية',pagesFrom:1,pagesTo:2});
  rooms.completeReading(fs,hiddenReading.id,{submissionId:crypto.randomUUID()});
  seed.close();
  const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=(probe.address() as {port:number}).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
  const origin=`http://127.0.0.1:${port}`;
  let child:ChildProcess|undefined,browser:Browser|undefined,logs='';const outbound:string[]=[],errors:string[]=[];
  async function start(){child=spawn(process.execPath,['server.js'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'production',PORT:String(port),NOON_ACCOUNTS_LOCAL:'1',NOON_LOCAL_ACCOUNTS_DB:database,NOON_LOCAL_ACCOUNTS_ORIGIN:origin},stdio:['ignore','pipe','pipe']});child.stdout!.on('data',d=>logs+=d);child.stderr!.on('data',d=>logs+=d);for(let n=0;n<100;n++){try{if((await fetch(origin+'/api/health')).ok)return;}catch{}if(child.exitCode!==null)throw Error('Loopback server failed');await new Promise(r=>setTimeout(r,75));}throw Error('Loopback server not ready');}
  async function stop(){const current=child;if(!current||current.exitCode!==null)return;await new Promise<void>(resolve=>{const timer=setTimeout(()=>current.kill('SIGKILL'),2500);current.once('exit',()=>{clearTimeout(timer);resolve();});current.kill('SIGTERM');});}
  async function context(){const ctx=await browser!.newContext({viewport:{width:1100,height:950},locale:'ar',serviceWorkers:'block'});await ctx.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){outbound.push(route.request().url());return route.abort();}return route.continue();});return ctx;}
  async function signIn(ctx:BrowserContext,username:string){const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>void d.accept());await page.goto(origin+'/accounts');const form=page.locator('section').filter({has:page.getByRole('heading',{name:'تسجيل الدخول',exact:true})});await form.getByLabel('رمز المدرسة').fill('role-preview');await form.getByLabel('اسم المستخدم',{exact:true}).fill(username);await form.getByLabel('كلمة المرور',{exact:true}).fill(password);await form.getByRole('button',{name:'دخول',exact:true}).click();await page.getByTestId('accounts-workspace').waitFor();return page;}
  async function stat(page:Page,key:string,value:number){await page.waitForFunction(({key,value})=>{const element=document.querySelector(`[data-testid="dashboard-stat-${key}"]`);if(!element)return false;const text=(element.textContent||'').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[%٪\s]/g,'');return Number(text)===value;},{key,value},{timeout:12000});}
  async function mutate(page:Page,url:string,body:unknown){return page.evaluate(async({url,body})=>{const me=await(await fetch('/api/accounts/me')).json();const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':me.csrfToken},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};},{url,body});}
  async function assign(page:Page,classId:string,userId:string){await page.getByTestId('class-selector').selectOption(classId);await page.getByTestId('member-selector').selectOption(userId);const wait=page.waitForResponse(r=>r.url().endsWith(`/classes/${classId}/members`)&&r.request().method()==='POST');await page.getByTestId('assign-member-button').click();assert.ok([200,201].includes((await wait).status()));await page.getByTestId(`remove-member-${userId}`).waitFor();}
  async function reading(page:Page,title:string,from:string,to:string){await page.getByPlaceholder('عنوان القراءة',{exact:true}).fill(title);await page.getByLabel('من صفحة',{exact:true}).fill(from);await page.getByLabel('إلى صفحة',{exact:true}).fill(to);const wait=page.waitForResponse(r=>r.url().endsWith('/readings')&&r.request().method()==='POST');await page.getByRole('button',{name:'إسناد قراءة للفصل',exact:true}).click();const r=await wait;assert.equal(r.status(),201);const data=await r.json();await page.locator(`[data-reading-id="${data.reading.id}"]`).waitFor();return data.reading;}
  async function reloadClass(page:Page,classId:string){await page.reload();await page.getByTestId('class-selector').selectOption(classId);}
  async function capture(page:Page,name:string){const folder=process.env.DASHBOARD_PREVIEW_EVIDENCE;if(!folder)return;mkdirSync(folder,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(folder,name),fullPage:true});}
  async function rejectMalformedAdminSnapshots(page:Page) {
    // Negative tests only: corrupt a real synthetic response, never a preview/success state.
    const corruptions: Array<[string,(body:any)=>void]> = [
      ['missing members',body=>{delete body.members;}],
      ['missing memberships',body=>{delete body.memberships;}],
      ['non-array members',body=>{body.members={};}],
      ['null memberships',body=>{body.memberships=null;}],
      ['null member',body=>{body.members=[null];}],
      ['null membership',body=>{body.memberships=[null];}],
      ['invalid member role',body=>{body.members[0].role='school_admin';}],
      ['invalid membership ID',body=>{body.memberships[0].userId='not-an-id';}],
      ['invalid member name',body=>{body.members[0].displayName=null;}],
    ];
    for (const [name,corrupt] of corruptions) {
      await page.route('**/api/accounts/dashboard',async route=>{
        const response=await route.fetch(),body=await response.json();
        corrupt(body);
        await route.fulfill({response,json:body});
      });
      await page.getByTestId('dashboard-refresh').click();
      await page.getByRole('alert').filter({hasText:'استجابة بيانات اللوحة غير صالحة'}).waitFor();
      assert.equal(await page.getByTestId('dashboard-stat-members').count(),0,name);
      assert.equal(await page.getByTestId('member-selector').count(),0,name);
      await page.unroute('**/api/accounts/dashboard');
      await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();
      await stat(page,'members',4);
    }
  }
  try{
    await start();browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    const adminCtx=await context(),admin=await signIn(adminCtx,'role-admin');await admin.getByTestId('admin-dashboard').waitFor();await stat(admin,'classes',1);await stat(admin,'members',4);
    await rejectMalformedAdminSnapshots(admin);
    await admin.getByPlaceholder('الاسم الظاهر',{exact:true}).fill('طالب اصطناعي غير مسند');await admin.getByPlaceholder('اسم المستخدم',{exact:true}).fill('role-unassigned');await admin.getByPlaceholder('كلمة المرور',{exact:true}).fill(password);await admin.getByRole('button',{name:'إنشاء الحساب',exact:true}).click();await stat(admin,'students',3);await stat(admin,'members',5);
    await admin.getByPlaceholder('اسم الفصل',{exact:true}).fill('فصل العرض المحلي');const classWait=admin.waitForResponse(r=>r.url().endsWith('/classes')&&r.request().method()==='POST');await admin.getByRole('button',{name:'إنشاء فصل',exact:true}).click();const classroom=(await(await classWait).json()).classroom;await stat(admin,'classes',2);
    await admin.getByTestId('class-selector').selectOption(classroom.id);await admin.getByTestId('rename-class-input').fill('الفصل التجريبي — بيانات اصطناعية');await admin.getByTestId('rename-class-button').click();
    await assign(admin,classroom.id,teacher.id);await assign(admin,classroom.id,student.id);await assign(admin,classroom.id,peer.id);
    const teacherCtx=await context(),teacherPage=await signIn(teacherCtx,'role-teacher');await teacherPage.getByTestId('teacher-dashboard').waitFor();await stat(teacherPage,'classes',1);await stat(teacherPage,'students',2);await teacherPage.getByTestId('class-selector').selectOption(classroom.id);
    assert.ok(!(await teacherPage.getByTestId('class-selector').innerText()).includes(otherClass.name));assert.equal(await teacherPage.getByTestId('admin-dashboard').count(),0);
    const first=await reading(teacherPage,'قراءة أولى — صفحات ٢ إلى ٤','2','4');await stat(teacherPage,'readings',1);
    const peerCtx=await context(),peerPage=await signIn(peerCtx,'role-peer');assert.equal((await mutate(peerPage,`/api/readings/${first.id}/completion`,{submissionId:crypto.randomUUID()})).status,201);
    const studentCtx=await context(),studentPage=await signIn(studentCtx,'role-student');await studentPage.getByTestId('student-dashboard').waitFor();await studentPage.getByTestId('class-selector').selectOption(classroom.id);await stat(studentPage,'readings',1);await stat(studentPage,'completions',0);await stat(studentPage,'completionPercent',0);
    assert.ok(!(await studentPage.locator('body').innerText()).includes(peer.displayName));assert.equal(await studentPage.getByTestId('teacher-dashboard').count(),0);
    await studentPage.locator(`[data-reading-id="${first.id}"]`).getByTestId('completion-button').click();await stat(studentPage,'completions',1);await stat(studentPage,'completionPercent',100);
    await reading(teacherPage,'قراءة ثانية — لم تُتمّ بعد','8','9');await reloadClass(studentPage,classroom.id);await stat(studentPage,'readings',2);await stat(studentPage,'completions',1);await stat(studentPage,'pending',1);await stat(studentPage,'completionPercent',50);await studentPage.locator(`[data-reading-id="${first.id}"]`).getByTestId('completion-status').filter({hasText:'محفوظ'}).waitFor();
    await reloadClass(admin,classroom.id);const remove=admin.waitForResponse(r=>r.url().endsWith(`/members/${peer.id}`)&&r.request().method()==='DELETE');await admin.getByTestId(`remove-member-${peer.id}`).click();assert.equal((await remove).status(),204);await peerPage.reload();await stat(peerPage,'classes',0);await stat(peerPage,'readings',0);await stat(peerPage,'completions',0);
    await reloadClass(teacherPage,classroom.id);await stat(teacherPage,'students',1);await stat(teacherPage,'completions',1);await assign(admin,classroom.id,peer.id);await peerPage.reload();await stat(peerPage,'completions',1);
    await stop();await start();await reloadClass(admin,classroom.id);await reloadClass(teacherPage,classroom.id);await reloadClass(studentPage,classroom.id);await stat(admin,'students',3);await stat(admin,'completions',2);await stat(teacherPage,'students',2);await stat(teacherPage,'completions',2);await stat(studentPage,'completionPercent',50);
    const card=teacherPage.locator(`[data-reading-id="${first.id}"]`);await card.getByRole('button',{name:'عرض الإتمامات',exact:true}).click();await teacherPage.getByText(student.displayName,{exact:false}).first().waitFor();
    assert.ok(!(await teacherPage.locator('body').innerText()).includes('طالب المدرسة الأخرى'));assert.ok(!(await studentPage.locator('body').innerText()).includes(peer.displayName));
    const observedStats={school:await admin.evaluate(async()=> (await(await fetch('/api/accounts/dashboard')).json()).stats),teacher:await teacherPage.evaluate(async()=> (await(await fetch('/api/accounts/dashboard')).json()).stats),student:await studentPage.evaluate(async()=> (await(await fetch('/api/accounts/dashboard')).json()).stats)};
    await capture(admin,'01-school-admin-dashboard.png');await capture(teacherPage,'02-teacher-dashboard-history.png');await capture(studentPage,'03-student-real-progress.png');
    await admin.getByTestId('logout-button').click();await admin.getByTestId('accounts-workspace').waitFor({state:'detached'});await admin.close();const sharedStudent=await signIn(adminCtx,'role-student');await stat(sharedStudent,'completionPercent',50);assert.equal(await sharedStudent.getByTestId('admin-dashboard').count(),0);assert.ok(!(await sharedStudent.locator('body').innerText()).includes('طالب اصطناعي غير مسند'));
    await sharedStudent.route('**/api/accounts/dashboard',route=>route.abort('failed'));
    await sharedStudent.getByTestId('dashboard-refresh').click();
    await sharedStudent.getByRole('alert').waitFor();
    assert.equal(await sharedStudent.getByTestId('dashboard-stat-completions').count(),0,'failure must not display invented zero or stale numbers');
    await sharedStudent.unroute('**/api/accounts/dashboard');
    await sharedStudent.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();
    await stat(sharedStudent,'completionPercent',50);
    assert.deepEqual(errors,[]);assert.deepEqual(outbound,[]);assert.ok(!logs.includes(password));
    const inspect=new AccountStore(database);assert.equal((inspect.db.prepare('SELECT COUNT(*) AS n FROM completions').get() as {n:number}).n,3);inspect.close();
    if(process.env.DASHBOARD_PREVIEW_EVIDENCE)writeFileSync(path.join(process.env.DASHBOARD_PREVIEW_EVIDENCE,'preview-evidence.json'),JSON.stringify({mode:'loopback-only; synthetic accounts; SQLite-derived figures; under independent review',...observedStats,verified:['UI create account/class/rename/assign/withdraw/re-add','student cannot see peer completions or other school','teacher cannot see other class or school','restart persists sessions and progress','same-device logout clears role panel','network failure hides stale or invented numbers and retry restores SQL data'],externalRequests:outbound.length},null,2)+'\n');
  }finally{await browser?.close();await stop();/* Retain only synthetic temporary fixtures; never remove existing files/artifacts. */}
});
