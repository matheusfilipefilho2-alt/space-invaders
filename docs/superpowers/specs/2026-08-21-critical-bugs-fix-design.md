# Design: Correção de Bugs Críticos - Space Invaders

**Data**: 2026-08-21
**Autor**: Claude Code
**Tipo**: Bug Fixes (Críticos)
**Status**: Aprovado para Implementação

## 1. Sumário Executivo

### Objetivo
Corrigir 6 bugs críticos identificados no relatório de verificação do repositório, excluindo o sistema PIX (que permanece como mock/simulado por decisão do usuário).

### Bugs a Corrigir

1. **PIN em texto plano no banco de dados** - Implementar hash com bcrypt
2. **Memory leak no game loop** - Cancelar requestAnimationFrame adequadamente
3. **Transações não atômicas na loja** - Implementar RPC functions atômicas
4. **Validação de preço apenas no frontend** - Validação server-side via RPC
5. **PIN não validado no registro** - Validação regex rigorosa
6. **Moedas gastas sem item creditado** - Relacionado ao #3, resolvido pela transação atômica

### Estratégia
Correções incrementais com commits individuais, testáveis isoladamente, seguindo a ordem de complexidade e dependências.

### Impacto
- **Segurança**: PINs protegidos com hash bcrypt (salt 10)
- **Estabilidade**: Memory leak eliminado, jogo não trava mais
- **Integridade**: Transações atômicas garantem que moedas nunca são perdidas
- **Confiabilidade**: Validações server-side impedem manipulação client-side

## 2. Contexto do Projeto

### Tecnologias
- **Frontend**: JavaScript vanilla, HTML, CSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Sistema próprio com PIN de 4 dígitos
- **Moeda**: Sistema de coins interno

### Arquitetura Atual
```
Frontend (Browser)
├── login.html / register.html
├── game.html
├── shop.html
└── src/
    ├── login.js / register.js
    ├── game.js
    └── classes/
        ├── RankingManager.js (auth)
        └── ShopClass.js (compras)

Backend (Supabase)
└── Tabelas:
    ├── players (id, username, pin, coins, high_score, level_id)
    └── player_items (id, user_id, item_id, item_type)
```

### Estado Atual dos Bugs

**Bug #1 - PIN Texto Plano:**
- Arquivo: `src/classes/RankingManager.js:27` (insert), `:55` (select)
- PIN armazenado diretamente: `pin: pin`
- Comparação: `.eq("pin", pin)`

**Bug #2 - Memory Leak:**
- Arquivo: `src/game.js:1195, 1305`
- `requestAnimationFrame(gameLoop)` sem armazenar ID
- Não há `cancelAnimationFrame()` em lugar nenhum

**Bug #3 - Transação Não Atômica:**
- Arquivo: `src/classes/ShopClass.js:387-412`
- Operação 1: `UPDATE players SET coins` (linha 390-393)
- Operação 2: `INSERT INTO player_items` (linha 407)
- Se operação 2 falhar, operação 1 não é revertida

**Bug #4 - Validação Frontend:**
- Arquivo: `src/classes/ShopClass.js:316-319`
- `if (userCoins < item.price)` apenas no JS
- Facilmente manipulável via DevTools

**Bug #5 - PIN Não Validado:**
- Arquivo: `src/login.js:19`, `src/register.js:20`
- Validação: `pin.length !== 4` apenas
- Não valida se são dígitos numéricos
- HTML: `maxlength="4"` mas sem `pattern`

**Bug #6 - Moedas Sem Item:**
- Mesmo que Bug #3 (transação não atômica)
- Perda de moedas se INSERT falhar

## 3. Arquitetura da Solução

### Dependências Novas

**Bcrypt.js** (via CDN):
```html
<script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>
```

Adicionado em:
- `login.html`
- `register.html`

### Arquivos Modificados

