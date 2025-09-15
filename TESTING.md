## TESTING.md (Proposed Content)

This project uses a comprehensive, multi-layered testing strategy to ensure code quality, prevent regressions, and enable confident refactoring. All new features should be accompanied by corresponding tests.

1. Test Philosophy: TDD and BDD

We follow a hybrid of Test-Driven Development (TDD) and Behavior-Driven Development (BDD).

TDD: Write a failing test before writing the implementation code.

BDD: Write tests that describe the expected behavior of a feature from a user's perspective (e.g., "The AI should prioritize attacking the weakest enemy").

2. Test File Organization: Co-location

Test files are co-located with the source files they are testing. This improves discoverability and makes it easier to maintain tests alongside their features.

Example: src/game/core/movement.ts is tested by src/game/core/movement.test.ts.

3. The Test Environment

Our tests run in a simulated environment powered by Vitest and JSDOM.

Phaser Mocking (src/test/setup.ts): The entire Phaser library is mocked. This allows us to test game logic without needing to run a full browser or canvas, making tests extremely fast and reliable.

Test Helpers (src/game/test/helpers.ts): We use a suite of helper functions like createMockUnit and createMockGameState to build specific, simulated game scenarios for our tests.

4. How to Write a New Test

When adding a new feature (e.g., a new ability or AI behavior), follow this workflow:

Create a Scenario: In your .test.ts file, use the mock helpers to build a "simulated map" that creates the specific conditions you want to test.

Write a Failing Test: Write an it block that describes the expected behavior. Call your (not-yet-written) function and use expect to assert the desired outcome.

Implement the Logic: Write the actual code for the feature in the corresponding source file (.ts).

Run the Test Until it Passes: Keep running npm test until your new test turns green.

Refactor: With the test passing, you can now refactor your code confidently, knowing the test acts as a safety net.

**Example: Testing a Directional Ability**

```typescript
// In targeting.test.ts
describe('getTilesInCone', () => {
  it('should return correct tiles for a 90-degree cone facing right', () => {
    const casterPosition = { x: 5, y: 5 }
    const direction = { x: 1, y: 0 } // Facing right
    const range = 3
    const coneAngle = 90

    const result = getTilesInCone(casterPosition, direction, range, coneAngle)

    // Should include tiles to the right of the caster
    expect(result).toContainEqual({ x: 6, y: 5 })
    expect(result).toContainEqual({ x: 7, y: 5 })
    expect(result).toContainEqual({ x: 8, y: 5 })
    
    // Should include diagonal tiles within cone
    expect(result).toContainEqual({ x: 6, y: 4 })
    expect(result).toContainEqual({ x: 6, y: 6 })
    
    // Should not include tiles behind the caster
    expect(result).not.toContainEqual({ x: 4, y: 5 })
  })
})
```

5. Running Tests

Use the following commands to run the test suite:

npm test: Run all unit tests once.

npm run test:watch: Run tests in an interactive watch mode.

npm run test:strict: Run a full suite of static analysis, including TypeScript and ESLint checks. This is run automatically before every commit.

6. Common Testing Patterns

**Testing for Reference Errors**: When refactoring code, it's common to have variable name mismatches (e.g., `queryState` vs `_queryState`). Always add tests that specifically verify the AI can execute without throwing ReferenceError exceptions.

**Testing for Infinite Loops**: The AI system has built-in infinite loop detection. When testing AI behavior, ensure that units actually consume their actions and don't get stuck in decision loops.

**Mock Store Completeness**: When testing AI integration, ensure your mock stores include all required methods (moveUnit, attackUnit, useAbility, etc.) to prevent "function not defined" errors.

**Testing AI Attack Behavior**: The AI attack system should be thoroughly tested with scenarios including:
- AI targets the weakest enemy when multiple enemies are in range
- AI respects attack range limitations
- AI prioritizes attacking over moving when enemies are available
- AI doesn't attack when no enemies are in range
- AI attack decisions are properly executed through the store

## UI vs Game State Testing

The refactored architecture separates UI state from game state, requiring different testing approaches:

### UI Store Testing (`uiStore.ts`)
- **Focus**: UI interactions, visual feedback, action modes
- **Test Cases**: Action mode transitions, highlight management, ability targeting states
- **Mocking**: Mock game store interactions, test UI state in isolation
- **Example**: Test that selecting "Move" mode clears previous highlights and sets correct action mode

### Game Store Testing (`gameStore.ts`)
- **Focus**: Core game logic, state orchestration, pure function delegation
- **Test Cases**: Game actions, state updates, victory conditions
- **Mocking**: Mock pure functions, test state changes
- **Example**: Test that moving a unit updates position and consumes action points

### Action Handler Testing (`actionHandlers.ts`)
- **Focus**: Coordination between UI and game stores
- **Test Cases**: Action flow, state synchronization, error handling
- **Mocking**: Mock both UI and game stores, test coordination logic
- **Example**: Test that executing a move updates both UI highlights and game state

### Action Flow Testing
Test the complete user interaction flow from UI to game state:

```typescript
describe('Action Flow', () => {
  it('should handle complete move action flow', () => {
    // 1. Select unit (game store)
    const unit = createMockUnit();
    gameStore.selectUnit(unit);
    
    // 2. Enter move mode (UI store + action handlers)
    actionHandlers.enterMoveMode(unit);
    expect(uiStore.getState().actionMode).toBe('move');
    expect(uiStore.getState().highlightedTiles.size).toBeGreaterThan(0);
    
    // 3. Execute move (action handlers coordinate both stores)
    const target = { x: 5, y: 5 };
    actionHandlers.executeMove(unit, target);
    
    // 4. Verify both stores updated correctly
    expect(gameStore.getState().units[0].position).toEqual(target);
    expect(uiStore.getState().actionMode).toBe('none');
    expect(uiStore.getState().highlightedTiles.size).toBe(0);
  });
});
```

