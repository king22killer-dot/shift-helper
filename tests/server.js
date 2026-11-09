// 測試用的小型靜態網站伺服器：把專案根目錄當成 /shift-helper/ 提供（跟 GitHub Pages 一樣）
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};
function start(){
  return new Promise(res=>{
    const srv=http.createServer((req,resp)=>{
      let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
      if(!p.startsWith('/shift-helper/')){resp.writeHead(302,{Location:'/shift-helper/'});return resp.end()}
      p=p.slice('/shift-helper'.length);if(p.endsWith('/'))p+='index.html';
      const f=path.join(ROOT,p);
      if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){resp.writeHead(404);return resp.end('not found')}
      resp.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0,'127.0.0.1',()=>res({srv,url:`http://127.0.0.1:${srv.address().port}/shift-helper/`}));
  });
}
module.exports={start};
