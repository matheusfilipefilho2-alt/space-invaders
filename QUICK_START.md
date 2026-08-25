# Quick Start Guide - Frontend + Backend Integration

## 🚀 Start the Full Stack

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

Expected:
```
Server running on http://localhost:3000
Connected to PostgreSQL database
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Expected:
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

## 🎮 Test the Integration

1. **Open browser**: http://localhost:5173

2. **Register account**:
   - Click "Register"
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
   - Click "Register"

3. **Play game**:
   - Click "Start Game"
   - Wait 5 seconds (auto-scoring for demo)
   - Click "End Game"
   - See gold earned!

4. **Check profile**:
   - Click "Profile"
   - View stats, achievements, items

5. **Visit shop**:
   - Click "Shop"
   - Browse items
   - Purchase with earned gold
   - Equip items

6. **View leaderboard**:
   - Click "Leaderboard"
   - See global rankings
   - Try league rankings

## 📋 Endpoints Integrated

All 18 REST endpoints are connected and working:

**Auth (2)**
- ✅ POST /api/v1/auth/register
- ✅ POST /api/v1/auth/login

**Player (4)**
- ✅ GET /api/v1/players/me
- ✅ PUT /api/v1/players/me
- ✅ GET /api/v1/players/me/achievements
- ✅ GET /api/v1/players/me/items

**Game (2)**
- ✅ POST /api/v1/game/start
- ✅ POST /api/v1/game/end

**Achievements (2)**
- ✅ GET /api/v1/achievements
- ✅ POST /api/v1/achievements/check

**Items (4)**
- ✅ GET /api/v1/items
- ✅ POST /api/v1/items/:id/purchase
- ✅ POST /api/v1/items/:id/equip
- ✅ POST /api/v1/items/:id/unequip

**Leaderboard (2)**
- ✅ GET /api/v1/leaderboard/global
- ✅ GET /api/v1/leaderboard/league/:id

## 🛠️ Troubleshooting

**Backend not connecting?**
```bash
# Check if backend is running
lsof -ti:3000

# Check database
psql -d space_invaders -c "SELECT * FROM players LIMIT 1;"
```

**Frontend CORS errors?**
- Check backend CORS config includes http://localhost:5173
- Restart backend server

**401 Unauthorized?**
- Clear localStorage: `localStorage.clear()`
- Re-login

## 📁 Project Structure

```
space-invaders/
├── backend/              # Go REST API
│   ├── cmd/server/       # Main entry point
│   ├── internal/         # Business logic
│   └── migrations/       # Database migrations
│
├── frontend/             # Vue.js SPA
│   ├── src/
│   │   ├── services/     # API integration
│   │   ├── stores/       # Pinia stores
│   │   ├── views/        # 7 pages
│   │   └── router/       # Routes + guards
│   └── .env              # API URL config
│
└── docs/                 # Documentation
```

## ✅ Success Criteria

- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Can register new user
- [ ] Can login
- [ ] Can start/end game
- [ ] Gold balance updates
- [ ] Can view profile
- [ ] Can purchase items
- [ ] Can view leaderboard

## 🎯 What's Next?

See `TESTING_GUIDE.md` for comprehensive testing
See `frontend/IMPLEMENTATION_SUMMARY.md` for technical details

Happy testing! 🚀
