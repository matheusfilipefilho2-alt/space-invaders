# UI/UX Improvements - Shop, Ranking, Token Bridge & Profile

**Date:** 2026-08-22
**Status:** Design Complete
**Implementation:** Design System Modular Approach

## Executive Summary

Comprehensive UI/UX improvements for Space Invaders game menus using a modular design system approach. Improvements span visual design (A), usability (B), and functionality (C) across 4 pages: Shop, Ranking, Token Bridge, and new Profile page.

**Key Improvements:**
- Design system with reusable components (15-20 components)
- Tab-based navigation for Shop
- Search + filters system
- Skeleton screens + toast notifications
- Profile page with email/password management
- Moderate animations throughout
- Desktop-first responsive design

**Timeline:** 4-5 days implementation
**Tech Stack:** Vanilla JavaScript, CSS Variables, No frameworks

---

## 1. Architecture & File Structure

### 1.1 New Directory Structure

```
src/
├── components/
│   ├── ui/                    # Base reusable components
│   │   ├── Button.js         # Button system
│   │   ├── Card.js           # Item/product cards
│   │   ├── Modal.js          # Modal system
│   │   ├── Tabs.js           # Tab system
│   │   ├── SearchBar.js      # Search with filters
│   │   ├── Toast.js          # Toast notifications
│   │   ├── Skeleton.js       # Loading placeholders
│   │   ├── Spinner.js        # Loading spinners
│   │   └── Badge.js          # Badges (discount, rarity, etc)
│   │
│   ├── shop/                  # Shop-specific components
│   │   ├── ShopTabs.js       # Shop tabs (Offers/Store/Inventory)
│   │   ├── ItemGrid.js       # Item grid
│   │   └── ItemFilters.js    # Filters and sorting
│   │
│   ├── ranking/               # Ranking components
│   │   ├── RankingList.js    # Player list
│   │   └── PlayerCard.js     # Player card
│   │
│   ├── bridge/                # Token bridge components
│   │   ├── BalanceCard.js    # Balance cards
│   │   └── TransactionList.js # Transaction list
│   │
│   └── profile/               # Profile components
│       ├── ProfileStats.js   # Statistics tab
│       └── ProfileSettings.js # Settings tab
│
├── styles/
│   ├── design-system.css      # Tokens and CSS variables
│   ├── animations.css         # Reusable animations
│   ├── components.css         # Component styles
│   └── pages/                 # Page-specific styles
│       ├── shop.css
│       ├── ranking.css
│       ├── token-bridge.css
│       └── profile.css
│
├── utils/
│   ├── toast.js               # Toast notification manager
│   └── skeleton.js            # Skeleton screen utilities
│
└── (existing files maintained)
```

### 1.2 Architecture Principles

1. **Isolated Components**: Each `.js` component exports constructor function or class
2. **CSS Modular**: Design tokens in CSS variables, components with specific classes
3. **Zero Dependencies**: Vanilla JS, no frameworks
4. **Progressive Enhancement**: Works without JavaScript (basic functionality)
5. **Backward Compatible**: Existing pages work during migration

### 1.3 Component Pattern

```javascript
// Example: src/components/ui/Button.js
class UIButton {
    constructor(options) {
        this.text = options.text;
        this.variant = options.variant; // 'primary', 'secondary', 'danger'
        this.size = options.size; // 'sm', 'md', 'lg'
        this.onClick = options.onClick;
        this.loading = false;
    }

    render() {
        const button = document.createElement('button');
        button.className = `ui-button ui-button--${this.variant} ui-button--${this.size}`;
        button.textContent = this.text;
        button.addEventListener('click', this.onClick);
        return button;
    }

    setLoading(loading) {
        this.loading = loading;
        // Update button with spinner
    }
}

export default UIButton;
```

---

## 2. Design System - Tokens and Variables

### 2.1 Design Tokens (`src/styles/design-system.css`)

