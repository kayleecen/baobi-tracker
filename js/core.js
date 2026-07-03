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

// ================= 全局状态 =================
let calMonth = new Date(); calMonth.setDate(1);
let selectedDate = new Date();

function tombstone(rec){
  if (!rec || !rec.ts) return;
  const all = loadAll();
  (all._del = all._del || []).push(rec.ts);
  saveAll(all);
}
