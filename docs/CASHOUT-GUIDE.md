# Como Transformar SPACE Tokens em Dinheiro Real

## 🎯 Visão Geral

Este guia explica como players podem converter:
- Coins do jogo → SPACE tokens → SOL → Dinheiro (BRL/USD)
- NFT items → SOL → Dinheiro (BRL/USD)

---

## 💰 Path 1: Coins → Dinheiro

### Passo 1: Withdraw Coins → SPACE Tokens ✅ (JÁ FUNCIONA)

1. Acesse `token-bridge.html`
2. Conecte sua Phantom Wallet
3. Digite quantidade de coins (mínimo 10)
4. Clique "Withdraw"
5. SPACE tokens aparecem na sua wallet

**Exemplo:**
```
1000 coins → 1000 SPACE tokens
```

---

### Passo 2: Vender SPACE → SOL ⚠️ (PRECISA IMPLEMENTAR)

**Opção A: Via Raydium (DEX)**

Você (desenvolvedor) precisa primeiro criar o pool:

#### Criar Pool de Liquidez (Uma vez)

```bash
# 1. Acesse Raydium
https://raydium.io/liquidity/create/

# 2. Configure o pool
Token A: SPACE (seu token mint address)
Token B: SOL
Initial Liquidity:
  - 10,000 SPACE
  - 1 SOL

Isso define o preço inicial: 1 SPACE = 0.0001 SOL

# 3. Confirme a transação
Custo: ~0.3 SOL (~$60)
```

#### Player Vende SPACE (Depois do pool criado)

```
1. Abrir Phantom Wallet
2. Clicar em "Swap"
3. From: SPACE
4. To: SOL
5. Amount: 1000 SPACE
6. Revisar: ~0.1 SOL
7. Confirmar

Result: SOL aparece na wallet
```

---

**Opção B: Jupiter Widget no Jogo (Melhor UX)**

Adicionar widget de swap dentro do jogo:

```html
<!-- token-bridge.html -->
<div id="cash-out-section">
    <h3>💰 Cash Out SPACE → SOL</h3>
    <div id="jupiter-terminal"></div>
</div>

<script src="https://terminal.jup.ag/main-v2.js"></script>
<script>
  window.Jupiter.init({
    displayMode: "integrated",
    integratedTargetId: "jupiter-terminal",
    endpoint: SOLANA_CONFIG.rpcEndpoint,
    defaultInputMint: SOLANA_CONFIG.spaceTokenMint, // SPACE
    defaultOutputMint: "So11111111111111111111111111111111111111112", // SOL
    defaultAmount: 1000,
  });
</script>
```

---

### Passo 3: Vender SOL → BRL/USD ✅ (JÁ EXISTE)

#### Para Brasileiros - Exchanges Nacionais

**Mercado Bitcoin** (mais popular)
```
1. Criar conta: https://www.mercadobitcoin.com.br
2. Fazer KYC (enviar documentos)
3. Depositar SOL:
   - Copiar endereço de depósito SOL
   - Enviar da Phantom para MB
   - Aguardar 1-2 minutos
4. Vender SOL/BRL
5. Sacar via PIX (instantâneo)

Taxa: ~1.5% + R$5 saque
```

**Binance Brasil**
```
1. Criar conta: https://www.binance.com
2. KYC (verificação)
3. Depositar SOL (Network: Solana)
4. Trade SOL/BRL
5. Saque:
   - P2P (sem taxa, mais rápido)
   - Ou saque direto (taxa pequena)

Taxa: 0.1% trading + variável no saque
```

**Outras opções:**
- NovaDAX (boa para iniciantes)
- Foxbit (interface simples)
- BitPreço (menor spread)

#### Para Internacionais

**Coinbase**
```
1. Criar conta: https://www.coinbase.com
2. Depositar SOL
3. Sell SOL → USD
4. Withdraw para banco

Taxa: ~1.5%
```

**Kraken**
```
Suporta SOL direto
Taxa: ~0.26%
```

---

## 🎨 Path 2: NFTs → Dinheiro

### Passo 1: Mint Item → NFT ⚠️ (PLACEHOLDER)

```javascript
// No jogo, em inventory.html
await nftManager.mintNFT('skin_01');

// NFT vai para sua wallet
// Item é removido do jogo
```

**Custo:** ~0.01 SOL (gas fees)

---

### Passo 2: Listar NFT no Marketplace

**Opção A: Marketplace do Jogo** ⚠️ (PLACEHOLDER)

```javascript
// marketplace.html
await marketplaceManager.listNFT(nftAddress, 0.5); // 0.5 SOL

// NFT aparece para outros players
```

