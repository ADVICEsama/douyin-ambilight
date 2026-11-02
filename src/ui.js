(() => {
  'use strict';
  const css = `
    :host{all:initial;color-scheme:dark;font:13px/1.5 system-ui,"Microsoft YaHei",sans-serif;color:#f5f5fa}
    *{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit}button,select,summary{cursor:pointer}
    button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #74e8ee;outline-offset:3px}
    .panel{width:360px;max-width:calc(100vw - 24px);padding:20px;border:1px solid #41414e;border-radius:18px;background:#191922;box-shadow:0 16px 64px #0008;color:#f5f5fa;scrollbar-width:thin;scrollbar-color:#555568 transparent}
    header{display:flex;align-items:center;justify-content:space-between;gap:10px}h1{font-size:18px;margin:0;font-weight:700;letter-spacing:.5px}
    .sub{color:#a3a3b6;font-size:11px;margin:3px 0 14px}.close{border:0;background:transparent;color:#b4b4c7;font-size:21px;padding:0 4px}
    label.row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:13px 0}input[type=checkbox]{width:17px;height:17px;accent-color:#75e5ed;flex:none}
    .range{display:block;margin:15px 0}.range span{display:flex;justify-content:space-between;margin-bottom:6px}output{color:#83e6ec;font-variant-numeric:tabular-nums}input[type=range]{width:100%;accent-color:#76e5ed;display:block}
    select{max-width:185px;background:#262633;border:1px solid #454555;color:#fff;border-radius:6px;padding:5px 8px}
    details{border-top:1px solid #343443;margin-top:14px;padding-top:12px}summary{font-weight:650;color:#dbf7fa;user-select:none;list-style-position:outside;margin-left:14px}
    .note,.tip{font-size:11px;color:#a7a7bd;line-height:1.6}.note{margin:10px 0}.status,.diagnostics{padding:10px;border-radius:9px;background:#22222e;color:#c7c7d8;font-size:11px;overflow-wrap:anywhere;white-space:pre-line}.status{margin:16px 0 7px}.diagnostics{margin:0 0 12px;color:#a5ccd0}
    .reset,.io button{background:#292936;border:1px solid #494958;color:#eee;border-radius:8px;padding:8px}.reset{width:100%}.io{display:flex;gap:8px;margin:9px 0}.io button{flex:1}.tip{margin:12px 0 0}
    .launcher{position:fixed;right:24px;bottom:86px;background:#191922ef;color:#c2f5f5;border:1px solid #687e85;border-radius:24px;padding:9px 14px;box-shadow:0 4px 22px #0005;pointer-events:auto}
    .floating{position:fixed;right:24px;bottom:138px;max-height:calc(100vh - 155px);overflow:auto;pointer-events:auto}
    .stats{position:fixed;left:16px;bottom:16px;background:#111c;color:#e3f8fa;font:11px/1.6 monospace;padding:9px 12px;border-radius:8px;white-space:pre-line;pointer-events:none;max-width:65vw} :host([data-theme=light]) .panel{background:#f3f4f7;color:#171927;border-color:#a5a9b5}:host([data-theme=light]) summary{color:#173b48}:host([data-theme=light]) .note,:host([data-theme=light]) .tip,:host([data-theme=light]) .sub{color:#525767}:host([data-theme=light]) select,:host([data-theme=light]) .reset,:host([data-theme=light]) .io button{background:#e2e5ec;color:#171927}:host([data-theme=light]) output{color:#00737d}@media(prefers-color-scheme:light){:host([data-theme=auto]) .panel{background:#f3f4f7;color:#171927}:host([data-theme=auto]) summary{color:#173b48}}
    @media(max-height:700px){.floating{bottom:64px;max-height:calc(100vh - 80px)}.launcher{bottom:16px}}
  `;
  function create(host, initial, onPatch, floating = true) {
    const shadow = host.attachShadow({mode:'open'});
    const el = (tag, text, attrs = {}) => { const node=document.createElement(tag);if(text)node.textContent=text;for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node; };
    const style=el('style',css);shadow.append(style);
    const panel=el('section',null,{class:`panel${floating?' floating':''}`,'aria-label':'抖音环境光设置'});shadow.append(panel);
    const header=el('header'),close=el('button','×',{class:'close','aria-label':'关闭设置'});header.append(el('h1','抖音环境光'),close);panel.append(header,el('div','DOUYIN AMBILIGHT · 0.5.2 · 本地渲染',{class:'sub'}));
    function section(title, open=false){const d=el('details');d.open=open;d.append(el('summary',title));panel.append(d);return d;}
    function checkbox(parent,key,label){const row=el('label',label,{class:'row'});row.append(el('input',null,{type:'checkbox','data-key':key}));parent.append(row);}
    function range(parent,key,label,unit='%'){const row=el('label',null,{class:'range'}),line=el('span',label);line.append(el('output',null,{'data-for':key}));row.append(line,el('input',null,{type:'range','aria-label':label,'data-key':key,min:DACore.ranges[key][0],max:DACore.ranges[key][1],step:1,'data-unit':unit}));parent.append(row);}
    function select(parent,key,label,options){const row=el('label',label,{class:'row'}),s=el('select',null,{'aria-label':label,'data-key':key});for(const [v,name]of options)s.append(el('option',name,{value:v}));row.append(s);parent.append(row);return s;}

    const setup=section('设置',true);
    const preset=select(setup,'preset','光效预设',[['custom','自定义'],['balanced','均衡'],['cinema','影院'],['vivid','鲜艳'],['eco','省电']]);
    checkbox(setup,'enabled','启用环境光');checkbox(setup,'hideNative','隐藏抖音自带模糊背景');
    setup.append(el('p','隐藏识别到的播放器及当前视频卡片背景层（包括评论下方的原生模糊图）；关闭环境光后恢复。以下分类按参考项目组织，不支持的引擎特性会在末尾说明。',{class:'note'}));
    for(const [key,label]of [['showFPS','显示实测帧率'],['showFrametimes','显示帧间隔图'],['showResolutions','显示绘制分辨率与耗时'],['showBarStats','显示黑边统计']])checkbox(setup,key,label);
    const perf=section('质量与性能');
    select(perf,'renderer','渲染器',[['canvas','Canvas2D · 兼容优先'],['webgl','WebGL2 · GPU 取样']]);
    select(perf,'quality','取样分辨率',[[64,'64 px · 省电'],[96,'96 px · 默认'],[160,'160 px · 清晰'],[256,'256 px · 高质量']]);
    select(perf,'fps','渲染帧率',[[12,'12 FPS · 省电'],[24,'24 FPS · 均衡'],[30,'30 FPS · 流畅'],[60,'60 FPS · 高负载']]);
    select(perf,'frameSync','同步方式',[['video','视频解码回调'],['display','显示器刷新'],['timer','定时器']]);checkbox(perf,'prioritizeLoad','优先载入页面');
    perf.append(el('p','WebGL2 若受跨域或显卡限制，将明确提示并回退 Canvas2D；不保证某一种模式一定更省电。',{class:'note'}));
    const top=section('顶栏');range(top,'headerShadow','顶栏阴影大小',' px');range(top,'headerShadowOpacity','顶栏阴影不透明度');range(top,'headerImagesOpacity','顶栏图片不透明度');range(top,'headerFillOpacity','顶栏背景不透明度');
    const content=section('页面内容');range(content,'contentShadow','内容阴影大小',' px');range(content,'contentShadowOpacity','内容阴影不透明度');checkbox(content,'contentTextOnly','只对文字添加内容阴影');range(content,'contentImagesOpacity','内容图片不透明度');range(content,'contentFillOpacity','内容区块背景不透明度');checkbox(content,'customPageBackground','自定义页面底色');range(content,'pageGray','页面底色灰度');range(content,'dim','周围页面压暗');checkbox(content,'hideScrollbar','隐藏页面滚动条');
    const video=section('视频');range(video,'videoScale','原视频缩放');range(video,'videoScaleTheater','视频缩放（网页全屏）');range(video,'videoScaleFullscreen','视频缩放（浏览器全屏）');range(video,'videoShadow','视频阴影大小',' px');range(video,'videoShadowOpacity','视频阴影不透明度');
    const bars=section('移除黑边与彩色边');checkbox(bars,'removeLetterbox','移除播放器留白（不裁原画内容）');
    checkbox(bars,'autoH','自动检测上下黑边');checkbox(bars,'autoV','自动检测左右黑边');checkbox(bars,'coloredBars','同时检测均匀彩色边');
    range(bars,'threshold','黑色阈值',' / 255');range(bars,'colorTolerance','彩色边色差容限',' / 255');range(bars,'maxCrop','单边最大检测范围');range(bars,'cropOffset','自动裁边偏移');range(bars,'stableFrames','稳定样本数',' 次');range(bars,'certainty','像素确定性门槛');range(bars,'uneven','不对称容差');
    select(bars,'detectInterval','检测间隔',[[250,'0.25 秒'],[500,'0.5 秒'],[1000,'1 秒'],[2000,'2 秒']]);
    bars.append(el('p','自动检测需要像素访问权限。跨域受限时会停止重试并提示，下面的手动裁边仍可用。彩色检测只针对均匀边框，不是主体识别。',{class:'note'}));
    for(const [key,label]of [['cropTop','手动裁上边'],['cropBottom','手动裁下边'],['cropLeft','手动裁左边'],['cropRight','手动裁右边']])range(bars,key,label);
    checkbox(bars,'resetCropOnVideo','换视频时重设手动裁边');checkbox(bars,'cropVideo','同时裁剪原视频画面');checkbox(bars,'fillAfterCrop','放大填满裁边后的空间');
    bars.append(el('p','播放器留白用几何裁剪去除，不需要读像素；编码黑边需要检测或手动裁边。原视频裁剪默认启用，填满默认关闭，避免裁掉两侧画面。请注意字幕。',{class:'note'}));
    const filters=section('滤镜');select(filters,'filterTarget','滤镜作用对象',[['ambient','只处理环境光'],['video','只处理原视频'],['both','环境光与原视频']]);range(filters,'brightness','光效亮度');range(filters,'contrast','光效对比度');range(filters,'saturation','色彩饱和度');range(filters,'hue','色相偏移','°');
    const ambient=section('环境光',true);range(ambient,'intensity','光线强度');range(ambient,'blur','柔化程度',' px');range(ambient,'spread','扩散范围',' px');range(ambient,'stretchX','横向延展');range(ambient,'stretchY','纵向延展');range(ambient,'fadeStart','扩散淡出起点');range(ambient,'fadeCurve','淡出曲线','');range(ambient,'debanding','去色带（静态噪声）');range(ambient,'fadeTime','画面淡入时间',' ms');range(ambient,'flicker','减少闪烁');checkbox(ambient,'frameBlending','平滑动态（帧混合）');range(ambient,'smoothing','过渡平滑');
    select(ambient,'blend','混合方式',[['screen','滤色 · 默认'],['plus-lighter','叠加发光'],['normal','普通透明混合']]);
    for(const [key,label]of [['glowTop','上方发光'],['glowBottom','下方发光'],['glowLeft','左侧发光'],['glowRight','右侧发光']])checkbox(ambient,key,label);
    const immersive=section('沉浸');checkbox(immersive,'transparentShell','网页外框与底板融入背景');checkbox(immersive,'immersiveHeader','顶栏与搜索框融入背景');checkbox(immersive,'hideHeaderTheater','全屏模式隐藏页面顶栏');checkbox(immersive,'transparentNavigation','左侧导航融入背景');checkbox(immersive,'transparentSidePanels','侧栏融入背景');checkbox(immersive,'transparentControls','播放器控制区融入背景');checkbox(immersive,'transparentPageContent','视频信息与评论区融入背景');checkbox(immersive,'transparentSendingBar','弹幕和评论输入区融入背景');
    immersive.append(el('p','只修改定位到的页面区域。下方状态会显示定位数量；数量为 0 代表当前页面尚未适配，不会把它报为成功。',{class:'note'}));
    const views=section('显示模式');checkbox(views,'enableNormal','普通模式启用');checkbox(views,'enableTheater','网页全屏启用');checkbox(views,'enableFullscreen','浏览器全屏启用');checkbox(views,'keepPaused','暂停时保留光效');
    views.append(el('p','直接让 video 元素原生全屏或进入画中画窗口时无法叠加，容器全屏可显示光效。',{class:'note'}));
    const general=section('基本设置');select(general,'panelTheme','设置面板主题',[['dark','暗色'],['light','亮色'],['auto','跟随系统']]);checkbox(general,'showButton','显示页面悬浮按钮');select(general,'toggleKey','开关快捷键',[['A','Alt + Shift + A'],['G','Alt + Shift + G'],['T','Alt + Shift + T']]);select(general,'settingsKey','设置快捷键',[['L','Alt + Shift + L'],['S','Alt + Shift + S'],['M','Alt + Shift + M']]);
    general.append(el('p','界面语言：简体中文。此版不是原项目渲染引擎的完整移植；暂不包含其 HDR 专用处理、VR、原视频去色带、GPU 驱动修复和多语言。',{class:'note'}));
    const status=el('div','等待播放器…',{class:'status',role:'status'}),diagnostics=el('div','检测状态：等待视频',{class:'diagnostics'});panel.append(status,diagnostics);
    const reset=el('button','恢复默认设置',{class:'reset'});panel.append(reset);
    const io=el('div',null,{class:'io'}),exportBtn=el('button','导出 JSON'),importBtn=el('button','导入 JSON'),file=el('input',null,{type:'file',accept:'.json,application/json',hidden:''});io.append(exportBtn,importBtn,file);panel.append(io);
    const shortcutsTip=el('p',null,{class:'tip'});panel.append(shortcutsTip);
    const launcher=el('button','✦ 环境光',{class:'launcher','aria-label':'打开抖音环境光设置','aria-expanded':'false'});
    if(floating){panel.hidden=true;shadow.append(launcher);}else close.hidden=true;
    let open=!floating,current=initial;
    function toggle(force){open=typeof force==='boolean'?force:!open;panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('input')?.focus();else if(!launcher.hidden)launcher.focus();}
    launcher.addEventListener('click',()=>toggle());close.addEventListener('click',()=>toggle(false));
    shadow.addEventListener('keydown',e=>{if(e.key==='Escape'&&floating){toggle(false);e.stopPropagation();}});
    panel.addEventListener('input',e=>{const t=e.target,key=t.dataset.key;if(!key)return;if(key==='preset'){if(DACore.presets[t.value])onPatch(DACore.presets[t.value]);return;}const value=t.type==='checkbox'?t.checked:typeof DACore.defaults[key]==='string'?t.value:Number(t.value);onPatch({[key]:value});});
    reset.addEventListener('click',()=>onPatch({...DACore.defaults}));
    exportBtn.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,settings:current},null,2)],{type:'application/json'}));const a=el('a',null,{href:url,download:'douyin-ambilight-settings.json'});shadow.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    importBtn.addEventListener('click',()=>file.click());file.addEventListener('change',async()=>{try{const f=file.files[0];if(!f)return;if(f.size>32768)throw new Error('文件过大');const raw=JSON.parse(await f.text()),value=raw.settings??raw;if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('不是设置对象');onPatch(DACore.normalize(value));status.textContent='设置已导入';}catch{status.textContent='导入失败：请选择小于 32 KB 的设置 JSON';}finally{file.value='';}});
    const stats=el('div',null,{class:'stats',hidden:''});shadow.append(stats);let lastMetrics=null;function showMetrics(){if(!lastMetrics)return;const m=lastMetrics,lines=[];if(current.showFPS)lines.push('实测取样 '+m.fps.toFixed(1)+' FPS');if(current.showResolutions)lines.push(m.mode+' · '+m.width+' × '+m.height+' · '+m.drawTime.toFixed(2)+' ms');if(current.showFrametimes)lines.push('帧间隔 '+m.frameTimes.map(v=>'▁▂▃▄▅▆▇█'[Math.min(7,Math.floor(v/12.5))]).join(''));if(current.showBarStats)lines.push(diagnostics.textContent.split('\n').filter(t=>t.startsWith('编码黑边：')||t.startsWith('当前取样')).join('\n'));stats.hidden=!lines.length;stats.textContent=lines.join('\n');}function update(s){current=s;shortcutsTip.textContent=`Alt + Shift + ${s.toggleKey} 开关光效 · Alt + Shift + ${s.settingsKey} 设置\n画面与检测像素仅在本机内存处理，不上传。`;host.dataset.theme=s.panelTheme==='auto'?(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'):s.panelTheme;showMetrics();for(const input of panel.querySelectorAll('[data-key]')){const key=input.dataset.key;if(key==='preset')continue;if(input.type==='checkbox')input.checked=s[key];else input.value=String(s[key]);if(input.type==='range')shadow.querySelector(`[data-for="${key}"]`).textContent=s[key]+input.dataset.unit;}preset.value=Object.keys(DACore.presets).find(k=>Object.entries(DACore.presets[k]).every(([key,v])=>s[key]===v))||'custom';launcher.hidden=!s.showButton;launcher.style.opacity=s.enabled?'1':'.65';}
    matchMedia('(prefers-color-scheme:light)').addEventListener('change',()=>{if(current.panelTheme==='auto')update(current);});
    update(initial);
    return{update,toggle,metrics:m=>{lastMetrics=m;if(!m){stats.hidden=true;return;}showMetrics();},status:text=>{if(status.textContent!==text)status.textContent=text;},diagnostics:text=>{if(diagnostics.textContent!==text)diagnostics.textContent=text;}};
  }
  globalThis.DAUI={create};
})();
