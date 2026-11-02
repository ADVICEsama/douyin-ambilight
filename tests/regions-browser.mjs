import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.DA_OUTPUT?path.resolve(process.env.DA_OUTPUT):path.resolve(root,'../../outputs');
const browser=await chromium.launch({headless:true,executablePath:process.env.DA_CHROMIUM||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),args:['--autoplay-policy=no-user-gesture-required']});
const fixture=`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#111218;color:#f2f2f8;font:14px system-ui}#app{height:100vh;background:#131419}.H7{position:absolute;top:0;left:0;right:0;height:78px;background:#111216}.H7 .I2{height:78px;background:#15161b;display:flex;align-items:center;padding:0 24px}.I2::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#111216,#18191f);z-index:-1}.brand{font-size:20px;font-weight:700}.S8{position:absolute;left:32%;top:16px;width:46%;height:46px;background:#35363c;border:1px solid #4d4e55;border-radius:12px;display:flex;align-items:center}.S8 .S9{display:flex;width:100%;height:100%;align-items:center;background:#323339;border-radius:12px}.S8 input{width:90%;height:100%;border:0;outline:none;background:#45464c;color:#eee;padding:0 14px}.search-icon{width:20px;height:20px;position:relative}.search-icon::before{content:'';position:absolute;width:15px;height:15px;background:#69d7e1;border-radius:50%}.N1{position:absolute;left:0;top:78px;bottom:0;width:180px;background:#101114}.N2{height:100%;padding:20px 12px;background:#15161a}.nav-list{height:70%;background:#121317}.nav-item{height:50px;margin:5px 0;padding:12px;color:#ddd;border-radius:10px}.nav-item.active{background:rgb(52,52,56);color:white}.footer-icons{position:absolute;bottom:16px;left:20px;height:40px;font-size:16px}#player{position:absolute;left:205px;top:110px;width:820px;height:735px;background:#181920;overflow:hidden;border-radius:10px}video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.xgplayer-controls{position:absolute;bottom:0;left:0;width:100%;height:40px;background:#08090b;z-index:5}.xgplayer-controls::before{content:'';position:absolute;left:0;bottom:0;width:100%;height:70px;background:linear-gradient(transparent,#060708);pointer-events:none}.K3{position:relative;display:flex;align-items:center;gap:24px;height:40px;background:#0a0b0e;padding:0 12px}button{font:inherit;color:white;border:0;background:rgba(55,57,66,.8);border-radius:5px;padding:4px 8px}.progress{position:absolute;top:0;left:0;width:100%;height:3px;background:#ed3366;z-index:8}.comment-panel{position:absolute;left:1045px;top:110px;width:340px;height:735px;background:#212228;padding:22px;border-left:1px solid #54565f}.comment{height:90px;padding-top:28px}.sending{position:absolute;bottom:12px;left:14px;right:14px;height:48px;background:#34353b;border-radius:10px}.input-shell{height:100%;background:#3b3c44;border-radius:10px}.input-shell textarea{height:100%;width:100%;border:0;resize:none;background:#45464f;color:#ddd;padding:12px;border-radius:10px}.note{position:absolute;left:220px;top:900px;font-size:12px;color:#9294a5}
</style><div id="app"><div class="H7"><div class="I2"><div class="brand">✦ 抖音环境光</div><div class="S8"><div class="S9"><input placeholder="搜索你感兴趣的内容"><span class="search-icon"></span></div></div></div></div><div class="N1"><div class="N2"><div class="nav-list"><div class="nav-item">精选</div><div class="nav-item active">推荐</div><div class="nav-item">关注</div><div class="nav-item">朋友</div><div class="nav-item">我的</div><div class="nav-item">直播</div></div><div class="footer-icons">⌂　⚙　◉</div></div></div><div id="player" class="xgplayer"><video id="main" muted></video><div class="xgplayer-controls"><div class="progress"></div><div class="K3"><button aria-label="播放">▶</button><span>00:03 / 05:43</span><span>倍速　全屏</span></div></div></div><div class="comment-panel"><div>详情　作品　评论<hr></div><div class="comment">左侧导航：根背景和列表背景都要处理</div><div class="comment">顶部：搜索外壳、内部层与输入框</div><div class="comment">底部：控制条背景，不要抹掉进度条</div><div class="sending"><div class="input-shell"><textarea placeholder="留下你的评论"></textarea></div></div></div><div class="note">LOCAL MOCK · 带哈希类名和嵌套背景的本地模拟，非抖音实拍</div></div><script>
const c=document.createElement('canvas');c.width=960;c.height=540;const x=c.getContext('2d');function paint(){const g=x.createLinearGradient(0,0,960,540);g.addColorStop(0,'#124b6c');g.addColorStop(.5,'#257987');g.addColorStop(1,'#593a7a');x.fillStyle=g;x.fillRect(0,0,960,540);x.fillStyle='#66c3ce';x.beginPath();x.arc(440,245,110,0,Math.PI*2);x.fill();x.fillStyle='#edfbff';x.font='26px sans-serif';x.fillText('FULL-PAGE AMBIENT',36,450);}paint();setInterval(paint,33);const v=document.getElementById('main');v.srcObject=c.captureStream(30);v.play().then(()=>window.ready=true);
</script>`;
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:54329/regions',r=>r.fulfill({body:fixture,contentType:'text/html'}));
await page.addInitScript(()=>{window.GM_getValue=(_k,f)=>f;window.GM_setValue=()=>{};window.GM_addValueChangeListener=()=>{};window.GM_registerMenuCommand=()=>{};});
const read=selector=>page.locator(selector).evaluate(e=>({bg:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage,style:e.getAttribute('style')}));
const alpha=color=>{if(color==='transparent')return 0;const nums=color.match(/[\d.]+/g)||[];return nums.length===4?Number(nums[3]):1;};
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto('http://localhost:54329/regions');await page.waitForFunction(()=>window.ready);
 const before=await page.evaluate(()=>Object.fromEntries(['.N1','.H7','.S8','#player','.xgplayer-controls','.comment-panel'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,[r.x,r.y,r.width,r.height]];})));
 await page.addScriptTag({content:await readFile(path.join(out,'douyin-ambilight-0.5.4.user.js'),'utf8')});await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer')?.dataset.state.includes('环境光运行中'));await page.waitForTimeout(300);
 await check('hashed left navigation and nested list backgrounds are discovered geometrically',async()=>{
  for(const s of ['.N1','.N2','.nav-list'])assert.equal(alpha((await read(s)).bg),0,s);
  assert.equal((await read('.nav-item.active')).bg,'rgb(52, 52, 56)');assert.match(await page.locator('#douyin-ambilight-layer').getAttribute('data-diagnostics'),/左导航 [1-9]/);
 });
 await check('top shell, search wrappers and actual input background blend without erasing icon pseudo',async()=>{
  for(const s of ['.H7','.I2','.S8','.S9','.S8 input'])assert.equal(alpha((await read(s)).bg),0,s);
  assert.equal(await page.locator('.I2').evaluate(e=>getComputedStyle(e,'::after').backgroundImage),'none');
  assert.equal(await page.locator('.search-icon').evaluate(e=>getComputedStyle(e,'::before').backgroundColor),'rgb(105, 215, 225)');
 });
 await check('control root, inner strip and gradient fuse but progress and controls remain',async()=>{
  for(const s of ['.xgplayer-controls','.K3'])assert.equal(alpha((await read(s)).bg),0,s);
  assert.equal(await page.locator('.xgplayer-controls').evaluate(e=>getComputedStyle(e,'::before').backgroundImage),'none');
  assert.equal((await read('.progress')).bg,'rgb(237, 51, 102)');assert.ok(await page.getByRole('button',{name:'播放',exact:true}).isVisible());
 });
 await check('nested comment editor surface and textarea both become transparent',async()=>{
  for(const s of ['.sending','.input-shell','textarea'])assert.equal(alpha((await read(s)).bg),0,s);
 });
 await check('all original region geometry remains unchanged',async()=>{
  const after=await page.evaluate(()=>Object.fromEntries(['.N1','.H7','.S8','#player','.xgplayer-controls','.comment-panel'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,[r.x,r.y,r.width,r.height]];})));assert.deepEqual(after,before);
 });
 await page.keyboard.press('Alt+Shift+L');const ui=page.locator('#douyin-ambilight-ui');await ui.getByText('沉浸',{exact:true}).click();
 await check('navigation and controls have independent reversible toggles',async()=>{
  await ui.getByRole('checkbox',{name:'左侧导航融入背景',exact:true}).uncheck();assert.equal(alpha((await read('.N1')).bg),1);assert.equal(alpha((await read('.xgplayer-controls')).bg),0);
  await ui.getByRole('checkbox',{name:'播放器控制区融入背景',exact:true}).uncheck();assert.equal(alpha((await read('.xgplayer-controls')).bg),1);assert.match(await page.locator('.xgplayer-controls').evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/gradient/);
  await ui.getByRole('checkbox',{name:'左侧导航融入背景',exact:true}).check();await ui.getByRole('checkbox',{name:'播放器控制区融入背景',exact:true}).check();
 });
 await check('replaced inner control surface is styled again without a page reload',async()=>{
  await page.evaluate(()=>{const old=document.querySelector('.K3'),fresh=old.cloneNode(true);fresh.removeAttribute('style');old.replaceWith(fresh);});await page.waitForFunction(()=>document.querySelector('.K3').style.backgroundColor.includes('color-mix'));assert.equal(alpha((await read('.K3')).bg),0);
 });
 await check('disable restores all roots, nested surfaces and pseudo gradients exactly',async()=>{
  await ui.getByRole('checkbox',{name:'启用环境光',exact:true}).uncheck();
  assert.equal((await read('.N1')).bg,'rgb(16, 17, 20)');assert.equal((await read('.I2')).bg,'rgb(21, 22, 27)');assert.equal((await read('.S8 input')).bg,'rgb(69, 70, 76)');assert.equal((await read('.K3')).bg,'rgb(10, 11, 14)');assert.equal((await read('.input-shell')).bg,'rgb(59, 60, 68)');assert.match(await page.locator('.I2').evaluate(e=>getComputedStyle(e,'::after').backgroundImage),/gradient/);await ui.getByRole('checkbox',{name:'启用环境光',exact:true}).check();
 });
 await ui.getByRole('button',{name:'关闭设置'}).click();await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'全区域融合-0.5.4-本地模拟.png')});
 assert.deepEqual(errors,[]);await writeFile(path.join(root,'test-results/regions.json'),JSON.stringify({checks,errors},null,2));console.log(`${checks.length} full-region checks passed`);
}finally{await browser.close();}
