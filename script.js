// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let score = 0; // Current player score
let successfulClicks = 0; // Number of good drops caught
let audioContext; // Lazily created for click sound effects
const POLLUTED_DROP_CHANCE = 0.25; // 25% chance a drop is polluted
const BASE_SPAWN_INTERVAL = 1000;
const BASE_DROP_DURATION = 4;
const SPEED_STEP_INTERVAL = 5; // Increase difficulty every 5 successful clicks
const SPAWN_INTERVAL_DECREASE_PER_STEP = 80;
const DROP_DURATION_DECREASE_PER_STEP = 0.2;
const MIN_SPAWN_INTERVAL = 450;
const MIN_DROP_DURATION = 1.8;
const WIN_SCORE = 50;
const CONFETTI_COUNT = 120;

const scoreElement = document.getElementById("score");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const gameContainer = document.getElementById("game-container");
const winScreen = document.getElementById("win-screen");
const confettiLayer = document.getElementById("confetti-layer");
const playAgainButton = document.getElementById("play-again-btn");

function getSpeedLevel() {
  return Math.floor(successfulClicks / SPEED_STEP_INTERVAL);
}

function getCurrentSpawnInterval() {
  const level = getSpeedLevel();
  return Math.max(
    MIN_SPAWN_INTERVAL,
    BASE_SPAWN_INTERVAL - level * SPAWN_INTERVAL_DECREASE_PER_STEP
  );
}

function getCurrentDropDuration() {
  const level = getSpeedLevel();
  return Math.max(
    MIN_DROP_DURATION,
    BASE_DROP_DURATION - level * DROP_DURATION_DECREASE_PER_STEP
  );
}

function resetDropMakerInterval() {
  if (!gameRunning) return;
  clearInterval(dropMaker);
  dropMaker = setInterval(createDrop, getCurrentSpawnInterval());
}

function clearActiveBoardElements() {
  const activeElements = gameContainer.querySelectorAll(
    ".water-drop, .catch-pop"
  );
  activeElements.forEach((element) => element.remove());
}

function hideWinScreen() {
  winScreen.classList.remove("win-screen-visible");
  winScreen.classList.add("win-screen-hidden");
  confettiLayer.innerHTML = "";
}

function createConfetti() {
  const confettiColors = [
    "#ffc907",
    "#2e9df7",
    "#4fcb53",
    "#ff902a",
    "#f5402c",
    "#8bd1cb",
  ];

  confettiLayer.innerHTML = "";

  for (let i = 0; i < CONFETTI_COUNT; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor =
      confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.animationDuration = `${2.1 + Math.random() * 1.8}s`;
    piece.style.animationDelay = `${Math.random() * 1.2}s`;
    piece.style.opacity = `${0.75 + Math.random() * 0.25}`;

    confettiLayer.appendChild(piece);
  }
}

function showWinScreen() {
  createConfetti();
  winScreen.classList.remove("win-screen-hidden");
  winScreen.classList.add("win-screen-visible");
}

function handleWin() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearActiveBoardElements();
  showWinScreen();
}

function playCatchSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(820, now);
  oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.08);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

function showCatchPop(dropElement, pointsDelta) {
  const pop = document.createElement("div");
  pop.className = "catch-pop";
  pop.textContent = pointsDelta > 0 ? "+1" : "-1";
  pop.classList.add(pointsDelta > 0 ? "catch-pop-good" : "catch-pop-bad");
  pop.style.left = `${dropElement.offsetLeft + dropElement.offsetWidth / 2}px`;
  pop.style.top = `${dropElement.offsetTop + dropElement.offsetHeight / 2}px`;

  gameContainer.appendChild(pop);
  pop.addEventListener("animationend", () => {
    pop.remove();
  });
}

// Wait for button click to start the game
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

function resetGame() {
  clearInterval(dropMaker);
  gameRunning = false;
  score = 0;
  successfulClicks = 0;
  scoreElement.textContent = score;
  hideWinScreen();
  clearActiveBoardElements();
}

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  gameRunning = true;
  score = 0;
  successfulClicks = 0;
  scoreElement.textContent = score;
  hideWinScreen();

  // Create new drops every second (1000 milliseconds)
  dropMaker = setInterval(createDrop, getCurrentSpawnInterval());
}

function createDrop() {
  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  drop.className = "water-drop";

  // Randomly mark some droplets as polluted obstacles
  const isPolluted = Math.random() < POLLUTED_DROP_CHANCE;
  if (isPolluted) {
    drop.classList.add("bad-drop");
  }

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = gameContainer.offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  // Make drops fall faster as successful catches increase
  drop.style.animationDuration = `${getCurrentDropDuration()}s`;

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  // Catching a drop: remove it and increase score
  drop.addEventListener("click", () => {
    if (!gameRunning) return;
    if (drop.dataset.caught === "true") return;
    drop.dataset.caught = "true";

    const pointsDelta = isPolluted ? -1 : 1;
    score += pointsDelta;
    scoreElement.textContent = score;

    if (!isPolluted) {
      successfulClicks += 1;

      // Every 5 successful catches, tighten spawn interval.
      if (successfulClicks % SPEED_STEP_INTERVAL === 0) {
        resetDropMakerInterval();
      }
    }

    if (score >= WIN_SCORE) {
      handleWin();
      return;
    }

    showCatchPop(drop, pointsDelta);
    playCatchSound();

    drop.style.opacity = "0";
    drop.style.pointerEvents = "none";
    setTimeout(() => {
      drop.remove();
    }, 90);
  });

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
}
