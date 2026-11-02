(() => {
  'use strict';
  const own=e=>Boolean(e?.closest?.('[id^="douyin-ambilight"]'));
  const unique=a=>[...new Set(a.filter(e=>e&&!own(e)))];
  const q=(root,selectors)=>[...root.querySelectorAll(selectors)].filter(e=>!own(e));
  const rect=e=>e.getBoundingClientRect();
  const visible=e=>{const r=rect(e);return r.width>0&&r.height>0;};
  const fieldSelector='input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"],[role="textbox"],[role="searchbox"]';
  const dialogSelector='dialog,[role="dialog"],[aria-modal="true"]';
  const isSearchPage=()=>/^\/search(?:\/|$)/.test(location.pathname);
  // Search results remain mounted underneath the video detail portal. Never
  // turn that portal into a window through to the result cards.
  function modalRoot(video){
    if(!video||document.fullscreenElement||mode(video)!=='normal')return null;
    const semantic=video.closest(dialogSelector);
    if(semantic)return semantic;
    const routeModal=new URLSearchParams(location.search).has('modal_id');
    let namedRoot=null;
    for(let p=video.parentElement;p&&p!==document.body;p=p.parentElement){
      const s=getComputedStyle(p),r=rect(p),named=/modal|dialog|overlay/i.test(p.id+' '+String(p.className));
      if(r.width<innerWidth*.55||r.height<innerHeight*.55)continue;
      if(s.position==='fixed'&&(named||routeModal||(isSearchPage()&&(Number.parseInt(s.zIndex)||0)>0)))return p;
      if(!namedRoot&&named&&s.position==='absolute')namedRoot=p;
    }
    return namedRoot;
  }
  class ModalStage{
    constructor(nodes,ui){
      this.nodes=nodes;this.ui=ui;this.root=null;this.ledger=new DANative.StyleLedger();
      this.hosts=[-1,2147483000].map((z,i)=>{
        const host=document.createElement('div'),coordinates=document.createElement('div');
        host.id='douyin-ambilight-modal-'+(i?'ui':'backdrop');
        host.style.cssText=`all:initial;position:absolute;inset:0;display:block;pointer-events:none;isolation:isolate;z-index:${z};overflow:${i?'visible':'hidden'};`;
        coordinates.style.cssText='all:initial;position:absolute;display:block;pointer-events:none;transform-origin:0 0;';
        host.append(coordinates);return{host,coordinates};
      });
    }
    place(root,fallback,s){
      if(root!==this.root){this.ledger.clear();for(const {host}of this.hosts)host.remove();this.root=root;}
      if(!root){for(const n of [...this.nodes,this.ui])if(n.parentNode!==fallback)fallback.append(n);return;}
      this.ledger.set(root,'isolation','isolate');
      if(getComputedStyle(root).position==='static')this.ledger.set(root,'position','relative');
      for(const [i,{host,coordinates}]of this.hosts.entries()){
        if(host.parentNode!==root)root.prepend(host);
        for(const n of i?[this.ui]:this.nodes)if(n.parentNode!==coordinates)coordinates.append(n);
        // The site's portal may be translated/scaled. Keep all projector,
        // picture-hole, shadow and settings coordinates in viewport pixels.
        const r=rect(host),sx=r.width/host.offsetWidth||1,sy=r.height/host.offsetHeight||1;
        coordinates.style.left=(-r.left/sx)+'px';coordinates.style.top=(-r.top/sy)+'px';
        coordinates.style.width=innerWidth+'px';coordinates.style.height=innerHeight+'px';
        coordinates.style.transform=`scale(${1/sx},${1/sy})`;
        if(!i){const n=Math.round(s.pageGray/100*255);host.style.backgroundColor=s.customPageBackground?`rgb(${n},${n},${n})`:'#101116';}
      }
    }
    clear(){this.ledger.clear();for(const {host}of this.hosts)host.remove();this.root=null;}
  }
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
  // Douyin also paints a fixed, empty sibling of the content tree. Clearing
  // video ancestors cannot reveal a negative-z projector behind that sibling.
  function shellPlanes(video,scope){
    const found=[],seen=new Set();
    for(let branch=video,n=0;branch?.parentElement&&branch.parentElement!==document.documentElement&&n<22;branch=branch.parentElement,n++){
      if(branch===scope)break;
      for(const e of branch.parentElement.children){
        if(e===branch||seen.has(e)||own(e))continue;seen.add(e);
        if(!e.matches('div,section')||e.contains(video)||e.textContent.trim()||(e.closest(dialogSelector)&&e.closest(dialogSelector)!==scope))continue;
        if(e.querySelector('video,img,canvas,svg,iframe,input,textarea,button,a,select,[role="button"],[role="dialog"],[contenteditable="true"]'))continue;
        const r=rect(e),s=getComputedStyle(e),z=Number.parseInt(s.zIndex)||0;
        if(r.width<innerWidth*.85||r.height<innerHeight*.75||!/(absolute|fixed)/.test(s.position)||z>0)continue;
        // Before the foreground in DOM order, rather than a newly opened veil.
        if(!(e.compareDocumentPosition(video)&Node.DOCUMENT_POSITION_FOLLOWING))continue;
        found.push(e);
      }
    }
    return outermost(found);
  }
  class PageStyler{
    constructor(){this.ledger=new DANative.StyleLedger();this.signature='';this.scrollStyle=null;this.surfaceStyle=null;this.pseudoMarks=new Map();this.found={shell:0,header:0,navigation:0,search:0,side:0,content:0,sending:0,controls:0,surfaces:0};}
    regions(video){
      const modal=modalRoot(video),scope=modal||document,within=e=>(!modal||modal.contains(e))&&(!e.closest(dialogSelector)||e.closest(dialogSelector)===modal);
      const player=video?DANative.playerRoot(video):null,pr=player?rect(player):{left:innerWidth*.18,right:innerWidth*.76,bottom:innerHeight,width:innerWidth*.6};
      const header=q(scope,'header,[role="banner"],#douyin-header,[data-e2e="douyin-header"]');
      const search=q(scope,'[role="search"],[role="searchbox"],[data-e2e="searchbar"],[data-e2e="search-bar"],input[type="search"],input[placeholder*="搜索"]');
      const isSearch=(e,r)=>r.width>=180&&r.width<innerWidth*.88&&r.height>=24&&r.height<=110&&r.top>=-10&&r.top<160&&!e.contains(video)&&(e.matches('[role="search"],[role="searchbox"]')||e.querySelector(fieldSelector)||e.matches(fieldSelector)||((e.textContent||'').length<150&&/搜索/.test(e.textContent||'')));
      search.push(...sampledAncestors([.45,.65].flatMap(x=>[32,70].map(y=>[innerWidth*x,y])),isSearch).filter(within));
      for(const input of unique(search)){
        let best=input;
        for(let p=input.parentElement,n=0;p&&!['BODY','HTML'].includes(p.tagName)&&n<7&&within(p);p=p.parentElement,n++){
          const r=rect(p);
          if(isSearch(p,r))best=p;
          if(r.top>=-20&&r.top<160&&r.height<190&&r.width>innerWidth*.5)header.push(p);
        }
        search.push(best);
      }
      const isNavigation=(e,r)=>r.left>=-30&&r.left<Math.min(100,pr.left)&&r.width>=56&&r.width<=Math.min(360,innerWidth*.3)&&r.height>=innerHeight*.35&&r.top<200&&r.right<=pr.left+55&&!e.contains(video);
      const navigation=q(scope,'#douyin-navigation,#douyin-left-container,.douyin-left-container,[data-e2e="navigation"],[data-e2e="douyin-navigation"],[role="navigation"],nav,aside').filter(e=>isNavigation(e,rect(e)));
      navigation.push(...sampledAncestors([[24,innerHeight*.3],[72,innerHeight*.55],[24,innerHeight*.8],[120,innerHeight*.7]],isNavigation).filter(within));
      const isSide=(e,r)=>!e.contains(video)&&!isNavigation(e,r)&&r.width>=180&&r.width<900&&r.height>=Math.min(250,innerHeight*.4)&&r.left>=pr.right-100&&r.left<innerWidth&&r.right>0&&r.top<innerHeight&&r.bottom>0;
      const side=q(scope,'#videoSideCard,#relatedVideoCard,#merge-all-comment-container,aside,[data-e2e="comment-panel"],[data-e2e="comment-list"],[data-e2e="recommend-sidebar"],.comment-panel,.commentContainer').filter(e=>isSide(e,rect(e)));
      if(video){
        const slide=video.closest('.sliderVideo,[id="sliderVideo"],[data-e2e="feed-active-video"],.dySwiperSlide');
        // The live xgplayer may be inserted five or more wrappers below the
        // card. Never assume that its fourth ancestor owns the comments.
        for(let p=player,level=0;p?.parentElement&&p!==document.body&&level<12&&p!==modal;level++,p=p.parentElement){
          for(const sibling of p.parentElement.children)if(sibling!==p&&!own(sibling)&&isSide(sibling,rect(sibling)))side.push(sibling);
          if(p.parentElement===slide)break;
        }
      }
      const content=q(scope,'[data-e2e="video-desc"],[data-e2e="feed-video-desc"],[data-e2e="comment-list"],[data-e2e="comment-panel"],.video-info,.video-description,.comment-panel,main article');
      // The unfocused Douyin editor is a DIV placeholder, not a textarea or
      // contenteditable yet. Its semantic shell exists before the first click.
      const sending=q(scope,'.comment-input-container,.comment-input-inner-container,.xgplayer-danmu-input,.xgplayer-danmu-input-container,[data-e2e="comment-input"],[data-e2e="danmaku-input"]');
      const fields=unique([...q(scope,'textarea,input[placeholder*="评论"],input[placeholder*="弹幕"],[contenteditable="true"][data-placeholder*="评论"],[contenteditable="true"][data-placeholder*="弹幕"]'),...side.flatMap(e=>q(e,fieldSelector))]);
      for(const input of fields){
        const ir=rect(input),maxWidth=Math.max(180,Math.min(900,ir.width*1.5+80));
        if(!ir.width||!ir.height)continue;
        for(let p=input.parentElement,n=0;p&&p!==document.body&&n<5&&within(p);p=p.parentElement,n++){
          const r=rect(p);if(p.matches('.xgplayer-controls,xg-controls,.xg-inner-controls')||r.height>140||r.width>maxWidth)break;
          if(r.height>=18&&r.width>=80)sending.push(p);
        }
      }
      const controls=player?q(player,'.xgplayer-controls,xg-controls,.xgplayer-controls-bottom,.xgplayer-control-bottom,.xg-inner-controls,[data-e2e="player-controls"],[data-e2e="video-controls"]'):[];
      if(player)controls.push(...sampledAncestors([[pr.left+pr.width*.35,Math.min(pr.bottom,innerHeight)-20],[pr.left+pr.width*.7,Math.min(pr.bottom,innerHeight)-20]],(e,r)=>r.width>=pr.width*.55&&r.height>=20&&r.height<=120&&r.bottom>=Math.min(pr.bottom,innerHeight)-100&&player.contains(e)&&!e.contains(video)&&(e.querySelector('button,[role="button"],[role="slider"],input')||/倍速|全屏|清屏/.test((e.textContent||'').slice(0,200)))));
      return{shell:video?shellPlanes(video,modal):[],header:unique(header).filter(visible).filter(within),navigation:outermost(navigation).filter(visible).filter(within),search:outermost(search).filter(visible).filter(within),side:outermost(side).filter(visible).filter(within),content:unique(content).filter(visible).filter(within),sending:unique(sending).filter(visible).filter(within),controls:unique(controls).filter(visible).filter(within)};
    }
    planes(region,kind,editors=[],modal=null){
      const rr=rect(region),small=kind==='search'||kind==='sending'||kind==='controls';
      const nodes=[region];
      for(const e of q(region,'div,section,main,nav,ul,ol,form,xg-inner-controls,xg-left-grid,xg-right-grid').slice(0,450)){
        const r=rect(e);if(!r.width||!r.height||e.matches('[role="button"],[role="tab"],button')||(e.closest(dialogSelector)&&e.closest(dialogSelector)!==modal))continue;
        if(kind==='side'&&editors.some(p=>p===e||p.contains(e)))continue;
        if(small){if(r.width>=Math.min(140,rr.width*.55)&&r.height>=18&&r.height<=120&&!e.querySelector('video,img,canvas'))nodes.push(e);}
        else if(r.width>=Math.max(kind==='navigation'?40:110,rr.width*.5)&&r.height>=90)nodes.push(e);
        else if(kind==='side'&&r.width>=rr.width*.75&&r.height>=18&&r.height<=100&&r.top>=rr.top-1&&r.bottom<=rr.bottom+1&&(r.top<rr.top+90||r.bottom>rr.bottom-110)&&!e.querySelector('video,img,canvas'))nodes.push(e);
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
      if(!enabled||!video){this.clear();return;}
      const modal=modalRoot(video),regions=this.regions(video),groups=Object.fromEntries(Object.entries(regions).map(([kind,items])=>[kind,unique(items.flatMap(e=>this.planes(e,kind,regions.sending,modal)))]));
      const nodes=unique([...Object.values(groups).flat(),...regions.search.flatMap(e=>q(e,fieldSelector)),...regions.sending.flatMap(e=>q(e,fieldSelector))]);
      if(video)for(let p=video.parentElement;p&&p!==document.body;p=p===modal?null:p.parentElement)nodes.push(p);
      const geometry=Object.values(regions).flat().map(e=>{const r=rect(e);return[r.x,r.y,r.width,r.height].map(Math.round).join(',');}).join('|');
      const signature=JSON.stringify(s)+'|'+geometry+'|'+mode(video);
      const intact=[...this.ledger.entries].every(([e,props])=>[...props].every(([key,r])=>e.style.getPropertyValue(key)===r.written&&e.style.getPropertyPriority(key)==='important'));
      if(signature===this.signature&&nodes.length===this.nodes?.length&&nodes.every((e,i)=>e===this.nodes[i])&&intact)return;
      this.ledger.clear();this.restoreMarks(false);this.signature=signature;this.nodes=nodes;
      const write=(e,k,v)=>this.ledger.set(e,k,v),backgrounds=new Map(),surfaces=new Set();
      if(video&&!modal&&document.body){write(document.body,'isolation','isolate');if(!s.customPageBackground)write(document.body,'background-color','#101116');}
      const fill=(e,opacity)=>{if(opacity>=100)return;if(!backgrounds.has(e))backgrounds.set(e,getComputedStyle(e).backgroundColor);write(e,'background-color',`color-mix(in srgb, ${backgrounds.get(e)} ${opacity}%, transparent)`);write(e,'background-image','none');surfaces.add(e);if(opacity===0){write(e,'border-color','transparent');write(e,'box-shadow','none');write(e,'backdrop-filter','none');this.softenPseudo(e);}};
      if(video)for(let p=video.parentElement;p&&p!==document.body;p=p===modal?null:p.parentElement){write(p,'background-color','transparent');write(p,'background-image','none');surfaces.add(p);}
      const applyGroup=(key,opacity)=>{for(const e of groups[key])fill(e,opacity);};
      if(s.transparentShell)applyGroup('shell',0);
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
      if(s.customPageBackground&&!modal&&document.body){const n=Math.round(s.pageGray/100*255);write(document.body,'background-color',`rgb(${n}, ${n}, ${n})`);}
      if(s.hideScrollbar){write(document.documentElement,'scrollbar-width','none');if(!this.scrollStyle){this.scrollStyle=document.createElement('style');this.scrollStyle.id='douyin-ambilight-scroll-style';this.scrollStyle.textContent='html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';document.documentElement.append(this.scrollStyle);}}
      else{this.scrollStyle?.remove();this.scrollStyle=null;}
      if(!this.pseudoMarks.size){this.surfaceStyle?.remove();this.surfaceStyle=null;}
      this.found={...Object.fromEntries(Object.entries(regions).map(([k,v])=>[k,v.length])),surfaces:surfaces.size};
    }
    clear(){this.ledger.clear();this.restoreMarks();this.scrollStyle?.remove();this.scrollStyle=null;this.signature='';this.nodes=[];this.found={shell:0,header:0,navigation:0,search:0,side:0,content:0,sending:0,controls:0,surfaces:0};}
  }
  globalThis.DAPage={PageStyler,ModalStage,modalRoot,isSearchPage,mode};
})();
