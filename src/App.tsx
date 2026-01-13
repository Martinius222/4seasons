import { useState } from "react";
import "./App.css";

function App() {
  const [selectedAsset, setSelectedAsset] = useState("gold");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  return (
    <div className="container">
      <h1>4Seasons - Commodity Seasonality</h1>
      <div className="controls">
        <div className="control-group">
          <label>Asset:</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
          >
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="oil">Crude Oil</option>
            <option value="bitcoin">Bitcoin</option>
          </select>
        </div>
        <div className="control-group">
          <label>Year:</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            min="2000"
            max={new Date().getFullYear()}
          />
        </div>
      </div>
      <div className="chart-placeholder">
        <p>Chart will be displayed here</p>
        <p>Selected: {selectedAsset} - {selectedYear}</p>
      </div>
    </div>
  );
}

export default App;
