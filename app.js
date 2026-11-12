// Planning Famille — appli autonome reliée à l'appli Courses (même projet Firebase).
// Collections propres au planning : famille, activites, taches.
// Collections partagées avec Courses : menus, plats (lecture), courses (liste de courses).
(function(){
"use strict";

/* ---------- utilitaires ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseYmd=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c)};
const toMin=t=>{const[h,m]=(t||"0:0").split(":").map(Number);return h*60+(m||0)};
const fmtDur=m=>{const h=Math.floor(m/60),r=Math.round(m%60);return h+"h"+(r?pad(r):"")};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const monday=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());return addDays(x,-((x.getDay()+6)%7))};
const dowOf=d=>(d.getDay()+6)%7;
const JOURS=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const J1=["L","M","M","J","V","S","D"];
const MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const MOISL=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const COLORS=["sun","rose","violet","sky","mint","coral"];
const BAR={sun:"#ff8a3d",rose:"#ff4f86",violet:"#7445ff",sky:"#2f7cf6",mint:"#0f9f78",coral:"#e5484d"};
const H0=7,H1=22; // plage horaire affichée
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const hm=m=>pad(Math.floor(m/60))+":"+pad(m%60);
const plural=(n,w)=>`${n} ${w}${n>1?"s":""}`;

/* ---------- mêmes règles que l'appli Courses (articles et ingrédients) ---------- */
const keyOf=s=>String(s).toLowerCase().replace(/œ/g,"oe").replace(/æ/g,"ae").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"article";
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):"";
const Q=i=>Math.max(1,i.qty||1);
function parseEntry(raw){
  let s=String(raw||"").trim();
  if(!s) return {nom:"",qty:1,val:0,unit:"",detail:""};
  let m=s.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|kg|ml|cl|l|c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|sachet|sachets|boîte|boîtes|boite|boites|tranche|tranches|pot|pots|pincée|pincées|gousse|gousses)\s+(?:de\s+|d['’]\s*)?(.+)$/i);
  if(m){const val=parseFloat(m[1].replace(",",".")),u=m[2].toLowerCase().replace(/^gr$/,"g");return {nom:cap(m[3].trim()),qty:1,val,unit:u,detail:`${String(val).replace(".",",")} ${u}`}}
  let q=1;
  m=s.match(/^(\d{1,2})\s*[x×]?\s+(?:de\s+|d['’]\s*)?(.+)$/i);
  if(m){q=+m[1];s=m[2]}else if((m=s.match(/^(.+?)\s*[x×]\s*(\d{1,2})$/i))){s=m[1];q=+m[2]}
  const qty=Math.max(1,Math.min(99,q||1));
  return {nom:cap(s.trim()),qty,val:qty,unit:"",detail:""};
}
function formatMeasure(val,unit){
  if(!val) return "";
  let v=val,u=unit;
  if(u==="g"&&v>=1000){v=+(v/1000).toFixed(2);u="kg"}else if(u==="ml"&&v>=100){v=+(v/10).toFixed(1);u="cl"}else v=+v.toFixed(1);
  const str=String(v).replace(".",",");
  return u?`${str} ${u}`:`×${str}`;
}
function guessEmoji(nom){
  const k=keyOf(nom);
  if(/pate|spaghetti|tagliatelle|lasagne|coquillette|penne/.test(k))return "🍝";
  if(/poulet|escalope|dinde/.test(k))return "🍗";
  if(/saumon|poisson|cabillaud|thon|crevette/.test(k))return "🐟";
  if(/soupe|veloute|potage/.test(k))return "🥣";
  if(/omelette|oeuf|quiche/.test(k))return "🍳";
  if(/pizza|tarte/.test(k))return "🍕";
  if(/curry|riz|risotto/.test(k))return "🍛";
  if(/salade|bowl/.test(k))return "🥗";
  if(/gratin|hachis|four/.test(k))return "🥘";
  return "🍽️";
}

const ICON={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h9"/></svg>',
  fam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M17 14.5a5 5 0 0 1 4.5 5"/></svg>',
  meal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18"/><path d="M18 21V3c-2.5 1.5-4 4-4 8h4"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>',
  rep:'<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  pin:'<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
};
const VIEWS=[{id:"accueil",t:"Tableau de bord",n:"Accueil",i:"home"},{id:"agenda",t:"Agenda de la semaine",n:"Agenda",i:"cal"},{id:"repas",t:"Repas et courses",n:"Repas",i:"meal"},{id:"taches",t:"Tâches de la maison",n:"Tâches",i:"task"},{id:"famille",t:"La famille",n:"Famille",i:"fam"}];

/* ---------- Firebase ---------- */
const cfg=window.FIREBASE_CONFIG||{};
if(!window.firebase||!cfg.apiKey||cfg.apiKey.startsWith("COLLE")){$("#configMsg").hidden=false;throw new Error("configuration Firebase manquante")}
firebase.initializeApp(cfg);
const auth=firebase.auth(),fs=firebase.firestore();
fs.enablePersistence({synchronizeTabs:true}).catch(()=>{});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});

const COL={members:"famille",events:"activites",tasks:"taches"};
let S={members:[],events:[],tasks:[],plats:[],menus:{},courses:[]};
let view="accueil",weekStart=monday(new Date()),dayIdx=dowOf(new Date()),chartWho=0;
const live=()=>S.members.length>0;

function fail(what){return e=>{
  if(e&&e.code==="permission-denied")setStatus("Accès refusé : ajoute les collections « famille », « activites » et « taches » dans les règles Firestore (voir le README).");
  else toast(what+" impossible, réessaie");
}}
function write(col,id,obj){ // obj null = suppression
  const ref=fs.collection(COL[col]||col).doc(id);
  (obj?ref.set(obj):ref.delete()).catch(fail("Enregistrement"));
}
function setStatus(t){const el=$("#status");el.hidden=!t;el.textContent=t||""}

/* ---------- connexion ---------- */
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const msg=$("#loginMsg");msg.textContent="Connexion…";
  try{await auth.signInWithEmailAndPassword($("#email").value.trim(),$("#pwd").value);msg.textContent=""}
  catch(err){msg.textContent=/invalid|wrong|not-found|credential/.test(err.code||"")?"E-mail ou mot de passe incorrect.":"Connexion impossible : "+(err.message||err.code)}
});
let unsub=[];
auth.onAuthStateChanged(u=>{
  unsub.forEach(f=>f());unsub=[];
  $("#loginView").hidden=!!u;$("#appView").hidden=!u;
  if(u)start();
});
function start(){
  setStatus("Chargement…");
  let ready=0;const done=()=>{if(++ready===6)setStatus("")};
  const err=e=>setStatus(e.code==="permission-denied"
    ?"Accès refusé : ajoute les collections « famille », « activites » et « taches » dans les règles Firestore (voir le README)."
    :"Données indisponibles : "+(e.message||e.code));
  const list=s=>s.docs.map(d=>({...d.data(),id:d.id}));
  const sub=(col,fn)=>{let first=true;unsub.push(fs.collection(col).onSnapshot(s=>{fn(s);if(first){first=false;done()}schedule()},err))};
  sub("famille",s=>S.members=list(s));
  sub("activites",s=>S.events=list(s));
  sub("taches",s=>S.tasks=list(s));
  sub("plats",s=>S.plats=list(s).filter(p=>!/jambon|lardon/i.test((p.nom||"")+" "+(p.ingredients||[]).join(" "))).map(p=>({...p,emoji:p.emoji||guessEmoji(p.nom||""),portions:p.portions||4})));
  sub("menus",s=>S.menus=Object.fromEntries(s.docs.map(d=>[d.id,d.data()])));
  sub("courses",s=>S.courses=list(s));
  render();
}
let rq=0;function schedule(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;if(!$("#layer").innerHTML)render()})}

