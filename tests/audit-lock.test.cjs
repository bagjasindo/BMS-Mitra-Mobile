const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('AUDIT-LOCK PWA cache and versioned application assets stay synchronized',()=>{
  const index=read('index.html');
  const sw=read('sw.js');
  const cache=sw.match(/const CACHE_NAME=CACHE_PREFIX\+'([^']+)'/)[1];
  assert.ok(index.includes('./sw.js?'+cache.replace(/^v/,'v=')), 'registered worker matches cache build');
  const scripts=[...index.matchAll(/loadScript\('(\.\/[^']+)'/g)].map(m=>m[1]);
  const styles=[...index.matchAll(/rel="stylesheet" href="(\.\/[^\"]+)"/g)].map(m=>m[1]);
  assert.ok(scripts.length>=10&&styles.length>=2);
  for(const asset of [...scripts,...styles])assert.ok(sw.includes("'"+asset+"'"),'uncached or mismatched asset: '+asset);
  // Recovery schema/runbook are independently versioned recovery artifacts.
  // Their build number must not be forced to match a frontend-only cache/export build.
});

test('AUDIT-LOCK recovery schema contains latest business guards',()=>{
  const schema=read('supabase/schema_current.sql');
  assert.match(schema,/guard_external_meat_contract_price/);
  assert.match(schema,/with harvest_source as/);
  assert.match(schema,/marketing_external_meat_purchases/);
  assert.match(schema,/Harga beli aktual per Kg wajib lebih dari 0/);
  assert.doesNotMatch(schema,/new\.purchase_price_per_kg := v_price/);
  assert.match(schema,/m\.weight_kg\*cp\.price_per_kg/);
  assert.match(schema,/v\.farmer_profit-v\.external_meat_cost-v\.external_sapronak_cost/);
});

test('AUDIT-LOCK CI always includes browser smoke test and locked business rules',()=>{
  const workflow=read('.github/workflows/verify.yml');
  const pkg=JSON.parse(read('package.json'));
  assert.match(workflow,/npm run check/);
  assert.match(workflow,/npm run test:browser/);
  assert.ok(pkg.scripts.check.includes('node --test tests/*.test.cjs'));
});


test('AUDIT-LOCK PPL sample weight keeps gram precision and photo compression',()=>{
  const production=read('modules/bms-production.js');
  assert.match(production,/63 gram = 0,063/);
  assert.match(production,/min="0\.001" step="0\.001"/);
  assert.match(production,/compressRecordingPhoto/);
  assert.match(production,/targetBytes=30\*1024/);
});


test('AUDIT-LOCK Recording PPL starts day 1 after DOC arrival',()=>{
  const production=read('modules/bms-production.js');
  assert.match(production,/return Math\.max\(0,Math\.floor\(\(today-start\)\/86400000\)\);/);
  assert.match(production,/Hari DOC datang adalah Hari 0/);
  assert.match(production,/p_recorded_on:prodDateAdd\(ci\.arrived_on,currentDay\)/);
  assert.doesNotMatch(production,/p_recorded_on:prodDateAdd\(ci\.arrived_on,currentDay-1\)/);
});


test('AUDIT-LOCK completion pack keeps reports filters status and correction controls wired',()=>{
  const logistics=read('modules/bms-master-logistics.js');
  const finance=read('modules/bms-finance.js');
  const production=read('modules/bms-production.js');
  const admin=read('modules/bms-admin.js');
  const schema=read('supabase/schema_current.sql');

  for(const id of [
    'mandiriPurchasePrint','shippingHistoryPrint','externalHistoryPrint','returnHistoryPrint',
    'externalReturnHistoryPrint','equipmentHistoryPrint','harvestMitraHistoryPrint',
    'harvestMandiriHistoryPrint','meatHistoryPrint'
  ]) assert.match(logistics+finance,new RegExp(id));

  for(const id of [
    'assetHistoryPrint','goodsHistoryPrint','mandiriReceivablePrint','mandiriReceiptHistoryPrint',
    'mandiriDebtPrint','mandiriSupplierHistoryPrint','mandiriReportPrint','fxPaymentHistoryPrint',
    'fxBopHistoryPrint','fxMaintenancePrint','warehouseStockPrint','warehouseSendPrint','expMasterPrint'
  ]) assert.match(finance,new RegExp(id));

  for(const id of ['recordingHistoryPrint','estimateHistoryPrint','abkHistoryPrint','leagueBarnPrint'])
    assert.match(production,new RegExp(id));

  assert.match(admin,/data-toggle-barn/);
  assert.match(admin,/data-toggle-item/);
  assert.match(admin,/assetMasterPrint/);
  assert.match(admin,/activityLogPrint/);
  assert.match(logistics,/marketingCustomerTable/);
  assert.match(logistics,/contractTemplatePrint/);
  assert.match(logistics,/performanceMasterPrint/);

  for(const rpc of [
    'delete_logistics_equipment_purchase_atomic',
    'correct_warehouse_stock_shipment_atomic',
    'delete_warehouse_stock_shipment_atomic',
    'finance_correct_stock_invoice_atomic',
    'finance_delete_stock_invoice_atomic',
    'finance_correct_asset_invoice_atomic',
    'finance_delete_asset_invoice_atomic'
  ]) assert.match(schema,new RegExp(rpc));
});


test('OWNER mobile navigation controls stay enabled while content remains read-only',()=>{
  const main=read('main-2321.js');
  assert.match(main,/btn\.closest\('nav,\.mobile-topbar,\.mobile-drawer-head'\)\)return/);
  assert.match(main,/btn\.hasAttribute\('data-tab'\)\|\|btn\.closest\('nav,\.mobile-topbar,\.mobile-drawer-head'\)\)return/);
});


test('OWNER global read-only keeps report filters interactive and blocks mutations',()=>{
  const main=read('main-2321.js');
  assert.match(main,/mutationText=/);
  assert.match(main,/if\(!mutating\)return;/);
  assert.match(main,/if\(isMutationButton\(btn\)\)\{btn\.disabled=true;btn\.hidden=true;\}/);
  assert.doesNotMatch(main,/form\.querySelectorAll\('input,select,textarea'\)\.forEach\(el=>\{el\.disabled=true;\}\)/);
});


test('PDF actions preserve report layout through the shared browser Save as PDF workflow',()=>{
  const core=read('bms-core.js');
  const main=read('main-2321.js');
  const logistics=read('modules/bms-master-logistics.js');
  const production=read('modules/bms-production.js');
  const finance=read('modules/bms-finance.js');
  const rhpp=read('modules/bms-rhpp-users.js');
  const reports=read('modules/bms-dashboard-reports.js');
  assert.match(core,/function pdfBlobFromHtml/);
  assert.match(core,/async function savePdfHtml/);
  assert.match(core,/application\/pdf/);
  assert.match(core,/text\/html;charset=utf-8/);
  assert.match(core,/w\.print\(\)/);
  assert.match(core,/print-color-adjust:exact/);
  // Current documented workflow preserves HTML layout. Its blocked-popup fallback must
  // identify itself as HTML, never label HTML bytes as a completed PDF download.
  assert.match(core,/a\.download=name\.replace\(/);
  for(const src of [main,logistics,production,finance,rhpp,reports])assert.match(src,/BMSCore\.savePdfHtml/);
  for(const src of [main,logistics,production,finance,rhpp,reports])assert.doesNotMatch(src,/Pdf[^\n]{0,160}onclick[^\n]{0,160}(?:print\(|openPrint|printOpen)/);
});
