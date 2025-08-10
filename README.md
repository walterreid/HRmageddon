# HRmageddon - Web Implementation

A modern web remake of the 2009 Adult Swim Flash tactics game where rival departments wage cubicle warfare for control of the office floor.

## 🎮 Game Overview

**Genre:** Turn-based tactical strategy  
**Players:** 1-2 (vs AI or online multiplayer)  
**Session Length:** 5-15 minutes  
**Platform:** Web browser (HTML5/JavaScript)

### Core Features
- Grid-based tactical combat with office-themed units
- Resource management through cubicle capture
- Satirical office abilities (Write-ups, Pink Slips, Coffee Runs)
- Quick matches with clear win conditions
- Both single-player (vs AI) and multiplayer modes

## 🏗️ Technology Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Game Engine:** Phaser 3 (for game rendering and animations)
- **State Management:** Zustand (lightweight, perfect for game state)
- **Styling:** Tailwind CSS (UI elements)
- **Build Tool:** Vite 7

### Backend
- **Runtime:** Node.js with Express 5
- **Real-time:** Socket.io (for multiplayer)
- **Database:** PostgreSQL (player stats, match history)
- **ORM:** Prisma
- **Hosting:** Render.com (auto-scaling, WebSocket support)

## 📁 Project Structure

```
HRmageddon/
├── client/                 # React frontend + Phaser game
│   ├── src/
│   │   ├── components/     # React UI components
│   │   ├── game/          # Phaser game scenes and logic
│   │   ├── stores/        # Zustand state management
│   │   └── types/         # TypeScript type definitions
│   └── package.json
├── server/                 # Express backend + Socket.io
│   ├── src/
│   │   └── index.ts       # Main server file
│   └── package.json
├── shared/                 # Common types and utilities
│   └── src/
│       └── index.ts       # Shared interfaces and enums
└── package.json            # Workspace root configuration
```

### Development Tools
- **Version Control:** Git/GitHub
- **CI/CD:** GitHub Actions → Render auto-deploy
- **Testing:** Vitest (unit), Playwright (e2e)
- **Linting:** ESLint + Prettier

## 📋 Implementation Phases

### Phase 1: Core Game Engine (Weeks 1-3)
**Goal:** Playable single-player skirmish mode

#### Week 1: Foundation
- ✅ Project setup (Vite + React + TypeScript + Phaser)
- ✅ Basic tile grid system (8x10 board)
- ✅ Unit placement and movement
- ✅ Turn management system
- ✅ Basic UI (HUD, unit selection, action menu)

#### Week 2: Combat & Units
- ✅ Implement 4 core units (Intern, Secretary, Sales, HR)
- ✅ Attack system with damage calculation
- ✅ Line of sight and range checking
- ✅ Basic abilities (1 per unit)
- ✅ Status effects system

#### Week 3: Game Loop
- ✅ Cubicle capture mechanics
- ✅ Economy system (budget/income)
- ✅ Win conditions (elimination, territory control)
- [ ] Basic AI opponent (heuristic-based)
- [ ] Sound effects and basic animations

**Deliverable:** Local single-player game with 1 map, 4 units, working AI

### Phase 2: Polish & Content (Weeks 4-6)
**Goal:** Complete single-player experience

#### Week 4: Full Roster
- [ ] Implement remaining units (IT, Accountant, Legal, Executive)
- [ ] Complete ability set with cooldowns
- [ ] Advanced status effects
- [ ] Terrain types (conference rooms, hazards)

#### Week 5: Maps & AI
- [ ] 3 additional maps with varied layouts
- [ ] AI difficulty levels (Easy/Normal/Hard)
- [ ] Pathfinding optimization (A* algorithm)
- [ ] Save/load game state

#### Week 6: Polish
- [ ] Animations (attacks, movements, KOs)
- [ ] Particle effects
- [ ] UI improvements (tooltips, previews)
- [ ] Tutorial/onboarding flow
- [ ] Settings menu (audio, graphics, controls)

**Deliverable:** Polished single-player game with full content

### Phase 3: Multiplayer & Launch (Weeks 7-9)
**Goal:** Online multiplayer and deployment

#### Week 7: Backend Infrastructure
- [ ] Express server setup with Socket.io
- [ ] Room/lobby system
- [ ] Matchmaking logic
- [ ] Database schema (Prisma + PostgreSQL)
- [ ] Authentication (simple guest + optional accounts)

#### Week 8: Multiplayer Implementation
- [ ] Real-time turn synchronization
- [ ] Network prediction and reconciliation
- [ ] Disconnect handling and reconnection
- [ ] Spectator mode
- [ ] Chat system

#### Week 9: Deployment & Launch
- [ ] Deploy to Render.com
- [ ] Load testing and optimization
- [ ] Bug fixes from beta testing
- [ ] Analytics integration
- [ ] Launch on itch.io / game portals

**Deliverable:** Live multiplayer game

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/walterreid/HRmageddon.git
cd HRmageddon

# Install dependencies (workspace setup)
npm install

# Start development environment (both client and server)
npm run dev

# Or start individually:
# Client only: npm --workspace client run dev
# Server only: npm --workspace server run dev
```

## 🖥️ Getting Started (Development)

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation
```bash
# Clone and setup
git clone https://github.com/walterreid/HRmageddon.git
cd HRmageddon
npm install
```

### Starting the Development Environment

#### Option 1: Start Both Together (Recommended)
```bash
# From the root directory
npm run dev
```
This starts both client and server concurrently using the workspace configuration.

#### Option 2: Start Individually

**Start the Server First:**
```bash
# From the root directory
npm --workspace server run dev

