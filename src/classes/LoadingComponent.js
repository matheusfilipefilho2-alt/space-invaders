/**
 * Componente de Loading para processos assíncronos
 * Exibe indicador de carregamento com mensagens personalizáveis
 */
export default class LoadingComponent {
    constructor() {
        this.loadingElement = null;
        this.progressElement = null;
        this.messageElement = null;
        this.isVisible = false;
        this.currentStep = 0;
        this.totalSteps = 0;
    }

    /**
     * Cria o elemento de loading no DOM
     */
    create() {
        if (this.loadingElement) return;

        // Container principal
        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'reward-loading';
        this.loadingElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Press Start 2P', monospace;
        `;

        // Container do conteúdo
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            text-align: center;
            color: #00ff00;
            padding: 40px;
            background: rgba(0, 20, 0, 0.8);
            border: 2px solid #00ff00;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
            max-width: 400px;
            width: 90%;
        `;

        // Spinner animado
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid rgba(0, 255, 0, 0.3);
            border-top: 3px solid #00ff00;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        `;

        // Adicionar animação CSS
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }

        // Mensagem principal
        this.messageElement = document.createElement('div');
        this.messageElement.style.cssText = `
            font-size: 12px;
            margin-bottom: 20px;
            animation: pulse 2s ease-in-out infinite;
        `;
        this.messageElement.textContent = 'Processando recompensas...';

        // Barra de progresso
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(0, 255, 0, 0.2);
            border-radius: 4px;
            margin-bottom: 15px;
            overflow: hidden;
        `;

        this.progressElement = document.createElement('div');
        this.progressElement.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #00cc00);
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 4px;
        `;

        // Texto de progresso
        this.progressTextElement = document.createElement('div');
        this.progressTextElement.style.cssText = `
            font-size: 8px;
            color: rgba(0, 255, 0, 0.8);
        `;
        this.progressTextElement.textContent = 'Iniciando...';

        // Montar estrutura
        progressContainer.appendChild(this.progressElement);
        contentContainer.appendChild(spinner);
        contentContainer.appendChild(this.messageElement);
        contentContainer.appendChild(progressContainer);
        contentContainer.appendChild(this.progressTextElement);
        this.loadingElement.appendChild(contentContainer);

        document.body.appendChild(this.loadingElement);
    }

    /**
     * Exibe o loading com configurações opcionais
     */
    show(config = {}) {
        // Suporte para string simples (backward compatibility)
        if (typeof config === 'string') {
            config = { message: config };
        }
        
        const {
            message = 'Processando recompensas...',
            totalSteps = 5,
            showProgress = true
        } = config;

        this.create();
        
        this.currentStep = 0;
        this.totalSteps = totalSteps;
        this.isVisible = true;

        this.messageElement.textContent = message;
        
        if (showProgress) {
            this.updateProgress(0, 'Iniciando...');
        } else {
            this.progressElement.parentElement.style.display = 'none';
            this.progressTextElement.style.display = 'none';
        }

        this.loadingElement.style.display = 'flex';
    }

    /**
     * Atualiza o progresso do loading
     */
    updateProgress(step, stepMessage = '') {
        if (!this.isVisible) return;

        this.currentStep = step;
        const percentage = (step / this.totalSteps) * 100;
        
        this.progressElement.style.width = `${percentage}%`;
        
        if (stepMessage) {
            this.progressTextElement.textContent = stepMessage;
        }
    }

    /**
     * Método para atualizar com etapas específicas
     */
    updateStep(currentStep, totalSteps, stepName) {
         const percentage = (currentStep / totalSteps) * 100;
         const message = `${stepName} (${currentStep}/${totalSteps})`;
         this.updateProgress(percentage, message);
     }

    /**
     * Avança para o próximo step
     */
    nextStep(stepMessage = '') {
        this.updateProgress(this.currentStep + 1, stepMessage);
    }

    /**
     * Atualiza a mensagem principal
     */
    updateMessage(message) {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    /**
     * Oculta o loading
     */
    hide() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * Remove o loading do DOM
     */
    destroy() {
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
            this.progressElement = null;
            this.messageElement = null;
            this.progressTextElement = null;
            this.isVisible = false;
        }
    }

    /**
     * Verifica se o loading está visível
     */
    isShowing() {
        return this.isVisible;
    }
}