/* ---------- navigation ---------- */
function navHtml(cls){return VIEWS.map(v=>`<button class="${cls}" data-view="${v.id}" ${v.id===view?'aria-current="page"':""}>${ICON[v.i]}<span>${v.n}</span></button>`).join("")}
function go(v){view=v;try{history.replaceState(null,"","#"+v)}catch(e){location.hash=v}render();window.scrollTo(0,0)}
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(VIEWS.some(v=>v.id===h)&&h!==view){view=h;render()}});

/* ---------- aides d'affichage ---------- */
const memberById=id=>S.members.find(m=>m.id===id);
const av=(m,cls="")=>m?`<span class="av c-${esc(m.color)} ${cls}" title="${esc(m.name)}">${esc((m.name||"?").slice(0,1).toUpperCase())}</span>`:"";
function stack(ids,max=3){const ms=ids.map(memberById).filter(Boolean);return `<span class="stack">${ms.slice(0,max).map(m=>av(m)).join("")}${ms.length>max?`<span class="more">+${ms.length-max}</span>`:""}</span>`}
const evColor=ev=>{const m=memberById(ev.members[0]);return m?m.color:"sky"};
const weekDates=()=>Array.from({length:7},(_,i)=>addDays(weekStart,i));
const now=()=>new Date();

/* activités : uniques ou répétées chaque semaine (jours choisis, date de fin facultative, jours annulés) */
function occurs(e,d){const s=ymd(d);
  if(e.repeat==="weekly"){if(s<e.date||(e.until&&s>e.until)||(e.skip||[]).includes(s))return false;
    return (e.days&&e.days.length?e.days:[dowOf(parseYmd(e.date))]).includes(dowOf(d))}
  return e.date===s}
const eventsOn=d=>{const s=ymd(d);return S.events.filter(e=>e.date&&occurs(e,d)).map(e=>({...e,date:s,members:e.members||[]})).sort((a,b)=>toMin(a.start)-toMin(b.start))};
function evProgress(ev){const n=now(),d=ymd(n);if(ev.date<d)return 100;if(ev.date>d)return 0;const m=n.getHours()*60+n.getMinutes(),s=toMin(ev.start),en=toMin(ev.end);return Math.max(0,Math.min(100,(m-s)/(en-s)*100))}

/* ---------- agenda ---------- */
function lanes(evs){ // place côte à côte les activités qui se chevauchent
  const out=[];let group=[],gEnd=-1;
  const flush=()=>{const cols=[];group.forEach(ev=>{let c=cols.findIndex(end=>end<=toMin(ev.start));if(c<0){c=cols.length;cols.push(0)}cols[c]=toMin(ev.end);ev._c=c});group.forEach(ev=>{ev._n=cols.length;out.push(ev)});group=[];gEnd=-1};
  evs.forEach(ev=>{if(group.length&&toMin(ev.start)>=gEnd)flush();group.push(ev);gEnd=Math.max(gEnd,toMin(ev.end))});flush();return out;
}
function evHtml(ev,ph,mini){
  const top=(toMin(ev.start)-H0*60)/60*ph,h=Math.max(28,(toMin(ev.end)-toMin(ev.start))/60*ph-4);
  const w=100/ev._n,l=ev._c*w,gap=mini?1:3;
  if(mini)return `<button class="ev evm c-${esc(evColor(ev))}" data-ev="${esc(ev.id)}" data-date="${ev.date}" title="${esc(ev.start)} – ${esc(ev.end)} · ${esc(ev.title)}" style="top:${top+1}px;height:${h}px;left:calc(${l}% + ${gap}px);width:calc(${w}% - ${gap*2}px);--prog:${evProgress(ev)}%"><span class="ti">${esc(ev.title)}</span></button>`;
  return `<button class="ev c-${esc(evColor(ev))} ${h<54?"short":""}" data-ev="${esc(ev.id)}" data-date="${ev.date}" title="${esc(ev.start)} – ${esc(ev.end)} · ${esc(ev.title)}" style="top:${top+2}px;height:${h}px;left:calc(${l}% + 3px);width:calc(${w}% - 6px);--prog:${evProgress(ev)}%">
    ${h>=54?`<span class="tm">${ICON.pin}${esc(ev.start)}${ev.repeat==="weekly"?'<span class="rep" title="Chaque semaine">'+ICON.rep+"</span>":""} ${stack(ev.members,3)}</span><span class="ti">${esc(ev.title)}</span>`:`<span class="ti">${esc(ev.title)}</span>`}</button>`;
}
function hoursCol(ph,mini){let s="";for(let h=H0;h<=H1;h++)s+=`<span class="hl num" style="top:${(h-H0)*ph}px">${mini?h+"h":pad(h)+":00"}</span>`;return s}
function gridLines(ph){let s="";for(let h=H0;h<=H1;h++)s+=`<i class="gridline" style="top:${(h-H0)*ph}px"></i>`;return s}
function nowTop(ph){const n=now(),m=n.getHours()*60+n.getMinutes();return m<H0*60||m>H1*60?null:(m-H0*60)/60*ph}
function weekCal(ph,mini){
  const ds=weekDates(),today=ymd(now()),H=(H1-H0)*ph,nt=ds.some(d=>ymd(d)===today)?nowTop(ph):null;
  const head=`<div></div>`+ds.map((d,i)=>mini
    ?`<button class="dh ${ymd(d)===today?"today":""}" data-dayview="${i}" aria-label="Voir le ${JOURS[i].toLowerCase()} ${d.getDate()}">${JOURS[i].slice(0,3)}<b class="num">${d.getDate()}</b></button>`
    :`<div class="dh ${ymd(d)===today?"today":""}">${JOURS[dowOf(d)]}<b class="num">${pad(d.getDate())} ${MOIS[d.getMonth()]}</b></div>`).join("");
  const body=`<div class="hours" style="height:${H}px">${hoursCol(ph,mini)}</div>`+ds.map(d=>`<div class="col ${ymd(d)===today?"today":""}" data-slot="${ymd(d)}" style="height:${H}px">${gridLines(ph)}${lanes(eventsOn(d)).map(e=>evHtml(e,ph,mini)).join("")}</div>`).join("");
  return `<div class="cal-wrap"><div class="cal${mini?" compact":""}">${head}${body}${nt!=null?`<div class="nowline" style="top:${nt+46}px"></div>`:""}</div></div>`;
}
function dayCal(ph){
  const ds=weekDates(),d=ds[dayIdx],H=(H1-H0)*ph,nt=ymd(d)===ymd(now())?nowTop(ph):null,evs=eventsOn(d);
  const strip=`<div class="days">${ds.map((x,i)=>{const ev=eventsOn(x);return `<button data-day="${i}" aria-pressed="${i===dayIdx}" class="${ev.length?"has c-"+esc(evColor(ev[0])):""}" aria-label="${JOURS[i]} ${x.getDate()}"><span class="num">${x.getDate()}</span>${J1[i]}</button>`}).join("")}</div>`;
  return `${strip}<div class="card-h" style="margin-bottom:8px"><span style="font-weight:700">${JOURS[dayIdx]} ${d.getDate()} ${MOISL[d.getMonth()]}</span><span class="meta">${plural(evs.length,"activité")}</span></div>
  <div class="day-cal"><div class="hours" style="height:${H}px">${hoursCol(ph)}</div><div class="col" data-slot="${ymd(d)}" style="position:relative;height:${H}px;border-left:1px solid var(--line)">${gridLines(ph)}${lanes(evs).map(e=>evHtml(e,ph)).join("")}${nt!=null?`<div class="nowline" style="left:0;top:${nt}px"></div>`:""}</div></div>`;
}
function weekNav(){const ds=weekDates(),a=ds[0],b=ds[6];return `<div class="week-nav"><button class="round" data-wk="-1" aria-label="Semaine précédente">${ICON.left}</button><span class="rng num">${a.getDate()} ${MOIS[a.getMonth()]} – ${b.getDate()} ${MOIS[b.getMonth()]}</span><button class="round" data-wk="1" aria-label="Semaine suivante">${ICON.right}</button></div>`}
/* sur téléphone : semaine par défaut, jour en option (choix mémorisé sur l'appareil) */
const agendaMode=()=>store.get("pf-agenda")==="jour"?"jour":"semaine";
const agendaBlock=(pw,pn)=>`<div class="only-wide">${weekCal(pw)}</div><div class="only-narrow"><div class="seg seg-sm" role="group" aria-label="Affichage"><button type="button" data-amode="semaine" aria-pressed="${agendaMode()==="semaine"}">Semaine</button><button type="button" data-amode="jour" aria-pressed="${agendaMode()==="jour"}">Jour</button></div>${agendaMode()==="jour"?dayCal(pn):weekCal(pn,true)}</div>`;

