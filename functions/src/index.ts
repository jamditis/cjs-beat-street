/**
 * Firebase Cloud Functions for Beat Street
 * Cross-project authentication with CJS2026
 */

import {onRequest} from "firebase-functions/v2/https";
import {initializeApp, cert, App} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Initialize local Firebase Admin (Beat Street project)
const localApp = initializeApp();
const localDb = getFirestore(localApp);

// Initialize CJS2026 Firebase Admin for cross-project verification
let cjs2026App: App | null = null;
let cjs2026Db: FirebaseFirestore.Firestore | null = null;

try {
  // CJS2026 service account credentials should be stored as environment variable
  // Set via: firebase functions:config:set cjs2026.service_account='{...json...}'
  const cjs2026ServiceAccount = process.env.CJS2026_SERVICE_ACCOUNT;

  if (cjs2026ServiceAccount) {
    cjs2026App = initializeApp({
      credential: cert(JSON.parse(cjs2026ServiceAccount)),
    }, "cjs2026");
    cjs2026Db = getFirestore(cjs2026App);
    logger.info("CJS2026 app initialized successfully");
  } else {
    logger.warn(
      "CJS2026_SERVICE_ACCOUNT not found. " +
      "verifyAttendee function will not work until configured."
    );
  }
} catch (error) {
  logger.error("Failed to initialize CJS2026 app:", error);
}

/**
 * Verify attendee from CJS2026 project
 *
 * Accepts POST request with:
 * - idToken: Firebase ID token from CJS2026 authentication
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
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({
      verified: false,
      error: "Method not allowed. Use POST.",
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

    // Verify ID token with CJS2026 Firebase Auth
    const decodedToken = await getAuth(cjs2026App).verifyIdToken(idToken);
    const uid = decodedToken.uid;

    logger.info(`Token verified for UID: ${uid}`);

    // Check registration status in CJS2026 Firestore
    const userDoc = await cjs2026Db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      logger.warn(`User ${uid} not found in CJS2026 database`);
      res.status(404).json({
        verified: false,
        error: "User not found in CJS2026",
      });
      return;
    }

    const userData = userDoc.data();

    if (!userData) {
      logger.warn(`User ${uid} has no data`);
      res.status(404).json({
        verified: false,
        error: "User data not found",
      });
      return;
    }

    // Check if user is a confirmed attendee
    const isConfirmed =
      userData.registrationStatus === "confirmed" ||
      (userData.registrationStatus === "registered" &&
        userData.ticketsPurchased);

    if (!isConfirmed) {
      logger.warn(
        `User ${uid} is not a confirmed attendee. ` +
        `Status: ${userData.registrationStatus}`
      );
      res.status(403).json({
        verified: false,
        error: "Not a confirmed attendee. Please register for CJS2026.",
      });
      return;
    }

    logger.info(`User ${uid} confirmed as attendee`);

    // Store verified attendee in local Firestore (Beat Street project)
    const attendeeData = {
      uid,
      displayName: userData.name || userData.displayName || "Anonymous",
      organization: userData.organization || null,
      photoURL: userData.photoURL || null,
      email: decodedToken.email || null,
      verifiedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lastVerified: FieldValue.serverTimestamp(),
    };

    await localDb
      .collection("verified_attendees")
      .doc(uid)
      .set(attendeeData, {merge: true});

    logger.info(`Stored verified attendee: ${uid}`);

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
  } catch (error: any) {
    logger.error("Verification error:", error);

    // Handle specific error cases
    if (error.code === "auth/id-token-expired") {
      res.status(401).json({
        verified: false,
        error: "Token expired. Please sign in again.",
      });
      return;
    }

    if (error.code === "auth/argument-error") {
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
