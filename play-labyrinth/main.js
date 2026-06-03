// Простой генератор лабиринта + управление по клеткам (WASD)
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const levelLabel = document.getElementById('level');
  const restartBtn = document.getElementById('restart');

  let cols = 16, rows = 16;
  let level = 1;
  let cellSize = Math.floor(canvas.width / cols);

  function Cell(x, y) {
    this.x = x; this.y = y;
    this.walls = [true, true, true, true];
    this.visited = false;
  }

  function Maze(c, r) {
    this.c = c; this.r = r;
    this.grid = [];
    for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) this.grid.push(new Cell(x, y));
    this.index = (x, y) => x + y * c;

    this.generate = function() {
      const stack = [];
      let current = this.grid[0];
      current.visited = true;
      let visitedCount = 1;
      const total = this.grid.length;
      while (visitedCount < total) {
        const neighbors = [];
        const {x,y} = current;
        const pushIf = (nx,ny,dir) => {
          if (nx >= 0 && nx < c && ny >= 0 && ny < r) {
            const n = this.grid[this.index(nx,ny)];
            if (!n.visited) neighbors.push({cell:n,dir});
          }
        };
        pushIf(x, y-1, 0);
        pushIf(x+1, y, 1);
        pushIf(x, y+1, 2);
        pushIf(x-1, y, 3);
        if (neighbors.length) {
          const pick = neighbors[Math.floor(Math.random()*neighbors.length)];
          const dir = pick.dir;
          current.walls[dir] = false;
          pick.cell.walls[(dir+2)%4] = false;
          stack.push(current);
          current = pick.cell;
          current.visited = true;
          visitedCount++;
        } else {
          current = stack.pop();
        }
      }
    };

    this.draw = function(cellSize, ctx) {
      ctx.fillStyle = '#13220f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#2c7d2f';
      ctx.lineWidth = Math.max(10, Math.floor(cellSize / 4));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const drawBush = (x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = '#29b03a';
        const steps = 4;
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps;
          const lx = x1 + (x2 - x1) * t + ((i % 2) ? 2 : -2);
          const ly = y1 + (y2 - y1) * t + ((i % 2) ? -2 : 2);
          ctx.beginPath();
          ctx.arc(lx, ly, Math.max(4, Math.floor(cellSize / 12)), 0, Math.PI * 2);
          ctx.fill();
        }
      };
      for (const cell of this.grid) {
        const x = cell.x * cellSize, y = cell.y * cellSize;
        if (cell.walls[0]) drawBush(x + 2, y + 2, x + cellSize - 2, y + 2);
        if (cell.walls[1]) drawBush(x + cellSize - 2, y + 2, x + cellSize - 2, y + cellSize - 2);
        if (cell.walls[2]) drawBush(x + cellSize - 2, y + cellSize - 2, x + 2, y + cellSize - 2);
        if (cell.walls[3]) drawBush(x + 2, y + cellSize - 2, x + 2, y + 2);
      }
    };
  }

  let maze, player;

  function drawCat(px, py) {
    const cx = px + cellSize * 0.5;
    const cy = py + cellSize * 0.5;
    const r = Math.max(8, cellSize * 0.25);
    ctx.fillStyle = '#ffc66d';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#ffc66d';
    ctx.beginPath();
    ctx.moveTo(px + cellSize*0.2, py + cellSize*0.22);
    ctx.lineTo(px + cellSize*0.35, py + cellSize*0.05);
    ctx.lineTo(px + cellSize*0.45, py + cellSize*0.22);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + cellSize*0.8, py + cellSize*0.22);
    ctx.lineTo(px + cellSize*0.65, py + cellSize*0.05);
    ctx.lineTo(px + cellSize*0.55, py + cellSize*0.22);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx - r*0.35, cy - r*0.1, r*0.18, 0, Math.PI*2);
    ctx.arc(cx + r*0.35, cy - r*0.1, r*0.18, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r*0.35, cy - r*0.1, r*0.08, 0, Math.PI*2);
    ctx.arc(cx + r*0.35, cy - r*0.1, r*0.08, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#c32';
    ctx.beginPath();
    ctx.moveTo(cx, cy + r*0.05);
    ctx.lineTo(cx - r*0.15, cy + r*0.35);
    ctx.lineTo(cx + r*0.15, cy + r*0.35);
    ctx.closePath();
    ctx.fill();
  }

  function drawCoin(px, py) {
    const cx = px + cellSize * 0.5;
    const cy = py + cellSize * 0.5;
    const r = Math.max(10, cellSize * 0.3);
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff7c8';
    ctx.beginPath();
    ctx.arc(cx - r*0.18, cy - r*0.18, r*0.1, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#d17f00';
    ctx.font = `${Math.max(12, Math.floor(cellSize*0.28))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¢', cx, cy + r*0.05);
  }

  function newLevel() {
    cols = Math.min(64, 16 + Math.floor(level/3)*2);
    rows = Math.min(64, 16 + Math.floor(level/3)*2);
    cellSize = Math.floor(canvas.width / cols);
    if (cellSize < 6) cellSize = 6;
    maze = new Maze(cols, rows);
    maze.generate();
    player = {x:0,y:0};
    levelLabel.textContent = level;
    draw();
  }

  function draw() {
    maze.draw(cellSize, ctx);
    const ex = cols-1, ey = rows-1;
    drawCoin(ex*cellSize, ey*cellSize);
    drawCat(player.x*cellSize, player.y*cellSize);
  }

  function canMove(dx,dy) {
    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
    const cur = maze.grid[player.x + player.y*cols];
    if (dx === 1) return !cur.walls[1];
    if (dx === -1) return !cur.walls[3];
    if (dy === -1) return !cur.walls[0];
    if (dy === 1) return !cur.walls[2];
    return false;
  }

  function stepTo(nx, ny) {
    player.x = nx; player.y = ny; draw();
    if (player.x === cols-1 && player.y === rows-1) {
      level++;
      setTimeout(newLevel, 250);
    }
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const code = e.code;
    let moved = false;
    if (code === 'KeyW' || key === 'w' || key === 'ц' || e.key === 'ArrowUp') {
      if (canMove(0,-1)) { stepTo(player.x, player.y-1); moved = true; }
    }
    if (code === 'KeyS' || key === 's' || key === 'ы' || e.key === 'ArrowDown') {
      if (canMove(0,1)) { stepTo(player.x, player.y+1); moved = true; }
    }
    if (code === 'KeyA' || key === 'a' || key === 'ф' || e.key === 'ArrowLeft') {
      if (canMove(-1,0)) { stepTo(player.x-1, player.y); moved = true; }
    }
    if (code === 'KeyD' || key === 'd' || key === 'в' || e.key === 'ArrowRight') {
      if (canMove(1,0)) { stepTo(player.x+1, player.y); moved = true; }
    }
    if (moved) e.preventDefault();
  });

  restartBtn.addEventListener('click', () => { level = 1; newLevel(); });

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
    const tx = Math.floor(px / cellSize), ty = Math.floor(py / cellSize);
    const dx = tx - player.x, dy = ty - player.y;
    if (Math.abs(dx)+Math.abs(dy) === 1 && canMove(dx,dy)) stepTo(tx,ty);
  });

  newLevel();
})();
