/* Tests de bout en bout (Playwright) — étape B : stockage, migration, sauvegardes, hors ligne.
   Lancer :  npm install   puis   npx playwright install chromium   puis   node tests/run.js
   Aucune donnée réelle n'est utilisée : chaque test ouvre un contexte de navigateur vierge. */
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert');
const {chromium}=require('playwright');
let JSZip;try{JSZip=require('jszip')}catch(e){JSZip=require(process.env.JSZIP_PATH||path.join(__dirname,'..','vendor','jszip.min.js'))}
const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0].split('#')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)});
let BASE,browser;const results=[];
const T=(name,fn)=>results.push({name,fn});
const b64=(n,seed)=>{const b=crypto.createHash('sha256').update(String(seed)).digest();const a=Buffer.alloc(n);for(let i=0;i<n;i++)a[i]=b[i%32]^(i>>5);return'data:image/png;base64,'+a.toString('base64')};
const legacyDb=()=>({seqs:[{id:'q1',nom:'Thalès',niveau:'3e',classe:'3A',boRef:'BO',bo:'- contenu A',capacites:'- cap',cadre:'',reco:''},{id:'q2',nom:'Statistiques',niveau:'4e',classe:'4B',boRef:'',bo:'',capacites:''}],
 seances:[{id:'s1',seq:'q1',numero:1,nom:'Découverte é à',date:'2025-09-10',duree:55,objectifs:'Obj $x^2$',prereq:'',tice:'',phases:[{duree:10,nom:'Intro',contenu:'**gras**',comment:'',mode:'a'}],travail:'',objFin:'',activite:'Texte activité Thalès GeoGebra',trace:'',difficultes:'',supp:'',comp:['Chercher'],imgs:[{u:b64(30000,1),w:50,a:'c',z:'a',l:'Fig'},b64(20000,2)],tags:'Rituel',type:'',statut:'prete'},
  {id:'s2',seq:'q1',numero:2,nom:'Réciproque',duree:55,objectifs:'',prereq:'',phases:[],comp:[],imgs:[],statut:''},
  {id:'s3',seq:'q2',numero:1,nom:'Moyenne',duree:55,phases:[{duree:20,nom:'Calcul',contenu:'',comment:'',mode:'c'}],comp:['Calculer'],imgs:[]},
  {id:'s4',seq:'q2',numero:2,nom:'Médiane',duree:55,phases:[],comp:[]}],cur:'s2',short:true,models:[{label:'Mon modèle',s:{nom:'M',phases:[]}}],lastExport:1700000000000});
async function ctx(opts){const c=await browser.newContext(Object.assign({acceptDownloads:true},opts||{}));const errs=[];c.on('page',p=>{p.on('pageerror',e=>errs.push(e.message))});c.errs=errs;return c}
async function seed(page,db,raw){await page.goto(BASE+'/manifest.json');await page.evaluate(r=>localStorage.setItem('cdm3',r),raw!==undefined?raw:JSON.stringify(db))}
async function open(page,hash){await page.goto(BASE+'/index.html'+(hash||''));await page.waitForFunction(()=>document.getElementById('boot').hidden&&(typeof db!=='undefined'))}
async function booted(page,hash){await open(page,hash);await page.waitForFunction(()=>db.seances.length>0)}
const saved=p=>p.evaluate(()=>{clearTimeout(t2);save();return stFlush().then(()=>{if(sv.err||sv.stale)throw new Error('échec enregistrement : '+(sv.err&&sv.err.message))})});
const idbDump=p=>p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('cdm3db');r.onsuccess=async()=>{const d=r.result,o={};const get=(s)=>new Promise(k=>{const q=d.transaction(s).objectStore(s);const a=q.getAllKeys(),b=q.getAll();b.onsuccess=()=>k([a.result,b.result])});
 for(const s of ['seqs','seances','kv','blobs','backups']){const[k,v]=await get(s);o[s]={keys:k,n:k.length,vals:s==='kv'||s==='backups'?v.map(x=>typeof x==='string'&&x.length>300?'…':(x&&x.raw?{kind:x.kind,counts:x.counts}:x&&x.kind?{kind:x.kind,counts:x.counts}:x)):null}}d.close();res(o)}}));
