import { useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  v: "weekly",
});

export default function MapPage() {
  useEffect(() => {
    importLibrary("maps").then(({ Map }) => {
      new Map(document.getElementById("map"), {
        center: { lat: 42.3398, lng: -71.0892 },
        zoom: 15,
      });
    });
  }, []);

  return (
    <div className="map-page">
      <div className="map-column">
        <div className="map-header">
          <h1>Campus Map</h1>
          <p>Use the map to report lost/found items.</p>
        </div>

        <div id="map" className="map-box" />
      </div>
    </div>
  );
}