**Testing Directional Abilities**: When implementing or testing directional abilities, ensure comprehensive coverage of:
- **Cone Calculation Accuracy**: Test `getTilesInCone()` with various angles (45°, 90°, 180°) and ranges
- **Direction Vector Validation**: Verify direction vectors are calculated correctly from click positions
- **Targeting Mode State**: Test that `abilityAwaitingDirection` state is properly set and cleared
- **Real-time Preview**: Ensure cone preview updates correctly as mouse moves during targeting
- **Edge Cases**: Test clicking on caster position, out-of-bounds clicks, and invalid directions
- **Store Integration**: Verify directional abilities execute correctly through `unitStore.useAbility()`
- **Visual Feedback**: Test that affected tiles are properly highlighted and damage is applied
- **AI Directional Abilities**: Ensure AI can use directional abilities with appropriate direction selection

## Store Subscription Testing

### Testing Multi-Store Subscriptions
When testing components that subscribe to multiple stores (like GameScene), ensure both subscriptions are properly tested:

```typescript
describe('GameScene Store Subscriptions', () => {
  it('should update highlights when UI store changes', () => {
    const mockGameScene = createMockGameScene()
    
    // Simulate UI store change
    const highlights = new Map([['5,5', 'movement']])
    uiStore.setHighlightedTiles(highlights)
    
    // Verify GameScene responds to UI store change
    expect(mockGameScene.updateHighlights).toHaveBeenCalledWith(
      highlights, 
      expect.any(Object)
    )
  })
  
  it('should update game state when game store changes', () => {
    const mockGameScene = createMockGameScene()
    
    // Simulate game store change
    gameStore.selectUnit(mockUnit)
    
    // Verify GameScene responds to game store change
    expect(mockGameScene.render).toHaveBeenCalled()
  })
})
```

### Testing Visual Debugging
When visual elements don't appear, create tests that verify the complete flow:

```typescript
describe('Movement Highlights Flow', () => {
  it('should show movement highlights when entering move mode', () => {
    // 1. Select unit
    const unit = createMockUnit()
    gameStore.selectUnit(unit)
    
    // 2. Enter move mode
    actionHandlers.enterMoveMode(unit)
    
    // 3. Verify UI store updated
    expect(uiStore.getState().actionMode).toBe('move')
    expect(uiStore.getState().highlightedTiles.size).toBeGreaterThan(0)
    
    // 4. Verify GameScene would update (mock the subscription)
    const mockUpdateHighlights = jest.fn()
    const gameScene = { updateHighlights: mockUpdateHighlights }
    
    // Simulate UI store subscription trigger
    uiStore.getState().setHighlightedTiles(new Map([['5,5', 'movement']]))
    
    // Verify visual update would be called
    expect(mockUpdateHighlights).toHaveBeenCalled()
  })
})
```

### Testing Store Subscription Cleanup
Always test that subscriptions are properly cleaned up to prevent memory leaks:

```typescript
describe('GameScene Cleanup', () => {
  it('should unsubscribe from both stores on destroy', () => {
    const gameScene = createGameScene()
    const gameUnsubscribe = jest.fn()
    const uiUnsubscribe = jest.fn()
    
    // Mock subscriptions
    gameScene.unsubscribe = gameUnsubscribe
    gameScene.unsubscribeUI = uiUnsubscribe
    
    // Destroy scene
    gameScene.destroy()
    
    // Verify both subscriptions cleaned up
    expect(gameUnsubscribe).toHaveBeenCalled()
    expect(uiUnsubscribe).toHaveBeenCalled()
  })
})
```

### Common Visual Testing Patterns

**Testing Highlight Types**: Ensure highlight types match between action handlers and visual rendering:

```typescript
describe('Highlight Type Consistency', () => {
  it('should use consistent highlight types across stores and rendering', () => {
    const movementHighlights = new Map([['5,5', 'movement']])
    const attackHighlights = new Map([['6,6', 'attack']])
    
    // Test that action handlers use correct types
    actionHandlers.enterMoveMode(unit)
    expect(uiStore.getState().highlightedTiles.get('5,5')).toBe('movement')
    
    actionHandlers.enterAttackMode(unit)
    expect(uiStore.getState().highlightedTiles.get('6,6')).toBe('attack')
    
    // Test that drawHighlight handles these types
    expect(() => drawHighlight(0, 0, 32, 'movement')).not.toThrow()
    expect(() => drawHighlight(0, 0, 32, 'attack')).not.toThrow()
  })
})
```

**Testing Store State Synchronization**: Verify that UI and game stores stay synchronized:

```typescript
describe('Store Synchronization', () => {
  it('should keep UI and game stores synchronized during actions', () => {
    const unit = createMockUnit()
    
    // Start action
    actionHandlers.enterMoveMode(unit)
    
    // Verify both stores have consistent state
    expect(uiStore.getState().actionMode).toBe('move')
    expect(gameStore.getState().selectedUnit).toBe(unit)
    
    // Complete action
    actionHandlers.executeMove(unit, { x: 5, y: 5 })
    
    // Verify both stores cleared consistently
    expect(uiStore.getState().actionMode).toBe('none')
    expect(uiStore.getState().highlightedTiles.size).toBe(0)
  })
})
```