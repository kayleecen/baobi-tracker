// home-timeline.js -- selected-day timeline, including editing for past days
function editIcon(kind, index, day){
  const fn = kind === 'feed' ? 'editFeed' : kind === 'sleep' ? 'editSleep' : 'editDiaper';
  return `<button class="edit-btn" onclick="${fn}(${index}, '${day}')" aria-label="编辑记录">✎</button>`;
}
function renderDayDetail(){
  const y = selectedDate.getFullYear(), m = selectedDate.getMonth(), d = selectedDate.getDate();
  const k = dayKey(selectedDate), data = getDay(k), today = new Date();
  const isToday = y===today.getFullYear() && m===today.getMonth() && d===today.getDate();
  document.getElementById('dayTitle').textContent = `${y}年${m+1}月${d}日${isToday ? ' · 今天' : ''}`;
  document.getElementById('dMl').textContent = data.feeds.reduce((sum, f) => sum + f.ml, 0);
  document.getElementById('dFeed').textContent = data.feeds.length;
  document.getElementById('dPee').textContent = data.diapers.filter(x => x.type === 'pee').length;
  document.getElementById('dPoo').textContent = data.diapers.filter(x => x.type === 'poo').length;
  const items = [
    ...data.feeds.map((f, index) => ({ index, ts:recordMoment(k,f.at), tsCreated:f.ts, at:f.at, kind:'feed', label:`${f.ml} ml`, icon:'🍼' })),
    ...data.diapers.map((x, index) => ({ index, ts:recordMoment(k,x.at), tsCreated:x.ts, at:x.at, kind:x.type, label:x.type==='poo'?'粑粑':'尿尿', icon:x.type==='poo'?'💩':'💧' })),
    ...data.sleeps.map((x, index) => ({ index, ts:recordMoment(k,x.at), tsCreated:x.ts, at:x.at, kind:'sleep', label:`睡觉${x.minutes ? ` · ${x.minutes} 分钟` : ''}`, icon:'😴' }))
  ].sort((a,b) => b.ts-a.ts || (b.tsCreated||0)-(a.tsCreated||0));
  const list = document.getElementById('dayList');
  list.innerHTML = items.length
    ? items.map((it,index) => `<div class="row"><span class="ricon">${it.icon}</span><span class="t">${it.at}</span><span class="v">${it.label}</span>${index===0?'<span class="latest-tag">最新</span>':''}${editIcon(it.kind,it.index,k)}</div>`).join('')
    : '<div class="empty">这一天还没有记录</div>';
}
function renderYesterdaySummary(){
  const elMl = document.getElementById('yMl'), elPoo = document.getElementById('yPoo');
  if (!elMl || !elPoo) return;
  const y = new Date(); y.setDate(y.getDate()-1);
  const data = getDay(dayKey(y));
  elMl.textContent = data.feeds.reduce((sum,f) => sum+f.ml, 0);
  elPoo.textContent = data.diapers.filter(x => x.type==='poo').length;
}
