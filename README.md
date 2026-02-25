# Lost & Hound

A lost and found web application built for Northeastern University students. Users can post lost or found items, browse listings by category or location, view items on an interactive campus map, and message other students directly.

---

## Features

- **Authentication** — Sign up and log in using a `@northeastern.edu` email address, powered by Supabase Auth
- **Feed** — Browse, search, filter, and sort lost/found item listings by category, importance, and date; post new items with photos, location pins, and an importance level
- **Map** — Interactive Google Maps view of all reported items pinned to campus locations, with radius and importance filters and building search
- **Messages** — Real-time direct messaging between users about specific listings
- **Settings** — Update your display name and trigger a password-reset email

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + Vite |
| UI components | Material UI (MUI) v7 |
| Routing | React Router DOM v7 |
| Backend / Auth / Database | Supabase |
| Maps | Google Maps JS API (`@googlemaps/js-api-loader`) |

---

## Project Structure

```
my-app/
├── public/                  # Static assets (logo, etc.)
├── src/
│   ├── App.jsx              # Root component with navigation and routing
│   ├── AuthContext.jsx      # Auth state provider (user, profile, logout)
│   ├── supabaseClient.js    # Supabase client initialisation
│   ├── components/
│   │   ├── button.jsx       # Reusable button component
│   │   └── MapPinPicker.jsx # Inline map widget for picking a location
│   ├── pages/
│   │   ├── FeedPage.jsx     # Listings feed with post/search/filter
│   │   ├── LoginPage.jsx    # Login & sign-up forms
│   │   ├── MapPage.jsx      # Full-screen campus map view
│   │   ├── MessagePage.jsx  # Conversations & real-time chat
│   │   └── SettingsPage.jsx # Account settings
│   └── assets/
│       └── northeastern_locations.csv
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the required tables (`profiles`, item listings, conversations, messages)
- A [Google Maps JavaScript API](https://developers.google.com/maps) key with the Maps JS API enabled

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd s26-group-1/my-app

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file inside `my-app/` with the following keys:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default.

### Building for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## Notes

- Account registration is restricted to `@northeastern.edu` email addresses
- Password reset is handled via a Supabase-sent email link
- Item importance levels: **Low**, **Medium**, **High**
- Item categories: Husky Card, Jacket, Wallet/Purse, Bag, Keys, Electronics, Other
