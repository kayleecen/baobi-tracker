// report.js -- stats/report page (charts, daily report archive)
// ================= 报告 =================
let range = 7;
function setRange(r){
  range = r;
  document.getElementById('seg7').className = r===7?'on':'';
  document.getElementById('seg30').className = r===30?'on':'';
  renderReport();
}
function statDays(){
  const out = [];
  for (let i=range-1; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const rec = getDay(dayKey(d));
    out.push({
      label: (d.getMonth()+1)+'/'+d.getDate(),
      ml: rec.feeds.reduce((s,f)=>s+f.ml,0),
      feeds: rec.feeds.length,
      pee: rec.diapers.filter(x=>x.type==='pee').length,
      poo: rec.diapers.filter(x=>x.type==='poo').length
    });
  }
  return out;
}
function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawMilk(stats){
  const cv = document.getElementById('milkChart'), c = cv.getContext('2d');
  const W=cv.width, H=cv.height, L=70, R=20, T=25, B=55;
  c.clearRect(0,0,W,H);
  const max = Math.max(100, ...stats.map(s=>s.ml)) * 1.15;
  const x = i => L + (W-L-R) * (stats.length===1 ? .5 : i/(stats.length-1));
  const y = v => T + (H-T-B) * (1 - v/max);
  c.strokeStyle=css('--line'); c.fillStyle=css('--sub');
  c.font='22px -apple-system'; c.textAlign='right'; c.lineWidth=1;
  for (let g=0; g<=4; g++) {
    const v = max/4*g, yy = y(v);
    c.beginPath(); c.moveTo(L,yy); c.lineTo(W-R,yy); c.stroke();
    c.fillText(Math.round(v), L-8, yy+7);
  }
  c.textAlign='center';
  const step = Math.ceil(stats.length/8);
  stats.forEach((s,i)=>{ if(i%step===0) c.fillText(s.label, x(i), H-22); });
  const rose = css('--rose-d');
  c.beginPath();
  stats.forEach((s,i)=> i===0 ? c.moveTo(x(i),y(s.ml)) : c.lineTo(x(i),y(s.ml)));
  c.lineTo(x(stats.length-1), y(0)); c.lineTo(x(0), y(0)); c.closePath();
  c.fillStyle='rgba(226,112,95,.13)'; c.fill();
  c.beginPath();
  stats.forEach((s,i)=> i===0 ? c.moveTo(x(i),y(s.ml)) : c.lineTo(x(i),y(s.ml)));
  c.strokeStyle=rose; c.lineWidth=4; c.stroke();
  c.fillStyle=rose;
  stats.forEach((s,i)=>{ c.beginPath(); c.arc(x(i),y(s.ml),6,0,7); c.fill(); });
}
function drawDiaper(stats){
  const cv = document.getElementById('diaperChart'), c = cv.getContext('2d');
  const W=cv.width, H=cv.height, L=55, R=20, T=20, B=55;
  c.clearRect(0,0,W,H);
  const max = Math.max(4, ...stats.map(s=>s.pee+s.poo)) * 1.15;
  const bw = Math.min(40, (W-L-R)/stats.length*0.6);
  const x = i => L + (W-L-R)*(i+.5)/stats.length;
  const y = v => T + (H-T-B)*(1 - v/max);
  c.strokeStyle=css('--line'); c.fillStyle=css('--sub');
  c.font='22px -apple-system'; c.textAlign='right'; c.lineWidth=1;
  for (let g=0; g<=4; g++) {
    const v=max/4*g, yy=y(v);
    c.beginPath(); c.moveTo(L,yy); c.lineTo(W-R,yy); c.stroke();
    c.fillText(Math.round(v), L-8, yy+7);
  }
  c.textAlign='center';
  const step = Math.ceil(stats.length/8);
  stats.forEach((s,i)=>{ if(i%step===0) c.fillText(s.label, x(i), H-22); });
  stats.forEach((s,i)=>{
    const xx=x(i)-bw/2;
    c.fillStyle=css('--sky');
    c.fillRect(xx, y(s.pee), bw, y(0)-y(s.pee));
    c.fillStyle=css('--peach');
    c.fillRect(xx, y(s.pee+s.poo), bw, y(s.pee)-y(s.pee+s.poo));
  });
}
function buildReport(stats){
  const act = stats.filter(s=>s.feeds>0);
  if (!act.length) return '暂无数据,先记录几天吧~';
  const avgMl = Math.round(act.reduce((s,x)=>s+x.ml,0)/act.length);
  const avgFeed = Math.round(act.reduce((s,x)=>s+x.feeds,0)/act.length);
  const avgD = Math.round(act.reduce((s,x)=>s+x.pee+x.poo,0)/act.length);
  const best = act.reduce((a,b)=>a.ml>b.ml?a:b);
  let trend = '记录再多几天就能看趋势啦';
  if (act.length>=4) {
    const half = Math.floor(act.length/2);
    const early = act.slice(0,half).reduce((s,x)=>s+x.ml,0)/half;
    const late = act.slice(-half).reduce((s,x)=>s+x.ml,0)/half;
    trend = late>early+30 ? '奶量呈上升趋势,宝比胃口越来越好'
          : late<early-30 ? '奶量略有下降,可以留意一下宝比状态'
          : '奶量保持稳定';
  }
  return `宝比健康成长报告(最近${range===7?'一周':'一月'})\n\n`+
    `· 平均每日奶量:${avgMl} ml(约 ${avgFeed} 次/天)\n`+
    `· 平均每日换片:${avgD} 次\n`+
    `· 吃得最多的一天:${best.label},共 ${best.ml} ml\n`+
    `· ${trend}\n\n—— 来自「宝比健康成长中」`;
}
function renderReport(){
  const stats = statDays();
  drawMilk(stats); drawDiaper(stats);
  document.getElementById('reportText').textContent = buildReport(stats);
  document.getElementById('dailyText').textContent = dailyReport().text;
}
function copyReport(){
  const t = document.getElementById('reportText').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(()=>alert('已复制,去微信粘贴给家人吧'));
  else { prompt('长按复制以下内容:', t); }
}

