const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe-2026';
const sessions = new Map();
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
const verifyPassword = (password, hash) => { try { const [salt, value] = hash.split(':'); const a=Buffer.from(value,'hex'), b=crypto.scryptSync(password,salt,64); return a.length===b.length&&crypto.timingSafeEqual(a,b); } catch { return false; } };

const seed = {
  users: [
    { id: 'u-admin', name: 'ZUStore Admin', email: 'admin@zustore.app', role: 'admin', password: ADMIN_PASSWORD, status: 'active', joined: '2026-11-01' },
    { id: 'u-dev', name: 'Zutech', email: 'developer@zustore.app', role: 'developer', password: 'demo1234', status: 'active', joined: '2026-11-12' },
    { id: 'u-rhea', name: 'Rhea Sharma', email: 'rhea@example.com', role: 'user', password: 'demo1234', status: 'active', joined: '2026-11-14' }
  ],
  categories: ['All', 'Games', 'Internet', 'System', 'Utility', 'Multimedia', 'Privacy', 'Reading', 'Education', 'Health'],
  apps: [
    { id:'app-trap', name:'Trap Devil', developer:'Deccan Games Studio', category:'Games', subcategory:'Platformer', description:'A fast, clever platform adventure. Dash through shifting rooms, collect relics and find the exit before the trap closes.', version:'2.4.1', size:'76.3 MB', rating:4.8, ratingCount:2841, downloads:38200, status:'published', icon:'👹', color:'coral', badge:'FEATURED', updated:'Today', featured:true, screenshots:['Gameplay','World map','Boss stage'], featuredText:'Platformer Game · DEC...' },
    { id:'app-zaplayer', name:'NextPlayer', developer:'ZU Labs', category:'Multimedia', subcategory:'Video player', description:'A clean offline video player with subtitle support, gesture controls and a private folder for your media.', version:'1.9.4', size:'19.4 MB', rating:4.7, ratingCount:1290, downloads:18600, status:'published', icon:'▶', color:'blue', badge:'NEW', updated:'2 days ago', featured:false, screenshots:['Player','Library','Settings'] },
    { id:'app-files', name:'Material Files', developer:'Hai Zhang', category:'Utility', subcategory:'File manager', description:'A lightweight open-source file manager with a clear layout, archive support and local network browsing.', version:'1.7.2', size:'8.2 MB', rating:4.9, ratingCount:864, downloads:14900, status:'published', icon:'▤', color:'green', badge:'OPEN SOURCE', updated:'Yesterday', featured:false, screenshots:['Folders','Storage','Network'] },
    { id:'app-privacy', name:'Privacy Shield', developer:'Aster Studio', category:'Privacy', subcategory:'Privacy tools', description:'Simple privacy controls, a private vault and useful permission shortcuts in one small app.', version:'3.0.0', size:'12.1 MB', rating:4.6, ratingCount:603, downloads:9400, status:'published', icon:'◈', color:'purple', badge:'PICK', updated:'3 days ago', featured:false, screenshots:['Overview','Private vault','Permissions'] },
    { id:'app-ludo', name:'Ludo', developer:'PlayHex', category:'Games', subcategory:'Board game', description:'A bright, quick board game for family matches. Play pass-and-play or practice against smart local opponents.', version:'5.8', size:'42.8 MB', rating:4.5, ratingCount:3810, downloads:54600, status:'published', icon:'🎲', color:'amber', badge:'POPULAR', updated:'1 week ago', featured:false, screenshots:['Game board','Match room','Rewards'] },
    { id:'app-reader', name:'Book’s Story', developer:'Open Leaf', category:'Reading', subcategory:'E-book reader', description:'A calm reader for your own EPUB and PDF collection, with themes, bookmarks and progress sync.', version:'2.1.0', size:'15.6 MB', rating:4.7, ratingCount:781, downloads:8100, status:'published', icon:'▣', color:'rose', badge:'EDITOR PICK', updated:'4 days ago', featured:false, screenshots:['Library','Reading','Themes'] },
    { id:'app-math', name:'Mental Math', developer:'Tiny Tools', category:'Education', subcategory:'Learning', description:'Short daily number challenges with progress tracking and a friendly practice mode.', version:'1.3.8', size:'6.3 MB', rating:4.4, ratingCount:367, downloads:5200, status:'published', icon:'＋', color:'mint', badge:'TINY APP', updated:'6 days ago', featured:false, screenshots:['Daily set','Progress','Practice'] },
    { id:'app-camera', name:'Polaris Camera', developer:'North Pixel', category:'Multimedia', subcategory:'Photography', description:'A thoughtful camera companion with quick capture modes and a tidy photo workspace.', version:'4.0.2', size:'28.1 MB', rating:4.6, ratingCount:1450, downloads:21200, status:'published', icon:'◉', color:'slate', badge:'UPDATED', updated:'Today', featured:false, screenshots:['Camera','Gallery','Tools'] },
    { id:'app-pending', name:'Hassan Toolkit', developer:'Hassan X', category:'Utility', subcategory:'Tools', description:'A handy set of small utilities collected in one simple toolkit.', version:'1.0.0', size:'9.8 MB', rating:0, ratingCount:0, downloads:0, status:'pending', icon:'🧰', color:'blue', badge:'IN REVIEW', updated:'Just now', featured:false, screenshots:[] }
  ],
  library: { 'u-dev':['app-files'], 'u-rhea':['app-reader','app-ludo'] },
  reviews: [
    { id:'r1', appId:'app-trap', user:'Mihir', rating:5, text:'Great level design. The controls feel smooth on my phone.', date:'Nov 16, 2026' },
    { id:'r2', appId:'app-files', user:'Ananya', rating:5, text:'Fast and simple. Exactly what I wanted from a file manager.', date:'Nov 15, 2026' },
    { id:'r3', appId:'app-ludo', user:'Kabir', rating:4, text:'Nice for quick games with family.', date:'Nov 13, 2026' }
  ],
  messages: [
    { id:'m1', from:'ZUStore Team', to:'all', text:'Welcome to the ZUStore community. Share feedback or discover something new today.', date:'Nov 18, 2026', kind:'announcement' },
    { id:'m2', from:'Deccan Games Studio', to:'all', text:'Trap Devil received a new level pack. Update now and explore the Crystal Caverns.', date:'Nov 16, 2026', kind:'developer' }
  ],
  settings: { name:'ZUStore', tagline:'Safe · Fast · Independent', maintenance:false, allowSubmissions:true, featuredApp:'app-trap' }
};

