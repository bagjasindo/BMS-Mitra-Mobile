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
    items:[{id:'doc',name:'Bounty Segar',category:'DOC',unit:'ekor'},{id:'ovk',code:'OVK01',name:'Vitamin <aman>',category:'OVK',unit:'botol'},{id:'feed',name:'Pakan Starter',category:'PAKAN',unit:'zak'},{id:'ovk2',name:'Vaksin B',category:'OVK2',unit:'dosis'},{id:'other',name:'Sekam',category:'LAINNYA',unit:'karung'}],
    logistics_shipments:[{id:'ship',contract_assignment_id:'a',shipment_date:'2026-10-02',delivery_number:'DO-001'}],
    logistics_shipment_items:[{shipment_id:'ship',item_id:'doc',quantity:8100,unit_price:9000},{shipment_id:'ship',item_id:'feed',quantity:10,quantity_kg:500,unit_price:500000},{shipment_id:'ship',item_id:'ovk2',quantity:10,quantity_kg:null,unit_price:5000},{shipment_id:'ship',item_id:'other',quantity:3,quantity_kg:null,unit_price:20000}],
    logistics_returns:[{id:'ret',contract_assignment_id:'a',return_date:'2026-11-01',reference:'RT-001',notes:'Botol utuh'}],
    logistics_return_items:[{return_id:'ret',item_id:'ovk',quantity:2,quantity_kg:null,unit_price:10000},{return_id:'ret',item_id:'feed',quantity:1,quantity_kg:50,unit_price:500000}],
    logistics_external_shipments:[{id:'ext',contract_assignment_id:'a',shipment_date:'2026-10-03',reference_number:'EXT-01'}],
    logistics_external_shipment_items:[{external_shipment_id:'ext',item_id:'feed',quantity:2,quantity_kg:100,purchase_unit_price:450000}],
    marketing_contract_harvests:[{contract_assignment_id:'a',harvested_on:'2026-11-01',birds:6800,net_weight_kg:12001.1,buyer_name:'Pembeli A',vehicle_number:'D 1234',price_per_kg:22000,total_amount:264024200}],
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
  const groups=[...area.querySelectorAll('[data-rhpp-report-group]')];
  assert.deepEqual(groups.map(g=>g.dataset.rhppReportGroup),['supplies','harvest','returns','production','calculation']);
  const shipmentHeadings=[...groups[0].querySelectorAll('h3')].map(h=>h.textContent);
  assert.ok(shipmentHeadings.findIndex(t=>t.startsWith('DOC —'))<shipmentHeadings.findIndex(t=>t.startsWith('Pakan —')));
  assert.ok(shipmentHeadings.findIndex(t=>t.startsWith('Pakan —'))<shipmentHeadings.findIndex(t=>t.startsWith('OVK —')));
  assert.match(groups[0].textContent,/Pakan Starter.*10,00.*zak.*500,00.*5\.000\.000,00/);
  assert.match(groups[0].textContent,/Vaksin B/);assert.match(groups[0].textContent,/Sekam/);
  assert.match(groups[0].textContent,/EXT-01/);
  assert.doesNotMatch(groups[0].textContent,/RT-001/);
  assert.match(groups[1].textContent,/Pembeli A.*D 1234/);
  assert.match(groups[2].textContent,/RT-001.*Pakan Starter.*1,00.*zak.*50,00/);
  assert.match(groups[3].textContent,/Panduan Membaca Hasil Produksi/);
  w.rhppOrganizeReport(area);assert.equal(area.querySelectorAll('[data-rhpp-report-group]').length,5);
  assert.match(area.textContent,/DATA TERSEDIA · PERLU VERIFIKASI AKHIR/);
  w.document.getElementById('rhppPrint').click();
  await w.document.getElementById('rhppPdf').onclick();
  w.document.getElementById('rhppExcel').click();
  const expected=[...area.querySelectorAll('table')].map(t=>[...t.querySelectorAll('th,td')].map(c=>c.textContent));
  for(const html of [printed,pdf,excel]){
    const doc=new JSDOM(html).window.document;
    assert.deepEqual([...doc.querySelectorAll('table')].map(t=>[...t.querySelectorAll('th,td')].map(c=>c.textContent)),expected);
    assert.equal(doc.querySelector('select,button,[data-rhpp-controls]'),null);
    assert.deepEqual([...doc.querySelectorAll('[data-rhpp-report-group]')].map(g=>g.dataset.rhppReportGroup),['supplies','harvest','returns','production','calculation']);
    assert.match(doc.body.textContent,/HASIL AKHIR SETELAH BIAYA TAMBAHAN/);
  }
  // Cetak RHPP history uses the same renderer but financial figures come from the frozen snapshot.
  tables.rhpp_system_final=[{...summary,system_amount:777777,external_meat_cost:0,external_sapronak_cost:20000,chick_in_birds:8098,bonus_depletion:0,bonus_depletion_rate:0}];
  summary.active=false;
  await w.financeRhppPage({historyAssignment:'a',onBack:()=>{}});
  assert.match(w.document.querySelector('#rhppExportArea').textContent,/final saat ditutup/);
  const finalRow=[...w.document.querySelectorAll('tr')].find(r=>r.textContent.includes('HASIL AKHIR SETELAH BIAYA TAMBAHAN'));
  assert.match(finalRow.textContent,/777\.777/);
  assert.deepEqual([...w.document.querySelectorAll('[data-rhpp-report-group]')].map(g=>g.dataset.rhppReportGroup),['supplies','harvest','returns','production','calculation']);
  const closedHtml=w.rhppDocumentHtml(w.document.querySelector('#rhppExportArea'),{company_name:'BMS'});
  assert.match(new JSDOM(closedHtml).window.document.body.textContent,/777\.777/);
  assert.equal(w.document.querySelector('[data-close-rhpp]'),null);
  assert.ok(w.document.querySelector('#rhppHistoryBack'));
  // Partial reads must block finalisation and exports rather than displaying false totals.
  w.db.rpc=async()=>({error:{message:'Koneksi gagal'}});
  await w.financeRhppPage();assert.equal(w.document.getElementById('rhppPrint'),null);assert.equal(w.document.querySelector('[data-close-rhpp]'),null);
  assert.match(w.document.body.textContent,/Data tidak lengkap/);
});
test('contract calculation lists saved costs, return deduction and each applied bonus once',()=>{
 const w=setup();
 const x={contract_number:'Kontrak A',harvest_value:100000,main_doc_cost:10000,main_feed_cost:20000,main_ovk_cost:3000,main_other_cost:2000,main_return_cost:5000,sapronak_cost:30000,total_rhpp_cost:30000,base_profit:70000,total_harvest_kg:100,ip:350,diff_fcr:0.1,mortality_pct:4,bonus_ip_rate:20,bonus_ip:2000,bonus_fc_rate:10,bonus_fc:1000,bonus_mortality_rate:5,bonus_mortality:500,farmer_profit:73500};
 const doc=new JSDOM(w.rhppContractCalculation(x)).window.document;
 const rows=[...doc.querySelectorAll('tbody tr')];
 assert.equal(rows.length,15);
 assert.match(rows.find(r=>r.textContent.startsWith('C.')).textContent,/100\.000,00 − Rp 30\.000,00.*70\.000,00/);
 assert.match(rows.find(r=>r.textContent.startsWith('D.')).textContent,/100,00 kg × Rp 20,00\/kg.*2\.000,00/);
 assert.match(rows.find(r=>r.textContent.startsWith('E.')).textContent,/100,00 kg × Rp 10,00\/kg.*1\.000,00/);
 assert.match(rows.find(r=>r.textContent.startsWith('F.')).textContent,/100,00 kg × Rp 5,00\/kg.*500,00/);
 assert.match(rows.find(r=>r.textContent.startsWith('G.')).textContent,/70\.000,00 \+ Rp 2\.000,00 \+ Rp 1\.000,00 \+ Rp 500,00.*73\.500,00/);
 const missing=new JSDOM(w.rhppContractCalculation({...x,bonus_fc_rate:null,bonus_fc:null})).window.document;
 const unavailable=[...missing.querySelectorAll('tbody tr')].find(r=>r.textContent.startsWith('E.'));
 assert.match(unavailable.textContent,/kg × -\/kg/);assert.equal(unavailable.lastElementChild.textContent,'-');
});
test('DOA population correction retains closed snapshot fallback and existing access guard',()=>{
 const sql=src('sql/20261112_rhpp_doc_population.sql');
 assert.match(sql,/case when a.active then ci.received::numeric else coalesce/);
 assert.match(sql,/select f.chick_in_birds from public.rhpp_system_final/);
 assert.doesNotMatch(sql,/ci.received-ci.doa/);
 assert.match(sql,/p.user_id=auth.uid\(\)/);
 assert.doesNotMatch(sql,/update public\./i);
});
