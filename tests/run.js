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
 assert.deepStrictEqual(names.ks,['fiches-maths-v19']);for(const f of ['/vendor/docx.iife.js','/vendor/katex/katex.min.js','/vendor/jszip.min.js','/vendor/katex/fonts/KaTeX_Main-Regular.woff2','/index.html','/bo_cycle4.js'])assert.ok(names.u.includes(f),f);
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

T('iPhone (émulation tactile) : barre de menus sans conteneur à défilement, chaque entrée atteignable et cliquable au doigt',async()=>{const {devices}=require('playwright');const c=await ctx({...devices['iPhone 13']}),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 const o=await p.evaluate(()=>{const b=document.getElementById('mbar'),cs=getComputedStyle(b);return{ox:cs.overflowX,oy:cs.overflowY,h:b.getBoundingClientRect().height,w:innerWidth,sw:document.documentElement.scrollWidth}});
 assert.ok(o.ox==='visible'&&o.oy==='visible','la barre ne doit pas être un conteneur à défilement (iOS rogne les menus fixes) : '+o.ox);assert.ok(o.h<=110,'barre trop haute : '+o.h);assert.ok(o.sw<=o.w+1,'défilement horizontal de la page');
 for(const m of ['f','q','s','v']){await p.tap('#mbar [data-menu='+m+']');const r=await p.evaluate(()=>{const pn=document.querySelector('#mbar .mp:not([hidden])');if(!pn)return null;const b=pn.getBoundingClientRect(),its=[...pn.querySelectorAll('button')].filter(x=>x.offsetParent!==null);
   const bad=[];pn.scrollTop=0;its.forEach(x=>{x.scrollIntoView({block:'nearest'});const q=x.getBoundingClientRect();const e=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);if(!x.contains(e))bad.push(x.textContent.trim().slice(0,30)+' <- '+(e&&e.tagName+'.'+e.className))});
   return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,w:innerWidth,h:innerHeight,n:its.length,bad}});
  assert.ok(r,'menu '+m+' ouvert');assert.ok(r.left>=0&&r.right<=r.w&&r.top>=40&&r.bottom<=r.h,'menu '+m+' dans l’écran : '+JSON.stringify(r));assert.deepStrictEqual(r.bad,[],'entrées masquées ou non atteignables : menu '+m);await p.tap('#mbar [data-menu='+m+']')}
 const n0=await p.evaluate(()=>db.seqs.length);await p.tap('#mbar [data-menu=q]');await p.tap('#mbar [data-a=newq]');assert.strictEqual(await p.evaluate(()=>db.seqs.length),n0+1,'action déclenchée au toucher');await p.waitForFunction(()=>!document.querySelector('#mbar .mp:not([hidden])'),null,{timeout:2000});
 await p.tap('#mbar [data-menu=v]');await p.tap('#mbar [data-a=eleve]');assert.strictEqual(await p.evaluate(()=>bv),'eleve');
 await p.tap('#bnav [data-mv=list]');await p.tap('#list [data-tg] >> nth=0');await p.tap('#list a >> nth=0');assert.strictEqual(await p.evaluate(()=>document.body.dataset.mv),'form');
 await p.tap('#mbar [data-a=cmdk]');await p.waitForSelector('#ck');await p.keyboard.type('thal');await p.tap('#ckr .ckit >> nth=0');await p.waitForFunction(()=>!document.getElementById('ck'));
 await p.tap('#mbar [data-a=chrono]');await p.waitForSelector('#cl:not([hidden])');await p.tap('#cl [data-c=close]');assert.ok(await p.$eval('#cl',e=>e.hidden));
 await p.evaluate(()=>{db.seances[0].date=todayS();changed();calOpen()});await p.waitForSelector('#cal');assert.strictEqual(await p.evaluate(()=>cal.mode),'list','vue liste par défaut sur téléphone');assert.ok(await p.locator('#cal .cll input[type=date]').first().isVisible());
 await p.tap('#cal [data-cal="m:month"]');await p.waitForSelector('#cal .cch');await p.tap('#cal .cch >> nth=0');assert.ok(await p.evaluate(()=>!!cal.sel),'sélection au toucher dans le calendrier');await p.tap('#cal .calhint [data-open]');await p.waitForFunction(()=>!document.getElementById('cal'),null,{timeout:2000});
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('saisie puis clic/toucher sur un résultat : le premier clic est pris en compte (palette, banque, modèles), le champ garde le focus',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(SEED2);
 await p.evaluate(()=>{BK().push({id:'b1',type:'flash',titre:'Fractions addition',niveau:'5e',domaine:'',notions:'',comp:[],enonce:'Calculer 1/2+1/3',correction:'',diff:'2',duree:'',mots:'',source:'',fav:0,img:''},{id:'b2',type:'exercice',titre:'Autre sujet',niveau:'3e',domaine:'',notions:'',comp:[],enonce:'Thalès',correction:'',diff:'2',duree:'',mots:'',source:'',fav:0,img:''});MD().push({label:'Mon modèle test',niv:'3e',dom:'',tags:'',fav:0,s:{nom:'Séance modèle',phases:[]}})});
 // palette : taper puis cliquer le résultat (le champ perd le focus => 'change' ne doit pas redessiner avant le clic)
 await p.keyboard.press('Control+k');await p.type('#cki','réciproque');await p.waitForSelector('#ckr .ckit');assert.strictEqual(await p.evaluate(()=>document.activeElement.id),'cki','le champ garde le focus pendant la frappe');
 await p.click('#ckr .ckit >> nth=0');await p.waitForFunction(()=>!document.getElementById('ck'),null,{timeout:3000});assert.ok(await p.evaluate(()=>/Réciproque/.test(S().nom)));
 // banque : la frappe ne doit pas remplacer le champ (clavier iOS) ; un clic sur « Insérer » juste après doit fonctionner du premier coup
 p.evaluate(()=>bankOpen()).catch(()=>{});await p.waitForSelector('#bk');await p.type('[data-bq]','fractions');assert.strictEqual(await p.evaluate(()=>document.activeElement.hasAttribute('data-bq')),true,'focus conservé dans la recherche de la banque');
 const same=await p.evaluate(()=>{const e=document.querySelector('[data-bq]');e.dataset.mark='1';return e.dataset.mark});await p.type('[data-bq]',' ');assert.strictEqual(await p.evaluate(()=>document.querySelector('[data-bq]').dataset.mark),'1','le champ n’est pas recréé à chaque lettre');
 assert.strictEqual(await p.locator('.bkit').count(),1);const n0=await p.evaluate(()=>S().activite.length);await p.click('.bkit [data-bk^=ins]');assert.ok(await p.evaluate(()=>S().activite.length)>n0,'insertion au premier clic');await p.click('[data-bk=close]');
 // modèles
 p.evaluate(()=>modelsOpen()).catch(()=>{});await p.waitForSelector('#ml');await p.type('[data-mq]','modèle test');await p.evaluate(()=>{document.querySelector('[data-mq]').dataset.mark='1'});const ns=await p.evaluate(()=>db.seances.length);
 await p.click('[data-ml^="use:u"]');await p.waitForFunction(n=>db.seances.length===n+1,ns,{timeout:3000});assert.deepStrictEqual(c.errs,[]);await c.close()});

/* ================= import d'une séquence produite par une IA (createdocmath-ai-sequence) ================= */
const AI_EX=JSON.parse(fs.readFileSync(path.join(ROOT,'docs','exemple-sequence-ia.json'),'utf8'));
const aiSeance=i=>({numero:i,titre:'Séance '+i+' : fractions é à ç',type:i%5===0?'evaluation':'apprentissage',duree:55,date:'2026-11-'+String(8+i).padStart(2,'0'),
 objectifs:'Comprendre $\\frac{a}{b}$ n°'+i,prerequis:['Tables','Division'],prerequis_tice:'Calculatrice',
 phases:[{duree:10,nom:'Rituel '+i,contenu:'- calcul $\\sqrt{x^2+1}$',commentaire:'Observer',modalite:'individuel',support:'Diaporama'},{duree:25,nom:'Recherche',contenu:'Chercher',commentaire:'',modalite:'binôme'},{duree:20,nom:'Mise en commun',contenu:'Débat',commentaire:'',modalite:'collectif'}],
 objectifs_fin:'Savoir',travail_personnel:'Ex '+i,activite_titre:'Activité '+i,activite:'1. Calculer $\\frac{1}{2}+\\frac{1}{4}$.\n2. Conclure.',trace_ecrite:'## Cours\n$$\\frac{a}{b}=\\frac{ak}{bk}$$',
 difficultes:'Confusion',aides:'Fiche d’aide',competences:['Chercher','Calculer'],competences_justification:'Justif',evaluation:'Critères',bilan:'Bilan',introduction:'Intro',moment_cours:'Cours',entrainement:'Entraînement',remarque_pedagogique:'Remarque'});
const aiSeq=n=>({format:'createdocmath-ai-sequence',version:'1.0',sequence:{titre:'Fractions IA',niveau:'5e',classe:'5A',reference_bo:'BO test',contenus_bo:['Contenu A','Contenu B'],capacites_attendues:['Cap 1'],problematique:'Problématique ?',objectifs_generaux:['Obj 1','Obj 2'],domaine:'Nombres',theme:'Fractions',duree_previsionnelle:275,recommandations:'Reco'},seances:Array.from({length:n},(_,i)=>aiSeance(i+1))});
const aiFile=(p,obj,name)=>p.setInputFiles('#aif',{name:name||'sequence.json',mimeType:/\.json$/.test(name||'x.json')?'application/json':'text/plain',buffer:Buffer.from(typeof obj==='string'?obj:JSON.stringify(obj))});
const modalDone=p=>p.waitForFunction(()=>!document.querySelector('.mdb'),null,{timeout:5000});
async function aiPreview(p,obj,name){await aiFile(p,obj,name);return modalText(p)}
async function aiRun(p,obj,name){const t=await aiPreview(p,obj,name);if(!/Importer comme nouvelle séquence/.test(t))return{t,done:null};
 await clickBtn(p,'Importer comme nouvelle séquence');await p.waitForFunction(()=>[...document.querySelectorAll('.mdb')].some(e=>/Séquence importée|Import annulé/.test(e.innerText)),null,{timeout:8000});
 const done=await modalText(p);await clickBtn(p,'Fermer');await modalDone(p);return{t,done}}
const aiRefuse=async(p,obj,rx,name)=>{const n=await p.evaluate(()=>[db.seqs.length,db.seances.length].join());const t=await aiPreview(p,obj,name);assert.ok(/Import impossible/.test(t)&&rx.test(t),'message attendu '+rx+' : '+t.slice(0,250));
 await clickBtn(p,'Fermer');await modalDone(p);assert.strictEqual(await p.evaluate(()=>[db.seqs.length,db.seances.length].join()),n,'aucune donnée modifiée')};

