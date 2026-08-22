// Token Bridge UI - Main Logic
import { NavigationHelper } from './navigation.js';
import { supabase } from './supabase.js';
import walletManager from './classes/SolanaWalletManager.js';
import tokenManager from './classes/TokenManager.js';
import SOLANA_CONFIG from './config/solana-config.js';

// State
let currentUser = null;
let currentDirection = 'withdraw'; // 'withdraw' or 'deposit'
let isProcessing = false;

// DOM Elements
const gameBalanceEl = document.getElementById('game-balance');
const tokenBalanceEl = document.getElementById('token-balance');
const amountInput = document.getElementById('amount-input');
const transactionSummary = document.getElementById('transaction-summary');
const sendAmountEl = document.getElementById('send-amount');
const receiveAmountEl = document.getElementById('receive-amount');
const summaryNoteEl = document.getElementById('summary-note');
const bridgeActionBtn = document.getElementById('bridge-action-btn');
const statusMessageEl = document.getElementById('status-message');
const historyListEl = document.getElementById('history-list');
const loadingModal = document.getElementById('loading-modal');
const loadingTitle = document.getElementById('loading-title');
const loadingMessage = document.getElementById('loading-message');

// Initialize
async function init() {
    console.log('🌉 Inicializando Token Bridge...');

    // Check if user is logged in
    if (!NavigationHelper.requireAuth()) {
        return;
    }

    currentUser = NavigationHelper.getCurrentUser();

    // Initialize wallet UI
    await initWalletUI();

    // Load balances
    await loadBalances();

    // Load transaction history
    await loadTransactionHistory();

    // Setup event listeners
    setupEventListeners();

    console.log('✅ Token Bridge inicializado');
}

// Initialize Wallet UI
async function initWalletUI() {
    const walletConnectBtn = document.getElementById('wallet-connect-btn');
    const walletDisconnectBtn = document.getElementById('wallet-disconnect-btn');

    if (walletConnectBtn) {
        walletConnectBtn.addEventListener('click', async () => {
            await walletManager.connect();
            await loadBalances();
        });
    }

    if (walletDisconnectBtn) {
        walletDisconnectBtn.addEventListener('click', async () => {
            await walletManager.disconnect();
            await loadBalances();
        });
    }
}

// Load Balances
async function loadBalances() {
    try {
        // Load game balance
        const { data: playerData, error } = await supabase
            .from('players')
            .select('coins')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        const gameBalance = playerData.coins || 0;
        gameBalanceEl.textContent = gameBalance.toLocaleString();
        currentUser.coins = gameBalance;
        NavigationHelper.setCurrentUser(currentUser);

        // Load token balance (if wallet connected)
        if (walletManager.isWalletConnected()) {
            try {
                const tokenBalance = await tokenManager.getTokenBalance(walletManager.getPublicKey());
                tokenBalanceEl.textContent = tokenBalance.toLocaleString();
            } catch (err) {
                console.error('Erro ao carregar saldo de tokens:', err);
                tokenBalanceEl.textContent = '0';
            }
        } else {
            tokenBalanceEl.textContent = '0';
        }

    } catch (error) {
        console.error('Erro ao carregar saldos:', error);
        showStatus('Erro ao carregar saldos', 'error');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Direction buttons
    const withdrawBtn = document.getElementById('withdraw-btn');
    const depositBtn = document.getElementById('deposit-btn');

    withdrawBtn.addEventListener('click', () => setDirection('withdraw'));
    depositBtn.addEventListener('click', () => setDirection('deposit'));

    // Amount input
    amountInput.addEventListener('input', updateTransactionSummary);

    // Quick amount buttons
    const quickAmountBtns = document.querySelectorAll('.quick-amount-btn');
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            amountInput.value = amount;
            updateTransactionSummary();
        });
    });

    // Bridge action button
    bridgeActionBtn.addEventListener('click', handleBridgeAction);
}

