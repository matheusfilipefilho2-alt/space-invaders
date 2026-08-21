# Correção de Bugs Críticos - Plano de Implementação

> **Para trabalhadores agênticos:** REQUERIDO SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Corrigir 6 bugs críticos identificados no relatório de verificação (excluindo PIX mock)

**Arquitetura:** Correções incrementais, uma por vez, com commits separados. Ordem: validações simples → memory leak → hash de PIN com migração → RPC functions atômicas

**Tech Stack:** JavaScript vanilla, HTML5, Supabase PostgreSQL, bcrypt.js (CDN)

## Restrições Globais

- Cada correção deve ter seu próprio commit
- Commits devem seguir formato: `fix(scope): description`
- Testar manualmente após cada correção antes de commit
- Sistema PIX permanece como mock (não será corrigido)
- Manter compatibilidade com usuários existentes durante migração de PIN
- RPC functions devem ter SECURITY DEFINER
- Validações server-side são obrigatórias para operações monetárias

---

## Estrutura de Arquivos

**Modificados:**
- `login.html` - adicionar bcrypt CDN, pattern no input PIN
- `register.html` - adicionar bcrypt CDN, pattern nos inputs PIN
- `src/login.js` - validação PIN numérica, hash, migração, double-submit
- `src/register.js` - validação PIN numérica, hash, double-submit
- `src/classes/RankingManager.js` - receber/comparar hash, migração automática
- `src/game.js` - armazenar/cancelar requestAnimationFrame ID
- `src/classes/ShopClass.js` - chamar RPC ao invés de updates diretos, double-submit

**Criados no Supabase:**
- SQL Function: `validate_user_balance(p_user_id, p_required_amount)`
- SQL Function: `atomic_purchase(p_user_id, p_item_id, p_item_price, p_item_type)`

---

### Task 1: Validação Numérica de PIN

**Arquivos:**
- Modify: `login.html:42-47`
- Modify: `register.html:43-55`
- Modify: `src/login.js:19`
- Modify: `src/register.js:20`

**Interfaces:**
- Consumes: Estrutura HTML e JS existentes
- Produces: Validação rigorosa que apenas aceita 4 dígitos numéricos

- [ ] **Passo 1: Adicionar pattern no HTML do login**

Editar `login.html`, encontrar o input de PIN (linha ~42-47):

```html
<input
    type="tel"
    id="pin"
    placeholder="PIN (4 dígitos)"
    maxlength="4"
    pattern="[0-9]{4}"
    inputmode="numeric"
    autocomplete="current-password"
    class="game-input"
/>
```

Mudanças:
- `type="password"` → `type="tel"` (mostra teclado numérico em mobile)
- Adicionar: `pattern="[0-9]{4}"`
- Adicionar: `inputmode="numeric"`

- [ ] **Passo 2: Adicionar pattern no HTML do register**

Editar `register.html`, encontrar os 2 inputs de PIN (linhas ~43-55):

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

Mudanças em ambos os inputs:
- `type="password"` → `type="tel"`
- Adicionar: `pattern="[0-9]{4}"`
- Adicionar: `inputmode="numeric"`

- [ ] **Passo 3: Adicionar validação JavaScript no login**

Editar `src/login.js`, encontrar a validação (~linha 19), adicionar após:

```javascript
if (!username || pin.length !== 4) {
    alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
}

// NOVO: Validação numérica
if (!/^\d{4}$/.test(pin)) {
    alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
    return;
}
```

- [ ] **Passo 4: Adicionar validação JavaScript no register**

Editar `src/register.js`, encontrar a validação (~linha 20), adicionar após:

```javascript
if (!username || pin.length !== 4) {
    alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
    return;
}

// NOVO: Validação numérica
if (!/^\d{4}$/.test(pin)) {
    alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
    return;
}
```

- [ ] **Passo 5: Testar validação**

Testes manuais:
1. Abrir `register.html`
2. Tentar registrar com PIN "abcd" → Deve rejeitar
3. Tentar registrar com PIN "12 3" → Deve rejeitar
4. Tentar registrar com PIN "1234" → Deve aceitar
5. Verificar que teclado numérico aparece em mobile (se disponível)