**Opção B: Magic Eden / Tensor**

1. Ir para Magic Eden: https://magiceden.io
2. Connect Wallet (Phantom)
3. Go to "My Items"
4. Select NFT
5. Click "List for Sale"
6. Set price in SOL
7. Confirm

Quando vender:
- Você recebe SOL na wallet
- Menos fees (~2-3%)
- Menos royalties (5% para o jogo)

---

### Passo 3: Receber SOL → Converter para BRL

Mesmo processo do Path 1, Passo 3 acima.

---

## 💡 Exemplos Práticos

### Exemplo 1: Jogador Casual

```
João joga 5 horas
→ Ganha 2,000 coins
→ Withdraw para 2,000 SPACE
→ Vende no Raydium por 0.2 SOL (~$40)
→ Envia para Binance
→ Vende por R$200
→ Saque via PIX

Tempo total: 30 minutos
Taxa total: ~5% (~R$10)
Líquido: R$190
```

### Exemplo 2: Jogador Hardcore (NFT Trader)

```
Maria joga 20 horas
→ Compra skin legendária (2000 coins)
→ Mint como NFT (custo: 0.01 SOL)
→ Lista no Magic Eden por 1 SOL
→ Vende em 3 dias
→ Recebe 0.925 SOL (depois de fees)
→ ~$185
→ Converte para R$925 na Binance
→ Saque via P2P

Tempo total: 3 dias
Taxa total: ~7.5%
Líquido: R$855
```

---

## 📊 Calculadora de Cash Out

### SPACE Token → BRL

```
Cenário: 1000 SPACE tokens

1. SPACE → SOL (Raydium)
   1000 SPACE × 0.0001 SOL = 0.1 SOL
   Valor: $20 USD

2. SOL → BRL (Binance)
   0.1 SOL × R$500/SOL = R$100
   Menos taxa 1%: R$99

3. Saque PIX
   Menos R$5: R$94

TOTAL NA CONTA: R$94
```

### NFT → BRL

```
Cenário: Venda de skin rara

1. Listar NFT: 0.5 SOL
2. Player compra
3. Você recebe:
   - 0.5 SOL (valor)
   - Menos 5% royalty: 0.025 SOL
   - Menos 2.5% marketplace: 0.0125 SOL
   - Total: 0.4625 SOL

4. 0.4625 SOL → BRL
   0.4625 × R$500 = R$231.25
   Menos taxa 1%: R$229

TOTAL NA CONTA: R$229
```

---

## ⚠️ Avisos Importantes

### Impostos 🇧🇷

**Brasil:**
- Crypto é considerado ativo financeiro
- Vendas acima de R$35,000/mês: 15% IR
- Declarar no IR anual (ficha "Bens e Direitos")
- Consulte contador

### Volatilidade 📉

- Preço do SOL varia constantemente
- SPACE token pode ter alta volatilidade
- Preço dos NFTs depende da demanda
- Nunca invista mais do que pode perder

### Segurança 🔒

- **NUNCA** compartilhe sua seed phrase
- Use Phantom ou hardware wallet
- Verifique endereços antes de enviar
- Cuidado com sites falsos (phishing)

---

## 🚀 Próximos Passos (Desenvolvedor)

Para habilitar cash-out completo:

### ✅ Urgente (2 horas)

1. **Criar pool SPACE/SOL no Raydium**
   - Depositar liquidez inicial
   - Testar swap
   - Documentar para players

2. **Adicionar seção "Cash Out" no token-bridge.html**
   - Link para Raydium
   - Tutorial de como vender
   - Lista de exchanges BR

### 🔜 Importante (1 dia)

3. **Integrar Jupiter Terminal**
   - Widget de swap in-game
   - SPACE → SOL sem sair do jogo
   - Melhor UX

4. **Completar NFT minting**
   - Deploy da coleção (Task 9)
   - Integrar Metaplex SDK real
   - Testar mint completo

### 💡 Futuro (opcional)

5. **Integrar MoonPay Sell**
   - Cash out direto (SOL → BRL)
   - Sem precisar de exchange
   - Cobra taxa mas é conveniente

6. **Sistema de Staking**
   - Players stakam SPACE por rewards
   - Incentiva hold (menos volatilidade)
   - Gera renda passiva

---

## 📞 Suporte

Players com dúvidas sobre cash out:
- Discord do jogo
- Tutorial em vídeo
- FAQ no site

---

**Status:** 🚧 Em desenvolvimento
**Última atualização:** 2026-08-22
