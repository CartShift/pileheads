'use strict';
// Generates a batch locally. No network calls or DB writes. Keep codes private.
const fs=require('node:fs'),crypto=require('node:crypto');
const [batch,countText,directory]=process.argv.slice(2),count=Number(countText);
if(!/^[a-zA-Z0-9_-]{1,80}$/.test(batch||'')||!Number.isInteger(count)||count<1||count>10000||!directory)throw Error('Usage: node scripts/generate-redemption-batch.cjs BATCH COUNT NEW_DIRECTORY');
fs.mkdirSync(directory,{mode:0o700});
const codes=[],rows=[];
for(let i=0;i<count;i++){
 const code=crypto.randomBytes(24).toString('base64url');
 codes.push(code);rows.push([crypto.createHash('sha256').update(code).digest('hex'),'founder-supporter',batch].join(','));
}
fs.writeFileSync(directory+'/private-codes.txt',codes.join('\n')+'\n',{mode:0o600,flag:'wx'});
fs.writeFileSync(directory+'/import-hashes.csv','code_hash,product_id,batch_id\n'+rows.join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Generated '+count+' codes. Import only the hash CSV. Never commit either file.');
