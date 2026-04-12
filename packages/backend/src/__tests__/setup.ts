/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference types="jest" />

// Jest setup file
// Global test configuration and setup

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup
});
