import { useEffect } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Box, Typography, Paper } from '@mui/material';

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
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        p: 3,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '1200px' }}>
        <Paper elevation={3} sx={{ p: 3, mb: 2, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Campus Map
          </Typography>
          <Typography variant="body1">
            Use the map to report lost/found items.
          </Typography>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            height: 'calc(100vh - 300px)',
            minHeight: '400px',
            overflow: 'hidden',
            borderRadius: 2,
          }}
        >
          <Box id="map" sx={{ width: '100%', height: '100%' }} />
        </Paper>
      </Box>
    </Box>
  );
}
