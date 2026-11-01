(() => {
  'use strict';
  // Multi-scale projection behind the page, not a screen-blended foreground veil.
  class Projector {
    constructor(host){
      this.host=host;this.raf=0;this.last=0;this.reset=true;this.running=false;this.frame=0;
      this.layers=[.35,.9,1.8].map((scale,i)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;canvas.className='da-projection';canvas.style.cssText='position:absolute;pointer-events:none;';host.append(canvas);return {canvas,ctx:canvas.getContext('2d',{alpha:false}),scale,weight:[.46,.28,.18][i]};});
    }
    configure(rect,s){
      this.settings=s;this.rect=rect;
      for(const layer of this.layers){
        const {canvas,scale,weight}=layer,dx=s.spread*s.stretchX/100*scale,dy=s.spread*s.stretchY/100*scale;
        canvas.style.left=(rect.left-dx)+'px';canvas.style.top=(rect.top-dy)+'px';canvas.style.width=(rect.width+dx*2)+'px';canvas.style.height=(rect.height+dy*2)+'px';
        canvas.style.opacity=String(weight);canvas.style.filter=`blur(${s.blur*(.55+scale*.5)}px) ${s.filterTarget!=='video'?`brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) hue-rotate(${s.hue}deg)`:''}`;
        // Always feather the physical projector edge, even when the user starts fade at 100%.
        const fade=Math.max(3,Math.min(35,(100-s.fadeStart)*.35+5)),stops=[];
        for(let i=0;i<=6;i++){const t=i/6;stops.push(`rgba(0,0,0,${Math.pow(t,1/s.fadeCurve).toFixed(3)}) ${(t*fade).toFixed(2)}%`);}
        const horizontal=`linear-gradient(to right,${stops.join(',')},#000 ${100-fade}%,transparent 100%)`,vertical=`linear-gradient(to bottom,${stops.join(',')},#000 ${100-fade}%,transparent 100%)`;
        canvas.style.maskImage=horizontal+','+vertical;canvas.style.maskComposite='intersect';
      }
    }
    update(source,video,reset=false){this.source=source;this.video=video;this.reset=this.reset||reset;this.expires=performance.now()+450;if(!this.raf){this.last=0;this.draw(performance.now());}}
    draw(now){
      this.raf=0;if(!this.source||!this.settings||document.hidden)return;
      const dt=this.last?Math.min(100,now-this.last):1000/60;this.last=now;
      let alpha=this.reset?1:DACore.frameAlpha(Math.max(this.settings.frameBlending?this.settings.smoothing:0,this.settings.flicker),dt);
      if(!this.reset&&this.settings.fadeTime)alpha=Math.min(alpha,1-Math.exp(-dt/this.settings.fadeTime));
      for(const l of this.layers){if(l.canvas.width!==this.source.width||l.canvas.height!==this.source.height){l.canvas.width=this.source.width;l.canvas.height=this.source.height;l.ctx.globalAlpha=1;}else l.ctx.globalAlpha=alpha;l.ctx.drawImage(this.source,0,0);}
      this.reset=false;this.frame++;this.host.dataset.presentationFrames=String(this.frame);
      if(!this.video?.paused||now<this.expires)this.raf=requestAnimationFrame(t=>this.draw(t));
    }
    stop(){cancelAnimationFrame(this.raf);this.raf=0;this.last=0;this.reset=true;}
    destroy(){this.stop();for(const l of this.layers)l.canvas.remove();}
  }
  globalThis.DAProjector={Projector};
})();
