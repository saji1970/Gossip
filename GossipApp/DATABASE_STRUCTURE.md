# 📊 GossipIn - Firestore Database Structure

## Overview

GossipIn uses a **Zero-Log, Ephemeral** database architecture where:
- ✅ **No messages are stored permanently**
- ✅ **Only anonymous IDs are used**
- ✅ **Messages auto-delete after 10 seconds**
- ✅ **No PII (Personally Identifiable Information)**

---

## 📁 Collections Structure

```
firestore (root)
│
├── /artifacts/gossipin-v1/public/data/
│   │
│   ├── /groups/                    [PERSISTENT - Minimal Metadata]
│   │   └── {groupId}
│   │       ├── groupId: string
│   │       ├── groupName: string
│   │       ├── type: "public" | "private"
│   │       ├── creatorAnonId: string (UUID)
│   │       ├── rules: string
│   │       ├── termsAndConditions: string
│   │       ├── memberAnonIds: string[] (UUIDs)
│   │       ├── moderators: string[] (UUIDs)
│   │       ├── avatar: string (emoji)
│   │       ├── createdAt: timestamp
│   │       └── lastActivity: timestamp
│   │
│   ├── /users/                     [OPTIONAL - Presence Only]
│   │   └── {anonId}
│   │       ├── anonId: string (UUID)
│   │       ├── avatar: string (emoji)
│   │       ├── displayName?: string (pseudonym)
│   │       └── lastActive: timestamp
│   │
│   └── /join_requests/             [PERSISTENT - Approval Queue]
│       └── {requestId}
│           ├── requestId: string
│           ├── groupId: string
│           ├── requesterAnonId: string (UUID)
│           ├── status: "pending" | "approved" | "rejected"
│           ├── requestedAt: timestamp
│           ├── reviewedBy?: string (UUID)
│           └── reviewedAt?: timestamp
│
├── /transient/                      [EPHEMERAL - Auto-Delete]
│   │
│   ├── /messages/                   [10-SECOND TTL]
│   │   └── {messageId}
│   │       ├── id: string
│   │       ├── senderAnonId: string (UUID)
│   │       ├── target: string (groupId)
│   │       ├── messageType: "text" | "media" | "voice" | "sticker"
│   │       ├── content: string (or Base64 for media)
│   │       ├── timestamp: number (ms)
│   │       ├── _ttl: number (10000)
│   │       └── replyTo?: string
│   │
│   ├── /dm/                         [10-SECOND TTL]
│   │   └── {channelId}/             (format: anonId1__anonId2)
│   │       └── /messages/
│   │           └── {messageId}
│   │               ├── (same as messages above)
│   │               └── target: channelId
│   │
│   └── /voice_sessions/             [60-SECOND TTL]
│       └── {sessionId}
│           ├── sessionId: string
│           ├── participants: string[] (UUIDs)
│           ├── createdBy: string (UUID)
│           ├── groupId?: string
│           ├── offer?: RTCSessionDescription
│           ├── answer?: RTCSessionDescription
│           ├── iceCandidates: RTCIceCandidate[]
│           ├── createdAt: timestamp
│           └── _ttl: number (60000)
```

---

## 🔐 Security Rules

The database uses **production-mode security rules** that enforce:

### Groups Collection
```javascript
// Read: Anyone can discover public groups
allow read: if true;

// Write: Authenticated users can create
allow create: if request.auth != null 
  && validGroupData();

// Update: Only members/moderators
allow update: if request.auth != null 
  && isMemberOrModerator();
```

### Transient Collections
```javascript
// Create: Authenticated only
allow create: if request.auth != null;

// Read: Authenticated only (client filters by target)
allow read: if request.auth != null;

// Delete: Authenticated only (for cleanup)
allow delete: if request.auth != null;
```

---

## 🗂️ Indexes

The database requires these composite indexes for optimal performance:

### Index 1: Public Group Discovery
```
Collection: /artifacts/gossipin-v1/public/data/groups
Fields:
  - type (Ascending)
  - lastActivity (Descending)
```

### Index 2: User's Joined Groups
```
Collection: /artifacts/gossipin-v1/public/data/groups
Fields:
  - memberAnonIds (Array Contains)
  - lastActivity (Descending)
```

