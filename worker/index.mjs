// Build injects Engine, roomService and immutable static assets above this file.
const api=roomService(Engine);
export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname.startsWith('/api/'))return api(request,env);const key=u.pathname==='/'?'/index.html':u.pathname;const asset=ASSETS[key];if(!asset)return new Response('Not found',{status:404});return new Response(request.method==='HEAD'?null:asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}})}};
