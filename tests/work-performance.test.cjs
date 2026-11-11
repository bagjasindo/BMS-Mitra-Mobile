const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../modules/bms-performance.js'),'utf8');
const ctx=vm.createContext({BMSCore:require('../bms-core.js'),esc:v=>String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])),fmtNumber:v=>new Intl.NumberFormat('id-ID').format(v)});
vm.runInContext(source,ctx);
const payload={from:'2026-11-01',to:'2026-11-03',users:[{id:'A',name:'A',role:'PPL'},{id:'B',name:'B',role:'KEUANGAN'},{id:'C',name:'C',role:'PPL'}],stats:[{actor:'A',category:'PPL',input_date:'2026-11-01',new_count:4,on_time:1,late:2,unassessed:1,delay_days:3,changed_count:2,deleted_count:1},{actor:'A',category:'LOGISTIK',input_date:'2026-11-02',new_count:1,on_time:1},{actor:'B',category:'KEUANGAN',input_date:'2026-11-03',new_count:3,on_time:3}]};
test('performance rates exclude unassessed inputs; no-event accounts have no score',()=>{
 const x=ctx.summarizeWorkPerformance(payload);assert.equal(x.total.new_count,8);assert.equal(x.total.assessed,7);assert.equal(x.total.rate,5/7*100);assert.equal(x.total.delay,3/7);assert.equal(x.users.find(u=>u.id==='C').rate,null);assert.equal(x.users.find(u=>u.id==='C').delay,null);assert.equal(x.total.changed_count,2);
});
test('performance filters keep role, actor and work category distinct',()=>{
 const x=ctx.summarizeWorkPerformance(payload,{role:'PPL',actor:'A',category:'LOGISTIK'});assert.equal(x.total.new_count,1);assert.equal(x.total.rate,100);assert.equal(x.categories.length,1);assert.equal(x.users.length,1);
 const none=ctx.summarizeWorkPerformance(payload,{role:'KEUANGAN',actor:'A'});assert.equal(none.users.length,0);assert.equal(none.total.rate,null);
});
test('daily chart preserves missing audit days, numeric values and accessible labels',()=>{
 const x=ctx.summarizeWorkPerformance(payload,{actor:'A',category:'PPL'});assert.equal(x.daily.length,3);assert.equal(x.daily[1].new_count,0);const svg=ctx.workPerformanceTrend(x.daily);assert.match(svg,/role="img"/);assert.match(svg,/2026-11-01/);assert.match(svg,/Belum dinilai: 1/);
 assert.match(ctx.workPerformanceTrend([]),/Belum ada input/);
});
test('graph labels are escaped and percentage bars use fixed 100 percent scale',()=>{
 const html=ctx.workPerformanceBars([{name:'<img src=x onerror=alert(1)>',rate:25}],'name','rate',true);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.match(html,/width:25%/);assert.match(html,/25%<\/strong>/);
});
test('performance navigation is Admin-only even though Owner has general read-only access',()=>{
 const main=fs.readFileSync(path.join(__dirname,'../main-2321.js'),'utf8');const expression=main.match(/const canViewTab=k=>([^;]+);/)[1];
 for(const role of ['PPL','LOGISTIK','MARKETING','KEUANGAN','OWNER'])assert.equal(vm.runInNewContext('((k)=>'+expression+')('+'"admin_kinerja"'+')',{profile:{role},visibleTabs:{[role]:[]}}),false);
 assert.equal(vm.runInNewContext('((k)=>'+expression+')('+'"admin_kinerja"'+')',{profile:{role:'ADMIN'}}),true);
});
