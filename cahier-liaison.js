/* ===================== 📚 Cahier de l'élève — phase 3 : liaison avec les préparations et la banque =====================
   Chargé à la demande par cahier.js. Lit les séquences, séances et la banque d'exercices SANS JAMAIS LES MODIFIER ;
   tout contenu importé est une copie indépendante, ajoutée au chapitre (jamais d'écrasement).
   Seuls les contenus destinés aux élèves sont proposés : jamais les commentaires, analyses didactiques, difficultés, aides, compétences justifiées…
   Réutilise de index.html : db, BK, uid, esc, nmap, modal, info, toast, errMsg, COMP, IMGOK. */
(()=>{'use strict';
const C=window.CAH,A=C.api,T=A.T,LIM=A.LIM,$=id=>document.getElementById(id);
const DL={titre:'Titre du chapitre',ref:'Sous-titre / référence',savoir:'Je dois savoir',faire:'Je dois savoir faire',decouverte:'Activité de découverte',trace:'Trace écrite',exercices:'Exercices',tache:'Tâche complexe',eval:'Évaluation'};
const DIFF={'1':'facile','2':'moyen','3':'difficile'};
const SEQ=()=>db.seqs||[],SEA=q=>(db.seances||[]).filter(s=>s.seq===q.id).sort((a,b)=>(+a.numero||0)-(+b.numero||0));
const tx=(v,n)=>typeof v==='string'?v.slice(0,n||1e5):'';
const hash=s=>{let h=5381;for(const c of String(s||''))h=((h<<5)+h+c.charCodeAt(0))>>>0;return h.toString(36)};
const nrm=s=>nmap(s).n;
/* ---------- extraction ---------- */
/* sépare l'énoncé des corrigés : lignes « → Correction : … » (et leurs suites) jusqu'à la question suivante, un sous-titre ou du gras ; chaque corrigé reprend le numéro de sa question */
function splitCorr(t){const L=String(t||'').replace(/\r/g,'').split('\n'),E=[],K=[],START=/^\s*[-•]?\s*(→|->)?\s*Correction\b/i,STOP=/^\s*(\d+[.)]\s|##\s|\*\*)/,Q=/^\s*(\d+)[.)]\s/;let skip=false,q='',cur=null;
 for(const l of L){
  if(START.test(l)){skip=true;cur=[l.replace(/^\s*[-•]?\s*(→|->)?\s*Correction\s*(?:de la question\s*\d+\s*)?[:.]?\s*/i,'')];K.push({q,l:cur});continue}
  if(skip&&STOP.test(l))skip=false;
  if(skip){cur.push(l);continue}
  const m=Q.exec(l);if(m)q=m[1];E.push(l)}
 const corr=K.map(b=>{const body=b.l.join('\n').trim();return body?(b.q?b.q+'. '+body:body):''}).filter(Boolean).join('\n');
 return{enonce:E.join('\n').replace(/\n{3,}/g,'\n\n').trim(),corrige:corr}}
const objGen=cadre=>{const m=/^##[ \t]*Objectifs g[ée]n[ée]raux[^\n]*\n([\s\S]*?)(?=\n##[ \t]|(?![\s\S]))/mi.exec(String(cadre||''));return m?m[1].trim():''};
const cpImgs=a=>(Array.isArray(a)?a:[]).map(m=>typeof m==='string'?{u:m,w:100,a:'c',l:''}:m).filter(m=>m&&typeof m.u==='string'&&m.u&&IMGOK(m.u)).slice(0,LIM.img).map(m=>({id:uid(),u:m.u,w:[25,50,75,100].includes(+m.w)?+m.w:100,a:m.a==='r'?'r':'c',l:tx(m.l,300)}));
const isDefName=n=>!String(n||'').trim()||/^(Nouveau chapitre|Chapitre \d+)$/.test(String(n).trim());
const skey=s=>s?[s.t,s.q,s.s,s.f,s.bi].join('|'):'';
function existing(ch){const S=new Set();ch.blocs.forEach(b=>{if(b.src)S.add(skey(b.src));(b.items||[]).forEach(x=>{if(x.src)S.add(skey(x.src))})});return S}
/* candidats proposés pour une séquence : { key, grp, label, kind, dest, opts, titre, texte, corr, imgs, comp, def, src } */
function candsSeq(q,ch){const out=[],ss=SEA(q),ss0=f=>({t:'sequence',q:q.id,s:'',f,bi:'',h:'',at:'',n:''});
 const add=o=>{o.texte=tx(o.texte,LIM.text);if(o.texte&&o.texte.trim()||(o.imgs&&o.imgs.length))out.push(Object.assign({titre:'',corr:null,imgs:[],comp:[],niveau:'',def:true,opts:[o.dest]},o))};
 add({key:'q:nom',grp:'chap',label:'Nom de la séquence → titre du chapitre',kind:'titre',dest:'titre',texte:q.nom,def:isDefName(ch.nom)});
 add({key:'q:ref',grp:'chap',label:'Référence du B.O. → sous-titre du chapitre',kind:'ref',dest:'ref',texte:q.boRef,def:!String(ch.ref||'').trim()});
 add({key:'q:bo',grp:'att',label:'Contenus du B.O.',kind:'att',dest:'savoir',opts:['savoir','faire'],texte:q.bo,src:ss0('bo')});
 add({key:'q:cap',grp:'att',label:'Capacités attendues',kind:'att',dest:'faire',opts:['faire','savoir'],texte:q.capacites,src:ss0('cap')});
 add({key:'q:og',grp:'att',label:'Objectifs généraux de la séquence',kind:'att',dest:'faire',opts:['faire','savoir'],texte:objGen(q.cadre),src:ss0('og')});
 ss.forEach(s=>{const g=s.id,tg=String(s.tags||''),ev=s.type==='eval',pb=/probl[eè]me|t[aâ]che complexe/i.test(tg),im=z=>cpImgs((s.imgs||[]).map(m=>typeof m==='string'?{u:m,z:'c'}:m).filter(m=>(m.z||'c')===z)),sr=f=>({t:'seance',q:q.id,s:s.id,f,bi:'',h:'',at:'',n:''});
  add({key:'s:'+g+':obj',grp:g,label:'Objectif(s) de la séance',kind:'att',dest:'faire',opts:['faire','savoir'],texte:s.objectifs,def:false,src:sr('obj')});
  add({key:'s:'+g+':act',grp:g,label:(ev?'Évaluation':pb?'Tâche complexe':'Activité')+(s.activiteTitre?' : « '+s.activiteTitre+' »':''),kind:'bloc',dest:ev?'eval':pb?'tache':'decouverte',opts:['decouverte','tache','eval','exercices','trace'],titre:s.activiteTitre||'',texte:s.activite,imgs:im('a'),comp:s.comp||[],src:sr('act')});
  add({key:'s:'+g+':tr',grp:g,label:'Trace écrite (cours)',kind:'bloc',dest:'trace',opts:['trace','decouverte','exercices'],texte:s.trace,imgs:im('t'),def:!ev,src:sr('trace')});
  add({key:'s:'+g+':sup',grp:g,label:'Problème supplémentaire (élèves rapides)',kind:'bloc',dest:'exercices',opts:['exercices','tache','decouverte'],titre:'Pour aller plus loin',texte:s.supp,def:false,src:sr('supp')})});
 return out}
function candsBank(){return BK().map(x=>{const ty=x.type,d={probleme:'tache',decouverte:'decouverte',trace:'trace',exemple:'trace'}[ty]||'exercices';
 return{key:'b:'+x.id,grp:'bank',label:x.titre||'(sans titre)',kind:'bloc',dest:d,opts:['exercices','decouverte','tache','trace','eval'],titre:tx(x.titre,200),texte:tx(x.enonce,LIM.text),corr:tx(x.correction,LIM.text),imgs:cpImgs(x.img?[{u:x.img}]:[]),comp:Array.isArray(x.comp)?x.comp:[],niveau:DIFF[String(x.diff)]||'',def:false,x,src:{t:'banque',q:'',s:'',f:'',bi:x.id,h:'',at:'',n:tx([x.notions,x.domaine].filter(Boolean).join(' · '),200)}}}).filter(k=>k.texte.trim()||k.imgs.length)}
/* ---------- application : copies indépendantes, ajoutées au chapitre ---------- */
const lineKey=l=>nrm(String(l).replace(/^\s*[-•]\s*/,'').trim());
function mergeAtt(ch,field,text,R){let b=ch.blocs.find(x=>x.type==='attendus');if(!b){b=A.mkBloc('attendus');T.attendus.f.forEach(([k])=>b.v[k]='');ch.blocs.unshift(b);R.blocs++}
 const cur=String(b.v[field]||'').split('\n').filter(l=>l.trim()),seen=new Set(cur.map(lineKey)),add=[];
 String(text||'').split('\n').map(l=>l.trim()).filter(Boolean).forEach(l=>{const k=lineKey(l);if(seen.has(k)){R.skipped++;return}seen.add(k);add.push(/^(-|•|##)\s/.test(l)?l:'- '+l)});
 if(add.length){b.v[field]=cur.concat(add).join('\n').slice(0,LIM.text);R.lines+=add.length}}
function apply(ch,sel,opt){opt=opt||{};const R={blocs:0,items:0,lines:0,skipped:0,titre:false,ref:false},now=new Date().toISOString();
 for(const{k,dest}of sel){
  if(k.kind==='titre'){ch.nom=tx(k.texte,200);R.titre=true;continue}
  if(k.kind==='ref'){ch.ref=tx(k.texte,300);R.ref=true;continue}
  if(k.kind==='att'){mergeAtt(ch,dest==='savoir'?'savoir':'faire',k.texte,R);continue}
  const sp=k.corr!=null?{enonce:tx(k.texte),corrige:tx(k.corr)}:opt.split===false?{enonce:tx(k.texte),corrige:''}:splitCorr(k.texte),src=Object.assign({},k.src,{h:hash(k.texte+'\u0001'+(k.corr||'')),at:now});
  if(dest==='exercices'){let b=opt.target&&ch.blocs.find(x=>x.id===opt.target&&x.type==='exercices')||[...ch.blocs].reverse().find(x=>x.type==='exercices');
   if(!b){b=A.mkBloc('exercices');b.items=[];ch.blocs.push(b);R.blocs++}
   if(b.items.length===1&&!b.items[0].enonce&&!b.items[0].titre&&!b.items[0].corrige&&!b.items[0].imgs.length&&!b.items[0].src)b.items=[];
   if(b.items.length>=LIM.item)continue;const it=A.mkEx();it.titre=tx(k.titre,200);it.enonce=sp.enonce;it.corrige=sp.corrige;it.niveau=k.niveau||'';it.imgs=cpImgs(k.imgs);it.src=src;b.items.push(it);R.items++;continue}
  if(ch.blocs.length>=LIM.bloc)continue;const b=A.mkBloc(dest);T[dest].f.forEach(([f])=>b.v[f]='');b.titre=tx(k.titre,200);
  b.v.texte=dest==='trace'?(sp.enonce+(sp.corrige?'\n\n'+sp.corrige:'')).trim():sp.enonce;if(dest!=='trace'&&T[dest].corr)b.corr.texte=sp.corrige;else if(dest==='decouverte'||dest==='tache'||dest==='eval')b.corr.texte=sp.corrige;
  if(T[dest].comp)b.comp=COMP.filter(c=>(k.comp||[]).includes(c));b.imgs=cpImgs(k.imgs);b.src=src;ch.blocs.push(b);R.blocs++}
 return R}
/* ---------- interface ---------- */
let CSSOK=false;const css=()=>{if(CSSOK)return;CSSOK=true;const s=document.createElement('style');s.id='cahlkcss';s.textContent=`.lk fieldset{border:1px solid var(--line);border-radius:6px;margin:8px 0;padding:4px 10px}.lk legend{font-weight:700;color:var(--acc);padding:0 4px}.lk-r{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;padding:5px 0;border-bottom:1px solid #eef1f3}.lk-r:last-child{border:0}.lk-r label{font-weight:400;display:inline-flex;gap:6px;align-items:center;margin:0}.lk-r select{width:auto;margin:0}.lk-r input[type=checkbox]{width:auto;margin:0}.lk-dup{color:#8a5a00;font-size:12px}.lk-t{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}.lk-r details{flex:1 1 100%;margin:2px 0;padding:0 8px}.lk-r summary{padding:3px 0;font-size:12px;border:0}.lk-r details[open]>summary{margin-bottom:4px}.lk-t label{display:inline-flex;gap:6px;align-items:center;font-weight:400;margin:0}.lk-t input{width:auto;margin:0}.lk-p{max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:4px;padding:6px 10px;background:#fff;color:#222;font:10pt/1.4 Calibri,Carlito,"Segoe UI",Arial,sans-serif}.lk-p img{max-width:160px;height:auto;display:block}.lk-p h5{margin:6px 0 2px;color:#4a5a73}.lk-n{margin-left:auto;font-weight:700}.lk-s{margin:6px 0}.lk-s input{width:100%}@media(max-width:700px){.lk-t button,.lk-r select,.lk-t label{min-height:40px}.lk-r label{min-height:36px}.lk-r summary{min-height:36px;display:flex;align-items:center}.lk input[type=checkbox]{width:22px;height:22px}}`;document.head.append(s)};
const fdate=d=>d?new Date(d+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}):'';
function prevHTML(k,dest,split){const sp=k.corr!=null?{enonce:k.texte,corrige:k.corr}:split?splitCorr(k.texte):{enonce:k.texte,corrige:''};let h='';
 if(k.kind!=='bloc')return '<div class="lk-p">'+A.rich(k.texte)+'</div>';
 h+=A.rich(sp.enonce);if(k.imgs.length)h+=k.imgs.map(m=>'<img src="'+m.u+'" alt="Image de la source">').join('');if(sp.corrige)h+='<h5>Corrigé (séparé de l’énoncé)</h5>'+A.rich(sp.corrige);
 return '<div class="lk-p">'+(h||'<i>(vide)</i>')+'</div>'}
function rows(list,ex){return list.map(k=>{const dup=k.src&&k.kind==='bloc'&&ex.has(skey(k.src)),chk=k.def&&!dup,sel=k.opts.length>1?'<label>vers <select data-d="'+esc(k.key)+'" aria-label="Destination : '+esc(k.label)+'">'+k.opts.map(o=>'<option value="'+o+'"'+(o===k.dest?' selected':'')+'>'+DL[o]+'</option>').join('')+'</select></label>':'<span>→ '+DL[k.dest]+'</span>';
 return '<div class="lk-r" data-row="'+esc(k.key)+'"><label><input type="checkbox" data-k="'+esc(k.key)+'"'+(chk?' checked':'')+'> '+esc(k.label)+'</label>'+sel+(dup?' <span class="lk-dup">⚠ déjà importé dans ce chapitre (décoché)</span>':'')+'<details><summary>Aperçu</summary><div data-pv="'+esc(k.key)+'"></div></details></div>'}).join('')}
/* fenêtre de sélection générique : liste de candidats groupés → renvoie la sélection (ou null) */
async function selectDialog(title,head,groups,list,ex,o){css();o=o||{};let el=null;const by=new Map(list.map(k=>[k.key,k]));
 const html='<div class="lk">'+head+(o.filters||'')+'<div class="lk-t"><button type="button" class="btn" data-lk="all">Tout sélectionner</button><button type="button" class="btn" data-lk="none">Tout désélectionner</button>'+(o.split===false?'':'<label><input type="checkbox" id="lksplit" checked> Séparer les corrigés (lignes « → Correction »)</label>')+'<span class="lk-n" id="lkn" role="status" aria-live="polite"></span></div>'+groups.map(g=>'<fieldset><legend>'+esc(g.t)+'</legend>'+rows(g.l,ex)+'</fieldset>').join('')+'</div>';
 const upd=()=>{const n=el.querySelectorAll('[data-k]:checked').length,b=el.querySelector('.mda .pri');$('lkn').textContent=n+' élément'+(n>1?'s':'')+' sélectionné'+(n>1?'s':'');if(b)b.disabled=!n},
  fillPv=x=>{const k=by.get(x.dataset.pv),s=el.querySelector('select[data-d="'+CSS.escape(k.key)+'"]'),sp=!el.querySelector('#lksplit')||el.querySelector('#lksplit').checked;x.dataset.ok=1;x.innerHTML=prevHTML(k,s?s.value:k.dest,sp);if(window.renderMathInElement)try{renderMathInElement(x,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false})}catch(_){}},
  pv=()=>el.querySelectorAll('[data-pv][data-ok]').forEach(fillPv);
 const c=await modal(title,html,[['cancel','Annuler'],['go',o.go||'Importer la sélection','pri']],{esc:'cancel',init:(e)=>{el=e;
  e.addEventListener('click',ev=>{const b=ev.target.closest('[data-lk]');if(!b)return;e.querySelectorAll('[data-k]').forEach(x=>{if(x.closest('.lk-r').style.display!=='none')x.checked=b.dataset.lk==='all'});upd()});
  e.addEventListener('change',ev=>{if(ev.target.matches('[data-k]'))upd();if(ev.target.matches('#lksplit,[data-d]'))pv()});
  e.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open){const x=d.querySelector('[data-pv]');if(x&&!x.dataset.ok)fillPv(x)}}));
  if(o.init)o.init(e,upd);upd()}});
 if(c!=='go')return null;const split=!el.querySelector('#lksplit')||el.querySelector('#lksplit').checked,sel=[];
 el.querySelectorAll('[data-k]:checked').forEach(x=>{const k=by.get(x.dataset.k),s=el.querySelector('select[data-d="'+CSS.escape(x.dataset.k)+'"]');if(k)sel.push({k,dest:s?s.value:k.dest})});return{sel,split}}
function report(R){const p=[];if(R.titre)p.push('titre du chapitre');if(R.blocs)p.push(R.blocs+' bloc'+(R.blocs>1?'s':''));if(R.items)p.push(R.items+' exercice'+(R.items>1?'s':''));if(R.lines)p.push(R.lines+' ligne'+(R.lines>1?'s':'')+' d’attendus');return(p.join(', ')||'rien de nouveau')+(R.skipped?' · '+R.skipped+' ligne(s) déjà présente(s) ignorée(s)':'')}
async function finish(ch,res,tag){const R=apply(ch,res.sel,{split:res.split,target:tag&&tag.target});A.touch({now:1});A.render();toast('Ajouté : '+report(R));return R}
/* ---------- importer depuis une séquence ---------- */
async function importFrom(ch,qid){if(!ch)return;const q=SEQ().find(x=>x.id===qid);if(!q){await info('Séquence introuvable','<p>Cette séquence n’existe plus. Vous pouvez la dissocier du chapitre.</p>');return null}
 const list=candsSeq(q,ch);if(!list.length){await info('Rien à importer','<p>La séquence « '+esc(q.nom)+' » ne contient pas encore de contenu à importer (B.O., activités, traces écrites…).</p>');return null}
 const ex=existing(ch),ss=SEA(q),g=[{t:'Chapitre',l:list.filter(k=>k.grp==='chap')},{t:'Attendus du chapitre',l:list.filter(k=>k.grp==='att')}].concat(ss.map(s=>({t:'S'+s.numero+' – '+(s.nom||'(sans nom)')+(s.type==='eval'?' (évaluation)':''),l:list.filter(k=>k.grp===s.id)}))).filter(x=>x.l.length);
 const head='<p><b>'+esc(q.nom||'(sans nom)')+'</b>'+(q.niveau||q.classe?' · '+esc([q.niveau,q.classe].filter(Boolean).join(' · ')):'')+' · '+ss.length+' séance'+(ss.length>1?'s':'')+'</p><p><small>Ces contenus sont <b>copiés</b> dans le chapitre « '+esc(ch.nom)+' » : modifier la préparation ensuite ne change pas le cahier, et inversement. Rien n’est écrasé. Les commentaires, analyses didactiques, difficultés et aides ne sont jamais proposés.</small></p>';
 const res=await selectDialog('Importer depuis la séquence',head,g,list,ex,{go:'Importer la sélection'});if(!res)return null;return finish(ch,res)}
/* ---------- associer une séquence ---------- */
async function pick(ch,o){o=o||{};const c=A.cc();if(!c){await info('Aucun cahier','<p>Créez d’abord un cahier.</p>');return null}const qs=SEQ();if(!qs.length){await info('Aucune séquence','<p>Vous n’avez pas encore de séquence à associer. Créez-en une dans l’espace de préparation.</p>');return null}
 css();const sel=new Set(ch?ch.seqIds:[]),info1=q=>{const ss=SEA(q),ds=ss.map(s=>s.date).filter(Boolean).sort();return ss.length+' séance'+(ss.length>1?'s':'')+(ds.length?' · '+fdate(ds[0])+(ds.length>1?' → '+fdate(ds[ds.length-1]):''):'')};
 const html='<div class="lk"><p><small>'+(o.create?'Choisissez la ou les séquences du nouveau chapitre.':'Une séquence peut alimenter plusieurs chapitres, et un chapitre peut regrouper plusieurs séquences. L’association ne copie rien : elle propose ensuite des contenus à importer.')+'</small></p><div class="lk-s"><label>Rechercher une séquence<input id="lkq" placeholder="Nom, niveau, classe…" autocomplete="off"></label></div>'+qs.map(q=>'<div class="lk-r" data-q="'+esc(q.id)+'" data-s="'+esc(nrm([q.nom,q.niveau,q.classe].join(' ')))+'"><label><input type="checkbox" data-q="'+esc(q.id)+'"'+(sel.has(q.id)?' checked':'')+'> <b>'+esc(q.nom||'(sans nom)')+'</b></label><small>'+esc([q.niveau,q.classe].filter(Boolean).join(' · '))+(q.niveau||q.classe?' · ':'')+esc(info1(q))+'</small></div>').join('')+'<p class="lk-n" id="lkn" role="status" aria-live="polite"></p></div>';
 let el=null;const c2=await modal(o.create?'Nouveau chapitre depuis une séquence':'Associer une séquence',html,[['cancel','Annuler'],['go',o.create?'Créer le chapitre':'Associer'],['imp',o.create?'Créer et importer des contenus…':'Associer et importer…','pri']],{esc:'cancel',init:e=>{el=e;const upd=()=>{const n=e.querySelectorAll('[data-q]:checked').length;$('lkn').textContent=n+' séquence'+(n>1?'s':'')+' sélectionnée'+(n>1?'s':'');const B=e.querySelectorAll('.mda button');if(B[1]&&o.create)B[1].disabled=!n;if(B[2])B[2].disabled=!n};
  e.addEventListener('change',ev=>{if(ev.target.matches('input[data-q]'))upd()});e.querySelector('#lkq').addEventListener('input',ev=>{const w=nrm(ev.target.value).split(/\s+/).filter(Boolean);e.querySelectorAll('.lk-r[data-s]').forEach(r=>{r.style.display=w.every(x=>r.dataset.s.includes(x))?'':'none'})});upd()}});
 if(c2==='cancel'||!c2)return null;const ids=[...el.querySelectorAll('input[data-q]:checked')].map(x=>x.dataset.q);
 if(o.create){if(!ids.length)return null;const q=SEQ().find(x=>x.id===ids[0]),h=A.mkChap(q?q.nom:'Nouveau chapitre');h.seqIds=ids.slice(0,50);c.chapitres.push(h);C.S.chap=h.id;A.touch({now:1});A.render();if(c2==='imp')return importFrom(h,ids[0]);return h}
 const keep=ch.seqIds.filter(id=>!qs.some(q=>q.id===id)),before=new Set(ch.seqIds);ch.seqIds=keep.concat(ids).slice(0,50);A.touch({now:1});A.render();
 if(c2==='imp'&&ids.length){const f=ids.find(id=>!before.has(id))||ids[0];return importFrom(ch,f)}return ch}
const newFromSeq=()=>pick(null,{create:true});
/* ---------- insérer depuis la banque d'exercices ---------- */
async function bank(ch,target){if(!ch)return;const all=candsBank();if(!BK().length){await info('Banque vide','<p>La banque d’exercices est vide. Ouvrez-la depuis le menu « 📚 Banque d’exercices… » de l’espace de préparation pour y enregistrer des exercices.</p>');return null}
 if(!all.length){await info('Rien à insérer','<p>Les éléments de la banque n’ont ni énoncé ni image.</p>');return null}
 const ex=existing(ch),types=[...new Set(BK().map(x=>x.type))],nivs=[...new Set(BK().map(x=>x.niveau).filter(Boolean))].sort(),
  cap=all.slice().sort((a,b)=>(b.x.fav?1:0)-(a.x.fav?1:0)||a.label.localeCompare(b.label,'fr')).slice(0,300);
 const filt='<div class="lk-s"><label>Rechercher<input id="lkq" placeholder="Titre, notion, mot-clé…" autocomplete="off"></label></div><div class="lk-t"><label>Type<select id="lkt"><option value="">Tous</option>'+types.map(t=>'<option value="'+esc(t)+'">'+esc(BK_T[t]||t)+'</option>').join('')+'</select></label><label>Niveau<select id="lkv"><option value="">Tous</option>'+nivs.map(n=>'<option>'+esc(n)+'</option>').join('')+'</select></label></div>'+(all.length>cap.length?'<p><small>'+all.length+' éléments : les 300 premiers sont affichés, affinez la recherche.</small></p>':'');
 const head='<p><small>Les éléments sélectionnés sont <b>copiés</b> (énoncé, correction, image, niveau de difficulté) : la banque n’est pas modifiée. Ils sont ajoutés à l’exercice du chapitre « '+esc(ch.nom)+' » (un bloc Exercices est créé si besoin).</small></p>';
 const meta=new Map(cap.map(k=>[k.key,k]));
 const res=await selectDialog('Insérer depuis la banque d’exercices',head,[{t:'Banque d’exercices ('+cap.length+')',l:cap}],cap,ex,{go:'Insérer la sélection',filters:filt,split:false,init:(e,upd)=>{
  const f=()=>{const w=nrm(e.querySelector('#lkq').value).split(/\s+/).filter(Boolean),t=e.querySelector('#lkt').value,v=e.querySelector('#lkv').value;e.querySelectorAll('.lk-r[data-row]').forEach(r=>{const k=meta.get(r.dataset.row),x=k.x,ok=(!t||x.type===t)&&(!v||x.niveau===v)&&w.every(m=>nrm([x.titre,x.enonce,x.correction,x.notions,x.mots,x.domaine,x.source].join(' ')).includes(m));r.style.display=ok?'':'none'})};
  e.querySelector('#lkq').addEventListener('input',f);e.querySelector('#lkt').addEventListener('change',f);e.querySelector('#lkv').addEventListener('change',f)}});
 if(!res)return null;return finish(ch,res,{target})}
window.CAHL={pick,importFrom,newFromSeq,bank,splitCorr,objGen,candsSeq,candsBank,apply,mergeAtt,hash,skey};
})();
