// feed.js -- FEEDING RECORD module (add/edit/delete feed entries + "距上次喂奶" timer banner)
// ================= 常用容量自学习 =================
function learnedAmounts(){
  const all = loadAll(); const freq = {}; let total = 0;
  for (const k in all) { if (k.startsWith('_')) continue;
    for (const f of (all[k].feeds||[])) { freq[f.ml] = (freq[f.ml]||0)+1; total++; } }
  if (total < 5) return [60, 90, 120, 150];
  const top = Object.entries(freq)
    .sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>+e[0]).sort((a,b)=>a-b);
  const fill = [60,90,120,150].filter(x=>!top.includes(x));
  while (top.length<4) top.push(fill.shift());
  return top.sort((a,b)=>a-b);
}

// ================= 顶部 / 提醒横幅 =================
function lastFeedTs(){
  const all = loadAll(); let last = 0;
  for (const k in all) { if (k.startsWith('_')) continue;
    for (const f of (all[k].feeds||[])) if (f.ts && f.ts > last) last = f.ts; }
  return last;
}
// 把"记录所在的那一天"+"记录上显示的时间(可能被手动改过)"合成一个真实的时间点,
// 这样"距上次喂奶"是按你编辑后的时间算,而不是按当初点保存那一刻算的。
function feedMoment(dayK, at){
  const t = new Date(dayK+'T'+(at||'00:00')+':00');
  return isNaN(t.getTime()) ? 0 : t.getTime();
}
function lastFeedMoment(){
  const all = loadAll(); let last = 0;
  for (const k in all) { if (k.startsWith('_')) continue;
    for (const f of (all[k].feeds||[])) {
      const m = feedMoment(k, f.at);
      if (m > last) last = m;
    }
  }
  return last;
}
let notified = 0;
function notifyOnce(last){
  if (notified === last) return;
  notified = last;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('宝比健康成长中', { body:'距上次喂奶已3小时,该记录宝比吃了多少奶咯~' });
  }
}
if ('Notification' in window && Notification.permission === 'default') {
  setTimeout(()=>Notification.requestPermission(), 1500);
}
function updateBanner(){
  const banners = ['banner','bannerRecord'].map(id=>document.getElementById(id)).filter(Boolean);
  if (!banners.length) return;
  const last = lastFeedMoment();
  let cls, text;
  if (!last) {
    cls='ok'; text='还没有记录,喂完奶点下方按钮记录吧';
  } else {
    const mins = Math.max(0, Math.floor((Date.now()-last)/60000));
    const h = Math.floor(mins/60), m = mins%60;
    if (mins >= 180) {
      cls='due';
      text = `距上次喂奶已 ${h}小时${m}分,该喂宝比啦!`;
      notifyOnce(last);
    } else {
      cls='ok';
      text = `距上次喂奶 ${h}小时${m}分`;
    }
  }
  banners.forEach(b=>{ b.className=cls; b.textContent=text; });
}

// ================= 喂奶操作 =================
let selMl = null;
let editingFeedIndex = null;   // 正在编辑的记录在 feeds 数组里的真实下标,null 表示新增
function openSheet(){
  editingFeedIndex = null;
  selMl = null;
  document.getElementById('sheetTitle').textContent = '宝比吃了多少奶?';
  document.getElementById('customMl').value = '';
  document.getElementById('feedTimeInput').value = nowHM();
  document.getElementById('sheetDeleteBtn').style.display = 'none';
  renderAmounts();
  document.getElementById('overlay').classList.add('show');
}
function editFeed(i){
  const k = dayKey(), data = getDay(k);
  const idx = i;   // i 就是记录在数组里的真实下标(渲染时已处理好显示顺序)
  const f = data.feeds[idx];
  if (!f) return;
  editingFeedIndex = idx;
  selMl = f.ml;
  document.getElementById('sheetTitle').textContent = '编辑喂奶记录';
  document.getElementById('customMl').value = learnedAmounts().includes(f.ml) ? '' : f.ml;
  document.getElementById('feedTimeInput').value = f.at;
  document.getElementById('sheetDeleteBtn').style.display = 'block';
  renderAmounts();
  document.getElementById('overlay').classList.add('show');
}
function renderAmounts(){
  document.getElementById('amountBtns').innerHTML = learnedAmounts().map(m=>
    `<button class="${selMl===m?'sel':''}" onclick="pickMl(${m})">${m}</button>`).join('');
}
function pickMl(m){ selMl=m; document.getElementById('customMl').value=''; renderAmounts(); }
function closeSheet(){ document.getElementById('overlay').classList.remove('show'); }
function saveFeed(){
  const custom = parseInt(document.getElementById('customMl').value);
  const ml = custom>0 ? custom : selMl;
  if (!ml) { alert('请选择或输入毫升数'); return; }
  const at = document.getElementById('feedTimeInput').value || nowHM();
  const k = dayKey(), data = getDay(k);
  if (editingFeedIndex !== null && data.feeds[editingFeedIndex]) {
    data.feeds[editingFeedIndex].ml = ml;
    data.feeds[editingFeedIndex].at = at;
  } else {
    data.feeds.push({ ml, at, ts:Date.now() });
  }
  setDay(k, data);
  closeSheet(); masterRender(); scheduleSync();
}
function deleteFeedFromSheet(){
  if (editingFeedIndex === null) return;
  const k=dayKey(), data=getDay(k);
  const removed = data.feeds.splice(editingFeedIndex,1)[0];
  setDay(k,data); tombstone(removed); closeSheet(); masterRender(); scheduleSync();
}

