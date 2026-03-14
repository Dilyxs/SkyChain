import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { getAllZones } from "./lib/program";
import { findContainingZone } from "./lib/geometry";
import type { NoFlyZone, ZonePoint } from "./lib/types";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue with bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER: ZonePoint = { lat: 45.5017, lng: -73.5673 };
const DEFAULT_ZOOM = 12;

function ClickHandler({
  zones,
  onCheck,
}: {
  zones: NoFlyZone[];
  onCheck: (result: {
    lat: number;
    lng: number;
    polygonId: string | null;
  }) => void;
}) {
  useMapEvents({
    click(e) {
      const point: ZonePoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      const found = findContainingZone(point, zones);
      onCheck({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        polygonId: found ? found.polygonId : null,
      });
    },
  });
  return null;
}

function Map() {
  const [zones, setZones] = useState<NoFlyZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<{
    lat: number;
    lng: number;
    polygonId: string | null;
  } | null>(null);

  useEffect(() => {
    getAllZones()
      .then(setZones)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Status bar */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: checkResult
            ? checkResult.polygonId
              ? "#dc2626"
              : "#16a34a"
            : "#1e293b",
          color: "white",
          padding: "10px 24px",
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {loading
          ? "Loading zones from Solana..."
          : checkResult
            ? checkResult.polygonId
              ? `NO-FLY ZONE: ${checkResult.polygonId}`
              : `CLEAR at (${checkResult.lat.toFixed(4)}, ${checkResult.lng.toFixed(4)})`
            : `${zones.length} zones loaded. Click anywhere to check.`}
      </div>

      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Draw no-fly zones */}
        {zones.map((zone) => (
          <Polygon
            key={zone.polygonId}
            positions={zone.polygon.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#dc2626",
              fillOpacity: 0.3,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{zone.polygonId}</strong>
              <br />
              Zone ID: {zone.zoneId}
              <br />
              Owner: {zone.owner.slice(0, 8)}...
            </Popup>
          </Polygon>
        ))}

        {/* Clicked marker */}
        {checkResult && (
          <Marker position={[checkResult.lat, checkResult.lng]}>
            <Popup>
              {checkResult.polygonId
                ? `Inside: ${checkResult.polygonId}`
                : "Clear to fly"}
            </Popup>
          </Marker>
        )}

        <ClickHandler zones={zones} onCheck={setCheckResult} />
      </MapContainer>
    </div>
  );
}
export default Map;
