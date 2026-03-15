import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export const PURPLE = "#7B61FF";

export interface ThemeColors {
  bg: string;
  tabBg: string;
  text: string;
  subText: string;
  border: string;
  chipBg: string;
  modalBackdrop: string;
  primary: string;
}

export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const theme = useMemo<ThemeContextType>(() => ({
    isDarkMode,
    toggleTheme: () => setIsDarkMode((prev) => !prev),
    colors: {
      bg: isDarkMode ? "#0B0B0F" : "#F2F2F7",
      tabBg: isDarkMode ? "#27272c" : "#FFFFFF",
      text: isDarkMode ? "#FFFFFF" : "#000000",
      subText: isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
      border: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
      chipBg: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      modalBackdrop: isDarkMode ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
      primary: PURPLE
    }
  }), [isDarkMode]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};