const API_BASE_URL = "https://kcagame.vercel.app/api";
const REFRESH_INTERVAL = 30000; // 30 secondes
// Appliquer la hauteur fixe
document.body.style.height = '500px';
document.body.style.overflow = 'hidden';

function formatDate(isoString) {
  const date = new Date(isoString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function fetchLeaderboard(channelId) {
  fetch(`${API_BASE_URL}/state?type=leaderboard&channelId=${channelId}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.error("Erreur API:", data.error);
        return;
      }

      // Formater les dates
      data.leaderboard.forEach(player => {
        player.dateFormatted = formatDate(player.date);
      });

      // Mettre à jour le leaderboard
      updateLeaderboard(data.leaderboard);
    })
    .catch(error => console.error("Erreur leaderboard:", error));
}


function fetchProfile(channelId, userId, opaqueId) {

  if (userId === null) {
    console.warn("userId est null, utilisation de opaqueId");
    document.getElementById("player-title").textContent = `guest_${opaqueId.substring(1, 6)}`;
    return;
    }
  fetch(`${API_BASE_URL}/state?type=profile&channelId=${channelId}&userId=${userId}`)
    .then(response => response.json())
    .then(data => {
      if (data.player) {
        updatePlayerInfo(data.player);
        document.getElementById("player-title").textContent = data.player.username;
      }
    })
    .catch(error => console.error("Erreur lors du fetch du profile:", error));
}


function updateLeaderboard(leaderboard) {
  const tbody = document.getElementById("leaderboard-body");
  tbody.innerHTML = "";

  leaderboard.forEach((player, index) => {
    const row = document.createElement("tr");
    let icon = '';

    // Icônes de podium
    if (index === 0) icon = '<i class="fas fa-crown" style="color: #FFD700;"></i>';
    if (index === 1) icon = '<i class="fas fa-medal" style="color: #C0C0C0;"></i>';
    if (index === 2) icon = '<i class="fas fa-medal" style="color: #CD7F32;"></i>';

    row.innerHTML = `
    <td class="col-rank">${index + 1}</td>
    <td class="col-profile">
        <div class="profile-container">
            ${icon}
            <img src="${player.profilePic}" alt="Profil" width="30">
        </div>
    </td>
    <td class="col-username">${player.username}</td>
    <td class="col-score">${player.score}</td>
    <td class="col-date">${player.dateFormatted}</td>
`;
    tbody.appendChild(row);
  });
}

function updatePlayerInfo(player) {
  const elements = {
    pic: document.getElementById("player-pic"),
    highscore: document.getElementById("player-highscore"),
    games: document.getElementById("player-games"),
    highscoredate: document.getElementById("player-highscoredate")
  };

  if (elements.pic) elements.pic.src = player.profilePic || "default.jpg";
  if (elements.highscore) elements.highscore.textContent = player.highScore || 0;
  if (elements.games) elements.games.textContent = player.gamesPlayed || 0;
  if (elements.highscoredate) {
    elements.highscoredate.textContent = player.highScoreDate ? formatDate(player.highScoreDate) : "-";
  }
}

function setupTabs() {
  document.querySelectorAll(".tab-link").forEach(button => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".tab-link").forEach(btn => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });
}

window.Twitch.ext.onAuthorized(async auth => {
  const channelId = auth.channelId;
  const userId = window.Twitch.ext.viewer.id;
  const opaqueId = auth.userId;
  fetchLeaderboard(channelId);
  fetchProfile(channelId, userId, opaqueId);

  setInterval(() => {
    fetchLeaderboard(channelId);
    fetchProfile(channelId, userId, opaqueId); 
  }, REFRESH_INTERVAL);
});
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
});