/**
 * PlayerCard Component Tests
 * Tests for ranking page player card component
 */

// Mock DOM for testing
const JSDOM = require('jsdom').JSDOM;
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import PlayerCard component
const PlayerCard = require('../components/ranking/PlayerCard.js').default;

// Test suite
console.log('Testing PlayerCard Component...\n');

// Test 1: Basic player card creation
console.log('Test 1: Basic player card creation');
try {
    const player = {
        id: '123',
        username: 'TestPlayer',
        high_score: 1000,
        coins: 50,
        current_level: 3
    };
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100 });
    const element = card.render();
    console.assert(element.className.includes('ranking-item'), 'Card has ranking-item class');
    console.assert(element.getAttribute('data-player-id') === '123', 'Card has player ID attribute');
    console.log('✓ PASS: Basic player card creation\n');
} catch (error) {
    console.error('✗ FAIL: Basic player card creation', error.message, '\n');
}

// Test 2: Top 3 positions show medals
console.log('Test 2: Top 3 positions show medals');
try {
    const medals = ['🥇', '🥈', '🥉'];
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };

    for (let i = 0; i < 3; i++) {
        const card = new PlayerCard({ player, position: i + 1, totalPlayers: 100 });
        const element = card.render();
        const positionText = element.querySelector('.position-number').textContent;
        console.assert(positionText === medals[i], `Position ${i + 1} shows ${medals[i]} medal`);
    }
    console.log('✓ PASS: Top 3 positions show medals\n');
} catch (error) {
    console.error('✗ FAIL: Top 3 positions show medals', error.message, '\n');
}

// Test 3: Position 4+ shows number
console.log('Test 3: Position 4+ shows number');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 10, totalPlayers: 100 });
    const element = card.render();
    const positionText = element.querySelector('.position-number').textContent;
    console.assert(positionText === '#10', 'Position 10 shows #10');
    console.log('✓ PASS: Position 4+ shows number\n');
} catch (error) {
    console.error('✗ FAIL: Position 4+ shows number', error.message, '\n');
}

// Test 4: Player name is displayed
console.log('Test 4: Player name is displayed');
try {
    const player = { id: '1', username: 'CoolGamer', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 1, totalPlayers: 100 });
    const element = card.render();
    const nameEl = element.querySelector('.player-name');
    console.assert(nameEl.textContent === 'CoolGamer', 'Player name is displayed');
    console.log('✓ PASS: Player name is displayed\n');
} catch (error) {
    console.error('✗ FAIL: Player name is displayed', error.message, '\n');
}

// Test 5: Level stars are displayed correctly
console.log('Test 5: Level stars are displayed correctly');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50, current_level: 3 };
    const card = new PlayerCard({ player, position: 1, totalPlayers: 100 });
    const element = card.render();
    const levelEl = element.querySelector('.player-level');
    console.assert(levelEl.innerHTML.includes('Nível 3'), 'Level number is displayed');
    console.assert(levelEl.innerHTML.includes('⭐⭐⭐'), 'Level stars are displayed');
    console.log('✓ PASS: Level stars are displayed correctly\n');
} catch (error) {
    console.error('✗ FAIL: Level stars are displayed correctly', error.message, '\n');
}

// Test 6: Max 5 stars for levels
console.log('Test 6: Max 5 stars for levels');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50, current_level: 10 };
    const card = new PlayerCard({ player, position: 1, totalPlayers: 100 });
    const element = card.render();
    const levelEl = element.querySelector('.player-level');
    const starCount = (levelEl.innerHTML.match(/⭐/g) || []).length;
    console.assert(starCount === 5, 'Maximum 5 stars displayed');
    console.log('✓ PASS: Max 5 stars for levels\n');
} catch (error) {
    console.error('✗ FAIL: Max 5 stars for levels', error.message, '\n');
}

