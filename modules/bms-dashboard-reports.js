// Monitoring only: mirrors production feed stock, including mixed-feed recording.
function dashboardFeedSummary(g,assignment){
  const number=value=>value===null||value===undefined||value===''?null:(Number.isFinite(Number(value))?Number(value):null);
  const rows=(g.recordings||[]).filter(r=>r.contract_assignment_id===assignment.id);
  const items=new Map((g.items||[]).map(i=>[i.id,i]));
  const mixed=new Map();
  for(const line of g.recording_feed_items||[]){
    if(!mixed.has(line.recording_id))mixed.set(line.recording_id,[]);
    mixed.get(line.recording_id).push(line);
  }
  const isZak=item=>/^(zak|sak)$/i.test(String(item?.unit||'').trim());
  const used=new Map(),days=new Map();
  for(const r of rows){
    const lines=mixed.get(r.id)|| (r.feed_item_id?[{item_id:r.feed_item_id,quantity_units:r.feed_quantity_units}]:[]);
    let zak=0,known=lines.length>0;
    for(const line of lines){
      const units=number(line.quantity_units);
      if(units===null||!isZak(items.get(line.item_id)))known=false;
      else zak+=units;
      if(units!==null)used.set(line.item_id,(used.get(line.item_id)||0)+units);
    }
    const kg=number(r.feed_kg),date=String(r.recorded_on||'');
    if(!date)continue;
    const day=days.get(date)||{date,kg:0,zak:0};
    day.kg=day.kg===null||kg===null?null:day.kg+kg;
    day.zak=day.zak===null||!known?null:day.zak+zak;
    days.set(date,day);
  }
  const daily=[...days.values()].sort((a,b)=>b.date.localeCompare(a.date));
  if(g.feed_monitoring_version!==1)return {daily:[],remainingKg:null,remainingZak:null};
  const balance=new Map(),adjustment=new Map();
  const add=(id,qty)=>balance.set(id,(balance.get(id)||0)+Number(qty||0));
  const joinLines=(headers,lines,key,sign)=>{
    const ids=new Set((headers||[]).filter(h=>h.contract_assignment_id===assignment.id).map(h=>h.id));
    for(const line of lines||[])if(ids.has(line[key]))add(line.item_id,sign*Number(line.quantity||0));
  };
  joinLines(g.shipments,g.shipment_items,'shipment_id',1);
  joinLines(g.external_shipments,g.external_shipment_items,'external_shipment_id',1);
  joinLines(g.returns,g.return_items,'return_id',-1);
  const purchases=new Map((g.mandiri_feed_purchases||[]).map(p=>[p.id,p]));
  if(assignment.cycle_type==='MANDIRI')for(const line of g.mandiri_feed_allocations||[]){
    if(line.contract_assignment_id===assignment.id)add(purchases.get(line.purchase_id)?.item_id,line.quantity);
  }
  const retained=new Map((g.retained_feed||[]).map(r=>[r.id,r]));
  for(const line of g.retained_feed||[])if(line.source_assignment_id===assignment.id)add(line.item_id,-Number(line.quantity||0));
  for(const line of g.company_feed_movements||[])if(line.contract_assignment_id===assignment.id){
    add(retained.get(line.retained_feed_id)?.item_id,(line.direction==='IN'?1:-1)*Number(line.quantity||0));
  }
  for(const line of g.feed_adjustments||[])if(line.contract_assignment_id===assignment.id){
    adjustment.set(line.item_id,(adjustment.get(line.item_id)||0)+Number(line.adjustment_units||0));
  }
  let remainingKg=0,remainingZak=0;
  for(const [id,net] of balance){
    const item=items.get(id);
    if(!item||item.category!=='PAKAN'||item.active===false||net===0)continue;
    const units=Math.max(0,net-(used.get(id)||0)+(adjustment.get(id)||0));
    const kgPerUnit=number(item.kg_per_unit);
    remainingKg=remainingKg===null||kgPerUnit===null||kgPerUnit<=0?null:remainingKg+units*kgPerUnit;
    remainingZak=remainingZak===null||!isZak(item)?null:remainingZak+units;
  }
  return {daily,remainingKg,remainingZak};
}

function renderDashboardTemplate(cfg){
  const kpis=(cfg.kpis||[]).slice(0,4);
  const kpiHtml=kpis.map(x=>'<div class="card">'+esc(x.label||'')+'<strong>'+(x.value||'-')+'</strong><small>'+esc(x.small||'')+'</small></div>').join('');
  layout('<section class="owner-hero"><div><span class="owner-eyebrow">'+esc(cfg.eyebrow||'')+'</span><h3>'+esc(cfg.heading||'Dashboard')+'</h3><p>'+esc(cfg.subtitle||'')+'</p></div><span class="owner-live">LIVE DATA</span></section>'+
    '<section class="cards owner-kpis">'+kpiHtml+'</section>'+
    '<section class="owner-grid-main"><div class="panel owner-performance"><div class="owner-section-title"><div><h3>'+esc(cfg.mainTitle||'Ringkasan Utama')+'</h3><p class="muted">'+esc(cfg.mainSubtitle||'')+'</p></div></div>'+(cfg.mainHtml||'<p class="muted">Belum ada data.</p>')+'</div>'+
    '<div class="panel owner-alert-panel"><h3>'+esc(cfg.attentionTitle||'Perlu Perhatian')+'</h3><p class="muted">'+esc(cfg.attentionSubtitle||'')+'</p>'+(cfg.attentionHtml||'<div class="owner-empty-ok">Tidak ada perhatian utama.</div>')+'</div></section>'+
    '<section class="panel"><div class="owner-section-title"><div><h3>'+esc(cfg.detailTitle||'Detail Operasional')+'</h3><p class="muted">'+esc(cfg.detailSubtitle||'')+'</p></div>'+(cfg.detailBadge||'')+'</div>'+(cfg.detailHtml||'<p class="muted">Belum ada detail tambahan.</p>')+'</section>'+
    '<section class="panel owner-league"><div class="owner-section-title"><div><h3>'+esc(cfg.bottomTitle||'Ringkasan')+'</h3><p class="muted">'+esc(cfg.bottomSubtitle||'')+'</p></div>'+(cfg.bottomBadge||'')+'</div>'+(cfg.bottomHtml||'<p class="muted">Belum ada ringkasan tambahan.</p>')+'</section>');
}

