import { readFile, writeFile } from "node:fs/promises";
const config=JSON.parse(await readFile(new URL("../lib/seo-routes.json",import.meta.url),"utf8"));
const paths=Object.entries(config.routes).filter(([,policy])=>policy.index).map(([route])=>route);
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+paths.map(route=>'  <url><loc>'+new URL(route,config.origin).href+'</loc></url>').join('\n')+'\n</urlset>\n';
await writeFile(new URL("../public/sitemap.xml",import.meta.url),sitemap);