1. **login.html** - adicionar bcrypt CDN, pattern no input
2. **register.html** - adicionar bcrypt CDN, pattern nos inputs
3. **src/login.js** - validação PIN + hash + migração
4. **src/register.js** - validação PIN + hash
5. **src/classes/RankingManager.js** - receber hash, comparar hash, migração
6. **src/game.js** - armazenar/cancelar animationFrame ID
7. **src/classes/ShopClass.js** - chamar RPC ao invés de updates diretos
8. **Supabase** - criar 3 RPC functions (SQL)

### Arquivos Criados

Nenhum arquivo novo. Apenas modificações e RPC functions no Supabase.

## 4. Design Detalhado por Correção

### 4.1 Correção: Validação de PIN (Não Numérico)

**Problema**: PIN aceita letras, símbolos, espaços
**Severidade**: 🔴 CRÍTICO
**Impacto**: Usuário registra mas não consegue logar

#### Solução HTML

**Arquivo**: `login.html:42-47`
```html
<input
    type="tel"              <!-- MUDANÇA: era "password" -->
    id="pin"
    placeholder="PIN (4 dígitos)"
    maxlength="4"
    pattern="[0-9]{4}"      <!-- NOVO -->
    inputmode="numeric"     <!-- NOVO: teclado numérico mobile -->
    autocomplete="current-password"
    class="game-input"
/>
```

**Arquivo**: `register.html:43-55`
```html
<!-- Input new-pin -->
<input
    type="tel"
    id="new-pin"
    placeholder="PIN (4 dígitos)"
    maxlength="4"
    pattern="[0-9]{4}"
    inputmode="numeric"
    autocomplete="new-password"
    class="game-input"
/>

<!-- Input confirm-pin -->
<input
    type="tel"
    id="confirm-pin"
    placeholder="Confirmar PIN"
    maxlength="4"
    pattern="[0-9]{4}"
    inputmode="numeric"
    autocomplete="new-password"
    class="game-input"
/>
```

#### Solução JavaScript

**Arquivo**: `src/login.js:19`
```javascript
// ANTES
if (!username || pin.length !== 4) {
    alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
}

// DEPOIS
if (!username || pin.length !== 4) {
    alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
}

// NOVO: Validação de dígitos numéricos
if (!/^\d{4}$/.test(pin)) {
    alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
    return;
}
```

**Arquivo**: `src/register.js:20`
```javascript
// ANTES
if (!username || pin.length !== 4) {
    alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
}

// DEPOIS
if (!username || pin.length !== 4) {
    alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
}

// NOVO: Validação de dígitos numéricos
if (!/^\d{4}$/.test(pin)) {
    alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
    return;
}
```

#### Testes

- [ ] Tentar registrar com PIN "abcd" → deve rejeitar com mensagem clara
- [ ] Tentar registrar com PIN "12 3" → deve rejeitar
- [ ] Tentar registrar com PIN "12a4" → deve rejeitar
- [ ] Tentar registrar com PIN "1234" → deve aceitar
- [ ] Verificar que HTML pattern bloqueia input não numérico

---

### 4.2 Correção: Memory Leak no Game Loop

**Problema**: Múltiplos `requestAnimationFrame` acumulando a cada reinício
**Severidade**: 🔴 CRÍTICO
**Impacto**: Performance degrada, eventual crash do navegador

#### Solução

**Arquivo**: `src/game.js`

**Localização do Bug:**
- Linha 1195: dentro de `gameLoop()` - `requestAnimationFrame(gameLoop)`
- Linha 1305: dentro de `startGame()` - chama `gameLoop()`
- Nenhum lugar cancela o frame anterior

**Mudanças:**

