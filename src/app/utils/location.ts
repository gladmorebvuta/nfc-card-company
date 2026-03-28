export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  city: string | null;
  country: string | null;
}

/**
 * Get the device's current location and reverse-geocode it to city/country.
 * Returns null silently if permission is denied or times out.
 * Uses Nominatim (OpenStreetMap) — no API key required.
 */
export async function getLocation(timeoutMs = 6000): Promise<LocationData | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve(pos.coords); },
      ()    => { clearTimeout(timer); resolve(null); },
      { timeout: timeoutMs, maximumAge: 60_000, enableHighAccuracy: false }
    );
  });

  if (!coords) return null;

  const base: LocationData = {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: Math.round(coords.accuracy),
    city: null,
    country: null,
  };

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    base.city    = data.address?.city || data.address?.town || data.address?.village || data.address?.county || null;
    base.country = data.address?.country_code?.toUpperCase() || null;
  } catch {
    // Reverse geocode failed — return raw coords only
  }

  return base;
}