/* ---------- prochaine activité ---------- */
function nextEvent(){const n=now(),m=n.getHours()*60+n.getMinutes();
  for(let i=0;i<21;i++){const evs=eventsOn(addDays(n,i)).filter(e=>i>0||toMin(e.start)>m);if(evs.length)return evs[0]}return null}
function evDate(ev,t){const d=parseYmd(ev.date),k=toMin(t);d.setHours(Math.floor(k/60),k%60,0,0);return d}
function todayStats(){const n=now(),evs=eventsOn(n),m=n.getHours()*60+n.getMinutes(),past=evs.filter(e=>toMin(e.end)<=m).length;return {past,total:evs.length,pct:evs.length?Math.round(past/evs.length*100):0}}
function timerCard(){
  const nx=nextEvent(),st=todayStats(),R=46,C=2*Math.PI*R,m=nx&&memberById(nx.members[0]);
  return `<section class="card g-timer"><div class="card-h"><h2>Prochaine activité</h2><span class="meta num">${st.past}/${st.total} auj.</span></div>
  <div class="timer"><div class="ring">
    <svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4e5ef0"/><stop offset="1" stop-color="#3fa0f5"/></linearGradient></defs>
      <circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--card-3)" stroke-width="4.5"/>
      <circle cx="50" cy="50" r="${R}" fill="none" stroke="url(#rg)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-st.pct/100)}"/></svg>
    <div class="inner"><div class="bell">${ICON.bell}<span class="num">${nx?esc(nx.start):"--:--"}</span></div>
      <div class="count num" id="countdown">--:--:--</div>
      <div class="pct num">${st.pct}%<small>de la journée accomplie</small></div></div></div>
  ${nx?`<button class="next-ev" data-ev="${esc(nx.id)}" data-date="${nx.date}">${av(m,"lg")}<span class="t"><b>${esc(nx.title)}</b><span class="num">${JOURS[dowOf(parseYmd(nx.date))]} · ${esc(nx.start)} – ${esc(nx.end)}</span></span>${stack(nx.members.slice(1),3)}</button>`:`<div class="next-ev"><span class="t"><b>Rien de prévu</b><span>Ajoute une activité pour la voir ici.</span></span></div>`}
  <div class="timer-actions"><button class="ghost-btn" data-view="agenda">Voir l'agenda</button><button class="pill-btn" data-add="event">Nouvelle activité</button></div></div></section>`;
}
function tick(){
  const el=$("#countdown");if(!el)return;const nx=nextEvent();
  if(!nx){el.textContent="--:--:--";return}
  let s=Math.max(0,Math.floor((evDate(nx,nx.start)-now())/1000));const d=Math.floor(s/86400);s%=86400;
  el.textContent=(d?d+"j ":"")+pad(Math.floor(s/3600))+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60);
}

/* ---------- tâches ---------- */
const STAT=[["todo","À faire"],["doing","En cours"],["done","Fait"]];
function taskHtml(t){
  const m=memberById(t.member),late=t.status!=="done"&&t.due&&t.due<ymd(now()),due=t.due?parseYmd(t.due):null;
  return `<div class="task ${esc(t.status)}"><button class="chk" data-cycle="${esc(t.id)}" aria-label="Changer le statut de ${esc(t.title)}">${t.status==="done"?ICON.check:""}</button>
  <button class="tt" data-task="${esc(t.id)}" style="text-align:left"><b>${esc(t.title)}</b><span class="num">${m?esc(m.name):"Toute la famille"}${due?" · "+JOURS[dowOf(due)].slice(0,3)+". "+due.getDate():""}${late?' <span class="late">· en retard</span>':""}</span></button>${av(m)}</div>`;
}
function kanban(limit){
  return `<div class="kanban">${STAT.map(([k,l])=>{const list=S.tasks.filter(t=>t.status===k).sort((a,b)=>(a.due||"").localeCompare(b.due||"")),shown=limit?list.slice(0,limit):list;
    return `<div class="kcol"><h3>${l}<span class="n num">${list.length}</span></h3>${shown.map(taskHtml).join("")||'<div class="empty">Aucune tâche</div>'}${limit&&list.length>limit?`<button class="kfoot" data-view="taches">+ ${plural(list.length-limit,"autre")}</button>`:""}</div>`}).join("")}</div>`;
}
function tasksCard(){const done=S.tasks.filter(t=>t.status==="done").length;
  return `<section class="card g-tasks"><div class="card-h"><h2>Tâches de la maison</h2><div class="top-actions"><span class="meta num">${done}/${S.tasks.length} terminées</span><button class="ghost-btn" data-add="task">+ Tâche</button></div></div>${kanban(3)}</section>`}

