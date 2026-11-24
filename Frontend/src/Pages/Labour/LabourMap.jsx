import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { MapPin, ShieldCheck, Navigation, RefreshCw, AlertCircle, Compass } from "lucide-react";

// Self-contained custom SVG DivIcon for the worker's approximate service area
// Eliminates external CDN dependencies (unpkg/cdnjs) that fail offline or behind firewalls
const workerPinIcon = L.divIcon({
  className: "custom-worker-pin",
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <div style="position: absolute; width: 34px; height: 34px; background: #059669; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(0,0,0,0.35);"></div>
      <div style="position: relative; z-index: 2; width: 14px; height: 14px; background: #bef264; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});

// Self-contained custom SVG DivIcon for the customer's current GPS location
const customerPinIcon = L.divIcon({
  className: "custom-customer-pin",
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 30px; height: 30px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(37,99,235,0.4);"></div>
      <div style="position: relative; z-index: 2; width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Controller to smoothly center map, handle window resizing, and invalidate container size
function MapController({ position, onMapReady }) {
  const map = useMap();

  useEffect(() => {
    if (position && Array.isArray(position) && position.length === 2) {
      map.setView(position, 12, { animate: false });
    }
    // Invalidate size immediately and after layout finishes to prevent blank gray tiles
    const timer1 = setTimeout(() => map.invalidateSize(), 50);
    const timer2 = setTimeout(() => map.invalidateSize(), 250);
    const timer3 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener("resize", handleResize);
    };
  }, [map, position]);

  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  return null;
}

export function WorkerLocationMap({ location }) {
  const { t } = useTranslation();
  const [customerPosition, setCustomerPosition] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [tilesLoading, setTilesLoading] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [mapKey, setMapKey] = useState(1);
  const mapRef = useRef(null);

  const coordinates = location?.coordinates;
  const workerPosition = useMemo(() => {
    if (
      !coordinates ||
      coordinates.latitude == null ||
      coordinates.longitude == null ||
      coordinates.latitude === "" ||
      coordinates.longitude === ""
    ) return null;
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);
    return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
      ? [latitude, longitude]
      : null;
  }, [coordinates]);

  const radiusKm = Number(location?.serviceRadiusKm);
  const hasRadius = Number.isFinite(radiusKm) && radiusKm > 0;
  const publicAddress = location?.publicLocation || location?.serviceLocation || location?.location || "";
  const isCityCenter = Boolean(location?.isCityCenter || coordinates?.isCityCenter);

  // Locate the customer's GPS position
  const getCustomerLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(t("labourProfile.browserLocationUnsupported", "Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCustomerPosition([coords.latitude, coords.longitude]);
      },
      () => {
        setLocationError(t("labourProfile.customerLocationDenied", "Location permission denied."));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleRetryMap = useCallback(() => {
    setTileError(false);
    setTilesLoading(true);
    setMapKey((k) => k + 1);
  }, []);

  // Safety timeout: dismiss loading overlay after 900ms so map is never blocked
  useEffect(() => {
    const timer = setTimeout(() => {
      setTilesLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [mapKey]);

  // Clean, modern fallback state when coordinates cannot be determined
  if (!workerPosition) {
    return (
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <MapPin size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">
              {t("labourProfile.mapTitle", "Service Location")}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {publicAddress || t("labourProfile.locationUnavailable", "Location address not specified")}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center dark:border-slate-800 dark:bg-slate-800/40">
          <Compass className="mx-auto text-slate-400" size={36} />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
            Interactive map not available for this worker
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            The worker operates in <span className="font-bold text-slate-700 dark:text-slate-200">{publicAddress || "their local service region"}</span>. Exact GPS coordinates are kept private for worker privacy.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{t("labourProfile.privateCoordinates", "Exact worker coordinates are private.")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* ── Section Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <MapPin size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-950 dark:text-white truncate">
              {t("labourProfile.mapTitle", "Service Location")}
            </h2>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {publicAddress || t("labourProfile.approximateServiceArea", "Approximate Service Area")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>{t("labourProfile.privateCoordinates", "Exact worker coordinates are private.")}</span>
          </div>

          <button
            type="button"
            onClick={getCustomerLocation}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Navigation size={13} className="text-blue-600" />
            <span>{t("labourProfile.useMyLocation", "Locate Me")}</span>
          </button>
        </div>
      </div>

      {locationError && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle size={15} />
          <span>{locationError}</span>
        </div>
      )}

      {/* ── Interactive Map Container ── */}
      <div className="relative h-[320px] w-full sm:h-[380px] bg-slate-100 dark:bg-slate-800">
        {/* Loading Overlay */}
        {tilesLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/70 backdrop-blur-[2px] dark:bg-slate-900/70 transition-opacity">
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-md dark:bg-slate-800 dark:text-slate-200">
              <RefreshCw size={14} className="animate-spin text-emerald-600" />
              <span>Loading service map...</span>
            </div>
          </div>
        )}

        {/* Tile Error Fallback Banner */}
        {tileError && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between rounded-xl bg-amber-500/90 px-3.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md">
            <span>Map tiles temporarily slow or unreachable.</span>
            <button
              type="button"
              onClick={handleRetryMap}
              className="rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-black hover:bg-white/30"
            >
              Retry
            </button>
          </div>
        )}

        <MapContainer
          key={mapKey}
          center={workerPosition}
          zoom={12}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
          ref={mapRef}
          whenReady={() => {
            setTilesLoading(false);
          }}
        >
          <MapController position={workerPosition} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              load: () => setTilesLoading(false),
              tileload: () => setTilesLoading(false),
              tileerror: () => {
                setTilesLoading(false);
                setTileError(true);
              }
            }}
          />

          {/* Worker Service Location Marker */}
          <Marker position={workerPosition} icon={workerPinIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-black text-slate-900">
                  {isCityCenter ? "Approximate City Service Area" : "Worker Service Location"}
                </p>
                <p className="mt-0.5 text-slate-600">{publicAddress}</p>
                {hasRadius && (
                  <p className="mt-1 font-bold text-emerald-700">
                    Covers {radiusKm} km radius
                  </p>
                )}
                <p className="mt-1 text-[10px] text-slate-400">
                  Exact home address is kept private
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Service Radius Circle */}
          {hasRadius && (
            <Circle
              center={workerPosition}
              radius={Math.min(radiusKm, 100) * 1000}
              pathOptions={{
                color: "#059669",
                fillColor: "#10b981",
                fillOpacity: 0.14,
                weight: 2,
                dashArray: "5, 5"
              }}
            />
          )}

          {/* Customer GPS Location Marker */}
          {customerPosition && (
            <Marker position={customerPosition} icon={customerPinIcon}>
              <Popup>
                <div className="p-1 text-xs font-bold text-slate-900">
                  Your approximate location
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* ── Location Information Section Below Map ── */}
      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 p-4 sm:p-5 text-xs font-semibold text-slate-600 dark:divide-slate-800 dark:text-slate-300">
        <div className="py-2.5 sm:px-3 first:pl-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Service Area</p>
          <p className="mt-0.5 font-bold text-slate-900 dark:text-white truncate">
            {publicAddress || "Service region"}
          </p>
        </div>

        <div className="py-2.5 sm:px-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Coverage Radius</p>
          <p className="mt-0.5 font-bold text-slate-900 dark:text-white">
            {hasRadius ? `${radiusKm} km radius from center` : "Local area"}
          </p>
        </div>

        <div className="py-2.5 sm:px-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Privacy Protection</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={14} />
            <span>Exact worker coordinates are private.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
export default WorkerLocationMap;
