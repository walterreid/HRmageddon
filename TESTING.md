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