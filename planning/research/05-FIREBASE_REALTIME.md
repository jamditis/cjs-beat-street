# Firebase Real-Time Systems Optimization (2026)

**Research Date:** January 7, 2026
**Focus:** Presence systems, cost optimization, scaling for 100+ concurrent users

---

## Table of Contents

1. [Firestore vs Realtime Database](#firestore-vs-realtime-database)
2. [Cost Optimization](#cost-optimization)
3. [Presence Detection Patterns](#presence-detection-patterns)
4. [Offline-First Sync](#offline-first-sync)
5. [Security Rules](#security-rules)
6. [Cloud Functions Optimization](#cloud-functions-optimization)
7. [Common Pitfalls](#common-pitfalls)
8. [Scaling Considerations](#scaling-considerations)

---

## Firestore vs Realtime Database

### 🚨 CRITICAL FINDING: Wrong Database for Presence

**Your current implementation uses Firestore for presence - this is suboptimal.**

### Research Findings

**Realtime Database (RTDB) is the clear winner for presence:**

- **Native presence support:** Built-in `.onDisconnect()` handlers
- **Lower latency:** 600ms vs 1500ms for Firestore
- **Better cost model:** Bandwidth-based vs operation-based
- **Purpose-built:** High-frequency, small updates

**Firestore strengths (not for presence):**
- Complex queries and aggregations
- Better offline persistence with indexed cache
- Automatic scaling to 1M connections
- Multi-region replication

### Industry Consensus (2026)

> "Teams can save 40% simply by moving chat features or presence systems—which generate massive numbers of small updates—to the Realtime Database."

### Recommended Architecture

```
┌─────────────────────────────────────────────────┐
│  Realtime Database (RTDB)                       │
│  - Presence tracking (/presence/{uid})          │
│  - Connection state (.info/connected)           │
│  - Heartbeats and disconnect handlers           │
│  Cost: FREE for 100 CCU                         │
└───────────────┬─────────────────────────────────┘
                │
                │ (Cloud Function sync)
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Cloud Firestore                                │
│  - POI data (complex queries)                   │
│  - User achievements                            │
│  - Verified attendees                           │
│  - Game configuration                           │
│  Cost: FREE (within tier)                       │
└─────────────────────────────────────────────────┘
```

---

## Cost Optimization

### Pricing Structure (2026)

**Firestore:**
- $0.18 per 100,000 reads
- $0.18 per 100,000 writes
- Free tier: 50,000 reads, 20,000 writes per day

**Realtime Database:**
- Charges for bandwidth and storage (not operations)
- 100 CCU: FREE plan
- 100,000 CCU: $25/month

### Cost Analysis: Beat Street (100 concurrent users, 2-day event)

**Current Firestore-only:**
```
Assumptions:
- 100 users online simultaneously
- Presence updates every 30 seconds
- 8-hour conference day × 2 days

Operations per day:
- Writes: 100 users × 8 hours × 120 updates/hour = 96,000
- Reads (listeners): 100 users × 96,000 updates = 9,600,000

Cost per day:
- Writes: 96,000 / 100,000 × $0.18 = $0.17
- Reads: 9,600,000 / 100,000 × $0.18 = $17.28
Total per day: $17.45
Two-day event: $34.90
```

**Recommended RTDB + Firestore:**
```
RTDB for presence:
- 100 concurrent users: FREE (within free tier)
- Bandwidth: 96,000 × 200 bytes = 19.2 MB/day: FREE

Firestore for other data:
- POI reads: ~1,000/day = FREE
- Achievement writes: ~500/day = FREE

Total: $0.00 per event
Savings: $34.90 (100% cost reduction)
```

### Key Optimization Strategies

1. **Use RTDB for high-frequency updates** (presence, chat, live data)
2. **Avoid offset-based pagination** (charged for skipped documents)
3. **Use cursors** for pagination
4. **Implement 500/50/5 rule** for scaling:
   - Ramp up at 500 ops/second
   - Increase by 50% every 5 minutes
5. **Enable persistent cache indexes**
6. **Batch operations**
7. **Set billing alerts**

---

## Presence Detection Patterns

### 🚨 CRITICAL ISSUE: Your Current Implementation

**Missing:**
- No disconnect detection
- No heartbeat mechanism
- Users appear online indefinitely if they close tab

### RTDB Presence Pattern (Recommended)

```typescript
// 1. Monitor connection state
const connectedRef = rtdb.ref('.info/connected');
connectedRef.on('value', (snap) => {
  if (snap.val() === true) {
    // We're connected
    const userStatusRef = rtdb.ref('/presence/' + uid);

    // Set disconnect handler BEFORE going online
    // (prevents race conditions)
    userStatusRef.onDisconnect().set({
      state: 'offline',
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });

    // Now set user online
    userStatusRef.set({
      state: 'online',
      zone: currentZone,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
  }
});
```

### Key Patterns

1. **Set `onDisconnect()` BEFORE marking online** (prevents race conditions)
2. **Use server timestamps** (not client timestamps)
3. **RTDB disconnects after 60 seconds** of inactivity
4. **Verify attachment with callbacks**
5. **Use Cloud Functions** to mirror RTDB → Firestore

### Firestore-only Solution (Temporary)

Until RTDB integration:

```typescript
// Heartbeat every 30 seconds
setInterval(() => {
  updatePresence(uid, { status: 'active' });
}, 30000);

// Cloud Function to clean up stale presence
// Runs every 5 minutes, removes users with updatedAt > 2 min ago
```

---

## Offline-First Sync

### Current Implementation (Good)

```typescript
// ✅ Already using persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

### Recommended Enhancements

**1. Conflict Resolution Strategies**

- **Last-Writer-Wins (LWW):** Use `updatedAt` for presence
- **Additive merges:** Use `FieldValue.increment()` for counters
- **Set operations:** For tags/participants
- **CRDT-like lists:** For ordered collaboration

**2. Offline Detection and UI Feedback**

```typescript
// Monitor Firestore connectivity
onSnapshot(doc(db, '_connectivity', 'check'),
  () => { /* connected */ },
  (error) => { /* offline */ }
);
```

**3. Service Worker Cache Strategy**

- Cache-first for game assets
- Network-first for Firebase data
- Stale-while-revalidate for POI data

### Offline Capabilities Comparison

| Feature | Firestore | RTDB |
|---------|-----------|------|
| Offline persistence | ✅ Built-in | ✅ Built-in |
| Automatic sync | ✅ Yes | ✅ Yes |
| Conflict resolution | ⚠️ LWW only | ✅ Transactions |
| Query offline cache | ✅ Yes (indexed) | ⚠️ Limited |
| Multi-tab support | ✅ Yes | ✅ Yes |

---

## Security Rules

### Current Implementation Review

**Strengths:**
- ✅ Deny-by-default
- ✅ Helper functions for auth
- ✅ User can only modify own presence
- ✅ Privacy-compliant (shareLocation check)

**Issues:**
- ⚠️ No rate limiting
- ⚠️ No size validation
- ⚠️ Missing index requirements

### Enhanced Security Rules (Firestore)

```javascript
match /presence/{uid} {
  allow read: if isAuthenticated() &&
    (resource.data.shareLocation == true || isOwner(uid));

  allow create, update: if isOwner(uid) &&
    request.resource.data.keys().hasAll(['zone', 'shareLocation', 'status', 'updatedAt']) &&
    request.resource.data.zone is string &&
    request.resource.data.zone.size() <= 50 &&
    request.resource.data.shareLocation is bool &&
    request.resource.data.status in ['active', 'idle', 'away'] &&
    request.resource.data.updatedAt is timestamp &&
    // Rate limiting: max once every 10 seconds
    (!resource || request.time > resource.data.updatedAt + duration.value(10, 's'));

  allow delete: if isOwner(uid);
}
```

### RTDB Security Rules (For Future)

```json
{
  "rules": {
    "presence": {
      "$uid": {
        ".read": "auth != null && (data.child('shareLocation').val() == true || auth.uid == $uid)",
        ".write": "auth.uid == $uid",
        ".validate": "newData.hasChildren(['state', 'zone', 'lastSeen'])"
      }
    }
  }
}
```

### Additional Security

1. **Enable Firebase App Check** (protects API)
2. **Use custom claims** for roles
3. **Unit test rules** with Emulator
4. **Regular audits** (quarterly)
5. **Monitor for abuse**

---

## Cloud Functions Optimization

### Current Implementation Review

**Good:**
- ✅ Node 22 runtime (fast cold starts ~100ms)
- ✅ Secrets management
- ✅ Error handling
- ✅ CORS enabled

**Optimization Opportunities:**
- ⚠️ High maxInstances (100) for small event
- ⚠️ No memory allocation (defaults to 256MB)
- ⚠️ No caching of verification results

### Optimized Configuration

```typescript
export const verifyAttendee = onRequest({
  cors: true,
  maxInstances: 10,        // ← Reduced from 100
  memory: "512MiB",        // ← Faster CPU allocation
  timeoutSeconds: 10,      // ← Explicit timeout
  region: "us-central1",
  invoker: "public",
  secrets: [cjs2026ServiceAccountSecret],
}, async (req, res) => {
  // Cache verification results in-memory
  // Function instances reused for ~15 minutes
});
```

### Performance Optimizations

**1. Cold Start Optimization:**
- Keep dependencies minimal ✅
- Cache objects in global scope ✅
- Use lighter runtimes ✅
- Limit concurrency (10 better than 100)

**2. Memory Allocation:**

| Configuration | Cold Start | Cost per 1M |
|--------------|------------|-------------|
| 256MB, Node 18 | ~150ms | $0.40 |
| 512MB, Node 22 | ~100ms | $0.80 |
| 1GB, Node 22 | ~80ms | $1.60 |

**Recommendation:** 512MB Node 22 (optimal for Beat Street)

### Presence Sync Function (Recommended Addition)

```typescript
// Mirror RTDB presence to Firestore every minute
export const syncPresence = onSchedule({
  schedule: 'every 1 minutes',
  timeZone: 'America/New_York',
  memory: '256MiB',
}, async () => {
  // Read from RTDB, write aggregated data to Firestore
  // Allows complex queries on presence data
});
```

---

## Common Pitfalls

### Top 10 Mistakes

1. **Storing large arrays in single documents** ❌
2. **Not setting billing alerts** ❌
3. **Overusing real-time listeners** ❌
4. **Ignoring cold starts** ❌
5. **Not monitoring quotas** ❌
6. **Open security rules** ❌
7. **No disconnect detection** ❌ (Beat Street issue)
8. **Not using composite indexes** ✅ (you have this)
9. **Storing secrets in code** ✅ (you use Secrets)
10. **No offline testing** ❌

### Beat Street-Specific Issues

1. ❌ No presence cleanup → ghost users
2. ❌ Firestore-only presence → 40% higher costs
3. ❌ No heartbeat system → can't detect dropped connections
4. ❌ Missing RTDB integration → not using native features

---

## Scaling Considerations

### Capacity Analysis for 100 Concurrent Users

**Firebase Realtime Database:**
- Limit: 200,000 concurrent connections
- 100 users: **0.05% of capacity** ✅
- Cost: FREE (within free tier)

**Cloud Firestore:**
- Limit: 1,000,000 concurrent connections
- 100 users: **0.01% of capacity** ✅
- Automatic scaling built-in

### Performance Targets

| Metric | Target | Current (est) |
|--------|--------|---------------|
| Presence latency | <600ms | ~1500ms |
| POI query time | <100ms | ~50ms |
| Initial load | <2s | ~1.5s |
| Offline functionality | 100% | ~80% |

### Scaling Projection

| Users | Firestore-Only | RTDB + Firestore | Savings |
|-------|---------------|------------------|---------|
| 100 | $35 | $0 | $35 (100%) |
| 500 | $175 | $0 | $175 (100%) |
| 1,000 | $350 | $25 | $325 (93%) |
| 5,000 | $1,750 | $125 | $1,625 (93%) |
| 10,000 | $3,500 | $250 | $3,250 (93%) |

---

## Implementation Roadmap

### Phase 1: RTDB Integration (4-6 hours)

```bash
# 1. Install RTDB SDK
npm install firebase@latest

# 2. Add RTDB to firebase.ts
# 3. Implement presence with onDisconnect
# 4. Test in emulator
# 5. Deploy Cloud Function to sync RTDB → Firestore
```

### Phase 2: Security & Monitoring (2-3 hours)

```bash
# 1. Update Firestore rules (rate limiting)
# 2. Add RTDB security rules
# 3. Set billing alerts ($10, $50, $100)
# 4. Enable Firebase App Check
# 5. Configure performance monitoring
```

### Phase 3: Testing (1-2 hours)

```bash
# 1. Load test with 100 simulated users
# 2. Test offline scenarios
# 3. Verify disconnect detection
# 4. Final security audit
```

---

## Recommended File Structure

```
src/
├── services/
│   ├── firebase.ts              # Existing
│   ├── firestore.ts             # NEW: Firestore operations
│   ├── realtime-database.ts     # NEW: RTDB presence
│   └── presence.ts              # REFACTOR: Use RTDB

functions/src/
├── index.ts                      # Existing verifyAttendee
├── syncPresence.ts              # NEW: RTDB → Firestore sync
└── cleanupStalePresence.ts      # NEW: Remove disconnected
```

### Database Schema

**RTDB Structure:**
```json
{
  "presence": {
    "user123": {
      "state": "online",
      "zone": "main-stage",
      "displayName": "Jane Doe",
      "shareLocation": true,
      "lastSeen": 1717876800000
    }
  },
  "zoneCounts": {
    "main-stage": 23,
    "expo-hall": 45
  }
}
```

**Firestore (unchanged):**
```
presence/{uid}
├── uid: string
├── displayName: string
├── zone: string
├── shareLocation: boolean
└── updatedAt: timestamp
```

---

## Priority Recommendations

### 🔴 Priority 1: Critical (Before CJS2026)

1. **Integrate RTDB for presence** (4-6 hours)
   - Cost savings: $35 → $0
   - Latency: 60% improvement
   - Native disconnect detection

2. **Implement disconnect detection** (2-3 hours)
   - Fix ghost user issue
   - Show actual connection state

3. **Add security rule rate limiting** (30 min)
   - Prevent spam
   - Add validation

4. **Set up billing alerts** (5 min)
   - $10, $50, $100 thresholds

### 🟡 Priority 2: Important

5. **Optimize Cloud Functions** (1 hour)
   - Reduce maxInstances to 10
   - Set memory to 512MB
   - Add caching

6. **Enable Firebase App Check** (1 hour)
   - API abuse protection

7. **Add offline detection UI** (2 hours)
   - Connection status
   - Queue operations

### 🟢 Priority 3: Nice to Have

8. **Presence aggregation** (3 hours)
   - User counts per zone

9. **Real-time notifications** (4 hours)
   - FCM integration

10. **Multi-region deployment** (2 hours)
    - If international users

---

## Testing Checklist

### Before Launch

- [ ] Load test: 100 simulated users
- [ ] Test presence under various network conditions
- [ ] Verify disconnect detection (close tab, lose connection)
- [ ] Test offline mode (airplane mode)
- [ ] Security rules audit
- [ ] Cost estimation verified
- [ ] Backup plan for outage

### During Event

- [ ] Real-time monitoring dashboard
- [ ] Billing alerts configured
- [ ] On-call engineer
- [ ] Rollback plan documented

---

## Sources

- [Choose a Database: Firestore or RTDB](https://firebase.google.com/docs/database/rtdb-vs-firestore)
- [Build presence in Cloud Firestore](https://firebase.google.com/docs/firestore/solutions/presence)
- [Firebase in 2026: Advanced Features](https://medium.com/@alisha00/firebase-in-2026-advanced-features-patterns-and-best-practices-for-scalable-apps-c0cbf084e6a4)
- [Cost Optimization for Large Firebase Projects](https://dev.to/sherry_walker_bba406fb339/cost-optimization-strategies-for-large-firebase-projects-ljp)
- [Top 10 Mistakes with Firebase in 2025](https://dev.to/mridudixit15/top-10-mistakes-developers-still-make-with-firebase-in-2025-53ah)
- [Understand reads and writes at scale](https://firebase.google.com/docs/firestore/understand-reads-writes-scale)
- [Cloud Functions tips & tricks](https://firebase.google.com/docs/functions/tips)
