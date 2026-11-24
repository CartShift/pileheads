'use strict';
const assert=require('node:assert/strict');
const {parseEditions,inquiryEmail,createHandler}=require('../api/editions.cjs');
const valid={slug:'example',name:'Example',description:'A sample edition.',deck:'original',accent:'#123456',published:true,secret:'never expose'};
assert.deepEqual(parseEditions(JSON.stringify([valid,valid,{...valid,slug:'bad!',published:true},{...valid,slug:'draft',published:false}])),[{slug:'example',name:'Example',description:'A sample edition.',deck:'original',accent:'#123456'}]);
assert.deepEqual(parseEditions('bad'),[]);assert.deepEqual(parseEditions(JSON.stringify([{...valid,deck:'unknown'}])),[]);
assert.equal(inquiryEmail('hello@example.com'),'hello@example.com');assert.equal(inquiryEmail('hello@example.com?bcc=bad'),null);
const handler=createHandler({editions:parseEditions(JSON.stringify([valid])),contact:null});
function call(path,method='GET'){const res={statusCode:200,setHeader(){},end(s){this.body=JSON.parse(s);}};handler({method},res,new URL(path,'https://stack.test'));return res;}
assert.equal(call('/api/editions?partner=example').body.edition.deck,'original');
assert.equal(call('/api/editions?partner=missing').statusCode,404);
assert.equal(call('/api/editions','POST').statusCode,405);
assert.deepEqual(call('/api/editions').body,{contact:null});
console.log('Partner edition contract checks passed');