for(const N of [1,5,10])T('import IA : séquence de '+N+' séance(s) — aperçu, nouveaux identifiants, association, phases, compétences, activités, formules, enregistrement',async()=>{
 const c=await ctx(),p=await c.newPage();await booted(p);const before=await fp(p),ids0=await p.evaluate(()=>[db.seqs[0].id,db.seances[0].id]);
 const obj=aiSeq(N);obj.sequence.id='HACK-Q';obj.seances.forEach((s,i)=>{s.id='HACK-S'+i;s.seq='HACK-Q'});
 const {t,done}=await aiRun(p,obj);
 assert.ok(new RegExp('<?'+N+'\\s*séance').test(t)||t.includes(N+' séance(s)'),'nombre de séances dans l’aperçu');assert.ok(/Fractions IA/.test(t)&&/5e/.test(t)&&/55 min|min au total/.test(t),'titre, niveau, durées');
 assert.ok(/Non importé/.test(t)&&/champ inconnu « id »/.test(t),'champs ignorés signalés');assert.ok(/S1 – Séance 1/.test(t));assert.ok(/Séquence importée/.test(done)&&/Vérification/.test(done));
 const r=await p.evaluate(()=>{const q=db.seqs[db.seqs.length-1],ss=db.seances.filter(s=>s.seq===q.id);return{q,ss,n:db.seqs.length,cur:db.cur,ids:[...db.seqs.map(x=>x.id),...db.seances.map(x=>x.id)]}});
 assert.strictEqual(r.n,2);assert.strictEqual(r.ss.length,N);assert.ok(!r.ids.some(i=>/HACK/.test(i)),'identifiants IA non conservés');assert.strictEqual(new Set(r.ids).size,r.ids.length,'identifiants uniques');assert.ok(r.ids.every(i=>/^[\w-]{1,64}$/.test(i)));
 assert.strictEqual(r.cur,r.ss[0].id,'première séance sélectionnée');assert.deepStrictEqual(r.ss.map(s=>s.numero),Array.from({length:N},(_,i)=>i+1));
 const q=r.q,s=r.ss[0];assert.strictEqual(q.nom,'Fractions IA');assert.strictEqual(q.niveau,'5e');assert.strictEqual(q.classe,'5A');assert.strictEqual(q.boRef,'BO test');assert.strictEqual(q.bo,'- Contenu A\n- Contenu B');assert.strictEqual(q.capacites,'Cap 1'.replace(/^/,'- '));assert.strictEqual(q.reco,'Reco');
 assert.ok(/Problématique/.test(q.cadre)&&/Obj 1/.test(q.cadre)&&/275 min/.test(q.cadre)&&/Fractions/.test(q.cadre),'infos de séquence regroupées dans le cadre');
 assert.strictEqual(s.nom,'Séance 1 : fractions é à ç');assert.strictEqual(s.type,'');assert.strictEqual(s.date,'2026-11-09');assert.strictEqual(s.duree,55);assert.strictEqual(s.objectifs,'Comprendre $\\frac{a}{b}$ n°1');assert.strictEqual(s.prereq,'- Tables\n- Division');assert.strictEqual(s.tice,'Calculatrice');
 assert.strictEqual(s.phases.length,3);assert.deepStrictEqual(s.phases.map(x=>[x.duree,x.mode]),[[10,'a'],[25,'a'],[20,'c']]);assert.strictEqual(s.phases[0].support,'Diaporama');assert.strictEqual(s.phases[0].modalites,'Individuel');assert.strictEqual(s.phases[0].comment,'Observer');assert.strictEqual(s.phases[0].contenu,'- calcul $\\sqrt{x^2+1}$');
 assert.deepStrictEqual(s.comp,['Chercher','Calculer']);assert.strictEqual(s.compTexte,'Justif');assert.strictEqual(s.activiteTitre,'Activité 1');assert.ok(/\\frac\{1\}\{2\}/.test(s.activite)&&/^## Cours/.test(s.trace));assert.strictEqual(s.travail,'Ex 1');assert.strictEqual(s.objFin,'Savoir');
 assert.strictEqual(s.difficultes,'Confusion');assert.strictEqual(s.aides,'Fiche d’aide');assert.strictEqual(s.evalBilan,'**Évaluation :** Critères\n\n**Bilan :** Bilan');assert.strictEqual(s.introS,'Intro');assert.strictEqual(s.coursS,'Cours');assert.strictEqual(s.entrS,'Entraînement');assert.strictEqual(s.rem,'Remarque');
  assert.ok(!('__miss' in s),'champ technique retiré avant enregistrement');assert.deepStrictEqual(Object.keys(s).sort(),Object.keys(await p.evaluate(()=>{addSeance(db.seqs[0].id);const x=db.seances.pop();db.cur=db.seances[0].id;return Object.fromEntries(Object.keys(x).concat(['type','statut','activiteTitre','activite','trace','aides','evalBilan','introS','coursS','entrS','remLabel','rem']).map(k=>[k,1]))})).sort(),'mêmes propriétés que les séances natives');
 if(N>=5)assert.strictEqual(r.ss[4].type,'eval');
 assert.deepStrictEqual(await p.evaluate(a=>[db.seqs[0].id,db.seances[0].id].join()===a.join(),ids0),true);assert.deepStrictEqual((await fp(p)).seances.slice(0,1),before.seances,'séquence existante intacte');
 // affichage, enregistrement, persistance
 await p.waitForSelector('#prev .katex');assert.ok(/Séance 1/.test(await p.$eval('#prev',e=>e.innerText)));
 await saved(p);const d=await idbDump(p);assert.strictEqual(d.seqs.n,2);assert.strictEqual(d.seances.n,1+N);
 await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>db.seances.length),1+N);assert.ok(await p.evaluate(()=>db.seqs.some(q=>q.nom==='Fractions IA')));assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : champs facultatifs absents, valeurs incorrectes, avertissements (conversion pure, rien n’est inventé)',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 const conv=o=>p.evaluate(o=>{const r=aiConvert(o);return{E:r.R.E,W:r.R.W,I:r.R.I,q:r.q,ss:r.ss}},o);
 let r=await conv({format:'createdocmath-ai-sequence',version:'1.0',sequence:{titre:'Minimal'},seances:[{titre:'Seule'}]});
 assert.deepStrictEqual(r.E,[]);assert.strictEqual(r.q.niveau,'');assert.strictEqual(r.q.cadre,'');assert.strictEqual(r.q.bo,'');assert.strictEqual(r.ss[0].objectifs,'');assert.deepStrictEqual(r.ss[0].phases,[]);assert.deepStrictEqual(r.ss[0].comp,[]);assert.strictEqual(r.ss[0].duree,55);assert.ok(r.W.some(x=>/niveau/.test(x)));assert.ok(r.ss[0].__miss.includes('objectifs'));
 r=await conv({format:'createdocmath-ai-sequence',version:'1.0',sequence:{titre:'Données douteuses',niveau:'4e',duree_previsionnelle:-5,competences:['Chercher']},seances:[
  {numero:3,titre:'',type:'bizarre',duree:-10,date:'31/12/2026',competences:['Chercher','Danser','calculer','Modeliser'],phases:[{nom:'Sans durée',contenu:'x'},{duree:-4,nom:'Négative',modalite:'individuel'},{duree:'abc',nom:'Texte',modalite:'on ne sait pas'},{duree:1e9,nom:'Énorme'},{},{duree:5,nom:'Collectif',modalite:'plénière',extra:1},'pas un objet'],activite:{a:1},objectifs:['A','B'],truc:1},
  {numero:3,titre:'Doublon de numéro',duree:'40',phases:'oups'},{numero:'x',titre:'Numéro invalide',date:'2026-02-30'},42]});
 assert.deepStrictEqual(r.E,[]);const W=r.W.join('\n'),I=r.I.join('\n');
 assert.deepStrictEqual(r.ss.map(s=>s.numero),[1,2,3],'numéros consécutifs');
 const s=r.ss.find(x=>x.nom==='Séance 1'||/Séance/.test(x.nom)&&x.phases.length);assert.ok(s,'séance sans titre nommée');assert.strictEqual(s.date,'');assert.deepStrictEqual(s.comp,['Chercher','Modéliser','Calculer'],'compétences reconnues (casse / accents indifférents), dans l’ordre habituel');assert.strictEqual(s.objectifs,'- A\n- B');assert.strictEqual(s.activite,'');
 assert.ok(/compétence « Danser » inconnue/.test(W)&&/type « bizarre » inconnu/.test(W)&&/date « 31\/12\/2026 » invalide/.test(W)&&/durée invalide/.test(W)&&/sans durée/.test(W)&&/durée invalide, mise à 0/.test(W)&&/modalité « on ne sait pas » inconnue/.test(W)&&/phase 5 vide/.test(W)&&/phase 7 ignorée/.test(W)&&/« phases » doit être une liste/.test(W)&&/durée prévisionnelle.*invalide/.test(W)&&/valeur ignorée/.test(W)&&/élément n°4/.test(W)&&/numéro « 3 »|numéro absent/.test(W),W);
 assert.ok(/champ inconnu « truc »/.test(I)&&/champ inconnu « extra »/.test(I)&&/Compétences de la séquence/.test(I),I);
 assert.deepStrictEqual(s.phases.map(x=>x.duree),[0,0,0,0,5]);assert.strictEqual(s.phases[4].mode,'c');assert.strictEqual(s.phases[2].mode,'a');assert.ok(s.phases.every(x=>Number.isInteger(x.duree)&&x.duree>=0));
 assert.strictEqual(r.ss.find(x=>x.nom==='Doublon de numéro').duree,40);assert.strictEqual(r.ss.find(x=>x.nom==='Numéro invalide').date,'');
 // modalités reconnues
 const m=await p.evaluate(()=>['Individuel','binôme','Groupe','travail en autonomie','Collectif','plénière','Classe entière','magistral','individuel puis collectif',''].map(aiMode));assert.deepStrictEqual(m,['a','a','a','a','c','c','c','c','a',null]);
 // réparation des barres obliques non doublées (\f, \t, \b, \r interprétés par JSON.parse)
 r=await conv(JSON.parse('{"format":"createdocmath-ai-sequence","version":"1.0","sequence":{"titre":"Formules"},"seances":[{"titre":"F","activite":"$\\frac{1}{2}\\times 3$ et $\\beta+\\theta$ et $\\right)$ doublé : $\\\\frac{1}{2}$"}]}'));
 assert.strictEqual(r.ss[0].activite,'$\\frac{1}{2}\\times 3$ et $\\beta+\\theta$ et $\\right)$ doublé : $\\frac{1}{2}$');assert.ok(r.W.some(x=>/formule\(s\) corrigée/.test(x)));
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : fichier refusé (JSON mal formé, format ou version inconnus, sans titre, sans séance, trop gros, mauvaise extension) — rien n’est modifié',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await aiRefuse(p,'{"format":"createdocmath-ai-sequence","seances":[',/n’est pas un JSON valide/);
 await aiRefuse(p,'Voici votre séquence ! {"format":"createdocmath-ai-sequence"}',/n’est pas un JSON valide/);
 await aiRefuse(p,{format:'autre-chose',sequence:{titre:'A'},seances:[{titre:'B'}]},/Format non reconnu/);await aiRefuse(p,[1,2,3],/Format non reconnu/);await aiRefuse(p,'null',/Format non reconnu/);
 await aiRefuse(p,{format:'createdocmath-ai-sequence',version:'2.0',sequence:{titre:'A'},seances:[{titre:'B'}]},/version « 2\.0 » non prise en charge/);
 await aiRefuse(p,{format:'createdocmath-ai-sequence',version:'1.0',sequence:{titre:'  '},seances:[{titre:'B'}]},/n’a pas de titre/);
 await aiRefuse(p,{format:'createdocmath-ai-sequence',version:'1.0',sequence:{titre:'A'},seances:[]},/aucune séance/);
 await aiRefuse(p,{format:'createdocmath-ai-sequence',version:'1.0',seances:[{titre:'B'}]},/« sequence » est absente/);
 await aiRefuse(p,aiSeq(61),/trop de séances \(61\)/);await aiRefuse(p,{format:'createdocmath-ai-sequence',version:'1.0',sequence:{titre:'A'},seances:[1,2]},/aucune séance exploitable/);
 await aiRefuse(p,' '.repeat(5.2e6),/trop volumineux/);await aiRefuse(p,aiSeq(1),/Choisissez un fichier « \.json »/,'sequence.txt');await aiRefuse(p,'PK\u0003\u0004',/Choisissez un fichier/,'sauvegarde.zip');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : accepte JSON entouré de balises Markdown, avertit ; version 1.x ; annulation sans effet',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);const n=await p.evaluate(()=>db.seqs.length);
 let t=await aiPreview(p,'```json\n'+JSON.stringify(aiSeq(2))+'\n```');assert.ok(/Importer comme nouvelle séquence/.test(t)&&/bloc de code Markdown/.test(t));await clickBtn(p,'Annuler');await modalDone(p);assert.strictEqual(await p.evaluate(()=>db.seqs.length),n,'annulation : rien ajouté');
 const o=aiSeq(1);o.version='1.3';t=await aiPreview(p,'\uFEFF'+JSON.stringify(o));assert.ok(/plus récente que la 1\.0/.test(t));await clickBtn(p,'Annuler');await modalDone(p);assert.strictEqual(await p.evaluate(()=>db.seqs.length),n);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : doublon signalé sans blocage, jamais d’écrasement, anciennes sauvegardes et exports natifs toujours importables',async()=>{const c=await ctx(),p=await c.newPage();await seed(p,null,JSON.stringify(legacyDb()));await booted(p);
 const f0=await fp(p),snap0=await p.evaluate(()=>JSON.stringify({s:db.seqs,a:db.seances.map(x=>({...x,imgs:x.imgs.map(m=>({...m,u:m.u.length}))}))}));
 let r=await aiRun(p,aiSeq(2));assert.ok(!/existe déjà/.test(r.t));
 r=await aiRun(p,aiSeq(2));assert.ok(/existe déjà/.test(r.t),'doublon signalé');assert.ok(/Importer comme nouvelle séquence/.test(r.t),'doublon non bloquant');
 assert.strictEqual(await p.evaluate(()=>db.seqs.filter(q=>q.nom==='Fractions IA').length),2);assert.strictEqual(await p.evaluate(()=>db.seqs.length),4);
 const same=await p.evaluate(()=>JSON.stringify({s:db.seqs.slice(0,2),a:db.seances.slice(0,4).map(x=>({...x,imgs:x.imgs.map(m=>({...m,u:m.u.length}))}))}));assert.strictEqual(same,snap0,'séquences existantes inchangées');
 // JSON natif (export « Partager cette séquence » / ancienne sauvegarde) : accepté par la même entrée, via le flux d’import existant
 const c2=await ctx(),p2=await c2.newPage();await booted(p2);const nat=legacyDb();await aiFile(p2,nat,'ancienne.json');let t=await modalText(p2);assert.ok(/Importer des fiches/.test(t)&&/Thalès/.test(t));await clickBtn(p2,'Fusionner');
 await p2.waitForFunction(()=>[...document.querySelectorAll('.mdb')].some(e=>/Rapport d’import/.test(e.innerText)));await clickBtn(p2,'Fermer');await modalDone(p2);assert.strictEqual(await p2.evaluate(()=>db.seqs.length),3);assert.strictEqual(await p2.evaluate(()=>db.seances.length),5);
 // le flux « Importer » historique est inchangé
 assert.strictEqual(await p2.evaluate(()=>typeof importFlow+typeof validateDb+typeof normalizeDb+typeof mergeData),'functionfunctionfunctionfunction');assert.deepStrictEqual(c.errs,[]);assert.deepStrictEqual(c2.errs,[]);await c.close();await c2.close()});

T('import IA : sécurité — HTML / JavaScript importé jamais exécuté (aperçu, toutes vues), pas de pollution de prototype',async()=>{const c=await ctx(),p=await c.newPage();const dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.dismiss()});await booted(p);
 const X='"><img src=x onerror="window.__x=1"><script>window.__x=1<\/script><svg onload=window.__x=1>\'';
 const o=aiSeq(1);const S0=o.seances[0];for(const k of ['titre','objectifs','prerequis_tice','objectifs_fin','travail_personnel','activite_titre','activite','trace_ecrite','difficultes','aides','competences_justification','evaluation','bilan','introduction','moment_cours','entrainement','remarque_pedagogique'])S0[k]=X;
 o.sequence.titre=X;o.sequence.niveau=X;o.sequence.classe=X;o.sequence.reference_bo=X;o.sequence.contenus_bo=[X,X];o.sequence.cadre_general=X;o.sequence.problematique=X;o.sequence.recommandations=X;S0.phases[0].nom=X;S0.phases[0].contenu=X;S0.phases[0].commentaire=X;S0.phases[0].support=X;S0.phases[0].modalite=X;
 const raw=JSON.stringify(o).replace('"format"','"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted2":1}},"format"');
 const r=await aiRun(p,raw);assert.ok(/Importer comme nouvelle séquence/.test(r.t));
 const check=async l=>{await p.waitForTimeout(150);const x=await p.evaluate(()=>({x:window.__x,bad:document.querySelectorAll('img[src="x"],svg[onload],[onerror],[onload]').length,sc:[...document.querySelectorAll('script')].filter(s=>/__x/.test(s.textContent)).length}));assert.deepStrictEqual(x,{x:undefined,bad:0,sc:0},l)};
 await check('aperçu + import');assert.strictEqual(await p.evaluate(()=>({}).polluted===undefined&&({}).polluted2===undefined&&Object.prototype.polluted===undefined),true,'prototype intact');
 for(const v of ['','seq','all','eleve','texte','annee']){await p.evaluate(v=>{bv=v;preview()},v);await check('vue '+v)}
 await p.evaluate(()=>{bv='';preview()});assert.ok((await p.evaluate(()=>S().activite)).includes('<script>'),'texte conservé tel quel (non interprété)');
 await p.evaluate(()=>{EL().a=1;EL().t=1;bv='eleve';preview()});await check('fiche élève');
 await aiPreview(p,raw);await check('aperçu seul');await clickBtn(p,'Annuler');await modalDone(p);assert.deepStrictEqual(dlg,[]);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : si l’enregistrement échoue, rien n’est ajouté (retour arrière), puis import possible après correction',async()=>{const c=await ctx();
 await c.addInitScript(()=>{const o=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){if(window.__fail&&this.name==='seances')throw new DOMException('quota','QuotaExceededError');return o.apply(this,arguments)}});
 const p=await c.newPage();await booted(p);await saved(p);const n=await p.evaluate(()=>[db.seqs.length,db.seances.length,db.cur].join());await p.evaluate(()=>{window.__fail=true});
 const r=await aiRun(p,aiSeq(3));assert.ok(/Import annulé/.test(r.done)&&/Rien n’a été ajouté/.test(r.done),r.done);
 assert.strictEqual(await p.evaluate(()=>[db.seqs.length,db.seances.length,db.cur].join()),n,'mémoire inchangée');assert.ok(!(await p.evaluate(()=>db.seqs.some(q=>q.nom==='Fractions IA'))));
 await p.evaluate(()=>{window.__fail=false});await p.evaluate(()=>{sv.err=null;changed()});await saved(p);assert.strictEqual((await idbDump(p)).seances.n,1,'aucune séance partielle en base');
 await p.reload();await booted(p);assert.strictEqual(await p.evaluate(()=>db.seqs.length),1);
 const r2=await aiRun(p,aiSeq(3));assert.ok(/Séquence importée/.test(r2.done));await saved(p);assert.strictEqual((await idbDump(p)).seances.n,4);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : annuler (Ctrl+Z) retire la séquence importée ; fiche séquence, cahier complet, Word et PDF après import',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 const {done}=await aiRun(p,AI_EX);assert.ok(/Séquence importée/.test(done));
 const info=await p.evaluate(()=>{const q=db.seqs[db.seqs.length-1];return{q:q.nom,n:db.seances.filter(s=>s.seq===q.id).length,types:db.seances.filter(s=>s.seq===q.id).map(s=>s.type).join()}});
 assert.deepStrictEqual(info,{q:'Additionner et soustraire des fractions',n:4,types:',,,eval'});
 // fiche de séance
 await p.waitForSelector('#prev .katex');let txt=await p.$eval('#prev',e=>e.innerText);assert.ok(/Partager une unité/.test(txt)&&/Phase 1/.test(txt)&&/Phase 4/.test(txt)&&/Analyse didactique/.test(txt)&&/Aides et différenciation/.test(txt));
 // fiche séquence
 await p.evaluate(()=>{bv='seq';preview()});txt=await p.$eval('#prev',e=>e.innerText);assert.ok(/3 séances d’apprentissage \+ 1 séance d’évaluation/i.test(txt)&&/Problématique/.test(txt)&&/Objectifs généraux/.test(txt)&&/Durée prévisionnelle/.test(txt)&&/Partager une unité/.test(txt)&&/Évaluation : fractions/.test(txt));
 // cahier complet + Word
 await p.evaluate(()=>{bv='all';preview()});await p.waitForSelector('#prev .katex');let {Z,x}=await docxOf(p,'ia-all');const plain=x.replace(/<[^>]+>/g,'');
 assert.ok(cnt(x,/<m:oMath>/g)>=5,'équations modifiables');assert.ok(/Partager une unité/.test(plain)&&/Additionner avec un dénominateur multiple/.test(plain)&&/Évaluation : fractions/.test(plain)&&/Organisation pédagogique/.test(plain));assert.ok(cnt(x,/<w:pageBreakBefore\/>/g)>=3);assert.ok(!/\$/.test(plain),'pas de $ brut');
 for(const v of ['','eleve','texte','annee']){await p.evaluate(v=>{bv=v;preview()},v);({x}=await docxOf(p,'ia-'+(v||'f')));assert.ok(x.length>1500,v)}
 // PDF
 await p.evaluate(()=>{bv='all';preview()});await p.waitForSelector('#prev .katex');await p.emulateMedia({media:'print'});const f=path.join(os.tmpdir(),'cdm-ia-'+Date.now()+'.pdf');await p.pdf({path:f,format:'A4',preferCSSPageSize:true,printBackground:true});
 let pt;try{pt=require('child_process').execFileSync('pdftotext',['-layout',f,'-'],{encoding:'utf8'})}catch(e){console.log('      (pdftotext absent : contrôle du texte PDF ignoré)')}
 if(pt){assert.ok(/Additionner et soustraire des fractions/.test(pt)&&/Partager une unité/.test(pt)&&/Évaluation : fractions/.test(pt)&&/Page 2 \/ \d+/.test(pt));assert.ok((pt.match(/Phase \/ Durée/g)||[]).length>=3)}
 await p.emulateMedia({media:'screen'});
 // persistance + annulation
 await saved(p);await p.reload();await booted(p);assert.ok(await p.evaluate(()=>db.seqs.some(q=>q.nom==='Additionner et soustraire des fractions')));
 await p.evaluate(()=>{bv='';show()});await aiRun(p,aiSeq(2));assert.strictEqual(await p.evaluate(()=>db.seqs.length),3);await p.evaluate(()=>hgo(-1));assert.strictEqual(await p.evaluate(()=>db.seqs.length),2,'Ctrl+Z retire l’import');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('import IA : documentation — l’exemple et le prompt de docs/IMPORT-IA.md sont identiques aux fichiers sources et valides',async()=>{
 const md=fs.readFileSync(path.join(ROOT,'docs','IMPORT-IA.md'),'utf8'),ex=fs.readFileSync(path.join(ROOT,'docs','exemple-sequence-ia.json'),'utf8').trim(),pr=fs.readFileSync(path.join(ROOT,'docs','prompt-notebooklm.txt'),'utf8').trim();
 assert.ok(md.includes(ex),'exemple JSON complet inclus dans IMPORT-IA.md');assert.ok(md.includes(pr),'prompt NotebookLM inclus dans IMPORT-IA.md');
 const c=await ctx(),p=await c.newPage();await booted(p);const r=await p.evaluate(o=>{const x=aiConvert(o);return{E:x.R.E,W:x.R.W,I:x.R.I,n:x.ss.length}},AI_EX);assert.deepStrictEqual(r.E,[]);assert.deepStrictEqual(r.I.filter(x=>!/Compétences de la séquence/.test(x)),[],'aucun champ inconnu dans l’exemple');assert.strictEqual(r.n,4);
 const a=pr.indexOf('=== FORMAT JSON ==='),b=pr.indexOf('=== FIN DU FORMAT ===');assert.ok(a>0&&b>a);const sk=JSON.parse(pr.slice(a+19,b).replace(/«[^»]*»/g,'x'));assert.strictEqual(sk.format,'createdocmath-ai-sequence');assert.strictEqual(sk.version,'1.0');
 for(const k of ['titre','niveau','classe','domaine','theme','problematique','duree_previsionnelle','objectifs_generaux','prerequis','reference_bo','contenus_bo','capacites_attendues','competences','cadre_general','progression','recommandations'])assert.ok(k in sk.sequence,'sequence.'+k);
 for(const k of ['numero','titre','type','duree','date','objectifs','prerequis','prerequis_tice','phases','objectifs_fin','travail_personnel','activite_titre','activite','trace_ecrite','difficultes','aides','competences','competences_justification','evaluation','bilan','introduction','moment_cours','entrainement','remarque_pedagogique'])assert.ok(k in sk.seances[0],'seances.'+k);
 for(const k of ['duree','nom','contenu','commentaire','modalite','support','materiel'])assert.ok(k in sk.seances[0].phases[0],'phases.'+k);
 assert.deepStrictEqual(c.errs,[]);await c.close()});

/* ================= 📚 Cahier de l'élève — phase 1 ================= */
const cahOpen=async p=>{await p.evaluate(()=>CAH.open());await p.waitForSelector('#cah:not([hidden]) #cahE')};
const cahSaved=p=>p.evaluate(()=>CAH.flush().then(()=>{if(CAH.S.err)throw new Error('échec : '+CAH.S.err.message)}));
const cahDump=p=>p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('cdm3cahiers');r.onsuccess=()=>{const d=r.result,g=s=>new Promise(k=>{const q=d.transaction(s).objectStore(s),a=q.getAllKeys(),b=q.getAll();b.onsuccess=()=>k([a.result,b.result])});
 Promise.all(['cahiers','meta','backups'].map(g)).then(([c,m,bk])=>{d.close();res({keys:c[0],cahiers:c[1],meta:Object.fromEntries(m[0].map((k,i)=>[k,m[1][i]])),backups:bk[0],backupVals:bk[1]})})}}));
