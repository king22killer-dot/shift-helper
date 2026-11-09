// 班表小幫手自動化測試：用 Playwright 模擬 iPhone 13 實際操作
// 執行：npm test（第一次先 npm install、npx playwright install chromium）
const {chromium,devices}=require('playwright');
const {start}=require('./server');

const NOW=new Date('2026-11-09T08:00:00'); // 固定「今天」：2026/11/9（一）早上 8 點
const tests=[];
const test=(name,fn,opt={})=>tests.push({name,fn,opt});
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};

// 往左滑一列
async function swipeLeft(p,sel){
  await p.locator(sel).first().scrollIntoViewIfNeeded();
  const r=await p.$eval(sel,e=>{const b=e.getBoundingClientRect();return{x:b.x+b.width*.7,y:b.y+b.height/2}});
  await p.mouse.move(r.x,r.y);await p.mouse.down();
  for(let i=1;i<=8;i++)await p.mouse.move(r.x-15*i,r.y);
  await p.mouse.up();await p.waitForTimeout(300);
}

test('版面剛好一個螢幕、11 月顯示 5 週',async p=>{
  const [doc,win]=await p.evaluate(()=>[document.documentElement.scrollHeight,innerHeight]);
  assert(doc===win,`頁面會捲動：${doc} > ${win}`);
  assert(await p.evaluate(()=>document.querySelectorAll('#grid .wrow').length)===5,'11 月應該是 5 週');
  assert(await p.isVisible('#sampleBar'),'第一次打開應該有範例提示');
});

test('快速排班、清除本月班別',async p=>{
  await p.click('#editBtn');await p.click('#palRow [data-t=n]');await p.click('#grid [data-k="2026-11-10"]');await p.click('#palDone');
  assert(await p.evaluate(()=>shiftOf('2026-11-10').name)==='夜班','快速排班沒有套用');
  await p.click('#menuBtn');await p.click('[data-m=clear]');await p.click('#cfmOk');
  assert(await p.evaluate(()=>[...document.querySelectorAll('#grid .cell:not(.out) .s')].every(s=>!s.textContent)),'清除本月後還有班別');
});

test('排班循環：多組並存、月底延到下個月排完',async p=>{
  await p.evaluate(()=>{S.cycles=[];S.days={};save()});
  const add=async(start,seq,m)=>{await p.click('#menuBtn');await p.click('[data-m=cycle]');await p.click('#cyNew');await p.fill('#cyStart',start);
    for(const t of seq)await p.click(`#cyAdd [data-t=${t}]`);await p.click(`#cyMon [data-m="${m}"]`);await p.click('#cySave');await p.click('#sheet h2 [data-x]')};
  await add('2026-11-01',['n','n','o'],'1');
  await add('2026-10-01',['d','d','d','o','o','n','n','n','o','o','o','o'],'1');
  const r=await p.evaluate(()=>['2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-12-01'].map(k=>shiftOf(k)?.name||'-'));
  assert(r.join()==='夜班,夜班,夜班,休假,-',`循環結果不對：${r}`);
});

test('國定假日與補假標示',async p=>{
  await p.evaluate(()=>{view=new Date(2026,9,1);renderCal()});
  const h=await p.evaluate(()=>[...document.querySelectorAll('#grid .hn')].map(x=>x.textContent));
  assert(h.includes('國慶日')&&h.includes('補假'),`10 月應該有國慶日與補假：${h}`);
});

test('待辦：新增、班表橫條、左滑刪除',async p=>{
  await p.click('[data-tab=todo]');await p.click('#planAdd');await p.fill('#etTxt','測試待辦');await p.fill('#etDays','3');await p.click('#etSave');
  assert(await p.evaluate(()=>S.todos.some(t=>t.text==='測試待辦'&&t.days===3)),'待辦沒有新增');
  await p.click('[data-tab=cal]');
  assert(await p.evaluate(()=>[...document.querySelectorAll('.cbar')].some(b=>b.textContent==='測試待辦')),'班表上沒有橫條');
  await p.click('[data-tab=todo]');
  const n=await p.evaluate(()=>S.todos.length);
  await swipeLeft(p,'#planList .swipe:has-text("測試待辦") .todo');
  await p.click('#planList .swipe.open .sw-del');await p.click('#cfmOk');
  assert(await p.evaluate(()=>S.todos.length)===n-1,'左滑刪除失敗');
});