async function buildDashboardModel(){
  // Dashboard adalah monitoring global read-only yang sama untuk seluruh role resmi.
  // Hak transaksi/menu tetap dikendalikan RLS dan visibleTabs masing-masing role.
  const globalR=await db.rpc('get_dashboard_global_data_v1');
  if(globalR.error)throw globalR.error;
  const g=globalR.data||{};
  const d={
    err:null,
    assignments:g.assignments||[],barns:g.barns||[],masters:g.contracts||[],
    chicks:g.chicks||[],links:g.links||[],abks:g.abks||[],items:g.items||[],
    feedItems:(g.items||[]).filter(i=>i.category==='PAKAN'),
    standards:g.standards||[],harvests:g.harvests||[],livePrices:g.live_prices||[],
    rhppCosts:g.rhpp_costs||[],scopeRows:rows=>rows||[]
  };
  const leagueSetting=await loadAbkLeagueSetting();
  const globalLeagueR={data:null,error:null},globalLeague=null;
  const recs=g.recordings||[],samples=g.weight_samples||[],estimates=g.estimates||[],estSizes=g.estimate_sizes||[],
    abkResults=(g.abk_results||[]).filter(x=>String(x.harvest_date||'')>=(leagueSetting.data?.season_start||'0000-00-00')),
    abkSizes=g.abk_result_sizes||[],costContracts=g.contracts||[],bonusRows=g.bonuses||[],rhppFinalRows=g.finals||[];
  const dashShipments=g.shipments||[],dashShipmentItems=g.shipment_items||[];
  const dashExternalShipments=g.external_shipments||[],dashExternalShipmentItems=g.external_shipment_items||[];
  const dashReturns=g.returns||[],dashReturnItems=g.return_items||[],dashItems=g.items||[];
  const err=null;
  const closedFinalAssignmentIds=new Set(rhppFinalRows.map(x=>x.contract_assignment_id).filter(Boolean));

  // Klasemen ABK khusus PPL bersifat read-only global; transaksi PPL tetap memakai scope kandang miliknya.
  const leagueAssignments=globalLeague?.assignments||d.assignments;
  const leagueBarns=globalLeague?.barns||d.barns;
  const leagueChicks=globalLeague?.chicks||d.chicks;
  const leagueLinks=globalLeague?.links||d.links;
  const leagueAbks=globalLeague?.abks||d.abks;
  const leagueResults=(globalLeague?.results||abkResults).filter(x=>String(x.harvest_date||'')>=(leagueSetting.data?.season_start||'0000-00-00'));
  const leagueSizes=globalLeague?.sizes||abkSizes;
  const leagueContracts=globalLeague?.contracts||costContracts;
  const leagueBonuses=globalLeague?.bonuses||bonusRows;
  const leagueLivePrices=globalLeague?.live_prices||d.livePrices;
  const leagueClosedFinalAssignmentIds=new Set((globalLeague?.finals||rhppFinalRows).map(x=>x.contract_assignment_id).filter(Boolean));
  const abkReferenceContractId=a=>{
    if(a?.master_contract_id)return a.master_contract_id;
    if(a?.cycle_type!=='MANDIRI')return '';
    const ids=[...new Set((leagueLivePrices||[]).map(p=>p.contract_id).filter(Boolean))];
    return ids.length===1?ids[0]:'';
  };
  const active=d.assignments.filter(a=>a.active&&d.chicks.some(ci=>ci.contract_assignment_id===a.id));
  const ownerParityIssue=profile.role==='OWNER'&&(
    (!d.assignments.length&&(recs.length||estimates.length||abkResults.length))||
    (!d.chicks.length&&recs.length)
  );
  if(ownerParityIssue){
    return {
      eyebrow:'OWNER · PRODUKSI',
      heading:'Production Command Center',
      subtitle:'Pantau performa kandang, estimasi, dan Liga ABK dalam satu layar.',
      kpis:[
        {label:'Kandang Aktif',value:'-',small:'periode berjalan'},
        {label:'Kandang Rehat',value:'-',small:'tidak ada periode aktif'},
        {label:'Total Populasi Berjalan',value:'-',small:'ekor · seluruh kandang aktif'},
        {label:'IP Gabungan Produksi Closed',value:'-',small:'gabungan seluruh snapshot produksi CLOSED'}
      ],
      mainTitle:'Performa Kandang Terbaru',
      mainSubtitle:'Recording terakhir setiap kandang aktif; tanggal ditampilkan per kandang.',
      mainHtml:'<p class="muted">Data Owner belum lengkap. Muat ulang aplikasi agar hak akses terbaru terbaca.</p>',
      attentionTitle:'Perlu Perhatian',
      attentionSubtitle:'Prioritas dari Estimasi Produksi Berjalan, lalu alert performa.',
      attentionHtml:'<div class="owner-alert-row warning"><span>!</span><div><strong>Sinkronisasi data</strong><small>Data Owner belum lengkap.</small></div></div>',
      detailTitle:'Estimasi per Kandang',
      detailSubtitle:'Estimasi terakhir dengan acuan kontrak: harga hidup, biaya sapronak, standar performa, dan bonus kontrak.',
      detailHtml:'<p class="muted">Data estimasi belum dapat ditampilkan.</p>',
      bottomTitle:'Klasemen Performa ABK',
      bottomSubtitle:'Bobot: Pendapatan/Ekor 50% · FCR 30% · IP 20%',
      bottomBadge:'<span class="owner-trophy">🏆</span>',
      bottomHtml:'<p class="muted">Data klasemen belum dapat ditampilkan.</p>'
    };
  }

  const metrics=active.map(a=>{
    const ci=d.chicks.find(x=>x.contract_assignment_id===a.id);
    // Dashboard wajib mengikuti recording nyata terbaru. Urutkan tanggal terlebih dahulu,
    // lalu umur sebagai tie-breaker agar hasil tidak bergantung pada urutan JSON/RPC.
    const rows=recs.filter(x=>x.contract_assignment_id===a.id).sort((u,v)=>{
      const byDate=String(u.recorded_on||'').localeCompare(String(v.recorded_on||''));
      return byDate||prodNum(u.age_days)-prodNum(v.age_days);
    });
    const latest=rows[rows.length-1]||null,prev=rows[rows.length-2]||null;
    const initial=Math.max(0,prodNum(ci?.received)-prodNum(ci?.doa));
    const dead=rows.reduce((s,x)=>s+prodNum(x.mortality)+prodNum(x.culling),0);
    const feed=rows.reduce((s,x)=>s+prodNum(x.feed_kg),0);
    const latestDate=latest?.recorded_on||prodToday();
    const priorHarvests=d.harvests
      .filter(h=>h.contract_assignment_id===a.id&&h.harvested_on<latestDate);
    const harvested=priorHarvests.reduce((s,h)=>s+prodNum(h.birds),0);
    const harvestedKg=priorHarvests.reduce((s,h)=>s+prodNum(h.net_weight_kg),0);
    const population=Math.max(0,initial-dead-harvested);
    const liveHarvested=d.harvests
      .filter(h=>h.contract_assignment_id===a.id&&String(h.harvested_on||'')<=prodToday())
      .reduce((sum,h)=>sum+prodNum(h.birds),0);
    const livePopulation=Math.max(0,initial-dead-liveHarvested);
    const ws=latest?samples.filter(s=>s.recording_id===latest.id).map(s=>prodNum(s.weight_g)):[];
    const bwg=ws.length?ws.reduce((s,x)=>s+x,0)/ws.length:prodNum(latest?.avg_weight_kg)*1000;
    const bw=bwg/1000,standingBiomass=population*bw,totalProducedKg=standingBiomass+harvestedKg;
    const fcr=totalProducedKg>0?feed/totalProducedKg:0;
    const dep=initial>0?dead/initial*100:0;
    const age=prodNum(latest?.age_days);
    const ip=age>0&&fcr>0?((100-dep)*bw*100)/(age*fcr):0;
    const prevWs=prev?samples.filter(s=>s.recording_id===prev.id).map(s=>prodNum(s.weight_g)):[];
    const prevBwg=prevWs.length?prevWs.reduce((s,x)=>s+x,0)/prevWs.length:prodNum(prev?.avg_weight_kg)*1000;
    const st=d.standards.find(s=>(a.cycle_type==='MANDIRI'||s.contract_id===a.master_contract_id)&&s.template_name===a.performance_template_name&&prodNum(s.age_days)===age);
    const fc=initial>0?feed*1000/initial:0;
    const fcStd=prodNum(st?.std_feed_g_per_bird);
    const fcLow=!!(latest&&fcStd>0&&fc<fcStd);
    const currentAge=ci?.arrived_on?prodAge(ci.arrived_on,prodToday()):0;
    const recordingAge=latest?prodNum(latest.age_days):0;
    const alerts=[];
    if(currentAge>=1&&!latest)alerts.push('Recording belum diisi · umur saat ini '+currentAge+' hari');
    if(latest&&currentAge>recordingAge)alerts.push('Recording terakhir umur '+recordingAge+' hari · umur saat ini '+currentAge+' hari');
    if(latest&&st?.std_body_weight_g&&bwg<prodNum(st.std_body_weight_g))alerts.push('BW di bawah standar');
    if(latest&&st?.std_fcr&&fcr>prodNum(st.std_fcr))alerts.push('FCR di atas standar');
    if(fcLow)alerts.push('FC di bawah standar');
    return {a,ci,latest,initial,harvested,population,liveHarvested,livePopulation,feed,fc,fcStd,fcLow,bwg,bw,fcr,dep,age,currentAge,recordingAge,ip,prevBwg,st,alerts};
  });
  const valid=metrics.filter(x=>x.latest);
  const avg=k=>valid.length?valid.reduce((s,x)=>s+prodNum(x[k]),0)/valid.length:0;
  const ownerActiveBarnIds=new Set(active.map(a=>a.barn_id));
  const ownerRestingBarnCount=d.barns.filter(b=>b.active!==false&&!ownerActiveBarnIds.has(b.id)).length;
  const ownerToday=prodToday();
  const ownerRunningInitial=active.reduce((sum,a)=>{
    const ci=d.chicks.find(x=>x.contract_assignment_id===a.id);
    return sum+Math.max(0,prodNum(ci?.received)-prodNum(ci?.doa));
  },0);
  const ownerRunningDead=recs
    .filter(r=>active.some(a=>a.id===r.contract_assignment_id))
    .reduce((sum,r)=>sum+prodNum(r.mortality)+prodNum(r.culling),0);
  const ownerRunningHarvested=d.harvests
    .filter(h=>active.some(a=>a.id===h.contract_assignment_id)&&String(h.harvested_on||'')<=ownerToday)
    .reduce((sum,h)=>sum+prodNum(h.birds),0);
  const ownerRunningPopulation=Math.max(0,ownerRunningInitial-ownerRunningDead-ownerRunningHarvested);
  const ownerClosedRhpp=rhppFinalRows.filter(x=>prodNum(x.total_harvest_birds)>0);
  const ownerClosedTotals=ownerClosedRhpp.reduce((o,x)=>{
    const birds=prodNum(x.total_harvest_birds);
    o.chickIn+=prodNum(x.chick_in_birds);
    o.depletion+=prodNum(x.depletion_birds);
    o.birds+=birds;
    o.kg+=prodNum(x.total_harvest_kg);
    o.feed+=prodNum(x.net_feed_kg);
    o.ageWeight+=prodNum(x.weighted_age)*Math.max(1,birds);
    return o;
  },{chickIn:0,depletion:0,birds:0,kg:0,feed:0,ageWeight:0});
  const ownerClosedAge=ownerClosedTotals.birds>0?ownerClosedTotals.ageWeight/ownerClosedTotals.birds:0;
  const ownerClosedAvg=ownerClosedTotals.birds>0?ownerClosedTotals.kg/ownerClosedTotals.birds:0;
  const ownerClosedFcr=ownerClosedTotals.kg>0?ownerClosedTotals.feed/ownerClosedTotals.kg:0;
  const ownerClosedSurvival=ownerClosedTotals.chickIn>0
    ?Math.min(100,(ownerClosedTotals.chickIn-ownerClosedTotals.depletion)/ownerClosedTotals.chickIn*100)
    :0;
  const ownerClosedIpTotal=ownerClosedAge&&ownerClosedFcr&&ownerClosedAvg
    ?(ownerClosedSurvival*ownerClosedAvg*100)/(ownerClosedAge*ownerClosedFcr)
    :0;

  const performanceCards=metrics.map(x=>{
    const b=d.barns.find(v=>v.id===x.a.barn_id);
    const currentAge=x.currentAge;
    const trend=!x.latest?'':x.prevBwg?(x.bwg>x.prevBwg?'↑':x.bwg<x.prevBwg?'↓':'→'):'→';
    const feedSummary=dashboardFeedSummary(g,x.a),lastFeed=feedSummary.daily[0];
    const feedAmount=(kg,zak)=> (kg===null||kg===undefined?'-':prodFmt(kg,2)+' kg')+' / '+(zak===null||zak===undefined?'-':prodFmt(zak,2)+' zak');
    const feedHtml='<div class="dashboard-feed-summary">'+
      '<div><span>Sisa Pakan</span><strong>'+feedAmount(feedSummary.remainingKg,feedSummary.remainingZak)+'</strong><small>Stok kiriman setelah pemakaian recording dan retur</small></div>'+
      '<div><span>Pakai Pakan / Hari</span><strong>'+feedAmount(lastFeed?.kg,lastFeed?.zak)+'</strong><small>'+(lastFeed?'Recording '+prodDateId(lastFeed.date):'Belum ada recording pakan')+'</small></div></div>'+
      (feedSummary.daily.length?'<details class="dashboard-feed-history"><summary>Riwayat pemakaian harian · 7 tanggal terakhir</summary>'+feedSummary.daily.slice(0,7).map(day=>'<div><span>'+prodDateId(day.date)+'</span><strong>'+feedAmount(day.kg,day.zak)+'</strong></div>').join('')+'</details>':'');
    const isSim=String(x.latest?.notes||'').includes('SIMULASI DASHBOARD KPI'); const alert=isSim?'<span class="owner-sim">SIMULASI</span>':(x.alerts.length?'<span class="owner-alert">'+esc(x.alerts[0])+'</span>':'<span class="owner-ok">Normal</span>');
    return '<article class="owner-barn-card"><div class="owner-barn-head"><div><strong>'+esc(b?shortBarnLabel(b):'-')+'</strong><small>Umur saat ini <strong>'+(currentAge||0)+' hari</strong> · Recording masuk <strong>'+(x.latest?'umur '+x.recordingAge+' hari':'belum ada')+'</strong> · '+(x.latest?prodDateId(x.latest.recorded_on):'-')+'</small></div>'+alert+'</div>'+
      '<div class="owner-metrics"><div><span>Sisa Ayam Saat Ini</span><b>'+prodFmt(x.livePopulation,0)+'</b></div><div><span>BW</span><b>'+prodFmt(x.bw,3)+' kg '+trend+'</b></div><div><span>FCR</span><b>'+prodFmt(x.fcr,3)+'</b></div><div><span>IP</span><b>'+prodFmt(x.ip,1)+'</b></div></div>'+
      feedHtml+'<div class="owner-card-foot"><strong>Populasi Awal '+prodFmt(x.initial,0)+' ekor</strong> · Terpanen sampai hari ini '+prodFmt(x.liveHarvested,0)+' ekor · Sisa Ayam '+prodFmt(x.livePopulation,0)+' ekor<br>Deplesi '+prodFmt(x.dep,2)+'% · <span class="'+(x.fcLow?'owner-fc-low':'owner-fc-ok')+'">FC '+prodFmt(x.fc,0)+' g/ekor'+(x.fcStd>0?' / Std '+prodFmt(x.fcStd,0):'')+'</span> · Pakan Kumulatif '+prodFmt(x.feed,0)+' Kg</div></article>';
  }).join('');

  const latestEst=active.map(a=>estimates.find(e=>e.contract_assignment_id===a.id)).filter(Boolean);
  const latestEstStockResponses=await Promise.all(latestEst.map(e=>
    db.rpc('production_feed_stock_as_of',{
      p_contract_assignment_id:e.contract_assignment_id,
      p_as_of_date:e.estimated_on
    })
  ));
  const latestEstStockById=new Map(latestEst.map((e,i)=>[e.id,latestEstStockResponses[i]?.data||[]]));
  const estimateDashboardData=latestEst.map(e=>{
    const a=active.find(x=>x.id===e.contract_assignment_id);
    const b=d.barns.find(x=>x.id===a?.barn_id);
    const ci=d.chicks.find(x=>x.contract_assignment_id===a?.id);
    const sz=estSizes.filter(s=>s.estimate_id===e.id);

    const initial=ci?Math.max(0,prodNum(ci.received)-prodNum(ci.doa)):0;
    const estimateBirds=sz.reduce((sum,row)=>sum+prodNum(row.birds),0);
    const estimateBio=sz.reduce((sum,row)=>sum+prodNum(row.birds)*prodNum(row.bw_kg),0);

    const recToDate=recs.filter(r=>r.contract_assignment_id===e.contract_assignment_id&&String(r.recorded_on||'')<=String(e.estimated_on||''));
    const mortalityBirds=recToDate.reduce((sum,r)=>sum+prodNum(r.mortality)+prodNum(r.culling),0);
    const feedKg=recToDate.reduce((sum,r)=>sum+prodNum(r.feed_kg),0);

    const priorHarvests=d.harvests.filter(h=>h.contract_assignment_id===e.contract_assignment_id&&h.harvested_on<e.estimated_on);
    const harvestedBirds=priorHarvests.reduce((sum,h)=>sum+prodNum(h.birds),0);
    const harvestedKg=priorHarvests.reduce((sum,h)=>sum+prodNum(h.net_weight_kg),0);
    const priorRevenue=estimateContractHarvestValue(d,a,priorHarvests);

    const projectedRemainingRevenue=sz.reduce((sum,row)=>{
      const rowBw=prodNum(row.bw_kg),rowBirds=prodNum(row.birds);
      return sum+rowBirds*rowBw*estimateContractLivePrice(d,a,rowBw);
    },0);

    const outBirds=harvestedBirds+estimateBirds;
    const totalProjectedKg=harvestedKg+estimateBio;
    const avgProjectedBw=outBirds>0?totalProjectedKg/outBirds:0;
    const fcr=totalProjectedKg>0?feedKg/totalProjectedKg:0;
    const fc=initial>0?feedKg*1000/initial:0;
    const mort=initial>0?mortalityBirds/initial*100:0;
    const survival=initial>0?Math.min(100,outBirds/initial*100):0;
    const projectedAge=ci?prodAge(ci.arrived_on,e.estimated_on):0;
    const harvestedAgeWeight=ci?priorHarvests.reduce((sum,h)=>sum+prodAge(ci.arrived_on,h.harvested_on)*prodNum(h.birds),0):0;
    const age=outBirds>0?(harvestedAgeWeight+projectedAge*estimateBirds)/outBirds:projectedAge;
    const ip=age>0&&fcr>0?(survival*avgProjectedBw*100)/(age*fcr):0;

    const std=d.standards.find(row=>
      row.contract_id===a?.master_contract_id&&
      row.template_name===a?.performance_template_name&&
      prodNum(row.age_days)===Math.round(age)
    );
    const fcStd=prodNum(std?.std_feed_g_per_bird);
    const fcrStd=estimateStandardFcr(d,a,age);

    const matchBonus=(metric,value)=>{
      const row=bonusRows.find(v=>
        v.contract_id===a?.master_contract_id&&
        v.metric===metric&&
        (v.min_value==null||value>=prodNum(v.min_value))&&
        (v.max_value==null||value<prodNum(v.max_value))
      );
      return prodNum(row?.rupiah_per_kg);
    };

    const totalProjection=priorRevenue+projectedRemainingRevenue;
    const sapSnapshot=estimateSapronakSnapshot({
      d,a,ci,recToDate,
      shipments:dashShipments,shipmentItems:dashShipmentItems,
      externalShipments:dashExternalShipments,externalShipmentItems:dashExternalShipmentItems,
      returns:dashReturns,returnItems:dashReturnItems,
      items:dashItems,estimatedOn:e.estimated_on,
      officialFeedStock:latestEstStockById.get(e.id)||[]
    });
    const sapronakCost=sapSnapshot.totalCost;
    const ipBonus=totalProjectedKg*matchBonus('IP',ip);
    const fcrDiff=fcrStd>0?fcrStd-fcr:0;
    const fcrBonus=fcrDiff>0?totalProjectedKg*matchBonus('FCR_DIFFERENCE',fcrDiff):0;
    const depletionBonus=totalProjectedKg*matchBonus('DEPLETION',mort);
    const estimatedFarmerProfit=totalProjection-sapronakCost+ipBonus+fcrBonus+depletionBonus;
    const revenuePerBird=initial>0?estimatedFarmerProfit/initial:0;

    return {e,a,b,ci,initial,outBirds,age,totalProjectedKg,mort,feedKg,bw:avgProjectedBw,fc,fcStd,ip,revenuePerBird};
  });

  const estimateCards=estimateDashboardData.map(x=>{
    const canOpenEstimate=false; // Dashboard monitoring dibuat identik/read-only untuk semua role.
    return '<article class="owner-estimate-card'+(canOpenEstimate?' owner-estimate-link':'')+'"'+
      (canOpenEstimate?' data-open-estimate="'+esc(x.e.contract_assignment_id)+'" role="button" tabindex="0" aria-label="Buka data estimasi '+esc(x.b?shortBarnLabel(x.b):'kandang')+'"':'')+'>'+
      '<div class="owner-estimate-head"><div><strong>'+esc(x.b?shortBarnLabel(x.b):'-')+'</strong><small>'+prodDateId(x.e.estimated_on)+'</small></div><span>'+(canOpenEstimate?'Lihat Estimasi':'Estimasi')+'</span></div>'+
      '<div class="owner-estimate-metrics">'+
        '<div><span>IN</span><b>'+prodFmt(x.initial,0)+'</b></div>'+
        '<div><span>OUT</span><b>'+prodFmt(x.outBirds,0)+'</b></div>'+
        '<div><span>Umur Rata2</span><b>'+prodFmt(x.age,2)+' hari</b></div>'+
        '<div><span>Kg Panen</span><b>'+prodFmt(x.totalProjectedKg,0)+' Kg</b></div>'+
        '<div><span>Mort</span><b>'+prodFmt(x.mort,2)+'%</b></div>'+
        '<div><span>Pakan</span><b>'+prodFmt(x.feedKg,0)+' Kg</b></div>'+
        '<div><span>BW</span><b>'+prodFmt(x.bw,3)+' Kg</b></div>'+
        '<div><span>FC</span><b>'+prodFmt(x.fc,0)+' g/ekor</b></div>'+
        '<div><span>IP</span><b>'+prodFmt(x.ip,1)+'</b></div>'+
        '<div><span>Pend./Ekor</span><b>Rp '+prodFmt(x.revenuePerBird,0)+'</b></div>'+
      '</div></article>';
  }).join('');

  const leagueRaw=leagueResults.map(x=>{
    const a=leagueAssignments.find(v=>v.id===x.contract_assignment_id),ci=leagueChicks.find(v=>v.contract_assignment_id===x.contract_assignment_id),link=leagueLinks.find(v=>v.contract_assignment_id===x.contract_assignment_id&&v.abk_id===x.abk_id);
    const sz=leagueSizes.filter(v=>v.result_id===x.id);
    const birds=sz.reduce((s,v)=>s+prodNum(v.birds),0),kg=sz.reduce((s,v)=>s+prodNum(v.weight_kg),0),bw=birds?kg/birds:0;
    const feed=(prodNum(link?.feed_pre_bags)+prodNum(link?.feed_starter_bags)+prodNum(link?.feed_finisher_bags))*50;
    const fcr=kg?feed/kg:0;
    const age=birds&&ci?sz.reduce((s,v)=>s+prodAge(ci.arrived_on,v.harvest_date)*prodNum(v.birds),0)/birds:0;
    const initial=prodNum(link?.initial_birds),surv=initial?Math.min(100,birds/initial*100):0;
    const ip=initial&&age&&fcr?(surv*bw*100)/(age*fcr):0;
    const refContractId=abkReferenceContractId(a);
    let revenue=0;
    for(const s of sz){
      const av=prodNum(s.birds)?prodNum(s.weight_kg)/prodNum(s.birds):0;
      const p=leagueLivePrices.find(p=>p.contract_id===refContractId&&av>=prodNum(p.min_weight_kg)&&(p.max_weight_kg==null||av<prodNum(p.max_weight_kg)));
      revenue+=prodNum(s.weight_kg)*prodNum(p?.price_per_kg);
    }
    const cc=leagueContracts.find(v=>v.id===refContractId);
    const cost=initial*prodNum(cc?.doc_price)+prodNum(link?.feed_pre_bags)*50*prodNum(cc?.pre_starter_price)+prodNum(link?.feed_starter_bags)*50*prodNum(cc?.starter_price)+prodNum(link?.feed_finisher_bags)*50*prodNum(cc?.finisher_price);
    const match=(metric,value)=>prodNum(leagueBonuses.find(v=>v.contract_id===refContractId&&v.metric===metric&&(v.min_value==null||value>=prodNum(v.min_value))&&(v.max_value==null||value<prodNum(v.max_value)))?.rupiah_per_kg);
    const ipBonus=kg*match('IP',ip);
    const profit=revenue-cost+ipBonus;
    const perBird=birds?profit/birds:0;
    return {...x,a,birds,kg,bw,fcr,ip,perBird,feed,profit,initialPopulation:initial,complete:!!link?.basics_locked_at&&initial>0&&birds>0&&kg>0&&feed>0};
  }).filter(x=>x.complete&&x.a?.active===false&&leagueClosedFinalAssignmentIds.has(x.contract_assignment_id));
  const abkChickInCycles=abkId=>{
    const refs=(leagueLinks||[])
      .filter(l=>l.abk_id===abkId)
      .map(l=>{
        const a=leagueAssignments.find(v=>v.id===l.contract_assignment_id);
        const ci=leagueChicks.find(v=>v.contract_assignment_id===l.contract_assignment_id);
        return {link:l,a,ci,date:String(ci?.arrived_on||a?.start_date||'')};
      })
      .filter(x=>x.a&&x.ci&&x.a.active===false&&leagueClosedFinalAssignmentIds.has(x.a.id))
      .sort((u,v)=>u.date.localeCompare(v.date)||String(u.a.created_at||'').localeCompare(String(v.a.created_at||'')));
    return refs;
  };

  const leagueMap=new Map();
  leagueRaw.forEach(x=>{
    const key=x.abk_id;
    if(!leagueMap.has(key))leagueMap.set(key,{...x,birds:0,harvestBirds:0,kg:0,feed:0,profit:0,ipWeighted:0,totalPopulation:0,periods:0});
    const g=leagueMap.get(key);
    g.birds+=prodNum(x.birds);
    g.harvestBirds=(prodNum(g.harvestBirds)+prodNum(x.birds));
    g.kg+=prodNum(x.kg);
    g.feed+=prodNum(x.feed);
    g.profit+=prodNum(x.profit);
    g.totalPopulation+=prodNum(x.initialPopulation);
    g.ipWeighted+=prodNum(x.ip)*prodNum(x.birds);
    g.periods+=1;
  });
  const league=[...leagueMap.values()].map(g=>{
    const abkCycles=abkChickInCycles(g.abk_id);
    const latestCycle=abkCycles[abkCycles.length-1]||null;
    return {
      ...g,
      a:latestCycle?.a||g.a,
      abkCycleNo:abkCycles.length||g.periods,
      bw:g.birds?g.kg/g.birds:0,
      fcr:g.kg?g.feed/g.kg:0,
      ip:g.birds?g.ipWeighted/g.birds:0,
      perBird:g.birds?g.profit/g.birds:0
    };
  }).filter(g=>leagueAbks.find(e=>e.id===g.abk_id)?.active!==false);
  const max=k=>Math.max(...league.map(x=>prodNum(x[k])),0),min=k=>Math.min(...league.map(x=>prodNum(x[k])).filter(v=>v>0),0);
  league.forEach(x=>{const hi=k=>max(k)?prodNum(x[k])/max(k):0,lo=k=>prodNum(x[k])>0&&min(k)>0?min(k)/prodNum(x[k]):0;x.score=hi('perBird')*.50+lo('fcr')*.30+hi('ip')*.20});
  league.sort((a,b)=>b.score-a.score);
  const leagueRows=league.map((x,i)=>{
    const e=leagueAbks.find(v=>v.id===x.abk_id),b=leagueBarns.find(v=>v.id===x.a?.barn_id);
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
    return '<tr><td class="owner-rank">'+medal+'</td><td>'+esc(leagueAbkName(e))+'</td><td>'+esc(b?shortBarnLabel(b):'-')+'</td><td class="num"><strong>'+prodFmt(x.periods,0)+'</strong></td><td class="num">'+prodFmt(x.totalPopulation,0)+'</td><td class="num">'+prodFmt(x.harvestBirds,0)+'</td><td class="num">Rp '+prodFmt(x.perBird,0)+'</td><td class="num">'+prodFmt(x.ip,1)+'</td><td class="num">'+prodFmt(x.fcr,3)+'</td><td class="num">'+prodFmt(x.bw,3)+'</td></tr>';
  }).join('');
  const leagueCards=league.map((x,i)=>{
    const e=leagueAbks.find(v=>v.id===x.abk_id),b=leagueBarns.find(v=>v.id===x.a?.barn_id);
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
    return '<article class="owner-league-card"><div class="owner-league-rank">'+medal+'</div><div class="owner-league-main"><strong>'+esc(leagueAbkName(e))+'</strong><small>'+esc(b?shortBarnLabel(b):'-')+'</small></div>'+
      '<div class="owner-league-stats"><div><span>Siklus ABK</span><b>'+prodFmt(x.abkCycleNo,0)+'</b></div><div><span>Populasi</span><b>'+prodFmt(x.totalPopulation,0)+'</b></div><div><span>Ekor Panen</span><b>'+prodFmt(x.harvestBirds,0)+'</b></div><div><span>Rp/Ekor</span><b>'+prodFmt(x.perBird,0)+'</b></div><div><span>IP</span><b>'+prodFmt(x.ip,1)+'</b></div><div><span>FCR</span><b>'+prodFmt(x.fcr,3)+'</b></div><div><span>BW</span><b>'+prodFmt(x.bw,3)+'</b></div></div></article>';
  }).join('');

  const estimateAttention=[];
  const todayIso=prodToday();
  const dayDiff=(a,b)=>Math.floor((new Date(String(b).slice(0,10)+'T00:00:00')-new Date(String(a).slice(0,10)+'T00:00:00'))/86400000);
  active.forEach(a=>{
    const b=d.barns.find(v=>v.id===a.barn_id);
    const name=b?shortBarnLabel(b):'-';
    const ci=d.chicks.find(v=>v.contract_assignment_id===a.id);
    const currentAge=ci?.arrived_on?prodAge(ci.arrived_on,todayIso):0;
    // Estimasi baru wajib mulai umur 23. Sebelum itu bukan kondisi masalah.
    if(currentAge<23)return;
    const e=estimates.find(v=>v.contract_assignment_id===a.id);
    if(!e){
      estimateAttention.push({barn:name,text:'Belum ada estimasi produksi · umur saat ini '+currentAge+' hari',level:'danger'});
      return;
    }
    const ageDays=dayDiff(e.estimated_on,todayIso);
    if(ageDays>=3)estimateAttention.push({barn:name,text:'Estimasi terakhir '+prodDateId(e.estimated_on)+' · umur saat ini '+currentAge+' hari · perlu diperbarui',level:'warning'});
    // Nilai perhatian Estimasi hanya memakai data yang benar-benar diisi/dihitung modul Estimasi PPL.
    // Jangan membuat alert laba dari kolom placeholder yang tidak dipakai modul Estimasi PPL.
  });
  const productionAttention=metrics.flatMap(x=>{
    const b=d.barns.find(v=>v.id===x.a.barn_id);
    return x.alerts.map(a=>({barn:b?shortBarnLabel(b):'-',text:a,level:'danger'}));
  });
  const attention=[...estimateAttention,...productionAttention].slice(0,8);
  const alertHtml=attention.length?attention.map(x=>'<div class="owner-alert-row '+esc(x.level||'')+'"><span>!</span><div><strong>'+esc(x.barn)+'</strong><small>'+esc(x.text)+'</small></div></div>').join(''):'<div class="owner-empty-ok">Estimasi seluruh kandang aktif masih dalam kondisi normal.</div>';

  return {
    eyebrow:'OWNER · PRODUKSI',
    heading:'Production Command Center',
    subtitle:'Pantau performa kandang, estimasi, dan Liga ABK dalam satu layar.',
    kpis:[
      {label:'Kandang Aktif',value:String(active.length),small:'periode berjalan'},
      {label:'Kandang Rehat',value:String(ownerRestingBarnCount),small:'tidak ada periode aktif'},
      {label:'Total Sisa Ayam Berjalan',value:prodFmt(ownerRunningPopulation,0)+' ekor',small:'Populasi awal '+prodFmt(ownerRunningInitial,0)+' · Terpanen '+prodFmt(ownerRunningHarvested,0)+' · Deplesi '+prodFmt(ownerRunningDead,0)+' · update '+prodDateId(ownerToday)},
      {label:'IP Gabungan Produksi Closed',value:prodFmt(ownerClosedIpTotal,2),small:'gabungan seluruh snapshot produksi CLOSED'}
    ],
    mainTitle:'Performa Kandang Terbaru',
    mainSubtitle:'Recording terakhir setiap kandang aktif; tanggal ditampilkan per kandang.',
    mainHtml:'<div class="owner-barn-grid">'+(performanceCards||'<p class="muted">Belum ada kandang aktif.</p>')+'</div>',
    attentionTitle:'Perlu Perhatian',
    attentionSubtitle:'Prioritas dari Estimasi Produksi Berjalan, lalu alert performa.',
    attentionHtml:alertHtml,
    detailTitle:'Estimasi per Kandang',
    detailSubtitle:'Estimasi produksi terakhir yang tersimpan.',
    detailBadge:'<span class="pill">'+latestEst.length+' estimasi</span>',
    detailHtml:'<div class="owner-estimate-grid">'+estimateCards+'</div>'+(latestEst.length?'':'<p class="muted">Belum ada estimasi aktif.</p>'),
    bottomTitle:'Klasemen Performa ABK',
    bottomSubtitle:'Musim sejak '+prodDateId(leagueSetting.data?.season_start||'')+' · Bobot: Pendapatan/Ekor 50% · FCR 30% · IP 20%',
    bottomBadge:'<span class="owner-trophy">🏆</span>',
    bottomHtml:'<div class="owner-desktop-only tablewrap"><table class="owner-table"><thead><tr><th>Peringkat</th><th>ABK</th><th>Kandang Terakhir</th><th class="num">Siklus</th><th class="num">Total Populasi</th><th class="num">Total Ekor Panen</th><th class="num">Pendapatan/Ekor</th><th class="num">IP</th><th class="num">FCR</th><th class="num">BW</th></tr></thead><tbody>'+leagueRows+'</tbody></table></div><div class="owner-mobile-only owner-league-mobile">'+leagueCards+'</div>'+(league.length?'':'<p class="muted">Belum ada hasil Liga ABK yang lengkap.</p>')
  };
  if(err)msg(err.message);
}