function readStore() {
  try { const data=JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); let changed=false; for(const u of data.users||[]){ if(u.password&&!u.passwordHash){u.passwordHash=hashPassword(u.password);delete u.password;changed=true;} } if(changed)fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2)); return data; }
  catch { fs.mkdirSync(DATA_DIR, { recursive: true }); const data=structuredClone(seed); for(const u of data.users){u.passwordHash=hashPassword(u.password);delete u.password;} fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); return data; }
}
let db = readStore();
function save() { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
function send(res, status, body, headers={}) { res.writeHead(status, {'content-type':'application/json; charset=utf-8', ...headers}); res.end(JSON.stringify(body)); }
function parseBody(req) { return new Promise((resolve, reject) => { let raw=''; req.on('data', c => { raw += c; if (raw.length > 2_000_000) reject(new Error('Body too large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function currentUser(req) { const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); return sessions.get(token) || null; }
function safeUser(u) { const {password, passwordHash, ...safe} = u; return safe; }
function id(prefix) { return prefix + '-' + crypto.randomBytes(5).toString('hex'); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname;
  if (route === '/api/health') return send(res, 200, {ok:true, service:'zustore'});
  if (route.startsWith('/api/')) {
    try {
      if (req.method === 'GET' && route === '/api/bootstrap') {
        const user = currentUser(req);
        return send(res, 200, { user: user ? safeUser(db.users.find(u => u.id === user.id) || user) : null, settings:db.settings, categories:db.categories, apps:db.apps.filter(a => a.status === 'published' || (user && user.role === 'admin')), library:user ? (db.library[user.id] || []) : [], reviews:db.reviews, messages:db.messages });
      }
      if (req.method === 'POST' && route === '/api/auth/login') {
        const b = await parseBody(req); const user = db.users.find(u => u.email.toLowerCase() === String(b.email||'').toLowerCase() && verifyPassword(String(b.password||''),u.passwordHash) && u.status !== 'blocked');
        if (!user) return send(res, 401, {error:'Email or password is incorrect.'});
        const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, user); return send(res, 200, {token,user:safeUser(user)});
      }
      if (req.method === 'POST' && route === '/api/auth/register') {
        const b = await parseBody(req); const email = String(b.email||'').trim().toLowerCase();
        if (!email || !String(b.password||'').trim() || !String(b.name||'').trim()) return send(res, 400, {error:'Name, email and password are required.'});
        if (db.users.some(u => u.email.toLowerCase() === email)) return send(res, 409, {error:'An account with this email already exists.'});
        if(String(b.password).length<8)return send(res,400,{error:'Password must be at least 8 characters.'});
        const user = {id:id('u'),name:String(b.name).trim(),email,role:'user',passwordHash:hashPassword(String(b.password)),status:'active',joined:new Date().toISOString().slice(0,10)}; db.users.push(user); save();
        const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,user); return send(res,201,{token,user:safeUser(user)});
      }
      if (req.method === 'POST' && route === '/api/auth/logout') { const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,''); sessions.delete(token); return send(res,200,{ok:true}); }
      const user = currentUser(req);
      if (route.startsWith('/api/admin') && (!user || user.role !== 'admin')) return send(res, 403, {error:'Admin access required.'});
      if (route === '/api/upload' && req.method === 'POST') {
        if(!user)return send(res,401,{error:'Sign in to upload a file.'});
        const filename=decodeURIComponent(req.headers['x-filename']||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_');
        const ext=path.extname(filename).toLowerCase();if(!['.apk','.png','.jpg','.jpeg','.webp'].includes(ext))return send(res,415,{error:'Upload an APK, PNG, JPG or WEBP file.'});
        const max=ext==='.apk'?350*1024*1024:12*1024*1024;const targetDir=path.join(DATA_DIR,'uploads');fs.mkdirSync(targetDir,{recursive:true});const stored=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;const target=path.join(targetDir,stored);let size=0;const out=fs.createWriteStream(target);
        req.on('data',chunk=>{size+=chunk.length;if(size>max){req.destroy(new Error('File exceeds the upload limit.'));out.destroy();}});req.pipe(out);out.on('finish',()=>send(res,201,{url:`/uploads/${stored}`,filename,size}));out.on('error',err=>send(res,500,{error:err.message}));return;
      }
      if (route === '/api/apps' && req.method === 'POST') {
        if (!user) return send(res,401,{error:'Sign in to submit an app.'}); if (!db.settings.allowSubmissions) return send(res,403,{error:'Submissions are temporarily paused.'});
        const b=await parseBody(req); const app={id:id('app'),name:String(b.name||'New app').slice(0,80),developer:user.name,category:db.categories.includes(b.category)?b.category:'Utility',subcategory:String(b.subcategory||'New app'),description:String(b.description||'').slice(0,1500),version:String(b.version||'1.0.0'),size:String(b.size||'—'),rating:0,ratingCount:0,downloads:0,status:'pending',icon:String(b.icon||'✦').slice(0,4),iconUrl:String(b.iconUrl||''),color:b.color||'blue',badge:'IN REVIEW',updated:'Just now',featured:false,screenshots:Array.isArray(b.screenshots)?b.screenshots:[],apkUrl:String(b.apkUrl||''),apkName:String(b.apkName||'')}; db.apps.unshift(app); save(); return send(res,201,{app});
      }
      if (route.startsWith('/api/apps/') && req.method === 'POST' && route.endsWith('/download')) {
        const app=db.apps.find(a=>a.id===route.split('/')[3]&&a.status==='published'); if(!app)return send(res,404,{error:'App not found.'});
        if(!app.apkUrl)return send(res,404,{error:'APK has not been uploaded for this listing yet.'});
        app.downloads=Number(app.downloads||0)+1;let list=null;
        if(user){list=db.library[user.id] ||= [];if(!list.includes(app.id))list.unshift(app.id);}
        save();return send(res,200,{ok:true,library:list,apkUrl:app.apkUrl,apkName:app.apkName});
      }
      if (route.startsWith('/api/apps/') && req.method === 'POST' && route.endsWith('/library')) {
        if(!user)return send(res,401,{error:'Sign in to save this app to your library.'});const app=db.apps.find(a=>a.id===route.split('/')[3]&&a.status==='published');if(!app)return send(res,404,{error:'App not found.'});
        const list=db.library[user.id] ||= [];if(!list.includes(app.id))list.unshift(app.id);save();return send(res,200,{ok:true,library:list});
      }
      if (route.startsWith('/api/library/') && req.method === 'DELETE') { if(!user)return send(res,401,{error:'Sign in to manage your library.'});const appId=route.split('/')[3];db.library[user.id]=(db.library[user.id]||[]).filter(id=>id!==appId);save();return send(res,200,{library:db.library[user.id]}); }
      if (route.startsWith('/api/apps/') && req.method === 'POST' && route.endsWith('/reviews')) {
        if(!user)return send(res,401,{error:'Sign in to leave a review.'}); const b=await parseBody(req); const app=db.apps.find(a=>a.id===route.split('/')[3]&&a.status==='published'); if(!app)return send(res,404,{error:'App not found.'});
        const rating=Math.min(5,Math.max(1,Number(b.rating)||5)); db.reviews.unshift({id:id('r'),appId:app.id,user:user.name,rating,text:String(b.text||'').slice(0,500),date:new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}); const revs=db.reviews.filter(r=>r.appId===app.id); app.rating=Number((revs.reduce((n,r)=>n+r.rating,0)/revs.length).toFixed(1)); app.ratingCount=revs.length;save();return send(res,201,{ok:true});
      }
      if (route === '/api/messages' && req.method === 'POST') { if(!user)return send(res,401,{error:'Sign in to send a message.'}); const b=await parseBody(req); const m={id:id('m'),from:user.name,to:'all',text:String(b.text||'').slice(0,500),date:new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'}),kind:'community'}; if(!m.text)return send(res,400,{error:'Write a message first.'}); db.messages.push(m);save();return send(res,201,{message:m}); }
      if (route === '/api/admin/apps' && req.method === 'POST') {
        const b=await parseBody(req);const name=String(b.name||'').trim();if(!name||!b.apkUrl||!b.iconUrl)return send(res,400,{error:'App name, APK and icon are required.'});
        const status=b.status==='pending'?'pending':'published';const app={id:id('app'),name:name.slice(0,80),developer:'ZUStore',category:db.categories.includes(b.category)?b.category:'Utility',subcategory:String(b.subcategory||b.category||'App'),description:String(b.description||'').slice(0,1500),version:String(b.version||'1.0.0'),size:String(b.size||'—'),rating:0,ratingCount:0,downloads:0,status,icon:'✦',iconUrl:String(b.iconUrl),color:'blue',badge:status==='published'?'NEW':'IN REVIEW',updated:'Just now',featured:false,screenshots:Array.isArray(b.screenshots)?b.screenshots:[],apkUrl:String(b.apkUrl),apkName:String(b.apkName||'')};
        db.apps.unshift(app);save();return send(res,201,{app});
      }
      if (route === '/api/admin/apps' && req.method === 'PATCH') { const b=await parseBody(req);const app=db.apps.find(a=>a.id===b.id);if(!app)return send(res,404,{error:'App not found.'});if(b.status)app.status=b.status;if(typeof b.featured==='boolean')app.featured=b.featured;if(b.name)app.name=String(b.name).slice(0,80);if(b.category&&db.categories.includes(b.category))app.category=b.category;if(b.description)app.description=String(b.description).slice(0,1500);save();return send(res,200,{app}); }
      if (route === '/api/admin/apps' && req.method === 'DELETE') { const b=await parseBody(req);db.apps=db.apps.filter(a=>a.id!==b.id);save();return send(res,200,{ok:true}); }
      if (route === '/api/admin/users' && req.method === 'PATCH') { const b=await parseBody(req);const target=db.users.find(u=>u.id===b.id);if(!target)return send(res,404,{error:'User not found.'});if(target.id===user.id&&b.status==='blocked')return send(res,400,{error:'You cannot block your own admin account.'});if(b.status)target.status=b.status;if(b.role&&['user','developer','admin'].includes(b.role))target.role=b.role;save();return send(res,200,{user:safeUser(target)}); }
      if (route === '/api/admin/reviews' && req.method === 'DELETE') { const b=await parseBody(req);db.reviews=db.reviews.filter(r=>r.id!==b.id);const app=db.apps.find(a=>a.id===b.appId);if(app){const revs=db.reviews.filter(r=>r.appId===app.id);app.ratingCount=revs.length;app.rating=revs.length?Number((revs.reduce((n,r)=>n+r.rating,0)/revs.length).toFixed(1)):0;}save();return send(res,200,{ok:true}); }
      if (route === '/api/admin/categories' && req.method === 'POST') {const b=await parseBody(req);const name=String(b.name||'').trim().slice(0,32);if(!name)return send(res,400,{error:'Category name is required.'});if(!db.categories.includes(name))db.categories.push(name);save();return send(res,201,{categories:db.categories});}
      if (route === '/api/admin/categories' && req.method === 'DELETE') {const b=await parseBody(req);db.categories=db.categories.filter(c=>c!==b.name&&c!=='All');save();return send(res,200,{categories:db.categories});}
      if (route === '/api/admin/messages' && req.method === 'POST') {const b=await parseBody(req);const m={id:id('m'),from:'ZUStore Team',to:'all',text:String(b.text||'').slice(0,500),date:new Date().toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'}),kind:'announcement'};if(!m.text)return send(res,400,{error:'Announcement text is required.'});db.messages.push(m);save();return send(res,201,{message:m});}
      if (route === '/api/admin/settings' && req.method === 'PATCH') {const b=await parseBody(req);db.settings={...db.settings,...b};save();return send(res,200,{settings:db.settings});}
      if (route === '/api/admin/overview' && req.method === 'GET') return send(res,200,{users:db.users.map(safeUser),apps:db.apps,reviews:db.reviews,messages:db.messages,settings:db.settings,categories:db.categories,downloads:Object.values(db.library).reduce((n,a)=>n+a.length,0)});
      return send(res,404,{error:'Not found.'});
    } catch (err) { return send(res,400,{error:err.message||'Request failed.'}); }
  }
  if (route.startsWith('/uploads/')) { const name=path.basename(route);const upload=path.join(DATA_DIR,'uploads',name);if(!upload.startsWith(path.join(DATA_DIR,'uploads'))||!fs.existsSync(upload))return send(res,404,{error:'File not found.'});const ext=path.extname(upload).toLowerCase();res.writeHead(200,{'content-type':ext==='.apk'?'application/vnd.android.package-archive':ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg','content-disposition':ext==='.apk'?`attachment; filename="${name}"`:'inline'});return fs.createReadStream(upload).pipe(res); }
  const file = route === '/' || route === '/admin' ? 'index.html' : path.basename(route);
  const filePath = path.join(ROOT, file);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res,404,{error:'Not found.'});
  const ext=path.extname(filePath);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/manifest+json; charset=utf-8'};
  res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':ext==='.html'?'no-cache':'public, max-age=3600'});fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => console.log(`ZUStore listening on ${PORT}; data at ${DATA_FILE}`));
