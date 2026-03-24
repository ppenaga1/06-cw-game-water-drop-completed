// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let timeTimer; // Will store our timer for the countdown
let score = 0; // Current player score
let successfulClicks = 0; // Number of good drops caught
let timeRemaining = 0; // Time remaining in current game
let audioContext; // Lazily created for click sound effects
let selectedDifficulty = "medium"; // Current difficulty level

// Difficulty settings: {timeLimit, base spawn interval, base drop duration, min spawn interval, min drop duration}
const DIFFICULTY_SETTINGS = {
  easy: {
    timeLimit: 60,
    baseSpawnInterval: 850,
    baseDropDuration: 5,
    minSpawnInterval: 400,
    minDropDuration: 2.5,
  },
  medium: {
    timeLimit: 45,
    baseSpawnInterval: 700,
    baseDropDuration: 4,
    minSpawnInterval: 300,
    minDropDuration: 1.8,
  },
  hard: {
    timeLimit: 30,
    baseSpawnInterval: 550,
    baseDropDuration: 3,
    minSpawnInterval: 250,
    minDropDuration: 1.2,
  },
};

const WIN_SCORE = 50; // Points needed to win (same for all difficulties)
const POLLUTED_DROP_CHANCE = 0.25; // 25% chance a drop is polluted
const SPEED_STEP_INTERVAL = 5; // Increase difficulty every 5 successful clicks
const SPAWN_INTERVAL_DECREASE_PER_STEP = 80;
const DROP_DURATION_DECREASE_PER_STEP = 0.2;
const CONFETTI_COUNT = 120;
const MILESTONE_THRESHOLDS = [0.25, 0.5, 0.75];
const MILESTONE_MESSAGES = {
  0.25: "Great start! 25% there!",
  0.5: "Halfway there!",
  0.75: "Almost there!",
};
let milestoneShown = {};

// Helper function to get current difficulty settings
function getDifficultySettings() {
  return DIFFICULTY_SETTINGS[selectedDifficulty];
}

// Helper function to get time limit for current difficulty
function getTimeLimit() {
  return getDifficultySettings().timeLimit;
}

const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const gameContainer = document.getElementById("game-container");
const winScreen = document.getElementById("win-screen");
const confettiLayer = document.getElementById("confetti-layer");
const playAgainButton = document.getElementById("play-again-btn");
const winMessage = document.getElementById("win-message");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");

function getSpeedLevel() {
  return Math.floor(successfulClicks / SPEED_STEP_INTERVAL);
}

function getCurrentSpawnInterval() {
  const level = getSpeedLevel();
  const settings = getDifficultySettings();
  return Math.max(
    settings.minSpawnInterval,
    settings.baseSpawnInterval - level * SPAWN_INTERVAL_DECREASE_PER_STEP
  );
}

function getCurrentDropDuration() {
  const level = getSpeedLevel();
  const settings = getDifficultySettings();
  return Math.max(
    settings.minDropDuration,
    settings.baseDropDuration - level * DROP_DURATION_DECREASE_PER_STEP
  );
}

function resetDropMakerInterval() {
  if (!gameRunning) return;
  clearInterval(dropMaker);
  dropMaker = setInterval(createDrop, getCurrentSpawnInterval());
}

function clearActiveBoardElements() {
  const activeElements = gameContainer.querySelectorAll(
    ".water-drop, .catch-pop, .milestone-indicator"
  );
  activeElements.forEach((element) => element.remove());
}

function showMilestoneIndicator(message) {
  const indicator = document.createElement("div");
  indicator.className = "milestone-indicator";
  indicator.textContent = message;

  gameContainer.appendChild(indicator);
  indicator.addEventListener("animationend", () => {
    indicator.remove();
  });
}

function checkMilestones() {
  const progress = score / WIN_SCORE;

  MILESTONE_THRESHOLDS.forEach((threshold) => {
    const thresholdKey = `${threshold}`;
    if (!milestoneShown[thresholdKey] && progress >= threshold) {
      milestoneShown[thresholdKey] = true;
      showMilestoneIndicator(MILESTONE_MESSAGES[threshold]);
    }
  });
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
  clearInterval(timeTimer);
  clearActiveBoardElements();
  playWinTrumpetSound();
  winMessage.textContent = `You reached 50 points with ${timeRemaining}s left!`;
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

function playWinTrumpetSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const notes = [523.25, 659.25, 783.99];
  const startTime = audioContext.currentTime;

  notes.forEach((note, index) => {
    const noteStart = startTime + index * 0.12;
    const noteEnd = noteStart + 0.2;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note, noteStart);

    gainNode.gain.setValueAtTime(0.0001, noteStart);
    gainNode.gain.exponentialRampToValueAtTime(0.14, noteStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
  });
}

function playBadDropSound() {
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

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(260, now);
  oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.16);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.19);
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

function showRedFlash() {
  const flash = document.createElement("div");
  flash.className = "flash-overlay";
  gameContainer.appendChild(flash);
  flash.addEventListener("animationend", () => {
    flash.remove();
  });
}

// Handle difficulty selection
difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Update active state
    difficultyButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update selected difficulty
    selectedDifficulty = button.dataset.difficulty;

    // Reset the game and refresh UI with the selected mode's time limit
    resetGame();
    timeRemaining = getTimeLimit();
    timeElement.textContent = timeRemaining;
  });
});

function resetGame() {
  clearInterval(dropMaker);
  clearInterval(timeTimer);
  gameRunning = false;
  score = 0;
  successfulClicks = 0;
  milestoneShown = {};
  timeRemaining = 0;
  scoreElement.textContent = score;
  timeElement.textContent = timeRemaining;
  hideWinScreen();
  clearActiveBoardElements();
}

// Show selected mode's starting time before the first game starts
timeRemaining = getTimeLimit();
timeElement.textContent = timeRemaining;

function updateTimer() {
  timeRemaining--;
  timeElement.textContent = timeRemaining;
  
  if (timeRemaining <= 0) {
    handleTimeUp();
  }
}

function handleTimeUp() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(timeTimer);
  clearActiveBoardElements();
  winMessage.textContent = `Time's up! You scored ${score} out of ${WIN_SCORE} points.`;
  showWinScreen();
}

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  gameRunning = true;
  score = 0;
  successfulClicks = 0;
  milestoneShown = {};
  timeRemaining = getTimeLimit();
  scoreElement.textContent = score;
  timeElement.textContent = timeRemaining;
  hideWinScreen();

  // Create new drops every second (1000 milliseconds)
  dropMaker = setInterval(createDrop, getCurrentSpawnInterval());
  
  // Start countdown timer
  timeTimer = setInterval(updateTimer, 1000);
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
    checkMilestones();

    if (!isPolluted) {
      successfulClicks += 1;

      // Every 5 successful catches, tighten spawn interval.
      if (successfulClicks % SPEED_STEP_INTERVAL === 0) {
        resetDropMakerInterval();
      }
    }

    if (isPolluted) {
      showRedFlash();
      playBadDropSound();
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
