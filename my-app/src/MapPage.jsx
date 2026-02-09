import { useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export default function MapPage() {
  useEffect(() => {
    setOptions({
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      v: "weekly",
    });

    importLibrary("maps").then(({ Map }) => {
      new Map(document.getElementById("map"), {
        center: { lat: 42.3398, lng: -71.0892 },
        zoom: 15,
      });
    });
  }, []);

  return (
    <div style={{ padding: "16px" }}>
      <h1>Campus Map</h1>
      <div
        id="map"
        style={{
          width: "50vh",
          height: "50vh",
          backgroundColor: "#eee",
          border: "8px solid #A84D48",
        }}
      />
    </div>
  );
}