Esperado: Apenas PINs numéricos de 4 dígitos são aceitos

- [ ] **Passo 6: Commit**

```bash
git add login.html register.html src/login.js src/register.js
git commit -m "fix(auth): add PIN numeric validation

- Add HTML pattern [0-9]{4} to prevent non-numeric input
- Add JavaScript regex validation /^\d{4}$/ for PIN
- Change input type to 'tel' for mobile numeric keyboard
- Add inputmode='numeric' for better UX on mobile

Fixes critical bug where users could register with non-numeric PINs
and then fail to login."
```

---

### Task 2: Corrigir Memory Leak no Game Loop

**Arquivos:**
- Modify: `src/game.js` (adicionar variável global e modificar funções)

**Interfaces:**
- Consumes: game loop existente com `requestAnimationFrame(gameLoop)`
- Produces: game loop com ID armazenado e cancelamento adequado

- [ ] **Passo 1: Adicionar variável global para armazenar ID**

Editar `src/game.js`, no topo do arquivo (após outras variáveis globais, antes de qualquer função):

```javascript
// Variável para controlar o game loop e prevenir memory leaks
let gameLoopId = null;
```

Encontrar onde já existem variáveis globais (tipo `let score = 0;`, `let player;`, etc) e adicionar esta nova variável ali.

- [ ] **Passo 2: Modificar função gameLoop para armazenar ID**

Encontrar a função `gameLoop()` (aproximadamente linha 1195). No final da função, onde tem:

```javascript
requestAnimationFrame(gameLoop);
```

Substituir por:

```javascript
gameLoopId = requestAnimationFrame(gameLoop);
```

- [ ] **Passo 3: Cancelar loop anterior na função startGame**

Encontrar a função `startGame()` (aproximadamente linha 1305). No INÍCIO da função, antes de qualquer outro código, adicionar:

```javascript
function startGame() {
    // Cancelar loop anterior se existir (previne memory leak)
    if (gameLoopId !== null) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }

    // ... resto do código existente da função ...
```

- [ ] **Passo 4: Cancelar loop na função endGame**

Encontrar a função `endGame()`. No INÍCIO da função, antes de qualquer outro código, adicionar:

```javascript
function endGame() {
    // Cancelar game loop (previne memory leak)
    if (gameLoopId !== null) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }

    // ... resto do código existente da função ...
```

- [ ] **Passo 5: Testar correção de memory leak**

Testes manuais:
1. Abrir `game.html`
2. Jogar até Game Over
3. Clicar em "Play Again"
4. Repetir 10 vezes
5. Abrir DevTools > Performance > Memória
6. Verificar que memória não cresce infinitamente

Esperado: Memória estável, sem crescimento contínuo após múltiplos reinícios

- [ ] **Passo 6: Commit**

```bash
git add src/game.js
git commit -m "fix(game): resolve memory leak in game loop

- Store requestAnimationFrame ID in gameLoopId variable
- Cancel previous loop with cancelAnimationFrame in startGame
- Cancel loop in endGame to prevent accumulation
- Add null check before canceling

Fixes critical bug where multiple game loops accumulated on each
restart, causing performance degradation and eventual browser crash."
```

---

### Task 3: Proteção contra Double-Submit em Login/Register

**Arquivos:**
- Modify: `src/login.js`
- Modify: `src/register.js`

**Interfaces:**
- Consumes: event listeners existentes de click
- Produces: proteção contra múltiplos cliques com flag + botão desabilitado

- [ ] **Passo 1: Adicionar flag no login.js**

Editar `src/login.js`, no topo do arquivo (após imports, antes dos elementos):

```javascript
// Flag para prevenir double-submit
let isLoggingIn = false;
```

- [ ] **Passo 2: Proteger event listener do login**

Encontrar o event listener `buttonLogin.addEventListener("click", async () => {` (~linha 15).

Substituir todo o conteúdo por:

