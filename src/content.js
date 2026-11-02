(() => {
  'use strict';
  if (window.top !== window || document.getElementById('douyin-ambilight-ui')) return;
  const C = DACore;
  const native = new DANative.NativeBackground(), videoStyles = new DANative.StyleLedger(), clipStyles = new DANative.StyleLedger(), filterStyles = new DANative.StyleLedger(), pageStyler = new DAPage.PageStyler();
  let nativeCount = 0, baseScale = 'none', crop = C.emptyCrop(), barState = { crop: C.emptyCrop(), pending: null, count: 0 };
  let detection = '等待检测', sampleBlocked = false, lastSample = -Infinity, sampleInfo='尚未取样', geometryInfo='等待布局';
  const sample = document.createElement('canvas');
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  let settings = { ...C.defaults }, active = null, source = '', sourceTime = 0;
  let frameHandle = 0, frameVideo = null, raf = 0, timer = 0, scanTimer = 0, disposed = false;
  let baseFilter = 'none', rendererNote = '', glBlocked = false, fpsStart = performance.now(), frameCount = 0, actualFPS = 0, drawTime = 0, frameTimes = [];
  let lastDraw = 0, nextCapture = 0, dirty = true, lastLayout = '', lastMediaTime = -1, mediaState = '等待视频播放…';
  const lifetime = new AbortController();
  const listen = (target, name, fn, options = {}) => target.addEventListener(name, fn, { ...options, signal: lifetime.signal });
  const layer = document.createElement('div'); layer.id = 'douyin-ambilight-layer'; layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'all:initial;position:fixed;inset:0;display:block;overflow:hidden;pointer-events:none;z-index:-3;contain:strict;';
  let canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
  canvas.style.cssText = 'position:absolute;pointer-events:none;transform:none;opacity:0;'; layer.append(canvas);
  let renderer = new DARenderer.Renderer(canvas);
  const projector = new DAProjector.Projector(layer);
  const noise = document.createElement('canvas');noise.width = noise.height = 128;noise.className='da-noise';noise.style.cssText = 'position:absolute;pointer-events:none;mix-blend-mode:soft-light;';layer.append(noise);
  {const ctx=noise.getContext('2d'),data=ctx.createImageData(128,128);for(let i=0;i<data.data.length;i+=4){const value=Math.round(Math.random()*255);data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;}ctx.putImageData(data,0,0);}
  function chooseRenderer(forceCanvas = false) {
    const desired = forceCanvas || glBlocked ? 'canvas' : settings.renderer;
    if(renderer.mode === desired)return;
    const old=canvas, fresh=document.createElement('canvas');fresh.style.cssText=old.style.cssText;fresh.width=old.width;fresh.height=old.height;renderer.destroy();
    renderer=new DARenderer.Renderer(fresh,desired);if(renderer.mode!==desired)glBlocked=true;canvas=renderer.canvas;canvas.style.cssText=old.style.cssText;old.replaceWith(canvas);rendererNote=renderer.reason;lastLayout='';dirty=true;
  }
  function currentMode() {return DAPage.mode(active);}
  function allowedHere() {return settings.enabled&&settings[({normal:'enableNormal',theater:'enableTheater',fullscreen:'enableFullscreen'})[currentMode()]];}
  const dimmer = document.createElement('div'); dimmer.id = 'douyin-ambilight-dimmer'; dimmer.setAttribute('aria-hidden', 'true');
  dimmer.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;background:#000;z-index:-2;display:none;';
  const shadow = document.createElement('div');shadow.id='douyin-ambilight-video-shadow';shadow.setAttribute('aria-hidden','true');shadow.style.cssText='all:initial;position:fixed;pointer-events:none;z-index:-1;display:none;background:transparent;';
  function hideLayer() {layer.hidden = true;layer.style.display = 'none';dimmer.style.display = 'none';shadow.style.display='none';projector.stop();}
  function showLayer() {layer.hidden = false;layer.style.display = 'block';dimmer.style.display = settings.dim ? 'block' : 'none';shadow.style.display=settings.videoShadow&&settings.videoShadowOpacity?'block':'none';}
  hideLayer();
  const uiHost = document.createElement('div'); uiHost.id = 'douyin-ambilight-ui';
  uiHost.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483001;';
  const ui = DAUI.create(uiHost, settings, patch => {
    apply({ ...settings, ...patch });
    queueSave();
  });
  let saveTimer = 0, writeQueue = Promise.resolve();
  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const snapshot = { ...settings };
      writeQueue = writeQueue.catch(() => {}).then(() => DAPlatform.set(snapshot)).catch(() => ui.status('设置保存失败，请重新载入扩展后刷新网页。'));
    }, 160);
  }
  function setStatus(text) { ui.status(text); layer.dataset.state = text; }
  function diagnostics() {
    const nativeText = !settings.hideNative ? '保留网站模糊背景' : `已隐藏 ${nativeCount} 个网站背景层`;
    const cropText = Object.entries(crop).map(([k,v]) => `${({top:'上',bottom:'下',left:'左',right:'右'})[k]} ${(v*100).toFixed(1)}%`).join(' / ');
    const regions=pageStyler.found;
    const text = `${nativeText}\n视频源：${active?.videoWidth||0} × ${active?.videoHeight||0} · 取样 ${sampleInfo} · 单边上限 ${settings.maxCrop}%\n编码黑边：${detection}\n当前取样裁边：${cropText}${settings.cropVideo ? '\n原视频裁剪已开启（注意字幕）' : '\n编码裁边仅影响环境光'}\n播放器留白：${settings.removeLetterbox?'几何裁剪已启用（不裁原画内容）':'保留'}\nCSS 几何留白：${geometryInfo}\n合成：三层背景投影 / 独立视频背影\n渲染器：${renderer.mode==='webgl'?'WebGL2':'Canvas2D'} · 模式：${currentMode()}${rendererNote?'\n'+rendererNote:''}\n页面定位：顶栏 ${regions.header} / 左导航 ${regions.navigation} / 搜索 ${regions.search}\n评论推荐 ${regions.side} / 内容 ${regions.content} / 输入区 ${regions.sending} / 控制区 ${regions.controls}\n页面底板 ${regions.shell} / 已处理布局背景：${regions.surfaces} 层`;
    ui.diagnostics(text); layer.dataset.diagnostics = text;
  }
  function resetDetection() {
    barState = { crop: C.emptyCrop(), pending: null, count: 0 }; crop = C.cropFor(settings, barState.crop);
    sampleBlocked = false; lastSample = -Infinity; sample.width = 256;sampleInfo='尚未取样';geometryInfo='等待布局';
    detection = settings.autoH || settings.autoV ? '等待稳定画面' : '自动检测已关闭';
  }
  function detect(now) {
    if (!(settings.autoH || settings.autoV)) { detection = '自动检测已关闭'; crop = C.cropFor(settings); return; }
    if (sampleBlocked || !sampleCtx || now - lastSample < settings.detectInterval) return;
    lastSample = now;
    if (active.mediaKeys) { detection = '受保护视频，使用手动裁边'; return; }
    try {
      const ratio = active.videoWidth / active.videoHeight;
      const w = Math.max(16, Math.round(ratio >= 1 ? 256 : 256 * ratio)), h = Math.max(16, Math.round(ratio >= 1 ? 256 / ratio : 256));
      if (sample.width !== w || sample.height !== h) { sample.width = w; sample.height = h; }
      sampleCtx.drawImage(active, 0, 0, w, h);
      sampleInfo=`${w} × ${h}`;
      const analysis = C.analyzeBars(sampleCtx.getImageData(0, 0, w, h), settings.threshold, settings.maxCrop, settings),candidate=analysis.crop;
      barState = C.stabilize(barState, analysis.reason==='limit'?null:candidate, settings.stableFrames);
      crop = C.cropFor(settings, barState.crop);
      const stable=barState.count<settings.stableFrames?`稳定确认 ${barState.count}/${settings.stableFrames}`:Object.values(barState.crop).some(v=>v>0)?'检测成功，已应用稳定裁边':'已完成稳定检测，未识别出连续黑边';
      if(analysis.reason==='limit')detection=`${analysis.limited.map(k=>({top:'上',bottom:'下',left:'左',right:'右'})[k]).join('/')}边黑区超过单边 ${settings.maxCrop}% 检测范围，未采用新结果`;
      else if(analysis.reason==='dark')detection='暗场/全黑帧，保留上次结果';
      else if(analysis.reason==='obstructed')detection=`边缘有非黑色内容（可能是字幕/水印），保守处理 · ${stable}`;
      else if(analysis.reason==='asymmetric')detection=`两侧差异超过不对称容差 · ${stable}`;
      else detection=stable;
    } catch (e) {
      sampleBlocked = true; crop = C.cropFor(settings);
      detection = e.name === 'SecurityError' ? '跨域像素受限，自动检测不可用；手动裁边可用' : '当前画面无法检测；手动裁边可用';
    }
    diagnostics();
  }
  function applyVideoScale() {
    if (!active) return;
    const modeScale = currentMode()==='fullscreen'?settings.videoScaleFullscreen:currentMode()==='theater'?settings.videoScaleTheater:settings.videoScale;
    let fill=1;
    if(settings.fillAfterCrop&&settings.cropVideo&&active.videoWidth&&active.videoHeight){const fit=Math.min(active.clientWidth/active.videoWidth,active.clientHeight/active.videoHeight);if(fit>0)fill=Math.min(4,Math.max(active.clientWidth/(active.videoWidth*fit*(1-crop.left-crop.right)),active.clientHeight/(active.videoHeight*fit*(1-crop.top-crop.bottom))));}
    if (!allowedHere() || (modeScale === 100&&fill===1)) { videoStyles.restore(active); return; }
    const tokens = baseScale === 'none' ? ['1'] : baseScale.split(/\s+/);
    const numbers = tokens.map(v => v.endsWith('%') ? parseFloat(v) / 100 : Number(v));
    if (numbers.every(Number.isFinite)) videoStyles.set(active, 'scale', numbers.map(v => v * modeScale / 100 * fill).join(' '));
  }
  function place() {
    // Fullscreen <video> is a replaced element: children cannot be rendered there.
    const fs = document.fullscreenElement;
    const parent = fs && fs.tagName !== 'VIDEO' ? fs : (document.body||document.documentElement);
    if (dimmer.parentNode !== parent) parent.append(dimmer);
    if (layer.parentNode !== parent) parent.append(layer);
    if (shadow.parentNode !== parent) parent.append(shadow);
    if (uiHost.parentNode !== parent) parent.append(uiHost);
  }
  function visibleBox(video) {
    let rect = video.getBoundingClientRect();
    rect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    if (!rect.width || !rect.height) return null;
    if (video.checkVisibility && !video.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return null;
    let visible = C.intersect(rect, { left: 0, top: 0, width: innerWidth, height: innerHeight });
    for (let p = video; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility !== 'visible' || Number(s.opacity) === 0) return null;
      if (p !== video && /(hidden|clip|scroll|auto)/.test(s.overflowX + s.overflowY)) {
        const b = p.getBoundingClientRect();
        const clipX = /(hidden|clip|scroll|auto)/.test(s.overflowX), clipY = /(hidden|clip|scroll|auto)/.test(s.overflowY);
        visible = C.intersect(visible, { left: clipX ? b.left : visible.left, top: clipY ? b.top : visible.top, width: clipX ? b.width : visible.width, height: clipY ? b.height : visible.height });
      }
    }
    return { rect, visible };
  }
  function scan() {
    if (disposed || document.hidden) return;
    if(settings.prioritizeLoad&&document.readyState!=='complete'){setStatus('等待页面载入完成…');return;}
    place();
    let best = null, bestScore = 0;
    const fs = document.fullscreenElement;
    for (const video of document.querySelectorAll('video')) {
      if (video.closest('.xgplayer-dynamic-bg') || /blur\(/.test(getComputedStyle(video).filter)) continue;
      let blurredAncestor=false;for(let p=video.parentElement,n=0;p&&n<4;p=p.parentElement,n++){if(/blur\(/.test(getComputedStyle(p).filter)){blurredAncestor=true;break;}if(p===DANative.playerRoot(video))break;}if(blurredAncestor)continue;
      if (fs && fs !== video && !fs.contains(video)) continue;
      if (video.readyState < 2 || !video.videoWidth || video.ended || video.error || video === document.pictureInPictureElement) continue;
      const box = visibleBox(video); if (!box) continue;
      const score = C.score(box.rect, box.visible, !video.paused);
      if (score > bestScore) { bestScore = score; best = video; }
    }
    if (best !== active) {
      videoStyles.clear(); clipStyles.clear(); filterStyles.clear(); native.clear();
      if(active&&best&&settings.resetCropOnVideo){settings={...settings,cropTop:0,cropBottom:0,cropLeft:0,cropRight:0};ui.update(settings);queueSave();}
      cancelFrame(); active = best; source = ''; sourceTime = 0; lastMediaTime = -1; lastLayout = '';nextCapture=0; dirty = true;
      baseScale = active ? getComputedStyle(active).scale : 'none';baseFilter=active?getComputedStyle(active).filter:'none';resetDetection();applyVideoScale();glBlocked=false;chooseRenderer();renderer.clear();
      hideLayer(); schedule();
    }
    nativeCount = native.update(active, allowedHere() && settings.hideNative);pageStyler.update(active,settings,allowedHere());diagnostics();
    if(!allowedHere()){videoStyles.clear();clipStyles.clear();filterStyles.clear();hideLayer();cancelFrame();}else applyVideoScale();
    if (!active) { hideLayer(); setStatus('等待可见的 HTML5 视频…'); }
    else if (!settings.enabled) setStatus('环境光已关闭');
  }
  function cancelFrame() {
    clearTimeout(timer); timer = 0;
    cancelAnimationFrame(raf);raf=0;
    if (frameHandle && frameVideo) frameVideo.cancelVideoFrameCallback?.(frameHandle);
    frameHandle = 0; frameVideo = null;
  }
  function schedule() {
    if (disposed || !allowedHere() || document.hidden || !active || timer || frameHandle || raf) return;
    if(settings.frameSync==='display'&&!active.paused){raf=requestAnimationFrame(now=>{raf=0;tick(now);});return;}
    if (settings.frameSync==='video'&&!active.paused && active.requestVideoFrameCallback) {
      frameVideo = active;
      frameHandle = active.requestVideoFrameCallback(now => { frameHandle = 0; frameVideo = null; tick(now); });
    } else timer = setTimeout(() => { timer = 0; tick(performance.now()); }, active.paused ? 180 : 1000 / settings.fps);
  }
  function layout() {
    const box = visibleBox(active); if (!box || C.score(box.rect, box.visible, true) === 0) return null;
    const style = getComputedStyle(active);
    const adjustment=`brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) hue-rotate(${settings.hue}deg)`;
    if(settings.filterTarget!=='ambient'){
      filterStyles.set(active,'filter',`${baseFilter==='none'?'':baseFilter+' '}${adjustment}`.trim()||'none');
    }else filterStyles.restore(active);
    const original = C.contentRect(box.rect, active.videoWidth, active.videoHeight, style.objectFit, style.objectPosition);
    const visibleImage=C.intersect(original,box.rect);
    geometryInfo=`上 ${(Math.max(0,visibleImage.top-box.rect.top)/box.rect.height*100).toFixed(1)}% / 下 ${(Math.max(0,box.rect.top+box.rect.height-visibleImage.top-visibleImage.height)/box.rect.height*100).toFixed(1)}% / 左 ${(Math.max(0,visibleImage.left-box.rect.left)/box.rect.width*100).toFixed(1)}% / 右 ${(Math.max(0,box.rect.left+box.rect.width-visibleImage.left-visibleImage.width)/box.rect.width*100).toFixed(1)}%（${style.objectFit}）`;
    const cropped = C.croppedRect(original, crop);
    const image = settings.cropVideo ? cropped : original;
    const hole = C.intersect(image, box.visible);
    if(settings.removeLetterbox)clipStyles.set(active,'background-color','transparent');else clipStyles.restore(active,'background-color');
    if (settings.removeLetterbox || (settings.cropVideo && Object.values(crop).some(v => v > 0))) {
      const clip = C.intersect(settings.cropVideo?cropped:original, box.rect);
      const top = Math.max(0, (clip.top - box.rect.top) / box.rect.height * 100), left = Math.max(0, (clip.left - box.rect.left) / box.rect.width * 100);
      const right = Math.max(0, (box.rect.left + box.rect.width - clip.left - clip.width) / box.rect.width * 100), bottom = Math.max(0, (box.rect.top + box.rect.height - clip.top - clip.height) / box.rect.height * 100);
      clipStyles.set(active, 'clip-path', `inset(${top}% ${right}% ${bottom}% ${left}%)`);
    } else clipStyles.restore(active);
    const signature = [image.left, image.top, image.width, image.height, hole.left, hole.top, hole.width, hole.height, innerWidth, innerHeight, JSON.stringify(settings), JSON.stringify(crop)].join(',');
    if (signature !== lastLayout) {
      lastLayout = signature;
      const spreadX = settings.spread * settings.stretchX / 100, spreadY = settings.spread * settings.stretchY / 100;
      layer.style.clipPath = C.holeClip(hole, innerWidth, innerHeight, settings);
      dimmer.style.clipPath = C.holeClip(hole, innerWidth, innerHeight);
      dimmer.style.opacity = String(settings.dim / 100);
      layer.style.mixBlendMode = settings.blend;
      layer.style.opacity = String(settings.intensity / 100*.82);
      projector.configure(image,settings);
      for(const [key,value]of Object.entries({left:hole.left,top:hole.top,width:hole.width,height:hole.height}))shadow.style[key]=value+'px';
      const radius=settings.videoShadow,alpha=settings.videoShadowOpacity/100;
      shadow.style.boxShadow=radius?`0 2px ${Math.max(2,Math.round(radius*.22))}px 1px rgba(0,0,0,${alpha*.8}),0 7px ${radius}px ${Math.round(radius*.15)}px rgba(0,0,0,${alpha})`:'none';
      canvas.style.left = `${image.left - spreadX}px`; canvas.style.top = `${image.top - spreadY}px`;
      canvas.style.width = `${image.width + spreadX * 2}px`; canvas.style.height = `${image.height + spreadY * 2}px`;
      canvas.style.filter = `blur(${settings.blur}px) ${settings.filterTarget!=='video'?adjustment:''}`;
      let mask='none';if(settings.fadeStart<100){const stops=[];for(let i=0;i<=8;i++){const t=i/8;stops.push(`rgba(0,0,0,${(1-Math.pow(t,settings.fadeCurve)).toFixed(3)}) ${settings.fadeStart+(100-settings.fadeStart)*t}%`);}mask=`radial-gradient(ellipse at center,${stops.join(',')})`;}
      canvas.style.maskImage=mask;
      for(const key of ['left','top','width','height'])noise.style[key]=canvas.style[key];noise.style.opacity=String(settings.debanding/100*.18);noise.style.maskImage=mask;noise.style.display=settings.debanding?'block':'none';
      const ratio = active.videoWidth * (1 - crop.left - crop.right) / (active.videoHeight * (1 - crop.top - crop.bottom));
      const res = settings.quality;
      const w = Math.max(8, Math.round(ratio >= 1 ? res : res * ratio)), h = Math.max(8, Math.round(ratio >= 1 ? res / ratio : res));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
    }
    return box;
  }
  function tick(now) {
    if (disposed || !allowedHere() || document.hidden || !active?.isConnected) { hideLayer();ui.metrics(null);if(active&&!allowedHere())setStatus(settings.enabled?'当前显示模式未启用环境光':'环境光已关闭');return; }
    if(active.paused&&!settings.keepPaused){hideLayer();ui.metrics(null);setStatus('已暂停 · 隐藏光效');schedule();return;}
    const fs = document.fullscreenElement;
    if (fs?.tagName === 'VIDEO') { hideLayer(); setStatus('原生视频全屏无法显示叠加层，请使用网页全屏。'); schedule(); return; }
    const changed = active.currentSrc !== source || Math.abs(active.currentTime - sourceTime) > 1.5;
    if (changed) { if(source&&settings.resetCropOnVideo){settings={...settings,cropTop:0,cropBottom:0,cropLeft:0,cropRight:0};ui.update(settings);queueSave();}source = active.currentSrc; dirty = true; resetDetection();glBlocked=false;chooseRenderer(); }
    sourceTime = active.currentTime;
    const before = JSON.stringify(crop); detect(now); if (JSON.stringify(crop) !== before){dirty = true;applyVideoScale();}
    if (active === document.pictureInPictureElement || !layout()) { hideLayer(); schedule(); return; }
    if (active.mediaKeys) { hideLayer(); setStatus('受保护视频不支持环境光'); schedule(); return; }
    const capture=C.frameDeadline(now,nextCapture,settings.fps);
    if (active.readyState >= 2 && (dirty || (active.currentTime !== lastMediaTime && capture.due))) {
      try {
        const start=performance.now(),dt=now-lastDraw;
        renderer.draw(active,crop,1);drawTime=performance.now()-start;frameCount++;nextCapture=capture.next;
        projector.update(canvas,active,dirty);
        if(now-fpsStart>=1000){actualFPS=frameCount*1000/(now-fpsStart);frameCount=0;fpsStart=now;}
        frameTimes.push(Math.min(100,dt));if(frameTimes.length>24)frameTimes.shift();
        ui.metrics({fps:actualFPS,drawTime,width:canvas.width,height:canvas.height,frameTimes,mode:renderer.mode});
        lastDraw = now; lastMediaTime = active.currentTime; dirty = false; showLayer();
        mediaState = `${active.paused ? '已暂停 · 保留光效' : '环境光运行中'} · ${active.videoWidth} × ${active.videoHeight} · 上限 ${settings.fps} FPS`;
        setStatus(mediaState);
      } catch (e) {
        if(renderer.mode==='webgl'){glBlocked=true;chooseRenderer(true);rendererNote=e.name==='SecurityError'?'WebGL 无法访问跨域帧，已回退 Canvas2D':'WebGL 异常，已回退 Canvas2D';dirty=true;diagnostics();schedule();return;}
        hideLayer(); mediaState = e.name === 'SecurityError' ? '当前视频受浏览器限制，无法读取画面' : '画面尚不可用，等待播放器…'; setStatus(mediaState);
      }
    } else if (active.paused && !dirty) setStatus(`已暂停 · 保留光效 · 上限 ${settings.fps} FPS`);
    schedule();
  }
  function apply(next) {
    const old = settings; settings = C.normalize(next); dirty = true;nextCapture=0; ui.update(settings); cancelFrame();
    if (['autoH','autoV','threshold','maxCrop','stableFrames','coloredBars','colorTolerance','certainty','uneven'].some(k => old[k] !== settings[k])) resetDetection();
    if(old.renderer!==settings.renderer){glBlocked=false;rendererNote='';}chooseRenderer();
    crop = C.cropFor(settings, sampleBlocked ? C.emptyCrop() : barState.crop);
    nativeCount = native.update(active, allowedHere() && settings.hideNative);pageStyler.update(active,settings,allowedHere());applyVideoScale();diagnostics();
    if (!allowedHere()) {clipStyles.clear();filterStyles.clear();hideLayer();ui.metrics(null);setStatus(settings.enabled?'当前显示模式未启用环境光':'环境光已关闭');}
    else { tick(performance.now()); schedule(); }
  }
  const unsubscribe = DAPlatform.subscribe(apply);
  const observer = new MutationObserver(records => {
    if (records.every(r => layer.contains(r.target) || uiHost.contains(r.target) || dimmer.contains(r.target)||shadow.contains(r.target))) return;
    if (!scanTimer) scanTimer = setTimeout(() => { scanTimer = 0; scan(); }, 120);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const interval = setInterval(() => {scan();if(settings.enabled&&!document.hidden&&active){if(active.paused){cancelFrame();tick(performance.now());}else schedule();}},600);
  listen(document, 'visibilitychange', () => { cancelFrame(); if (document.hidden) { hideLayer(); setStatus('后台标签页 · 已暂停渲染'); } else { dirty = true; scan(); schedule(); } });
  listen(document, 'fullscreenchange', () => { place(); dirty = true; scan(); cancelFrame(); tick(performance.now()); });
  listen(window, 'resize', () => { dirty = true; scan(); });
  listen(document, 'scroll', () => { dirty = true; scan(); }, { capture: true, passive: true });
  for (const name of ['play', 'pause', 'loadeddata', 'seeked', 'emptied', 'enterpictureinpicture', 'leavepictureinpicture']) {
    listen(document, name, e => { if (e.target.tagName === 'VIDEO') { dirty = true; scan(); cancelFrame(); if (active) tick(performance.now()); } }, { capture: true });
  }
  listen(document, 'keydown', e => {
    const target = e.composedPath()[0];
    if (e.repeat || target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName)) return;
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'Key'+settings.toggleKey) { e.preventDefault(); apply({ ...settings, enabled: !settings.enabled }); queueSave(); }
    if (e.code === 'Key'+settings.settingsKey) { e.preventDefault(); ui.toggle(); }
  });
  DAPlatform.menu(() => ui.toggle(true));
  if (DAPlatform.api?.runtime?.onMessage) DAPlatform.api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'douyin-ambilight-status') sendResponse({ status: layer.dataset.state || '等待播放器…', diagnostics: layer.dataset.diagnostics });
  });
  listen(window, 'pagehide', e => {
    cancelFrame(); hideLayer();
    if (e.persisted) return;
    disposed = true; observer.disconnect(); clearInterval(interval); clearTimeout(scanTimer); clearTimeout(saveTimer); unsubscribe(); native.clear();videoStyles.clear();clipStyles.clear();filterStyles.clear();pageStyler.clear();projector.destroy();renderer.destroy();lifetime.abort();layer.remove();dimmer.remove();shadow.remove();uiHost.remove();
  });
  listen(window, 'pageshow', () => { dirty = true; scan(); schedule(); });
  place(); scan();
  DAPlatform.get().then(s => { apply(s); scan(); schedule(); }).catch(() => setStatus('设置读取失败，请重新载入扩展并刷新网页。'));
})();

