  const gameContainer = document.getElementById("game-container");
  const API_URL = "https://kcagame.vercel.app/api/state";

  let isGameActive = false;
  let gameLoop;
  let currentState = null;
  let channelId = null;
  let userId = null;
  let player = { x: 0, y: 0, width: 50, height: 50, speed: 10 };
  let keys = {};
  let coins = [];
  let gamePaused = false;
  let gameOver = false;
  let score = 0;
  let coinInterval;
  let baseCoinSpeed = 3; // Vitesse initiale des pièces
  let baseSpawnRate = 1500; // Intervalle initial de spawn
  let username = null;
  let channelname = null;
  let bonusActive = false;
  let controlsInverted = false;
  let controlMultipliers = { x: 1, y: 1 };
  let secondinterval=false;
  let counter=0;
  let canPause = true; 
  let highscore = 0;
  let hasshown50=false;
  let hasshown100=false;
  let hasshown150=false;
  let playerImage = "images/katdumb.png"; 
  const coinSound = new Audio("images/402067__matrixxx__retro-coin-01.wav"); 
  let inverted = false;



  async function fetchUsername(userId) {
    try {
      const response = await fetch(`${API_URL}?channelId=${userId}&type=username`);
      const data = await response.json();
      return data.username || null;
    } catch (error) {
      console.error("Erreur lors de la récupération du nom d'utilisateur :", error);
      return null;
    }
  }
  // Fonction pour récupérer l'état du jeu depuis l'API
  async function fetchGameState(channelId) {
    try {
      const response = await fetch(`${API_URL}?channelId=${channelId}&type=state`);
      const data = await response.json();
      return data.active;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'état du jeu :", error);
      return false;
    }
  }
  async function fetchHighscore(channelId, userId) {
    try {
      const response = await fetch(`${API_URL}?type=profile&channelId=${channelId}&userId=${userId}`);
      const data = await response.json();
      return data.player?.highScore || 0;
    } catch (error) {
      console.error("Erreur récupération highscore:", error);
      return 0;
    }
  }
  // Fonction pour mettre à jour l'état du jeu via l'API
  async function updateGameState() {
    if (!channelId) return;

    try {
      const newState = await fetchGameState(channelId);
      if (newState !== currentState) {
        currentState = newState;
        newState && !isGameActive ? startGame() : (!newState && isGameActive) && stopGame();
      }
    } catch (error) {
      console.error("Erreur dans updateGameState :", error);
    }
  }
  function showWarningMessage(message, imageSrc = null) {
    const warningElement = document.getElementById("warning-message");
    
    if (imageSrc) {
        warningElement.innerHTML = `${message} <img src="${imageSrc}" alt="Warning Icon" style="height: 30px; vertical-align: middle;">`;
    } else {
        warningElement.textContent = message;
    }
    
    warningElement.style.display = "block";
    setTimeout(() => {
        warningElement.style.display = "none";
    }, 2000);
}


