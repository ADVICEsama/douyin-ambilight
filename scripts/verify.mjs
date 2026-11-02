import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=process.env.DA_OUTPUT?path.resolve(process.env.DA_OUTPUT):path.resolve(root,'../../outputs');
const files=['core.js','platform.js','native.js','renderer.js','projector.js','page.js','ui.js','content.js','popup.js'];
for(const file of files)execFileSync(process.execPath,['--check',path.join(root,'src',file)]);
for(const file of ['build.mjs','verify.mjs'])execFileSync(process.execPath,['--check',path.join(root,'scripts',file)]);
for(const file of ['core.test.mjs','browser.mjs','live.mjs','advanced-browser.mjs','reference-browser.mjs','spatial-browser.mjs','regions-browser.mjs','occlusion-browser.mjs','comments-browser.mjs','fixture.mjs'])execFileSync(process.execPath,['--check',path.join(root,'tests',file)]);
for(const browser of ['chrome','firefox']){
 const name=`douyin-ambilight-0.5.2-${browser}${browser==='firefox'?'-unsigned.xpi':'.zip'}`;
 const archive=unzipSync(new Uint8Array(await readFile(path.join(out,name))));
 const manifest=JSON.parse(Buffer.from(archive['manifest.json']).toString('utf8'));
 assert.deepEqual(manifest.permissions,['storage']); assert.equal(manifest.background,undefined);
 for(const file of [...files,'popup.css','popup.html'])assert.ok(Buffer.from(archive[file]).equals(await readFile(path.join(root,'src',file))),`${name}: stale source ${file}`);
 for(const file of ['README.md','LICENSE','THIRD_PARTY_NOTICES.md','PRIVACY.md'])assert.ok(Buffer.from(archive[file]).equals(await readFile(path.join(root,file))),`${name}: stale or missing document ${file}`);
 for(const file of [...manifest.content_scripts[0].js,manifest.action.default_popup,...Object.values(manifest.icons)])assert.ok(archive[file],`missing resource ${file}`);
 assert.ok(!Object.keys(archive).some(x=>/node_modules|test-results|\.git\//.test(x)));
}
const user=await readFile(path.join(out,'douyin-ambilight-0.5.2.user.js'),'utf8');
execFileSync(process.execPath,['--check',path.join(out,'douyin-ambilight-0.5.2.user.js')]);
for(const f of files.filter(x=>x!=='popup.js'))assert.ok(user.includes(await readFile(path.join(root,'src',f),'utf8')));
const deliverables=['douyin-ambilight-0.5.2.user.js','douyin-ambilight-0.5.2-chrome.zip','douyin-ambilight-0.5.2-firefox-unsigned.xpi','douyin-ambilight-0.5.2-source.zip'];
const hashes=[];for(const file of deliverables)hashes.push(`${createHash('sha256').update(await readFile(path.join(out,file))).digest('hex')}  ${file}`);
console.log('PASS syntax, permissions, referenced resources, package/source consistency, userscript bundle');
console.log(hashes.join('\n'));


