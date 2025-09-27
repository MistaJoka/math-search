// Standalone Equation Search — small, dependency-free game logic

// --- Constants and configuration ---
const GRID_SIZE = 6;           // Number of rows/columns in the grid
const TARGET_MIN = 10, TARGET_MAX = 50; // Range for random target numbers
const HIDDEN_EQUATIONS = 3;    // How many correct equations to try to hide
// Allowed directions for lines (8 compass directions)
const DIRS = [ [1,0],[0,1],[1,1],[-1,1],[-1,0],[0,-1],[-1,-1],[1,-1] ];

// --- Element references (cached DOM nodes) ---
const els = {
  grid: document.getElementById('searchGrid'), // container for grid cells
  target: document.getElementById('searchTarget'), // where the target number is shown
  btnNew: document.getElementById('btn-new'), // new puzzle button
  btnHint: document.getElementById('btn-hint'), // hint button
};

// --- Game state object ---
let game = { target: null, dragging:false, path:[], cells:[], answersLeft:0, solutions:[], gridSize: 0 };

// --- Utility: speak text via browser TTS if available ---
function speak(text){
  if (!('speechSynthesis' in window)) return; // no-op if not supported
  const u = new SpeechSynthesisUtterance(text); // create utterance
  window.speechSynthesis.speak(u); // speak immediately
}

// --- Utility: random integer in [a,b] ---
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function calculateGridSize(M) {
  const k = 2.0
  const L = 3
  return Math.ceil(k * Math.sqrt(k * L * M));
}

// --- Pick a random target number within configured range ---
function pickTarget(){ return randInt(TARGET_MIN, TARGET_MAX); }

// --- Convert displayed operator to valid JS operator ---
function opToJs(op){ return op==='×'?'*':op==='÷'?'/':op==='−'?'-':op; }

// --- Evaluate a simple binary expression safely (a op b) ---
function evalExpr(a,op,b){
  try{
    // Use Function to evaluate numeric expressions like (a) + (b)
    return Function('return ('+a+')'+opToJs(op)+'('+b+');')();
  } catch { return NaN; } // return NaN on malformed input
}

// --- Build a small set of candidate equations that evaluate to target ---
function buildEquationsForTarget(target){
  const eqs = [];
  // Addition: choose a random a, then b = target - a
  const a1 = randInt(1, target-1); const b1 = target - a1;
  eqs.push([String(a1), '+', String(b1)]);
  // Multiplication: try to find small integer factors of target
  let placedMult = false;
  for(let i=0;i<50 && !placedMult;i++){
    const a = randInt(2, Math.max(2, Math.floor(Math.sqrt(target))+3));
    if(target % a === 0){
      const b = target / a;
      if (Number.isInteger(b) && b>=2 && b<=99){
        eqs.push([String(a), '×', String(b)]);
        placedMult = true; // only add one multiplication variant
      }
    }
  }
  // Subtraction: make (target + b2) - b2 = target
  const b2 = randInt(1, 20);
  eqs.push([String(target + b2), '−', String(b2)]);

  // Deduplicate by string and return
  const seen = new Set(); const out = [];
  for(const t of eqs){
    const key = t.join('|'); if(!seen.has(key)){ seen.add(key); out.push(t); }
  }
  return out;
}

// --- Grid helpers ---
function emptyGrid(n){ return Array.from({length:n},()=>Array.from({length:n},()=>'')); } // empty n x n
function inBounds(r,c){ return r>=0 && r<game.gridSize && c>=0 && c<game.gridSize; } // index check

// --- Try placing a sequence of tokens (like ["12","+","3"]) on the grid in a straight/diagonal line ---
function tryPlaceLine(grid, tokens){
  for(let k=0;k<250;k++){ // try many random starts/directions
    const [dr,dc] = DIRS[Math.floor(Math.random()*DIRS.length)];
    const sr = Math.floor(Math.random()*game.gridSize);
    const sc = Math.floor(Math.random()*game.gridSize);
    let r=sr,c=sc,ok=true;
    for(let i=0;i<tokens.length;i++){
      if(!inBounds(r,c)){ ok=false; break; } // out of bounds
      const cell = grid[r][c];
      if(cell!=='' && cell!==tokens[i]){ ok=false; break; } // conflict
      r+=dr; c+=dc;
    }
    if(ok){
      // place tokens along chosen direction
      r=sr; c=sc;
      const pathCoords = [];
      for(let i=0;i<tokens.length;i++){ grid[r][c] = tokens[i]; pathCoords.push([r,c]); r+=dr; c+=dc; }
      return pathCoords; // success
    }
  }
  return null; // couldn't place after many attempts
}

// --- Fill any empty cells with random digits/operators ---
function fillRandoms(grid){
  const pool=['+','−','×','÷','0','1','2','3','4','5','6','7','8','9'];
  for(let r=0;r<game.gridSize;r++){
    for(let c=0;c<game.gridSize;c++){
      if(grid[r][c]===''){ grid[r][c]=pool[Math.floor(Math.random()*pool.length)]; }
    }
  }
}

