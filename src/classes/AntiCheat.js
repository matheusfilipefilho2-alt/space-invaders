class AntiCheat {
    constructor() {
        this.sessionData = {
            startTime: Date.now(),
            lastScoreTime: Date.now(),
            scoreHistory: [],
            levelHistory: [],
            timingIntervals: [],
            totalGameTime: 0,
            scoreEvents: [],
            flaggedBehaviors: [],
            isFirstSession: true
        };
        
        this.thresholds = {
            maxScoreFirstTry: 10000,
            maxScorePerSecond: 200,
            maxSessionDuration: 20 * 60 * 1000, // 20 minutos
            roboticTimingTolerance: 50, // ms de tolerância
            minTimingVariation: 0.1, // variação mínima necessária
            maxScorePerLevel: 2000, // score máximo razoável por level
            suspiciousPatternCount: 5 // quantas repetições são suspeitas
        };
        
        this.riskLevel = {
            low: 0,
            medium: 1,
            high: 2,
            critical: 3
        };
        
        this.currentRisk = this.riskLevel.low;
        this.isBlocked = false;
    }

    recordScoreEvent(newScore, currentLevel, gameTime) {
        const now = Date.now();
        const timeSinceLastScore = now - this.sessionData.lastScoreTime;
        
        const scoreEvent = {
            timestamp: now,
            score: newScore,
            level: currentLevel,
            gameTime: gameTime,
            timeDelta: timeSinceLastScore
        };
        
        this.sessionData.scoreEvents.push(scoreEvent);
        this.sessionData.scoreHistory.push(newScore);
        this.sessionData.levelHistory.push(currentLevel);
        this.sessionData.timingIntervals.push(timeSinceLastScore);
        this.sessionData.lastScoreTime = now;
        
        // Manter apenas os últimos 100 eventos para não sobrecarregar
        if (this.sessionData.scoreEvents.length > 100) {
            this.sessionData.scoreEvents.shift();
            this.sessionData.scoreHistory.shift();
            this.sessionData.levelHistory.shift();
            this.sessionData.timingIntervals.shift();
        }
        
        this.analyzeSession();
    }

    // Análise principal da sessão
    analyzeSession() {
        this.currentRisk = this.riskLevel.low;
        this.sessionData.flaggedBehaviors = [];
        
        this.checkHighScoreFirstTry();
        this.checkScoreRate();
        this.checkRoboticTiming();
        this.checkSessionDuration();
        this.checkDataConsistency();
        this.checkSuspiciousPatterns();
        
        console.log(`🛡️ AntiCheat Analysis: Risk Level ${this.currentRisk}, Flags: ${this.sessionData.flaggedBehaviors.length}`);
        // Decidir se deve bloquear
        if (this.currentRisk >= this.riskLevel.critical) {
            this.isBlocked = true;
        }
    }

    // Verificar score muito alto na primeira tentativa
    checkHighScoreFirstTry() {
        if (this.sessionData.isFirstSession && this.sessionData.scoreHistory.length > 0) {
            const maxScore = Math.max(...this.sessionData.scoreHistory);
            
            if (maxScore > this.thresholds.maxScoreFirstTry) {
                this.flagBehavior(
                    'HIGH_SCORE_FIRST_TRY', 
                    `Score de ${maxScore} na primeira tentativa`,
                    this.riskLevel.critical
                );
            }
        }
    }

    // Verificar rate de pontuação muito rápido
    checkScoreRate() {
        if (this.sessionData.scoreEvents.length < 2) return;
        
        const recentEvents = this.sessionData.scoreEvents.slice(-10); // últimos 10 eventos
        let totalScore = 0;
        let totalTime = 0;
        
        for (let i = 1; i < recentEvents.length; i++) {
            const scoreDiff = recentEvents[i].score - recentEvents[i-1].score;
            const timeDiff = recentEvents[i].timestamp - recentEvents[i-1].timestamp;
            
            totalScore += scoreDiff;
            totalTime += timeDiff;
        }
        
        if (totalTime > 0) {
            const scorePerSecond = (totalScore / totalTime) * 1000;
            
            if (scorePerSecond > this.thresholds.maxScorePerSecond) {
                this.flagBehavior(
                    'HIGH_SCORE_RATE',
                    `${scorePerSecond.toFixed(2)} pontos/segundo`,
                    this.riskLevel.high
                );
            }
        }
    }

    // Verificar timing robótico (intervalos muito regulares)
    checkRoboticTiming() {
        if (this.sessionData.timingIntervals.length < 10) return;
        
        const recentIntervals = this.sessionData.timingIntervals.slice(-20);
        const average = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
        
        // Calcular desvio padrão
        const variance = recentIntervals.reduce((acc, interval) => {
            return acc + Math.pow(interval - average, 2);
        }, 0) / recentIntervals.length;
        
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / average;
        
        // Se a variação for muito baixa, pode ser bot
        if (coefficientOfVariation < this.thresholds.minTimingVariation) {
            this.flagBehavior(
                'ROBOTIC_TIMING',
                `Timing muito regular (CV: ${coefficientOfVariation.toFixed(3)})`,
                this.riskLevel.high
            );
        }
        
        // Verificar se muitos intervalos são idênticos
        const identicalCount = this.countIdenticalValues(recentIntervals, this.thresholds.roboticTimingTolerance);
        if (identicalCount >= this.thresholds.suspiciousPatternCount) {
            this.flagBehavior(
                'IDENTICAL_TIMING',
                `${identicalCount} intervalos idênticos detectados`,
                this.riskLevel.medium
            );
        }
    }

    // Verificar sessão muito longa
    checkSessionDuration() {
        const sessionDuration = Date.now() - this.sessionData.startTime;
        
        if (sessionDuration > this.thresholds.maxSessionDuration) {
            this.flagBehavior(
                'LONG_SESSION',
                `Sessão de ${(sessionDuration / 1000 / 60).toFixed(1)} minutos`,
                this.riskLevel.medium
            );
        }
    }

    // Verificar inconsistências nos dados
    checkDataConsistency() {
        if (this.sessionData.scoreEvents.length < 5) return;
        
        const latestEvent = this.sessionData.scoreEvents[this.sessionData.scoreEvents.length - 1];
        
        // Score muito alto para o level atual
        const expectedMaxScore = latestEvent.level * this.thresholds.maxScorePerLevel;
        if (latestEvent.score > expectedMaxScore) {
            this.flagBehavior(
                'INCONSISTENT_SCORE_LEVEL',
                `Score ${latestEvent.score} muito alto para level ${latestEvent.level}`,
                this.riskLevel.high
            );
        }
        
        // Verificar saltos impossíveis de score
        const recentEvents = this.sessionData.scoreEvents.slice(-5);
        for (let i = 1; i < recentEvents.length; i++) {
            const scoreDiff = recentEvents[i].score - recentEvents[i-1].score;
            const timeDiff = recentEvents[i].timestamp - recentEvents[i-1].timestamp;
            
            // Se ganhou mais de 500 pontos em menos de 100ms
            if (scoreDiff > 500 && timeDiff < 100) {
                this.flagBehavior(
                    'IMPOSSIBLE_SCORE_JUMP',
                    `+${scoreDiff} pontos em ${timeDiff}ms`,
                    this.riskLevel.critical
                );
            }
        }
    }

    // Verificar padrões suspeitos
    checkSuspiciousPatterns() {
        // Verificar scores repetidos
        const scorePatterns = this.findRepeatingPatterns(this.sessionData.scoreHistory.slice(-20));
        if (scorePatterns.length > 0) {
            this.flagBehavior(
                'REPEATING_SCORE_PATTERNS',
                `Padrões repetitivos detectados: ${scorePatterns.join(', ')}`,
                this.riskLevel.medium
            );
        }
        
        // Verificar se está sempre no mesmo level
        const recentLevels = this.sessionData.levelHistory.slice(-10);
        const uniqueLevels = [...new Set(recentLevels)];
        if (uniqueLevels.length === 1 && recentLevels.length >= 5) {
            this.flagBehavior(
                'STUCK_LEVEL',
                `Muito tempo no level ${uniqueLevels[0]}`,
                this.riskLevel.low
            );
        }
    }

    // Função auxiliar para contar valores idênticos
    countIdenticalValues(array, tolerance = 0) {
        const groups = {};
        
        array.forEach(value => {
            let found = false;
            for (let key in groups) {
                if (Math.abs(value - parseFloat(key)) <= tolerance) {
                    groups[key]++;
                    found = true;
                    break;
                }
            }
            if (!found) {
                groups[value] = 1;
            }
        });
        
        return Math.max(...Object.values(groups));
    }

    // Função auxiliar para encontrar padrões repetitivos
    findRepeatingPatterns(array) {
        const patterns = [];
        const minPatternLength = 2;
        const maxPatternLength = 5;
        
        for (let length = minPatternLength; length <= maxPatternLength; length++) {
            for (let i = 0; i <= array.length - length * 2; i++) {
                const pattern = array.slice(i, i + length);
                const nextSegment = array.slice(i + length, i + length * 2);
                
                if (JSON.stringify(pattern) === JSON.stringify(nextSegment)) {
                    patterns.push(pattern.join('→'));
                }
            }
        }
        
        return [...new Set(patterns)];
    }

    // Registrar comportamento suspeito
    flagBehavior(type, description, riskLevel) {
        const flag = {
            type,
            description,
            riskLevel,
            timestamp: Date.now()
        };
        
        this.sessionData.flaggedBehaviors.push(flag);
        
        if (riskLevel > this.currentRisk) {
            this.currentRisk = riskLevel;
        }
        
        console.warn(`🚨 AntiCheat Flag: [${type}] ${description} (Risk: ${riskLevel})`);
    }

    // Verificar se o jogador deve ser bloqueado
    shouldBlock() {
        return this.isBlocked;
    }

    // Obter relatório de segurança
    getSecurityReport() {
        const sessionDuration = Date.now() - this.sessionData.startTime;
        
        return {
            riskLevel: this.currentRisk,
            isBlocked: this.isBlocked,
            sessionDuration: Math.round(sessionDuration / 1000), // em segundos
            totalEvents: this.sessionData.scoreEvents.length,
            flaggedBehaviors: this.sessionData.flaggedBehaviors,
            lastScore: this.sessionData.scoreHistory[this.sessionData.scoreHistory.length - 1] || 0,
            averageScoreRate: this.calculateAverageScoreRate(),
            timingConsistency: this.calculateTimingConsistency()
        };
    }

    // Calcular rate médio de pontuação
    calculateAverageScoreRate() {
        if (this.sessionData.scoreEvents.length < 2) return 0;
        
        const firstEvent = this.sessionData.scoreEvents[0];
        const lastEvent = this.sessionData.scoreEvents[this.sessionData.scoreEvents.length - 1];
        
        const totalScore = lastEvent.score - firstEvent.score;
        const totalTime = lastEvent.timestamp - firstEvent.timestamp;
        
        return totalTime > 0 ? (totalScore / totalTime) * 1000 : 0; // pontos por segundo
    }

    // Calcular consistência do timing
    calculateTimingConsistency() {
        if (this.sessionData.timingIntervals.length < 3) return 1;
        
        const intervals = this.sessionData.timingIntervals;
        const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((acc, interval) => {
            return acc + Math.pow(interval - average, 2);
        }, 0) / intervals.length;
        
        const standardDeviation = Math.sqrt(variance);
        return average > 0 ? standardDeviation / average : 0;
    }

    // Resetar para nova sessão
    reset() {
        this.sessionData = {
            startTime: Date.now(),
            lastScoreTime: Date.now(),
            scoreHistory: [],
            levelHistory: [],
            timingIntervals: [],
            totalGameTime: 0,
            scoreEvents: [],
            flaggedBehaviors: [],
            isFirstSession: false // não é mais primeira sessão
        };
        
        this.currentRisk = this.riskLevel.low;
        this.isBlocked = false;
    }

    // Marcar que não é mais primeira sessão
    markNotFirstSession() {
        this.sessionData.isFirstSession = false;
    }

    // Obter status atual
    getStatus() {
        const riskNames = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        return {
            risk: riskNames[this.currentRisk],
            blocked: this.isBlocked,
            flags: this.sessionData.flaggedBehaviors.length,
            sessionTime: Math.round((Date.now() - this.sessionData.startTime) / 1000)
        };
    }
}

export default AntiCheat;