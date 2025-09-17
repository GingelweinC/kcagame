import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// Exemple de fonction qui notifie les clients pour le changement d'état du jeu
function notifyGameStateChange(channelId, active) {
  console.log(`Envoi de l'événement state-change sur game-${channelId} avec active=${active}`);
  pusher.trigger(`game-${channelId}`, "state-change", { active });
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
let accessToken = null;


async function getGameState(channelId) {
  const stateRef = doc(db, "gameStates", channelId);
  const docSnap = await getDoc(stateRef);
  return docSnap.exists() ? docSnap.data().active : false;
}

async function setGameState(channelId, active) {
  const stateRef = doc(db, "gameStates", channelId);
  const docSnap = await getDoc(stateRef);
  const currentState = docSnap.exists() ? docSnap.data().active : false;

  if (currentState !== active) {
    await setDoc(stateRef, { active }, { merge: true });
    notifyGameStateChange(channelId, active);
  }
}
async function getUsername(userId) {
  try {
    const token = await getTwitchAccessToken();
    const response = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data.data[0].display_name;
  } catch (error) {
    console.error("Erreur getUsername:", error);
    throw error;
  }
}

async function getTwitchAccessToken() {
  if (accessToken) return accessToken;

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  accessToken = data.access_token;
  const expirationTime = Math.min(data.expires_in * 1000, 2147483647);
  setTimeout(() => (accessToken = null), expirationTime);
    return accessToken;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    const { channelId, type, userId } = req.query;

    try {
      if (type === "state") {
        const active = await getGameState(channelId);
        return res.status(200).json({ active });
      }

      if (type === "username") {
        const username = await getUsername(channelId);
        return res.status(200).json({ username });
      }

      if (type === "leaderboard") {
        const channelname = await getUsername(channelId);
        const channelRef = doc(db, "channels", channelname);
        const leaderboardRef = collection(channelRef, "leaderboard");
        const q = query(leaderboardRef, orderBy("score", "desc"), orderBy("date", "desc"), limit(10));
        const snapshot = await getDocs(q);
        
        const leaderboard = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate().toISOString()
        }));

        const token = await getTwitchAccessToken();
        const userIds = leaderboard.map(p => p.userId);
        const usersResponse = await fetch(`https://api.twitch.tv/helix/users?${userIds.map(id => `id=${id}`).join('&')}`, {
          headers: {
            "Client-ID": CLIENT_ID,
            Authorization: `Bearer ${token}`,
          },
        });

        const usersData = await usersResponse.json();
        const userMap = usersData.data.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});

        const finalLeaderboard = leaderboard.map(player => ({
          username: userMap[player.userId]?.display_name || "Inconnu",
          profilePic: userMap[player.userId]?.profile_image_url || "",
          score: player.score,
          date: player.date
        }));

        return res.status(200).json({ leaderboard: finalLeaderboard });
      }

      if (type === "profile") {
        const { channelId, userId } = req.query;
        try {
          const channelname = await getUsername(channelId);
          const username = await getUsername(userId);
          
          // Récupération des infos Twitch
          const token = await getTwitchAccessToken();
          const userResponse = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
            headers: {
              "Client-ID": CLIENT_ID,
              Authorization: `Bearer ${token}`,
            },
          });
          const userData = await userResponse.json();
          const profilePic = userData.data[0]?.profile_image_url || "";

          // Récupération des données joueur
          const playerRef = doc(db, "channels", channelname, "players", username);
          const playerDoc = await getDoc(playerRef);
          const playerData = playerDoc.exists() ? playerDoc.data() : { 
            highScore: 0, 
            highScoreDate: null, 
            gamesPlayed: 0 
          };

          return res.status(200).json({
            player: {
              ...playerData,
              profilePic,
              username,
              highScoreDate: playerData.highScoreDate
            }
          });

        } catch (error) {
          // En cas d'erreur (ex: userId invalide), retourner guest
          return res.status(200).json({ 
            player: {
              username: "guest",
              profilePic: "",
              highScore: 0,
              gamesPlayed: 0,
              highScoreDate: null
            } 
          });
        }
      }

    } catch (error) {
      console.error("Erreur GET:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  if (req.method === "POST") {
    const { type, channelname, score, username, userId } = req.body;

    try {
      if (type === "state") {
        const { active, channelId } = req.body;
        await setGameState(channelId, active); // Utilise Firestore
        return res.status(200).json({ message: "Game state updated", active });
      }
    

    if (type === "update") {
      const { channelname, score, username, userId, type } = req.body;
      const playersRef = doc(db, "channels", channelname, "players", username);
      const playerDoc = await getDoc(playersRef);
      
      const playerData = playerDoc.exists() ? playerDoc.data() : { 
          highScore: 0, 
          highScoreDate: null, // Ajout de la date du high score
          gamesPlayed: 0 
      };
  
      const isNewHighScore = score > playerData.highScore;
      
      const newData = {
          highScore: Math.max(playerData.highScore, score),
          highScoreDate: isNewHighScore ? new Date().toISOString() : playerData.highScoreDate, // Met à jour si high score battu
          gamesPlayed: playerData.gamesPlayed + 1,
          username,
      };
  
      await setDoc(playersRef, newData);
  
      const leaderboardRef = collection(db, "channels", channelname, "leaderboard");
      const newScoreRef = doc(leaderboardRef);
      
      await setDoc(newScoreRef, {
          userId,
          score,
          date: new Date(),
          username
      });
  
      return res.status(200).json({ message: "Score updated successfully" });
  }
  
    } catch (error) {
      console.error("Erreur POST:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).end();
}