```javascript
buttonLogin.addEventListener("click", async () => {
    // Prevenir double-submit
    if (isLoggingIn) {
        console.log('Login já em andamento...');
        return;
    }

    isLoggingIn = true;
    buttonLogin.disabled = true;

    try {
        const username = usernameInput.value.trim();
        const pin = pinInput.value.trim();

        if (!username || pin.length !== 4) {
            alert("Nome de usuário e PIN de 4 dígitos são obrigatórios!");
            return;
        }

        // Validação numérica (Task 1)
        if (!/^\d{4}$/.test(pin)) {
            alert("PIN deve conter apenas 4 dígitos numéricos (0-9)!");
            return;
        }

        const result = await rankingManager.login(username, pin);
        console.log(result.user);

        if (result.success) {
            NavigationHelper.setCurrentUser(result.user);
            NavigationHelper.goTo('ranking.html');
        } else {
            alert(result.error);
        }
    } finally {
        isLoggingIn = false;
        buttonLogin.disabled = false;
    }
});
```

Mudanças:
- Adicionar check `if (isLoggingIn) return;`
- Setar flags no início
- Envolver tudo em `try/finally`
- Resetar flags no `finally`

- [ ] **Passo 3: Adicionar flag no register.js**

Editar `src/register.js`, no topo do arquivo (após imports):

```javascript
// Flag para prevenir double-submit
let isRegistering = false;
```

- [ ] **Passo 4: Proteger event listener do register**

Encontrar o event listener `buttonCreate.addEventListener("click", async () => {` (~linha 15).

Substituir todo o conteúdo por:

```javascript
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

        const result = await rankingManager.register(username, pin);

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
```

- [ ] **Passo 5: Testar proteção**

Testes manuais:
1. Abrir `login.html`
2. Preencher credenciais
3. Clicar rapidamente 10 vezes em "ENTRAR"
4. Verificar no Network tab (DevTools) que apenas 1 requisição foi enviada
5. Verificar que botão fica desabilitado durante processamento
6. Repetir para `register.html`

Esperado: Apenas 1 requisição por click, botão desabilitado durante processamento

- [ ] **Passo 6: Commit**

```bash
git add src/login.js src/register.js
git commit -m "fix(auth): add double-submit protection for login/register

- Add isLoggingIn and isRegistering flags
- Disable buttons during async operations
- Wrap operations in try/finally to always reset state
- Prevent multiple simultaneous requests

Fixes bug where rapid clicking caused duplicate requests and potential
race conditions in authentication."
```

---

### Task 4: Implementar Hash de PIN com Bcrypt

**Arquivos:**
- Modify: `login.html` (adicionar bcrypt CDN)
- Modify: `register.html` (adicionar bcrypt CDN)
- Modify: `src/register.js` (hash PIN antes de enviar)
- Modify: `src/login.js` (usar novo fluxo de login)
- Modify: `src/classes/RankingManager.js` (aceitar hash, comparar, migrar)

**Interfaces:**
- Consumes: bcrypt.js global (window.bcrypt)
- Produces: PINs hasheados no DB, migração automática de usuários antigos

- [ ] **Passo 1: Adicionar bcrypt CDN no login.html**

Editar `login.html`, encontrar a tag `<head>`, adicionar ANTES do `<script type="module" src="src/login.js"></script>`:

```html
<!-- Bcrypt para hash de PIN -->
<script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>
```

- [ ] **Passo 2: Adicionar bcrypt CDN no register.html**

Editar `register.html`, encontrar a tag `<head>`, adicionar ANTES do `<script type="module" src="src/register.js"></script>`:

```html
<!-- Bcrypt para hash de PIN -->
<script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>
```

- [ ] **Passo 3: Modificar register.js para hashear PIN**

Editar `src/register.js`, dentro do try block do event listener, ANTES de chamar `rankingManager.register()`:

Encontrar:

```javascript
const result = await rankingManager.register(username, pin);
```

Substituir por:

```javascript
// Hash do PIN antes de enviar (bcrypt salt 10)
console.log('🔐 Hasheando PIN...');
const hashedPin = bcrypt.hashSync(pin, 10);
console.log('✅ PIN hasheado com sucesso');

const result = await rankingManager.register(username, hashedPin);
```