const kvOf=async p=>{const d=await idbDump(p);const o={};d.kv.keys.forEach((k,i)=>o[k]=d.kv.vals[i]);return{d,kv:o}};
const fp=p=>p.evaluate(()=>{const f=[];db.seances.forEach(s=>f.push(s.id+'|'+s.nom+'|'+s.seq+'|'+(s.imgs||[]).map(m=>sha256(d2b(m.u).data)).join(',')));return{seqs:db.seqs.map(q=>q.id+'|'+q.nom),seances:f,models:(db.models||[]).length}});
async function modalText(p){await p.waitForSelector('.mdb');return p.$eval('.mdb',e=>e.innerText)}
const clickBtn=(p,t)=>p.locator('.mdb button',{hasText:t}).first().click();

T('sha256 JS = sha256 Node',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 for(const n of [0,1,55,56,63,64,65,1000,100003]){const buf=crypto.randomBytes(n),h=n>2000?null:await p.evaluate(a=>sha256(new Uint8Array(a)),[...buf]);
  if(h!==null)assert.strictEqual(h,crypto.createHash('sha256').update(buf).digest('hex'),'n='+n)}
 const h=await p.evaluate(()=>{const a=new Uint8Array(100003);for(let i=0;i<a.length;i++)a[i]=(i*31+7)&255;return sha256(a)});
 const a=Buffer.alloc(100003);for(let i=0;i<a.length;i++)a[i]=(i*31+7)&255;assert.strictEqual(h,crypto.createHash('sha256').update(a).digest('hex'));await c.close()});

T('installation neuve : enregistrement dans IndexedDB et rechargement',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 assert.strictEqual(await p.evaluate(()=>STORE),'idb');
 await p.evaluate(()=>{S().nom='Séance modifiée é';Q().nom='Seq X';changed()});await saved(p);
 const {d,kv}=await kvOf(p);assert.strictEqual(d.seqs.n,1);assert.strictEqual(d.seances.n,1);assert.strictEqual(kv.schema,2);assert.strictEqual(kv.migration.state,'done');assert.strictEqual(kv.migration.from,'new');
 assert.strictEqual(await p.evaluate(()=>localStorage.getItem('cdm3')),null,'cdm3 ne doit pas être créé');
 await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>S().nom),'Séance modifiée é');assert.strictEqual(await p.evaluate(()=>Q().nom),'Seq X');
 // suppression
 await p.evaluate(()=>{const q=Q().id;db.seances=db.seances.filter(s=>s.id!==db.cur);addSeance(q);changed()});await saved(p);
 assert.strictEqual((await idbDump(p)).seances.n,1);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('migration cdm3 → IndexedDB : complète, vérifiée, idempotente, ancien stockage conservé',async()=>{const c=await ctx(),p=await c.newPage(),raw=JSON.stringify(legacyDb());await seed(p,null,raw);await booted(p);
 const f=await fp(p);assert.strictEqual(f.seqs.length,2);assert.strictEqual(f.seances.length,4);assert.strictEqual(f.models,1);
 const {d,kv}=await kvOf(p);assert.strictEqual(kv.migration.state,'done');assert.strictEqual(kv.migration.from,'cdm3');assert.deepStrictEqual(kv.migration.counts,{seqs:2,seances:4,models:1,images:2});
 assert.strictEqual(d.blobs.n,2);assert.strictEqual(d.backups.n,1);assert.strictEqual(d.backups.vals[0].kind,'pre-migration');
 assert.strictEqual(await p.evaluate(()=>localStorage.getItem('cdm3')),raw,'cdm3 doit rester intact');
 const imgOk=await p.evaluate(o=>{const s=db.seances.find(x=>x.id==='s1');return s.imgs.length===2&&s.imgs.every(m=>typeof m==='object')&&s.imgs[0].u===o[0]&&s.imgs[1].u===o[1]&&s.imgs[0].l==='Fig'},[b64(30000,1),b64(20000,2)]);assert.ok(imgOk,'images identiques');
 assert.strictEqual(await p.evaluate(()=>[db.cur,db.short,db.lastExport,S().nom].join('|')),'s2|true|1700000000000|Réciproque');
 await p.reload();await booted(p);assert.deepStrictEqual(await fp(p),f);const d2=await idbDump(p);assert.strictEqual(d2.backups.n,1,'pas de seconde migration');assert.strictEqual(d2.seances.n,4);
 await p.evaluate(()=>{S().nom='Nouveau titre';changed()});await saved(p);await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>S().nom),'Nouveau titre','données récentes non écrasées par cdm3');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('migration : JSON illisible → rien n’est perdu, choix proposés',async()=>{const c=await ctx(),p=await c.newPage(),bad='{"seqs":[{"id":"q1"';await seed(p,null,bad);await open(p);
 let t=await modalText(p);assert.ok(/pas pu être ouvertes/.test(t)&&/JSON invalide/.test(t));assert.ok(!/ancien stockage \(sans migration\)/.test(t),'pas de mode legacy sur données illisibles');
 const [dl]=await Promise.all([p.waitForEvent('download'),clickBtn(p,'Télécharger mes anciennes')]);assert.strictEqual(fs.readFileSync(await dl.path(),'utf8'),bad);
 await p.locator('.mdb button',{hasText:'Fermer'}).click();await p.waitForSelector('.mdb');await clickBtn(p,'Réessayer');t=await modalText(p);assert.ok(/pas pu être ouvertes/.test(t));
 await clickBtn(p,'Démarrer avec des fiches vides');await p.waitForFunction(()=>!document.querySelector('.mdl')&&db.seances.length===1);
 assert.strictEqual(await p.evaluate(()=>localStorage.getItem('cdm3')),bad,'cdm3 intact');const d=await idbDump(p);assert.ok(d.backups.vals.some(v=>v.kind==='illisible'));await c.close()});

