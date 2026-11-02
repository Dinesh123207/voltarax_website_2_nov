// Bound original shipped assets; no external URL or unreviewed media is accepted.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),directory=path.join(__dirname,'../public/media');
const budgets={'system-flow.webm':512*1024,'system-flow-poster.svg':32*1024,'system-flow.en.vtt':16*1024,'system-flow.hi.vtt':16*1024};
const files=[];
for(const [name,ceiling] of Object.entries(budgets)){
  const bytes=fs.readFileSync(path.join(directory,name));
  if(!bytes.length||bytes.length>ceiling)throw Error('Original media exceeds its reviewed byte budget: '+name);
  if(name.endsWith('.webm')&&!bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))throw Error('Invalid WebM');
  if(name.endsWith('.vtt')&&!bytes.toString('utf8').startsWith('WEBVTT\n'))throw Error('Invalid caption track');
  if(name.endsWith('.svg')&&(/<script|foreignObject|\bon\w+=|(?:href|src)=["']https?:/i.test(bytes.toString('utf8'))))throw Error('Poster must remain self-contained');
  files.push({file:name,bytes:bytes.length,ceiling,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const result={original:true,files,totalBytes:files.reduce((total,file)=>total+file.bytes,0),withinBudget:true,policy:'Engineering resource caps, not performance/business claims'};
fs.mkdirSync(path.join(root,'docs/test-results'),{recursive:true});fs.writeFileSync(path.join(root,'docs/test-results/phase11-media-budget.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