```javascript
// NOVO: Adicionar no topo do arquivo (após outras variáveis globais)
let gameLoopId = null;

// MODIFICAR: função gameLoop (linha ~1195)
function gameLoop() {
    // ... código existente ...

    // ANTES:
    // requestAnimationFrame(gameLoop);

    // DEPOIS:
    gameLoopId = requestAnimationFrame(gameLoop);
}

// MODIFICAR: função startGame (antes de chamar gameLoop, linha ~1305)
function startGame() {
    // NOVO: Cancelar loop anterior se existir
    if (gameLoopId !== null) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }

    // ... resto do código existente ...

    gameLoop(); // Inicia novo loop
}

// MODIFICAR: função endGame (adicionar cancelamento)
function endGame() {
    // NOVO: Cancelar game loop
    if (gameLoopId !== null) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }

    // ... resto do código existente ...
}
```

#### Testes

- [ ] Jogar → Game Over → Play Again → Repetir 10 vezes
- [ ] Abrir DevTools > Performance > Gravar
- [ ] Verificar que apenas 1 loop está ativo (não múltiplos)
- [ ] Verificar memória no DevTools > Memory > Heap snapshot
- [ ] Confirmar que memória não cresce indefinidamente

---

### 4.3 Correção: Hash de PIN com Bcrypt

**Problema**: PIN armazenado em texto plano no banco de dados
**Severidade**: 🔴 CRÍTICO
**Impacto**: Vazamento de banco expõe todas as senhas

#### Estratégia de Migração

**Compatibilidade com Usuários Existentes:**
- Sistema detectará se PIN no DB é hash (começa com `$2a$` ou `$2b$`) ou texto plano
- Durante login, tentará ambos: bcrypt.compare() e comparação direta
- Se login com texto plano funcionar, migrará automaticamente para hash
- Todos os novos registros já usarão hash

**Fluxo de Migração:**
```
Login Attempt
├─> Tentar bcrypt.compare(inputPin, storedPin)
│   └─> Sucesso → Login OK
│
└─> Falhou
    └─> Verificar se storedPin não é hash (não começa com $2)
        ├─> Tentar comparação direta (inputPin === storedPin)
        │   ├─> Sucesso → Migrar para hash + Login OK
        │   └─> Falhou → Login failed
        │
        └─> É hash → Login failed
```

#### Solução Frontend

**Arquivo**: `login.html`
```html
<head>
    <!-- ... existing scripts ... -->

    <!-- NOVO: Bcrypt.js -->
    <script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>
</head>
```

**Arquivo**: `register.html`
```html
<head>
    <!-- ... existing scripts ... -->

    <!-- NOVO: Bcrypt.js -->
    <script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>
</head>
```

**Arquivo**: `src/register.js`
```javascript
buttonCreate.addEventListener("click", async () => {
    const username = newUsernameInput.value.trim();
    const pin = newPinInput.value.trim();
    const confirmPin = confirmPinInput.value.trim();

    // Validações existentes...
    if (!username || pin.length !== 4) {
        alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
        return;
    }

    // Validação numérica (correção #1)
    if (!/^\d{4}$/.test(pin)) {
        alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
        return;
    }

    if (pin !== confirmPin) {
        alert("PINs não conferem!");
        return;
    }

    // NOVO: Hash do PIN antes de enviar
    const hashedPin = bcrypt.hashSync(pin, 10); // salt rounds = 10

    // MODIFICAR: enviar hash ao invés de PIN plano
    const result = await rankingManager.register(username, hashedPin);

    if (result.success) {
        NavigationHelper.setCurrentUser(result.user);
        NavigationHelper.goTo('ranking.html');
    } else {
        alert(result.error);
    }
});
```

**Arquivo**: `src/login.js`
```javascript
buttonLogin.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();

    // Validações existentes...
    if (!username || pin.length !== 4) {
        alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
        return;
    }

    // Validação numérica (correção #1)
    if (!/^\d{4}$/.test(pin)) {
        alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
        return;
    }

    // NOVO: Tentar login (RankingManager agora lida com hash vs plaintext)
    const result = await rankingManager.login(username, pin);
    console.log(result.user);

    if (result.success) {
        NavigationHelper.setCurrentUser(result.user);
        NavigationHelper.goTo('ranking.html');
    } else {
        alert(result.error);
    }
});
```

