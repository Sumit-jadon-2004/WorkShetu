// ======================================================
// WORKSHETU: BLINKIT-STYLE AUTOMATIC GPS LOCATION UTILITY
// Handles automatic browser geolocation, caching, reverse geocoding,
// and distance formatting without manual city dropdowns.
// ======================================================

const GPS_CACHE_KEY = "workshetu_gps_coords";

/**
 * Check if the browser supports Geolocation API
 */
export function isGeolocationSupported() {
  return typeof window !== "undefined" && "geolocation" in navigator;
}

/**
 * Retrieve cached GPS coordinates from session/local storage
 */
export function getStoredGpsLocation() {
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY) || localStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      data &&
      typeof data.latitude === "number" &&
      typeof data.longitude === "number" &&
      Number.isFinite(data.latitude) &&
      Number.isFinite(data.longitude)
    ) {
      return data;
    }
  } catch (err) {
    console.warn("Could not read cached GPS coordinates:", err);
  }
  return null;
}

/**
 * Save detected GPS location and resolved locality
 */
export function saveGpsLocation(data) {
  try {
    if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
      const payload = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy || null,
        locality: data.locality || "",
        city: data.city || "",
        displayName: data.displayName || data.locality || (data.city ? data.city : `${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)}`),
        timestamp: Date.now()
      };
      sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify(payload));
      localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(payload));
      // Clean up legacy manual city choice to prevent old city overrides
      localStorage.removeItem("workshetu_selected_city");
      return payload;
    }
  } catch (err) {
    console.warn("Could not cache GPS coordinates:", err);
  }
  return null;
}

/**
 * Clear stored GPS location
 */
export function clearGpsLocation() {
  try {
    sessionStorage.removeItem(GPS_CACHE_KEY);
    localStorage.removeItem(GPS_CACHE_KEY);
    localStorage.removeItem("workshetu_selected_city");
  } catch {}
}

/**
 * Request real-time GPS coordinates via browser Geolocation API
 */
export function requestGpsLocation(options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000
  } = options;

  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      const error = new Error("Geolocation is not supported by your browser.");
      error.code = "NOT_SUPPORTED";
      return reject(error);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        resolve(coords);
      },
      (geoError) => {
        let message = "Unable to retrieve your location.";
        let code = "UNKNOWN";

        if (geoError.code === geoError.PERMISSION_DENIED) {
          code = "PERMISSION_DENIED";
          message = "Location permission was denied. Please allow location access in your browser settings to find machines and workers near you.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          code = "POSITION_UNAVAILABLE";
          message = "Location information is unavailable. Please check your device GPS or connection.";
        } else if (geoError.code === geoError.TIMEOUT) {
          code = "TIMEOUT";
          message = "Location request timed out. Please click retry.";
        }

        const error = new Error(message);
        error.code = code;
        error.originalError = geoError;
        reject(error);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  });
}

/**
 * Reverse geocode latitude & longitude to get locality/city name for Blinkit-style display
 */
export async function reverseGeocode(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return { locality: "", city: "", displayName: "" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept-Language": "en"
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.village ||
        addr.residential ||
        addr.town ||
        addr.city_district ||
        addr.hamlet ||
        "";

      const city =
        addr.city ||
        addr.town ||
        addr.district ||
        addr.state_district ||
        addr.county ||
        "";

      let displayName = "";
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        displayName = `${locality}, ${city}`;
      } else if (locality) {
        displayName = locality;
      } else if (city) {
        displayName = city;
      } else {
        displayName = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
      }

      return { locality, city, displayName };
    }
  } catch {
    // Non-blocking fallback if reverse geocoding is slow or network error
  }

  return {
    locality: "Nearby Area",
    city: "",
    displayName: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
  };
}

/**
 * Format distance in km or meters for badges
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || isNaN(Number(distanceKm))) return "";
  const d = Number(distanceKm);
  if (d < 1) {
    return `${Math.round(d * 1000)} m away`;
  }
  return `${d.toFixed(1)} km away`;
}

// Backward compatibility helper if needed by legacy views
export function getStoredUserLocation(user = null) {
  const cached = getStoredGpsLocation();
  if (cached) {
    return {
      latitude: cached.latitude,
      longitude: cached.longitude,
      city: cached.city || cached.locality || "",
      displayName: cached.displayName || "",
      hasLocation: true
    };
  }

  const profileLat = user?.latitude != null && !isNaN(Number(user.latitude)) ? Number(user.latitude) : null;
  const profileLon = user?.longitude != null && !isNaN(Number(user.longitude)) ? Number(user.longitude) : null;
  const profileCity = user?.location || "";

  return {
    latitude: profileLat,
    longitude: profileLon,
    city: profileCity,
    displayName: profileCity,
    hasLocation: Boolean(profileLat != null && profileLon != null)
  };
}

export function saveGpsCoordinates(coords) {
  if (coords && coords.latitude != null && coords.longitude != null) {
    saveGpsLocation(coords);
  } else {
    clearGpsLocation();
  }
}
