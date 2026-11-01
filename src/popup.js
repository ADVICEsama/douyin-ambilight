(() => {
  'use strict';
  let settings = { ...DACore.defaults }, writes = Promise.resolve();
  const ui = DAUI.create(document.getElementById('settings'), settings, patch => {
    settings = DACore.normalize({ ...settings, ...patch }); ui.update(settings);
    const snapshot = { ...settings };
    writes = writes.catch(() => {}).then(() => DAPlatform.set(snapshot)).catch(() => ui.status('保存失败，请重新载入扩展。'));
  }, false);
  DAPlatform.subscribe(value => { settings = value; ui.update(value); });
  DAPlatform.get().then(value => { settings = value; ui.update(value); }).catch(() => ui.status('无法读取设置'));
  const api = DAPlatform.api;
  api.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
    const tab = tabs[0];
    if (!tab?.id) { ui.status('打开抖音网页版后自动生效'); return; }
    try { const result = await api.tabs.sendMessage(tab.id, { type: 'douyin-ambilight-status' }); ui.status(result?.status || '等待播放器…'); if (result?.diagnostics) ui.diagnostics(result.diagnostics); }
    catch { ui.status('请打开或刷新抖音网页以载入环境光'); }
  }).catch(() => ui.status('请在抖音网页使用页面设置按钮'));
})();
