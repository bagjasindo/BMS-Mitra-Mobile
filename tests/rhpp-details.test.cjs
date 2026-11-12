const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const src=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
function setup(){
  const dom=new JSDOM('<div id="root"></div>',{runScripts:'outside-only'}),w=dom.window;
  w.eval(`var RHPP_SCREEN_STYLE='<style>.rhpp-grid{display:grid}</style>';var profile={role:'ADMIN'};var root=document.getElementById('root');var prodNum=v=>Number(v)||0;var prodFmt=(v,d=0)=>v==null?'-':Number(v).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});var prodDateId=v=>v||'-';var esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');var layout=html=>root.innerHTML=html;var msg=text=>window.lastMessage=text;`);
  w.eval(src('modules/bms-rhpp-details.js'));
  w.eval(src('modules/bms-rhpp-users.js'));
  return w;
}
test('Cek RHPP exposes all return categories and shares every table cell with print PDF and Excel',async()=>{
  const w=setup();
  const tables={
    items:[{id:'doc',name:'Bounty Segar',category:'DOC',unit:'ekor'},{id:'ovk',code:'OVK01',name:'Vitamin <aman>',category:'OVK',unit:'botol'}],
    logistics_shipments:[{id:'ship',contract_assignment_id:'a',shipment_date:'2026-10-02',delivery_number:'DO-001'}],
    logistics_shipment_items:[{shipment_id:'ship',item_id:'doc',quantity:8100,unit_price:9000}],
    logistics_returns:[{id:'ret',contract_assignment_id:'a',return_date:'2026-11-01',reference:'RT-001',notes:'Botol utuh'}],
    logistics_return_items:[{return_id:'ret',item_id:'ovk',quantity:2,quantity_kg:null,unit_price:10000}],
    chick_ins:[{contract_assignment_id:'a',received:8100,doa:2,arrived_on:'2026-10-02'}],
    company_profile:{company_name:'BMS'},
  };
  const summary={contract_assignment_id:'a',active:true,barn_code:'KD-004',barn_name:'Randegan',chick_in_birds:8100,main_doc_cost:72900000,total_harvest_birds:6800,total_harvest_kg:12001.1,net_feed_kg:18200,sapronak_cost:100000000,farmer_profit:1234567,external_sapronak_cost:20000};
  w.db={rpc:async()=>({data:[summary]}),from(name){const q={select(){return q},order(){return q},eq(){return q},maybeSingle(){return q},then(resolve){return Promise.resolve({data:tables[name]||[]}).then(resolve)}};return q}};
  w.__financeRhppState={assignment:'a'};
  let printed,pdf,excel;
  w.open=()=>({document:{write:s=>printed=s,close(){}},focus(){},print(){}});
  w.setTimeout=()=>0;
  w.BMSCore={savePdfHtml:async s=>{pdf=s},excelBlob:parts=>{excel=parts.join('');return new w.Blob(parts)}};
  w.URL.createObjectURL=()=> 'blob:test';w.HTMLAnchorElement.prototype.click=function(){};
  await w.financeRhppPage();
  const area=w.document.getElementById('rhppExportArea');
  assert.match(area.textContent,/DOA \(catatan\).*2 ekor/);
  const price=[...area.querySelectorAll('tr')].find(tr=>tr.textContent.includes('Harga DOC / Ekor'));
  assert.match(price.textContent,/9\.000,00/);assert.doesNotMatch(price.textContent,/9\.002/);
  assert.match(area.textContent,/RT-001.*Vitamin <aman>.*2,00.*botol.*20\.000,00.*Botol utuh/);
  assert.match(area.textContent,/DATA TERSEDIA · PERLU VERIFIKASI AKHIR/);
  w.document.getElementById('rhppPrint').click();
  await w.document.getElementById('rhppPdf').onclick();
  w.document.getElementById('rhppExcel').click();
  const expected=[...area.querySelectorAll('table')].map(t=>[...t.querySelectorAll('th,td')].map(c=>c.textContent));
  for(const html of [printed,pdf,excel]){
    const doc=new JSDOM(html).window.document;
    assert.deepEqual([...doc.querySelectorAll('table')].map(t=>[...t.querySelectorAll('th,td')].map(c=>c.textContent)),expected);
    assert.equal(doc.querySelector('select,button,[data-rhpp-controls]'),null);
    assert.match(doc.body.textContent,/HASIL AKHIR SETELAH BIAYA TAMBAHAN/);
  }
  // Cetak RHPP history uses the same renderer but financial figures come from the frozen snapshot.
  tables.rhpp_system_final=[{...summary,system_amount:777777,external_meat_cost:0,external_sapronak_cost:20000,chick_in_birds:8098,bonus_depletion:0,bonus_depletion_rate:0}];
  summary.active=false;
  await w.financeRhppPage({historyAssignment:'a',onBack:()=>{}});
  assert.match(w.document.querySelector('#rhppExportArea').textContent,/snapshot CLOSED/);
  const finalRow=[...w.document.querySelectorAll('tr')].find(r=>r.textContent.includes('HASIL AKHIR SETELAH BIAYA TAMBAHAN'));
  assert.match(finalRow.textContent,/777\.777/);
  assert.equal(w.document.querySelector('[data-close-rhpp]'),null);
  assert.ok(w.document.querySelector('#rhppHistoryBack'));
  // Partial reads must block finalisation and exports rather than displaying false totals.
  w.db.rpc=async()=>({error:{message:'Koneksi gagal'}});
  await w.financeRhppPage();assert.equal(w.document.getElementById('rhppPrint'),null);assert.equal(w.document.querySelector('[data-close-rhpp]'),null);
  assert.match(w.document.body.textContent,/Data tidak lengkap/);
});
test('DOA population correction retains closed snapshot fallback and existing access guard',()=>{
 const sql=src('sql/20261112_rhpp_doc_population.sql');
 assert.match(sql,/case when a.active then ci.received::numeric else coalesce/);
 assert.match(sql,/select f.chick_in_birds from public.rhpp_system_final/);
 assert.doesNotMatch(sql,/ci.received-ci.doa/);
 assert.match(sql,/p.user_id=auth.uid\(\)/);
 assert.doesNotMatch(sql,/update public\./i);
});