#### Solução Backend

**Arquivo**: `src/classes/RankingManager.js`

```javascript
// MODIFICAR: método register
async register(username, hashedPin) {  // MUDANÇA: recebe hash já pronto
    try {
        const { data: existing } = await supabase
            .from("players")
            .select("username")
            .eq("username", username)
            .limit(1);

        if (existing && existing.length > 0) {
            throw new Error("Nome de usuário já existe!");
        }

        const { data, error } = await supabase
            .from("players")
            .insert([
                {
                    username: username,
                    pin: hashedPin,  // MUDANÇA: armazena hash
                    high_score: 0,
                    coins: 0,
                    level_id: 1,
                    total_games: 0,
                    created_at: new Date().toISOString(),
                },
            ])
            .select();

        if (error) throw error;

        this.currentUser = data[0];
        this.rewardSystem.setUser(this.currentUser);
        return { success: true, user: data[0] };
    } catch (error) {
        console.error("❌ Erro no registro:", error);
        return { success: false, error: error.message };
    }
}

// MODIFICAR: método login
async login(username, pin) {  // MUDANÇA: recebe PIN plano (não hash)
    try {
        // Buscar usuário
        const { data, error } = await supabase
            .from("players")
            .select("*")
            .eq("username", username);

        if (error) {
            console.error("Erro na consulta de login:", error);
            throw new Error("Erro na autenticação");
        }

        if (!data || data.length === 0) {
            throw new Error("Usuário ou PIN incorretos!");
        }

        const user = data[0];
        const storedPin = user.pin;

        // NOVO: Detectar se PIN é hash ou texto plano
        const isHash = storedPin.startsWith('$2a$') || storedPin.startsWith('$2b$');

        let authenticated = false;

        if (isHash) {
            // Novo sistema: comparar com bcrypt
            authenticated = bcrypt.compareSync(pin, storedPin);
        } else {
            // Sistema legado: comparação direta
            authenticated = (pin === storedPin);

            // NOVO: Migrar para hash automaticamente se login for bem-sucedido
            if (authenticated) {
                console.log('🔄 Migrando PIN para hash...');
                const hashedPin = bcrypt.hashSync(pin, 10);

                // Atualizar PIN para hash no banco
                await supabase
                    .from("players")
                    .update({ pin: hashedPin })
                    .eq("id", user.id);

                console.log('✅ PIN migrado com sucesso');
            }
        }

        if (!authenticated) {
            throw new Error("Usuário ou PIN incorretos!");
        }

        // Garantir campos novos (migração suave)
        if (user.coins === undefined) user.coins = 0;
        if (user.level_id === undefined) user.level_id = 1;
        if (user.total_games === undefined) user.total_games = 0;

        this.currentUser = user;
        this.rewardSystem.setUser(this.currentUser);

        return { success: true, user: user };
    } catch (error) {
        console.error("Erro no login:", error);
        return { success: false, error: error.message };
    }
}
```

#### Testes

- [ ] Registrar novo usuário → Verificar no Supabase que PIN começa com `$2a$` ou `$2b$`
- [ ] Fazer login com usuário novo → Deve funcionar
- [ ] Criar usuário teste com PIN texto plano direto no Supabase
- [ ] Fazer login com usuário texto plano → Deve funcionar E migrar automaticamente
- [ ] Verificar no Supabase que PIN do usuário migrado agora é hash
- [ ] Tentar login com PIN incorreto em ambos os casos → Deve rejeitar

---

### 4.4 Correção: Validação Server-Side de Preços

**Problema**: Preços validados apenas no frontend, manipuláveis via DevTools
**Severidade**: 🔴 CRÍTICO
**Impacto**: Usuários podem comprar items sem moedas suficientes

#### Solução: RPC Function no Supabase

