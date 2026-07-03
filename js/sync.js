// sync.js -- family cloud sync feature
// ================= 云同步(家人实时共享,三通道自动切换) =================
const SYNC_KEY = 'baobi_sync';
function syncCfg(){ try { return JSON.parse(localStorage.getItem(SYNC_KEY)) } catch(e){ return null } }
function setSyncCfg(c){
  try { c ? localStorage.setItem(SYNC_KEY, JSON.stringify(c)) : localStorage.removeItem(SYNC_KEY) } catch(e){}
}
function fetchT(url, opts, ms){
  opts = opts || {};
  const c = new AbortController();
  const t = setTimeout(()=>c.abort(), ms || 9000);
  opts.signal = c.signal;
  return fetch(url, opts).finally(()=>clearTimeout(t));
}
function syncMonths(){
  const now = new Date();
  const prev = new Date(now); prev.setMonth(prev.getMonth()-1);
  return [dayKey(now).slice(0,7), dayKey(prev).slice(0,7)];
}
function flatSlice(data, m){
  const days = {};
  for (const k in data) if (!k.startsWith('_') && k.slice(0,7)===m) days[k]=data[k];
  return days;
}
const PROV = {
  W: {
    async create(){
      const id = Math.random().toString(36).slice(2,10);
      const r = await fetchT('/api/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(loadAll()) });
      if (!r.ok) throw 0;
      return 'W.'+id;
    },
    async pull(id){
      const r = await fetchT('/api/'+id);
      if (r.status===404) return null;
      if (!r.ok) throw 0;
      return (await r.json()) || {};
    },
    async push(id, data){
      const r = await fetchT('/api/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw 0;
    },
    async verify(id){ if (await this.pull(id) === null) throw 0; }
  },
  K: {
    async create(){
      const r = await fetchT('https://kvdb.io', { method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body:'email=baobi-app@example.com' });
      if (!r.ok) throw 0;
      const id = (await r.text()).trim();
      if (!/^[A-Za-z0-9]{8,}$/.test(id)) throw 0;
      return 'K.'+id;
    },
    async pull(id){
      const flat = { _del:[] };
      for (const m of syncMonths()){
        const r = await fetchT('https://kvdb.io/'+id+'/m'+m);
        if (r.status===404) continue;
        if (!r.ok) throw 0;
        const txt = await r.text(); if (!txt) continue;
        let o; try { o = JSON.parse(txt) } catch(e){ continue }
        Object.assign(flat, o.days||{});
        flat._del.push(...(o.del||[]));
      }
      return flat;
    },
    async push(id, data){
      for (const m of syncMonths()){
        const r = await fetchT('https://kvdb.io/'+id+'/m'+m, { method:'PUT',
          body: JSON.stringify({ days:flatSlice(data,m), del:data._del||[] }) });
        if (!r.ok) throw 0;
      }
    },
    async verify(id){
      const r = await fetchT('https://kvdb.io/'+id+'/m'+syncMonths()[0]);
      if (!r.ok && r.status!==404) throw 0;
    }
  },
  J: {
    base:'https://jsonblob.com/api/jsonBlob',
    async create(){
      const r = await fetchT(this.base, { method:'POST',
        headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify(loadAll()) });
      const loc = r.headers.get('Location') || r.headers.get('location');
      if (!r.ok || !loc) throw 0;
      return 'J.'+loc.split('/').pop();
    },
    async pull(id){
      const r = await fetchT(this.base+'/'+id, { headers:{ 'Accept':'application/json' } });
      if (!r.ok) throw 0;
      return (await r.json()) || {};
    },
    async push(id, data){
      const r = await fetchT(this.base+'/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw 0;
    },
    async verify(id){ await this.pull(id); }
  },
  E: {
    base:'https://json.extendsclass.com/bin',
    async create(){
      const r = await fetchT(this.base, { method:'POST',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(loadAll()) });
      if (!r.ok) throw 0;
      const o = await r.json();
      if (!o || !o.id) throw 0;
      return 'E.'+o.id;
    },
    async pull(id){
      const r = await fetchT(this.base+'/'+id);
      if (!r.ok) throw 0;
      return (await r.json()) || {};
    },
    async push(id, data){
      const r = await fetchT(this.base+'/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw 0;
    },
    async verify(id){ await this.pull(id); }
  }
};
function parseCode(code){
  code = (code||'').trim();
  if (code[1]==='.' && PROV[code[0]]) return { prov:PROV[code[0]], id:code.slice(2) };
  if (code) return { prov:PROV.J, id:code };
  return null;
}

function mergeData(a, b){
  const out = {};
  const del = new Set([...(a._del||[]), ...(b._del||[])]);
  const days = new Set([...Object.keys(a), ...Object.keys(b)].filter(k=>!k.startsWith('_')));
  for (const k of days) {
    const fa=(a[k]||{}).feeds||[], fb=(b[k]||{}).feeds||[];
    const da=(a[k]||{}).diapers||[], db=(b[k]||{}).diapers||[];
    const feeds=[], seenF=new Set();
    for (const f of [...fa,...fb]) {
      const id = f.ts || (f.at+'|'+f.ml);
      if (seenF.has(id) || (f.ts && del.has(f.ts))) continue;
      seenF.add(id); feeds.push(f);
    }
    const diapers=[], seenD=new Set();
    for (const d of [...da,...db]) {
      const id = d.ts || (d.at+'|'+d.type);
      if (seenD.has(id) || (d.ts && del.has(d.ts))) continue;
      seenD.add(id); diapers.push(d);
    }
    feeds.sort((x,y)=>(x.ts||0)-(y.ts||0));
    diapers.sort((x,y)=>(x.ts||0)-(y.ts||0));
    out[k] = { feeds, diapers };
  }
  out._del = [...del];
  return out;
}

function setSyncStatus(msg, isErr){
  const el = document.getElementById('syncStatus');
  if (el) { el.textContent = msg; el.style.color = isErr ? 'var(--rose-d)' : ''; }
}
function renderSyncUI(){
  const cfg = syncCfg();
  document.getElementById('syncOff').style.display = cfg ? 'none' : 'block';
  document.getElementById('syncOn').style.display = cfg ? 'block' : 'none';
  if (cfg) document.getElementById('syncCodeShow').textContent = cfg.code;
  else setSyncStatus('未开启');
}

async function createSync(){
  const names = { W:'本站通道', K:'通道2', J:'通道3', E:'通道4' };
  for (const p of ['W','K','J','E']) {
    setSyncStatus('正在尝试'+names[p]+'...');
    try {
      const code = await PROV[p].create();
      const { prov, id } = parseCode(code);
      await prov.push(id, loadAll());
      setSyncCfg({ code });
      renderSyncUI();
      setSyncStatus('已开启('+names[p]+'),把同步码发给家人吧');
      return;
    } catch(e){}
  }
  setSyncStatus('三个通道都连不上。请确认:1.已连网 2.用Safari或系统浏览器打开(不要在微信内置窗口里) 然后重试;还不行请截图告诉开发者', true);
}
async function joinSync(){
  const raw = document.getElementById('joinCode').value;
  const pc = parseCode(raw);
  if (!pc) { alert('请先粘贴家人发来的同步码'); return; }
  setSyncStatus('正在加入...');
  try {
    const remote = await pc.prov.pull(pc.id);
    if (remote === null) throw 0;
    const merged = mergeData(loadAll(), remote||{});
    saveAll(merged);
    setSyncCfg({ code: raw.trim() });
    await pc.prov.push(pc.id, merged);
    renderSyncUI(); masterRender();
    setSyncStatus('加入成功,数据已合并同步');
  } catch(e){ setSyncStatus('加入失败:同步码不对或网络问题(别在微信内置窗口里操作,用浏览器打开)', true); }
}
let syncing = false;
async function syncNow(manual){
  const cfg = syncCfg(); if (!cfg || syncing) return;
  const pc = parseCode(cfg.code); if (!pc) return;
  syncing = true;
  if (manual) setSyncStatus('同步中...');
  try {
    let remote = await pc.prov.pull(pc.id);
    if (remote === null) remote = {};
    const merged = mergeData(loadAll(), remote||{});
    saveAll(merged);
    await pc.prov.push(pc.id, merged);
    setSyncStatus('已同步 '+nowHM());
    masterRender();
  } catch(e){ setSyncStatus('同步失败(网络问题),稍后自动重试', true); }
  syncing = false;
}
let syncTimer = null;
function scheduleSync(){
  if (!syncCfg()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(()=>syncNow(false), 2500);
}
function copySyncCode(){
  const cfg = syncCfg(); if (!cfg) return;
  const msg = '「宝比健康成长中」家庭同步码:'+cfg.code+'\n在页面「我的→家人同步」里粘贴并点「加入家庭同步」';
  if (navigator.clipboard) navigator.clipboard.writeText(msg).then(()=>alert('已复制,发给家人吧'));
  else prompt('长按复制:', msg);
}
function leaveSync(){
  if (confirm('退出后本机不再自动同步(数据保留在本机),确定?')) {
    setSyncCfg(null); renderSyncUI();
  }
}

