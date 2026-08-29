# Order History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "📦 Meus Pedidos" tab to the shop where users can view their PIX order history, check payment status, and reopen QR codes for pending orders.

**Architecture:** Single file modification (ShopView.vue) with new tab, orders list, and helper functions. Reuses existing PIX modal and polling mechanism. No backend changes needed.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vite, Axios

## Global Constraints

- Vue 3 Composition API with `<script setup>` syntax
- TypeScript with `any` types for rapid development (existing pattern)
- Reuse existing modal and polling logic (no duplication)
- Follow existing tab pattern in ShopView.vue
- Brazilian Portuguese for all user-facing text
- Press Start 2P font for buttons (existing pattern)
- Status colors: PENDING=#FFD700, COMPLETED=#00ff88, EXPIRED=#FF6B6B, CANCELLED=#888888

---

### Task 1: Add Orders State and Tab Button

**Files:**
- Modify: `frontend/src/views/ShopView.vue:250` (state section)
- Modify: `frontend/src/views/ShopView.vue:37` (tabs section)

**Interfaces:**
- Consumes: None (starting point)
- Produces:
  - `orders: ref<any[]>` - stores loaded orders
  - `ordersLoading: ref<boolean>` - loading state
  - `ordersPage: ref<number>` - pagination offset
  - `hasMoreOrders: ref<boolean>` - whether more orders exist
  - Tab button that sets `activeTab = 'orders'`

- [ ] **Step 1: Add orders state variables**

Find the PIX Modal state section (around line 250, after `const pixCodeInput = ref<HTMLInputElement | null>(null)`).

Add these state variables:

```typescript
// Orders state
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const ordersPage = ref(0)
const hasMoreOrders = ref(true)
```

- [ ] **Step 2: Add orders tab button**

Find the shop categories section (around line 25-38) where "Todos os Itens" and "Meu Inventário" tabs are defined.

After the "Meu Inventário" button, add:

```vue
<button
  @click="activeTab = 'orders'"
  :class="['category-btn', { active: activeTab === 'orders' }]"
>
  📦 Meus Pedidos
</button>
```

- [ ] **Step 3: Verify tab switching works**

Run: `npm run dev` in frontend directory
Open: http://localhost:5173
Navigate to shop, click "📦 Meus Pedidos" tab
Expected: Tab highlights, but shows "Todos os Itens" content (we haven't added orders section yet)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add orders tab button and state"
```

---

### Task 2: Add Helper Formatting Functions

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (script section, after existing functions)

**Interfaces:**
- Consumes: None (pure functions)
- Produces:
  - `getPackageName(packageId: string): string` - maps package ID to display name
  - `formatOrderDate(dateString: string): string` - formats to "DD/MM/YYYY às HH:MM"
  - `formatTime(dateString: string): string` - formats to "HH:MM"
  - `formatPrice(cents: number): string` - formats to "R$ X,XX"
  - `getStatusIcon(status: string): string` - returns emoji for status
  - `getStatusLabel(status: string): string` - returns localized status text

- [ ] **Step 1: Add helper functions after existing functions**

Find the end of the script section (before the closing `</script>` tag), after the last function definition.

Add these six helper functions:

```typescript
// Order helper functions
function getPackageName(packageId: string): string {
  const packages: Record<string, string> = {
    'coin_pack_199': 'Pacote de 199 Moedas',
    'coin_pack_499': 'Pacote de 499 Moedas',
    'coin_pack_999': 'Pacote de 999 Moedas'
  }
  return packages[packageId] || packageId
}

function formatOrderDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR') + ' às ' +
         date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    'PENDING': '🟡',
    'COMPLETED': '✅',
    'EXPIRED': '⏰',
    'CANCELLED': '❌'
  }
  return icons[status] || '❓'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'PENDING': 'PENDENTE',
    'COMPLETED': 'PAGO',
    'EXPIRED': 'EXPIRADO',
    'CANCELLED': 'CANCELADO'
  }
  return labels[status] || status
}
```

- [ ] **Step 2: Verify functions compile without errors**

Run: The Vite dev server should auto-reload
Expected: No TypeScript errors in terminal or browser console

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add order formatting helper functions"
```

---

### Task 3: Add loadOrders and loadMoreOrders Functions

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (script section, after helper functions)

