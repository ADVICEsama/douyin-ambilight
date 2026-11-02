import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/core.js';
const C = globalThis.DACore;
const box = { left: 100, top: 50, width: 800, height: 600 };
test('invalid and imported settings are constrained to known safe values', () => {
  assert.deepEqual(C.normalize(null), C.defaults);
  const s = C.normalize({ enabled: 'false', spread: 900, intensity: -3, fps: 99, blur: NaN, smoothing: 90.3, injected: '<script>' });
  assert.equal(s.enabled, true); assert.equal(s.spread, 350); assert.equal(s.intensity, 0); assert.equal(s.fps, C.defaults.fps); assert.equal(s.blur, 65); assert.equal(s.smoothing, 90);
  assert.equal(Object.hasOwn(s, 'injected'), false);
});
test('portrait video contained inside wide player', () => {
  assert.deepEqual(C.contentRect(box, 1080, 1920), { left: 331.25, top: 50, width: 337.5, height: 600 });
});
test('landscape letterboxing, fill, cover and positions', () => {
  assert.deepEqual(C.contentRect(box, 1920, 1080), { left: 100, top: 125, width: 800, height: 450 });
  assert.deepEqual(C.contentRect(box, 1920, 1080, 'fill'), box);
  assert.equal(C.contentRect(box, 1920, 1080, 'cover').height, 600);
  assert.equal(C.contentRect(box, 1920, 1080, 'contain', 'center top').top, 50);
  assert.equal(C.contentRect(box, 1920, 1080, 'contain', '50% 100%').top, 200);
  assert.equal(C.contentRect(box, 1920, 1080, 'contain', 'top').top, 50);
  assert.equal(C.contentRect(box, 320, 180, 'scale-down').width, 320);
});
test('intersection clips offscreen and ancestor bounds', () => {
  assert.deepEqual(C.intersect({ left: -30, top: 10, width: 100, height: 90 }, { left: 0, top: 0, width: 500, height: 500 }), { left: 0, top: 10, width: 70, height: 90 });
});
test('selection rejects preload/tiny/offscreen and prioritizes large visible videos', () => {
  const view = { left: 0, top: 0, width: 1280, height: 800 };
  assert.equal(C.score({ left: 0, top: 0, width: 100, height: 60 }, view, true), 0);
  assert.equal(C.score({ left: 0, top: 850, width: 500, height: 700 }, view, true), 0);
  const large = C.score({ left: 100, top: 20, width: 500, height: 700 }, view, false);
  const tinyPlaying = C.score({ left: 10, top: 10, width: 180, height: 100 }, view, true);
  assert.ok(large > tinyPlaying);
});
test('mask cuts a hole rather than tinting video', () => {
  const mask = C.holeClip({ left: -10, top: 20, width: 210, height: 300 }, 1000, 800);
  assert.match(mask, /^polygon\(evenodd,/); assert.ok(mask.includes('200px 320px'));
});
test('smoothing is frame-rate independent', () => {
  const a = C.frameAlpha(65, 1000 / 24), b = C.frameAlpha(65, 1000 / 12);
  assert.ok(Math.abs((1 - a) ** 2 - (1 - b)) < 1e-10);
  assert.equal(C.frameAlpha(0, 42), 1);
});
function frame(width=200,height=100,bars={top:10,bottom:10,left:20,right:20}) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i+3]=255;if(x>=bars.left&&x<width-bars.right&&y>=bars.top&&y<height-bars.bottom){data[i]=120;data[i+1]=160;data[i+2]=190;}}
  return{data,width,height};
}
test('detect encoded horizontal and vertical bars',()=>{
 const bars=C.detectBars(frame());assert.deepEqual(bars,{top:.1,bottom:.1,left:.1,right:.1});
});
test('all black/dark frames are ignored, not cropped',()=>{
 assert.equal(C.detectBars({data:new Uint8ClampedArray(200*100*4),width:200,height:100}),null);
});
test('bright subtitles in bottom bar prevent cropping across them',()=>{
 const f=frame();for(let y=94;y<97;y++)for(let x=65;x<135;x++){const i=(y*200+x)*4;f.data[i]=255;f.data[i+1]=255;f.data[i+2]=255;}
 assert.ok(C.detectBars(f).bottom<.1);
});
test('max crop cap is conservative; clipped limit is not accepted as border',()=>{
 assert.equal(C.detectBars(frame(200,100,{top:30,bottom:0,left:0,right:0}),18,25).top,0);
});
test('three stable samples required, dark frame preserves last result',()=>{
 let state={crop:C.emptyCrop(),pending:null,count:0};const target={top:.1,bottom:.1,left:0,right:0};
 state=C.stabilize(state,target,3);assert.equal(state.crop.top,0);state=C.stabilize(state,target,3);assert.equal(state.crop.top,0);state=C.stabilize(state,target,3);assert.equal(state.crop.top,.1);
 assert.equal(C.stabilize(state,null,3),state);
});
test('manual crop works independently of auto pixel access',()=>{
 const s=C.normalize({cropTop:10,cropRight:20,autoH:false,autoV:false});
 const crop=C.cropFor(s);assert.deepEqual(crop,{top:.1,bottom:0,left:0,right:.2});
 assert.deepEqual(C.croppedRect(box,crop),{left:100,top:110,width:640,height:540});
});
test('new advanced settings validate enums, numbers, booleans and presets',()=>{
 const s=C.normalize({blend:'evil',quality:999,threshold:-1,maxCrop:80,videoScale:900,hideNative:false,fps:60,detectInterval:250});
 assert.equal(s.blend,C.defaults.blend);assert.equal(s.quality,96);assert.equal(s.threshold,0);assert.equal(s.maxCrop,45);assert.equal(s.videoScale,180);assert.equal(s.hideNative,false);assert.equal(s.fps,60);assert.equal(s.detectInterval,250);
 assert.equal(C.normalize(C.presets.eco).fps,12);
});
test('direction mask excludes disabled directions',()=>{
 assert.ok(C.holeClip({left:200,top:100,width:400,height:300},1000,800,{glowLeft:false,glowTop:false}).startsWith('polygon(evenodd, 200px 100px'));
});
test('uniform colored borders detected, uniform solid scene rejected as border',()=>{
 const f=frame(200,100,{top:10,bottom:10,left:0,right:0});
 for(let y=0;y<100;y++)if(y<10||y>=90)for(let x=0;x<200;x++){const i=(y*200+x)*4;f.data[i]=70;f.data[i+1]=45;f.data[i+2]=95;}
 const b=C.detectBars(f,18,25,{coloredBars:true,colorTolerance:10});assert.equal(b.top,.1);assert.equal(b.bottom,.1);
 for(let i=0;i<f.data.length;i+=4){f.data[i]=70;f.data[i+1]=45;f.data[i+2]=95;}
 assert.deepEqual(C.detectBars(f,18,25,{coloredBars:true,colorTolerance:10}),C.emptyCrop());
});
test('asymmetry limit and detection crop offset are honored',()=>{
 const b=C.detectBars(frame(200,100,{top:10,bottom:0,left:0,right:0}),18,25,{uneven:0});assert.equal(b.top,0);
 const s=C.normalize({autoH:true,cropOffset:2});assert.ok(Math.abs(C.cropFor(s,{top:.1,bottom:0,left:0,right:0}).top-.12)<1e-10);
});
test('24 FPS limit on 30 FPS source does not collapse to 15 FPS',()=>{
 let next=0,count=0;for(let i=0;i<300;i++){const result=C.frameDeadline(i*1000/30,next,24);if(result.due){count++;next=result.next;}}
 assert.ok(count>=239&&count<=241,`${count} frames in 10 seconds`);
});
test('giant horizontal bars in a tall encoded frame are found with the new default',()=>{
 const f=frame(108,212,{top:78,bottom:78,left:0,right:0}),a=C.analyzeBars(f);
 assert.equal(a.reason,'detected');assert.equal(a.crop.top,78/212);assert.equal(a.crop.bottom,78/212);
 assert.ok(C.cropFor(C.defaults,a.crop).top>.36);
});
test('explicit old 25 percent limit is respected but reported as a limit instead of no bars',()=>{
 const a=C.analyzeBars(frame(108,212,{top:78,bottom:78,left:0,right:0}),18,25);
 assert.equal(a.reason,'limit');assert.deepEqual(a.limited,['top','bottom']);assert.equal(a.crop.top,0);
});
test('a border exactly at the configured limit is accepted, beyond 45 percent remains rejected',()=>{
 assert.equal(C.analyzeBars(frame(200,200,{top:90,bottom:90,left:0,right:0})).crop.top,.45);
 assert.equal(C.analyzeBars(frame(200,200,{top:92,bottom:92,left:0,right:0})).reason,'limit');
});
test('disabled axes do not create limit warnings or fake successful auto crops',()=>{
 const a=C.analyzeBars(frame(200,200,{top:80,bottom:80,left:0,right:0}),18,25,{autoH:false});
 assert.equal(a.reason,'none');assert.deepEqual(a.crop,C.emptyCrop());
});
test('bright content inside a bar is reported and never cropped over',()=>{
 const f=frame(200,200,{top:70,bottom:70,left:0,right:0});
 for(let y=191;y<194;y++)for(let x=60;x<140;x++){const i=(y*200+x)*4;f.data[i]=f.data[i+1]=f.data[i+2]=255;}
 const a=C.analyzeBars(f);assert.equal(a.reason,'obstructed');assert.ok(a.obstructed.includes('bottom'));assert.ok(a.crop.bottom<=.03);
});
test('manual wide crops have a hard 45 percent per-edge cap and leave valid image area',()=>{
 const s=C.normalize({cropTop:44,cropBottom:44,cropLeft:45,cropRight:45,autoH:false,autoV:false}),c=C.cropFor(s),r=C.croppedRect(box,c);
 assert.equal(c.top,.44);assert.ok(r.width>0&&r.height>0);assert.equal(C.normalize({cropTop:99}).cropTop,45);
});
