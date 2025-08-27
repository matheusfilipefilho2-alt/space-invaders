import { supabase } from '../supabase.js';
import gameConfig from './GameConfig.js';

class GameAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();
        this.currentUser = null;
        this.eventQueue = [];
        this.batchSize = 10;
        this.flushInterval = 30000; // 30 segundos
        
        // Inicializar batch flush
        this.startBatchFlush();
        
        // Métricas da sessão atual
        this.sessionMetrics = {
            events: 0,
            gameTime: 0,
            totalScore: 0,
            gamesPlayed: 0,
            coinsEarned: 0,
            achievementsUnlocked: 0,
            itemsPurchased: 0,
            crashes: 0,
            errors: []
        };

        // Listeners para eventos do navegador
        this.setupBrowserListeners();
        
        console.log('📊 Analytics inicializado - Sessão:', this.sessionId);
    }

    // Gerar ID único da sessão
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Configurar usuário atual
    setUser(user) {
        this.currentUser = user;
        this.track('user_identified', {
            userId: user?.id,
            username: user?.username,
            level: user?.level_id || 1,
            totalGames: user?.total_games || 0,
            highScore: user?.high_score || 0,
            coins: user?.coins || 0
        });
    }

    // Trackear evento personalizado
    track(eventName, properties = {}, immediate = false) {
        if (!gameConfig.get('analytics.events.' + eventName.split('_')[0], true)) {
            return; // Evento desabilitado na configuração
        }

        const event = {
            id: this.generateEventId(),
            sessionId: this.sessionId,
            eventName,
            timestamp: Date.now(),
            userId: this.currentUser?.id || null,
            username: this.currentUser?.username || null,
            properties: {
                ...properties,
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: this.getPlatform(),
                screenResolution: `${screen.width}x${screen.height}`,
                viewportSize: `${window.innerWidth}x${window.innerHeight}`,
                sessionDuration: Date.now() - this.sessionStartTime,
                url: window.location.href
            }
        };

        // Adicionar à fila
        this.eventQueue.push(event);
        this.sessionMetrics.events++;

        console.log('📊 Event tracked:', eventName, properties);

        // Flush imediato se necessário ou se a fila está cheia
        if (immediate || this.eventQueue.length >= this.batchSize) {
            this.flushEvents();
        }
    }

    // Gerar ID único do evento
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Detectar plataforma
    getPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('mobile')) return 'mobile';
        if (userAgent.includes('tablet')) return 'tablet';
        return 'desktop';
    }

    // Flush eventos para o banco de dados
    async flushEvents() {
        if (this.eventQueue.length === 0) return;

        const events = [...this.eventQueue];
        this.eventQueue = [];

        try {
            // Preparar dados para inserção
            const analyticsData = events.map(event => ({
                session_id: event.sessionId,
                event_name: event.eventName,
                timestamp: new Date(event.timestamp).toISOString(),
                user_id: event.userId,
                username: event.username,
                properties: event.properties,
                created_at: new Date().toISOString()
            }));

            // Inserir no banco de dados
            const { error } = await supabase
                .from('analytics_events')
                .insert(analyticsData);

            if (error) {
                console.error('Erro ao salvar analytics:', error);
                // Recolocar eventos na fila em caso de erro
                this.eventQueue.unshift(...events);
            } else {
                console.log(`📊 ${events.length} eventos salvos`);
            }

        } catch (error) {
            console.error('Erro no flush de analytics:', error);
            // Recolocar eventos na fila
            this.eventQueue.unshift(...events);
        }
    }

    // Iniciar flush automático em lote
    startBatchFlush() {
        setInterval(() => {
            this.flushEvents();
        }, this.flushInterval);

        // Flush quando a página é fechada
        window.addEventListener('beforeunload', () => {
            this.endSession();
        });
    }

    // Configurar listeners do navegador
    setupBrowserListeners() {
        // Erros JavaScript
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('unhandled_promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            });
        });

        // Visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.track('page_hidden');
            } else {
                this.track('page_visible');
            }
        });

        // Performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                this.track('page_performance', {
                    loadTime: perfData?.loadEventEnd - perfData?.loadEventStart,
                    domContentLoaded: perfData?.domContentLoadedEventEnd - perfData?.domContentLoadedEventStart,
                    totalTime: perfData?.loadEventEnd - perfData?.fetchStart
                });
            }, 0);
        });
    }

    // === EVENTOS ESPECÍFICOS DO JOGO ===

    // Início de sessão
    trackSessionStart() {
        this.track('session_start', {
            timestamp: this.sessionStartTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isReturningUser: this.currentUser?.total_games > 0
        });
    }

    // Fim de sessão
    endSession() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        
        this.track('session_end', {
            ...this.sessionMetrics,
            duration: sessionDuration,
            averageGameDuration: this.sessionMetrics.gamesPlayed > 0 ? 
                this.sessionMetrics.gameTime / this.sessionMetrics.gamesPlayed : 0
        }, true); // Flush imediatamente

        this.flushEvents(); // Garantir que todos os eventos sejam salvos
    }

    // Início do jogo
    trackGameStart(gameMode = 'normal', difficulty = 'normal') {
        this.currentGameStart = Date.now();
        
        this.track('game_start', {
            gameMode,
            difficulty,
            playerLevel: this.currentUser?.level_id || 1,
            playerCoins: this.currentUser?.coins || 0,
            playerGames: this.currentUser?.total_games || 0
        });
    }

    // Fim do jogo
    trackGameEnd(gameStats) {
        const gameTime = this.currentGameStart ? 
            Date.now() - this.currentGameStart : 0;

        this.sessionMetrics.gameTime += gameTime;
        this.sessionMetrics.gamesPlayed++;
        this.sessionMetrics.totalScore += gameStats.finalScore || 0;

        this.track('game_end', {
            ...gameStats,
            gameTime,
            survivalTime: gameStats.survivalTime || 0,
            accuracy: gameStats.accuracy || 0,
            maxCombo: gameStats.maxCombo || 0,
            difficulty: gameStats.difficulty || 'normal',
            completed: gameStats.completed || false,
            quitReason: gameStats.quitReason || 'normal_end'
        });
    }

    // Progressão de nível
    trackLevelUp(fromLevel, toLevel, newLevelData) {
        this.track('level_up', {
            fromLevel: fromLevel.id,
            fromLevelName: fromLevel.name,
            toLevel: toLevel.id,
            toLevelName: toLevel.name,
            newBenefits: newLevelData.benefits || [],
            coinReward: newLevelData.coinReward || 0,
            currentScore: this.currentUser?.high_score || 0
        });
    }

    // Conquista desbloqueada
    trackAchievementUnlocked(achievement, coinReward) {
        this.sessionMetrics.achievementsUnlocked++;
        
        this.track('achievement_unlocked', {
            achievementId: achievement.id,
            achievementName: achievement.name,
            category: achievement.type,
            rarity: achievement.rarity,
            coinReward,
            description: achievement.description,
            playerGames: this.currentUser?.total_games || 0,
            playerLevel: this.currentUser?.level_id || 1
        });
    }

    // Compra na loja
    trackPurchase(item, price, currency = 'coins') {
        this.sessionMetrics.itemsPurchased++;
        
        this.track('shop_purchase', {
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            rarity: item.rarity || 'common',
            price,
            currency,
            playerCoins: this.currentUser?.coins || 0,
            playerLevel: this.currentUser?.level_id || 1,
            isDailyOffer: item.isDailyOffer || false
        });
    }

    // Uso de item
    trackItemUsed(item, context = 'game') {
        this.track('item_used', {
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            context, // 'game', 'menu', etc.
            remainingUses: item.uses_remaining || null
        });
    }

    // Moedas ganhas
    trackCoinsEarned(amount, source, gameScore = null) {
        this.sessionMetrics.coinsEarned += amount;
        
        this.track('coins_earned', {
            amount,
            source, // 'game_score', 'achievement', 'level_up', 'daily_bonus'
            gameScore,
            totalCoins: this.currentUser?.coins || 0,
            playerLevel: this.currentUser?.level_id || 1
        });
    }

    // Interação com UI
    trackUIInteraction(element, action, context = null) {
        this.track('ui_interaction', {
            element,
            action, // 'click', 'hover', 'scroll', etc.
            context,
            page: this.getCurrentPage()
        });
    }

    // Erro no jogo
    trackError(errorType, errorData) {
        this.sessionMetrics.crashes++;
        this.sessionMetrics.errors.push({
            type: errorType,
            timestamp: Date.now(),
            data: errorData
        });
        
        this.track('game_error', {
            errorType,
            ...errorData,
            gameState: this.getCurrentGameState(),
            criticalError: this.isCriticalError(errorType)
        }, true); // Flush imediatamente para erros
    }

    // Performance do jogo
    trackPerformance(metrics) {
        this.track('game_performance', {
            fps: metrics.fps || null,
            memoryUsage: metrics.memory || null,
            loadTime: metrics.loadTime || null,
            renderTime: metrics.renderTime || null,
            platform: this.getPlatform(),
            browser: this.getBrowser()
        });
    }

    // Funnel de conversão
    trackFunnelStep(funnelName, step, stepData = {}) {
        this.track('funnel_step', {
            funnelName, // 'onboarding', 'purchase', 'level_progression'
            step,
            stepData,
            previousStep: this.lastFunnelSteps?.[funnelName] || null
        });

        // Armazenar último step
        if (!this.lastFunnelSteps) this.lastFunnelSteps = {};
        this.lastFunnelSteps[funnelName] = step;
    }

    // === MÉTODOS AUXILIARES ===

    // Obter página atual
    getCurrentPage() {
        const path = window.location.pathname;
        return path.split('/').pop().replace('.html', '') || 'index';
    }

    // Obter estado atual do jogo
    getCurrentGameState() {
        return window.currentState || 'unknown';
    }

    // Verificar se é erro crítico
    isCriticalError(errorType) {
        const criticalErrors = [
            'javascript_error',
            'unhandled_promise_rejection',
            'database_connection_failed',
            'game_crash'
        ];
        return criticalErrors.includes(errorType);
    }

    // Detectar navegador
    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    }

    // === RELATÓRIOS E ANALYTICS ===

    // Obter métricas da sessão atual
    getSessionMetrics() {
        return {
            ...this.sessionMetrics,
            sessionDuration: Date.now() - this.sessionStartTime,
            sessionId: this.sessionId,
            eventsInQueue: this.eventQueue.length
        };
    }

    // Obter relatório de engajamento
    async getEngagementReport(days = 7) {
        try {
            const { data, error } = await supabase
                .from('analytics_events')
                .select('*')
                .eq('user_id', this.currentUser?.id)
                .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
                .order('timestamp', { ascending: false });

            if (error) throw error;

            return this.processEngagementData(data);
        } catch (error) {
            console.error('Erro ao obter relatório de engajamento:', error);
            return null;
        }
    }

    // Processar dados de engajamento
    processEngagementData(events) {
        const report = {
            totalEvents: events.length,
            uniqueSessions: new Set(events.map(e => e.session_id)).size,
            gamesPlayed: events.filter(e => e.event_name === 'game_end').length,
            averageGameDuration: 0,
            totalPlayTime: 0,
            achievements: events.filter(e => e.event_name === 'achievement_unlocked').length,
            purchases: events.filter(e => e.event_name === 'shop_purchase').length,
            errors: events.filter(e => e.event_name === 'game_error').length,
            mostActiveHour: null,
            retentionRate: 0
        };

        // Calcular duração média dos jogos
        const gameEvents = events.filter(e => e.event_name === 'game_end');
        if (gameEvents.length > 0) {
            const totalDuration = gameEvents.reduce((sum, event) => 
                sum + (event.properties?.gameTime || 0), 0);
            report.averageGameDuration = totalDuration / gameEvents.length;
            report.totalPlayTime = totalDuration;
        }

        // Encontrar hora mais ativa
        const hourCounts = {};
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        if (Object.keys(hourCounts).length > 0) {
            report.mostActiveHour = Object.keys(hourCounts).reduce((a, b) => 
                hourCounts[a] > hourCounts[b] ? a : b);
        }

        return report;
    }

    // Obter top eventos
    async getTopEvents(limit = 10, days = 30) {
        try {
            const { data, error } = await supabase
                .from('analytics_events')
                .select('event_name')
                .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

            if (error) throw error;

            const eventCounts = {};
            data.forEach(event => {
                eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
            });

            return Object.entries(eventCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, limit)
                .map(([eventName, count]) => ({ eventName, count }));

        } catch (error) {
            console.error('Erro ao obter top eventos:', error);
            return [];
        }
    }

    // Limpar dados antigos (GDPR compliance)
    async cleanupOldData(days = 90) {
        try {
            const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            
            const { error } = await supabase
                .from('analytics_events')
                .delete()
                .lt('timestamp', cutoffDate.toISOString());

            if (error) throw error;
            
            console.log(`📊 Dados antigos removidos (>${days} dias)`);
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados antigos:', error);
            return false;
        }
    }
}

export default GameAnalytics;