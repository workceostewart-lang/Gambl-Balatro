import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/llhym/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || (process.platform==='win32'?'msedge':undefined)});
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
mkdirSync('test-results',{recursive:true});
const results=[];
const issues=[];
for(const [width,height]of [[1440,900],[1280,720],[844,390],[667,375],[740,360],[932,430],[390,844],[360,640]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.on('pageerror',e=>issues.push(`${width}x${height}: ${e.message}`));
 await page.goto(base);await page.waitForSelector('.hero-art img');await page.locator('.hero-art img').evaluate(img=>img.decode());await page.evaluate(()=>document.fonts.ready);
 const menu=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth>innerWidth,art:document.querySelector('.hero-art img').naturalWidth,webgl:!!document.querySelector('.webgl-table canvas')}));
 await page.screenshot({path:`test-results/menu-${width}x${height}.png`,fullPage:true});
 if(menu.scroll)issues.push(`Menu overflow at ${width}x${height}`);
 await page.getByRole('button',{name:'Play Solo',exact:true}).click();await page.getByLabel('Custom seed').fill('QA-GAME');await page.getByRole('button',{name:'Deal Me In'}).click();
 await page.getByRole('button',{name:'Select',exact:true}).click();await page.waitForSelector('.card-hand .playing-card');
 const layout=await page.evaluate(()=>{const selectors=['.scoreboard','.card-hand','.hand-actions','.joker-row'];return selectors.map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,visible:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};});});
 for(const l of layout)if(!l.visible)issues.push(`Clipped ${l.selector} at ${width}x${height}: ${JSON.stringify(l)}`);
 if(await page.locator('.card-hand .playing-card').count()!==8)issues.push('Not all eight cards rendered');
 await page.locator('.card-hand .playing-card').nth(0).click();await page.locator('.card-hand .playing-card').nth(1).click();
 await page.screenshot({path:`test-results/table-${width}x${height}.png`,fullPage:true});
 await page.getByRole('button',{name:'Discard',exact:true}).click();if(await page.locator('.counters>div:last-child strong').textContent()!=='2')issues.push('Discard counter incorrect');
 await page.locator('.card-hand .playing-card').nth(0).click();await page.getByRole('button',{name:'Play Hand',exact:true}).click();
 if(await page.locator('.counters>div:first-child strong').textContent()!=='3')issues.push('Hands counter incorrect');
 await page.reload();await page.getByRole('button',{name:'Continue Run'}).click();if(await page.locator('.counters>div:first-child strong').textContent()!=='3')issues.push('Resume did not preserve state');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Save & Main Menu'}).click();
 await page.getByRole('button',{name:/How to Play Learn/}).click();for(let i=0;i<3;i++)await page.getByRole('button',{name:'Next Lesson'}).click();await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:/Multiplayer A table/}).click();if(!await page.getByText('Online matches are not connected',{exact:false}).count())issues.push('Missing online status');await page.getByRole('button',{name:'Close dialog'}).click();
 results.push({viewport:`${width}x${height}`,menu,layout,interaction:'passed'});await page.close();
}
await browser.close();
writeFileSync('test-results/browser-report.json',JSON.stringify({results,issues},null,2));
console.log(JSON.stringify({viewports:results.length,issues},null,2));
if(issues.length)process.exitCode=1;
