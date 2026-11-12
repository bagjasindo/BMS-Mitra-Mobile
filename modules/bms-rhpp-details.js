/* RHPP audit details and one shared document for print/PDF/Excel. */
function rhppLogisticsDetails(assignment,data){
  const {ships,shipItems,returns,returnItems,items,extShips,extShipItems,extReturns,extReturnItems,retained=[]}=data;
  const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const number=(v,d=2)=>known(v)?prodFmt(v,d):'-';
  const money=v=>known(v)?'Rp '+prodFmt(v,2):'-';
  const section=(title,headers,lines,parentKey,priceKey,external,isReturn)=>{
    const selected=headers.filter(h=>h.contract_assignment_id===assignment);
    const rows=selected.flatMap(h=>lines.filter(v=>v[parentKey]===h.id).map(v=>{
      const item=items.find(i=>i.id===v.item_id);
      const price=v[priceKey];
      const amount=known(v.quantity)&&known(price)?Number(v.quantity)*Number(price):null;
      const origin=external&&isReturn?extShips.find(s=>s.id===h.external_shipment_id):null;
      const reference=[h.delivery_number,h.shipping_note_number,h.reference_number,h.reference].filter(Boolean).join(' / ');
      const note=[h.status,h.notes,origin?'Asal: '+(origin.reference_number||'-'):null].filter(Boolean).join(' · ');
      return {date:h.shipment_date||h.return_date,html:'<tr><td>'+prodDateId(h.shipment_date||h.return_date)+'</td><td>'+esc(reference||'-')+'</td><td>'+esc([item?.code,item?.name].filter(Boolean).join(' · ')||v.item_id||'-')+'<br><small>'+esc(item?.category||'-')+'</small></td><td class="num">'+number(v.quantity)+'</td><td>'+esc(item?.unit||'-')+'</td><td class="num">'+number(v.quantity_kg)+'</td><td class="num">'+money(price)+'</td><td class="num">'+money(amount)+'</td><td>'+esc(note||'-')+'</td></tr>'};
    })).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    return '<section class="panel rhpp-panel rhpp-wide"><h3>'+title+'</h3><p class="muted">'+(external?'Tambahan perusahaan, terpisah dari sapronak kontrak.':'Sumber transaksi logistik kontrak.')+' Semua kategori barang ditampilkan. Tanda - berarti data tidak tercatat.</p><div class="tablewrap"><table class="rhpp-detail-table"><thead><tr><th>Tanggal</th><th>No. dokumen</th><th>Barang / Kategori</th><th>Jumlah</th><th>Satuan</th><th>Kg</th><th>Harga / Satuan</th><th>Nilai</th><th>Catatan / Status</th></tr></thead><tbody>'+ (rows.length?rows.map(r=>r.html).join(''):'<tr><td colspan="9">Tidak ada transaksi.</td></tr>')+'</tbody></table></div></section>';
  };
  const held=retained.filter(r=>r.source_assignment_id===assignment);
  const heldHtml=held.length?'<section class="panel rhpp-panel rhpp-wide"><h3>Pakan Ditahan Perusahaan</h3><p>Dicatat terpisah dari retur supplier. Tidak dijumlahkan ulang sebagai retur kontrak.</p><div class="tablewrap"><table><thead><tr><th>Dokumen retur</th><th>Barang</th><th>Jumlah</th><th>Satuan</th><th>Harga</th><th>Nilai</th></tr></thead><tbody>'+held.map(r=>{const i=items.find(i=>i.id===r.item_id),h=returns.find(h=>h.id===r.return_id);return '<tr><td>'+esc(h?.reference||'-')+'</td><td>'+esc(i?.name||'-')+'</td><td>'+number(r.quantity)+'</td><td>'+esc(i?.unit||'-')+'</td><td>'+money(r.unit_price)+'</td><td>'+money(known(r.quantity)&&known(r.unit_price)?Number(r.quantity)*Number(r.unit_price):null)+'</td></tr>';}).join('')+'</tbody></table></div></section>':'';
  return section('Rincian Kiriman Kontrak',ships,shipItems,'shipment_id','unit_price',false,false)+
    section('Rincian Retur Kontrak',returns,returnItems,'return_id','unit_price',false,true)+
    section('Rincian Kiriman Tambahan Perusahaan',extShips,extShipItems,'external_shipment_id','purchase_unit_price',true,false)+
    section('Rincian Retur Tambahan Perusahaan',extReturns,extReturnItems,'external_return_id','purchase_unit_price',true,true)+heldHtml;
}
function rhppDocumentHtml(source,company={}){
  if(!source)throw new Error('Rincian Cek RHPP belum tersedia.');
  const clone=source.cloneNode(true);
  clone.querySelectorAll('[data-rhpp-controls],button,.report-actions,style').forEach(node=>node.remove());
  const companyName=company.legal_name||company.company_name||'Nama perusahaan belum diisi';
  const contacts=[company.address,company.phone,company.email,company.website].filter(Boolean).join(' · ');
  const logo=/^https?:\/\//i.test(company.logo_url||'')?'<img alt="Logo perusahaan" src="'+esc(company.logo_url)+'" style="max-width:80px;max-height:60px">':'';
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Cek RHPP</title><style>'+RHPP_SCREEN_STYLE.replace(/<\/?style[^>]*>/g,'')+'\n'+
    '@page{size:A4 landscape;margin:10mm}html,body{margin:0;background:white;color:#111;font:10pt Arial,sans-serif}.rhpp-page{display:block!important;max-width:none!important;padding:0!important}.panel,.rhpp-panel{display:block!important;box-shadow:none!important;margin:10px 0!important;padding:8px!important;border:1px solid #bbb!important;break-inside:auto!important;page-break-inside:auto!important}.tablewrap{overflow:visible!important}table{width:100%!important;min-width:0!important;border-collapse:collapse!important;table-layout:auto!important}th,td{position:static!important;white-space:normal!important;overflow-wrap:anywhere;border:1px solid #bbb;padding:5px;font-size:9pt!important}thead{display:table-header-group}tr{break-inside:avoid}h3{break-after:avoid;font-size:12pt!important}.rhpp-section-head{display:block!important}.rhpp-summary-cards,.rhpp-grid{display:block!important}.rhpp-summary-card{margin:5px 0}.rhpp-count{display:inline-block!important;white-space:normal!important}header{border-bottom:2px solid #333;padding-bottom:8px}footer{font-size:8pt;margin-top:12px}button,.report-actions{display:none!important}</style></head><body><header>'+logo+'<h2>'+esc(companyName)+'</h2><p>'+esc(contacts)+'</p><strong>CEK RHPP · Rincian sesuai halaman pemeriksaan</strong></header>'+clone.innerHTML+'<footer>Dicetak: '+esc(new Date().toLocaleString('id-ID'))+'</footer></body></html>';
}