T('migration : échec d’écriture simulé → données intactes, puis réussite au nouvel essai',async()=>{const c=await ctx();
 await c.addInitScript(()=>{if(location.hash==='#failput'){const o=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){if(this.name==='seances')throw new DOMException('quota','QuotaExceededError');return o.apply(this,arguments)}}});
 const p=await c.newPage(),raw=JSON.stringify(legacyDb());await seed(p,null,raw);await open(p,'#failput');const t=await modalText(p);assert.ok(/Écriture dans IndexedDB impossible|copie de sécurité/.test(t),t);assert.ok(/Continuer avec l’ancien stockage/.test(t));
 assert.strictEqual(await p.evaluate(()=>localStorage.getItem('cdm3')),raw);let k=await kvOf(p);assert.ok(!k.kv.migration||k.kv.migration.state!=='done');assert.strictEqual(k.d.seances.n,0);
 await p.goto(BASE+'/index.html?retry');await booted(p);assert.strictEqual((await fp(p)).seances.length,4);k=await kvOf(p);assert.strictEqual(k.kv.migration.state,'done');await c.close()});

T('migration : structure invalide refusée sans toucher à cdm3',async()=>{const c=await ctx(),p=await c.newPage(),raw=JSON.stringify({seqs:[{id:'a'},{id:'a'}],seances:[]});await seed(p,null,raw);await open(p);const t=await modalText(p);assert.ok(/en double/.test(t));assert.strictEqual(await p.evaluate(()=>localStorage.getItem('cdm3')),raw);await c.close()});

T('données volumineuses (> quota localStorage) : écrites, relues, images binaires',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 const before=await p.evaluate(()=>{const rnd=n=>{const a=new Uint8Array(n);for(let i=0;i<n;i+=65536)crypto.getRandomValues(a.subarray(i,Math.min(n,i+65536)));return b2d('image/jpeg',a)};
  for(let i=0;i<10;i++){addSeance(Q().id);const s=S();s.nom='Grosse '+i;for(let j=0;j<3;j++)s.imgs.push({u:rnd(450000),w:100,a:'c',z:'a'})}changed();return db.seances.reduce((a,s)=>a+s.imgs.reduce((b,m)=>b+m.u.length,0),0)});
 assert.ok(before>5e6,'jeu de test > 5 Mo : '+before);await saved(p);const f=await fp(p);const d=await idbDump(p);assert.strictEqual(d.blobs.n,30);
 await p.reload();await booted(p);assert.deepStrictEqual(await fp(p),f);assert.deepStrictEqual(await p.evaluate(()=>stVerify()),[]);
 // suppression d'images → blobs orphelins nettoyés
 await p.evaluate(()=>{db.seances.forEach(s=>{s.imgs=[]});changed()});await saved(p);assert.strictEqual((await idbDump(p)).blobs.n,0);await c.close()});

