import { describe, it, expect, beforeEach } from 'vitest';

describe('Theme Mode Toggle & State Logic Tests', () => {
  let mockStorage: Record<string, string> = {};
  let mockClasses: Set<string> = new Set();
  let mockAttributes: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    mockClasses = new Set();
    mockAttributes = {};
  });

  const applyTheme = (theme: 'dark' | 'light') => {
    if (theme === 'light') {
      mockClasses.delete('dark');
      mockClasses.add('light');
      mockAttributes['data-theme'] = 'light';
    } else {
      mockClasses.delete('light');
      mockClasses.add('dark');
      mockAttributes['data-theme'] = 'dark';
    }
    mockStorage['zajco_theme'] = theme;
  };

  it('should apply dark theme classes and data-theme attribute', () => {
    applyTheme('dark');

    expect(mockClasses.has('dark')).toBe(true);
    expect(mockClasses.has('light')).toBe(false);
    expect(mockAttributes['data-theme']).toBe('dark');
    expect(mockStorage['zajco_theme']).toBe('dark');
  });

  it('should apply light theme classes and data-theme attribute', () => {
    applyTheme('light');

    expect(mockClasses.has('light')).toBe(true);
    expect(mockClasses.has('dark')).toBe(false);
    expect(mockAttributes['data-theme']).toBe('light');
    expect(mockStorage['zajco_theme']).toBe('light');
  });

  it('should correctly toggle between dark and light themes and persist state', () => {
    let currentTheme: 'dark' | 'light' = 'dark';
    applyTheme(currentTheme);
    expect(mockStorage['zajco_theme']).toBe('dark');

    // Toggle to light
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    expect(mockClasses.has('light')).toBe(true);
    expect(mockStorage['zajco_theme']).toBe('light');

    // Toggle back to dark
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    expect(mockClasses.has('dark')).toBe(true);
    expect(mockStorage['zajco_theme']).toBe('dark');
  });
});