async function dashboard(){
  const model=await buildDashboardModel();
  if(tab!=='dashboard'||!model)return;
  model.eyebrow='DASHBOARD PRODUKSI';
  renderDashboardTemplate(model);
  root.querySelectorAll('[data-open-estimate]').forEach(card=>{
    const openEstimate=()=>{
      if(!canViewTab('estimasi'))return;
      window.__pplEstimateAssignment=card.dataset.openEstimate||'';
      window.__bmsTxnList=window.__bmsTxnList||{};
      window.__bmsTxnList.pplEstimate={from:'',to:'',barn:'',assignment:'',status:'',page:0};
      tab='estimasi';
      logAppActivity('MENU_OPEN','estimasi',{label:title.estimasi||'Estimasi',source:'dashboard_estimate_card'});
      render();
    };
    card.onclick=openEstimate;
    card.onkeydown=e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        openEstimate();
      }
    };
  });
}

async function marketingReports(){
  const [br,ar,cr,hr,mr,sr,cpr]=await Promise.all([
    db.from('barns').select('id,code,name').order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type').order('start_date',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('marketing_contract_harvests').select('*').order('harvested_on',{ascending:false}),
    db.from('marketing_external_meat_purchases').select('*').order('purchase_date',{ascending:false}),
    db.from('suppliers').select('id,code,name,supplier_type').eq('supplier_type','DAGING').order('code',{ascending:true}),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email').eq('id',true).maybeSingle()
  ]);
  const barns=br.data||[], assignments=ar.data||[], contractsRows=cr.data||[], harvests=hr.data||[], meatRows=mr.data||[], suppliers=sr.data||[], company=cpr.data||{};
  const assignmentById=new Map(assignments.map(a=>[a.id,a]));
  const buyerNames=[...new Set(harvests.map(x=>String(x.buyer_name||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));

  let html='<section class="panel"><h3>Laporan Marketing</h3>'+
    '<form id="marketingReportFilter" class="form-vertical">'+
      '<label>Tanggal Awal<input type="date" name="date_from"></label>'+
      '<label>Tanggal Akhir<input type="date" name="date_to"></label>'+
      '<label>Cari / Pilih Kandang<input id="marketingReportBarnSearch" autocomplete="off" placeholder="Kosong = Semua Kandang"></label>'+
      '<input type="hidden" name="barn_id" id="marketingReportBarnId">'+
      '<div id="marketingReportBarnSuggestions" class="search-suggestions"></div>'+
      '<button type="button" id="marketingReportAllBarns">Semua Kandang</button>'+
      '<label>Siklus<select name="assignment_id" id="marketingReportCycle" disabled><option value="">Semua Siklus</option></select></label>'+
      '<label>Jenis Siklus<select name="cycle_type"><option value="">Semua</option><option value="MITRA">MITRA</option><option value="MANDIRI">MANDIRI</option></select></label>'+
      '<label>Jenis Transaksi<select name="kind"><option value="">Semua</option><option value="PANEN">Panen</option><option value="DAGING">Tambah Daging</option></select></label>'+
      '<label>Pembeli<select name="buyer"><option value="">Semua Pembeli</option>'+buyerNames.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('')+'</select></label>'+
      '<label>Supplier Daging<select name="supplier_id"><option value="">Semua Supplier</option>'+suppliers.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.code+' · '+s.name)+'</option>').join('')+'</select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>'+
    '<section class="panel" id="marketingReportOutput" style="display:none">'+
      '<div class="report-actions"><button type="button" id="marketingPrint">Cetak</button> <button type="button" id="marketingPdf">PDF</button> <button type="button" id="marketingExcel">Excel</button></div>'+
      '<div id="marketingReportSections"></div>'+
      '<div id="marketingReportSummary"></div>'+
      '<p id="marketingReportEmpty" class="muted"></p>'+
    '</section>';
  layout(html);
  [br,ar,cr,hr,mr,sr,cpr].forEach(x=>{if(x.error)msg(x.error.message)});

  const marketingReportBarnSearch=document.getElementById('marketingReportBarnSearch');
  const marketingReportBarnId=document.getElementById('marketingReportBarnId');
  const marketingReportBarnSuggestions=document.getElementById('marketingReportBarnSuggestions');
  const marketingReportCycle=document.getElementById('marketingReportCycle');
  const syncMarketingCycles=()=>{
    const bid=marketingReportBarnId?.value||'';
    const rows=bid?assignments.filter(a=>a.barn_id===bid):[];
    if(marketingReportCycle){
      marketingReportCycle.disabled=!bid;
      marketingReportCycle.innerHTML='<option value="">Semua Siklus</option>'+rows.map(a=>'<option value="'+esc(a.id)+'">'+esc(assignmentCycleLabel(assignments,a)+' · '+(a.cycle_type||'MITRA')+' · '+prodDateId(a.start_date)+' · '+(a.active?'AKTIF':'CLOSED'))+'</option>').join('');
    }
  };
  if(marketingReportBarnSearch&&marketingReportBarnId&&marketingReportBarnSuggestions){
    marketingReportBarnSearch.oninput=()=>{
      const q=(marketingReportBarnSearch.value||'').trim().toLowerCase();
      marketingReportBarnId.value='';
      syncMarketingCycles();
      const rows=q?barns.filter(b=>[b.code,b.name].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,5):[];
      marketingReportBarnSuggestions.innerHTML=rows.map(b=>'<button type="button" class="search-suggestion" data-marketing-report-barn="'+esc(b.id)+'"><strong>'+esc(shortBarnLabel(b))+'</strong></button>').join('');
      if(q&&!rows.length)marketingReportBarnSuggestions.innerHTML='<div class="search-empty">Kandang tidak ditemukan.</div>';
      marketingReportBarnSuggestions.querySelectorAll('[data-marketing-report-barn]').forEach(btn=>btn.onclick=()=>{
        const b=barns.find(x=>x.id===btn.dataset.marketingReportBarn);if(!b)return;
        marketingReportBarnId.value=b.id;marketingReportBarnSearch.value=shortBarnLabel(b);marketingReportBarnSuggestions.innerHTML='';syncMarketingCycles();
      });
    };
    document.getElementById('marketingReportAllBarns').onclick=()=>{
      marketingReportBarnId.value='';marketingReportBarnSearch.value='';marketingReportBarnSuggestions.innerHTML='';syncMarketingCycles();
    };
  }

  let filteredHarvests=[],filteredMeat=[];

  const renderRows=()=>{
    const output=document.getElementById('marketingReportOutput');
    if(output)output.style.display='';
    const fd=new FormData(document.getElementById('marketingReportFilter'));
    const from=String(fd.get('date_from')||''),to=String(fd.get('date_to')||''),barnId=String(fd.get('barn_id')||''),assignmentId=String(fd.get('assignment_id')||''),kind=String(fd.get('kind')||''),cycleType=String(fd.get('cycle_type')||''),buyer=String(fd.get('buyer')||''),supplierId=String(fd.get('supplier_id')||'');

    const matchAssignment=x=>{
      const a=assignmentById.get(x.contract_assignment_id);
      return (!barnId||x.barn_id===barnId)&&
        (!assignmentId||x.contract_assignment_id===assignmentId)&&
        (!cycleType||(a?.cycle_type||'MITRA')===cycleType);
    };

    filteredHarvests=kind==='DAGING'?[]:harvests.filter(x=>
      (!from||x.harvested_on>=from)&&(!to||x.harvested_on<=to)&&
      matchAssignment(x)&&(!buyer||String(x.buyer_name||'')===buyer)
    );
    filteredMeat=kind==='PANEN'?[]:meatRows.filter(x=>
      (!from||x.purchase_date>=from)&&(!to||x.purchase_date<=to)&&
      matchAssignment(x)&&(!supplierId||x.supplier_id===supplierId)
    );

    const mitraHarvests=filteredHarvests.filter(x=>(assignmentById.get(x.contract_assignment_id)?.cycle_type||'MITRA')==='MITRA');
    const mandiriHarvests=filteredHarvests.filter(x=>(assignmentById.get(x.contract_assignment_id)?.cycle_type||'MITRA')==='MANDIRI');

    const totalsForHarvest=rows=>({
      birds:rows.reduce((n,x)=>n+Number(x.birds||0),0),
      kg:rows.reduce((n,x)=>n+Number(x.net_weight_kg||0),0),
      value:rows.reduce((n,x)=>n+Number(x.total_amount||0),0)
    });
    const mitraTotal=totalsForHarvest(mitraHarvests);
    const mandiriTotal=totalsForHarvest(mandiriHarvests);
    const harvestTotal=totalsForHarvest(filteredHarvests);
    const meatKg=filteredMeat.reduce((n,x)=>n+Number(x.weight_kg||0),0);
    const meatCost=filteredMeat.reduce((n,x)=>n+Number(x.weight_kg||0)*Number(x.purchase_price_per_kg||0),0);
    const handledKg=harvestTotal.kg+meatKg;
    const netCommercial=harvestTotal.value-meatCost;

    const harvestSection=(title,rows,total)=>{
      if(!rows.length)return '';
      return '<section class="report-section-block"><h3>'+esc(title)+'</h3>'+
        '<div class="tablewrap"><table class="marketingReportTable"><thead><tr><th>Tanggal</th><th>Kandang / Siklus</th><th>Jenis</th><th>Ekor</th><th>Kg</th><th>Avg Kg</th><th>Harga/Kg</th><th>Total</th><th>Pembeli</th><th>Referensi</th></tr></thead><tbody>'+
        rows.map(x=>{const a=assignmentById.get(x.contract_assignment_id);return '<tr><td>'+prodDateId(x.harvested_on||'')+'</td><td>'+esc(assignmentIdentity(assignments,barns,contractsRows,a))+'</td><td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td><td>'+fmtNumber(x.birds)+'</td><td>'+fmtNumber(x.net_weight_kg)+'</td><td>'+fmtNumber(x.avg_weight_kg)+'</td><td>Rp '+fmtNumber(x.price_per_kg)+'</td><td>Rp '+fmtNumber(x.total_amount)+'</td><td>'+esc(x.buyer_name||'-')+'</td><td>'+esc(x.transaction_number||'-')+'</td></tr>';}).join('')+
        '</tbody></table></div>'+
        '<div class="rhpp-summary-cards" style="margin-top:10px">'+
          '<div class="rhpp-summary-card"><span>Transaksi</span><strong>'+rows.length+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Ekor</span><strong>'+fmtNumber(total.birds)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Kg</span><strong>'+fmtNumber(total.kg)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Nilai</span><strong>Rp '+fmtNumber(total.value)+'</strong></div>'+
        '</div></section>';
    };

    const meatTable=filteredMeat.length?'<section class="report-section-block"><h3>TAMBAH DAGING</h3>'+
      '<div class="tablewrap"><table class="marketingReportTable"><thead><tr><th>Tanggal</th><th>Kandang / Siklus</th><th>Jenis</th><th>Supplier</th><th>Barang</th><th>Kg</th><th>Harga/Kg</th><th>Total</th><th>Referensi</th></tr></thead><tbody>'+
      filteredMeat.map(x=>{const a=assignmentById.get(x.contract_assignment_id),s=suppliers.find(v=>v.id===x.supplier_id),total=Number(x.weight_kg||0)*Number(x.purchase_price_per_kg||0);return '<tr><td>'+prodDateId(x.purchase_date||'')+'</td><td>'+esc(assignmentIdentity(assignments,barns,contractsRows,a))+'</td><td><strong>'+esc(a?.cycle_type||'MITRA')+'</strong></td><td>'+esc(s?.name||'-')+'</td><td>'+esc(x.product_name||'-')+'</td><td>'+fmtNumber(x.weight_kg)+'</td><td>Rp '+fmtNumber(x.purchase_price_per_kg)+'</td><td>Rp '+fmtNumber(total)+'</td><td>'+esc(x.reference_number||'-')+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      '<div class="rhpp-summary-cards" style="margin-top:10px">'+
        '<div class="rhpp-summary-card"><span>Transaksi</span><strong>'+filteredMeat.length+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Kg</span><strong>'+fmtNumber(meatKg)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Biaya</span><strong>Rp '+fmtNumber(meatCost)+'</strong></div>'+
      '</div></section>':'';

    document.getElementById('marketingReportSections').innerHTML=
      harvestSection('PANEN MITRA',mitraHarvests,mitraTotal)+
      harvestSection('PANEN MANDIRI',mandiriHarvests,mandiriTotal)+
      meatTable;

    document.getElementById('marketingReportSummary').innerHTML=
      (filteredHarvests.length||filteredMeat.length?
      '<section class="report-section-block" style="margin-top:16px"><h3>REKAP AKHIR MARKETING</h3>'+
      '<div class="tablewrap"><table><thead><tr><th>Kategori</th><th>Transaksi</th><th>Ekor</th><th>Kg</th><th>Nilai</th></tr></thead><tbody>'+
        '<tr><td>Panen Mitra</td><td>'+mitraHarvests.length+'</td><td>'+fmtNumber(mitraTotal.birds)+'</td><td>'+fmtNumber(mitraTotal.kg)+'</td><td>Rp '+fmtNumber(mitraTotal.value)+'</td></tr>'+
        '<tr><td>Panen Mandiri</td><td>'+mandiriHarvests.length+'</td><td>'+fmtNumber(mandiriTotal.birds)+'</td><td>'+fmtNumber(mandiriTotal.kg)+'</td><td>Rp '+fmtNumber(mandiriTotal.value)+'</td></tr>'+
        '<tr><td>Tambah Daging</td><td>'+filteredMeat.length+'</td><td>-</td><td>'+fmtNumber(meatKg)+'</td><td>Rp '+fmtNumber(meatCost)+'</td></tr>'+
      '</tbody></table></div>'+
      '<div class="rhpp-summary-cards" style="margin-top:12px">'+
        '<div class="rhpp-summary-card"><span>Total Panen</span><strong>'+fmtNumber(harvestTotal.birds)+' ekor</strong></div>'+
        '<div class="rhpp-summary-card"><span>Kg Panen</span><strong>'+fmtNumber(harvestTotal.kg)+' Kg</strong></div>'+
        '<div class="rhpp-summary-card"><span>Kg Tambah Daging</span><strong>'+fmtNumber(meatKg)+' Kg</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Volume</span><strong>'+fmtNumber(handledKg)+' Kg</strong></div>'+
        '<div class="rhpp-summary-card"><span>Nilai Panen</span><strong>Rp '+fmtNumber(harvestTotal.value)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Biaya Tambah Daging</span><strong>Rp '+fmtNumber(meatCost)+'</strong></div>'+
        '<div class="rhpp-summary-card rhpp-summary-value"><span>Nilai Panen - Biaya Tambah Daging</span><strong>Rp '+fmtNumber(netCommercial)+'</strong></div>'+
      '</div></section>':'');
    document.getElementById('marketingReportEmpty').textContent=(filteredHarvests.length||filteredMeat.length)?'':'Tidak ada data sesuai filter.';
  };
  document.getElementById('marketingReportFilter').onsubmit=e=>{e.preventDefault();renderRows();};

  const reportHtml=()=>{
    const fd=new FormData(document.getElementById('marketingReportFilter'));
    const from=fd.get('date_from')||'-',to=fd.get('date_to')||'-',barnId=fd.get('barn_id')||'',kind=fd.get('kind')||'Semua',cycleType=fd.get('cycle_type')||'Semua',buyer=fd.get('buyer')||'Semua',supplierId=fd.get('supplier_id')||'';
    const b=barns.find(x=>x.id===barnId),supplier=suppliers.find(x=>x.id===supplierId);
    return '<!doctype html><html><head><meta charset="utf-8"><title>Laporan Marketing</title>'+
      '<style>@page{size:A4 landscape;margin:5mm}html,body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:9px;line-height:1.15}h2{margin:0 0 3px;font-size:13px}h3{margin:4px 0 2px;font-size:10px}p{margin:2px 0 4px}table{width:100%;border-collapse:collapse;font-size:8.5px}th,td{border:1px solid #999;padding:2px 3px;text-align:left;white-space:nowrap}thead{display:table-header-group}tr{break-inside:avoid}.print-letterhead{display:flex;align-items:center;gap:8px;border-bottom:1.5px solid #222;padding-bottom:3px;margin-bottom:3px}.print-letterhead img{width:50px;height:50px;object-fit:contain}</style></head><body>'+
      '<div class="print-letterhead">'+'<img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'">'+'<div><h2>'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2><div style="white-space:pre-line">'+esc(company.address||'')+'</div>'+(company.phone?'<div>Tel/WA: '+esc(company.phone)+'</div>':'')+(company.email?'<div>'+esc(company.email)+'</div>':'')+'</div></div>'+
      '<h2>Laporan Marketing</h2><p>Periode: '+esc(String(from))+' s/d '+esc(String(to))+' · Kandang: '+esc(b?shortBarnLabel(b):'Semua Kandang')+' · Siklus: '+esc(String(cycleType))+' · Jenis: '+esc(String(kind))+' · Pembeli: '+esc(String(buyer))+' · Supplier: '+esc(supplier?.name||'Semua')+'</p>'+
      document.getElementById('marketingReportSections').innerHTML+
      document.getElementById('marketingReportSummary').innerHTML+
      '</body></html>';
  };

  const printOpen=(pdf=false)=>{
    renderRows();
    const w=window.open('','_blank');if(!w)return msg('Popup cetak diblokir browser.');
    w.document.write(pdf?reportHtml().replace('<title>Laporan Marketing</title>','<title>Laporan_Marketing_PDF</title>'):reportHtml());w.document.close();
    setTimeout(()=>{w.focus();w.print();},500);
  };
  document.getElementById('marketingPrint').onclick=()=>printOpen(false);
  document.getElementById('marketingPdf').onclick=()=>BMSCore.savePdfHtml(reportHtml(),'Laporan_Marketing.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
  document.getElementById('marketingExcel').onclick=()=>{
    renderRows();
    const html=document.getElementById('marketingReportSections').innerHTML+document.getElementById('marketingReportSummary').innerHTML;
    const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml('<html><head><meta charset="utf-8"></head><body>'+html+'</body></html>')]);
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Laporan_Marketing.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}

async function logisticsReports(){
  const [br,ir,sr,sir,rr,rir,er,eir,exr,erir,etr,supr,ar,kr,mpr,mar,cpr]=await Promise.all([
    db.from('barns').select('id,code,name,location,kind').order('code',{ascending:true}),
    db.from('items').select('id,code,name,category,unit,kg_per_unit').order('code',{ascending:true}),
    db.from('logistics_shipments').select('id,contract_assignment_id,barn_id,shipment_date,shipping_note_number,notes').order('shipment_date',{ascending:false}),
    db.from('logistics_shipment_items').select('shipment_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('logistics_returns').select('id,contract_assignment_id,barn_id,return_date,reference,notes').order('return_date',{ascending:false}),
    db.from('logistics_return_items').select('return_id,item_id,quantity,quantity_kg,unit_price'),
    db.from('logistics_external_shipments').select('id,contract_assignment_id,barn_id,supplier_id,shipment_date,reference_number,notes').order('shipment_date',{ascending:false}),
    db.from('logistics_external_shipment_items').select('id,external_shipment_id,item_id,quantity,quantity_kg,purchase_unit_price'),
    db.from('logistics_external_returns').select('id,contract_assignment_id,barn_id,supplier_id,return_date,reference,notes,status').order('return_date',{ascending:false}),
    db.from('logistics_external_return_items').select('id,external_return_id,external_shipment_item_id,item_id,quantity'),
    db.from('logistics_external_return_transfers').select('id,external_return_item_id,item_id,source_barn_id,target_barn_id,quantity,transferred_on,notes').order('transferred_on',{ascending:false}),
    db.from('suppliers').select('id,code,name,supplier_type').eq('supplier_type','SAPRONAK').order('code',{ascending:true}),
    db.from('logistics_contract_assignments').select('id,barn_id,master_contract_id,start_date,active,cycle_type').order('start_date',{ascending:false}),
    db.from('contracts').select('id,number').is('cycle_id',null),
    db.from('logistics_mandiri_purchases').select('*').order('purchase_date',{ascending:false}),
    db.from('logistics_mandiri_purchase_allocations').select('*').order('created_at',{ascending:true}),
    db.from('company_profile').select('company_name,legal_name,logo_url,address,phone,email,website').eq('id',true).maybeSingle()
  ]);

  const barns=br.data||[], itemsAll=ir.data||[], shipments=sr.data||[], shipmentItems=sir.data||[], returns=rr.data||[], returnItems=rir.data||[], externalHeaders=er.data||[], externalItems=eir.data||[], externalReturns=exr.data||[], externalReturnItems=erir.data||[], externalTransfers=etr.data||[], supplierRows=supr.data||[], assignments=ar.data||[], contractsRows=kr.data||[], mandiriPurchases=mpr.data||[], mandiriAllocations=mar.data||[], company=cpr.data||{};
  const shipmentRows=shipmentItems.map(x=>{
    const head=shipments.find(s=>s.id===x.shipment_id);
    const item=itemsAll.find(i=>i.id===x.item_id);
    return head&&item?{
      type:'Pengiriman',
      date:head.shipment_date,
      barn_id:head.barn_id,
      assignment_id:head.contract_assignment_id||'',
      shipping_note_number:head.shipping_note_number||'',
      reference:'',
      item_id:item.id,
      item_code:item.code,
      item_name:item.name,
      category:item.category,
      quantity:x.quantity,
      quantity_kg:x.quantity_kg,
      unit_price:x.unit_price,
      total_value:Number(x.quantity||0)*Number(x.unit_price||0),
      unit:item.unit,
      notes:head.notes||'',
      supplier_name:''
    }:null;
  }).filter(Boolean);

  const returnRows=returnItems.map(x=>{
    const head=returns.find(r=>r.id===x.return_id);
    const item=itemsAll.find(i=>i.id===x.item_id);
    return head&&item?{
      type:'Retur',
      date:head.return_date,
      barn_id:head.barn_id,
      assignment_id:head.contract_assignment_id||'',
      shipping_note_number:'',
      reference:head.reference||'',
      item_id:item.id,
      item_code:item.code,
      item_name:item.name,
      category:item.category,
      quantity:x.quantity,
      quantity_kg:x.quantity_kg,
      unit_price:x.unit_price,
      total_value:(x.unit_price==null?null:Number(x.quantity||0)*Number(x.unit_price||0)),
      unit:item.unit,
      notes:head.notes||'',
      supplier_name:''
    }:null;
  }).filter(Boolean);

  const externalRows=externalItems.map(x=>{
    const head=externalHeaders.find(h=>h.id===x.external_shipment_id);
    const item=itemsAll.find(i=>i.id===x.item_id);
    const supplier=supplierRows.find(s=>s.id===head?.supplier_id);
    return head&&item?{
      type:'Sapronak Luar',
      date:head.shipment_date,
      barn_id:head.barn_id,
      assignment_id:head.contract_assignment_id||'',
      shipping_note_number:'',
      reference:head.reference_number||'',
      item_id:item.id,
      item_code:item.code,
      item_name:item.name,
      category:item.category,
      quantity:x.quantity,
      quantity_kg:x.quantity_kg,
      unit_price:x.purchase_unit_price,
      total_value:Number(x.quantity||0)*Number(x.purchase_unit_price||0),
      unit:item.unit,
      notes:head.notes||'',
      supplier_name:supplier?.name||''
    }:null;
  }).filter(Boolean);

  const externalReturnRows=externalReturnItems.map(x=>{
    const head=externalReturns.find(r=>r.id===x.external_return_id);
    const item=itemsAll.find(i=>i.id===x.item_id);
    const source=externalItems.find(i=>i.id===x.external_shipment_item_id);
    const supplier=supplierRows.find(s=>s.id===head?.supplier_id);
    const qtyKg=item?.category==='PAKAN'?Number(x.quantity||0)*Number(item?.kg_per_unit||0):null;
    const unitPrice=source?.purchase_unit_price??null;
    return head&&item?{
      type:'Retur Sapronak Luar',date:head.return_date,barn_id:head.barn_id,assignment_id:head.contract_assignment_id||'',target_barn_id:'',
      shipping_note_number:'',reference:head.reference||'',item_id:item.id,item_code:item.code,item_name:item.name,
      category:item.category,quantity:x.quantity,quantity_kg:qtyKg,unit_price:unitPrice,
      total_value:(unitPrice==null?null:Number(x.quantity||0)*Number(unitPrice||0)),unit:item.unit,
      notes:head.notes||'',supplier_name:supplier?.name||'',status:head.status||'DRAFT'
    }:null;
  }).filter(Boolean);

  const externalTransferRows=externalTransfers.map(t=>{
    const ri=externalReturnItems.find(x=>x.id===t.external_return_item_id);
    const erow=externalReturns.find(x=>x.id===ri?.external_return_id);
    const item=itemsAll.find(i=>i.id===t.item_id);
    const supplier=supplierRows.find(s=>s.id===erow?.supplier_id);
    const qtyKg=item?.category==='PAKAN'?Number(t.quantity||0)*Number(item?.kg_per_unit||0):null;
    return item?{
      type:'Transfer Retur',date:t.transferred_on,barn_id:t.source_barn_id,assignment_id:erow?.contract_assignment_id||'',target_barn_id:t.target_barn_id,
      shipping_note_number:'',reference:'',item_id:item.id,item_code:item.code,item_name:item.name,
      category:item.category,quantity:t.quantity,quantity_kg:qtyKg,unit_price:null,total_value:null,unit:item.unit,
      notes:t.notes||'',supplier_name:supplier?.name||'',status:'TERKIRIM'
    }:null;
  }).filter(Boolean);

  const mandiriRows=mandiriAllocations.map(x=>{
    const p=mandiriPurchases.find(v=>v.id===x.purchase_id);
    const assignment=assignments.find(v=>v.id===x.contract_assignment_id);
    const item=itemsAll.find(v=>v.id===p?.item_id);
    const supplier=supplierRows.find(v=>v.id===p?.supplier_id);
    if(!p||!assignment||!item)return null;
    const kgPerUnit=Number(item.kg_per_unit||0);
    return {
      type:'Pembelian Mandiri',
      date:p.purchase_date,
      barn_id:assignment.barn_id,
      assignment_id:assignment.id,
      target_barn_id:'',
      shipping_note_number:'',
      reference:p.reference_number||'',
      item_id:item.id,
      item_code:item.code,
      item_name:item.name,
      category:item.category,
      quantity:x.quantity,
      quantity_kg:kgPerUnit>0?Number(x.quantity||0)*kgPerUnit:null,
      unit_price:p.purchase_unit_price,
      total_value:Number(x.quantity||0)*Number(p.purchase_unit_price||0),
      unit:item.unit,
      notes:p.notes||'',
      supplier_name:supplier?.name||'',
      status:assignment.active?'TERDISTRIBUSI':'TERKUNCI'
    };
  }).filter(Boolean);

  const allRows=[...shipmentRows,...returnRows,...externalRows,...externalReturnRows,...externalTransferRows,...mandiriRows].sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  let html='<section class="panel"><h3>Laporan Logistik</h3>'+
    '<form id="logisticsReportFilter" class="form-vertical">'+
      '<label>Tanggal Awal<input type="date" name="date_from"></label>'+
      '<label>Tanggal Akhir<input type="date" name="date_to"></label>'+
      '<label>Cari / Pilih Kandang<input id="reportBarnSearch" autocomplete="off" placeholder="Kosong = Semua Kandang"></label>'+
      '<input type="hidden" name="barn_id" id="reportBarnId">'+
      '<div id="reportBarnSuggestions" class="search-suggestions"></div>'+
      '<button type="button" id="reportAllBarns">Semua Kandang</button>'+
      '<label>Siklus<select name="assignment_id" id="logisticsReportCycle" disabled><option value="">Semua Siklus</option></select></label>'+
      '<label>Jenis Transaksi<select name="txn_type">'+
        '<option value="">Semua</option><option value="PENGIRIMAN">Pengiriman</option><option value="PEMBELIAN_MANDIRI">Pembelian Mandiri</option><option value="SAPRONAK_LUAR">Sapronak Luar</option><option value="RETUR_RHPP">Retur RHPP</option><option value="RETUR_LUAR">Retur Sapronak Luar</option><option value="TRANSFER_RETUR">Transfer Retur</option>'+
      '</select></label>'+
      '<label>Kategori Sapronak<select name="category">'+
        '<option value="">Semua</option><option value="DOC">DOC</option><option value="PAKAN">Pakan</option><option value="OVK">OVK</option><option value="LAINNYA">Lainnya</option>'+
      '</select></label>'+
      '<label>Supplier<select name="supplier_name"><option value="">Semua Supplier</option>'+supplierRows.map(s=>'<option value="'+esc(s.name)+'">'+esc(s.code+' · '+s.name)+'</option>').join('')+'</select></label>'+
      '<label>Item Sapronak<select name="item_id"><option value="">Semua Item</option>'+itemsAll.map(i=>'<option value="'+esc(i.id)+'">'+esc(i.code+' · '+i.name)+'</option>').join('')+'</select></label>'+
      '<label>Status<select name="status"><option value="">Semua Status</option><option value="DRAFT">DRAFT</option><option value="TERDISTRIBUSI">TERDISTRIBUSI</option><option value="TERKIRIM">TERKIRIM</option><option value="TERKUNCI">TERKUNCI</option></select></label>'+
      '<button type="submit">Tampilkan</button>'+
    '</form></section>'+
    '<section class="panel" id="logisticsReportOutput" style="display:none">'+
      '<div class="report-actions">'+
        '<button type="button" id="logisticsPrint">Cetak</button> '+
        '<button type="button" id="logisticsPdf">PDF</button> '+
        '<button type="button" id="logisticsExcel">Excel</button>'+
      '</div>'+
      '<div id="logisticsReportSections"></div>'+
      '<div id="logisticsReportSummary"></div>'+
      '<p id="logisticsReportEmpty" class="muted">Atur filter lalu tekan Tampilkan.</p>'+
    '</section>';

  layout(html);

  const reportBarnSearch=document.getElementById('reportBarnSearch');
  const reportBarnId=document.getElementById('reportBarnId');
  const reportBarnSuggestions=document.getElementById('reportBarnSuggestions');
  const reportAllBarns=document.getElementById('reportAllBarns');
  const logisticsReportCycle=document.getElementById('logisticsReportCycle');
  const syncLogisticsReportCycles=()=>{
    const bid=reportBarnId?.value||'';
    const rows=bid?assignments.filter(a=>a.barn_id===bid):[];
    if(logisticsReportCycle){
      logisticsReportCycle.disabled=!bid;
      logisticsReportCycle.innerHTML='<option value="">Semua Siklus</option>'+rows.map(a=>'<option value="'+esc(a.id)+'">'+esc(assignmentCycleLabel(assignments,a)+' · '+(a.cycle_type||'MITRA')+' · '+prodDateId(a.start_date)+' · '+(a.active?'AKTIF':'CLOSED'))+'</option>').join('');
    }
  };
  const renderReportBarnSuggestions=()=>{
    const q=(reportBarnSearch.value||'').trim().toLowerCase();
    reportBarnId.value='';
    syncLogisticsReportCycles();
    const rows=q?barns.filter(x=>{
      const hay=[x.code,x.name,x.location,x.kind].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0,5):[];
    reportBarnSuggestions.innerHTML=rows.map(x=>'<button type="button" class="search-suggestion" data-barn-id="'+esc(x.id)+'"><strong>'+esc(x.code+' · '+x.name)+'</strong><br><small>'+esc([x.location,x.kind].filter(Boolean).join(' · '))+'</small></button>').join('');
    if(q&&!rows.length)reportBarnSuggestions.innerHTML='<div class="search-empty">Kandang tidak ditemukan.</div>';
    reportBarnSuggestions.querySelectorAll('[data-barn-id]').forEach(btn=>btn.onclick=()=>{
      const b=barns.find(x=>x.id===btn.dataset.barnId);
      if(!b)return;
      reportBarnSearch.value=shortBarnLabel(b);
      reportBarnId.value=b.id;
      reportBarnSuggestions.innerHTML='';
      syncLogisticsReportCycles();
    });
  };
  reportBarnSearch.oninput=renderReportBarnSuggestions;
  reportBarnSearch.onfocus=renderReportBarnSuggestions;
  reportAllBarns.onclick=()=>{
    reportBarnSearch.value='';
    reportBarnId.value='';
    reportBarnSuggestions.innerHTML='';
    syncLogisticsReportCycles();
  };

  const err=br.error||ir.error||sr.error||sir.error||rr.error||rir.error||er.error||eir.error||exr.error||erir.error||etr.error||supr.error||ar.error||kr.error||mpr.error||mar.error||cpr.error;
  if(err)msg(err.message);

  let filtered=[];

  const renderRows=()=>{
    const output=document.getElementById('logisticsReportOutput');
    if(output)output.style.display='';
    const form=document.getElementById('logisticsReportFilter');
    const fd=new FormData(form);
    const from=String(fd.get('date_from')||'');
    const to=String(fd.get('date_to')||'');
    const barnId=String(fd.get('barn_id')||'');
    const assignmentId=String(fd.get('assignment_id')||'');
    const txnType=String(fd.get('txn_type')||'');
    const category=String(fd.get('category')||'');
    const supplierName=String(fd.get('supplier_name')||'');
    const itemId=String(fd.get('item_id')||'');
    const status=String(fd.get('status')||'');

    const txnMatch=x=>!txnType||
      (txnType==='PENGIRIMAN'&&x.type==='Pengiriman')||
      (txnType==='PEMBELIAN_MANDIRI'&&x.type==='Pembelian Mandiri')||
      (txnType==='SAPRONAK_LUAR'&&x.type==='Sapronak Luar')||
      (txnType==='RETUR_RHPP'&&x.type==='Retur')||
      (txnType==='RETUR_LUAR'&&x.type==='Retur Sapronak Luar')||
      (txnType==='TRANSFER_RETUR'&&x.type==='Transfer Retur');
    const categoryMatch=x=>!category||(category==='LAINNYA'?!['DOC','PAKAN','OVK'].includes(x.category):x.category===category);

    filtered=allRows.filter(x=>
      (!from||x.date>=from)&&
      (!to||x.date<=to)&&
      (!barnId||(x.barn_id===barnId||x.target_barn_id===barnId))&&
      (!assignmentId||x.assignment_id===assignmentId)&&
      txnMatch(x)&&categoryMatch(x)&&
      (!supplierName||x.supplier_name===supplierName)&&
      (!itemId||x.item_id===itemId)&&
      (!status||x.status===status)
    );

    const renderTable=(titleText,rows)=>{
      if(!rows.length)return '';
      const rowHtml=rows.map(x=>{
        const barn=barns.find(b=>b.id===x.barn_id);
        const assignment=assignments.find(a=>a.id===x.assignment_id);
        return '<tr>'+
          '<td>'+esc(x.date||'-')+'</td>'+
          '<td>'+esc(assignment?assignmentIdentity(assignments,barns,contractsRows,assignment):(barn?shortBarnLabel(barn):'-'))+'</td>'+
          '<td>'+esc(x.target_barn_id?(shortBarnLabel(barns.find(b=>b.id===x.target_barn_id))||'-'):'-')+'</td>'+
          '<td>'+esc(x.type)+'</td>'+
          '<td>'+esc(x.category||'-')+'</td>'+
          '<td>'+esc(x.item_code||'-')+'</td>'+
          '<td>'+esc(x.item_name||'-')+'</td>'+
          '<td>'+esc(x.supplier_name||'-')+'</td>'+
          '<td>'+fmtNumber(x.quantity)+'</td>'+
          '<td>'+esc(x.unit||'-')+'</td>'+
          '<td>'+fmtNumber(x.quantity_kg)+'</td>'+
          '<td>'+fmtNumber(x.unit_price)+'</td>'+
          '<td>'+fmtNumber(x.total_value)+'</td>'+
          '<td>'+esc(x.shipping_note_number||'-')+'</td>'+
          '<td>'+esc(x.reference||'-')+'</td>'+
          '<td>'+esc(x.status||'-')+'</td>'+
        '</tr>';
      }).join('');
      const qty=rows.reduce((n,x)=>n+Number(x.quantity||0),0);
      const kg=rows.reduce((n,x)=>n+Number(x.quantity_kg||0),0);
      const value=rows.reduce((n,x)=>n+Number(x.total_value||0),0);
      const unit=[...new Set(rows.map(x=>x.unit).filter(Boolean))].join(' / ');
      return '<section class="report-section-block">'+
        '<h3>'+esc(titleText)+'</h3>'+
        '<div class="tablewrap"><table class="logisticsReportTable">'+
          '<thead><tr><th>Tanggal</th><th>Kandang Asal</th><th>Kandang Tujuan</th><th>Jenis</th><th>Kategori</th><th>Kode</th><th>Sapronak</th><th>Supplier</th><th>Jumlah</th><th>Satuan</th><th>Kg</th><th>Harga/Satuan</th><th>Total</th><th>No. SJ Kiriman</th><th>Referensi</th><th>Status</th></tr></thead>'+
          '<tbody>'+rowHtml+'</tbody>'+
        '</table></div>'+
        '<div class="rhpp-summary-cards" style="margin-top:10px">'+
          '<div class="rhpp-summary-card"><span>Jumlah Baris</span><strong>'+rows.length+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Qty'+(unit?' · '+esc(unit):'')+'</span><strong>'+fmtNumber(qty)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Kg</span><strong>'+fmtNumber(kg)+'</strong></div>'+
          '<div class="rhpp-summary-card"><span>Total Nilai</span><strong>Rp '+prodFmt(value,0)+'</strong></div>'+
        '</div>'+
      '</section>';
    };

    const sections=document.getElementById('logisticsReportSections');
    if(txnType||category){
      const txLabel={PENGIRIMAN:'PENGIRIMAN',PEMBELIAN_MANDIRI:'PEMBELIAN MANDIRI',SAPRONAK_LUAR:'SAPRONAK LUAR',RETUR_RHPP:'RETUR RHPP',RETUR_LUAR:'RETUR SAPRONAK LUAR',TRANSFER_RETUR:'TRANSFER RETUR'}[txnType]||'';
      const titleParts=[txLabel,category].filter(Boolean);
      sections.innerHTML=renderTable(titleParts.join(' · ')||'HASIL',filtered);
    }else{
      sections.innerHTML=
        renderTable('PENGIRIMAN',filtered.filter(x=>x.type==='Pengiriman'))+
        renderTable('PEMBELIAN MANDIRI',filtered.filter(x=>x.type==='Pembelian Mandiri'))+
        renderTable('SAPRONAK LUAR',filtered.filter(x=>x.type==='Sapronak Luar'))+
        renderTable('RETUR RHPP',filtered.filter(x=>x.type==='Retur'))+
        renderTable('RETUR SAPRONAK LUAR',filtered.filter(x=>x.type==='Retur Sapronak Luar'))+
        renderTable('TRANSFER RETUR',filtered.filter(x=>x.type==='Transfer Retur'));
    }

    document.getElementById('logisticsReportEmpty').textContent=filtered.length?'':'Tidak ada data sesuai filter.';
    const shipRows=filtered.filter(x=>x.type==='Pengiriman');
    const mandiriReportRows=filtered.filter(x=>x.type==='Pembelian Mandiri');
    const extRows=filtered.filter(x=>x.type==='Sapronak Luar');
    const extRetRows=filtered.filter(x=>x.type==='Retur Sapronak Luar');
    const transferRows=filtered.filter(x=>x.type==='Transfer Retur');
    const retRows=filtered.filter(x=>x.type==='Retur');
    const totalShipRows=shipRows.length;
    const totalReturnRows=retRows.length;
    const totalShipValue=shipRows.reduce((n,x)=>n+Number(x.total_value||0),0);
    const totalReturnValue=retRows.reduce((n,x)=>n+Number(x.total_value||0),0);
    const grandTotal=totalShipValue-totalReturnValue;

    const docRows=shipRows.filter(x=>x.category==='DOC');
    const feedRows=shipRows.filter(x=>x.category==='PAKAN');
    const ovkRows=shipRows.filter(x=>x.category==='OVK');

    const docQty=docRows.reduce((n,x)=>n+Number(x.quantity||0),0);
    const docValue=docRows.reduce((n,x)=>n+Number(x.total_value||0),0);
    const feedQty=feedRows.reduce((n,x)=>n+Number(x.quantity||0),0);
    const feedKg=feedRows.reduce((n,x)=>n+Number(x.quantity_kg||0),0);
    const feedValue=feedRows.reduce((n,x)=>n+Number(x.total_value||0),0);
    const ovkQty=ovkRows.reduce((n,x)=>n+Number(x.quantity||0),0);
    const ovkKg=ovkRows.reduce((n,x)=>n+Number(x.quantity_kg||0),0);
    const ovkValue=ovkRows.reduce((n,x)=>n+Number(x.total_value||0),0);
    const returnQty=retRows.reduce((n,x)=>n+Number(x.quantity||0),0);
    const returnKg=retRows.reduce((n,x)=>n+Number(x.quantity_kg||0),0);
    const shipKg=shipRows.reduce((n,x)=>n+Number(x.quantity_kg||0),0);
    const netKg=shipKg-returnKg;

    const otherRows=shipRows.filter(x=>!['DOC','PAKAN','OVK'].includes(x.category));
    const otherQty=otherRows.reduce((n,x)=>n+Number(x.quantity||0),0);
    const otherKg=otherRows.reduce((n,x)=>n+Number(x.quantity_kg||0),0);
    const otherValue=otherRows.reduce((n,x)=>n+Number(x.total_value||0),0);
    document.getElementById('logisticsReportSummary').innerHTML=
      '<section class="report-section-block" style="margin-top:16px"><h3>REKAP AKHIR LOGISTIK</h3>'+
      '<div class="rhpp-summary-cards">'+
        '<div class="rhpp-summary-card"><span>Total Baris</span><strong>'+filtered.length+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Pengiriman</span><strong>'+totalShipRows+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Retur RHPP</span><strong>'+totalReturnRows+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Saldo Bersih Kg</span><strong>'+fmtNumber(netKg)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Nilai Pengiriman</span><strong>Rp '+prodFmt(totalShipValue,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Nilai Retur</span><strong>Rp '+prodFmt(totalReturnValue,0)+'</strong></div>'+
        '<div class="rhpp-summary-card rhpp-summary-value"><span>Nilai Bersih Pengiriman − Retur</span><strong>Rp '+prodFmt(grandTotal,0)+'</strong></div>'+
      '</div>'+
      '<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Kategori</th><th>Qty Pengiriman</th><th>Kg</th><th>Nilai</th></tr></thead><tbody>'+
        '<tr><td>DOC</td><td>'+fmtNumber(docQty)+'</td><td>-</td><td>Rp '+prodFmt(docValue,0)+'</td></tr>'+
        '<tr><td>PAKAN</td><td>'+fmtNumber(feedQty)+'</td><td>'+fmtNumber(feedKg)+'</td><td>Rp '+prodFmt(feedValue,0)+'</td></tr>'+
        '<tr><td>OVK</td><td>'+fmtNumber(ovkQty)+'</td><td>'+fmtNumber(ovkKg)+'</td><td>Rp '+prodFmt(ovkValue,0)+'</td></tr>'+
        '<tr><td>LAINNYA</td><td>'+fmtNumber(otherQty)+'</td><td>'+fmtNumber(otherKg)+'</td><td>Rp '+prodFmt(otherValue,0)+'</td></tr>'+
      '</tbody></table></div>'+
      '<p class="muted">Pembelian Mandiri: <strong>'+mandiriReportRows.length+'</strong> · Sapronak Luar: <strong>'+extRows.length+'</strong> · Retur Sapronak Luar: <strong>'+extRetRows.length+'</strong> · Transfer Retur: <strong>'+transferRows.length+'</strong></p>'+
      '</section>';


  };

  document.getElementById('logisticsReportFilter').onsubmit=e=>{e.preventDefault();renderRows();};

  const reportHtml=()=>{
    const rows=(document.getElementById('logisticsReportSections')?.innerHTML||'')+(document.getElementById('logisticsReportSummary')?.innerHTML||'');
    const fd=new FormData(document.getElementById('logisticsReportFilter'));
    const from=fd.get('date_from')||'-', to=fd.get('date_to')||'-';
    const barnId=fd.get('barn_id')||'';
    const barn=barns.find(b=>b.id===barnId);
    const txnType=fd.get('txn_type')||'Semua';
    const category=fd.get('category')||'Semua';
    const supplier=fd.get('supplier_name')||'Semua';
    const item=itemsAll.find(i=>i.id===String(fd.get('item_id')||''))?.name||'Semua';
    const status=fd.get('status')||'Semua';
    return '<!doctype html><html><head><meta charset="utf-8"><title>Laporan Logistik</title>'+
      '<style>@page{size:A4 landscape;margin:5mm}html,body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:9px;line-height:1.15}h2{margin:0 0 3px;font-size:13px}h3{margin:4px 0 2px;font-size:10px}p{margin:2px 0 4px}table{width:100%;border-collapse:collapse;font-size:8.5px;table-layout:auto}th,td{border:1px solid #999;padding:2px 3px;text-align:left;white-space:nowrap}th{font-weight:700}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.report-section-block{margin-bottom:3px}.report-section-block h3{margin:2px 0 1px}.print-letterhead{display:flex;align-items:center;gap:8px;border-bottom:1.5px solid #222;padding-bottom:3px;margin-bottom:3px}.print-letterhead img{width:50px!important;height:50px!important}.print-letterhead h2{font-size:12px!important}.print-letterhead div{line-height:1.08}@media print{button{display:none}}</style>'+
      '</head><body>'+
      '<div class="print-letterhead">'+
        '<img src="'+esc(company.logo_url||BMS_PRINT_LOGO)+'" style="object-fit:contain">'+
        '<div><h2 style="margin:0">'+esc(company.company_name||company.legal_name||'Nama perusahaan belum diisi')+'</h2>'+
        '<div style="white-space:pre-line">'+esc(company.address||'')+'</div>'+
        (company.phone?'<div>Tel/WA: '+esc(company.phone)+'</div>':'')+
        (company.email?'<div>'+esc(company.email)+'</div>':'')+
        '</div></div>'+
      '<h2 style="margin:0 0 4px">Laporan Logistik</h2>'+
      '<p>Periode: '+esc(String(from))+' s/d '+esc(String(to))+' · Kandang: '+esc(barn?shortBarnLabel(barn):'Semua Kandang')+' · Transaksi: '+esc(String(txnType))+' · Kategori: '+esc(String(category))+' · Supplier: '+esc(String(supplier))+' · Item: '+esc(String(item))+' · Status: '+esc(String(status))+'</p>'+
      rows+'</body></html>';
  };

  const printWhenReady=(w)=>{
    const imgs=[...w.document.images];
    const doPrint=()=>{w.focus();setTimeout(()=>w.print(),150);};
    if(!imgs.length)return doPrint();
    let left=imgs.length,done=false;
    const finish=()=>{if(done)return;if(--left<=0){done=true;doPrint();}};
    imgs.forEach(img=>{
      if(img.complete)finish();
      else{img.onload=finish;img.onerror=finish;}
    });
    setTimeout(()=>{if(!done){done=true;doPrint();}},2500);
  };

  document.getElementById('logisticsPrint').onclick=()=>{
    renderRows();
    const w=window.open('','_blank');
    if(!w)return msg('Popup cetak diblokir browser.');
    w.document.write(reportHtml());
    w.document.close();
    printWhenReady(w);
  };

  document.getElementById('logisticsPdf').onclick=()=>{
    renderRows();
    BMSCore.savePdfHtml(reportHtml(),'Laporan_Logistik.pdf').catch(error=>msg(error?.message||'PDF gagal dibuat.'));
  };

  document.getElementById('logisticsExcel').onclick=()=>{
    renderRows();
    const tables=(document.getElementById('logisticsReportSections')?.innerHTML||'')+(document.getElementById('logisticsReportSummary')?.innerHTML||'');
    const blob=BMSCore.excelBlob(['\ufeff'+bmsExcelHtml('<html><head><meta charset="utf-8"></head><body>'+tables+'</body></html>')]);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='Laporan_Logistik.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}

async function reports(){
  const d=await productionBase();
  const [pr,fr,rr,sr]=await Promise.all([
    db.rpc('production_ppl_directory'),
    db.from('production_cycle_final_unified').select('contract_assignment_id,chick_in_birds,depletion_birds,total_harvest_birds,total_harvest_kg,avg_bw_kg,weighted_age,net_feed_kg,fcr_actual,ip,closed_on,cycle_type'),
    db.from('recordings').select('id,contract_assignment_id,recorded_on,age_days,mortality,culling,feed_kg,avg_weight_kg').not('contract_assignment_id','is',null).order('recorded_on'),
    db.from('recording_weight_samples').select('recording_id,weight_g')
  ]);
  const pplRows=pr.data||[],finals=fr.data||[],recs=d.scopeRows(rr.data||[]),samples=sr.data||[];

  window.__productionReportState=window.__productionReportState||{barn:'',assignment:'',type:'',status:'',ppl:'',shown:false};
  const st=window.__productionReportState;
  const pplName=id=>pplRows.find(p=>p.user_id===id)?.full_name||'-';
  const visiblePplIds=[...new Set(d.assignments.map(a=>a.ppl_id).filter(Boolean))];
  const visiblePpls=visiblePplIds.map(id=>({id,name:pplName(id)})).sort((a,b)=>a.name.localeCompare(b.name));
  const assignmentDate=a=>{
    const ci=d.chicks.find(c=>c.contract_assignment_id===a.id);
    return ci?.arrived_on||a.start_date||'';
  };
  const cycleRows=d.assignments.filter(a=>
    (!st.barn||a.barn_id===st.barn)&&
    (!st.ppl||a.ppl_id===st.ppl)&&
    (!st.type||(a.cycle_type||'MITRA')===st.type)
  );


  const assignments=d.assignments.filter(a=>
    (!st.barn||a.barn_id===st.barn)&&
    (!st.ppl||a.ppl_id===st.ppl)&&
    (!st.assignment||a.id===st.assignment)&&
    (!st.type||(a.cycle_type||'MITRA')===st.type)&&
    (!st.status||(st.status==='PROSES'?a.active===true:a.active===false))
  );

  const rows=assignments.map(a=>{
    const b=d.barns.find(x=>x.id===a.barn_id);
    const ci=d.chicks.find(c=>c.contract_assignment_id===a.id);
    const final=!a.active?finals.find(x=>x.contract_assignment_id===a.id):null;

    let chickIn=0,chickOut=0,mortBirds=0,mortPct=0,kg=0,avg=0,age=0,feed=0,fcr=0,ip=0;
    if(final){
      chickIn=prodNum(final.chick_in_birds);
      chickOut=prodNum(final.total_harvest_birds);
      mortBirds=Math.max(0,prodNum(final.depletion_birds));
      mortPct=chickIn?Math.min(100,mortBirds/chickIn*100):0;
      kg=prodNum(final.total_harvest_kg);
      avg=prodNum(final.avg_bw_kg);
      age=prodNum(final.weighted_age);
      feed=prodNum(final.net_feed_kg);
      fcr=prodNum(final.fcr_actual);
      ip=prodNum(final.ip);
    }else{
      const live=productionProcessSnapshot(d,a,recs,samples);
      ({chickIn,chickOut,mortBirds,mortPct,kg,avg,age,feed,fcr,ip}=live);
      const perf=d.standards.filter(s=>
        (a.cycle_type==='MANDIRI'||s.contract_id===a.master_contract_id)&&
        (!a.performance_template_name||s.template_name===a.performance_template_name)
      ).sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days));
      const std=[...perf].reverse().find(s=>prodNum(s.age_days)<=prodNum(live.age))||perf[0]||null;
      const stdBw=std?.std_body_weight_g!=null?prodNum(std.std_body_weight_g)/1000:null;
      const stdFcr=std?.std_fcr!=null?prodNum(std.std_fcr):null;
      return {
        a,b,ppl:pplName(a.ppl_id),type:a.cycle_type||'MITRA',
        performance:a.performance_template_name||'-',
        status:'PROSES',
        ...live,stdBw,stdFcr,
        bwDiff:stdBw==null?null:prodNum(live.avg)-stdBw,
        fcrDiff:stdFcr==null?null:stdFcr-prodNum(live.fcr)
      };
    }

    const perf=d.standards.filter(s=>
      (a.cycle_type==='MANDIRI'||s.contract_id===a.master_contract_id)&&
      (!a.performance_template_name||s.template_name===a.performance_template_name)
    ).sort((u,v)=>prodNum(u.age_days)-prodNum(v.age_days));
    const std=[...perf].reverse().find(s=>prodNum(s.age_days)<=prodNum(age))||perf[0]||null;
    const stdBw=std?.std_body_weight_g!=null?prodNum(std.std_body_weight_g)/1000:null;
    const stdFcr=std?.std_fcr!=null?prodNum(std.std_fcr):null;
    return {
      a,b,ppl:pplName(a.ppl_id),type:a.cycle_type||'MITRA',
      performance:a.performance_template_name||'-',
      status:'CLOSED',
      chickIn,chickOut,mortBirds,mortPct,kg,avg,age,feed,fcr,ip,performanceBirds:chickOut,performanceKg:kg,
      stdBw,stdFcr,bwDiff:stdBw==null?null:avg-stdBw,fcrDiff:stdFcr==null?null:stdFcr-fcr
    };
  }).sort((x,y)=>String(assignmentDate(x.a)).localeCompare(String(assignmentDate(y.a))));

  const totals=rows.reduce((o,x)=>{
    const pb=prodNum(x.performanceBirds||x.chickOut),pk=prodNum(x.performanceKg||x.kg);
    o.chickIn+=x.chickIn;o.chickOut+=x.chickOut;o.mortBirds+=x.mortBirds;o.kg+=x.kg;o.feed+=x.feed;
    o.performanceBirds+=pb;o.performanceKg+=pk;o.ageWeight+=x.age*Math.max(1,pb);
    return o;
  },{chickIn:0,chickOut:0,mortBirds:0,kg:0,feed:0,performanceBirds:0,performanceKg:0,ageWeight:0});
  const ageWeightBase=rows.reduce((sum,x)=>sum+Math.max(1,prodNum(x.performanceBirds||x.chickOut)),0);
  const totalAge=ageWeightBase?totals.ageWeight/ageWeightBase:0;
  const totalAvg=totals.performanceBirds?totals.performanceKg/totals.performanceBirds:0;
  const totalMortPct=totals.chickIn?Math.min(100,totals.mortBirds/totals.chickIn*100):0;
  const totalFcr=totals.performanceKg?totals.feed/totals.performanceKg:0;
  const totalSurvival=totals.chickIn?Math.min(100,(totals.chickIn-totals.mortBirds)/totals.chickIn*100):0;
  const totalIp=totalAge&&totalFcr&&totalAvg?(totalSurvival*totalAvg*100)/(totalAge*totalFcr):0;

  let html='<section class="panel"><h3>Filter Laporan Produksi</h3><form id="productionReportFilter" class="form-vertical">'+
    '<label>Jenis Siklus<select name="type"><option value="">Semua</option><option value="MITRA" '+(st.type==='MITRA'?'selected':'')+'>MITRA</option><option value="MANDIRI" '+(st.type==='MANDIRI'?'selected':'')+'>MANDIRI</option></select></label>'+
    (profile?.role==='PPL'
      ?'<label>PPL / PIC<input value="'+esc(profile.full_name||pplName(session?.user?.id))+'" readonly></label>'
      :'<label>PPL / PIC<select name="ppl"><option value="">Semua PPL</option>'+visiblePpls.map(p=>'<option value="'+esc(p.id)+'" '+(st.ppl===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label>')+
    '<label>Kandang<select name="barn"><option value="">Semua Kandang</option>'+d.barns.map(b=>'<option value="'+esc(b.id)+'" '+(st.barn===b.id?'selected':'')+'>'+esc(shortBarnLabel(b))+'</option>').join('')+'</select></label>'+
    '<label>Siklus<select name="assignment"><option value="">Semua Siklus</option>'+cycleRows.map(a=>'<option value="'+esc(a.id)+'" '+(st.assignment===a.id?'selected':'')+'>'+esc(assignmentCycleLabel(d.assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('')+'</select></label>'+
    '<label>Status<select name="status"><option value="">Semua Status</option><option value="PROSES" '+(st.status==='PROSES'?'selected':'')+'>PROSES</option><option value="CLOSED" '+(st.status==='CLOSED'?'selected':'')+'>CLOSED</option></select></label>'+
    '<button type="submit">Tampilkan</button></form></section>';

  if(st.shown){
    html+='<section class="panel" id="productionReportPrintArea"><div class="rhpp-section-head"><div><h3>Laporan Produksi</h3><p class="muted">Khusus data produksi. CLOSED memakai deplesi final; tidak memuat RHPP, BOP, Kasbon, atau transaksi Keuangan.</p></div><div class="report-actions"><button type="button" id="productionReportPrint">Cetak / PDF</button><button type="button" id="productionReportPrintExcel">Excel</button></div></div>'+
      '<div class="tablewrap"><table style="min-width:1500px"><thead><tr>'+
        '<th>NO</th><th>Kandang / Siklus</th><th>Jenis</th><th>PPL / PIC</th><th>Performance</th><th>Status</th><th>Umur</th><th>Chick-In</th><th>Chick-Out</th><th>Deplesi Ekor</th><th>Deplesi %</th><th>Tonase Panen (Kg)</th><th>BW Aktual</th><th>BW Standar</th><th>Selisih BW</th><th>Pakan (Kg)</th><th>FCR Aktual</th><th>FCR Standar</th><th>Selisih FCR</th><th>IP</th>'+
      '</tr></thead><tbody>'+
      rows.map((x,i)=>'<tr>'+
        '<td>'+(i+1)+'</td>'+
        '<td>'+esc(assignmentIdentity(d.assignments,d.barns,d.masters,x.a))+'</td>'+
        '<td><strong>'+esc(x.type)+'</strong></td>'+
        '<td>'+esc(x.ppl)+'</td>'+
        '<td>'+esc(x.performance)+'</td>'+
        '<td>'+esc(x.status)+'</td>'+
        '<td>'+prodFmt(x.age,2)+'</td>'+
        '<td>'+prodFmt(x.chickIn,0)+'</td>'+
        '<td>'+prodFmt(x.chickOut,0)+'</td>'+
        '<td>'+prodFmt(x.mortBirds,0)+'</td>'+
        '<td>'+prodFmt(x.mortPct,2)+'</td>'+
        '<td>'+prodFmt(x.kg,2)+'</td>'+
        '<td>'+prodFmt(x.avg,2)+'</td>'+
        '<td>'+(x.stdBw==null?'-':prodFmt(x.stdBw,2))+'</td>'+
        '<td>'+(x.bwDiff==null?'-':prodFmt(x.bwDiff,2))+'</td>'+
        '<td>'+prodFmt(x.feed,0)+'</td>'+
        '<td>'+prodFmt(x.fcr,3)+'</td>'+
        '<td>'+(x.stdFcr==null?'-':prodFmt(x.stdFcr,3))+'</td>'+
        '<td>'+(x.fcrDiff==null?'-':prodFmt(x.fcrDiff,3))+'</td>'+
        '<td>'+prodFmt(x.ip,2)+'</td>'+
      '</tr>').join('')+
      (rows.length?'<tr><th colspan="6">TOTAL / RATA-RATA</th>'+
        '<th>'+prodFmt(totalAge,2)+'</th>'+
        '<th>'+prodFmt(totals.chickIn,0)+'</th>'+
        '<th>'+prodFmt(totals.chickOut,0)+'</th>'+
        '<th>'+prodFmt(totals.mortBirds,0)+'</th>'+
        '<th>'+prodFmt(totalMortPct,2)+'</th>'+
        '<th>'+prodFmt(totals.kg,2)+'</th>'+
        '<th>'+prodFmt(totalAvg,2)+'</th>'+
        '<th>-</th><th>-</th>'+
        '<th>'+prodFmt(totals.feed,0)+'</th>'+
        '<th>'+prodFmt(totalFcr,3)+'</th>'+
        '<th>-</th><th>-</th>'+
        '<th>'+prodFmt(totalIp,2)+'</th></tr>':'')+
      '</tbody></table></div>'+
      (rows.length?'<div class="rhpp-summary-cards" style="margin-top:14px">'+
        '<div class="rhpp-summary-card"><span>Jumlah Siklus</span><strong>'+rows.length+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Chick-In</span><strong>'+prodFmt(totals.chickIn,0)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>Total Panen</span><strong>'+prodFmt(totals.kg,2)+' Kg</strong></div>'+
        '<div class="rhpp-summary-card"><span>Deplesi</span><strong>'+prodFmt(totalMortPct,2)+'%</strong></div>'+
        '<div class="rhpp-summary-card"><span>FCR Gabungan</span><strong>'+prodFmt(totalFcr,3)+'</strong></div>'+
        '<div class="rhpp-summary-card"><span>IP Gabungan</span><strong>'+prodFmt(totalIp,2)+'</strong></div>'+
      '</div>':'<p class="muted">Belum ada data sesuai filter.</p>')+'</section>';
  }

  layout(html);
  if(d.err||pr.error||fr.error||rr.error||sr.error)msg((d.err||pr.error||fr.error||rr.error||sr.error).message);

  const form=document.getElementById('productionReportFilter');
  if(form){
    const barnSel=form.elements.barn,typeSel=form.elements.type,cycleSel=form.elements.assignment,pplSel=form.elements.ppl;
    const refreshCycles=()=>{
      const barnId=barnSel.value||'',type=typeSel.value||'',pplId=pplSel?.value||'';
      const items=d.assignments.filter(a=>(!barnId||a.barn_id===barnId)&&(!pplId||a.ppl_id===pplId)&&(!type||(a.cycle_type||'MITRA')===type));
      const current=cycleSel.value;
      cycleSel.innerHTML='<option value="">Semua Siklus</option>'+items.map(a=>'<option value="'+esc(a.id)+'">'+esc(assignmentCycleLabel(d.assignments,a)+' · '+prodDateId(a.start_date)+' · '+(a.active?'PROSES':'CLOSED'))+'</option>').join('');
      if(items.some(a=>a.id===current))cycleSel.value=current;
    };
    barnSel.onchange=refreshCycles;
    typeSel.onchange=refreshCycles;
    if(pplSel)pplSel.onchange=refreshCycles;
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const fd=new FormData(form);
      window.__productionReportState={
        barn:String(fd.get('barn')||''),
        assignment:String(fd.get('assignment')||''),
        type:String(fd.get('type')||''),
        status:String(fd.get('status')||''),
        ppl:profile?.role==='PPL'?(session?.user?.id||''):String(fd.get('ppl')||''),
        shown:true
      };
      await reports();
    };
  }

  const p=document.getElementById('productionReportPrint');
  if(p)p.onclick=()=>printFinanceDocument('productionReportPrintArea','Laporan Produksi');const productionReportExcel=document.getElementById('productionReportPrintExcel');if(productionReportExcel)productionReportExcel.onclick=()=>exportFinanceDocumentExcel('productionReportPrintArea','Laporan Produksi');
}