test('待辦打勾 → 自動寫進日誌，取消打勾 → 拿掉',async p=>{
  await p.click('[data-tab=todo]');await p.click('#planAdd');await p.fill('#etTxt','繳交月報');await p.click('#etSave');
  await p.click('#planList .swipe:has-text("繳交月報") [data-chk]');
  assert(await p.evaluate(()=>S.logs.some(l=>l.text==='繳交月報'&&l.tags.week&&l.date==='2026-11-09')),'完成後沒有寫進日誌');
  await p.click('#planList .swipe:has-text("繳交月報") [data-chk]');
  assert(!(await p.evaluate(()=>S.logs.some(l=>l.text==='繳交月報'))),'取消打勾後日誌沒有拿掉');
});

test('App 開著時到時間跳出提醒',async p=>{
  await p.evaluate(()=>{S.todos=[{id:'r1',text:'九點開會',date:'2026-11-09',time:'09:00',done:false}];save()});
  await p.clock.runFor(62*60*1000);await p.waitForTimeout(300);
  assert(await p.isVisible('#remBar'),'沒有跳出提醒');
  assert((await p.textContent('#remBar')).includes('九點開會'),'提醒內容不對');
});

test('加到行事曆：Service Worker 產生真的 .ics',async p=>{
  await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready});
  await p.reload();await p.waitForSelector('.cell');
  assert(await p.evaluate(()=>!!navigator.serviceWorker.controller),'Service Worker 沒有接管');
  const r=await p.evaluate(async()=>{const t={id:'x',text:'繳房租, 水電',date:'2026-11-20',time:'20:30',repeat:'month',remind:15};
    const res=await fetch(icsUrl(t));return [res.headers.get('content-type'),await res.text(),icsOf(t)]});
  assert(r[0].startsWith('text/calendar'),'不是 text/calendar：'+r[0]);
  assert(r[1]===r[2],'.ics 內容跟 icsOf 不一樣');
  assert(r[1].includes('RRULE:FREQ=MONTHLY')&&r[1].includes('TRIGGER:-PT15M'),'.ics 缺少重複或提醒');
});

test('工作日誌：同時標記、常用自動記錄、週報段落',async p=>{
  await p.click('[data-tab=log]');
  await p.fill('#logTxt','處理冷卻水塔漏水');for(const t of ['fav','week','perf'])await p.click(`#logTags [data-tg=${t}]`);await p.click('#logForm .lbtn');
  assert(await p.evaluate(()=>S.logFav.some(f=>f.text==='處理冷卻水塔漏水')),'常用沒有自動記錄');
  await p.click('#logFavs .chip:has-text("冷卻水塔")');await p.click('#logForm .lbtn');
  assert(await p.evaluate(()=>S.logFav.filter(f=>f.text==='處理冷卻水塔漏水').length)===1,'常用重複記錄');
  await p.evaluate(()=>{S.todos.push({id:'nx',text:'下週安全稽核',date:'2026-11-17',done:false});save()});
  await p.click('#logSeg [data-f=week]');await p.click('#logList .group:first-child [data-copy]');
  const para=await p.inputValue('#rpTxt');
  assert(para.startsWith('【週報】2026/11/9～11/15'),'週報標題不對：'+para.split('\n')[0]);
  assert(/本週例行工作：.*處理冷卻水塔漏水（共 2 次）/.test(para),'例行工作沒有合併計次');
  assert(para.includes('績效亮點：處理冷卻水塔漏水'),'沒有績效亮點');
  assert(para.includes('下週預定：11/17 下週安全稽核'),'沒有下週預定');
  await p.click('#rpSeg [data-r=list]');
  assert((await p.inputValue('#rpTxt')).includes('1. 11/9（一） 處理冷卻水塔漏水'),'條列格式不對');
});

test('假別與特休：額度、已休、剩餘',async p=>{
  await p.evaluate(()=>{S.cycles=[];S.days={'2026-03-02':{t:'al'},'2026-11-03':{t:'al'},'2026-12-24':{t:'al'},'2026-11-04':{t:'sl'}};save();renderCal()});
  await p.click('#menuBtn');await p.click('[data-m=leave]');
  await p.fill('[data-q=al]','10');await p.dispatchEvent('[data-q=al]','change');
  const t=await p.textContent('#lvList .lvrow:first-child');
  assert(t.includes('已休 2')&&t.includes('已排 1')&&t.includes('剩 7'),'特休統計不對：'+t);
  await p.click('#sheet h2 [data-x]');
  assert((await p.textContent('#stats')).includes('特休剩 7 天'),'班表下方沒有特休剩餘');
});

