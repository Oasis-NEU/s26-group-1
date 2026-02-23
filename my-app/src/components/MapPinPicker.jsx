import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { importLibrary } from "@googlemaps/js-api-loader";
import MyLocationIcon from "@mui/icons-material/MyLocation";

/**
 * MapPinPicker – Click-to-place a draggable marker on Google Maps.
 *
 * Props:
 *   value        – { lat, lng } | null   current pin position
 *   onChange     – (latLng | null) => void
 *   height       – CSS height of the map container (default 220)
 *   center       – initial map center (default: Northeastern campus)
 *   zoom         – initial zoom (default 16)
 *   interactive  – allow clicking to move pin (default true)
 *   showCoords   – show lat/lng text under map (default true)
 *   flyTo        – { lat, lng, zoom? } | null — when set, map pans here and places/moves pin
 */
const DEFAULT_CENTER = { lat: 42.3398, lng: -71.0892 };

export default function MapPinPicker({
  value = null,
  onChange,
  height = 220,
  center = DEFAULT_CENTER,
  zoom = 16,
  interactive = true,
  showCoords = true,
  flyTo = null,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Keep latest onChange in a ref so listeners always use the current callback
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Initialize map (once)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Map } = await importLibrary("maps");
      const { AdvancedMarkerElement } = await importLibrary("marker");

      if (cancelled || !mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: value ?? center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        mapId: "LOST_HOUND_PICKER",
        clickableIcons: false,
      });

      mapInstanceRef.current = map;

      // Place marker if value already exists
      if (value) {
        const marker = new AdvancedMarkerElement({
          map,
          position: value,
          gmpDraggable: interactive,
        });
        markerRef.current = marker;

        if (interactive) {
          marker.addListener("dragend", () => {
            const pos = marker.position;
            onChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
          });
        }
      }

      // Click to place / move pin
      if (interactive) {
        map.addListener("click", (e) => {
          const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };

          if (markerRef.current) {
            markerRef.current.position = latLng;
          } else {
            const marker = new AdvancedMarkerElement({
              map,
              position: latLng,
              gmpDraggable: true,
            });
            marker.addListener("dragend", () => {
              const pos = marker.position;
              onChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
            });
            markerRef.current = marker;
          }

          onChangeRef.current?.(latLng);
        });
      }

      setReady(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // Handle flyTo: pan map + place/move pin programmatically
  useEffect(() => {
    if (!flyTo || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    map.panTo(flyTo);
    map.setZoom(flyTo.zoom ?? 18);

    (async () => {
      const { AdvancedMarkerElement } = await importLibrary("marker");

      if (markerRef.current) {
        markerRef.current.position = flyTo;
      } else {
        const marker = new AdvancedMarkerElement({
          map,
          position: flyTo,
          gmpDraggable: interactive,
        });
        if (interactive) {
          marker.addListener("dragend", () => {
            const pos = marker.position;
            onChangeRef.current?.({ lat: pos.lat, lng: pos.lng });
          });
        }
        markerRef.current = marker;
      }
    })();
  }, [flyTo, interactive]);

  // If value is cleared externally, remove the marker
  useEffect(() => {
    if (value === null && markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }
  }, [value]);

  return (
    <Box>
      <Box
        ref={mapRef}
        sx={{
          width: "100%",
          height,
          borderRadius: 2,
          overflow: "hidden",
          border: "1.5px solid #e0d6d6",
          position: "relative",
          background: "#f0eded",
        }}
      />

      {interactive && !value && ready && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
          <MyLocationIcon sx={{ fontSize: 14, color: "#a07070" }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Tap the map to adjust the pin location
          </Typography>
        </Box>
      )}

      {showCoords && value && (
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ mt: 0.5, display: "block" }}
        >
          📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)} — drag to adjust
        </Typography>
      )}
    </Box>
  );
}