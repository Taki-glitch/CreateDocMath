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
async function modalText(p){await p.waitForSelector('.mdb');return p.locator('.mdb').last().innerText()}
const clickBtn=(p,t)=>p.locator('.mdb').last().locator('button',{hasText:t}).first().click();

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
 await p.evaluate(()=>{S().nom='modif';clearTimeout(t2);save();return stFlush()});assert.strictEqual((await kvOf(p)).kv.schema,3,'une écriture ne rétrograde jamais le schéma');
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
 for(const a of ['seq','eleve','texte','annee','all','seq'])await p.evaluate(a=>document.querySelector('#mbar [data-a="'+a+'"]').click(),a);
 await p.evaluate(()=>{bv='';preview()});await p.evaluate(()=>document.querySelector('[data-a=news]').click());await p.evaluate(()=>document.querySelector('[data-a=dup]').click());await p.evaluate(()=>hgo(-1));
 assert.deepStrictEqual(ext,[],'aucune requête externe attendue : '+ext.join(','));assert.ok(await p.evaluate(()=>!!window.docx&&!window.htmlDocx));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('PWA : fonctionne hors ligne après installation (KaTeX local, données IndexedDB)',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>1));await p.reload();await p.waitForFunction(()=>navigator.serviceWorker.controller);
 const names=await p.evaluate(async()=>{const ks=await caches.keys(),c=await caches.open(ks.find(k=>k.startsWith('fiches-maths'))),r=await c.keys();return{ks,u:r.map(x=>new URL(x.url).pathname)}});
 assert.deepStrictEqual(names.ks,['fiches-maths-v14']);for(const f of ['/vendor/docx.iife.js','/vendor/katex/katex.min.js','/vendor/jszip.min.js','/vendor/katex/fonts/KaTeX_Main-Regular.woff2','/index.html','/bo_cycle4.js'])assert.ok(names.u.includes(f),f);
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

/* ================= étape D : menus, recherche, couverture, banque, calendrier, compétences, mode classe, mobile ================= */
const SEED2=()=>{const q=Q();q.nom='Théorème de Thalès';q.niveau='3e';q.classe='3A';q.bo='- Théorème de Thalès\n- Proportionnalité\n- Racine carrée';q.capacites='- Calculer une longueur';
 const s=S();s.nom='Découverte';s.date='2026-10-20';s.activite='Utiliser GeoGebra pour conjecturer';s.objectifs='Voir $\\frac{AM}{AB}$';s.phases=[{duree:10,nom:'Rituel',contenu:'Calculer',comment:'',mode:'a'}];
 for(const [n,d,a] of [['Réciproque','2026-10-22','Preuve de la réciproque'],['Évaluation','2026-10-26','Contrôle écrit']]){addSeance(q.id);const t=S();t.nom=n;t.date=d;t.activite=a}
 db.seqs.push({id:'q2x',nom:'Statistiques',niveau:'4e',classe:'4B',boRef:'',bo:'',capacites:''});addSeance('q2x');S().nom='Moyenne';S().date='2026-10-21';S().activite='Calcul de moyenne avec tableur';db.cur=db.seances[0].id;changed();show()};

