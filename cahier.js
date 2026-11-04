/* ===================== 📚 Cahier de l'élève — phase 1 : fondations =====================
   Module indépendant de l'éditeur de préparation : base IndexedDB dédiée « cdm3cahiers » (aucune modification
   de « cdm3db »), modèle de données propre, aucune liaison automatique avec les séquences / séances.
   Réutilise de index.html : uid, esc, fmt, rmath, modal, info, toast, rq, tdone, errMsg, norm, COMP, IMGOK, APP_V, dl. */
(()=>{'use strict';
const SCH=1,DBN='cdm3cahiers',FMT='createdocmath-cahier-backup',LIM={chap:200,bloc:200,item:100,text:1e5,img:30,cah:100,bytes:5e7};
const COL={attendus:'#1f5fa8',decouverte:'#b85c00',trace:'#2e8540',exercices:'#7b3fa0',tache:'#c0392b',eval:'#2c3e50',revision:'#00796b'};
const T={
 attendus:{n:'Attendus du chapitre',ico:'🎯',f:[['savoir','Je dois savoir','Définitions, propriétés, règles et formules à connaître…',6],['faire','Je dois savoir faire','Compétences et méthodes à maîtriser…',6]]},
 decouverte:{n:'Activité de découverte',ico:'🔍',f:[['consigne','Consigne','',2],['texte','Énoncé et questions','1. …\n2. …',8]],corr:1},
 trace:{n:'Trace écrite – Je retiens',ico:'📝',f:[['texte','Cours','## Définition\n**Propriété :** … $x^2$',12]]},
 exercices:{n:'Exercices d’application',ico:'✏️',f:[['consigne','Consigne générale (facultatif)','',2]],items:1},
 tache:{n:'Je mobilise mes connaissances',ico:'🧩',f:[['texte','Situation-problème et contexte','',6],['consigne','Consigne globale','',2],['questions','Questions intermédiaires (facultatif)','1. …\n2. …',4],['demarche','Démarche de résolution','',4]],corr:1,comp:1},
 eval:{n:'Je vérifie mes connaissances',ico:'✅',f:[['conn','Connaissances mobilisées','',3],['texte','Exercices','',8],['bareme','Barème (facultatif)','',2]],corr:1,comp:1},
 revision:{n:'Fiche de révision',ico:'🔁',f:[['savoir','Points clés à retenir','',6],['methodes','Méthodes à maîtriser','',4],['conseil','Exercices conseillés pour s’entraîner','',3]]}};
const NIVX=['','facile','moyen','difficile'],NOW=()=>new Date().toISOString();
const S={loaded:false,open:false,list:[],cur:null,chap:null,scope:'chap',mode:'enseignant',tab:'edit',err:null,dirty:new Set(),del:new Set(),ordDirty:false,t:null,sch:Promise.resolve(),db:null,hist:[],hp:-1,trash:[],drag:null,rep:[],opener:null,ver:0};
const $c=id=>document.getElementById(id);
const isO=v=>v&&typeof v==='object'&&!Array.isArray(v);
const txt=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').slice(0,n||LIM.text):(typeof v==='number'&&isFinite(v)?String(v):'');
const hex=v=>/^#[0-9a-fA-F]{6}$/.test(v||'')?v.toLowerCase():'';
const IDV=v=>typeof v==='string'&&/^[\w-]{1,64}$/.test(v);
const clone=o=>JSON.parse(JSON.stringify(o));
/* ---------- modèle ---------- */
const mkCorr=()=>({texte:'',defaut:'masque',en_ligne:false,pdf:false,word:false});
const mkEx=n=>({id:uid(),num:'',titre:'',niveau:'',enonce:'',corrige:'',imgs:[]});
const mkBloc=t=>({id:uid(),type:t,titre:'',couleur:'',v:{},corr:mkCorr(),comp:[],items:t==='exercices'?[mkEx()]:[],imgs:[],saut:false});
const mkChap=n=>({id:uid(),nom:n==null?'Nouveau chapitre':n,ref:'',seqIds:[],blocs:[]});
const mkCah=n=>({id:uid(),v:SCH,nom:n||'Cahier de mathématiques',niveau:'',classe:'',annee:'',couleurs:{...COL},chapitres:[],creeLe:NOW(),modifLe:NOW(),pub:{statut:'brouillon',version:0}});
/* normalisation / migration : tolère les données anciennes ou douteuses, ne jette jamais un chapitre sans le signaler */
const normImgs=(a,nid)=>(Array.isArray(a)?a:[]).filter(m=>isO(m)&&typeof m.u==='string'&&m.u&&IMGOK(m.u)).slice(0,LIM.img).map(m=>({id:nid(m.id),u:m.u,w:[25,50,75,100].includes(+m.w)?+m.w:Math.max(5,Math.min(100,Math.round(+m.w)||100)),a:m.a==='r'?'r':'c',l:txt(m.l,300)}));
function normCah(c,W){W=W||[];if(!isO(c)){W.push('cahier illisible');return null}
 const o=mkCah(txt(c.nom,200).trim()||'Cahier sans titre'),ids=new Set([o.id]),nid=v=>{if(IDV(v)&&!ids.has(v)){ids.add(v);return v}const n=uid();ids.add(n);return n};
 o.id=IDV(c.id)?c.id:o.id;ids.add(o.id);o.niveau=txt(c.niveau,40);o.classe=txt(c.classe,40);o.annee=txt(c.annee,20);
 o.creeLe=txt(c.creeLe,40)||o.creeLe;o.modifLe=txt(c.modifLe,40)||o.modifLe;
 if(isO(c.couleurs))Object.keys(COL).forEach(k=>{o.couleurs[k]=hex(c.couleurs[k])||COL[k]});
 if(isO(c.pub))o.pub={statut:['brouillon','publie','depublie'].includes(c.pub.statut)?c.pub.statut:'brouillon',version:Math.max(0,parseInt(c.pub.version,10)||0)};
 const L=Array.isArray(c.chapitres)?c.chapitres:[];if(L.length>LIM.chap){W.push('trop de chapitres : '+LIM.chap+' conservés')}
 L.slice(0,LIM.chap).forEach((ch,i)=>{if(!isO(ch)){W.push('chapitre n°'+(i+1)+' illisible : ignoré');return}
  const h=mkChap(txt(ch.nom,200).trim()||'Chapitre '+(i+1));h.id=nid(ch.id);h.ref=txt(ch.ref,300);h.seqIds=(Array.isArray(ch.seqIds)?ch.seqIds:[]).filter(IDV).slice(0,50);
  const B=Array.isArray(ch.blocs)?ch.blocs:[];if(B.length>LIM.bloc)W.push('chapitre « '+h.nom+' » : '+LIM.bloc+' blocs conservés');
  B.slice(0,LIM.bloc).forEach(b=>{if(!isO(b)||!T[b.type]){W.push('chapitre « '+h.nom+' » : bloc de type inconnu ignoré');return}
   const k=mkBloc(b.type);k.id=nid(b.id);k.titre=txt(b.titre,200);k.couleur=hex(b.couleur);k.saut=!!b.saut;k.v={};
   T[b.type].f.forEach(([key])=>{k.v[key]=isO(b.v)?txt(b.v[key]):''});
   if(isO(b.corr)){k.corr.texte=txt(b.corr.texte);k.corr.defaut=b.corr.defaut==='affiche'?'affiche':'masque';['en_ligne','pdf','word'].forEach(x=>{k.corr[x]=!!b.corr[x]})}
   k.comp=(Array.isArray(b.comp)?b.comp:[]).filter(x=>COMP.includes(x));
   k.items=T[b.type].items?(Array.isArray(b.items)?b.items:[]).filter(isO).slice(0,LIM.item).map(x=>({id:nid(x.id),num:txt(x.num,20),titre:txt(x.titre,200),niveau:NIVX.includes(x.niveau)?x.niveau:'',enonce:txt(x.enonce),corrige:txt(x.corrige),imgs:normImgs(x.imgs,nid)})):[];
   k.imgs=normImgs(b.imgs,nid);
   h.blocs.push(k)});o.chapitres.push(h)});
 return o}
/* nouveaux identifiants pour toute copie (duplication, import) : les références vers les séquences (seqIds) sont conservées */
function reid(o){if(Array.isArray(o)){o.forEach(reid)}else if(isO(o)){if('id' in o)o.id=uid();Object.keys(o).forEach(k=>{if(k!=='seqIds'&&k!=='couleurs'&&k!=='corr')reid(o[k])})}return o}
const cc=()=>S.list.find(x=>x.id===S.cur)||null,ch=()=>{const c=cc();return c&&c.chapitres.find(x=>x.id===S.chap)||null},bk=id=>{const h=ch();return h&&h.blocs.find(x=>x.id===id)};
/* ---------- persistance : base dédiée, écriture + relecture de contrôle ---------- */
const idbo=()=>new Promise((ok,ko)=>{let r;try{r=indexedDB.open(DBN,1)}catch(e){return ko(e)}
 r.onupgradeneeded=()=>{const d=r.result;['cahiers','meta','backups'].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n)})};
 r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();ok(r.result)};r.onerror=()=>ko(r.error);r.onblocked=()=>ko(new Error('ouverture bloquée par un autre onglet'))});
