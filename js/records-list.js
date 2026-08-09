// records-list.js -- today's editable record lists
function recordEditButton(fn, i){ return `<button class="edit-btn" onclick="${fn}(${i})" aria-label="编辑记录">✎</button>`; }
function renderRecordLists(){
  const k = dayKey(), data = getDay(k);
  const byTime = (a,b) => recordMoment(k,b.rec.at)-recordMoment(k,a.rec.at) || (b.rec.ts||0)-(a.rec.ts||0);
  const feeds = data.feeds.map((rec,i) => ({rec,i})).sort(byTime);
  document.getElementById('feedList').innerHTML = feeds.length
    ? feeds.map(({rec,i},n) => `<div class="row"><span class="t">${rec.at}</span><span class="v">${rec.ml} ml</span>${n===0?'<span class="latest-tag">最新</span>':''}${recordEditButton('editFeed',i)}</div>`).join('')
    : '<div class="empty">今天还没有喂奶记录</div>';
  const diapers = data.diapers.map((rec,i) => ({rec,i})).sort(byTime);
  document.getElementById('diaperList').innerHTML = diapers.map(({rec,i},n) => `<div class="row"><span class="t">${rec.at}</span><span class="v">${rec.type==='poo'?'💩 粑粑':'💧 尿尿'}</span>${n===0?'<span class="latest-tag">最新</span>':''}${recordEditButton('editDiaper',i)}</div>`).join('');
  const sleeps = data.sleeps.map((rec,i) => ({rec,i})).sort(byTime);
  document.getElementById('sleepList').innerHTML = sleeps.length
    ? sleeps.map(({rec,i},n) => `<div class="row"><span class="t">${rec.at}</span><span class="v">😴 睡觉${rec.minutes ? ` · ${rec.minutes} 分钟` : ''}</span>${n===0?'<span class="latest-tag">最新</span>':''}${recordEditButton('editSleep',i)}</div>`).join('')
    : '<div class="empty">今天还没有睡觉记录</div>';
}
