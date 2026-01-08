/**
 * Firebase Cloud Functions for Beat Street
 * Cross-project authentication with CJS2026
 * Sponsor analytics and reporting
 */

import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp, cert, App, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {pittsburghPOIs} from "./pittsburgh-pois.js";

// Analytics types (duplicated here since functions has separate build)
interface SponsorMetrics {
  uniqueVisitors: number;
  totalVisits: number;
  averageTimeSpent: number;
  totalTimeSpent: number;
  navigationRequests: number;
  peakConcurrentVisitors: number;
}

interface HourlyMetric {
  hour: number;
  date: string;
  visits: number;
  uniqueVisitors: number;
}

interface DailyMetric {
  date: string;
  visits: number;
  uniqueVisitors: number;
  averageTimeSpent: number;
}

interface SponsorReportData {
  sponsorId: string;
  sponsorName: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: SponsorMetrics;
  hourlyBreakdown: HourlyMetric[];
  dailyBreakdown: DailyMetric[];
}

// Define the secret (this tells Firebase to inject it at runtime)
const cjs2026ServiceAccountSecret = defineSecret("CJS2026_SERVICE_ACCOUNT");

// Initialize local Firebase Admin (Beat Street project)
const localApp = getApps().length === 0 ? initializeApp() : getApps()[0];
const localDb = getFirestore(localApp);
const localAuth = getAuth(localApp);

// Lazy initialization of CJS2026 app
let cjs2026App: App | null = null;
let cjs2026Db: FirebaseFirestore.Firestore | null = null;

function initCjs2026App(serviceAccountJson: string): boolean {
  if (cjs2026App) return true;

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    cjs2026App = initializeApp({
      credential: cert(serviceAccount),
    }, "cjs2026");
    cjs2026Db = getFirestore(cjs2026App);
    logger.info("CJS2026 app initialized successfully");
    return true;
  } catch (error) {
    logger.error("Failed to initialize CJS2026 app:", error);
    return false;
  }
}

/**
 * Verify attendee from CJS2026 project
 *
 * Flow:
 * 1. User signs in with Google to Beat Street's Firebase Auth
 * 2. Beat Street sends the ID token to this function
 * 3. We verify the token against Beat Street's Firebase Auth
 * 4. Extract the user's email from the token
 * 5. Look up that email in CJS2026's Firestore `users` collection
 * 6. Return verified if the user exists with a valid registration
 *
 * Accepts POST request with:
 * - idToken: Firebase ID token from Beat Street authentication
 *
 * Returns:
 * - verified: boolean
 * - attendee: verified attendee data (if successful)
 * - error: error message (if failed)
 */
