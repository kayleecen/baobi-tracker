// Cloudflare Pages Function
// 部署路径要求:这个文件必须放在 site/functions/api/[id].js
// (和 site/index.html 同级的 functions 目录下,Cloudflare Pages 会自动识别)
//
// 作用:实现 GET /api/:id 和 PUT /api/:id,数据存在 Cloudflare KV 里,
// 完全同源(和网页在同一个域名下),不会有任何跨域(CORS)问题。

export async function onRequestGet({ params, env }) {
  const id = params.id;
  const val = await env.SYNC_KV.get(id);
  if (val === null) return new Response('Not Found', { status: 404 });
  return new Response(val, { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPut({ params, env, request }) {
  const id = params.id;
  const body = await request.text();
  if (body.length > 5000000) return new Response('Payload too large', { status: 413 });
  await env.SYNC_KV.put(id, body);
  return new Response('OK', { status: 200 });
}
