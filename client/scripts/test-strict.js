#!/usr/bin/env node

/**
 * Strict TypeScript Testing Script
 * 
 * This script runs comprehensive TypeScript checks to catch errors early:
 * 1. TypeScript compilation with strict mode
 * 2. ESLint with strict rules
 * 3. Import/export validation
 * 4. Type checking across all files
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Running Strict TypeScript Tests...\n');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log('blue', `📋 ${description}...`);
    const result = execSync(command, { 
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf8'
    });
    log('green', `✅ ${description} - PASSED`);
    return { success: true, output: result };
  } catch (error) {
    log('red', `❌ ${description} - FAILED`);
    console.log(error.stdout || error.stderr);
    return { success: false, error: error.message };
  }
}

// Test 1: TypeScript Compilation (Strict Mode)
log('bold', '1. TypeScript Compilation (Strict Mode)');
const tsResult = runCommand(
  'npx tsc --noEmit --strict --noImplicitAny --noImplicitReturns --noImplicitThis --noUnusedLocals --noUnusedParameters',
  'TypeScript strict compilation'
);

// Test 2: ESLint with Strict Rules
log('bold', '\n2. ESLint with Strict Rules');
const eslintResult = runCommand(
  'npx eslint src --ext .ts,.tsx --max-warnings 0',
  'ESLint strict linting'
);

// Test 3: Import/Export Validation
log('bold', '\n3. Import/Export Validation');
const importResult = runCommand(
  'npx tsc --noEmit --skipLibCheck --isolatedModules',
  'Import/Export validation'
);

// Test 4: Type Checking Across All Files
log('bold', '\n4. Type Checking Across All Files');
const typeCheckResult = runCommand(
  'npx tsc --noEmit --skipLibCheck --strictNullChecks --strictFunctionTypes',
  'Comprehensive type checking'
);

// Test 5: Build Test
log('bold', '\n5. Build Test');
const buildResult = runCommand(
  'npm run build',
  'Production build test'
);

// Summary
log('bold', '\n📊 Test Summary:');
const tests = [
  { name: 'TypeScript Strict', result: tsResult },
  { name: 'ESLint Strict', result: eslintResult },
  { name: 'Import/Export', result: importResult },
  { name: 'Type Checking', result: typeCheckResult },
  { name: 'Build Test', result: buildResult }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  if (test.result.success) {
    log('green', `✅ ${test.name}: PASSED`);
    passed++;
  } else {
    log('red', `❌ ${test.name}: FAILED`);
    failed++;
  }
});

log('bold', `\n🎯 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  log('red', '\n❌ Some tests failed. Please fix the issues before committing.');
  process.exit(1);
} else {
  log('green', '\n🎉 All tests passed! Code is ready for commit.');
  process.exit(0);
}