/* ---------- graphique des heures ---------- */
function chartCard(){
  const ms=S.members,rows=weekDates().map(d=>{const evs=eventsOn(d);return ms.map(m=>evs.filter(e=>e.members.includes(m.id)).reduce((s,e)=>s+toMin(e.end)-toMin(e.start),0))});
  const totals=rows.map(r=>r.reduce((a,b)=>a+b,0)),max=Math.max(240,...totals);
  const stepH=max<=600?2:max<=1200?4:6,maxH=Math.ceil(max/60/stepH)*stepH;
  const W=320,L=22,Rt=8,T=6,rowH=30,Hh=T+rows.length*rowH+22,sx=v=>L+(v/60)/maxH*(W-L-Rt);
  const wi=ms.length?chartWho%ms.length:0,wk=ms[wi],wkTot=rows.reduce((s,r)=>s+(r[wi]||0),0),all=totals.reduce((a,b)=>a+b,0);
  let g="";for(let h=0;h<=maxH;h+=stepH){const x=sx(h*60);g+=`<line x1="${x}" x2="${x}" y1="${T}" y2="${T+rows.length*rowH}" stroke="var(--line)" stroke-width="1"/><text x="${x}" y="${Hh-4}" font-size="10" fill="var(--muted)" text-anchor="middle">${h}h</text>`}
  rows.forEach((r,i)=>{const y=T+i*rowH+6;g+=`<text x="0" y="${y+12}" font-size="10.5" font-weight="600" fill="var(--muted)">${J1[i]}</text>`;let acc=0;
    r.forEach((v,k)=>{if(!v)return;const x0=sx(acc),x1=sx(acc+v);acc+=v;g+=`<rect x="${x0}" y="${y}" width="${Math.max(1,x1-x0-1.5)}" height="17" rx="4" fill="${BAR[ms[k].color]||"#6c88ff"}" fill-opacity="${k===wi?1:.55}"><title>${esc(ms[k].name)} · ${fmtDur(v)}</title></rect>`});
    if(!acc)g+=`<rect x="${L}" y="${y+7}" width="12" height="3" rx="1.5" fill="var(--line)"/>`});
  return `<section class="card g-chart chart"><div class="card-h"><h2>Temps d'activités</h2><span class="meta">cette semaine</span></div>
  <div class="chart-top"><div><div class="lab">Total famille</div><div class="big num">${fmtDur(all)}</div></div>
  ${wk?`<button class="c-${esc(wk.color)}" data-who style="text-align:right"><div class="who"><i></i>${esc(wk.name)} ${ICON.right.replace("<svg",'<svg width="14" height="14"')}</div><div class="big num">${fmtDur(wkTot)}</div></button>`:""}</div>
  <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Heures d'activités par jour et par membre">${g}</svg>
  <div class="legend">${ms.map(m=>`<span class="c-${esc(m.color)}"><i></i>${esc(m.name)}</span>`).join("")}</div></section>`;
}

/* ---------- membres ---------- */
function memberCards(){
  return S.members.map(m=>{const evs=weekDates().flatMap(eventsOn).filter(e=>e.members.includes(m.id)),ts=S.tasks.filter(t=>t.member===m.id),dn=ts.filter(t=>t.status==="done").length,mins=evs.reduce((s,e)=>s+toMin(e.end)-toMin(e.start),0);
    return `<button class="mcard c-${esc(m.color)}" data-member="${esc(m.id)}" style="--prog:${ts.length?dn/ts.length*100:0}%"><div class="row">${av(m,"lg")}<span class="ds">${esc(m.role||"")}</span></div><span class="nm">${esc(m.name)}</span>
    <span class="stats num"><span>${plural(evs.length,"activité")}</span><span>${fmtDur(mins)}</span><span>${dn}/${ts.length} tâches</span></span></button>`}).join("")||'<div class="empty">Ajoute les membres de la famille pour voir leur semaine.</div>';
}

/* ---------- repas (menus de l'appli Courses : un repas par jour) ---------- */
const platOf=m=>m&&m.platId?S.plats.find(p=>p.id===m.platId)||null:null;
function mealCell(d){
  const k=ymd(d),m=S.menus[k],p=platOf(m),label=p?p.nom:(m&&m.texte)||"";
  if(!label)return `<button class="meal empty-meal" data-meal="${k}" aria-label="Choisir le repas du ${JOURS[dowOf(d)].toLowerCase()} ${d.getDate()}">+ Repas</button>`;
  const pers=(m&&m.portions)||(p&&p.portions)||4,n=p?(p.ingredients||[]).length:0;
  return `<button class="meal c-${p?"violet":"sun"}" data-meal="${k}"><span class="slot"><span>${p?esc(p.emoji):"🍽️"}</span><span class="num">${pers} pers.</span></span><b>${esc(label)}</b>${n?`<span class="ing num">${ICON.cart}${plural(n,"ingrédient")}</span>`:""}</button>`;
}
function mealsGrid(){const today=ymd(now());
  return `<div class="mweek">${weekDates().map((d,i)=>`<div class="mday ${ymd(d)===today?"today":""}"><div class="mdh">${JOURS[i].slice(0,3)}.<b class="num">${d.getDate()}</b></div>${mealCell(d)}</div>`).join("")}</div>`}

/* ingrédients des plats de la semaine affichée, quantités ajustées au nombre de personnes (même calcul que Courses) */
function weekIngredients(){
  const agg={};
  weekDates().forEach(d=>{const m=S.menus[ymd(d)],p=platOf(m);if(!p)return;
    const ratio=((m&&m.portions)||p.portions||4)/(p.portions||4);
    (p.ingredients||[]).forEach(raw=>{const e=parseEntry(raw);if(!e.nom)return;const key=keyOf(e.nom);
      const a=agg[key]||(agg[key]={key,nom:e.nom,units:{},count:0,pour:[]});
      if(e.unit){a.units[e.unit]=(a.units[e.unit]||0)+e.val*ratio;a.count=Math.max(1,a.count||1)}else a.count+=(e.qty||1)*ratio;
      if(!a.pour.includes(p.nom))a.pour.push(p.nom)})});
  return Object.values(agg).map(a=>{const u=Object.entries(a.units);return {...a,qty:u.length?1:Math.max(1,Math.round(a.count||1)),detail:u.length?u.map(([k,v])=>formatMeasure(v,k)).join(" + "):""}}).sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
}

