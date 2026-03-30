/*
  ThemeContext.tsx
  ─────────────────────────────────────────────────────────────
  PURPOSE:
    Provides a global theme state ("dark" | "light") to the entire app.
    Any component can call useTheme() to read the current theme or toggle it.

  HOW IT WORKS:
    1. React.createContext() creates a context object with a default value.
    2. ThemeProvider wraps the whole app (in index.tsx) and holds the state.
    3. useEffect writes the theme to localStorage so it persists across reloads.
    4. useEffect also sets data-theme attribute on <html> so CSS variables
       in App.css ([data-theme="dark"] / [data-theme="light"]) activate.
    5. useTheme() is a custom hook — any component calls it to get {theme, toggleTheme}.

  USAGE IN COMPONENTS:
    import { useTheme } from '../context/ThemeContext';
    const { theme, toggleTheme } = useTheme();
*/

import React, { createContext, useContext, useState, useEffect } from "react";

// The shape of the context value
interface ThemeContextType {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

// createContext needs a default — null-ish default, overridden by Provider
const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

// ThemeProvider wraps the app. Children can call useTheme() anywhere below it.
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage if it exists, otherwise default to "dark"
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("sentinel_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    // Set data-theme on <html> so CSS variables ([data-theme="dark"]) activate
    document.documentElement.setAttribute("data-theme", theme);
    // Persist choice so it survives page reload
    localStorage.setItem("sentinel_theme", theme);
  }, [theme]); // Runs every time theme changes

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook — components call this instead of useContext(ThemeContext) directly
export const useTheme = () => useContext(ThemeContext);