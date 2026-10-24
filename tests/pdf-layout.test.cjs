const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

test('PDF workflow retains styled report and blocked-popup download is honestly named HTML',async()=>{
  const dom=new JSDOM('',{runScripts:'outside-only'});
  try{
    const w=dom.window;
    w.TextEncoder=TextEncoder;w.Blob=Blob;
    let blob,load,printed=0,download;
    w.URL.createObjectURL=value=>{blob=value;return 'blob:test'};
    w.URL.revokeObjectURL=()=>{};
    w.setTimeout=()=>0;
    w.open=()=>({addEventListener:(event,fn)=>{assert.equal(event,'load');load=fn},focus:()=>{},print:()=>printed++});
    w.eval(fs.readFileSync(path.join(__dirname,'../bms-core.js'),'utf8'));
    const html='<html><head><style>.amount{color:red}</style></head><body><table><tr><td class="amount">1.234,00</td></tr></table></body></html>';
    await w.BMSCore.savePdfHtml(html,'RHPP.pdf');
    assert.equal(blob.type,'text/html;charset=utf-8');
    const report=await blob.text();
    assert.ok(report.includes('<table><tr><td class="amount">1.234,00</td></tr></table>'));
    assert.ok(report.includes('.amount{color:red}'));
    assert.ok(report.includes('print-color-adjust:exact'));
    load();assert.equal(printed,1);
    w.open=()=>null;
    w.document.addEventListener('click',event=>{download=event.target.download;event.preventDefault()});
    await w.BMSCore.savePdfHtml(html,'RHPP.pdf');
    assert.equal(download,'RHPP.html');
    assert.equal(blob.type,'text/html;charset=utf-8');
  }finally{dom.window.close()}
});
