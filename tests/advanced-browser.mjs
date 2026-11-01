import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.DA_OUTPUT?path.resolve(process.env.DA_OUTPUT):path.resolve(root,'../../outputs');
const context=await chromium.launch({headless:true,executablePath:process.env.DA_CHROMIUM||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),args:['--autoplay-policy=no-user-gesture-required']});
const page=await context.newPage({viewport:{width:1360,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:54329/advanced',r=>r.fulfill({body:fixture,contentType:'text/html'}));
await page.addInitScript(()=>{window.GM_getValue=(_k,f)=>JSON.parse(localStorage.getItem('settings')||'null')||f;window.GM_setValue=(_k,v)=>localStorage.setItem('settings',JSON.stringify(v));window.GM_addValueChangeListener=()=>{};window.GM_registerMenuCommand=()=>{};});
async function check(name,fn){await fn();checks.push(name);console.log(`PASS ${name}`);}
try{
 await page.goto('http://localhost:54329/advanced');await page.waitForFunction(()=>window.ready);
 await page.addScriptTag({content:await readFile(path.join(out,'douyin-ambilight-0.4.0.user.js'),'utf8')});
 await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer')?.dataset.state.includes('环境光运行中'));
 const ui=page.locator('#douyin-ambilight-ui');await page.keyboard.press('Alt+Shift+L');
 await check('known native background hidden, main video retained',async()=>{
   assert.equal(await page.locator('.xgplayer-dynamic-bg').evaluate(e=>getComputedStyle(e).visibility),'hidden');
   assert.equal(await page.locator('#main').evaluate(e=>getComputedStyle(e).visibility),'visible');
   assert.match(await page.locator('#douyin-ambilight-layer').getAttribute('data-diagnostics'),/已隐藏 [1-9]/);
 });
 await check('native hide option reversibly restores original visibility',async()=>{
   await ui.getByRole('checkbox',{name:'隐藏抖音自带模糊背景'}).uncheck();
   assert.equal(await page.locator('.xgplayer-dynamic-bg').evaluate(e=>e.style.visibility),'visible');
   await ui.getByRole('checkbox',{name:'隐藏抖音自带模糊背景'}).check();
   assert.equal(await page.locator('.xgplayer-dynamic-bg').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 });
 await check('unknown large blurred background found without hiding controls or small blur',async()=>{
   await page.evaluate(()=>{
     const root=document.querySelector('#player');for(const [id,size,controls]of [['custom-bg',600,false],['small-avatar',24,false],['blur-controls',600,true]]){const n=document.createElement('div');n.id=id;n.style.cssText=`position:absolute;left:0;top:0;width:${size}px;height:${size}px;filter:blur(24px);background-image:linear-gradient(red,blue)`;if(controls)n.append(document.createElement('button'));root.prepend(n);}
   });
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#custom-bg')).visibility==='hidden');
   assert.equal(await page.locator('#small-avatar').evaluate(e=>getComputedStyle(e).visibility),'visible');assert.equal(await page.locator('#blur-controls').evaluate(e=>getComputedStyle(e).visibility),'visible');
   await page.evaluate(()=>{for(const id of ['custom-bg','small-avatar','blur-controls'])document.getElementById(id).remove();});
 });
 await check('color, shape, blend and quality settings affect renderer',async()=>{
   await ui.getByText('滤镜',{exact:true}).click();await ui.getByText('页面内容',{exact:true}).click();
   await ui.getByRole('slider',{name:'光效亮度'}).fill('130');await ui.getByRole('slider',{name:'光效对比度'}).fill('120');await ui.getByRole('slider',{name:'色相偏移'}).fill('30');
   await ui.getByRole('slider',{name:'横向延展'}).fill('160');await ui.getByRole('slider',{name:'周围页面压暗'}).fill('30');
   await ui.getByRole('combobox',{name:'混合方式'}).selectOption('normal');
   await ui.getByText('质量与性能',{exact:true}).click();await ui.getByRole('combobox',{name:'取样分辨率'}).selectOption('160');
   await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer canvas').height===160);
   const filter=await page.locator('#douyin-ambilight-layer canvas').first().evaluate(e=>e.style.filter);assert.match(filter,/brightness\(130%\)/);assert.match(filter,/hue-rotate\(30deg\)/);
   assert.equal(await page.locator('#douyin-ambilight-layer').evaluate(e=>e.style.mixBlendMode),'normal');assert.equal(await page.locator('#douyin-ambilight-dimmer').evaluate(e=>e.style.opacity),'0.3');
 });
 await check('presets apply working settings and JSON export/import roundtrip',async()=>{
   await ui.getByRole('combobox',{name:'光效预设'}).selectOption('eco');
   assert.equal(await ui.getByRole('combobox',{name:'渲染帧率'}).inputValue(),'12');
   const download=page.waitForEvent('download');await ui.getByRole('button',{name:'导出 JSON'}).click();const d=await download;const parsed=JSON.parse(await readFile(await d.path(),'utf8'));assert.equal(parsed.settings.fps,12);
   await ui.locator('input[type=file]').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({settings:{intensity:88,autoH:false,autoV:false,showButton:true,hideNative:true}}))});
   await page.waitForFunction(()=>Math.abs(Number(document.querySelector('#douyin-ambilight-layer').style.opacity)-0.88*.82)<1e-6);
 });
 await check('automatic black bars stabilize on real synthetic video frames',async()=>{
   await page.evaluate(async()=>{
     const v=document.querySelector('#main'),c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');
     function paint(){x.fillStyle='#000';x.fillRect(0,0,640,360);const g=x.createLinearGradient(64,36,576,324);g.addColorStop(0,'#06baff');g.addColorStop(1,'#fc3060');x.fillStyle=g;x.fillRect(64,36,512,288);}
     paint();setInterval(paint,40);v.srcObject=c.captureStream(24);v.style.transform='rotate(0deg)';v.style.scale='1';v.style.clipPath='inset(0px)';await v.play();
   });
   await ui.getByText('移除黑边与彩色边',{exact:true}).click();await ui.getByRole('checkbox',{name:'同时裁剪原视频画面'}).uncheck();await ui.getByRole('checkbox',{name:'移除播放器留白（不裁原画内容）'}).uncheck();
   await ui.getByRole('checkbox',{name:'自动检测上下黑边'}).check();await ui.getByRole('checkbox',{name:'自动检测左右黑边'}).check();
   await ui.getByRole('slider',{name:'稳定样本数'}).fill('2');await ui.getByRole('combobox',{name:'检测间隔'}).selectOption('250');
   await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.diagnostics.includes('检测成功'));
   const diag=await page.locator('#douyin-ambilight-layer').getAttribute('data-diagnostics');assert.match(diag,/上 (9|10)\./);assert.match(diag,/左 (9|10)\./);
   assert.equal(await page.locator('#main').evaluate(e=>e.style.clipPath),'inset(0px)'); // light-only default.
   const pixel=await page.locator('#douyin-ambilight-layer canvas').first().evaluate(e=>[...e.getContext('2d').getImageData(2,2,1,1).data]);assert.ok(Math.max(...pixel.slice(0,3))>40,'black source border excluded from light');
 });
 await check('manual crop, optional video clipping and zoom preserve site transform',async()=>{
   await ui.getByText('视频',{exact:true}).click();
   await ui.getByRole('slider',{name:'手动裁上边'}).fill('5');await ui.getByRole('checkbox',{name:'同时裁剪原视频画面'}).check();
   await page.waitForFunction(()=>document.querySelector('#main').style.clipPath!=='inset(0px)');
   await ui.getByRole('slider',{name:'原视频缩放'}).fill('120');
   assert.equal(await page.locator('#main').evaluate(e=>e.style.scale),'1.2');assert.equal(await page.locator('#main').evaluate(e=>e.style.transform),'rotate(0deg)');
 });
 await check('disabling restores native background and exact original clip/scale',async()=>{
   await ui.getByRole('checkbox',{name:'启用环境光',exact:true}).uncheck();
   assert.equal(await page.locator('#main').evaluate(e=>e.style.clipPath),'inset(0px)');assert.equal(await page.locator('#main').evaluate(e=>e.style.scale),'1');
   assert.equal(await page.locator('.xgplayer-dynamic-bg').evaluate(e=>e.style.visibility),'visible');
   assert.equal(await page.locator('#douyin-ambilight-dimmer').isVisible(),false);
   await ui.getByRole('checkbox',{name:'启用环境光',exact:true}).check();
 });
 await check('fill-after-crop actually zooms the cropped image',async()=>{
   await ui.getByRole('checkbox',{name:'放大填满裁边后的空间'}).check();
   const scale=await page.locator('#main').evaluate(e=>Number(e.style.scale));assert.ok(scale>1.2);
   await ui.getByRole('checkbox',{name:'放大填满裁边后的空间'}).uncheck();
 });
 await check('direction toggles change mask',async()=>{
   const before=await page.locator('#douyin-ambilight-layer').evaluate(e=>e.style.clipPath);
   await ui.getByRole('checkbox',{name:'左侧发光'}).uncheck();await page.waitForFunction(before=>document.querySelector('#douyin-ambilight-layer').style.clipPath!==before,before);
 });
 await ui.getByRole('button',{name:'恢复默认设置'}).click();await page.evaluate(()=>document.querySelector('#main').pause());
 await page.locator('#douyin-ambilight-ui').evaluate(el=>{for(const d of el.shadowRoot.querySelectorAll('details'))d.open=false;el.shadowRoot.querySelector('.panel').scrollTop=0;});
 await page.screenshot({path:path.join(out,'设置面板-0.4.0-本地测试.png')});
 await ui.getByText('移除黑边与彩色边',{exact:true}).click();await ui.getByText('移除黑边与彩色边',{exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(out,'黑边设置-0.4.0-本地测试.png')});
 await check('no advanced runtime errors',async()=>assert.deepEqual(errors,[]));
 await mkdir(path.join(root,'test-results'),{recursive:true});await writeFile(path.join(root,'test-results/advanced.json'),JSON.stringify({checks,errors},null,2));console.log(`${checks.length} advanced browser checks passed`);
}finally{await context.close();}
