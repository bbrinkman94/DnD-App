// Vitest runs in jsdom; localStorage exists there, but we make sure each test
// file starts from a clean slate so save-system tests cannot leak into each other.
import { beforeEach } from 'vitest';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* no localStorage in this environment */
  }
});
