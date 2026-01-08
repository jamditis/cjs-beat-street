#!/usr/bin/env npx tsx
/**
 * Firebase POI Seeding Script for Beat Street
 *
 * Seeds the Firestore 'poi' collection with conference POI data.
 *
 * Usage:
 *   npx tsx scripts/seed-pois.ts              # Seed all POIs
 *   npx tsx scripts/seed-pois.ts --dry-run    # Preview without changes
 *   npx tsx scripts/seed-pois.ts --clear      # Clear existing POIs first
 *   npm run seed:pois                         # Run via npm script
 *
 * Data Sources:
 *   - Primary: src/data/pittsburgh-pois.ts (TypeScript import)
 *   - Fallback: scripts/data/pois.json (JSON file)
 *
 * Environment:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to use a service account
 *   Or run from an authenticated environment (Firebase CLI)
 *
 * Prerequisites:
 *   1. npm install -D tsx (if not already installed)
 *   2. Authenticate with Firebase: firebase login
 *   3. Verify Firestore is enabled in your Firebase project
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR_EXISTING = process.argv.includes('--clear');
const COLLECTION_NAME = 'poi';
const PROJECT_ID = 'beat-street-cjs';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface POIData {
  id: string;
  type: string;
  name: string;
  description?: string;
  venueId?: string;
  mapId?: string;
  floor?: number;
  position: {
    x: number;
    y: number;
    floor?: number;
    zone?: string;
    venueId?: string;
    mapId?: string;
  };
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

interface POIDocument extends Omit<POIData, 'id'> {
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

/**
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase(): Promise<{ app: App; db: FirebaseFirestore.Firestore }> {
  // Check if already initialized
  if (getApps().length > 0) {
    const app = getApps()[0];
    return { app, db: getFirestore(app) };
  }

  // Try to initialize with service account from environment
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || PROJECT_ID,
      });

      log(`Initialized with service account: ${serviceAccountPath}`, 'green');
      return { app, db: getFirestore(app) };
    } catch (error) {
      log(`Failed to load service account: ${error}`, 'red');
      throw error;
    }
  }

  // Initialize with default credentials (works in Firebase environments)
  const app = initializeApp({
    projectId: PROJECT_ID,
  });
  log('Initialized with application default credentials', 'yellow');
  return { app, db: getFirestore(app) };
}

/**
 * Load POI data from TypeScript module or JSON file
 */
async function loadPOIData(): Promise<POIData[]> {
  // Try loading from TypeScript module first
  try {
    const { pittsburghPOIs } = await import('../src/data/pittsburgh-pois.js');
    log(`Loaded ${pittsburghPOIs.length} POIs from src/data/pittsburgh-pois.ts`, 'green');
    return pittsburghPOIs as POIData[];
  } catch {
    log('TypeScript POI module not found, trying JSON fallback...', 'yellow');
  }

  // Fallback to JSON file
  const dataPath = join(__dirname, 'data', 'pois.json');

  if (!existsSync(dataPath)) {
    throw new Error(`No POI data found. Create either:\n  - src/data/pittsburgh-pois.ts\n  - ${dataPath}`);
  }

  try {
    const jsonData = readFileSync(dataPath, 'utf-8');
    const pois = JSON.parse(jsonData) as POIData[];
    log(`Loaded ${pois.length} POIs from JSON file: ${dataPath}`, 'green');
    return pois;
  } catch (error) {
    log(`Error loading POI JSON data: ${error}`, 'red');
    throw error;
  }
}

/**
 * Clear existing POIs from Firestore
 */
async function clearExistingPOIs(db: FirebaseFirestore.Firestore): Promise<void> {
  log('\nClearing existing POIs...', 'yellow');

  const snapshot = await db.collection(COLLECTION_NAME).get();

  if (snapshot.empty) {
    log('No existing POIs to clear.', 'dim');
    return;
  }

  const batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  if (!DRY_RUN) {
    await batch.commit();
    log(`Deleted ${count} existing POIs.`, 'green');
  } else {
    log(`[DRY RUN] Would delete ${count} existing POIs.`, 'cyan');
  }
}

