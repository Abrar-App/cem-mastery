
const App = {
  lessons:[], questions:[], cards:[], view:'home', currentLesson:null,
  state:{
    version:2, completedLessons:[], lessonMastery:{}, attempts:{}, questionIndex:0,
    cardState:{}, theme:'light', settings:{paper:'grid'}, mockHistory:[]
  },
  speech:null, notebook:null
};
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function save(){localStorage.setItem('cem-mastery-state-v2',JSON.stringify(App.state))}
function load(){try{Object.assign(App.state,JSON.parse(localStorage.getItem('cem-mastery-state-v2')||'{}'))}catch(e){} document.documentElement.dataset.theme=App.state.theme||'light'}
async function init(){
  load();
  [App.lessons,App.questions,App.cards]=await Promise.all([
    fetch('./data/lessons.json').then(r=>r.json()),
    fetch('./data/questions.json').then(r=>r.json()),
    fetch('./data/flashcards.json').then(r=>r.json())
  ]);
  bindShell(); route('home');
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
function bindShell(){
  $$('.nav-btn').forEach(b=>b.onclick=()=>route(b.dataset.view));
  $('#themeBtn').onclick=()=>{App.state.theme=App.state.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=App.state.theme;save()};
  $('#backupBtn').onclick=exportBackup;
  $('#restoreInput').onchange=e=>restoreBackup(e.target.files[0]);
}
function route(v){
  stopSpeech(); App.view=v;
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  const render={home:renderHome,course:renderCourse,practice:renderPracticeHub,flashcards:renderFlashcards,mocks:renderMocks,progress:renderProgress}[v]||renderHome;
  render(); window.scrollTo({top:0,behavior:'instant'});
}
function nextLesson(){return App.lessons.find(l=>!App.state.completedLessons.includes(l.lesson))||App.lessons.at(-1)}
function progressPct(){return Math.round(App.state.completedLessons.length/App.lessons.length*100)}
function renderHome(){
  const l=nextLesson(), due=dueCards().length, mistakes=Object.values(App.state.attempts).filter(a=>a.correct===false||a.notSure).length;
  $('#view').innerHTML=`<section class="hero">
    <div class="card"><div class="eyebrow">Continue your course</div><h1>Lesson ${l.lesson}: ${esc(l.title)}</h1><p class="muted">${esc(l.outcome)}</p>
      <div class="row"><button class="primary" id="startLesson">Start / Continue Lesson</button><button class="secondary" id="quickPractice">Practice numericals</button></div>
    </div>
    <div class="card metric"><span>Course progress</span><strong>${progressPct()}%</strong><div class="progressbar"><i style="width:${progressPct()}%"></i></div><p class="muted">${App.state.completedLessons.length} of ${App.lessons.length} lessons completed</p></div>
  </section>
  <section class="grid3">
    <div class="card metric"><span>Due flashcards</span><strong>${due}</strong><button class="ghost" data-go="flashcards">Review</button></div>
    <div class="card metric"><span>Mistakes / Not Sure</span><strong>${mistakes}</strong><button class="ghost" id="reviewMistakes">Review</button></div>
    <div class="card metric"><span>Readiness</span><strong>${readiness()}%</strong><small class="muted">Adaptive estimate; mock gates still required</small></div>
  </section>`;
  $('#startLesson').onclick=()=>openLesson(l.lesson);
  $('#quickPractice').onclick=()=>{App.state.questionIndex=0;route('practice')};
  $$('[data-go]').forEach(x=>x.onclick=()=>route(x.dataset.go));
  $('#reviewMistakes').onclick=()=>route('practice');
}
function renderCourse(){
  $('#view').innerHTML=`<div class="card"><div class="eyebrow">Sequential course map</div><h1>93 one-hour lessons</h1><p class="muted">Normal study flow is sequential. You do not need to choose the topic yourself.</p></div>
  <div class="lesson-list" style="margin-top:12px">${App.lessons.map(l=>`<div class="lesson-item ${App.state.completedLessons.includes(l.lesson)?'done':''}">
    <div class="lesson-no">${l.lesson}</div><div><strong>${esc(l.title)}</strong><div class="muted">Section ${esc(l.section)} · ${esc(l.mode)}</div></div>
    <button class="ghost" data-lesson="${l.lesson}">${App.state.completedLessons.includes(l.lesson)?'Review':'Open'}</button></div>`).join('')}</div>`;
  $$('[data-lesson]').forEach(b=>b.onclick=()=>openLesson(+b.dataset.lesson));
}
function openLesson(n){
  App.currentLesson=n; const l=App.lessons.find(x=>x.lesson===n);
  $('#view').innerHTML=`<div class="card">
    <div class="lesson-head"><div><div class="eyebrow">Lesson ${l.lesson} · Section ${esc(l.section)}</div><h1>${esc(l.title)}</h1><p class="muted">${esc(l.outcome)}</p></div>
      <div class="reader"><button class="secondary" id="readBtn">🔊 Read aloud</button><button class="ghost" id="pauseBtn">Pause</button><button class="ghost" id="stopBtn">Stop</button></div>
    </div>
  </div>
  <section class="grid2" style="margin-top:12px">
    <div class="card"><h2>First-principles teaching</h2>${l.teaching_points.map(p=>`<p class="teach-point">${esc(p)}</p>`).join('')}
      <details><summary><strong>Engineer Detail</strong></summary><p class="muted">When studying, connect each statement to the physical system, assumptions, units and likely exam distractors. Use the Reference area and question explanations for deeper technical checks.</p></details>
    </div>
    <div class="card"><h2>Worked example / scenario</h2><div class="worked">${esc(l.worked_example)}</div><h3>Guided practice</h3>${l.guided_practice.map((p,i)=>`<p><strong>${i+1}.</strong> ${esc(p)}</p>`).join('')}</div>
  </section>
  <section class="card" style="margin-top:12px"><div class="row space"><div><h2>Mastery</h2><p class="muted">Complete practice without excessive help before marking this lesson mastered.</p></div>
    <div class="row"><button class="secondary" id="lessonPractice">Practice Lesson</button><button class="primary" id="completeLesson">Mark lesson complete</button></div></div></section>`;
  $('#readBtn').onclick=()=>readLesson(l);
  $('#pauseBtn').onclick=togglePauseSpeech; $('#stopBtn').onclick=stopSpeech;
  $('#lessonPractice').onclick=()=>{App.state.practiceLesson=n;App.state.questionIndex=0;route('practice')};
  $('#completeLesson').onclick=()=>{if(!App.state.completedLessons.includes(n))App.state.completedLessons.push(n);save();toast('Lesson completed');renderCourse()};
  window.scrollTo(0,0);
}
function readLesson(l){
  if(!('speechSynthesis' in window)){toast('Read aloud is not supported by this browser');return}
  stopSpeech();
  const text=[`Lesson ${l.lesson}. ${l.title}.`,l.outcome,...l.teaching_points,`Worked example. ${l.worked_example}`].join(' ');
  const u=new SpeechSynthesisUtterance(text);u.rate=.95;u.pitch=1;
  App.speech=u;speechSynthesis.speak(u);
}
function togglePauseSpeech(){if(!('speechSynthesis' in window))return;if(speechSynthesis.paused)speechSynthesis.resume();else speechSynthesis.pause()}
function stopSpeech(){if('speechSynthesis' in window)speechSynthesis.cancel();App.speech=null}
function practiceSet(){
  const numerical=App.questions.filter(q=>/Numerical/i.test(q.type));
  if(App.state.practiceLesson) return App.questions.filter(q=>q.lesson===App.state.practiceLesson);
  return numerical;
}
function renderPracticeHub(){
  const set=practiceSet(); if(!set.length){$('#view').innerHTML='<div class="card">No practice found.</div>';return}
  App.state.questionIndex=Math.min(App.state.questionIndex||0,set.length-1);
  const q=set[App.state.questionIndex];
  $('#view').innerHTML=`<div class="practice-layout">
   <section class="card question-card">
    <div class="row space"><span class="pill">Lesson ${q.lesson}</span><span class="muted">${App.state.questionIndex+1}/${set.length}</span></div>
    <h2>${esc(q.title)}</h2><p class="question">${esc(q.question)}</p>
    <div class="options">${q.options.map(o=>`<button class="option" data-opt="${o.key}"><strong>${o.key})</strong> ${esc(o.text)}</button>`).join('')}</div>
    <label class="row"><input id="notSure" type="checkbox"> <strong>Not Sure</strong> — review this even if correct</label>
    <div class="row" style="margin-top:12px"><button class="primary" id="submitQ">Check answer</button><button class="ghost" id="prevQ">← Previous</button><button class="ghost" id="nextQ">Next →</button></div>
    <div id="result"></div>
    <h3 style="margin-top:18px">Tutor help</h3>
    <div class="row">
      ${[['Hint','hint1'],['Method','hint2'],['Formula','formula'],['Setup','setup'],['Calculator','calculator'],['Solution','explanation']].map(([a,b])=>`<button class="secondary help" data-field="${b}">${a}</button>`).join('')}
    </div><div id="helpOut"></div>
   </section>
   <section class="notebook-wrap"><div class="notebook-toolbar">
    <button class="tool active" data-tool="pen">✎ Pen</button><button class="tool" data-tool="eraser">⌫ Eraser</button><button class="tool" data-tool="select">▱ Select</button>
    <button class="tool" id="copySel" title="Duplicate selected strokes">⧉ Copy</button>
    <button class="tool" id="growSel" title="Enlarge selected strokes">＋ Size</button>
    <button class="tool" id="shrinkSel" title="Shrink selected strokes">− Size</button>
    <button class="tool" id="deleteSel" title="Delete selected strokes">Delete Sel.</button>
    <span class="tool-sep"></span><button class="tool" id="undo">↶ Undo</button><button class="tool" id="redo">↷ Redo</button>
    <button class="tool" id="saveInk">Save</button><button class="tool" id="clearInk">Clear</button>
    <select class="tool" id="paper"><option value="grid">Grid</option><option value="lined">Lined</option><option value="blank">Blank</option></select>
   </div><div class="notebook-canvas-wrap ${App.state.settings.paper||'grid'}" id="canvasWrap">
     <canvas class="notebook-canvas" id="inkCanvas"></canvas><div class="selection-box" id="selectionBox"></div>
   </div><div class="pagebar"><button class="tool" id="prevPage">←</button><span id="pageLabel">1 / 1</span><button class="tool" id="nextPage">→</button><button class="tool" id="addPage">＋ Page</button><button class="tool" id="dupPage">Duplicate</button><button class="tool" id="delPage">Delete</button></div></section>
  </div>`;
  let selected=null, helpLevel=0;
  $$('.option').forEach(b=>b.onclick=()=>{$$('.option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selected=b.dataset.opt});
  $$('.help').forEach((b,i)=>b.onclick=()=>{helpLevel=Math.max(helpLevel,i+1);const v=q[b.dataset.field]||'No additional help is needed for this item.';$('#helpOut').innerHTML=`<div class="helpbox">${esc(v)}</div>`});
  $('#submitQ').onclick=()=>{
    if(!selected){toast('Choose an answer first');return}
    const correct=selected===q.answer, notSure=$('#notSure').checked;
    $$('.option').forEach(x=>{if(x.dataset.opt===q.answer)x.classList.add('correct');else if(x.dataset.opt===selected)x.classList.add('wrong')});
    App.state.attempts[q.id]={correct,answer:selected,notSure,helpLevel,time:Date.now(),lesson:q.lesson};
    save();
    $('#result').innerHTML=`<div class="answerbox"><strong>${correct?'Correct':'Not correct'}${notSure?' · marked Not Sure':''}</strong><p>${esc(q.explanation)}</p></div>`;
  };
  $('#prevQ').onclick=()=>{App.state.questionIndex=Math.max(0,App.state.questionIndex-1);save();renderPracticeHub()};
  $('#nextQ').onclick=()=>{App.state.questionIndex=Math.min(set.length-1,App.state.questionIndex+1);save();renderPracticeHub()};
  initNotebook(q.id);
}
function dueCards(){
  const now=Date.now(); return App.cards.filter(c=>{const s=App.state.cardState[c.id];return !s||!s.due||s.due<=now});
}
function renderFlashcards(){
  const cards=dueCards().length?dueCards():App.cards; if(!cards.length)return;
  let idx=Math.min(App.state.cardIndex||0,cards.length-1), flipped=false;
  function draw(){
    const c=cards[idx], st=App.state.cardState[c.id]||{};
    $('#view').innerHTML=`<div class="flash-shell">
      <div class="card"><div class="row space"><div><div class="eyebrow">Flashcards · ${esc(c.type)}</div><h2>${esc(c.lessonTitle)}</h2></div><span class="pill">${idx+1}/${cards.length}</span></div></div>
      <div class="card flashcard" id="flash" style="margin-top:12px"><div><small>${flipped?'ANSWER':'QUESTION'} · Lesson ${c.lesson}</small>${esc(flipped?c.back:c.front)}</div></div>
      <div class="row space" style="margin-top:10px"><button class="ghost" id="prevCard">← Previous</button><button class="primary" id="flipCard">Flip card</button><button class="ghost" id="nextCard">Next →</button></div>
      <div class="ratings" style="margin-top:10px"><button data-rate="Again">Again</button><button data-rate="Hard">Hard</button><button data-rate="Good">Good</button><button data-rate="Easy">Easy</button></div>
    </div>`;
    $('#flash').onclick=$('#flipCard').onclick=()=>{flipped=!flipped;draw()};
    $('#prevCard').onclick=()=>{idx=(idx-1+cards.length)%cards.length;flipped=false;App.state.cardIndex=idx;save();draw()};
    $('#nextCard').onclick=()=>{idx=(idx+1)%cards.length;flipped=false;App.state.cardIndex=idx;save();draw()};
    $$('[data-rate]').forEach(b=>b.onclick=()=>rateCard(c.id,b.dataset.rate));
  }
  function rateCard(id,r){
    const old=App.state.cardState[id]||{interval:0,ease:2.5};
    let days=r==='Again'?1:r==='Hard'?Math.max(2,old.interval*1.4||2):r==='Good'?Math.max(3,old.interval*2.2||3):Math.max(5,old.interval*3.2||5);
    App.state.cardState[id]={interval:days,last:r,due:Date.now()+days*86400000,ease:old.ease};
    save(); idx=(idx+1)%cards.length;flipped=false;draw();
  }
  draw();
}
function renderMocks(){
  $('#view').innerHTML=`<div class="card"><div class="eyebrow">Exam conditioning</div><h1>Mocks</h1><p class="muted">Use these after enough content is mastered. Full mocks use 130 questions / 4 hours; the current base bank will be expanded with fresh variants before final readiness scoring.</p></div>
  <div class="grid3" style="margin-top:12px">
    <div class="mock-option"><strong>20</strong><p>Mixed quick mock</p><button class="primary" onclick="startMock(20)">Start</button></div>
    <div class="mock-option"><strong>65</strong><p>Half mock · target 2 hours</p><button class="primary" onclick="startMock(65)">Start</button></div>
    <div class="mock-option"><strong>130</strong><p>Full mock · target 4 hours</p><button class="primary" onclick="startMock(130)">Start</button></div>
  </div>`;
}
function startMock(n){toast(`Mock engine shell ready for ${n} questions; fresh-variant release gate remains active.`)}
function readiness(){
  const coverage=progressPct();
  const attempts=Object.values(App.state.attempts), acc=attempts.length?attempts.filter(a=>a.correct&&!a.notSure&&a.helpLevel<=2).length/attempts.length*100:0;
  const cardsSeen=Object.keys(App.state.cardState).length, ret=Math.min(100,cardsSeen/Math.max(1,App.cards.length)*100);
  return Math.round(.35*coverage+.45*acc+.20*ret);
}
function renderProgress(){
  const attempts=Object.values(App.state.attempts), correct=attempts.filter(a=>a.correct).length, uncertain=attempts.filter(a=>a.notSure).length;
  $('#view').innerHTML=`<div class="card"><div class="eyebrow">Adaptive progress</div><h1>Readiness ${readiness()}%</h1><p class="muted">This is a study estimate, not a guaranteed exam result. Full-mock gates must be met before an exam-ready recommendation.</p></div>
  <div class="grid3" style="margin-top:12px">
   <div class="card metric"><span>Lessons complete</span><strong>${App.state.completedLessons.length}/93</strong></div>
   <div class="card metric"><span>Practice accuracy</span><strong>${attempts.length?Math.round(correct/attempts.length*100):0}%</strong><span>${attempts.length} attempts</span></div>
   <div class="card metric"><span>Not Sure</span><strong>${uncertain}</strong><span>These remain review items</span></div>
  </div><div class="card" style="margin-top:12px"><h2>Data portability</h2><p>Full backup includes progress, attempts, flashcard schedule, settings and all handwritten notebook pages stored in this browser.</p><button class="primary" onclick="exportBackup()">Export full backup</button></div>`;
}
async function exportBackup(){
  const ink=await InkDB.exportAll();
  const pack={schema:'cem-mastery-backup-v2',exportedAt:new Date().toISOString(),state:App.state,ink};
  const blob=new Blob([JSON.stringify(pack)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`CEM_Mastery_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Full backup exported');
}
async function restoreBackup(file){
  if(!file)return; try{
    const pack=JSON.parse(await file.text()); if(!pack.state)throw new Error('Invalid backup');
    App.state=pack.state;save();await InkDB.importAll(pack.ink||{});document.documentElement.dataset.theme=App.state.theme||'light';toast('Backup restored');route('home');
  }catch(e){toast('Could not restore backup')}
}

/* ---------- IndexedDB ink store ---------- */
const InkDB={
 db:null,
 open(){return new Promise((res,rej)=>{if(this.db)return res(this.db);const r=indexedDB.open('cem-mastery-ink',1);r.onupgradeneeded=()=>r.result.createObjectStore('ink');r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>rej(r.error)})},
 async get(k){const d=await this.open();return new Promise(res=>{const r=d.transaction('ink').objectStore('ink').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)})},
 async put(k,v){const d=await this.open();return new Promise(res=>{const t=d.transaction('ink','readwrite');t.objectStore('ink').put(v,k);t.oncomplete=()=>res()})},
 async exportAll(){const d=await this.open();return new Promise(res=>{const out={};const r=d.transaction('ink').objectStore('ink').openCursor();r.onsuccess=()=>{const c=r.result;if(c){out[c.key]=c.value;c.continue()}else res(out)}})},
 async importAll(obj){const d=await this.open();return new Promise(res=>{const t=d.transaction('ink','readwrite'),s=t.objectStore('ink');Object.entries(obj).forEach(([k,v])=>s.put(v,k));t.oncomplete=()=>res()})}
};

/* ---------- Apple Pencil / pointer notebook ---------- */
async function initNotebook(qid){
 const canvas=$('#inkCanvas'),wrap=$('#canvasWrap'),box=$('#selectionBox'),ctx=canvas.getContext('2d');
 let model=await InkDB.get(qid)||{pages:[{bg:App.state.settings.paper||'grid',strokes:[]}],page:0,undo:[],redo:[]};
 let tool='pen',drawing=false,current=null,selStart=null,selected=[],dragStart=null,movingSelection=false,penActive=false;
 function resize(){const r=wrap.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);redraw()}
 function page(){return model.pages[model.page]}
 function snapshot(){return JSON.stringify(model.pages)}
 function pushUndo(){model.undo.push(snapshot());if(model.undo.length>50)model.undo.shift();model.redo=[]}
 function redraw(){
   const r=wrap.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);wrap.classList.remove('grid','lined','blank');wrap.classList.add(page().bg||'grid');
   for(const s of page().strokes){ctx.beginPath();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=selected.includes(s.id)?'#176d9d':(s.color||'#17202a');ctx.lineWidth=s.width||2.4;
     s.pts.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.stroke()}
   $('#pageLabel').textContent=`${model.page+1} / ${model.pages.length}`;$('#paper').value=page().bg||'grid';
 }
 async function persist(){await InkDB.put(qid,model)}
 function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top,p:e.pressure||.5}}
 function hitStroke(p){
   let best=null,bd=14;
   for(const s of page().strokes)for(const a of s.pts){const d=Math.hypot(a.x-p.x,a.y-p.y);if(d<bd){best=s;bd=d}}
   return best
 }
 function down(e){
   if(e.pointerType==='touch'&&penActive)return;
   if(e.pointerType==='pen')penActive=true;
   canvas.setPointerCapture?.(e.pointerId);const p=point(e);
   if(tool==='pen'){pushUndo();drawing=true;current={id:crypto.randomUUID?.()||Date.now()+Math.random(),color:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||'#17202a',width:Math.max(1.8,2.2+(e.pressure||.5)*2.2),pts:[p]};page().strokes.push(current)}
   else if(tool==='eraser'){const s=hitStroke(p);if(s){pushUndo();page().strokes=page().strokes.filter(x=>x!==s);redraw();persist()}}
   else if(tool==='select'){
     const hit=hitStroke(p);
     if(hit && selected.includes(hit.id)){pushUndo();movingSelection=true;dragStart=p}
     else {selected=[];selStart=p;box.style.left=p.x+'px';box.style.top=p.y+'px';box.style.width='0';box.style.height='0';box.style.display='block'}
   }
 }
 function move(e){
   if(e.pointerType==='touch'&&penActive)return;const p=point(e);
   if(tool==='pen'&&drawing){current.pts.push(p);redraw()}
   else if(tool==='eraser'&&(e.buttons||e.pressure)){const s=hitStroke(p);if(s){page().strokes=page().strokes.filter(x=>x!==s);redraw()}}
   else if(tool==='select'&&movingSelection&&dragStart){
     const dx=p.x-dragStart.x,dy=p.y-dragStart.y;
     page().strokes.filter(s=>selected.includes(s.id)).forEach(s=>s.pts.forEach(a=>{a.x+=dx;a.y+=dy}));
     dragStart=p;redraw()
   } else if(tool==='select'&&selStart){const x=Math.min(selStart.x,p.x),y=Math.min(selStart.y,p.y),w=Math.abs(p.x-selStart.x),h=Math.abs(p.y-selStart.y);Object.assign(box.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'})}
 }
 function up(e){
   if(e.pointerType==='pen')penActive=false;
   if(tool==='pen'&&drawing){drawing=false;current=null;persist()}
   if(tool==='eraser')persist();
   if(tool==='select'&&movingSelection){movingSelection=false;dragStart=null;persist()}
   else if(tool==='select'&&selStart){const p=point(e),x1=Math.min(selStart.x,p.x),x2=Math.max(selStart.x,p.x),y1=Math.min(selStart.y,p.y),y2=Math.max(selStart.y,p.y);selected=page().strokes.filter(s=>s.pts.some(a=>a.x>=x1&&a.x<=x2&&a.y>=y1&&a.y<=y2)).map(s=>s.id);selStart=null;box.style.display='none';redraw();if(selected.length)toast(`${selected.length} stroke(s) selected — drag a selected stroke to move it`)}
 }
 canvas.style.touchAction='none';canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=down;canvas.onpointermove=move;canvas.onpointerup=up;canvas.onpointercancel=up;
 $$('.tool[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;$$('.tool[data-tool]').forEach(x=>x.classList.toggle('active',x===b));selected=[];redraw()});
 function transformSelected(scale){
   if(!selected.length){toast('Select strokes first');return}
   pushUndo();
   const strokes=page().strokes.filter(s=>selected.includes(s.id));
   const pts=strokes.flatMap(s=>s.pts);
   const cx=pts.reduce((a,p)=>a+p.x,0)/pts.length, cy=pts.reduce((a,p)=>a+p.y,0)/pts.length;
   strokes.forEach(s=>s.pts.forEach(p=>{p.x=cx+(p.x-cx)*scale;p.y=cy+(p.y-cy)*scale}));
   redraw();persist();
 }
 $('#copySel').onclick=()=>{
   if(!selected.length){toast('Select strokes first');return}
   pushUndo();
   const originals=page().strokes.filter(s=>selected.includes(s.id)), ids=[];
   originals.forEach(s=>{const cp=JSON.parse(JSON.stringify(s));cp.id=crypto.randomUUID?.()||String(Date.now()+Math.random());cp.pts.forEach(p=>{p.x+=20;p.y+=20});page().strokes.push(cp);ids.push(cp.id)});
   selected=ids;redraw();persist();
 };
 $('#growSel').onclick=()=>transformSelected(1.12);
 $('#shrinkSel').onclick=()=>transformSelected(.88);
 $('#deleteSel').onclick=()=>{if(!selected.length){toast('Select strokes first');return}pushUndo();page().strokes=page().strokes.filter(s=>!selected.includes(s.id));selected=[];redraw();persist()};

 $('#undo').onclick=()=>{if(!model.undo.length)return;model.redo.push(snapshot());model.pages=JSON.parse(model.undo.pop());model.page=Math.min(model.page,model.pages.length-1);selected=[];redraw();persist()};
 $('#redo').onclick=()=>{if(!model.redo.length)return;model.undo.push(snapshot());model.pages=JSON.parse(model.redo.pop());model.page=Math.min(model.page,model.pages.length-1);selected=[];redraw();persist()};
 $('#saveInk').onclick=async()=>{await persist();toast('Notebook saved')};
 $('#clearInk').onclick=()=>{if(confirm('Clear this page?')){pushUndo();page().strokes=[];selected=[];redraw();persist()}};
 $('#paper').onchange=e=>{page().bg=e.target.value;App.state.settings.paper=e.target.value;save();redraw();persist()};
 $('#prevPage').onclick=()=>{if(model.page>0){model.page--;selected=[];redraw();persist()}};
 $('#nextPage').onclick=()=>{if(model.page<model.pages.length-1){model.page++;selected=[];redraw();persist()}};
 $('#addPage').onclick=()=>{pushUndo();model.pages.splice(model.page+1,0,{bg:page().bg,strokes:[]});model.page++;selected=[];redraw();persist()};
 $('#dupPage').onclick=()=>{pushUndo();const cp=JSON.parse(JSON.stringify(page()));cp.strokes.forEach(s=>s.id=crypto.randomUUID?.()||Date.now()+Math.random());model.pages.splice(model.page+1,0,cp);model.page++;redraw();persist()};
 $('#delPage').onclick=()=>{if(model.pages.length===1){toast('Keep at least one page');return}if(confirm('Delete this notebook page?')){pushUndo();model.pages.splice(model.page,1);model.page=Math.max(0,model.page-1);selected=[];redraw();persist()}};
 // delete selected with keyboard on laptop
 window.onkeydown=e=>{if((e.key==='Delete'||e.key==='Backspace')&&selected.length){pushUndo();page().strokes=page().strokes.filter(s=>!selected.includes(s.id));selected=[];redraw();persist()}};
 new ResizeObserver(resize).observe(wrap);resize();
}
window.startMock=startMock;window.exportBackup=exportBackup;
init().catch(e=>{console.error(e);document.querySelector('#view').innerHTML='<div class="card"><h2>App initialization failed</h2><p>Please refresh. If this persists, redeploy all files including the data folder.</p></div>'});
