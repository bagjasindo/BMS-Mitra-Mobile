const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../modules/bms-expedition-reports.js'),'utf8'),ctx=vm.createContext({});vm.runInContext(source,ctx);
const data={trips:[{id:'A',trip_date:'2026-11-10',driver:'Sopir A',vehicle:'D 1',mts_sj:'SJ1'},{id:'B',trip_date:'2026-11-11',driver:'Sopir B',vehicle:'D 2',reference:'KAS_JALAN_PENDING_SJ',total_qty:null},{id:'C',trip_date:'2026-11-11',driver:'Sopir A',vehicle:'D 1',total_qty:30}],destinations:[{trip_id:'A',line_no:1,destination_name:'Tujuan A',cargo:'Pakan',qty:10,unit:'ZAK'},{trip_id:'A',line_no:2,destination_name:'Tujuan B',cargo:'Pakan',qty:100,unit:'kg'}],links:[{trip_id:'A',invoice_id:'I'},{trip_id:'A',invoice_id:'I'}],invoices:[{id:'I',invoice_number:'INV1',status:'ISSUED'}]};
test('report counts trips once, retains multi-destinations and keeps different units separate',()=>{
 const m=ctx.logisticsExpeditionReportModel(data);assert.equal(m.rows.length,3);assert.equal(m.billed,1);assert.equal(m.pending,1);assert.equal(m.unbilled,1);assert.equal(m.quantities.find(q=>q.unit==='zak').quantity,10);assert.equal(m.quantities.find(q=>q.unit==='kg').quantity,100);assert.equal(m.unknownQuantity,2);assert.equal(m.rows[0].invoice,'INV1 (ISSUED)');assert.match(m.rows[0].destination,/Tujuan A.*Tujuan B/);assert.equal(m.crew.find(c=>c.driver==='Sopir A').trips,2);
});
test('report filters date driver vehicle status and search together',()=>{
 const m=ctx.logisticsExpeditionReportModel(data,{from:'2026-11-10',to:'2026-11-10',driver:'Sopir A',vehicle:'D 1',status:'SUDAH INVOICE',search:'tujuan b'});assert.equal(m.rows.length,1);assert.equal(ctx.logisticsExpeditionReportModel(data,{from:'2026-11-12'}).rows.length,0);assert.equal(ctx.logisticsExpeditionReportModel(data,{status:'MENUNGGU SJ'}).rows[0].id,'B');
});
test('missing quantities remain unavailable while recorded zero stays zero',()=>{
 const m=ctx.logisticsExpeditionReportModel({trips:[{id:'Z'}],destinations:[{trip_id:'Z',qty:0,unit:'kg'},{trip_id:'Z',qty:null,unit:'zak'}]});assert.equal(m.quantities[0].quantity,0);assert.equal(m.rows[0].quantityLines[1].quantity,null);assert.equal(m.unknownQuantity,1);
});