```css
:root {
    /* ========== COLORS (maintaining current palette) ========== */

    /* Primary Colors */
    --color-gold: #FFD700;
    --color-gold-light: #FFA500;
    --color-teal: #4ECDC4;
    --color-teal-dark: #44A08D;

    /* Background Colors */
    --bg-primary: #050519;
    --bg-secondary: #0a0a2e;
    --bg-card: rgba(255, 255, 255, 0.05);
    --bg-card-hover: rgba(255, 255, 255, 0.08);

    /* Status Colors */
    --color-success: #00ff88;
    --color-error: #FF4757;
    --color-warning: #FFA502;
    --color-info: #4ECDC4;

    /* Rarity Colors */
    --rarity-common: #808080;
    --rarity-uncommon: #00ff00;
    --rarity-rare: #0070dd;
    --rarity-epic: #a335ee;
    --rarity-legendary: #ff8000;

    /* ========== TYPOGRAPHY (maintaining Press Start 2P) ========== */

    --font-primary: "Press Start 2P", monospace;
    --font-secondary: "Courier New", monospace;

    /* Font Sizes Desktop */
    --text-xs: 6px;
    --text-sm: 8px;
    --text-base: 10px;
    --text-lg: 12px;
    --text-xl: 14px;
    --text-2xl: 18px;
    --text-3xl: 24px;
    --text-4xl: 32px;

    /* ========== SPACING ========== */

    --space-xs: 5px;
    --space-sm: 10px;
    --space-md: 15px;
    --space-lg: 20px;
    --space-xl: 30px;
    --space-2xl: 40px;

    /* ========== BORDERS & RADIUS ========== */

    --border-width: 2px;
    --border-radius-sm: 5px;
    --border-radius-md: 10px;
    --border-radius-lg: 15px;

    /* ========== SHADOWS & GLOWS ========== */

    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);

    --glow-gold: 0 0 20px rgba(255, 215, 0, 0.5);
    --glow-teal: 0 0 20px rgba(76, 205, 196, 0.5);
    --glow-green: 0 0 20px rgba(0, 255, 136, 0.5);

    /* ========== ANIMATIONS (timing) ========== */

    --transition-fast: 0.15s ease;
    --transition-normal: 0.3s ease;
    --transition-slow: 0.5s ease;

    /* ========== Z-INDEX (layers) ========== */

    --z-base: 1;
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-modal-backdrop: 900;
    --z-modal: 1000;
    --z-toast: 1100;
}
```

### 2.2 Token Usage Example

```css
/* Example: button using tokens */
.ui-button {
    font-family: var(--font-primary);
    font-size: var(--text-base);
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--border-radius-sm);
    transition: all var(--transition-normal);
}

.ui-button--primary {
    background: linear-gradient(135deg, var(--color-gold), var(--color-gold-light));
    box-shadow: var(--shadow-md);
}

.ui-button--primary:hover {
    box-shadow: var(--shadow-lg), var(--glow-gold);
}
```

---

## 3. Core UI Components

### 3.1 Button Component

**File:** `src/components/ui/Button.js`

**Variants:** `primary`, `secondary`, `danger`, `success`
**Sizes:** `sm`, `md`, `lg`
**States:** normal, hover, active, disabled, loading

**Features:**
- Gradient backgrounds (gold for primary, teal for secondary)
- Integrated loading spinner
- Disabled state with opacity
- Hover with glow effect
- Click feedback (scale transform)

**API:**
```javascript
const button = new UIButton({
    text: 'Comprar',
    variant: 'primary',
    size: 'md',
    onClick: () => handlePurchase()
});

button.setLoading(true); // Show spinner
```

### 3.2 Card Component

**File:** `src/components/ui/Card.js`

**Variants:** `item`, `player`, `transaction`, `balance`
**Rarity:** common, uncommon, rare, epic, legendary (for items)
**Badges:** discount, owned, coming-soon, new

**Features:**
- Border colored by rarity
- Hover effect (elevation + glow)
- Badge positioning (top-right corner)
- Image lazy loading
- Skeleton loading state

### 3.3 Modal Component

**File:** `src/components/ui/Modal.js`

**Sizes:** `sm` (400px), `md` (600px), `lg` (800px)
**Animations:** slide-down, fade-in
**Close triggers:** backdrop-click, escape-key

**Features:**
- Dark backdrop with blur
- Slide-down animation on open
- X button in top-right
- Internal scroll if content large
- Focus trap (accessibility)

**API:**
```javascript
const modal = new UIModal({
    title: 'Confirmar Compra',
    size: 'md',
    content: confirmationHTML,
    onClose: () => {}
});

modal.open();
modal.close();
```

### 3.4 Tabs Component

**File:** `src/components/ui/Tabs.js`

**Orientation:** `horizontal`
**Active indicator:** animated underline
**Transitions:** fade between contents

**Features:**
- Active tab with golden underline
- Smooth transition between tabs
- Keyboard navigation (arrow keys)
- URL hash sync (optional)

**API:**
```javascript
const tabs = new UITabs({
    tabs: [
        { id: 'offers', label: '🔥 Ofertas', content: offersHTML },
        { id: 'store', label: '🛍️ Loja', content: storeHTML },
        { id: 'inventory', label: '🎒 Inventário', content: inventoryHTML }
    ],
    defaultTab: 'offers',
    onChange: (tabId) => {}
});
```

### 3.5 SearchBar Component