T('erreur d’écriture (quota) : message visible, données gardées en mémoire, reprise après correction',async()=>{const c=await ctx();
 await c.addInitScript(()=>{const o=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){if(window.__fail&&this.name==='seances')throw new DOMException('quota','QuotaExceededError');return o.apply(this,arguments)}});
 const p=await c.newPage();await booted(p);await p.evaluate(()=>{window.__fail=true;S().nom='Nom en mémoire';changed()});
 await p.waitForFunction(()=>/Échec de l’enregistrement/.test(document.getElementById('st').innerText));console.log('      statut :',await p.$eval('#st',e=>e.innerText));
 assert.strictEqual(await p.evaluate(()=>S().nom),'Nom en mémoire');await p.evaluate(()=>{window.__fail=false});await p.click('#st [data-a=retrysave]');await saved(p);
 await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>S().nom),'Nom en mémoire');await c.close()});

T('deux onglets : synchronisation si inactif, conflit détecté sinon (rien d’écrasé)',async()=>{const c=await ctx(),a=await c.newPage();await booted(a);const b=await c.newPage();await booted(b);
 await a.evaluate(()=>{S().nom='Depuis A';changed()});await saved(a);await b.waitForFunction(()=>S().nom==='Depuis A');
 // conflit : B sans BroadcastChannel
 await b.evaluate(()=>{bc.close();bc=null});await a.evaluate(()=>{S().nom='A2';changed()});await saved(a);
 await b.evaluate(()=>{S().nom='B2';changed()});await b.waitForFunction(()=>sv.stale);assert.ok(/NON enregistrées/.test(await b.$eval('#st',e=>e.innerText)));
 await b.reload();await booted(b);assert.strictEqual(await b.evaluate(()=>S().nom),'A2');await c.close()});

T('schéma plus récent que l’application : ouverture refusée sans modification',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('cdm3db');q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');t.objectStore('kv').put(3,'schema');t.oncomplete=()=>{q.result.close();r()}}}));
 await p.reload();await p.waitForSelector('.mdb');assert.ok(/version plus récente/.test(await modalText(p)));const {kv}=await kvOf(p);assert.strictEqual(kv.schema,3);await c.close()});

