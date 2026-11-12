const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const production=read('modules/bms-production.js');
const dashboard=read('modules/bms-dashboard-reports.js');
const rhpp=read('modules/bms-rhpp-users.js');

test('LOCK-001 dashboard active barn still requires Chick-In',()=>{
  assert.match(dashboard,/assignments\.filter\(a=>a\.active&&d\.chicks\.some\(ci=>ci\.contract_assignment_id===a\.id\)\)/);
});

test('LOCK-002 ABK allocation uses DOC arrival count, not received minus DOA',()=>{
  assert.match(production,/const netPopulation=\(\)=>Math\.max\(0,\(normalizeInputID\(form\.received\.value\)\|\|0\)\)/);
  assert.match(production,/const net=received;/);
  assert.doesNotMatch(production,/const net=received-doa;/);
});

test('LOCK-003 PPL recap uses Liga ABK with CLOSED historical final fallback',()=>{
  assert.match(production,/Acuan utama Rekap Produksi PPL adalah Liga ABK/);
  assert.match(production,/if\(!hasLeagueData&&!a\.active\)/);
  assert.match(production,/source:'FINAL_HISTORIS'/);
  assert.match(production,/source:'LIGA_ABK'/);
});

test('LOCK-004 MANDIRI keeps an explicit contract benchmark',()=>{
  assert.match(production,/if\(a\?\.master_contract_id\)return a\.master_contract_id;/);
  assert.match(production,/if\(a\?\.cycle_type!=='MANDIRI'\)return '';/);
  assert.match(production,/ids\.length===1\?ids\[0\]:'';/);
  assert.match(production,/Kontrak Acuan Penilaian/);
  assert.match(production,/acuan pembanding MANDIRI/);
});

test('LOCK-005 and LOCK-006 official print does not contain known fake hardcoded values',()=>{
  const printSources=[production,rhpp,read('modules/bms-finance.js'),dashboard,read('main-2321.js')].join('\n');
  assert.doesNotMatch(printSources,/KOMPLAIN DOC/);
  assert.doesNotMatch(production,/PT Bagjasindo Mandiri Sindangkasih/);
  assert.doesNotMatch(production,/<tr><td>OVK<\/td>[\s\S]{0,300}Rp 0/i);
  assert.match(production,/Tidak dialokasikan/);
  assert.match(production,/Nama perusahaan belum diisi/);
});

test('LOCK-007 to LOCK-009 RHPP keeps company additions outside contract RHPP',()=>{
  assert.match(rhpp,/Penyesuaian Biaya Perusahaan/);
  assert.match(rhpp,/Tambah Daging/);
  assert.match(rhpp,/Tambah Sapronak\s*\/\s*Pakan/);
  assert.match(rhpp,/Nilai RHPP Kontrak/);
});