**File:** `src/components/ui/SearchBar.js`

**Debounce:** 300ms
**Clear button:** yes
**Placeholder:** customizable

**Features:**
- Search icon (🔍)
- Clear button (X) when has text
- Debounce for performance
- Loading indicator during search

**API:**
```javascript
const searchBar = new UISearchBar({
    placeholder: 'Buscar items...',
    debounce: 300,
    onSearch: (query) => filterItems(query)
});
```

### 3.6 Toast Component

**File:** `src/utils/toast.js`

**Types:** `success`, `error`, `warning`, `info`
**Duration:** 3000ms (customizable)
**Position:** `top-right`
**Stackable:** yes (multiple toasts)

**Features:**
- Slide-in from right
- Auto-dismiss with timer
- Visual progress bar
- Close button
- Stack of multiple toasts

**API:**
```javascript
// Success
toast.success('Item comprado com sucesso!', {
    duration: 3000,
    action: { text: 'Ver inventário', callback: () => {} }
});

// Error (persistent)
toast.error('Saldo insuficiente', {
    duration: 5000,
    persistent: true
});

// Warning
toast.warning('Apenas 3 unidades restantes!');

// Info
toast.info('Ranking atualizado');
```

### 3.7 Skeleton Component

**File:** `src/components/ui/Skeleton.js`

**Shapes:** `text`, `circle`, `rectangle`
**Animation:** shimmer effect

**Features:**
- Shimmer animation (wave effect)
- Matches real component (height, width)
- Multiple lines for text

**API:**
```javascript
const skeleton = new UISkeleton({
    shape: 'rectangle',
    width: '300px',
    height: '200px'
});
```

### 3.8 Badge Component

**File:** `src/components/ui/Badge.js`

**Variants:** `discount`, `new`, `owned`, `hot`, `rarity`
**Positions:** `top-left`, `top-right`, `bottom-left`, `bottom-right`

**Features:**
- Optional pulse animation
- Customizable colors
- Absolute positioning
- Proper z-index

---

## 4. Page-Specific Improvements

### 4.1 SHOP - Tab-Based Navigation

#### 4.1.1 New Structure