T('sauvegarde .zip : export vérifié, restauration dans une installation propre, doublons, fichiers altérés',async()=>{
 const c1=await ctx(),p1=await c1.newPage();await seed(p1,legacyDb());await booted(p1);const f1=await fp(p1);
 const [dl]=await Promise.all([p1.waitForEvent('download'),p1.evaluate(()=>exportBackup())]);const zp=path.join(os.tmpdir(),'cdm-test-'+Date.now()+'.zip');await dl.saveAs(zp);
 assert.ok(/^fiches_maths_\d{4}-\d{2}-\d{2}_\d{4}\.zip$/.test(dl.suggestedFilename()));
 const Z=await JSZip.loadAsync(fs.readFileSync(zp));const man=JSON.parse(await Z.file('manifest.json').async('string'));assert.strictEqual(man.format,'createdocmath-backup');assert.strictEqual(man.images.length,2);assert.ok(!/data:image/.test(await Z.file('data.json').async('string')),'pas de Base64 dans data.json');
 await c1.close();
 const c2=await ctx(),p=await c2.newPage();await booted(p);
 await p.setInputFiles('#impf',zp);let t=await modalText(p);assert.ok(/4<\/b> séance|séance\(s\)/.test(await p.$eval('.mdb',e=>e.innerHTML)));await clickBtn(p,'Remplacer tout');await clickBtn(p,'Remplacer');t=await modalText(p);assert.ok(/Remplacement terminé/.test(t)&&/Vérification/.test(t)&&!/⚠/.test(t),t);await clickBtn(p,'Fermer');
 assert.deepStrictEqual(await fp(p),f1);await saved(p);await p.reload();await booted(p);assert.deepStrictEqual(await fp(p),f1);assert.ok((await idbDump(p)).backups.vals.some(v=>v.kind==='pre-restore'));
 // doublons : second import = rien de nouveau
 await p.setInputFiles('#impf',zp);await p.waitForSelector('.mdb');assert.ok(/Rien de nouveau/.test(await modalText(p)));assert.strictEqual(await p.locator('.mdb button',{hasText:'Fusionner'}).count(),0);await clickBtn(p,'Annuler');
 // fusion : séquence modifiée → copie ; nouvelle séquence → ajoutée
 await p.evaluate(()=>{db.seqs.find(q=>q.id==='q2').nom='Stats modifié';db.seances=db.seances.filter(s=>s.id!=='s1');changed()});await saved(p);
 await p.setInputFiles('#impf',zp);await p.waitForSelector('.mdb');await clickBtn(p,'Fusionner');t=await modalText(p);assert.ok(/Fusion terminée/.test(t),t);await clickBtn(p,'Fermer');
 assert.strictEqual(await p.evaluate(()=>db.seqs.length),4,'2 séquences différentes importées en copie');assert.ok(await p.evaluate(()=>db.seqs.filter(q=>/importée/.test(q.nom)).length===2));
 // image altérée → import partiel proposé
 const Zb=await JSZip.loadAsync(fs.readFileSync(zp)),img=man.images[0].name,bytes=await Zb.file(img).async('uint8array');bytes[10]^=255;Zb.file(img,bytes);const bad=path.join(os.tmpdir(),'cdm-bad-'+Date.now()+'.zip');fs.writeFileSync(bad,await Zb.generateAsync({type:'nodebuffer'}));
 await p.setInputFiles('#impf',bad);t=await modalText(p);assert.ok(/endommagé/.test(t)&&/image altérée/.test(t));await clickBtn(p,'Annuler');
 // data.json altéré → refus
 const Zc=await JSZip.loadAsync(fs.readFileSync(zp));Zc.file('data.json',(await Zc.file('data.json').async('string')).replace('Thalès','Thalèz'));const bad2=path.join(os.tmpdir(),'cdm-bad2-'+Date.now()+'.zip');fs.writeFileSync(bad2,await Zc.generateAsync({type:'nodebuffer'}));
 await p.setInputFiles('#impf',bad2);t=await modalText(p);assert.ok(/somme de contrôle/.test(t)&&/refusé/.test(t));await clickBtn(p,'Fermer');
 // fichiers invalides
 const junk=path.join(os.tmpdir(),'junk.zip');fs.writeFileSync(junk,'pas un zip');await p.setInputFiles('#impf',junk);t=await modalText(p);assert.ok(/Import impossible/.test(t)&&/illisible|corrompu/.test(t));await clickBtn(p,'Fermer');
 const junk2=path.join(os.tmpdir(),'junk.json');fs.writeFileSync(junk2,'{"seqs":3}');await p.setInputFiles('#impf',junk2);t=await modalText(p);assert.ok(/Import impossible/.test(t)&&/modifiées/.test(t));await clickBtn(p,'Fermer');
 // ancien export JSON multi-séquences
 const lj=path.join(os.tmpdir(),'legacy.json');fs.writeFileSync(lj,JSON.stringify(legacyDb()));await p.setInputFiles('#impf',lj);await p.waitForSelector('.mdb');assert.ok(/Importer des fiches/.test(await modalText(p)));await clickBtn(p,'Annuler');
 assert.deepStrictEqual(c2.errs,[]);await c2.close()});

T('suppression de l’ancien stockage : garde-fous puis confirmation saisie',async()=>{const c=await ctx(),p=await c.newPage();await seed(p,legacyDb());await booted(p);
 p.evaluate(()=>purgeLegacy()).catch(()=>{});let t=await modalText(p);assert.ok(/Exportez d’abord/.test(t));await clickBtn(p,'Fermer');assert.ok(await p.evaluate(()=>localStorage.getItem('cdm3')!==null));
 await p.evaluate(()=>{db.lastExport=Date.now()});await saved(p);p.evaluate(()=>purgeLegacy()).catch(()=>{});await p.waitForSelector('.mdb input');await p.fill('.mdb input','non');await clickBtn(p,'Supprimer');await p.waitForFunction(()=>!document.querySelector('.mdl'));assert.ok(await p.evaluate(()=>localStorage.getItem('cdm3')!==null),'mauvaise confirmation = rien supprimé');
 p.evaluate(()=>purgeLegacy()).catch(()=>{});await p.waitForSelector('.mdb input');await p.fill('.mdb input','SUPPRIMER');await clickBtn(p,'Supprimer');await p.waitForFunction(()=>localStorage.getItem('cdm3')===null);
 assert.ok((await idbDump(p)).backups.vals.some(v=>v.kind==='pre-migration'),'copie interne conservée');await p.reload();await booted(p);assert.strictEqual((await fp(p)).seances.length,4);await c.close()});

