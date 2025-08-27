import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';
import gameConfig from './GameConfig.js';

class NotificationSystem {
    constructor() {
        this.currentUser = null;
        this.notifications = [];
        this.subscribedChannels = [];
        this.notificationQueue = [];
        this.maxVisible = 3;
        this.container = null;
        
        // Configurações do sistema
        this.config = {
            defaultDuration: 4000,
            fadeInDuration: 300,
            fadeOutDuration: 300,
            maxNotifications: 50,
            enableSound: true,
            enableVibration: true,
            persistAcrossPages: true
        };

        // Tipos de notificação e suas configurações
        this.types = {
            achievement: {
                icon: '🏆',
                color: '#FFD700',
                sound: 'achievement',
                priority: 2,
                duration: 5000
            },
            reward: {
                icon: '💰',
                color: '#00ff88',
                sound: 'coin',
                priority: 1,
                duration: 4000
            },
            levelUp: {
                icon: '⭐',
                color: '#4ECDC4',
                sound: 'levelup',
                priority: 3,
                duration: 6000
            },
            warning: {
                icon: '⚠️',
                color: '#FFA502',
                sound: 'warning',
                priority: 2,
                duration: 5000
            },
            error: {
                icon: '❌',
                color: '#FF4757',
                sound: 'error',
                priority: 3,
                duration: 7000
            },
            info: {
                icon: 'ℹ️',
                color: '#74b9ff',
                sound: null,
                priority: 0,
                duration: 3000
            },
            system: {
                icon: '🔧',
                color: '#a29bfe',
                sound: 'notification',
                priority: 1,
                duration: 4000
            },
            social: {
                icon: '👥',
                color: '#fd79a8',
                sound: 'social',
                priority: 1,
                duration: 4000
            }
        };

        this.init();
    }

    async init() {
        this.createContainer();
        this.loadLocalNotifications();
        this.setupServiceWorker();
        this.setupKeyboardShortcuts();
        
        // Configurar realtime subscriptions
        if (this.currentUser) {
            this.setupRealtimeNotifications();
        }

        console.log('🔔 Sistema de notificações inicializado');
    }

    // Configurar usuário
    setUser(user) {
        this.currentUser = user;
        if (user) {
            this.setupRealtimeNotifications();
            this.loadServerNotifications();
        } else {
            this.cleanup();
        }
    }

    // Criar container para notificações
    createContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'notification-system-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            font-family: 'Press Start 2P', monospace;
            max-width: 350px;
        `;

        document.body.appendChild(this.container);

        // Adicionar estilos CSS
        this.injectStyles();
    }

    // Injetar estilos CSS
    injectStyles() {
        if (document.getElementById('notification-system-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-system-styles';
        style.textContent = `
            .notification-item {
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid;
                border-radius: 12px;
                padding: 15px 20px;
                margin-bottom: 10px;
                color: white;
                font-size: 10px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(20px);
                position: relative;
                overflow: hidden;
                pointer-events: auto;
                cursor: pointer;
                transition: all 0.3s ease;
                transform: translateX(100%);
                opacity: 0;
            }

            .notification-item.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification-item.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .notification-item:hover {
                transform: translateX(-5px) scale(1.02);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
            }