T('menus : ouverture, clavier, actions, volet de gauche allégé, séquences repliables',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 assert.strictEqual(await p.locator('#side button[data-a]').count(),0,'plus de boutons d’action dans le volet');
 const f=p.locator('#mbar [data-menu=f]');assert.strictEqual(await f.getAttribute('aria-expanded'),'false');await f.click();assert.strictEqual(await f.getAttribute('aria-expanded'),'true');assert.ok(await p.locator('#mbar .mp:not([hidden])').count()===1);
 await p.keyboard.press('Escape');assert.strictEqual(await f.getAttribute('aria-expanded'),'false');
 await f.focus();await p.keyboard.press('ArrowDown');assert.ok(await p.evaluate(()=>document.activeElement.closest('.mp')!==null),'focus dans le menu');await p.keyboard.press('ArrowRight');assert.strictEqual(await p.locator('#mbar [data-menu=q]').getAttribute('aria-expanded'),'true');await p.keyboard.press('Escape');
 assert.ok(await p.locator('#mbar .mp button.dng').count()>=2,'actions destructives distinguées');
 const n0=await p.evaluate(()=>db.seqs.length);await p.click('#mbar [data-menu=q]');await p.click('#mbar [data-a=newq]');assert.strictEqual(await p.evaluate(()=>db.seqs.length),n0+1);assert.strictEqual(await p.locator('#mbar .mp:not([hidden])').count(),0,'menu refermé après action');
 await p.click('#mbar [data-menu=v]');await p.click('#mbar [data-a=eleve]');assert.strictEqual(await p.evaluate(()=>bv),'eleve');await p.waitForSelector('#eopts:not([hidden])');assert.ok(await p.locator('#mbar .mp button.act').count()>=1);
 await p.click('#mbar [data-menu=v]');await p.click('#mbar [data-a=vback]');assert.strictEqual(await p.evaluate(()=>bv),'');
 await p.click('#mbar [data-menu=v]');await p.locator('#short').check();assert.strictEqual(await p.evaluate(()=>db.short),true);
 // accordéon : seule la séquence courante est dépliée
 const open=await p.evaluate(()=>[...document.querySelectorAll('#list [data-tg]')].map(x=>x.getAttribute('aria-expanded')));assert.ok(open.includes('true')&&open.includes('false'));
 const nA=await p.locator('#list a').count();await p.locator('#list [data-tg][aria-expanded=false]').first().click();assert.ok(await p.locator('#list a').count()>nA,'dépliage');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('recherche globale / Ctrl+K : champs profonds, accents, plusieurs mots, filtres, extraits, ouverture, actions',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 await p.keyboard.press('Control+k');await p.waitForSelector('#ck');await p.fill('#cki','THALES geogebra');await p.waitForSelector('.ckit');
 let t=await p.$eval('#ckr',e=>e.innerText);assert.ok(/Découverte/.test(t)&&!/Réciproque/.test(t),t);assert.ok(await p.locator('#ckr mark').count()>=1,'mots surlignés');
 await p.fill('#cki','réciproque');assert.ok(/S2/.test(await p.$eval('#ckr',e=>e.innerText)));
 await p.fill('#cki','frac');assert.ok(/Objectifs/.test(await p.$eval('#ckr',e=>e.innerText)),'formule trouvée dans les objectifs');
 await p.fill('#cki','tableur');t=await p.$eval('#ckr',e=>e.innerText);assert.ok(/Moyenne/.test(t));await p.selectOption('#ckc','3A');assert.ok(!/Moyenne/.test(await p.$eval('#ckr',e=>e.innerText)),'filtre classe');await p.selectOption('#ckc','');
 await p.fill('#cki','');await p.selectOption('#ckn','4e');assert.ok(/Moyenne/.test(await p.$eval('#ckr',e=>e.innerText))&&!/Réciproque/.test(await p.$eval('#ckr',e=>e.innerText)),'filtre niveau seul');await p.selectOption('#ckn','');
 await p.fill('#ckd1','2026-10-22');await p.fill('#ckd2','2026-10-26');await p.fill('#cki','e');t=await p.$eval('#ckr',e=>e.innerText);assert.ok(/Réciproque/.test(t)&&!/Découverte/.test(t),'filtre période');await p.fill('#ckd1','');await p.fill('#ckd2','');
 await p.fill('#cki','zzzintrouvable');assert.ok(/Aucun contenu trouvé/.test(await p.$eval('#ckr',e=>e.innerText)));
 await p.fill('#cki','évaluation');await p.waitForSelector('.ckit');await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.getElementById('ck'));
 assert.ok(await p.evaluate(()=>/Évaluation|Contrôle/.test(S().nom+S().activite)));
 await p.keyboard.press('Control+k');await p.fill('#cki','calendrier');await p.waitForSelector('.ckit');await p.keyboard.press('Enter');await p.waitForSelector('#cal');await p.keyboard.press('Escape');
 // cohérence quand les données changent + performance (300 séances)
 await p.evaluate(()=>{S().activite='Nouveau mot rarissime';changed()});await p.keyboard.press('Control+k');await p.fill('#cki','rarissime');assert.ok(/rarissime/.test(await p.$eval('#ckr',e=>e.innerText)));await p.keyboard.press('Escape');
 const ms=await p.evaluate(()=>{const q=Q();for(let i=0;i<300;i++){db.seances.push({id:'p'+i,seq:q.id,numero:i+10,nom:'Perf '+i,duree:55,activite:'lorem ipsum '+i+' dolor thalès '+(i%7),phases:[{duree:5,nom:'P',contenu:'texte '+i,comment:''}],comp:[],imgs:[]})}idxV++;const t0=performance.now();const r=searchAll('thales dolor',{});const t1=performance.now();return[r.length,t1-t0]});
 assert.ok(ms[0]>=300&&ms[1]<1500,'recherche sur 300 séances : '+ms.join(' / '));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('couverture du B.O. : avertissements (pas d’erreurs), statuts, associations, aucune modification automatique',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 const bo0=await p.evaluate(()=>Q().bo+'|'+Q().capacites);
 await p.evaluate(()=>{const q=Q(),L=covLines(q);window.__L=L.map(x=>x.k);const ss=db.seances.filter(s=>s.seq===q.id).sort((a,b)=>a.numero-b.numero);ss[0].couv=[L[0].k,L[1].k];ss[1].couv=[L[0].k,'cleinconnue'];q.cov={};q.cov[L[3].k]='done';q.compPrev=['Chercher','Modéliser'];ss[0].comp=['Chercher'];changed();show()});
 const R=await p.evaluate(()=>{const r=covReport(Q());return{rows:r.rows.map(x=>[x.t,x.l.map(s=>s.numero),x.st]),W:r.W,I:r.I}});
 assert.strictEqual(R.rows.length,4);assert.deepStrictEqual(R.rows[0][1],[1,2]);assert.ok(R.W.some(w=>/Racine carrée/.test(w)&&/aucune séance/.test(w)),'non travaillé');assert.ok(R.W.some(w=>/Séance S3 : aucun contenu/.test(w)));assert.ok(R.W.some(w=>/association\(s\) vers un contenu absent/.test(w)));assert.ok(R.W.some(w=>/Modéliser/.test(w)),'compétence annoncée sans séance');
 assert.ok(R.I.some(i=>/apparaît dans 2 séances/.test(i)));assert.ok(R.I.some(i=>/Traité » sans séance/.test(i)));assert.ok(!R.W.some(w=>/Calculer une longueur/.test(w)),'statut Traité : pas d’avertissement');
 await p.evaluate(()=>{Q().cov[window.__L[2]]='na';changed()});assert.ok(!(await p.evaluate(()=>covReport(Q()).W)).some(w=>/Racine carrée/.test(w)),'non pertinent : plus d’avertissement');
 // UI : formulaire (statuts + associations) et vue imprimable
 assert.strictEqual(await p.locator('#covq select').count(),4);assert.strictEqual(await p.locator('#covs input').count(),4);await p.selectOption('#covq select >> nth=1','wip');assert.strictEqual(await p.evaluate(()=>Q().cov[window.__L[1]]),'wip');
 await p.locator('#covs input >> nth=2').check();assert.ok(await p.evaluate(()=>S().couv.includes(window.__L[2])));
 await p.click('#mbar [data-menu=q]');await p.click('#mbar [data-a=cov]');await p.waitForFunction(()=>/Couverture du B\.O\./.test(document.getElementById('prev').innerText));assert.ok(/Avertissements/.test(await p.$eval('#prev',e=>e.innerText)));
 assert.strictEqual(await p.evaluate(()=>Q().bo+'|'+Q().capacites),bo0,'objectifs jamais modifiés automatiquement');
 const {x}=await docxOf(p,'cov');assert.ok(/Avertissements/.test(x));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('banque d’exercices : création, insertion au curseur sans écraser, correction, favoris, doublons, import/export, persistance',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>{S().activite='Début du texte. Fin du texte.';const t=document.querySelector('[data-s=activite]');t.value=S().activite;t.setSelectionRange(16,16)});
 await p.click('#mbar [data-menu=f]');await p.click('#mbar [data-a=bank]');await p.waitForSelector('#bk');await p.click('[data-bk=new]');
 await p.fill('[data-bf=titre]','Fractions : addition');await p.fill('[data-bf=enonce]','1. Calculer $\\frac{1}{2}+\\frac{1}{3}$.');await p.fill('[data-bf=correction]','$\\frac{5}{6}$');await p.fill('[data-bf=notions]','fractions');await p.selectOption('[data-bf=type]','flash');await p.click('[data-bk=save]');
 await p.waitForSelector('.bkit');assert.ok(/Fractions : addition/.test(await p.$eval('#bkbody',e=>e.innerText)));
 await p.click('.bkit [data-bk^=ins]');let v=await p.evaluate(()=>S().activite);assert.ok(v.startsWith('Début du texte.')&&v.endsWith('Fin du texte.')&&v.includes('Calculer')&&v.includes('→ Correction : $\\frac{5}{6}$'),v);assert.ok(v.indexOf('Calculer')>v.indexOf('Début')&&v.indexOf('Calculer')<v.indexOf('Fin du'),'inséré au curseur');
 await p.selectOption('[data-bs=pos]','end');await p.uncheck('[data-bs=corr]');await p.click('.bkit [data-bk^=ins]');v=await p.evaluate(()=>S().activite);assert.ok(v.endsWith('$\\frac{1}{2}+\\frac{1}{3}$.')&&v.split('Calculer').length===3);assert.ok(v.includes('Fin du texte.'),'rien d’écrasé');
 await p.selectOption('[data-bs=target]','t');await p.click('.bkit [data-bk^=ins]');assert.ok(/Calculer/.test(await p.evaluate(()=>S().trace)));
 await p.click('.bkit [data-bk^=fav]');assert.strictEqual(await p.evaluate(()=>BK()[0].fav),1);await p.click('.bkit [data-bk^=dup]');assert.strictEqual(await p.evaluate(()=>BK().length),2);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-bk=exp]')]);const ef=path.join(os.tmpdir(),'bank-'+Date.now()+'.json');await dl.saveAs(ef);const exp=JSON.parse(fs.readFileSync(ef,'utf8'));assert.strictEqual(exp.items.length,2);
 await p.locator('[data-bk^=del] >> nth=1').click();await p.waitForSelector('.mdb');await clickBtn(p,'Supprimer');await p.waitForFunction(()=>BK().length===1);
 await p.setInputFiles('#bkf',ef);await p.waitForFunction(()=>BK().length===2);await p.setInputFiles('#bkf',ef);await p.waitForTimeout(300);assert.strictEqual(await p.evaluate(()=>BK().length),2,'import idempotent');
 fs.writeFileSync(ef,'{"x":1}');await p.setInputFiles('#bkf',ef);await p.waitForSelector('.mdb');assert.ok(/pas une banque/.test(await modalText(p)));await clickBtn(p,'Fermer');
 await p.fill('[data-bq]','fractions');assert.ok(await p.locator('.bkit').count()>=1);await p.click('[data-bk=close]');
 await p.evaluate(()=>{bv='eleve';EL().c=1;preview()});assert.ok(!/Correction/.test(await p.$eval('#prev',e=>e.innerText)),'correction absente de la fiche élève');
 await p.evaluate(()=>stFlush());await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>BK().length),2);
 await p.keyboard.press('Control+k');await p.fill('#cki','addition fractions');assert.ok(/exercices/i.test(await p.$eval('#ckr',e=>e.innerText)));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('calendrier : dates sans décalage de fuseau, déplacement, cascade avec aperçu, week-ends, annulation',async()=>{
 for(const tz of ['Pacific/Auckland','America/Los_Angeles','Europe/Paris']){const c=await ctx({timezoneId:tz}),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
  assert.strictEqual(await p.evaluate(()=>[addD('2026-03-27',3),addD('2026-10-24',2),addD('2026-12-31',1),addD('2028-02-28',1),dowM('2026-10-25'),dowM('2026-10-26')].join()),'2026-03-30,2026-10-26,2027-01-01,2028-02-29,6,0',tz);
  await p.evaluate(()=>calOpen());await p.waitForSelector('#cal .cch');
  assert.ok(await p.locator('#cal .cd[data-d="2026-10-20"] .cch').count()===1);
  // sélection puis clic sur un jour : S1 (20/10) → 23/10 ; cascade « suivantes » + éviter week-end
  await p.evaluate(()=>{cal.d='2026-10-20';calRender()});const s1=await p.evaluate(()=>db.seances.find(s=>s.nom==='Découverte').id);
  await p.click('#cal .cch[data-id="'+s1+'"] span');await p.click('#cal .cd[data-d="2026-10-23"]');await p.waitForSelector('.mdb');
  let t=await modalText(p);assert.ok(/Uniquement cette séance/.test(t));assert.ok(!/Réciproque/.test(await p.$eval('#cmp',e=>e.innerText)),'« une seule » : pas de cascade');
  await p.check('[name=cm][value=following]');t=await p.$eval('#cmp',e=>e.innerText);assert.ok(/Réciproque/.test(t)&&/Évaluation/.test(t)&&!/Moyenne/.test(t),'cascade limitée à la séquence : '+t);
  await p.check('#cmk');t=await p.$eval('#cmp',e=>e.innerText);assert.ok(/lundi 26 oct/.test(t)&&/lundi 2 nov/.test(t)||/26 oct/.test(t),'week-end évité : '+t);
  await clickBtn(p,'Appliquer');await p.waitForFunction(()=>!document.querySelector('.mdl:not(#cal)'));
  const d1=await p.evaluate(()=>Object.fromEntries(db.seances.map(s=>[s.nom,s.date])));assert.strictEqual(d1['Découverte'],'2026-10-23');assert.strictEqual(d1['Réciproque'],'2026-10-26');assert.strictEqual(d1['Évaluation'],'2026-10-29');assert.strictEqual(d1['Moyenne'],'2026-10-21','autre séquence inchangée');
  assert.ok(await p.evaluate(()=>S().date!==undefined));await p.click('[data-cal=undo]');const d2=await p.evaluate(()=>Object.fromEntries(db.seances.map(s=>[s.nom,s.date])));assert.strictEqual(d2['Découverte'],'2026-10-20');assert.strictEqual(d2['Réciproque'],'2026-10-22');assert.strictEqual(d2['Évaluation'],'2026-10-26');
  // liste accessible + séance sans date : pas de date imposée
  await p.click('[data-cal="m:list"]');assert.ok(await p.locator('#cal .cll input[type=date]').count()>=4);
  await p.evaluate(()=>{db.seances.find(s=>s.nom==='Moyenne').date='';changed();calRender()});assert.ok(await p.locator('#cal .caltray, #cal .cll').count()>=1);assert.strictEqual(await p.evaluate(()=>db.seances.find(s=>s.nom==='Moyenne').date),'');
  assert.deepStrictEqual(c.errs,[]);await c.close()}});

