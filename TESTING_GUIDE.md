# Testing Guide - Frontend ↔ Backend Integration

## Prerequisites

- Backend running on http://localhost:3000
- Frontend dev server on http://localhost:5173
- PostgreSQL database configured

## Step 1: Start Backend

```bash
cd backend
npm run dev
```

Expected output:
```
Server running on http://localhost:3000
```

## Step 2: Start Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

## Step 3: Test User Registration

1. Navigate to http://localhost:5173
2. Click "Register"
3. Fill form:
   - Username: testuser
   - Email: test@example.com
   - Password: password123
4. Click "Register"
5. Should redirect to /game

Expected: JWT token stored in localStorage, user logged in

## Step 4: Test Game Flow

1. Click "Start Game"
2. Wait a few seconds (score will auto-increment for testing)
3. Click "End Game"
4. Alert should show gold earned
5. Gold balance should update

Expected API calls:
- POST /api/v1/game/start
- POST /api/v1/game/end

## Step 5: Test Profile

1. Click "Profile" button
2. Should see:
   - Username, email, league
   - Stats (gold, score, games played)
   - Achievements (if any)
   - Equipped items (if any)

Expected API calls:
- GET /api/v1/players/me
- GET /api/v1/players/me/achievements
- GET /api/v1/players/me/items

## Step 6: Test Shop

1. Click "Shop" button
2. Should see available items
3. Try purchasing an item
4. Switch to "Your Items" tab
5. Try equipping an item

Expected API calls:
- GET /api/v1/items
- GET /api/v1/players/me/items
- POST /api/v1/items/:id/purchase
- POST /api/v1/items/:id/equip

## Step 7: Test Leaderboard

1. Click "Leaderboard"
2. View global rankings
3. Switch to "League Rankings"
4. Select different leagues
5. Test pagination

Expected API calls:
- GET /api/v1/leaderboard/global
- GET /api/v1/leaderboard/league/:id

## Step 8: Test Logout

1. Click "Logout" in game view
2. Should redirect to /login
3. Try accessing /game directly
4. Should redirect to /login (protected route)

## Verification Checklist

- [ ] Registration works
- [ ] Login works
- [ ] Game start/end works
- [ ] Gold balance updates
- [ ] Profile loads correctly
- [ ] Shop displays items
- [ ] Can purchase items
- [ ] Can equip/unequip items
- [ ] Leaderboard displays
- [ ] Pagination works
- [ ] Protected routes work
- [ ] Logout works

## API Endpoints Coverage

All 18 endpoints integrated:

✓ POST /api/v1/auth/register
✓ POST /api/v1/auth/login
✓ GET /api/v1/players/me
✓ PUT /api/v1/players/me
✓ GET /api/v1/players/me/achievements
✓ GET /api/v1/players/me/items
✓ POST /api/v1/game/start
✓ POST /api/v1/game/end
✓ GET /api/v1/achievements
✓ POST /api/v1/achievements/check
✓ GET /api/v1/items
✓ POST /api/v1/items/:id/purchase
✓ POST /api/v1/items/:id/equip
✓ POST /api/v1/items/:id/unequip
✓ GET /api/v1/leaderboard/global
✓ GET /api/v1/leaderboard/league/:id

## Troubleshooting

### CORS errors
- Check backend CORS configuration
- Ensure frontend URL is in allowedOrigins

### 401 Unauthorized
- Check JWT token in localStorage
- Verify token is being sent in Authorization header

### Network errors
- Verify backend is running on port 3000
- Check .env file has correct VITE_API_URL

### TypeScript errors
- Run: npm run type-check
- Ensure all dependencies are installed