test('備忘錄：手寫與錄音',async p=>{
  await p.click('[data-tab=memo]');await p.click('#memoNew');await p.fill('#mmT','測試備忘');
  await p.click('#mmDraw');await p.waitForTimeout(150);
  const c=await p.$eval('#dwCv',e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y}});
  await p.mouse.move(c.x+40,c.y+60);await p.mouse.down();await p.mouse.move(c.x+200,c.y+150);await p.mouse.up();
  await p.click('#dwSave');await p.waitForTimeout(400);
  await p.click('#mmRec');await p.clock.runFor(1500);await p.waitForTimeout(1500);await p.click('#mmRec');await p.waitForTimeout(800);
  const f=await p.evaluate(()=>(S.memos.find(m=>m.title==='測試備忘')||{}).files||[]);
  assert(f.some(x=>x.type==='draw'),'手寫沒有存');assert(f.some(x=>x.type==='audio'),'錄音沒有存');
},{media:true});

test('備份與還原（含手寫檔）',async p=>{
  await p.evaluate(async()=>{const id='ftest';await filePut(id,new Blob(['手寫測試'],{type:'image/png'}));
    S.memos.push({id:'m1',title:'備份測試',body:'',files:[{id,type:'draw',at:1}],at:1});S.logs.push({id:'l1',date:'2026-11-09',text:'備份日誌',tags:{},at:1});save()});
  const bk=await p.evaluate(async()=>JSON.stringify(await buildBackup()));
  assert(JSON.parse(bk).files.ftest,'備份檔沒有手寫檔');
  await p.evaluate(async()=>{await fileDel('ftest');S.memos=[];S.logs=[];save()});
  await p.evaluate(async b=>{const j=JSON.parse(b);await restoreData(j.data,j.files)},bk);
  const r=await p.evaluate(async()=>[S.memos.some(m=>m.title==='備份測試'),S.logs.some(l=>l.text==='備份日誌'),await (await fileGet('ftest')).text()]);
  assert(r[0]&&r[1],'還原後資料不見');assert(r[2]==='手寫測試','還原後手寫檔不對');
});

test('7 天沒備份會提醒，按 ✕ 隔天再提醒',async p=>{
  await p.evaluate(()=>{S.sample=false;S.firstUse=Date.now()-8*864e5;delete S.lastBackup;save();renderAll()});
  assert(await p.isVisible('#bkBar'),'沒有備份提醒');
  await p.click('#bkX');
  assert(!(await p.isVisible('#bkBar')),'按 ✕ 後還在');
});

test('外觀：深色、淺色切換',async p=>{
  await p.click('#menuBtn');await p.click('[data-m=look]');
  await p.check('input[name=lk][value=dark]');assert(await p.evaluate(()=>document.documentElement.dataset.theme)==='dark','深色沒有套用');
  await p.check('input[name=lk][value=light]');assert(await p.evaluate(()=>document.documentElement.dataset.theme)==='light','淺色沒有套用');
});

(async()=>{
  const {srv,url}=await start();
  const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
  let fail=0;
  for(const t of tests){
    const ctx=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:763},hasTouch:false,isMobile:false,permissions:t.opt.media?['microphone']:[]});
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort()); // 不連外網，圖示字型不影響測試
    const p=await ctx.newPage(),errs=[];
    p.on('pageerror',e=>errs.push(e.message));
    try{
      await p.clock.install({time:NOW});
      await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForSelector('.cell');
      await t.fn(p);
      if(errs.length)throw new Error('頁面錯誤：'+errs.join(' / '));
      console.log('✓ '+t.name);
    }catch(e){fail++;console.log('✗ '+t.name+'\n    '+e.message.split('\n')[0])}
    await ctx.close();
  }
  await browser.close();srv.close();
  console.log(`\n${tests.length-fail}/${tests.length} 通過`);
  process.exit(fail?1:0);
})();
