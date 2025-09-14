HRmageddon
A modern web remake of the 2009 Adult Swim Flash game where rival departments wage cubicle warfare. This project is a turn-based tactical strategy game built with a modern tech stack, featuring a sophisticated responsive engine, a data-driven map system, and a complete single-player experience against AI.

✨ Core Features
Tactical Grid-Based Combat: Classic turn-based strategy on a 16x12 (configurable) grid with office-themed units.

Team Drafting System: Strategically build your team within budget and headcount limits before each battle.

Dynamic AI Opponent: Face an AI that builds its own team and makes strategic decisions based on the game state.

Tiled Map Integration: Game levels are built using the Tiled Map Editor, allowing for easy creation of new layouts with distinct layers for floors, obstacles, and objectives.

Advanced Responsive Engine: A custom ResponsiveGameManager ensures the entire 16x12 game board is always perfectly visible and playable on any device, from small mobile phones to large desktops.

Capture Point System: Gain strategic advantage and income by capturing and controlling cubicles on the map.

Satirical Ability System: Unleash office-themed special attacks like "Pink Slip," "Fetch Coffee," and "Legal Threat."

💻 Technology Stack
Frontend: React 19, TypeScript, Phaser 3, Zustand, Tailwind CSS

Backend: Node.js, Express 5, Socket.io

Database: PostgreSQL with Prisma ORM

Build & Test: Vite 7, Vitest, Playwright, ESLint, Prettier

🚀 Getting Started
Prerequisites: Node.js v18+

Bash
# 1. Clone the repository
git clone https://github.com/walterreid/HRmageddon.git
cd HRmageddon

# 2. Install dependencies for the entire workspace
npm install

# 3. Start the client and server concurrently
npm run dev
Client (Game) will be available at http://localhost:5178

Server (API) will be available at http://localhost:4001

# 4. Run tests (optional)
npm run test:all          # Run all tests and validation
npm run test:strict       # Run strict TypeScript validation only

📂 Project Structure
This project is a monorepo containing three main packages:

HRmageddon/
├── client/         # React frontend and Phaser game engine
│   └── src/game/   # Organized game architecture
│       ├── ai/     # AI decision-making logic
│       ├── core/   # Pure game engine rules
│       ├── visuals/# Rendering and effects
│       ├── map/    # Map management system
│       ├── responsive/ # Responsive scaling
│       └── scenes/ # Phaser game scenes
├── server/         # Node.js backend for API and multiplayer
├── shared/         # TypeScript types and enums shared between client/server
└── package.json    # Workspace root
🏛️ Architectural Overview
This project uses a decoupled architecture where the user interface, game state logic, and rendering engine operate independently. This makes the system easier to debug, test, and extend.

1. State Management (Zustand)

The core of the game is the gameStore.ts file. It acts as the single source of truth for the entire game state.

What it does: It's a "god object" that holds the logical representation of the board, all unit data, player resources, and the current turn.

How it works: It contains all the core game logic as methods (e.g., moveUnit, attackTarget, endTurn). All UI components (React) and the game engine (Phaser) subscribe to this store and react to its changes.

2. Rendering Engine (Phaser 3)

Visuals are handled entirely by Phaser.

What it does: The GameScene.ts class is responsible for rendering the tilemap, units, highlights, and visual effects onto an HTML <canvas>.

How it works: It subscribes to the gameStore. When the state changes (e.g., a unit moves), GameScene receives the update and visually tweens the unit's sprite to its new position. It does not contain any game logic itself; it only reflects the current state.

3. User Interface (React)

The UI, including the Heads-Up Display (HUD), menus, and modals, is built with React and styled with Tailwind CSS.

What it does: Components like GameHUD.tsx and ActionMenu.tsx display information and provide controls to the player.

How it works: UI components also subscribe to the gameStore to display data. When a player clicks a button (e.g., "End Turn"), the component calls the corresponding method in the gameStore, which updates the state and triggers changes in both the UI and the Phaser canvas.

4. Map System (Tiled Integration)

The game uses maps created in the Tiled Map Editor and exported as JSON.

MapManager.ts: This class loads the Tiled JSON file, creates the visual layers in Phaser, and parses crucial data.

MapRegistry.ts: This is a global singleton that caches parsed map data, such as team starting positions, obstacle locations, and capture points. This is critical because it allows the gameStore to create a logically accurate board before the Phaser scene has even started rendering.

5. Responsive Tile Sizing System

A key feature is the custom-built responsive engine that ensures a perfect gameplay experience on any screen.

ResponsiveGameManager.ts: This class runs alongside Phaser. It continuously monitors the browser's viewport size.

It calculates the largest possible tile size (between 28px and 64px) that allows the entire 16x12 board to fit perfectly within the available space.

When the optimal size changes, it directly resizes the Phaser canvas and instructs GameScene to redraw all units and elements at the new scale.

6. AI System

The AI logic is self-contained and follows a clear, prioritized decision-making process.

AIController.ts: This class contains the AI's "brain." During its turn, it evaluates all possible actions for each of its units in a specific order of priority:

Use a high-value ability (e.g., execute a weak enemy).

Attack the weakest enemy in range.

Move to capture a nearby objective (a cubicle).

Move towards the closest enemy if no other actions are available.

🧪 Testing
The project includes a comprehensive test suite using Vitest for unit tests, Playwright for end-to-end tests, and strict TypeScript validation.

## **Quick Start Testing**

```bash
# Run all tests (unit + strict validation)
npm run test:all

# Run strict TypeScript validation only
npm run test:strict

# Run unit tests only
npm test
```

## **Available Test Commands**

```bash
# Unit Tests
npm test                    # Run all unit tests
npm run test:watch         # Run unit tests in watch mode
npm run test:run           # Run unit tests once and exit
npm run test:ui            # Run unit tests with UI interface

# Strict Validation
npm run test:strict        # Run comprehensive TypeScript validation
npm run test:all          # Run both strict validation and unit tests

# End-to-End Tests
npm run test:e2e          # Run Playwright end-to-end tests
```

## **Strict Testing Features**

The `npm run test:strict` command runs comprehensive validation including:

- **TypeScript Strict Mode**: Full type checking with strict settings
- **ESLint Validation**: Code quality and style enforcement
- **Import/Export Validation**: Module dependency checking
- **Build Testing**: Production build verification
- **Type Safety**: Comprehensive type checking across all files

## **Key Test Files**

- **`client/src/stores/gameStore.test.ts`**: Covers all core game mechanics
- **`client/src/game/systems/ai.test.ts`**: Validates the AI's decision-making logic
- **`client/src/game/systems/abilities.test.ts`**: Ensures all special abilities function correctly
- **`client/scripts/test-strict.js`**: Comprehensive validation script

## **Pre-commit Validation**

The project includes a pre-commit hook that automatically runs strict validation before each commit, ensuring code quality and preventing broken builds.