function checkWarnings() {
  if (score >= 48 && score < 50 && !hasshown50) {
      showWarningMessage("Des pièges vont apparaître !", "images/badcoin.png");
      hasshown50 = true;
  } else if (score >= 98 && score < 100 && !hasshown100) {
      showWarningMessage("Les contrôles seront bientôt inversés !");
      hasshown100 = true;
  } else if (score >= 148 && score < 150 && !hasshown150) {
      showWarningMessage("Tous les 5 points, vos contrôles auront une chance d'être inversés !");
      hasshown150 = true;
  }
}

  function stopGame() {
    isGameActive = false;
    
    clearInterval(gameLoop);
    clearInterval(coinInterval);
    gameContainer.style.display = "none";
    document.getElementById("game-over-overlay").style.display = "none";
  }
  async function updateScore() {
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelname, score, username, userId, type: "update" }),
      });
    } 
    
    catch (error) {
      console.error("Erreur dans updateScore :", error);
    }
  }

  function randomizeControls() {
    if (counter === 5 || counter === 6) {
      if (counter === 5) {
        counter = 0;
      }
      else {counter = 1;}
        inverted = Math.random() < 0.5;

        if (inverted) {
            
            controlMultipliers.x *= -1;
            controlMultipliers.y *= -1;
            showWarningMessage("", "images/invert.png");

        }
   
    }
}

  function startGame() {
    clearInterval(gameLoop); 
    clearInterval(coinInterval);
    hasshown50=false;
    hasshown100=false;
    hasshown150=false;
    playerImage = "images/katdumb.png"
    secondinterval=false;
    player.speed=10;
    isGameActive = true;
    gameOver = false;
    score = 0;
    coins = [];
    bonusActive = false;
    document.getElementById("game-over-overlay").style.display = "none";
    gameContainer.style.display = "block";
    initializeGame();
  }

  function showGameOverOverlay() {
    clearInterval(coinInterval);
    if (userId !== null) {
    updateScore();
    }
    document.getElementById("final-score").textContent = `Score: ${score}`;
    document.getElementById("game-over-overlay").style.display = "flex";
  }

  function initializeGame() {
    const canvas = document.getElementById("game-container");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    // Taille basée sur la largeur de la fenêtre (5%)
    player.width = canvas.width * 0.05;
    player.height = canvas.width * 0.05;
  
    // Position initiale centrée
    player.x = canvas.width/2 - player.width/2;
    player.y = canvas.height/2 - player.height/2;
  
    
  

    function drawPlayer() {
      const img = new Image();
      img.src = playerImage;
      ctx.drawImage(img, player.x, player.y, player.width, player.height);
    }
  
    function drawScore() {
      // Affichage du score sur fond coloré 
      ctx.fillStyle = "#FF92C9";
      ctx.fillRect(10, 10, 170, 65);
      ctx.font = "30px Arial";
      ctx.fillStyle = "#B6FFFD";
      ctx.fillText(`Score: ${score}`, 20, 40);
      ctx.font = "20px Arial"; // Police plus petite pour le highscore
      ctx.fillStyle = "#B6FFFD"; // Même couleur que le score
      ctx.fillText(`Highscore: ${highscore}`, 20, 65); // Position légèrement plus bas
}
    function drawPause() {
      // Affichage du menu Pause
      if (gamePaused) {
          // Dessiner l'arrière-plan du menu pause avant l'image du joueur
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Affichage du texte de pause
          ctx.fillStyle = "#B6FFFD";
          ctx.font = "40px Arial";
          ctx.textAlign = "center";
          ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2 - 20);
          ctx.font = "20px Arial";
          ctx.fillText("Appuyez sur Échap ou cliquez pour reprendre", canvas.width / 2, canvas.height / 2 + 20);
          ctx.textAlign = "start";
          return;
      }
  }
  function spawnCoin() {
    if (!isGameActive || gamePaused || gameOver) return;

    // Calcul du nombre de pièces en fonction du score
    let coinCount = 1 
    
    // Calcul de la probabilité de type de pièce
    for (let i = 0; i < coinCount; i++) {
      let type = "normal";
      const rand = Math.random();
      
      if (score >= 50) {
        if (rand < 0.1) type = "malus";
        else if (rand < 0.3) type = "bonus";
      } else if (rand < 0.1) {
        type = "bonus";
      }
      const coinSize = canvas.width * 0.03;
    coins.push({
      x: Math.random() * (canvas.width - coinSize),
      y: 0,
      width: coinSize,
      height: coinSize,
        speed: baseCoinSpeed,
        type: type
      });
    }
  }

  function drawCoins() {
    let shouldTriggerGameOver = false;

    // Parcourir le tableau à l'envers pour éviter les erreurs d'index
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      
      if (!gamePaused && !gameOver) {
        if (score<100) {
        coin.y += coin.speed + score / 25;
        player.speed = 10 + score / 50;
        }
      
          if (score>=100) {
          coin.y += coin.speed + (score-100)/ 25;
          player.speed = 12;
          }
        // Vérifier si la pièce sort de l'écran
        if (coin.y > canvas.height && coin.type !== "malus") {
          coins.splice(i, 1);
          shouldTriggerGameOver = true;
        }
        if (coin.y > canvas.height && coin.type == "malus") {
          score += 1;
          if (score >= 150) {
            counter++;
          }
          coins.splice(i, 1);
        }
      }

      // Dessiner la pièce
      const img = new Image();
      img.src = coin.type === "bonus" ? "images/KittyCoin_rainbow_72x72.png" :
              coin.type === "malus" ? "images/badcoin.png" : 
              "images/patounes.png";
      ctx.drawImage(img, coin.x, coin.y, coin.width, coin.height);
    }

    // Déclencher le Game Over après avoir traité toutes les pièces
    if (shouldTriggerGameOver && !gameOver) {
      gameOver = true;
      showGameOverOverlay();
      if (score > highscore) {
        highscore = score;
      }
    }
  }
  function detectCollisions() {
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      if (checkCollision(player, coin)) {
        if (coin.type === "malus") {
          gameOver = true;
          showGameOverOverlay();
        } else {
          score += coin.type === "bonus" ? 2 : 1;
          if (score >= 150 && coin.type === "bonus") {
            counter+=2;
          }
          if (score >= 150 && coin.type === "normal") {
            counter++;}
        }
       
        if (coin.type != "malus") {
          coinSound.currentTime = 0; 
          coinSound.play();
        playerImage = "images/katdumbopenmouth.png";
        setTimeout(() => {
          playerImage = "images/katdumb.png";
        }, 500); // 0.3 secondes
      }
        coins.splice(i, 1);
      }
    }
  }
  function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

    window.addEventListener("keydown", (event) => {
      
      if (event.key === "Escape" && canPause && !gameOver) {
        gamePaused = !gamePaused;
        canPause = false; 
        setTimeout(() => {
          canPause = true;
        }, 100); // 
      }
      keys[event.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (event) => {
      keys[event.key.toLowerCase()] = false;
    });
    window.addEventListener("click", () => {
      if (gamePaused) gamePaused = !gamePaused;
    });
    coinInterval = setInterval(spawnCoin, baseSpawnRate - (score-100)*10);

    gameLoop = setInterval(() => {
    if (score>=100 && !secondinterval) {
      clearInterval(coinInterval);
      coinInterval = setInterval(spawnCoin, baseSpawnRate- (score-100)*10);
      secondinterval=true;
    }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawScore();
      drawPlayer();
      drawCoins();
      drawPause();
      let moveX = 0, moveY = 0; // Initialisation

      detectCollisions();
      checkWarnings();
      if (!gamePaused && !gameOver) {
        moveX = (keys["d"] ? 1 : 0) - (keys["q"] || keys["a"] ? 1 : 0);
        moveY = (keys["s"] ? 1 : 0) - (keys["z"] || keys["w"] ? 1 : 0);
        if (score >= 150) {
          randomizeControls();
        }
  if (score >= 100 && score < 150) {
    moveX *= -1;
    moveY *= -1;
  }
  if (score >= 150) {
    moveX *= controlMultipliers.x;
    moveY *= controlMultipliers.y;
  }

    }
      player.x = Math.max(0, Math.min(canvas.width - player.width, player.x + moveX * player.speed));
      player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + moveY * player.speed));
    }, 1000 / 60);
  }
  function handleGamePauseOnBlur() {
    if (!gameOver){
    gamePaused = true; // Met le jeu en pause quand l'onglet ou la fenêtre perd le focus
  }}
  
  function handleGameResumeOnFocus() {
    if (!gameOver){
      gamePaused = true; // Met le jeu en pause quand l'onglet ou la fenêtre perd le focus
    }  }
  
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      handleGamePauseOnBlur();
    } else {
      handleGameResumeOnFocus();
    }
  });
  function handleResize() {
    const canvas = document.getElementById("game-container");
    const prevWidth = canvas.width;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    // Ajuster la taille du joueur
    player.width = canvas.width * 0.05;
    player.height = canvas.width * 0.05;
    for (let i = 0; i < coins.length; i++) {
      coins[i].width = canvas.width * 0.03;
      coins[i].height = canvas.width * 0.03;
    }
  
    // Maintenir la position relative
    const scale = canvas.width / prevWidth;
    player.x *= scale;
    player.y *= scale;
  
    // Limites du canvas
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  }
  
  window.addEventListener('resize', handleResize);
  
  window.addEventListener("blur", handleGamePauseOnBlur);
  window.addEventListener("focus", handleGameResumeOnFocus);
  
  // Gestion du bouton Retry
document.getElementById("retry-button").addEventListener("click", () => {
  startGame();
});
Twitch.ext.onAuthorized(async (auth) => {
  channelId = auth.channelId;
  userId = window.Twitch.ext.viewer.id;
  opaqueId = auth.userId;

  // Récupération des informations utilisateur
  if (!userId) {
    username = `guest_${opaqueId.substring(1, 6)}`;
  } else {
    username = await fetchUsername(userId);
    highscore = await fetchHighscore(channelId, userId);
  }
  channelname = await fetchUsername(channelId);

  // Souscription à Pusher après avoir défini channelId
  const pusher = new Pusher('6365fe61d21bdd415635', {
    cluster: 'eu',
    forceTLS: true,
  });
  const pusherChannel = pusher.subscribe(`game-${channelId}`);
  pusherChannel.bind('state-change', function(data) {
    console.log("Nouvel état reçu :", data);
    if (data.active && !isGameActive) {
      startGame();
    } else if (!data.active && isGameActive) {
      stopGame();
    }
  });

  // Récupérer l'état initial et lancer le jeu si nécessaire
  const initialState = await fetchGameState(channelId);
  currentState = initialState;
  if (initialState) startGame();
});
