import RankingManager from "./classes/RankingManager.js";
import { NavigationHelper } from "./navigation.js";

const rankingManager = new RankingManager();

// Elementos da página
const usernameInput = document.querySelector("#username");
const pinInput = document.querySelector("#pin");
const buttonLogin = document.querySelector("#login-btn");
const buttonRegister = document.querySelector("#register-btn");
const buttonBack = document.querySelector("#back-btn");

// Event Listeners
if (buttonLogin && usernameInput && pinInput) {
    buttonLogin.addEventListener("click", async () => {
        const username = usernameInput.value.trim();
        const pin = pinInput.value.trim();

        if (!username || pin.length !== 4) {
            alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
            return;
        }

        const result = await rankingManager.login(username, pin);

        if (result.success) {
            // Salvar dados do usuário
            NavigationHelper.setCurrentUser(result.user);
            // Ir para o ranking
            NavigationHelper.goTo('ranking.html');
        } else {
            alert(result.error);
        }
    });
}

if (buttonRegister) {
    buttonRegister.addEventListener("click", () => {
        NavigationHelper.goTo('register.html');
    });
}

if (buttonBack) {
    buttonBack.addEventListener("click", () => {
        NavigationHelper.goTo('index.html');
    });
}

// Focar no campo de usuário ao carregar
if (usernameInput) {
    usernameInput.focus();
}