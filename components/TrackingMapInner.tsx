'use client';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MapContainer, ImageOverlay, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [35.699739, 51.338097]; // تهران

export interface MapDevice {
  id: string;
  name: string | null;
  uniqueId: string;
  lat: number | null;
  lng: number | null;
  course: number | null;
  speed: number | null;
  status: 'online' | 'offline' | 'unknown';
}

/**
 * Neshan exposes no working XYZ tile endpoint for this key, so the basemap is
 * a static image re-fetched on every pan and zoom, then geo-referenced onto
 * the viewport with project/unproject — the same approach `LeafletMapInner`
 * already uses for the location picker.
 */
function computeBounds(map: L.Map, width: number, height: number): L.LatLngBoundsExpression {
  const zoom = map.getZoom();
  const centerPoint = map.project(map.getCenter(), zoom);
  const topLeft = map.unproject([centerPoint.x - width / 2, centerPoint.y - height / 2], zoom);
  const bottomRight = map.unproject([centerPoint.x + width / 2, centerPoint.y + height / 2], zoom);
  return [
    [topLeft.lat, topLeft.lng],
    [bottomRight.lat, bottomRight.lng],
  ];
}

function StaticImageLayer({ onFrame }: { onFrame: (url: string, bounds: L.LatLngBoundsExpression) => void }) {
  const map = useMap();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    const size = map.getSize();
    const width = Math.max(1, Math.round(size.x));
    const height = Math.max(1, Math.round(size.y));
    const center = map.getCenter();
    const zoom = Math.round(map.getZoom());
    // `marker=none`: this image is a basemap under our own vehicle markers,
    // and Neshan's built-in pin would sit at the centre of the viewport
    // looking like a vehicle that is not there.
    onFrame(
      `/api/map/static?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}&width=${width}&height=${height}&marker=none`,
      computeBounds(map, width, height),
    );
  }, [map, onFrame]);

  /**
   * Every basemap refresh is a paid Neshan request, and this map moves far
   * more than the location picker does — a followed vehicle nudges the
   * viewport on every fix. Debouncing collapses a burst of pans into one
   * fetch instead of one per frame, and stops the browser aborting image
   * loads it has already started.
   */
  const scheduleRefresh = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(refresh, 400);
  }, [refresh]);

  useEffect(() => {
    refresh();
    return () => { if (pending.current) clearTimeout(pending.current); };
  }, [refresh]);

  useMapEvents({ moveend: scheduleRefresh, zoomend: scheduleRefresh, resize: scheduleRefresh });
  return null;
}

/**
 * A moving vehicle gets an arrow pointing where it is heading; a stopped one
 * gets a dot, because a stale course on a parked car reads as a direction it
 * is not going.
 */
function vehicleIcon(colour: string, course: number | null, moving: boolean, selected: boolean): L.DivIcon {
  const size = selected ? 38 : 30;
  const ring = selected ? `box-shadow:0 0 0 3px ${colour}55, 0 3px 12px rgba(0,0,0,0.4);` : 'box-shadow:0 3px 10px rgba(0,0,0,0.35);';

  const inner = moving
    ? `<div style="width:0;height:0;border-left:${size * 0.22}px solid transparent;border-right:${size * 0.22}px solid transparent;border-bottom:${size * 0.42}px solid white;transform:rotate(${course ?? 0}deg);transform-origin:50% 65%;"></div>`
    : `<div style="width:${size * 0.3}px;height:${size * 0.3}px;border-radius:50%;background:white;"></div>`;

  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colour};border:2.5px solid white;${ring}display:flex;align-items:center;justify-content:center;">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Keeps the selected vehicle in view as it moves, but only until the user
 * pans. Yanking the viewport back while somebody is reading another part of
 * the map is worse than losing the follow.
 */
function FollowSelected({ target, enabled }: { target: [number, number] | null; enabled: boolean }) {
  const map = useMap();
  const userMoved = useRef(false);

  useMapEvents({ dragstart: () => { userMoved.current = true; } });

  useEffect(() => {
    if (!enabled || !target || userMoved.current) return;

    // Recentring on every fix would make the map twitch under the reader and
    // refetch the basemap each time. Pan only once the vehicle leaves the
    // comfortable middle of the viewport.
    const point = map.latLngToContainerPoint(target);
    const size = map.getSize();
    const insideComfortZone =
      point.x > size.x * 0.2 && point.x < size.x * 0.8 && point.y > size.y * 0.2 && point.y < size.y * 0.8;
    if (insideComfortZone) return;

    map.panTo(target, { animate: true });
  }, [target, enabled, map]);

  return null;
}

/** Frames every device once, when the map first has something to show. */
function FitAll({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || points.length === 0) return;
    done.current = true;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, map]);

  return null;
}

export default function TrackingMapInner({
  devices,
  selectedId,
  trail = [],
  onSelect,
  height = 420,
  follow = true,
}: {
  devices: MapDevice[];
  selectedId: string | null;
  trail?: Array<[number, number]>;
  onSelect?: (id: string) => void;
  height?: number;
  follow?: boolean;
}) {
  const [frame, setFrame] = useState<{ url: string; bounds: L.LatLngBoundsExpression } | null>(null);

  const located = useMemo(
    () => devices.filter((d): d is MapDevice & { lat: number; lng: number } => d.lat != null && d.lng != null),
    [devices],
  );

  const points = useMemo<Array<[number, number]>>(() => located.map((d) => [d.lat, d.lng]), [located]);

  const selected = located.find((d) => d.id === selectedId) ?? null;
  const followTarget: [number, number] | null = selected ? [selected.lat, selected.lng] : null;

  const center: [number, number] = points[0] ?? DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ width: '100%', height, background: 'var(--bg-elevated)', borderRadius: 18 }}
      scrollWheelZoom
    >
      {frame && <ImageOverlay url={frame.url} bounds={frame.bounds} />}
      <StaticImageLayer onFrame={(url, bounds) => setFrame({ url, bounds })} />
      <FitAll points={points} />
      <FollowSelected target={followTarget} enabled={follow} />

      {trail.length > 1 && (
        <Polyline positions={trail} pathOptions={{ color: 'var(--green)', weight: 4, opacity: 0.85 }} />
      )}

      {located.map((device) => {
        const colour =
          device.status === 'online' ? 'var(--green)' : device.status === 'offline' ? 'var(--status-neutral)' : 'var(--amber)';
        return (
          <Marker
            key={device.id}
            position={[device.lat, device.lng]}
            icon={vehicleIcon(colour, device.course, (device.speed ?? 0) > 3, device.id === selectedId)}
            eventHandlers={onSelect ? { click: () => onSelect(device.id) } : undefined}
          />
        );
      })}
    </MapContainer>
  );
}