```
┌─────────────────────────────────────────────┐
│  🛍️ LOJA GALÁCTICA    👛 1,234 moedas     │
├─────────────────────────────────────────────┤
│  [🔥 Ofertas] [🛍️ Loja] [🎒 Inventário]   │ ← Tabs
├─────────────────────────────────────────────┤
│  🔍 [Buscar...]  [Raridade ▾] [Ordenar ▾]  │ ← Search/Filters
├─────────────────────────────────────────────┤
│                                             │
│   [Active tab content]                      │
│   - Offers tab: Daily offers grid           │
│   - Store tab: All items grid               │
│   - Inventory tab: Owned items grid         │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.1.2 Tab Features

**Tab 1: 🔥 Ofertas (Offers)**
- Pulsing red "OFERTA" badge
- Countdown timer per item (if expires)
- Visual highlight (golden border glow)
- Sort by time remaining

**Tab 2: 🛍️ Loja (Store)**
- All available items
- Search by name
- Filters: Rarity + Category
- Sort: Price (↑↓), Name (A-Z), Rarity
- Skeleton screens during loading

**Tab 3: 🎒 Inventário (Inventory)**
- Only owned items
- "EQUIPADO" badge on active items
- Buttons: "Usar" / "Equipar" / "Desequipar"
- Usage counter (temporary items)
- Empty state: "Você ainda não possui itens"

#### 4.1.3 Filter System

**Rarity Filter:**
- [ ] All
- [ ] Common (gray)
- [ ] Uncommon (green)
- [ ] Rare (blue)
- [ ] Epic (purple)
- [ ] Legendary (orange)

**Sort Options:**
- Price: Low → High
- Price: High → Low
- Name: A → Z
- Name: Z → A
- Rarity: Common → Legendary
- Rarity: Legendary → Common

### 4.2 RANKING - Engagement Improvements

#### 4.2.1 New Structure

```
┌─────────────────────────────────────────────┐
│  🏆 RANKING GALÁCTICO                       │
├─────────────────────────────────────────────┤
│  👤 Your Ranking: #15 (Top 5%) ↗️ +3        │ ← Player info
│  🪙 12,340 pts  |  💎 Level 42              │
├─────────────────────────────────────────────┤
│  [🔄 Refresh]  [🏅 Achievements]           │ ← Actions
├─────────────────────────────────────────────┤
│                                             │
│  🥇 Player1    Lv.50  ⭐⭐⭐  50,000 pts   │
│  🥈 Player2    Lv.48  ⭐⭐⭐  45,200 pts   │
│  🥉 Player3    Lv.45  ⭐⭐⭐  42,100 pts   │
│  4️⃣  Player4    Lv.42  ⭐⭐    38,500 pts   │
│  ...                                        │
│  🟢 15. YOU     Lv.42  ⭐⭐    12,340 pts   │ ← Highlight
│  ...                                        │
│                                             │
│  Last update: 5s ago                        │
└─────────────────────────────────────────────┘
```

#### 4.2.2 Improvements

- **Position indicator:** "Top 5%", "Top 10%", etc
- **Position change:** Arrows ↗️↘️➡️ (up/down/same)
- **Scroll to me:** Auto-scroll to player position
- **Manual refresh button:** Besides auto-refresh 30s
- **Timestamp:** "Last update: Xs ago"
- **Skeleton list:** 10 skeleton rows during loading
- **Animated highlight:** Your ranking with green border + pulse
- **Level badges:** Visual stars per level

### 4.3 TOKEN BRIDGE - Improved UX Flow

#### 4.3.1 New Structure

```
┌─────────────────────────────────────────────┐
│  🌉 TOKEN BRIDGE                            │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ⇄  ┌──────────────┐    │
│  │ 🪙 1,234     │     │ 💎 456       │    │
│  │ Game Coins   │     │ SPACE Tokens │    │
│  └──────────────┘     └──────────────┘    │
├─────────────────────────────────────────────┤
│  Direction: [← Withdraw] [Deposit →]       │ ← Toggle
├─────────────────────────────────────────────┤
│  Amount: [________] [MAX]                   │
│  [50] [100] [500] [1000]                   │ ← Quick amounts
├─────────────────────────────────────────────┤
│  📊 Summary:                                 │
│  You send:  1,000 🪙                       │
│  You receive: 1,000 💎 (fee: 0%)           │
│  Destination: Wallet 0x1234...5678         │
├─────────────────────────────────────────────┤
│  [🔄 Convert]  ← Action button             │
├─────────────────────────────────────────────┤
│  📜 History:                                 │
│  ✅ Withdraw  500 🪙 → 💎  2h ago         │
│  ✅ Deposit  1000 💎 → 🪙  5h ago          │
│  ⏳ Pending  250 🪙 → 💎  10m ago          │
└─────────────────────────────────────────────┘
```

#### 4.3.2 Improvements

- **MAX button:** Fill maximum available amount
- **Real-time validation:** Visual feedback if invalid value
- **Styled confirmation modal:** Replace browser `confirm()` with custom modal
- **Progress indicator:** Progress bar for long transactions
- **Persistent toast:** Success with explorer link (no auto-hide)
- **Status badges:** ✅ Complete, ⏳ Pending, ❌ Failed
- **Improved empty state:** Illustration + motivational text
- **Transaction details:** Expand to see more details

### 4.4 PROFILE - New Player Profile Page

#### 4.4.1 Page Structure (profile.html)

```
┌─────────────────────────────────────────────┐
│  👤 MY PROFILE                              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │       👨‍🚀                            │  │
│  │     JOGADOR123                       │  │
│  │     Level 42 ⭐⭐                    │  │
│  │     #15 in Ranking                   │  │
│  └─────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│  [📊 Statistics] [⚙️ Settings]             │ ← Tabs
├─────────────────────────────────────────────┤
│                                             │
│  TAB 1: STATISTICS                          │
│  ┌─────────────────────────────────────┐  │
│  │ 🎮 Games Played: 234                │  │
│  │ 🏆 High Score: 50,230               │  │
│  │ 💰 Total Coins: 12,340              │  │
│  │ 💎 Tokens: 456                      │  │
│  │ 🎯 Win Rate: 68%                    │  │
│  │ ⏱️ Total Time: 45h 23m              │  │
│  │ 🏅 Achievements: 23/50              │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  TAB 2: SETTINGS                            │
│  ┌─────────────────────────────────────┐  │
│  │ 📧 Email                             │  │
│  │ [your-email@example.com]  [Change] │  │
│  │                                      │  │
│  │ 🔒 Password                          │  │
│  │ [••••••••]  [Change]                │  │
│  │                                      │  │
│  │ 🔔 Notifications                     │  │
│  │ [✓] Special offers                  │  │
│  │ [✓] Achievements unlocked           │  │
│  │ [ ] New items in store              │  │
│  │                                      │  │
│  │ 🎨 Theme                             │  │
│  │ (•) Dark  ( ) Light (future)        │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  [💾 Save Changes]                         │
│                                             │
└─────────────────────────────────────────────┘
```

#### 4.4.2 Change Email Modal

```
┌─────────────────────────────────────┐
│  📧 Change Email           [✕]     │
├─────────────────────────────────────┤
│                                     │
│  Current email:                     │
│  your-email@example.com             │
│                                     │
│  New email:                         │
│  [___________________________]      │
│                                     │
│  Confirm current password:          │
│  [___________________________]      │
│                                     │
│  [Cancel]  [✓ Confirm]             │
│                                     │
└─────────────────────────────────────┘
```

**Validation:**
- Valid email format (regex)
- Cannot be empty
- Unique in system (database check)
- Current password required

**Flow:**
1. User types new email
2. Validate format
3. Request current password
4. Verify password in database
5. Update email
6. Toast: "Email updated successfully!"

#### 4.4.3 Change Password Modal

```
┌─────────────────────────────────────┐
│  🔒 Change Password        [✕]     │
├─────────────────────────────────────┤
│                                     │
│  Current password:                  │
│  [___________________________] 👁️  │
│                                     │
│  New password:                      │
│  [___________________________] 👁️  │
│  Strength: ████░░░░░░ Medium       │
│                                     │
│  Confirm new password:              │
│  [___________________________] 👁️  │
│                                     │
│  ℹ️ Minimum 6 characters            │
│                                     │
│  [Cancel]  [✓ Confirm]             │
│                                     │
└─────────────────────────────────────┘
```

**Validation:**
- Minimum 6 characters
- Current password correct
- New password ≠ current password
- Confirmation matches new password

**Password Strength:**
- Weak: < 6 chars
- Medium: 6-8 chars
- Strong: > 8 chars + numbers
- Very strong: > 8 chars + numbers + symbols

**Flow:**
1. User types current password
2. Validate in database
3. User types new password
4. Show strength in real-time
5. User confirms new password
6. Hash with bcrypt
7. Update in database
8. Toast: "Password changed successfully!"
9. Optional: Logout and redirect to login

#### 4.4.4 Profile Integration

**Navigation links on all pages:**
```
Header navigation:
[🎮 Play] [🛍️ Shop] [🏆 Ranking] [🌉 Bridge] [👤 Profile] [🚪 Logout]
```

**Auto-redirect:**
- If email empty and trying to buy with PIX → redirect to profile with toast "Add email for payments"

#### 4.4.5 Database Schema

**Add columns to `players` table:**
```sql
ALTER TABLE players
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notifications_offers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_achievements BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_shop BOOLEAN DEFAULT false;
```

---

## 5. Loading States & Feedback System

### 5.1 Loading State Hierarchy

**Level 1: Skeleton Screens** (initial page load)
```
When: Loading item list, ranking, history
Duration: 500ms - 2s
Visual: Animated placeholders mimicking real content
```

Examples:
- Shop: 6-9 skeleton cards in grid
- Ranking: 10 skeleton rows
- Token Bridge: Skeleton balance cards + transaction list

**Level 2: Inline Spinners** (specific actions)
```
When: Buy item, convert tokens, update data
Duration: 200ms - 5s
Visual: Small spinner in button + "Processing..." text
```

Examples:
- "Buy" button → [⟳ Buying...]
- "Convert" button → [⟳ Converting...]
- Refresh button → [⟳] spinning icon

**Level 3: Modal Loading** (long/critical operations)
```
When: PIX payment, blockchain transactions
Duration: 5s+
Visual: Full modal with large spinner + message + progress bar
```

Examples:
- "Generating PIX..." (already exists)
- "Processing blockchain transaction..."
- "Connecting wallet..."

### 5.2 Toast Notification System

**Toast Types and Usage:**

```javascript
// Success
toast.success('Item purchased successfully!', {
    duration: 3000,
    action: { text: 'View inventory', callback: () => {} }
});

