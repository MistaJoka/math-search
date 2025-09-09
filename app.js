// Standalone Equation Search — pure JS, no deps
const GRID_SIZE = 8;           // 8x8
const TARGET_MIN = 10, TARGET_MAX = 50;
const HIDDEN_EQUATIONS = 3;    // how many valid lines per round
const DIRS = [ [1,0],[0,1],[1,1],[-1,1],[-1,0],[0,-1],[-1,-1],[1,-1] ]; // straight/diagonal

const els = {
  grid: document.getElementById('searchGrid'),
  target: document.getElementById('searchTarget'),
  btnNew: document.getElementById('btn-new'),
};

let game = { target: null, dragging:false, path:[], cells:[], answersLeft:0 };

function speak(text){
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(u);
}

function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function pickTarget(){ return randInt(TARGET_MIN, TARGET_MAX); }

function opToJs(op){ return op==='×'?'*':op==='÷'?'/':op==='−'?'-':op; }

function evalExpr(a,op,b){
  try{ return Function('return ('+a+')'+opToJs(op)+'('+b+');')(); } catch { return NaN; }
}

function buildEquationsForTarget(target){
  const eqs = [];
  // + : a + b = target
  const a1 = randInt(1, target-1); const b1 = target - a1;
  eqs.push([String(a1), '+', String(b1)]);
  // × : a * b = target (only if factorable)
  let placedMult = false;
  for(let i=0;i<50 && !placedMult;i++){
    const a = randInt(2, Math.max(2, Math.floor(Math.sqrt(target))+3));
    if(target % a === 0){
      const b = target / a;
      if (Number.isInteger(b) && b>=2 && b<=99){
        eqs.push([String(a), '×', String(b)]);
        placedMult = true;
      }
    }
  }
  // − : (target + b) − b = target
  const b2 = randInt(1, 20);
  eqs.push([String(target + b2), '−', String(b2)]);
  // Include an explicit equals version for variety
  eqs.push([eqs[0][0], eqs[0][1], eqs[0][2], '=', String(target)]);
  // Shuffle and take distinct by string
  const seen = new Set(); const out = [];
  for(const t of eqs){
    const key = t.join('|'); if(!seen.has(key)){ seen.add(key); out.push(t); }
  }
  return out;
}

function emptyGrid(n){ return Array.from({length:n},()=>Array.from({length:n},()=>'')); }
function inBounds(r,c){ return r>=0 && r<GRID_SIZE && c>=0 && c<GRID_SIZE; }

function tryPlaceLine(grid, tokens){
  for(let k=0;k<250;k++){
    const [dr,dc] = DIRS[Math.floor(Math.random()*DIRS.length)];
    const sr = Math.floor(Math.random()*GRID_SIZE);
    const sc = Math.floor(Math.random()*GRID_SIZE);
    let r=sr,c=sc,ok=true;
    for(let i=0;i<tokens.length;i++){
      if(!inBounds(r,c)){ ok=false; break; }
      const cell = grid[r][c];
      if(cell!=='' && cell!==tokens[i]){ ok=false; break; }
      r+=dr; c+=dc;
    }
    if(ok){
      r=sr; c=sc;
      for(let i=0;i<tokens.length;i++){ grid[r][c] = tokens[i]; r+=dr; c+=dc; }
      return true;
    }
  }
  return false;
}

function fillRandoms(grid){
  const pool=['+','−','×','÷','=','0','1','2','3','4','5','6','7','8','9'];
  for(let r=0;r<GRID_SIZE;r++){
    for(let c=0;c<GRID_SIZE;c++){
      if(grid[r][c]===''){ grid[r][c]=pool[Math.floor(Math.random()*pool.length)]; }
    }
  }
}

function renderGrid(grid){
  els.grid.innerHTML=''; game.cells=[];
  for(let r=0;r<GRID_SIZE;r++){
    for(let c=0;c<GRID_SIZE;c++){
      const d=document.createElement('div');
      d.className='cell'; d.textContent=grid[r][c];
      d.dataset.r=r; d.dataset.c=c;
      d.addEventListener('mousedown', onDown);
      d.addEventListener('mouseenter', onEnter);
      d.addEventListener('mouseup', onUp);
      els.grid.appendChild(d); game.cells.push(d);
    }
  }
  document.addEventListener('mouseup', ()=>{ if(game.dragging) finishDrag(); });
}

function clearSelected(){ game.cells.forEach(el=>el.classList.remove('selected')); }

function rc(el){ return [Number(el.dataset.r), Number(el.dataset.c)]; }

function sameLine(path){
  if(path.length<2) return true;
  const [r0,c0]=rc(path[0]); const [r1,c1]=rc(path[1]);
  const dr=Math.sign(r1-r0), dc=Math.sign(c1-c0);
  for(let i=2;i<path.length;i++){
    const [pr,pc]=rc(path[i-1]); const [r,c]=rc(path[i]);
    if(Math.sign(r-pr)!==dr || Math.sign(c-pc)!==dc) return false;
  }
  return DIRS.some(([adr,adc])=>adr===Math.sign(r1-r0)&&adc===Math.sign(c1-c0));
}

function onDown(e){
  if(e.button!==0) return;
  game.dragging=true; game.path=[e.currentTarget];
  e.currentTarget.classList.add('selected');
}

function onEnter(e){
  if(!game.dragging) return;
  const last=game.path[game.path.length-1];
  if(e.currentTarget===last) return;
  const next=[...game.path, e.currentTarget];
  if(sameLine(next)){ game.path=next; e.currentTarget.classList.add('selected'); }
}

function onUp(){ if(game.dragging) finishDrag(); }

function finishDrag(){
  game.dragging=false;
  const tokens = game.path.map(el=>el.textContent);
  let ok=false;
  if(tokens.length===3){
    const [a,op,b]=tokens;
    ok = Number(evalExpr(a,op,b))===game.target;
  } else if(tokens.length===5 && tokens[3]==='='){
    const [a,op,b,eq,t]=tokens;
    ok = Number(evalExpr(a,op,b))===Number(t) && Number(t)===game.target;
  }
  if(ok){
    game.path.forEach(el=>el.classList.add('found'));
    speak('Correct!');
    game.answersLeft--;
    if(game.answersLeft<=0){ speak('Nice! New puzzle ready.'); }
  }
  clearSelected(); game.path=[];
}

function buildRound(){
  const grid=emptyGrid(GRID_SIZE);
  const target = pickTarget();
  game.target = target; els.target.textContent = target;
  const eqs = buildEquationsForTarget(target);
  game.answersLeft = 0;
  for(const tokens of eqs.slice(0, HIDDEN_EQUATIONS)){
    if(tryPlaceLine(grid, tokens)){ game.answersLeft++; }
  }
  fillRandoms(grid);
  renderGrid(grid);
}

els.btnNew.addEventListener('click', buildRound);
buildRound();
