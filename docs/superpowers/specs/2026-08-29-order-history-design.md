# Order History Feature - Design Specification

**Date:** 2026-08-29
**Feature:** PIX Order History in Shop
**Estimated Implementation Time:** 30-40 minutes

## Overview

Add a dedicated order history section to the shop interface, allowing players to view their PIX purchase orders, check payment status, and reopen QR codes for pending payments.

## Context

The shop currently has two tabs:
- "🛍️ Todos os Itens" - Browse and purchase items
- "🎒 Meu Inventário" - View owned items

We recently implemented:
- PIX payment modal with QR code display
- Payment simulation for development
- Automatic polling to detect payment confirmation
- Backend endpoint `GET /api/v1/shop/orders` with pagination

The order history complements this by providing transparency and allowing users to resume pending payments.

## Goals

1. **Transparency** - Users can see all their purchase attempts
2. **Resumability** - Users can reopen QR codes for pending orders
3. **Status clarity** - Clear visual distinction between pending, paid, expired, and cancelled orders
4. **Simple implementation** - Reuse existing modal and polling logic

## Non-Goals

- Advanced filtering/search (YAGNI - add later if needed)
- Order cancellation (only natural expiration)
- Real-time updates across browser tabs
- Detailed payment analytics

## Design Decisions

### Approach Selected

**New tab "📦 Meus Pedidos"** - Add a third tab at the same level as existing tabs.

**Why this approach:**
- Consistent with existing tab pattern
- Clear separation: buy (tab 1) → use (tab 2) → history (tab 3)
- Room for future enhancements (filters, search)
- Reuses existing PIX modal 100%
- Common UX pattern users expect

**Alternatives considered:**
- Sidebar drawer: Would be inconsistent with current UI
- Collapsible section at top: Takes vertical space, bad for long history
- Separate page: Over-engineering for this feature

---

## Architecture

### Component Structure

**No new components** - Everything stays in `ShopView.vue` to avoid over-engineering.

**New reactive state:**
```typescript
const orders = ref<any[]>([])          // List of loaded orders
const ordersLoading = ref(false)       // Loading state
const ordersPage = ref(0)              // Pagination offset
const hasMoreOrders = ref(true)        // More pages available
```

**New functions:**
```typescript
loadOrders()              // Initial load from API
loadMoreOrders()          // Pagination
reopenPixModal(order)     // Open PIX modal with existing order
formatOrderDate(date)     // Brazilian date format
formatTime(date)          // Time only format
formatPrice(cents)        // R$ X,XX format
getPackageName(id)        // Package display name
getStatusIcon(status)     // Emoji for status
getStatusLabel(status)    // Localized status text
```

**Code reuse:**
- PIX modal (existing) - reused with order data
- Polling mechanism (existing) - activated when reopening QR
- CSS from item cards - base for order cards styling

### Data Flow

**Loading orders:**
```
User clicks "📦 Meus Pedidos" tab
  → Check if orders.value is empty
  → Call loadOrders()
  → shopAPI.getOrders(10, 0)
  → Display loading spinner
  → Store orders in orders.value
  → Render order cards
```

**Pagination:**
```
User clicks "Carregar Mais"
  → Increment ordersPage by 10
  → Call shopAPI.getOrders(10, ordersPage)
  → Append new orders to existing array
  → If < 10 orders returned, hide "Carregar Mais"
```

**Reopening QR code:**
```
User clicks "Ver QR Code" on pending order
  → Check if order.expiresAt > now
  → If expired: show toast, update status
  → If valid: populate pixOrder.value with order data
  → Set currentOrderId.value = order.id
  → Open modal: showPixModal.value = true
  → Start polling: startPollingPaymentStatus()
```

**Payment detected:**
```
Polling detects status = COMPLETED
  → Stop polling
  → Update player balance (authStore.fetchProfile())
  → Close modal
  → Reload orders list (loadOrders())
  → Show success message
```

---

## UI Layout

### Order Card Structure

Each order displays:

**Header:**
- Status badge (top-left corner, floating above card)
- Order number (#ID)

**Main content:**
- Package name (ex: "Pacote de 999 Moedas")
- Amount info (ex: "💵 R$ 14,99 • 🪙 999 Gold")
- Creation date (ex: "29/08/2026 às 00:15")

**Status-specific info:**
- **PENDING**: "Expira em: X minutos/horas"
- **COMPLETED**: "Pago às HH:MM"
- **EXPIRED**: "Expirou às HH:MM"
- **CANCELLED**: "Cancelado às HH:MM"

**Actions (PENDING only):**
- "Ver QR Code" button (primary, green)

### Status Visual Design

**PENDING:**
- Badge: 🟡 PENDENTE
- Border: Golden (#FFD700)
- Background: rgba(255, 215, 0, 0.1)
- Badge colors: background #FFD700, text black

**COMPLETED:**
- Badge: ✅ PAGO
- Border: Neon green (#00ff88)
- Background: rgba(0, 255, 136, 0.1)
- Badge colors: background #00ff88, text black

**EXPIRED:**
- Badge: ⏰ EXPIRADO
- Border: Red (#FF6B6B)
- Background: rgba(255, 107, 107, 0.1)
- Badge colors: background #FF6B6B, text white
- Card opacity: 0.7

**CANCELLED:**
- Badge: ❌ CANCELADO
- Border: Gray (#888888)
- Background: rgba(136, 136, 136, 0.1)
- Badge colors: background #888888, text white
- Card opacity: 0.6

### Empty State

When no orders exist:
```
┌─────────────────────────────┐
│      📭 (large icon)        │
│ Nenhum pedido encontrado    │
│                             │
│ Compre pacotes de moedas    │
│ na aba "🛍️ Todos os Itens" │
└─────────────────────────────┘
```

### Order List Layout

- Orders displayed in vertical list
- Most recent first (backend sorts by created_at DESC)
- 10 orders per page
- "Carregar Mais" button at bottom if more available
- Maximum width: 800px, centered

---

## Error Handling

### API Errors

**Failed to load orders (network/timeout):**
- Show message: "❌ Erro ao carregar pedidos. Tente novamente."
- Provide "Tentar Novamente" button
- Log error to console for debugging

**401 Unauthorized (JWT expired):**
- Handled by axios interceptor
- Redirects to login automatically

**Empty result (no orders):**
- Not an error
- Show empty state with friendly message

### Reopening QR Code Errors

**Order expired while in list:**
- Check `expiresAt < now` before opening modal
- Show toast: "Este pedido expirou"
- Update card status to EXPIRED immediately
- Don't open modal

**Order already paid:**
- Unlikely (user sees stale data)
- Polling detects COMPLETED status
- Modal closes automatically
- Updates list and shows success

**Missing QR code data:**
- Extremely unlikely (mock always generates QR)
- If happens: don't show "Ver QR Code" button
- Display order info only

### Edge Cases

**Pagination with no more orders:**
- API returns empty array or < 10 items
- Hide "Carregar Mais" button
- User sees all available orders

**Multiple browser tabs:**
- Each tab has independent state
- Polling works per-tab
- No cross-tab synchronization (YAGNI)

**Payment confirmed but Gold not credited:**
- Backend responsibility
- Frontend shows status from API
- If status = COMPLETED, assume Gold credited
- User reports discrepancy to support

---

## Technical Implementation

### Template Changes (ShopView.vue)

**1. Add tab button (after line ~37):**
```vue
<button
  @click="activeTab = 'orders'"
  :class="['category-btn', { active: activeTab === 'orders' }]"
>
  📦 Meus Pedidos
</button>
```

**2. Add orders section (after inventory section):**
```vue
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

### Script Changes (ShopView.vue)

**1. Add state variables (after line ~250):**
```typescript
// Orders state
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const ordersPage = ref(0)
const hasMoreOrders = ref(true)
```

**2. Add core functions:**

```typescript
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

**3. Add helper functions:**

```typescript
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

**4. Add watcher for lazy loading:**

```typescript
watch(activeTab, (newTab) => {
  if (newTab === 'orders' && orders.value.length === 0) {
    loadOrders()
  }
})
```

**5. Update checkPaymentStatus() to reload orders:**

Inside existing `checkPaymentStatus()` function, add after payment confirmed:

```typescript
if (order.status === 'COMPLETED') {
  // ... existing code ...

  // Reload orders list if on orders tab
  if (activeTab.value === 'orders') {
    await loadOrders()
  }
}
```

### CSS Changes (ShopView.vue)

Add at end of `<style scoped>`:

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

---

## Testing Plan

### Manual Testing Scenarios

**1. Empty state:**
- New user with no orders
- Should see empty state message
- Should link to "Todos os Itens" tab

**2. Loading orders:**
- User with existing orders
- Click "📦 Meus Pedidos" tab
- Should show loading spinner
- Should display orders after load

**3. Order display:**
- Verify all order types display correctly (PENDING, COMPLETED, EXPIRED)
- Verify status badges show correct colors and icons
- Verify dates format correctly in Brazilian format
- Verify prices format correctly (R$ X,XX)

**4. Reopening QR code:**
- Click "Ver QR Code" on pending order
- Modal should open with correct QR code
- Polling should start automatically
- Can copy PIX code
- Can close modal

**5. Expired order:**
- Try to open QR for expired order
- Should show "Pedido Expirado" message
- Should update status in card
- Should not open modal

**6. Payment simulation:**
- Open QR code for pending order
- Click "Simular Pagamento" (dev mode)
- Wait for polling to detect
- Modal should close
- Order list should update
- Order should show as COMPLETED

**7. Pagination:**
- User with >10 orders
- Should show "Carregar Mais" button
- Click to load more
- Should append to existing list
- Button should hide when no more orders

**8. Error handling:**
- Disconnect network
- Try to load orders
- Should show error message
- Click "Tentar Novamente"
- Should retry load

### Backend Testing

No backend changes required - existing endpoint is sufficient:
- `GET /api/v1/shop/orders?limit=10&offset=0`
- Already returns sorted by created_at DESC
- Already includes all necessary fields

---

## Success Metrics

**User transparency:**
- Users can see all purchase attempts
- Clear visual distinction between statuses
- Easy to understand dates and amounts

**Resumability:**
- Pending orders can be reopened
- QR code displays correctly
- Polling works when reopened

**Performance:**
- Initial load < 1 second (10 orders)
- Pagination seamless
- No unnecessary API calls

**Code quality:**
- ~150 lines of new code
- No new files/components
- Reuses existing logic 100%

---

## Future Enhancements (Not in MVP)

1. **Filters:** Filter by status (All, Pending, Paid, Expired)
2. **Search:** Search by order ID or package name
3. **Order cancellation:** Manual cancel button for pending orders
4. **Real-time updates:** WebSocket for cross-tab synchronization
5. **Export:** Download order history as CSV/PDF
6. **Notifications:** Push notification when payment confirmed
7. **Retry payment:** Generate new QR for expired orders

---

## Files Modified

- `frontend/src/views/ShopView.vue` - All changes contained here
- No backend changes
- No new files

---

## Implementation Checklist

- [ ] Add orders state variables
- [ ] Add "📦 Meus Pedidos" tab button
- [ ] Add orders section template
- [ ] Implement loadOrders() function
- [ ] Implement loadMoreOrders() function
- [ ] Implement reopenPixModal() function
- [ ] Add 6 helper functions (formatting)
- [ ] Add watcher for lazy loading
- [ ] Update checkPaymentStatus() to reload orders
- [ ] Add CSS styles for order cards
- [ ] Test empty state
- [ ] Test loading state
- [ ] Test order display (all statuses)
- [ ] Test reopening QR code
- [ ] Test expired order handling
- [ ] Test pagination
- [ ] Test payment simulation flow
- [ ] Test error handling
