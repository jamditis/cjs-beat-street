# Beat Street Scripts

This directory contains utility scripts for managing the Beat Street project.

## Available Scripts

### POI Seeding Script

Seeds the Firestore database with sample Point of Interest (POI) data for the CJS2026 conference.

#### Usage

```bash
npm run seed:pois
```

Or directly with tsx:

```bash
npx tsx scripts/seed-pois.ts
```

#### Prerequisites

1. **Firebase Authentication**: You must be authenticated with Firebase. Run:
   ```bash
   firebase login
   ```

2. **Firebase Project**: Ensure you have a Firebase project initialized:
   ```bash
   firebase init
   ```

3. **Firestore Enabled**: Verify that Firestore is enabled in your Firebase Console.

#### Alternative: Using Service Account

If you prefer to use a service account for authentication:

1. Download your service account key from Firebase Console:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

2. Set the environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
   ```

3. Run the seeding script:
   ```bash
   npm run seed:pois
   ```

#### What Gets Seeded

The script seeds 26 POIs across 4 categories:

- **Sessions (9)**: Conference talks, workshops, and keynotes
- **Social Events (1)**: Networking reception
- **Sponsors (8)**: Exhibitor booths
- **Food (4)**: Dining locations and coffee bars
- **Facilities (4)**: Registration, restrooms, first aid

All POIs are configured for the Chapel Hill venue at the Convention Center.

#### Data File

The POI data is stored in `/home/user/cjs-beat-street/scripts/data/pois.json`.

You can modify this file to:
- Add new POIs
- Update existing POI information
- Change venue/location data
- Adjust metadata (speakers, times, booth numbers, etc.)

#### Schema

Each POI includes:
- `id`: Unique identifier
- `type`: session, sponsor, food, social, info, or landmark
- `name`: Display name
- `description`: Brief description
- `venueId`: chapel-hill, pittsburgh, or philadelphia
- `mapId`: convention-center or outdoor
- `floor`: Floor number (1-3)
- `position`: { x, y, floor, zone, venueId, mapId }
- `metadata`: Type-specific data (times, speakers, booth numbers, etc.)
- `isActive`: Whether the POI is currently active

The script automatically adds `createdAt` and `updatedAt` timestamps when seeding.

#### Output

The script provides detailed output showing:
- Progress for each POI being seeded
- Summary statistics (total, successful, failed)
- Breakdown by POI type
- Any errors encountered

Example output:
```
🌱 Starting POI seeding process...

Loading POI data from: /path/to/scripts/data/pois.json
Loaded 26 POIs from JSON file
Preparing to write POIs to Firestore...
✓ 1/26 - SESSION: Opening Keynote: The Future of Journalism
✓ 2/26 - SESSION: AI in Journalism Workshop
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Seeding Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total POIs:     26
Successful:     26
Failed:         0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 POI Breakdown by Type:
   session        9
   sponsor        8
   food           4
   info           4
   social         1

✅ All POIs seeded successfully!
```

## Other Scripts

### Icon Generation

Generates PWA icons from SVG sources:

```bash
node scripts/generate-icons.js
```

---

## Development

The seeding script is written in TypeScript and runs using [tsx](https://github.com/privatenumber/tsx), a modern TypeScript runner.

To modify the script:
1. Edit `/home/user/cjs-beat-street/scripts/seed-pois.ts`
2. Test your changes: `npm run seed:pois`
3. Verify the POIs in Firestore Console

## Troubleshooting

### "Service configuration error"

Ensure you're authenticated with Firebase:
```bash
firebase login
```

### "GOOGLE_APPLICATION_CREDENTIALS not found"

Either:
- Run `firebase login` to use Firebase CLI authentication, OR
- Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account JSON file

### "Firestore not enabled"

Enable Firestore in your Firebase Console:
1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore Database
4. Click "Create database"

### Permission denied

Verify that your Firebase account has permission to write to Firestore. Check your Firestore security rules in the Firebase Console.
