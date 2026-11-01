(() => {
  'use strict';
  const own=e=>Boolean(e?.closest?.('[id^="douyin-ambilight"]'));
  const unique=a=>[...new Set(a.filter(e=>e&&!own(e)))];
  const q=(root,selectors)=>[...root.querySelectorAll(selectors)].filter(e=>!own(e));
  const rect=e=>e.getBoundingClientRect();
  const visible=e=>{const r=rect(e);return r.width>0&&r.height>0;};
  const fieldSelector='input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"],[role="textbox"],[role="searchbox"]';
  function mode(video){
    if(document.fullscreenElement)return 'fullscreen';
    if(video?.closest('.xgplayer-is-cssfullscreen,.xgplayer-cssfullscreen,[data-webfullscreen="true"]'))return 'theater';
    return 'normal';
  }
  function sampledAncestors(points,predicate){
    const result=[],seen=new Set();
    for(const [x,y] of points){
      for(const hit of document.elementsFromPoint(Math.max(1,Math.min(innerWidth-1,x)),Math.max(1,Math.min(innerHeight-1,y)))){
        if(own(hit))continue;
        for(let e=hit,n=0;e&&e!==document.body&&e!==document.documentElement&&n<10;e=e.parentElement,n++){if(seen.has(e))break;seen.add(e);if(!own(e)&&predicate(e,rect(e)))result.push(e);}
      }
    }
    return unique(result);
  }
  function outermost(nodes){return unique(nodes).filter(e=>!nodes.some(parent=>parent!==e&&parent.contains(e)));}
  class PageStyler{
    constructor(){this.ledger=new DANative.StyleLedger();this.signature='';this.scrollStyle=null;this.surfaceStyle=null;this.pseudoMarks=new Map();this.found={header:0,navigation:0,search:0,side:0,content:0,sending:0,controls:0,surfaces:0};}
    regions(video){
      const player=video?DANative.playerRoot(video):null,pr=player?rect(player):{left:innerWidth*.18,right:innerWidth*.76,bottom:innerHeight,width:innerWidth*.6};
      const header=q(document,'header,[role="banner"],#douyin-header,[data-e2e="douyin-header"]');
      const search=q(document,'[role="search"],[role="searchbox"],[data-e2e="searchbar"],[data-e2e="search-bar"],input[type="search"],input[placeholder*="搜索"]');
      const isSearch=(e,r)=>r.width>=180&&r.width<innerWidth*.88&&r.height>=24&&r.height<=110&&r.top>=-10&&r.top<160&&!e.contains(video)&&(e.matches('[role="search"],[role="searchbox"]')||e.querySelector(fieldSelector)||e.matches(fieldSelector)||((e.textContent||'').length<150&&/搜索/.test(e.textContent||'')));
      search.push(...sampledAncestors([.45,.65].flatMap(x=>[32,70].map(y=>[innerWidth*x,y])),isSearch));
      for(const input of unique(search)){
        let best=input;
        for(let p=input.parentElement,n=0;p&&!['BODY','HTML'].includes(p.tagName)&&n<7;p=p.parentElement,n++){
          const r=rect(p);
          if(isSearch(p,r))best=p;
          if(r.top>=-20&&r.top<160&&r.height<190&&r.width>innerWidth*.5)header.push(p);
        }
        search.push(best);
      }
      const isNavigation=(e,r)=>r.left>=-30&&r.left<Math.min(100,pr.left)&&r.width>=56&&r.width<=Math.min(360,innerWidth*.3)&&r.height>=innerHeight*.35&&r.top<200&&r.right<=pr.left+55&&!e.contains(video);
      const navigation=q(document,'#douyin-left-container,.douyin-left-container,[data-e2e="navigation"],[data-e2e="douyin-navigation"],[role="navigation"],nav,aside').filter(e=>isNavigation(e,rect(e)));
      navigation.push(...sampledAncestors([[24,innerHeight*.3],[72,innerHeight*.55],[24,innerHeight*.8],[120,innerHeight*.7]],isNavigation));
      const side=q(document,'aside,[data-e2e="comment-panel"],[data-e2e="comment-list"],[data-e2e="recommend-sidebar"],.comment-panel,.commentContainer').filter(e=>!isNavigation(e,rect(e)));
      if(video){let p=player;for(let level=0;level<4&&p?.parentElement;level++,p=p.parentElement)for(const sibling of p.parentElement.children){if(sibling===p||own(sibling))continue;const r=rect(sibling);if(r.width>=180&&r.width<900&&r.height>=250&&r.left>=pr.right-70)side.push(sibling);}}
      const content=q(document,'[data-e2e="video-desc"],[data-e2e="feed-video-desc"],[data-e2e="comment-list"],[data-e2e="comment-panel"],.video-info,.video-description,.comment-panel,main article');
      const sending=q(document,'.xgplayer-danmu-input,.xgplayer-danmu-input-container,[data-e2e="comment-input"],[data-e2e="danmaku-input"]');
      for(const input of q(document,'textarea,input[placeholder*="评论"],input[placeholder*="弹幕"],[contenteditable="true"][data-placeholder*="评论"],[contenteditable="true"][data-placeholder*="弹幕"]')){
        const ir=rect(input),maxWidth=Math.max(180,Math.min(900,ir.width*1.5+80));
        for(let p=input.parentElement,n=0;p&&p!==document.body&&n<5;p=p.parentElement,n++){
          const r=rect(p);if(p.matches('.xgplayer-controls,xg-controls,.xg-inner-controls')||r.height>140||r.width>maxWidth)break;
          if(r.height>=18&&r.width>=80)sending.push(p);
        }
      }
      const controls=player?q(player,'.xgplayer-controls,xg-controls,.xgplayer-controls-bottom,.xgplayer-control-bottom,.xg-inner-controls,[data-e2e="player-controls"],[data-e2e="video-controls"]'):[];
      if(player)controls.push(...sampledAncestors([[pr.left+pr.width*.35,Math.min(pr.bottom,innerHeight)-20],[pr.left+pr.width*.7,Math.min(pr.bottom,innerHeight)-20]],(e,r)=>r.width>=pr.width*.55&&r.height>=20&&r.height<=120&&r.bottom>=Math.min(pr.bottom,innerHeight)-100&&player.contains(e)&&!e.contains(video)&&(e.querySelector('button,[role="button"],[role="slider"],input')||/倍速|全屏|清屏/.test((e.textContent||'').slice(0,200)))));
      return{header:unique(header).filter(visible),navigation:outermost(navigation).filter(visible),search:outermost(search).filter(visible),side:unique(side).filter(visible),content:unique(content).filter(visible),sending:unique(sending).filter(visible),controls:unique(controls).filter(visible)};
    }
    planes(region,kind){
      const rr=rect(region),small=kind==='search'||kind==='sending'||kind==='controls';
      const nodes=[region];
      for(const e of q(region,'div,section,main,nav,ul,ol,form,xg-inner-controls,xg-left-grid,xg-right-grid').slice(0,450)){
        const r=rect(e);if(!r.width||!r.height||e.matches('[role="button"],button'))continue;
        if(small){if(r.width>=Math.min(140,rr.width*.55)&&r.height>=18&&r.height<=120&&!e.querySelector('video,img,canvas'))nodes.push(e);}
        else if(r.width>=Math.max(kind==='navigation'?40:110,rr.width*.5)&&r.height>=90)nodes.push(e);
      }
      return unique(nodes);
    }
    restoreMarks(removeStyle=true){for(const [e,attrs]of this.pseudoMarks)for(const [attr,value]of attrs){if(value===null)e.removeAttribute(attr);else e.setAttribute(attr,value);}this.pseudoMarks.clear();if(removeStyle){this.surfaceStyle?.remove();this.surfaceStyle=null;}}
    softenPseudo(e){
      for(const side of ['before','after']){
        const ps=getComputedStyle(e,'::'+side),w=parseFloat(ps.width),h=parseFloat(ps.height);
        if(ps.content==='none'||(ps.backgroundImage==='none'&&/^(transparent|rgba\(0, 0, 0, 0\))$/.test(ps.backgroundColor)))continue;
        if(!(w>=80&&h>=16))continue; // Do not erase icon-sized pseudo-elements.
        const attr='data-da-surface-'+side;if(!this.pseudoMarks.has(e))this.pseudoMarks.set(e,new Map());this.pseudoMarks.get(e).set(attr,e.getAttribute(attr));e.setAttribute(attr,'clear');
        if(!this.surfaceStyle){this.surfaceStyle=document.createElement('style');this.surfaceStyle.id='douyin-ambilight-surface-style';this.surfaceStyle.textContent='[data-da-surface-before="clear"]::before,[data-da-surface-after="clear"]::after{background-color:transparent!important;background-image:none!important;box-shadow:none!important;border-color:transparent!important;backdrop-filter:none!important}';document.documentElement.append(this.surfaceStyle);}
      }
    }
    update(video,s,enabled=true){
      if(!enabled){this.clear();return;}
      const regions=this.regions(video),groups=Object.fromEntries(Object.entries(regions).map(([kind,items])=>[kind,unique(items.flatMap(e=>this.planes(e,kind)))]));
      const nodes=unique([...Object.values(groups).flat(),...regions.search.flatMap(e=>q(e,fieldSelector)),...regions.sending.flatMap(e=>q(e,fieldSelector))]);
      if(video)for(let p=video.parentElement;p&&p!==document.body;p=p.parentElement)nodes.push(p);
      const geometry=Object.values(regions).flat().map(e=>{const r=rect(e);return[r.x,r.y,r.width,r.height].map(Math.round).join(',');}).join('|');
      const signature=JSON.stringify(s)+'|'+geometry+'|'+mode(video);
      if(signature===this.signature&&nodes.length===this.nodes?.length&&nodes.every((e,i)=>e===this.nodes[i]))return;
      this.ledger.clear();this.restoreMarks(false);this.signature=signature;this.nodes=nodes;
      const write=(e,k,v)=>this.ledger.set(e,k,v),backgrounds=new Map(),surfaces=new Set();
      if(video&&document.body){write(document.body,'isolation','isolate');if(!s.customPageBackground)write(document.body,'background-color','#101116');}
      const fill=(e,opacity)=>{if(opacity>=100)return;if(!backgrounds.has(e))backgrounds.set(e,getComputedStyle(e).backgroundColor);write(e,'background-color',`color-mix(in srgb, ${backgrounds.get(e)} ${opacity}%, transparent)`);write(e,'background-image','none');surfaces.add(e);if(opacity===0){write(e,'border-color','transparent');write(e,'box-shadow','none');write(e,'backdrop-filter','none');this.softenPseudo(e);}};
      if(video)for(let p=video.parentElement;p&&p!==document.body;p=p.parentElement){write(p,'background-color','transparent');write(p,'background-image','none');surfaces.add(p);}
      const applyGroup=(key,opacity)=>{for(const e of groups[key])fill(e,opacity);};
      applyGroup('header',s.immersiveHeader?0:s.headerFillOpacity);
      if(s.immersiveHeader)applyGroup('search',0);
      for(const e of regions.header){if(s.hideHeaderTheater&&mode(video)!=='normal')write(e,'visibility','hidden');if(s.headerShadow&&s.headerShadowOpacity)write(e,'box-shadow',`0 0 ${s.headerShadow}px rgba(0,0,0,${s.headerShadowOpacity/100})`);if(s.headerImagesOpacity<100)for(const image of q(e,'img,svg'))write(image,'opacity',String(s.headerImagesOpacity/100));}
      if(s.immersiveHeader)for(const root of regions.search)for(const field of unique([root,...q(root,fieldSelector)]))if(field.matches(fieldSelector)){fill(field,0);write(field,'text-shadow','0 1px 3px rgba(0,0,0,.6)');}
      if(s.transparentNavigation)applyGroup('navigation',0);
      for(const [key,transparent]of [['side',s.transparentSidePanels],['content',s.transparentPageContent],['sending',s.transparentSendingBar]]){
        applyGroup(key,transparent?0:s.contentFillOpacity);
        for(const e of regions[key]){
          if(key==='sending')for(const input of q(e,fieldSelector))fill(input,transparent?0:s.contentFillOpacity);
          if(s.contentShadow&&s.contentShadowOpacity){const shadow=`0 0 ${s.contentShadow}px rgba(0,0,0,${s.contentShadowOpacity/100})`;write(e,'text-shadow',shadow);if(!s.contentTextOnly)write(e,'box-shadow',shadow);}
          if(s.contentImagesOpacity<100)for(const image of q(e,'img'))if(!video?.parentElement?.contains(image))write(image,'opacity',String(s.contentImagesOpacity/100));
        }
      }
      if(s.transparentControls){applyGroup('controls',0);for(const e of regions.controls)write(e,'text-shadow','0 1px 3px rgba(0,0,0,.85)');}
      if(s.customPageBackground&&document.body){const n=Math.round(s.pageGray/100*255);write(document.body,'background-color',`rgb(${n}, ${n}, ${n})`);}
      if(s.hideScrollbar){write(document.documentElement,'scrollbar-width','none');if(!this.scrollStyle){this.scrollStyle=document.createElement('style');this.scrollStyle.id='douyin-ambilight-scroll-style';this.scrollStyle.textContent='html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';document.documentElement.append(this.scrollStyle);}}
      else{this.scrollStyle?.remove();this.scrollStyle=null;}
      if(!this.pseudoMarks.size){this.surfaceStyle?.remove();this.surfaceStyle=null;}
      this.found={...Object.fromEntries(Object.entries(regions).map(([k,v])=>[k,v.length])),surfaces:surfaces.size};
    }
    clear(){this.ledger.clear();this.restoreMarks();this.scrollStyle?.remove();this.scrollStyle=null;this.signature='';this.nodes=[];this.found={header:0,navigation:0,search:0,side:0,content:0,sending:0,controls:0,surfaces:0};}
  }
  globalThis.DAPage={PageStyler,mode};
})();