**SQL Function** (criar no Supabase Dashboard > SQL Editor):

```sql
-- Função para validar se usuário tem moedas suficientes
CREATE OR REPLACE FUNCTION validate_user_balance(
  p_user_id UUID,
  p_required_amount INT
) RETURNS BOOLEAN AS $$
DECLARE
  user_coins INT;
BEGIN
  -- Buscar saldo atual do usuário
  SELECT coins INTO user_coins
  FROM players
  WHERE id = p_user_id;

  -- Retornar se tem saldo suficiente
  RETURN user_coins >= p_required_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Integração Frontend

**Arquivo**: `src/classes/ShopClass.js`

```javascript
// NOVO: Método para validar saldo via RPC
async validateBalance(userId, requiredAmount) {
    const { data, error } = await supabase
        .rpc('validate_user_balance', {
            p_user_id: userId,
            p_required_amount: requiredAmount
        });

    if (error) {
        console.error('Erro ao validar saldo:', error);
        return false;
    }

    return data; // boolean
}

// MODIFICAR: método handleBuy
async handleBuy(itemId, itemType, price) {
    const currentUser = NavigationHelper.getCurrentUser();

    if (!currentUser) {
        alert('Você precisa estar logado para comprar!');
        return;
    }

    // NOVO: Validação server-side ANTES de processar compra
    const hasBalance = await this.validateBalance(currentUser.id, price);

    if (!hasBalance) {
        alert('Moedas insuficientes! Validação servidor.');
        return;
    }

    // Continuar com compra (que será atômica - correção #5)
    // ...
}
```

#### Testes

- [ ] Modificar `currentUser.coins` no console → Tentar comprar item caro
- [ ] Validação server-side deve rejeitar mesmo com coins modificados no cliente
- [ ] Comprar com moedas suficientes → Deve funcionar normalmente
- [ ] Verificar logs do Supabase para chamadas RPC bem-sucedidas

---

### 4.5 Correção: Transação Atômica de Compra

**Problema**: Moedas deduzidas primeiro, item adicionado depois - não atômico
**Severidade**: 🔴 CRÍTICO
**Impacto**: Perda monetária do usuário se segundo passo falhar

#### Solução: RPC Function Atômica

**SQL Function** (criar no Supabase Dashboard > SQL Editor):

```sql
-- Função para executar compra atomicamente
CREATE OR REPLACE FUNCTION atomic_purchase(
  p_user_id UUID,
  p_item_id INT,
  p_item_price INT,
  p_item_type TEXT
) RETURNS JSON AS $$
DECLARE
  user_coins INT;
  new_balance INT;
