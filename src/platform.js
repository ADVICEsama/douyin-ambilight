(() => {
  'use strict';
  const key = 'douyin-ambilight-settings-v1';
  const gm = typeof GM_getValue === 'function';
  const api = gm ? null : (globalThis.browser || globalThis.chrome);
  const listeners = new Set();
  async function readMigrated(raw) {
    if(raw&&typeof raw==='object'&&raw.layoutVersion!==3){
      const backup=key+'-before-layout-v3';
      if(gm)await GM_setValue(backup,raw);else await api.storage.local.set({[backup]:raw});
      raw={...raw,layoutVersion:3,blend:'normal',cropVideo:true,removeLetterbox:true,autoH:true,videoShadow:48,videoShadowOpacity:65,immersiveHeader:true,transparentSidePanels:true,transparentPageContent:true,transparentSendingBar:true};
      if(raw.fps===24)raw.fps=60;
      const value=DACore.normalize(raw);
      if(gm)await GM_setValue(key,value);else await api.storage.local.set({[key]:value});
      return value;
    }
    return DACore.normalize(raw);
  }
  const emit = (value) => { for (const fn of listeners) fn(DACore.normalize(value)); };
  if (gm && typeof GM_addValueChangeListener === 'function') {
    GM_addValueChangeListener(key, (_name, _old, value, remote) => { if (remote) emit(value); });
  } else if (api?.storage?.onChanged) {
    api.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[key]) emit(changes[key].newValue); });
  }
  globalThis.DAPlatform = {
    async get() {
      if (gm) return readMigrated(await GM_getValue(key, null));
      if (!api?.storage) throw new Error('无法访问扩展存储，请重新载入扩展');
      return readMigrated((await api.storage.local.get(key))[key]);
    },
    async set(value) {
      const s = DACore.normalize(value);
      if (gm) { await GM_setValue(key, s); emit(s); }
      else await api.storage.local.set({ [key]: s });
      return s;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    menu(fn) { if (gm && typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('抖音环境光 · 设置', fn); },
    api
  };
})();
