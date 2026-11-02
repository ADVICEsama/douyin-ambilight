// Separate, logged-out disposable browser. No access to the user's profile/cookies.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=process.env.DA_OUTPUT?path.resolve(process.env.DA_OUTPUT):path.resolve(root,'../../outputs');
const context=await chromium.launchPersistentContext(path.join(root,'test-results/live-profile'),{
  executablePath:process.env.DA_CHROMIUM||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),
  headless:true,channel:'chromium',viewport:{width:1440,height:1000},
  args:[`--disable-extensions-except=${path.join(out,'douyin-ambilight/chrome')}`,`--load-extension=${path.join(out,'douyin-ambilight/chrome')}`,'--autoplay-policy=no-user-gesture-required']
});
try{
 const page=context.pages()[0];
 let navigationError='';
 try{await page.goto('https://www.douyin.com/',{waitUntil:'domcontentloaded',timeout:45000});}catch(e){navigationError=e.message.split('\n')[0];}
 await page.waitForTimeout(15000);
 const result=await page.evaluate(()=>({url:location.origin+location.pathname,title:document.title,extension:!!document.querySelector('#douyin-ambilight-ui'),status:document.querySelector('#douyin-ambilight-layer')?.dataset.state,videoCount:document.querySelectorAll('video').length,videos:[...document.querySelectorAll('video')].map(v=>({readyState:v.readyState,width:v.videoWidth,height:v.videoHeight,paused:v.paused,hasMediaKeys:!!v.mediaKeys})),bodySnippet:document.body?.innerText.slice(0,200)}));
 result.navigationError=navigationError;
 await page.screenshot({path:path.join(root,'test-results/douyin-live.png')});
 await writeFile(path.join(root,'test-results/live.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}finally{await context.close();}
