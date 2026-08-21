import RankingManager from "./classes/RankingManager.js";
import { NavigationHelper } from "./navigation.js";

const rankingManager = new RankingManager();

// Flag para prevenir double-submit
let isRegistering = false;

// Elementos da página
const newUsernameInput = document.querySelector("#new-username");
const newPinInput = document.querySelector("#new-pin");
const confirmPinInput = document.querySelector("#confirm-pin");
const buttonCreate = document.querySelector(".button-create");
const buttonBackRegister = document.querySelector(".button-back-register");

// Event Listeners
if (buttonCreate && newUsernameInput && newPinInput && confirmPinInput) {
    buttonCreate.addEventListener("click", async () => {
        // Prevenir double-submit
        if (isRegistering) {
            console.log('Registro já em andamento...');
            return;
        }

        isRegistering = true;
        buttonCreate.disabled = true;

        try {
            const username = newUsernameInput.value.trim();
            const pin = newPinInput.value.trim();
            const confirmPin = confirmPinInput.value.trim();

            if (!username || pin.length !== 4) {
                alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
                return;
            }

            // Validação numérica (Task 1)
            if (!/^\d{4}$/.test(pin)) {
                alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
                return;
            }

            if (pin !== confirmPin) {
                alert("PINs não conferem!");
                return;
            }

            // Hash do PIN antes de enviar (bcrypt salt 10)
            console.log('🔐 Hasheando PIN...');

            // Verificar se bcrypt está disponível
            if (typeof bcrypt === 'undefined' || !window.bcrypt) {
                console.error('❌ bcrypt não está carregado!');
                alert('Erro: Sistema de segurança não carregado. Recarregue a página.');
                return;
            }

            const hashedPin = bcrypt.hashSync(pin, 10);
            console.log('✅ PIN hasheado com sucesso');

            const result = await rankingManager.register(username, hashedPin);

            if (result.success) {
                NavigationHelper.setCurrentUser(result.user);
                NavigationHelper.goTo('ranking.html');
            } else {
                alert(result.error);
            }
        } finally {
            isRegistering = false;
            buttonCreate.disabled = false;
        }
    });
}

if (buttonBackRegister) {
    buttonBackRegister.addEventListener("click", () => {
        NavigationHelper.goTo('login.html');
    });
}

// Focar no campo de usuário ao carregar
if (newUsernameInput) {
    newUsernameInput.focus();
}