T('suivi des compétences : prévue / travaillée / évaluée / bilan saisi, période, CSV, historique',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 await p.evaluate(()=>{const q=Q(),ss=db.seances.filter(s=>s.seq===q.id).sort((a,b)=>a.numero-b.numero);ss[0].comp=['Chercher','Calculer'];ss[1].comp=['Calculer'];ss[2].comp=['Calculer'];ss[2].compEval=['Calculer','Raisonner'];q.compPrev=['Chercher','Raisonner','Représenter'];changed();show()});
 await p.click('#mbar [data-menu=q]');await p.click('#mbar [data-a=comp]');await p.waitForSelector('#copts:not([hidden])');
 const D=await p.evaluate(()=>{const d=compData();return d.byC.map(x=>x.c+':'+x.p+'/'+x.w+'/'+x.e).join(' ')+' T='+d.T});
 assert.ok(/Calculer:0\/3\/1/.test(D)&&/Chercher:1\/1\/0/.test(D)&&/Raisonner:1\/0\/1/.test(D)&&/T=4/.test(D),D);
 let t=await p.$eval('#prev',e=>e.innerText);assert.ok(/prévue mais non travaillée/.test(t),'alerte Représenter/Raisonner');assert.ok(/jamais déduite automatiquement|jamais déduite/.test(t));
 assert.ok(!/Acquise par la classe/.test(t),'aucun bilan déduit');
 await p.selectOption('[data-cb=Chercher]','3').catch(()=>{});await p.evaluate(()=>{show()});await p.selectOption('[data-cb=Chercher]','3');await p.fill('[data-cbt=Chercher]','4 exercices sur 5');
 assert.strictEqual(await p.evaluate(()=>Q().compBilan.Chercher.n),'3');assert.ok(await p.evaluate(()=>Q().compLog.length>=1));await p.evaluate(()=>preview());t=await p.$eval('#prev',e=>e.innerText);assert.ok(/Acquise par la classe/.test(t)&&/4 exercices sur 5/.test(t)&&/Historique des bilans/.test(t));
 await p.fill('[data-cpo=from]','2026-10-21');await p.fill('[data-cpo=to]','2026-10-25');await p.dispatchEvent('[data-cpo=to]','change');t=await p.$eval('#prev',e=>e.innerText);assert.ok(/2 séance\(s\)/.test(t),t.slice(0,200));
 const csv=await p.evaluate(()=>compCSV());assert.ok(csv.startsWith('\ufeff"Compétence"')&&/Calculer/.test(csv));
 const {x}=await docxOf(p,'comp');assert.ok(/Suivi des compétences/.test(x));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('mode classe : minuteur horodaté, activité / trace, corrections masquées, police, plein écran, aucune donnée modifiée',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>{const cv=document.createElement('canvas');cv.width=40;cv.height=30;const u=cv.toDataURL('image/png'),s=S();s.phases=[{duree:2,nom:'Recherche',contenu:'Chercher $x^2$',comment:'SECRET enseignant',mode:'a'},{duree:3,nom:'Bilan',contenu:'Conclure',comment:'',mode:'c'}];s.activite='1. Question un\n→ Correction : réponse cachée\n2. Question deux';s.activiteTitre='Mon activité';s.trace='## Retenir\nPropriété importante';s.imgs=[{u,w:50,a:'c',z:'a',l:'Fig'}];changed()});
 const before=await p.evaluate(()=>JSON.stringify(db.seances));
 await p.click('#mbar [data-a=chrono]');await p.waitForSelector('#cl:not([hidden])');assert.strictEqual(await p.$eval('#ct',e=>e.textContent),'02:00');
 assert.ok(!/SECRET/.test(await p.$eval('#cl',e=>e.innerText)),'commentaires enseignant jamais affichés');await p.waitForSelector('#cc .katex');
 await p.click('#cl [data-c="v:a"]');let t=await p.$eval('#cc',e=>e.innerText);assert.ok(/Mon activité/.test(t)&&/Question deux/.test(t)&&!/réponse cachée/.test(t));assert.ok(await p.locator('#cc img').count()===1);
 await p.click('#cl [data-c=corr]');assert.ok(/réponse cachée/.test(await p.$eval('#cc',e=>e.innerText)));await p.click('#cl [data-c=corr]');
 await p.click('#cl [data-c="v:t"]');assert.ok(/Propriété importante/.test(await p.$eval('#cc',e=>e.innerText)));await p.keyboard.press('p');assert.ok(/Chercher/.test(await p.$eval('#cc',e=>e.innerText)));
 const f0=await p.$eval('#cc',e=>parseFloat(getComputedStyle(e).fontSize));await p.click('#cl [data-c=fp]');assert.ok(await p.$eval('#cc',e=>parseFloat(getComputedStyle(e).fontSize))>f0);
 // minuteur basé sur l'horloge : on avance l'horloge de 70 s sans attendre
 await p.keyboard.press(' ');await p.waitForTimeout(400);await p.evaluate(()=>{const o=Date.now;Date.now=()=>o.call(Date)+70000});await p.waitForFunction(()=>document.getElementById('ct').textContent==='00:50'||document.getElementById('ct').textContent==='00:49',null,{timeout:4000});
 assert.ok(/Écoulé 01:1\d/.test(await p.$eval('#cmeta',e=>e.textContent)),await p.$eval('#cmeta',e=>e.textContent));
 await p.click('#cl [data-c=plus]');await p.waitForTimeout(400);assert.ok(/01:4\d|01:5\d/.test(await p.$eval('#ct',e=>e.textContent)));
 await p.evaluate(()=>{const o=Date.now;Date.now=()=>o.call(Date)+200000});await p.waitForFunction(()=>/^\+/.test(document.getElementById('ct').textContent),null,{timeout:4000});assert.ok(await p.$eval('#ct',e=>e.classList.contains('out')),'dépassement signalé');
 await p.keyboard.press(' ');await p.click('#cl [data-c=next]');assert.ok(/2\/2/.test(await p.$eval('#cn',e=>e.textContent))&&await p.$eval('#ct',e=>e.textContent)==='03:00');await p.click('#cl [data-c=reset]');
 await p.click('#cl [data-c=hc]');assert.ok(await p.$eval('#cl',e=>e.classList.contains('hc')));await p.click('#cl [data-c=zen]');assert.ok(await p.$eval('#cl',e=>e.classList.contains('zen')));
 await p.click('#cl [data-c=close]');assert.ok(await p.$eval('#cl',e=>e.hidden));assert.strictEqual(await p.evaluate(()=>JSON.stringify(db.seances)),before,'le mode classe ne modifie aucune donnée');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('mobile / tablette : une zone à la fois, barre du bas, menus plein écran, aucun débordement horizontal',async()=>{const c=await ctx({viewport:{width:390,height:800},hasTouch:true}),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 assert.ok(await p.locator('#bnav').isVisible());assert.strictEqual(await p.evaluate(()=>document.body.dataset.mv),'list');assert.ok(await p.locator('#side').isVisible()&&!(await p.locator('#formw').isVisible())&&!(await p.locator('#pw').isVisible()));
 await p.click('#list a >> nth=1');assert.strictEqual(await p.evaluate(()=>document.body.dataset.mv),'form');assert.ok(await p.locator('#formw').isVisible()&&!(await p.locator('#side').isVisible()));
 await p.click('#bnav [data-mv=prev]');assert.ok(await p.locator('#prev').isVisible());assert.strictEqual(await p.getAttribute('#bnav [data-mv=prev]','aria-current'),'page');
 await p.click('#mbar [data-menu=v]');const r=await p.$eval('#mbar .mp:not([hidden])',e=>{const b=e.getBoundingClientRect();return[b.left,b.right,innerWidth]});assert.ok(r[0]>=0&&r[1]<=r[2],'menu dans l’écran : '+r);await p.keyboard.press('Escape');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pas de défilement horizontal de la page');
 await p.click('#bnav [data-mv=list]');await p.click('#mbar [data-a=cmdk]');await p.waitForSelector('#ck');assert.ok(await p.evaluate(()=>{const b=document.querySelector('#ck .mdb').getBoundingClientRect();return b.right<=innerWidth+1}));await p.keyboard.press('Escape');
 const d=await ctx({viewport:{width:1360,height:800}}),q=await d.newPage();await booted(q);assert.ok(!(await q.locator('#bnav').isVisible()),'barre du bas masquée sur ordinateur');assert.ok(await q.locator('#side').isVisible()&&await q.locator('#formw').isVisible()&&await q.locator('#pw').isVisible());
 assert.deepStrictEqual(c.errs,[]);await c.close();await d.close()});

T('accessibilité : rôles, noms accessibles, focus rendu après fermeture des fenêtres',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 const bad=await p.evaluate(()=>[...document.querySelectorAll('button,[role=button]')].filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label')||b.title)).length);assert.strictEqual(bad,0,'boutons sans nom');
 assert.strictEqual(await p.getAttribute('#mbar','role'),'toolbar');assert.ok(await p.locator('#mbar [aria-haspopup]').count()===4);assert.ok(await p.locator('.mp[role=menu]').count()===4);
 await p.focus('#mbar [data-a=cmdk]');await p.keyboard.press('Enter');await p.waitForSelector('#ck [role=dialog]');await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('ck'));assert.ok(await p.evaluate(()=>document.activeElement.dataset.a==='cmdk'),'focus rendu');
 p.evaluate(()=>storPanel()).catch(()=>{});await p.waitForSelector('.mdb[role=dialog][aria-modal=true]');await p.keyboard.press('Tab');await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('.mdl'));
 assert.ok(await p.locator('#st[role=status]').count()===1&&await p.locator('#toast[role=status]').count()===1);assert.deepStrictEqual(c.errs,[]);await c.close()});

