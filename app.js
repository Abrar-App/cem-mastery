
const NAV=[
["dashboard","⌂","Home"],["learn","◫","Learn"],["practice","?","Practice"],["flashcards","▱","Cards"],
["calendar","▦","Calendar"],["mocks","◷","Mocks"],["reference","≡","Reference"],["progress","↗","Progress"]
];
let DATA=null;
let state={
 route:"dashboard", lessonFilter:"all", currentQ:null, qStart:0, selected:null, revealed:false,
 progress:{lessons:{},attempts:[],cards:{},schedule:{},settings:{theme:"light"},readiness:0},
 canvas:null
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function shuffle(a){let x=[...a];for(let i=x.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function save(){localStorage.setItem("cemMasteryProgress",JSON.stringify(state.progress))}
function load(){try{const p=JSON.parse(localStorage.getItem("cemMasteryProgress"));if(p)state.progress={...state.progress,...p}}catch{}}
function pct(n,d){return d?Math.round(n/d*100):0}
function lessonDone(){return Object.values(state.progress.lessons).filter(Boolean).length}
function attempts(){return state.progress.attempts}
function accuracy(){
 const a=attempts().filter(x=>x.graded);
 return a.length?Math.round(a.filter(x=>x.correct).length/a.length*100):0;
}
function timedScore(){
 const a=attempts().filter(x=>x.graded);
 if(!a.length)return 0;
 const ok=a.filter(x=>x.correct && x.elapsed<=x.target*1.25).length;
 return Math.round(ok/a.length*100)
}
function readiness(){
 const coverage=pct(lessonDone(),DATA.lessons.length);
 const acc=accuracy(), timed=timedScore();
 const cardStates=Object.values(state.progress.cards); const retention=cardStates.length?Math.round(cardStates.filter(x=>x.box>=2).length/cardStates.length*100):0;
 return Math.round(coverage*.25+acc*.35+timed*.25+retention*.15);
}
function sectionMastery(id){
 const qs=attempts().filter(a=>a.section===id && a.graded);
 if(!qs.length)return 0;
 return Math.round(qs.filter(a=>a.correct).length/qs.length*100);
}
function setRoute(r){state.route=r;state.currentQ=null;state.selected=null;state.revealed=false;render()}
function nav(){
 const html=NAV.map(([r,i,l])=>`<button class="navbtn ${state.route===r?'active':''}" data-route="${r}"><span>${i}</span><span>${l}</span></button>`).join("");
 $("#nav").innerHTML=html; $("#mobileNav").innerHTML=html;
 $$("[data-route]").forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
}
function title(t,s=""){ $("#pageTitle").textContent=t; $("#subTitle").textContent=s; }
function render(){nav();document.documentElement.dataset.theme=state.progress.settings.theme||"light";
 const fn={dashboard,learn,practice,flashcards,calendar,mocks,reference,progress}[state.route]||dashboard;fn();}
function dashboard(){
 title("Dashboard","Your adaptive CEM study plan");
 const cov=pct(lessonDone(),DATA.lessons.length), rd=readiness(), acc=accuracy(), ts=timedScore();
 const next=DATA.schedule.find(x=>!state.progress.schedule[x.day]);
 const secRows=DATA.sections.map(s=>`<div class="row"><div class="row-main"><strong>${s.id}. ${esc(s.name)}</strong><small>Official weight ${s.weight}</small></div><div><span class="badge">${sectionMastery(s.id)}% mastery</span></div></div>`).join("");
 $("#view").innerHTML=`
 <div class="grid cols-4">
  <div class="card"><div class="muted">Course coverage</div><div class="metric">${cov}%</div><div class="progress"><span style="width:${cov}%"></span></div></div>
  <div class="card"><div class="muted">Exam readiness</div><div class="metric">${rd}%</div><div class="progress"><span style="width:${rd}%"></span></div></div>
  <div class="card"><div class="muted">Question accuracy</div><div class="metric">${acc}%</div><small>${attempts().filter(x=>x.graded).length} attempts</small></div>
  <div class="card"><div class="muted">Timed performance</div><div class="metric">${ts}%</div><small>Correct within target</small></div>
 </div>
 <div class="grid cols-2" style="margin-top:16px">
  <div class="card"><h2>Today's target</h2>${next?`<span class="pill">Week ${next.week} • ${next.minutes} min</span><h3>${esc(next.title)}</h3><p class="muted">Complete today's planned study. If unfinished, the task remains available rather than disappearing.</p><button class="btn primary" id="todayBtn">Open Calendar</button>`:`<h3>Plan complete</h3><p>Use mocks and weak-area practice.</p>`}</div>
  <div class="card"><h2>Readiness advice</h2>${advice(rd,cov,acc,ts)}</div>
 </div>
 <div class="card" style="margin-top:16px"><h2>Section mastery</h2><div class="section-list">${secRows}</div></div>`;
 if($("#todayBtn"))$("#todayBtn").onclick=()=>setRoute("calendar");
}
function advice(rd,cov,acc,ts){
 if(cov<40)return `<p>Prioritize learning coverage. Keep numerical practice active while completing the foundations.</p>`;
 if(acc<70)return `<p>Your question accuracy is below the readiness target. Rework incorrect concepts before adding more mock volume.</p>`;
 if(ts<70)return `<p>Knowledge is improving, but pacing needs work. Add 10-question timed sprints.</p>`;
 if(rd>=80)return `<p><strong>Good trajectory.</strong> Shift more study time toward mixed timed work and full-reference navigation.</p>`;
 return `<p>Continue the scheduled plan. Do not book the exam based on completion alone; readiness must also include accuracy and speed.</p>`;
}
function learn(){
 title("Learn","Theory and numerical lessons");
 const filters=["all","Theory","Both"];
 const tabs=filters.map(x=>`<button class="tab ${state.lessonFilter===x?'active':''}" data-filter="${x}">${x==="all"?"All":x==="Both"?"Numerical / Both":x}</button>`).join("");
 const grouped=DATA.sections.map(s=>{
  const ls=DATA.lessons.filter(l=>l.section===s.id && (state.lessonFilter==="all"||l.type===state.lessonFilter));
  if(!ls.length)return "";
  return `<div class="card"><div class="row"><div><h3 style="margin:0">${s.id}. ${esc(s.name)}</h3><small class="muted">Weight ${s.weight}</small></div></div>
   ${ls.map(l=>`<div class="row"><div class="row-main"><strong>${esc(l.title)}</strong><small>${l.type} • ${l.minutes} min</small></div><button class="btn ${state.progress.lessons[l.id]?'good':''}" data-lesson="${l.id}">${state.progress.lessons[l.id]?'Review':'Open'}</button></div>`).join("")}</div>`;
 }).join("");
 $("#view").innerHTML=`<div class="tabs">${tabs}</div><div class="grid">${grouped}</div>`;
 $$("[data-filter]").forEach(b=>b.onclick=()=>{state.lessonFilter=b.dataset.filter;learn()});
 $$("[data-lesson]").forEach(b=>b.onclick=()=>lessonView(b.dataset.lesson));
}
function lessonView(id){
 const l=DATA.lessons.find(x=>x.id===id); if(!l)return;
 title(l.title,`Section ${l.section} • ${l.type} • ${l.minutes} min`);
 $("#view").innerHTML=`<div class="card lesson">
 <button class="btn" id="backLearn">← Lessons</button>
 <h2>${esc(l.title)}</h2><span class="pill">${l.type}</span>
 <p>${esc(l.simple)}</p>
 ${l.detail?`<div class="callout"><strong>Engineer Detail</strong><p>${esc(l.detail)}</p></div>`:""}
 ${l.formula?`<div class="formula">${esc(l.formula)}</div>`:""}
 ${l.trap?`<div class="callout"><strong>Exam trap</strong><p>${esc(l.trap)}</p></div>`:""}
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
  <button class="btn" id="readBtn">🔊 Read aloud</button>
  <button class="btn primary" id="completeBtn">${state.progress.lessons[id]?'Completed ✓':'Mark complete'}</button>
  ${l.type==="Both"?`<button class="btn" id="workspaceBtn">✎ Numerical workspace</button>`:""}
 </div></div>`;
 $("#backLearn").onclick=learn;
 $("#readBtn").onclick=()=>{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance([l.title,l.simple,l.detail||"",l.formula||"",l.trap||""].join(". ")))};
 $("#completeBtn").onclick=()=>{state.progress.lessons[id]=true;save();lessonView(id)};
 if($("#workspaceBtn"))$("#workspaceBtn").onclick=()=>workspace(l);
}
function practice(){
 title("Practice","Randomized from approved starter bank");
 if(!state.currentQ)state.currentQ=shuffle(DATA.questions)[0];
 const q=state.currentQ;
 $("#view").innerHTML=`<div class="card question-card">
  <div class="row"><div><span class="pill">Section ${q.section}</span> <span class="badge">${q.type} • ${q.difficulty}</span></div><div class="muted" id="timer">0s / ${q.target}s</div></div>
  <div class="qtext">${esc(q.q)}</div>
  <div>${q.options.map((o,i)=>`<button class="option ${state.selected===i?'selected':''}" data-opt="${i}">${String.fromCharCode(65+i)}. ${esc(o)}</button>`).join("")}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
   <button class="btn" id="notSure">Not Sure</button>
   <button class="btn primary" id="submitQ">Submit</button>
   ${q.type==="Numerical"?`<button class="btn" id="scratchQ">✎ Workspace</button>`:""}
  </div>
  ${state.revealed?solutionHtml(q):""}
 </div>`;
 if(!state.qStart){state.qStart=Date.now();timerTick()}
 $$("[data-opt]").forEach(b=>b.onclick=()=>{if(state.revealed)return;state.selected=+b.dataset.opt;practice()});
 $("#notSure").onclick=()=>{if(!state.revealed)submitQ(true)};
 $("#submitQ").onclick=()=>{if(state.selected===null)return alert("Select an answer or tap Not Sure.");submitQ(false)};
 if($("#scratchQ"))$("#scratchQ").onclick=()=>workspace(q);
 if(state.revealed)$("#nextQ").onclick=()=>{state.currentQ=shuffle(DATA.questions.filter(x=>x.id!==q.id))[0];state.selected=null;state.revealed=false;state.qStart=0;practice()};
}
function solutionHtml(q){
 const ok=state.selected===q.answer;
 return `<div class="explain"><h3>${ok?'Correct ✓':'Review this concept'}</h3><p><strong>Answer:</strong> ${String.fromCharCode(65+q.answer)}. ${esc(q.options[q.answer])}</p><p>${esc(q.solution)}</p><p><strong>Common trap:</strong> ${esc(q.trap)}</p><button class="btn primary" id="nextQ">Next random question</button></div>`;
}
function submitQ(notSure){
 const q=state.currentQ, elapsed=Math.round((Date.now()-state.qStart)/1000), correct=state.selected===q.answer;
 state.progress.attempts.push({id:crypto.randomUUID?.()||String(Date.now()),question:q.id,section:q.section,correct,notSure,elapsed,target:q.target,graded:true,date:new Date().toISOString()});
 state.revealed=true;save();practice();
}
let timerInt=null;
function timerTick(){clearInterval(timerInt);timerInt=setInterval(()=>{if(state.route!=="practice"||!state.qStart){clearInterval(timerInt);return}const e=Math.round((Date.now()-state.qStart)/1000);if($("#timer"))$("#timer").textContent=`${e}s / ${state.currentQ.target}s`},1000)}
function flashcards(){
 title("Flashcards","Fast revision with spaced boxes");
 const due=DATA.flashcards.filter(c=>!state.progress.cards[c.id]||state.progress.cards[c.id].due<=Date.now());
 const c=due[0]||DATA.flashcards[0];
 state.cardFlip=state.cardFlip||false;
 $("#view").innerHTML=`<div class="card flashcard" id="cardFlip"><div>${state.cardFlip?`<div class="back">${esc(c.back)}</div>`:`<strong>${esc(c.front)}</strong><p class="muted">Tap card to reveal</p>`}</div></div>
 <div style="display:flex;justify-content:center;gap:8px;margin-top:14px"><button class="btn" data-cardrate="1">Again</button><button class="btn" data-cardrate="2">Hard</button><button class="btn good" data-cardrate="3">Got it</button></div>
 <p class="muted" style="text-align:center">${due.length} cards due now</p>`;
 $("#cardFlip").onclick=()=>{state.cardFlip=!state.cardFlip;flashcards()};
 $$("[data-cardrate]").forEach(b=>b.onclick=()=>{const r=+b.dataset.cardrate;const old=state.progress.cards[c.id]||{box:0};let box=r===1?0:Math.min(5,(old.box||0)+1);let days=[0,1,3,7,14,30][box];state.progress.cards[c.id]={box,due:Date.now()+days*86400000};state.cardFlip=false;save();flashcards()});
}
function calendar(){
 title("Calendar","10-week adaptive study plan");
 const days=DATA.schedule.map(d=>`<div class="day ${state.progress.schedule[d.day]?'done':''}"><strong>Day ${d.day}</strong><small>Week ${d.week} • ${d.minutes} min</small><p>${esc(d.title)}</p><button class="btn ${state.progress.schedule[d.day]?'good':''}" data-day="${d.day}">${state.progress.schedule[d.day]?'Done ✓':'Complete'}</button></div>`).join("");
 $("#view").innerHTML=`<div class="card"><p><strong>Default:</strong> 75 min weekdays, 150 min Saturday/Sunday. Missed items remain incomplete and can be redistributed later.</p></div><div class="calendar" style="margin-top:14px">${days}</div>`;
 $$("[data-day]").forEach(b=>b.onclick=()=>{let id=+b.dataset.day;state.progress.schedule[id]=!state.progress.schedule[id];save();calendar()});
}
function mocks(){
 title("Mock Tests","Exam conditioning");
 const modes=[
  ["Quick quiz",10,null],["Section practice",20,null],["Half mock",65,120],["Full mock",130,240]
 ];
 $("#view").innerHTML=`<div class="grid cols-2">${modes.map(([n,c,t])=>`<div class="card"><h2>${n}</h2><div class="metric">${c}<small> questions</small></div><p>${t?`${t} minute timer.`:"Untimed or target-time practice."}</p><button class="btn primary" data-mock="${c}">Start</button></div>`).join("")}</div>
 <div class="card" style="margin-top:16px"><h3>Full mock pace checkpoints</h3><p>Q33 ≈ 61 min • Q65 = 120 min • Q98 ≈ 181 min • Q120 ≈ 222 min • Q130 = 240 min</p><p class="muted">This starter build reuses approved questions if the selected mock exceeds the current validated bank size. Expand the approved bank before treating the 130-question mode as a true readiness simulation.</p></div>`;
 $$("[data-mock]").forEach(b=>b.onclick=()=>startMock(+b.dataset.mock));
}
function startMock(count){
 const pool=shuffle(DATA.questions);
 const qs=Array.from({length:count},(_,i)=>pool[i%pool.length]);
 state.mock={qs,index:0,answers:[],start:Date.now(),limit:count===130?14400000:count===65?7200000:null};
 renderMock();
}
function renderMock(){
 const m=state.mock,q=m.qs[m.index],elapsed=Math.round((Date.now()-m.start)/1000);
 title(`Mock ${m.index+1}/${m.qs.length}`,m.limit?`${Math.floor((m.limit/1000-elapsed)/60)} min remaining`:"Untimed");
 $("#view").innerHTML=`<div class="card question-card"><div class="qtext">${esc(q.q)}</div>${q.options.map((o,i)=>`<button class="option" data-mo="${i}">${String.fromCharCode(65+i)}. ${esc(o)}</button>`).join("")}<button class="btn" id="flagMock">Flag / Skip</button></div>`;
 $$("[data-mo]").forEach(b=>b.onclick=()=>{m.answers.push({q:q.id,a:+b.dataset.mo,correct:+b.dataset.mo===q.answer,section:q.section});m.index++;m.index>=m.qs.length?finishMock():renderMock()});
 $("#flagMock").onclick=()=>{m.answers.push({q:q.id,a:null,correct:false,section:q.section,flagged:true});m.index++;m.index>=m.qs.length?finishMock():renderMock()};
}
function finishMock(){
 const m=state.mock,score=pct(m.answers.filter(x=>x.correct).length,m.answers.length);
 state.progress.attempts.push(...m.answers.map(x=>({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),question:x.q,section:x.section,correct:x.correct,notSure:false,elapsed:0,target:9999,graded:true,mock:true,date:new Date().toISOString()})));
 save();title("Mock Result");$("#view").innerHTML=`<div class="card"><div class="metric">${score}%</div><h2>Mock complete</h2><p>${score>=80?"Strong result. Review every wrong or flagged question.":"Use the result to target weak sections before the next mock."}</p><button class="btn primary" id="mockHome">Back to mocks</button></div>`;$("#mockHome").onclick=()=>{state.mock=null;mocks()}
}
function reference(){
 title("Reference","Formula and concept quick lookup");
 const refs=DATA.lessons.filter(l=>l.formula).map(l=>({section:l.section,title:l.title,formula:l.formula,trap:l.trap}));
 $("#view").innerHTML=`<input id="refSearch" class="ref-search" placeholder="Search COP, power factor, degree days, NPV..."><div id="refs">${refs.map(r=>refCard(r)).join("")}</div>`;
 $("#refSearch").oninput=e=>{$("#refs").innerHTML=refs.filter(r=>(r.title+" "+r.formula).toLowerCase().includes(e.target.value.toLowerCase())).map(refCard).join("")}
}
function refCard(r){return `<div class="card" style="margin-bottom:10px"><span class="pill">Section ${r.section}</span><h3>${esc(r.title)}</h3><div class="formula">${esc(r.formula)}</div>${r.trap?`<p class="muted">${esc(r.trap)}</p>`:""}</div>`}
function progress(){
 title("Progress","Mastery, timing and weak areas");
 const by=DATA.sections.map(s=>({s,n:sectionMastery(s.id)})).sort((a,b)=>a.n-b.n);
 $("#view").innerHTML=`<div class="grid cols-3"><div class="card"><div class="metric">${readiness()}%</div><div class="muted">Readiness</div></div><div class="card"><div class="metric">${accuracy()}%</div><div class="muted">Accuracy</div></div><div class="card"><div class="metric">${timedScore()}%</div><div class="muted">Timed</div></div></div>
 <div class="card" style="margin-top:16px"><h2>Weakest sections first</h2>${by.map(x=>`<div class="row"><div class="row-main"><strong>${x.s.id}. ${esc(x.s.name)}</strong></div><div style="width:180px"><div class="kpi"><span>${x.n}%</span></div><div class="errorbar"><span style="width:${x.n}%"></span></div></div></div>`).join("")}</div>
 <div class="card" style="margin-top:16px"><h2>Data</h2><button class="btn" id="export2">Export backup</button> <button class="btn" id="import2">Import backup</button> <button class="btn warn" id="resetAll">Reset local progress</button></div>`;
 $("#export2").onclick=exportBackup;$("#import2").onclick=()=>$("#importFile").click();$("#resetAll").onclick=()=>{if(confirm("Reset all local study progress on this device?")){localStorage.removeItem("cemMasteryProgress");location.reload()}};
}
function workspace(subject){
 title("Numerical Workspace",subject.title||subject.q||"Scratch space");
 $("#view").innerHTML=`<div class="canvas-wrap">
  <div class="card"><h3>${esc(subject.title||"Practice question")}</h3><p>${esc(subject.simple||subject.q||"Use this space for your working.")}</p>${subject.formula?`<div class="formula">${esc(subject.formula)}</div>`:""}<p class="muted">Your strokes are saved locally on this device. Automatic math recognition is intentionally not used for grading in this build.</p><button class="btn" id="backWS">← Back</button></div>
  <div class="card"><div class="canvas-tools"><button class="btn" data-tool="pen">Pen</button><button class="btn" data-tool="eraser">Eraser</button><button class="btn" id="undoInk">Undo</button><button class="btn warn" id="clearInk">Clear</button></div><canvas id="ink"></canvas></div>
 </div>`;
 $("#backWS").onclick=()=>state.route==="practice"?practice():learn();
 initCanvas(subject.id||subject.title||subject.q);
}
function initCanvas(key){
 const c=$("#ink"),ctx=c.getContext("2d"); let tool="pen",drawing=false,current=[],strokes=[];
 function size(){const r=c.getBoundingClientRect();c.width=Math.max(600,Math.floor(r.width*devicePixelRatio));c.height=Math.floor(r.height*devicePixelRatio);ctx.scale(devicePixelRatio,devicePixelRatio);redraw()}
 function redraw(){ctx.clearRect(0,0,c.width,c.height);ctx.lineCap="round";ctx.lineJoin="round";for(const s of strokes){ctx.strokeStyle=s.tool==="eraser"?"#ffffff":"#111827";ctx.lineWidth=s.tool==="eraser"?18:2.5;ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}}
 try{strokes=JSON.parse(localStorage.getItem("ink:"+key)||"[]")}catch{}
 setTimeout(size,0);window.addEventListener("resize",size,{once:true});
 c.onpointerdown=e=>{drawing=true;current=[];c.setPointerCapture(e.pointerId);point(e)}
 c.onpointermove=e=>{if(drawing)point(e)}
 c.onpointerup=e=>{drawing=false;if(current.length){strokes.push({tool,points:current});localStorage.setItem("ink:"+key,JSON.stringify(strokes))}}
 function point(e){const r=c.getBoundingClientRect();current.push({x:e.clientX-r.left,y:e.clientY-r.top});if(current.length>1){const a=current[current.length-2],b=current[current.length-1];ctx.strokeStyle=tool==="eraser"?"#ffffff":"#111827";ctx.lineWidth=tool==="eraser"?18:2.5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
 $$("[data-tool]").forEach(b=>b.onclick=()=>tool=b.dataset.tool);$("#undoInk").onclick=()=>{strokes.pop();localStorage.setItem("ink:"+key,JSON.stringify(strokes));redraw()};$("#clearInk").onclick=()=>{if(confirm("Clear this page?")){strokes=[];localStorage.removeItem("ink:"+key);redraw()}};
}
function exportBackup(){
 const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),progress:state.progress},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cem-mastery-backup.json";a.click();URL.revokeObjectURL(a.href)
}
$("#backupBtn").onclick=exportBackup;
$("#themeBtn").onclick=()=>{state.progress.settings.theme=(state.progress.settings.theme==="dark"?"light":"dark");save();render()};
$("#importFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(x.progress){state.progress=x.progress;save();render();alert("Backup imported.")}}catch{alert("Invalid backup file.")}};r.readAsText(f)};
(async function init(){load();DATA=await fetch("./data/content.json").then(r=>r.json());if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js");render()})();
