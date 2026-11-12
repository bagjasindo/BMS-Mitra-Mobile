/* RHPP audit details and one shared document for print/PDF/Excel. */
function rhppLogisticsDetails(assignment,data){
  const {ships,shipItems,returns,returnItems,items,extShips,extShipItems,extReturns,extReturnItems,retained=[]}=data;
  const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const number=(v,d=2)=>known(v)?prodFmt(v,d):'-';
  const money=v=>known(v)?'Rp '+prodFmt(v,2):'-';
  const section=(title,headers,lines,parentKey,priceKey,external,isReturn,category)=>{
    const selected=headers.filter(h=>h.contract_assignment_id===assignment);
    const rows=selected.flatMap(h=>lines.filter(v=>v[parentKey]===h.id).map(v=>{
      const item=items.find(i=>i.id===v.item_id);
      const kind=String(item?.category||'').toUpperCase();
      if(category==='OVK'?!['OVK','OVK1','OVK2'].includes(kind):category==='LAINNYA'?['DOC','PAKAN','OVK','OVK1','OVK2'].includes(kind):category&&kind!==category)return null;
      const price=v[priceKey];
      const amount=known(v.quantity)&&known(price)?Number(v.quantity)*Number(price):null;
      const origin=external&&isReturn?extShips.find(s=>s.id===h.external_shipment_id):null;
      const reference=[h.delivery_number,h.shipping_note_number,h.reference_number,h.reference].filter(Boolean).join(' / ');
      const note=[h.status,h.notes,origin?'Asal: '+(origin.reference_number||'-'):null].filter(Boolean).join(' · ');
      return {date:h.shipment_date||h.return_date,amount,quantity:v.quantity,unit:item?.unit,kg:v.quantity_kg,html:'<tr><td>'+prodDateId(h.shipment_date||h.return_date)+'</td><td>'+esc(reference||'-')+'</td><td>'+esc([item?.code,item?.name].filter(Boolean).join(' · ')||v.item_id||'-')+'<br><small>'+esc(item?.category||'-')+'</small></td><td class="num">'+number(v.quantity)+'</td><td>'+esc(item?.unit||'-')+'</td><td class="num">'+number(v.quantity_kg)+'</td><td class="num">'+money(price)+'</td><td class="num">'+money(amount)+'</td><td>'+esc(note||'-')+'</td></tr>'};
    }).filter(Boolean)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    if(!rows.length&&external)return '';
    if(!rows.length&&(category==='LAINNYA'||(isReturn&&category!=='PAKAN')))return '';
    const total=rows.length&&rows.every(r=>known(r.amount))?rows.reduce((sum,r)=>sum+r.amount,0):null;
    const units=new Map();
    for(const row of rows){if(row.unit&&known(row.quantity))units.set(row.unit,(units.get(row.unit)||0)+Number(row.quantity));}
    const totalKg=rows.length&&rows.every(r=>known(r.kg))?rows.reduce((sum,r)=>sum+Number(r.kg),0):null;
    const quantitySummary=[...units].map(([unit,qty])=>number(qty)+' '+esc(unit)).join(' · ');
    return '<section data-rhpp-group="'+(isReturn?'returns':'supplies')+'" class="panel rhpp-panel rhpp-wide"><h3>'+title+'</h3><p class="muted">'+(external?'Tambahan perusahaan, terpisah dari sapronak kontrak.':'Sumber transaksi logistik kontrak.')+' Harga mengikuti satuan barang pada transaksi. Tanda - berarti data tidak tercatat.</p><div class="tablewrap"><table class="rhpp-detail-table"><thead><tr><th>Tanggal</th><th>No. dokumen</th><th>Barang / Kategori</th><th>Jumlah</th><th>Satuan</th><th>Kg</th><th>Harga / Satuan</th><th>Nilai</th><th>Catatan / Status</th></tr></thead><tbody>'+ (rows.length?rows.map(r=>r.html).join(''):'<tr><td colspan="9">Tidak ada transaksi.</td></tr>')+'</tbody>'+(rows.length?'<tfoot><tr><th colspan="7">Total nilai '+(isReturn?'retur':'kiriman')+'</th><th class="num">'+money(total)+'</th><th></th></tr>'+(category==='PAKAN'?'<tr><th colspan="9">Total jumlah: '+(quantitySummary||'-')+' · Total berat: '+number(totalKg)+' kg</th></tr>':'')+'</tfoot>':'')+'</table></div></section>';
  };
  const held=retained.filter(r=>r.source_assignment_id===assignment);
  const heldHtml=held.length?'<section data-rhpp-group="returns" class="panel rhpp-panel rhpp-wide"><h3>Pakan Ditahan Perusahaan</h3><p>Dicatat terpisah dari retur supplier. Tidak dijumlahkan ulang sebagai retur kontrak.</p><div class="tablewrap"><table><thead><tr><th>Dokumen retur</th><th>Barang</th><th>Jumlah</th><th>Satuan</th><th>Harga</th><th>Nilai</th></tr></thead><tbody>'+held.map(r=>{const i=items.find(i=>i.id===r.item_id),h=returns.find(h=>h.id===r.return_id);return '<tr><td>'+esc(h?.reference||'-')+'</td><td>'+esc(i?.name||'-')+'</td><td>'+number(r.quantity)+'</td><td>'+esc(i?.unit||'-')+'</td><td>'+money(r.unit_price)+'</td><td>'+money(known(r.quantity)&&known(r.unit_price)?Number(r.quantity)*Number(r.unit_price):null)+'</td></tr>';}).join('')+'</tbody></table></div></section>':'';
  const categories=[['DOC','DOC — Bibit Ayam'],['PAKAN','Pakan — Rincian Seluruh Kiriman'],['OVK','OVK — Obat, Vaksin, dan Kebutuhan Kesehatan'],['LAINNYA','Sapronak Lainnya']];
  const shipments=categories.map(([category,label])=>section(label+' · Kontrak',ships,shipItems,'shipment_id','unit_price',false,false,category)+section(label+' · Tambahan Perusahaan',extShips,extShipItems,'external_shipment_id','purchase_unit_price',true,false,category)).join('');
  const refunds=[['PAKAN','Retur Pakan'],['DOC','Retur DOC'],['OVK','Retur OVK'],['LAINNYA','Retur Sapronak Lainnya']].map(([category,label])=>section(label+' · Kontrak',returns,returnItems,'return_id','unit_price',false,true,category)+section(label+' · Tambahan Perusahaan',extReturns,extReturnItems,'external_return_id','purchase_unit_price',true,true,category)).join('');
  return shipments+refunds+heldHtml;
}
function rhppContractCalculation(x){
  const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const n=(v,d=2)=>known(v)?prodFmt(v,d):'-';
  const rp=v=>known(v)?'Rp '+n(v):'-';
  const row=(label,formula,value)=>'<tr'+(label.startsWith('G.')?' class="rhpp-total-row"':'')+'><td>'+label+'</td><td>'+formula+'</td><td class="num">'+rp(value)+'</td></tr>';
  const bonus=(name,metric,rate,value)=>row(name,metric+' · '+n(x.total_harvest_kg)+' kg × '+rp(rate)+'/kg',value);
  return '<section data-rhpp-group="calculation" class="panel rhpp-panel rhpp-wide rhpp-contract-calculation"><h3>Rincian Perhitungan Kontrak</h3><p>Kontrak: <strong>'+esc(x.contract_number||'-')+'</strong>. Harga setiap barang tercantum pada rincian kiriman. Nilai dan tarif yang ditampilkan di sini adalah yang dipakai dalam RHPP; untuk periode CLOSED, ringkasan mengikuti catatan final saat ditutup.</p><div class="tablewrap"><table><thead><tr><th>Tahap Perhitungan</th><th>Dasar / Cara Menghitung</th><th>Nilai RHPP</th></tr></thead><tbody>'+
    row('A. Nilai produksi menurut kontrak','Nilai panen ayam + nilai tambah daging untuk performa RHPP, sesuai perhitungan kontrak',x.harvest_value)+
    row('Biaya DOC','Jumlahkan jumlah DOC × harga satuan pada setiap kiriman DOC',x.main_doc_cost)+
    row('Biaya pakan','Jumlahkan jumlah pakan × harga satuan pada setiap kiriman pakan',x.main_feed_cost)+
    row('Biaya OVK','Jumlahkan jumlah OVK × harga satuan pada setiap kiriman OVK',x.main_ovk_cost)+
    row('Biaya sapronak lainnya','Jumlahkan nilai barang kontrak selain DOC, pakan, dan OVK',x.main_other_cost)+
    row('Pengurang biaya: retur kontrak','Kurangi biaya dengan nilai retur yang diterima sesuai transaksi: '+rp(x.main_return_cost),x.main_return_cost)+
    row('B. Biaya sapronak bersih','DOC + pakan + OVK + sapronak lainnya − retur kontrak',x.sapronak_cost)+
    row('Total biaya RHPP kontrak','Total biaya kontrak yang menjadi pengurang nilai produksi',x.total_rhpp_cost)+
    row('C. Laba dasar kontrak','A − total biaya RHPP kontrak = '+rp(x.harvest_value)+' − '+rp(x.total_rhpp_cost),x.base_profit)+
    bonus('D. Bonus IP','IP aktual '+n(x.ip),x.bonus_ip_rate,x.bonus_ip)+
    bonus('E. Bonus efisiensi pakan (FC)','Selisih FCR '+n(x.diff_fcr,3),x.bonus_fc_rate,x.bonus_fc)+
    bonus('F. Bonus deplesi','Deplesi hitung '+n(x.mortality_pct)+'%',x.bonus_mortality_rate,x.bonus_mortality)+
    row('G. Hasil RHPP kontrak','C + D + E + F = '+rp(x.base_profit)+' + '+rp(x.bonus_ip)+' + '+rp(x.bonus_fc)+' + '+rp(x.bonus_mortality),x.farmer_profit)+
    row('Hasil kontrak per DOC masuk','G ÷ populasi dasar RHPP ('+n(x.chick_in_birds,0)+' ekor)',x.profit_per_chick_in)+
    row('Hasil kontrak per ekor performa','G ÷ total ekor performa ('+n(x.total_harvest_birds,0)+' ekor)',x.profit_per_harvested_bird)+
    '</tbody></table></div><p class="muted">Bonus menggunakan total berat performa RHPP: panen aktual + tambah daging. Tarif Rp 0 berarti bonus tersebut tidak diberlakukan pada perhitungan ini; tanda - berarti tarif atau nilai tidak tercatat. Biaya pembelian tambah daging dan sapronak tambahan perusahaan dikurangkan setelah hasil kontrak (G), pada bagian Penyesuaian Biaya Perusahaan.</p></section>';
}
function rhppOnePageHtml(source,company={}){
  if(!source)throw new Error('Ringkasan Cek RHPP belum tersedia.');
  const text=n=>String(n?.textContent||'').replace(/\s+/g,' ').trim();
  const panel=title=>[...source.querySelectorAll('.rhpp-panel')].find(p=>text(p.querySelector('h3'))===title);
  const rows=p=>[...(p?.querySelectorAll('tr')||[])].map(r=>[...r.querySelectorAll('th,td')].map(text));
  const calc=panel('Rincian Perhitungan Kontrak'),calcRows=rows(calc);
  const card=(title,items)=>'<section><h3>'+title+'</h3><table><tbody>'+items.filter(r=>r&&r.length>1).map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</tbody></table></section>';
  const identity=rows(panel('Identitas Siklus')).filter(r=>/Kandang|Kontrak|Tanggal Chick-In|Populasi Chick-In|Tanggal Penutupan/.test(r[0]));
  const doc=rows(panel('Data DOC Diterima & Dasar Populasi')).filter(r=>/DOC Diterima|DOA \(catatan\)|Populasi Dasar RHPP|Harga DOC|Total Nilai DOC/.test(r[0]));
  const harvest=rows(panel('Rincian Hasil Tangkap / Panen Ayam')).filter(r=>r[0]?.startsWith('TOTAL')).map(r=>[r[0],r.slice(1,-1).filter(Boolean).join(' · ')]);
  const performance=rows(panel('Ringkasan Produksi')||panel('Kinerja Produksi')).filter(r=>/Total Performa RHPP \(Ekor\)|Total Performa RHPP \(Kg\)|Bobot Rata-rata|Umur Panen/.test(r[0]));
  const metrics=rows(panel('Kinerja Produksi')).filter(r=>/Deplesi hitung|FCR$|FCR Standar|Selisih FCR|Indeks Prestasi|Pakan Kontrak Bersih/.test(r[0]));
  const contract=calcRows.filter(r=>/^(A\.|B\.|C\.|D\.|E\.|F\.|G\.|Hasil kontrak|Biaya DOC|Biaya pakan|Biaya OVK|Biaya sapronak|Pengurang biaya|Total biaya)/.test(r[0])).map(r=>[r[0],r.at(-1)]);
  for(const r of contract){if(/^[DEF]\./.test(r[0])){const basis=calcRows.find(v=>v[0]===r[0])?.[1]||'';const tariff=basis.match(/([\d.,]+ kg × Rp [\d.,]+\/kg)/);if(tariff)r[0]+=' · '+tariff[1];}}
  const extras=rows(panel('Penyesuaian Biaya Perusahaan')).filter(r=>/Nilai RHPP Kontrak|Kurang|Total Biaya Tambahan|HASIL AKHIR/.test(r[0]));
  const companyName=company.legal_name||company.company_name||'Nama perusahaan belum diisi';
  const left=card('Identitas Siklus',identity)+card('DOC & Catatan Kedatangan',doc)+card('Hasil Tangkap Ayam',harvest);
  const right=card('Hasil Produksi',performance.concat(metrics))+card('Perhitungan Kontrak',contract)+card('Potongan Perusahaan & Hasil Akhir',extras);
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>RHPP Ringkasan 1 Lembar</title><style>@page{size:A4 landscape;margin:6mm}*{box-sizing:border-box}html,body{margin:0;padding:0;font:7.4pt Arial,Helvetica,sans-serif;color:#15212b}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1.5pt solid #17627e;padding:0 0 4px;margin-bottom:5px}header h1{font-size:12pt;margin:0 0 2px}header p{margin:0;color:#4b5963}.content{display:grid;grid-template-columns:1fr 1fr;gap:7px}section{border:.6pt solid #b8c6ce;border-radius:3px;margin:0 0 5px;padding:4px;break-inside:avoid;page-break-inside:avoid}h3{font-size:8pt;color:#145b76;margin:0 0 3px}table{width:100%;border-collapse:collapse;table-layout:fixed}td{border-top:.35pt solid #d7dfe4;padding:2px 3px;vertical-align:top;overflow-wrap:anywhere;line-height:1.15}td:first-child{width:55%;font-weight:600}td:last-child{text-align:right}body{font:7.4pt Arial,Helvetica,sans-serif!important;max-height:180mm;overflow:hidden}footer{text-align:right;color:#53616a;font-size:6.5pt;margin-top:2px}</style></head><body><header><div><h1>'+esc(companyName)+'</h1><p>RHPP — Ringkasan satu lembar · Periode: '+esc(text(panel('Identitas Siklus')?.querySelector('tr:nth-child(3) td:last-child'))||'-')+'</p></div><strong>'+esc(text(panel('Identitas Siklus')?.querySelector('tr:first-child td:last-child'))||'')+'</strong></header><main class="content"><div>'+left+'</div><div>'+right+'</div></main><footer>Angka CLOSED mengikuti hasil yang dikunci saat penutupan · Dicetak '+esc(new Date().toLocaleDateString('id-ID'))+'</footer></body></html>';
}
function rhppOrganizeReport(source){
  if(!source||source.dataset.rhppOrganized)return;
  source.dataset.rhppOrganized='1';
  const doc=source.ownerDocument;
  const definitions=[
    ['supplies','1. Kiriman Sapronak',''],
    ['harvest','2. Hasil Tangkap Ayam',''],
    ['returns','3. Retur Pakan',''],
    ['production','4. Hasil Produksi',''],
    ['calculation','5. Hasil Perhitungan','']
  ];
  const groups=new Map(definitions.map(([key,title,note])=>{
    const block=doc.createElement('div');block.className='rhpp-report-group';block.dataset.rhppReportGroup=key;
    const heading=doc.createElement('h2');heading.className='rhpp-group-title';heading.textContent=title;
    block.append(heading);return [key,block];
  }));
  const mapping={'Rincian DOC & Kontrak':'supplies','Rincian Panen':'harvest','Tambah Sapronak Perusahaan · Di luar RHPP':'production','Ringkasan Produksi':'production','Kinerja Produksi':'production','Penyesuaian Biaya Perusahaan':'calculation'};
  const panels=[...source.querySelectorAll('section.rhpp-panel')];
  for(const panel of panels){
    if(panel.hasAttribute('data-rhpp-controls'))continue;
    const h=panel.querySelector('h3'),title=h?.textContent.trim();
    const key=panel.dataset.rhppGroup||mapping[title];
    if(title==='Pemakaian Pakan & Retur'||title==='Tambah Sapronak Perusahaan · Di luar RHPP'||panel.classList.contains('rhpp-intro')){panel.remove();continue;}
    if(key)groups.get(key).append(panel);
    if(title==='Rincian Panen')h.textContent='Rincian Hasil Tangkap / Panen Ayam';
    if(title==='Rincian DOC & Kontrak'){
      h.textContent='Data DOC Diterima & Dasar Populasi';
      const cards=panel.querySelector('.rhpp-summary-cards');if(cards)groups.get('production').append(cards);
    }
  }
  for(const block of groups.values())source.append(block);
  const glossary=doc.createElement('p');glossary.className='muted rhpp-glossary';glossary.textContent='Istilah: DOC = bibit; OVK = obat/vaksin; BW = bobot badan; FCR = kg pakan per kg bobot; IP = indeks prestasi; deplesi = selisih populasi dan hasil performa.';groups.get('production').append(glossary);
  const style=doc.createElement('style');style.textContent='.rhpp-report-group{min-width:0;margin-top:22px}.rhpp-group-title{font-size:18px;color:#0b5f8f;border-bottom:2px solid #0b5f8f;padding-bottom:8px;break-after:avoid}.rhpp-group-note{margin:8px 0 14px;line-height:1.55}.rhpp-glossary dt{font-weight:700;margin-top:10px}.rhpp-glossary dd{margin:3px 0 0;line-height:1.5}.rhpp-detail-table{min-width:880px}.rhpp-report-group .rhpp-summary-cards{margin:12px 0}.rhpp-report-group .rhpp-panel{margin-bottom:14px}';source.prepend(style);
}
function rhppDocumentHtml(source,company={}){
  if(!source)throw new Error('Rincian Cek RHPP belum tersedia.');
  const clone=source.cloneNode(true);
  clone.querySelectorAll('[data-rhpp-controls],button,.report-actions,style').forEach(node=>node.remove());
  const companyName=company.legal_name||company.company_name||'Nama perusahaan belum diisi';
  const contacts=[company.address,company.phone,company.email,company.website].filter(Boolean).join(' · ');
  const logo=/^https?:\/\//i.test(company.logo_url||'')?'<img alt="Logo perusahaan" src="'+esc(company.logo_url)+'" style="max-width:80px;max-height:60px">':'';
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Rekap Hasil Pemeliharaan Peternak — RHPP</title><style>'+RHPP_SCREEN_STYLE.replace(/<\/?style[^>]*>/g,'')+'\n'+
    '@page{size:A4 landscape;margin:10mm}html,body{margin:0;background:white;color:#111;font:10pt Arial,sans-serif}.rhpp-page{display:block!important;max-width:none!important;padding:0!important}.panel,.rhpp-panel{display:block!important;box-shadow:none!important;margin:10px 0!important;padding:8px!important;border:1px solid #bbb!important;break-inside:auto!important;page-break-inside:auto!important}.tablewrap{overflow:visible!important}table{width:100%!important;min-width:0!important;border-collapse:collapse!important;table-layout:auto!important}th,td{position:static!important;white-space:normal!important;overflow-wrap:anywhere;border:1px solid #bbb;padding:5px;font-size:9pt!important}thead{display:table-header-group}tr{break-inside:avoid}h3{break-after:avoid;font-size:12pt!important}.rhpp-section-head{display:block!important}.rhpp-summary-cards,.rhpp-grid{display:block!important}.rhpp-group-title{font-size:14pt;border-bottom:2px solid #0b5f8f;padding:7px 0;color:#0b5f8f;break-after:avoid}.rhpp-report-group{margin-top:16px}.rhpp-glossary dt{font-weight:bold;margin-top:7px}.rhpp-glossary dd{margin:2px 0 0}h2,h3{break-after:avoid}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.rhpp-panel{break-inside:auto!important;page-break-inside:auto!important}footer{border-top:1px solid #bbb;padding-top:6px}.rhpp-summary-card{margin:5px 0}.rhpp-count{display:inline-block!important;white-space:normal!important}header{border-bottom:2px solid #333;padding-bottom:8px}footer{font-size:8pt;margin-top:12px}button,.report-actions{display:none!important}</style></head><body><header>'+logo+'<h2>'+esc(companyName)+'</h2><p>'+esc(contacts)+'</p><strong>REKAP HASIL PEMELIHARAAN PETERNAK (RHPP)</strong></header>'+clone.innerHTML+'<footer>Dokumen pemeriksaan RHPP · Dicetak: '+esc(new Date().toLocaleString('id-ID'))+'</footer></body></html>';
}