**Interfaces:**
- Consumes:
  - `shopAPI.getOrders(limit: number, offset: number)` - from api.ts
  - `showResult(title: string, message: string)` - existing function in ShopView
  - State: `orders`, `ordersLoading`, `ordersPage`, `hasMoreOrders`
- Produces:
  - `loadOrders(): Promise<void>` - loads initial orders (limit=10, offset=0)
  - `loadMoreOrders(): Promise<void>` - loads next page and appends to orders array

- [ ] **Step 1: Add loadOrders function**

After the helper functions from Task 2, add:

```typescript
// Load orders from API
async function loadOrders() {
  try {
    ordersLoading.value = true
    const response = await shopAPI.getOrders(10, 0)
    orders.value = response.data.data
    ordersPage.value = 0
    hasMoreOrders.value = response.data.data.length === 10
  } catch (err) {
    console.error('Failed to load orders:', err)
    showResult('Erro', 'Falha ao carregar pedidos. Tente novamente.')
  } finally {
    ordersLoading.value = false
  }
}
```

- [ ] **Step 2: Add loadMoreOrders function**

After `loadOrders`, add:

```typescript
// Load more orders (pagination)
async function loadMoreOrders() {
  try {
    ordersLoading.value = true
    const nextPage = ordersPage.value + 10
    const response = await shopAPI.getOrders(10, nextPage)
    const newOrders = response.data.data

    orders.value = [...orders.value, ...newOrders]
    ordersPage.value = nextPage
    hasMoreOrders.value = newOrders.length === 10
  } catch (err) {
    console.error('Failed to load more orders:', err)
  } finally {
    ordersLoading.value = false
  }
}
```

- [ ] **Step 3: Verify functions compile**

Expected: No TypeScript errors, Vite dev server reloads successfully

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add orders loading and pagination functions"
```

---

### Task 4: Add reopenPixModal Function

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (script section, after loadMoreOrders)

**Interfaces:**
- Consumes:
  - `getPackageName(packageId: string): string` - from Task 2
  - `formatPrice(cents: number): string` - from Task 2
  - `calculateExpiresIn(expiresAt: string): string` - existing function in ShopView
  - `showResult(title: string, message: string)` - existing function
  - State: `pixOrder`, `currentOrderId`, `paymentStatus`, `showPixModal`
  - `startPollingPaymentStatus()` - existing function
- Produces:
  - `reopenPixModal(order: any): void` - opens PIX modal with existing order data

- [ ] **Step 1: Add reopenPixModal function**

After `loadMoreOrders`, add:

```typescript
// Reopen PIX modal with existing order
function reopenPixModal(order: any) {
  // Check if expired
  if (new Date(order.expiresAt) < new Date()) {
    showResult('Pedido Expirado', 'Este pedido expirou. Crie um novo pedido.')
    order.status = 'EXPIRED'
    return
  }

  // Populate modal
  pixOrder.value = {
    name: getPackageName(order.packageId),
    description: `Pedido #${order.id}`,
    pixCode: order.pixCode,
    qrCodeUrl: order.qrCodeUrl,
    paymentUrl: order.paymentUrl,
    priceDisplay: formatPrice(order.amount),
    expiresIn: calculateExpiresIn(order.expiresAt)
  }

  // Set up polling
  currentOrderId.value = order.id
  paymentStatus.value = 'PENDING'
  showPixModal.value = true
  startPollingPaymentStatus()
}
```

- [ ] **Step 2: Verify function compiles**

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add function to reopen PIX modal for existing orders"
```

---

### Task 5: Add Watcher for Lazy Loading Orders

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (script section, after reopenPixModal)

**Interfaces:**
- Consumes:
  - `activeTab` - reactive state from ShopView
  - `orders` - reactive state from Task 1
  - `loadOrders()` - function from Task 3
  - `watch` - from Vue (already imported)
- Produces:
  - Watcher that calls `loadOrders()` when switching to orders tab

- [ ] **Step 1: Add watcher for lazy loading**

After `reopenPixModal`, add:

```typescript
// Watch activeTab and load orders when switching to orders tab
watch(activeTab, (newTab) => {
  if (newTab === 'orders' && orders.value.length === 0) {
    loadOrders()
  }
})
```

- [ ] **Step 2: Verify watcher compiles**

Expected: No TypeScript errors

- [ ] **Step 3: Test lazy loading behavior**

