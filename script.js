const gameContainer = document.getElementById("game");
const messageDisplay = document.getElementById("message");
const scoreDisplay = document.getElementById("endscore");
const timerDisplay = document.getElementById("timer");
const remainingFlagsDisplay = document.getElementById("remainingFlags");
const highscoreDisplay = document.getElementById("highscore");

const clickSound = document.getElementById("clickSound");
const explosionSound = document.getElementById("explosionSound");
const bgMusic = document.getElementById("bgMusic");

let rows, cols, minesCount, board, mineLocations, startTime, timerInterval;
let revealedCount = 0;
let flagsLeft;
let isMuted = false;

const highScores = {
    easy: 0,
    medium: 0,
    hard: 0
};

function startGame() {
    const difficulty = document.getElementById("level").value;
    if (difficulty === "easy") {
        rows = cols = 8;
        minesCount = 10;
    } else if (difficulty === "medium") {
        rows = cols = 12;
        minesCount = 25;
    } else {
        rows = cols = 16;
        minesCount = 40;
    }

    gameContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board = [];
    mineLocations = new Set();
    revealedCount = 0;
    flagsLeft = minesCount;
    remainingFlagsDisplay.textContent = flagsLeft;

    messageDisplay.classList.add("hidden");
    scoreDisplay.classList.add("hidden");

    gameContainer.innerHTML = "";
    clearInterval(timerInterval);
    timerDisplay.textContent = "000";
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    bgMusic.play();

    createBoard();
    placeMines();
    updateNumbers();

    updateHighScoreDisplay();
    gameActive = true;

}

function restartGame() {
    startGame(); // simplified
}

function createBoard() {
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener("click", handleCellClick);
            cell.addEventListener("contextmenu", handleRightClick);
            gameContainer.appendChild(cell);
            row.push({ element: cell, mine: false, revealed: false, flagged: false, number: 0 });
        }
        board.push(row);
    }
}

function placeMines() {
    while (mineLocations.size < minesCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const key = `${r},${c}`;
        if (!mineLocations.has(key)) {
            mineLocations.add(key);
            board[r][c].mine = true;
        }
    }
}

function updateNumbers() {
    const directions = [-1, 0, 1];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].mine) continue;
            let count = 0;
            for (let dr of directions) {
                for (let dc of directions) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
                        count++;
                    }
                }
            }
            board[r][c].number = count;
        }
    }
}

function handleCellClick(e) {
    if (!gameActive) return;  // <- ADD THIS LINE
    const cellEl = e.currentTarget;
    const r = parseInt(cellEl.dataset.row);
    const c = parseInt(cellEl.dataset.col);
    const cell = board[r][c];

    if (cell.revealed || cell.flagged) return;

    clickSound.currentTime = 0;
    clickSound.play();

    if (cell.mine) {
        revealAllMines();
        cellEl.classList.add("mine-hit");
        explosionSound.play();
        gameOver(false);
        return;
    }

    revealCell(r, c);
    checkWin();
}

function handleRightClick(e) {
    if (!gameActive) return;  // <- ADD THIS LINE
    e.preventDefault();
    const cellEl = e.currentTarget;
    const r = parseInt(cellEl.dataset.row);
    const c = parseInt(cellEl.dataset.col);
    const cell = board[r][c];

    if (cell.revealed) return;

    if (cell.flagged) {
        cell.flagged = false;
        cellEl.textContent = "";
        flagsLeft++;
    } else if (flagsLeft > 0) {
        cell.flagged = true;
        cellEl.textContent = "🚩";
        flagsLeft--;
    }
    remainingFlagsDisplay.textContent = flagsLeft;
}


function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    revealedCount++;
    const cellEl = cell.element;
    cellEl.classList.add("revealed");
    if (cell.number > 0) {
        cellEl.textContent = cell.number;
    }

    if (cell.number === 0) {
        const directions = [-1, 0, 1];
        for (let dr of directions) {
            for (let dc of directions) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

function revealAllMines() {
    mineLocations.forEach(loc => {
        const [r, c] = loc.split(",").map(Number);
        const cell = board[r][c];
        const cellEl = cell.element;
        cellEl.textContent = "💣";
        cellEl.classList.add("mine");
    });
}

function checkWin() {
    if (revealedCount === rows * cols - minesCount) {
        gameOver(true);
    }
}

function gameOver(won) {
    clearInterval(timerInterval);
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = String(seconds).padStart(3, "0");

    const difficulty = getCurrentDifficulty();
    const multiplier = { easy: 1, medium: 2, hard: 3 }[difficulty];

    const totalSafeCells = rows * cols - minesCount;
    const progress = revealedCount / totalSafeCells;
    const baseScore = 1000 * progress;
    const timePenalty = seconds * 5;
    const rawScore = baseScore - timePenalty;
    const score = Math.max(0, Math.floor(rawScore * multiplier));

    setMessage(won ? "You Win! 🎉" : "Game Over 💥");

    saveHighScore(score);
    const highScore = getHighScore();
    scoreDisplay.innerHTML = `Your Score: ${score}<br>🏆 High Score (${difficulty}): ${highScore}`;
    scoreDisplay.classList.remove("hidden");

    updateHighScoreDisplay();
    gameActive = false;

}

function updateTimer() {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = String(seconds).padStart(3, "0");
}

function setMessage(msg) {
    messageDisplay.textContent = msg;
    messageDisplay.classList.remove("hidden");
}

function toggleTheme() {
    document.body.classList.remove("dark");
    const selected = document.getElementById("theme").value;
    if (selected === "dark") {
        document.body.classList.add("dark");
    }
}

// NEW: High score logic using variables
function getCurrentDifficulty() {
    return document.getElementById("level").value;
}

function getHighScore() {
    const difficulty = getCurrentDifficulty();
    return highScores[difficulty];
}

function saveHighScore(score) {
    const difficulty = getCurrentDifficulty();
    if (score > highScores[difficulty]) {
        highScores[difficulty] = score;
    }
}

function updateHighScoreDisplay() {
    highscoreDisplay.textContent = getHighScore();
}

function showHelp() {
    alert("🧩 How to play Minesweeper:\n\nLeft-click to reveal a cell.\nRight-click to place/remove a 🚩.\nNumbers show nearby mines.\nReveal all safe cells to win.");
}
function enterGame() {
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("gameUI").classList.remove("hidden");
    startGame();
}
function toggleMute() {
    isMuted = !isMuted;

    const muteButton = document.getElementById("muteButton");
    muteButton.textContent = isMuted ? "🔇 Muted" : "🔊 Sound";

    clickSound.muted = isMuted;
    explosionSound.muted = isMuted;
    bgMusic.muted = isMuted;
}

startGame();
