import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getStoredGpsLocation,
  saveGpsLocation,
  requestGpsLocation,
  reverseGeocode
} from "../utils/locationHelper.js";

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  // State Machine: 'idle' | 'requesting_location' | 'location_ready' | 'permission_denied' | 'error'
  const [locationStatus, setLocationStatus] = useState("idle");
  const [coordinates, setCoordinates] = useState(null);
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [locationError, setLocationError] = useState(null);

  // Guard against duplicate concurrent or repeated detection (e.g. React StrictMode)
  const isDetectingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const requestLocation = useCallback(async (forceRefresh = false) => {
    if (isDetectingRef.current) {
      console.log("[LOCATION_INIT] Location request already in flight, skipping duplicate call.");
      return;
    }

    // Step 1: Check cached coordinates if not forcing refresh
    if (!forceRefresh) {
      const cached = getStoredGpsLocation();
      if (cached && typeof cached.latitude === "number" && typeof cached.longitude === "number") {
        console.log(`[LOCATION_SUCCESS] Restored cached GPS: (${cached.latitude}, ${cached.longitude}) - ${cached.displayName}`);
        setCoordinates({
          latitude: cached.latitude,
          longitude: cached.longitude,
          accuracy: cached.accuracy || null
        });
        setLocality(cached.locality || "");
        setCity(cached.city || "");
        setDisplayName(cached.displayName || `${cached.latitude.toFixed(3)}, ${cached.longitude.toFixed(3)}`);
        setLocationError(null);
        setLocationStatus("location_ready");
        return;
      }
    }

    isDetectingRef.current = true;
    setLocationStatus("requesting_location");
    setLocationError(null);
    console.log(`[LOCATION_INIT] Requesting browser GPS coordinates (forceRefresh=${forceRefresh})...`);

    try {
      const coords = await requestGpsLocation({ timeout: 10000, enableHighAccuracy: true });
      console.log(`[LOCATION_SUCCESS] Acquired GPS: (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);

      // ── ZERO-LATENCY FAST PATH: Immediately set coordinates and mark location_ready ──
      // This allows Machine and Labour API requests to fire in parallel IMMEDIATELY without waiting 2-4 seconds for external reverse geocoding
      const fallbackName = `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;
      setCoordinates({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || null
      });
      setDisplayName(fallbackName);
      setLocationError(null);
      setLocationStatus("location_ready");

      // Save baseline coordinates to cache immediately
      saveGpsLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || null,
        locality: "",
        city: "",
        displayName: fallbackName
      });

      // ── Asynchronous non-blocking reverse geocode in background ──
      reverseGeocode(coords.latitude, coords.longitude)
        .then((geoInfo) => {
          if (!geoInfo) return;
          const name = geoInfo.displayName || fallbackName;
          setLocality(geoInfo.locality || "");
          setCity(geoInfo.city || "");
          setDisplayName(name);

          saveGpsLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy || null,
            locality: geoInfo.locality || "",
            city: geoInfo.city || "",
            displayName: name
          });
          console.log(`[LOCATION_REVERSE_GEO] Resolved locality: ${name}`);
        })
        .catch((geoErr) => {
          console.warn("[LOCATION_REVERSE_GEO_WARN] Background reverse geocode warning:", geoErr);
        });
    } catch (err) {
      console.warn(`[LOCATION_ERROR] Detection failed: ${err.message} (code=${err.code})`);
      if (err.code === "PERMISSION_DENIED") {
        console.log("[LOCATION_PERMISSION] User denied browser location permission.");
        setLocationStatus("permission_denied");
        setLocationError("Location permission denied. Please allow location access in your browser settings.");
      } else {
        setLocationStatus("error");
        setLocationError(err.message || "Failed to acquire location. Please try again.");
      }
    } finally {
      isDetectingRef.current = false;
    }
  }, []);

  // Initialize once on provider mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      requestLocation(false);
    }
  }, [requestLocation]);

  const refreshLocation = useCallback(() => {
    return requestLocation(true);
  }, [requestLocation]);

  const value = {
    locationStatus,
    coordinates,
    locality,
    city,
    displayName,
    locationError,
    hasLocation: Boolean(coordinates?.latitude != null && coordinates?.longitude != null),
    requestLocation,
    refreshLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useUserLocation must be used within a LocationProvider");
  }
  return context;
}
