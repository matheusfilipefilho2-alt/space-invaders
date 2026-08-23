/**
 * ItemFilters Component Tests
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import ItemFilters component
const ItemFilters = require('../components/shop/ItemFilters.js').default;

// Test suite
console.log('Testing ItemFilters Component...\n');

// Mock rarity configuration
const testRarities = {
    common: { name: 'Comum', color: '#9E9E9E' },
    uncommon: { name: 'Incomum', color: '#4CAF50' },
    rare: { name: 'Raro', color: '#2196F3' },
    epic: { name: 'Épico', color: '#9C27B0' },
    legendary: { name: 'Lendário', color: '#FF9800' }
};

// Mock items for testing
const mockItems = [
    {
        id: 'item1',
        name: 'Boost de Moedas',
        description: 'Dobra as moedas ganhas',
        rarity: 'common',
        price: 250
    },
    {
        id: 'item2',
        name: 'Nave Dourada',
        description: 'Nave com acabamento dourado',
        rarity: 'epic',
        price: 500
    },
    {
        id: 'item3',
        name: 'Shield Extra',
        description: 'Escudo adicional para proteção',
        rarity: 'uncommon',
        price: 150
    },
    {
        id: 'item4',
        name: 'Boost XP',
        description: 'Aumente sua experiência',
        rarity: 'rare',
        price: 400
    },
    {
        id: 'item5',
        name: 'Tema Neon',
        description: 'Interface com cores vibrantes',
        rarity: 'legendary',
        price: 1000
    }
];

// Test 1: Basic ItemFilters creation
console.log('Test 1: Basic ItemFilters creation');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    const element = filters.render();
    console.assert(
        element.className === 'item-filters',
        'ItemFilters has correct className'
    );
    console.assert(
        element.querySelector('.item-filters__search') !== null,
        'ItemFilters has search container'
    );
    console.assert(
        element.querySelector('.item-filters__rarity') !== null,
        'ItemFilters has rarity filter'
    );
    console.assert(
        element.querySelector('.item-filters__sort') !== null,
        'ItemFilters has sort filter'
    );
    console.log('✓ PASS: Basic ItemFilters creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic ItemFilters creation', error.message, '\n');
}

// Test 2: Search bar integration
console.log('Test 2: Search bar integration');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    const element = filters.render();
    const searchInput = element.querySelector('.ui-searchbar__input');
    console.assert(
        searchInput !== null,
        'ItemFilters has integrated search bar'
    );
    console.assert(
        searchInput.placeholder === 'Pesquisar itens...',
        'Search bar has correct placeholder'
    );
    console.log('✓ PASS: Search bar integration\n');
} catch (error) {
    console.error('✗ FAIL: Search bar integration', error.message, '\n');
}

// Test 3: Rarity dropdown options
console.log('Test 3: Rarity dropdown options');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    const element = filters.render();
    const rarityDropdown = element.querySelector('.item-filters__rarity-dropdown');

    // Check for "All rarities" option
    const allOption = Array.from(rarityDropdown.options).find(
        (opt) => opt.value === 'all'
    );
    console.assert(
        allOption !== undefined,
        'Rarity dropdown has "all" option'
    );

    // Check for individual rarity options
    const rarityOptions = Object.keys(testRarities);
    rarityOptions.forEach((rarity) => {
        const option = Array.from(rarityDropdown.options).find(
            (opt) => opt.value === rarity
        );
        console.assert(
            option !== undefined,
            `Rarity dropdown has ${rarity} option`
        );
    });

    console.log('✓ PASS: Rarity dropdown options\n');
} catch (error) {
    console.error('✗ FAIL: Rarity dropdown options', error.message, '\n');
}

// Test 4: Sort dropdown options
console.log('Test 4: Sort dropdown options');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    const element = filters.render();
    const sortDropdown = element.querySelector('.item-filters__sort-dropdown');

    const expectedOptions = [
        'price',
        'price_desc',
        'name',
        'name_desc',
        'rarity'
    ];
    expectedOptions.forEach((optionValue) => {
        const option = Array.from(sortDropdown.options).find(
            (opt) => opt.value === optionValue
        );
        console.assert(option !== undefined, `Sort dropdown has ${optionValue} option`);
    });

    console.log('✓ PASS: Sort dropdown options\n');
} catch (error) {
    console.error('✗ FAIL: Sort dropdown options', error.message, '\n');
}

// Test 5: Filter state management
console.log('Test 5: Filter state management');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    const state = filters.getFilterState();
    console.assert(
        state.searchQuery === '',
        'Initial search query is empty'
    );
    console.assert(
        state.selectedRarity === 'all',
        'Initial rarity is "all"'
    );
    console.assert(
        state.selectedSort === 'price',
        'Initial sort is "price"'
    );

    console.log('✓ PASS: Filter state management\n');
} catch (error) {
    console.error('✗ FAIL: Filter state management', error.message, '\n');
}

// Test 6: Search filtering
console.log('Test 6: Search filtering');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    // Search for "Boost"
    filters.searchQuery = 'boost';
    const filtered = filters.filterItems(mockItems);

    console.assert(
        filtered.length === 2,
        'Search filters correct number of items'
    );
    console.assert(
        filtered.every((item) =>
            item.name.toLowerCase().includes('boost')
        ),
        'All filtered items match search query'
    );

    console.log('✓ PASS: Search filtering\n');
} catch (error) {
    console.error('✗ FAIL: Search filtering', error.message, '\n');
}

// Test 7: Rarity filtering
console.log('Test 7: Rarity filtering');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    // Filter by rare items
    filters.selectedRarity = 'rare';
    const filtered = filters.filterItems(mockItems);

    console.assert(
        filtered.length === 1,
        'Rarity filter returns correct number of items'
    );
    console.assert(
        filtered[0].rarity === 'rare',
        'Filtered item has correct rarity'
    );

    console.log('✓ PASS: Rarity filtering\n');
} catch (error) {
    console.error('✗ FAIL: Rarity filtering', error.message, '\n');
}

// Test 8: Price sorting (ascending)
console.log('Test 8: Price sorting (ascending)');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    filters.selectedSort = 'price';
    const filtered = filters.filterItems(mockItems);

    const prices = filtered.map((item) => item.price);
    const isSorted = prices.every(
        (price, i) => i === 0 || price >= prices[i - 1]
    );

    console.assert(
        isSorted,
        'Items sorted by price ascending'
    );
    console.assert(
        filtered[0].price === 150,
        'Lowest price item is first'
    );

    console.log('✓ PASS: Price sorting (ascending)\n');
} catch (error) {
    console.error('✗ FAIL: Price sorting (ascending)', error.message, '\n');
}

// Test 9: Price sorting (descending)
console.log('Test 9: Price sorting (descending)');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    filters.selectedSort = 'price_desc';
    const filtered = filters.filterItems(mockItems);

    const prices = filtered.map((item) => item.price);
    const isSorted = prices.every(
        (price, i) => i === 0 || price <= prices[i - 1]
    );

    console.assert(
        isSorted,
        'Items sorted by price descending'
    );
    console.assert(
        filtered[0].price === 1000,
        'Highest price item is first'
    );

    console.log('✓ PASS: Price sorting (descending)\n');
} catch (error) {
    console.error('✗ FAIL: Price sorting (descending)', error.message, '\n');
}

// Test 10: Name sorting
console.log('Test 10: Name sorting');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    filters.selectedSort = 'name';
    const filtered = filters.filterItems(mockItems);

    const names = filtered.map((item) => item.name);
    const isSorted = names.every(
        (name, i) => i === 0 || name.localeCompare(names[i - 1]) >= 0
    );

    console.assert(
        isSorted,
        'Items sorted alphabetically by name'
    );

    console.log('✓ PASS: Name sorting\n');
} catch (error) {
    console.error('✗ FAIL: Name sorting', error.message, '\n');
}

// Test 11: Combined filtering (search + rarity)
console.log('Test 11: Combined filtering (search + rarity)');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    filters.searchQuery = 'boost';
    filters.selectedRarity = 'common';
    const filtered = filters.filterItems(mockItems);

    console.assert(
        filtered.length === 1,
        'Combined filters return correct results'
    );
    console.assert(
        filtered[0].id === 'item1',
        'Correct item matched by combined filters'
    );

    console.log('✓ PASS: Combined filtering (search + rarity)\n');
} catch (error) {
    console.error('✗ FAIL: Combined filtering (search + rarity)', error.message, '\n');
}

// Test 12: Reset filters
console.log('Test 12: Reset filters');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    // Set some filters
    filters.searchQuery = 'test';
    filters.selectedRarity = 'rare';
    filters.selectedSort = 'name';

    // Reset
    filters.reset();

    const state = filters.getFilterState();
    console.assert(
        state.searchQuery === '',
        'Reset clears search query'
    );
    console.assert(
        state.selectedRarity === 'all',
        'Reset restores rarity to all'
    );
    console.assert(
        state.selectedSort === 'price',
        'Reset restores sort to price'
    );

    console.log('✓ PASS: Reset filters\n');
} catch (error) {
    console.error('✗ FAIL: Reset filters', error.message, '\n');
}

// Test 13: Set filters programmatically
console.log('Test 13: Set filters programmatically');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    filters.setFilters({
        searchQuery: 'test',
        selectedRarity: 'epic',
        selectedSort: 'price_desc'
    });

    const state = filters.getFilterState();
    console.assert(
        state.searchQuery === 'test',
        'Programmatic set updates search query'
    );
    console.assert(
        state.selectedRarity === 'epic',
        'Programmatic set updates rarity'
    );
    console.assert(
        state.selectedSort === 'price_desc',
        'Programmatic set updates sort'
    );

    console.log('✓ PASS: Set filters programmatically\n');
} catch (error) {
    console.error('✗ FAIL: Set filters programmatically', error.message, '\n');
}

// Test 14: Callback on filter change
console.log('Test 14: Callback on filter change');
try {
    let callbackCalled = false;
    let callbackState = null;

    const filters = new ItemFilters({
        rarities: testRarities,
        onFiltersChange: (state) => {
            callbackCalled = true;
            callbackState = state;
        }
    });

    filters.render();
    filters.setFilters({ searchQuery: 'test' });

    console.assert(
        callbackCalled,
        'Callback is called on filter change'
    );
    console.assert(
        callbackState?.searchQuery === 'test',
        'Callback receives correct state'
    );

    console.log('✓ PASS: Callback on filter change\n');
} catch (error) {
    console.error('✗ FAIL: Callback on filter change', error.message, '\n');
}

// Test 15: Empty items array
console.log('Test 15: Empty items array');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    const filtered = filters.filterItems([]);
    console.assert(
        Array.isArray(filtered) && filtered.length === 0,
        'Empty items array returns empty result'
    );

    console.log('✓ PASS: Empty items array\n');
} catch (error) {
    console.error('✗ FAIL: Empty items array', error.message, '\n');
}

// Test 16: No search results
console.log('Test 16: No search results');
try {
    const filters = new ItemFilters({ rarities: testRarities });
    filters.render();

    filters.searchQuery = 'nonexistent';
    const filtered = filters.filterItems(mockItems);

    console.assert(
        filtered.length === 0,
        'No results returned for non-matching search'
    );

    console.log('✓ PASS: No search results\n');
} catch (error) {
    console.error('✗ FAIL: No search results', error.message, '\n');
}

console.log('ItemFilters Component Tests Complete!');
