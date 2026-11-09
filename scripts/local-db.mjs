import {DatabaseSync} from 'node:sqlite';
export function localDB(path=':memory:'){
 const db=new DatabaseSync(path);
 return {raw:db,DB:{prepare(sql){let values=[];return {
  bind(...args){values=args;return this},
  async first(){return db.prepare(sql).get(...values)||null},
  async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}}}
 }}}};
}