// Error (persistent)
toast.error('Insufficient balance', {
    duration: 5000,
    persistent: true // No auto-hide
});

// Warning
toast.warning('Only 3 units remaining!', {
    duration: 4000
});

// Info
toast.info('Ranking updated', {
    duration: 2000
});
```

**Visual:**
```
┌─────────────────────────────────────┐
│ ✅ Item purchased successfully!     │
│ [View inventory]  [✕]              │
│ ████████████████░░ 2.5s            │ ← Progress bar
└─────────────────────────────────────┘
```

**Features:**
- Slide-in from right (animation)
- Stack up to 3 toasts simultaneously
- Progress bar showing time remaining
- Close button (X)
- Optional action button (link/callback)
- Auto-remove after duration
- Persistent option for critical errors

### 5.3 Empty States

**Shop - Offers Tab (no offers):**
```
    🎁
No active offers at the moment
Come back later for special promotions!
```

**Shop - Inventory Tab (empty):**
```
    🎒
Your inventory is empty
[Go to Store]
```

**Ranking - No data:**
```
    🏆
Loading ranking...
Be the first to play!
```

**Token Bridge - No history:**
```
    📭
No transactions yet
Make your first conversion!
```

**Search - No results:**
```
    🔍
No items found for "xyz"
Try another search term
[Clear search]
```

### 5.4 Error States

**Network Error:**
```
Toast error: "No internet connection"
Action: [Try again]
Auto-retry: 3 attempts with backoff
```

**Validation Error:**
```
Toast warning: "Invalid email. Please update your profile."
Action: [Go to profile] (when available)
```

**Server Error:**
```
Toast error: "Server error. Try again in a few minutes."
Action: [Report problem]
Persistent: true (no auto-hide)
```

**Insufficient Balance:**
```
Toast warning: "Insufficient balance! You need 500 coins."
Action: [Buy coins]
```

### 5.5 Progress Indicators

**PIX Payment (existing, maintain):**
- Visual countdown timer
- Progress ring showing time remaining
- Status polling every 5s

**Blockchain Transaction (new):**
```
┌─────────────────────────────────┐
│  Processing transaction...      │
│  ████████████░░░░░░░ 60%      │
│                                 │
│  ⏳ Awaiting confirmation       │
│  (may take up to 30 seconds)    │
└─────────────────────────────────┘
```

**Batch Operations (future):**
```
Processing 5 items...
████████████████████ 100%
Completed: 5/5 items
```

---

## 6. Animation System

### 6.1 CSS Animation Library (`src/styles/animations.css`)

```css
/* FADE ANIMATIONS */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