/* ---------- liste de courses (collection « courses » de l'appli Courses) ---------- */
function addItem(raw,opt={}){
  const p=parseEntry(raw);if(!p.nom)return null;
  const qty=opt.qty||p.qty,detail=opt.detail!==undefined?opt.detail:p.detail,key=keyOf(p.nom),ex=S.courses.find(i=>i.key===key);
  if(ex){const nq=ex.coche?qty:Q(ex)+qty,upd={coche:false,qty:nq};if(detail)upd.detail=detail;
    fs.collection("courses").doc(ex.id).update(upd).catch(fail("Mise à jour"));return {nom:ex.nom,qty:nq,deja:true}}
  fs.collection("courses").add({nom:p.nom,key,coche:false,qty,detail:detail||null,pour:opt.pour||null,t:Date.now()}).catch(fail("Ajout"));
  return {nom:p.nom,qty,deja:false};
}
function shopItem(i){
  const q=i.detail||(Q(i)>1?"×"+Q(i):"");
  return `<div class="task ${i.coche?"done":""}"><button class="chk" data-shop="${esc(i.id)}" aria-label="${i.coche?"Remettre":"Cocher"} ${esc(i.nom)}">${i.coche?ICON.check:""}</button><span class="tt"><b>${esc(i.nom)}${q?`<span class="qty num">${esc(q)}</span>`:""}</b><span>${i.pour?"Pour "+esc(i.pour):"Liste Courses"}</span></span></div>`;
}
function shopPanel(){
  const it=S.courses.slice().sort((a,b)=>(!!a.coche-!!b.coche)||((a.t||0)-(b.t||0))),left=it.filter(x=>!x.coche).length;
  return `<section class="card g-shop"><div class="card-h"><h2>Liste de courses</h2><span class="meta num">${left} à acheter · ${it.length-left} au panier</span></div>
  <form id="shopForm" class="shop-add" novalidate><input id="shop-new" name="item" maxlength="60" placeholder="Ajouter un article (ex. 2 baguettes)" aria-label="Nouvel article" autocapitalize="sentences"><button class="round" type="submit" aria-label="Ajouter l'article">${ICON.plus}</button></form>
  <div class="shop-list">${it.map(shopItem).join("")||'<div class="empty">La liste est vide.</div>'}</div>
  <div class="shop-actions"><button class="pill-btn" data-prep>${ICON.cart.replace("<svg",'<svg width="18" height="18"')}Ajouter les ingrédients de la semaine</button>${it.length-left?'<button class="ghost-btn" data-clear>Retirer les articles cochés</button>':""}</div>
  <p class="hint">C'est la même liste que dans l'appli Courses : ce que tu ajoutes ou coches ici apparaît là-bas, et inversement.</p></section>`;
}
function mealsTodayCard(){
  const n=now(),left=S.courses.filter(x=>!x.coche).length;
  return `<section class="card g-meals"><div class="card-h"><h2>Au menu</h2><button class="ghost-btn" data-view="repas">Menus</button></div>
  <div class="today-meals"><div><div class="mini">Aujourd'hui</div>${mealCell(n)}</div><div><div class="mini">Demain</div>${mealCell(addDays(n,1))}</div></div>
  <button class="shop-sum" data-view="repas">${ICON.cart}<span><b class="num">${plural(left,"article")}</b> sur la liste de courses</span>${ICON.right.replace("<svg",'<svg width="16" height="16"')}</button></section>`;
}

/* ---------- vues ---------- */
function vAccueil(){
  return `<div class="grid">${timerCard()}
  <section class="card g-week"><div class="card-h"><h2>Agenda</h2>${weekNav()}</div>${agendaBlock(40,46)}</section>
  ${tasksCard()}${chartCard()}${mealsTodayCard()}
  <section class="card g-members g-m4"><div class="card-h"><h2>La famille cette semaine</h2><button class="ghost-btn" data-view="famille">Gérer</button></div><div class="members">${memberCards()}</div></section></div>`;
}
function vAgenda(){
  return `<section class="card"><div class="card-h" style="flex-wrap:wrap">${weekNav()}<div class="legend" style="margin:0">${S.members.map(m=>`<span class="c-${esc(m.color)}"><i></i>${esc(m.name)}</span>`).join("")}</div></div>${agendaBlock(58,56)}<p class="hint">Touche une case vide de l'agenda pour ajouter une activité à ce jour et à cette heure.</p></section>`;
}
function vRepas(){
  return `<div class="grid"><section class="card g-mealweek"><div class="card-h" style="flex-wrap:wrap"><h2>Menus de la semaine</h2>${weekNav()}</div>${mealsGrid()}
  <p class="hint">Les menus et recettes sont ceux de l'appli Courses. Touche un jour pour choisir une recette.</p></section>${shopPanel()}</div>`;
}
function vTaches(){
  const done=S.tasks.filter(t=>t.status==="done").length;
  return `<section class="card"><div class="card-h"><h2>Tableau des tâches</h2><div class="top-actions"><span class="meta num">${done}/${S.tasks.length} terminées</span><button class="pill-btn" data-add="task">+ Tâche</button></div></div>
  <p class="hint" style="margin:-6px 0 14px">Touche le rond pour faire avancer une tâche : À faire → En cours → Fait.</p>${kanban(0)}</section>`;
}
function vFamille(){
  return `<div class="grid"><section class="card" style="grid-column:1/-1"><div class="card-h"><h2>Membres</h2><button class="pill-btn" data-add="member">+ Membre</button></div>
  <div class="fam-list">${S.members.map(m=>{const ts=S.tasks.filter(t=>t.member===m.id),dn=ts.filter(t=>t.status==="done").length;
    return `<button class="fam-item c-${esc(m.color)}" data-member="${esc(m.id)}" style="text-align:left">${av(m,"lg")}<span class="tt"><b>${esc(m.name)}</b><span>${esc(m.role||"")} · ${dn}/${ts.length} tâches faites</span><span class="bar"><i style="width:${ts.length?dn/ts.length*100:0}%"></i></span></span></button>`}).join("")||'<div class="empty">Ajoute le premier membre de la famille.</div>'}</div></section>
  <section class="card g-members"><div class="card-h"><h2>Cette semaine</h2><button class="ghost-btn" data-logout>Se déconnecter</button></div><div class="members">${memberCards()}</div></section></div>`;
}

function render(){
  if($("#appView").hidden)return;
  const v=VIEWS.find(x=>x.id===view)||VIEWS[0];
  $("#viewTitle").textContent=v.t;
  $("#sideNav").innerHTML=navHtml("nav-btn");
  $("#tabNav").innerHTML=navHtml("");
  $("#sideFam").innerHTML=S.members.map(m=>`<div class="fam-row">${av(m)}${esc(m.name)}</div>`).join("");
  $("#welcome").innerHTML=live()?"":`<div class="welcome"><b>Bienvenue !</b><span>Commence par ajouter les membres de la famille : chacun aura sa couleur dans l'agenda.</span><button class="pill-btn" data-add="member">Ajouter ma famille</button></div>`;
  $("#view").innerHTML=({accueil:vAccueil,agenda:vAgenda,repas:vRepas,taches:vTaches,famille:vFamille})[v.id]();
  tick();
}
function setToday(){const n=now();$("#todayLabel").textContent=JOURS[dowOf(n)]+" "+n.getDate()+" "+MOISL[n.getMonth()]+" "+n.getFullYear()}

