import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import mockLocations from "../data/mockLocations";
import RiskBadge from "./RiskBadge";
import MapLegend from "./MapLegend";

/* ------------------------------------------------------------------ */
/*  Marker color by risk level                                        */
/* ------------------------------------------------------------------ */

const riskColors = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

/* ------------------------------------------------------------------ */
/*  RiskMap — reusable, self-contained Leaflet map component           */
/* ------------------------------------------------------------------ */

export default function RiskMap({
  locations = mockLocations,
  height = "600px",
  zoom = 12,
  showLegend = true,
  compact = false,
}) {
  return (
    <div className="relative rounded-sm overflow-hidden">
      <MapContainer
        center={[21.1458, 79.0882]}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full"
        style={{ height }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc) => {
          const color = riskColors[loc.risk_level] || riskColors.Low;
          const baseRadius = compact ? 5 : 7;
          const critRadius = compact ? 7 : 10;

          return (
            <CircleMarker
              key={loc.junction_id}
              center={[loc.lat, loc.lng]}
              radius={loc.unmanned_critical ? critRadius : baseRadius}
              pathOptions={{
                color: loc.unmanned_critical ? "#ffffff" : color,
                weight: loc.unmanned_critical ? 3 : 2,
                fillColor: color,
                fillOpacity: 0.85,
                dashArray: loc.unmanned_critical ? "4 3" : undefined,
              }}
            >
              <Popup>
                <div className="text-sm min-w-[180px] font-sans">
                  <p className="font-bold text-gray-900 text-base mb-1">
                    {loc.name}
                  </p>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-3">Risk Score</td>
                        <td className="font-semibold text-gray-800">{loc.risk_score}</td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-3">Level</td>
                        <td><RiskBadge level={loc.risk_level} /></td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 py-0.5 pr-3">Police</td>
                        <td className="font-semibold text-gray-800">{loc.police_assigned}</td>
                      </tr>
                    </tbody>
                  </table>
                  {loc.unmanned_critical && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600 uppercase tracking-wide">
                      ⚠ Unmanned Critical
                    </p>
                  )}
                  <Link
                    to={`/locations/${loc.junction_id}`}
                    className="inline-block mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    View Details →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {showLegend && <MapLegend compact={compact} />}
    </div>
  );
}