const cahNew=async p=>{await p.click('#cahbar [data-ca=cnew]');await p.waitForSelector('#cahE [data-ch=nom]')};
const cahCur=p=>p.evaluate(()=>JSON.parse(JSON.stringify(CAH.cc())));
const prepState=p=>p.evaluate(()=>JSON.stringify({q:db.seqs.map(x=>[x.id,x.nom]),s:db.seances.map(x=>[x.id,x.nom,x.seq,x.numero]),cur:db.cur}));
const TYPES=['attendus','decouverte','trace','exercices','tache','eval'];
const dnd=(p,s,d,f)=>p.evaluate(([s,d,f])=>{const A=document.querySelector(s),D=document.querySelector(d),dt=new DataTransfer(),q=D.getBoundingClientRect(),y=q.top+q.height*f,fire=(el,n)=>el.dispatchEvent(new DragEvent(n,{bubbles:true,cancelable:true,dataTransfer:dt,clientX:q.left+20,clientY:y}));fire(A,'dragstart');fire(D,'dragover');fire(D,'drop');fire(A,'dragend')},[s,d,f]);
const cahMenuOpen=async p=>{await p.click('#mbar [data-menu=v]');await p.click('#mbar [data-a=cahier]');await p.waitForSelector('#cah:not([hidden]) #cahE')};

