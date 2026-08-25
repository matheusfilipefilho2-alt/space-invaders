# Space Invaders - Frontend Vue.js Integration

Frontend application for Space Invaders game with full backend API integration.

## Tech Stack

- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Vite** for fast development
- **Pinia** for state management
- **Vue Router** for routing
- **Axios** for HTTP requests

## Features Implemented

### Authentication
- User registration
- User login
- JWT token management
- Protected routes

### Game
- Start game session
- End game and submit score
- Earn gold based on score

### Profile
- View player stats
- View achievements
- View equipped items

### Shop
- Browse available items
- Purchase items with gold
- Equip/unequip items

### Leaderboard
- Global rankings
- League-specific rankings
- Pagination

## API Integration

All 18 backend endpoints are integrated:

**Auth:** register, login
**Player:** get profile, update, achievements, items
**Game:** start, end
**Achievements:** list, check
**Items:** list, purchase, equip, unequip
**Leaderboard:** global, league

## Development

```bash
npm install
npm run dev
```

Server runs at: http://localhost:5173
