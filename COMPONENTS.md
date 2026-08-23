# UI Components Documentation

## Overview

This document describes the reusable UI components created for the Space Invaders game. All components follow a consistent design system with tokens, animations, and accessibility features.

## Design System

### CSS Tokens (`src/styles/design-system.css`)

The design system provides a centralized set of CSS custom properties for consistent styling:

- **Colors**: Primary (gold, teal), status colors (success, error, warning, info), rarity colors
- **Typography**: Font families, sizes (xs to 4xl)
- **Spacing**: Standardized spacing scale (xs to 2xl)
- **Borders & Radius**: Border widths and radius sizes
- **Shadows & Glows**: Shadow levels and colored glows
- **Animations**: Transition durations (fast, normal, slow)
- **Z-Index**: Layering system (base, dropdown, sticky, modal, toast)

### Animation System (`src/styles/animations.css`)

Pre-built animations for common UI patterns:

- **Fade**: fadeIn, fadeOut
- **Slide**: slideDown, slideUp, slideInRight
- **Pulse**: pulse, pulseGlow
- **Shimmer**: skeleton loading animation
- **Spin**: loading spinner
- **Bounce**: attention grabber
- **Shake**: error indication
- **Scale**: scaleIn
- **Glow**: glowPulse

All animations respect `prefers-reduced-motion` for accessibility.

## Core Components

### 1. Button (`src/components/ui/Button.js`)

Reusable button component with variants, sizes, and states.

**Features:**
- Variants: primary, secondary, danger, success
- Sizes: sm, md, lg
- Loading state with spinner
- Disabled state
- Focus-visible styling
- Keyboard accessible

**Usage:**
```javascript
import UIButton from './components/ui/Button.js';

const button = new UIButton({
    text: 'Click Me',
    variant: 'primary',
    size: 'md',
    onClick: () => console.log('Clicked!'),
    disabled: false
});

document.body.appendChild(button.render());

// Set loading state
button.setLoading(true);

// Enable/disable
button.setDisabled(true);
```

### 2. Card (`src/components/ui/Card.js`)

Container component with rarity-based borders and hover effects.

**Features:**
- Rarity variants: common, uncommon, rare, epic, legendary
- Hover animations
- Image support
- Title and description slots
- Focus-visible styling

**Usage:**
```javascript
import UICard from './components/ui/Card.js';

const card = new UICard({
    title: 'Laser Gun',
    description: 'A powerful laser weapon',
    image: 'assets/items/laser_gun.png',
    rarity: 'legendary'
});

document.body.appendChild(card.render());
```

### 3. Modal (`src/components/ui/Modal.js`)

Dialog component with backdrop, animations, and focus trap.

**Features:**
- Sizes: sm (400px), md (600px), lg (800px)
- Backdrop with blur effect
- ESC key to close
- Click outside to close (optional)
- Focus trap for accessibility
- ARIA attributes (role="dialog", aria-modal="true")
- Keyboard accessible

**Usage:**
```javascript
import UIModal from './components/ui/Modal.js';

const modal = new UIModal({
    title: 'Confirm Purchase',
    content: '<p>Are you sure you want to buy this item?</p>',
    size: 'md',
    closeOnBackdrop: true,
    closeOnEsc: true,
    onClose: () => console.log('Modal closed')
});

modal.open();

// Programmatically close
modal.close();
```

### 4. Tabs (`src/components/ui/Tabs.js`)

Tabbed navigation with keyboard support and animated underline.

**Features:**
- Keyboard navigation (Arrow keys, Home, End)
- Animated underline indicator
- Content fade transitions
- ARIA attributes (role="tablist", role="tab", role="tabpanel")
- Focus management

**Usage:**
```javascript
import UITabs from './components/ui/Tabs.js';

const tabs = new UITabs({
    tabs: [
        { label: 'Tab 1', content: '<div>Content 1</div>' },
        { label: 'Tab 2', content: document.createElement('div') },
        { label: 'Tab 3', content: '<div>Content 3</div>' }
    ],
    activeIndex: 0,
    onChange: (index) => console.log('Active tab:', index)
});

document.body.appendChild(tabs.render());

// Change tab programmatically
tabs.setActive(1);

// Update tabs dynamically
tabs.setTabs([...newTabs]);
```

### 5. SearchBar (`src/components/ui/SearchBar.js`)

Search input with icon and loading state.

**Features:**
- Debounced search (300ms default)
- Loading indicator
- Clear button
- Disabled state
- Focus-within styling
- Keyboard accessible

**Usage:**
```javascript
import UISearchBar from './components/ui/SearchBar.js';

const searchBar = new UISearchBar({
    placeholder: 'Search items...',
    onSearch: (query) => {
        console.log('Searching for:', query);
    },
    debounce: 300
});

document.body.appendChild(searchBar.render());

// Set loading state
searchBar.setLoading(true);

// Set disabled state
searchBar.setDisabled(true);

// Clear search
searchBar.clear();
```

### 6. Toast (`src/components/ui/Toast.js`)

Notification component with auto-dismiss and animations.

**Features:**
- Types: success, error, info, warning
- Auto-dismiss (configurable duration)
- Persistent option
- Action button support
- Slide-in animation
- Positioned at top-right

