(() => {
  'use strict';
  // Only properties written by this instance are restored. Site changes win.
  class StyleLedger {
    constructor() { this.entries = new Map(); }
    set(el, property, value) {
      if (!this.entries.has(el)) this.entries.set(el, new Map());
      const props = this.entries.get(el);
      if (!props.has(property)) props.set(property, { value: el.style.getPropertyValue(property), priority: el.style.getPropertyPriority(property), written: null });
      const record = props.get(property);
      if(record.written!==null&&(el.style.getPropertyValue(property)!==record.written||el.style.getPropertyPriority(property)!=='important')){record.value=el.style.getPropertyValue(property);record.priority=el.style.getPropertyPriority(property);}
      if (el.style.getPropertyValue(property) !== value || el.style.getPropertyPriority(property) !== 'important') el.style.setProperty(property, value, 'important');
      record.written = el.style.getPropertyValue(property);
    }
    restore(el,only) {
      const props = this.entries.get(el); if (!props) return;
      for (const [key, r] of props){if(only&&key!==only)continue;if (el.style.getPropertyValue(key) === r.written && el.style.getPropertyPriority(key) === 'important') {
        if (r.value) el.style.setProperty(key, r.value, r.priority); else el.style.removeProperty(key);
      }props.delete(key);}
      if(!props.size)this.entries.delete(el);
    }
    clear() { for (const el of [...this.entries.keys()]) this.restore(el); }
  }
  function playerRoot(video) {
    const known = video.closest('.xgplayer, .douyin-player') || video.closest('[data-e2e="feed-active-video"], [data-e2e="video-player"], .xg-video-container');
    if (known) return known;
    let p = video.parentElement;
    for (let i = 0; i < 2 && p?.parentElement && !['BODY', 'HTML'].includes(p.parentElement.tagName); i++) p = p.parentElement;
    return p;
  }
  class NativeBackground {
    constructor() { this.ledger = new StyleLedger(); this.video = null; this.pseudos=new Map();this.style=null; }
    clearPseudo(){for(const [el,attrs]of this.pseudos)for(const [key,value]of attrs){if(value===null)el.removeAttribute(key);else el.setAttribute(key,value);}this.pseudos.clear();this.style?.remove();this.style=null;}
    update(video, enabled) {
      if (video !== this.video) { this.ledger.clear();this.clearPseudo(); this.video = video; }
      if (!enabled || !video) { this.ledger.clear();this.clearPseudo(); return 0; }
      const root = playerRoot(video); if (!root) return 0;
      const box = video.getBoundingClientRect(), keep = new Set(),seenPseudos=new Map();
      // Confirmed upstream xgplayer selector + conservative local blur heuristic.
      for (const el of [root,...root.querySelectorAll('*')].slice(0, 500)) {
        const known = el.matches('.xgplayer-dynamic-bg');
        if (el === video || el.closest('[id^="douyin-ambilight"]')) continue;
        const er=el.getBoundingClientRect();
        // CSS pseudo backgrounds were absent from the old element-only detector.
        if(er.width*er.height>=box.width*box.height*.3)for(const pseudo of ['before','after']){
          const ps=getComputedStyle(el,'::'+pseudo);
          if(ps.backgroundImage!=='none'&&(/blur\(/.test(ps.filter)||ps.backgroundSize==='cover')&&ps.content!=='none'){
            const attr='data-da-native-'+pseudo;if(!this.pseudos.has(el))this.pseudos.set(el,new Map());if(!this.pseudos.get(el).has(attr))this.pseudos.get(el).set(attr,el.getAttribute(attr));el.setAttribute(attr,'hidden');
            if(!seenPseudos.has(el))seenPseudos.set(el,new Set());seenPseudos.get(el).add(attr);
            if(!this.style){this.style=document.createElement('style');this.style.id='douyin-ambilight-native-style';this.style.textContent='[data-da-native-before="hidden"]::before,[data-da-native-after="hidden"]::after{visibility:hidden!important}';document.documentElement.append(this.style);}
          }
        }
        if (el.contains(video) || (!known && el.querySelector('video'))) continue;
        const named = /(?:^|[-_\s])(blur|background|bg)(?:[-_\s]|$)/i.test(String(el.className));
        const style = getComputedStyle(el), blur = /blur\(\s*([\d.]+)px\s*\)/.exec(style.filter);
        const media = /^(IMG|CANVAS)$/.test(el.tagName) || style.backgroundImage !== 'none' || el.querySelector('canvas,img');
        const rect = el.getBoundingClientRect();
        const large = rect.width * rect.height >= box.width * box.height * .3;
        const noControls = !el.querySelector('button,input,a,[role="button"],.xgplayer-controls') && !el.matches('button,input,a,[role="button"]');
        const beforeVideo=Boolean(el.compareDocumentPosition(video)&Node.DOCUMENT_POSITION_FOLLOWING);
        const z=Number.parseInt(style.zIndex)||0,vz=Number.parseInt(getComputedStyle(video).zIndex)||0,behind=z<=vz;
        const aligned=rect.left<=box.left+20&&rect.top<=box.top+20&&rect.right>=box.right-20&&rect.bottom>=box.bottom-20;
        // Background canvases may already be blurred internally (no CSS filter).
        const backgroundPlane=large&&aligned&&(beforeVideo||z<vz)&&behind&&/absolute|fixed/.test(style.position)&&noControls&&!el.textContent.trim()&&(/^(CANVAS|IMG|VIDEO)$/.test(el.tagName)||style.backgroundImage!=='none');
        if (known || backgroundPlane || (large && media && noControls && blur && Number(blur[1]) >= 8) || (large && named && media && noControls && blur)) keep.add(el);
      }
      for (const el of [...this.ledger.entries.keys()]) if (!keep.has(el)) this.ledger.restore(el);
      for (const el of keep) this.ledger.set(el, 'visibility', 'hidden');
      for(const [el,attrs]of this.pseudos){for(const [attr,value]of attrs)if(!seenPseudos.get(el)?.has(attr)){if(value===null)el.removeAttribute(attr);else el.setAttribute(attr,value);attrs.delete(attr);}if(!attrs.size)this.pseudos.delete(el);}
      if(!this.pseudos.size){this.style?.remove();this.style=null;}
      return keep.size+[...this.pseudos.values()].reduce((n,m)=>n+m.size,0);
    }
    clear() { this.ledger.clear();this.clearPseudo(); this.video = null; }
  }
  globalThis.DANative = { StyleLedger, NativeBackground, playerRoot };
})();
