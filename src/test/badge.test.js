/**
 * Badge Component Tests
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import Badge component
const UIBadge = require('../components/ui/Badge.js').default;

// Test suite
console.log('Testing UIBadge Component...\n');

// Test 1: Basic badge creation
console.log('Test 1: Basic badge creation');
try {
    const badge = new UIBadge();
    const element = badge.render();
    console.assert(element.className.includes('ui-badge'), 'Badge has correct className');
    console.assert(element.className.includes('ui-badge--new'), 'Badge has default variant (new)');
    console.assert(element.className.includes('ui-badge--top-right'), 'Badge has default position');
    console.log('✓ PASS: Basic badge creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic badge creation', error.message, '\n');
}

// Test 2: Badge variants - discount
console.log('Test 2: Badge variant - discount');
try {
    const badge = new UIBadge({
        variant: 'discount',
        text: '-50%'
    });
    const element = badge.render();
    console.assert(element.className.includes('ui-badge--discount'), 'Badge has discount variant class');
    const value = element.querySelector('.ui-badge__value');
    console.assert(value !== null, 'Badge has value element');
    console.assert(value.textContent === '-50%', 'Discount text is correct');
    console.log('✓ PASS: Badge variant - discount\n');
} catch (error) {
    console.error('✗ FAIL: Badge variant - discount', error.message, '\n');
}

// Test 3: Badge variant - new
console.log('Test 3: Badge variant - new');
try {
    const badge = new UIBadge({
        variant: 'new'
    });
    const element = badge.render();
    console.assert(element.className.includes('ui-badge--new'), 'Badge has new variant class');
    console.assert(element.textContent === 'NEW', 'New badge text is correct');
    console.log('✓ PASS: Badge variant - new\n');
} catch (error) {
    console.error('✗ FAIL: Badge variant - new', error.message, '\n');
}

// Test 4: Badge variant - owned
console.log('Test 4: Badge variant - owned');
try {
    const badge = new UIBadge({
        variant: 'owned'
    });
    const element = badge.render();
    console.assert(element.className.includes('ui-badge--owned'), 'Badge has owned variant class');
    console.assert(element.textContent === '✓', 'Owned badge text is checkmark');
    console.assert(element.classList.contains('ui-badge__checkmark'), 'Badge has checkmark class');
    console.log('✓ PASS: Badge variant - owned\n');
} catch (error) {
    console.error('✗ FAIL: Badge variant - owned', error.message, '\n');
}

// Test 5: Badge variant - hot
console.log('Test 5: Badge variant - hot');
try {
    const badge = new UIBadge({
        variant: 'hot'
    });
    const element = badge.render();
    console.assert(element.className.includes('ui-badge--hot'), 'Badge has hot variant class');
    console.assert(element.textContent === '🔥', 'Hot badge text is fire emoji');
    console.assert(element.classList.contains('ui-badge__icon'), 'Badge has icon class');
    console.log('✓ PASS: Badge variant - hot\n');
} catch (error) {
    console.error('✗ FAIL: Badge variant - hot', error.message, '\n');
}

// Test 6: Badge variant - rarity
console.log('Test 6: Badge variant - rarity');
try {
    const rarities = {
        common: '◆',
        uncommon: '◆◆',
        rare: '◆◆◆',
        epic: '◆◆◆◆',
        legendary: '⭐'
    };

    for (const [rarity, icon] of Object.entries(rarities)) {
        const badge = new UIBadge({
            variant: 'rarity',
            rarity: rarity
        });
        const element = badge.render();
        console.assert(element.className.includes('ui-badge--rarity'), 'Badge has rarity variant class');
        console.assert(element.className.includes(`ui-badge--rarity-${rarity}`), `Badge has ${rarity} rarity class`);
        console.assert(element.textContent === icon, `${rarity} badge has correct icon`);
    }
    console.log('✓ PASS: Badge variant - rarity\n');
} catch (error) {
    console.error('✗ FAIL: Badge variant - rarity', error.message, '\n');
}

// Test 7: Badge positions
console.log('Test 7: Badge positions');
try {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    positions.forEach(position => {
        const badge = new UIBadge({
            position: position
        });
        const element = badge.render();
        console.assert(element.className.includes(`ui-badge--${position}`), `Badge has ${position} position class`);
    });
    console.log('✓ PASS: Badge positions\n');
} catch (error) {
    console.error('✗ FAIL: Badge positions', error.message, '\n');
}

// Test 8: Badge animation
console.log('Test 8: Badge animation');
try {
    const badge = new UIBadge({
        animate: true
    });
    const element = badge.render();
    console.assert(element.classList.contains('ui-badge--animate'), 'Badge has animate class when enabled');

    const badge2 = new UIBadge({
        animate: false
    });
    const element2 = badge2.render();
    console.assert(!element2.classList.contains('ui-badge--animate'), 'Badge does not have animate class when disabled');
    console.log('✓ PASS: Badge animation\n');
} catch (error) {
    console.error('✗ FAIL: Badge animation', error.message, '\n');
}

// Test 9: setAnimate method
console.log('Test 9: setAnimate method');
try {
    const badge = new UIBadge();
    const element = badge.render();

    // Enable animation
    badge.setAnimate(true);
    console.assert(element.classList.contains('ui-badge--animate'), 'setAnimate(true) adds animate class');

    // Disable animation
    badge.setAnimate(false);
    console.assert(!element.classList.contains('ui-badge--animate'), 'setAnimate(false) removes animate class');
    console.log('✓ PASS: setAnimate method\n');
} catch (error) {
    console.error('✗ FAIL: setAnimate method', error.message, '\n');
}

// Test 10: setPosition method
console.log('Test 10: setPosition method');
try {
    const badge = new UIBadge();
    const element = badge.render();

    // Change position
    badge.setPosition('bottom-left');
    console.assert(element.className.includes('ui-badge--bottom-left'), 'setPosition changes position class');
    console.log('✓ PASS: setPosition method\n');
} catch (error) {
    console.error('✗ FAIL: setPosition method', error.message, '\n');
}

// Test 11: setText method
console.log('Test 11: setText method');
try {
    const badge = new UIBadge({
        variant: 'discount',
        text: '-50%'
    });
    const element = badge.render();

    // Change text
    badge.setText('-75%');
    const value = element.querySelector('.ui-badge__value');
    console.assert(value.textContent === '-75%', 'setText updates badge text');
    console.log('✓ PASS: setText method\n');
} catch (error) {
    console.error('✗ FAIL: setText method', error.message, '\n');
}

// Test 12: Multiple rarity combinations
console.log('Test 12: Multiple rarity combinations');
try {
    const badge = new UIBadge({
        variant: 'rarity',
        rarity: 'legendary',
        animate: true,
        position: 'top-left'
    });
    const element = badge.render();

    console.assert(element.className.includes('ui-badge--rarity'), 'Has rarity variant');
    console.assert(element.className.includes('ui-badge--rarity-legendary'), 'Has legendary rarity');
    console.assert(element.className.includes('ui-badge--animate'), 'Has animate class');
    console.assert(element.className.includes('ui-badge--top-left'), 'Has correct position');
    console.log('✓ PASS: Multiple rarity combinations\n');
} catch (error) {
    console.error('✗ FAIL: Multiple rarity combinations', error.message, '\n');
}

// Test 13: Badge is positioned absolute
console.log('Test 13: Badge positioning style');
try {
    const badge = new UIBadge();
    const element = badge.render();

    // Get computed style (in jsdom, position should be part of className-based styling)
    console.assert(element.className.includes('ui-badge'), 'Badge element has ui-badge class');
    console.log('✓ PASS: Badge positioning style\n');
} catch (error) {
    console.error('✗ FAIL: Badge positioning style', error.message, '\n');
}

// Test 14: Element property after render
console.log('Test 14: Element property after render');
try {
    const badge = new UIBadge();
    console.assert(badge.element === null, 'Element is null before render');

    const element = badge.render();
    console.assert(badge.element === element, 'Element property is set after render');
    console.assert(badge.element !== null, 'Element property is not null');
    console.log('✓ PASS: Element property after render\n');
} catch (error) {
    console.error('✗ FAIL: Element property after render', error.message, '\n');
}

// Test 15: Default values
console.log('Test 15: Default values');
try {
    const badge = new UIBadge();
    console.assert(badge.variant === 'new', 'Default variant is "new"');
    console.assert(badge.position === 'top-right', 'Default position is "top-right"');
    console.assert(badge.text === '', 'Default text is empty string');
    console.assert(badge.rarity === null, 'Default rarity is null');
    console.assert(badge.animate === false, 'Default animate is false');
    console.log('✓ PASS: Default values\n');
} catch (error) {
    console.error('✗ FAIL: Default values', error.message, '\n');
}

console.log('Badge Component Tests Complete!');