export const verifyAttendee = onRequest({
  cors: true,
  maxInstances: 100,
  region: "us-central1",
  invoker: "public", // Allow unauthenticated invocations (required for browser calls)
  secrets: [cjs2026ServiceAccountSecret], // Inject the secret at runtime
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({
      verified: false,
      error: "Method not allowed. Use POST.",
    });
    return;
  }

  // Initialize CJS2026 app with the secret
  const secretValue = cjs2026ServiceAccountSecret.value();
  if (!secretValue) {
    logger.error("CJS2026_SERVICE_ACCOUNT secret not configured");
    res.status(500).json({
      verified: false,
      error: "Service configuration error. Please contact support.",
    });
    return;
  }

  if (!initCjs2026App(secretValue)) {
    res.status(500).json({
      verified: false,
      error: "Service initialization error. Please contact support.",
    });
    return;
  }

  // Check if CJS2026 app is initialized
  if (!cjs2026App || !cjs2026Db) {
    logger.error("CJS2026 app not initialized");
    res.status(500).json({
      verified: false,
      error: "Service configuration error. Please contact support.",
    });
    return;
  }

  try {
    const {idToken} = req.body;

    // Validate request body
    if (!idToken || typeof idToken !== "string") {
      res.status(400).json({
        verified: false,
        error: "Missing or invalid idToken in request body",
      });
      return;
    }

    logger.info("Verifying attendee token...");

    // Step 1: Verify ID token with Beat Street's Firebase Auth (local project)
    const decodedToken = await localAuth.verifyIdToken(idToken);
    const beatStreetUid = decodedToken.uid;
    const email = decodedToken.email;

    logger.info(`Token verified for Beat Street UID: ${beatStreetUid}`);

    // Step 2: Check that we have an email to look up
    if (!email) {
      logger.warn(`User ${beatStreetUid} has no email in their token`);
      res.status(400).json({
        verified: false,
        error: "No email associated with this account. " +
          "Please sign in with an email-enabled provider.",
      });
      return;
    }

    logger.info(`Looking up email ${email} in CJS2026 database`);

    // Step 3: Query CJS2026 Firestore for a user with this email
    const usersQuery = await cjs2026Db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      logger.warn(`Email ${email} not found in CJS2026 database`);
      res.status(404).json({
        verified: false,
        error: "Email not found in CJS2026 registration. " +
          "Please register for CJS2026 with this email address.",
      });
      return;
    }

    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    const cjs2026Uid = userDoc.id;

    logger.info(`Found CJS2026 user ${cjs2026Uid} for email ${email}`);

    // Step 4: Check if user is a confirmed attendee
    const isConfirmed =
      userData.registrationStatus === "confirmed" ||
      (userData.registrationStatus === "registered" &&
        userData.ticketsPurchased);

    if (!isConfirmed) {
      logger.warn(
        `User ${cjs2026Uid} (${email}) is not a confirmed attendee. ` +
        `Status: ${userData.registrationStatus}`
      );
      res.status(403).json({
        verified: false,
        error: "Not a confirmed attendee. Please complete your CJS2026 " +
          "registration.",
      });
      return;
    }

    logger.info(`User ${cjs2026Uid} (${email}) confirmed as attendee`);

    // Store verified attendee in local Firestore (Beat Street project)
    // Use Beat Street UID as the document ID for consistency with local auth
    const attendeeData = {
      uid: beatStreetUid,
      cjs2026Uid: cjs2026Uid, // Reference to CJS2026 user ID
      displayName: userData.name || userData.displayName || "Anonymous",
      organization: userData.organization || null,
      photoURL: userData.photoURL || decodedToken.picture || null,
      email: email,
      verifiedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lastVerified: FieldValue.serverTimestamp(),
    };

    await localDb
      .collection("verified_attendees")
      .doc(beatStreetUid)
      .set(attendeeData, {merge: true});

    logger.info(`Stored verified attendee: ${beatStreetUid} (CJS2026: ${cjs2026Uid})`);

    // Return success response
    res.status(200).json({
      verified: true,
      attendee: {
        uid: attendeeData.uid,
        displayName: attendeeData.displayName,
        organization: attendeeData.organization,
        photoURL: attendeeData.photoURL,
      },
    });
  } catch (error: unknown) {
    logger.error("Verification error:", error);

    const firebaseError = error as {code?: string};

    // Handle specific error cases
    if (firebaseError.code === "auth/id-token-expired") {
      res.status(401).json({
        verified: false,
        error: "Token expired. Please sign in again.",
      });
      return;
    }

    if (firebaseError.code === "auth/argument-error") {
      res.status(400).json({
        verified: false,
        error: "Invalid token format",
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      verified: false,
      error: "Verification failed. Please try again.",
    });
  }
});

/**
 * Seed POI data to Firestore
 *
 * This is an admin-only function to populate the POI collection with
 * Pittsburgh venue data. Call with POST request and admin secret.
 *
 * Usage:
 *   curl -X POST https://REGION-PROJECT.cloudfunctions.net/seedPOIs \
 *     -H "Content-Type: application/json" \
 *     -d '{"adminSecret": "YOUR_SECRET", "clearExisting": false}'
 *
 * Parameters:
 *   - adminSecret: Required. Must match ADMIN_SECRET environment variable.
 *   - clearExisting: Optional. If true, deletes existing POIs before seeding.
 *
 * Returns:
 *   - success: boolean
 *   - message: status message
 *   - count: number of POIs seeded
 */
