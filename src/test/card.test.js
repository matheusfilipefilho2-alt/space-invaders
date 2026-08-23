/**
 * Card Component Tests
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import Card component
const UICard = require('../components/ui/Card.js').default;

// Test suite
console.log('Testing UICard Component...\n');

// Test 1: Basic card creation
console.log('Test 1: Basic card creation');
try {
    const card = new UICard({
        title: 'Test Card',
        description: 'This is a test card'
    });
    const element = card.render();
    console.assert(element.className.includes('ui-card'), 'Card has correct className');
    console.assert(element.className.includes('ui-card--item'), 'Card has default variant');
    console.log('✓ PASS: Basic card creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic card creation', error.message, '\n');
}

// Test 2: Card with rarity
console.log('Test 2: Card with rarity');
try {
    const card = new UICard({
        title: 'Legendary Item',
        rarity: 'legendary'
    });
    const element = card.render();
    console.assert(element.className.includes('ui-card--rarity-legendary'), 'Card has rarity class');
    console.log('✓ PASS: Card with rarity\n');
} catch (error) {
    console.error('✗ FAIL: Card with rarity', error.message, '\n');
}

// Test 3: Card with image
console.log('Test 3: Card with image');
try {
    const card = new UICard({
        title: 'Item with Image',
        image: 'https://example.com/image.png'
    });
    const element = card.render();
    const img = element.querySelector('img');
    console.assert(img !== null, 'Card contains image element');
    console.assert(img.src === 'https://example.com/image.png', 'Image has correct src');
    console.assert(img.className === 'ui-card__image', 'Image has correct className');
    console.assert(img.loading === 'lazy', 'Image has lazy loading');
    console.log('✓ PASS: Card with image\n');
} catch (error) {
    console.error('✗ FAIL: Card with image', error.message, '\n');
}

// Test 4: Card with onClick handler
console.log('Test 4: Card with onClick handler');
try {
    let clicked = false;
    const card = new UICard({
        title: 'Clickable Card',
        onClick: (data) => {
            clicked = true;
        }
    });
    const element = card.render();
    console.assert(element.style.cursor === 'pointer', 'Card has pointer cursor');
    // Simulate click
    element.click();
    console.assert(clicked === true, 'onClick handler is called');
    console.log('✓ PASS: Card with onClick handler\n');
} catch (error) {
    console.error('✗ FAIL: Card with onClick handler', error.message, '\n');
}

// Test 5: Card with custom data
console.log('Test 5: Card with custom data');
try {
    let receivedData = null;
    const customData = { id: 123, value: 'test' };
    const card = new UICard({
        title: 'Card with Data',
        data: customData,
        onClick: (data) => {
            receivedData = data;
        }
    });
    const element = card.render();
    element.click();
    console.assert(receivedData === customData, 'Custom data is passed to handler');
    console.log('✓ PASS: Card with custom data\n');
} catch (error) {
    console.error('✗ FAIL: Card with custom data', error.message, '\n');
}

// Test 6: Card with all variants
console.log('Test 6: Card with all variants');
try {
    const variants = ['item', 'player', 'transaction', 'balance'];
    variants.forEach(variant => {
        const card = new UICard({ variant });
        const element = card.render();
        console.assert(element.className.includes(`ui-card--${variant}`), `Card has ${variant} variant class`);
    });
    console.log('✓ PASS: Card with all variants\n');
} catch (error) {
    console.error('✗ FAIL: Card with all variants', error.message, '\n');
}

// Test 7: Card with all rarities
console.log('Test 7: Card with all rarities');
try {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    rarities.forEach(rarity => {
        const card = new UICard({ rarity });
        const element = card.render();
        console.assert(element.className.includes(`ui-card--rarity-${rarity}`), `Card has ${rarity} rarity class`);
    });
    console.log('✓ PASS: Card with all rarities\n');
} catch (error) {
    console.error('✗ FAIL: Card with all rarities', error.message, '\n');
}

// Test 8: Card content structure
console.log('Test 8: Card content structure');
try {
    const card = new UICard({
        title: 'Full Card',
        description: 'Complete card with all elements'
    });
    const element = card.render();
    const content = element.querySelector('.ui-card__content');
    const title = element.querySelector('.ui-card__title');
    const description = element.querySelector('.ui-card__description');

    console.assert(content !== null, 'Card has content container');
    console.assert(title !== null, 'Card has title element');
    console.assert(description !== null, 'Card has description element');
    console.assert(title.textContent === 'Full Card', 'Title has correct content');
    console.assert(description.textContent === 'Complete card with all elements', 'Description has correct content');
    console.log('✓ PASS: Card content structure\n');
} catch (error) {
    console.error('✗ FAIL: Card content structure', error.message, '\n');
}

console.log('Card Component Tests Complete!');
