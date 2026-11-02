// Original canvas animation, no external source/asset/network or Remotion.
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('../voltarax-web/frontend/node_modules/playwright');
async function main(){
  const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':undefined,headless:true});
  try{
    const context=await browser.newContext({offline:true});const page=await context.newPage();await page.setContent('<canvas width="480" height="360"></canvas>');
    const bytes=await page.evaluate(async()=>{
      const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
      const nodes=[[110,85,'Sensors'],[365,85,'Firebase'],[365,275,'Authorized API'],[110,275,'Site view']];
      const draw=elapsed=>{
        ctx.fillStyle='#0a0f0d';ctx.fillRect(0,0,480,360);ctx.strokeStyle='#cbd5e1';ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(190,85);ctx.lineTo(285,85);ctx.moveTo(365,125);ctx.lineTo(365,235);ctx.moveTo(285,275);ctx.lineTo(190,275);ctx.stroke();
        nodes.forEach(([x,y,label],i)=>{ctx.fillStyle=Math.floor(elapsed/1000)%4===i?'#166534':'#173127';ctx.strokeStyle='#86efac';ctx.beginPath();ctx.roundRect(x-76,y-35,152,70,12);ctx.fill();ctx.stroke();ctx.fillStyle='#f1f5f9';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText(label,x,y+6);});
        ctx.fillStyle='#cbd5e1';ctx.font='16px sans-serif';ctx.fillText('Illustration, not live data',240,185);
      };
      draw(0);const stream=canvas.captureStream(12),chunks=[];
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:120000});
      const finished=new Promise(resolve=>{recorder.ondataavailable=event=>chunks.push(event.data);recorder.onstop=resolve;});
      recorder.start();const start=performance.now(),timer=setInterval(()=>draw(performance.now()-start),83);
      await new Promise(resolve=>setTimeout(resolve,4100));clearInterval(timer);recorder.stop();await finished;stream.getTracks().forEach(track=>track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));
    });
    const file=path.join(__dirname,'../voltarax-web/frontend/public/media/system-flow.webm');
    if(bytes.length>512*1024)throw Error('Original clip exceeds the byte budget');fs.writeFileSync(file,Buffer.from(bytes));console.log(JSON.stringify({originalAsset:path.basename(file),bytes:bytes.length,source:'Original canvas recording; no external assets/network'}));
  }finally{await browser.close();}
}
main().catch(()=>{console.error('Original animation generation failed');process.exit(1);});
