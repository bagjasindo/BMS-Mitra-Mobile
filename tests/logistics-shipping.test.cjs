const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../modules/bms-master-logistics.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(source,context);

test('optional shipment note accepts blank or dash and keeps duplicate checks for real numbers',()=>{
  assert.equal(context.normalizeOptionalShippingNote(''), '');
  assert.equal(context.normalizeOptionalShippingNote('  '), '');
  assert.equal(context.normalizeOptionalShippingNote('-'), '');
  assert.equal(context.normalizeOptionalShippingNote(' SJ-123 '), 'SJ-123');
  const rows=[{id:'one',shipping_note_number:'SJ-123'},{id:'two',shipping_note_number:null}];
  assert.equal(context.findDuplicateShippingNote(rows,''),null);
  assert.equal(context.findDuplicateShippingNote(rows,'-'),null);
  assert.equal(context.findDuplicateShippingNote(rows,'sj-123').id,'one');
  assert.equal(context.findDuplicateShippingNote(rows,'SJ-123','one'),null);
});
