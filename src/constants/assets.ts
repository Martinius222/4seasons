import { Asset } from '../types';

export const ASSETS: Asset[] = [
  // Precious Metals
  { id: "gold", name: "Gold", symbol: "GC=F" },
  { id: "silver", name: "Silver", symbol: "SI=F" },
  { id: "platinum", name: "Platinum", symbol: "PL=F" },
  { id: "palladium", name: "Palladium", symbol: "PA=F" },

  // Industrial Metals
  { id: "copper", name: "Copper", symbol: "HG=F" },

  // Energy
  { id: "oil", name: "Crude Oil", symbol: "CL=F" },
  { id: "natgas", name: "Natural Gas", symbol: "NG=F" },
  { id: "heating_oil", name: "Heating Oil", symbol: "HO=F" },
  { id: "gasoline", name: "Gasoline", symbol: "RB=F" },

  // Agricultural
  { id: "corn", name: "Corn", symbol: "ZC=F" },
  { id: "wheat", name: "Wheat", symbol: "ZW=F" },
  { id: "soybeans", name: "Soybeans", symbol: "ZS=F" },
  { id: "coffee", name: "Coffee", symbol: "KC=F" },
  { id: "sugar", name: "Sugar", symbol: "SB=F" },
  { id: "cotton", name: "Cotton", symbol: "CT=F" },

  // Crypto & Indices
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC-USD" },
  { id: "sp500", name: "S&P 500", symbol: "^GSPC" },
  { id: "eurusd", name: "EUR/USD", symbol: "EURUSD=X" },
];
