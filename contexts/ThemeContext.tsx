
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeType, ControlStyle } from '../types';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  scrollThumb: string;
  toggleKnob: string; // New property for toggle button knob
}

const THEMES: Record<ThemeType, ThemeColors> = {
  'neon-retro': {
    primary: '#00f3ff',
    secondary: '#bc13fe',
    accent: '#00ff00',
    bg: '#030712',
    panel: '#111827',
    text: '#ffffff',
    muted: '#9ca3af',
    border: '#374151',
    scrollThumb: '#374151',
    toggleKnob: '#ffffff',
  },
  'neon-blue': {
    primary: '#3b82f6',
    secondary: '#2563eb',
    accent: '#38bdf8',
    bg: '#020617',
    panel: '#0f172a',
    text: '#e0f2fe',
    muted: '#64748b',
    border: '#60a5fa',
    scrollThumb: '#1e3a8a',
    toggleKnob: '#ffffff',
  },
  'warm-cozy': {
    primary: '#fbbf24',
    secondary: '#d97706',
    accent: '#fcd34d',
    bg: '#1c1917',
    panel: '#292524',
    text: '#fef3c7',
    muted: '#a8a29e',
    border: '#78716c',
    scrollThumb: '#57534e',
    toggleKnob: '#ffffff',
  },
  'neutral-gray': {
    primary: '#d4d4d4',
    secondary: '#737373',
    accent: '#ffffff',
    bg: '#171717',
    panel: '#262626',
    text: '#ffffff',
    muted: '#a3a3a3',
    border: '#525252',
    scrollThumb: '#404040',
    toggleKnob: '#ffffff',
  },
  'neutral-ocean': {
    primary: '#4B8CA8',
    secondary: '#243B4A',
    accent: '#70C6D6',
    bg: '#050A10',
    panel: '#0D1620',
    text: '#DDE6EB',
    muted: '#5A7585',
    border: '#1F3342',
    scrollThumb: '#243B4A',
    toggleKnob: '#A0B0C0', // Restrained light grey-blue
  }
};

interface ThemeContextType {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  controlStyle: ControlStyle;
  setControlStyle: (style: ControlStyle) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('neon_theme') as ThemeType) || 'neon-retro';
  });

  const [controlStyle, setControlStyle] = useState<ControlStyle>(() => {
    return (localStorage.getItem('neon_control_style') as ControlStyle) || 'default';
  });

  useEffect(() => {
    localStorage.setItem('neon_theme', currentTheme);
    const colors = THEMES[currentTheme];
    const root = document.documentElement;

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-bg', colors.bg);
    root.style.setProperty('--color-panel', colors.panel);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-muted', colors.muted);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-scroll-thumb', colors.scrollThumb);
    root.style.setProperty('--color-toggle-knob', colors.toggleKnob);

  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('neon_control_style', controlStyle);
    // Set data attribute for CSS selectors (Range inputs)
    document.documentElement.setAttribute('data-control-style', controlStyle);
  }, [controlStyle]);

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme: setCurrentTheme, 
      controlStyle, 
      setControlStyle, 
      colors: THEMES[currentTheme] 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