// Set Direction
function setDirection(direction) {
    currentDirection = direction;

    // Update button states
    const withdrawBtn = document.getElementById('withdraw-btn');
    const depositBtn = document.getElementById('deposit-btn');

    if (direction === 'withdraw') {
        withdrawBtn.classList.add('active');
        depositBtn.classList.remove('active');
        bridgeActionBtn.querySelector('.btn-text').textContent = 'Sacar Tokens';
    } else {
        depositBtn.classList.add('active');
        withdrawBtn.classList.remove('active');
        bridgeActionBtn.querySelector('.btn-text').textContent = 'Depositar Moedas';
    }

    updateTransactionSummary();
}

// Update Transaction Summary
function updateTransactionSummary() {
    const amount = parseInt(amountInput.value) || 0;

    if (amount < SOLANA_CONFIG.minAmount || amount > SOLANA_CONFIG.maxAmount) {
        transactionSummary.style.display = 'none';
        bridgeActionBtn.disabled = true;
        return;
    }

    // Check if wallet is connected
    if (!walletManager.isWalletConnected()) {
        transactionSummary.style.display = 'none';
        bridgeActionBtn.disabled = true;
        showStatus('Conecte sua wallet para continuar', 'warning');
        return;
    }

    // Check sufficient balance
    if (currentDirection === 'withdraw') {
        if (amount > currentUser.coins) {
            showStatus('Saldo insuficiente de moedas no jogo', 'error');
            bridgeActionBtn.disabled = true;
            return;
        }
    } else {
        // For deposit, we'll check on-chain balance
        const tokenBalance = parseInt(tokenBalanceEl.textContent.replace(/,/g, '')) || 0;
        if (amount > tokenBalance) {
            showStatus('Saldo insuficiente de tokens SPACE', 'error');
            bridgeActionBtn.disabled = true;
            return;
        }
    }

    // Show summary
    transactionSummary.style.display = 'block';
    bridgeActionBtn.disabled = false;
    hideStatus();

    if (currentDirection === 'withdraw') {
        sendAmountEl.textContent = `${amount.toLocaleString()} 🪙 Moedas`;
        receiveAmountEl.textContent = `${amount.toLocaleString()} 💎 Tokens SPACE`;
        summaryNoteEl.textContent = 'Taxa de conversão: 1:1 | Você receberá tokens SPACE na sua wallet';
    } else {
        sendAmountEl.textContent = `${amount.toLocaleString()} 💎 Tokens SPACE`;
        receiveAmountEl.textContent = `${amount.toLocaleString()} 🪙 Moedas`;
        summaryNoteEl.textContent = 'Taxa de conversão: 1:1 | Você receberá moedas no jogo';
    }
}

// Handle Bridge Action
async function handleBridgeAction() {
    if (isProcessing) return;

    const amount = parseInt(amountInput.value);

    if (!amount || amount < SOLANA_CONFIG.minAmount || amount > SOLANA_CONFIG.maxAmount) {
        showStatus(`Quantidade inválida. Min: ${SOLANA_CONFIG.minAmount}, Max: ${SOLANA_CONFIG.maxAmount}`, 'error');
        return;
    }

    if (!walletManager.isWalletConnected()) {
        showStatus('Por favor, conecte sua wallet primeiro', 'error');
        return;
    }

    // Confirm action
    const confirmMsg = currentDirection === 'withdraw'
        ? `Confirma sacar ${amount} moedas e receber ${amount} tokens SPACE?`
        : `Confirma depositar ${amount} tokens SPACE e receber ${amount} moedas?`;

    if (!confirm(confirmMsg)) {
        return;
    }

    isProcessing = true;
    bridgeActionBtn.classList.add('loading');
    bridgeActionBtn.disabled = true;

    try {
        if (currentDirection === 'withdraw') {
            await handleWithdraw(amount);
        } else {
            await handleDeposit(amount);
        }
    } catch (error) {
        console.error('Erro na transação:', error);
        showStatus(error.message || 'Erro ao processar transação', 'error');
    } finally {
        isProcessing = false;
        bridgeActionBtn.classList.remove('loading');
        bridgeActionBtn.disabled = false;
    }
}