BEGIN
  -- Lock da linha do usuário para evitar race conditions
  SELECT coins INTO user_coins
  FROM players
  WHERE id = p_user_id
  FOR UPDATE;

  -- Validar saldo (server-side validation)
  IF user_coins < p_item_price THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Moedas insuficientes'
    );
  END IF;

  -- Deduzir moedas
  UPDATE players
  SET coins = coins - p_item_price
  WHERE id = p_user_id
  RETURNING coins INTO new_balance;

  -- Adicionar item ao inventário
  INSERT INTO player_items (user_id, item_id, item_type, acquired_at)
  VALUES (p_user_id, p_item_id, p_item_type, NOW());

  -- Retornar sucesso com novo saldo
  RETURN json_build_object(
    'success', true,
    'remaining_coins', new_balance,
    'message', 'Item comprado com sucesso!'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automático em caso de erro
    RETURN json_build_object(
      'success', false,
      'error', 'Erro ao processar compra: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Integração Frontend

**Arquivo**: `src/classes/ShopClass.js`

```javascript
// MODIFICAR: método buyItem (completamente refatorado)
async buyItem(itemId, itemType, price) {
    const currentUser = NavigationHelper.getCurrentUser();

    if (!currentUser) {
        alert('Você precisa estar logado para comprar!');
        return { success: false };
    }

    // NOVO: Proteção contra double-submit (correção #6)
    if (this.isPurchasing) {
        console.log('Compra já em andamento...');
        return { success: false };
    }

    this.isPurchasing = true;
    const button = document.querySelector(`[data-item-id="${itemId}"]`);
    if (button) button.disabled = true;

    try {
        // NOVO: Chamar RPC function atômica
        const { data, error } = await supabase
            .rpc('atomic_purchase', {
                p_user_id: currentUser.id,
                p_item_id: itemId,
                p_item_price: price,
                p_item_type: itemType
            });

        if (error) {
            console.error('Erro na compra:', error);
            alert('Erro ao processar compra. Tente novamente.');
            return { success: false };
        }

        // RPC retorna JSON com success/error/remaining_coins
        if (!data.success) {
            alert(data.error);
            return { success: false };
        }

        // Atualizar saldo local
        currentUser.coins = data.remaining_coins;
        NavigationHelper.setCurrentUser(currentUser);

        // Feedback visual
        alert(data.message || 'Item comprado com sucesso!');

        // Recarregar loja para atualizar UI
        if (typeof this.loadShopItems === 'function') {
            await this.loadShopItems();
        }

        return { success: true, remaining_coins: data.remaining_coins };

    } catch (error) {
        console.error('Erro inesperado na compra:', error);
        alert('Erro inesperado. Tente novamente.');
        return { success: false };

    } finally {
        // NOVO: Sempre liberar flag e botão
        this.isPurchasing = false;
        if (button) button.disabled = false;
    }
}

// ADICIONAR: propriedade da classe
constructor() {
    // ... existing code ...
    this.isPurchasing = false;  // NOVO
}
```

#### Testes

- [ ] Comprar item com moedas suficientes → Deve funcionar
- [ ] Verificar no DB que ambas operações foram executadas (coins deduzidos E item adicionado)
- [ ] Simular erro de rede durante compra → Não deve perder moedas (transaction rollback)
- [ ] Tentar comprar com moedas insuficientes → Deve rejeitar com mensagem clara
- [ ] Clicar rapidamente 10x no botão de compra → Apenas 1 compra deve processar
- [ ] Verificar que botão fica desabilitado durante processamento

---

### 4.6 Correção: Proteção contra Double-Submit

**Problema**: Múltiplos cliques causam requisições duplicadas
**Severidade**: 🔴 CRÍTICO (relacionado a #5)
**Impacto**: Compras duplicadas, estado inconsistente

#### Solução

**Já implementado na Correção 4.5** através de:

1. Flag `isPurchasing` na classe
2. Desabilitar botão durante processamento
3. `FOR UPDATE` no SQL (lock de linha)
4. Finally block sempre libera flag e botão

**Adicionalmente, para login/register:**

**Arquivo**: `src/login.js`
```javascript
// ADICIONAR: flag no escopo do módulo
let isLoggingIn = false;

buttonLogin.addEventListener("click", async () => {
    // NOVO: Verificar se já está processando
    if (isLoggingIn) return;
    isLoggingIn = true;
    buttonLogin.disabled = true;

    try {
        const username = usernameInput.value.trim();
        const pin = pinInput.value.trim();

        // ... validações e login ...

    } finally {
        isLoggingIn = false;
        buttonLogin.disabled = false;
    }
});
```

**Arquivo**: `src/register.js`
```javascript
// ADICIONAR: flag no escopo do módulo
let isRegistering = false;

buttonCreate.addEventListener("click", async () => {
    // NOVO: Verificar se já está processando
    if (isRegistering) return;
    isRegistering = true;
    buttonCreate.disabled = true;

    try {
        const username = newUsernameInput.value.trim();
        const pin = newPinInput.value.trim();
        const confirmPin = confirmPinInput.value.trim();

        // ... validações e registro ...

    } finally {
        isRegistering = false;
        buttonCreate.disabled = false;
    }
});
```

#### Testes

- [ ] Clicar rapidamente 10x em "ENTRAR" → Apenas 1 requisição
- [ ] Clicar rapidamente 10x em "CRIAR CONTA" → Apenas 1 requisição
- [ ] Clicar rapidamente 10x em "COMPRAR" → Apenas 1 requisição
- [ ] Verificar que botões ficam desabilitados durante processamento
- [ ] Verificar que não há erros de concorrência no console

---

## 5. Ordem de Implementação

### Sequência Recomendada

1. **Correção #5 (Validação PIN)** - 10 minutos
   - Mudanças simples em HTML e JS
   - Não depende de nada
   - Baixo risco

2. **Correção #2 (Memory Leak)** - 15 minutos
   - Mudança isolada no game.js
   - Não depende de nada
   - Melhora imediata na estabilidade

3. **Correção #6 (Double-Submit Login/Register)** - 15 minutos
   - Mudanças simples em login.js e register.js
   - Não depende de nada
   - Baixo risco

4. **Correção #3 (PIN Hash)** - 45 minutos
   - Adicionar bcrypt CDN
   - Modificar registro e login
   - Implementar migração
   - **REQUER TESTE CUIDADOSO**

5. **Correção #4 (Validação Server-Side)** - 30 minutos
   - Criar RPC function no Supabase
   - Testar RPC manualmente
   - Integrar no frontend

6. **Correção #5 (Transação Atômica + Double-Submit Shop)** - 45 minutos
   - Criar RPC function no Supabase
   - Testar RPC manualmente
   - Refatorar ShopClass.js
   - **REQUER TESTE CUIDADOSO**

### Commits

Cada correção = 1 commit:
1. `fix(auth): add PIN numeric validation`
2. `fix(game): resolve memory leak in game loop`
3. `fix(auth): add double-submit protection for login/register`
4. `fix(auth): implement bcrypt PIN hashing with migration`
5. `fix(shop): add server-side balance validation`
6. `fix(shop): implement atomic purchase transactions`

## 6. Testes e Validação

### Estratégia de Testes

**Por Correção:**
- Cada correção tem sua seção de testes específicos (ver seções 4.1-4.6)

**Testes de Integração:**
- [ ] Fluxo completo: Registrar → Logar → Jogar → Comprar → Verificar saldo
- [ ] Fluxo de migração: Usuário antigo (texto plano) → Login → Verificar hash migrado
- [ ] Fluxo de erro: Tentar comprar sem moedas → Verificar mensagem de erro
- [ ] Fluxo de performance: Jogar 20 vezes seguidas → Verificar sem lentidão

**Testes de Segurança:**
- [ ] Tentar manipular `currentUser.coins` no console → Validação server-side deve bloquear
- [ ] Verificar no Supabase que PINs estão hasheados
- [ ] Verificar que transações são atômicas via logs do Supabase

### Testes Automatizados

**Não há testes automatizados no projeto atualmente.**

Recomendação futura:
- Adicionar Jest para testes unitários
- Adicionar Cypress para testes E2E
- Mas não é escopo desta correção (apenas correção de bugs)

## 7. Rollout e Monitoramento

### Plano de Deploy

**Fase 1: Supabase (Backend)**
1. Criar as 2 RPC functions no Supabase Dashboard > SQL Editor
2. Testar RPC functions manualmente com SQL queries
3. Verificar logs para erros

**Fase 2: Frontend**
1. Deploy das correções incrementalmente (6 commits)
2. Após cada commit, verificar que não quebrou nada
3. Monitorar console de erros no navegador

**Fase 3: Migração de PINs**
1. Esperar usuários fazerem login naturalmente (migração automática)
2. Após 7 dias, verificar % de PINs migrados
3. Após 30 dias, se necessário, rodar script de migração forçada

### Monitoramento

**Métricas para Observar:**
- Taxa de erro em compras (deve ser 0)
- Taxa de erro em login (deve ser baixa, apenas credenciais erradas)
- Performance do jogo (FPS, memória)
- Tempo de resposta das RPC functions

**Logs para Verificar:**
- Console.log de migração de PIN (`🔄 Migrando PIN para hash...`)
- Erros no Supabase Dashboard > Logs
- Erros no browser console

### Rollback Plan

**Se Correção #3 (PIN Hash) falhar:**
- Reverter commits 4
- Usuários novos voltam a usar texto plano
- Usuários migrados continuam funcionando (código aceita ambos)

**Se Correções #4/#5 (RPC) falharem:**
- Reverter commits 5 e 6
- RPC functions permanecem no Supabase (não atrapalham)
- Sistema volta a usar método antigo (não atômico)

**Se Outras correções falharem:**
- Reverter commit específico
- Sem impacto no banco de dados

## 8. Riscos e Mitigações

### Riscos Identificados

**Risco 1: Migração de PIN pode falhar**
- **Probabilidade**: Baixa
- **Impacto**: Alto (usuário não consegue logar)
- **Mitigação**: Sistema aceita ambos (hash e texto plano) indefinidamente

**Risco 2: RPC functions podem ter bugs**
- **Probabilidade**: Média
- **Impacto**: Alto (compras podem falhar)
- **Mitigação**: Testar RPC manualmente antes de integrar no frontend

**Risco 3: Bcrypt pode ser lento no navegador**
- **Probabilidade**: Baixa
- **Impacto**: Médio (login/registro demoram ~100-300ms a mais)
- **Mitigação**: Aceitável, é intencional (dificulta brute force). Adicionar feedback visual.

**Risco 4: Múltiplos game loops ainda podem ocorrer em edge cases**
- **Probabilidade**: Baixa
- **Impacto**: Médio (performance degrada)
- **Mitigação**: Adicionar logs para detectar múltiplos loops, testar exaustivamente

## 9. Critérios de Sucesso

### Correção Bem-Sucedida Se:

1. ✅ Nenhum PIN em texto plano no banco de dados (após 30 dias)
2. ✅ 0 memory leaks detectados em testes de performance
3. ✅ 0 transações não atômicas (verified via logs)
4. ✅ 0 compras bem-sucedidas com saldo insuficiente
5. ✅ 0 registros com PIN não numérico
6. ✅ 0 compras duplicadas por double-click
7. ✅ Todos os testes da seção 6 passando
8. ✅ Taxa de erro < 1% em logins (apenas credenciais erradas)
9. ✅ Taxa de erro = 0% em compras (ou apenas erros de rede legítimos)
10. ✅ Performance do jogo estável após 50 reinícios

## 10. Documentação

### Para Desenvolvedores

**Novo fluxo de autenticação:**
- PINs são hasheados com bcrypt (salt 10) no frontend antes de enviar
- Backend aceita hash ou texto plano (migração)
- Migração automática no primeiro login

**Novo fluxo de compras:**
- Validação server-side obrigatória antes de processar
- Compra é atômica via RPC function
- Double-submit protection obrigatória

### Para Usuários

**Nenhuma mudança visível**, exceto:
- Primeiro login após deploy pode demorar ~200ms a mais (migração de PIN)
- Compras podem demorar ligeiramente mais (validação server-side)

## 11. Próximos Passos

**Após implementação desta correção:**

1. Implementar testes automatizados (Jest + Cypress)
2. Adicionar rate limiting server-side (Supabase Edge Functions)
3. Configurar Row Level Security (RLS) policies no Supabase
4. Adicionar logging estruturado (Sentry ou similar)
5. Implementar sistema de recuperação de PIN (requer email)
6. Corrigir bugs de média e baixa prioridade (21 médios, 7 baixos do relatório)

---

**Documento aprovado para implementação**: ✅ SIM
**Próximo passo**: Invocar `writing-plans` skill para criar plano de implementação detalhado
