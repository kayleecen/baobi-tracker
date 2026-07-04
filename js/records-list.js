// records-list.js -- shared feed+diaper list rendering for the record page (used by both feed & diaper modules)
// ================= 记录页:列表渲染 =================
function renderRecordLists(){
  const k = dayKey();
  const data = getDay(k);
  // 按"记录时间"(recordMoment,即 k+at 合成的真实时间点)排序,不是按数组里存放的先后顺序,
  // 这样编辑过时间的记录会挪到正确的位置,最上面那条会标"最新"。
  const fl = document.getElementById('feedList');
  const feedsSorted = data.feeds.map((f,i)=>({f,i}))
    .sort((a,b)=>recordMoment(k,b.f.at)-recordMoment(k,a.f.at));
  fl.innerHTML = data.feeds.length===0
    ? '<div class="empty">今天还没有喂奶记录</div>'
    : feedsSorted.map(({f,i},idx)=>
      `<div class="row"><span class="t">${f.at}</span><span class="v">${f.ml} ml</span>${idx===0?'<span class="latest-tag">最新</span>':''}
       <button class="edit-btn" onclick="editFeed(${i})" aria-label="编辑">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
       </button></div>`).join('');
  const dl = document.getElementById('diaperList');
  const diapersSorted = data.diapers.map((d,i)=>({d,i}))
    .sort((a,b)=>recordMoment(k,b.d.at)-recordMoment(k,a.d.at));
  dl.innerHTML = data.diapers.length===0 ? ''
    : diapersSorted.map(({d,i},idx)=>
      `<div class="row"><span class="t">${d.at}</span>
       <span class="v" style="flex:1;display:flex;align-items:center;gap:6px;color:${d.type==='poo'?'var(--peach-d)':'var(--sky-d)'}"><img src="img/icons/${d.type==='poo'?'poop':'pee-drop'}.png" alt="" style="width:22px;height:22px;object-fit:contain">${d.type==='poo'?'粑粑':'尿尿'}</span>${idx===0?'<span class="latest-tag">最新</span>':''}
       <button class="edit-btn" onclick="editDiaper(${i})" aria-label="编辑">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
       </button></div>`).join('');
}