# Or navigate to server directory
cd server
npm run dev
```

**Start the Client:**
```bash
# From the root directory (in a new terminal)
npm --workspace client run dev

# Or navigate to client directory
cd client
npm run dev
```

### Development URLs

Once both are running, you can access:

- **Client (Game):** http://localhost:5177 (or next available port)
- **Server (API):** http://localhost:4001
- **Health Check:** http://localhost:4001/api/health

### Port Configuration

The system automatically finds available ports:
- **Client:** Starts on 5173, then tries 5174, 5175, 5176, 5177, etc.
- **Server:** Configured for port 4001 (see `server/src/index.ts`)

### Troubleshooting

**Port Already in Use:**
```bash
# Kill processes using specific ports
lsof -ti:5177 | xargs kill -9  # Client port
lsof -ti:4001 | xargs kill -9  # Server port
```

**Server Won't Start:**
```bash
# Check if dependencies are installed
cd server
npm install

# Check for missing modules
npm list express
```

**Client Won't Start:**
```bash
# Check if dependencies are installed
cd client
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

**Workspace Issues:**
```bash
# Reinstall from root
npm install
npm run dev
```

### Development Workflow

1. **Start Development:** `npm run dev` from root
2. **Make Changes:** Edit files in `client/src/` or `server/src/`
3. **Auto-reload:** Both client and server will restart automatically
4. **Test:** Visit http://localhost:5177 to see your changes
5. **API Testing:** Use http://localhost:4001/api/health to verify server

### File Structure for Development

```
HRmageddon/
├── client/src/           # Frontend React components
│   ├── components/       # UI components (GameView, GameHUD, etc.)
│   ├── stores/          # Zustand state management
│   ├── game/            # Phaser game logic
│   └── App.tsx          # Main app component
├── server/src/           # Backend Express server
│   └── index.ts         # Server entry point
└── shared/src/           # Shared types and utilities
```

## 🌐 Development URLs

- **Client (Game):** http://localhost:5177
- **Server (API):** http://localhost:4001
- **Health Check:** http://localhost:4001/api/health

## 🎯 Development Milestones

### MVP Features (Phase 1)
- ✅ Grid-based movement
- ✅ Turn-based combat
- ✅ 4 basic units (Intern, Secretary, Sales Rep, HR Manager)
- ✅ Cubicle capture mechanics
- ✅ Resource management (budget, income, controlled cubicles)
- ✅ Status effects system
- ✅ Turn management with action points
- ✅ Basic game loop and win conditions

### Full Release (Phase 3)
- ✅ 8 unique units with abilities
- ✅ 4 diverse maps
- ✅ Online multiplayer
- ✅ Matchmaking
- ✅ Persistent stats
- ✅ Mobile-responsive

## 🎨 Art Style Guide

- **Visual:** Bright, cartoony with thick outlines
- **Colors:** Corporate blues/grays with vibrant team colors
- **Animations:** Exaggerated, comedic (paper flying, coffee splashing)
- **UI:** Clean, minimal, business-document themed

## 🔧 Configuration

### Environment Variables
```env
# Frontend (.env)
VITE_API_URL=http://localhost:4001
VITE_SOCKET_URL=ws://localhost:4001

# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/hrmageddon
PORT=4001
JWT_SECRET=your-secret-key
```

## 📝 Game Design Notes

### Balance Targets
- **TTK (Time to Kill):** 2-3 hits average
- **Match Length:** 8-12 turns
- **Income Rate:** +1 per cubicle/round
- **Unit Costs:** 2-6 credits

### Unit Counter System
- Secretary → High mobility units (Filed status)
- Legal → Executives/HR (Stun)
- IT → Clustered enemies (Hazards)
- Sales → Capture-focused units (Harass)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This is a fan remake of the original HRmageddon by THUP Games/Adult Swim Games. 
All game mechanics and concepts are based on the original 2009 Flash game.

## 🙏 Acknowledgments

- Original game by THUP Games & Adult Swim Games (2009)
- Inspired by tactical games like Advance Wars and Into the Breach
- Built with modern web technologies for preservation

## 📞 Contact

- GitHub Issues: [Report bugs or request features](https://github.com/walterreid/HRmageddon/issues)
- Discord: [Join our community](#)

---

**Current Status:** 🚧 Phase 1 Development - Core Game Engine Complete

**Last Updated:** January 2025

## 🎯 What's Currently Working

### ✅ Implemented Features
- **Game Board**: 8x10 grid with different tile types (cubicles, obstacles, conference rooms, HQs)
- **Units**: 4 unit types with unique stats and abilities
- **Turn System**: Player turns with action points and movement/attack phases
- **Combat**: Attack mechanics with damage calculation and status effects
- **Resource Management**: Budget, income per turn, and cubicle control
- **Game Loop**: Complete turn-based gameplay with win conditions
- **Modern UI**: React + Tailwind CSS with Phaser 3 game rendering

### 🔄 In Progress
- AI opponent implementation
- Additional unit types and abilities
- Sound effects and animations
- Game balance tuning

### 📋 Next Steps
- Complete AI opponent
- Add remaining unit types (IT Specialist, Accountant, Legal Counsel, Executive)
- Implement advanced abilities and cooldowns
- Add multiple maps and scenarios
