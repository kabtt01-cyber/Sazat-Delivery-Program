import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass, Shield, Clock, AlertCircle } from 'lucide-react';
import { Ride, RideStatus } from '../types';
import { updateRideCoordinates, updateUserCoordinates } from '../utils/db';

export const SADAT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'المنطقة الصناعية الأولى': { lat: 30.366, lng: 30.551 },
  'المنطقة الصناعية الثانية': { lat: 30.354, lng: 30.569 },
  'جامعة مدينة السادات (المقر الرئيسي)': { lat: 30.385, lng: 30.505 },
  'كلية التربية الرياضية': { lat: 30.387, lng: 30.526 },
  'المنطقة السكنية الأولى (السوق القديم)': { lat: 30.389, lng: 30.536 },
  'المنطقة السكنية الرابعة': { lat: 30.392, lng: 30.522 },
  'المنطقة السكنية السابعة (العائلات)': { lat: 30.373, lng: 30.501 },
  'المنطقة السكنية الحادية عشر': { lat: 30.375, lng: 30.485 },
  'مول السادات التجاري': { lat: 30.383, lng: 30.518 },
  'مستشفى السادات العام': { lat: 30.380, lng: 30.515 },
  'هايبر خير زمان (المحور)': { lat: 30.381, lng: 30.521 },
  'موقف السادات العمومي (المسافرين)': { lat: 30.389, lng: 30.509 }
};

// Default center (Sadat City Center)
const SADAT_CENTER = { lat: 30.380, lng: 30.515 };

// Simple Haversine formula to compute actual distance in Km
export function getHaversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Custom DivIcons for stunning visual aesthetics matching the theme
const createRiderIcon = () => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
        <span class="absolute inline-flex h-8 w-8 rounded-full bg-orange-500/30 animate-ping"></span>
        <div class="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
        <span class="absolute inline-flex h-8 w-8 rounded-full bg-indigo-500/30 animate-ping"></span>
        <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createCaptainIcon = () => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
        <span class="absolute inline-flex h-10 w-10 rounded-full bg-green-500/30 animate-ping"></span>
        <div class="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white border-2 border-slate-900 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

interface SadatMapProps {
  userRole: 'rider' | 'captain' | 'admin';
  userId: string;
  activeRide: Ride | null;
  startLocName?: string;
  endLocName?: string;
  onSetCurrentLocation?: (coords: { lat: number; lng: number }) => void;
}

