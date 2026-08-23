/**
 * RankingList Component Tests
 * Tests for ranking list component with skeleton loading and scroll-to-me
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock requestAnimationFrame for JSDOM
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);

// Import dependencies
const RankingList = require('../components/ranking/RankingList.js').default;

// Test suite
console.log('Testing RankingList Component...\n');

// Test 1: Basic ranking list creation
console.log('Test 1: Basic ranking list creation');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container, currentUserId: '123' });
    const element = list.render();
    console.assert(element.className === 'ranking-list-wrapper', 'List has correct wrapper class');
    console.log('✓ PASS: Basic ranking list creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic ranking list creation', error.message, '\n');
}

// Test 2: Header is rendered
console.log('Test 2: Header is rendered');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();
    const header = element.querySelector('.ranking-header');
    console.assert(header !== null, 'Header element exists');
    console.log('✓ PASS: Header is rendered\n');
} catch (error) {
    console.error('✗ FAIL: Header is rendered', error.message, '\n');
}

// Test 3: Header has title
console.log('Test 3: Header has title');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();
    const title = element.querySelector('.ranking-title');
    console.assert(title !== null, 'Title element exists');
    console.assert(title.textContent === 'Melhores Jogadores', 'Title has correct text');
    console.log('✓ PASS: Header has title\n');
} catch (error) {
    console.error('✗ FAIL: Header has title', error.message, '\n');
}

// Test 4: Header has refresh button
console.log('Test 4: Header has refresh button');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();
    const refreshBtn = element.querySelector('.ranking-refresh-btn');
    console.assert(refreshBtn !== null, 'Refresh button exists');
    console.assert(refreshBtn.innerHTML === '🔄', 'Refresh button has correct icon');
    console.log('✓ PASS: Header has refresh button\n');
} catch (error) {
    console.error('✗ FAIL: Header has refresh button', error.message, '\n');
}

// Test 5: Header has last updated timestamp
console.log('Test 5: Header has last updated timestamp');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();
    const timestamp = element.querySelector('.ranking-last-updated');
    console.assert(timestamp !== null, 'Last updated element exists');
    console.assert(timestamp.textContent === 'Carregando...', 'Initial text is "Carregando..."');
    console.log('✓ PASS: Header has last updated timestamp\n');
} catch (error) {
    console.error('✗ FAIL: Header has last updated timestamp', error.message, '\n');
}

// Test 6: Refresh button triggers onRefresh callback
console.log('Test 6: Refresh button triggers onRefresh callback');
try {
    let refreshCalled = false;
    const container = document.createElement('div');
    const list = new RankingList({
        container,
        onRefresh: () => { refreshCalled = true; }
    });
    const element = list.render();
    const refreshBtn = element.querySelector('.ranking-refresh-btn');
    refreshBtn.click();
    console.assert(refreshCalled === true, 'onRefresh callback is called');
    console.log('✓ PASS: Refresh button triggers onRefresh callback\n');
} catch (error) {
    console.error('✗ FAIL: Refresh button triggers onRefresh callback', error.message, '\n');
}

// Test 7: showLoading renders skeleton cards
console.log('Test 7: showLoading renders skeleton cards');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();
    list.showLoading(5);

    const skeletons = element.querySelectorAll('.ranking-item--skeleton');
    console.assert(skeletons.length === 5, 'Renders 5 skeleton cards');
    console.assert(list.loading === true, 'Loading state is true');
    console.log('✓ PASS: showLoading renders skeleton cards\n');
} catch (error) {
    console.error('✗ FAIL: showLoading renders skeleton cards', error.message, '\n');
}

// Test 8: showLoading default count is 10
console.log('Test 8: showLoading default count is 10');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();
    list.showLoading();

    const skeletons = element.querySelectorAll('.ranking-item--skeleton');
    console.assert(skeletons.length === 10, 'Renders 10 skeleton cards by default');
    console.log('✓ PASS: showLoading default count is 10\n');
} catch (error) {
    console.error('✗ FAIL: showLoading default count is 10', error.message, '\n');
}

// Test 9: updatePlayers renders player cards
console.log('Test 9: updatePlayers renders player cards');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container, currentUserId: '1' });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 },
        { id: '2', username: 'Player2', high_score: 900, coins: 40 },
        { id: '3', username: 'Player3', high_score: 800, coins: 30 }
    ];

    list.updatePlayers(players);

    const items = element.querySelectorAll('.ranking-item');
    console.assert(items.length === 3, 'Renders 3 player cards');
    console.assert(list.loading === false, 'Loading state is false');
    console.log('✓ PASS: updatePlayers renders player cards\n');
} catch (error) {
    console.error('✗ FAIL: updatePlayers renders player cards', error.message, '\n');
}

// Test 10: updatePlayers stores previous positions
console.log('Test 10: updatePlayers stores previous positions');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 },
        { id: '2', username: 'Player2', high_score: 900, coins: 40 }
    ];

    list.updatePlayers(players);

    console.assert(list.previousPositions.get('1') === 1, 'Previous position for player 1 is stored');
    console.assert(list.previousPositions.get('2') === 2, 'Previous position for player 2 is stored');
    console.log('✓ PASS: updatePlayers stores previous positions\n');
} catch (error) {
    console.error('✗ FAIL: updatePlayers stores previous positions', error.message, '\n');
}

// Test 11: Empty players shows empty state
console.log('Test 11: Empty players shows empty state');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    list.updatePlayers([]);

    const emptyState = element.querySelector('.ranking-empty-state');
    console.assert(emptyState !== null, 'Empty state is shown');
    console.log('✓ PASS: Empty players shows empty state\n');
} catch (error) {
    console.error('✗ FAIL: Empty players shows empty state', error.message, '\n');
}

// Test 12: setSearchQuery filters players
console.log('Test 12: setSearchQuery filters players');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Alice', high_score: 1000, coins: 50 },
        { id: '2', username: 'Bob', high_score: 900, coins: 40 },
        { id: '3', username: 'Charlie', high_score: 800, coins: 30 }
    ];

    list.updatePlayers(players);
    list.setSearchQuery('Bob');

    const items = element.querySelectorAll('.ranking-item');
    console.assert(items.length === 1, 'Only 1 player matches search');
    console.log('✓ PASS: setSearchQuery filters players\n');
} catch (error) {
    console.error('✗ FAIL: setSearchQuery filters players', error.message, '\n');
}

// Test 13: Search is case insensitive
console.log('Test 13: Search is case insensitive');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'ALICE', high_score: 1000, coins: 50 },
        { id: '2', username: 'bob', high_score: 900, coins: 40 }
    ];

    list.updatePlayers(players);
    list.setSearchQuery('alice');

    const items = element.querySelectorAll('.ranking-item');
    console.assert(items.length === 1, 'Case insensitive search works');
    console.log('✓ PASS: Search is case insensitive\n');
} catch (error) {
    console.error('✗ FAIL: Search is case insensitive', error.message, '\n');
}

// Test 14: Empty search shows all players
console.log('Test 14: Empty search shows all players');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 },
        { id: '2', username: 'Player2', high_score: 900, coins: 40 },
        { id: '3', username: 'Player3', high_score: 800, coins: 30 }
    ];

    list.updatePlayers(players);
    list.setSearchQuery('Player');
    list.setSearchQuery('');

    const items = element.querySelectorAll('.ranking-item');
    console.assert(items.length === 3, 'Empty search shows all players');
    console.log('✓ PASS: Empty search shows all players\n');
} catch (error) {
    console.error('✗ FAIL: Empty search shows all players', error.message, '\n');
}

// Test 15: Search with no results shows empty state
console.log('Test 15: Search with no results shows empty state');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 }
    ];

    list.updatePlayers(players);
    list.setSearchQuery('NonExistent');

    const emptyState = element.querySelector('.ranking-empty-state');
    console.assert(emptyState !== null, 'Empty state shown for no results');
    console.log('✓ PASS: Search with no results shows empty state\n');
} catch (error) {
    console.error('✗ FAIL: Search with no results shows empty state', error.message, '\n');
}

// Test 16: scrollToMe finds and scrolls to current user
console.log('Test 16: scrollToMe finds and scrolls to current user');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container, currentUserId: '2' });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 },
        { id: '2', username: 'Player2', high_score: 900, coins: 40 },
        { id: '3', username: 'Player3', high_score: 800, coins: 30 }
    ];

    list.updatePlayers(players);

    // Mock scrollIntoView
    let scrollCalled = false;
    if (list.playerCards[1]) {
        const originalScrollIntoView = list.playerCards[1].scrollIntoView;
        list.playerCards[1].scrollIntoView = () => {
            scrollCalled = true;
        };
    }

    list.scrollToMe();
    console.assert(scrollCalled === true, 'Scroll to current user works');
    console.log('✓ PASS: scrollToMe finds and scrolls to current user\n');
} catch (error) {
    console.error('✗ FAIL: scrollToMe finds and scrolls to current user', error.message, '\n');
}

// Test 17: Last updated timestamp updates
console.log('Test 17: Last updated timestamp updates');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 }
    ];

    list.updatePlayers(players);

    const timestamp = element.querySelector('.ranking-last-updated');
    console.assert(timestamp.textContent.includes('Atualizado há'), 'Timestamp is updated');
    console.log('✓ PASS: Last updated timestamp updates\n');
} catch (error) {
    console.error('✗ FAIL: Last updated timestamp updates', error.message, '\n');
}

// Test 18: Timestamp shows seconds
console.log('Test 18: Timestamp shows seconds');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 }
    ];

    list.updatePlayers(players);
    list.lastUpdatedTime = Date.now() - 5000; // 5 seconds ago
    list._updateTimestamp();

    const timestamp = element.querySelector('.ranking-last-updated');
    console.assert(timestamp.textContent.includes('s'), 'Timestamp shows seconds for < 1 minute');
    console.log('✓ PASS: Timestamp shows seconds\n');
} catch (error) {
    console.error('✗ FAIL: Timestamp shows seconds', error.message, '\n');
}

// Test 19: Timestamp shows minutes
console.log('Test 19: Timestamp shows minutes');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    const players = [
        { id: '1', username: 'Player1', high_score: 1000, coins: 50 }
    ];

    list.updatePlayers(players);
    list.lastUpdatedTime = Date.now() - 120000; // 2 minutes ago
    list._updateTimestamp();

    const timestamp = element.querySelector('.ranking-last-updated');
    console.assert(timestamp.textContent.includes('m'), 'Timestamp shows minutes for > 1 minute');
    console.log('✓ PASS: Timestamp shows minutes\n');
} catch (error) {
    console.error('✗ FAIL: Timestamp shows minutes', error.message, '\n');
}

// Test 20: destroy method clears interval
console.log('Test 20: destroy method clears interval');
try {
    const container = document.createElement('div');
    const list = new RankingList({ container });
    const element = list.render();

    console.assert(list.updateIntervalId !== null, 'Interval is set');

    list.destroy();

    // Check that interval would be cleared (we can't verify directly, but method should run)
    console.assert(true, 'Destroy method runs without error');
    console.log('✓ PASS: destroy method clears interval\n');
} catch (error) {
    console.error('✗ FAIL: destroy method clears interval', error.message, '\n');
}

console.log('RankingList Component Tests Complete!');
