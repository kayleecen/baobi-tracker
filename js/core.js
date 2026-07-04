// core.js -- shared storage helpers + shared global state (used by all feature modules)
// ================= 存储 =================
const KEY = 'baobi_data_v1';
let mem = null;
function loadAll(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {} }
  catch(e){ return mem || {} }
}
function saveAll(d){
  mem = d;
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch(e){}
}

function dayKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function getDay(k){
  const all = loadAll();
  return all[k] || { feeds:[], diapers:[] };
}
function setDay(k, v){
  const all = loadAll(); all[k]=v; saveAll(all);
}
function nowHM(){
  const n=new Date();
  return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}
function dayTotalMl(k){
  return getDay(k).feeds.reduce((s,f)=>s+f.ml,0);
}
// 把"记录所在的那一天"+"记录上显示的时间(可能被手动改过)"合成一个真实的时间点。
// 喂奶/换片列表排序、"最新"标签都用这个,而不是记录当初保存那一刻的 ts,
// 这样编辑过时间的记录会按你填的时间排,而不是按你操作的先后顺序排。
function recordMoment(dayK, at){
  const t = new Date(dayK+'T'+(at||'00:00')+':00');
  return isNaN(t.getTime()) ? 0 : t.getTime();
}

// ================= 全局状态 =================
let calMonth = new Date(); calMonth.setDate(1);
let selectedDate = new Date();

function tombstone(rec){
  if (!rec || !rec.ts) return;
  const all = loadAll();
  (all._del = all._del || []).push(rec.ts);
  saveAll(all);
}