async function load(){S.rep=[];S.db=await idbo();const t=S.db.transaction(['cahiers','meta']),o=t.objectStore('cahiers');
 const[keys,vals,ord]=await Promise.all([rq(o.getAllKeys()),rq(o.getAll()),rq(t.objectStore('meta').get('order'))]);const L=[],back=[];
 keys.forEach((k,i)=>{const v=vals[i],W=[];if(!isO(v)){S.rep.push('enregistrement « '+k+' » illisible : conservé tel quel en base, non affiché');return}
  const old=v.v;const n=normCah(v,W);if(!n)return;n.id=k;if(old!==SCH){back.push([k+'@v'+(old==null?0:old),v]);S.rep.push('« '+n.nom+' » : mis à niveau (schéma '+(old==null?0:old)+' → '+SCH+'), copie de sécurité conservée')}
  W.forEach(w=>S.rep.push('« '+n.nom+' » : '+w));if(old!==SCH||W.length)S.dirty.add(n.id);L.push(n)});
 const rank=new Map((Array.isArray(ord)?ord:[]).map((x,i)=>[x,i]));L.sort((a,b)=>(rank.has(a.id)?rank.get(a.id):1e9)-(rank.has(b.id)?rank.get(b.id):1e9)||(a.creeLe||'').localeCompare(b.creeLe||''));
 if(back.length){const w=S.db.transaction('backups','readwrite');back.forEach(([k,v])=>w.objectStore('backups').put(v,k));await tdone(w)}
 S.list=L;S.loaded=true;const last=await rq(S.db.transaction('meta').objectStore('meta').get('last'));
 S.cur=(L.find(x=>x.id===last)||L[0]||{}).id||null;S.chap=((cc()||{}).chapitres||[])[0]?cc().chapitres[0].id:null;if(S.dirty.size)sched(0)}
function stLine2(m){const e=$c('cahst');if(!e)return;e.innerHTML=m||(S.err?'⚠ Échec de l’enregistrement : '+esc(errMsg(S.err))+' · <u data-ca="retry" role="button" tabindex="0">réessayer</u>':S.dirty.size||S.del.size||S.ordDirty?'… enregistrement':'✓ Enregistré')}
function sched(ms){clearTimeout(S.t);S.t=setTimeout(flush,ms==null?400:ms);stLine2()}
function flush(){clearTimeout(S.t);if(!S.db)return Promise.resolve();S.sch=S.sch.then(write).catch(e=>{S.err=e;stLine2()});return S.sch}
async function write(){if(!S.dirty.size&&!S.del.size&&!S.ordDirty)return;
 const ids=[...S.dirty].filter(id=>S.list.some(c=>c.id===id)),del=[...S.del],ord=S.ordDirty,vals=ids.map(id=>[id,clone(S.list.find(c=>c.id===id))]),ver=S.ver;
 S.dirty.clear();S.del.clear();S.ordDirty=false;
 try{const t=S.db.transaction(['cahiers','meta'],'readwrite'),o=t.objectStore('cahiers'),done=tdone(t);vals.forEach(([id,v])=>o.put(v,id));del.forEach(id=>o.delete(id));
  t.objectStore('meta').put(S.list.map(c=>c.id),'order');t.objectStore('meta').put(S.cur,'last');await done;
  const r=S.db.transaction('cahiers').objectStore('cahiers');for(const[id,v]of vals){const b=await rq(r.get(id));if(JSON.stringify(b)!==JSON.stringify(v))throw new Error('vérification d’intégrité : la relecture de « '+id+' » diffère')}
  S.err=null}
 catch(e){ids.forEach(i=>S.dirty.add(i));del.forEach(i=>S.del.add(i));S.ordDirty=S.ordDirty||ord;S.err=e}
 stLine2();if(S.dirty.size&&!S.err)sched(100)}
