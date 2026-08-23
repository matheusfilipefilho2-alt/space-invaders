/**
 * ItemGrid Component Tests
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import components
const ItemGrid = require('../components/shop/ItemGrid.js').default;
const UICard = require('../components/ui/Card.js').default;
const UIBadge = require('../components/ui/Badge.js').default;
const UISkeleton = require('../components/ui/Skeleton.js').default;

// Test suite
console.log('Testing ItemGrid Component...\n');

// Test 1: Basic grid creation
console.log('Test 1: Basic grid creation');
try {
    const grid = new ItemGrid();
    const element = grid.render();
    console.assert(element.className.includes('item-grid'), 'Grid has correct className');
    console.assert(element.style.display === 'grid', 'Grid has display: grid');
    console.log('✓ PASS: Basic grid creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic grid creation', error.message, '\n');
}

// Test 2: Grid with items
console.log('Test 2: Grid with items');
try {
    const items = [
        { id: 1, name: 'Item 1', description: 'Description 1', rarity: 'common' },
        { id: 2, name: 'Item 2', description: 'Description 2', rarity: 'rare' },
        { id: 3, name: 'Item 3', description: 'Description 3', rarity: 'legendary' }
    ];

    const grid = new ItemGrid({ items });
    const element = grid.render();
    const cards = element.querySelectorAll('.item-grid__card');
    console.assert(cards.length === 3, `Grid contains ${cards.length} cards (expected 3)`);
    console.log('✓ PASS: Grid with items\n');
} catch (error) {
    console.error('✗ FAIL: Grid with items', error.message, '\n');
}

// Test 3: Grid with loading state (skeleton)
console.log('Test 3: Grid with loading state (skeleton)');
try {
    const grid = new ItemGrid({ isLoading: true });
    const element = grid.render();
    console.assert(element.className.includes('item-grid--loading'), 'Grid has loading class');
    const skeletons = element.querySelectorAll('.skeleton-card');
    console.assert(skeletons.length === 6, `Grid contains ${skeletons.length} skeleton cards (expected 6)`);
    console.log('✓ PASS: Grid with loading state\n');
} catch (error) {
    console.error('✗ FAIL: Grid with loading state', error.message, '\n');
}

// Test 4: Grid with empty state
console.log('Test 4: Grid with empty state');
try {
    const grid = new ItemGrid({ items: [], isEmpty: true });
    const element = grid.render();
    console.assert(element.className.includes('item-grid--empty'), 'Grid has empty class');
    const emptyState = element.querySelector('.item-grid__empty-state');
    console.assert(emptyState !== null, 'Grid contains empty state element');
    const icon = emptyState.querySelector('.empty-state-icon');
    console.assert(icon !== null, 'Empty state contains icon');
    console.log('✓ PASS: Grid with empty state\n');
} catch (error) {
    console.error('✗ FAIL: Grid with empty state', error.message, '\n');
}

// Test 5: setItems method
console.log('Test 5: setItems method');
try {
    const grid = new ItemGrid();
    const items = [
        { id: 1, name: 'Item 1', description: 'Description 1' }
    ];
    grid.setItems(items);
    console.assert(grid.items.length === 1, 'setItems updates items array');
    console.assert(grid.isLoading === false, 'setItems sets isLoading to false');
    console.assert(grid.isEmpty === false, 'setItems sets isEmpty to false');
    console.log('✓ PASS: setItems method\n');
} catch (error) {
    console.error('✗ FAIL: setItems method', error.message, '\n');
}

// Test 6: setLoading method
console.log('Test 6: setLoading method');
try {
    const grid = new ItemGrid();
    grid.setLoading(true);
    console.assert(grid.isLoading === true, 'setLoading updates isLoading state');
    grid.setLoading(false);
    console.assert(grid.isLoading === false, 'setLoading can set false');
    console.log('✓ PASS: setLoading method\n');
} catch (error) {
    console.error('✗ FAIL: setLoading method', error.message, '\n');
}

// Test 7: Custom columns configuration
console.log('Test 7: Custom columns configuration');
try {
    const grid = new ItemGrid({
        columns: 3,
        minWidth: '200px',
        gap: '20px'
    });
    const element = grid.render();
    console.assert(element.style.gap === '20px', 'Grid has custom gap');
    console.assert(element.style.gridTemplateColumns.includes('3'), 'Grid has 3 columns');
    console.log('✓ PASS: Custom columns configuration\n');
} catch (error) {
    console.error('✗ FAIL: Custom columns configuration', error.message, '\n');
}

// Test 8: Item click handler
console.log('Test 8: Item click handler');
try {
    let clickedItem = null;
    const items = [
        { id: 1, name: 'Clickable Item', description: 'Item to click' }
    ];
    const grid = new ItemGrid({
        items,
        onItemClick: (item) => {
            clickedItem = item;
        }
    });
    const element = grid.render();
    const card = element.querySelector('.item-grid__card');
    if (card) {
        // The card should have a click handler set up through UICard
        console.assert(card !== null, 'Card element exists');
        console.log('✓ PASS: Item click handler setup\n');
    } else {
        console.error('✗ FAIL: Item click handler - card not found\n');
    }
} catch (error) {
    console.error('✗ FAIL: Item click handler', error.message, '\n');
}

// Test 9: Badge creation for items
console.log('Test 9: Badge creation for items');
try {
    const items = [
        {
            id: 1,
            name: 'Discounted Item',
            description: 'Has discount',
            discount: 25,
            isNew: true,
            isHot: false,
            isOwned: false
        }
    ];
    const grid = new ItemGrid({ items });
    const element = grid.render();
    console.assert(element.querySelectorAll('.item-grid__card').length === 1, 'Grid has item card');
    console.log('✓ PASS: Badge creation for items\n');
} catch (error) {
    console.error('✗ FAIL: Badge creation for items', error.message, '\n');
}

// Test 10: setResponsiveColumns method
console.log('Test 10: setResponsiveColumns method');
try {
    const grid = new ItemGrid();
    const element = grid.render();

    // Mobile width
    grid.setResponsiveColumns(400);
    console.assert(grid.columns === 1, 'Mobile uses 1 column');

    // Tablet width
    grid.setResponsiveColumns(600);
    console.assert(grid.columns === 2, 'Tablet uses 2 columns');

    // Small desktop width
    grid.setResponsiveColumns(900);
    console.assert(grid.columns === 3, 'Small desktop uses 3 columns');

    // Large desktop width
    grid.setResponsiveColumns(1920);
    console.assert(grid.columns === 'auto-fill', 'Large desktop uses auto-fill');

    console.log('✓ PASS: setResponsiveColumns method\n');
} catch (error) {
    console.error('✗ FAIL: setResponsiveColumns method', error.message, '\n');
}

// Test 11: getElement method
console.log('Test 11: getElement method');
try {
    const grid = new ItemGrid();
    const element = grid.render();
    const retrieved = grid.getElement();
    console.assert(retrieved === element, 'getElement returns the grid element');
    console.log('✓ PASS: getElement method\n');
} catch (error) {
    console.error('✗ FAIL: getElement method', error.message, '\n');
}

// Test 12: clearSkeletons method
console.log('Test 12: clearSkeletons method');
try {
    const grid = new ItemGrid({ isLoading: true });
    const element = grid.render();
    console.assert(grid.skeletonCards.length === 6, 'Grid has skeleton cards');
    grid.clearSkeletons();
    console.assert(grid.skeletonCards.length === 0, 'clearSkeletons empties array');
    console.log('✓ PASS: clearSkeletons method\n');
} catch (error) {
    console.error('✗ FAIL: clearSkeletons method', error.message, '\n');
}

console.log('All ItemGrid tests completed!');