/**
 * Seed POI data to Firestore
 */
async function seedPOIs(db: FirebaseFirestore.Firestore, pois: POIData[]): Promise<void> {
  log('\nSeeding POIs to Firestore...', 'cyan');
  log(`Total POIs to seed: ${pois.length}`, 'dim');

  // Group POIs by type for logging
  const poiByType = pois.reduce(
    (acc, poi) => {
      acc[poi.type] = (acc[poi.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  log('\nPOI breakdown by type:', 'dim');
  Object.entries(poiByType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      log(`  ${type.padEnd(12)} ${count.toString().padStart(3)}`, 'dim');
    });

  // Create batch write (Firestore supports up to 500 operations per batch)
  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < pois.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchPOIs = pois.slice(i, i + BATCH_SIZE);

    for (const poi of batchPOIs) {
      try {
        const { id, ...poiData } = poi;
        const docRef = db.collection(COLLECTION_NAME).doc(id);

        // Prepare document data with server timestamp
        const docData: POIDocument = {
          ...poiData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        batch.set(docRef, docData, { merge: true });
        successCount++;

        log(`  + ${poi.name} (${poi.type})`, 'dim');
      } catch (error) {
        errorCount++;
        log(`  ! Error preparing ${poi.name}: ${error}`, 'red');
      }
    }

    // Commit the batch
    if (!DRY_RUN) {
      try {
        await batch.commit();
        log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1}`, 'green');
      } catch (error) {
        log(`Batch commit failed: ${error}`, 'red');
        throw error;
      }
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'cyan');
  log('Seeding Summary', 'cyan');
  log('='.repeat(50), 'cyan');
  log(`Total POIs:     ${pois.length}`);
  log(`Successful:     ${successCount}`, successCount > 0 ? 'green' : 'reset');
  log(`Failed:         ${errorCount}`, errorCount > 0 ? 'red' : 'reset');

  if (DRY_RUN) {
    log('\n[DRY RUN] No changes were made.', 'yellow');
  } else if (errorCount === 0) {
    log('\nAll POIs seeded successfully!', 'green');
  } else {
    log('\nSome POIs failed to seed. Check errors above.', 'yellow');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  log('='.repeat(50), 'cyan');
  log('Beat Street POI Seeder', 'cyan');
  log('='.repeat(50), 'cyan');

  if (DRY_RUN) {
    log('\n*** DRY RUN MODE - No changes will be made ***\n', 'yellow');
  }

  try {
    // Initialize Firebase
    const { db } = await initializeFirebase();

    // Load POI data
    const pois = await loadPOIData();

    // Clear existing POIs if requested
    if (CLEAR_EXISTING) {
      await clearExistingPOIs(db);
    }

    // Seed POIs
    await seedPOIs(db, pois);

    // Print helpful links
    log('\n' + '='.repeat(50), 'green');
    log('Seeding complete!', 'green');
    log('='.repeat(50), 'green');

    log('\nFirestore collection: ' + COLLECTION_NAME, 'dim');
    log('Project: ' + PROJECT_ID, 'dim');
    log('\nView in Firebase Console:', 'dim');
    log(
      `https://console.firebase.google.com/u/0/project/${PROJECT_ID}/firestore/databases/-default-/data/~2F${COLLECTION_NAME}`,
      'cyan'
    );

    process.exit(0);
  } catch (error) {
    log(`\nFatal error: ${error}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  1. Ensure Firebase project is initialized: firebase init', 'dim');
    log('  2. Authenticate with Firebase: firebase login', 'dim');
    log('  3. Set GOOGLE_APPLICATION_CREDENTIALS if using service account', 'dim');
    log('  4. Verify Firestore is enabled in your Firebase project', 'dim');
    process.exit(1);
  }
}

// Run the script
main();