function touch(o){const c=cc();if(!c)return;c.modifLe=NOW();S.ver++;S.dirty.add(c.id);if(o&&o.ord)S.ordDirty=true;sched();clearTimeout(touch.p);touch.p=setTimeout(prev,120);clearTimeout(touch.h);touch.h=setTimeout(hsnap,o&&o.now?0:500);if(o&&o.now){clearTimeout(touch.h);hsnap()}}
/* ---------- annuler / rétablir (historique propre au cahier courant) ---------- */
const IMK=new Map(),IMR=[],imgKey=v=>{if(!IMK.has(v)){IMK.set(v,IMR.length);IMR.push(v)}return'\u0001'+IMK.get(v)},ser=c=>JSON.stringify(c,(k,v)=>k==='u'&&typeof v==='string'&&v.length>2000?imgKey(v):v),deser=s=>JSON.parse(s,(k,v)=>typeof v==='string'&&v.charCodeAt(0)===1?IMR[+v.slice(1)]:v);
function hsnap(){const c=cc();if(!c)return;const s=ser(c);if(s===S.hist[S.hp])return;S.hist.splice(S.hp+1);S.hist.push(s);if(S.hist.length>40)S.hist.shift();S.hp=S.hist.length-1;hbtn()}
function hreset(){S.hist=[];S.hp=-1;hsnap()}
function hgo(d){clearTimeout(touch.h);hsnap();const n=S.hp+d;if(n<0||n>=S.hist.length){toast(d<0?'Rien à annuler':'Rien à rétablir');return}S.hp=n;const o=deser(S.hist[n]),i=S.list.findIndex(x=>x.id===o.id);if(i<0)return;S.list[i]=o;S.dirty.add(o.id);if(!ch())S.chap=(o.chapitres[0]||{}).id||null;sched();render();toast(d<0?'↶ Annulé':'↷ Rétabli')}
const hbtn=()=>{const u=$c('cahu'),r=$c('cahr');if(u)u.disabled=S.hp<1;if(r)r.disabled=S.hp>=S.hist.length-1};
/* ---------- aperçu = document de l'élève ---------- */
const colOf=(c,b)=>b.couleur||c.couleurs[b.type]||COL[b.type];
/* texte lisible (noir ou blanc, le meilleur contraste) sur la couleur choisie, y compris personnalisée */
const lum=h=>{const[r,g,b]=[1,3,5].map(i=>{const v=parseInt(h.slice(i,i+2),16)/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const ink=h=>1.05/(lum(h)+.05)>=(lum(h)+.05)/.05?'#fff':'#111';
/* rendu riche d'un champ : encadrés (@def @prop @thm @ex @meth @rem @att), tableaux (| a | b |), questions numérotées, puis mise en forme légère de l'application (fmt) */
const CALL={def:['Définition','#1f5fa8'],prop:['Propriété','#256b34'],thm:['Théorème','#b3261e'],ex:['Exemple','#6a2f8d'],meth:['Méthode','#8f4700'],rem:['Remarque','#566574'],att:['Attention','#b3261e']};
const SPEC=/^@(def|prop|thm|ex|meth|rem|att)(\s|$)/i,ISTB=l=>/^\s*\|.*\|\s*$/.test(l),ISQ=/^\s*(\d{1,2}[.)]|[a-h]\))\s+(.*)$/;
const cell=s=>inl(esc(s.trim()));
function tableHTML(L){const R=L.map(l=>l.trim().replace(/^\||\|$/g,'').split('|')),sep=R.length>1&&R[1].every(c=>/^\s*:?-{2,}:?\s*$/.test(c)),H=sep?R[0]:null,B=sep?R.slice(2):R;
 return '<div class="cp-tw"><table class="cp-t">'+(H?'<thead><tr>'+H.map(c=>'<th>'+cell(c)+'</th>').join('')+'</tr></thead>':'')+'<tbody>'+B.map(r=>'<tr>'+r.map(c=>'<td>'+cell(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
function rich(s){if(!s||!String(s).trim())return'';const L=String(s).replace(/\r/g,'').split('\n');let out='',buf=[],i=0;const flush=()=>{if(buf.length){out+=fmt(buf.join('\n'));buf=[]}};
 while(i<L.length){const l=L[i],m=SPEC.exec(l.trim());
  if(m){flush();const k=m[1].toLowerCase(),body=[l.trim().slice(m[0].length-(m[2]?1:0)).trim()];i++;while(i<L.length&&L[i].trim()!==''&&!SPEC.test(L[i].trim())){body.push(L[i]);i++}
   out+='<div class="cp-call" style="--cc:'+CALL[k][1]+'"><b class="cp-cl">'+CALL[k][0]+'</b>'+fmt(body.filter((x,j)=>j||x).join('\n'))+'</div>';continue}
  if(ISTB(l)){flush();const r=[];while(i<L.length&&ISTB(L[i])){r.push(L[i]);i++}out+=tableHTML(r);continue}
  const q=ISQ.exec(l);
  if(q){flush();let x=q[2];i++;while(i<L.length&&/^\s*[a-zà-ÿ(,;]/.test(L[i])&&!ISQ.test(L[i])&&!SPEC.test(L[i].trim())&&!ISTB(L[i])){x+=' '+L[i].trim();i++}out+='<p class="cp-q"><b>'+esc(q[1])+'</b> '+inl(esc(x))+'</p>';continue}
  buf.push(l);i++}
 flush();return out}
const fm=rich;
const imgsHTML=a=>a&&a.length?'<div class="cp-im">'+a.map(m=>'<figure class="'+(m.a==='r'?'cp-fr':'cp-fc')+'" style="width:'+m.w+'%"><img src="'+m.u+'" alt="'+esc(m.l||'Illustration')+'">'+(m.l?'<figcaption>'+esc(m.l)+'</figcaption>':'')+'</figure>').join('')+'<div style="clear:both"></div></div>':'';
/* corrigé : trois versions — enseignant (tout), élève avec corrigés (selon les réglages du bloc), élève sans corrigés.
   À l'écran : « Voir le corrigé » (déroulant) ; à l'impression : bloc fixe, seulement si le réglage « PDF » est coché. */
function corrHTML(b,s,mode){if(!s||!s.trim()||mode==='eleve_sans')return'';const o=b.corr,ens=mode==='enseignant',sc=ens||o.en_ligne||o.pdf,pr=ens||o.pdf,inner=rich(s);let h='';
 if(sc)h+='<details class="cp-co scr"'+(ens||o.defaut==='affiche'?' open':'')+'><summary>Voir le corrigé</summary>'+inner+'</details>';
 if(pr)h+='<div class="cp-co prt"><b>Corrigé</b>'+inner+'</div>';return h}
function blocHTML(c,b,mode){const d=T[b.type],col=colOf(c,b),cs='style="--bc:'+col+';--bt:'+ink(col)+'"';let h='';
 if(b.type==='attendus'||b.type==='revision'){const f=(k,l)=>b.v[k]&&b.v[k].trim()?'<div class="cp-sub"><h4>'+l+'</h4>'+rich(b.v[k])+'</div>':'';h+=b.type==='attendus'?'<div class="cp-two">'+f('savoir','Je dois savoir')+f('faire','Je dois savoir faire')+'</div>':d.f.map(([k,l])=>f(k,esc(l))).join('')}
 else d.f.forEach(([k,l])=>{const v=b.v[k];if(!v||!v.trim())return;h+=(k==='consigne'?'<div class="cp-cons">'+rich(v)+'</div>':k==='texte'||k==='enonce'?rich(v):'<div class="cp-sub"><h4>'+esc(l)+'</h4>'+rich(v)+'</div>')});
 h+=imgsHTML(b.imgs);
 if(d.items)h+=b.items.map((x,i)=>'<div class="cp-ex"><h4>Exercice '+esc(x.num||(i+1))+(x.titre?' – '+esc(x.titre):'')+(x.niveau?' <small>('+x.niveau+')</small>':'')+'</h4>'+rich(x.enonce)+imgsHTML(x.imgs)+corrHTML(b,x.corrige,mode)+'</div>').join('');
 if(d.comp&&b.comp.length)h+='<p class="cp-cp"><b>Compétences :</b> '+esc(b.comp.join(', '))+'</p>';
 if(d.corr)h+=corrHTML(b,b.corr.texte,mode);
 return '<section class="cp-b'+(b.saut?' cp-pb':'')+'" '+cs+'><div class="cp-h">'+d.ico+' '+esc(b.titre||d.n)+'</div><div class="cp-c">'+(h||'<p class="cp-empty">(bloc vide)</p>')+'</div></section>'}
function chapHTML(c,h,n,mode){return '<div class="cp-ch"><div class="cp-run">'+esc(c.nom)+(c.classe?' · '+esc(c.classe):'')+'</div><h2>Chapitre '+n+' : '+esc(h.nom)+'</h2>'+(h.ref?'<p class="cp-ref">'+esc(h.ref)+'</p>':'')+h.blocs.map(b=>blocHTML(c,b,mode)).join('')+(h.blocs.length?'':'<p class="cp-empty">Ce chapitre est vide : ajoutez un bloc.</p>')+'</div>'}
function prev(){const e=$c('cahP');if(!e)return;const c=cc();if(!c){e.innerHTML='';return}const hs=S.scope==='all'?c.chapitres:[ch()].filter(Boolean);
 e.innerHTML='<div class="cp-bar"><label>Version <select data-ca="mode" aria-label="Version du cahier"><option value="enseignant"'+(S.mode==='enseignant'?' selected':'')+'>Enseignant (tous les corrigés)</option><option value="eleve_avec"'+(S.mode==='eleve_avec'?' selected':'')+'>Élève avec corrigés</option><option value="eleve_sans"'+(S.mode==='eleve_sans'?' selected':'')+'>Élève sans corrigés</option></select></label><label><input type="checkbox" data-ca="tall"'+(S.scope==='all'?' checked':'')+'> Tout le cahier</label></div><div id="cahpg" class="cp-page"><h1>'+esc(c.nom)+'</h1><p class="cp-sub0">'+esc([c.niveau,c.classe,c.annee].filter(Boolean).join(' · '))+'</p>'+(hs.map(h=>chapHTML(c,h,c.chapitres.indexOf(h)+1,S.mode)).join('')||'<p class="cp-empty">Aucun chapitre.</p>')+'</div>';rmath(e)}
/* ---------- panneaux : liste des chapitres, éditeur ---------- */
const TB=[['b','<b>G</b>','Gras (Ctrl+B)'],['u','<u>S</u>','Souligné (Ctrl+U)'],['l','•','Liste à puces'],['h','Titre','Sous-titre'],['def','Définition','Encadré Définition'],['prop','Propriété','Encadré Propriété'],['thm','Théorème','Encadré Théorème'],['ex','Exemple','Encadré Exemple'],['meth','Méthode','Encadré Méthode'],['rem','Remarque','Encadré Remarque'],['att','Attention','Encadré Attention'],['tab','▦ Tableau','Insérer un tableau']];
function toolbar(){return '<div class="ce-tb" role="toolbar" aria-label="Mise en forme du texte"><span>Texte :</span>'+TB.map(([m,l,ti])=>'<button data-ca="fmt" data-m="'+m+'" title="'+ti+'" aria-label="'+ti+'">'+l+'</button>').join('')+'<span class="ce-sp">Formules :</span>'+(typeof KB!=='undefined'?KB.map((k,i)=>'<button data-ca="kbd" data-i="'+i+'" title="Insérer une formule" aria-label="Formule '+esc(k[0])+'">'+esc(k[0])+'</button>').join(''):'')+'</div>'}
let LAST=null;
function fmtIns(m){const e=LAST;if(!e||!e.isConnected||e.tagName!=='TEXTAREA'){toast('Cliquez d’abord dans un champ de texte');return}
 let a=e.selectionStart,z=e.selectionEnd;const v=e.value;let r,c0,c1;
 if(m==='b'||m==='u'){const w=m==='b'?'**':'__',sel=v.slice(a,z);r=w+sel+w;c0=a+w.length;c1=c0+sel.length}
 else{const ls=v.lastIndexOf('\n',Math.max(0,a-1))+(a?1:0),ia=a?ls:0;a=ia;let le=v.indexOf('\n',z);if(le<0)le=v.length;const seg=v.slice(a,le);
  if(m==='tab'){r=seg+(seg.trim()?'\n':'')+'| Titre 1 | Titre 2 | Titre 3 |\n|---|---|---|\n| a | b | c |\n| d | e | f |';z=le}
  else{const pre=m==='l'?'- ':m==='h'?'## ':'@'+m+' ';r=seg.split('\n').map(l=>pre+l).join('\n');z=le}c0=c1=a+r.length}
 e.setRangeText(r,a,z,'end');e.setSelectionRange(c0,c1);e.focus();e.dispatchEvent(new Event('input',{bubbles:true}))}
function kbdIns(i){const e=LAST;if(!e||!e.isConnected||e.tagName!=='TEXTAREA'){toast('Cliquez d’abord dans un champ de texte');return}const s=KB[i][1],a=e.selectionStart;e.setRangeText(s,a,e.selectionEnd,'end');const k=s.indexOf('{}');if(k>=0)e.selectionStart=e.selectionEnd=a+k+1;e.focus();e.dispatchEvent(new Event('input',{bubbles:true}))}
const lbl=(t,i)=>'<label>'+t+i+'</label>',inp=(a,v,p)=>'<input '+a+' value="'+esc(v)+'"'+(p?' placeholder="'+esc(p)+'"':'')+'>';
function listPane(){const c=cc(),e=$c('cahL');if(!e)return;
 const sel=$c('cahsel');sel.innerHTML=S.list.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===S.cur?' selected':'')+'>'+esc(x.nom)+'</option>').join('')||'<option value="">(aucun cahier)</option>';sel.disabled=!c;
 if(!c){e.innerHTML='';return}
 e.innerHTML='<div class="cl-h"><h3>Chapitres</h3><button class="cbtn pri" data-ca="chnew">+ Chapitre</button></div><ol class="cl" id="cahchl">'+c.chapitres.map((h,i)=>'<li draggable="true" data-did="'+h.id+'" data-dk="ch" class="'+(h.id===S.chap?'on':'')+'"><button class="cl-n" data-ca="chsel" data-id="'+h.id+'"'+(h.id===S.chap?' aria-current="true"':'')+'>'+(i+1)+'. '+esc(h.nom)+' <small>'+h.blocs.length+' bloc'+(h.blocs.length>1?'s':'')+'</small></button><span class="cl-a"><button data-ca="chup" data-id="'+h.id+'" aria-label="Monter le chapitre '+esc(h.nom)+'"'+(i?'':' disabled')+'>↑</button><button data-ca="chdn" data-id="'+h.id+'" aria-label="Descendre le chapitre '+esc(h.nom)+'"'+(i<c.chapitres.length-1?'':' disabled')+'>↓</button><button data-ca="chdup" data-id="'+h.id+'" aria-label="Dupliquer le chapitre '+esc(h.nom)+'">⧉</button><button data-ca="chdel" data-id="'+h.id+'" class="dng" aria-label="Supprimer le chapitre '+esc(h.nom)+'">🗑</button></span></li>').join('')+'</ol>'+(c.chapitres.length?'':'<p class="cl-e">Aucun chapitre. Créez-en un pour commencer.</p>')
 +'<details class="cl-set"><summary>Réglages du cahier</summary>'+lbl('Titre du cahier',inp('data-cf="nom"',c.nom))+lbl('Niveau',inp('data-cf="niveau"',c.niveau,'5e'))+lbl('Classe',inp('data-cf="classe"',c.classe,'5A'))+lbl('Année scolaire',inp('data-cf="annee"',c.annee,'2026-2027'))
 +'<p><b>Couleurs des blocs</b></p>'+Object.keys(T).map(k=>'<label class="cl-col"><input type="color" data-cc="'+k+'" value="'+c.couleurs[k]+'"> '+T[k].n+'</label>').join('')+'<button class="cbtn" data-ca="colreset">Couleurs par défaut</button> <button class="cbtn" data-ca="cexpall">Exporter tous les cahiers</button></details>'}
function imgPane(b,list,itemId){const it=itemId?' data-it="'+itemId+'"':'';
 return '<div class="cbk-im"><button class="cbtn" data-ca="imgadd" data-b="'+b.id+'"'+it+'>🖼 Ajouter une image</button> <small>ou glissez-déposez / collez (Ctrl + V) une image dans ce bloc</small>'+list.map((m,k)=>'<div class="cbk-ig"><img src="'+m.u+'" alt="Aperçu de l’image '+(k+1)+'"><div><label>Taille<select data-b="'+b.id+'"'+it+' data-im="'+m.id+'" data-f="imgw">'+[25,50,75,100].map(v=>'<option value="'+v+'"'+(v===m.w?' selected':'')+'>'+v+' %</option>').join('')+'</select></label><label>Alignement<select data-b="'+b.id+'"'+it+' data-im="'+m.id+'" data-f="imga"><option value="c"'+(m.a==='c'?' selected':'')+'>Centrée</option><option value="r"'+(m.a==='r'?' selected':'')+'>À droite</option></select></label><label>Légende'+inp('data-b="'+b.id+'"'+it+' data-im="'+m.id+'" data-f="imgl"',m.l)+'</label><span class="cbk-a"><button data-ca="imgup" data-b="'+b.id+'"'+it+' data-id="'+m.id+'" aria-label="Monter l’image"'+(k?'':' disabled')+'>↑</button><button data-ca="imgdn" data-b="'+b.id+'"'+it+' data-id="'+m.id+'" aria-label="Descendre l’image"'+(k<list.length-1?'':' disabled')+'>↓</button><button data-ca="imgdel" data-b="'+b.id+'"'+it+' data-id="'+m.id+'" class="dng" aria-label="Supprimer l’image">🗑</button></span></div></div>').join('')+'</div>'}
function corrSet(b){const o=b.corr,k=(x,l)=>'<label><input type="checkbox" data-b="'+b.id+'" data-f="corropt" data-k="'+x+'"'+(o[x]?' checked':'')+'> '+l+'</label>';
 return '<details class="cbk-cs"><summary>Réglages du corrigé</summary><label>Affichage par défaut<select data-b="'+b.id+'" data-f="corropt" data-k="defaut"><option value="masque"'+(o.defaut==='masque'?' selected':'')+'>Masqué (« Voir le corrigé »)</option><option value="affiche"'+(o.defaut==='affiche'?' selected':'')+'>Affiché</option></select></label>'+k('en_ligne','Accessible aux élèves en ligne (par clic)')+k('pdf','Inclus dans le PDF « élève avec corrigés »')+k('word','Inclus dans l’export Word « élève avec corrigés »')+'</details>'}
function blocForm(c,b,i,n){const d=T[b.type],col=colOf(c,b);
 let h='<article class="cbk" data-bid="'+b.id+'" style="--bc:'+col+'"><header><span class="cdrag" draggable="true" data-did="'+b.id+'" data-dk="bl" title="Glisser pour déplacer le bloc" aria-hidden="true">⠿</span><strong>'+d.ico+' '+esc(d.n)+'</strong><span class="cbk-a"><button data-ca="bup" data-id="'+b.id+'" aria-label="Monter ce bloc"'+(i?'':' disabled')+'>↑</button><button data-ca="bdn" data-id="'+b.id+'" aria-label="Descendre ce bloc"'+(i<n-1?'':' disabled')+'>↓</button><button data-ca="bdup" data-id="'+b.id+'" aria-label="Dupliquer ce bloc">⧉</button><button data-ca="bdel" data-id="'+b.id+'" class="dng" aria-label="Supprimer ce bloc">🗑</button></span></header>'
 +'<div class="cbk-r"><label class="cbk-t">Titre'+inp('data-b="'+b.id+'" data-f="titre"',b.titre,d.n)+'</label><label class="cbk-c">Couleur <input type="color" data-b="'+b.id+'" data-f="couleur" value="'+col+'"></label><label class="cbk-s"><input type="checkbox" data-b="'+b.id+'" data-f="saut"'+(b.saut?' checked':'')+'> Saut de page avant</label></div>';
 d.f.forEach(([k,l,p,r])=>{h+='<label>'+esc(l)+'<textarea rows="'+r+'" data-b="'+b.id+'" data-f="v" data-k="'+k+'" placeholder="'+esc(p)+'">'+esc(b.v[k]||'')+'</textarea></label>'});
 h+=imgPane(b,b.imgs,'');
 if(d.items)h+='<div class="cbk-items">'+b.items.map((x,j)=>'<fieldset class="cbk-ex" data-it="'+x.id+'"><legend>Exercice '+esc(x.num||(j+1))+'</legend><div class="cbk-r"><label>N°'+inp('data-b="'+b.id+'" data-i="'+x.id+'" data-f="num"',x.num,String(j+1))+'</label><label class="cbk-t">Titre'+inp('data-b="'+b.id+'" data-i="'+x.id+'" data-f="titre"',x.titre)+'</label><label>Difficulté<select data-b="'+b.id+'" data-i="'+x.id+'" data-f="niveau">'+NIVX.map(v=>'<option value="'+v+'"'+(v===x.niveau?' selected':'')+'>'+(v||'—')+'</option>').join('')+'</select></label></div><label>Énoncé<textarea rows="4" data-b="'+b.id+'" data-i="'+x.id+'" data-f="enonce">'+esc(x.enonce)+'</textarea></label><label>Corrigé<textarea rows="3" data-b="'+b.id+'" data-i="'+x.id+'" data-f="corrige">'+esc(x.corrige)+'</textarea></label>'+imgPane(b,x.imgs,x.id)+'<span class="cbk-a"><button data-ca="exup" data-b="'+b.id+'" data-id="'+x.id+'" aria-label="Monter l’exercice"'+(j?'':' disabled')+'>↑</button><button data-ca="exdn" data-b="'+b.id+'" data-id="'+x.id+'" aria-label="Descendre l’exercice"'+(j<b.items.length-1?'':' disabled')+'>↓</button><button data-ca="exdel" data-b="'+b.id+'" data-id="'+x.id+'" class="dng" aria-label="Supprimer l’exercice">🗑</button></span></fieldset>').join('')+'<button class="cbtn" data-ca="exnew" data-id="'+b.id+'">+ Exercice</button></div>';
 if(d.comp)h+='<div class="cbk-cp"><b>Compétences</b> '+COMP.map(k=>'<label><input type="checkbox" data-b="'+b.id+'" data-f="comp" data-k="'+k+'"'+(b.comp.includes(k)?' checked':'')+'> '+k+'</label>').join('')+'</div>';
 if(d.corr)h+='<label>Corrigé<textarea rows="4" data-b="'+b.id+'" data-f="corrtxt">'+esc(b.corr.texte)+'</textarea></label>';
 if(d.corr||d.items)h+=corrSet(b);
 return h+'</article>'}
function editPane(){const c=cc(),h=ch(),e=$c('cahE');if(!e)return;
 if(!c){e.innerHTML='<div class="ce-empty"><h2>Votre cahier d’élève</h2><p>Construisez le cahier de mathématiques de la classe : un chapitre par notion, avec attendus, activité, cours, exercices, problème et évaluation.</p><p><button class="cbtn pri" data-ca="cnew">Créer mon cahier</button> <button class="cbtn" data-ca="cimp">Importer un cahier…</button></p></div>';return}
 if(!h){e.innerHTML='<div class="ce-empty"><p>Sélectionnez ou créez un chapitre.</p><p><button class="cbtn pri" data-ca="chnew">+ Chapitre</button></p></div>';return}
 e.innerHTML=toolbar()+'<div class="ce-h"><label>Titre du chapitre'+inp('data-ch="nom"',h.nom)+'</label><label>Sous-titre / référence (facultatif)'+inp('data-ch="ref"',h.ref,'Programme du cycle 4 – Nombres et calculs')+'</label></div><div class="ce-add" role="group" aria-label="Ajouter un bloc"><b>Ajouter un bloc :</b> '+Object.keys(T).map(k=>'<button class="cbtn" style="--bc:'+c.couleurs[k]+'" data-ca="badd" data-t="'+k+'">'+T[k].ico+' '+esc(T[k].n)+'</button>').join('')+'</div><div id="cahbl">'+h.blocs.map((b,i)=>blocForm(c,b,i,h.blocs.length)).join('')+'</div>'+(h.blocs.length?'':'<p class="cl-e">Ce chapitre est vide : ajoutez un premier bloc ci-dessus.</p>')}
function render(){if(!S.open)return;listPane();editPane();prev();hbtn();stLine2();$c('cah').dataset.tab=S.tab;document.querySelectorAll('#cahtabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===S.tab)))}
/* met à jour les libellés (liste de cahiers et de chapitres) sans reconstruire les panneaux : la saisie en cours n'est jamais interrompue */
function labels(){const c=cc();if(!c)return;const o=$c('cahsel')&&$c('cahsel').querySelector('option[value="'+c.id+'"]');if(o)o.textContent=c.nom;
 c.chapitres.forEach((h,i)=>{const b=document.querySelector('#cahchl [data-ca=chsel][data-id="'+h.id+'"]');if(b){b.firstChild.textContent=(i+1)+'. '+h.nom+' ';b.title=h.nom}})}
/* ---------- actions ---------- */
const conf=(t,h,ok)=>modal(t,h,[['cancel','Annuler'],['go',ok||'Supprimer','pri']],{esc:'cancel'}).then(r=>r==='go');
const mv=(a,i,j)=>{if(j<0||j>=a.length)return false;a.splice(j,0,a.splice(i,1)[0]);return true};
async function newCah(){const c=mkCah(),n=S.list.length+1;if(n>1)c.nom='Cahier de mathématiques '+n;S.list.push(c);S.cur=c.id;const h=mkChap();c.chapitres.push(h);S.chap=h.id;S.dirty.add(c.id);S.ordDirty=true;hreset();sched();render();toast('Cahier créé')}
function selCah(id){if(!S.list.some(x=>x.id===id)||id===S.cur)return;clearTimeout(touch.h);hsnap();S.cur=id;S.chap=((cc().chapitres[0])||{}).id||null;S.ordDirty=true;hreset();sched();render()}
async function dupCah(){const c=cc();if(!c)return;const n=reid(clone(c));n.nom=c.nom+' (copie)';n.creeLe=n.modifLe=NOW();n.pub={statut:'brouillon',version:0};S.list.splice(S.list.indexOf(c)+1,0,n);S.cur=n.id;S.chap=(n.chapitres[0]||{}).id||null;S.dirty.add(n.id);S.ordDirty=true;hreset();sched();render();toast('Cahier dupliqué')}
async function delCah(){const c=cc();if(!c)return;if(!await conf('Supprimer le cahier ?','<p>Le cahier « <b>'+esc(c.nom)+'</b> » ('+c.chapitres.length+' chapitre(s)) sera supprimé. Vos séquences et séances ne sont pas concernées.</p><p>Vous pourrez annuler tant que cette page reste ouverte.</p>'))return;
 const i=S.list.indexOf(c);S.trash.push({c:clone(c),i});S.list.splice(i,1);S.del.add(c.id);S.dirty.delete(c.id);S.ordDirty=true;S.cur=(S.list[Math.min(i,S.list.length-1)]||{}).id||null;S.chap=((cc()||{}).chapitres||[])[0]?cc().chapitres[0].id:null;hreset();sched();render();trashUI()}
function undoDel(){const t=S.trash.pop();if(!t)return;S.list.splice(Math.min(t.i,S.list.length),0,t.c);S.del.delete(t.c.id);S.dirty.add(t.c.id);S.ordDirty=true;S.cur=t.c.id;S.chap=(t.c.chapitres[0]||{}).id||null;hreset();sched();render();trashUI()}
const trashUI=()=>{const b=$c('cahun');if(b){b.hidden=!S.trash.length;b.textContent='↩ Annuler la suppression de « '+((S.trash[S.trash.length-1]||{c:{}}).c.nom||'')+' »'}};
function chAct(a,id){const c=cc();if(!c)return;const i=c.chapitres.findIndex(x=>x.id===id),h=c.chapitres[i];if(!h)return;
 if(a==='chup'){if(mv(c.chapitres,i,i-1)){touch({now:1});render()}}else if(a==='chdn'){if(mv(c.chapitres,i,i+1)){touch({now:1});render()}}
 else if(a==='chdup'){const n=reid(clone(h));n.nom=h.nom+' (copie)';c.chapitres.splice(i+1,0,n);S.chap=n.id;touch({now:1});render()}
 else if(a==='chdel')conf('Supprimer le chapitre ?','<p>Le chapitre « <b>'+esc(h.nom)+'</b> » et ses '+h.blocs.length+' bloc(s) seront supprimés du cahier.</p><p>L’annulation (↶ ou Ctrl + Z) permet de le restaurer.</p>').then(ok=>{if(!ok)return;const j=c.chapitres.findIndex(x=>x.id===id);c.chapitres.splice(j,1);if(S.chap===id)S.chap=(c.chapitres[Math.min(j,c.chapitres.length-1)]||{}).id||null;touch({now:1});render()})}
function blAct(a,id,x){const h=ch();if(!h)return;const i=h.blocs.findIndex(b=>b.id===id),b=h.blocs[i];if(!b)return;
 if(a==='bup'){if(mv(h.blocs,i,i-1)){touch({now:1});render()}}else if(a==='bdn'){if(mv(h.blocs,i,i+1)){touch({now:1});render()}}
 else if(a==='bdup'){const n=reid(clone(b));h.blocs.splice(i+1,0,n);touch({now:1});render()}
 else if(a==='bdel')conf('Supprimer ce bloc ?','<p>Le bloc « <b>'+esc(b.titre||T[b.type].n)+'</b> » sera supprimé. Annulation possible avec ↶ ou Ctrl + Z.</p>').then(ok=>{if(!ok)return;const j=h.blocs.findIndex(y=>y.id===id);if(j>=0){h.blocs.splice(j,1);touch({now:1});render()}})
 else if(a==='exnew'){if(b.items.length<LIM.item){b.items.push(mkEx());touch({now:1});render()}}
 else if(/^ex(up|dn|del)$/.test(a)){const j=b.items.findIndex(y=>y.id===x);if(j<0)return;if(a==='exdel')b.items.splice(j,1);else mv(b.items,j,j+(a==='exup'?-1:1));touch({now:1});render()}}
/* ---------- saisie ---------- */
function onInput(e){const t=e.target,c=cc(),h=ch();if(!c)return;
 if(t.dataset.cf){c[t.dataset.cf]=txt(t.value,200);touch();if(t.dataset.cf==='nom')labels();return}
 if(t.dataset.cc){c.couleurs[t.dataset.cc]=hex(t.value)||COL[t.dataset.cc];touch();document.querySelectorAll('.cbk').forEach(x=>{const b=bk(x.dataset.bid);if(b)x.style.setProperty('--bc',colOf(c,b))});return}
 if(t.dataset.ch&&h){h[t.dataset.ch]=txt(t.value,t.dataset.ch==='nom'?200:300);touch();if(t.dataset.ch==='nom')labels();return}
 if(t.dataset.b){const b=bk(t.dataset.b);if(!b)return;const f=t.dataset.f;
  if(t.dataset.im){const m=imgList(b,t.dataset.it).find(y=>y.id===t.dataset.im);if(!m)return;if(f==='imgw')m.w=[25,50,75,100].includes(+t.value)?+t.value:100;else if(f==='imga')m.a=t.value==='r'?'r':'c';else m.l=txt(t.value,300);touch();return}
  if(f==='corropt'){const k=t.dataset.k;if(k==='defaut')b.corr.defaut=t.value==='affiche'?'affiche':'masque';else b.corr[k]=t.checked;touch();return}
  if(t.dataset.i){const x=b.items.find(y=>y.id===t.dataset.i);if(!x)return;x[f]=f==='niveau'?(NIVX.includes(t.value)?t.value:''):txt(t.value,f==='num'||f==='titre'?200:undefined);if(f==='num'){const l=t.closest('fieldset').querySelector('legend');if(l)l.textContent='Exercice '+(x.num||(b.items.indexOf(x)+1))}}
  else if(f==='titre')b.titre=txt(t.value,200);
  else if(f==='couleur'){b.couleur=hex(t.value)===c.couleurs[b.type]?'':hex(t.value);t.closest('.cbk').style.setProperty('--bc',colOf(c,b))}
  else if(f==='saut')b.saut=t.checked;else if(f==='v')b.v[t.dataset.k]=txt(t.value);else if(f==='corrtxt')b.corr.texte=txt(t.value);
  else if(f==='comp')b.comp=COMP.filter(k=>k===t.dataset.k?t.checked:b.comp.includes(k));
  touch()}}
/* ---------- images : ajout (sélecteur, glisser-déposer, collage), réduction à 900 px, jamais déformées (largeur en %, hauteur automatique) ---------- */
const imgList=(b,itemId)=>itemId?((b.items.find(x=>x.id===itemId)||{}).imgs||[]):b.imgs;
const readImg=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onerror=()=>ko(new Error('lecture impossible'));r.onload=()=>{const im=new Image();im.onerror=()=>ko(new Error('image illisible'));im.onload=()=>{const k=Math.min(1,900/Math.max(im.width,1)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.82))};im.src=r.result};r.readAsDataURL(f)});
async function addImgFile(f,bid,itemId){const b=bk(bid);if(!b||!f)return false;
 if(!/^image\/(png|jpe?g|gif|webp)$/.test(f.type)){toast('Format non pris en charge (PNG, JPEG, GIF ou WebP)');return false}
 if(f.size>2e7){toast('Image trop volumineuse (20 Mo maximum)');return false}
 const L=imgList(b,itemId);if(L.length>=LIM.img){toast('Nombre maximal d’images atteint pour ce bloc');return false}
 try{const u=await readImg(f);if(!IMGOK(u)||!u)throw new Error('image refusée');if(!bk(bid))return false;imgList(b,itemId).push({id:uid(),u,w:100,a:'c',l:''});touch({now:1});const y=$c('cahE').scrollTop;render();$c('cahE').scrollTop=y;return true}
 catch(e){toast('Image non ajoutée : '+errMsg(e));return false}}
function imgAct(a,bid,itemId,id){const b=bk(bid);if(!b)return;const L=imgList(b,itemId),i=L.findIndex(m=>m.id===id);if(i<0)return;if(a==='imgdel')L.splice(i,1);else mv(L,i,i+(a==='imgup'?-1:1));touch({now:1});const y=$c('cahE').scrollTop;render();$c('cahE').scrollTop=y}
const imgTarget=n=>{const x=n&&n.closest&&n.closest('.cbk[data-bid]');if(!x)return null;const f=n.closest('fieldset[data-it]');return{b:x.dataset.bid,i:f?f.dataset.it:''}};
document.addEventListener('dragover',e=>{if(S.open&&!S.drag&&e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files')&&imgTarget(e.target)){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
document.addEventListener('drop',e=>{if(!S.open||S.drag||!e.dataTransfer||![...(e.dataTransfer.types||[])].includes('Files'))return;const g=imgTarget(e.target);if(!g)return;e.preventDefault();e.stopPropagation();[...e.dataTransfer.files].forEach(f=>addImgFile(f,g.b,g.i))},true);
/* ---------- glisser-déposer (chapitres et blocs) ---------- */
function dropAt(e,kind){const t=e.target.closest(kind==='ch'?'li[data-did]':'.cbk[data-bid]');if(!t)return null;const r=t.getBoundingClientRect(),id=kind==='ch'?t.dataset.did:t.dataset.bid;return{id,after:e.clientY>r.top+r.height/2,el:t}}
document.addEventListener('dragstart',e=>{const g=e.target.closest&&e.target.closest('#cah [data-did]');if(!g||!S.open)return;S.drag={k:g.dataset.dk,id:g.dataset.did};e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',g.dataset.did)}catch(x){}});
document.addEventListener('dragover',e=>{if(!S.drag||!S.open)return;const d=dropAt(e,S.drag.k);document.querySelectorAll('#cah .ins-t,#cah .ins-b').forEach(x=>x.classList.remove('ins-t','ins-b'));if(!d||d.id===S.drag.id)return;e.preventDefault();d.el.classList.add(d.after?'ins-b':'ins-t')});
document.addEventListener('drop',e=>{if(!S.drag||!S.open)return;const d=dropAt(e,S.drag.k),g=S.drag;S.drag=null;document.querySelectorAll('#cah .ins-t,#cah .ins-b').forEach(x=>x.classList.remove('ins-t','ins-b'));if(!d||d.id===g.id)return;e.preventDefault();
 const A=g.k==='ch'?cc().chapitres:ch().blocs,i=A.findIndex(x=>x.id===g.id);if(i<0)return;const it=A.splice(i,1)[0],j=A.findIndex(x=>x.id===d.id);A.splice(j+(d.after?1:0),0,it);touch({now:1});setTimeout(render,0)});
document.addEventListener('dragend',()=>{S.drag=null;document.querySelectorAll('#cah .ins-t,#cah .ins-b').forEach(x=>x.classList.remove('ins-t','ins-b'))});
/* ---------- export / import de cahiers (fichier .json, indépendant des sauvegardes ZIP) ---------- */
const expData=L=>({format:FMT,version:1,app:typeof APP_V==='string'?APP_V:'',exportedAt:NOW(),cahiers:L.map(clone)});
function expCah(all){const L=all?S.list:[cc()].filter(Boolean);if(!L.length)return;flush();const n=all?'cahiers_maths':'cahier_'+(cc().nom||'maths');dl(n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w.-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'cahier',expData(L));toast('Export téléchargé')}
function parseImp(raw){let d;try{d=JSON.parse(String(raw).replace(/^\uFEFF/,''))}catch(e){throw new Error('Ce fichier n’est pas un JSON valide.')}
 if(!isO(d)||d.format!==FMT)throw new Error('Ce fichier n’est pas un export de cahiers de CreateDocMaths (format « '+FMT+' » attendu).');
 if(typeof d.version!=='number'||d.version>1)throw new Error('Version de fichier non prise en charge (version '+d.version+').');
 if(!Array.isArray(d.cahiers)||!d.cahiers.length)throw new Error('Aucun cahier dans ce fichier.');if(d.cahiers.length>LIM.cah)throw new Error('Trop de cahiers dans le fichier.');
 const W=[],L=[];d.cahiers.forEach((c,i)=>{const w=[],n=normCah(c,w);w.forEach(x=>W.push('Cahier n°'+(i+1)+' : '+x));if(n)L.push(n)});if(!L.length)throw new Error('Aucun cahier exploitable dans ce fichier.');return{L,W}}
async function impFile(f){try{if(!f)return;if(f.size>LIM.bytes)throw new Error('Fichier trop volumineux.');const{L,W}=parseImp(await f.text());
  const nb=c=>c.chapitres.reduce((a,h)=>a+h.blocs.length,0),ex=new Set(S.list.map(x=>x.nom));
  const ok=await modal('Importer des cahiers','<p>'+L.length+' cahier(s) seront <b>ajoutés</b> (rien n’est remplacé) :</p><ul>'+L.map(c=>'<li><b>'+esc(c.nom)+'</b> : '+c.chapitres.length+' chapitre(s), '+nb(c)+' bloc(s)'+(ex.has(c.nom)?' <small>(un cahier de même nom existe déjà)</small>':'')+'</li>').join('')+'</ul>'+(W.length?'<p><b>Avertissements ('+W.length+')</b></p><ul>'+W.slice(0,8).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''),[['cancel','Annuler'],['go','Ajouter à mes cahiers','pri']],{esc:'cancel'});
  if(ok!=='go')return;L.forEach(c=>{reid(c);c.pub={statut:'brouillon',version:0};S.list.push(c);S.dirty.add(c.id)});S.cur=L[0].id;S.chap=(L[0].chapitres[0]||{}).id||null;S.ordDirty=true;hreset();sched();render();toast(L.length+' cahier(s) importé(s)')}
 catch(x){await info('Import impossible','<p>'+esc(errMsg(x))+'</p><p>Vos cahiers n’ont pas été modifiés.</p>')}}
/* ---------- interface : ouverture, fermeture, événements ---------- */
const CSS=`#cah{position:fixed;inset:0;z-index:70;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;--cb:#fff;--cl:var(--line)}#cah[hidden]{display:none}
body.dark #cah{--cb:#17212b}body.cah-open #toast{z-index:95}
#cahbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 10px;background:var(--ink);color:#fff}#cahbar strong{margin-right:4px}#cahbar select{width:auto!important;max-width:240px;margin:0!important;color:#1f2a37!important;background:#fff!important}
#cah .cbtn,#cah button{font:inherit;border:1px solid var(--cl);background:var(--cb);color:inherit;border-radius:5px;padding:5px 10px;cursor:pointer}#cah .cbtn.pri{background:var(--acc);color:#fff;border-color:var(--acc)}#cah button:disabled{opacity:.4;cursor:default}#cah .dng{color:var(--warn)}
#cahbar button{background:#33465a;color:#fff;border-color:#33465a}#cahbar button:hover:not(:disabled){background:var(--acc)}#cahst{font-size:12px;margin-left:auto;color:#cfe}#cahst u{cursor:pointer}#cahun{background:#7a5a00!important}
#cahtabs{display:none}#cahbody{flex:1;min-height:0;display:grid;grid-template-columns:260px minmax(360px,1fr) minmax(380px,1.1fr)}#cahL,#cahE,#cahP{overflow:auto;padding:10px 12px}#cahL{background:var(--cb);border-right:1px solid var(--cl)}#cahE{border-right:1px solid var(--cl)}
.cl-h{display:flex;justify-content:space-between;align-items:center}.cl-h h3{margin:0}.cl{list-style:none;margin:8px 0;padding:0}.cl li{display:flex;flex-wrap:wrap;align-items:center;gap:2px;border:1px solid var(--cl);border-radius:6px;margin:4px 0;background:var(--cb);cursor:grab}.cl li.on{border-color:var(--acc);box-shadow:inset 3px 0 0 var(--acc)}.cl-n{flex:1 1 100%;text-align:left;border:0!important;background:none!important}.cl-n small{color:#6b7a89}.cl-a{display:flex;margin-left:auto}.cl-a button{padding:3px 6px;border:0;background:none}.cl-e{color:#6b7a89;font-size:13px}.ins-t{box-shadow:0 -3px 0 var(--acc)}.ins-b{box-shadow:0 3px 0 var(--acc)}
.cl-set{margin-top:14px}.cl-col{display:flex!important;align-items:center;gap:6px;font-weight:400!important}.cl-col input{width:34px;padding:0;height:26px}
#cah label{display:block;font-weight:600;font-size:13px;margin:0 0 8px}#cah input[type=checkbox]{width:auto;margin:0 4px 0 0}#cah input,#cah textarea,#cah select{width:100%;font:inherit;padding:6px 8px;border:1px solid var(--cl);border-radius:4px;margin-top:3px;background:var(--cb);color:inherit}#cah input[type=color]{width:46px;height:30px;padding:1px}#cah textarea{resize:vertical}
.ce-h{background:var(--cb);border:1px solid var(--cl);border-radius:6px;padding:10px;margin-bottom:8px}.ce-add{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}.ce-add .cbtn{border-left:4px solid var(--bc)}.ce-empty{max-width:520px;margin:40px auto;text-align:center}
.cbk{background:var(--cb);border:1px solid var(--cl);border-left:6px solid var(--bc);border-radius:6px;padding:8px 10px;margin:10px 0}.cbk>header{display:flex;align-items:center;gap:8px;margin-bottom:6px}.cdrag{cursor:grab;font-size:18px;color:#6b7a89;padding:0 4px;touch-action:none}.cbk-a{margin-left:auto;display:flex;gap:3px}.cbk-a button{padding:3px 8px}.cbk-r{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.cbk-t{flex:1 1 200px}.cbk-c,.cbk-s{white-space:nowrap}.cbk-ex{border:1px dashed var(--cl);border-radius:6px;margin:8px 0;padding:6px 8px}.cbk-cp label{display:inline-flex!important;font-weight:400!important;margin-right:10px}
.cp-bar{display:flex;gap:14px;margin:0 auto 8px;max-width:794px;font-size:13px}.cp-bar label{margin:0!important}
.cp-page{background:#fff;color:#222;width:100%;max-width:794px;margin:0 auto;padding:36px 44px;box-shadow:0 2px 10px #0003;font:10pt/1.4 Calibri,Carlito,"Segoe UI",Arial,sans-serif;min-height:600px}.cp-page h1{font-size:22pt;color:var(--nv);margin:0}.cp-sub0{font-style:italic;color:#4a5a73;margin:2pt 0 12pt}
.cp-ch+.cp-ch{margin-top:26pt}.cp-run{text-align:right;font-size:8pt;color:#8a94a6;border-bottom:1px solid #dde3ec;margin-bottom:8pt}.cp-page h2{color:var(--nv);font-size:15pt;margin:6pt 0 4pt}.cp-ref{font-style:italic;color:#4a5a73;margin:0 0 6pt}
.cp-b{border:1.5px solid var(--bc);border-radius:6px;margin:10pt 0;overflow:hidden;break-inside:auto}.cp-h{background:var(--bc);color:var(--bt,#fff);font-weight:700;padding:5px 10px;break-after:avoid}.cp-c{padding:6px 12px}.cp-c p{margin:0 0 4pt}.cp-c ul{margin:0 0 4pt;padding-left:18px}.cp-c h4{margin:6pt 0 2pt;color:var(--bc)}
.cp-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cp-sub{background:color-mix(in srgb,var(--bc) 9%,#fff);border-radius:4px;padding:4px 8px;margin:4px 0}.cp-cons{font-style:italic;margin-bottom:4pt}.cp-b{clear:both}.cp-ex{border-top:1px dashed #ccd;padding-top:4pt;margin-top:6pt;break-inside:avoid}.cp-ex:first-child{border-top:0;margin-top:0}
.cp-co{background:#f3f6f9;border-left:3px solid #6b7a89;padding:3px 8px;margin:4pt 0}.cp-co>b{display:block;color:#4a5a73;font-size:9pt}.cp-cp{font-size:9pt}.cp-empty{color:#8a94a6;font-style:italic}@media screen{.cp-pb{border-top:2px dashed #9db0c2}}
/* phase 2 */
.ce-tb{position:sticky;top:-10px;z-index:3;display:flex;flex-wrap:wrap;gap:4px;align-items:center;background:var(--bg);padding:6px 0;margin-bottom:4px;border-bottom:1px solid var(--cl)}.ce-tb span{font-size:12px;color:#566574;margin-right:2px}.ce-tb .ce-sp{margin-left:8px}.ce-tb button{padding:3px 8px;font-size:13px}
.cbk-im{margin:6px 0}.cbk-im>small{color:#566574}.cbk-ig{display:flex;gap:10px;align-items:flex-start;border:1px dashed var(--cl);border-radius:6px;padding:6px;margin:6px 0}.cbk-ig img{width:110px;max-height:110px;object-fit:contain;background:#fff;border:1px solid var(--cl)}.cbk-ig>div{flex:1;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:end}.cbk-ig label{margin:0!important}.cbk-ig select{width:auto!important}.cbk-cs{margin:6px 0}.cbk-cs summary{cursor:pointer;font-size:13px;color:var(--acc);font-weight:600}.cbk-cs label{font-weight:400!important}
.cp-call{border-left:4px solid var(--cc);background:color-mix(in srgb,var(--cc) 8%,#fff);padding:3px 10px;margin:5pt 0;border-radius:0 4px 4px 0;break-inside:avoid}.cp-cl{display:block;color:var(--cc);font-size:9pt;text-transform:uppercase;letter-spacing:.4px}
.cp-t{border-collapse:collapse;margin:4pt 0;width:auto;max-width:100%}.cp-t th,.cp-t td{border:1px solid #8a94a6;padding:3px 8px;text-align:center}.cp-t th{background:color-mix(in srgb,var(--bc,#1b365d) 14%,#fff);color:#222}.cp-tw{overflow-x:auto}
.cp-q{margin:4pt 0 2pt}.cp-q b{color:var(--bc)}.cp-im{margin:4pt 0}.cp-im figure{margin:4pt auto}.cp-im .cp-fr{float:right;margin:0 0 4pt 10pt}.cp-im img{display:block;width:100%;height:auto}.cp-im figcaption{font-size:8.5pt;font-style:italic;text-align:center}
.cp-co summary{cursor:pointer;font-weight:700;color:#4a5a73;font-size:9pt}.prt{display:none}
@media(max-width:1000px){.ce-tb button,.cbk-ig button,.cbk-im .cbtn{min-height:40px;min-width:40px}#cahtabs{display:flex;background:var(--ink)}#cahtabs button{flex:1;border:0;border-radius:0;background:none;color:#cfd9e2;padding:12px 4px;min-height:44px}#cahtabs button[aria-pressed=true]{background:var(--acc);color:#fff}#cahbody{display:block;overflow:auto}#cahL,#cahE,#cahP{display:none;height:100%;border:0}#cah[data-tab=list] #cahL,#cah[data-tab=edit] #cahE,#cah[data-tab=prev] #cahP{display:block}.cp-page{padding:18px 16px}.cp-two{grid-template-columns:1fr}#cahbar button,#cah .cbtn{min-height:40px}.cbk-a button,.cl-a button{min-width:40px;min-height:40px}}
@media print{.scr{display:none!important}.prt{display:block!important}.cp-im{break-inside:avoid}body.cah-open>*:not(#cah){display:none!important}body.cah-open #cah{position:static;display:block;background:#fff}#cahbar,#cahtabs,#cahL,#cahE,.cp-bar{display:none!important}#cahbody{display:block}#cahP{overflow:visible;padding:0;display:block!important}.cp-page{box-shadow:none;max-width:none;padding:0;min-height:0}.cp-page,.cp-page *{-webkit-print-color-adjust:exact;print-color-adjust:exact}.cp-pb{break-before:page;page-break-before:always;border-top:0}.cp-ch+.cp-ch{break-before:page}}`;
function build(){if($c('cah'))return;const st=document.createElement('style');st.id='cahcss';st.textContent=CSS;document.head.append(st);
 const el=document.createElement('div');el.id='cah';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label','Cahier de l’élève');
 el.innerHTML='<header id="cahbar"><button data-ca="close" aria-label="Retour aux préparations">← Préparations</button><strong>📚 Cahier de l’élève</strong><select id="cahsel" aria-label="Choisir un cahier"></select><button data-ca="cnew">+ Cahier</button><button data-ca="cdup">Dupliquer</button><button data-ca="cdel">Supprimer</button><button data-ca="cexp">Exporter</button><button data-ca="cimp">Importer</button><button data-ca="print">🖨 Imprimer / PDF</button><button id="cahu" data-ca="hundo" aria-label="Annuler">↶</button><button id="cahr" data-ca="hredo" aria-label="Rétablir">↷</button><button id="cahun" data-ca="cundo" hidden></button><span id="cahst" role="status" aria-live="polite"></span></header><nav id="cahtabs" aria-label="Volets"><button data-ca="tab" data-tab="list">Chapitres</button><button data-ca="tab" data-tab="edit">Édition</button><button data-ca="tab" data-tab="prev">Aperçu</button></nav><div id="cahbody"><aside id="cahL" aria-label="Chapitres"></aside><section id="cahE" aria-label="Éditeur"></section><section id="cahP" aria-label="Aperçu du cahier"></section></div><input type="file" id="cahf" accept=".json,application/json" hidden><input type="file" id="cahimg" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden>';
 document.body.append(el);
 el.addEventListener('click',onClick);el.addEventListener('input',onInput);el.addEventListener('change',e=>{if(e.target.id==='cahsel')selCah(e.target.value);else if(e.target.id==='cahimg'){const g=S.imgT,fs=[...e.target.files];e.target.value='';if(g)fs.reduce((p,f)=>p.then(()=>addImgFile(f,g.b,g.i)),Promise.resolve())}else if(e.target.id==='cahf'){const f=e.target.files[0];e.target.value='';impFile(f)}else if(e.target.dataset.ca==='mode'){S.mode=e.target.value;prev()}else if(e.target.matches('select,[type=checkbox],[type=color]')&&!e.target.dataset.ca)onInput(e)});
 el.addEventListener('focusin',e=>{if(e.target.tagName==='TEXTAREA')LAST=e.target});el.addEventListener('mousedown',e=>{if(e.target.closest('.ce-tb button'))e.preventDefault()});
 el.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.target.tagName==='TEXTAREA'&&/^[bu]$/i.test(e.key)){e.preventDefault();LAST=e.target;fmtIns(e.key.toLowerCase())}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('u[role=button]')){e.preventDefault();e.target.click()}
  if(e.key==='Tab'&&!document.querySelector('.mdl')){const F=[...el.querySelectorAll('button:not(:disabled),input:not([type=hidden]),select,textarea,summary,[tabindex="0"]')].filter(x=>x.offsetParent&&!x.closest('details:not([open])>:not(summary)')),a=F[0],z=F[F.length-1];
   if(e.shiftKey&&(e.target===a||!el.contains(e.target))){e.preventDefault();z&&z.focus()}else if(!e.shiftKey&&(e.target===z||!el.contains(e.target))){e.preventDefault();a&&a.focus()}}})}
function onClick(e){const b=e.target.closest('[data-ca]');if(!b||b.disabled)return;const a=b.dataset.ca,id=b.dataset.id;
 if(b.matches('input')){if(a==='tall'){S.scope=b.checked?'all':'chap';prev()}return}
 switch(a){case'close':close();break;case'cnew':newCah();break;case'cdup':dupCah();break;case'cdel':delCah();break;case'cundo':undoDel();break;case'cexp':expCah(false);break;case'cexpall':expCah(true);break;case'cimp':$c('cahf').click();break;
  case'print':window.print();break;case'hundo':hgo(-1);break;case'hredo':hgo(1);break;case'retry':S.dirty.size||(cc()&&S.dirty.add(cc().id));S.ordDirty=true;flush();break;
  case'tab':S.tab=b.dataset.tab;render();break;
  case'chnew':{const c=cc();if(!c)return;if(c.chapitres.length>=LIM.chap)return;const h=mkChap();c.chapitres.push(h);S.chap=h.id;touch({now:1});if(S.tab==='list')S.tab='edit';render();const i=document.querySelector('#cahE [data-ch=nom]');if(i){i.focus();i.select()}break}
  case'chsel':S.chap=id;if(S.tab==='list')S.tab='edit';render();break;case'chup':case'chdn':case'chdup':case'chdel':chAct(a,id);break;
  case'badd':{const h=ch();if(!h||h.blocs.length>=LIM.bloc)return;const k=mkBloc(b.dataset.t);h.blocs.push(k);touch({now:1});render();const n=document.querySelector('.cbk[data-bid="'+k.id+'"]');if(n){n.scrollIntoView({block:'center'});const f=n.querySelector('textarea,input');if(f)f.focus()}break}
  case'bup':case'bdn':case'bdup':case'bdel':blAct(a,id);break;case'fmt':fmtIns(b.dataset.m);break;case'kbd':kbdIns(+b.dataset.i);break;case'imgadd':S.imgT={b:b.dataset.b,i:b.dataset.it||''};$c('cahimg').click();break;case'imgup':case'imgdn':case'imgdel':imgAct(a,b.dataset.b,b.dataset.it||'',id);break;case'exnew':blAct(a,id);break;case'exup':case'exdn':case'exdel':blAct(a,b.dataset.b,id);break;
  case'colreset':{const c=cc();if(c){c.couleurs={...COL};touch({now:1});render()}break}}}
async function open(){build();S.opener=document.activeElement;
 try{if(!S.loaded)await load()}catch(e){S.err=e;await info('Cahier indisponible','<p>Impossible d’ouvrir la base des cahiers : '+esc(errMsg(e))+'.</p><p>Vos préparations ne sont pas concernées.</p>');return}
 S.open=true;const el=$c('cah');el.hidden=false;document.body.classList.add('cah-open');document.querySelectorAll('body>*:not(#cah):not(.mdl):not(script):not(style):not(#toast)').forEach(x=>{if(!x.inert){x.inert=true;x.dataset.cahi='1'}});
 if(!S.hist.length)hreset();render();trashUI();if(S.rep.length){const r=S.rep.slice();S.rep=[];info('Cahiers vérifiés','<ul>'+r.slice(0,8).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>')}
 const f=el.querySelector('#cahbar button');if(f)f.focus()}
function close(){if(!S.open)return;clearTimeout(touch.h);hsnap();S.open=false;flush();$c('cah').hidden=true;document.body.classList.remove('cah-open');document.querySelectorAll('[data-cahi]').forEach(x=>{x.inert=false;delete x.dataset.cahi});try{S.opener&&S.opener.focus&&S.opener.focus()}catch(e){}}
/* raccourcis : dans l'espace cahier, Ctrl+Z/Y, Ctrl+S, Ctrl+K et le collage d'images ne doivent jamais agir sur les préparations */
addEventListener('keydown',e=>{if(!S.open||document.querySelector('.mdl'))return;const k=(e.key||'').toLowerCase(),m=e.ctrlKey||e.metaKey;if(!m)return;
 if(k==='z'||k==='y'){e.stopImmediatePropagation();if(!(e.target.matches&&e.target.matches('textarea,input:not([type=color]):not([type=checkbox])'))){e.preventDefault();hgo(k==='y'||e.shiftKey?1:-1)}}
 else if(k==='s'){e.stopImmediatePropagation();e.preventDefault();flush().then(()=>toast(S.err?'⚠ Échec de l’enregistrement du cahier':'✓ Cahier enregistré'))}
 else if(k==='k'||k==='p'&&false)e.stopImmediatePropagation()},true);
addEventListener('paste',e=>{if(!S.open)return;const f=e.clipboardData&&[...(e.clipboardData.files||[])].some(x=>/^image\//.test(x.type));if(f){e.stopImmediatePropagation();e.preventDefault();const g=imgTarget(document.activeElement);if(g)[...e.clipboardData.files].filter(x=>/^image\//.test(x.type)).forEach(x=>addImgFile(x,g.b,g.i));else toast('Cliquez d’abord dans un bloc pour y coller l’image.')}},true);
addEventListener('beforeprint',()=>{if(!S.open)return;const c=cc();if(c)document.title=(c.nom+(S.scope==='all'?'':' - '+((ch()||{}).nom||''))).replace(/[\\/:*?"<>|]/g,'').slice(0,90)});
addEventListener('beforeunload',()=>{if(S.db&&(S.dirty.size||S.del.size))flush()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-a="cahier"]');if(b){e.preventDefault();open()}});
window.CAH={S,rich,addImgFile,imgList,open,close,flush,cc,ch,normCah,parseImp,reid,T,SCH,FMT,load:()=>load(),render};
})();