IMPORTANTE: Agora estamos enviando `hashedPin` ao invés de `pin`

- [ ] **Passo 4: Modificar RankingManager.register para aceitar hash**

Editar `src/classes/RankingManager.js`, encontrar o método `register` (~linha 10).

Modificar a assinatura:

```javascript
async register(username, hashedPin) {  // MUDANÇA: parâmetro agora é hashedPin
```

E no insert, garantir que está usando o parâmetro correto:

```javascript
.insert([
    {
        username: username,
        pin: hashedPin,  // MUDANÇA: usa hashedPin
        high_score: 0,
        coins: 0,
        level_id: 1,
        total_games: 0,
        created_at: new Date().toISOString(),
    },
])
```

- [ ] **Passo 5: Modificar RankingManager.login para aceitar ambos (hash e texto plano)**

Editar `src/classes/RankingManager.js`, encontrar o método `login` (~linha 49).

Substituir TODO o método por:

```javascript
async login(username, pin) {  // Recebe PIN plano (não hash)
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

        // Detectar se PIN é hash ou texto plano
        const isHash = storedPin.startsWith('$2a$') || storedPin.startsWith('$2b$');

        let authenticated = false;

        if (isHash) {
            // Novo sistema: comparar com bcrypt
            console.log('🔐 Verificando PIN hasheado...');
            authenticated = bcrypt.compareSync(pin, storedPin);
        } else {
            // Sistema legado: comparação direta (texto plano)
            console.log('⚠️ PIN em texto plano detectado (legado)');
            authenticated = (pin === storedPin);

            // Migrar para hash automaticamente se login for bem-sucedido
            if (authenticated) {
                console.log('🔄 Migrando PIN para hash...');
                const hashedPin = bcrypt.hashSync(pin, 10);

                // Atualizar PIN para hash no banco
                const { error: updateError } = await supabase
                    .from("players")
                    .update({ pin: hashedPin })
                    .eq("id", user.id);

                if (updateError) {
                    console.error('❌ Erro ao migrar PIN:', updateError);
                } else {
                    console.log('✅ PIN migrado com sucesso');
                }
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

- [ ] **Passo 6: Testar hash de PIN**

Testes manuais:

**Teste 1 - Novo usuário:**
1. Abrir `register.html`
2. Registrar novo usuário "testuser1" com PIN "1234"
3. Verificar console: deve mostrar "🔐 Hasheando PIN..." e "✅ PIN hasheado"
4. Abrir Supabase Dashboard > Table Editor > players
5. Verificar que PIN de "testuser1" começa com `$2a$` ou `$2b$`
6. Fazer login com "testuser1" / "1234" → deve funcionar

**Teste 2 - Migração automática:**
1. No Supabase, criar usuário manual com PIN texto plano:
   ```sql
   INSERT INTO players (username, pin, coins, level_id, total_games)
   VALUES ('legacyuser', '5678', 0, 1, 0);
   ```
2. Fazer login com "legacyuser" / "5678"
3. Verificar console: deve mostrar "⚠️ PIN em texto plano detectado" e "🔄 Migrando PIN"
4. Verificar no Supabase que PIN de "legacyuser" agora é hash
5. Fazer logout e login novamente → deve funcionar com hash

**Teste 3 - PIN incorreto:**
1. Tentar login com PIN errado → deve rejeitar
2. Tentar login com usuário inexistente → deve rejeitar

Esperado: Novos PINs hasheados, migração automática funciona, sistema aceita ambos

- [ ] **Passo 7: Commit**

```bash
git add login.html register.html src/register.js src/classes/RankingManager.js
git commit -m "fix(auth): implement bcrypt PIN hashing with migration

- Add bcryptjs CDN to login and register pages
- Hash PIN with bcrypt (salt 10) before storing in database
- Modify RankingManager to accept hashed PIN in register
- Implement dual-mode login: bcrypt compare for hashed PINs, direct
  comparison for legacy plaintext PINs
