// diaper.js -- diaper (尿尿/便便) record module (add/edit/delete)
// ================= 换片操作 =================
function addDiaper(type){
  const k=dayKey(), data=getDay(k);
  data.diapers.push({ type, at:nowHM(), ts:Date.now() });
  setDay(k,data); masterRender(); scheduleSync();
}
let editingDiaperIndex = null;   // 正在编辑的记录在 diapers 数组里的真实下标
let selDiaperType = null;
function pickDiaperType(type){
  selDiaperType = type;
  document.getElementById('diaperTypePee').classList.toggle('sel', type==='pee');
  document.getElementById('diaperTypePoo').classList.toggle('sel', type==='poo');
}
function editDiaper(i){
  const k = dayKey(), data = getDay(k);
  const idx = i;   // i 就是记录在数组里的真实下标(渲染时已处理好显示顺序)
  const d = data.diapers[idx];
  if (!d) return;
  editingDiaperIndex = idx;
  pickDiaperType(d.type);
  document.getElementById('diaperTimeInput').value = d.at;
  document.getElementById('diaperOverlay').classList.add('show');
}
function closeDiaperSheet(){ document.getElementById('diaperOverlay').classList.remove('show'); }
function saveDiaper(){
  if (editingDiaperIndex === null) return;
  const k = dayKey(), data = getDay(k);
  const rec = data.diapers[editingDiaperIndex];
  if (!rec) { closeDiaperSheet(); return; }
  rec.type = selDiaperType || rec.type;
  rec.at = document.getElementById('diaperTimeInput').value || rec.at;
  setDay(k, data);
  closeDiaperSheet(); masterRender(); scheduleSync();
}
function deleteDiaperFromSheet(){
  if (editingDiaperIndex === null) return;
  const k=dayKey(), data=getDay(k);
  const removed = data.diapers.splice(editingDiaperIndex,1)[0];
  setDay(k,data); tombstone(removed); closeDiaperSheet(); masterRender(); scheduleSync();
}

