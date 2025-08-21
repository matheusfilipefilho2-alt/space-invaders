import RankingManager from "./classes/RankingManager.js";
import { NavigationHelper } from "./navigation.js";

const rankingManager = new RankingManager();

// Elementos da página
const currentUserName = document.querySelector("#current-user-name");
const currentUserScore = document.querySelector("#current-user-score");
const rankingList = document.querySelector(".ranking-list");
const buttonPlayRanking = document.querySelector(".button-play-ranking");
const buttonLogout = document.querySelector(".button-logout");

// Event Listeners
buttonPlayRanking.addEventListener("click", () => {
    NavigationHelper.goTo('index.html?startGame=true');
});

buttonLogout.addEventListener("click", () => {
    NavigationHelper.logout();
});

// Carregar dados do usuário e ranking
async function loadUserData() {
    const currentUser = NavigationHelper.getCurrentUser();
    
    if (!currentUser) {
        NavigationHelper.goTo('login.html');
        return;
    }

    // Mostrar dados do usuário
    currentUserName.textContent = currentUser.username;
    currentUserScore.textContent = `Score: ${currentUser.high_score}`;

    // Configurar ranking manager
    rankingManager.currentUser = currentUser;

    // Carregar ranking
    const ranking = await rankingManager.getRanking();
    displayRanking(ranking);
}

// Exibir ranking
function displayRanking(ranking) {
    rankingList.innerHTML = "";

    ranking.forEach((player, index) => {
        const rankingItem = document.createElement("div");
        rankingItem.className = "ranking-item";

        const currentUser = NavigationHelper.getCurrentUser();
        if (currentUser && player.username === currentUser.username) {
            rankingItem.classList.add("current-user");
        }

        rankingItem.innerHTML = `
            <span class="ranking-position">#${index + 1}</span>
            <span>${player.username}</span>
            <span>${player.high_score}</span>
        `;

        rankingList.appendChild(rankingItem);
    });
}

// Inicializar página
loadUserData();