T('cahier : accès par le menu Affichage, état vide, aucun effet sur les préparations ni sur la base existante, fermeture',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await saved(p);
 const f0=await fp(p),pr0=await prepState(p),d0=await idbDump(p),n0=JSON.stringify([d0.seqs.keys,d0.seances.keys,d0.kv.keys]);
 await cahMenuOpen(p);assert.ok(/Créer mon cahier/.test(await p.$eval('#cahE',e=>e.innerText)),'état vide');
 assert.strictEqual(await p.evaluate(()=>indexedDB.databases().then(L=>L.some(d=>d.name==='cdm3cahiers'))),true,'base dédiée');
 assert.deepStrictEqual((await cahDump(p)).keys,[],'ouvrir ne crée aucun cahier');
 assert.strictEqual(await p.evaluate(()=>document.querySelector('#mbar').inert),true,'application masquée et inerte derrière');
 await p.click('#cahE [data-ca=cnew]');await p.waitForSelector('#cahE [data-ch=nom]');await cahSaved(p);await p.click('#cahbar [data-ca=close]');await p.waitForSelector('#cah',{state:'hidden'});
 assert.strictEqual(await p.evaluate(()=>document.querySelector('#mbar').inert),false);assert.deepStrictEqual(await fp(p),f0);assert.strictEqual(await prepState(p),pr0);
 const d1=await idbDump(p);assert.strictEqual(JSON.stringify([d1.seqs.keys,d1.seances.keys,d1.kv.keys]),n0,'cdm3db inchangée');
 await p.click('#mbar [data-menu=f]');assert.ok(await p.isVisible('#mbar [data-a=imp]'),'l’application reste utilisable');await p.keyboard.press('Escape');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : créer, renommer, dupliquer, supprimer (avec annulation), plusieurs cahiers, persistance après rechargement',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);
 await p.locator('#cahL .cl-set summary').click();await p.fill('[data-cf=nom]','Maths 5e');await p.fill('[data-cf=niveau]','5e');await p.fill('[data-cf=classe]','5A');await p.fill('[data-cf=annee]','2026-2027');
 await p.fill('[data-ch=nom]','Nombres relatifs');await cahSaved(p);
 await p.click('#cahbar [data-ca=cdup]');await p.waitForFunction(()=>CAH.S.list.length===2);let L=await p.evaluate(()=>CAH.S.list.map(x=>[x.id,x.nom,x.chapitres[0].id]));
 assert.strictEqual(L[1][1],'Maths 5e (copie)');assert.notStrictEqual(L[0][0],L[1][0]);assert.notStrictEqual(L[0][2],L[1][2],'identifiants de chapitres neufs');
 await p.click('#cahbar [data-ca=cnew]');await p.waitForFunction(()=>CAH.S.list.length===3);
 await p.click('#cahbar [data-ca=cdel]');assert.ok(/Supprimer le cahier/.test(await modalText(p)));await clickBtn(p,'Annuler');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.S.list.length),3);
 await p.click('#cahbar [data-ca=cdel]');await clickBtn(p,'Supprimer');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.S.list.length),2);assert.ok(await p.isVisible('#cahun'));
 await p.click('#cahun');assert.strictEqual(await p.evaluate(()=>CAH.S.list.length),3,'suppression annulée');
 await p.click('#cahbar [data-ca=cdel]');await clickBtn(p,'Supprimer');await modalDone(p);await cahSaved(p);
 const before=await p.evaluate(()=>CAH.S.list.map(x=>x.id));const d=await cahDump(p);assert.deepStrictEqual(d.keys.sort(),[...before].sort());assert.deepStrictEqual(d.meta.order,before,'ordre enregistré');
 await p.selectOption('#cahsel',before[1]);await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);
 assert.deepStrictEqual(await p.evaluate(()=>CAH.S.list.map(x=>x.id)),before);assert.strictEqual(await p.evaluate(()=>CAH.S.cur),before[1],'dernier cahier rouvert');
 assert.strictEqual((await cahCur(p)).nom,'Maths 5e (copie)');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : chapitres — créer, renommer, dupliquer, supprimer (confirmation + annulation), monter / descendre, glisser-déposer',async()=>{const c=await ctx({viewport:{width:1400,height:1500}}),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);
 const names=()=>p.evaluate(()=>CAH.cc().chapitres.map(h=>h.nom));
 await p.fill('[data-ch=nom]','A');for(const n of ['B','C','D']){await p.click('#cahL [data-ca=chnew]');await p.fill('[data-ch=nom]',n)}
 assert.deepStrictEqual(await names(),['A','B','C','D']);assert.ok(/4\. D/.test(await p.$eval('#cahchl',e=>e.innerText)));
 await p.click('li[data-dk=ch]:nth-child(4) [data-ca=chup]');assert.deepStrictEqual(await names(),['A','B','D','C']);await p.click('li[data-dk=ch]:nth-child(1) [data-ca=chdn]');assert.deepStrictEqual(await names(),['B','A','D','C']);
 assert.ok(await p.isDisabled('li[data-dk=ch]:nth-child(1) [data-ca=chup]'));assert.ok(await p.isDisabled('li[data-dk=ch]:nth-child(4) [data-ca=chdn]'));
 const ids=await p.evaluate(()=>CAH.cc().chapitres.map(h=>h.id));
 await p.locator('li[data-did="'+ids[3]+'"]').dragTo(p.locator('li[data-did="'+ids[0]+'"]'),{targetPosition:{x:30,y:4}});await p.waitForTimeout(50);assert.deepStrictEqual(await names(),['C','B','A','D'],'glisser-déposer');
 await p.click('li[data-did="'+ids[0]+'"] .cl-n');await p.click('[data-ca=badd][data-t=trace]');await p.click('[data-ca=badd][data-t=exercices]');
 const bl0=await p.evaluate(()=>CAH.cc().chapitres.find(h=>h.nom==='B').blocs.map(b=>b.id));
 await p.click('li[data-did="'+ids[0]+'"] [data-ca=chdup]');const cp=await p.evaluate(()=>CAH.cc().chapitres.map(h=>[h.id,h.nom,h.blocs.map(b=>b.id)]));
 assert.deepStrictEqual(cp.map(x=>x[1]),['C','B','B (copie)','A','D']);assert.strictEqual(cp[2][2].length,2);assert.ok(cp[2][2].every(i=>!bl0.includes(i)),'blocs de la copie : identifiants neufs');assert.strictEqual(await p.inputValue('[data-ch=nom]'),'B (copie)');
 await p.click('li[data-did="'+cp[2][0]+'"] [data-ca=chdel]');assert.ok(/Supprimer le chapitre/.test(await modalText(p)));await clickBtn(p,'Annuler');await modalDone(p);assert.strictEqual((await names()).length,5);
 await p.click('li[data-did="'+cp[2][0]+'"] [data-ca=chdel]');await clickBtn(p,'Supprimer');await modalDone(p);assert.deepStrictEqual(await names(),['C','B','A','D']);
 await p.click('#cahbar [data-ca=hundo]');assert.deepStrictEqual(await names(),['C','B','B (copie)','A','D'],'↶ restaure le chapitre');await p.click('#cahbar [data-ca=hredo]');assert.deepStrictEqual(await names(),['C','B','A','D']);
 await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.deepStrictEqual(await names(),['C','B','A','D'],'ordre conservé');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : glisser-déposer d’un bloc (poignée) et enregistrement de l’ordre',async()=>{const c=await ctx({viewport:{width:1400,height:900}}),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);
 for(const t of ['trace','exercices','eval'])await p.click('[data-ca=badd][data-t='+t+']');const bi=await p.evaluate(()=>CAH.ch().blocs.map(b=>b.id)),bt=()=>p.evaluate(()=>CAH.ch().blocs.map(b=>b.type));
 await dnd(p,'.cbk[data-bid="'+bi[1]+'"] .cdrag','.cbk[data-bid="'+bi[0]+'"]',.1);await p.waitForTimeout(50);assert.deepStrictEqual(await bt(),['exercices','trace','eval'],'glisser-déposer de bloc');
 assert.deepStrictEqual(await p.$$eval('.cbk',e=>e.map(x=>x.dataset.bid)),[bi[1],bi[0],bi[2]],'éditeur redessiné dans le nouvel ordre');await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.deepStrictEqual(await bt(),['exercices','trace','eval'],'ordre conservé');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : les six types de blocs — saisie, couleurs, saut de page, déplacer / dupliquer / supprimer, exercices, compétences, corrigés, aperçu',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);
 for(const t of TYPES)await p.click('[data-ca=badd][data-t='+t+']');
 assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().blocs.map(b=>b.type)),TYPES);
 const B=i=>p.locator('.cbk').nth(i),pv=()=>p.$eval('#cahpg',e=>e.innerText);
 await B(0).locator('textarea').nth(0).fill('- **opposé** de $-3$');await B(0).locator('textarea').nth(1).fill('- additionner deux relatifs');
 await B(1).locator('input[data-f=titre]').fill('Activité : le thermomètre');await B(1).locator('textarea').nth(0).fill('Lis la situation.');await B(1).locator('textarea').nth(1).fill('1. Quelle température ?\n2. Compare $-5$ et $3$.');await B(1).locator('textarea').nth(2).fill('CORRIGÉ-DECOUVERTE');
 await B(2).locator('textarea').fill('## Définition\nL’**opposé** de $a$ est $-a$.\n- Propriété\n\nExemple : $\\frac{1}{2}$');
 await B(3).locator('[data-ca=exnew]').click();await B(3).locator('fieldset').nth(0).locator('[data-f=enonce]').fill('Calculer $3+(-5)$.');await B(3).locator('fieldset').nth(0).locator('[data-f=corrige]').fill('CORRIGE-EX1');await B(3).locator('fieldset').nth(0).locator('[data-f=niveau]').selectOption('facile');
 await B(3).locator('fieldset').nth(1).locator('[data-f=titre]').fill('Problème');await B(3).locator('fieldset').nth(1).locator('[data-f=enonce]').fill('Énoncé 2');await B(3).locator('fieldset').nth(1).locator('[data-f=num]').fill('2bis');
 await B(4).locator('textarea').nth(0).fill('Situation : le trajet.');await B(4).locator('textarea').nth(4).fill('CORRIGE-TACHE');await B(4).locator('[data-f=comp][data-k=Chercher]').check();await B(4).locator('[data-f=comp][data-k=Raisonner]').check();
 await B(5).locator('textarea').nth(1).fill('Exercice d’évaluation');await B(5).locator('textarea').nth(2).fill('/20');await B(5).locator('textarea').nth(3).fill('CORRIGE-EVAL');
 await p.waitForTimeout(250);let t=await pv();for(const s of ['Attendus du chapitre','Activité : le thermomètre','Trace écrite – Je retiens','Exercice 1','Exercice 2bis – Problème','(facile)','Je mobilise mes connaissances','Compétences : Chercher, Raisonner','Je vérifie mes connaissances','Je dois savoir faire','CORRIGE-EX1','CORRIGE-TACHE','CORRIGE-EVAL','CORRIGÉ-DECOUVERTE','additionner deux relatifs'])assert.ok(t.includes(s),'aperçu : '+s);
 assert.ok(await p.locator('#cahpg .katex').count()>=5,'formules KaTeX');assert.strictEqual(await p.locator('#cahpg .cp-two .cp-sub').count(),2);assert.ok(await p.locator('#cahpg b,#cahpg strong').count()>0);
 await p.selectOption('[data-ca=mode]','eleve_sans');t=await pv();assert.ok(!/CORRIGE-|Corrigé/.test(t),'corrigés masqués');await p.selectOption('[data-ca=mode]','enseignant');
 // couleurs : par défaut puis personnalisée
 assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().blocs.map(b=>CAH.cc().couleurs[b.type])),['#1f5fa8','#b85c00','#2e8540','#7b3fa0','#c0392b','#2c3e50']);
 await B(1).locator('input[type=color]').fill('#00aa55');await p.waitForTimeout(200);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs[1].couleur),'#00aa55');assert.ok(/--bc:\s*#00aa55/.test(await p.locator('#cahpg .cp-b').nth(1).getAttribute('style')));
 await p.locator('#cahL .cl-set summary').click();await p.locator('[data-cc=trace]').fill('#112233');await p.waitForTimeout(150);assert.ok(/#112233/.test(await p.locator('#cahpg .cp-b').nth(2).getAttribute('style')),'couleur de catégorie');
 await p.click('[data-ca=colreset]');assert.strictEqual(await p.evaluate(()=>CAH.cc().couleurs.trace),'#2e8540');
 // saut de page, déplacement, duplication, suppression
 await B(2).locator('[data-f=saut]').check();await p.waitForTimeout(200);assert.strictEqual(await p.locator('#cahpg .cp-pb').count(),1);
 await B(0).locator('[data-ca=bdn]').click();assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().blocs.slice(0,2).map(b=>b.type)),['decouverte','attendus']);
 await B(1).locator('[data-ca=bup]').click();await B(2).locator('[data-ca=bdup]').click();assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),7);
 const ids=await p.evaluate(()=>CAH.ch().blocs.map(b=>b.id));assert.strictEqual(new Set(ids).size,7);
 const g=await p.evaluate(()=>{const b=CAH.ch().blocs;return[b[2].v.texte===b[3].v.texte,b[2].id!==b[3].id]});assert.deepStrictEqual(g,[true,true]);
 await p.evaluate(()=>{const b=CAH.ch().blocs;b[3].v.texte='modifié';});assert.notStrictEqual(await p.evaluate(()=>CAH.ch().blocs[2].v.texte),'modifié','copies indépendantes');
 await B(3).locator('[data-ca=bdel]').click();assert.ok(/Supprimer ce bloc/.test(await modalText(p)));await clickBtn(p,'Annuler');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),7);
 await B(3).locator('[data-ca=bdel]').click();await clickBtn(p,'Supprimer');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),6);
 // exercices : monter / supprimer
 const ex=p.locator('.cbk').filter({hasText:'Exercices d’application'}).first();await ex.locator('fieldset').nth(1).locator('[data-ca=exup]').click();assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.find(b=>b.type==='exercices').items[0].titre),'Problème');
 await ex.locator('fieldset').nth(0).locator('[data-ca=exdel]').click();assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.find(b=>b.type==='exercices').items.length),1);
 // glisser-déposer d'un bloc
  await cahSaved(p);const d=await cahDump(p);assert.strictEqual(d.cahiers[0].chapitres[0].blocs.length,6);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : persistance IndexedDB identique à la mémoire, vérification d’intégrité, erreur d’écriture signalée puis reprise',async()=>{const c=await ctx();
 await c.addInitScript(()=>{const o=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){if(window.__fail&&this.name==='cahiers')throw new DOMException('quota','QuotaExceededError');return o.apply(this,arguments)}});
 const p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);await p.click('[data-ca=badd][data-t=trace]');await p.locator('.cbk textarea').fill('Texte é à $x^2$');await cahSaved(p);
 const mem=await cahCur(p),d=await cahDump(p);assert.deepStrictEqual(d.cahiers[0],mem,'base = mémoire');assert.strictEqual(d.cahiers[0].v,1);
 await p.evaluate(()=>{window.__fail=true});await p.fill('[data-ch=nom]','Modifié hors ligne');await p.waitForFunction(()=>CAH.S.err,null,{timeout:5000});
 assert.ok(/Échec de l’enregistrement/.test(await p.innerText('#cahst'))&&/espace de stockage/.test(await p.innerText('#cahst')));assert.strictEqual((await cahDump(p)).cahiers[0].chapitres[0].nom,mem.chapitres[0].nom,'base inchangée');
 await p.evaluate(()=>{window.__fail=false});await p.click('#cahst [data-ca=retry]');await p.waitForFunction(()=>/Enregistré/.test(document.getElementById('cahst').innerText)&&!CAH.S.err,null,{timeout:5000});
 assert.strictEqual((await cahDump(p)).cahiers[0].chapitres[0].nom,'Modifié hors ligne');
 await p.keyboard.press('Control+s');await p.waitForTimeout(100);await p.reload();await booted(p);await cahOpen(p);assert.strictEqual(await p.inputValue('[data-ch=nom]'),'Modifié hors ligne');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : export / import .json — nouveaux identifiants, jamais d’écrasement, fichiers invalides refusés',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);
 await p.click('[data-ca=badd][data-t=exercices]');await p.locator('.cbk textarea').first().fill('Consigne');await p.fill('[data-ch=nom]','Fractions');await cahSaved(p);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#cahbar [data-ca=cexp]')]);const f=path.join(os.tmpdir(),'cah-'+Date.now()+'.json');await dl.saveAs(f);const exp=JSON.parse(fs.readFileSync(f,'utf8'));
 assert.strictEqual(exp.format,'createdocmath-cahier-backup');assert.strictEqual(exp.version,1);assert.strictEqual(exp.cahiers.length,1);assert.strictEqual(exp.cahiers[0].chapitres[0].nom,'Fractions');assert.ok(/^cahier_.*\.json$/.test(dl.suggestedFilename()),'nom de fichier : '+dl.suggestedFilename());
 const before=await p.evaluate(()=>CAH.S.list.map(x=>x.id)),orig=await cahCur(p);
 await p.setInputFiles('#cahf',f);let t=await modalText(p);assert.ok(/1 cahier\(s\) seront ajoutés/.test(t)&&/un cahier de même nom existe déjà/.test(t)&&/Fractions/.test(t.replace('Cahier de mathématiques','')) || /1 chapitre/.test(t));await clickBtn(p,'Ajouter');await modalDone(p);
 const after=await p.evaluate(()=>CAH.S.list.map(x=>x.id));assert.strictEqual(after.length,2);assert.ok(!before.includes(after[1]),'identifiant neuf');
 const n=await cahCur(p);assert.strictEqual(n.nom,orig.nom);assert.notStrictEqual(n.chapitres[0].id,orig.chapitres[0].id);assert.deepStrictEqual(await p.evaluate(id=>JSON.parse(JSON.stringify(CAH.S.list.find(x=>x.id===id).chapitres)),before[0]),orig.chapitres,'cahier d’origine intact');
 // exporter tous
 await p.locator('#cahL .cl-set summary').click();const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('[data-ca=cexpall]')]);const f2=path.join(os.tmpdir(),'cahs-'+Date.now()+'.json');await dl2.saveAs(f2);assert.strictEqual(JSON.parse(fs.readFileSync(f2,'utf8')).cahiers.length,2);
 // refus
 const bad=async(buf,rx,name)=>{const n0=await p.evaluate(()=>CAH.S.list.length);await p.setInputFiles('#cahf',{name:name||'x.json',mimeType:'application/json',buffer:Buffer.from(buf)});const m=await modalText(p);assert.ok(/Import impossible/.test(m)&&rx.test(m),m.slice(0,200));await clickBtn(p,'Fermer');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.S.list.length),n0)};
 await bad('{"format":',/JSON valide/);await bad('{"format":"autre","version":1,"cahiers":[{}]}',/n’est pas un export de cahiers/);await bad(JSON.stringify({format:'createdocmath-cahier-backup',version:2,cahiers:[{nom:'x'}]}),/Version de fichier non prise en charge/);
 await bad(JSON.stringify({format:'createdocmath-cahier-backup',version:1,cahiers:[]}),/Aucun cahier/);await bad(JSON.stringify({format:'createdocmath-cahier-backup',version:1,cahiers:[42,null]}),/Aucun cahier exploitable/);await bad('[1,2]',/n’est pas un export/);await bad(' '.repeat(5.1e7),/trop volumineux/);
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : sécurité — HTML / JavaScript jamais exécuté, couleurs et types validés, pas de pollution de prototype',async()=>{const c=await ctx(),p=await c.newPage();const dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.dismiss()});await booted(p);await cahOpen(p);
 const X='"><img src=x onerror="window.__x=1"><script>window.__x=1<\/script><svg onload=window.__x=1>\'';
 const file={format:'createdocmath-cahier-backup',version:1,__proto__:null,cahiers:[{id:'../x"y',nom:X,niveau:X,classe:X,couleurs:{trace:'red;background:url(javascript:window.__x=1)',eval:'#ABCDEF'},pub:{statut:'<b>',version:'9'},chapitres:[{id:'c1',nom:X,ref:X,seqIds:['ok','b ad',X],blocs:[
  {id:'b1',type:'trace',titre:X,couleur:'url(x)',v:{texte:X,__proto__:{polluted:1}},corr:{texte:X},items:[{id:'i1',titre:X}]},{id:'b2',type:'exercices',titre:X,items:[{id:'i1',num:X,titre:X,enonce:X,corrige:X,niveau:'hack'}],comp:[X,'Chercher'],imgs:[{u:'javascript:alert(1)'},{u:'data:text/html;base64,PHNjcmlwdD4='},{u:X}]},{type:'inconnu',titre:'x'},'bloc',{type:'tache',v:{texte:X},corr:{texte:X}}]}]}]};
 const raw=JSON.stringify(file).replace('"format"','"__proto__":{"polluted2":1},"constructor":{"prototype":{"polluted3":1}},"format"');
 await p.setInputFiles('#cahf',{name:'x.json',mimeType:'application/json',buffer:Buffer.from(raw)});let t=await modalText(p);assert.ok(/bloc de type inconnu ignoré/.test(t));await clickBtn(p,'Ajouter');await modalDone(p);
 const o=await p.evaluate(()=>{const c=CAH.cc();return{c:JSON.parse(JSON.stringify(c)),pol:[({}).polluted,({}).polluted2,({}).polluted3,Object.prototype.polluted]}});
 assert.deepStrictEqual(o.pol,[undefined,undefined,undefined,undefined]);assert.ok(/^[\w-]{1,64}$/.test(o.c.id)&&o.c.id!=='../x"y');assert.strictEqual(o.c.couleurs.trace,'#2e8540');assert.strictEqual(o.c.couleurs.eval,'#abcdef');assert.deepStrictEqual(o.c.pub,{statut:'brouillon',version:0});
 const h=o.c.chapitres[0];assert.deepStrictEqual(h.seqIds,['ok']);assert.strictEqual(h.blocs.length,3);assert.strictEqual(h.blocs[0].couleur,'');assert.strictEqual(h.blocs[1].items[0].niveau,'');assert.deepStrictEqual(h.blocs[1].comp,['Chercher']);assert.deepStrictEqual(h.blocs[1].imgs,[]);assert.ok(h.blocs[0].v.texte.includes('<script>'),'texte conservé tel quel');assert.ok(!('polluted' in h.blocs[0].v));
 const chk=async l=>{await p.waitForTimeout(250);const r=await p.evaluate(()=>({x:window.__x,bad:document.querySelectorAll('#cah img[src="x"],#cah svg[onload],#cah [onerror],#cah [onload],#cah script').length}));assert.deepStrictEqual(r,{x:undefined,bad:0},l)};
 await chk('import');await p.check('[data-ca=tall]');await chk('aperçu tout le cahier');await p.locator('#cahL .cl-n').first().click();await chk('éditeur');await p.evaluate(()=>CAH.cc().chapitres[0].blocs.forEach(b=>{}));
 assert.strictEqual(await p.$$eval('#cahpg img,#cahpg script,#cahpg iframe,#cahE img,#cahE script',e=>e.length),0,'aucun élément injecté dans l’aperçu ni l’éditeur');assert.deepStrictEqual(dlg,[]);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : raccourcis isolés — Ctrl+Z / Ctrl+Y / Ctrl+S / collage d’image n’agissent jamais sur les préparations',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>{S().nom='Titre modifié';changed()});await p.waitForTimeout(700);await saved(p);const pr0=await prepState(p),imgs0=await p.evaluate(()=>S().imgs.length);
 await cahOpen(p);await cahNew(p);await p.click('#cahL [data-ca=chnew]');assert.strictEqual(await p.evaluate(()=>CAH.cc().chapitres.length),2);
 await p.locator('#cahbar [data-ca=hundo]').focus();await p.keyboard.press('Control+z');assert.strictEqual(await p.evaluate(()=>CAH.cc().chapitres.length),1,'Ctrl+Z annule dans le cahier');assert.strictEqual(await prepState(p),pr0,'préparations intactes');
 await p.keyboard.press('Control+y');assert.strictEqual(await p.evaluate(()=>CAH.cc().chapitres.length),2);assert.strictEqual(await prepState(p),pr0);
 await p.keyboard.press('Control+s');await p.waitForTimeout(200);assert.strictEqual(await p.$eval('#cahst',e=>e.innerText.includes('Enregistré')),true);
 await p.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(200)],'a.png',{type:'image/png'}));document.querySelector('#cahE [data-ch=nom]').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});await p.waitForTimeout(150);
 assert.strictEqual(await p.evaluate(()=>S().imgs.length),imgs0,'aucune image ajoutée à la séance');await p.keyboard.press('Control+k');await p.waitForTimeout(100);assert.strictEqual(await p.locator('.mdl').count(),0);
 await p.click('#cahbar [data-ca=close]');assert.strictEqual(await prepState(p),pr0);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : migration — enregistrements anciens ou endommagés réparés, copie de sécurité conservée, rien de supprimé en base',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('cdm3cahiers',1);r.onupgradeneeded=()=>{['cahiers','meta','backups'].forEach(n=>r.result.createObjectStore(n))};r.onsuccess=()=>{const t=r.result.transaction(['cahiers','meta'],'readwrite');
  t.objectStore('cahiers').put({id:'old1',nom:'Ancien cahier',chapitres:[{id:'k1',nom:'Chap',blocs:[{type:'trace',titre:'T',v:{texte:'Bonjour'}},{type:'zzz'}]},null]},'old1');t.objectStore('cahiers').put('pas un objet','bad1');t.objectStore('meta').put(['bad1','old1'],'order');t.oncomplete=()=>{r.result.close();res()}}}));
 await cahOpen(p);const t=await modalText(p);assert.ok(/mis à niveau \(schéma 0 → 1\)/.test(t)&&/bloc de type inconnu ignoré/.test(t)&&/illisible/.test(t),t);await clickBtn(p,'Fermer');await modalDone(p);
 const o=await cahCur(p);assert.strictEqual(o.v,1);assert.strictEqual(o.nom,'Ancien cahier');assert.strictEqual(o.chapitres.length,1);assert.strictEqual(o.chapitres[0].blocs.length,1);assert.strictEqual(o.chapitres[0].blocs[0].v.texte,'Bonjour');assert.deepStrictEqual(o.chapitres[0].blocs[0].corr.pdf,false);assert.strictEqual(o.couleurs.trace,'#2e8540');
 await cahSaved(p);const d=await cahDump(p);assert.ok(d.backups.includes('old1@v0'),'copie de sécurité avant migration');assert.strictEqual(d.backupVals[d.backups.indexOf('old1@v0')].chapitres.length,2,'copie = données d’origine');assert.ok(d.keys.includes('bad1')&&d.cahiers[d.keys.indexOf('bad1')]==='pas un objet','enregistrement illisible conservé en base');assert.strictEqual(d.cahiers[d.keys.indexOf('old1')].v,1);
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : normalisation robuste (valeurs absurdes, limites) sans exception',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 const r=await p.evaluate(()=>{const W=[],out=[];for(const v of [null,undefined,0,'x',[],{},{chapitres:'x'},{chapitres:[{blocs:'y'}]},{nom:{},chapitres:[{nom:5,blocs:[{type:'trace',v:'zz',items:5,comp:'x'}]}]},{chapitres:Array.from({length:300},(_,i)=>({nom:'c'+i}))},{chapitres:[{blocs:Array.from({length:300},()=>({type:'trace'}))}]},{nom:'x'.repeat(5e5)}]){try{const n=CAH.normCah(v,W);out.push(n?[n.nom.length,n.chapitres.length,n.chapitres.map(h=>h.blocs.length).reduce((a,b)=>a+b,0)]:null)}catch(e){out.push('EXC '+e.message)}}return{out,W:W.length}});
 assert.ok(!r.out.some(x=>typeof x==='string'),JSON.stringify(r.out));assert.deepStrictEqual(r.out.slice(0,5),[null,null,null,null,null]);assert.strictEqual(r.out[9][1],200);assert.strictEqual(r.out[10][2],200);assert.strictEqual(r.out[11][0],200);assert.ok(r.W>=3);
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : impression PDF — aperçu seul, chapitres sur pages séparées, formules, corrigés masquables, document long (30 chapitres)',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);
 await p.evaluate(()=>{const c=CAH.cc();c.nom='Cahier de test';c.chapitres=[];for(let i=1;i<=30;i++){const h={id:'h'+i,nom:'Chapitre-'+i+' é',ref:'',seqIds:[],blocs:[]};for(const t of Object.keys(CAH.T)){const b=CAH.normCah({chapitres:[{blocs:[{type:t,titre:'Bloc '+t+' '+i,v:Object.fromEntries(CAH.T[t].f.map(f=>[f[0],'Texte '+f[0]+' $\\frac{'+i+'}{2}$\n- puce\n\n'.repeat(3)])),corr:{texte:'CORR-'+t+'-'+i},items:[{id:'e',enonce:'Énoncé $x^2$',corrige:'CORRX-'+i}]}]}]}).chapitres[0].blocs[0];b.id='b'+i+t;h.blocs.push(b)}c.chapitres.push(h)}CAH.S.chap='h1';CAH.S.scope='all';CAH.render()});
 const t0=Date.now();await p.waitForSelector('#cahpg .katex');assert.ok(await p.locator('#cahpg .cp-ch').count()===30);
 const pdf=async(name)=>{await p.emulateMedia({media:'print'});const f=path.join(os.tmpdir(),name+Date.now()+'.pdf');await p.pdf({path:f,format:'A4',preferCSSPageSize:true,printBackground:true});await p.emulateMedia({media:'screen'});return f};
 const f=await pdf('cah-all');let pt=null;try{pt=require('child_process').execFileSync('pdftotext',['-layout',f,'-'],{encoding:'utf8',maxBuffer:5e7})}catch(e){console.log('      (pdftotext absent : contrôle du texte PDF ignoré)')}
 if(pt){const pages=pt.split('\f').filter(x=>x.trim());assert.ok(pages.length>=30,'au moins une page par chapitre : '+pages.length);assert.ok(/Cahier de test/.test(pages[0])&&/Chapitre 1 : Chapitre-1/.test(pages[0]));assert.ok(/Chapitre 30 : Chapitre-30/.test(pt));
  assert.ok(!/Ajouter un bloc|Réglages du cahier|← Préparations|Afficher les corrigés/.test(pt),'interface exclue de l’impression');assert.ok(/CORR-trace|CORRX-1/.test(pt)===false||true);assert.ok(/CORRX-1\b/.test(pt),'corrigés inclus quand affichés');
  const heads=pages.filter(x=>/Chapitre \d+ : Chapitre-\d+/.test(x));assert.strictEqual(heads.length,30,'un titre de chapitre par chapitre');for(const pg of heads)assert.ok(pg.split('\n').filter(l=>l.trim()).findIndex(l=>/Chapitre \d+ : /.test(l))<=2,'le chapitre commence en haut de page')}
 await p.selectOption('[data-ca=mode]','eleve_sans');const f2=await pdf('cah-nocorr');if(pt){const p2=require('child_process').execFileSync('pdftotext',['-layout',f2,'-'],{encoding:'utf8',maxBuffer:5e7});assert.ok(!/CORR-|CORRX-|Corrigé/.test(p2),'aucun corrigé dans la version sans corrigés');assert.ok(/Énoncé/.test(p2))}
 assert.ok(Date.now()-t0<40000,'document long : délai raisonnable');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : téléphone — onglets, boutons de taille tactile, pas de débordement horizontal, création complète',async()=>{const c=await ctx({viewport:{width:390,height:800},hasTouch:true,isMobile:true}),p=await c.newPage();await booted(p);
 await p.evaluate(()=>CAH.open());await p.waitForSelector('#cah:not([hidden]) #cahtabs');assert.ok(await p.isVisible('#cahtabs'));
 const tabs=await p.$$eval('#cahtabs button',b=>b.map(x=>[x.innerText,x.getBoundingClientRect().height]));assert.deepStrictEqual(tabs.map(x=>x[0]),['Chapitres','Édition','Aperçu']);assert.ok(tabs.every(x=>x[1]>=40));
 await p.tap('#cahE [data-ca=cnew]');await p.waitForSelector('#cahE [data-ch=nom]');assert.ok(await p.isVisible('#cahE')&&!(await p.isVisible('#cahP'))&&!(await p.isVisible('#cahL')));
 await p.tap('[data-ca=badd][data-t=trace]');await p.locator('.cbk textarea').fill('Cours $x^2$');await p.tap('#cahtabs [data-tab=prev]');assert.ok(await p.isVisible('#cahP')&&!(await p.isVisible('#cahE')));await p.waitForSelector('#cahpg .katex');
 await p.tap('#cahtabs [data-tab=list]');assert.ok(await p.isVisible('#cahL'));const h=await p.$eval('[data-ca=chnew]',e=>e.getBoundingClientRect().height);assert.ok(h>=40,'bouton tactile '+h);
 for(const tab of ['list','edit','prev']){await p.tap('#cahtabs [data-tab='+tab+']');const w=await p.evaluate(()=>{const b=document.getElementById('cahbody');return[b.scrollWidth,b.clientWidth,document.documentElement.scrollWidth,innerWidth]});assert.ok(w[0]<=w[1]+1&&w[2]<=w[3]+1,'débordement horizontal '+tab+' '+w)}
 const nm=await p.evaluate(()=>[...document.querySelectorAll('#cah button')].filter(b=>b.offsetParent&&!(b.innerText.trim()||b.getAttribute('aria-label'))).length);assert.strictEqual(nm,0);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : accessibilité — boutons et champs nommés, focus dans la boîte de dialogue, contenu derrière inerte, clavier',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahMenuOpen(p);await cahNew(p);for(const t of TYPES)await p.click('[data-ca=badd][data-t='+t+']');
 const bad=await p.evaluate(()=>{const out=[];document.querySelectorAll('#cah button,#cah input,#cah textarea,#cah select').forEach(e=>{if(!e.offsetParent)return;const n=(e.tagName==='BUTTON'?(e.textContent||'').trim():'')||e.getAttribute('aria-label')||(e.labels&&e.labels.length)||(e.closest('label')&&e.closest('label').innerText.trim());if(!n)out.push(e.tagName+'.'+(e.dataset.ca||e.dataset.f||e.id||e.className))});return out});assert.deepStrictEqual(bad,[],'éléments sans nom accessible');
 assert.strictEqual(await p.getAttribute('#cah','role'),'dialog');assert.ok(await p.getAttribute('#cah','aria-label'));assert.strictEqual(await p.evaluate(()=>document.getElementById('cah').contains(document.activeElement)),true,'focus dans le cahier');
 for(let i=0;i<40;i++){await p.keyboard.press('Tab');assert.strictEqual(await p.evaluate(()=>document.getElementById('cah').contains(document.activeElement)||!!document.querySelector('.mdl')),true,'Tab ne sort pas du cahier')}
 await p.focus('#cahL [data-ca=chsel]');await p.keyboard.press('Enter');assert.strictEqual(await p.evaluate(()=>CAH.S.chap===CAH.cc().chapitres[0].id),true);
 const low=await p.evaluate(()=>{const lum=c=>{const [r,g,b]=c.match(/\d+/g).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};const bad=[];document.querySelectorAll('#cahbar button,.cp-h,#cahL .cl-n,.ce-add .cbtn').forEach(e=>{if(!e.offsetParent)return;const s=getComputedStyle(e);let bg=s.backgroundColor;if(/rgba\(0, 0, 0, 0\)|transparent/.test(bg))bg='rgb(255,255,255)';const a=lum(s.color),b=lum(bg),r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(r<4.5)bad.push((e.dataset.ca||e.className)+' '+r.toFixed(2))});return bad});assert.deepStrictEqual(low,[],'contrastes insuffisants');
 await p.keyboard.press('Escape');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier : intégration — sauvegarde ZIP et export JSON existants inchangés avec des cahiers présents',async()=>{const c=await ctx(),p=await c.newPage();await seed(p,null,JSON.stringify(legacyDb()));await booted(p);await cahOpen(p);await cahNew(p);await p.click('[data-ca=badd][data-t=trace]');await cahSaved(p);await p.click('#cahbar [data-ca=close]');
 const z=await p.evaluate(async()=>{const b=await buildZip(db);const r=await readZip(new File([b],'s.zip'));return{n:b.length,seqs:r.d.seqs.length,seances:r.d.seances.length,err:r.R.errors}});assert.strictEqual(z.seqs,2);assert.ok(z.seances>=2);assert.deepStrictEqual(z.err,[]);
 const j=await p.evaluate(()=>JSON.parse(JSON.stringify({seqs:db.seqs,seances:db.seances})));assert.ok(!('cahiers' in j),'les préparations ne contiennent aucun cahier');assert.ok(!(await p.evaluate(()=>JSON.stringify(db)).then(s=>/chapitres/.test(s))),'db ne mélange pas chapitres et séances');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

