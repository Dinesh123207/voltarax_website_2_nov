const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'voltarax-web/frontend/app/globals.css'),'utf8');
const luminance=hex=>{const rgb=hex.match(/\w\w/g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const ratio=(a,b)=>{const x=luminance(a.replace('#','')),y=luminance(b.replace('#',''));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const surface=css.match(/--surface:\s*(#[a-f0-9]{6})/i)?.[1];if(!surface)throw Error('Actual card surface missing');
const results=[];
for(const role of ['production','savings','consumption','grid']){
  const color=css.match(new RegExp('\\.metric-'+role+'\\s*\\{\\s*color:\\s*(#[a-f0-9]{6})','i'))?.[1];if(!color)throw Error('Metric color missing');
  for(const background of [...new Set([surface,'#0a0f0d','#102017'])])results.push({role,color,background,contrast:Number(ratio(color,background).toFixed(3))});
}
const proof={formula:'Relative sRGB luminance and (Lmax+0.05)/(Lmin+0.05)',samples:results,minimum:Math.min(...results.map(value=>value.contrast)),threshold:4.5,scope:'Actual solid metric foregrounds against card/page/notice surfaces; gradients/images/transparency require browser review. No WCAG certification.'};
fs.writeFileSync(path.join(root,'docs/test-results/phase11-contrast.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));if(proof.minimum<proof.threshold)process.exit(1);
