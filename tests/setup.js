import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { createFakeSupabaseClient } from './mocks/supabaseMock';

// CRITICAL: tests must never make a real network call to any Supabase
// project (prod or dev). A prior incident had the live test suite hitting
// production directly and littering it with dozens of throwaway
// tenants/accounts. This replaces the real client factory with an in-memory
// fake for every test file, regardless of what's configured in .env.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => createFakeSupabaseClient(),
}));

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.print
window.print = () => {};

// Mock HTMLCanvasElement.getContext for canvas-confetti
HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  fillText: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
});
