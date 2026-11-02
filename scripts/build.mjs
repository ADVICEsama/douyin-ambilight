import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { zipSync } from 'fflate';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const out = process.env.DA_OUTPUT ? path.resolve(process.env.DA_OUTPUT) : path.resolve(root, '../../outputs');
if(path.resolve(out)===path.resolve(root))throw new Error('Output directory must not be the source root.');
await mkdir(out, { recursive: true });
const scripts = ['core.js', 'platform.js', 'native.js', 'renderer.js', 'projector.js', 'page.js', 'ui.js', 'content.js'];
const matches = ['https://www.douyin.com/*', 'https://douyin.com/*'];
const manifest = {
  manifest_version: 3,
  name: '抖音环境光', version: pkg.version,
  description: '在抖音网页版视频周围显示随画面变化的柔和环境光。独立轻量实现，非官方。',
  permissions: ['storage'],
  icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  action: { default_title: '抖音环境光', default_popup: 'popup.html', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
  content_scripts: [{ matches, js: scripts, run_at: 'document_idle', all_frames: false }],
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" }
};
function icon(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = Math.abs(x - size / 2), dy = Math.abs(y - size / 2);
    const screen = dx < size * .27 && dy < size * .21;
    const edge = screen && (dx > size * .20 || dy > size * .145);
    const glow = Math.max(0, 1 - Math.hypot(dx / size, dy / size) * 1.7);
    const i = (y * size + x) * 4;
    const color = edge ? [191, 254, 255] : screen ? [28, 44, 59] : [25 + glow * 25, 25 + glow * 100, 37 + glow * 120];
    png.data[i] = color[0]; png.data[i + 1] = color[1]; png.data[i + 2] = color[2]; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}
async function collect(dir, prefix = '') {
  const files = {};
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'test-results','dist','artifacts'].includes(e.name)||(/^\.env(?:\.|$)/.test(e.name)&&e.name!=='.env.example')||e.name.endsWith('.log')) continue;
    const rel = prefix + e.name, full = path.join(dir, e.name);
    if(path.resolve(full)===path.resolve(out))continue;
    if(e.isSymbolicLink())throw new Error('Refusing to package symbolic link: '+rel);
    if (e.isDirectory()) Object.assign(files, await collect(full, rel + '/'));
    else files[rel] = new Uint8Array(await readFile(full));
  }
  return files;
}
for (const browser of ['chrome', 'firefox']) {
  const dir = path.join(out, 'douyin-ambilight', browser);
  await mkdir(path.join(dir, 'icons'), { recursive: true });
  const m = structuredClone(manifest);
  if (browser === 'chrome') m.minimum_chrome_version = '121';
  else m.browser_specific_settings = { gecko: { id: 'douyin-ambilight@local.xiaoguai', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } }, gecko_android: { strict_min_version: '142.0' } };
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  for (const file of [...scripts, 'popup.html', 'popup.css', 'popup.js']) await copyFile(path.join(root, 'src', file), path.join(dir, file));
  for (const size of [16, 32, 48, 128]) await writeFile(path.join(dir, 'icons', `${size}.png`), icon(size));
  for (const file of ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', '验证报告.md', '功能对照.md','CHANGELOG.md']) await copyFile(path.join(root, file), path.join(dir, file));
  await mkdir(path.join(dir,'docs','assets'),{recursive:true});
  for(const file of ['regions-local.png','occlusion-local.png','comments-local.png'])await copyFile(path.join(root,'docs','assets',file),path.join(dir,'docs','assets',file));
  await writeFile(path.join(out, `douyin-ambilight-${pkg.version}-${browser}${browser === 'firefox' ? '-unsigned.xpi' : '.zip'}`), zipSync(await collect(dir)));
}
const meta = `// ==UserScript==
// @name         抖音环境光
// @namespace    urn:xiaoguai:douyin-ambilight
// @version      ${pkg.version}
// @description  为抖音网页版添加实时柔和环境光，本地渲染，不上传数据。
// @match        https://www.douyin.com/*
// @match        https://douyin.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// @license      MIT
// @homepageURL  https://github.com/ADVICEsama/douyin-ambilight
// @supportURL   https://github.com/ADVICEsama/douyin-ambilight/issues
// ==/UserScript==
`;
const bundle = (await Promise.all(scripts.map(f => readFile(path.join(root, 'src', f), 'utf8')))).join('\n');
await writeFile(path.join(out, `douyin-ambilight-${pkg.version}.user.js`), meta + '\n(() => {\n' + bundle + '\n})();\n');
await copyFile(path.join(root, 'README.md'), path.join(out, '安装说明.md'));
await copyFile(path.join(root, '验证报告.md'), path.join(out, '验证报告.md'));
await copyFile(path.join(root, '功能对照.md'), path.join(out, '功能对照.md'));
await writeFile(path.join(out, `douyin-ambilight-${pkg.version}-source.zip`), zipSync(await collect(root)));
console.log(`Built ${pkg.version}: ${out}`);