/* SLIDE ANIMATIONS */
@keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
}

/* PULSE ANIMATIONS */
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes pulseGlow {
    0%, 100% { box-shadow: var(--shadow-md); }
    50% { box-shadow: var(--shadow-lg), var(--glow-gold); }
}

/* SHIMMER (Skeleton Loading) */
@keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
}

.skeleton {
    background: linear-gradient(
        90deg,
        var(--bg-card) 0%,
        rgba(255, 255, 255, 0.1) 50%,
        var(--bg-card) 100%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
}

/* SPIN (Loading Spinners) */
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* BOUNCE */
@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

/* SHAKE (Errors) */
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

/* SCALE */
@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

/* GLOW EFFECTS */
@keyframes glowPulse {
    0%, 100% { filter: drop-shadow(0 0 5px currentColor); }
    50% { filter: drop-shadow(0 0 20px currentColor); }
}
```

### 6.2 Component Micro-interactions

**Buttons:**
```css
.ui-button {
    transition: all var(--transition-normal);
}

.ui-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg), var(--glow-gold);
}

.ui-button:active {
    transform: scale(0.98);
}
```

**Cards:**
```css
.ui-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
}

.ui-card--rarity-legendary:hover {
    box-shadow: var(--shadow-lg), var(--glow-gold);
}
```

**Badges:**
```css
.badge--hot {
    animation: pulse 2s ease-in-out infinite;
}

.badge--new {
    animation: bounce 1s ease-in-out 3; /* 3 times only */
}
```

**Toasts:**
```css
.toast {
    animation: slideInRight 0.3s ease-out;
}

.toast.removing {
    animation: slideInRight 0.3s ease-out reverse;
}
```

**Modals:**
```css
.modal-backdrop {
    animation: fadeIn 0.3s ease-out;
}

.modal-content {
    animation: slideDown 0.3s ease-out;
}
```

### 6.3 Performance & Accessibility

**Respect user preferences:**
```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

**Optimized timing:**
- Micro-interactions: 150-300ms
- State transitions: 300-500ms
- Loading indicators: 1000-2000ms (loop)
- Pulses/Glows: 2000ms (loop)

---

## 7. Testing Strategy

### 7.1 Component Testing Checklist

**Button Component:**
- [ ] Renders with all variants (primary, secondary, danger)
- [ ] All states work (normal, hover, active, disabled)
- [ ] Loading state shows spinner
- [ ] Click callback fires
- [ ] Keyboard accessible (Enter/Space)
- [ ] Disabled prevents clicks

**Card Component:**
- [ ] Renders with all variants
- [ ] Rarity borders correct
- [ ] Badges positioned correctly
- [ ] Hover effect works
- [ ] Lazy loading of images
- [ ] Skeleton state during loading

**Modal Component:**
- [ ] Opens and closes correctly
- [ ] Backdrop click closes modal
- [ ] Escape key closes modal
- [ ] Focus trap works (Tab cycle)
- [ ] Body scroll locked when open
- [ ] Slide-down animation smooth
- [ ] Multiple modals stack correctly

