import RankingManager from "./classes/RankingManager.js";
import { NavigationHelper } from "./navigation.js";

const rankingManager = new RankingManager();

// Flag para prevenir double-submit
let isLoggingIn = false;

// Elementos da página
const usernameInput = document.querySelector("#username");
const pinInput = document.querySelector("#pin");
const buttonLogin = document.querySelector("#login-btn");
const buttonRegister = document.querySelector("#register-btn");
const buttonBack = document.querySelector("#back-btn");

// Event Listeners
if (buttonLogin && usernameInput && pinInput) {
    buttonLogin.addEventListener("click", async () => {
        // Prevenir double-submit
        if (isLoggingIn) {
            console.log('Login já em andamento...');
            return;
        }

        isLoggingIn = true;
        buttonLogin.disabled = true;

        try {
            const username = usernameInput.value.trim();
            const pin = pinInput.value.trim();

            if (!username || pin.length !== 4) {
                alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
                return;
            }

            // Validação numérica (Task 1)
            if (!/^\d{4}$/.test(pin)) {
                alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
                return;
            }

            const result = await rankingManager.login(username, pin);
            console.log(result.user);

            if (result.success) {
                NavigationHelper.setCurrentUser(result.user);
                NavigationHelper.goTo('ranking.html');
            } else {
                alert(result.error);
            }
        } finally {
            isLoggingIn = false;
            buttonLogin.disabled = false;
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