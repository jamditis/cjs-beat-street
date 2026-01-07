#!/usr/bin/env node
/**
 * Firebase POI Seeding Script for Beat Street
 *
 * Seeds the Firestore 'poi' collection with sample conference data.
 *
 * Usage:
 *   npx ts-node scripts/seed-pois.ts
 *   npm run seed:pois
 *
 * Environment:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to use a service account
 *   Or run from an authenticated environment (Firebase CLI)
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
function initializeFirebase(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check for service account file
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath) {
    console.log(`Using service account: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
    return initializeApp({
      credential: cert(serviceAccount)
    });
  }

  // Use application default credentials (works with Firebase CLI)
  console.log('Using application default credentials');
  return initializeApp();
}

/**
 * Load POI data from JSON file
 */
function loadPOIData(): POIData[] {
  const dataPath = join(__dirname, 'data', 'pois.json');
  console.log(`Loading POI data from: ${dataPath}`);

  try {
    const jsonData = readFileSync(dataPath, 'utf-8');
    const pois = JSON.parse(jsonData) as POIData[];
    console.log(`Loaded ${pois.length} POIs from JSON file`);
    return pois;
  } catch (error) {
    console.error('Error loading POI data:', error);
    throw error;
  }
}

/**
 * Seed POI data to Firestore
 */
async function seedPOIs(): Promise<void> {
  console.log('\n🌱 Starting POI seeding process...\n');

  try {
    // Initialize Firebase
    const app = initializeFirebase();
    const db = getFirestore(app);

    // Load POI data
    const pois = loadPOIData();

    // Prepare batch write
    console.log('Preparing to write POIs to Firestore...');

    let successCount = 0;
    let errorCount = 0;

    // Process each POI
    for (const poi of pois) {
      try {
        const { id, ...poiData } = poi;

        // Add timestamps
        const document: POIDocument = {
          ...poiData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };

        // Write to Firestore
        await db.collection('poi').doc(id).set(document, { merge: true });

        successCount++;
        console.log(`✓ ${successCount}/${pois.length} - ${poi.type.toUpperCase()}: ${poi.name}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to seed POI ${poi.id}:`, error);
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Seeding Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total POIs:     ${pois.length}`);
    console.log(`Successful:     ${successCount}`);
    console.log(`Failed:         ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // POI breakdown by type
    const poiTypes = pois.reduce((acc, poi) => {
      acc[poi.type] = (acc[poi.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📋 POI Breakdown by Type:');
    Object.entries(poiTypes)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type.padEnd(12)} ${count.toString().padStart(3)}`);
      });
    console.log();

    if (errorCount === 0) {
      console.log('✅ All POIs seeded successfully!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some POIs failed to seed. Check errors above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure Firebase project is initialized: firebase init');
    console.error('  2. Authenticate with Firebase: firebase login');
    console.error('  3. Set GOOGLE_APPLICATION_CREDENTIALS if using service account');
    console.error('  4. Verify Firestore is enabled in your Firebase project\n');
    process.exit(1);
  }
}

// Run the seeding script
seedPOIs();
