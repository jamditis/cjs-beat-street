# Beat Street: CJS Navigator

Interactive isometric conference companion for CJS2026 (June 8-9, 2026).

## Quick Reference

```bash
npm run dev      # Start development server
npm run build    # Build for production (runs tsc then vite build)
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Tech Stack

- **Vite 7** + **React 18** + **TypeScript** (strict mode)
- **Phaser 3.60** - Game engine with native isometric support
- **Firebase** - Auth, Firestore, Cloud Functions
- **Tailwind CSS v4** - Uses `@tailwindcss/postcss` plugin
- **PWA** - Offline-first with Workbox service worker

## Architecture

### React ↔ Phaser Communication

Use the `EventBus` (`src/lib/EventBus.ts`) for all communication between React and Phaser:

```typescript
// Emit from Phaser scene
eventBus.emit('poi-selected', { poiId, type, data });

// Listen in React component
useEffect(() => {
  const unsub = eventBus.on('poi-selected', handler);
  return unsub;
}, []);
```

### Directory Structure

```
src/
├── game/
│   ├── scenes/       # Phaser scenes (Boot, Preload, CityMap, ConventionCenter)
│   ├── entities/     # Player, NPCs, interactive objects
│   ├── systems/      # CameraController, POIManager, PresenceManager, MapLoader
│   └── config.ts     # Phaser game configuration
├── components/       # React UI overlays (panels, modals, selectors)
├── services/         # Firebase, auth, presence, offline storage
├── hooks/            # React hooks (useGameEvents, usePresence, useOffline)
├── types/            # TypeScript type definitions (POI, presence, game)
└── lib/              # Shared utilities (EventBus)

public/
├── assets/
│   ├── tilesets/     # Penzilla isometric sprites (557 files)
│   ├── maps/         # Tiled JSON map data
│   └── ui/           # UI icons (POI markers, controls, loading spinner)
├── icon-*.png        # PWA icons (48-512px)
├── favicon.svg       # Browser tab icon
├── logo.svg          # Brand logo
└── splash.svg        # PWA splash screen
```

### Key Patterns

1. **Scenes**: Each Phaser scene extends `Phaser.Scene` with `create()` and `update()` methods
2. **Components**: React components handle all UI overlays on top of the game canvas
3. **Services**: Firebase operations are isolated in `src/services/`
4. **Hooks**: Custom hooks wrap service logic for React components

## Code Style

- TypeScript strict mode enabled
- Use `unknown` instead of `any` where possible
- Functional React components with hooks
- Phaser scenes as classes extending `Phaser.Scene`

## Brand Colors (CJS2026)

```
teal-600:   #2A9D8F  (primary actions)
cream:      #F5F0E6  (backgrounds)
ink:        #2C3E50  (text)
paper:      #FAF8F5  (cards, panels)
parchment:  #F0EBE0  (secondary backgrounds)
```

## Fonts

- **Display**: Playfair Display (headings)
- **Body**: Source Sans 3 (body text)
- **Accent**: Caveat (handwritten style)

## Game Assets

- Located in `public/assets/tilesets/` (720+ isometric sprites)
- Penzilla Giant City Builder asset pack
- 2:1 isometric perspective
- UI icons in `public/assets/ui/` (POI markers by type, controls)

## Firebase Collections

```
verified_attendees/{uid}  # Cross-project verified users
presence/{uid}            # Real-time location sharing
poi/{poiId}               # Points of interest
achievements/{uid}        # User badges and progress
```

## Privacy Requirements

- Location sharing is 100% opt-in
- Equal prominence for consent buttons (GDPR compliant)
- Zone-based presence (not GPS coordinates)
- All features work without location sharing

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=beat-street-cjs
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_VERIFY_ENDPOINT=
```

## Related Documentation

- `BEAT_STREET_BLUEPRINT.md` - Implementation guide with code examples
- `BEAT_STREET_PLAN.md` - Comprehensive project plan and architecture
- `PRESENCE_SYSTEM_INTEGRATION.md` - Presence and location sharing implementation

---

## Session handoff notes (January 7, 2026)

### Firebase setup completed

**Project:** `beat-street-cjs` (Blaze plan)
**Console:** https://console.firebase.google.com/u/0/project/beat-street-cjs/overview

| Component | Status |
|-----------|--------|
| Web app registered | ✓ `CJS Beat Street` |
| Authentication | ✓ Email/Password + Google enabled |
| Firestore database | ✓ Created (nam5 region) |
| Security rules | ✓ Deployed (`firestore.rules`) |
| Composite indexes | ✓ Deployed (`firestore.indexes.json`) |
| Cloud Functions | ✓ `verifyAttendee` deployed (us-central1) |

### Cross-project authentication

Beat Street verifies attendees against a separate CJS2026 registration project:

- **CJS2026 project:** https://console.firebase.google.com/u/0/project/cjs2026/overview
- **Service account secret:** `CJS2026_SERVICE_ACCOUNT` (set via `firebase functions:secrets:set`)
- **Function:** `verifyAttendee` in `functions/src/index.ts`

The function accepts a Firebase ID token from CJS2026, verifies it, checks registration status, and stores verified attendees locally.

### Environment configured

`.env` contains real Firebase credentials (not committed to git).

### Remaining tasks

1. **Set VITE_VERIFY_ENDPOINT** — After functions deploy, get the URL:
   ```bash
   firebase functions:list
   ```
   Then update `.env` with the `verifyAttendee` URL.

2. **Regenerate CJS2026 service account key** — The key was exposed in conversation. Go to CJS2026 → Project settings → Service accounts → Generate new private key, then:
   ```bash
   firebase functions:secrets:set CJS2026_SERVICE_ACCOUNT < new-key.json
   firebase deploy --only functions
   ```

3. ~~**Delete local service account JSON files**~~ — ✓ Done. `.gitignore` updated with patterns for `*-firebase-adminsdk-*.json`.

4. **Test the full auth flow** — Run `npm run dev` and test Google sign-in.

### Completed this session

- Fixed Firebase config (`lastSeen` → `updatedAt` field name)
- Integrated POIManager and PresenceManager into game scenes
- Implemented pinch-to-zoom for mobile (with joystick conflict prevention)
- Fixed App.tsx auth flow (guest mode, consent modal)
- Added ErrorBoundary and accessibility improvements (focus trap, ARIA)
- Created PWA icons (12 PNG sizes from SVG source)
- Created UI icons (POI markers, controls, loading spinner)
- PreloadScene now loads 35+ Penzilla sprites
- Build verified: `npm run build` passes

### Node version

Project requires **Node 22**. Cloud Functions runtime updated from Node 18 to Node 22 in `firebase.json` and `functions/package.json`.
