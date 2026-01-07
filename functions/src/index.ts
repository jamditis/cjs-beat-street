/**
 * Firebase Cloud Functions for Beat Street
 * Cross-project authentication with CJS2026
 */

import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp, cert, App, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

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