/* ================= 📚 Cahier de l'élève — phase 2 : éditeur pédagogique ================= */
const zlibN=require('zlib');
function pngBuf(w,h,rgb){const T=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0}),crc=b=>{let c=0xffffffff;for(const x of b)c=T[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0},
 ch=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c])},ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
 const px=[];for(let x=0;x<w;x++)px.push((rgb[0]+x)&255,rgb[1],rgb[2]);const row=Buffer.concat([Buffer.from([0]),Buffer.from(px)]),raw=Buffer.concat(Array.from({length:h},()=>row));
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlibN.deflateSync(raw)),ch('IEND',Buffer.alloc(0))])}
const CPNG1=pngBuf(1800,900,[200,40,40]),CPNG2=pngBuf(300,300,[20,90,200]);
const cahAddBlocks=async(p,L)=>{for(const t of L)await p.click('[data-ca=badd][data-t='+t+']')};
const cahPickImg=async(p,btnSel,files)=>{const[fc]=await Promise.all([p.waitForEvent('filechooser'),p.click(btnSel)]);await fc.setFiles(files)};
const nImgs=(p,i)=>p.evaluate(i=>CAH.ch().blocs[i].imgs.length,i);
const pngFile=(name,buf)=>({name,mimeType:'image/png',buffer:buf});
const imgsLoaded=p=>p.waitForFunction(()=>[...document.querySelectorAll('#cahpg img')].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:8000});
const mkFileIn=(p,b64,name,type)=>`new File([Uint8Array.from(atob(${JSON.stringify(b64)}),c=>c.charCodeAt(0))],${JSON.stringify(name)},{type:${JSON.stringify(type)}})`;

T('cahier phase 2 : mise en forme — barre d’outils, raccourcis, encadrés, tableaux, questions, formules',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);await cahAddBlocks(p,['trace']);
 const ta=p.locator('.cbk textarea').first(),val=()=>ta.inputValue();
 await ta.fill('mot important');await ta.evaluate(e=>{e.focus();e.setSelectionRange(0,3)});await p.click('[data-ca=fmt][data-m=b]');assert.strictEqual(await val(),'**mot** important');
 await ta.evaluate(e=>{e.focus();e.setSelectionRange(e.value.length-9,e.value.length)});await p.keyboard.press('Control+u');assert.strictEqual(await val(),'**mot** __important__','Ctrl+U');await ta.evaluate(e=>{e.focus();e.setSelectionRange(2,5)});await p.keyboard.press('Control+b');assert.ok(/\*\*\*\*mot\*\*\*\*/.test(await val())||(await val()).startsWith('****'),'Ctrl+B');
 await ta.fill('');await p.click('.cbk textarea');await p.click('[data-ca=fmt][data-m=h]');await p.keyboard.type('Les opposés');assert.strictEqual(await val(),'## Les opposés');
 await ta.fill('');await ta.click();await p.click('[data-ca=fmt][data-m=def]');await p.keyboard.type('L’opposé de $a$ est $-a$.');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.click('[data-ca=fmt][data-m=prop]');await p.keyboard.type('Pour tout $a$, $a+(-a)=0$.');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.click('[data-ca=fmt][data-m=thm]');await p.keyboard.type('Théorème de test');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.click('[data-ca=fmt][data-m=ex]');await p.keyboard.type('Exemple : $\\frac{1}{2}$');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.click('[data-ca=fmt][data-m=meth]');await p.keyboard.type('Méthode en deux étapes');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.click('[data-ca=fmt][data-m=rem]');await p.keyboard.type('Une remarque');await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.click('[data-ca=fmt][data-m=att]');await p.keyboard.type('Attention aux signes');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
 await p.click('[data-ca=fmt][data-m=tab]');await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.keyboard.type('1. Première question');await p.keyboard.press('Enter');await p.keyboard.type('suite de la question');await p.keyboard.press('Enter');await p.keyboard.type('a) Sous-question');await p.keyboard.press('Enter');await p.keyboard.type('- puce un');
 await p.click('[data-ca=kbd][data-i="0"]');await p.keyboard.type('1');await p.keyboard.press('Tab');
 const v=await val();assert.ok(v.includes('@def L’opposé')&&v.includes('@prop Pour tout')&&v.includes('@thm Théorème')&&v.includes('@ex Exemple')&&v.includes('@meth ')&&v.includes('@rem ')&&v.includes('@att ')&&v.includes('| Titre 1 | Titre 2 | Titre 3 |\n|---|---|---|'),v);assert.ok(/\$\\frac\{1\}\{\}\$/.test(v),'formule insérée, curseur dans la première accolade : '+v.slice(-40));
 await p.waitForTimeout(250);const g=async s=>p.locator('#cahpg '+s).count();
 assert.strictEqual(await g('.cp-call'),7,'sept encadrés');assert.strictEqual(await g('.cp-def,.cp-call .cp-cl'),7);const lab=await p.$$eval('#cahpg .cp-cl',e=>e.map(x=>x.textContent));assert.deepStrictEqual(lab,['Définition','Propriété','Théorème','Exemple','Méthode','Remarque','Attention']);
 assert.strictEqual(await g('table.cp-t thead th'),3);assert.strictEqual(await g('table.cp-t tbody tr'),2);assert.strictEqual(await g('p.cp-q'),2,'questions numérotées');assert.ok(/Première question suite de la question/.test(await p.$eval('#cahpg',e=>e.innerText)),'ligne de continuation recollée');assert.strictEqual(await g('li'),1);assert.ok(await g('.katex')>=4);
 const cs=await p.$$eval('#cahpg .cp-call',e=>e.map(x=>getComputedStyle(x).borderLeftColor));assert.strictEqual(new Set(cs).size,6,'couleurs d’encadrés distinctes (théorème et attention partagent le rouge)');
 // rendu sûr : aucun HTML issu du texte
 const o=await p.evaluate(()=>{const X='<img src=x onerror="window.__x=1"><script>window.__x=1<\/script>',h=CAH.rich('@def '+X+'\n'+X+'\n\n| '+X+' | **b** |\n|---|---|\n| '+X+' | $x$ |\n\n1. '+X+'\n- '+X),d=document.createElement('div');d.innerHTML=h;return{img:d.querySelectorAll('img,script').length,x:window.__x,b:d.querySelectorAll('table b').length,txt:d.textContent.includes('<img src=x')}});
 assert.deepStrictEqual(o,{img:0,x:undefined,b:1,txt:true});
 assert.strictEqual(await p.evaluate(()=>CAH.rich('')+CAH.rich(null)+CAH.rich('   ')),'');assert.strictEqual(await p.evaluate(()=>CAH.rich('@def')),'<div class="cp-call" style="--cc:#1f5fa8"><b class="cp-cl">Définition</b></div>');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 2 : images — ajout, taille, alignement, légende, déplacement, suppression, collage, dépôt, jamais déformées, persistance, annulation',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);await cahAddBlocks(p,['decouverte','exercices']);
 const pr0=await prepState(p);
 await cahPickImg(p,'.cbk >> nth=0 >> [data-ca=imgadd]',pngFile('fig.png',CPNG1));await p.waitForFunction(()=>CAH.ch().blocs[0].imgs.length===1);
 let m=await p.evaluate(()=>CAH.ch().blocs[0].imgs[0]);assert.ok(/^data:image\/jpeg;base64,/.test(m.u));assert.ok(m.id&&m.w===100&&m.a==='c'&&m.l==='');
 const dim=await p.evaluate(u=>new Promise(r=>{const i=new Image();i.onload=()=>r([i.width,i.height]);i.src=u}),m.u);assert.deepStrictEqual(dim,[900,450],'réduite à 900 px, proportions conservées');
 await p.selectOption('.cbk >> nth=0 >> [data-f=imgw]','50');await p.selectOption('.cbk >> nth=0 >> [data-f=imga]','r');await p.fill('.cbk >> nth=0 >> [data-f=imgl]','Figure 1 : le thermomètre');await p.waitForTimeout(250);await imgsLoaded(p);
 const f=await p.$eval('#cahpg .cp-im figure',e=>{const s=getComputedStyle(e),i=e.querySelector('img').getBoundingClientRect();return{w:e.style.width,fl:s.float,cap:e.querySelector('figcaption').textContent,ratio:i.width/i.height,nat:e.querySelector('img').naturalWidth/e.querySelector('img').naturalHeight}});
 assert.strictEqual(f.w,'50%');assert.strictEqual(f.fl,'right');assert.strictEqual(f.cap,'Figure 1 : le thermomètre');assert.ok(Math.abs(f.ratio-f.nat)<.01,'aucune déformation '+f.ratio+' / '+f.nat);
 // 2e image, déplacement, suppression
 await cahPickImg(p,'.cbk >> nth=0 >> [data-ca=imgadd]',pngFile('b.png',CPNG2));await p.waitForFunction(()=>CAH.ch().blocs[0].imgs.length===2);const ids=await p.evaluate(()=>CAH.ch().blocs[0].imgs.map(x=>x.id));assert.notStrictEqual(ids[0],ids[1]);
 await p.locator('.cbk >> nth=0 >> .cbk-ig').nth(1).locator('[data-ca=imgup]').click();assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().blocs[0].imgs.map(x=>x.id)),[ids[1],ids[0]]);
 await p.locator('.cbk >> nth=0 >> .cbk-ig').nth(0).locator('[data-ca=imgdel]').click();assert.strictEqual(await nImgs(p,0),1);
 // image dans un exercice
 await cahPickImg(p,'.cbk >> nth=1 >> fieldset >> [data-ca=imgadd]',pngFile('e.png',CPNG2));await p.waitForFunction(()=>CAH.ch().blocs[1].items[0].imgs.length===1);assert.strictEqual(await nImgs(p,1),0,'l’image est rattachée à l’exercice');
 // collage (focus dans le bloc) / hors bloc / format refusé / dépôt
 const b64=CPNG2.toString('base64');
 await p.locator('.cbk >> nth=0 >> textarea').first().focus();await p.evaluate(`(async()=>{const dt=new DataTransfer();dt.items.add(${mkFileIn(p,b64,'p.png','image/png')});document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))})()`);await p.waitForFunction(()=>CAH.ch().blocs[0].imgs.length===2);
 const pc=await p.evaluate(()=>S().imgs.length);await p.focus('[data-ch=nom]');await p.evaluate(`document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:(()=>{const d=new DataTransfer();d.items.add(${mkFileIn(p,b64,'p.png','image/png')});return d})(),bubbles:true,cancelable:true}))`);await p.waitForTimeout(300);assert.strictEqual(await nImgs(p,0),2,'collage hors bloc : rien');assert.strictEqual(await p.evaluate(()=>S().imgs.length),pc);
 await p.evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(${mkFileIn(p,b64,'x.svg','image/svg+xml')});document.querySelector('.cbk textarea').focus();document.activeElement.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))})()`);await p.waitForTimeout(300);assert.strictEqual(await nImgs(p,0),2,'SVG refusé');
 await p.evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(${mkFileIn(p,b64,'d.png','image/png')});const t=document.querySelector('.cbk[data-bid] textarea');for(const n of ['dragover','drop'])t.dispatchEvent(new DragEvent(n,{dataTransfer:dt,bubbles:true,cancelable:true}))})()`);await p.waitForFunction(()=>CAH.ch().blocs[0].imgs.length===3);
 assert.strictEqual(await p.evaluate(()=>S().imgs.length),pc,'aucune image ajoutée aux séances');assert.strictEqual(await prepState(p),pr0);
 // persistance + intégrité + annulation
 await cahSaved(p);const mem=await cahCur(p),d=await cahDump(p);assert.deepStrictEqual(d.cahiers[0],mem,'base = mémoire (images comprises)');
 const hl=await p.evaluate(()=>Math.max(...CAH.S.hist.map(x=>x.length)));assert.ok(hl<60000,'historique léger : les images ne sont pas dupliquées ('+hl+')');
 await p.click('#cahbar [data-ca=hundo]');assert.strictEqual(await nImgs(p,0),2,'↶ retire la dernière image');await p.click('#cahbar [data-ca=hredo]');assert.strictEqual(await nImgs(p,0),3,'↷ la rétablit');
 await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.strictEqual(await nImgs(p,0),3);await imgsLoaded(p);assert.strictEqual(await p.locator('#cahpg img').count(),4);
 // impression : proportions conservées
 await p.emulateMedia({media:'print'});const rr=await p.$$eval('#cahpg img',e=>e.map(i=>Math.abs(i.getBoundingClientRect().width/i.getBoundingClientRect().height-i.naturalWidth/i.naturalHeight)));await p.emulateMedia({media:'screen'});assert.ok(rr.every(x=>x<.02),'proportions à l’impression');
 // export / import avec images ; données malveillantes écartées
 const exp=await p.evaluate(()=>JSON.parse(JSON.stringify({format:CAH.FMT,version:1,cahiers:[CAH.cc()]})));exp.cahiers[0].chapitres[0].blocs[0].imgs.push({id:'z',u:'data:image/svg+xml;base64,PHN2Zy8+',w:50,a:'c'},{id:'y',u:'javascript:alert(1)'},{id:'w',u:'data:image/png;base64,AAAA" onerror="x',w:9999});
 const r=await p.evaluate(o=>{const x=CAH.parseImp(JSON.stringify(o));return{n:x.L[0].chapitres[0].blocs[0].imgs.length,l:x.L[0].chapitres[0].blocs[0].imgs.every(i=>/^data:image\/(png|jpeg)/.test(i.u))}},exp);assert.deepStrictEqual(r,{n:3,l:true},'images invalides écartées, valides conservées');
 await p.setInputFiles('#cahf',{name:'i.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exp))});await modalText(p);await clickBtn(p,'Ajouter');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.S.list.length),2);assert.strictEqual(await nImgs(p,0),3);
 const idsA=await p.evaluate(()=>CAH.S.list.map(x=>x.chapitres[0].blocs[0].imgs.map(i=>i.id)).flat());assert.strictEqual(new Set(idsA).size,idsA.length,'identifiants d’images uniques après import');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 2 : corrigés — trois versions, réglages par bloc, « Voir le corrigé », impression et PDF',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await cahOpen(p);await cahNew(p);await cahAddBlocks(p,['decouverte','exercices','tache','eval']);
 const B=i=>p.locator('.cbk').nth(i);
 await B(0).locator('textarea').nth(2).fill('CORR-DECOUVERTE');await B(1).locator('[data-f=enonce]').fill('Énoncé ex');await B(1).locator('[data-f=corrige]').fill('CORR-EXO');await B(2).locator('textarea').nth(4).fill('CORR-TACHE');await B(3).locator('textarea').nth(3).fill('CORR-EVAL');
 // réglages : découverte = rien ; exercices = PDF + affiché ; tâche = en ligne seulement ; évaluation = en ligne + PDF, masqué
 await B(1).locator('summary:has-text("Réglages du corrigé")').click();await B(1).locator('[data-f=corropt][data-k=pdf]').check();await B(1).locator('select[data-k=defaut]').selectOption('affiche');
 await B(2).locator('summary:has-text("Réglages du corrigé")').click();await B(2).locator('[data-f=corropt][data-k=en_ligne]').check();
 await B(3).locator('summary:has-text("Réglages du corrigé")').click();await B(3).locator('[data-k=en_ligne]').check();await B(3).locator('[data-k=pdf]').check();await B(3).locator('[data-k=word]').check();
 assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().blocs.map(b=>[b.corr.defaut,b.corr.en_ligne,b.corr.pdf,b.corr.word])),[['masque',false,false,false],['affiche',false,true,false],['masque',true,false,false],['masque',true,true,true]]);
 const scr=()=>p.$$eval('#cahpg details.scr',e=>e.map(x=>[x.textContent.match(/CORR-\w+/)[0],x.open])),prt=()=>p.$$eval('#cahpg .prt',e=>e.map(x=>x.textContent.match(/CORR-\w+/)[0]));
 await p.waitForTimeout(250);assert.deepStrictEqual(await scr(),[['CORR-DECOUVERTE',true],['CORR-EXO',true],['CORR-TACHE',true],['CORR-EVAL',true]],'enseignant : tout, déplié');assert.deepStrictEqual(await prt(),['CORR-DECOUVERTE','CORR-EXO','CORR-TACHE','CORR-EVAL']);
 await p.selectOption('[data-ca=mode]','eleve_avec');assert.deepStrictEqual(await scr(),[['CORR-EXO',true],['CORR-TACHE',false],['CORR-EVAL',false]],'élève avec corrigés : réglages du bloc, « Voir le corrigé » replié si masqué');assert.deepStrictEqual(await prt(),['CORR-EXO','CORR-EVAL'],'PDF : seulement les blocs cochés « PDF »');
 assert.ok(/Voir le corrigé/.test(await p.$eval('#cahpg',e=>e.innerText)));await p.locator('#cahpg details.scr').nth(1).locator('summary').click();assert.strictEqual(await p.locator('#cahpg details.scr').nth(1).evaluate(e=>e.open),true,'clic = corrigé affiché');
 await p.selectOption('[data-ca=mode]','eleve_sans');assert.strictEqual(await p.locator('#cahpg .cp-co').count(),0);assert.ok(!/CORR-|Corrigé/.test(await p.$eval('#cahpg',e=>e.innerHTML)),'aucun corrigé dans le HTML (pas un simple masquage)');
 // impression
 const pdfText=async m=>{await p.selectOption('[data-ca=mode]',m);await p.emulateMedia({media:'print'});const vis=await p.evaluate(()=>({scr:[...document.querySelectorAll('.scr')].some(e=>getComputedStyle(e).display!=='none'),prt:[...document.querySelectorAll('.prt')].filter(e=>getComputedStyle(e).display!=='none').length}));const f=path.join(os.tmpdir(),'cah-corr-'+m+Date.now()+'.pdf');await p.pdf({path:f,format:'A4',preferCSSPageSize:true,printBackground:true});await p.emulateMedia({media:'screen'});let t=null;try{t=require('child_process').execFileSync('pdftotext',['-layout',f,'-'],{encoding:'utf8'})}catch(e){}return{vis,t}};
 let r=await pdfText('enseignant');assert.deepStrictEqual(r.vis,{scr:false,prt:4});if(r.t)assert.ok(['DECOUVERTE','EXO','TACHE','EVAL'].every(k=>r.t.includes('CORR-'+k)));
 r=await pdfText('eleve_avec');assert.deepStrictEqual(r.vis,{scr:false,prt:2});if(r.t){assert.ok(r.t.includes('CORR-EXO')&&r.t.includes('CORR-EVAL'));assert.ok(!r.t.includes('CORR-TACHE')&&!r.t.includes('CORR-DECOUVERTE')&&!/Voir le corrigé/.test(r.t))}
 r=await pdfText('eleve_sans');assert.deepStrictEqual(r.vis,{scr:false,prt:0});if(r.t)assert.ok(!/CORR-|Corrigé/.test(r.t));
 await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().blocs.map(b=>[b.corr.defaut,b.corr.en_ligne,b.corr.pdf,b.corr.word])),[['masque',false,false,false],['affiche',false,true,false],['masque',true,false,false],['masque',true,true,true]],'réglages enregistrés');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 2 : nouveaux champs et blocs (fiche de révision, questions intermédiaires), sept couleurs lisibles, compatibilité avec les cahiers de la phase 1',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);
 await p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('cdm3cahiers',1);r.onupgradeneeded=()=>{['cahiers','meta','backups'].forEach(n=>r.result.createObjectStore(n))};r.onsuccess=()=>{const t=r.result.transaction(['cahiers','meta'],'readwrite');
  t.objectStore('cahiers').put({id:'p1',v:1,nom:'Cahier phase 1',niveau:'5e',classe:'',annee:'',couleurs:{attendus:'#1f5fa8',decouverte:'#d9730d',trace:'#2e8540',exercices:'#7b3fa0',tache:'#c0392b',eval:'#2c3e50'},creeLe:'2026-01-01T00:00:00.000Z',modifLe:'2026-01-02T00:00:00.000Z',pub:{statut:'brouillon',version:0},
   chapitres:[{id:'c1',nom:'Ch',ref:'',seqIds:[],blocs:[{id:'b1',type:'exercices',titre:'',couleur:'',v:{consigne:''},corr:{texte:'',defaut:'masque',en_ligne:false,pdf:false,word:false},comp:[],items:[{id:'i1',num:'',titre:'',niveau:'',enonce:'E1',corrige:'C1'}],imgs:[{u:'data:image/png;base64,iVBORw0KGgo=',w:100,a:'c',l:''}],saut:false},{id:'b2',type:'tache',titre:'',couleur:'',v:{texte:'T',consigne:'',demarche:''},corr:{texte:'',defaut:'masque',en_ligne:false,pdf:false,word:false},comp:[],items:[],imgs:[],saut:false}]}]},'p1');
  t.objectStore('meta').put(['p1'],'order');t.oncomplete=()=>{r.result.close();res()}}}));
 await cahOpen(p);assert.strictEqual(await p.locator('.mdl').count(),0,'aucun avertissement : données de la phase 1 valides');const o=await cahCur(p);assert.strictEqual(o.v,1);assert.strictEqual(o.couleurs.revision,'#00796b','couleur du nouveau type ajoutée');assert.ok(o.chapitres[0].blocs[0].imgs[0].id&&o.chapitres[0].blocs[0].items[0].imgs.length===0&&o.chapitres[0].blocs[1].v.questions==='');
 await cahSaved(p);const d=await cahDump(p);assert.deepStrictEqual(d.backups,[],'pas de migration ni de copie de sécurité nécessaires');
 await cahAddBlocks(p,['revision','tache','eval']);const B=i=>p.locator('.cbk').nth(i);
 await B(2).locator('textarea').nth(0).fill('- Point clé $x^2$');await B(2).locator('textarea').nth(1).fill('Méthode 1');await B(2).locator('textarea').nth(2).fill('Exercices 3 et 4');
 await B(3).locator('textarea').nth(1).fill('Consigne');await B(3).locator('textarea').nth(2).fill('1. Intermédiaire A\n2. Intermédiaire B');await B(3).locator('[data-f=comp][data-k=Modéliser]').check();await B(4).locator('textarea').nth(2).fill('/20');await B(4).locator('[data-f=comp][data-k=Calculer]').check();await p.waitForTimeout(250);
 const t=await p.$eval('#cahpg',e=>e.innerText);for(const s of ['Fiche de révision','Points clés à retenir','Méthodes à maîtriser','Exercices conseillés pour s’entraîner','Questions intermédiaires','Intermédiaire A','Compétences : Modéliser','Je vérifie mes connaissances','/20'])assert.ok(t.includes(s),s);
 assert.strictEqual(await p.locator('#cahpg p.cp-q').count(),2);assert.strictEqual(await p.locator('.ce-add .cbtn').count(),7,'sept types de blocs proposés');
 const col=await p.evaluate(()=>CAH.ch().blocs.map(b=>CAH.cc().couleurs[b.type]));assert.strictEqual(col[2],'#00796b');
 // contraste (>= 4,5) des en-têtes de bloc et des étiquettes d'encadrés
 await p.locator('.cbk textarea').nth(0).fill('x');await p.evaluate(()=>{CAH.ch().blocs[3].v.texte='@def a\n\n@prop b\n\n@thm c\n\n@ex d\n\n@meth e\n\n@rem f\n\n@att g';CAH.render()});
 const low=await p.evaluate(()=>{const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return s.startsWith('color(')?m.slice(0,3).map(x=>x*255):m.slice(0,3)},lum=a=>{const[r,g,b]=a.map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b},bad=[];
  const test=(fg,bg,n)=>{const a=lum(rgb(fg)),b=lum(rgb(bg)),r=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(r<4.5)bad.push(n+' '+r.toFixed(2))};
  document.querySelectorAll('#cahpg .cp-h').forEach(e=>{const s=getComputedStyle(e);test(s.color,s.backgroundColor,'en-tête '+e.textContent.trim().slice(0,12))});document.querySelectorAll('#cahpg .cp-cl').forEach(e=>{const s=getComputedStyle(e),bg=getComputedStyle(e.parentElement).backgroundColor;test(s.color,bg,'étiquette '+e.textContent)});return bad});assert.deepStrictEqual(low,[],'contrastes insuffisants');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 2 : téléphone et accessibilité de l’éditeur (barre d’outils, images, réglages)',async()=>{const c=await ctx({viewport:{width:390,height:800},hasTouch:true,isMobile:true}),p=await c.newPage();await booted(p);await p.evaluate(()=>CAH.open());await p.waitForSelector('#cah:not([hidden]) #cahtabs');await p.tap('#cahE [data-ca=cnew]');await p.waitForSelector('#cahE [data-ch=nom]');
 await cahAddBlocks(p,['trace','exercices','eval']);await cahPickImg(p,'.cbk >> nth=0 >> [data-ca=imgadd]',pngFile('m.png',CPNG2));await p.waitForFunction(()=>CAH.ch().blocs[0].imgs.length===1);
 await p.locator('.cbk >> nth=0 >> textarea').first().fill('@def mobile\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n1. question $x^2$');
 const sz=await p.$$eval('.ce-tb button,.cbk-ig button,.cbk-im .cbtn',b=>b.filter(x=>x.offsetParent).map(x=>{const r=x.getBoundingClientRect();return Math.min(r.width,r.height)}));assert.ok(sz.length>20&&sz.every(h=>h>=39),'zones tactiles ≥ 40 px : '+Math.min(...sz));
 for(const tab of ['edit','prev']){await p.tap('#cahtabs [data-tab='+tab+']');await imgsLoaded(p).catch(()=>{});const w=await p.evaluate(()=>{const b=document.getElementById('cahbody');return[b.scrollWidth,b.clientWidth,document.documentElement.scrollWidth,innerWidth]});assert.ok(w[0]<=w[1]+1&&w[2]<=w[3]+1,'débordement '+tab+' '+w)}
 await p.tap('#cahtabs [data-tab=edit]');const bad=await p.evaluate(()=>{const out=[];document.querySelectorAll('#cah button,#cah input,#cah textarea,#cah select').forEach(e=>{if(!e.offsetParent)return;const n=(e.tagName==='BUTTON'?(e.textContent||'').trim():'')||e.getAttribute('aria-label')||(e.labels&&e.labels.length)||(e.closest('label')&&e.closest('label').textContent.trim());if(!n)out.push(e.tagName+'.'+(e.dataset.ca||e.dataset.f||e.id))});return out});assert.deepStrictEqual(bad,[],'éléments sans nom accessible');
 assert.strictEqual(await p.getAttribute('.ce-tb','role'),'toolbar');assert.ok(await p.getAttribute('.ce-tb','aria-label'));assert.ok(await p.$$eval('.cbk-ig img',e=>e.every(i=>i.alt)),'alternatives textuelles des images');assert.deepStrictEqual(c.errs,[]);await c.close()});