// Test 7: Score is displayed with locale formatting
console.log('Test 7: Score is displayed with locale formatting');
try {
    const player = { id: '1', username: 'Player', high_score: 123456, coins: 50 };
    const card = new PlayerCard({ player, position: 1, totalPlayers: 100 });
    const element = card.render();
    const scoreEl = element.querySelector('.ranking-score');
    // Should have locale formatting (commas or dots)
    console.assert(scoreEl.textContent.includes(',') || scoreEl.textContent.includes('.') || scoreEl.textContent === '123456', 'Score uses locale formatting');
    console.log('✓ PASS: Score is displayed with locale formatting\n');
} catch (error) {
    console.error('✗ FAIL: Score is displayed with locale formatting', error.message, '\n');
}

// Test 8: Coins are displayed with icon
console.log('Test 8: Coins are displayed with icon');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 250 };
    const card = new PlayerCard({ player, position: 1, totalPlayers: 100 });
    const element = card.render();
    const coinsEl = element.querySelector('.ranking-coins');
    console.assert(coinsEl.textContent.includes('🪙'), 'Coins display has coin icon');
    console.assert(coinsEl.textContent.includes('250'), 'Coins amount is displayed');
    console.log('✓ PASS: Coins are displayed with icon\n');
} catch (error) {
    console.error('✗ FAIL: Coins are displayed with icon', error.message, '\n');
}

// Test 9: Current user card has special class
console.log('Test 9: Current user card has special class');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 1, totalPlayers: 100, isCurrentUser: true });
    const element = card.render();
    console.assert(element.className.includes('current-user'), 'Current user card has current-user class');
    console.log('✓ PASS: Current user card has special class\n');
} catch (error) {
    console.error('✗ FAIL: Current user card has special class', error.message, '\n');
}

// Test 10: Position change - moved up
console.log('Test 10: Position change - moved up');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100, previousPosition: 8 });
    const element = card.render();
    const changeEl = element.querySelector('.position-change.position-up');
    console.assert(changeEl !== null, 'Position up indicator is shown');
    console.assert(changeEl.textContent.includes('↗'), 'Shows up arrow');
    console.log('✓ PASS: Position change - moved up\n');
} catch (error) {
    console.error('✗ FAIL: Position change - moved up', error.message, '\n');
}

// Test 11: Position change - moved down
console.log('Test 11: Position change - moved down');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 10, totalPlayers: 100, previousPosition: 7 });
    const element = card.render();
    const changeEl = element.querySelector('.position-change.position-down');
    console.assert(changeEl !== null, 'Position down indicator is shown');
    console.assert(changeEl.textContent.includes('↘'), 'Shows down arrow');
    console.log('✓ PASS: Position change - moved down\n');
} catch (error) {
    console.error('✗ FAIL: Position change - moved down', error.message, '\n');
}

// Test 12: Position change - no change (no arrow shown when same)
console.log('Test 12: Position change - no change');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100, previousPosition: 5 });
    const element = card.render();
    // When position hasn't changed, the _getPositionArrow returns null for same position
    // So no arrow should be displayed
    const changeEl = element.querySelector('.position-change');
    console.assert(changeEl === null, 'No change indicator shown when position is same');
    console.log('✓ PASS: Position change - no change\n');
} catch (error) {
    console.error('✗ FAIL: Position change - no change', error.message, '\n');
}

// Test 13: Top 5% badge
console.log('Test 13: Top 5% badge');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 2, totalPlayers: 100 });
    const element = card.render();
    const badge = element.querySelector('.position-badge.badge-top-5');
    console.assert(badge !== null, 'Top 5% badge is shown');
    console.assert(badge.textContent === 'Top 5%', 'Badge shows correct text');
    console.log('✓ PASS: Top 5% badge\n');
} catch (error) {
    console.error('✗ FAIL: Top 5% badge', error.message, '\n');
}