// ================= 昨日日报 · 存入日历 =================
function dailyReport(){
  const d = new Date(); d.setDate(d.getDate()-1);
  const k = dayKey(d), rec = getDay(k);
  const label = (d.getMonth()+1)+'月'+d.getDate()+'日';
  const ml = rec.feeds.reduce((s,f)=>s+f.ml,0);
  const pee = rec.diapers.filter(x=>x.type==='pee').length;
  const poo = rec.diapers.filter(x=>x.type==='poo').length;
  const text = (rec.feeds.length || rec.diapers.length)
    ? `📋宝比日报-【${label}】:\n总奶量:${ml}ML - ${rec.feeds.length}顿奶🥛\n换片片:尿尿片- ${pee}次;粑粑片- ${poo}次`
    : `📋宝比日报-【${label}】:\n还没有记录呢~`;
  return { date:d, k, ml, text };
}
// iCalendar 的 TEXT 字段里,反斜杠/逗号/分号/换行都要转义,不然日报文字里的换行会把 ics 文件格式弄坏。
function icsEscape(s){
  return String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function saveToCalendar(){
  const r = dailyReport();
  const ymd = r.k.replace(/-/g,'');
  const stamp = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15)+'Z';
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//baobi//CN','BEGIN:VEVENT',
    'UID:baobi-'+r.k+'@baobi',
    'DTSTAMP:'+stamp,
    'DTSTART;VALUE=DATE:'+ymd,
    'SUMMARY:宝比日报 奶量'+r.ml+'ml',
    'DESCRIPTION:'+icsEscape(r.text),
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type:'text/calendar' }));
  a.download = '宝比日报'+r.k+'.ics';
  document.body.appendChild(a); a.click(); a.remove();
}

