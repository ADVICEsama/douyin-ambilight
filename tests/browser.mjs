import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = process.env.DA_OUTPUT ? path.resolve(process.env.DA_OUTPUT) : path.resolve(root, '../../outputs');
const results = path.join(root, 'test-results'); await mkdir(results, { recursive: true });
let exe = process.env.DA_CHROMIUM;
if (!exe) {
  const fallback = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
  try { await access(chromium.executablePath()); } catch { try { await access(fallback); exe = fallback; } catch { /* Playwright reports installation instructions. */ } }
}
const context = await chromium.launchPersistentContext(path.join(results, 'profile'), {
  executablePath: exe, headless: true, channel: 'chromium', viewport: { width: 1280, height: 850 },
  args: [`--disable-extensions-except=${path.join(out, 'douyin-ambilight/chrome')}`, `--load-extension=${path.join(out, 'douyin-ambilight/chrome')}`, '--autoplay-policy=no-user-gesture-required']
});
import { fixture } from './fixture.mjs';
await context.route('https://www.douyin.com/__ambilight_test__', route => route.fulfill({ body: fixture, contentType: 'text/html' }));
const page = context.pages()[0] || await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
const state = () => page.locator('#douyin-ambilight-layer').getAttribute('data-state');
const layerVisible = () => page.locator('#douyin-ambilight-layer').isVisible();
try {
  await page.goto('https://www.douyin.com/__ambilight_test__');
  await page.waitForFunction(() => window.ready);
  await page.waitForSelector('#douyin-ambilight-ui');
  await page.keyboard.press('Alt+Shift+L');
  await page.locator('#douyin-ambilight-ui').getByRole('button',{name:'恢复默认设置'}).click();
  await page.locator('#douyin-ambilight-ui').getByRole('button',{name:'关闭设置'}).click();
  await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer')?.dataset.state?.includes('环境光运行中'));
  const shadow = page.locator('#douyin-ambilight-ui');
  await check('real Chromium extension loads and selects main portrait over hidden/preload/mini video', async () => {
    assert.match(await state(), /240 × 426/); assert.ok(await layerVisible());
  });
  await check('pause retains ambient light', async () => { await page.evaluate(() => document.querySelector('#main').pause()); await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer').dataset.state.includes('已暂停')); assert.ok(await layerVisible()); });
  await page.screenshot({ path: path.join(results, 'on.png') });
  await check('shortcut disables and removes glow', async () => { await page.keyboard.press('Alt+Shift+A'); assert.equal(await layerVisible(), false); assert.equal(await state(), '环境光已关闭'); });
  await page.screenshot({ path: path.join(results, 'off.png') });
  await check('pixel comparison: video unchanged, surrounding light visible', async () => {
    const on = PNG.sync.read(await readFile(path.join(results, 'on.png'))), off = PNG.sync.read(await readFile(path.join(results, 'off.png')));
    let videoDiff = 0, surroundDiff = 0, videoN = 0, surroundN = 0;
    for (let y=130;y<720;y++) for(let x=230;x<990;x++) {
      let delta=0;for(let c=0;c<3;c++)delta+=Math.abs(on.data[(y*on.width+x)*4+c]-off.data[(y*off.width+x)*4+c]);
      if(x>450&&x<770){videoDiff+=delta;videoN+=3;}else if(x<410||x>810){surroundDiff+=delta;surroundN+=3;}
    }
    assert.ok(videoDiff/videoN < .5, `video diff ${videoDiff/videoN}`); assert.ok(surroundDiff/surroundN > 5, `surround diff ${surroundDiff/surroundN}`);
  });
  await page.keyboard.press('Alt+Shift+A');
  await check('panel controls immediately update and persist across reload', async () => {
    await shadow.getByRole('button', { name: '打开抖音环境光设置' }).click();
    await shadow.getByRole('slider', { name: '光线强度' }).fill('83');
    await shadow.getByText('质量与性能', { exact: true }).click();
    await shadow.getByRole('combobox', { name: '渲染帧率' }).selectOption('12');
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('#douyin-ambilight-layer').style.opacity)-0.83*.82)<1e-6);
    await page.waitForTimeout(300); await page.reload(); await page.waitForFunction(() => window.ready);
    await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer') && Math.abs(Number(document.querySelector('#douyin-ambilight-layer').style.opacity)-0.83*.82)<1e-6);
    assert.match(await state(), /12 FPS/);
  });
  await check('hiding button keeps keyboard settings recovery', async () => {
    await page.keyboard.press('Alt+Shift+L');
    await shadow.getByText('基本设置', { exact: true }).click();
    await shadow.getByRole('checkbox', { name: '显示页面悬浮按钮' }).uncheck();
    assert.equal(await shadow.getByRole('button', { name: '打开抖音环境光设置' }).isVisible(), false);
    await shadow.getByRole('button', { name: '关闭设置' }).click(); await page.keyboard.press('Alt+Shift+L');
    assert.ok(await shadow.getByRole('heading', { name: '抖音环境光' }).isVisible());
    await shadow.getByRole('checkbox', { name: '显示页面悬浮按钮' }).check();
  });
  await check('input focus does not trigger playback shortcut', async () => {
    await shadow.getByRole('slider', { name: '光线强度' }).focus(); await page.keyboard.press('Alt+Shift+A'); assert.ok(await layerVisible());
    await shadow.getByRole('button', { name: '关闭设置' }).click();
  });
  await check('video DOM replacement and landscape switching', async () => {
    await page.evaluate(async () => { const old=document.querySelector('#main'); const v=document.createElement('video');v.id='main';v.muted=true;old.replaceWith(v); await makeVideo('main',['#ff6600','#ffd700'],true); });
    await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer').dataset.state.includes('640 × 360'));
    assert.ok(await layerVisible());
  });
  await check('resize recomputes alignment', async () => {
    const old=await page.locator('#douyin-ambilight-layer').evaluate(el=>el.style.clipPath);
    await page.setViewportSize({width:1120,height:800});
    await page.waitForFunction(old => document.querySelector('#douyin-ambilight-layer').style.clipPath !== old, old);
    await page.setViewportSize({width:1280,height:850});
  });
  await check('fullscreen container reparenting and return', async () => {
    await page.locator('#player').evaluate(el=>el.requestFullscreen());
    await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer').parentElement === document.fullscreenElement);
    assert.ok(await layerVisible()); await page.evaluate(()=>document.exitFullscreen());
    await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer').parentElement === document.body);
  });
  await check('native video fullscreen explicitly disables overlay', async () => {
    await page.locator('#main').evaluate(el=>el.requestFullscreen());
    await page.waitForFunction(() => document.querySelector('#douyin-ambilight-layer').dataset.state.includes('原生视频全屏'));
    assert.equal(await layerVisible(), false); await page.evaluate(()=>document.exitFullscreen());
  });
  await check('offscreen/removed videos leave no stale glow', async () => {
    await page.evaluate(() => { for(const v of document.querySelectorAll('video'))v.remove(); });
    await page.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.state.includes('等待可见'));
    assert.equal(await layerVisible(), false);
  });
  // Validate the bundled userscript as well, using a mock of manager GM storage (not a manager installation claim).
  const user = await context.newPage();
  await user.addInitScript(() => {
    window.GM_getValue=(_k, fallback)=>JSON.parse(localStorage.getItem('test-settings')||'null')||fallback;
    window.GM_setValue=(_k,v)=>localStorage.setItem('test-settings',JSON.stringify(v));
    window.GM_addValueChangeListener=()=>{};window.GM_registerMenuCommand=()=>{};
  });
  // Different host intentionally avoids extension duplication; content is local and fully controlled.
  await context.route('http://localhost:54329/fixture', r=>r.fulfill({body:fixture,contentType:'text/html'}));
  await user.goto('http://localhost:54329/fixture');
  await user.addScriptTag({content:await readFile(path.join(out,'douyin-ambilight-0.5.3.user.js'),'utf8')});
  await check('userscript bundle renders with GM adapter',async()=>{
    await user.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer')?.dataset.state.includes('环境光运行中'));
    await user.keyboard.press('Alt+Shift+L');
    await user.locator('#douyin-ambilight-ui').getByRole('slider',{name:'光线强度'}).fill('81');
    await user.waitForFunction(()=>JSON.parse(localStorage.getItem('test-settings')||'{}').intensity===81);
  });
  await user.locator('#douyin-ambilight-ui').getByRole('button',{name:'关闭设置'}).click();
  await user.evaluate(()=>document.querySelector('#main').pause());
  await user.screenshot({path:path.join(out,'环境光预览-本地测试.png')});
  await user.keyboard.press('Alt+Shift+L');
  await user.screenshot({path:path.join(out,'设置面板-本地测试.png')});
  await check('cross-origin canvas taint does not break ambient rendering',async()=>{
    const webm=await user.evaluate(async()=>{
      const v=document.querySelector('#main'); await v.play();
      const recorder=new MediaRecorder(v.srcObject,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
      recorder.ondataavailable=e=>chunks.push(e.data);
      const done=new Promise(resolve=>{recorder.onstop=resolve;});recorder.start();
      await new Promise(resolve=>setTimeout(resolve,500));recorder.stop();await done;
      return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];
    });
    await context.route('http://127.0.0.1:54330/clip.webm',r=>r.fulfill({body:Buffer.from(webm),contentType:'video/webm'}));
    await user.evaluate(async()=>{
      const v=document.querySelector('#main');v.srcObject=null;v.src='http://127.0.0.1:54330/clip.webm';v.loop=true;await v.play();
    });
    await user.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.state.includes('环境光运行中'));
    await user.waitForTimeout(300);
    assert.equal(await user.evaluate(()=>getComputedStyle(document.querySelector('#douyin-ambilight-layer')).display==='none'),false);
    const tainted=await user.evaluate(()=>{try{document.querySelector('#douyin-ambilight-layer canvas').getContext('2d').getImageData(0,0,1,1);return false;}catch(e){return e.name==='SecurityError';}});
    assert.ok(tainted,'test media should taint the output canvas without any frame-readback in production');
    await user.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.diagnostics.includes('跨域像素受限'));
    await user.locator('#douyin-ambilight-ui').getByText('质量与性能',{exact:true}).click();
    await user.locator('#douyin-ambilight-ui').getByRole('combobox',{name:'渲染器',exact:true}).selectOption('webgl');
    await user.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').dataset.diagnostics.includes('WebGL 无法访问跨域帧'));
    await user.waitForFunction(()=>document.querySelector('#douyin-ambilight-layer').style.display==='block');
    assert.equal(await user.locator('#douyin-ambilight-layer canvas').first().evaluate(e=>!!e.getContext('2d')),true);
  });
  await check('no page runtime errors',async()=>assert.deepEqual(errors,[]));
  await writeFile(path.join(results,'browser.json'),JSON.stringify({checks,errors},null,2));
  console.log(`${checks.length} browser checks passed`);
} finally { await context.close(); }