Run: Navigate to shop, click "📦 Meus Pedidos" tab
Open browser console
Expected: Should see "Failed to load orders:" error (we haven't added the UI yet, but API call happens)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add watcher to lazy load orders"
```

---

### Task 6: Update checkPaymentStatus to Reload Orders

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (script section, inside existing checkPaymentStatus function)

**Interfaces:**
- Consumes:
  - `checkPaymentStatus()` - existing function in ShopView
  - `activeTab` - reactive state
  - `loadOrders()` - function from Task 3
- Produces:
  - Modified `checkPaymentStatus()` that reloads orders list when payment completed

- [ ] **Step 1: Find checkPaymentStatus function**

Search for `async function checkPaymentStatus()` in ShopView.vue (around line 380-420).

Find the section that handles `if (order.status === 'COMPLETED')`.

- [ ] **Step 2: Add orders reload after payment confirmation**

Inside the `if (order.status === 'COMPLETED')` block, after the existing code that closes modal and shows success, add:

```typescript
      // Reload orders list if on orders tab
      if (activeTab.value === 'orders') {
        await loadOrders()
      }
```

The complete block should look like:

```typescript
    if (order.status === 'COMPLETED') {
      // Payment confirmed!
      stopPollingPaymentStatus()
      paymentStatus.value = 'COMPLETED'

      // Update player balance
      await authStore.fetchProfile()

      // Close modal and show success
      closePixModal()
      showResult('Pagamento Confirmado! 🎉', `${order.goldAmount} Gold foi creditado na sua conta!`)

      // Reload items to update balance display
      await loadItems()

      // Reload orders list if on orders tab
      if (activeTab.value === 'orders') {
        await loadOrders()
      }
    }
```

- [ ] **Step 3: Verify modification compiles**

Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): reload orders after payment confirmation"
```

---

### Task 7: Add Orders Section Template

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (template section, after inventory section)

**Interfaces:**
- Consumes:
  - All functions from Tasks 2-4: `getPackageName`, `formatOrderDate`, `formatTime`, `formatPrice`, `getStatusIcon`, `getStatusLabel`, `reopenPixModal`, `loadMoreOrders`
  - `calculateExpiresIn` - existing function in ShopView
  - State: `orders`, `ordersLoading`, `hasMoreOrders`, `activeTab`
- Produces:
  - Complete orders section UI with loading, empty state, orders list, and pagination

- [ ] **Step 1: Find inventory section end**

Search for `<div v-else-if="activeTab === 'inventory'" class="inventory-section">` in the template.

Find the closing `</div>` for this section (around line 140).

- [ ] **Step 2: Add orders section after inventory section**

After the inventory section's closing `</div>`, add:

```vue
    <!-- Orders Section -->
    <div v-else-if="activeTab === 'orders'" class="orders-section">
      <h2 class="section-title">📦 MEUS PEDIDOS</h2>

      <!-- Loading state -->
      <div v-if="ordersLoading && orders.length === 0" class="loading">
        Carregando pedidos...
      </div>

      <!-- Empty state -->
      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>Nenhum pedido encontrado</p>
        <p class="empty-hint">Compre pacotes de moedas na aba "🛍️ Todos os Itens"</p>
      </div>

      <!-- Orders list -->
      <div v-else class="orders-list">
        <div v-for="order in orders" :key="order.id"
             class="order-card"
             :class="`order-${order.status.toLowerCase()}`">

          <!-- Status badge -->
          <div class="order-status-badge">
            {{ getStatusIcon(order.status) }} {{ getStatusLabel(order.status) }}
          </div>

          <!-- Order info -->
          <div class="order-number">#{{ order.id }}</div>
          <h3 class="order-package">{{ getPackageName(order.packageId) }}</h3>
          <div class="order-amount">
            💵 {{ formatPrice(order.amount) }} • 🪙 {{ order.goldAmount }} Gold
          </div>
          <div class="order-date">{{ formatOrderDate(order.createdAt) }}</div>

          <!-- Status-specific info -->
          <div class="order-info">
            <span v-if="order.status === 'PENDING'">
              Expira em: {{ calculateExpiresIn(order.expiresAt) }}
            </span>
            <span v-else-if="order.status === 'COMPLETED'">
              Pago às {{ formatTime(order.completedAt) }}
            </span>
            <span v-else-if="order.status === 'EXPIRED'">
              Expirou às {{ formatTime(order.expiresAt) }}
            </span>
          </div>

          <!-- Actions (PENDING only) -->
          <div v-if="order.status === 'PENDING'" class="order-actions">
            <button @click="reopenPixModal(order)" class="order-btn primary">
              Ver QR Code
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <button v-if="hasMoreOrders"
                @click="loadMoreOrders"
                :disabled="ordersLoading"
                class="load-more-btn">
          {{ ordersLoading ? 'Carregando...' : 'Carregar Mais' }}
        </button>
      </div>
    </div>
```

- [ ] **Step 3: Verify template compiles**

Expected: No Vue template errors, page loads without errors

- [ ] **Step 4: Test orders tab (will have no styling yet)**

Navigate to shop, click "📦 Meus Pedidos"
Expected: Shows "Carregando pedidos..." briefly, then shows empty state or orders (if you have orders from previous tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add orders section template"
```

---

### Task 8: Add Orders Section CSS Styles

**Files:**
- Modify: `frontend/src/views/ShopView.vue` (style section, at the end)

**Interfaces:**
- Consumes: Template classes from Task 7
- Produces: Complete CSS styling for orders section

- [ ] **Step 1: Find style section end**

Find the `</style>` closing tag at the end of ShopView.vue.

- [ ] **Step 2: Add orders CSS before closing style tag**

Before `</style>`, add:

```css
/* Orders Section */
.orders-section {
  padding: 20px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 800px;
  margin: 0 auto;
}

.order-card {
  background: rgba(5, 5, 25, 0.9);
  border: 2px solid #4ECDC4;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(78, 205, 196, 0.3);
}

/* Status-specific styling */
.order-card.order-pending { border-color: #FFD700; }
.order-card.order-completed { border-color: #00ff88; }
.order-card.order-expired {
  border-color: #FF6B6B;
  opacity: 0.7;
}
.order-card.order-cancelled {
  border-color: #888888;
  opacity: 0.6;
}

.order-status-badge {
  position: absolute;
  top: -10px;
  left: 20px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 1px;
}

.order-pending .order-status-badge {
  background: #FFD700;
  color: #000;
}

.order-completed .order-status-badge {
  background: #00ff88;
  color: #000;
}

.order-expired .order-status-badge {
  background: #FF6B6B;
  color: #fff;
}

.order-cancelled .order-status-badge {
  background: #888888;
  color: #fff;
}

.order-number {
  color: #888;
  font-size: 11px;
  margin-bottom: 5px;
}

.order-package {
  color: #4ECDC4;
  font-size: 16px;
  margin: 10px 0;
}

.order-amount {
  color: #FFD700;
  font-size: 14px;
  margin: 8px 0;
}

.order-date {
  color: #888;
  font-size: 11px;
  margin: 8px 0;
}

.order-info {
  color: #fff;
  font-size: 12px;
  margin: 10px 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}

.order-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.order-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.order-btn.primary {
  background: #00ff88;
  color: #000;
}

.order-btn.primary:hover {
  background: #00cc6f;
  transform: translateY(-2px);
}

.load-more-btn {
  width: 100%;
  padding: 12px;
  background: rgba(78, 205, 196, 0.2);
  border: 2px solid #4ECDC4;
  border-radius: 8px;
  color: #4ECDC4;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(78, 205, 196, 0.3);
  transform: translateY(-2px);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.empty-state p {
  font-size: 14px;
  margin: 10px 0;
}

.empty-hint {
  color: #4ECDC4;
  font-size: 12px;
}
```

- [ ] **Step 3: Verify styling appears correctly**

Reload page, navigate to "📦 Meus Pedidos"
Expected: Orders display with proper colors, spacing, status badges

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): add CSS styles for orders section"
```

---

### Task 9: Manual Testing - Empty State

**Files:**
- Test: `frontend/src/views/ShopView.vue`

**Interfaces:**
- Consumes: All previous tasks' implementations
- Produces: Verified empty state behavior

- [ ] **Step 1: Test with new user (no orders)**

If you have orders in database, you can test empty state by temporarily modifying `loadOrders()` to set `orders.value = []` after API call.

Or create a new test user account with no purchases.

- [ ] **Step 2: Navigate to orders tab**

Click "📦 Meus Pedidos"

Expected:
- Shows "📭" icon (large)
- Text: "Nenhum pedido encontrado"
- Text: "Compre pacotes de moedas na aba '🛍️ Todos os Itens'"

- [ ] **Step 3: Verify styling**

Empty state should:
- Be centered
- Have gray text (#888)
- Have hint text in cyan (#4ECDC4)

- [ ] **Step 4: Document results**

Open browser console, take screenshot if any issues
Expected: No console errors

---

### Task 10: Manual Testing - Order Display and Reopening

**Files:**
- Test: `frontend/src/views/ShopView.vue`

**Interfaces:**
- Consumes: All previous tasks' implementations
- Produces: Verified orders display and QR reopening

- [ ] **Step 1: Create a test order**

Navigate to "🛍️ Todos os Itens" tab
Click "COMPRAR" on coin_pack_999 (or any package)
PIX modal should open - leave it open or close it

- [ ] **Step 2: Navigate to orders tab**

Click "📦 Meus Pedidos"

Expected:
- Shows loading spinner briefly
- Displays order card with:
  - 🟡 PENDENTE badge
  - Order #ID
  - "Pacote de 999 Moedas" (or your package name)
  - "💵 R$ 14,99 • 🪙 999 Gold"
  - Date in format "DD/MM/YYYY às HH:MM"
  - "Expira em: X minutos"
  - "Ver QR Code" button (green)

- [ ] **Step 3: Verify status badge and border**

PENDING order should have:
- Golden border (#FFD700)
- Badge with golden background, black text
- Hover effect (card lifts slightly)

- [ ] **Step 4: Click "Ver QR Code" button**

Expected:
- PIX modal opens
- Shows correct QR code for this order
- Shows correct PIX code (can copy)
- Polling starts automatically (check console logs)

- [ ] **Step 5: Simulate payment (dev mode)**

In PIX modal:
- Click "Simular Pagamento" (orange button in dev section)
- Wait 3-6 seconds for polling to detect

Expected:
- Modal closes automatically
- Success message appears
- Orders list reloads automatically
- Order status changes to "✅ PAGO"
- Order card has green border
- Shows "Pago às HH:MM"
- No "Ver QR Code" button (action buttons removed for completed orders)

- [ ] **Step 6: Verify completed order styling**

COMPLETED order should have:
- Green border (#00ff88)
- Badge with green background, black text
- No opacity reduction

- [ ] **Step 7: Document test results**

Check browser console for errors
Take screenshots of PENDING and COMPLETED states
Expected: No console errors, smooth transitions

---

### Task 11: Manual Testing - Pagination

**Files:**
- Test: `frontend/src/views/ShopView.vue`

**Interfaces:**
- Consumes: All previous tasks' implementations
- Produces: Verified pagination behavior

- [ ] **Step 1: Create 15+ test orders**

To test pagination, need >10 orders total.

Create orders by:
1. Go to "🛍️ Todos os Itens"
2. Click "COMPRAR" on any package
3. Close modal (or complete payment)
4. Repeat 15 times

Or use API to create mock orders (faster).

- [ ] **Step 2: Navigate to orders tab**

Click "📦 Meus Pedidos"

Expected:
- Shows first 10 orders
- Shows "Carregar Mais" button at bottom
- Button has cyan text, transparent background

- [ ] **Step 3: Click "Carregar Mais"**

Expected:
- Button text changes to "Carregando..."
- Button is disabled during load
- After load: next 5 orders appear below existing ones
- Button disappears (only 15 total orders, already showing all)

- [ ] **Step 4: Verify no duplicates**

Scroll through all orders
Expected: No duplicate order IDs, all orders unique

- [ ] **Step 5: Test with exactly 10 orders**

If you have exactly 10 orders:
Expected: "Carregar Mais" button should NOT appear (hasMoreOrders = false)

- [ ] **Step 6: Document results**

Check console for API calls
Expected: Two API calls visible: `/api/v1/shop/orders?limit=10&offset=0` and `/api/v1/shop/orders?limit=10&offset=10`

---

### Task 12: Manual Testing - Error Handling and Edge Cases

**Files:**
- Test: `frontend/src/views/ShopView.vue`

**Interfaces:**
- Consumes: All previous tasks' implementations
- Produces: Verified error handling and edge cases

- [ ] **Step 1: Test expired order reopening**

Find a pending order in the list.

In browser console, manually set its expiresAt to past:
```javascript
// This is a hack for testing - find the orders ref in Vue devtools
orders.value[0].expiresAt = new Date('2020-01-01').toISOString()
```

Click "Ver QR Code" on that order.

Expected:
- Modal does NOT open
- Toast appears: "Pedido Expirado - Este pedido expirou. Crie um novo pedido."
- Order card updates to show "⏰ EXPIRADO" badge
- Order card has red border
- "Ver QR Code" button disappears

- [ ] **Step 2: Test network error**

Open Network tab in DevTools
Set throttling to "Offline"
Navigate to orders tab (or refresh page and click orders tab)

Expected:
- Shows error message: "Erro - Falha ao carregar pedidos. Tente novamente."
- Console shows: "Failed to load orders: [error]"

Restore network, click OK on error modal
Expected: Can try again

- [ ] **Step 3: Test with empty API response**

Temporarily modify loadOrders() to always set `orders.value = []` regardless of API response.

Navigate to orders tab.

Expected:
- Shows empty state (not an error)
- Shows "Nenhum pedido encontrado" message

Revert the temporary change.

- [ ] **Step 4: Test pagination error**

With >10 orders, click "Carregar Mais"
Before it completes, set network to "Offline"

Expected:
- Button returns to "Carregar Mais" state
- No new orders added
- Console shows error
- Button remains clickable (can retry)

- [ ] **Step 5: Document all edge cases tested**

Create a checklist of edge cases verified:
- [x] Expired order reopening
- [x] Network error on initial load
- [x] Empty API response
- [x] Pagination error

Expected: All edge cases handled gracefully, no crashes

---

### Task 13: Final Verification and Cleanup

**Files:**
- Review: `frontend/src/views/ShopView.vue`
- Review: Browser DevTools console
- Review: Git status

**Interfaces:**
- Consumes: All previous tasks' implementations
- Produces: Clean, production-ready code

- [ ] **Step 1: Full flow test**

Run complete user flow:
1. Go to shop
2. Buy a package (creates pending order)
3. Go to "📦 Meus Pedidos"
4. See order listed as PENDING
5. Click "Ver QR Code"
6. Click "Simular Pagamento"
7. Wait for payment confirmation
8. Verify order updates to COMPLETED

Expected: Smooth flow, no errors, all UI updates correctly

- [ ] **Step 2: Review console for warnings**

Open browser console
Navigate through all tabs
Expected: No Vue warnings, no TypeScript errors, no unexpected errors

- [ ] **Step 3: Code review**

Check ShopView.vue for:
- No console.log statements left (except intentional error logs)
- No commented-out code
- Consistent formatting
- All functions documented with comments

- [ ] **Step 4: Git status check**

Run: `git status`

Expected modifications:
- frontend/src/views/ShopView.vue (modified)

No unexpected modified files.

- [ ] **Step 5: Final commit**

```bash
git add frontend/src/views/ShopView.vue
git commit -m "feat(shop): complete order history feature

- Add orders tab with loading, empty state, and order cards
- Add pagination with 'Carregar Mais' button
- Add ability to reopen QR codes for pending orders
- Add order status badges (PENDING, COMPLETED, EXPIRED)
- Add Brazilian date/time formatting
- Add automatic order reload after payment confirmation
- Add comprehensive error handling

Resolves: Order history feature spec"
```

- [ ] **Step 6: Push to remote (if applicable)**

```bash
git push origin migration
```

---

## Completion Checklist

After all tasks completed, verify:

- [ ] All 13 tasks completed
- [ ] All commits pushed
- [ ] Empty state works
- [ ] Orders display with correct styling
- [ ] Pending orders show "Ver QR Code" button
- [ ] Clicking "Ver QR Code" opens modal with correct data
- [ ] Polling starts automatically when reopening QR
- [ ] Payment simulation works (dev mode)
- [ ] Orders update to COMPLETED after payment
- [ ] Pagination works with "Carregar Mais"
- [ ] Error handling works (network errors, expired orders)
- [ ] No console errors or warnings
- [ ] Code is clean and follows existing patterns

## Success Metrics

**User Experience:**
- Orders load in <1 second
- Status badges clearly distinguish order states
- Smooth transitions when updating order status
- Error messages are clear and actionable

**Code Quality:**
- ~150 lines of new code
- 0 new files created (all in ShopView.vue)
- 100% reuse of existing PIX modal and polling
- Follows existing Vue 3 Composition API patterns

**Testing:**
- 12 manual test scenarios passed
- Edge cases handled (expired orders, network errors, empty state)
- No regressions in existing shop functionality
