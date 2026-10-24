/* BMS operational helpers: calendar dates, safe retries, complete reads, native XLSX. */
(function(scope){
  'use strict';
  const config=scope.BMS_DATA_CONFIG||{writeRpcs:[],uuidTables:[],primaryKeys:{}};
  const writeRpcs=new Set(config.writeRpcs),uuidTables=new Set(config.uuidTables);
  const utf8=new TextEncoder();
  function dateAdd(iso,days){
    const value=String(iso).slice(0,10),d=new Date(value+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new Error('Tanggal tidak valid.');
    d.setUTCDate(d.getUTCDate()+Number(days||0));
    return d.toISOString().slice(0,10);
  }
  async function sha256(value){
    const bytes=await scope.crypto.subtle.digest('SHA-256',utf8.encode(value));
    return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  }
  const memory=new Map(),storageKey='bms_pending_operations_v1';
  function pendingRead(){try{return JSON.parse(scope.localStorage.getItem(storageKey)||'{}')}catch{return Object.fromEntries(memory)}}
  function pendingWrite(value){memory.clear();Object.entries(value).forEach(([k,v])=>memory.set(k,v));try{scope.localStorage.setItem(storageKey,JSON.stringify(value))}catch{}}
  async function pendingGet(key){
    const get=()=>{const entries=pendingRead();if(!entries[key]){entries[key]={id:scope.crypto.randomUUID(),ids:[],created:Date.now()};pendingWrite(entries)}return entries[key]};
    return scope.navigator?.locks?scope.navigator.locks.request('bms:'+key,get):get();
  }
  function pendingSave(key,entry){const entries=pendingRead();entries[key]=entry;pendingWrite(entries)}
  function pendingRemove(key){const entries=pendingRead();delete entries[key];pendingWrite(entries)}
  function createFetch(nativeFetch,getActor=()=>null){
    async function request(url,init){
      const controller=new AbortController();
      const abort=()=>controller.abort(init.signal?.reason);
      if(init.signal?.aborted)abort();else init.signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(()=>controller.abort(),45000);
      try{return await nativeFetch(url,{...init,signal:controller.signal})}
      finally{clearTimeout(timer);init.signal?.removeEventListener('abort',abort)}
    }
    return async function(input,init={}){
      const original=String(input instanceof Request?input.url:input),url=new URL(original);
      const method=String(init.method||'GET').toUpperCase(),headers=new Headers(init.headers);
      const table=url.pathname.split('/').pop(),rpc=url.pathname.includes('/rest/v1/rpc/'),rest=url.pathname.includes('/rest/v1/');
      const mutation=rest&&method==='POST'&&(rpc?writeRpcs.has(table):uuidTables.has(table)&&!headers.get('Prefer')?.includes('resolution=')&&!url.searchParams.has('on_conflict'));
      let key=null,entry=null,body=init.body,generated=false;
      if(mutation){
        key=String(getActor()||'pending')+':'+await sha256(method+':'+original+':'+String(body||''));
        entry=await pendingGet(key);
        const data=JSON.parse(String(body||'{}'));
        if(rpc){
          url.pathname=url.pathname.replace(/[^/]+$/,'bms_execute_operation');
          body=JSON.stringify({p_operation_id:entry.id,p_action:table,p_params:data});
        }else{
          const rows=Array.isArray(data)?data:[data];
          rows.forEach((row,i)=>{if(!row.id){entry.ids[i]=entry.ids[i]||scope.crypto.randomUUID();row.id=entry.ids[i];generated=true}});
          pendingSave(key,entry);url.searchParams.delete('columns');body=JSON.stringify(Array.isArray(data)?rows:rows[0]);
        }
      }
      let response;
      try{
        const pk=config.primaryKeys[table];
        const paged=rest&&!rpc&&method==='GET'&&pk?.length&&!headers.has('Range')&&!url.searchParams.has('limit')&&!url.searchParams.has('offset')&&!headers.get('Accept')?.includes('vnd.pgrst.object');
        if(paged){
          const order=url.searchParams.get('order')||'';
          url.searchParams.set('order',[order,...pk.filter(k=>!order.split(',').some(x=>x.split('.')[0]===k)).map(k=>k+'.asc')].filter(Boolean).join(','));
          const all=[],size=1000;
          for(let from=0;;from+=size){
            const pageHeaders=new Headers(headers);pageHeaders.set('Range-Unit','items');pageHeaders.set('Range',from+'-'+(from+size-1));
            response=await request(url.toString(),{...init,headers:pageHeaders,body});
            if(!response.ok)return response;
            const rows=await response.clone().json();if(!Array.isArray(rows))return response;
            all.push(...rows);if(rows.length<size)break;
          }
          const outputHeaders=new Headers(response.headers);outputHeaders.delete('content-length');outputHeaders.set('Content-Range',all.length?'0-'+(all.length-1)+'/'+all.length:'*/0');
          return new Response(JSON.stringify(all),{status:200,headers:outputHeaders});
        }
        response=await request(url.toString(),{...init,headers,body});
        if(key&&generated&&response.status===409){
          const error=await response.clone().json().catch(()=>({}));
          if(error.code==='23505'){
            const lookup=new URL(original);lookup.search='';lookup.searchParams.set('select',new URL(original).searchParams.get('select')||'*');
            const ids=entry.ids.filter(Boolean);lookup.searchParams.set('id','in.('+ids.join(',')+')');
            const lookupHeaders=new Headers(headers);lookupHeaders.delete('Prefer');
            const found=await request(lookup.toString(),{method:'GET',headers:lookupHeaders});
            if(found.ok){const data=await found.clone().json();const rows=Array.isArray(data)?data:[data];
              if(rows.length===ids.length){pendingRemove(key);return headers.get('Prefer')?.includes('return=representation')?found:new Response(null,{status:204})}
            }
          }
        }
        if(key&&(response.ok||(response.status>=400&&response.status<500)))pendingRemove(key);
        return response;
      }catch(error){
        if(key)throw new Error('Koneksi terputus. Status simpan belum diketahui. Tekan Simpan kembali untuk memeriksa operasi yang sama.');
        throw error;
      }
    };
  }

  function xml(value){return String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xEDB88320^(n>>>1):n>>>1;return n>>>0});
  function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
  function zip(files){
    const parts=[],central=[];let offset=0,centralSize=0;
    for(const [name,value] of files){
      const path=utf8.encode(name),bytes=typeof value==='string'?utf8.encode(value):value,crc=crc32(bytes);
      if(bytes.length>0xFFFFFFFF)throw new Error('File terlalu besar.');
      const local=new Uint8Array(30+path.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034B50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,0,true);v.setUint16(10,0,true);v.setUint16(12,0,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,path.length,true);local.set(path,30);
      parts.push(local,bytes);
      const index=new Uint8Array(46+path.length),iv=new DataView(index.buffer);
      iv.setUint32(0,0x02014B50,true);iv.setUint16(4,20,true);iv.setUint16(6,20,true);iv.setUint16(8,0x800,true);iv.setUint16(10,0,true);iv.setUint16(12,0,true);iv.setUint16(14,0,true);iv.setUint32(16,crc,true);iv.setUint32(20,bytes.length,true);iv.setUint32(24,bytes.length,true);iv.setUint16(28,path.length,true);iv.setUint32(42,offset,true);index.set(path,46);
      central.push(index);centralSize+=index.length;offset+=local.length+bytes.length;
    }
    const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054B50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function colName(index){let name='';for(index++;index;index=Math.floor((index-1)/26))name=String.fromCharCode(65+(index-1)%26)+name;return name}
  function xlsx(input){
    const sheets=input.map(s=>({name:s.name,rows:s.rows.map(r=>r.slice())})),longValues=[];
    const names=new Set();
    for(const s of sheets){
      const base=String(s.name||'Sheet').replace(/[\\/*?:\[\]]/g,'_').slice(0,31)||'Sheet';let name=base,n=1;
      while(names.has(name.toLowerCase())){const suffix='_'+(++n);name=base.slice(0,31-suffix.length)+suffix}names.add(name.toLowerCase());s.name=name;
      s.rows.forEach((row,ri)=>row.forEach((value,ci)=>{
        if(value&&typeof value==='object'&&!(value instanceof Date)&&typeof value.formula!=='string')value=JSON.stringify(value);
        if(typeof value==='string'&&value.length>32767){
          const ref=s.name+'!'+colName(ci)+(ri+1);let part='',partIndex=1;
          for(const c of value){if(part.length+c.length>32000){longValues.push([ref,partIndex++,part]);part=''}part+=c}if(part)longValues.push([ref,partIndex,part]);
          value='Nilai lengkap: sheet BMS_LONG_TEXT, '+ref;
        }
        row[ci]=value;
      }));
    }
    if(longValues.length){let n=1;while(names.has(('BMS_LONG_TEXT'+(n===1?'':'_'+n)).toLowerCase()))n++;const name='BMS_LONG_TEXT'+(n===1?'':'_'+n);sheets.push({name,rows:[['Sel sumber','Bagian','Nilai'],...longValues]});
      for(const s of sheets)s.rows.forEach(r=>r.forEach((v,i)=>{if(typeof v==='string'&&v.startsWith('Nilai lengkap: sheet BMS_LONG_TEXT, '))r[i]=v.replace('sheet BMS_LONG_TEXT,','sheet '+name+',')}));
    }
    if(!sheets.length)sheets.push({name:'Laporan',rows:[['Tidak ada data']]});
    const files=[],ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    files.push(['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>']);
    files.push(['_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
    files.push(['xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>']);
    files.push(['xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>']);
    files.push(['xl/styles.xml','<styleSheet xmlns="'+ns+'"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD9E2F3"/></left><right style="thin"><color rgb="FFD9E2F3"/></right><top style="thin"><color rgb="FFD9E2F3"/></top><bottom style="thin"><color rgb="FFD9E2F3"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="14" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']);
    sheets.forEach((s,i)=>{
      if(s.rows.length>1048576||s.rows.some(r=>r.length>16384))throw new Error('Jumlah data melampaui batas Excel. Gunakan backup JSON.');
      const maxCols=Math.max(1,...s.rows.map(r=>r.length));
      // Global export widths: readable label/value columns on mobile, bounded widths for wide reports.
      const widths=Array.from({length:maxCols},(_,ci)=>{
        const content=Math.max(0,...s.rows.slice(0,500).map(r=>String(r[ci]??'').replace(/\\s+/g,' ').length+2));
        const min=ci===0?18:(ci===1?16:12),max=ci===0?36:(ci===1?28:30);
        return Math.min(max,Math.max(min,content));
      });
      let data='<worksheet xmlns="'+ns+'"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+widths.map((w,ci)=>'<col min="'+(ci+1)+'" max="'+(ci+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>';
      s.rows.forEach((row,ri)=>{
        const nonEmpty=row.filter(v=>String(v??'').trim()!=='').length;
        const heading=ri>0&&nonEmpty===1&&String(row.find(v=>String(v??'').trim()!=='')??'').length<120;
        data+='<row r="'+(ri+1)+'"'+(ri===0?' ht="22" customHeight="1"':'')+'>';row.forEach((value,ci)=>{
          const ref=colName(ci)+(ri+1);
          let style=ri===0?1:(heading?5:0);
          if(value instanceof Date&&Number.isFinite(value.getTime()))data+='<c r="'+ref+'" s="2"><v>'+((Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate())/86400000)+25569)+'</v></c>';
          else if(typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e15){style=Number.isInteger(value)?3:4;data+='<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>';}
          else if(value&&typeof value==='object'&&typeof value.formula==='string'){
            style=Number.isInteger(value.value)?3:4;
            data+='<c r="'+ref+'" s="'+style+'"><f>'+xml(value.formula.replace(/^=/,''))+'</f>'+(Number.isFinite(value.value)?'<v>'+value.value+'</v>':'')+'</c>';
          }
          else if(typeof value==='boolean')data+='<c r="'+ref+'" t="b" s="'+style+'"><v>'+(value?1:0)+'</v></c>';
          else data+='<c r="'+ref+'" t="inlineStr" s="'+style+'"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
        });data+='</row>'
      });
      data+='</sheetData><autoFilter ref="A1:'+colName(maxCols-1)+Math.max(1,s.rows.length)+'"/></worksheet>';files.push(['xl/worksheets/sheet'+(i+1)+'.xml',data]);
    });
    return zip(files);
  }
  function download(blob,fileName){const url=URL.createObjectURL(blob),a=scope.document.createElement('a');a.href=url;a.download=fileName;scope.document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  function htmlSheets(html,title='Laporan'){
    const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('script,style,button,form,.report-actions,.inline-actions').forEach(x=>x.remove());
    const rows=[];
    const numeric=text=>{let s=text.trim();if(/^0\d+$/.test(s)||s.length>18)return s;
      const negative=/^\(.*\)$/.test(s);if(negative)s=s.slice(1,-1).trim();
      if(/^(?:Rp\s*)?-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(s)){const n=Number(s.replace(/^Rp\s*/,'').replace(/\./g,'').replace(',','.'));if(Number.isFinite(n))return negative?-Math.abs(n):n}return text.trim()};
    const visit=node=>{
      if(node.nodeType!==1)return;
      if(node.tagName==='TABLE'){
        const spans=new Map();let ri=0;
        for(const tr of node.querySelectorAll('tr')){if(tr.closest('table')!==node)continue;const row=[];let ci=0;
          for(const cell of tr.children){while(spans.get(ci)>ri){row[ci]='';ci++}if(!['TD','TH'].includes(cell.tagName))continue;
            row[ci]=numeric(cell.textContent);const width=Number(cell.colSpan||1),height=Number(cell.rowSpan||1);
            for(let k=0;k<width;k++){if(k)row[ci+k]='';if(height>1)spans.set(ci+k,ri+height)}ci+=width;
          }rows.push(row);ri++;
        }rows.push([]);return;
      }
      if(['H1','H2','H3','H4','P'].includes(node.tagName)){const value=node.textContent.trim();if(value)rows.push([value]);return}
      if(!node.children.length){const value=node.textContent.trim();if(value)rows.push([value]);return}
      for(const child of node.children)visit(child);
    };
    visit(doc.body);return [{name:title,rows}];
  }
  function applySafeExcelTotals(sheets){
    const totalWords=/\b(total|jumlah|subtotal|grand total)\b/i;
    for(const sheet of sheets){
      const rows=sheet.rows;
      for(let ri=1;ri<rows.length;ri++){
        const row=rows[ri],label=String(row.find(v=>typeof v==='string'&&v.trim())||'').trim();
        if(!totalWords.test(label))continue;
        for(let ci=0;ci<row.length;ci++){
          const current=row[ci];if(typeof current!=='number'||!Number.isFinite(current))continue;
          let start=ri-1;while(start>=0&&typeof rows[start]?.[ci]==='number'&&Number.isFinite(rows[start][ci]))start--;
          start++;
          if(start>=ri||ri-start<1)continue;
          const values=[];for(let r=start;r<ri;r++)values.push(rows[r][ci]);
          const sum=values.reduce((n,v)=>n+v,0);
          const tolerance=Math.max(0.01,Math.abs(current)*1e-9);
          if(Math.abs(sum-current)<=tolerance)row[ci]={formula:'SUM('+colName(ci)+(start+1)+':'+colName(ci)+ri+')',value:current};
        }
      }
    }
    return sheets;
  }
  function applyVerifiedReportFormulas(sheets){
    const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toUpperCase();
    const close=(a,b)=>Math.abs(a-b)<=Math.max(0.01,Math.abs(b)*1e-9);
    for(const sheet of sheets){
      const rows=sheet.rows;
      const cell=(ri,ci)=>colName(ci)+(ri+1);
      const findValue=(ri,label)=>{
        for(let r=ri-1;r>=0&&r>=ri-12;r--){
          if(norm(rows[r]?.[0])!==label)continue;
          for(let ci=1;ci<(rows[r]?.length||0);ci++)if(typeof rows[r][ci]==='number')return {r,ci,v:rows[r][ci]};
        }return null;
      };
      for(let ri=0;ri<rows.length;ri++){
        const label=norm(rows[ri]?.[0]);let targetCi=-1;
        for(let ci=1;ci<(rows[ri]?.length||0);ci++)if(typeof rows[ri][ci]==='number'){targetCi=ci;break}
        if(targetCi<0)continue;const current=rows[ri][targetCi];let refs=null,formula='';
        if(label==='LABA/RUGI EXPEDISI'){
          const a=findValue(ri,'PENDAPATAN EXPEDISI'),b=findValue(ri,'BOP EXPEDISI');
          if(a&&b&&close(a.v-b.v,current)){formula=cell(a.r,a.ci)+'-'+cell(b.r,b.ci);}
        }else if(label==='LABA/RUGI KANDANG'){
          const a=findValue(ri,'TOTAL PENDAPATAN KANDANG'),b=findValue(ri,'TOTAL BOP PRODUKSI'),d=findValue(ri,'TOTAL BIAYA SAPRONAK'),e=findValue(ri,'TOTAL TAMBAH DAGING');
          if(a&&b&&d&&e&&close(a.v-b.v-d.v-e.v,current)){formula=cell(a.r,a.ci)+'-'+cell(b.r,b.ci)+'-'+cell(d.r,d.ci)+'-'+cell(e.r,e.ci);}
        }else if(label==='LABA/RUGI GLOBAL'){
          const a=findValue(ri,'TOTAL LABA USAHA'),b=findValue(ri,'TOTAL BIAYA GLOBAL');
          if(a&&b&&close(a.v+b.v,current)){formula=cell(a.r,a.ci)+'+'+cell(b.r,b.ci);}
        }
        if(formula)rows[ri][targetCi]={formula,value:current};
      }
    }
    return sheets;
  }
  function excelBlob(parts){return xlsx(applyVerifiedReportFormulas(applySafeExcelTotals(htmlSheets(parts.join(''),'Laporan'))))}
  function pdfEscape(text){return String(text??'').replace(/[^\x20-\x7E]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
  function pdfLinesFromHtml(html){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    doc.querySelectorAll('script,style,button,form,.report-actions,.inline-actions').forEach(x=>x.remove());
    const out=[];
    const pushWrapped=(text,max=112)=>{
      let s=String(text||'').replace(/\s+/g,' ').trim();if(!s)return;
      while(s.length>max){let cut=s.lastIndexOf(' ',max);if(cut<40)cut=max;out.push(s.slice(0,cut));s=s.slice(cut).trim()}
      if(s)out.push(s);
    };
    for(const el of doc.body.querySelectorAll('h1,h2,h3,h4,p,li,tr')){
      if(el.tagName==='TR'){
        const cells=[...el.children].filter(x=>['TD','TH'].includes(x.tagName)).map(x=>x.textContent.replace(/\s+/g,' ').trim());
        if(cells.length)pushWrapped(cells.join(' | '));
      }else pushWrapped(el.textContent);
    }
    if(!out.length)String(doc.body.innerText||doc.body.textContent||'').split(/\n+/).forEach(x=>pushWrapped(x));
    return out.length?out:['Tidak ada data'];
  }
  function pdfBlobFromHtml(html){
    const lines=pdfLinesFromHtml(html),pageLines=48,pages=[];
    for(let i=0;i<lines.length;i+=pageLines)pages.push(lines.slice(i,i+pageLines));
    const objects=[null,null,null];
    const pageIds=[],contentIds=[];
    let nextId=4;
    pages.forEach(()=>{pageIds.push(nextId++);contentIds.push(nextId++)});
    objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
    objects[2]='<< /Type /Pages /Count '+pages.length+' /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] >>';
    objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';
    pages.forEach((rows,i)=>{
      const content='BT\n/F1 8 Tf\n28 560 Td\n10 TL\n'+rows.map(x=>'('+pdfEscape(x)+') Tj\nT*').join('\n')+'\nET';
      objects[contentIds[i]]='<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream';
      objects[pageIds[i]]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentIds[i]+' 0 R >>';
    });
    let pdf='%PDF-1.4\n',offsets=[0];
    for(let id=1;id<objects.length;id++){offsets[id]=pdf.length;pdf+=id+' 0 obj\n'+objects[id]+'\nendobj\n'}
    const xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
    for(let id=1;id<objects.length;id++)pdf+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';
    pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
    return new Blob([pdf],{type:'application/pdf'});
  }
  async function savePdfHtml(html,fileName='Laporan.pdf'){
    const name=String(fileName||'Laporan.pdf').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/\.pdf$/i,'')+'.pdf';
    // Preserve the complete report layout. The former text-only PDF builder stripped tables, styles,
    // colors and columns, causing PDFs shared to WhatsApp to look like raw text.
    const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(scope.navigator?.userAgent||'');
    const printHtml=String(html||'').replace('</head>','<meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{size:A4 portrait;margin:12mm}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #b8c7d1;padding:5px;vertical-align:top;overflow-wrap:anywhere}th{background:#d9eaf7;color:#123b5d;font-weight:700}h1,h2,h3{break-after:avoid;page-break-after:avoid}tr,.ui-rhpp-card,.rhpp-panel,.ui-rhpp-kpi{break-inside:avoid;page-break-inside:avoid}button,.report-actions,.inline-actions{display:none!important}@media screen{body{padding:12px}}</style></head>');
    const blob=new Blob([printHtml],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    // Open the styled report directly so the browser's Print / Save as PDF flow can preserve layout.
    const w=scope.open?.(url,'_blank');
    if(w){
      try{w.addEventListener('load',()=>{try{w.focus();w.print()}catch(_){}} ,{once:true})}catch(_){}
      setTimeout(()=>URL.revokeObjectURL(url),120000);
      return true;
    }
    // Popup-blocked fallback: download the complete styled report for opening and printing.
    const a=scope.document.createElement('a');a.href=url;a.download=name.replace(/\.pdf$/i,'.html');scope.document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);return true;
  }

  function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return scope.btoa(text)}
  function unbase64(text){return Uint8Array.from(scope.atob(text),c=>c.charCodeAt(0))}
  async function backupKey(password,salt,iterations){
    const input=await scope.crypto.subtle.importKey('raw',utf8.encode(password),'PBKDF2',false,['deriveKey']);
    return scope.crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},input,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encryptRecovery(document,password){
    if(String(password).length<12)throw new Error('Password backup minimal 12 karakter.');
    const salt=scope.crypto.getRandomValues(new Uint8Array(16)),iv=scope.crypto.getRandomValues(new Uint8Array(12)),iterations=250000;
    const key=await backupKey(password,salt,iterations);
    const encrypted=await scope.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:utf8.encode('BMS_FULL_RECOVERY_V1')},key,utf8.encode(JSON.stringify(document)));
    return new Blob([JSON.stringify({format:'BMS_ENCRYPTED_RECOVERY',version:1,iterations,salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))})],{type:'application/json'});
  }
  async function decryptRecovery(file,password){
    const envelope=typeof file==='string'?JSON.parse(file):file;
    if(envelope.format!=='BMS_ENCRYPTED_RECOVERY'||envelope.version!==1||envelope.iterations!==250000)throw new Error('Format backup tidak didukung.');
    const salt=unbase64(envelope.salt),iv=unbase64(envelope.iv);if(salt.length!==16||iv.length!==12)throw new Error('Header backup tidak valid.');
    const key=await backupKey(password,salt,envelope.iterations);
    const clear=await scope.crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:utf8.encode('BMS_FULL_RECOVERY_V1')},key,unbase64(envelope.ciphertext));
    const document=JSON.parse(new TextDecoder().decode(clear));if(document.format!=='BMS_FULL_RECOVERY')throw new Error('Isi backup tidak valid.');return document;
  }
  const api={dateAdd,sha256,createFetch,xlsx,excelBlob,htmlSheets,download,pdfBlobFromHtml,savePdfHtml,encryptRecovery,decryptRecovery,downloadWorkbook:(sheets,name)=>download(xlsx(sheets),name.replace(/\.xls(?:x)?$/i,'')+'.xlsx')};
  scope.BMSCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