**Tabs Component:**
- [ ] Renders all tabs
- [ ] Active tab visually distinct
- [ ] Click changes content
- [ ] Keyboard navigation (Arrow keys)
- [ ] Fade transition between contents
- [ ] URL hash sync (if enabled)

**Toast System:**
- [ ] All types (success, error, warning, info)
- [ ] Slide-in animation
- [ ] Auto-dismiss after duration
- [ ] Progress bar works
- [ ] Close button removes toast
- [ ] Multiple toasts stack
- [ ] Persistent toasts don't auto-remove
- [ ] Action button callback works

**SearchBar:**
- [ ] 300ms debounce works
- [ ] Clear button appears with text
- [ ] Clear button clears input
- [ ] Loading indicator during search
- [ ] Enter key triggers search
- [ ] Placeholder correct

### 7.2 Page Integration Tests

**Shop Page - Buy Item Flow:**
1. Load store → Skeleton screens appear
2. Items load → Skeleton disappears with fade
3. Search "skin" → List filters
4. Filter "Rare" → Only rare items appear
5. Click item → Confirmation modal opens
6. Click "Buy" → Button shows loading
7. Success → Success toast + modal closes
8. Inventory updates → Item appears with "OWNED"
9. Balance updates → Number decreases

**Shop Page - Tab Switching:**
1. "Offers" tab active by default
2. Click "Store" → Fade out Offers, fade in Store
3. Click "Inventory" → Shows owned items
4. Empty state if inventory empty
5. Animated underline follows active tab

**Shop Page - PIX Payment:**
1. Click coin pack without email → Toast "Add email"
2. Redirect to profile
3. Add email → Return to shop
4. Click coin pack → Modal "Generating PIX..."
5. PIX generates → Modal with QR code + countdown
6. Copy button → Toast "Code copied!"
7. Polling starts (5s intervals)
8. Payment confirmed → Success toast
9. Modal closes → Balance updates

**Ranking Page - View Ranking:**
1. Load page → Skeleton of 10 rows
2. Data loads → Fade in with positions
3. Auto-scroll to player position
4. Player highlighted with green border
5. Position change arrows (↗️↘️➡️) visible
6. Top 1-3 with medals 🥇🥈🥉
7. Timestamp updates "Xs ago"

**Ranking Page - Manual Refresh:**
1. Click refresh button → Icon spins
2. Skeleton overlay during loading
3. Data updates → Reorder animation
4. Toast "Ranking updated"
5. Auto-scroll to new position

**Token Bridge Page - Convert Tokens:**
1. Load page → Balance cards skeleton
2. Balances load → Numbers animate (count up)
3. Type amount → Real-time validation
4. Click "MAX" → Fills maximum value
5. Summary updates automatically
6. Toggle direction → Summary inverts
7. Click "Convert" → Styled confirmation modal
8. Confirm → Progress bar during transaction
9. Success → Toast with explorer link (persistent)
10. Balances update → Numbers animate
11. History adds new row at top

**Profile Page - Change Email:**
1. Click "Change" email → Modal opens
2. Type new email → Real-time validation
3. Invalid email → Red border + shake
4. Valid email → Green border
5. Request password → Validation
6. Incorrect password → Error toast + shake
7. Correct password → Loading
8. Success → Toast + modal closes
9. Email updates on page

**Profile Page - Change Password:**
1. Click "Change" password → Modal opens
2. Type current password → Validation
3. Type new password → Strength bar updates
4. Weak password → Red bar
5. Strong password → Green bar
6. Confirm password → Match validation
7. Passwords don't match → Error + shake
8. Confirm → Loading
9. Success → Toast + modal closes
10. (Optional) Logout and redirect to login

### 7.3 Responsiveness Testing

**Breakpoints:**
- Desktop: 1200px+ → Default layout
- Laptop: 992px+ → 3 cols → 2 cols
- Tablet: 768px+ → 2 cols → 1 col
- Mobile: < 768px → Mobile optimizations

**Mobile Checklist (Desktop First):**
- [ ] Fonts reduce appropriately
- [ ] Grids collapse to 1 column
- [ ] Modals full-screen on mobile
- [ ] Touch targets minimum 44x44px (basic)
- [ ] Scroll doesn't break
- [ ] Images responsive
- [ ] No horizontal overflow

### 7.4 Performance Testing

**Target Metrics:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.0s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

**Optimizations:**
- [ ] Lazy loading of images
- [ ] Debounce on search (300ms)
- [ ] Throttle on scroll events
- [ ] CSS animations with GPU (transform/opacity)
- [ ] Remove will-change after animation
- [ ] Skeleton screens for perceived performance

