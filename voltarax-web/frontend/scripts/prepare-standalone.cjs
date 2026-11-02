// Copy only public/static build assets; never delete or move existing output.
const fs=require('node:fs'),path=require('node:path');
const root=fs.realpathSync(path.resolve(__dirname,'..')),target=fs.realpathSync(path.join(root,'.next/standalone'));
if(!target.startsWith(root+path.sep) || !fs.existsSync(path.join(target,'server.js')))throw Error('Expected owned standalone build output');
for(const [source,destination] of [['public','public'],['.next/static','.next/static']]){
  const output=path.resolve(target,destination);if(!output.startsWith(target+path.sep))throw Error('Unsafe asset output');
  fs.cpSync(path.join(root,source),output,{recursive:true});
}
console.log('Standalone public/static build assets are ready');
