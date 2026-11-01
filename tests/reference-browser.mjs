import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.DA_OUTPUT?path.resolve(process.env.DA_OUTPUT):path.resolve(root,'../../outputs');
const browser=await chromium.launch({headless:true,executablePath:process.env.DA_CHROMIUM||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),args:['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:54329/reference',r=>r.fulfill({body:fixture,contentType:'text/html'}));
await page.addInitScript(()=>{window.GM_getValue=(_k,f)=>f;window.GM_setValue=()=>{};window.GM_addValueChangeListener=()=>{};window.GM_registerMenuCommand=()=>{};});
async function check(name,fn){await fn();checks.push(name);console.log(`PASS ${name}`);}
try{
 await page.goto('http://localhost:54329/reference');await page.waitForFunction(()=>window.ready);
 await page.evaluate(()=>{
  const header=document.querySelector('header');header.id='site-header';header.style.backgroundColor='rgb(48, 48, 56)';header.insertAdjacentHTML('beforeend','<img id="head-image" alt="test" style="opacity:.8;width:24px;height:24px">');
  const side=document.createElement('div');side.id='comments';side.className='comment-panel';side.style.cssText='position:absolute;left:1070px;top:120px;width:300px;height:400px;background-color:rgb(50,50,60)';
  side.insertAdjacentHTML('beforeend','<img id="comment-image" alt="test" style="width:30px;height:30px"><div data-e2e="comment-input" id="comment-input" style="background:rgb(70,70,80)"><textarea placeholder="留下你的评论" style="background:rgb(80,80,90)"></textarea></div>');document.body.append(side);
  for(const image of [document.querySelector('#head-image'),document.querySelector('#comment-image')])image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="15" cy="15" r="12" fill="#55dded"/></svg>');
 });
 await page.addScriptTag({content:await readFile(path.join(out,'douyin-ambilight-0.4.0.user.js'),'utf8')});
 await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer')?.dataset.state.includes('环境光运行中'));
 const ui=page.locator('#douyin-ambilight-ui');await page.keyboard.press('Alt+Shift+L');
 await check('all eleven reference categories exist; controls are backed by validated settings',async()=>{
   const data=await ui.evaluate(e=>({sections:[...e.shadowRoot.querySelectorAll('summary')].map(s=>s.textContent),keys:[...e.shadowRoot.querySelectorAll('[data-key]')].map(s=>s.dataset.key)}));
   assert.deepEqual(data.sections,['设置','质量与性能','顶栏','页面内容','视频','移除黑边与彩色边','滤镜','环境光','沉浸','显示模式','基本设置']);
   assert.ok(data.keys.length>=80);const known=await page.evaluate(()=>Object.keys(DACore.defaults));assert.ok(data.keys.every(k=>k==='preset'||known.includes(k)));
   await writeFile(path.join(root,'test-results/menu.json'),JSON.stringify(data,null,2));
 });
 await ui.evaluate(e=>{for(const d of e.shadowRoot.querySelectorAll('details'))d.open=true;});
 await check('header shadow, fill and image opacity apply and restore',async()=>{
   await ui.getByRole('slider',{name:'顶栏阴影大小'}).fill('20');await ui.getByRole('slider',{name:'顶栏阴影不透明度'}).fill('60');await ui.getByRole('slider',{name:'顶栏背景不透明度'}).fill('50');await ui.getByRole('slider',{name:'顶栏图片不透明度'}).fill('40');
   assert.equal(await page.locator('#head-image').evaluate(e=>e.style.opacity),'0.4');assert.match(await page.locator('#site-header').evaluate(e=>e.style.boxShadow),/20px/);assert.match(await page.locator('#site-header').evaluate(e=>e.style.backgroundColor),/color-mix/);
 });
 await check('content shadows, image opacity, page background and scrollbar controls work',async()=>{
   await ui.getByRole('slider',{name:'内容阴影大小'}).fill('15');await ui.getByRole('slider',{name:'内容阴影不透明度'}).fill('70');await ui.getByRole('slider',{name:'内容图片不透明度'}).fill('60');
   await ui.getByRole('checkbox',{name:'自定义页面底色'}).check();await ui.getByRole('slider',{name:'页面底色灰度'}).fill('20');await ui.getByRole('checkbox',{name:'隐藏页面滚动条'}).check();
   assert.equal(await page.locator('#comment-image').evaluate(e=>e.style.opacity),'0.6');assert.match(await page.locator('#comments').evaluate(e=>e.style.textShadow),/15px/);assert.equal(await page.locator('body').evaluate(e=>e.style.backgroundColor),'rgb(51, 51, 51)');assert.equal(await page.locator('html').evaluate(e=>e.style.scrollbarWidth),'none');
 });
 await check('immersion targets are transparent without hiding main video',async()=>{
   for(const name of ['顶栏与搜索框融入背景','侧栏融入背景','视频信息与评论区融入背景','弹幕和评论输入区融入背景'])await ui.getByRole('checkbox',{name,exact:true}).check();
   assert.match(await page.locator('#comments').evaluate(e=>e.style.backgroundColor),/0%/);assert.match(await page.locator('#comment-input textarea').evaluate(e=>e.style.backgroundColor),/0%/);assert.equal(await page.locator('#main').evaluate(e=>getComputedStyle(e).visibility),'visible');
 });
 await check('video filter target and shadows are real CSS effects',async()=>{
   await ui.getByRole('combobox',{name:'滤镜作用对象'}).selectOption('both');await ui.getByRole('slider',{name:'光效亮度'}).fill('120');await ui.getByRole('slider',{name:'视频阴影大小',exact:true}).fill('18');await ui.getByRole('slider',{name:'视频阴影不透明度'}).fill('50');
   const f=await page.locator('#main').evaluate(e=>e.style.filter);assert.match(f,/brightness\(120%\)/);assert.match(await page.locator('#douyin-ambilight-video-shadow').evaluate(e=>e.style.boxShadow),/18px/);assert.ok(await page.locator('#douyin-ambilight-video-shadow').isVisible());
 });
 await check('ambient fade masks and static dithering are enabled by their controls',async()=>{
   await ui.getByRole('slider',{name:'扩散淡出起点'}).fill('50');await ui.getByRole('slider',{name:'淡出曲线'}).fill('3');await ui.getByRole('slider',{name:'去色带（静态噪声）'}).fill('40');
   assert.match(await page.locator('#douyin-ambilight-layer canvas').first().evaluate(e=>e.style.maskImage),/radial-gradient/);assert.equal(await page.locator('#douyin-ambilight-layer canvas.da-noise').evaluate(e=>e.style.opacity),'0.072');
 });
 await check('WebGL renderer truly draws and can switch back to Canvas2D',async()=>{
   await ui.getByRole('combobox',{name:'渲染器',exact:true}).selectOption('webgl');
   await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.diagnostics.includes('渲染器：WebGL2'));
   assert.equal(await page.locator('#douyin-ambilight-layer canvas').first().evaluate(e=>!!e.getContext('webgl2')),true);
   await ui.getByRole('combobox',{name:'渲染器',exact:true}).selectOption('canvas');await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.diagnostics.includes('渲染器：Canvas2D'));
   assert.equal(await page.locator('#douyin-ambilight-layer canvas').first().evaluate(e=>!!e.getContext('2d')),true);
 });
 await check('real stats overlay updates and both alternate schedulers render',async()=>{
   for(const name of ['显示实测帧率','显示帧间隔图','显示绘制分辨率与耗时','显示黑边统计'])await ui.getByRole('checkbox',{name,exact:true}).check();
   await ui.getByRole('combobox',{name:'同步方式'}).selectOption('display');await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-ui').shadowRoot.querySelector('.stats').textContent.includes('实测'));
   await ui.getByRole('combobox',{name:'同步方式'}).selectOption('timer');assert.ok(await page.locator('#douyin-ambilight-layer').isVisible());
 });
 await check('display mode toggles and per-mode zoom restore correctly',async()=>{
   await ui.getByRole('checkbox',{name:'普通模式启用'}).uncheck();assert.equal(await page.locator('#douyin-ambilight-layer').isVisible(),false);assert.equal(await page.locator('#head-image').evaluate(e=>e.style.opacity),'0.8');
   await ui.getByRole('checkbox',{name:'普通模式启用'}).check();await ui.getByRole('slider',{name:'视频缩放（网页全屏）'}).fill('130');
   await page.locator('#player').evaluate(e=>e.classList.add('xgplayer-is-cssfullscreen'));
   await page.waitForFunction(()=>document.querySelector('#main').style.scale==='1.3');
   await page.locator('#player').evaluate(e=>e.classList.remove('xgplayer-is-cssfullscreen'));
   await page.waitForFunction(()=>document.querySelector('#main').style.scale==='');
 });
 await check('panel theme, configurable shortcuts and paused behavior work',async()=>{
   await ui.getByRole('combobox',{name:'设置面板主题'}).selectOption('light');assert.equal(await ui.getAttribute('data-theme'),'light');
   await ui.getByRole('combobox',{name:'开关快捷键'}).selectOption('G');await ui.getByRole('button',{name:'关闭设置'}).click();await page.keyboard.press('Alt+Shift+G');assert.equal(await page.locator('#douyin-ambilight-layer').isVisible(),false);await page.keyboard.press('Alt+Shift+G');
   await page.keyboard.press('Alt+Shift+L');await ui.getByRole('checkbox',{name:'暂停时保留光效'}).uncheck();await page.evaluate(()=>document.querySelector('#main').pause());await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').style.display==='none');
 });
 await ui.getByRole('button',{name:'恢复默认设置'}).click();await page.evaluate(()=>document.querySelector('#main').play());
 await check('all page-level modifications restored after disabling',async()=>{
   await ui.getByRole('checkbox',{name:'启用环境光',exact:true}).uncheck();assert.equal(await page.locator('#head-image').evaluate(e=>e.style.opacity),'0.8');assert.equal(await page.locator('body').evaluate(e=>e.style.backgroundColor),'');assert.equal(await page.locator('html').evaluate(e=>e.style.scrollbarWidth),'');assert.equal(await page.locator('#main').evaluate(e=>e.style.filter),'');await ui.getByRole('checkbox',{name:'启用环境光',exact:true}).check();
 });
 await ui.evaluate(e=>{for(const d of e.shadowRoot.querySelectorAll('details'))d.open=false;e.shadowRoot.querySelector('.panel').scrollTop=0;});
 await page.screenshot({path:path.join(out,'完整分类-0.4.0-本地测试.png')});
 assert.deepEqual(errors,[]);await writeFile(path.join(root,'test-results/reference.json'),JSON.stringify({checks,errors},null,2));console.log(`${checks.length} reference category checks passed`);
}finally{await browser.close();}