**Usage:**
```javascript
import UIToast from './components/ui/Toast.js';

// Success toast
UIToast.success('Item purchased successfully!');

// Error toast
UIToast.error('Failed to purchase item', { duration: 5000 });

// Info toast
UIToast.info('New items available in shop');

// Persistent toast with action
UIToast.success('Transaction complete', {
    persistent: true,
    action: {
        text: 'View',
        onClick: () => window.open('https://solscan.io/tx/...')
    }
});

// Custom toast
const toast = new UIToast({
    message: 'Custom notification',
    type: 'info',
    duration: 3000,
    persistent: false,
    action: null
});
toast.show();
```

### 7. Skeleton (`src/components/ui/Skeleton.js`)

Loading placeholder component with shimmer animation.

**Features:**
- Types: text, card, list
- Shimmer animation
- Customizable count for lists
- Smooth transition to real content

**Usage:**
```javascript
import UISkeleton from './components/ui/Skeleton.js';

// Text skeleton
const textSkeleton = new UISkeleton({ type: 'text' });
container.appendChild(textSkeleton.render());

// Card skeleton
const cardSkeleton = new UISkeleton({ type: 'card' });
container.appendChild(cardSkeleton.render());

// List skeleton
const listSkeleton = new UISkeleton({ type: 'list', count: 5 });
container.appendChild(listSkeleton.render());
```

### 8. Badge (`src/components/ui/Badge.js`)

Small label component for status, rarity, or categories.

**Features:**
- Variants: default, success, error, warning, info
- Rarity variants: common, uncommon, rare, epic, legendary
- Size variants: sm, md
- Custom colors

**Usage:**
```javascript
import UIBadge from './components/ui/Badge.js';

// Status badge
const badge = new UIBadge({
    text: 'NEW',
    variant: 'success',
    size: 'md'
});
container.appendChild(badge.render());

// Rarity badge
const rarityBadge = new UIBadge({
    text: 'LEGENDARY',
    rarity: 'legendary'
});
container.appendChild(rarityBadge.render());
```

## Page-Specific Components

### Shop Page

#### ShopTabs (`src/components/shop/ShopTabs.js`)
- Tab navigation for shop sections
- Integrates with UITabs component
- Sections: All Items, Skins, Power-ups, Packs, Inventory

#### ItemGrid (`src/components/shop/ItemGrid.js`)
- Grid layout for shop items
- Item cards with rarity borders
- Purchase buttons
- Responsive (1-4 columns based on screen size)

#### ItemFilters (`src/components/shop/ItemFilters.js`)
- Search, rarity filter, and sort controls
- Integrates SearchBar, Badge, and Button components
- Real-time filtering

### Profile Page

#### ProfileStats (`src/components/profile/ProfileStats.js`)
- Player statistics display
- Animated number counting
- Progress bars
- Stats cards layout

#### ProfileSettings (`src/components/profile/ProfileSettings.js`)
- Email and password change forms
- Validation and error handling
- Integration with Supabase auth
- Toast notifications for feedback

### Ranking Page

#### RankingList (`src/components/ranking/RankingList.js`)
- Leaderboard display
- Skeleton loading states
- Position indicators (top 3 with icons)
- User highlighting
- Refresh functionality

#### PlayerCard (`src/components/ranking/PlayerCard.js`)
- Current player stats card
- Rank display
- Score and achievements

## Accessibility Features

All components include:

1. **Keyboard Navigation**
   - Tab order follows visual hierarchy
   - Focus indicators with `:focus-visible`
   - Arrow key navigation for tabs
   - ESC key to close modals and dialogs

2. **ARIA Attributes**
   - `role` attributes for semantic structure
   - `aria-label` for icon buttons
   - `aria-selected` for tabs
   - `aria-modal` for dialogs
   - `aria-controls` and `aria-labelledby` for relationships

3. **Focus Management**
   - Focus trap in modals
   - Focus restoration on close
   - Visible focus indicators (gold outline)
   - Skip to content links where appropriate

4. **Reduced Motion**
   - Respects `prefers-reduced-motion` media query
   - Animations disabled for users who prefer reduced motion

## Responsive Design

All components and pages are responsive with breakpoints:

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: < 768px

Key responsive features:
- Touch-friendly target sizes (minimum 44px)
- No horizontal scroll
- Stacking layouts on mobile
- Readable text at all sizes

## Performance Considerations

- Lazy loading for images
- Debounced search inputs
- Efficient skeleton loading states
- Minimal repaints and reflows
- CSS animations (GPU-accelerated)

## Testing

Components have been tested for:
- Cross-page navigation
- State persistence
- Loading states
- Error handling
- Responsive behavior
- Keyboard accessibility
- Screen reader compatibility

## Future Improvements

Potential enhancements from Task 21 findings:

1. Token Bridge improvements:
   - Integrate Modal component (replace native confirm)
   - Integrate Toast component (replace status div)
   - Add MAX button for balance input
   - Create BalanceCard component
   - Create TransactionList component

2. General enhancements:
   - Page transition animations
   - Minimum skeleton display time
   - Loading states for navigation buttons
   - E2E test automation with Playwright/Cypress

## Support

For questions or issues with these components, refer to:
- Design system: `/src/styles/design-system.css`
- Component source: `/src/components/ui/`
- Page implementations: `/src/pages/`
- Test files: `/src/test/`
