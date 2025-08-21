import RankingManager from "./classes/RankingManager.js";
import { NavigationHelper } from "./navigation.js";

const rankingManager = new RankingManager();

// Elementos da página
const newUsernameInput = document.querySelector("#new-username");
const newPinInput = document.querySelector("#new-pin");
const confirmPinInput = document.querySelector("#confirm-pin");
const buttonCreate = document.querySelector(".button-create");
const buttonBackRegister = document.querySelector(".button-back-register");

// Event Listeners
buttonCreate.addEventListener("click", async () => {
    const username = newUsernameInput.value.trim();
    const pin = newPinInput.value.trim();
    const confirmPin = confirmPinInput.value.trim();

    if (!username || pin.length !== 4) {
        alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
        return;
    }

    if (pin !== confirmPin) {
        alert("PINs não conferem!");
        return;
    }

    const result = await rankingManager.register(username, pin);

    if (result.success) {
        // Salvar dados do usuário
        NavigationHelper.setCurrentUser(result.user);
        // Ir para o ranking
        NavigationHelper.goTo('ranking.html');
    } else {
        alert(result.error);
    }
});

buttonBackRegister.addEventListener("click", () => {
    NavigationHelper.goTo('login.html');
});

// Focar no campo de usuário ao carregar
newUsernameInput.focus();