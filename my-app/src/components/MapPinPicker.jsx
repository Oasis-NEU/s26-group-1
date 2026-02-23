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
}) {
  // DOM node for the map and long‑lived Google Maps objects
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  // Used so we only show the helper text once the map is ready
  const [ready, setReady] = useState(false);

  // Initialize map
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

      // If a pin value is provided, render a marker at that spot
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
            onChange?.({ lat: pos.lat, lng: pos.lng });
          });
        }
      }

      // When interactive, clicking the map drops (or moves) the pin
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
              onChange?.({ lat: pos.lat, lng: pos.lng });
            });
            markerRef.current = marker;
          }

          onChange?.(latLng);
        });
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // Only re-init if interactive changes; value updates are handled via marker ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // Sync marker when value prop changes externally
  useEffect(() => {
    if (!markerRef.current || !value) return;
    const pos = markerRef.current.position;
    if (pos.lat !== value.lat || pos.lng !== value.lng) {
      markerRef.current.position = value;
    }
  }, [value]);

  return (
    <Box>
      {/* Map canvas where Google Maps renders into */}
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
        // Helper hint shown before the user has dropped a pin
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mt: 0.75,
          }}
        >
          <MyLocationIcon sx={{ fontSize: 14, color: "#a07070" }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Tap the map to drop a pin
          </Typography>
        </Box>
      )}

      {showCoords && value && (
        // Small caption showing the numeric coordinates of the pin
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ mt: 0.5, display: "block" }}
        >
          📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </Typography>
      )}
    </Box>
  );
}