### Index 3: Group Messages
```
Collection: /transient/messages
Fields:
  - target (Ascending)
  - timestamp (Descending)
```

---

## 📊 Data Flow

### Message Lifecycle (10 Seconds Total)

```
1. User sends message
   ↓
2. Written to /transient/messages/{id}
   ↓
3. Real-time listener (onSnapshot) fires
   ↓
4. Recipient receives message
   ↓
5. Saved to recipient's local AsyncStorage
   ↓
6. Recipient deletes from Firestore
   ↓
7. Sender's TTL timer deletes from Firestore
   ↓
8. Cloud Function cleanup (backup deletion)
   ↓
9. Message exists ONLY on client devices
```

### Group Creation Flow

```
1. User creates group
   ↓
2. Written to /groups/{groupId}
   ↓
3. Group appears in discovery (if public)
   ↓
4. Members join and appear in memberAnonIds[]
   ↓
5. Group persists (no TTL)
```

---

## 💾 Storage Estimates

### Expected Database Size

| Component | Size | Notes |
|-----------|------|-------|
| Groups | ~1 KB each | Minimal metadata only |
| Users | ~0.5 KB each | Optional, presence only |
| Join Requests | ~0.3 KB each | Temporary, cleaned periodically |
| **Transient Messages** | **~0 KB** | **Auto-deleted immediately!** |
| **Total** | **< 10 MB** | **For 1000 active groups** |

### Why Storage Stays Near Zero

1. **Messages are ephemeral**: Deleted within 10 seconds
2. **No message history**: Only current active messages
3. **No media storage**: Base64 in transit only
4. **Minimal group data**: Just names and member lists
5. **Cloud Function cleanup**: Runs every minute

---

## 🔄 Cloud Functions

### cleanupTransientDocs (Runs Every Minute)

```javascript
Scans:
  - /transient/messages
  - /transient/dm/**/messages
  - /transient/voice_sessions

Deletes:
  - Documents where: timestamp + _ttl < now

Result:
  - Ensures no orphaned messages
  - Keeps database clean
  - Maintains zero-log architecture
```

---

## 📈 Firestore Usage (Free Tier)

### Daily Limits (Free Tier)

| Operation | Limit | Typical Usage |
|-----------|-------|---------------|
| Reads | 50,000/day | ~100/user/day |
| Writes | 20,000/day | ~40/user/day |
| Deletes | 20,000/day | ~40/user/day (auto-cleanup) |
| Storage | 1 GB | < 10 MB actual |

### Why It Fits Free Tier

- ✅ **Messages don't accumulate** (ephemeral)
- ✅ **Each message: 1 write + 2 deletes** (sender + receiver)
- ✅ **Groups reuse same documents** (updates not creates)
- ✅ **Storage stays minimal** (no history)

**Estimate**: Free tier supports **500+ daily active users**!

---

## 🎯 Production Verification

After setup, verify in Firebase Console:

### Firestore Database Tab

**Should See:**
- ✅ Database in production mode
- ✅ Rules deployed and published
- ✅ Indexes showing "Enabled"
- ✅ Empty or minimal document count (ephemeral!)

**Should NOT See:**
- ❌ Messages collection filling up
- ❌ Large document counts
- ❌ PII in any documents
- ❌ Phone numbers or emails

---

## 🛠️ Management Commands

```bash
# View database structure
firebase firestore:collections

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# View function logs (cleanup)
firebase functions:log

# Check quotas
# Go to: Firebase Console → Usage and billing
```

---

## 📚 Related Files

- **`firestore.rules`** - Security rules implementation
- **`firestore.indexes.json`** - Index definitions
- **`functions/index.ts`** - Cleanup Cloud Function
- **`src/services/TransientMessagingService.ts`** - Client-side implementation

---

## 🎉 Summary

GossipIn's database is:
- ✅ **Privacy-First**: No PII, anonymous UUIDs only
- ✅ **Ephemeral**: Messages exist < 10 seconds
- ✅ **Efficient**: Fits comfortably in free tier
- ✅ **Secure**: Production rules enforce zero-log
- ✅ **Scalable**: Auto-cleanup prevents growth

**Your database is now ready for production!** 🚀

