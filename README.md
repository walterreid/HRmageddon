# HRmageddon - Web Implementation

A modern web remake of the 2009 Adult Swim Flash tactics game where rival departments wage cubicle warfare for control of the office floor.

## 🎮 Game Overview

**Genre:** Turn-based tactical strategy  
**Players:** 1-2 (vs AI or online multiplayer)  
**Session Length:** 5-15 minutes  
**Platform:** Web browser (HTML5/JavaScript)

### Core Features
- **Team Drafting System** - Build your dream team before battle with budget constraints
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
│   │   │   ├── DraftScreen.tsx  # Team drafting interface
│   │   │   ├── GameView.tsx     # Main game view
│   │   │   ├── GameHUD.tsx      # Game heads-up display
│   │   │   └── MainMenu.tsx     # Main menu
│   │   ├── game/          # Phaser game scenes and logic
│   │   │   ├── scenes/    # Game scenes (GameScene.ts)
│   │   │   └── systems/   # Game systems
│   │   │       ├── ai.ts      # AI opponent logic
│   │   │       └── aiDraft.ts # AI team building
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

## 🚀 Implementation Phases

### Phase 1: Core Game Engine ✅ COMPLETE
- [x] Basic game board and tile system
- [x] Unit movement and combat mechanics
- [x] Turn-based gameplay loop
- [x] Victory conditions and game state management
- [x] Basic AI opponent
- [x] Modern React + Phaser 3 architecture

### Phase 2: Team Drafting & AI ✅ COMPLETE
- [x] Team building system with budget constraints
- [x] Unit selection and cost management
- [x] AI team building with strategic unit selection
- [x] Enhanced AI decision making and tactics
- [x] Draft-to-battle game flow

### Phase 3: Advanced Gameplay 🚧 IN PROGRESS
- [x] Ability system framework
- [x] Status effects and buffs/debuffs
- [x] Enhanced unit interactions
- [ ] **CURRENT ISSUE: Tile capture mechanics need debugging**
- [ ] Advanced AI behaviors
- [ ] Multiple maps and scenarios

### Phase 4: Polish & Features 📋 PLANNED
- [ ] Sound effects and music
- [ ] Particle effects and animations
- [ ] Mobile responsiveness
- [ ] Game balance tuning
- [ ] Additional unit types

### Phase 5: Multiplayer & Expansion 📋 FUTURE
- [ ] Real-time multiplayer
- [ ] Campaign mode
- [ ] Unit progression
- [ ] Map editor
- [ ] Tournament system

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
│   ├── components/       # UI components (GameView, GameHUD, DraftScreen, etc.)
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

### MVP Features (Phase 1) ✅ COMPLETED
- ✅ Grid-based movement
- ✅ Turn-based combat
- ✅ 4 basic units (Intern, Secretary, Sales Rep, HR Manager)
- ✅ Cubicle capture mechanics
- ✅ Resource management (budget, income, controlled cubicles)
- ✅ Status effects system
- ✅ Turn management with action points
- ✅ Basic game loop and win conditions
- ✅ **NEW: Team Drafting System** - Build teams before battle
- ✅ **NEW: AI Team Building** - AI creates balanced teams
- ✅ **NEW: Enhanced AI Decision Making** - Smarter opponent behavior

### Full Release (Phase 3)
- ✅ 8 unique units with abilities
- [ ] 4 diverse maps
- [ ] Online multiplayer
- [ ] Matchmaking
- [ ] Persistent stats
- [ ] Mobile-responsive

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

### **NEW: Team Drafting System**
- **Budget:** $200k starting budget
- **Headcount:** Maximum 6 units per team
- **Unit Costs:** Interns ($20k) to Executives ($60k)
- **Strategy:** Balance between expensive powerful units and cost-effective support
- **AI Drafting:** AI creates balanced teams using strategic unit selection

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

**Current Status:** 🚧 Phase 3 Development - Debugging Action Menu Integration Issues

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
- **NEW: Team Drafting**: Build your team before battle with budget constraints
- **NEW: AI Team Building**: AI creates balanced teams using strategic unit selection
- **NEW: Enhanced AI**: Improved decision making and tactical behavior
- **Action Menu**: UI for selecting unit actions (Move, Attack, Abilities) with proper positioning

### 🔄 Currently Debugging
- **Action Menu Integration**: Menu appears and positions correctly, but doesn't close after action selection
- **Phaser-React Communication**: Investigating timing issues between GameScene initialization and React component access
- **Action Mode Persistence**: Need to ensure selected actions persist and display movement/attack tiles correctly

### 📋 Next Steps
- Fix GameScene availability timing issue in React-Phaser integration
- Ensure action menu closes properly after action selection
- Verify movement/attack tiles display correctly after menu closes
- Add remaining unit types (IT Specialist, Accountant, Legal Counsel, Executive)
- Implement advanced abilities and cooldowns
- Add multiple maps and scenarios
- Polish UI and add animations

## 🧪 Testing

### Running Tests

The project uses **Vitest** for unit testing and **Playwright** for end-to-end testing.

#### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run specific test files
npm test -- src/stores/gameStore.test.ts
npm test -- src/game/systems/ai.test.ts

# Run tests with coverage
npm run test:coverage
```

#### E2E Tests
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### Important Test Files

#### Core Game Logic Tests
- **`client/src/stores/gameStore.test.ts`** - Main game state management tests
  - Game initialization and setup
  - Unit movement and combat
  - Turn management and victory conditions
  - Player actions and gameplay mechanics
  - Edge cases and error handling

#### AI System Tests
- **`client/src/game/systems/ai.test.ts`** - AI decision making and behavior tests
  - AI movement and positioning
  - Target selection and attack prioritization
  - Ability usage and cooldown management
  - Strategic decision making

#### Ability System Tests
- **`client/src/game/systems/abilities.test.ts`** - Special abilities and effects tests
  - Ability definitions and properties
  - Unit ability mappings
  - Ability usage validation
  - Target selection and range limits
  - Status effects and damage application

#### Test Helpers
- **`client/src/game/test/helpers.ts`** - Mock data and test utilities
  - `createMockUnit()` - Create test units with custom properties
  - `createMockGameState()` - Create test game states
  - `createMockUnitWithAbilities()` - Create units with specific abilities
  - `createMockUnitWithStatus()` - Create units with status effects

### Test Configuration

The test setup is configured in:
- **`client/vitest.config.ts`** - Vitest configuration with React testing environment
- **`client/src/test/setup.ts`** - Test environment setup and global mocks

### Debugging Tests

If tests are failing or timing out:

1. **Check test timeouts**: Tests are configured with 30-second timeouts
2. **Verify mock data**: Ensure test helpers create valid game states
3. **Check console output**: Tests log detailed information about game state
4. **Run individual tests**: Use `npm test -- --run <test-file>` to isolate issues

### Test Coverage

The test suite covers:
- ✅ **Game State Management** - Complete coverage of gameStore functionality
- ✅ **AI Decision Making** - AI movement, targeting, and strategy
- ✅ **Ability System** - Special abilities, targeting, and effects
- ✅ **Player Actions** - Unit selection, movement, and combat
- ✅ **Edge Cases** - Error handling and boundary conditions

### Browser Testing

To test the actual game functionality:

1. **Start the development server**: `npm run dev` from the root directory
2. **Open the game**: Navigate to http://localhost:5177
3. **Test player interactions**:
   - Select units and verify ability panel appears
   - Check that abilities show correct costs and descriptions
   - Verify targeting works for different ability types
   - Test unit movement and combat mechanics
