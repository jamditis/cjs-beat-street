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
│   ├── systems/      # Presence, POI, navigation systems
│   └── config.ts     # Phaser game configuration
├── components/       # React UI overlays (panels, modals, selectors)
├── services/         # Firebase, auth, presence, offline storage
├── hooks/            # React hooks (useGameEvents, usePresence, useOffline)
└── lib/              # Shared utilities (EventBus)
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

- Located in `public/assets/tilesets/` (557 isometric sprites)
- Penzilla Giant City Builder asset pack
- 2:1 isometric perspective

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
VITE_FIREBASE_PROJECT_ID=beat-street-cjs2026
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_VERIFY_ENDPOINT=
```

## Related Documentation

- `BEAT_STREET_BLUEPRINT.md` - Implementation guide with code examples
- `BEAT_STREET_PLAN.md` - Comprehensive project plan and architecture