/* ---------- interactions ---------- */
document.addEventListener("click",e=>{
  const t=e.target;let b;
  if(b=t.closest("[data-view]")){go(b.dataset.view);return}
  if(b=t.closest("[data-logout]")){auth.signOut();return}
  if(b=t.closest("[data-wk]")){weekStart=addDays(weekStart,7*Number(b.dataset.wk));render();return}
  if(b=t.closest("[data-day]")){dayIdx=Number(b.dataset.day);render();return}
  if(b=t.closest("[data-amode]")){store.set("pf-agenda",b.dataset.amode);render();return}
  if(b=t.closest("[data-dayview]")){dayIdx=Number(b.dataset.dayview);store.set("pf-agenda","jour");render();return}
  if(b=t.closest("[data-who]")){chartWho++;render();return}
  if(b=t.closest("[data-cycle]")){cycleTask(b.dataset.cycle);return}
  if(b=t.closest("[data-meal]")){openMeal(b.dataset.meal);return}
  if(b=t.closest("[data-shop]")){toggleShop(b.dataset.shop);return}
  if(b=t.closest("[data-prep]")){openPrep();return}
  if(b=t.closest("[data-clear]")){clearShop(b);return}
  if(b=t.closest("[data-ev]")){openEvent(S.events.find(x=>x.id===b.dataset.ev),b.dataset.date);return}
  if(b=t.closest("[data-task]")){openTask(S.tasks.find(x=>x.id===b.dataset.task));return}
  if(b=t.closest("[data-member]")){openMember(S.members.find(x=>x.id===b.dataset.member));return}
  if(b=t.closest("[data-add]")){const k=b.dataset.add;if(!live()||k==="member")return openMember(null);k==="task"?openTask(null):openEvent(null);return}
  if(b=t.closest("[data-slot]")){ // case vide de l'agenda : nouvelle activité à ce jour et cette heure
    if(!live())return openMember(null);
    const r=b.getBoundingClientRect(),ph=r.height/(H1-H0);
    let m=H0*60+Math.floor((e.clientY-r.top)/ph*2)*30;m=Math.max(H0*60,Math.min(H1*60-60,m));
    openEvent(null,null,{date:b.dataset.slot,start:hm(m),end:hm(m+60)});return}
});
$("#addBtn").addEventListener("click",()=>{
  if(!live())return openMember(null);
  if(view==="taches")return openTask(null);
  if(view==="famille")return openMember(null);
  if(view==="repas")return openMeal(ymd(now()));
  openEvent(null);
});
$("#themeBtn").addEventListener("click",()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;r.dataset.theme=dark?"light":"dark";store.set("pf-theme",r.dataset.theme)});

function cycleTask(id){
  const t=S.tasks.find(x=>x.id===id);if(!t)return;
  fs.collection("taches").doc(id).update({status:{todo:"doing",doing:"done",done:"todo"}[t.status]||"todo"}).catch(fail("Mise à jour"));
}
function toggleShop(id){const x=S.courses.find(i=>i.id===id);if(x)fs.collection("courses").doc(id).update({coche:!x.coche}).catch(fail("Mise à jour"))}
function clearShop(b){
  if(!b.dataset.armed){b.dataset.armed="1";b.textContent="Confirmer : retirer les articles cochés";return}
  const done=S.courses.filter(x=>x.coche);if(!done.length)return;
  const batch=fs.batch();done.forEach(x=>batch.delete(fs.collection("courses").doc(x.id)));
  batch.commit().catch(fail("Suppression"));toast(plural(done.length,"article")+" retiré"+(done.length>1?"s":""));
}
document.addEventListener("submit",e=>{
  if(e.target.id!=="shopForm")return;e.preventDefault();
  const r=addItem(e.target.item.value);if(!r)return;
  toast(r.deja?`${r.nom} : quantité ${r.qty}`:`${r.qty>1?r.qty+" × ":""}${r.nom} ajouté`);
  e.target.item.value="";setTimeout(()=>{const i=$("#shop-new");i&&i.focus()},60);
});

/* ---------- feuilles de saisie ---------- */
let lastFocus=null;
function sheet(html,onSubmit,onDelete,delLabel,saveLabel){
  lastFocus=document.activeElement;
  $("#layer").innerHTML=`<div class="scrim"><form class="sheet" id="sheetForm" novalidate>${html}<div class="err" id="sheetErr"></div><div class="sheet-actions">${onDelete?`<button type="button" class="danger" id="delBtn">${delLabel||"Supprimer"}</button>`:"<span></span>"}<div class="top-actions"><button type="button" class="ghost-btn" id="cancelBtn">Annuler</button><button class="pill-btn" type="submit">${saveLabel||"Enregistrer"}</button></div></div></form></div>`;
  const f=$("#sheetForm");
  f.addEventListener("submit",ev=>{ev.preventDefault();const err=onSubmit(f);if(err){$("#sheetErr").textContent=err;return}close()});
  $("#cancelBtn").onclick=close;
  $(".scrim").addEventListener("click",ev=>{if(ev.target.classList.contains("scrim"))close()});
  if(onDelete){let armed=false;$("#delBtn").onclick=()=>{if(!armed){armed=true;$("#delBtn").textContent="Confirmer";return}onDelete();close()}}
  f.querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click",()=>{const single=b.dataset.toggle==="one";
    if(single){const was=b.getAttribute("aria-pressed")==="true";f.querySelectorAll(`[data-toggle="one"][data-grp="${b.dataset.grp}"]`).forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed",String(!was||!b.dataset.optional));}
    else b.setAttribute("aria-pressed",String(b.getAttribute("aria-pressed")!=="true"))}));
  setTimeout(()=>{const i=f.querySelector("input:not([type=checkbox]),textarea");i&&i.focus()},30);
  return f;
}
function close(){$("#layer").innerHTML="";render();lastFocus&&lastFocus.focus&&lastFocus.focus()}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#layer").innerHTML)close()});
const picked=(f,grp)=>[...f.querySelectorAll(`[data-grp="${grp}"][aria-pressed="true"]`)].map(b=>b.dataset.val);

