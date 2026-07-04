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
    // 本站通道:依赖 Cloudflare Pages Functions 在 /api/:id 提供 KV 读写。
    // 如果这个 Function 没有正确部署,这里会稳定收到 404(HTML 页面),自动跳到下一个通道。
    async create(){
      const id = Math.random().toString(36).slice(2,10);
      const r = await fetchT('/api/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(loadAll()) });
      if (!r.ok) throw new Error('本站通道 create http '+r.status);
      return 'W.'+id;
    },
    async pull(id){
      const r = await fetchT('/api/'+id);
      if (r.status===404) return null;
      if (!r.ok) throw new Error('本站通道 pull http '+r.status);
      return (await r.json()) || {};
    },
    async push(id, data){
      const r = await fetchT('/api/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error('本站通道 push http '+r.status);
    },
    async verify(id){ if (await this.pull(id) === null) throw new Error('本站通道 verify: not found'); }
  },
  K: {
    async create(){
      // 注意:必须带结尾斜杠 https://kvdb.io/ ,否则服务端会先 301 到带斜杠的地址,
      // 而 fetch 对 POST 的重定向处理在部分浏览器/网络环境下会把请求体丢掉,导致创建失败。
      const r = await fetchT('https://kvdb.io/', { method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body:'email=baobi-app@example.com' });
      if (!r.ok) throw new Error('kvdb create http '+r.status);
      const id = (await r.text()).trim();
      if (!/^[A-Za-z0-9]{8,}$/.test(id)) throw new Error('kvdb create bad id: '+id.slice(0,40));
      return 'K.'+id;
    },
    async pull(id){
      const flat = { _del:[] };
      for (const m of syncMonths()){
        const r = await fetchT('https://kvdb.io/'+id+'/m'+m);
        if (r.status===404) continue;
        if (!r.ok) throw new Error('kvdb pull http '+r.status);
        const txt = await r.text(); if (!txt) continue;
        let o; try { o = JSON.parse(txt) } catch(e){ continue }
        Object.assign(flat, o.days||{});
        flat._del.push(...(o.del||[]));
      }
      // 宝宝档案(月龄/体重/身高)和家庭备注不是按月存的,单独存一个 key。
      // 老的同步码可能还没有这个 key,404 是正常情况,不算失败。
      try {
        const r = await fetchT('https://kvdb.io/'+id+'/meta');
        if (r.ok) {
          const txt = await r.text();
          if (txt) { const o = JSON.parse(txt); if (o.profile) flat._profile = o.profile; if (o.note) flat._note = o.note; }
        } else if (r.status !== 404) {
          console.warn('[宝比同步] kvdb meta pull http '+r.status);
        }
      } catch(e){ console.warn('[宝比同步] kvdb meta pull 失败:', (e&&e.message)||e); }
      return flat;
    },
    async push(id, data){
      for (const m of syncMonths()){
        const r = await fetchT('https://kvdb.io/'+id+'/m'+m, { method:'PUT',
          body: JSON.stringify({ days:flatSlice(data,m), del:data._del||[] }) });
        if (!r.ok) throw new Error('kvdb push http '+r.status);
      }
      const rMeta = await fetchT('https://kvdb.io/'+id+'/meta', { method:'PUT',
        body: JSON.stringify({ profile:data._profile||{}, note:data._note||{} }) });
      if (!rMeta.ok) throw new Error('kvdb meta push http '+rMeta.status);
    },
    async verify(id){
      const r = await fetchT('https://kvdb.io/'+id+'/m'+syncMonths()[0]);
      if (!r.ok && r.status!==404) throw new Error('kvdb verify http '+r.status);
    }
  },
  J: {
    base:'https://jsonblob.com/api/jsonBlob',
    async create(){
      const r = await fetchT(this.base, { method:'POST',
        headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify(loadAll()) });
      // 浏览器跨域请求默认只能读到一小撮"安全"响应头,Location 不在其中,
      // 除非 jsonblob.com 显式返回了 Access-Control-Expose-Headers: Location。
      // 如果它没有配置这个,r.headers.get('Location') 在浏览器里永远是 null
      // (用 curl/Postman 测试却能看到 Location,因为那些工具不受 CORS 限制)。
      const loc = r.headers.get('Location') || r.headers.get('location');
      if (!r.ok) throw new Error('jsonblob create http '+r.status);
      if (!loc) throw new Error('jsonblob create: Location 头读不到(很可能是 CORS 未暴露该响应头)');
      return 'J.'+loc.split('/').pop();
    },
    async pull(id){
      const r = await fetchT(this.base+'/'+id, { headers:{ 'Accept':'application/json' } });
      if (!r.ok) throw new Error('jsonblob pull http '+r.status);
      return (await r.json()) || {};
    },
    async push(id, data){
      const r = await fetchT(this.base+'/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error('jsonblob push http '+r.status);
    },
    async verify(id){ await this.pull(id); }
  },
  E: {
    // extendsclass.com 在 2026 年已经要求创建 bin 必须带 Api-key 请求头(需要注册免费账号获取),
    // 匿名 POST 会稳定收到 401 "Wrong API key"。在申请到 key 并写死在这里之前,
    // 这个通道不会被 createSync() 尝试(见下方 CHANNELS 列表),只保留读写方法用于兼容老的同步码。
    base:'https://json.extendsclass.com/bin',
    apiKey: '', // 如果注册了免费账号,把 key 填在这里,并把 'E' 加回 CHANNELS 列表
    async create(){
      if (!this.apiKey) throw new Error('extendsclass 未配置 Api-key,已跳过');
      const r = await fetchT(this.base, { method:'POST',
        headers:{ 'Content-Type':'application/json', 'Api-key':this.apiKey }, body: JSON.stringify(loadAll()) });
      if (!r.ok) throw new Error('extendsclass create http '+r.status);
      const o = await r.json();
      if (!o || !o.id) throw new Error('extendsclass create: 返回里没有 id');
      return 'E.'+o.id;
    },
    async pull(id){
      const r = await fetchT(this.base+'/'+id);
      if (!r.ok) throw new Error('extendsclass pull http '+r.status);
      return (await r.json()) || {};
    },
    async push(id, data){
      const r = await fetchT(this.base+'/'+id, { method:'PUT',
        headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error('extendsclass push http '+r.status);
    },
    async verify(id){ await this.pull(id); }
  }
};
// 依次尝试创建同步的通道顺序。E 通道因为需要 Api-key(见上)默认不参与尝试。
const CHANNELS = ['W','K','J'];
function parseCode(code){
  code = (code||'').trim();
  if (code[1]==='.' && PROV[code[0]]) return { prov:PROV[code[0]], id:code.slice(2) };
  if (code) return { prov:PROV.J, id:code };
  return null;
}

// 挑两份"带 updatedAt 的小对象"(宝宝档案/家庭备注)里更新的那一份,谁改得晚听谁的。
function pickLatest(a, b){
  if (!a) return b || null;
  if (!b) return a;
  return (b.updatedAt||0) > (a.updatedAt||0) ? b : a;
}
// 打包本机要同步出去的完整数据:喂奶/换片记录 + 宝宝档案 + 家庭备注。
function syncPayload(){
  const d = loadAll();
  d._profile = loadProfile();
  d._note = loadNote();
  return d;
}
// 把合并后的数据落地到本机:档案和备注各自存回自己的 key,其余(喂奶/换片)存回主存储。
function applyMerged(merged){
  if (merged._profile) saveProfile(merged._profile);
  if (merged._note) saveNoteLocal(merged._note);
  const dayData = Object.assign({}, merged);
  delete dayData._profile;
  delete dayData._note;
  saveAll(dayData);
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
  out._profile = pickLatest(a._profile, b._profile);
  out._note = pickLatest(a._note, b._note);
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
  const errors = [];
  for (const p of CHANNELS) {
    setSyncStatus('正在尝试'+names[p]+'...');
    try {
      const code = await PROV[p].create();
      const { prov, id } = parseCode(code);
      await prov.push(id, syncPayload());
      setSyncCfg({ code });
      renderSyncUI();
      setSyncStatus('已开启('+names[p]+'),把同步码发给家人吧');
      return;
    } catch(e){
      const msg = (e && e.message) || String(e);
      errors.push(names[p]+': '+msg);
      console.warn('[宝比同步] '+names[p]+'('+p+') 失败:', msg);
    }
  }
  console.warn('[宝比同步] 全部通道失败汇总:\n'+errors.join('\n'));
  setSyncStatus('全部'+CHANNELS.length+'个同步通道都连不上。请确认:1.已连网 2.用Safari或系统浏览器打开(不要在微信内置窗口里) 然后重试;还不行的话打开浏览器控制台(F12→Console)截图具体报错发给开发者', true);
}
async function joinSync(){
  const raw = document.getElementById('joinCode').value;
  const pc = parseCode(raw);
  if (!pc) { alert('请先粘贴家人发来的同步码'); return; }
  setSyncStatus('正在加入...');
  try {
    const remote = await pc.prov.pull(pc.id);
    if (remote === null) throw new Error('同步码对应的数据不存在(remote null)');
    const merged = mergeData(syncPayload(), remote||{});
    applyMerged(merged);
    setSyncCfg({ code: raw.trim() });
    await pc.prov.push(pc.id, merged);
    renderSyncUI(); masterRender(); fillProfileInputs(); renderFamilyNote();
    setSyncStatus('加入成功,数据已合并同步');
  } catch(e){
    console.warn('[宝比同步] 加入失败:', (e && e.message) || e);
    setSyncStatus('加入失败:同步码不对或网络问题(别在微信内置窗口里操作,用浏览器打开;可打开控制台 F12 看具体报错)', true);
  }
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
    const merged = mergeData(syncPayload(), remote||{});
    applyMerged(merged);
    await pc.prov.push(pc.id, merged);
    setSyncStatus('已同步 '+nowHM());
    masterRender(); fillProfileInputs(); renderFamilyNote();
  } catch(e){
    console.warn('[宝比同步] 定时同步失败:', (e && e.message) || e);
    setSyncStatus('同步失败(网络问题),稍后自动重试', true);
  }
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

