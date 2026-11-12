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
function rhppOrganizeReport(source){
  if(!source||source.dataset.rhppOrganized)return;
  source.dataset.rhppOrganized='1';
  const doc=source.ownerDocument;
  const definitions=[
    ['supplies','1. Kiriman Sapronak','Sapronak adalah kebutuhan pemeliharaan: DOC (bibit ayam), pakan, serta OVK (obat dan vaksin). Periksa tanggal, nomor dokumen, jumlah, satuan, harga, dan nilai setiap kiriman.'],
    ['harvest','2. Hasil Tangkap Ayam','Rincian ayam yang ditangkap atau dipanen, termasuk jumlah ekor, berat bersih, pembeli, kendaraan, dan nilai transaksi. Tambah daging adalah pembelian ayam/daging tambahan perusahaan dan ditandai terpisah. Nilai transaksi panen mengikuti catatan Marketing; nilai produksi untuk RHPP mengikuti harga kontrak.'],
    ['returns','3. Retur Pakan','Retur adalah barang yang dikembalikan. Retur kontrak mengurangi biaya sapronak sesuai nilai yang tercatat. Retur tambahan perusahaan dan pakan yang ditahan perusahaan diberi penanda tersendiri. Retur barang lain juga dicantumkan jika ada.'],
    ['production','4. Hasil Produksi','Ringkasan populasi, hasil panen, bobot, umur, dan pemakaian pakan. Angka performa di bawah menjadi dasar penilaian sesuai kontrak.'],
    ['calculation','5. Hasil Perhitungan','Urutan nilai: pendapatan produksi dikurangi biaya sapronak bersih, ditambah bonus kontrak, kemudian dikurangi biaya tambahan perusahaan. Lihat hasil akhir pada bagian paling bawah.']
  ];
  const groups=new Map(definitions.map(([key,title,note])=>{
    const block=doc.createElement('div');block.className='rhpp-report-group';block.dataset.rhppReportGroup=key;
    const heading=doc.createElement('h2');heading.className='rhpp-group-title';heading.textContent=title;
    const p=doc.createElement('p');p.className='muted rhpp-group-note';p.textContent=note;block.append(heading,p);return [key,block];
  }));
  const mapping={'Rincian DOC & Kontrak':'supplies','Rincian Panen':'harvest','Pemakaian Pakan & Retur':'production','Tambah Sapronak Perusahaan · Di luar RHPP':'production','Ringkasan Produksi':'production','Kinerja Produksi':'production','Sapronak Kontrak RHPP':'calculation','Perhitungan RHPP':'calculation','Bonus Kontrak & Nilai RHPP':'calculation','Penyesuaian Biaya Perusahaan':'calculation'};
  const panels=[...source.querySelectorAll('section.rhpp-panel')];
  for(const panel of panels){
    if(panel.hasAttribute('data-rhpp-controls'))continue;
    const h=panel.querySelector('h3'),title=h?.textContent.trim();
    const key=panel.dataset.rhppGroup||mapping[title];
    if(key)groups.get(key).append(panel);
    if(title==='Rincian Panen')h.textContent='Rincian Hasil Tangkap / Panen Ayam';
    if(title==='Rincian DOC & Kontrak'){
      h.textContent='Data DOC Diterima & Dasar Populasi';
      const cards=panel.querySelector('.rhpp-summary-cards');if(cards)groups.get('production').append(cards);
    }
  }
  for(const block of groups.values())source.append(block);
  const glossary=doc.createElement('section');glossary.className='panel rhpp-panel rhpp-glossary';
  glossary.innerHTML='<h3>Panduan Membaca Hasil Produksi</h3><dl><dt>DOC</dt><dd>Bibit ayam yang diterima saat awal pemeliharaan.</dd><dt>DOA</dt><dd>Ayam mati saat kedatangan. Dicantumkan sebagai catatan; periode CLOSED mengikuti angka final saat ditutup.</dd><dt>BW / Bobot Badan</dt><dd>Rata-rata berat ayam per ekor, dalam kg.</dd><dt>FCR / Konversi Pakan</dt><dd>Jumlah kg pakan kontrak untuk menghasilkan 1 kg bobot ayam. Bandingkan dengan FCR standar kontrak.</dd><dt>Selisih FCR (DIFF FCR)</dt><dd>FCR standar dikurangi FCR aktual; angka positif berarti pemakaian pakan lebih efisien daripada standar.</dd><dt>IP / Indeks Prestasi</dt><dd>Nilai gabungan performa yang memperhitungkan bobot, umur, FCR, dan deplesi.</dd><dt>Deplesi hitung</dt><dd>Persentase selisih populasi awal terhadap ekor performa RHPP. Ini bukan rincian kematian harian dari Recording PPL.</dd><dt>Hasil akhir</dt><dd>Nilai RHPP kontrak setelah dikurangi biaya tambahan perusahaan. RHPP Real adalah uang yang diterima dan dicatat terpisah oleh Keuangan.</dd></dl>';
  groups.get('production').append(glossary);
  const intro=source.querySelector('.rhpp-intro');
  if(intro){intro.querySelector('h3').textContent='Rekap Hasil Pemeliharaan Peternak (RHPP)';intro.querySelector('p').textContent='Baca berurutan: kiriman sapronak → hasil tangkap ayam → retur → hasil produksi → hasil perhitungan. CLOSED berarti periode sudah ditutup. Angka final memakai catatan yang dikunci saat penutupan; rincian transaksi asal disertakan untuk pemeriksaan.';}
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
    '@page{size:A4 landscape;margin:10mm}html,body{margin:0;background:white;color:#111;font:10pt Arial,sans-serif}.rhpp-page{display:block!important;max-width:none!important;padding:0!important}.panel,.rhpp-panel{display:block!important;box-shadow:none!important;margin:10px 0!important;padding:8px!important;border:1px solid #bbb!important;break-inside:auto!important;page-break-inside:auto!important}.tablewrap{overflow:visible!important}table{width:100%!important;min-width:0!important;border-collapse:collapse!important;table-layout:auto!important}th,td{position:static!important;white-space:normal!important;overflow-wrap:anywhere;border:1px solid #bbb;padding:5px;font-size:9pt!important}thead{display:table-header-group}tr{break-inside:avoid}h3{break-after:avoid;font-size:12pt!important}.rhpp-section-head{display:block!important}.rhpp-summary-cards,.rhpp-grid{display:block!important}.rhpp-group-title{font-size:14pt;border-bottom:2px solid #0b5f8f;padding:7px 0;color:#0b5f8f;break-after:avoid}.rhpp-report-group{margin-top:16px}.rhpp-glossary dt{font-weight:bold;margin-top:7px}.rhpp-glossary dd{margin:2px 0 0}h2,h3{break-after:avoid}footer{border-top:1px solid #bbb;padding-top:6px}.rhpp-summary-card{margin:5px 0}.rhpp-count{display:inline-block!important;white-space:normal!important}header{border-bottom:2px solid #333;padding-bottom:8px}footer{font-size:8pt;margin-top:12px}button,.report-actions{display:none!important}</style></head><body><header>'+logo+'<h2>'+esc(companyName)+'</h2><p>'+esc(contacts)+'</p><strong>REKAP HASIL PEMELIHARAAN PETERNAK (RHPP)</strong></header>'+clone.innerHTML+'<footer>Dokumen pemeriksaan RHPP · Dicetak: '+esc(new Date().toLocaleString('id-ID'))+'</footer></body></html>';
}