            .notification-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                animation: shimmer 2s ease-in-out;
            }

            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .notification-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: bold;
                font-size: 11px;
            }

            .notification-icon {
                font-size: 16px;
                animation: bounce 1s ease-in-out;
            }

            .notification-close {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 12px;
                padding: 2px;
                border-radius: 2px;
                transition: color 0.3s ease;
            }

            .notification-close:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }

            .notification-body {
                font-size: 9px;
                line-height: 1.4;
                color: #ddd;
                margin-bottom: 8px;
            }

            .notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }

            .notification-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
            }

            .notification-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.5);
            }

            .notification-btn.primary {
                background: var(--notification-color);
                border-color: var(--notification-color);
                color: black;
                font-weight: bold;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: var(--notification-color);
                transition: width linear;
                opacity: 0.8;
            }

            .notification-center {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(5, 5, 25, 0.98);
                border: 3px solid #4ECDC4;
                border-radius: 15px;
                padding: 20px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 10001;
                color: white;
                font-family: 'Press Start 2P', monospace;
                display: none;
            }

            .notification-center.show {
                display: block;
                animation: slideIn 0.3s ease-out;
            }

            .notification-list {
                max-height: 400px;
                overflow-y: auto;
                margin: 15px 0;
            }

            .notification-list-item {
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border-left: 4px solid var(--item-color);
                font-size: 8px;
                transition: background 0.3s ease;
            }

            .notification-list-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .notification-list-item.unread {
                background: rgba(255, 255, 255, 0.1);
                border-left-width: 6px;
            }

            .notification-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #FF4757;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                animation: pulse 2s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }

            @keyframes slideIn {
                from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            /* Responsividade */
            @media (max-width: 768px) {
                #notification-system-container {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .notification-item {
                    padding: 12px 15px;
                    font-size: 9px;
                }

                .notification-center {
                    margin: 20px;
                    max-width: none;
                    left: 20px;
                    right: 20px;
                    transform: translateY(-50%);
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Mostrar notificação
    show(title, message, type = 'info', options = {}) {
        const notification = {
            id: this.generateId(),
            title,
            message,
            type,
            timestamp: Date.now(),
            read: false,
            ...options
        };

        // Adicionar à lista
        this.notifications.unshift(notification);

        // Limitar número de notificações
        if (this.notifications.length > this.config.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.config.maxNotifications);
        }

        // Salvar localmente
        this.saveLocalNotifications();

        // Salvar no servidor se usuário logado
        if (this.currentUser && options.persist !== false) {
            this.saveServerNotification(notification);
        }

        // Mostrar visualmente
        this.displayNotification(notification);

        // Reproduzir som
        if (this.config.enableSound && this.types[type].sound) {
            this.playSound(this.types[type].sound);
        }

        // Vibrar (mobile)
        if (this.config.enableVibration && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        return notification.id;
    }

    // Exibir notificação visual
    displayNotification(notification) {
        const typeConfig = this.types[notification.type] || this.types.info;
        const duration = notification.duration || typeConfig.duration;

        const element = document.createElement('div');
        element.className = 'notification-item';
        element.style.borderColor = typeConfig.color;
        element.style.setProperty('--notification-color', typeConfig.color);
        element.dataset.notificationId = notification.id;

        element.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <span class="notification-icon">${typeConfig.icon}</span>
                    ${notification.title}
                </div>
                <button class="notification-close" onclick="notificationSystem.dismiss('${notification.id}')">✕</button>
            </div>
            
            <div class="notification-body">
                ${notification.message}
            </div>
            
            ${notification.actions ? `
                <div class="notification-actions">
                    ${notification.actions.map(action => `
                        <button class="notification-btn ${action.primary ? 'primary' : ''}" 
                                onclick="${action.callback}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="notification-progress" style="width: 100%; animation: progress ${duration}ms linear;"></div>
        `;

        // Adicionar evento de clique
        element.addEventListener('click', () => {
            if (notification.onClick) {
                notification.onClick();
            }
            this.markAsRead(notification.id);
        });

        this.container.appendChild(element);

        // Animação de entrada
        setTimeout(() => {
            element.classList.add('show');
        }, 10);

        // Remover automaticamente
        setTimeout(() => {
            this.dismiss(notification.id);
        }, duration);

        // Limitar notificações visíveis
        this.limitVisibleNotifications();
    }

    // Limitar notificações visíveis
    limitVisibleNotifications() {
        const visibleNotifications = this.container.querySelectorAll('.notification-item');
        if (visibleNotifications.length > this.maxVisible) {
            // Remover as mais antigas
            for (let i = this.maxVisible; i < visibleNotifications.length; i++) {
                const element = visibleNotifications[i];
                this.dismiss(element.dataset.notificationId);
            }
        }
    }

    // Dispensar notificação
    dismiss(notificationId) {
        const element = this.container.querySelector(`[data-notification-id="${notificationId}"]`);
        if (!element) return;

        element.classList.add('hide');
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, this.config.fadeOutDuration);
    }

    // Marcar como lida
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveLocalNotifications();
            
            if (this.currentUser) {
                this.markServerNotificationAsRead(notificationId);
            }
        }
    }

    // Gerar ID único
    generateId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Reproduzir som
    playSound(soundType) {
        try {
            // Implementar sons baseado no tipo
            const audio = new Audio(`src/assets/sounds/notification_${soundType}.mp3`);
            audio.volume = 0.3;
            audio.play().catch(e => console.warn('Erro ao reproduzir som:', e));
        } catch (error) {
            console.warn('Som de notificação não disponível:', error);
        }
    }

    // Salvar notificações localmente
    saveLocalNotifications() {
        if (!this.config.persistAcrossPages) return;
        
        try {
            const dataToSave = this.notifications.slice(0, 20); // Manter apenas 20 recentes
            localStorage.setItem('spaceInvaders_notifications', JSON.stringify(dataToSave));
        } catch (error) {
            console.warn('Erro ao salvar notificações localmente:', error);
        }
    }

    // Carregar notificações locais
    loadLocalNotifications() {
        if (!this.config.persistAcrossPages) return;
        
        try {
            const saved = localStorage.getItem('spaceInvaders_notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                
                // Remover notificações muito antigas (>7 dias)
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                this.notifications = this.notifications.filter(n => n.timestamp > weekAgo);
            }
        } catch (error) {
            console.warn('Erro ao carregar notificações locais:', error);
            this.notifications = [];
        }
    }

    // Salvar notificação no servidor
    async saveServerNotification(notification) {
        if (!this.currentUser) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .insert({
                    player_id: this.currentUser.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: {
                        ...notification,
                        localId: notification.id
                    },
                    priority: this.types[notification.type]?.priority || 0
                });

            if (error) throw error;
        } catch (error) {
            console.error('Erro ao salvar notificação no servidor:', error);
        }
    }

    // Carregar notificações do servidor
    async loadServerNotifications() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('player_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Mesclar com notificações locais (evitar duplicatas)
            const localIds = new Set(this.notifications.map(n => n.id));
            const serverNotifications = data
                .filter(n => !localIds.has(n.data?.localId))
                .map(n => ({
                    id: n.data?.localId || `server_${n.id}`,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    timestamp: new Date(n.created_at).getTime(),
                    read: n.is_read,
                    serverId: n.id,
                    ...n.data
                }));

            this.notifications = [...serverNotifications, ...this.notifications];
            this.saveLocalNotifications();

        } catch (error) {
            console.error('Erro ao carregar notificações do servidor:', error);
        }
    }

    // Marcar notificação como lida no servidor
    async markServerNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification?.serverId) return;

        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notification.serverId);
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
        }
    }

    // Configurar notificações em tempo real
    setupRealtimeNotifications() {
        if (!this.currentUser) return;

        // Limpar subscriptions existentes
        this.cleanup();

        // Subscribe para notificações do usuário
        const channel = supabase
            .channel(`notifications_${this.currentUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `player_id=eq.${this.currentUser.id}`
            }, (payload) => {
                const serverNotification = payload.new;
                
                // Evitar mostrar notificações que já foram processadas localmente
                const existingLocal = this.notifications.find(n => 
                    n.id === serverNotification.data?.localId
                );
                
                if (!existingLocal) {
                    this.show(
                        serverNotification.title,
                        serverNotification.message,
                        serverNotification.type,
                        {
                            ...serverNotification.data,
                            serverId: serverNotification.id,
                            persist: false // Já foi salva no servidor
                        }
                    );
                }
            })
            .subscribe();

        this.subscribedChannels.push(channel);
    }

    // Configurar Service Worker para notificações push
    async setupServiceWorker() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications não suportadas neste navegador');
            return;
        }

        try {
            // Registrar service worker (implementar arquivo separado)
            // const registration = await navigator.serviceWorker.register('/sw.js');
            // console.log('Service Worker registrado:', registration);
        } catch (error) {
            console.error('Erro ao registrar Service Worker:', error);
        }
    }

    // Configurar atalhos do teclado
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + N - Abrir central de notificações
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.showNotificationCenter();
            }
            
            // Escape - Fechar todas as notificações visíveis
            if (e.key === 'Escape') {
                this.dismissAll();
            }
        });
    }

    // Mostrar central de notificações
    showNotificationCenter() {
        let center = document.getElementById('notification-center');
        
        if (!center) {
            center = document.createElement('div');
            center.id = 'notification-center';
            center.className = 'notification-center';
            
            document.body.appendChild(center);
        }

        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        center.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: #4ECDC4;">🔔 Central de Notificações</h3>
                <button onclick="notificationSystem.closeNotificationCenter()" 
                        style="background: none; border: none; color: #888; cursor: pointer; font-size: 16px;">✕</button>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 8px;">
                <span>Total: ${this.notifications.length}</span>
                <span>Não lidas: <strong style="color: #FF4757;">${unreadCount}</strong></span>
            </div>
            
            <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                <button class="notification-btn" onclick="notificationSystem.markAllAsRead()">
                    Marcar Todas como Lidas
                </button>
                <button class="notification-btn" onclick="notificationSystem.clearAll()">
                    Limpar Todas
                </button>
            </div>
            
            <div class="notification-list">
                ${this.notifications.map(notification => {
                    const typeConfig = this.types[notification.type] || this.types.info;
                    return `
                        <div class="notification-list-item ${notification.read ? '' : 'unread'}" 
                             style="--item-color: ${typeConfig.color}">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong>${typeConfig.icon} ${notification.title}</strong>
                                <span style="font-size: 7px; color: #888;">
                                    ${this.formatTimestamp(notification.timestamp)}
                                </span>
                            </div>
                            <div style="font-size: 7px; color: #bbb;">
                                ${notification.message}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        center.classList.add('show');

        // Fechar clicando fora
        const closeOnOutsideClick = (e) => {
            if (!center.contains(e.target)) {
                this.closeNotificationCenter();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 100);
    }

    // Fechar central de notificações
    closeNotificationCenter() {
        const center = document.getElementById('notification-center');
        if (center) {
            center.classList.remove('show');
            setTimeout(() => {
                if (center.parentNode) {
                    center.parentNode.removeChild(center);
                }
            }, 300);
        }
    }

    // Dispensar todas as notificações visíveis
    dismissAll() {
        const visibleNotifications = this.container.querySelectorAll('.notification-item');
        visibleNotifications.forEach(element => {
            this.dismiss(element.dataset.notificationId);
        });
    }

    // Marcar todas como lidas
    markAllAsRead() {
        this.notifications.forEach(notification => {
            if (!notification.read) {
                this.markAsRead(notification.id);
            }
        });
        
        // Fechar e reabrir central para atualizar
        this.closeNotificationCenter();
        setTimeout(() => this.showNotificationCenter(), 100);
    }

    // Limpar todas as notificações
    clearAll() {
        if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
            this.notifications = [];
            this.saveLocalNotifications();
            this.dismissAll();
            this.closeNotificationCenter();
        }
    }

    // Formatar timestamp
    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
        
        return new Date(timestamp).toLocaleDateString('pt-BR');
    }

    // Obter contagem de não lidas
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Limpar recursos
    cleanup() {
        this.subscribedChannels.forEach(channel => {
            supabase.removeChannel(channel);
        });
        this.subscribedChannels = [];
    }

    // Métodos de conveniência para tipos específicos
    achievement(title, message, options = {}) {
        return this.show(title, message, 'achievement', options);
    }

    reward(title, message, options = {}) {
        return this.show(title, message, 'reward', options);
    }

    levelUp(title, message, options = {}) {
        return this.show(title, message, 'levelUp', options);
    }

    warning(title, message, options = {}) {
        return this.show(title, message, 'warning', options);
    }

    error(title, message, options = {}) {
        return this.show(title, message, 'error', options);
    }

    info(title, message, options = {}) {
        return this.show(title, message, 'info', options);
    }

    system(title, message, options = {}) {
        return this.show(title, message, 'system', options);
    }
}

// Instância global
const notificationSystem = new NotificationSystem();

// Disponibilizar globalmente
window.notificationSystem = notificationSystem;

export default NotificationSystem;