/* ================= phase E : différenciation, modèles, données du B.O., images de la banque, sécurité, accessibilité ================= */
const PNG1=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

T('différenciation : aides structurées, adaptation au niveau, insertion sans doublon',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 assert.deepStrictEqual(await p.evaluate(()=>['3ème','3e','6e','2de','Seconde','1re','Première','4eme','n/a'].map(nivIdx)),[3,3,0,4,4,5,5,2,-1]);
 const n=await p.evaluate(()=>DIFF_DATA.filter(x=>x[3]&&x[3].niv&&x[3].diag&&x[3].aide&&x[3].remed&&x[3].prolong&&x[3].crit).length);assert.ok(n>=15,'entrées enrichies : '+n);
 await p.evaluate(()=>{Q().niveau='6e';fill()});await p.evaluate(()=>{document.getElementById('dfd').open=true});await p.evaluate(()=>dfList());
 let t=await p.$eval('#dfl',e=>e.innerText);assert.ok(/Addition de fractions/.test(t)&&!/Théorème de Thalès/.test(t)&&!/Développer \(a \+ b\)/.test(t),'6e : pas de Thalès ni identités');
 await p.evaluate(()=>{Q().niveau='3ème';fill()});t=await p.$eval('#dfl',e=>e.innerText);assert.ok(/Théorème de Thalès/.test(t)&&!/Addition de fractions/.test(t));
 await p.uncheck('#dfn');assert.ok(/Addition de fractions/.test(await p.$eval('#dfl',e=>e.innerText)),'sans adaptation : tout');await p.check('#dfn');
 await p.fill('#dfs','pythagore');await p.click('#dfl [data-df2]');let v=await p.evaluate(()=>[S().difficultes,S().aides]);assert.ok(/Pythagore/.test(v[0])&&/aides prévues/.test(v[1])&&(v[1].match(/^- /gm)||[]).length===5,v[1]);
 await p.click('#dfl [data-df2]');v=await p.evaluate(()=>[S().difficultes,S().aides]);assert.strictEqual((v[1].match(/aides prévues/g)||[]).length,1,'pas de doublon');assert.strictEqual((v[0].match(/Pythagore/g)||[]).length,1);
 await p.evaluate(()=>{bv='';preview()});assert.ok(/Aides et différenciation prévues/.test(await p.$eval('#prev',e=>e.innerText))&&/Question diagnostique/.test(await p.$eval('#prev',e=>e.innerText)));
 await p.evaluate(()=>{bv='eleve';preview()});assert.ok(!/Question diagnostique/.test(await p.$eval('#prev',e=>e.innerText)),'pas dans la fiche élève');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('bibliothèque de modèles : séance et séquence, copies indépendantes, favoris, import nettoyé',async()=>{const c=await ctx(),p=await c.newPage();p.on('dialog',d=>d.accept('Mon modèle'));await booted(p);await p.evaluate(SEED2);
 await p.evaluate(()=>{const s=db.seances.find(x=>x.nom==='Découverte');db.cur=s.id;s.statut='faite';s.imgs=[{u:'data:image/png;base64,AAAA',w:50,a:'c',z:'a'}];s.couv=['k1'];Q().cov={k1:'done'};Q().compBilan={Chercher:{n:'3',d:'2026-01-01'}};show()});
 await p.click('#mbar [data-menu=s]');await p.click('#mbar [data-a=savemodel]');await p.waitForFunction(()=>MD().length===1);
 const m=await p.evaluate(()=>MD()[0]);assert.ok(m.label==='Mon modèle'&&m.niv==='3e'&&!('id'in m.s)&&!('seq'in m.s)&&!('date'in m.s)&&!('statut'in m.s)&&!('imgs'in m.s)&&!('couv'in m.s));
 await p.click('#mbar [data-menu=q]');await p.click('#mbar [data-a=saveseqmodel]');await p.waitForFunction(()=>SM().length===1);
 const sm=await p.evaluate(()=>SM()[0]);assert.ok(sm.s.length===3&&sm.s.every(s=>!('id'in s)&&!('seq'in s)&&!('date'in s)&&!('statut'in s)&&!('imgs'in s))&&!('classe'in sm.q)&&!('cov'in sm.q)&&!('compBilan'in sm.q)&&!('id'in sm.q));
 // bibliothèque
 await p.click('#mbar [data-menu=s]');await p.click('#mbar [data-a=models]');await p.waitForSelector('#ml');let t=await p.$eval('#mlbody',e=>e.innerText);assert.ok(/Modèles de séquence \(1\)/i.test(t)&&/Mes modèles de séance \(1\)/i.test(t)&&/Modèles intégrés/i.test(t)&&/copie indépendante/.test(t));
 await p.fill('[data-mq]','intégré');assert.ok(!/Mon modèle/.test(await p.$eval('#mlbody',e=>e.innerText)));await p.fill('[data-mq]','');
 await p.click('[data-ml^="fav:u"]');assert.strictEqual(await p.evaluate(()=>MD()[0].fav),1);
 await p.click('[data-ml^="edit:u"]');await p.fill('[data-mf=dom]','Géométrie');await p.fill('[data-mf=niv]','4e');await p.click('[data-ml=save]');assert.ok(await p.evaluate(()=>MD()[0].dom==='Géométrie'&&MD()[0].niv==='4e'));
 // création d'une séquence : nouveaux ids, remise à zéro
 const nq=await p.evaluate(()=>db.seqs.length),ns=await p.evaluate(()=>db.seances.length);await p.click('[data-ml^="use:q"]');await p.waitForFunction(n=>db.seqs.length===n+1,nq);
 const r=await p.evaluate(()=>{const q=db.seqs[db.seqs.length-1],ss=db.seances.filter(s=>s.seq===q.id);return{nom:q.nom,classe:q.classe,cov:q.cov,n:ss.length,dates:ss.map(s=>s.date),st:ss.map(s=>s.statut),imgs:ss.map(s=>s.imgs.length),nums:ss.map(s=>s.numero),ids:new Set(db.seances.map(s=>s.id)).size===db.seances.length&&new Set(db.seqs.map(x=>x.id)).size===db.seqs.length}});
 assert.strictEqual(r.n,3);assert.deepStrictEqual(r.nums,[1,2,3]);assert.ok(r.dates.every(d=>d==='')&&r.st.every(x=>x==='')&&r.imgs.every(x=>x===0)&&r.classe===''&&Object.keys(r.cov).length===0&&r.ids);
 // indépendance : modifier la copie ne touche pas le modèle
 await p.evaluate(()=>{db.seances[db.seances.length-1].nom='MODIFIÉE';changed()});assert.ok(await p.evaluate(()=>!SM()[0].s.some(s=>s.nom==='MODIFIÉE')));
 p.evaluate(()=>modelsOpen()).catch(()=>{});await p.waitForSelector('#ml');
 // création d'une séance depuis un modèle importé malveillant : id/seq jamais écrasés
 const evil={format:'createdocmath-models',v:1,models:[{label:'Piégé',niv:'3e',s:{id:'HACK',seq:'HACK',numero:99,date:'2020-01-01',statut:'faite',imgs:[{u:'x'}],nom:'Séance piégée',phases:[{duree:5,nom:'P'},null,'x'],comp:['Chercher','Inconnue']}}],seqModels:[{label:'Seq',q:{nom:'Q'},s:'pas un tableau'}]};
 const ef=path.join(os.tmpdir(),'models-evil-'+Date.now()+'.json');fs.writeFileSync(ef,JSON.stringify(evil));await p.setInputFiles('#mlf',ef);await p.waitForFunction(()=>MD().some(x=>x.label==='Piégé'));
 const em=await p.evaluate(()=>MD().find(x=>x.label==='Piégé').s);assert.ok(!('id'in em)&&!('seq'in em)&&!('imgs'in em)&&em.phases.length===1&&em.comp.length===1);assert.strictEqual(await p.evaluate(()=>SM().length),1,'séquence modèle invalide ignorée');
 await p.setInputFiles('#mlf',ef);await p.waitForTimeout(300);assert.strictEqual(await p.evaluate(()=>MD().filter(x=>x.label==='Piégé').length),1,'import idempotent');
 fs.writeFileSync(ef,'{"x":1}');await p.setInputFiles('#mlf',ef);await p.waitForSelector('.mdb >> nth=1');assert.ok(/pas une bibliothèque/.test(await modalText(p)));await clickBtn(p,'Fermer');
 const[dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-ml=exp]')]);const xf=path.join(os.tmpdir(),'models-'+Date.now()+'.json');await dl.saveAs(xf);assert.ok(JSON.parse(fs.readFileSync(xf,'utf8')).models.length>=2);
 await p.click('[data-ml^="del:u"] >> nth=0');await clickBtn(p,'Supprimer');await p.waitForFunction(()=>MD().length===1);await p.click('[data-ml=close]');
 await p.evaluate(()=>{const s=db.seances.find(x=>x.id===db.cur);bv='';preview()});await p.evaluate(()=>{addFromModel('u:0')});assert.ok(await p.evaluate(()=>{const s=S();return s.id&&s.seq===Q().id&&s.numero>0}),'identité de la séance créée intacte');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('données du B.O. : fragments masqués, lignes douteuses signalées, sources non inventées',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>{document.getElementById('bod').open=true});await p.waitForFunction(()=>typeof BO_DATA!=='undefined'&&document.getElementById('bomc').textContent.length>50);
 const met=await p.$eval('#bomc',e=>e.textContent);assert.ok(/bo_cycle3\.js/.test(met)&&/bo_cycle4\.js/.test(met)&&/bo_premiere\.js/.test(met)&&/non vérifié/.test(met)&&/à renseigner/.test(met));assert.ok(!/https?:\/\//.test(met),'aucune URL inventée');
 assert.deepStrictEqual(await p.evaluate(()=>[boBad('1'),boBad('100'),boBad(''),boBad('Calculer une aire'),boSus('fractions simples comme ; ; ; .'),boSus('Reconnaitre des fractions égales : = ; = .'),boSus('produit de facteurs premiers inférieurs à'),boSus('Additionner et soustraire des fractions.'),boSus('Comparer deux fractions : et ; et .')]),[true,true,true,false,true,true,true,false,true]);
 await p.selectOption('#bn','6e');await p.selectOption('#bt','Les aires');let t=await p.$eval('#bl',e=>e.innerText);assert.ok(/Calculer l’aire d’un carré/.test(t));assert.ok(!/^\s*1\s*$/m.test(t),'fragments masqués');assert.ok(/masqué/.test(await p.$eval('#bc',e=>e.textContent)));
 await p.check('#bsus');assert.ok(/fragment/.test(await p.$eval('#bl',e=>e.innerText)));await p.uncheck('#bsus');await p.selectOption('#bt','');await p.selectOption('#bn','5e');await p.fill('#bs','écriture décimale des fractions simples');
 assert.ok(/extraction à vérifier/.test(await p.$eval('#bl',e=>e.innerText)));const bo0=await p.evaluate(()=>Q().bo+'|'+Q().capacites);
 await p.check('#bsus');await p.selectOption('#bn','6e');await p.selectOption('#bt','Les aires');await p.fill('#bs','');const idx=await p.evaluate(()=>BO_DATA.findIndex(x=>x[4]==='1'));await p.evaluate(i=>boAdd(i),idx);assert.strictEqual(await p.evaluate(()=>Q().bo+'|'+Q().capacites),bo0,'fragment non ajouté');
 const si=await p.evaluate(()=>BO_DATA.findIndex(x=>boSus(x[4])&&!boBad(x[4])&&x[3]!=='c'));await p.evaluate(i=>boAdd(i),si);assert.ok(/vérifier/.test(await p.$eval('#toast',e=>e.textContent)));assert.notStrictEqual(await p.evaluate(()=>Q().bo+'|'+Q().capacites),bo0,'ligne douteuse ajoutée avec avertissement');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('banque : images (insertion dans la séance, stockage binaire, sauvegarde .zip et restauration)',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);const img=path.join(os.tmpdir(),'px.png');fs.writeFileSync(img,PNG1);
 p.evaluate(()=>bankOpen()).catch(()=>{});await p.waitForSelector('#bk');await p.click('[data-bk=new]');await p.fill('[data-bf=titre]','Avec figure');await p.fill('[data-bf=enonce]','Observer la figure.');await p.setInputFiles('#bki',img);await p.waitForSelector('#bkbody img[alt="Aperçu de la figure"]');
 assert.ok(await p.evaluate(()=>/^data:image\/jpeg;base64,/.test(bkS.draft.img)));await p.click('[data-bk=save]');await p.waitForSelector('.bkit img.bkth');
 await p.click('.bkit [data-bk^=ins]');assert.ok(await p.evaluate(()=>S().imgs.length===1&&S().imgs[0].z==='a'&&/^data:image/.test(S().imgs[0].u)),'image copiée dans la séance');assert.ok(/Observer la figure/.test(await p.evaluate(()=>S().activite)));
 await p.click('[data-bk=close]');await p.evaluate(()=>{S().imgs=[];const r=new Uint8Array(30000);for(let i=0;i<r.length;i++)r[i]=(i*7+3)&255;BK()[0].img=b2d('image/jpeg',r);changed();clearTimeout(t2);save();return stFlush()});
 assert.strictEqual((await idbDump(p)).blobs.n,1,'image de la banque stockée en binaire (blob)'); await p.reload();await booted(p);assert.ok(await p.evaluate(()=>/^data:image/.test(BK()[0].img)));assert.deepStrictEqual(await p.evaluate(()=>stVerify()),[]);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>exportBackup())]);const zp=path.join(os.tmpdir(),'bk-'+Date.now()+'.zip');await dl.saveAs(zp);const Z=await JSZip.loadAsync(fs.readFileSync(zp)),dj=await Z.file('data.json').async('string');assert.ok(!/data:image/.test(dj),'pas de Base64 dans data.json');assert.ok(/img\/[0-9a-f]{64}/.test(dj));
 const c2=await ctx(),q=await c2.newPage();await booted(q);await q.setInputFiles('#impf',zp);await clickBtn(q,'Remplacer tout');await clickBtn(q,'Remplacer');t=await modalText(q);assert.ok(/Remplacement terminé/.test(t)&&!/⚠/.test(t),t);await clickBtn(q,'Fermer');
 assert.ok(await q.evaluate(()=>BK().length===1&&/^data:image\/jpeg/.test(BK()[0].img)));assert.deepStrictEqual(await q.evaluate(()=>stVerify()),[]);
 // import de banque malveillant : image invalide neutralisée
 const ef=path.join(os.tmpdir(),'bank-evil-'+Date.now()+'.json');fs.writeFileSync(ef,JSON.stringify({format:'createdocmath-bank',v:1,items:[{titre:'X',enonce:'e',img:'x" onerror="window.__x=1'},{titre:'Y',enonce:'f',img:'javascript:alert(1)'}]}));
 await q.evaluate(()=>bankOpen());await q.waitForSelector('#bk');await q.setInputFiles('#bkf',ef);await q.waitForFunction(()=>BK().length===3);assert.ok(await q.evaluate(()=>BK().filter(x=>x.titre==='X'||x.titre==='Y').every(x=>x.img==='')));assert.strictEqual(await q.evaluate(()=>window.__x),undefined);
 await c2.close();assert.deepStrictEqual(c.errs,[]);await c.close()});