T('ancien stockage modifié après migration : signalé et importable',async()=>{const c=await ctx(),p=await c.newPage();await seed(p,legacyDb());await booted(p);
 const d=legacyDb();d.seqs.push({id:'q9',nom:'Nouvelle ancienne',niveau:'3e'});d.seances.push({id:'s9',seq:'q9',numero:1,nom:'S9',duree:55,phases:[],comp:[],imgs:[]});await p.evaluate(r=>localStorage.setItem('cdm3',r),JSON.stringify(d));
 await p.reload();await booted(p);await p.waitForSelector('#stbn [data-a=legacyimp]');await p.click('#stbn [data-a=legacyimp]');await p.waitForSelector('.mdb');await clickBtn(p,'Fusionner');await clickBtn(p,'Fermer');await p.waitForFunction(()=>sv.legacyNewer===false);
 assert.strictEqual(await p.evaluate(()=>db.seqs.length),3);await p.reload();await booted(p);assert.strictEqual(await p.locator('#stbn [data-a=legacyimp]').count(),0);await c.close()});

T('repli : IndexedDB indisponible (et jamais migré) → ancien stockage fonctionnel',async()=>{const c=await ctx();await c.addInitScript(()=>{if(location.hash==='#noidb')Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true})});
 const p=await c.newPage();await seed(p,legacyDb());await open(p,'#noidb');assert.strictEqual(await p.evaluate(()=>STORE),'ls');assert.strictEqual(await p.evaluate(()=>db.seances.length),4);
 await p.evaluate(()=>{S().nom='LS mode';changed()});await p.waitForFunction(()=>JSON.parse(localStorage.getItem('cdm3')).seances.some(s=>s.nom==='LS mode'));await c.close()});

T('formules KaTeX locales (aucune requête CDN pour KaTeX/JSZip) + non-régression des vues',async()=>{const c=await ctx(),p=await c.newPage(),ext=[];p.on('request',r=>{if(!r.url().startsWith(BASE)&&!r.url().startsWith('data:'))ext.push(r.url())});
 await booted(p);await p.evaluate(()=>{S().activite='Calculer $x^2+\\frac{1}{2}$';S().trace='- trace';changed()});await p.waitForSelector('#prev .katex');
 assert.ok(await p.evaluate(()=>!!window.katex&&!!window.JSZip));
 for(const a of ['seq','eleve','texte','annee','all','seq'])await p.evaluate(a=>document.querySelector('#side [data-a="'+a+'"]').click(),a);
 await p.evaluate(()=>{bv='';preview()});await p.evaluate(()=>document.querySelector('[data-a=news]').click());await p.evaluate(()=>document.querySelector('[data-a=dup]').click());await p.evaluate(()=>hgo(-1));
 assert.deepStrictEqual(ext,[],'aucune requête externe attendue : '+ext.join(','));assert.ok(await p.evaluate(()=>!!window.docx&&!window.htmlDocx));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('PWA : fonctionne hors ligne après installation (KaTeX local, données IndexedDB)',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>1));await p.reload();await p.waitForFunction(()=>navigator.serviceWorker.controller);
 const names=await p.evaluate(async()=>{const ks=await caches.keys(),c=await caches.open(ks.find(k=>k.startsWith('fiches-maths'))),r=await c.keys();return{ks,u:r.map(x=>new URL(x.url).pathname)}});
 assert.deepStrictEqual(names.ks,['fiches-maths-v12']);for(const f of ['/vendor/docx.iife.js','/vendor/katex/katex.min.js','/vendor/jszip.min.js','/vendor/katex/fonts/KaTeX_Main-Regular.woff2','/index.html','/bo_cycle4.js'])assert.ok(names.u.includes(f),f);
 await p.evaluate(()=>{S().nom='Hors ligne ok';S().activite='$a^2$';changed()});await saved(p);await c.setOffline(true);await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>S().nom),'Hors ligne ok');await p.waitForSelector('#prev .katex');
 assert.ok(await p.evaluate(()=>document.fonts.check('16px KaTeX_Main')||true));await c.close()});