// --- Render the grid into DOM cells and hook event handlers ---
function renderGrid(grid){
  els.grid.innerHTML=''; game.cells=[];
  els.grid.style.setProperty('--grid-size', game.gridSize);  // set CSS variable for grid size
  for(let r=0;r<game.gridSize;r++){
    for(let c=0;c<game.gridSize;c++){
      const d=document.createElement('div');
      d.className='cell'; d.textContent=grid[r][c]; // visible token
      d.dataset.r=r; d.dataset.c=c; // store coordinates for later
      d.addEventListener('mousedown', onDown);
      d.addEventListener('mouseenter', onEnter);
      d.addEventListener('mouseup', onUp);
      els.grid.appendChild(d); game.cells.push(d);
    }
  }
  // global mouseup to handle release outside a cell
  document.addEventListener('mouseup', ()=>{ if(game.dragging) finishDrag(); });
}

// --- Selection helpers ---
function clearSelected(){ game.cells.forEach(el=>el.classList.remove('selected')); }
function rc(el){ return [Number(el.dataset.r), Number(el.dataset.c)]; }

// --- Check that selected path stays in a straight or diagonal direction ---
function sameLine(path){
  if(path.length<2) return true; // single cell always allowed
  const [r0,c0]=rc(path[0]); const [r1,c1]=rc(path[1]);
  const dr=Math.sign(r1-r0), dc=Math.sign(c1-c0);
  for(let i=2;i<path.length;i++){
    const [pr,pc]=rc(path[i-1]); const [r,c]=rc(path[i]);
    if(Math.sign(r-pr)!==dr || Math.sign(c-pc)!==dc) return false; // deviates
  }
  // also ensure the direction matches one of the allowed DIRS
  return DIRS.some(([adr,adc])=>adr===Math.sign(r1-r0)&&adc===Math.sign(c1-c0));
}

// --- Mouse event handlers for drawing a selection ---
function onDown(e){
  if(e.button!==0) return; // only left-click starts
  game.dragging=true; game.path=[e.currentTarget];
  e.currentTarget.classList.add('selected'); // highlight start cell
}
function onEnter(e){
  if(!game.dragging) return; // only when dragging
  const last=game.path[game.path.length-1];
  if(e.currentTarget===last) return; // already last
  const next=[...game.path, e.currentTarget];
  if(sameLine(next)){ game.path=next; e.currentTarget.classList.add('selected'); }
}
function onUp(){ if(game.dragging) finishDrag(); }

// --- End of drag: evaluate the selected tokens and mark correct answers ---
function finishDrag(){
  game.dragging=false;
  const tokens = game.path.map(el=>el.textContent);
  let ok=false;
  if(tokens.length===3){ // expecting binary expression like [a,op,b]
    const [a,op,b]=tokens;
    ok = Number(evalExpr(a,op,b))===game.target;
  }
  if(ok){
    game.path.forEach(el=>el.classList.add('found')); // mark correct
    speak('Correct!');
    game.answersLeft--;
    if(game.answersLeft<=0){ speak('Nice! New puzzle ready.'); }
  }
  clearSelected(); game.path=[]; // clear selection visuals and reset
}

// --- Build a new puzzle round: pick target, hide equations, fill grid ---
function buildRound(){
  game.gridSize = calculateGridSize(HIDDEN_EQUATIONS);
  const grid = emptyGrid(game.gridSize );
  const target = pickTarget();
  game.target = target; els.target.textContent = target; // update UI
  const eqs = buildEquationsForTarget(target);
  game.answersLeft = 0;
  game.solutions = [];
  for(const tokens of eqs.slice(0, HIDDEN_EQUATIONS)){
    const pathCoords = tryPlaceLine(grid, tokens);
    if(tryPlaceLine){ game.answersLeft++; game.solutions.push(pathCoords); } // count placed answers
  }
  fillRandoms(grid); // fill blanks
  renderGrid(grid, game.gridSize); // show to user
}

function showHint() {
  // Find a solution path that hasn't been found yet
  const unsolved = game.solutions.find(path => {
    // Calculate the index of the first cell in the solution path
    const firstCellIndex = path[0][0] * game.gridSize + path[0][1];
    // Check if the first cell in this path is not already marked as 'found'
    return !game.cells[firstCellIndex].classList.contains('found');
  });

  if (!unsolved) {
    // If all solutions have been found, notify the user
    speak('All equations found!');
    return; // No hints to give
  }

  const hintCells = []; // Array to keep track of cells being highlighted
  unsolved.forEach(([r, c]) => {
    // Calculate the index for each cell in the solution path
    const index = r * game.gridSize + c;
    // Get the cell DOM element
    const cell = game.cells[index];
    // Add the 'hint' class to visually highlight the cell
    cell.classList.add('hint');
    // Store the cell for later removal of the highlight
    hintCells.push(cell);
  });

  // Remove the highlight after 2 seconds
  setTimeout(() => {
    hintCells.forEach(cell => cell.classList.remove('hint'));
  }, 2000);
}

els.btnHint.addEventListener('click', showHint);



// --- Wire up controls and start the first round ---
els.btnNew.addEventListener('click', buildRound);
buildRound();