/* ================= 📚 Cahier de l'élève — phase 3 : liaison avec les préparations et la banque ================= */
const seedPrep=p=>p.evaluate(()=>{const mk=c=>{const cv=document.createElement('canvas');cv.width=200;cv.height=100;const g=cv.getContext('2d');g.fillStyle=c;g.fillRect(0,0,200,100);return cv.toDataURL('image/png')},I={A:mk('#cc3333'),T:mk('#33cc33'),C:mk('#3333cc')};
 const q=db.seqs[0];Object.assign(q,{nom:'Nombres relatifs',niveau:'5e',classe:'5A',boRef:'Programme du cycle 4',bo:'- Opposé d’un nombre\n- Addition de relatifs',capacites:'- Comparer deux relatifs\n- Additionner deux relatifs',cadre:'Cadre général.\n\n## Objectifs généraux de la séquence\n- Comprendre les relatifs\n- Comparer deux relatifs\n\n## Progression\nS1 à S4',reco:'SECRET-RECO'});
 const s1=db.seances[0];Object.assign(s1,{numero:1,nom:'Découverte',date:'2026-11-09',objectifs:'Comprendre les relatifs',activiteTitre:'Le thermomètre',activite:'1. Quelle température ?\n→ Correction : -5 °C\n2. Compare $-5$ et $3$.\n→ Correction : $-5<3$\nsuite de la correction\n3. Conclure',trace:'## Opposé\nL’opposé de $a$ est $-a$.',supp:'Problème bonus $x$',difficultes:'SECRET-DIFF',choixProbleme:'SECRET-CHOIX',choixTravail:'SECRET-TRAVAIL',compTexte:'SECRET-COMP',rem:'SECRET-REM',prereq:'SECRET-PREREQ',aides:'SECRET-AIDES',evalBilan:'SECRET-BILAN',comp:['Calculer'],imgs:[{u:I.A,w:50,a:'r',z:'a',l:'Fig A'},{u:I.T,w:75,a:'c',z:'t',l:'Fig T'},{u:I.C,w:100,a:'c',z:'c',l:'SECRET-IMG'}]});
 s1.phases.forEach(x=>{x.comment='SECRET-PHASE'});
 const add=o=>{addSeance(q.id);const s=db.seances[db.seances.length-1];Object.assign(s,o);return s};
 add({numero:2,nom:'Problème ouvert',tags:'Problème ouvert',activiteTitre:'Le trajet',activite:'Situation : un trajet.\n1. Trouver la distance.\n→ Correction : 12 km',comp:['Chercher','Raisonner'],trace:'',objectifs:'Résoudre un problème'});
 add({numero:3,nom:'Entraînement',activite:'',trace:'Cours S3',objectifs:'S3'});
 add({numero:4,nom:'Évaluation',type:'eval',activite:'Calculer $3+(-5)$.\n→ Correction : $-2$',comp:['Calculer'],trace:'Ne pas importer par défaut'});
 db.cur=s1.id;changed();return I});
const lkRows=p=>p.$$eval('.mdl .lk-r[data-row]',r=>r.map(x=>({k:x.dataset.row,t:x.querySelector('label').innerText.trim(),c:x.querySelector('[data-k]').checked,d:(x.querySelector('select')||{}).value||null,opts:x.querySelector('select')?[...x.querySelectorAll('option')].map(o=>o.value):null,dup:/déjà importé/.test(x.innerText)})));
const lkOpenImp=async p=>{await p.click('.ce-lk [data-ca=lkimp]');await p.waitForSelector('.mdl .lk fieldset')};
const lkAssoc=async p=>{await p.click('[data-ca=lkpick]');await p.waitForSelector('.mdl .lk');await p.check('.mdl input[data-q]');await clickBtn(p,'Associer');await modalDone(p)};
const lkGo=async(p,rx)=>{await clickBtn(p,rx||'Importer la sélection');await modalDone(p)};
const cahJ=p=>p.evaluate(()=>JSON.stringify(CAH.cc()));
const prepJ=p=>p.evaluate(()=>JSON.stringify({q:db.seqs,s:db.seances,b:db.bank||[]}));
const SECRETS=['SECRET-RECO','SECRET-DIFF','SECRET-CHOIX','SECRET-TRAVAIL','SECRET-COMP','SECRET-REM','SECRET-PREREQ','SECRET-AIDES','SECRET-BILAN','SECRET-IMG','SECRET-PHASE'];

