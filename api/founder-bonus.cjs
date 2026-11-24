'use strict';
const SCORECARD='<!doctype html><html lang="en"><meta charset="utf-8"><title>STACK Founder scorecard</title><style>body{font:16px system-ui;max-width:720px;margin:30px auto;color:#172b25}h1{font-size:36px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:14px;text-align:left}small{display:block;margin-top:24px}@media print{body{margin:12mm}}</style><h1>STACK · Founder scorecard</h1><p>Optional house scoring: record the last player left each round. This does not change the official rules.</p><table><thead><tr><th>Round</th><th>Last player left</th><th>Notes</th></tr></thead><tbody>'+Array.from({length:10},(_,i)=>'<tr><td>'+(i+1)+'</td><td></td><td></td></tr>').join('')+'</tbody></table><small>STACK · Founder edition bonus</small></html>';
async function serveBonus(req,res,{row,owned,reply,secure}){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(res,405,{ok:false});}
 if(!row)return reply(res,401,{ok:false});
 if(!(await owned(row.id)).includes('founder-supporter'))return reply(res,403,{ok:false});
 secure(res);res.statusCode=200;
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Content-Disposition','attachment; filename="stack-founder-scorecard.html"');
 res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; sandbox");
 return res.end(SCORECARD);
}
module.exports={serveBonus,SCORECARD};
