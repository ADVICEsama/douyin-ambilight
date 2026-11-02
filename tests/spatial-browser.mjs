import {chromium} from 'playwright';
import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.DA_OUTPUT?path.resolve(process.env.DA_OUTPUT):path.resolve(root,'../../outputs');
const browser=await chromium.launch({headless:true,executablePath:process.env.DA_CHROMIUM||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),args:['--autoplay-policy=no-user-gesture-required']});
const fixture=`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#111218;color:#f3f4f9;font:15px system-ui}#app{height:100vh;background:#15161c}header{height:80px;background:#202127;border-bottom:1px solid #555;padding:24px 30px}aside{position:absolute;left:0;top:80px;bottom:0;width:180px;background:#202127;padding:30px 20px;line-height:3.4}#player{position:absolute;left:205px;top:115px;width:850px;height:740px;background:#22232a;overflow:hidden;border-radius:9px}.xgplayer::before{content:'';position:absolute;inset:0;background:linear-gradient(40deg,#a28150,#b9a34b,#866347);background-size:cover;filter:blur(35px)}.QpH7y{position:absolute;inset:0;background:linear-gradient(40deg,#ab8a52,#9c8351)}.QpH7y canvas{position:absolute;inset:0;width:100%;height:100%}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#b09a54;z-index:1}.danmaku{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none}.xgplayer-controls{position:absolute;bottom:0;left:0;right:0;height:36px;background:#111b;z-index:8;color:#fff;padding:6px 14px}.proof{position:absolute;right:8px;top:16px;width:20px;height:20px;background:rgb(96,96,96);z-index:9}.comment-panel{position:absolute;left:1055px;top:115px;width:335px;height:740px;background:#23242a;border-left:1px solid #777}.nested{height:100%;background:#25262c;padding:22px}.comment{margin:28px 0;color:#dedee7}.caption{position:absolute;left:220px;top:900px;color:#888b9e;font-size:12px}
</style><div id="app"><header>抖音环境光 · 修复对照 <small>本地模拟，不是抖音实拍</small></header><aside>精选<br>推荐<br>关注<br>朋友<br>我的<br>直播</aside><div id="player" class="xgplayer"><div class="QpH7y"><canvas></canvas></div><video id="main" muted></video><canvas class="danmaku"></canvas><div class="proof"></div><div class="xgplayer-controls">▶　00:03 / 05:43　　　　　　　音量　全屏</div></div><div class="comment-panel"><div class="nested">详情　TA 的作品　评论<hr><div class="comment">柔和扩散应当在文字后面</div><div class="comment">评论区不应被白色遮罩染亮</div><div class="comment">左右背景应连续过渡</div></div></div><div class="caption">LOCAL SYNTHETIC VIDEO · 本地模拟横屏 / 竖屏布局</div></div><script>
window.makeVideo=async(portrait=false)=>{const v=document.querySelector('#main'),c=document.createElement('canvas');c.width=portrait?360:960;c.height=portrait?640:540;const x=c.getContext('2d');function paint(){const g=x.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,'#155b83');g.addColorStop(.5,'#18415e');g.addColorStop(1,'#7b4583');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);if(window.overrideColor){x.fillStyle=window.overrideColor;x.fillRect(0,0,c.width,c.height);}x.fillStyle='#44addd';x.beginPath();x.arc(c.width*.48,c.height*.45,c.width*.18,0,Math.PI*2);x.fill();x.fillStyle='#effaff';x.font='24px sans-serif';x.fillText(portrait?'PORTRAIT 9:16':'LANDSCAPE 16:9',24,c.height*.8);}paint();setInterval(paint,33);v.srcObject=c.captureStream(30);await v.play();};makeVideo().then(()=>window.ready=true);
</script>`;
const legacy={enabled:true,intensity:100,spread:267,blur:78,stretchX:101,stretchY:100,fadeStart:100,smoothing:65,fps:24,hideNative:true,autoH:false,autoV:true,cropVideo:false,videoShadow:0,videoShadowOpacity:0,blend:'screen'};
const checks=[];async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function create(version){const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.route('http://localhost:54329/spatial',r=>r.fulfill({body:fixture,contentType:'text/html'}));await page.addInitScript(legacy=>{const data={'douyin-ambilight-settings-v1':legacy};window.GM_getValue=(k,f)=>data[k]??f;window.GM_setValue=(k,v)=>{data[k]=v;};window.GM_addValueChangeListener=()=>{};window.GM_registerMenuCommand=()=>{};},legacy);await page.goto('http://localhost:54329/spatial');await page.waitForFunction(()=>window.ready);await page.addScriptTag({content:await readFile(path.join(out,`douyin-ambilight-${version}.user.js`),'utf8')});await page.waitForTimeout(700);return page;}
const pixel=(png,x,y)=>[...png.data.slice((Math.round(y)*png.width+Math.round(x))*4,(Math.round(y)*png.width+Math.round(x))*4+3)];
try{
 let oldAvailable=true;try{await access(path.join(out,'douyin-ambilight-0.2.0.user.js'));}catch{oldAvailable=false;}
 if(oldAvailable){const old=await create('0.2.0');await old.screenshot({path:path.join(out,'修复前-本地模拟.png')});await old.close();}else console.log('Old 0.2.0 bundle absent: skipping old-version preview only');
 const page=await create('0.5.3');
 await check('hashed unfiltered native background and pseudo layer are hidden; danmaku and controls stay visible',async()=>{
   assert.equal(await page.locator('.QpH7y').evaluate(e=>getComputedStyle(e).visibility),'hidden');assert.equal(await page.locator('#player').evaluate(e=>getComputedStyle(e,'::before').visibility),'hidden');
   assert.equal(await page.locator('.danmaku').evaluate(e=>getComputedStyle(e).visibility),'visible');assert.equal(await page.locator('.xgplayer-controls').evaluate(e=>getComputedStyle(e).visibility),'visible');
 });
 await check('letterbox is clipped by geometry without requiring encoded black pixels',async()=>{
   const clip=await page.locator('#main').evaluate(e=>e.style.clipPath);assert.match(clip,/inset/);assert.notEqual(clip,'inset(0% 0%)');
   assert.match(await page.locator('#douyin-ambilight-layer').getAttribute('data-diagnostics'),/上 0.0% \/ 下 0.0% \/ 左 0.0% \/ 右 0.0%/);
 });
 await check('foreground is not tinted by full-intensity glow and panel backgrounds have no hard seam',async()=>{
   await page.screenshot({path:path.join(out,'修复后-横屏-本地模拟.png')});const png=PNG.sync.read(await readFile(path.join(out,'修复后-横屏-本地模拟.png')));
   assert.deepEqual(pixel(png,1040,140),[96,96,96]);
   for(const y of [180,220,800]){const a=pixel(png,1053,y),b=pixel(png,1057,y);assert.ok(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<15,`${y} seam ${a} vs ${b}`);}
 });
 await check('independent shadow darkens outside the actual picture and is not clipped by player overflow',async()=>{
   const before=PNG.sync.read(await page.screenshot());await page.keyboard.press('Alt+Shift+L');const ui=page.locator('#douyin-ambilight-ui');await ui.getByText('视频',{exact:true}).click();await ui.getByRole('slider',{name:'视频阴影不透明度'}).fill('0');await ui.getByRole('button',{name:'关闭设置'}).click();await page.waitForTimeout(100);
   const after=PNG.sync.read(await page.screenshot());const a=pixel(before,200,480),b=pixel(after,200,480);assert.ok(b.reduce((x,y)=>x+y,0)-a.reduce((x,y)=>x+y,0)>6,`shadow ${a} vs ${b}`);
   await page.keyboard.press('Alt+Shift+L');await ui.getByRole('slider',{name:'视频阴影不透明度'}).fill('65');await ui.getByRole('button',{name:'关闭设置'}).click();
 });
 await check('presentation continues smoothly between source captures',async()=>{
   const frames=Number(await page.locator('#douyin-ambilight-layer').getAttribute('data-presentation-frames'));await page.waitForTimeout(300);const after=Number(await page.locator('#douyin-ambilight-layer').getAttribute('data-presentation-frames'));assert.ok(after-frames>=8,`only ${after-frames} presentation frames`);
 });
 await check('projected pixels interpolate between captures instead of jumping directly',async()=>{
   await page.evaluate(()=>{window.overrideColor='#ff0000';});await page.waitForTimeout(550);
   await page.evaluate(()=>{window.overrideColor='#0000ff';});
   await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer canvas').getContext('2d').getImageData(2,2,1,1).data[2]>240);
   const blend=await page.locator('.da-projection').first().evaluate(e=>[...e.getContext('2d').getImageData(2,2,1,1).data]);
   assert.ok(blend[0]>0&&blend[0]<255&&blend[2]>0&&blend[2]<255,'expected intermediate red/blue pixels, got '+blend);
   await page.evaluate(()=>{window.overrideColor=null;});await page.waitForTimeout(500);
 });
 await page.evaluate(()=>makeVideo(true));await page.waitForTimeout(850);
 await check('portrait glow and shadow use inner picture bounds, not the outer player rectangle',async()=>{
   const geometry=await page.evaluate(()=>{const v=document.querySelector('#main'),r=v.getBoundingClientRect(),ratio=v.videoWidth/v.videoHeight,fit=Math.min(r.width/v.videoWidth,r.height/v.videoHeight),shadow=document.querySelector('#douyin-ambilight-video-shadow').getBoundingClientRect();return{imageWidth:v.videoWidth*fit,left:r.left+(r.width-v.videoWidth*fit)/2,shadowWidth:shadow.width,shadowLeft:shadow.left,playerWidth:document.querySelector('#player').getBoundingClientRect().width,clip:v.style.clipPath,ratio};});
   assert.ok(Math.abs(geometry.shadowWidth-geometry.imageWidth)<2);assert.ok(Math.abs(geometry.shadowLeft-geometry.left)<2);assert.ok(geometry.shadowWidth<geometry.playerWidth*.6);assert.match(geometry.clip,/inset/);
 });
 await page.screenshot({path:path.join(out,'修复后-竖屏-本地模拟.png')});
 await check('disable restores native pseudo/canvas, page backgrounds and original video style',async()=>{
   await page.keyboard.press('Alt+Shift+L');await page.locator('#douyin-ambilight-ui').getByRole('checkbox',{name:'启用环境光',exact:true}).uncheck();
   assert.equal(await page.locator('.QpH7y').evaluate(e=>getComputedStyle(e).visibility),'visible');assert.equal(await page.locator('#player').getAttribute('data-da-native-before'),null);assert.equal(await page.locator('#main').evaluate(e=>e.style.clipPath),'');assert.equal(await page.locator('#douyin-ambilight-video-shadow').isVisible(),false);assert.equal(await page.locator('body').evaluate(e=>e.style.isolation),'');
 });
 await writeFile(path.join(root,'test-results/spatial.json'),JSON.stringify({checks},null,2));console.log(`${checks.length} spatial regression checks passed`);
}finally{await browser.close();}
