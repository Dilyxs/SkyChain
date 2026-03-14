import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getAllZones, createZone, deleteZone, initAuthority, isAuthorityInitialized, connection } from "./program";
import { findContainingZone } from "./geometry";
import type { NoFlyZone, ZonePoint } from "./types";
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
const MAX_VERTICES = 10;

// ── Click handlers ────────────────────────────────────────────

function CheckClickHandler({
  zones,
  onCheck,
}: {
  zones: NoFlyZone[];
  onCheck: (result: { lat: number; lng: number; polygonId: string | null }) => void;
}) {
  useMapEvents({
    click(e) {
      const point: ZonePoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      const found = findContainingZone(point, zones);
      onCheck({ lat: e.latlng.lat, lng: e.latlng.lng, polygonId: found ? found.polygonId : null });
    },
  });
  return null;
}

function DrawClickHandler({ onVertex }: { onVertex: (p: ZonePoint) => void }) {
  useMapEvents({
    click(e) {
      onVertex({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// ── Main component ────────────────────────────────────────────

function Map() {
  const [zones, setZones] = useState<NoFlyZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkResult, setCheckResult] = useState<{
    lat: number; lng: number; polygonId: string | null;
  } | null>(null);

  // Admin mode
  const [adminMode, setAdminMode] = useState(false);
  const [vertices, setVertices] = useState<ZonePoint[]>([]);
  const [polygonId, setPolygonId] = useState("");
  const [zoneId, setZoneId] = useState("1");
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [txStatus, setTxStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [authorityReady, setAuthorityReady] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wallet adapter
  const { connection: walletConnection } = useConnection();
  const anchorWallet = useAnchorWallet();

  // Build AnchorProvider from whichever signer is available.
  // Wallet adapter takes priority over keypair file.
  const activeProvider = useMemo<AnchorProvider | null>(() => {
    if (anchorWallet) {
      return new AnchorProvider(walletConnection, anchorWallet, { commitment: "confirmed" });
    }
    if (keypair) {
      const kpWallet = {
        publicKey: keypair.publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
          if (tx instanceof Transaction) tx.sign(keypair);
          return tx;
        },
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
          txs.forEach((tx) => { if (tx instanceof Transaction) tx.sign(keypair); });
          return txs;
        },
      };
      return new AnchorProvider(connection, kpWallet, { commitment: "confirmed" });
    }
    return null;
  }, [anchorWallet, keypair, walletConnection]);

  // Re-check authority whenever the active signer changes
  useEffect(() => {
    if (!activeProvider) { setAuthorityReady(null); return; }
    setAuthorityReady(null);
    isAuthorityInitialized().then(setAuthorityReady);
  }, [activeProvider]);

  useEffect(() => {
    getAllZones()
      .then(setZones)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleKeypairFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const bytes = JSON.parse(ev.target?.result as string) as number[];
        setKeypair(Keypair.fromSecretKey(Uint8Array.from(bytes)));
        setTxStatus({ ok: true, msg: "Keypair loaded." });
      } catch {
        setTxStatus({ ok: false, msg: "Invalid keypair file." });
      }
    };
    reader.readAsText(file);
  }

  function handleVertex(p: ZonePoint) {
    if (vertices.length >= MAX_VERTICES) return;
    setVertices((v) => [...v, p]);
  }

  function undoVertex() {
    setVertices((v) => v.slice(0, -1));
  }

  function resetDraw() {
    setVertices([]);
    setPolygonId("");
    setZoneId("1");
    setTxStatus(null);
  }

  async function handleInitAuthority() {
    if (!activeProvider) { setTxStatus({ ok: false, msg: "Connect a wallet or load a keypair first." }); return; }
    if (authorityReady) { setTxStatus({ ok: true, msg: "Authority already initialized." }); return; }
    setInitializing(true);
    setTxStatus(null);
    try {
      const sig = await initAuthority(activeProvider);
      setAuthorityReady(true);
      setTxStatus({ ok: true, msg: `Authority initialized. TX: ${sig}` });
    } catch (err) {
      setTxStatus({ ok: false, msg: String(err) });
    } finally {
      setInitializing(false);
    }
  }

  async function handleSubmit() {
    if (!activeProvider) { setTxStatus({ ok: false, msg: "Connect a wallet or load a keypair first." }); return; }
    if (!polygonId.trim()) { setTxStatus({ ok: false, msg: "polygon_id is required." }); return; }
    if (vertices.length < 3) { setTxStatus({ ok: false, msg: "Draw at least 3 vertices." }); return; }
    const id = parseInt(zoneId, 10);
    if (isNaN(id) || id < 0) { setTxStatus({ ok: false, msg: "zone_id must be a positive number." }); return; }

    setSubmitting(true);
    setTxStatus(null);
    try {
      const sig = await createZone(activeProvider, polygonId.trim(), id, vertices);
      setTxStatus({ ok: true, msg: `TX: ${sig}` });
      const updated = await getAllZones();
      setZones(updated);
      resetDraw();
    } catch (err) {
      setTxStatus({ ok: false, msg: String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  const positions = vertices.map((p) => [p.lat, p.lng] as [number, number]);

  const signerLabel = anchorWallet
    ? `Wallet: ${anchorWallet.publicKey.toString().slice(0, 8)}…`
    : keypair
      ? `Keypair: ${keypair.publicKey.toString().slice(0, 8)}…`
      : null;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* Status bar */}
      {!adminMode && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: checkResult ? (checkResult.polygonId ? "#dc2626" : "#16a34a") : "#1e293b",
          color: "white", padding: "10px 24px", borderRadius: 8,
          fontFamily: "monospace", fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}>
          {loading
            ? "Loading zones from Solana..."
            : checkResult
              ? checkResult.polygonId
                ? `NO-FLY ZONE: ${checkResult.polygonId}`
                : `CLEAR at (${checkResult.lat.toFixed(4)}, ${checkResult.lng.toFixed(4)})`
              : `${zones.length} zones loaded. Click anywhere to check.`}
        </div>
      )}

      {/* Admin toggle */}
      <button
        onClick={() => { setAdminMode((m) => !m); resetDraw(); setCheckResult(null); }}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 1000,
          background: adminMode ? "#7c3aed" : "#1e293b", color: "white",
          border: "none", borderRadius: 8, padding: "10px 18px",
          fontFamily: "monospace", fontSize: 13, cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {adminMode ? "⬡ Admin mode ON" : "⬡ Admin mode"}
      </button>

      {/* Admin panel */}
      {adminMode && (
        <div style={{
          position: "absolute", top: 60, right: 16, zIndex: 1000,
          background: "#1e293b", color: "white", borderRadius: 10,
          padding: 16, width: 260, fontFamily: "monospace", fontSize: 13,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)", display: "flex",
          flexDirection: "column", gap: 10,
        }}>
          <div style={{ fontWeight: "bold", borderBottom: "1px solid #334155", paddingBottom: 8 }}>
            Create No-Fly Zone
          </div>

          {/* Active signer indicator */}
          {signerLabel && (
            <div style={{ fontSize: 11, color: "#86efac", background: "#14532d", borderRadius: 6, padding: "4px 8px" }}>
              ✓ {signerLabel}
            </div>
          )}

          {/* Wallet adapter connect */}
          <div>
            <div style={{ marginBottom: 6, color: "#94a3b8" }}>Browser wallet</div>
            <WalletMultiButton style={{
              width: "100%", justifyContent: "center", fontSize: 12,
              height: 32, background: anchorWallet ? "#166534" : "#334155",
            }} />
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 11 }}>
            <div style={{ flex: 1, height: 1, background: "#334155" }} />
            or
            <div style={{ flex: 1, height: 1, background: "#334155" }} />
          </div>

          {/* Keypair file loader */}
          <div>
            <div style={{ marginBottom: 4, color: "#94a3b8" }}>Load keypair file</div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "6px 0", background: keypair ? "#166534" : "#334155",
                color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12,
              }}
            >
              {keypair ? `✓ ${keypair.publicKey.toString().slice(0, 12)}…` : "Load id.json"}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleKeypairFile} />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#334155" }} />

          {/* polygon_id */}
          <div>
            <div style={{ marginBottom: 4, color: "#94a3b8" }}>polygon_id</div>
            <input
              value={polygonId}
              onChange={(e) => setPolygonId(e.target.value)}
              placeholder="e.g. mtl-airport-2"
              style={{
                width: "100%", padding: "6px 8px", background: "#0f172a", color: "white",
                border: "1px solid #334155", borderRadius: 6, fontSize: 12, boxSizing: "border-box",
              }}
            />
          </div>

          {/* zone_id */}
          <div>
            <div style={{ marginBottom: 4, color: "#94a3b8" }}>zone_id (group number)</div>
            <input
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              type="number"
              min="0"
              style={{
                width: "100%", padding: "6px 8px", background: "#0f172a", color: "white",
                border: "1px solid #334155", borderRadius: 6, fontSize: 12, boxSizing: "border-box",
              }}
            />
          </div>

          {/* Vertex counter + undo */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: vertices.length >= MAX_VERTICES ? "#f59e0b" : "#94a3b8" }}>
              {vertices.length}/{MAX_VERTICES} vertices
            </span>
            <button
              onClick={undoVertex}
              disabled={vertices.length === 0}
              style={{
                padding: "4px 10px", background: "#334155", color: "white",
                border: "none", borderRadius: 6, cursor: vertices.length > 0 ? "pointer" : "not-allowed",
                fontSize: 12, opacity: vertices.length === 0 ? 0.4 : 1,
              }}
            >
              Undo
            </button>
          </div>

          <div style={{ color: "#64748b", fontSize: 11 }}>
            Click the map to add vertices
          </div>

          {/* Init authority */}
          <button
            onClick={handleInitAuthority}
            disabled={initializing || authorityReady === true}
            style={{
              width: "100%", padding: "6px 0",
              background: authorityReady ? "#14532d" : initializing ? "#334155" : "#0f172a",
              color: authorityReady ? "#86efac" : "#94a3b8",
              border: "1px solid #334155", borderRadius: 6,
              cursor: (initializing || authorityReady === true) ? "not-allowed" : "pointer",
              fontSize: 11,
            }}
          >
            {authorityReady === null
              ? activeProvider ? "Init authority (checking…)" : "Init authority (one-time)"
              : authorityReady
                ? "✓ Authority ready"
                : initializing ? "Initializing…" : "Init authority (one-time)"}
          </button>

          {/* Submit / Clear */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1, padding: "8px 0", background: submitting ? "#334155" : "#7c3aed",
                color: "white", border: "none", borderRadius: 6,
                cursor: submitting ? "not-allowed" : "pointer", fontSize: 13,
              }}
            >
              {submitting ? "Sending…" : "Submit"}
            </button>
            <button
              onClick={resetDraw}
              style={{
                padding: "8px 12px", background: "#334155", color: "white",
                border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
              }}
            >
              Clear
            </button>
          </div>

          {/* TX status */}
          {txStatus && (
            <div style={{
              background: txStatus.ok ? "#14532d" : "#7f1d1d",
              borderRadius: 6, padding: "8px 10px", fontSize: 11,
              wordBreak: "break-all", lineHeight: 1.5,
            }}>
              {txStatus.msg}
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{ y}.png"
        />

        {/* Existing no-fly zones */}
        {zones.map((zone) => (
          <Polygon
            key={zone.polygonId}
            positions={zone.polygon.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.3, weight: 2 }}
          >
            <Popup>
              <strong>{zone.polygonId}</strong><br />
              Zone ID: {zone.zoneId}<br />
              Owner: {zone.owner.toString().slice(0, 8)}...
              {adminMode && activeProvider && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete zone "${zone.polygonId}"?`)) return;
                      try {
                        await deleteZone(activeProvider, zone.polygonId);
                        setZones((z) => z.filter((z2) => z2.polygonId !== zone.polygonId));
                        setTxStatus({ ok: true, msg: `Deleted ${zone.polygonId}.` });
                      } catch (err) {
                        setTxStatus({ ok: false, msg: String(err) });
                      }
                    }}
                    style={{
                      background: "#dc2626", color: "white", border: "none",
                      borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                    }}
                  >
                    Delete zone
                  </button>
                </div>
              )}
            </Popup>
          </Polygon>
        ))}

        {/* Drawing preview */}
        {adminMode && vertices.length >= 2 && (
          <Polyline
            positions={[...positions, positions[0]]}
            pathOptions={{ color: "#7c3aed", weight: 2, dashArray: "6 4" }}
          />
        )}
        {adminMode && vertices.length >= 3 && (
          <Polygon
            positions={positions}
            pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.2, weight: 0 }}
          />
        )}
        {adminMode && vertices.map((v, i) => (
          <Marker key={i} position={[v.lat, v.lng]}>
            <Popup>Vertex {i + 1}<br />{v.lat.toFixed(5)}, {v.lng.toFixed(5)}</Popup>
          </Marker>
        ))}

        {/* Check mode: clicked marker */}
        {!adminMode && checkResult && (
          <Marker position={[checkResult.lat, checkResult.lng]}>
            <Popup>{checkResult.polygonId ? `Inside: ${checkResult.polygonId}` : "Clear to fly"}</Popup>
          </Marker>
        )}

        {adminMode
          ? <DrawClickHandler onVertex={handleVertex} />
          : <CheckClickHandler zones={zones} onCheck={setCheckResult} />
        }
      </MapContainer>
    </div>
  );
}

export default Map;
