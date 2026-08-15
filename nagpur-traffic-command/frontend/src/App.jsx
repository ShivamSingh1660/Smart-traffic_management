import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import RiskHeatmap from "./pages/RiskHeatmap";
import HighRiskLocations from "./pages/HighRiskLocations";
import LocationDetail from "./pages/LocationDetail";
import PoliceDeployment from "./pages/PoliceDeployment";
import ActiveIncidents from "./pages/ActiveIncidents";
import Recommendations from "./pages/Recommendations";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="heatmap" element={<RiskHeatmap />} />
          <Route path="locations" element={<HighRiskLocations />} />
          <Route path="locations/:id" element={<LocationDetail />} />
          <Route path="deployment" element={<PoliceDeployment />} />
          <Route path="incidents" element={<ActiveIncidents />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