### 7.5 Accessibility Testing (Basic)

**Keyboard Navigation:**
- [ ] Tab navigates between focusable elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Arrow keys navigate tabs

**Screen Readers (Basic):**
- [ ] Buttons have aria-label when needed
- [ ] Modals have role="dialog"
- [ ] Loading states have aria-busy="true"
- [ ] Toasts have role="alert"

**Contrast:**
- [ ] Text has minimum 4.5:1 contrast
- [ ] Headings have minimum 3:1 contrast
- [ ] Focus states visible

### 7.6 Browser Support

**Target:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari iOS 14+
- Chrome Android 90+

**Fallbacks:**
- CSS Grid → Flexbox fallback
- CSS Variables → Inline values fallback (not priority)
- Animations → Works without (prefers-reduced-motion)

### 7.7 Pre-Deploy Checklist

**Functionality:**
- [ ] All components render
- [ ] All flows work end-to-end
- [ ] Forms validate correctly
- [ ] Errors handled gracefully
- [ ] Loading states appear
- [ ] Success/Error feedback works

**Performance:**
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

**Visual:**
- [ ] Design consistent between pages
- [ ] Correct colors (design tokens)
- [ ] Consistent spacing
- [ ] Correct typography
- [ ] Responsive on 3 breakpoints

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Focus visible
- [ ] Adequate contrast
- [ ] No console warnings

**Git:**
- [ ] All changes committed
- [ ] Descriptive messages
- [ ] No temporary files
- [ ] .gitignore updated

---

## 8. Implementation Notes

### 8.1 Implementation Order

**Phase 1: Foundation (Day 1)**
1. Create design-system.css with all tokens
2. Create animations.css with all keyframes
3. Set up component directory structure
4. Create base components (Button, Card, Modal)

**Phase 2: Core Components (Day 2)**
1. Tabs component
2. SearchBar component
3. Toast system
4. Skeleton screens

**Phase 3: Shop Page (Day 2-3)**
1. Implement tab system
2. Add search and filters
3. Update item rendering with new cards
4. Add loading states

**Phase 4: Other Pages (Day 3-4)**
1. Ranking improvements
2. Token Bridge improvements
3. Profile page (new)

**Phase 5: Polish & Testing (Day 4-5)**
1. Animations fine-tuning
2. Empty states
3. Error handling
4. Cross-page testing
5. Responsive testing

### 8.2 Migration Strategy

**Backward Compatible:**
- New components don't break existing functionality
- Old code works alongside new code
- Gradual migration page by page

**Testing Each Step:**
- Test after each component creation
- Test after each page migration
- Maintain existing tests

### 8.3 Future Enhancements

**Post-Launch:**
- Light theme option
- More advanced filters (price range, tags)
- Batch operations in inventory
- Achievement system expansion
- Email verification flow
- Password recovery flow
- Two-factor authentication

---

## 9. Success Criteria

### 9.1 Visual Improvements (A)

- [ ] Consistent design across all 4 pages
- [ ] Smooth animations (moderate level)
- [ ] Modern look while maintaining retro gaming aesthetic
- [ ] Proper color usage (design tokens)
- [ ] Visual hierarchy clear

### 9.2 Usability Improvements (B)

- [ ] Tab-based navigation in Shop (cleaner)
- [ ] Search and filter functionality
- [ ] Clear loading states (skeleton + spinners)
- [ ] Helpful error messages
- [ ] Empty states with guidance
- [ ] Profile management (email/password)

### 9.3 Functionality Improvements (C)

- [ ] Real-time search with debounce
- [ ] Filter by rarity and category
- [ ] Sort options (price, name, rarity)
- [ ] Toast notification system
- [ ] Proper validation (email, password)
- [ ] Better transaction feedback

### 9.4 Overall Goals

- [ ] Better user experience
- [ ] Faster perceived performance
- [ ] More professional appearance
- [ ] Easier to navigate
- [ ] Better feedback and communication
- [ ] Consistent component library for future development

---

## 10. Conclusion

This design provides a comprehensive roadmap for improving the UI/UX of Space Invaders game menus. The modular design system approach ensures:

1. **Consistency** - All pages share the same visual language
2. **Maintainability** - Reusable components are easy to update
3. **Scalability** - Easy to add new features with existing components
4. **Quality** - Professional appearance with smooth interactions
5. **Future-proof** - Component library ready for expansion

The implementation will take approximately 4-5 days and will result in a significantly improved user experience across Shop, Ranking, Token Bridge, and the new Profile page.

**Next Step:** Create implementation plan with detailed tasks.