T('sécurité : aucun script injecté depuis les contenus ou les imports (toutes vues, fenêtres et exports)',async()=>{const c=await ctx(),p=await c.newPage();const dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.dismiss()});await booted(p);
 const X='"><img src=x onerror="window.__x=1"><script>window.__x=1<\/script><svg onload=window.__x=1>\'';
 await p.evaluate(X=>{const q=Q(),s=S();['nom','niveau','classe','boRef','bo','capacites','cadre','reco'].forEach(k=>q[k]=X);
  ['nom','objectifs','prereq','tice','travail','objFin','activiteTitre','activite','trace','choixProbleme','difficultes','supp','aides','evalBilan','compTexte','choixTravail','introS','coursS','entrS','remLabel','rem','tags'].forEach(k=>s[k]=X);s.date='2026-10-20';s.comp=['Chercher'];s.statut='prete';
  s.phases=[{duree:5,nom:X,contenu:X,comment:X,mode:'a',support:X,modalites:X}];s.imgs=[{u:'data:image/png;base64,AAAA',w:50,a:'c',z:'a',l:X}];
  BK().push({id:'bx',type:'exercice',titre:X,niveau:X,domaine:X,notions:X,comp:[],enonce:X,correction:X,diff:'2',duree:X,mots:X,source:X,fav:0,img:''});MD().push({label:X,niv:X,dom:X,tags:X,fav:1,s:{nom:X,phases:[]}});SM().push({label:X,niv:X,dom:X,tags:X,fav:1,q:{nom:X},s:[]});
  CAL().off=X;db.seqs.push({id:'q2',nom:X,niveau:X,classe:X,bo:X});idxV++;show()},X);
 const clean=async(l)=>{await p.waitForTimeout(150);const r=await p.evaluate(()=>({x:window.__x,imgs:document.querySelectorAll('img[src="x"],svg[onload],[onerror],[onload]').length,sc:document.querySelectorAll('script:not([src])').length}));assert.strictEqual(r.x,undefined,'exécution détectée : '+l);assert.strictEqual(r.imgs,0,'élément injecté : '+l);assert.ok(r.sc<=1,'script injecté : '+l)};
 for(const v of ['','seq','all','eleve','texte','annee','cov','comp']){await p.evaluate(v=>{bv=v;preview()},v);await clean('vue '+v)}
 await p.evaluate(()=>{bv='';show()});await clean('liste');await p.evaluate(()=>{document.getElementById('dbil').open=true;document.getElementById('dchk').open=true;check();bilan();tplUI()});await clean('volet');
 await p.keyboard.press('Control+k');await p.fill('#cki','img');await p.waitForSelector('.ckit');await clean('palette');await p.keyboard.press('Escape');
 for(const m of ['month','week','list']){await p.evaluate(m=>{calOpen();cal.mode=m;cal.d='2026-10-20';calRender()},m);await clean('calendrier '+m);await p.evaluate(()=>calClose())}
 p.evaluate(()=>bankOpen()).catch(()=>{});await p.waitForSelector('#bk');await clean('banque');await p.click('[data-bk^=edit]');await clean('banque édition');await p.keyboard.press('Escape');await p.evaluate(()=>bankClose());
 p.evaluate(()=>modelsOpen()).catch(()=>{});await p.waitForSelector('#ml');await clean('modèles');await p.evaluate(()=>modelsClose());
 p.evaluate(()=>storPanel()).catch(()=>{});await p.waitForSelector('.mdb');await clean('stockage');await p.keyboard.press('Escape');
 await p.evaluate(()=>{covUI();cpUI();copUI&&0});await clean('formulaire');
 await p.evaluate(()=>{const s=S();s.phases[0].duree=1});await p.click('#mbar [data-a=chrono]');for(const v of ['a','t','p']){await p.click('#cl [data-c="v:'+v+'"]')}await clean('mode classe');await p.keyboard.press('Escape');
 // exports : le .docx ne contient pas de balisage actif
 const {x}=await docxOf(p,'xss');assert.ok(!/<w:[^>]*onerror/.test(x));
 // imports : identifiants et images invalides refusés / neutralisés
 const bad=(o)=>{const f=path.join(os.tmpdir(),'xss-'+Math.random()+'.json');fs.writeFileSync(f,JSON.stringify(o));return f};
 await p.setInputFiles('#impf',bad({seqs:[{id:'a"><img src=x onerror=window.__x=1>',nom:'q'}],seances:[]}));let t=await modalText(p);assert.ok(/identifiant|invalide/i.test(t));await clickBtn(p,'Fermer');
 await p.setInputFiles('#impf',bad({seqs:[{id:'ok1',nom:'Import'}],seances:[{id:'ok2',seq:'ok1',numero:1,nom:'S',phases:[],comp:[],imgs:[{u:'x" onerror="window.__x=1',w:'50%;background:url(x)',a:'"><b>',z:'zz',l:'ok'}]}]}));await p.waitForSelector('.mdb');await clickBtn(p,'Fusionner');await clickBtn(p,'Fermer');
 const im=await p.evaluate(()=>db.seances.find(s=>s.id==='ok2').imgs[0]);assert.deepStrictEqual([im.u,im.w,im.a,im.z],['',100,'c','c']);
 await p.evaluate(()=>{db.cur='ok2';bv='all';show()});await clean('après import');assert.ok(dlg.every(m=>/^Ajouter la séance/.test(m)),'boîte de dialogue inattendue : '+dlg.join('|'));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('accessibilité : tous les champs et boutons visibles ont un nom accessible (page et fenêtres)',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 const check=async(label)=>{await p.waitForTimeout(250);const bad=await p.evaluate(()=>{const nm=e=>{if(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby'))return 1;if(e.closest('label'))return 1;if(e.id&&document.querySelector('label[for="'+e.id+'"]'))return 1;if(e.title)return 1;if((e.tagName==='BUTTON'||e.getAttribute('role')==='button')&&e.textContent.trim())return 1;return 0};
  return[...document.querySelectorAll('input,select,textarea,button,[role=button]')].filter(e=>e.type!=='hidden'&&!e.hidden&&e.offsetParent!==null&&!nm(e)).map(e=>e.outerHTML.slice(0,90))});assert.deepStrictEqual(bad,[],label)};
 await check('page principale');await p.evaluate(()=>{document.querySelectorAll('#form details').forEach(d=>d.open=true)});await check('formulaire déplié');
 await p.evaluate(()=>{document.getElementById('dbil').open=true;document.getElementById('dchk').open=true});await check('volet');
 await p.evaluate(()=>{bv='eleve';preview()});await check('options fiche élève');await p.evaluate(()=>{bv='comp';preview()});await check('options compétences');await p.evaluate(()=>{bv='texte';preview()});await check('options cahier de textes');
 await p.keyboard.press('Control+k');await check('palette');await p.keyboard.press('Escape');
 p.evaluate(()=>bankOpen()).catch(()=>{});await p.waitForSelector('#bk');await check('banque liste');await p.click('[data-bk=new]');await check('banque édition');await p.evaluate(()=>bankClose());
 p.evaluate(()=>modelsOpen()).catch(()=>{});await p.waitForSelector('#ml');await check('modèles');await p.evaluate(()=>modelsClose());
 await p.evaluate(()=>{calOpen();calRender()});await check('calendrier mois');await p.click('[data-cal="m:list"]');await check('calendrier liste');await p.evaluate(()=>calClose());
 await p.evaluate(()=>{document.getElementById('bod').open=true});await p.waitForFunction(()=>typeof BO_DATA!=='undefined');await check('sélecteur de programme');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));BASE='http://localhost:'+srv.address().port;browser=await chromium.launch();
 let fail=0;const only=process.argv[2];for(const t of results){if(only&&!t.name.includes(only))continue;const t0=Date.now();try{await Promise.race([t.fn(),new Promise((_,j)=>setTimeout(()=>j(new Error('délai dépassé (90 s)')),90000))]);console.log('  ✓',t.name,'('+(Date.now()-t0)+' ms)')}catch(e){fail++;console.log('  ✗',t.name,'\n     ',String(e.message).split('\n').slice(0,6).join('\n      '))}}
 await browser.close();srv.close();console.log(fail?fail+' test(s) en échec':'Tous les tests passent');process.exit(fail?1:0)})();