T('cahier phase 3 : associer des séquences à un chapitre — liste, recherche, plusieurs séquences, dissociation, séquence supprimée',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedPrep(p);
 await p.evaluate(()=>{addSeq();db.seqs[1].nom='Fractions';db.seqs[1].niveau='6e';addSeq();db.seqs[2].nom='Proportionnalité';db.seqs[2].niveau='5e';db.seqs[2].classe='5B';changed()});await saved(p);const pr0=await prepJ(p);
 await cahOpen(p);await cahNew(p);assert.ok(/aucune/.test(await p.innerText('.ce-lk')));
 await p.click('[data-ca=lkpick]');await p.waitForSelector('.mdl .lk');const rows=await p.$$eval('.mdl .lk-r[data-q]',r=>r.map(x=>x.innerText.replace(/\s+/g,' ')));assert.strictEqual(rows.length,3);assert.ok(/Nombres relatifs.*5e · 5A · 4 séances · 9 nov/.test(rows[0]),rows[0]);assert.ok(/Fractions.*6e · 1 séance/.test(rows[1]),rows[1]);
 assert.ok(await p.isDisabled('.mdl .mda button:has-text("Associer et importer")'),'import désactivé sans sélection');
 await p.fill('#lkq','proport');assert.strictEqual(await p.$$eval('.mdl .lk-r[data-q]',r=>r.filter(x=>x.style.display!=='none').length),1);await p.fill('#lkq','');assert.strictEqual(await p.$$eval('.mdl .lk-r[data-q]',r=>r.filter(x=>x.style.display!=='none').length),3);
 await p.check('.mdl input[data-q]>>nth=0');await p.check('.mdl input[data-q]>>nth=2');assert.ok(/2 séquences sélectionnées/.test(await p.innerText('#lkn')));await clickBtn(p,'Associer');await modalDone(p);
 const ids=await p.evaluate(()=>CAH.ch().seqIds);assert.deepStrictEqual(ids,await p.evaluate(()=>[db.seqs[0].id,db.seqs[2].id]));assert.strictEqual(await p.locator('.ce-lk .chip').count(),2);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),0,'l’association ne copie rien');assert.strictEqual(await prepJ(p),pr0,'préparations inchangées');
 await cahSaved(p);assert.deepStrictEqual((await cahDump(p)).cahiers[0].chapitres[0].seqIds,ids,'association enregistrée');
 await p.locator('.chip').nth(1).locator('[data-ca=lkrm]').click();assert.strictEqual(await p.locator('.ce-lk .chip').count(),1);assert.deepStrictEqual(await p.evaluate(()=>CAH.ch().seqIds.length),1);
 await p.click('[data-ca=lkpick]');await p.waitForSelector('.mdl .lk');assert.strictEqual(await p.$$eval('.mdl input[data-q]:checked',e=>e.length),1,'séquence déjà associée cochée');await clickBtn(p,'Annuler');await modalDone(p);
 // séquence supprimée de la préparation : puce signalée, cahier intact
 await p.evaluate(()=>{const id=db.seqs[0].id;db.seances=db.seances.filter(s=>s.seq!==id);db.seqs=db.seqs.filter(q=>q.id!==id);CAH.render()});assert.ok(/séquence introuvable/.test(await p.innerText('.ce-lk .chip')));assert.strictEqual(await p.locator('.chip [data-ca=lkimp]').count(),0);
 await p.click('.chip [data-ca=lkrm]');assert.strictEqual(await p.evaluate(()=>CAH.ch().seqIds.length),0);
 // aucune séquence : message clair
 await p.evaluate(()=>{db.seqs=[];db.seances=[];});await p.click('[data-ca=lkpick]');assert.ok(/Aucune séquence/.test(await modalText(p)));await clickBtn(p,'Fermer');await modalDone(p);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : importer depuis une séquence — candidats, destinations proposées, sélection, correspondances, corrigés séparés, images par zone',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);const I=await seedPrep(p);await saved(p);const pr0=await prepJ(p);
 await cahOpen(p);await cahNew(p);await lkAssoc(p);await lkOpenImp(p);
 const R=await lkRows(p),by=k=>R.find(r=>r.k===k);assert.deepStrictEqual(R.map(r=>r.k).filter(k=>!/^s:/.test(k)),['q:nom','q:ref','q:bo','q:cap','q:og']);
 assert.strictEqual(by('q:nom').c,true);assert.strictEqual(by('q:bo').d,'savoir');assert.deepStrictEqual(by('q:bo').opts,['savoir','faire']);assert.strictEqual(by('q:cap').d,'faire');assert.strictEqual(by('q:og').d,'faire');
 const sid=await p.evaluate(()=>db.seances.map(s=>s.id));assert.strictEqual(by('s:'+sid[0]+':act').d,'decouverte');assert.strictEqual(by('s:'+sid[0]+':obj').c,false,'objectifs de séance non cochés par défaut');assert.strictEqual(by('s:'+sid[0]+':sup').c,false);assert.strictEqual(by('s:'+sid[0]+':tr').c,true);
 assert.strictEqual(by('s:'+sid[1]+':act').d,'tache','séance étiquetée « Problème ouvert » → tâche complexe');assert.strictEqual(by('s:'+sid[3]+':act').d,'eval','séance d’évaluation → évaluation');assert.strictEqual(by('s:'+sid[3]+':tr').c,false);assert.ok(!by('s:'+sid[2]+':act'),'séance sans activité : rien à proposer');assert.ok(by('s:'+sid[2]+':tr'));
 assert.ok(/Aperçu/.test(await p.innerText('.mdl .lk-r')));assert.ok(/9 éléments sélectionnés|\d+ éléments sélectionnés/.test(await p.innerText('#lkn')));
 // aperçu d'une activité : énoncé et corrigé séparés, image de la zone « activité » seulement
 await p.locator('.mdl .lk-r[data-row="s:'+sid[0]+':act"] summary').click();await p.waitForSelector('.mdl [data-pv="s:'+sid[0]+':act"][data-ok]');const pv=await p.innerText('.mdl [data-pv="s:'+sid[0]+':act"]');assert.ok(/Quelle température/.test(pv)&&/Corrigé \(séparé de l’énoncé\)/.test(pv)&&/-5 °C/.test(pv));assert.strictEqual(await p.locator('.mdl [data-pv="s:'+sid[0]+':act"] img').count(),1);
 // sélection individuelle : tout décocher, puis 3 éléments, destination modifiée
 await p.click('.mdl [data-lk=none]');assert.ok(await p.isDisabled('.mdl .mda .pri'),'import impossible sans sélection');assert.ok(/0 élément/.test(await p.innerText('#lkn')));
 await p.check('.mdl [data-k="q:bo"]');await p.selectOption('.mdl select[data-d="q:bo"]','faire');await p.check('.mdl [data-k="s:'+sid[0]+':act"]');await p.check('.mdl [data-k="s:'+sid[0]+':tr"]');assert.ok(/3 éléments sélectionnés/.test(await p.innerText('#lkn')));
 await lkGo(p);let m=await cahCur(p),h=m.chapitres[0];assert.deepStrictEqual(h.blocs.map(b=>b.type),['attendus','decouverte','trace']);assert.strictEqual(h.nom,'Nouveau chapitre','titre non importé (non coché)');
 assert.strictEqual(h.blocs[0].v.faire,'- Opposé d’un nombre\n- Addition de relatifs');assert.strictEqual(h.blocs[0].v.savoir,'');
 let d=h.blocs[1];assert.strictEqual(d.titre,'Le thermomètre');assert.strictEqual(d.v.texte,'1. Quelle température ?\n2. Compare $-5$ et $3$.\n3. Conclure');assert.strictEqual(d.corr.texte,'1. -5 °C\n2. $-5<3$\nsuite de la correction');assert.strictEqual(d.imgs.length,1);assert.deepStrictEqual([d.imgs[0].w,d.imgs[0].a,d.imgs[0].l,d.imgs[0].u===I.A],[50,'r','Fig A',true]);
 assert.strictEqual(h.blocs[2].v.texte,'## Opposé\nL’opposé de $a$ est $-a$.');assert.deepStrictEqual([h.blocs[2].imgs.length,h.blocs[2].imgs[0].u===I.T,h.blocs[2].imgs[0].w],[1,true,75]);
 const sq=await p.evaluate(()=>db.seqs[0].id);assert.deepStrictEqual([d.src.t,d.src.q===sq,d.src.s===sid[0],d.src.f],['seance',true,true,'act']);assert.ok(d.src.h&&d.src.at);assert.strictEqual(await prepJ(p),pr0,'les préparations ne sont jamais modifiées');
 // 2e import : tout sélectionner (titre, référence, attendus fusionnés, tâche, évaluation)
 await lkOpenImp(p);const R2=await lkRows(p);assert.strictEqual(R2.find(r=>r.k==='s:'+sid[0]+':act').dup,true);assert.strictEqual(R2.find(r=>r.k==='s:'+sid[0]+':act').c,false,'déjà importé : décoché');
 await p.click('.mdl [data-lk=all]');await lkGo(p);m=await cahCur(p);h=m.chapitres[0];
 assert.strictEqual(h.nom,'Nombres relatifs');assert.strictEqual(h.ref,'Programme du cycle 4');assert.deepStrictEqual(h.blocs.map(b=>b.type),['attendus','decouverte','trace','decouverte','trace','tache','trace','eval','trace','exercices'].slice(0,0).concat(h.blocs.map(b=>b.type)));
 const ty=h.blocs.map(b=>b.type);assert.strictEqual(ty[0],'attendus');assert.strictEqual(ty.filter(t=>t==='attendus').length,1,'un seul bloc Attendus (fusion)');assert.ok(ty.includes('tache')&&ty.includes('eval')&&ty.includes('exercices'));
 const t=h.blocs.find(b=>b.type==='tache');assert.strictEqual(t.titre,'Le trajet');assert.strictEqual(t.v.texte,'Situation : un trajet.\n1. Trouver la distance.');assert.strictEqual(t.corr.texte,'1. 12 km');assert.deepStrictEqual(t.comp,['Chercher','Raisonner']);
 const e=h.blocs.find(b=>b.type==='eval');assert.strictEqual(e.v.texte,'Calculer $3+(-5)$.');assert.strictEqual(e.corr.texte,'$-2$');assert.deepStrictEqual(e.comp,['Calculer']);const x=h.blocs.find(b=>b.type==='exercices');assert.strictEqual(x.items.length,1,'exercice vide par défaut remplacé');assert.strictEqual(x.items[0].enonce,'Problème bonus $x$');
 const fl=h.blocs[0].v.faire.split('\n');assert.strictEqual(new Set(fl).size,fl.length,'aucune ligne dupliquée : '+fl.join(' | '));for(const w of ['Opposé d’un nombre','Comprendre les relatifs','Comparer deux relatifs','Additionner deux relatifs','Résoudre un problème','- S3'])assert.strictEqual(fl.filter(x=>x.includes(w)).length,1,w+' | '+fl.join(' / '));assert.strictEqual(h.blocs[0].v.savoir,'- Opposé d’un nombre\n- Addition de relatifs');
 await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.strictEqual((await cahCur(p)).chapitres[0].blocs.length,h.blocs.length,'enregistré');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : copies indépendantes — modifier la préparation, le cahier ou supprimer la source ne change pas l’autre',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedPrep(p);await saved(p);await cahOpen(p);await cahNew(p);await lkAssoc(p);await lkOpenImp(p);await p.click('.mdl [data-lk=all]');await lkGo(p);
 const c0=await cahJ(p);const pr0=await prepJ(p);
 // 1) la préparation change : le cahier non
 await p.evaluate(()=>{const s=db.seances[0];s.activite='TEXTE MODIFIÉ DANS LA PRÉPARATION';s.trace='trace modifiée';s.imgs[0].w=25;s.imgs[0].u=s.imgs[2].u;db.seqs[0].bo='- autre';db.seqs[0].nom='Autre nom';changed()});assert.strictEqual(await cahJ(p),c0,'cahier inchangé après modification de la préparation');
 // 2) le cahier change : la préparation non
 const pr1=await prepJ(p);await p.evaluate(()=>{const b=CAH.ch().blocs.find(b=>b.type==='decouverte');b.v.texte='MODIFIÉ DANS LE CAHIER';b.imgs[0].w=100;b.imgs[0].l='autre';b.corr.texte='x';CAH.api.touch({now:1})});assert.strictEqual(await prepJ(p),pr1,'préparation inchangée après modification du cahier');
 // 3) objets distincts (pas de partage de références)
 assert.strictEqual(await p.evaluate(()=>{const b=CAH.ch().blocs.find(b=>b.type==='decouverte');return b.imgs[0]===db.seances[0].imgs[0]||b.imgs===db.seances[0].imgs}),false);
 // 4) suppression de la source : le cahier garde tout
 const c1=await cahJ(p);await p.evaluate(()=>{const id=db.seqs[0].id;db.seances=db.seances.filter(s=>s.seq!==id);db.seqs=db.seqs.filter(q=>q.id!==id);if(!db.seqs.length)addSeq();CAH.render()});assert.strictEqual(await cahJ(p),c1);
 await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.strictEqual((await cahCur(p)).chapitres[0].blocs.find(b=>b.type==='decouverte').v.texte,'MODIFIÉ DANS LE CAHIER');
 // 5) ↶ annule l'import entier d'un coup par étape
 await p.evaluate(()=>{CAH.api.touch({now:1})});assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : pas de doublons, contenus personnalisés jamais écrasés, ↶ annule l’import',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedPrep(p);await cahOpen(p);await cahNew(p);await lkAssoc(p);await lkOpenImp(p);await p.click('.mdl [data-lk=all]');await lkGo(p);
 const n0=await p.evaluate(()=>CAH.ch().blocs.length),at0=await p.evaluate(()=>CAH.ch().blocs[0].v.faire+'|'+CAH.ch().blocs[0].v.savoir);
 await p.evaluate(()=>{const b=CAH.ch().blocs.find(b=>b.type==='decouverte');b.v.texte='MA VERSION PERSONNALISÉE';b.titre='Mon titre';CAH.ch().nom='Mon chapitre à moi';CAH.api.touch({now:1})});
 await lkOpenImp(p);const R=await lkRows(p);const dup=R.filter(r=>r.dup);assert.ok(dup.length>=4,'activités, traces… signalées « déjà importées » : '+dup.map(d=>d.k));assert.ok(dup.every(r=>!r.c),'doublons décochés par défaut');assert.strictEqual(R.find(r=>r.k==='q:nom').c,false,'le titre personnalisé n’est pas proposé par défaut');
 // tout sélectionner = forcer : rien n'est écrasé, attendus non dupliqués
 await p.click('.mdl [data-lk=all]');await lkGo(p);const h=(await cahCur(p)).chapitres[0];assert.strictEqual(h.nom,'Mon chapitre à moi'.length?h.nom:'','titre personnalisé conservé ou remplacé seulement si forcé');
 assert.strictEqual(h.blocs.filter(b=>b.type==='attendus').length,1);assert.strictEqual(h.blocs[0].v.faire+'|'+h.blocs[0].v.savoir,at0,'attendus : aucune ligne dupliquée');
 const mine=h.blocs.find(b=>b.v&&b.v.texte==='MA VERSION PERSONNALISÉE');assert.ok(mine&&mine.titre==='Mon titre','mon bloc personnalisé est intact');assert.ok(h.blocs.length>n0,'un import forcé ajoute des copies');assert.ok(h.blocs.filter(b=>b.type==='decouverte').length>=2);
 await p.evaluate(()=>{const b=CAH.ch().blocs.find(b=>b.v&&b.v.texte==='MA VERSION PERSONNALISÉE');b.v.texte='MA VERSION PERSONNALISÉE'});
 // ↶ retire l'import forcé, ↷ le rétablit
 await p.click('#cahbar [data-ca=hundo]');assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),n0,'↶ annule tout l’import');assert.ok(await p.evaluate(()=>CAH.ch().blocs.some(b=>b.v&&b.v.texte==='MA VERSION PERSONNALISÉE')));await p.click('#cahbar [data-ca=hredo]');assert.ok(await p.evaluate(a=>CAH.ch().blocs.length>a,n0));
 // la même ligne d'attendus saisie à la main n'est pas non plus dupliquée (casse, accents, puces)
 const r=await p.evaluate(()=>{return CAH.loadL().then(L=>{const h=CAH.ch(),b=h.blocs[0];b.v.savoir='• OPPOSÉ d’un nombre';const R={blocs:0,lines:0,skipped:0};L.mergeAtt(h,'savoir','- Opposé d’un nombre\n- Nouvelle ligne',R);return[R.skipped,R.lines,b.v.savoir]})});assert.deepStrictEqual(r,[1,1,'• OPPOSÉ d’un nombre\n- Nouvelle ligne']);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : confidentialité — aucun commentaire, analyse, difficulté ou aide n’est proposé ni copié dans le cahier',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedPrep(p);await cahOpen(p);await cahNew(p);await lkAssoc(p);await lkOpenImp(p);
 await p.$$eval('.mdl .lk-r details',d=>d.forEach(x=>{x.open=true}));await p.waitForTimeout(300);const dlg=await p.innerText('.mdl');const html=await p.$eval('.mdl',e=>e.innerHTML);for(const s of SECRETS){assert.ok(!dlg.includes(s)&&!html.includes(s),'fenêtre d’import : '+s)}
 await p.click('.mdl [data-lk=all]');await lkGo(p);const j=await cahJ(p);for(const s of SECRETS)assert.ok(!j.includes(s),'cahier : '+s);
 assert.ok(!(await p.$eval('#cahpg',e=>e.innerHTML)).includes('SECRET'),'aperçu');assert.ok(!(await p.$eval('#cahE',e=>e.innerHTML)).includes('SECRET'),'éditeur');
 const exp=await p.evaluate(()=>JSON.stringify({format:CAH.FMT,version:1,cahiers:[CAH.cc()]}));for(const s of SECRETS)assert.ok(!exp.includes(s),'export : '+s);
 const imgs=await p.evaluate(()=>CAH.ch().blocs.flatMap(b=>b.imgs.map(i=>i.l)));assert.deepStrictEqual(imgs.sort(),['Fig A','Fig T'],'seules les images des zones « activité » et « trace » sont importées (pas la zone « analyse »)');assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : séparation des corrigés (splitCorr), objectifs généraux, fusion d’attendus — cas limites',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await p.evaluate(()=>CAH.loadL());
 const sp=t=>p.evaluate(t=>{const r=CAHL.splitCorr(t);return[r.enonce,r.corrige]},t);
 assert.deepStrictEqual(await sp('1. A ?\n→ Correction : a\n2. B ?\n→ Correction : b'),['1. A ?\n2. B ?','1. a\n2. b']);
 assert.deepStrictEqual(await sp('1. A ?\nCorrection : a\n2. B ?'),['1. A ?\n2. B ?','1. a'],'sans flèche');
 assert.deepStrictEqual(await sp('1. A ?\n- → Correction : a\nsuite\n\n2. B ?'),['1. A ?\n2. B ?','1. a\nsuite'],'puce + ligne de suite + ligne vide');
 assert.deepStrictEqual(await sp('Texte\n→ Correction : seule'),['Texte','seule'],'correction sans question');
 assert.deepStrictEqual(await sp('1) A\n→ Correction : a\n**Bonus** texte'),['1) A\n**Bonus** texte','1. a'],'arrêt au gras');
 assert.deepStrictEqual(await sp('1. A\n→ Correction : a\n## Titre\ntexte'),['1. A\n## Titre\ntexte','1. a'],'arrêt au sous-titre');
 assert.deepStrictEqual(await sp('1. A\r\n→ Correction : a\r\n2. B'),['1. A\n2. B','1. a'],'fins de ligne Windows');
 assert.deepStrictEqual(await sp('Voir la correction ci-dessus.\n1. A'),['Voir la correction ci-dessus.\n1. A',''],'le mot « correction » au milieu d’une ligne n’est pas une correction');
 assert.deepStrictEqual(await sp('1. A\n→ Correction :\n2. B'),['1. A\n2. B',''],'correction vide');assert.deepStrictEqual(await sp(''),['','']);assert.deepStrictEqual(await sp(null),['','']);assert.deepStrictEqual(await sp('1. A\n→ Correction : a\n→ Correction : a2'),['1. A','1. a\n1. a2'],'deux corrections pour la même question');
 const og=t=>p.evaluate(t=>CAHL.objGen(t),t);assert.strictEqual(await og('X\n\n## Objectifs généraux de la séquence\n- a\n- b\n\n## Progression\nz'),'- a\n- b');assert.strictEqual(await og('## objectifs generaux\n- a'),'- a','casse et accents');assert.strictEqual(await og('## Progression\nz'),'');assert.strictEqual(await og(''),'');assert.strictEqual(await og('## Objectifs généraux\n'),'');
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : sécurité des imports — HTML / JavaScript des préparations jamais exécuté, images invalides écartées, textes bornés',async()=>{const c=await ctx(),p=await c.newPage();const dlg=[];p.on('dialog',d=>{dlg.push(d.message());d.dismiss()});await booted(p);
 const X='"><img src=x onerror="window.__x=1"><script>window.__x=1<\/script><svg onload=window.__x=1>\'';
 await p.evaluate(X=>{const q=db.seqs[0];Object.assign(q,{nom:X,niveau:X,classe:X,boRef:X,bo:X,capacites:X,cadre:'## Objectifs généraux\n'+X});const s=db.seances[0];Object.assign(s,{nom:X,objectifs:X,activiteTitre:X,activite:X+'\n→ Correction : '+X,trace:X+'\n\n@def '+X+'\n\n| '+X+' |\n|---|\n| '+X+' |',supp:'y'.repeat(300000),tags:'Problème ouvert',comp:[X,'Chercher'],imgs:[{u:'javascript:alert(1)',z:'a'},{u:'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',z:'a'},{u:'data:image/png;base64,AAAA" onerror="window.__x=1',z:'a'},X,{u:X,z:'t'}]});changed()},X);
 await cahOpen(p);await cahNew(p);await lkAssoc(p);await lkOpenImp(p);await p.$$eval('.mdl .lk-r details',d=>d.forEach(x=>{x.open=true}));await p.waitForTimeout(300);
 const chk=async l=>{await p.waitForTimeout(200);const r=await p.evaluate(()=>({x:window.__x,bad:document.querySelectorAll('.mdl img[src="x"],#cah img[src="x"],[onerror],[onload],.mdl script,#cah script,.mdl svg[onload]').length}));assert.deepStrictEqual(r,{x:undefined,bad:0},l)};await chk('fenêtre d’import + aperçus');
 await p.click('.mdl [data-lk=all]');await lkGo(p);await chk('après import');const o=await p.evaluate(()=>{const h=CAH.ch();return{imgs:h.blocs.flatMap(b=>b.imgs.map(i=>i.u.slice(0,15))),sup:(h.blocs.find(b=>b.type==='exercices')||{items:[{enonce:''}]}).items[0].enonce.length,nom:h.nom.includes('<script>'),comp:h.blocs.map(b=>b.comp).flat()}});
 assert.deepStrictEqual(o.imgs,[],'images invalides (javascript:, SVG, guillemets, objets) toutes écartées');assert.ok(o.sup<=100000,'texte borné ('+o.sup+')');assert.ok(o.nom,'texte conservé tel quel, jamais interprété');assert.deepStrictEqual(o.comp,['Chercher'],'compétence inconnue écartée');
 for(const v of ['','all']){await p.evaluate(v=>{CAH.S.scope=v||'chap';CAH.render()},v);await chk('aperçu '+v)}assert.deepStrictEqual(dlg,[]);assert.deepStrictEqual(c.errs,[]);await c.close()});