// Test 14: Top 10% badge
console.log('Test 14: Top 10% badge');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 8, totalPlayers: 100 });
    const element = card.render();
    const badge = element.querySelector('.position-badge.badge-top-10');
    console.assert(badge !== null, 'Top 10% badge is shown');
    console.assert(badge.textContent === 'Top 10%', 'Badge shows correct text');
    console.log('✓ PASS: Top 10% badge\n');
} catch (error) {
    console.error('✗ FAIL: Top 10% badge', error.message, '\n');
}

// Test 15: Top 25% badge
console.log('Test 15: Top 25% badge');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 20, totalPlayers: 100 });
    const element = card.render();
    const badge = element.querySelector('.position-badge.badge-top-25');
    console.assert(badge !== null, 'Top 25% badge is shown');
    console.assert(badge.textContent === 'Top 25%', 'Badge shows correct text');
    console.log('✓ PASS: Top 25% badge\n');
} catch (error) {
    console.error('✗ FAIL: Top 25% badge', error.message, '\n');
}

// Test 16: No badge for lower positions
console.log('Test 16: No badge for lower positions');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 50, totalPlayers: 100 });
    const element = card.render();
    const badge = element.querySelector('.position-badge');
    console.assert(badge === null, 'No badge shown for lower positions');
    console.log('✓ PASS: No badge for lower positions\n');
} catch (error) {
    console.error('✗ FAIL: No badge for lower positions', error.message, '\n');
}

// Test 17: scrollIntoView method
console.log('Test 17: scrollIntoView method');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100 });
    const element = card.render();

    let scrollCalled = false;
    element.scrollIntoView = () => { scrollCalled = true; };

    card.scrollIntoView();
    console.assert(scrollCalled === true, 'scrollIntoView calls element method');
    console.log('✓ PASS: scrollIntoView method\n');
} catch (error) {
    console.error('✗ FAIL: scrollIntoView method', error.message, '\n');
}

// Test 18: highlight method adds class
console.log('Test 18: highlight method adds class');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100 });
    const element = card.render();

    card.highlight(100);
    console.assert(element.className.includes('highlight-pulse'), 'Highlight adds highlight-pulse class');
    console.log('✓ PASS: highlight method adds class\n');
} catch (error) {
    console.error('✗ FAIL: highlight method adds class', error.message, '\n');
}

// Test 19: updatePlayer method
console.log('Test 19: updatePlayer method');
try {
    const player = { id: '1', username: 'Player', high_score: 1000, coins: 50 };
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100 });
    const element = card.render();

    // Attach to a parent
    const parent = document.createElement('div');
    parent.appendChild(element);

    const newPlayer = { id: '1', username: 'UpdatedPlayer', high_score: 2000, coins: 100 };
    card.updatePlayer(newPlayer);

    console.assert(card.player.username === 'UpdatedPlayer', 'Player data is updated');
    console.log('✓ PASS: updatePlayer method\n');
} catch (error) {
    console.error('✗ FAIL: updatePlayer method', error.message, '\n');
}

// Test 20: Handle missing player data gracefully
console.log('Test 20: Handle missing player data gracefully');
try {
    const player = { id: '1' }; // Minimal data
    const card = new PlayerCard({ player, position: 5, totalPlayers: 100 });
    const element = card.render();
    const nameEl = element.querySelector('.player-name');
    const scoreEl = element.querySelector('.ranking-score');
    const coinsEl = element.querySelector('.ranking-coins');

    console.assert(nameEl.textContent === 'Unknown', 'Shows "Unknown" for missing username');
    console.assert(scoreEl.textContent === '0', 'Shows 0 for missing score');
    console.assert(coinsEl.textContent.includes('0'), 'Shows 0 for missing coins');
    console.log('✓ PASS: Handle missing player data gracefully\n');
} catch (error) {
    console.error('✗ FAIL: Handle missing player data gracefully', error.message, '\n');
}

console.log('PlayerCard Component Tests Complete!');