- Auto-migrate plaintext PINs to hashed on first login
- Add console logs for visibility during migration

Fixes critical security bug where PINs were stored in plaintext.
Migration is automatic and transparent to users."
```

---

### Task 5: Criar RPC Function para Validação Server-Side

**Arquivos:**
- Create: SQL function no Supabase (via Dashboard)
- Modify: `src/classes/ShopClass.js` (adicionar método validateBalance)

**Interfaces:**
- Consumes: Supabase client
- Produces: RPC function `validate_user_balance(p_user_id UUID, p_required_amount INT) RETURNS BOOLEAN`

- [ ] **Passo 1: Criar RPC function no Supabase**

1. Abrir Supabase Dashboard
2. Ir em: SQL Editor (na sidebar esquerda)
3. Clicar em "New Query"
4. Colar o seguinte SQL:

```sql
-- Função para validar se usuário tem moedas suficientes
-- Usada para prevenir manipulação client-side de saldos
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

5. Clicar em "Run" (ou Ctrl+Enter)
6. Verificar mensagem de sucesso

- [ ] **Passo 2: Testar RPC function manualmente**

No mesmo SQL Editor do Supabase, executar teste:

```sql
-- Teste: verificar se função foi criada
SELECT proname, proargtypes, prorettype
FROM pg_proc
WHERE proname = 'validate_user_balance';

-- Deve retornar 1 linha mostrando a função

-- Teste: chamar função com um user_id real
-- (substitua USER_ID_AQUI por um UUID real da tabela players)
SELECT validate_user_balance('USER_ID_AQUI'::UUID, 100);

-- Deve retornar true ou false dependendo do saldo do usuário
```

Esperado: Função criada e teste manual funciona

- [ ] **Passo 3: Adicionar método validateBalance no ShopClass**

Editar `src/classes/ShopClass.js`, adicionar novo método (pode ser após o construtor ou antes de outros métodos):

```javascript
/**
 * Valida se usuário tem saldo suficiente via RPC server-side
 * @param {string} userId - UUID do usuário
 * @param {number} requiredAmount - Quantidade de moedas necessárias
 * @returns {Promise<boolean>} - true se tem saldo suficiente
 */
async validateBalance(userId, requiredAmount) {
    try {
        const { data, error } = await supabase
            .rpc('validate_user_balance', {
                p_user_id: userId,
                p_required_amount: requiredAmount
            });

        if (error) {
            console.error('❌ Erro ao validar saldo server-side:', error);
            return false;
        }

        console.log('✅ Validação server-side:', data ? 'Saldo OK' : 'Saldo insuficiente');
        return data; // boolean
    } catch (error) {
        console.error('❌ Erro inesperado na validação:', error);
        return false;
    }
}
```

- [ ] **Passo 4: Integrar validação em método de compra existente**

Editar `src/classes/ShopClass.js`, encontrar o método que processa compras (pode ser `handleBuy`, `buyItem`, ou similar).

ANTES do código que atualiza moedas, adicionar:

```javascript
// Validação server-side obrigatória (previne manipulação client-side)
const hasBalance = await this.validateBalance(currentUser.id, price);

if (!hasBalance) {
    alert('Moedas insuficientes! (Validação servidor)');
    return { success: false, error: 'Saldo insuficiente' };
}

console.log('✅ Validação server-side passou, prosseguindo com compra...');
```

- [ ] **Passo 5: Testar validação server-side**

Testes manuais:

**Teste 1 - Validação legítima:**
1. Logar no jogo
2. Verificar saldo de moedas
3. Tentar comprar item com preço menor que saldo
4. Verificar console: deve mostrar "✅ Validação server-side: Saldo OK"
5. Compra deve prosseguir

**Teste 2 - Manipulação bloqueada:**
1. Abrir DevTools > Console
2. Executar: `const user = NavigationHelper.getCurrentUser(); user.coins = 999999;`
3. Tentar comprar item caro
4. Verificar console: deve mostrar "✅ Validação server-side: Saldo insuficiente"
5. Compra deve ser bloqueada com alert

Esperado: Validação server-side sempre prevalece sobre valores client-side

