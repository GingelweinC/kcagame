document.addEventListener('DOMContentLoaded', function () {
    const backendUrl = "https://kcagame.vercel.app/api/state";  // URL de l'API
    const toggleButton = document.getElementById("toggle-game");
    const statusText = document.getElementById("status");
  
    let gameActive = false;
  
    // Récupérer le channelId via Twitch SDK
    Twitch.ext.onAuthorized((auth) => {
        const channelId = auth.channelId; // Récupère l'identifiant unique de la chaîne
  
        // Fonction pour activer/désactiver le jeu
        toggleButton.addEventListener("click", () => {
            gameActive = !gameActive;
  
            if (gameActive) {
                
                toggleButton.textContent = "Désactiver le jeu";
                statusText.textContent = "Le jeu est activé";
                // Appel pour activer le jeu
                fetch(backendUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ 
                        channelId, 
                        active: true, 
                        type: "state"  // Ajouter le type pour spécifier l'action
                    }) 
                }).then(response => response.json())
                  .then(data => console.log("Jeu activé :", data))
                  .catch(error => console.error("Erreur lors de l'activation du jeu :", error));
            } else {
                toggleButton.textContent = "Activer le jeu";
                statusText.textContent = "Le jeu est désactivé";
                // Appel pour désactiver le jeu
                fetch(backendUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ 
                        channelId, 
                        active: false, 
                        type: "state"  // Ajouter le type pour spécifier l'action
                    }) 
                }).then(response => response.json())
                  .then(data => console.log("Jeu désactivé :", data))
                  .catch(error => console.error("Erreur lors de la désactivation du jeu :", error));
            }
        });
    });
  });
  