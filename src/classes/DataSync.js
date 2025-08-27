import { supabase } from '../supabase.js';
import { NavigationHelper } from '../navigation.js';
import gameConfig from './GameConfig.js';

class DataSync {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.conflictResolver = null;
        this.syncQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 segundos

        // Configurações de sincronização
        this.config = {
            autoSyncInterval: 60000,    // 1 minuto
            backupInterval: 300000,     // 5 minutos
            conflictResolution: 'server', // 'server', 'client', 'manual'
            maxBackups: 10,             // Máximo de backups por usuário
            compressionEnabled: true    // Comprimir dados de backup
        };

        this.init();
    }

    async init() {
        // Carregar último timestamp de sync
        this.lastSyncTime = localStorage.getItem('spaceInvaders_lastSync');
        
        // Iniciar sincronização automática
        if (gameConfig.get('development.testing.autoSync', true)) {
            this.startAutoSync();
        }

        // Listener para mudanças de conectividade
        window.addEventListener('online', () => this.handleConnectionRestore());
        window.addEventListener('offline', () => this.handleConnectionLoss());

        // Backup antes de fechar a página
        window.addEventListener('beforeunload', () => this.createEmergencyBackup());

        console.log('🔄 DataSync inicializado');
    }

    // Sincronizar dados do jogador
    async syncPlayerData(userId, forceSync = false) {
        if (this.syncInProgress && !forceSync) {
            console.log('Sincronização já em progresso');
            return { success: false, reason: 'sync_in_progress' };
        }

        this.syncInProgress = true;

        try {
            const result = await this.performSync(userId);
            this.lastSyncTime = Date.now();
            localStorage.setItem('spaceInvaders_lastSync', this.lastSyncTime.toString());
            
            return result;
        } catch (error) {
            console.error('Erro na sincronização:', error);
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }

    // Executar sincronização
    async performSync(userId) {
        // 1. Obter dados locais
        const localData = this.getLocalPlayerData();
        
        // 2. Obter dados do servidor
        const serverData = await this.getServerPlayerData(userId);
        
        // 3. Detectar conflitos
        const conflicts = this.detectConflicts(localData, serverData);
        
        // 4. Resolver conflitos
        let resolvedData;
        if (conflicts.length > 0) {
            resolvedData = await this.resolveConflicts(conflicts, localData, serverData);
        } else {
            resolvedData = this.mergeData(localData, serverData);
        }

        // 5. Salvar dados resolvidos
        await this.saveResolvedData(userId, resolvedData);

        // 6. Atualizar dados locais
        this.updateLocalData(resolvedData);

        return {
            success: true,
            conflicts: conflicts.length,
            lastSync: this.lastSyncTime,
            dataSize: JSON.stringify(resolvedData).length
        };
    }

    // Obter dados locais do jogador
    getLocalPlayerData() {
        const user = NavigationHelper.getCurrentUser();
        const sessionStats = NavigationHelper.getSessionStats();
        const gameSettings = NavigationHelper.getGameSettings();

        return {
            user: user || {},
            sessionStats: sessionStats || {},
            gameSettings: gameSettings || {},
            lastModified: user?.lastActivity || Date.now(),
            version: this.getDataVersion()
        };
    }

    // Obter dados do servidor
    async getServerPlayerData(userId) {
        try {
            // Dados principais do jogador
            const { data: playerData, error: playerError } = await supabase
                .from('players')
                .select('*')
                .eq('id', userId)
                .single();

            if (playerError) throw playerError;

            // Itens do jogador
            const { data: itemsData, error: itemsError } = await supabase
                .from('player_items')
                .select('*')
                .eq('player_id', userId);

            if (itemsError) throw itemsError;

            // Conquistas do jogador
            const { data: achievementsData, error: achievementsError } = await supabase
                .from('player_achievements')
                .select('*')
                .eq('player_id', userId);

            if (achievementsError) throw achievementsError;

            // Efeitos ativos
            const { data: effectsData, error: effectsError } = await supabase
                .from('player_active_effects')
                .select('*')
                .eq('player_id', userId);

            if (effectsError) throw effectsError;

            return {
                user: playerData,
                items: itemsData || [],
                achievements: achievementsData || [],
                activeEffects: effectsData || [],
                lastModified: playerData.last_played ? new Date(playerData.last_played).getTime() : 0,
                version: this.getDataVersion()
            };

        } catch (error) {
            console.error('Erro ao obter dados do servidor:', error);
            throw error;
        }
    }

    // Detectar conflitos entre dados locais e do servidor
    detectConflicts(localData, serverData) {
        const conflicts = [];

        // Verificar timestamps
        if (localData.lastModified && serverData.lastModified) {
            const timeDiff = Math.abs(localData.lastModified - serverData.lastModified);
            if (timeDiff > 60000) { // 1 minuto de diferença
                conflicts.push({
                    type: 'timestamp_mismatch',
                    local: localData.lastModified,
                    server: serverData.lastModified,
                    diff: timeDiff
                });
            }
        }

        // Verificar dados do usuário
        if (localData.user && serverData.user) {
            const userConflicts = this.compareUserData(localData.user, serverData.user);
            conflicts.push(...userConflicts);
        }

        return conflicts;
    }

    // Comparar dados do usuário
    compareUserData(localUser, serverUser) {
        const conflicts = [];
        const criticalFields = ['high_score', 'coins', 'level_id', 'total_games'];

        criticalFields.forEach(field => {
            if (localUser[field] !== serverUser[field]) {
                conflicts.push({
                    type: 'user_data_mismatch',
                    field,
                    local: localUser[field],
                    server: serverUser[field]
                });
            }
        });

        return conflicts;
    }

    // Resolver conflitos
    async resolveConflicts(conflicts, localData, serverData) {
        switch (this.config.conflictResolution) {
            case 'server':
                console.log('🔄 Resolvendo conflitos: priorizando servidor');
                return serverData;
            
            case 'client':
                console.log('🔄 Resolvendo conflitos: priorizando cliente');
                return localData;
            
            case 'manual':
                return await this.manualConflictResolution(conflicts, localData, serverData);
            
            default:
                return this.smartConflictResolution(conflicts, localData, serverData);
        }
    }

    // Resolução inteligente de conflitos
    smartConflictResolution(conflicts, localData, serverData) {
        const resolved = { ...serverData };

        conflicts.forEach(conflict => {
            switch (conflict.type) {
                case 'user_data_mismatch':
                    // Para scores e moedas, usar o maior valor
                    if (['high_score', 'coins'].includes(conflict.field)) {
                        resolved.user[conflict.field] = Math.max(
                            conflict.local || 0,
                            conflict.server || 0
                        );
                    }
                    // Para total de jogos, somar os valores
                    else if (conflict.field === 'total_games') {
                        resolved.user[conflict.field] = 
                            (conflict.local || 0) + (conflict.server || 0);
                    }
                    // Para nível, usar o maior
                    else if (conflict.field === 'level_id') {
                        resolved.user[conflict.field] = Math.max(
                            conflict.local || 1,
                            conflict.server || 1
                        );
                    }
                    break;
            }
        });

        return resolved;
    }

    // Resolução manual de conflitos
    async manualConflictResolution(conflicts, localData, serverData) {
        return new Promise((resolve) => {
            // Criar interface modal para resolução
            this.showConflictResolutionModal(conflicts, localData, serverData, resolve);
        });
    }

    // Mostrar modal de resolução de conflitos
    showConflictResolutionModal(conflicts, localData, serverData, callback) {
        const modal = document.createElement('div');
        modal.className = 'conflict-resolution-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            font-family: 'Press Start 2P', monospace;
        `;

        modal.innerHTML = `
            <div style="
                background: rgba(5, 5, 25, 0.95);
                border: 3px solid #FF4757;
                border-radius: 15px;
                padding: 30px;
                max-width: 600px;
                color: white;
                text-align: center;
            ">
                <h3 style="color: #FF4757; margin-bottom: 20px;">⚠️ CONFLITO DE DADOS</h3>
                <p style="margin-bottom: 20px; font-size: 10px;">
                    Encontramos diferenças entre seus dados locais e do servidor.<br>
                    Escolha como resolver:
                </p>
                
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                    <button id="use-server" style="
                        background: #4ECDC4;
                        color: #000;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 8px;
                    ">USAR SERVIDOR</button>
                    
                    <button id="use-local" style="
                        background: #FFD700;
                        color: #000;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 8px;
                    ">USAR LOCAL</button>
                    
                    <button id="merge-smart" style="
                        background: #00ff88;
                        color: #000;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                        font-size: 8px;
                    ">MESCLAR</button>
                </div>
                
                <div style="margin-top: 20px; font-size: 8px; color: #888;">
                    <details>
                        <summary>Ver detalhes dos conflitos</summary>
                        <div style="margin-top: 10px; text-align: left;">
                            ${conflicts.map(c => `
                                <div style="margin: 5px 0;">
                                    ${c.field || c.type}: Local=${c.local} vs Servidor=${c.server}
                                </div>
                            `).join('')}
                        </div>
                    </details>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#use-server').addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(serverData);
        });

        modal.querySelector('#use-local').addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(localData);
        });

        modal.querySelector('#merge-smart').addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(this.smartConflictResolution(conflicts, localData, serverData));
        });
    }

    // Mesclar dados sem conflitos
    mergeData(localData, serverData) {
        return {
            ...serverData,
            // Preservar algumas configurações locais
            gameSettings: localData.gameSettings,
            sessionStats: localData.sessionStats,
            lastModified: Math.max(localData.lastModified || 0, serverData.lastModified || 0)
        };
    }

    // Salvar dados resolvidos no servidor
    async saveResolvedData(userId, resolvedData) {
        try {
            // Atualizar dados principais do jogador
            const { error: playerError } = await supabase
                .from('players')
                .update({
                    ...resolvedData.user,
                    last_played: new Date().toISOString(),
                    data_version: this.getDataVersion()
                })
                .eq('id', userId);

            if (playerError) throw playerError;

            console.log('✅ Dados sincronizados com o servidor');
            return true;

        } catch (error) {
            console.error('Erro ao salvar dados resolvidos:', error);
            throw error;
        }
    }

    // Atualizar dados locais
    updateLocalData(resolvedData) {
        if (resolvedData.user) {
            NavigationHelper.setCurrentUser(resolvedData.user);
        }

        if (resolvedData.gameSettings) {
            NavigationHelper.saveGameSettings(resolvedData.gameSettings);
        }

        if (resolvedData.sessionStats) {
            NavigationHelper.saveSessionStats(resolvedData.sessionStats);
        }
    }

    // Criar backup dos dados
    async createBackup(userId, description = 'Auto backup') {
        try {
            const playerData = await this.getServerPlayerData(userId);
            
            const backupData = {
                player_id: userId,
                backup_data: this.config.compressionEnabled ? 
                    this.compressData(playerData) : playerData,
                description,
                data_version: this.getDataVersion(),
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('player_backups')
                .insert(backupData);

            if (error) throw error;

            // Limpar backups antigos
            await this.cleanupOldBackups(userId);

            console.log('💾 Backup criado com sucesso');
            return true;

        } catch (error) {
            console.error('Erro ao criar backup:', error);
            return false;
        }
    }

    // Restaurar backup
    async restoreBackup(userId, backupId) {
        try {
            const { data: backup, error } = await supabase
                .from('player_backups')
                .select('*')
                .eq('id', backupId)
                .eq('player_id', userId)
                .single();

            if (error) throw error;

            let backupData = backup.backup_data;
            if (this.config.compressionEnabled && typeof backupData === 'string') {
                backupData = this.decompressData(backupData);
            }

            // Salvar dados do backup
            await this.saveResolvedData(userId, backupData);
            this.updateLocalData(backupData);

            console.log('🔄 Backup restaurado com sucesso');
            return { success: true, data: backupData };

        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            return { success: false, error: error.message };
        }
    }

    // Listar backups do usuário
    async getUserBackups(userId) {
        try {
            const { data, error } = await supabase
                .from('player_backups')
                .select('id, description, created_at, data_version')
                .eq('player_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Erro ao listar backups:', error);
            return [];
        }
    }

    // Limpar backups antigos
    async cleanupOldBackups(userId) {
        try {
            const { data: backups } = await supabase
                .from('player_backups')
                .select('id')
                .eq('player_id', userId)
                .order('created_at', { ascending: false });

            if (backups && backups.length > this.config.maxBackups) {
                const toDelete = backups.slice(this.config.maxBackups);
                
                const { error } = await supabase
                    .from('player_backups')
                    .delete()
                    .in('id', toDelete.map(b => b.id));

                if (error) throw error;
                console.log(`🗑️ ${toDelete.length} backups antigos removidos`);
            }

        } catch (error) {
            console.error('Erro ao limpar backups:', error);
        }
    }

    // Backup de emergência (localStorage)
    createEmergencyBackup() {
        const localData = this.getLocalPlayerData();
        localStorage.setItem('spaceInvaders_emergencyBackup', JSON.stringify({
            data: localData,
            timestamp: Date.now()
        }));
        console.log('💾 Backup de emergência criado');
    }

    // Restaurar backup de emergência
    restoreEmergencyBackup() {
        try {
            const backup = localStorage.getItem('spaceInvaders_emergencyBackup');
            if (!backup) return null;

            const { data, timestamp } = JSON.parse(backup);
            
            // Verificar se o backup não é muito antigo (24 horas)
            if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
                console.warn('Backup de emergência muito antigo, ignorando');
                return null;
            }

            this.updateLocalData(data);
            console.log('🔄 Backup de emergência restaurado');
            return data;

        } catch (error) {
            console.error('Erro ao restaurar backup de emergência:', error);
            return null;
        }
    }

    // Comprimir dados
    compressData(data) {
        try {
            const jsonString = JSON.stringify(data);
            // Implementação básica de compressão (em produção, usar biblioteca adequada)
            return btoa(jsonString);
        } catch (error) {
            console.warn('Erro na compressão, usando dados originais:', error);
            return data;
        }
    }

    // Descomprimir dados
    decompressData(compressedData) {
        try {
            const jsonString = atob(compressedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Erro na descompressão:', error);
            return compressedData;
        }
    }

    // Obter versão dos dados
    getDataVersion() {
        return '1.5.0'; // Versão do formato dos dados
    }

    // Iniciar sincronização automática
    startAutoSync() {
        // Sincronização periódica
        setInterval(() => {
            const user = NavigationHelper.getCurrentUser();
            if (user && navigator.onLine) {
                this.syncPlayerData(user.id);
            }
        }, this.config.autoSyncInterval);

        // Backup periódico
        setInterval(() => {
            const user = NavigationHelper.getCurrentUser();
            if (user && navigator.onLine) {
                this.createBackup(user.id);
            }
        }, this.config.backupInterval);
    }

    // Lidar com perda de conexão
    handleConnectionLoss() {
        console.log('📱 Conexão perdida - modo offline');
        this.createEmergencyBackup();
    }

    // Lidar com restauração de conexão
    handleConnectionRestore() {
        console.log('📶 Conexão restaurada');
        const user = NavigationHelper.getCurrentUser();
        if (user) {
            // Tentar sincronizar após restaurar conexão
            setTimeout(() => {
                this.syncPlayerData(user.id, true);
            }, 1000);
        }
    }

    // Verificar se precisa sincronizar
    needsSync() {
        if (!this.lastSyncTime) return true;
        
        const timeSinceLastSync = Date.now() - parseInt(this.lastSyncTime);
        return timeSinceLastSync > this.config.autoSyncInterval;
    }

    // Status da sincronização
    getSyncStatus() {
        return {
            inProgress: this.syncInProgress,
            lastSync: this.lastSyncTime ? new Date(parseInt(this.lastSyncTime)) : null,
            needsSync: this.needsSync(),
            online: navigator.onLine,
            queueSize: this.syncQueue.length
        };
    }
}

export default DataSync;