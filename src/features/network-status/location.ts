export interface ReportLocation { latitude: number; longitude: number; accuracyMeters: number | null; isManualPin: boolean; }

export function isPakistanLocation(latitude: number, longitude: number) { return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 23 && latitude <= 37 && longitude >= 60 && longitude <= 78; }

export function requestReportLocation(): Promise<ReportLocation> {
  if (typeof window === "undefined" || !window.isSecureContext) return Promise.reject(new Error("Location is available only on a secure connection (HTTPS or localhost)."));
  if (!navigator.geolocation) return Promise.reject(new Error("This browser does not support location services. Enter a location manually instead."));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    if (!isPakistanLocation(latitude, longitude)) { reject(new Error("Your location must be within Pakistan for this report.")); return; }
    resolve({ latitude, longitude, accuracyMeters: Number.isFinite(accuracy) ? Math.round(accuracy) : null, isManualPin: false });
  }, (error) => {
    const messages: Record<number, string> = { 1: "Location permission was denied. Allow location access or enter a location manually.", 2: "Your location could not be determined. Try again or enter it manually.", 3: "Location request timed out. Try again or enter it manually." };
    reject(new Error(messages[error.code] ?? "Location is unavailable. Enter it manually instead."));
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }));
}
