/**
 * Seed script for scavenger hunt items
 * Loads hunt items from JSON and uploads to Firestore
 *
 * Usage:
 *   npx tsx scripts/seed-hunt-items.ts
 *
 * Requirements:
 *   - Firebase Admin SDK credentials (service account key)
 *   - Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *   - Or provide path to service account key file
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Type for hunt item from JSON
interface HuntItemData {
  name: string;
  description: string;
  type: 'sponsor' | 'session' | 'landmark';
  points: number;
  location: {
    x: number;
    y: number;
    floor?: number;
    zone?: string;
    venueId: string;
    mapId?: string;
  };
  venueId: string;
  metadata?: {
    company?: string;
    speaker?: string;
    room?: string;
    photoOpportunity?: boolean;
    hint?: string;
  };
  isActive?: boolean;
}

async function main() {
  console.log('🎯 Seeding scavenger hunt items...\n');

  // Initialize Firebase Admin
  let app;
  try {
    // Check if GOOGLE_APPLICATION_CREDENTIALS is set
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('✓ Using GOOGLE_APPLICATION_CREDENTIALS');
      app = initializeApp();
    } else {
      // Try to load from default location
      const serviceAccountPath = resolve(
        process.cwd(),
        'service-account-key.json'
      );

      try {
        const serviceAccount = JSON.parse(
          await readFile(serviceAccountPath, 'utf-8')
        ) as ServiceAccount;

        app = initializeApp({
          credential: cert(serviceAccount),
        });

        console.log('✓ Using service account key from service-account-key.json');
      } catch {
        console.error(
          '❌ Error: No Firebase credentials found.\n\n' +
            'Please either:\n' +
            '1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable, or\n' +
            '2. Place service-account-key.json in the project root\n\n' +
            'Get your service account key from:\n' +
            'https://console.firebase.google.com/project/beat-street-cjs/settings/serviceaccounts/adminsdk'
        );
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }

  const db = getFirestore(app);

  // Load hunt items from JSON
  let huntItems: HuntItemData[];
  try {
    const jsonPath = resolve(process.cwd(), 'scripts/data/hunt-items.json');
    const jsonContent = await readFile(jsonPath, 'utf-8');
    huntItems = JSON.parse(jsonContent);
    console.log(`✓ Loaded ${huntItems.length} hunt items from JSON\n`);
  } catch (error) {
    console.error('❌ Failed to load hunt items JSON:', error);
    process.exit(1);
  }

  // Seed hunt items
  const batch = db.batch();
  let successCount = 0;
  let errorCount = 0;

  for (const item of huntItems) {
    try {
      // Create a new document reference with auto-generated ID
      const docRef = db.collection('hunt_items').doc();

      batch.set(docRef, {
        ...item,
        isActive: item.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      successCount++;
      console.log(`✓ Prepared: ${item.name} (${item.type}, ${item.points} pts)`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Error preparing ${item.name}:`, error);
    }
  }

  // Commit the batch
  try {
    await batch.commit();
    console.log(`\n✅ Successfully seeded ${successCount} hunt items!`);

    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} items failed to seed`);
    }

    // Print summary by type
    console.log('\n📊 Summary by type:');
    const byType = huntItems.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} items`);
    });

    // Print total possible points
    const totalPoints = huntItems.reduce((sum, item) => sum + item.points, 0);
    const completionBonus = 50;
    console.log(`\n💎 Total possible points: ${totalPoints + completionBonus}`);
    console.log(`   Base points: ${totalPoints}`);
    console.log(`   Completion bonus: ${completionBonus}`);
  } catch (error) {
    console.error('\n❌ Failed to commit batch:', error);
    process.exit(1);
  }

  console.log('\n✨ Seeding complete!\n');
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
