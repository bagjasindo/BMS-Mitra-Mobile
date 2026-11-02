const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../modules/bms-dashboard-reports.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(src.slice(0,src.indexOf('function renderDashboardTemplate')),context);
const summary=(g,a={id:'A',cycle_type:'MITRA'})=>JSON.parse(JSON.stringify(context.dashboardFeedSummary(g,a)));
const base=()=>({feed_monitoring_version:1,items:[{id:'F',category:'PAKAN',unit:'ZAK',kg_per_unit:50},{id:'G',category:'PAKAN',unit:'ZAK',kg_per_unit:40}],shipments:[{id:'S',contract_assignment_id:'A'}],shipment_items:[{shipment_id:'S',item_id:'F',quantity:100},{shipment_id:'S',item_id:'G',quantity:10}],recordings:[]});

test('dashboard mixed feed uses all lines once, groups by date, isolates cycles and preserves conversions',()=>{
 const g=base();g.recordings=[{id:'R',contract_assignment_id:'A',recorded_on:'2026-11-01',feed_kg:140,feed_item_id:'F',feed_quantity_units:2},{id:'R2',contract_assignment_id:'A',recorded_on:'2026-11-01',feed_kg:50,feed_item_id:'F',feed_quantity_units:1},{id:'OLD',contract_assignment_id:'A',recorded_on:'2026-10-31',feed_kg:50,feed_item_id:'F',feed_quantity_units:1},{id:'OTHER',contract_assignment_id:'B',recorded_on:'2026-11-02',feed_kg:5000,feed_item_id:'F',feed_quantity_units:100}];
 g.recording_feed_items=[{recording_id:'R',item_id:'F',quantity_units:2,kg_per_unit:50},{recording_id:'R',item_id:'G',quantity_units:1,kg_per_unit:40}];
 const x=summary(g);assert.deepEqual(x.daily,[{date:'2026-11-01',kg:190,zak:4},{date:'2026-10-31',kg:50,zak:1}]);assert.equal(x.remainingKg,5160);assert.equal(x.remainingZak,105);
});

test('dashboard stock includes returns, retained stock, transfers, external supplies and adjustments',()=>{
 const g=base();g.returns=[{id:'RET',contract_assignment_id:'A'}];g.return_items=[{return_id:'RET',item_id:'F',quantity:5}];g.retained_feed=[{id:'T',source_assignment_id:'A',item_id:'F',quantity:3}];g.company_feed_movements=[{retained_feed_id:'T',contract_assignment_id:'A',direction:'OUT',quantity:2},{retained_feed_id:'T',contract_assignment_id:'A',direction:'IN',quantity:1}];g.external_shipments=[{id:'EXT',contract_assignment_id:'A'}];g.external_shipment_items=[{external_shipment_id:'EXT',item_id:'F',quantity:4}];g.feed_adjustments=[{contract_assignment_id:'A',item_id:'F',adjustment_units:2}];
 const x=summary(g);assert.equal(x.remainingZak,107);assert.equal(x.remainingKg,5250);assert.deepEqual(x.daily,[]);
});

test('Mandiri allocations count only for Mandiri and remaining stock is nonnegative per item',()=>{
 const g=base();g.mandiri_feed_purchases=[{id:'P',item_id:'F'}];g.mandiri_feed_allocations=[{purchase_id:'P',contract_assignment_id:'A',quantity:10}];
 assert.equal(summary(g).remainingZak,110);assert.equal(summary(g,{id:'A',cycle_type:'MANDIRI'}).remainingZak,120);
 g.recordings=[{id:'R',contract_assignment_id:'A',recorded_on:'2026-11-01',feed_item_id:'F',feed_quantity_units:200,feed_kg:10000}];assert.equal(summary(g).remainingZak,10);
});

test('missing feed data is unavailable; recorded zero remains zero and stale date is retained',()=>{
 assert.equal(summary({}).remainingKg,null);
 const g=base();g.recordings=[{id:'R',contract_assignment_id:'A',recorded_on:'2026-10-20',feed_item_id:'F',feed_quantity_units:0,feed_kg:0}];assert.deepEqual(summary(g).daily,[{date:'2026-10-20',kg:0,zak:0}]);
 g.recordings[0].feed_quantity_units=null;g.recordings[0].feed_kg=null;assert.deepEqual(summary(g).daily,[{date:'2026-10-20',kg:null,zak:null}]);
 g.items[0].kg_per_unit=null;assert.equal(summary(g).remainingKg,null);
});
