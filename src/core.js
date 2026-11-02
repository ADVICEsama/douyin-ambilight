/* Original lightweight implementation; see README for reference project. */
(() => {
  'use strict';
  const defaults = Object.freeze({ enabled: true, intensity: 70, spread: 150, blur: 65, saturation: 120, fps: 60, smoothing: 65, showButton: true,
    hideNative: true, brightness: 90, contrast: 100, hue: 0, stretchX: 100, stretchY: 100, dim: 0, blend: 'normal', quality: 96,
    glowTop: true, glowBottom: true, glowLeft: true, glowRight: true, autoH: true, autoV: true, threshold: 18, maxCrop: 25, detectInterval: 1000, stableFrames: 3,
    cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, cropVideo: true, removeLetterbox: true, layoutVersion: 3, videoScale: 100,
    renderer: 'canvas', frameSync: 'video', prioritizeLoad: false, showFPS: false, showFrametimes: false, showResolutions: false, showBarStats: false,
    headerShadow: 0, headerShadowOpacity: 0, headerImagesOpacity: 100, headerFillOpacity: 100,
    contentShadow: 0, contentShadowOpacity: 0, contentTextOnly: true, contentImagesOpacity: 100, contentFillOpacity: 100, customPageBackground: false, pageGray: 0, hideScrollbar: false,
    videoScaleTheater: 100, videoScaleFullscreen: 100, videoShadow: 48, videoShadowOpacity: 65,
    coloredBars: false, colorTolerance: 20, certainty: 98, uneven: 35, cropOffset: 0, resetCropOnVideo: false, fillAfterCrop: false,
    filterTarget: 'ambient', fadeStart: 100, fadeCurve: 2, debanding: 0, fadeTime: 0, flicker: 0, frameBlending: true,
    immersiveHeader: true, hideHeaderTheater: false, transparentShell: true, transparentSidePanels: true, transparentNavigation: true, transparentControls: true, transparentPageContent: true, transparentSendingBar: true,
    enableNormal: true, enableTheater: true, enableFullscreen: true, keepPaused: true, panelTheme: 'dark', toggleKey: 'A', settingsKey: 'L'
  });
  const ranges = { intensity: [0, 100], spread: [30, 350], blur: [15, 150], saturation: [50, 250], smoothing: [0, 95],
    brightness: [30, 200], contrast: [50, 200], hue: [-180, 180], stretchX: [50, 200], stretchY: [50, 200], dim: [0, 70],
    threshold: [0, 64], maxCrop: [5, 35], stableFrames: [2, 6], cropTop: [0, 30], cropBottom: [0, 30], cropLeft: [0, 30], cropRight: [0, 30], videoScale: [100, 180],
    headerShadow: [0,80], headerShadowOpacity:[0,100], headerImagesOpacity:[0,100], headerFillOpacity:[0,100],
    contentShadow:[0,80], contentShadowOpacity:[0,100], contentImagesOpacity:[0,100], contentFillOpacity:[0,100], pageGray:[0,100],
    videoScaleTheater:[100,180], videoScaleFullscreen:[100,180],videoShadow:[0,80],videoShadowOpacity:[0,100],
    colorTolerance:[1,60],certainty:[90,100],uneven:[0,35],cropOffset:[-5,5],fadeStart:[0,100],fadeCurve:[1,5],debanding:[0,100],fadeTime:[0,1000],flicker:[0,95]
  };
  const presets = Object.freeze({ balanced: { intensity: 70, spread: 150, blur: 65, saturation: 120, brightness: 90, contrast: 100, smoothing: 65, fps: 60, quality: 96 }, cinema: { intensity: 50, spread: 180, blur: 100, saturation: 110, brightness: 90, contrast: 110, smoothing: 85, fps: 24, quality: 96 }, vivid: { intensity: 85, spread: 220, blur: 80, saturation: 180, brightness: 120, contrast: 115, smoothing: 55, fps: 30, quality: 160 }, eco: { intensity: 60, spread: 120, blur: 50, saturation: 120, brightness: 100, contrast: 100, smoothing: 65, fps: 12, quality: 64 } });
  function normalize(input) {
    const s = { ...defaults };
    if (!input || typeof input !== 'object') return s;
    for (const key of Object.keys(defaults).filter(k => typeof defaults[k] === 'boolean')) if (typeof input[key] === 'boolean') s[key] = input[key];
    for (const [key, [min, max]] of Object.entries(ranges)) {
      if (typeof input[key] === 'number' && Number.isFinite(input[key])) s[key] = Math.round(Math.max(min, Math.min(max, input[key])));
    }
    if ([12, 24, 30, 60].includes(input.fps)) s.fps = input.fps;
    if ([64, 96, 160, 256].includes(input.quality)) s.quality = input.quality;
    if ([250, 500, 1000, 2000].includes(input.detectInterval)) s.detectInterval = input.detectInterval;
    if (['screen', 'plus-lighter', 'normal'].includes(input.blend)) s.blend = input.blend;
    for(const [key,values] of Object.entries({renderer:['canvas','webgl'],frameSync:['video','display','timer'],filterTarget:['ambient','video','both'],panelTheme:['dark','light','auto'],toggleKey:['A','G','T'],settingsKey:['L','S','M']})) if(values.includes(input[key]))s[key]=input[key];
    return s;
  }
  function intersect(a, b) {
    const left = Math.max(a.left, b.left), top = Math.max(a.top, b.top);
    const right = Math.min(a.left + a.width, b.left + b.width), bottom = Math.min(a.top + a.height, b.top + b.height);
    return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }
  function position(token, free) {
    if (token === 'left' || token === 'top') return 0;
    if (token === 'right' || token === 'bottom') return free;
    if (!token || token === 'center') return free / 2;
    if (token.endsWith('%')) return free * (parseFloat(token) || 0) / 100;
    if (token.endsWith('px')) return parseFloat(token) || 0;
    return free / 2;
  }
  // Account for CSS letterboxing without modifying the site's video element.
  function contentRect(box, videoWidth, videoHeight, fit = 'contain', objectPosition = '50% 50%') {
    if (!videoWidth || !videoHeight) return { ...box };
    let scale = Math.min(box.width / videoWidth, box.height / videoHeight);
    if (fit === 'cover') scale = Math.max(box.width / videoWidth, box.height / videoHeight);
    if (fit === 'none') scale = 1;
    if (fit === 'scale-down') scale = Math.min(1, scale);
    if (fit === 'fill') return { ...box };
    const width = videoWidth * scale, height = videoHeight * scale;
    const p = objectPosition.trim().split(/\s+/);
    if (p.length === 1 && ['top', 'bottom'].includes(p[0])) p.unshift('center');
    return { left: box.left + position(p[0], box.width - width), top: box.top + position(p[1], box.height - height), width, height };
  }
  function score(rect, viewport, playing) {
    const visible = intersect(rect, viewport);
    if (visible.width < 120 || visible.height < 90) return 0;
    const area = visible.width * visible.height;
    if (area < rect.width * rect.height * 0.2) return 0;
    return area * (playing ? 1.35 : 1);
  }
  function holeClip(rect, width, height, sides = {}) {
    const r = intersect(rect, { left: 0, top: 0, width, height });
    const x = r.left, y = r.top, right = x + r.width, bottom = y + r.height;
    const l = sides.glowLeft === false ? x : 0, t = sides.glowTop === false ? y : 0, rr = sides.glowRight === false ? right : width, b = sides.glowBottom === false ? bottom : height;
    return `polygon(evenodd, ${l}px ${t}px, ${rr}px ${t}px, ${rr}px ${b}px, ${l}px ${b}px, ${l}px ${t}px, ${x}px ${y}px, ${right}px ${y}px, ${right}px ${bottom}px, ${x}px ${bottom}px, ${x}px ${y}px)`;
  }
  function frameAlpha(smoothing, dt) {
    const retention = Math.min(0.95, Math.max(0, smoothing / 100));
    return 1 - Math.pow(retention, Math.max(1, dt) / (1000 / 24));
  }
  // A phase accumulator avoids quantizing a 24 FPS cap down to 15 on 30 FPS input.
  function frameDeadline(now, deadline, fps) {
    const period=1000/fps;
    if(now+0.5<deadline)return {due:false,next:deadline};
    const start=deadline>0&&now-deadline<period*4?deadline:now;
    return {due:true,next:start+(Math.floor(Math.max(0,now-start)/period)+1)*period};
  }
  const emptyCrop = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
  function detectBars({ data, width, height }, threshold = 18, maxCrop = 25, options = {}) {
    if (width < 8 || height < 8) return null;
    const black = (x, y) => { const i = (y * width + x) * 4; return Math.max(data[i], data[i + 1], data[i + 2]) <= threshold; };
    let signal = 0, total = 0;
    for (let y = Math.floor(height * .3); y < height * .7; y += 2) for (let x = Math.floor(width * .3); x < width * .7; x += 2) { total++; if (!black(x, y)) signal++; }
    if (signal / total < .1) return null; // Dark frames/fades must not trigger a new crop.
    const certainty = (options.certainty ?? 98.5) / 100;
    const rowBlack = y => { let n = 0, dark = 0; for (let x = 0; x < width; x++) { n++; if (black(x, y)) dark++; } return dark / n >= certainty; };
    const colBlack = x => { let n = 0, dark = 0; for (let y = 0; y < height; y++) { n++; if (black(x, y)) dark++; } return dark / n >= certainty; };
    const scan = (size, check, reverse) => { let n = 0; const limit = Math.floor(size * maxCrop / 100); while (n < limit && check(reverse ? size - 1 - n : n)) n++; return n >= 2 && n < limit ? n / size : 0; };
    const result = { top: scan(height, rowBlack, false), bottom: scan(height, rowBlack, true), left: scan(width, colBlack, false), right: scan(width, colBlack, true) };
    if(options.coloredBars){
      const tolerance=options.colorTolerance??20;
      for(const [side,horizontal,reverse]of [['top',true,false],['bottom',true,true],['left',false,false],['right',false,true]]){
        if(result[side])continue;
        const size=horizontal?height:width,lineLength=horizontal?width:height,index=reverse?size-1:0;
        const values=[[],[],[]];for(let p=0;p<lineLength;p++){const i=(horizontal?index*width+p:p*width+index)*4;for(let c=0;c<3;c++)values[c].push(data[i+c]);}
        const color=values.map(v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)]);
        const matches=(x,y)=>{const i=(y*width+x)*4;return color.every((v,c)=>Math.abs(data[i+c]-v)<=tolerance);};
        let different=0,n=0;for(let y=Math.floor(height*.3);y<height*.7;y+=3)for(let x=Math.floor(width*.3);x<width*.7;x+=3){n++;if(!matches(x,y))different++;}
        if(different/n<.3)continue; // Uniform scenes are not borders.
        const check=line=>{let matched=0;for(let p=0;p<lineLength;p++)if(matches(horizontal?p:line,horizontal?line:p))matched++;return matched/lineLength>=certainty;};
        result[side]=scan(size,check,reverse);
      }
    }
    const uneven=(options.uneven??35)/100+.012;
    if(Math.abs(result.top-result.bottom)>uneven)result.top=result.bottom=0;
    if(Math.abs(result.left-result.right)>uneven)result.left=result.right=0;
    return result;
  }
  function stabilize(state, candidate, required) {
    if (!candidate) return state;
    const matches = state.pending && Object.keys(candidate).every(k => Math.abs(candidate[k] - state.pending[k]) < .012);
    const count = matches ? state.count + 1 : 1;
    return { pending: candidate, count, crop: count >= required ? { ...candidate } : state.crop };
  }
  function cropFor(s, auto = emptyCrop()) {
    const edge=(side,enabled)=>Math.min(.4,Math.max(0,s['crop'+side[0].toUpperCase()+side.slice(1)]/100+(enabled&&auto[side]>0?Math.max(0,auto[side]+s.cropOffset/100):0)));
    return {top:edge('top',s.autoH),bottom:edge('bottom',s.autoH),left:edge('left',s.autoV),right:edge('right',s.autoV)};
  }
  function croppedRect(rect, c) { return { left: rect.left + rect.width * c.left, top: rect.top + rect.height * c.top, width: rect.width * (1 - c.left - c.right), height: rect.height * (1 - c.top - c.bottom) }; }
  globalThis.DACore = Object.freeze({ defaults, ranges, presets, normalize, intersect, contentRect, score, holeClip, frameAlpha, frameDeadline, emptyCrop, detectBars, stabilize, cropFor, croppedRect });
})();