const JC=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const PRESETS=[["Du lundi au vendredi",[0,1,2,3,4]],["Jours d'école (L M J V)",[0,1,3,4]],["Week-end",[5,6]],["Tous les jours",[0,1,2,3,4,5,6]]];
function repText(days){
  if(!days.length)return "Choisis au moins un jour.";
  const k=days.slice().sort().join(",");
  if(k==="0,1,2,3,4,5,6")return "Tous les jours.";
  if(k==="0,1,2,3,4")return "Du lundi au vendredi, chaque semaine.";
  if(k==="5,6")return "Le week-end, chaque semaine.";
  const n=days.slice().sort().map(i=>JC[i].toLowerCase());
  return "Chaque "+(n.length>1?n.slice(0,-1).join(", ")+" et "+n[n.length-1]:n[0])+".";
}
function openEvent(ev,occ,pre){
  const ms=S.members,isNew=!ev,series=!!ev&&ev.repeat==="weekly";
  const d=(pre&&pre.date)||ymd(view==="agenda"||view==="accueil"?weekDates()[dayIdx]:now());
  ev=ev||{title:"",date:d,start:(pre&&pre.start)||"17:00",end:(pre&&pre.end)||"18:00",members:ms[0]?[ms[0].id]:[],repeat:"none"};
  const days=ev.days&&ev.days.length?ev.days:[dowOf(parseYmd(ev.date))];
  const f=sheet(`<h3>${isNew?"Nouvelle activité":"Modifier l'activité"}</h3>
   <div class="fld"><label for="f-title">Intitulé</label><input id="f-title" name="title" maxlength="80" value="${esc(ev.title)}" placeholder="Ex. Cours de piano"></div>
   <div class="seg" role="group" aria-label="Fréquence"><button type="button" data-rep="none" aria-pressed="${!series}">Une seule fois</button><button type="button" data-rep="weekly" aria-pressed="${series}">${ICON.rep.replace('width="11" height="11"','width="14" height="14"')} Chaque semaine</button></div>
   <div class="fld" id="onceBox" ${series?"hidden":""}><label for="f-date">Date</label><input id="f-date" type="date" name="date" value="${esc(ev.date)}"></div>
   <div class="repbox" id="repBox" ${series?"":"hidden"}>
     <div class="fld"><label>Quels jours ?</label><div class="dows">${JC.map((j,i)=>`<button type="button" class="dow" data-toggle="many" data-grp="dow" data-val="${i}" aria-pressed="${days.includes(i)}">${j.slice(0,3)}</button>`).join("")}</div>
       <div class="presets">${PRESETS.map(([l,ds])=>`<button type="button" class="preset" data-days="${ds.join(",")}">${l}</button>`).join("")}</div></div>
     <p class="rep-sum" id="repSum">${esc(repText(days))}</p>
     <div class="row2"><div class="fld"><label for="f-from">À partir du</label><input id="f-from" type="date" name="from" value="${esc(ev.date)}"></div><div class="fld"><label for="f-until">Jusqu'au (facultatif)</label><input id="f-until" type="date" name="until" value="${esc(ev.until||"")}"></div></div></div>
   <div class="row2"><div class="fld"><label for="f-start">Début</label><input id="f-start" type="time" name="start" value="${esc(ev.start)}"></div><div class="fld"><label for="f-end">Fin</label><input id="f-end" type="time" name="end" value="${esc(ev.end)}"></div></div>
   <div class="fld"><label>Qui participe ?</label><div class="chips">${ms.map(m=>`<button type="button" class="chip" data-toggle="many" data-grp="who" data-val="${esc(m.id)}" aria-pressed="${(ev.members||[]).includes(m.id)}">${av(m)}${esc(m.name)}</button>`).join("")}</div></div>`,
  f=>{const weekly=f.querySelector('[data-rep="weekly"]').getAttribute("aria-pressed")==="true";
    const v={title:f.title.value.trim(),date:weekly?f.from.value:f.date.value,start:f.start.value,end:f.end.value,members:picked(f,"who"),repeat:weekly?"weekly":"none"};
    if(!v.title)return "Donne un intitulé à l'activité.";if(!v.date)return weekly?"Indique à partir de quand.":"Choisis une date.";
    if(!v.start||!v.end||toMin(v.end)<=toMin(v.start))return "L'heure de fin doit être après l'heure de début.";
    if(toMin(v.start)<H0*60||toMin(v.end)>H1*60)return `Le planning affiche les activités entre ${H0}h et ${H1}h.`;
    if(!v.members.length)return "Choisis au moins un membre.";
    if(weekly){v.days=picked(f,"dow").map(Number).sort();if(!v.days.length)return "Choisis au moins un jour de répétition.";
      v.until=f.until.value||"";if(v.until&&v.until<v.date)return "La date de fin doit être après la date de début.";v.skip=(ev.skip||[]).filter(x=>x>=v.date)}
    write("events",isNew?uid():ev.id,v);toast(isNew?(weekly?"Activité ajoutée : "+repText(v.days).toLowerCase().replace(/\.$/,""):"Activité ajoutée"):"Activité modifiée");
    const dd=parseYmd(v.date);if(!weekly){weekStart=monday(dd);dayIdx=dowOf(dd)}},
  isNew?null:()=>{write("events",ev.id,null);toast(series?"Série supprimée":"Activité supprimée")},series?"Supprimer la série":"Supprimer");
  const sum=()=>{$("#repSum").textContent=repText(picked(f,"dow").map(Number))};
  f.querySelectorAll("[data-rep]").forEach(b=>b.addEventListener("click",()=>{
    const weekly=b.dataset.rep==="weekly";
    f.querySelectorAll("[data-rep]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    $("#repBox").hidden=!weekly;$("#onceBox").hidden=weekly;
    if(weekly)f.from.value=f.date.value||f.from.value;else f.date.value=f.from.value||f.date.value;
    if(weekly&&!picked(f,"dow").length){const di=dowOf(parseYmd(f.from.value||ymd(now())));f.querySelector(`[data-grp="dow"][data-val="${di}"]`).setAttribute("aria-pressed","true")}
    sum()}));
  f.querySelectorAll(".dow").forEach(b=>b.addEventListener("click",sum));
  f.querySelectorAll(".preset").forEach(b=>b.addEventListener("click",()=>{const ds=b.dataset.days.split(",");
    f.querySelectorAll('[data-grp="dow"]').forEach(x=>x.setAttribute("aria-pressed",String(ds.includes(x.dataset.val))));sum()}));
  if(series&&occ){const od=parseYmd(occ),b=document.createElement("button");b.type="button";b.className="ghost-btn";
    b.textContent=`Annuler le ${JOURS[dowOf(od)].toLowerCase()} ${od.getDate()} seulement`;
    b.onclick=()=>{fs.collection("activites").doc(ev.id).update({skip:firebase.firestore.FieldValue.arrayUnion(occ)}).catch(fail("Mise à jour"));toast("Activité annulée pour ce jour");close()};
    f.querySelector(".sheet-actions").prepend(b)}
}
function openTask(t){
  const isNew=!t;t=t||{title:"",member:"",status:"todo",due:ymd(now())};
  sheet(`<h3>${isNew?"Nouvelle tâche":"Modifier la tâche"}</h3>
   <div class="fld"><label for="t-title">Tâche</label><input id="t-title" name="title" maxlength="80" value="${esc(t.title)}" placeholder="Ex. Sortir les poubelles"></div>
   <div class="row2"><div class="fld"><label for="t-due">Pour le</label><input id="t-due" type="date" name="due" value="${esc(t.due||"")}"></div>
   <div class="fld"><label for="t-status">Statut</label><select id="t-status" name="status">${STAT.map(([k,l])=>`<option value="${k}" ${k===t.status?"selected":""}>${l}</option>`).join("")}</select></div></div>
   <div class="fld"><label>Qui s'en charge ?</label><div class="chips">${S.members.map(m=>`<button type="button" class="chip" data-toggle="one" data-optional="1" data-grp="who" data-val="${esc(m.id)}" aria-pressed="${t.member===m.id}">${av(m)}${esc(m.name)}</button>`).join("")}</div></div>`,
  f=>{const v={title:f.title.value.trim(),due:f.due.value,status:f.status.value,member:picked(f,"who")[0]||""};
    if(!v.title)return "Décris la tâche.";write("tasks",isNew?uid():t.id,v);toast(isNew?"Tâche ajoutée":"Tâche modifiée")},
  isNew?null:()=>{write("tasks",t.id,null);toast("Tâche supprimée")});
}
function openMember(m){
  const isNew=!m,used=S.members.map(x=>x.color);
  m=m||{name:"",role:"",color:COLORS.find(c=>!used.includes(c))||COLORS[S.members.length%COLORS.length]};
  sheet(`<h3>${isNew?"Ajouter un membre":"Modifier "+esc(m.name)}</h3>
   <div class="fld"><label for="m-name">Prénom</label><input id="m-name" name="name" maxlength="24" value="${esc(m.name)}" placeholder="Ex. Léa"></div>
   <div class="fld"><label for="m-role">Rôle ou âge</label><input id="m-role" name="role" maxlength="24" value="${esc(m.role||"")}" placeholder="Ex. Parent, 9 ans"></div>
   <div class="fld"><label>Couleur</label><div class="chips">${COLORS.map(c=>`<button type="button" class="swatch c-${c}" data-toggle="one" data-grp="col" data-val="${c}" aria-pressed="${c===m.color}" aria-label="Couleur ${c}"></button>`).join("")}</div></div>`,
  f=>{const v={name:f.name.value.trim(),role:f.role.value.trim(),color:picked(f,"col")[0]||m.color};
    if(!v.name)return "Indique un prénom.";write("members",isNew?uid():m.id,v);toast(isNew?v.name+" a rejoint le planning":"Membre modifié")},
  isNew?null:()=>{write("members",m.id,null);toast("Membre retiré")});
}
/* même format que l'appli Courses : menus/{AAAA-MM-JJ} = {platId, texte, portions} */
function openMeal(k){
  const m=S.menus[k],cur=platOf(m),d=parseYmd(k);let pers=(m&&m.portions)||(cur&&cur.portions)||4;
  const list=S.plats.slice().sort((a,b)=>(a.nom||"").localeCompare(b.nom||"","fr"));
  const f=sheet(`<h3>${JOURS[dowOf(d)]} ${d.getDate()} ${MOISL[d.getMonth()]}</h3>
   <div class="stepper"><span>Nombre de personnes</span><div><button type="button" id="pMinus" aria-label="Une personne de moins">−</button><b id="pVal" class="num">${pers}</b><button type="button" id="pPlus" aria-label="Une personne de plus">+</button></div></div>
   <div class="fld"><label>Recette de l'appli Courses</label>${list.length?`<div class="chips pchips">${list.map(p=>`<button type="button" class="chip" style="padding-left:12px" data-toggle="one" data-optional="1" data-grp="plat" data-val="${esc(p.id)}" aria-pressed="${!!m&&m.platId===p.id}">${esc(p.emoji)} ${esc(p.nom)}</button>`).join("")}</div>`:'<p class="hint" style="margin:0">Aucune recette pour l\'instant. Crée-les dans l\'onglet Recettes de l\'appli Courses.</p>'}</div>
   <div class="fld"><label for="r-text">Ou autre chose</label><input id="r-text" name="texte" maxlength="60" value="${m&&!m.platId?esc(m.texte||""):""}" placeholder="Restes, resto, chez Mamie…"></div>`,
  f=>{const t=f.texte.value.trim(),pid=picked(f,"plat")[0];
    if(t){fs.collection("menus").doc(k).set({platId:null,texte:t,portions:pers}).catch(fail("Enregistrement"))}
    else if(pid){const p=S.plats.find(x=>x.id===pid);fs.collection("menus").doc(k).set({platId:pid,texte:p?p.nom:"",portions:pers}).catch(fail("Enregistrement"))}
    else return "Choisis une recette ou écris le repas.";
    toast("Menu enregistré")},
  m?()=>{fs.collection("menus").doc(k).delete().catch(fail("Suppression"));toast("Jour vidé")}:null,"Vider ce jour");
  f.querySelector("#pMinus").onclick=()=>{if(pers>1)f.querySelector("#pVal").textContent=--pers};
  f.querySelector("#pPlus").onclick=()=>{if(pers<20)f.querySelector("#pVal").textContent=++pers};
  f.querySelector("#r-text").addEventListener("input",e=>{if(e.target.value.trim())f.querySelectorAll('[data-grp="plat"]').forEach(x=>x.setAttribute("aria-pressed","false"))});
  f.querySelectorAll('[data-grp="plat"]').forEach(x=>x.addEventListener("click",()=>{f.querySelector("#r-text").value=""}));
}
function openPrep(){
  const rows=weekIngredients(),onList=new Map(S.courses.filter(i=>!i.coche).map(i=>[i.key,i]));
  if(!rows.length){toast("Aucune recette avec des ingrédients cette semaine");return}
  const f=sheet(`<h3>Courses de la semaine</h3><p class="hint" style="margin:0">Décoche ce que tu as déjà à la maison.</p>
   <div class="prep">${rows.map(a=>{const on=onList.get(a.key),q=a.detail||(a.qty>1?"×"+a.qty:"");
     return `<label><input type="checkbox" data-k="${esc(a.key)}" ${on?"":"checked"}><span><b>${esc(a.nom)}</b><small>${on?"déjà sur la liste (coche pour cumuler)":"pour "+esc(a.pour.join(", "))}</small></span><em class="num">${esc(q)}</em></label>`}).join("")}</div>`,
  f=>{const agg=Object.fromEntries(rows.map(a=>[a.key,a])),sel=[...f.querySelectorAll(".prep input:checked")].map(x=>agg[x.dataset.k]);
    if(!sel.length)return null;
    const b=fs.batch();let t=Date.now();
    sel.forEach(a=>{const ex=S.courses.find(i=>i.key===a.key),pour=a.pour.join(", ");
      if(ex)b.update(fs.collection("courses").doc(ex.id),{coche:false,qty:ex.coche?a.qty:Q(ex)+a.qty,detail:a.detail||ex.detail||null,pour});
      else b.set(fs.collection("courses").doc(),{nom:a.nom,key:a.key,coche:false,qty:a.qty,detail:a.detail||null,pour,t:t++})});
    b.commit().catch(fail("Ajout"));toast(plural(sel.length,"article")+" ajouté"+(sel.length>1?"s":"")+" à la liste")},
  null,null,"Ajouter à la liste");
}

let toastT;function toast(msg){clearTimeout(toastT);let el=$(".toast");if(!el){el=document.createElement("div");el.className="toast";el.setAttribute("role","status");document.body.appendChild(el)}el.textContent=msg;toastT=setTimeout(()=>el.remove(),2600)}

/* ---------- démarrage ---------- */
const th=store.get("pf-theme");if(th)document.documentElement.dataset.theme=th;
const h=location.hash.slice(1);if(VIEWS.some(v=>v.id===h))view=h;
setToday();
setInterval(tick,1000);
setInterval(()=>{setToday();if(!$("#layer").innerHTML)render()},60000);
})();