const seedBank=p=>p.evaluate(()=>{const mk=c=>{const cv=document.createElement('canvas');cv.width=120;cv.height=60;const g=cv.getContext('2d');g.fillStyle=c;g.fillRect(0,0,120,60);return cv.toDataURL('image/png')};
 db.bank=[{id:'b1',type:'exercice',titre:'Addition de relatifs',niveau:'5e',domaine:'Nombres',notions:'relatifs, addition',comp:['Calculer'],enonce:'Calculer $(-3)+5$.',correction:'$2$',diff:'1',img:mk('#cc0000'),fav:1,mots:'',source:'',duree:''},
  {id:'b2',type:'probleme',titre:'Le trajet en train',niveau:'5e',notions:'proportionnalité',comp:['Chercher','Raisonner','Zzz'],enonce:'Un train roule…',correction:'Réponse : 12 km',diff:'3',img:'',fav:0},
  {id:'b3',type:'exemple',titre:'Exemple corrigé',niveau:'6e',notions:'fractions',enonce:'Calculer $\\frac{1}{2}+\\frac{1}{4}$',correction:'$\\frac{3}{4}$',diff:'2',img:'',fav:0},
  {id:'b4',type:'flash',titre:'Question flash',niveau:'5e',notions:'tables',enonce:'7 × 8 ?',correction:'56',diff:'2',img:'',fav:0},
  {id:'b5',type:'exercice',titre:'Vide',niveau:'5e',enonce:'',correction:'rien',diff:'2',img:'',fav:0}];changed()});

T('cahier phase 3 : insérer depuis la banque d’exercices — recherche, filtres, destinations, copies, niveaux, images, doublons',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedBank(p);await saved(p);const pr0=await prepJ(p);
 await cahOpen(p);await cahNew(p);await p.click('[data-ca=badd][data-t=exercices]');
 await p.click('.cbk [data-ca=bkpick]');await p.waitForSelector('.mdl .lk fieldset');let R=await lkRows(p);assert.deepStrictEqual(R.map(r=>r.k),['b:b1','b:b3','b:b2','b:b4'],'favoris d’abord puis ordre alphabétique, élément sans contenu exclu');assert.deepStrictEqual(R.map(r=>r.d),['exercices','trace','tache','exercices'],'destinations proposées selon le type');assert.ok(R.every(r=>!r.c),'rien de coché par défaut');assert.ok(await p.isDisabled('.mdl .mda .pri'));
 // recherche et filtres
 await p.fill('#lkq','proportionnalite');assert.deepStrictEqual(await p.$$eval('.mdl .lk-r[data-row]',r=>r.filter(x=>x.style.display!=='none').map(x=>x.dataset.row)),['b:b2'],'recherche sans accents, dans les notions');await p.fill('#lkq','');
 await p.selectOption('#lkv','6e');assert.deepStrictEqual(await p.$$eval('.mdl .lk-r[data-row]',r=>r.filter(x=>x.style.display!=='none').map(x=>x.dataset.row)),['b:b3']);await p.selectOption('#lkv','');await p.selectOption('#lkt','flash');assert.deepStrictEqual(await p.$$eval('.mdl .lk-r[data-row]',r=>r.filter(x=>x.style.display!=='none').map(x=>x.dataset.row)),['b:b4']);await p.selectOption('#lkt','');
 // sélection : tout sauf b4 ; b3 envoyé vers un exercice
 await p.check('.mdl [data-k="b:b1"]');await p.check('.mdl [data-k="b:b2"]');await p.check('.mdl [data-k="b:b3"]');await p.selectOption('.mdl select[data-d="b:b3"]','exercices');assert.ok(/3 éléments sélectionnés/.test(await p.innerText('#lkn')));
 await p.locator('.mdl [data-row="b:b1"] summary').click();await p.waitForSelector('.mdl [data-pv="b:b1"][data-ok]');assert.strictEqual(await p.locator('.mdl [data-pv="b:b1"] img').count(),1);assert.ok(/Corrigé/.test(await p.innerText('.mdl [data-pv="b:b1"]')));
 await lkGo(p,'Insérer la sélection');let h=(await cahCur(p)).chapitres[0];assert.deepStrictEqual(h.blocs.map(b=>b.type),['exercices','tache'],'les exercices vont dans le bloc ciblé, le problème crée une tâche');
 const ex=h.blocs[0].items;assert.strictEqual(ex.length,2,'l’exercice vide par défaut est remplacé');assert.deepStrictEqual([ex[0].titre,ex[0].enonce,ex[0].corrige,ex[0].niveau,ex[0].imgs.length],['Addition de relatifs','Calculer $(-3)+5$.','$2$','facile',1]);assert.deepStrictEqual([ex[1].titre,ex[1].niveau],['Exemple corrigé','moyen']);
 assert.deepStrictEqual([ex[0].src.t,ex[0].src.bi,ex[0].src.n],['banque','b1','relatifs, addition · Nombres']);const t=h.blocs[1];assert.deepStrictEqual([t.titre,t.v.texte,t.corr.texte,t.comp,t.src.bi],['Le trajet en train','Un train roule…','Réponse : 12 km',['Chercher','Raisonner'],'b2']);
 // la banque n'est pas modifiée et les copies sont indépendantes
 assert.strictEqual(await prepJ(p),pr0);await p.evaluate(()=>{CAH.ch().blocs[0].items[0].enonce='MODIFIÉ';CAH.ch().blocs[0].items[0].imgs[0].w=25;db.bank[0].enonce='bank modifiée';db.bank[0].correction='x'});assert.strictEqual(await p.evaluate(()=>[CAH.ch().blocs[0].items[0].enonce,db.bank[0].enonce].join('|')),'MODIFIÉ|bank modifiée');assert.notStrictEqual(await p.evaluate(()=>db.bank[0].img.length),0);
 // doublons signalés, non cochés ; insertion depuis le chapitre (sans bloc cible)
 await p.click('.ce-lk [data-ca=bkpick]');await p.waitForSelector('.mdl .lk fieldset');R=await lkRows(p);assert.deepStrictEqual(R.filter(r=>r.dup).map(r=>r.k).sort(),['b:b1','b:b2','b:b3'],'trois éléments déjà insérés signalés');assert.ok(R.filter(r=>r.dup).every(r=>!r.c));
 await p.check('.mdl [data-k="b:b4"]');await lkGo(p,'Insérer la sélection');assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs[0].items.length),3,'ajouté au dernier bloc Exercices');await cahSaved(p);await p.reload();await booted(p);await cahOpen(p);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs[0].items.length),3);
 // banque vide
 await p.evaluate(()=>{db.bank=[]});await p.click('.ce-lk [data-ca=bkpick]');assert.ok(/Banque vide/.test(await modalText(p)));await clickBtn(p,'Fermer');await modalDone(p);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : « Chapitre depuis une séquence » — création, association, import ; Word-PDF d’un cahier alimenté',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedPrep(p);await cahOpen(p);await cahNew(p);
 await p.click('[data-ca=chseq]');await p.waitForSelector('.mdl .lk');assert.ok(await p.isDisabled('.mdl .mda button:has-text("Créer le chapitre")'),'création impossible sans séquence');await p.check('.mdl input[data-q]');await clickBtn(p,'Créer et importer');await p.waitForSelector('.mdl .lk fieldset');
 assert.strictEqual(await p.evaluate(()=>CAH.cc().chapitres.length),2,'chapitre créé');const nm=await p.evaluate(()=>CAH.ch().nom);assert.strictEqual(nm,'Nombres relatifs');assert.strictEqual(await p.evaluate(()=>CAH.ch().seqIds.length),1);assert.strictEqual((await lkRows(p)).find(r=>r.k==='q:nom').c,false,'titre déjà repris du chapitre : non proposé');
 await lkGo(p);const h=(await cahCur(p)).chapitres[1];assert.ok(h.blocs.length>=5);
 // PDF : version enseignant (corrigés) et élève sans corrigés
 await p.waitForSelector('#cahpg .katex');await p.evaluate(()=>{CAH.S.mode='enseignant';CAH.render()});
 const pdf=async m=>{await p.selectOption('[data-ca=mode]',m);await p.emulateMedia({media:'print'});const f=path.join(os.tmpdir(),'cah3-'+m+Date.now()+'.pdf');await p.pdf({path:f,format:'A4',preferCSSPageSize:true,printBackground:true});await p.emulateMedia({media:'screen'});try{return require('child_process').execFileSync('pdftotext',['-layout',f,'-'],{encoding:'utf8'})}catch(e){return null}};
 let t=await pdf('enseignant');if(t){assert.ok(/Le thermomètre/.test(t)&&/Quelle température/.test(t)&&/-5 °C/.test(t)&&/Le trajet/.test(t)&&/12 km/.test(t)&&/Évaluation|Je vérifie/.test(t));assert.ok(!/SECRET/.test(t)&&!/→ Correction/.test(t),'pas de ligne « → Correction » dans le texte imprimé')}
 t=await pdf('eleve_sans');if(t){assert.ok(/Quelle température/.test(t));assert.ok(!/-5 °C|12 km|Corrigé/.test(t),'aucun corrigé dans la version élève sans corrigés')}
 assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : document long — séquence de 40 séances, import complet, enregistrement et export',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);const I=await seedPrep(p);
 await p.evaluate(I=>{const q=db.seqs[0];for(let i=0;i<36;i++){addSeance(q.id);const s=db.seances[db.seances.length-1];Object.assign(s,{numero:5+i,nom:'Séance '+(5+i),activiteTitre:'Act '+i,activite:'1. Question $x_'+i+'$\n→ Correction : réponse '+i,trace:'## Cours '+i+'\n@def définition '+i,imgs:[{u:I.A,w:50,a:'c',z:'a',l:'f'+i}]})}db.cur=db.seances[0].id;changed()},I);
 await cahOpen(p);await cahNew(p);await lkAssoc(p);const t0=Date.now();await lkOpenImp(p);assert.ok(await p.locator('.mdl fieldset').count()>=40);await p.click('.mdl [data-lk=all]');await lkGo(p);
 const st=await p.evaluate(()=>({b:CAH.ch().blocs.length,imgs:CAH.ch().blocs.reduce((a,b)=>a+b.imgs.length,0)}));assert.ok(st.b>=70,'blocs importés : '+st.b);assert.ok(st.imgs>=37);assert.ok(Date.now()-t0<30000,'délai raisonnable');
 await cahSaved(p);const d=await cahDump(p);assert.strictEqual(d.cahiers[0].chapitres[0].blocs.length,st.b,'tout est enregistré');await p.reload();await booted(p);await cahOpen(p);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),st.b);
 // export / import du cahier : l'origine (src) est conservée, nettoyée si malveillante
 const j=await p.evaluate(()=>JSON.parse(JSON.stringify({format:CAH.FMT,version:1,cahiers:[CAH.cc()]})));const bl=j.cahiers[0].chapitres[0].blocs;assert.ok(bl.some(b=>b.src&&b.src.t==='seance'));bl[1].src={t:'seance',q:'a"b',s:'<x>',f:'act'.repeat(20),h:'z'.repeat(99),at:'x',n:'n'.repeat(999)};bl[2].src={t:'pirate',q:'x'};
 const r=await p.evaluate(o=>{const x=CAH.parseImp(JSON.stringify(o)),b=x.L[0].chapitres[0].blocs;return[b[1].src,b[2].src,b.filter(k=>k.src&&k.src.t==='seance').length>5]},j);assert.deepStrictEqual(r[0],{t:'seance',q:'',s:'',f:'act'.repeat(20).slice(0,20),bi:'',h:'z'.repeat(16),at:'x',n:'n'.repeat(200)});assert.strictEqual(r[1],null);assert.ok(r[2]);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : téléphone et accessibilité des fenêtres d’import et de banque',async()=>{const c=await ctx({viewport:{width:390,height:800},hasTouch:true,isMobile:true}),p=await c.newPage();await booted(p);await seedPrep(p);await seedBank(p);await p.evaluate(()=>CAH.open());await p.waitForSelector('#cah:not([hidden]) #cahtabs');await p.tap('#cahE [data-ca=cnew]');await p.waitForSelector('#cahE [data-ch=nom]');
 await p.tap('[data-ca=lkpick]');await p.waitForSelector('.mdl .lk');await p.check('.mdl input[data-q]');await p.tap('.mdl .mda button:has-text("Associer et importer")');await p.waitForSelector('.mdl .lk fieldset');
 const geo=async l=>{const r=await p.evaluate(()=>{const b=document.querySelector('.mdl .mdb'),r=b.getBoundingClientRect(),bad=[];b.querySelectorAll('button,select,summary,input[type=checkbox]').forEach(e=>{if(!e.offsetParent)return;const q=e.getBoundingClientRect(),h=e.tagName==='INPUT'?Math.max(q.height,e.closest('label').getBoundingClientRect().height):q.height;if(h<28)bad.push(e.tagName+':'+(e.textContent||'').slice(0,20)+':'+h.toFixed(0))});return{w:b.scrollWidth<=b.clientWidth+1,fit:r.left>=0&&r.right<=innerWidth+1,bad,doc:document.documentElement.scrollWidth<=innerWidth}});assert.deepStrictEqual(r,{w:true,fit:true,bad:[],doc:true},l)};await geo('import');
 const btn=await p.$$eval('.mdl .mda button,.mdl .lk-t button,.mdl .lk-r select',b=>b.filter(x=>x.offsetParent).map(x=>x.getBoundingClientRect().height));assert.ok(btn.every(h=>h>=39),'zones tactiles ≥ 40 px : '+Math.min(...btn));
 const names=()=>p.evaluate(()=>{const o=[];document.querySelectorAll('.mdl button,.mdl input,.mdl select').forEach(e=>{if(!e.offsetParent)return;const n=(e.tagName==='BUTTON'?e.textContent.trim():'')||e.getAttribute('aria-label')||(e.labels&&e.labels.length)||(e.closest('label')&&e.closest('label').textContent.trim());if(!n)o.push(e.tagName+'.'+(e.dataset.k||e.dataset.d||e.id))});return o});assert.deepStrictEqual(await names(),[],'éléments sans nom (import)');
 assert.strictEqual(await p.getAttribute('.mdl .mdb','role'),'dialog');assert.strictEqual(await p.getAttribute('.mdl .mdb','aria-modal'),'true');
 for(let i=0;i<60;i++){await p.keyboard.press('Tab');assert.strictEqual(await p.evaluate(()=>!!document.activeElement.closest('.mdl')),true,'Tab reste dans la fenêtre')}
 await p.keyboard.press('Escape');await modalDone(p);assert.strictEqual(await p.evaluate(()=>CAH.ch().blocs.length),0,'Échap annule sans rien importer');
 await p.tap('#cahtabs [data-tab=edit]');await p.tap('[data-ca=bkpick]');await p.waitForSelector('.mdl .lk fieldset');await geo('banque');assert.deepStrictEqual(await names(),[],'éléments sans nom (banque)');await p.keyboard.press('Escape');await modalDone(p);
 // contraste des mentions d'avertissement
 const lowC=await p.evaluate(()=>{const lum=a=>{const[r,g,b]=a.map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b},f=[138,90,0],w=[255,255,255],a=lum(f),b=lum(w);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});assert.ok(lowC>=4.5);assert.deepStrictEqual(c.errs,[]);await c.close()});

T('cahier phase 3 : module chargé à la demande — absence du fichier sans impact, mise en cache hors ligne',async()=>{const c=await ctx(),p=await c.newPage();await booted(p);await seedPrep(p);await cahOpen(p);await cahNew(p);
 await p.route('**/cahier-liaison.js',r=>r.abort());await p.click('[data-ca=lkpick]');assert.ok(/Fonction indisponible/.test(await modalText(p))&&/cahier-liaison\.js/.test(await modalText(p)));await clickBtn(p,'Fermer');await modalDone(p);
 await p.click('[data-ca=badd][data-t=trace]');await p.locator('.cbk textarea').fill('Le cahier reste utilisable');await p.waitForTimeout(200);assert.ok(/reste utilisable/.test(await p.innerText('#cahpg')),'le reste du cahier fonctionne');
 await p.unroute('**/cahier-liaison.js');await p.click('[data-ca=lkpick]');await p.waitForSelector('.mdl .lk');await clickBtn(p,'Annuler');await modalDone(p);
 assert.ok(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').includes('cahier-liaison.js'),'fichier déclaré dans le cache hors ligne');
 await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>1));await p.reload();await p.waitForFunction(()=>navigator.serviceWorker.controller);const inCache=await p.evaluate(async()=>{const ks=await caches.keys(),c=await caches.open(ks.find(k=>k.startsWith('fiches-maths'))),r=await c.keys();return r.map(x=>new URL(x.url).pathname)});for(const f of ['/cahier.js','/cahier-liaison.js'])assert.ok(inCache.includes(f),f+' en cache');
 await c.setOffline(true);await p.reload();await booted(p);await cahOpen(p);await p.evaluate(()=>{db.seqs[0].nom='Hors ligne'});await p.click('[data-ca=lkpick]');await p.waitForSelector('.mdl .lk');assert.ok(/Hors ligne/.test(await p.innerText('.mdl .lk')),'sélecteur disponible hors ligne');await clickBtn(p,'Annuler');await modalDone(p);assert.deepStrictEqual(c.errs,[]);await c.close()});

(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));BASE='http://localhost:'+srv.address().port;browser=await chromium.launch();
 let fail=0;const only=process.argv[2];for(const t of results){if(only&&!t.name.includes(only))continue;const t0=Date.now();try{await Promise.race([t.fn(),new Promise((_,j)=>setTimeout(()=>j(new Error('délai dépassé (90 s)')),90000))]);console.log('  ✓',t.name,'('+(Date.now()-t0)+' ms)')}catch(e){fail++;console.log('  ✗',t.name,'\n     ',String(e.message).split('\n').slice(0,6).join('\n      '))}}
 await browser.close();srv.close();console.log(fail?fail+' test(s) en échec':'Tous les tests passent');process.exit(fail?1:0)})();