// Handle Withdraw
async function handleWithdraw(amount) {
    showLoadingModal('Processando Saque...', 'Deduzindo moedas e mintando tokens SPACE...');

    try {
        const result = await tokenManager.withdrawCoins(amount);

        hideLoadingModal();
        showStatus(`✅ Saque concluído! ${amount} tokens SPACE enviados para sua wallet`, 'success');

        // Clear input
        amountInput.value = '';
        updateTransactionSummary();

        // Reload balances and history
        await loadBalances();
        await loadTransactionHistory();

        // Show transaction link
        if (result.signature) {
            const explorerUrl = SOLANA_CONFIG.network === 'devnet'
                ? `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
                : `https://explorer.solana.com/tx/${result.signature}`;

            showStatus(
                `✅ Saque concluído! Ver transação: ${explorerUrl}`,
                'success'
            );
        }

    } catch (error) {
        hideLoadingModal();
        throw error;
    }
}

// Handle Deposit
async function handleDeposit(amount) {
    showLoadingModal('Processando Depósito...', 'Queimando tokens SPACE e adicionando moedas...');

    try {
        const result = await tokenManager.depositCoins(amount);

        hideLoadingModal();
        showStatus(`✅ Depósito concluído! ${amount} moedas adicionadas ao jogo`, 'success');

        // Clear input
        amountInput.value = '';
        updateTransactionSummary();

        // Reload balances and history
        await loadBalances();
        await loadTransactionHistory();

        // Show transaction link
        if (result.signature) {
            const explorerUrl = SOLANA_CONFIG.network === 'devnet'
                ? `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
                : `https://explorer.solana.com/tx/${result.signature}`;

            showStatus(
                `✅ Depósito concluído! Ver transação: ${explorerUrl}`,
                'success'
            );
        }

    } catch (error) {
        hideLoadingModal();
        throw error;
    }
}

// Load Transaction History
async function loadTransactionHistory() {
    try {
        historyListEl.innerHTML = '<div class="loading-history">Carregando histórico...</div>';

        const { data: transactions, error } = await supabase
            .from('token_transactions')
            .select('*')
            .eq('player_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!transactions || transactions.length === 0) {
            historyListEl.innerHTML = `
                <div class="empty-history">
                    <div class="empty-history-icon">📭</div>
                    <div>Nenhuma transação encontrada</div>
                </div>
            `;
            return;
        }

        historyListEl.innerHTML = transactions.map(tx => {
            const date = new Date(tx.created_at).toLocaleString('pt-BR');
            const explorerUrl = SOLANA_CONFIG.network === 'devnet'
                ? `https://explorer.solana.com/tx/${tx.tx_signature}?cluster=devnet`
                : `https://explorer.solana.com/tx/${tx.tx_signature}`;

            return `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-type ${tx.type.toLowerCase()}">
                            ${tx.type === 'WITHDRAW' ? '🪙→💎 SAQUE' : '💎→🪙 DEPÓSITO'}
                        </div>
                        <div class="history-amount">${tx.amount.toLocaleString()}</div>
                        <div class="history-date">${date}</div>
                        ${tx.tx_signature ? `
                            <div class="history-tx">
                                <a href="${explorerUrl}" target="_blank" class="history-tx-link">
                                    Ver na Blockchain →
                                </a>
                            </div>
                        ` : ''}
                    </div>
                    <div class="history-status ${tx.status.toLowerCase()}">
                        ${tx.status}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        historyListEl.innerHTML = `
            <div class="empty-history">
                <div class="empty-history-icon">⚠️</div>
                <div>Erro ao carregar histórico</div>
            </div>
        `;
    }
}

// Show Status
function showStatus(message, type = 'info') {
    statusMessageEl.textContent = message;
    statusMessageEl.className = `status-message ${type}`;
    statusMessageEl.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideStatus();
    }, 5000);
}

// Hide Status
function hideStatus() {
    statusMessageEl.style.display = 'none';
}

// Show Loading Modal
function showLoadingModal(title, message) {
    loadingTitle.textContent = title;
    loadingMessage.textContent = message;
    loadingModal.style.display = 'flex';
}

// Hide Loading Modal
function hideLoadingModal() {
    loadingModal.style.display = 'none';
}

// Make NavigationHelper globally available
window.NavigationHelper = NavigationHelper;

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
