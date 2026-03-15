import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DiscoveryContextType {
  smartTimeEnabled: boolean;
  setSmartTimeEnabled: (val: boolean) => void;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  allowExplicit: boolean;
  setAllowExplicit: (val: boolean) => void;
  discoveryLevel: string;
  setDiscoveryLevel: (val: string) => void;
  selectedMood: string;
  setSelectedMood: (val: string) => void;
  getDiscoveryPayload: () => any; 
}

const DiscoveryContext = createContext<DiscoveryContextType | null>(null);

export const DiscoveryProvider = ({ children }: { children: ReactNode }) => {
  const [smartTimeEnabled, setSmartTimeEnabled] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [allowExplicit, setAllowExplicit] = useState(true);
  const [discoveryLevel, setDiscoveryLevel] = useState("Balanced");
  const [selectedMood, setSelectedMood] = useState("Any");

  const getDiscoveryPayload = () => {
    const currentHour = new Date().getHours();
    let energyRange = [0.0, 1.0];
    let popularityRange = [0, 100];
    let valenceRange = [0.0, 1.0];

    if (smartTimeEnabled) {
      if (currentHour >= 6 && currentHour < 12) energyRange = [0.7, 1.0]; 
      else if (currentHour >= 18 || currentHour < 6) energyRange = [0.0, 0.4]; 
    }

    if (discoveryLevel === "Hits") popularityRange = [70, 100];
    else if (discoveryLevel === "Deep Cuts") popularityRange = [0, 35];

    if (selectedMood === "Upbeat") valenceRange = [0.7, 1.0];
    else if (selectedMood === "Melancholy") valenceRange = [0.0, 0.3];

    return {
      limit: 10,
      filters: {
        min_energy: energyRange[0],
        max_energy: energyRange[1],
        min_popularity: popularityRange[0],
        max_popularity: popularityRange[1],
        min_valence: valenceRange[0],
        max_valence: valenceRange[1],
        instrumentalness: isFocusMode ? 0.7 : null, 
        explicit: allowExplicit ? null : false,
      }
    };
  };

  return (
    <DiscoveryContext.Provider value={{
      smartTimeEnabled, setSmartTimeEnabled,
      isFocusMode, setIsFocusMode,
      allowExplicit, setAllowExplicit,
      discoveryLevel, setDiscoveryLevel,
      selectedMood, setSelectedMood,
      getDiscoveryPayload
    }}>
      {children}
    </DiscoveryContext.Provider>
  );
};

export const useDiscovery = () => {
  const context = useContext(DiscoveryContext);
  if (!context) throw new Error("useDiscovery must be used within DiscoveryProvider");
  return context;
};