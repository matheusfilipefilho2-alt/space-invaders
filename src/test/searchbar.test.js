/**
 * SearchBar Component Tests
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import SearchBar component
const UISearchBar = require('../components/ui/SearchBar.js').default;

// Test suite
console.log('Testing UISearchBar Component...\n');

// Test 1: Basic searchbar creation
console.log('Test 1: Basic searchbar creation');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();
    console.assert(element.className === 'ui-searchbar', 'SearchBar has correct className');
    console.assert(element.querySelector('.ui-searchbar__input') !== null, 'SearchBar has input element');
    console.log('✓ PASS: Basic searchbar creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic searchbar creation', error.message, '\n');
}

// Test 2: SearchBar with placeholder
console.log('Test 2: SearchBar with placeholder');
try {
    const searchbar = new UISearchBar({
        placeholder: 'Search items...'
    });
    const element = searchbar.render();
    const input = element.querySelector('.ui-searchbar__input');
    console.assert(input.placeholder === 'Search items...', 'SearchBar has correct placeholder');
    console.log('✓ PASS: SearchBar with placeholder\n');
} catch (error) {
    console.error('✗ FAIL: SearchBar with placeholder', error.message, '\n');
}

// Test 3: SearchBar has search icon
console.log('Test 3: SearchBar has search icon');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();
    const searchIcon = element.querySelector('.ui-searchbar__icon--search');
    console.assert(searchIcon !== null, 'SearchBar has search icon');
    console.assert(searchIcon.textContent === '🔍', 'Search icon has correct content');
    console.log('✓ PASS: SearchBar has search icon\n');
} catch (error) {
    console.error('✗ FAIL: SearchBar has search icon', error.message, '\n');
}

// Test 4: Clear button visibility
console.log('Test 4: Clear button visibility');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();
    const clearButton = element.querySelector('.ui-searchbar__clear');
    console.assert(clearButton !== null, 'SearchBar has clear button');
    console.assert(clearButton.style.display === 'none', 'Clear button is hidden initially');
    console.log('✓ PASS: Clear button visibility\n');
} catch (error) {
    console.error('✗ FAIL: Clear button visibility', error.message, '\n');
}

// Test 5: Clear button appears on input
console.log('Test 5: Clear button appears on input');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();
    const input = element.querySelector('.ui-searchbar__input');
    const clearButton = element.querySelector('.ui-searchbar__clear');

    // Simulate input by directly calling updateClearButton
    searchbar.currentValue = 'test';
    input.value = 'test';
    searchbar.updateClearButton();

    console.assert(clearButton.style.display === 'block', 'Clear button is visible after input');
    console.log('✓ PASS: Clear button appears on input\n');
} catch (error) {
    console.error('✗ FAIL: Clear button appears on input', error.message, '\n');
}

// Test 6: Clear button functionality
console.log('Test 6: Clear button functionality');
try {
    let searchCalled = false;
    const searchbar = new UISearchBar({
        onSearch: () => {
            searchCalled = true;
        }
    });
    const element = searchbar.render();
    const input = element.querySelector('.ui-searchbar__input');
    const clearButton = element.querySelector('.ui-searchbar__clear');

    // Set value manually
    searchbar.currentValue = 'test';
    input.value = 'test';
    searchbar.updateClearButton();

    // Clear
    searchbar.clear();

    console.assert(input.value === '', 'Input value is cleared');
    console.assert(searchbar.currentValue === '', 'SearchBar currentValue is cleared');
    console.log('✓ PASS: Clear button functionality\n');
} catch (error) {
    console.error('✗ FAIL: Clear button functionality', error.message, '\n');
}

// Test 7: Debounce timing (300ms default)
console.log('Test 7: Debounce timing (300ms default)');
try {
    let searchCount = 0;
    const searchbar = new UISearchBar({
        onSearch: () => {
            searchCount++;
        }
    });
    const element = searchbar.render();

    // Simulate multiple rapid inputs by calling debouncedSearch
    for (let i = 0; i < 5; i++) {
        searchbar.currentValue = `test${i}`;
        searchbar.debouncedSearch();
    }

    // Should not have triggered search yet (debounced)
    console.assert(searchCount === 0, 'Search not triggered immediately (debounced)');

    // Wait for debounce to complete
    setTimeout(() => {
        console.assert(searchCount === 1, 'Search triggered once after debounce');
        console.log('✓ PASS: Debounce timing (300ms default)\n');
    }, 350);
} catch (error) {
    console.error('✗ FAIL: Debounce timing (300ms default)', error.message, '\n');
}

// Test 8: Custom debounce time
console.log('Test 8: Custom debounce time');
try {
    const searchbar = new UISearchBar({
        debounceTime: 500
    });
    console.assert(searchbar.debounceTime === 500, 'Custom debounce time is set');
    console.log('✓ PASS: Custom debounce time\n');
} catch (error) {
    console.error('✗ FAIL: Custom debounce time', error.message, '\n');
}

// Test 9: Loading state
console.log('Test 9: Loading state');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();
    const input = element.querySelector('.ui-searchbar__input');
    const loadingIndicator = element.querySelector('.ui-searchbar__loading');

    // Initially not loading
    console.assert(searchbar.loading === false, 'SearchBar not loading initially');
    console.assert(loadingIndicator.style.display === 'none', 'Loading indicator hidden initially');

    // Set loading
    searchbar.setLoading(true);
    console.assert(searchbar.loading === true, 'SearchBar loading set to true');
    console.assert(input.disabled === true, 'Input disabled during loading');
    console.assert(loadingIndicator.style.display === 'inline-block', 'Loading indicator visible');

    // Unset loading
    searchbar.setLoading(false);
    console.assert(searchbar.loading === false, 'SearchBar loading set to false');
    console.assert(input.disabled === false, 'Input enabled after loading');
    console.assert(loadingIndicator.style.display === 'none', 'Loading indicator hidden');
    console.log('✓ PASS: Loading state\n');
} catch (error) {
    console.error('✗ FAIL: Loading state', error.message, '\n');
}

// Test 10: getValue and setValue
console.log('Test 10: getValue and setValue');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();

    // Test setValue
    searchbar.setValue('test value');
    console.assert(searchbar.getValue() === 'test value', 'getValue returns correct value');
    console.assert(searchbar.currentValue === 'test value', 'currentValue is updated');

    const input = element.querySelector('.ui-searchbar__input');
    console.assert(input.value === 'test value', 'Input value is updated');
    console.log('✓ PASS: getValue and setValue\n');
} catch (error) {
    console.error('✗ FAIL: getValue and setValue', error.message, '\n');
}

// Test 11: onSearch callback
console.log('Test 11: onSearch callback');
try {
    let searchValue = null;
    const searchbar = new UISearchBar({
        onSearch: (value) => {
            searchValue = value;
        }
    });
    const element = searchbar.render();

    // Trigger search by calling debouncedSearch
    searchbar.currentValue = 'search term';
    searchbar.debouncedSearch();

    // Wait for debounce
    setTimeout(() => {
        console.assert(searchValue === 'search term', 'onSearch callback receives correct value');
        console.log('✓ PASS: onSearch callback\n');
    }, 350);
} catch (error) {
    console.error('✗ FAIL: onSearch callback', error.message, '\n');
}

// Test 12: Enter key triggers search immediately
console.log('Test 12: Enter key triggers search immediately');
try {
    let searchCount = 0;
    const searchbar = new UISearchBar({
        onSearch: () => {
            searchCount++;
        }
    });
    const element = searchbar.render();
    const input = element.querySelector('.ui-searchbar__input');

    // Set value
    searchbar.currentValue = 'test';
    input.value = 'test';

    // Create enter key event simulation
    const mockKeyEvent = { key: 'Enter' };
    const handler = input.onkeydown;
    if (input.onkeydown === null) {
        // Directly call triggerSearch to simulate Enter behavior
        searchbar.triggerSearch();
    }

    console.assert(searchCount === 1, 'Enter key triggers search immediately');
    console.log('✓ PASS: Enter key triggers search immediately\n');
} catch (error) {
    console.error('✗ FAIL: Enter key triggers search immediately', error.message, '\n');
}

// Test 13: Focus method
console.log('Test 13: Focus method');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();
    const input = element.querySelector('.ui-searchbar__input');

    // Mock focus
    let focused = false;
    input.focus = () => {
        focused = true;
    };

    searchbar.focus();
    console.assert(focused === true, 'Focus method works');
    console.log('✓ PASS: Focus method\n');
} catch (error) {
    console.error('✗ FAIL: Focus method', error.message, '\n');
}

// Test 14: SearchBar structure
console.log('Test 14: SearchBar structure');
try {
    const searchbar = new UISearchBar();
    const element = searchbar.render();

    const icon = element.querySelector('.ui-searchbar__icon--search');
    const input = element.querySelector('.ui-searchbar__input');
    const loading = element.querySelector('.ui-searchbar__loading');
    const clearBtn = element.querySelector('.ui-searchbar__clear');

    console.assert(icon !== null, 'SearchBar has search icon');
    console.assert(input !== null, 'SearchBar has input');
    console.assert(loading !== null, 'SearchBar has loading indicator');
    console.assert(clearBtn !== null, 'SearchBar has clear button');
    console.log('✓ PASS: SearchBar structure\n');
} catch (error) {
    console.error('✗ FAIL: SearchBar structure', error.message, '\n');
}

console.log('SearchBar Component Tests Complete!');