- [ ] **Passo 6: Commit**

```bash
git add src/classes/ShopClass.js
git commit -m "fix(shop): add server-side balance validation

- Create Supabase RPC function validate_user_balance
- Add validateBalance method to ShopClass
- Integrate server-side validation before purchases
- Prevent client-side manipulation of coin balance

Fixes critical security bug where users could manipulate their coin
balance via DevTools to purchase items without sufficient funds."
```

---

### Task 6: Criar RPC Function para Transação Atômica de Compra

**Arquivos:**
- Create: SQL function no Supabase (via Dashboard)
- Modify: `src/classes/ShopClass.js` (refatorar método de compra, adicionar double-submit protection)

**Interfaces:**
- Consumes: Supabase client, RPC function `atomic_purchase`
- Produces: Compras atômicas que nunca perdem moedas, proteção contra double-submit

- [ ] **Passo 1: Criar RPC function atômica no Supabase**

1. Abrir Supabase Dashboard > SQL Editor
2. Clicar em "New Query"
3. Colar o seguinte SQL:

```sql
-- Função para executar compra atomicamente
-- Garante que moedas nunca são perdidas: ambas operações ou nenhuma
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

4. Clicar em "Run"
5. Verificar mensagem de sucesso

- [ ] **Passo 2: Testar RPC function manualmente**

No SQL Editor do Supabase:

```sql
-- Teste: verificar se função foi criada
SELECT proname FROM pg_proc WHERE proname = 'atomic_purchase';

-- Teste: simular compra (substitua USER_ID por UUID real)
SELECT atomic_purchase(
  'USER_ID_AQUI'::UUID,
  1,        -- item_id
  10,       -- price
  'skin'    -- item_type
);

-- Deve retornar JSON: {"success": true/false, ...}
```

Esperado: Função criada e retorna JSON válido

- [ ] **Passo 3: Adicionar flag isPurchasing no ShopClass**

Editar `src/classes/ShopClass.js`, encontrar o construtor e adicionar:

```javascript
constructor() {
    // ... código existente ...
    this.isPurchasing = false;  // Flag para prevenir double-submit
}
```

- [ ] **Passo 4: Refatorar método de compra para usar RPC atômico**

Editar `src/classes/ShopClass.js`, encontrar o método que processa compras (ex: `buyItem`).

Substituir TODO o método por:

```javascript
async buyItem(itemId, itemType, price) {
    const currentUser = NavigationHelper.getCurrentUser();

    if (!currentUser) {
        alert('Você precisa estar logado para comprar!');
        return { success: false };
    }

    // Proteção contra double-submit
    if (this.isPurchasing) {
        console.log('⏳ Compra já em andamento...');
        return { success: false };
    }

    this.isPurchasing = true;

    // Desabilitar botão se existir
    const button = document.querySelector(`[data-item-id="${itemId}"]`);
    if (button) button.disabled = true;

    try {
        console.log('🛒 Processando compra atômica via RPC...');

        // Chamar RPC function atômica
        const { data, error } = await supabase
            .rpc('atomic_purchase', {
                p_user_id: currentUser.id,
                p_item_id: itemId,
                p_item_price: price,
                p_item_type: itemType
            });

        if (error) {
            console.error('❌ Erro na compra:', error);
            alert('Erro ao processar compra. Tente novamente.');
            return { success: false };
        }

        // RPC retorna JSON com success/error/remaining_coins
        if (!data.success) {
            alert(data.error);
            return { success: false };
        }

        console.log('✅ Compra bem-sucedida! Saldo restante:', data.remaining_coins);

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
        console.error('❌ Erro inesperado na compra:', error);
        alert('Erro inesperado. Tente novamente.');
        return { success: false };

    } finally {
        // SEMPRE liberar flag e botão
        this.isPurchasing = false;
        if (button) button.disabled = false;
    }
}
```

- [ ] **Passo 5: Testar transação atômica**

Testes manuais:

**Teste 1 - Compra normal:**
1. Logar e ir para a loja
2. Comprar item com moedas suficientes
3. Verificar console: "🛒 Processando compra atômica" e "✅ Compra bem-sucedida"
4. Verificar no Supabase:
   - Tabela `players`: moedas deduzidas
   - Tabela `player_items`: item adicionado
5. Verificar que saldo atualizado na UI

**Teste 2 - Saldo insuficiente:**
1. Tentar comprar item caro sem moedas suficientes
2. Deve rejeitar com alert "Moedas insuficientes"
3. Verificar no Supabase: nenhuma mudança

**Teste 3 - Double-submit:**
1. Comprar item
2. Clicar rapidamente 10 vezes no botão antes de completar
3. Verificar console: apenas 1 "🛒 Processando compra" e outros "⏳ Compra já em andamento"
4. Verificar no Supabase: apenas 1 item comprado

**Teste 4 - Atomicidade (edge case):**
Se possível, simular erro de rede durante compra (DevTools > Network > Offline após clicar)
- Verificar que AMBAS operações falharam ou AMBAS sucederam (nunca só uma)

Esperado: Compras são atômicas, double-submit bloqueado, nenhuma perda de moedas

- [ ] **Passo 6: Commit**

```bash
git add src/classes/ShopClass.js
git commit -m "fix(shop): implement atomic purchase transactions