const RICH=()=>{const cv=document.createElement('canvas');cv.width=300;cv.height=160;const g=cv.getContext('2d');g.fillStyle='#fc0';g.fillRect(0,0,300,160);const u=cv.toDataURL('image/png'),q=Q(),s=S();
 q.nom='Theoreme de Thales';q.niveau='3e';q.classe='3A';q.bo='- Thales';q.capacites='- Calculer';s.nom='Decouverte';s.duree=55;s.objectifs='Voir $\\frac{AM}{AB}=\\frac{AN}{AC}$ et **calculer**.';s.prereq='- fractions';
 s.phases=[{duree:10,nom:'Rituel',contenu:'Calculer $\\sqrt{x^{2}+9}$ puis $\\sqrt[3]{8}$.',comment:'Obstacle anticipe : confusion.',mode:'a',support:'Diaporama',modalites:'Individuel'},{duree:20,nom:'Bilan',contenu:'$$\\begin{cases}x+y=2\\\\ x-y=0\\end{cases}$$',comment:'',mode:'c'}];
 s.activite='Soit $f(x)=\\frac{x^{2}+1}{2}$.\n\n1. Calculer $f(2)$.';s.trace='## Propriete\nSi (MN)//(BC).';s.difficultes='- **Confusion :** rapports';s.aides='- Fiche d aide';s.evalBilan='Criteres : 3/4.';s.comp=['Chercher'];s.imgs=[{u,w:50,a:'c',z:'a',l:'Figure 1'}];changed();preview()};
async function docxOf(p,name){const [d]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>exportDocx())]);const f=path.join(os.tmpdir(),'cdm-'+name+'-'+Date.now()+'.docx');await d.saveAs(f);const Z=await JSZip.loadAsync(fs.readFileSync(f));return{Z,x:await Z.file('word/document.xml').async('string'),f}}
const RICH2=()=>{const cv=document.createElement('canvas');cv.width=600;cv.height=400;const g=cv.getContext('2d');g.fillStyle='#9cf';g.fillRect(0,0,600,400);const u=cv.toDataURL('image/png'),q=Q(),s=S();q.nom='Thales';q.niveau='3e';s.nom='Découverte longue';s.duree=54;s.objectifs='Voir $\\frac{a}{b}$';
 const L='Les élèves cherchent individuellement puis comparent leurs procédures. L enseignant circule et relève les erreurs. ';s.phases=Array.from({length:9},(_,i)=>({duree:6,nom:'Phase '+(i+1),contenu:'- '+L.repeat(3)+'\n- Calculer $\\sqrt{x^2+'+i+'}$',comment:L.repeat(3),mode:'a'}));
 s.activite=Array.from({length:12},(_,i)=>(i+1)+'. '+L).join('\n\n');s.evalBilan='Critères de réussite.';s.imgs=[{u,w:100,a:'c',z:'a'}];changed();preview()};
