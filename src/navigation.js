// Funções de navegação entre páginas
export const NavigationHelper = {
    // Ir para uma página específica
    goTo(page) {
        window.location.href = page;
    },

    // Salvar dados temporários no localStorage
    saveTemporaryData(key, data) {
        localStorage.setItem(`spaceInvaders_${key}`, JSON.stringify(data));
    },

    // Recuperar dados temporários
    getTemporaryData(key) {
        const data = localStorage.getItem(`spaceInvaders_${key}`);
        return data ? JSON.parse(data) : null;
    },

    // Limpar dados temporários
    clearTemporaryData(key) {
        localStorage.removeItem(`spaceInvaders_${key}`);
    },

    // Verificar se usuário está logado
    isUserLoggedIn() {
        return this.getTemporaryData('currentUser') !== null;
    },

    // Salvar dados do usuário atual
    setCurrentUser(userData) {
        this.saveTemporaryData('currentUser', userData);
    },

    // Obter dados do usuário atual
    getCurrentUser() {
        return this.getTemporaryData('currentUser');
    },

    // Fazer logout
    logout() {
        this.clearTemporaryData('currentUser');
        this.goTo('index.html');
    }
};