export const seedPOIs = onRequest({
  cors: true,
  maxInstances: 10,
  region: "us-central1",
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
    return;
  }

  try {
    const {adminSecret, clearExisting = false} = req.body;

    // Validate admin secret (simple auth for seeding)
    // In production, use a proper secret manager
    const expectedSecret = process.env.ADMIN_SECRET || "dev-seed-secret";
    if (adminSecret !== expectedSecret) {
      logger.warn("Invalid admin secret provided for seedPOIs");
      res.status(403).json({
        success: false,
        error: "Invalid admin secret",
      });
      return;
    }

    logger.info("Starting POI seeding...");

    // Optionally clear existing POIs
    if (clearExisting) {
      logger.info("Clearing existing POIs...");
      const existingPOIs = await localDb.collection("poi").get();
      const batch = localDb.batch();
      existingPOIs.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info(`Deleted ${existingPOIs.size} existing POIs`);
    }

    // Seed Pittsburgh POIs
    const batch = localDb.batch();
    let count = 0;

    for (const poi of pittsburghPOIs) {
      const docRef = localDb.collection("poi").doc(poi.id);
      batch.set(docRef, {
        ...poi,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
    }

    await batch.commit();
    logger.info(`Seeded ${count} POIs successfully`);

    res.status(200).json({
      success: true,
      message: `Successfully seeded ${count} POIs`,
      count,
      pois: pittsburghPOIs.map((p) => ({id: p.id, name: p.name, type: p.type})),
    });
  } catch (error: unknown) {
    logger.error("Seeding error:", error);
    res.status(500).json({
      success: false,
      error: "Seeding failed. Check function logs.",
    });
  }
});

/**
 * Generate sponsor analytics report
 *
 * This function aggregates analytics data for a specific sponsor
 * to provide ROI metrics for sponsor reporting.
 *
 * Features:
 * - Unique visitors (by anonymous session ID)
 * - Total booth visits
 * - Average time spent at booth
 * - Peak hours analysis
 * - Daily breakdown for trend analysis
 * - Export as JSON or CSV
 *
 * Usage:
 *   POST /generateSponsorReport
 *   {
 *     "adminSecret": "YOUR_SECRET",
 *     "sponsorId": "sponsor-123",
 *     "startDate": "2026-06-08",
 *     "endDate": "2026-06-09",
 *     "format": "json" | "csv"
 *   }
 *
 * Returns:
 *   - success: boolean
 *   - report: SponsorReportData (if format=json)
 *   - csv: string (if format=csv)
 */
export const generateSponsorReport = onRequest({
  cors: true,
  maxInstances: 10,
  region: "us-central1",
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
    return;
  }

  try {
    const {
      adminSecret,
      sponsorId,
      startDate,
      endDate,
      format = "json",
    } = req.body;

    // Validate admin secret
    const expectedSecret = process.env.ADMIN_SECRET || "dev-seed-secret";
    if (adminSecret !== expectedSecret) {
      logger.warn("Invalid admin secret for generateSponsorReport");
      res.status(403).json({
        success: false,
        error: "Invalid admin secret",
      });
      return;
    }

    // Validate required fields
    if (!sponsorId || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: sponsorId, startDate, endDate",
      });
      return;
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end day

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD.",
      });
      return;
    }

    logger.info(`Generating sponsor report for ${sponsorId}`, {
      startDate,
      endDate,
      format,
    });

    // Query analytics events for this sponsor
    const eventsQuery = await localDb
      .collection("analytics_events")
      .where("sponsorId", "==", sponsorId)
      .where("timestamp", ">=", Timestamp.fromDate(start))
      .where("timestamp", "<=", Timestamp.fromDate(end))
      .orderBy("timestamp", "asc")
      .get();

    logger.info(`Found ${eventsQuery.size} events for sponsor ${sponsorId}`);

    // Get sponsor name from POIs
    const sponsorPOI = await localDb
      .collection("poi")
      .where("metadata.sponsorId", "==", sponsorId)
      .limit(1)
      .get();

    const sponsorName = sponsorPOI.empty
      ? sponsorId
      : sponsorPOI.docs[0].data().name || sponsorId;

    // Process events
    const sessions = new Set<string>();
    const dailyData = new Map<string, {
      visits: number;
      sessions: Set<string>;
      totalDuration: number;
      durationCount: number;
    }>();
    const hourlyData = new Map<string, {
      visits: number;
      sessions: Set<string>;
    }>();

    let totalDuration = 0;
    let durationCount = 0;
    let navigationRequests = 0;

    eventsQuery.docs.forEach((doc) => {
      const data = doc.data();
      const sessionId = data.sessionId as string;
      const timestamp = (data.timestamp as Timestamp).toDate();
      const eventType = data.eventType as string;
      const properties = data.properties as Record<string, unknown>;

      // Track unique sessions
      sessions.add(sessionId);

      // Daily aggregation
      const dateKey = timestamp.toISOString().split("T")[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          visits: 0,
          sessions: new Set(),
          totalDuration: 0,
          durationCount: 0,
        });
      }
      const daily = dailyData.get(dateKey)!;
      daily.visits++;
      daily.sessions.add(sessionId);

      // Hourly aggregation
      const hour = timestamp.getHours();
      const hourKey = `${dateKey}-${hour}`;
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, {
          visits: 0,
          sessions: new Set(),
        });
      }
      const hourly = hourlyData.get(hourKey)!;
      hourly.visits++;
      hourly.sessions.add(sessionId);

      // Track duration (from exit events)
      if (properties.duration && typeof properties.duration === "number") {
        const duration = properties.duration / 1000; // Convert to seconds
        totalDuration += duration;
        durationCount++;
        daily.totalDuration += duration;
        daily.durationCount++;
      }

      // Track navigation requests
      if (eventType === "navigation_request") {
        navigationRequests++;
      }
    });

    // Calculate metrics
    const metrics: SponsorMetrics = {
      uniqueVisitors: sessions.size,
      totalVisits: eventsQuery.size,
      averageTimeSpent: durationCount > 0 ? totalDuration / durationCount : 0,
      totalTimeSpent: totalDuration,
      navigationRequests,
      peakConcurrentVisitors: Math.max(
        ...Array.from(hourlyData.values()).map((h) => h.sessions.size),
        0
      ),
    };

    // Build hourly breakdown
    const hourlyBreakdown: HourlyMetric[] = Array.from(hourlyData.entries())
      .map(([key, data]) => {
        const [date, hourStr] = key.split("-");
        const hour = parseInt(hourStr, 10);
        return {
          hour,
          date: `${date.split("-").slice(0, 3).join("-")}`,
          visits: data.visits,
          uniqueVisitors: data.sessions.size,
        };
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.hour - b.hour;
      });

    // Build daily breakdown
    const dailyBreakdown: DailyMetric[] = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        visits: data.visits,
        uniqueVisitors: data.sessions.size,
        averageTimeSpent: data.durationCount > 0
          ? data.totalDuration / data.durationCount
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build report
    const report: SponsorReportData = {
      sponsorId,
      sponsorName,
      dateRange: {
        start,
        end,
      },
      metrics,
      hourlyBreakdown,
      dailyBreakdown,
    };

    // Return based on format
    if (format === "csv") {
      const csvLines: string[] = [];

      // Summary section
      csvLines.push("Sponsor Analytics Report");
      csvLines.push(`Sponsor,${sponsorName}`);
      csvLines.push(`Date Range,${startDate} to ${endDate}`);
      csvLines.push("");

      // Metrics section
      csvLines.push("Summary Metrics");
      csvLines.push(`Unique Visitors,${metrics.uniqueVisitors}`);
      csvLines.push(`Total Visits,${metrics.totalVisits}`);
      csvLines.push(`Average Time Spent (seconds),${metrics.averageTimeSpent.toFixed(1)}`);
      csvLines.push(`Total Time Spent (seconds),${metrics.totalTimeSpent.toFixed(1)}`);
      csvLines.push(`Navigation Requests,${metrics.navigationRequests}`);
      csvLines.push(`Peak Concurrent Visitors,${metrics.peakConcurrentVisitors}`);
      csvLines.push("");

      // Daily breakdown
      csvLines.push("Daily Breakdown");
      csvLines.push("Date,Visits,Unique Visitors,Avg Time Spent (s)");
      dailyBreakdown.forEach((d) => {
        csvLines.push(`${d.date},${d.visits},${d.uniqueVisitors},${d.averageTimeSpent.toFixed(1)}`);
      });
      csvLines.push("");

      // Hourly breakdown
      csvLines.push("Hourly Breakdown");
      csvLines.push("Date,Hour,Visits,Unique Visitors");
      hourlyBreakdown.forEach((h) => {
        csvLines.push(`${h.date},${h.hour},${h.visits},${h.uniqueVisitors}`);
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="sponsor-report-${sponsorId}-${startDate}-${endDate}.csv"`
      );
      res.status(200).send(csvLines.join("\n"));
    } else {
      res.status(200).json({
        success: true,
        report,
      });
    }
  } catch (error: unknown) {
    logger.error("Report generation error:", error);
    res.status(500).json({
      success: false,
      error: "Report generation failed. Check function logs.",
    });
  }
});
