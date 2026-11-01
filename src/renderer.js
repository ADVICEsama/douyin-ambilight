(() => {
  'use strict';
  class Renderer {
    constructor(canvas, mode='canvas') {
      this.canvas=canvas;this.mode=mode;this.reason='';
      if(mode==='webgl'){
        try{this.initGL();return;}catch{this.reason='WebGL 不可用，已回退 Canvas2D';this.canvas=document.createElement('canvas');this.mode='canvas';}
      }
      this.ctx=this.canvas.getContext('2d',{alpha:false});
      if(!this.ctx)throw new Error('Canvas2D 不可用');
    }
    initGL(){
      const gl=this.canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});if(!gl)throw new Error('WebGL2 unavailable');this.gl=gl;
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('shader');return s;};
      const vs=shader(gl.VERTEX_SHADER,'#version 300 es\nin vec2 p;out vec2 uv;void main(){gl_Position=vec4(p,0.,1.);uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);}');
      const fs=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision mediump float;in vec2 uv;uniform sampler2D image;uniform vec4 crop;uniform float alpha;out vec4 color;void main(){color=vec4(texture(image,crop.xy+uv*crop.zw).rgb,alpha);}');
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('link');gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);this.program=program;
      this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
      this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      this.cropUniform=gl.getUniformLocation(program,'crop');this.alphaUniform=gl.getUniformLocation(program,'alpha');gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    }
    clear(){if(this.gl){this.gl.clearColor(0,0,0,1);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}else this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
    draw(video,crop,alpha){
      if(this.gl){const g=this.gl;if(g.isContextLost())throw new Error('WebGL context lost');g.viewport(0,0,this.canvas.width,this.canvas.height);g.useProgram(this.program);g.bindTexture(g.TEXTURE_2D,this.texture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,video);g.uniform4f(this.cropUniform,crop.left,crop.top,1-crop.left-crop.right,1-crop.top-crop.bottom);g.uniform1f(this.alphaUniform,alpha);g.drawArrays(g.TRIANGLE_STRIP,0,4);return;}
      const w=video.videoWidth,h=video.videoHeight;this.ctx.globalAlpha=alpha;this.ctx.drawImage(video,w*crop.left,h*crop.top,w*(1-crop.left-crop.right),h*(1-crop.top-crop.bottom),0,0,this.canvas.width,this.canvas.height);
    }
    destroy(){if(this.gl){const g=this.gl;g.deleteTexture(this.texture);g.deleteBuffer(this.buffer);g.deleteProgram(this.program);}}
  }
  globalThis.DARenderer={Renderer};
})();
