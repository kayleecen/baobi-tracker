// note.js -- shared family note widget (records page)
// 一句话备注,家人共用同一条,谁编辑就覆盖上一条,显示编辑时间。
// ================= 备注栏 =================
const NOTE_KEY = 'baobi_note_v1';
function loadNote(){
  try { return JSON.parse(localStorage.getItem(NOTE_KEY)) || { text:'', updatedAt:0 } }
  catch(e){ return { text:'', updatedAt:0 } }
}
function saveNoteLocal(n){
  try { localStorage.setItem(NOTE_KEY, JSON.stringify(n)) } catch(e){}
}
function fmtNoteTime(ts){
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const hm = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const sameDay = d.toDateString() === now.toDateString();
  return (sameDay ? '今天 ' : (d.getMonth()+1)+'月'+d.getDate()+'日 ') + hm;
}
function renderFamilyNote(){
  const input = document.getElementById('familyNoteInput');
  const meta = document.getElementById('familyNoteMeta');
  if (!input || !meta) return;
  const n = loadNote();
  // 正在输入的时候不要把光标下的内容替换掉
  if (document.activeElement !== input) input.value = n.text || '';
  meta.textContent = n.updatedAt ? ('最后编辑于 ' + fmtNoteTime(n.updatedAt)) : '还没有人留言,写点什么给家人吧';
}
function saveFamilyNote(){
  const input = document.getElementById('familyNoteInput');
  if (!input) return;
  const n = { text: input.value, updatedAt: Date.now() };
  saveNoteLocal(n);
  renderFamilyNote();
  scheduleSync();
}