export default function SadatMap({
  userRole,
  userId,
  activeRide,
  startLocName,
  endLocName,
  onSetCurrentLocation
}: SadatMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // References to markers and polylines to update them dynamically
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const captainMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const captainPolylineRef = useRef<L.Polyline | null>(null);

  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [captainCoords, setCaptainCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create the map
    const map = L.map(mapContainerRef.current, {
      center: [SADAT_CENTER.lat, SADAT_CENTER.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // Add beautiful dark/night theme style OpenStreetMap layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    // Trigger invalidateSize to resolve initial rendering/flickering within container
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update positions based on inputs and landmarks
  useEffect(() => {
    let startC = startLocName ? SADAT_COORDINATES[startLocName] : null;
    let endC = endLocName ? SADAT_COORDINATES[endLocName] : null;

    if (activeRide) {
      if (activeRide.startLat && activeRide.startLng) {
        startC = { lat: activeRide.startLat, lng: activeRide.startLng };
      } else if (activeRide.startLocation) {
        startC = SADAT_COORDINATES[activeRide.startLocation];
      }

      if (activeRide.endLat && activeRide.endLng) {
        endC = { lat: activeRide.endLat, lng: activeRide.endLng };
      } else if (activeRide.endLocation) {
        endC = SADAT_COORDINATES[activeRide.endLocation];
      }

      if (activeRide.captainLat && activeRide.captainLng) {
        setCaptainCoords({ lat: activeRide.captainLat, lng: activeRide.captainLng });
      } else if (activeRide.captainId) {
        setCaptainCoords(startC || SADAT_CENTER);
      }
    }

    if (startC) setRiderCoords(startC);
    if (endC) setDestinationCoords(endC);
  }, [activeRide, startLocName, endLocName]);

  // Real-time GPS Tracking
  useEffect(() => {
    if (activeRide && (activeRide.status === 'completed' || activeRide.status === 'cancelled')) {
      stopTracking();
      return;
    }

    if (userRole === 'captain' && activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled') {
      startLiveTracking();
    } else if (userRole === 'rider' && !activeRide) {
      // Prompt user for browser Geolocation permission
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setRiderCoords(latLng);
          if (onSetCurrentLocation) {
            onSetCurrentLocation(latLng);
          }
          // Center map on rider's actual position
          if (mapRef.current) {
            mapRef.current.setView([latLng.lat, latLng.lng], 14);
          }
        },
        (err) => {
          console.warn('Rider geolocation permission denied or unavailable:', err.message);
          setGpsError('يرجى تفعيل صلاحية تحديد الموقع الجغرافي للحصول على موقعك الحالي.');
        },
        { enableHighAccuracy: true }
      );
    }

    return () => stopTracking();
  }, [userRole, activeRide?.id, activeRide?.status]);

  const startLiveTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };

        setCaptainCoords(coords);

        if (activeRide) {
          updateRideCoordinates(activeRide.id, lat, lng);
          updateUserCoordinates(userId, lat, lng);
        }
      },
      (err) => {
        console.warn('Captain geolocation tracking error:', err.message);
        setGpsError('تعذر تحديد موقع GPS الخاص بك بدقة. تأكد من تفعيل الموقع.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  // Dynamic distance and ETA calculation
  useEffect(() => {
    if (!riderCoords) return;

    if (activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled') {
      const isApproaching = activeRide.status === 'accepted' || activeRide.status === 'arriving';
      const fromPoint = isApproaching ? captainCoords : riderCoords;
      const toPoint = isApproaching ? riderCoords : destinationCoords;

      if (fromPoint && toPoint) {
        const dist = getHaversineDistance(fromPoint, toPoint);
        setDistanceKm(Number(dist.toFixed(2)));

        const speedKmh = 30; // Avg street speed in Sadat
        const durationMin = (dist / speedKmh) * 60;
        setEtaMinutes(Math.max(1, Math.round(durationMin)));
      }
    } else if (riderCoords && destinationCoords) {
      const dist = getHaversineDistance(riderCoords, destinationCoords);
      setDistanceKm(Number(dist.toFixed(2)));
      const speedKmh = 30;
      setEtaMinutes(Math.max(1, Math.round((dist / speedKmh) * 60)));
    } else {
      setDistanceKm(null);
      setEtaMinutes(null);
    }
  }, [riderCoords, captainCoords, destinationCoords, activeRide?.status]);

  // Sync Leaflet markers and lines dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const boundsArr: L.LatLngExpression[] = [];

    // 1. Update Rider Marker
    if (riderCoords) {
      boundsArr.push([riderCoords.lat, riderCoords.lng]);
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.marker([riderCoords.lat, riderCoords.lng], {
          icon: createRiderIcon()
        }).addTo(map);
      } else {
        riderMarkerRef.current.setLatLng([riderCoords.lat, riderCoords.lng]);
      }
    } else {
      if (riderMarkerRef.current) {
        riderMarkerRef.current.remove();
        riderMarkerRef.current = null;
      }
    }

    // 2. Update Destination Marker
    if (destinationCoords) {
      boundsArr.push([destinationCoords.lat, destinationCoords.lng]);
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker([destinationCoords.lat, destinationCoords.lng], {
          icon: createDestinationIcon()
        }).addTo(map);
      } else {
        destinationMarkerRef.current.setLatLng([destinationCoords.lat, destinationCoords.lng]);
      }
    } else {
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
    }

    // 3. Update Captain Marker
    if (captainCoords && activeRide && activeRide.captainId) {
      boundsArr.push([captainCoords.lat, captainCoords.lng]);
      if (!captainMarkerRef.current) {
        captainMarkerRef.current = L.marker([captainCoords.lat, captainCoords.lng], {
          icon: createCaptainIcon()
        }).addTo(map);
      } else {
        captainMarkerRef.current.setLatLng([captainCoords.lat, captainCoords.lng]);
      }
    } else {
      if (captainMarkerRef.current) {
        captainMarkerRef.current.remove();
        captainMarkerRef.current = null;
      }
    }

    // 4. Update Main Route Polyline
    if (riderCoords && destinationCoords) {
      const latlngs: L.LatLngExpression[] = [
        [riderCoords.lat, riderCoords.lng],
        [destinationCoords.lat, destinationCoords.lng]
      ];
      if (!routePolylineRef.current) {
        routePolylineRef.current = L.polyline(latlngs, {
          color: '#f97316', // Orange line
          weight: 4,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(map);
      } else {
        routePolylineRef.current.setLatLngs(latlngs);
      }
    } else {
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
    }

    // 5. Update Captain Approaching Line
    if (captainCoords && riderCoords && activeRide && (activeRide.status === 'accepted' || activeRide.status === 'arriving')) {
      const capLatLngs: L.LatLngExpression[] = [
        [captainCoords.lat, captainCoords.lng],
        [riderCoords.lat, riderCoords.lng]
      ];
      if (!captainPolylineRef.current) {
        captainPolylineRef.current = L.polyline(capLatLngs, {
          color: '#10b981', // Emerald green line
          weight: 4,
          opacity: 0.9,
          dashArray: '5, 8',
          lineJoin: 'round'
        }).addTo(map);
      } else {
        captainPolylineRef.current.setLatLngs(capLatLngs);
      }
    } else {
      if (captainPolylineRef.current) {
        captainPolylineRef.current.remove();
        captainPolylineRef.current = null;
      }
    }

    // Fit map bounds smoothly
    if (boundsArr.length > 0) {
      const bounds = L.latLngBounds(boundsArr);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [riderCoords, captainCoords, destinationCoords, activeRide?.id, activeRide?.status]);

  // Movement Simulation for Testing
  const handleToggleSimulation = () => {
    if (isSimulating) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsSimulating(false);
      return;
    }

    if (!activeRide || !riderCoords) return;

    setIsSimulating(true);
    let step = 0;
    const totalSteps = 40;
    const startPt = captainCoords || SADAT_CENTER;
    const endPt = activeRide.status === 'ongoing' ? (destinationCoords || SADAT_CENTER) : riderCoords;

    simIntervalRef.current = setInterval(() => {
      step++;
      if (step > totalSteps) {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
        }
        setIsSimulating(false);
        return;
      }

      // Interpolate coordinates
      const ratio = step / totalSteps;
      const lat = startPt.lat + (endPt.lat - startPt.lat) * ratio;
      const lng = startPt.lng + (endPt.lng - startPt.lng) * ratio;
      const newCoords = { lat, lng };

      setCaptainCoords(newCoords);
      updateRideCoordinates(activeRide.id, lat, lng);
      updateUserCoordinates(activeRide.captainId || userId, lat, lng);
    }, 1500);
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 text-white space-y-4" id="leaflet-live-map-card">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-orange-400 animate-pulse" />
          <span className="text-xs font-semibold text-orange-400">تتبع الخريطة المباشر - مدينة السادات</span>
        </div>
        {activeRide && (
          <span className="bg-orange-500/15 text-orange-400 border border-orange-500/20 text-[10px] px-2 py-0.5 rounded-full font-extrabold animate-pulse">
            تتبع نشط
          </span>
        )}
      </div>

      {gpsError && (
        <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <p>{gpsError}</p>
        </div>
      )}

      {/* Map Element */}
      <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '240px' }} />

        {/* Mini HUD Info Overlay */}
        <div className="absolute bottom-3 right-3 left-3 bg-slate-950/90 border border-white/10 backdrop-blur-md px-4 py-3 rounded-xl flex items-center justify-between text-xs shadow-xl z-[1000]">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">المسافة</span>
              <span className="font-mono font-bold text-white leading-normal">
                {distanceKm !== null ? `${distanceKm} كم` : 'جاري الحساب...'}
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">الوقت المتوقع</span>
              <span className="font-mono font-bold text-white leading-normal">
                {etaMinutes !== null ? `${etaMinutes} دقيقة` : 'جاري الحساب...'}
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">الحالة الجغرافية</span>
              <span className="font-bold text-emerald-400 leading-normal text-[10px]">
                {activeRide ? 'تتبع فوري نشط' : 'مستعد للتحديد'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {userRole === 'captain' && activeRide && (
        <button
          type="button"
          onClick={handleToggleSimulation}
          className={`w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
            isSimulating ? 'bg-rose-600 hover:bg-rose-500' : ''
          }`}
        >
          <Compass className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'إيقاف محاكاة حركة الكابتن' : 'تنشيط محاكاة حركة الكابتن على المسار'}</span>
        </button>
      )}
    </div>
  );
}