- Create Supabase RPC function atomic_purchase with FOR UPDATE lock
- Refactor buyItem to use atomic RPC instead of separate operations
- Add isPurchasing flag to prevent double-submit
- Add try/finally to always reset state and re-enable button
- Update local coin balance after successful purchase

Fixes critical bug where coins could be deducted without item being
added to inventory. Now both operations are atomic: either both
succeed or both fail, preventing monetary loss."
```

---

## Self-Review do Plano

### 1. Cobertura do Spec

✅ **Bug #1 (PIN texto plano)** - Task 4 completa
✅ **Bug #2 (Memory leak)** - Task 2 completa
✅ **Bug #3 (Transação não atômica)** - Task 6 completa
✅ **Bug #4 (Validação frontend)** - Task 5 completa
✅ **Bug #5 (PIN não validado)** - Task 1 completa
✅ **Bug #6 (Moedas sem item)** - Coberto por Task 6 (mesmo bug que #3)

Todas as 6 correções estão cobertas por tasks específicas.

### 2. Scan de Placeholders

✅ Nenhum TBD, TODO, ou "implement later" encontrado
✅ Todos os passos têm código completo
✅ Todos os comandos têm output esperado
✅ Todos os testes têm passos detalhados

### 3. Consistência de Tipos

✅ `hashedPin` usado consistentemente em Task 4
✅ `isPurchasing` usado consistentemente em Tasks 3 e 6
✅ `gameLoopId` usado consistentemente em Task 2
✅ Assinaturas de RPC functions consistentes entre SQL e JavaScript

---

## Ordem de Execução

**Dependências:**
- Tasks 1, 2, 3: Independentes (podem ser feitas em qualquer ordem)
- Task 4: Depende de Task 3 (usa try/finally de double-submit)
- Task 5: Independente de outras
- Task 6: Usa padrão de Task 3 (double-submit protection)

**Ordem recomendada (do plano):**
1. Task 1 - Validação PIN (simples, sem dependências)
2. Task 2 - Memory leak (simples, sem dependências)
3. Task 3 - Double-submit (estabelece padrão)
4. Task 4 - Hash PIN (usa padrão de Task 3, mais complexo)
5. Task 5 - RPC validação (prepara infraestrutura)
6. Task 6 - RPC atômico (usa tudo: double-submit + RPC)

**Total:** 6 tasks, 6 commits

---

## Resumo Final

- 6 bugs críticos corrigidos
- 6 commits separados e testáveis
- Sistema mantém compatibilidade com dados existentes
- Migração de PIN automática e transparente
- Transações atômicas impedem perda de moedas
- Validações server-side impedem manipulação
- Memory leak eliminado
- Double-submit bloqueado em todos os pontos críticos

**Estimativa de complexidade:** Médio (requer acesso ao Supabase Dashboard para criar RPC functions)
