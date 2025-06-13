import { expect, test, describe } from "bun:test";
import Home from '../pages/index';

describe('Home page', () => {
  test('component exists and is a valid React component', () => {
    expect(Home).toBeDefined();
    expect(typeof Home).toBe('function');
  });

  test('renders without crashing (basic check)', () => {
    const result = Home({});
    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
  });
});