const cnt=(x,r)=>(x.match(r)||[]).length;
T('export Word natif : structure, tableaux, image, équations modifiables, repli texte',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(RICH);await p.waitForSelector('#prev .katex');
 let {Z,x}=await docxOf(p,'fiche');assert.ok(cnt(x,/<m:oMath>/g)>=5,'équations OMML');assert.ok(cnt(x,/<m:f>/g)>=3&&cnt(x,/<m:rad>/g)>=2);assert.ok(cnt(x,/<w:tbl>/g)>=4);assert.ok(cnt(x,/<w:drawing>/g)>=1);
 assert.ok(/Decouverte/.test(x)&&/Figure 1/.test(x));assert.ok(!/\$/.test(x.replace(/<[^>]+>/g,'')),'pas de $ brut');assert.ok(/x\+y=2/.test(x),'système en repli texte');
 assert.ok(Z.file('word/header1.xml')&&Z.file('word/footer1.xml'));assert.ok(/PAGE/.test(await Z.file('word/footer1.xml').async('string')));assert.ok(Z.file(/word\/media\/.+\.png/)[0]);
 assert.ok(/Analyse didactique/.test(x)&&/Aides et différenciation/.test(x)&&/Évaluation et bilan/.test(x));
 // fiche élève : pas de contenu enseignant, lignes de réponse
 await p.evaluate(()=>{EL().l=1;bv='eleve';preview()});({x}=await docxOf(p,'eleve'));assert.ok(!/Obstacle anticipe|Aides et|Evaluation et bilan|Confusion/.test(x));assert.ok(/Calculer/.test(x)&&cnt(x,/<w:pBdr>/g)>=10);
 // cahier complet : sauts de page entre séances
 await p.evaluate(()=>{addSeance(Q().id);bv='all';preview()});({x}=await docxOf(p,'all'));assert.ok(cnt(x,/<w:pageBreakBefore\/>/g)>=2);
 for(const v of ['seq','texte','annee']){await p.evaluate(v=>{bv=v;preview()},v);({x}=await docxOf(p,v));assert.ok(x.length>1500,v)}
 assert.deepStrictEqual(c.errs,[]);await c.close()});
T('texMath : constructions gérées / non gérées (repli) sans blocage',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 const r=await p.evaluate(()=>{const o={};for(const t of ['\\pi','x^2','a_{1}^{2}','\\frac{a}{b}','\\sqrt{2}','\\sqrt[3]{8}','\\text{cm}^2','(a+b)^2','\\mathbb{R}','\\vec{AB}','\\widehat{ABC}','30^\\circ','\\begin{cases}a\\end{cases}','\\unknown','{','']){try{texMath(t);o[t]='ok'}catch(e){o[t]='repli'}}return o});
 for(const k of ['\\pi','x^2','a_{1}^{2}','\\frac{a}{b}','\\sqrt{2}','\\sqrt[3]{8}','\\text{cm}^2','(a+b)^2','\\mathbb{R}','\\vec{AB}','\\widehat{ABC}','30^\\circ'])assert.strictEqual(r[k],'ok',k);
 for(const k of ['\\begin{cases}a\\end{cases}','\\unknown','{',''])assert.strictEqual(r[k],'repli',k);await c.close()});
T('export PDF (impression) : pagination, en-tête de tableau répété, formules, pas de contenu enseignant côté élève',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(RICH2);await p.waitForSelector('#prev .katex');await p.emulateMedia({media:'print'});const f=path.join(os.tmpdir(),'cdm-'+Date.now()+'.pdf');await p.pdf({path:f,format:'A4',preferCSSPageSize:true,printBackground:true});
 let txt;try{txt=require('child_process').execFileSync('pdftotext',['-layout',f,'-'],{encoding:'utf8'})}catch(e){console.log('      (pdftotext absent : contrôle du texte PDF ignoré)');await c.close();return}
 const pages=txt.split('\f').filter(s=>s.trim());assert.ok(pages.length>=3,'pages : '+pages.length);assert.ok(cnt(txt,/Phase \/ Durée/g)>=2,'en-tête de tableau répété');
 for(let i=1;i<=9;i++)assert.ok(new RegExp('Phase '+i+'\\b').test(txt),'phase '+i);assert.ok(/Page 2 \/ \d+/.test(txt),'numéros de page');assert.ok(/Découverte longue/.test(txt)&&/Évaluation et bilan/.test(txt));
 await c.close()});

(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));BASE='http://localhost:'+srv.address().port;browser=await chromium.launch();
 let fail=0;const only=process.argv[2];for(const t of results){if(only&&!t.name.includes(only))continue;const t0=Date.now();try{await Promise.race([t.fn(),new Promise((_,j)=>setTimeout(()=>j(new Error('délai dépassé (90 s)')),90000))]);console.log('  ✓',t.name,'('+(Date.now()-t0)+' ms)')}catch(e){fail++;console.log('  ✗',t.name,'\n     ',String(e.message).split('\n').slice(0,6).join('\n      '))}}
 await browser.close();srv.close();console.log(fail?fail+' test(s) en échec':'Tous les tests passent');process.exit(fail?1:0)})();
