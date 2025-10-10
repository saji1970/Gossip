# GossipIn - Complete Implementation

## 🎯 Overview

**GossipIn** is an anonymous, zero-PII gossiping mobile app built with React Native. It implements an ephemeral messaging architecture where no messages are stored centrally, and all user identities are completely anonymous.

## 🏗️ Architecture

### Core Principles
1. **Zero PII**: No personally identifiable information stored anywhere
2. **Anonymous Only**: Users identified by UUID v4 (anonId) only
3. **Ephemeral Messages**: Transient Firestore bus - messages deleted after delivery
4. **Client-Side Storage**: All persistent data stored locally using AsyncStorage
5. **No Firebase Storage**: Media transmitted as Base64 strings

### Technology Stack
- **Framework**: React Native 0.81
- **Backend**: Firebase (Firestore + Auth)
- **State Management**: React Hooks + Local Services
- **Local Storage**: AsyncStorage
- **Media**: Expo Image Picker (Base64 encoding)
- **Voice** (planned): react-native-webrtc

## 📁 Project Structure

```
GossipApp/
├── src/
│   ├── config/
│   │   └── firebase.ts              # Firebase configuration
│   ├── constants/
│   │   ├── avatars.ts               # Avatar emojis
│   │   └── stickers.ts              # Sticker pack
│   ├── services/
│   │   ├── AuthService.ts           # Anonymous authentication
│   │   ├── LocalStorageService.ts   # AsyncStorage wrapper
│   │   ├── TransientMessagingService.ts  # Ephemeral messaging
│   │   ├── GroupService.ts          # Group management
│   │   └── MediaService.ts          # Base64 media handling
│   ├── types/
│   │   └── models.ts                # TypeScript interfaces
│   ├── utils/
│   │   ├── anonId.ts                # UUID generation
│   │   └── dmChannel.ts             # DM channel ID generator
│   └── screens/
│       └── HomeScreen.tsx           # Main UI
├── functions/
│   └── index.ts                     # Cloud Functions
├── firestore.rules                  # Security rules
└── App.tsx                          # Entry point
```

## 🔑 Key Features Implemented

### 1. Anonymous Authentication ✅
- **File**: `src/services/AuthService.ts`
- Firebase anonymous auth
- Maps Firebase UID → anonId (UUID v4)
- Local storage of anonId mapping
- Profile with avatar & optional pseudonym

### 2. Transient Messaging ✅
- **File**: `src/services/TransientMessagingService.ts`
- Messages written to Firestore `/transient/...`
- Auto-deleted after 10 seconds (TTL)
- Client-side saves to AsyncStorage
- Real-time delivery via `onSnapshot`
- Supports: text, media (Base64), voice, stickers

### 3. Group Management ✅
- **File**: `src/services/GroupService.ts`
- Create public/private groups
- Define rules & terms
- Moderator system (creator + assigned mods)
- Join requests for private groups
- Minimal metadata in Firestore

### 4. Local Storage ✅
- **File**: `src/services/LocalStorageService.ts`
- User profile
- Chat history (all messages)
- DM channels
- Joined groups list
- UID→anonId mapping (never leaves device)

### 5. Media Handling ✅
- **File**: `src/services/MediaService.ts`
- Image picker with Base64 encoding
- Camera capture with Base64
- Video support (with compression warnings)
- Size estimation & validation
- No Firebase Storage usage

### 6. Firestore Security Rules ✅
- **File**: `firestore.rules`
- Public group discovery
- Authenticated-only transient collections
- Auto-cleanup policies
- No PII validation

### 7. Cloud Functions ✅
- **File**: `functions/index.ts`
- `cleanupTransientDocs`: Runs every minute, deletes expired messages
- `updateGroupActivity`: Updates last activity timestamp
- `autoDeleteTransientMessage`: Backup deletion for transient docs

## 📊 Data Models

### UserProfile (Local + Optional Firestore)
```typescript
{
  anonId: string;        // UUID v4
  avatar: string;        // Emoji
  displayName?: string;  // Optional pseudonym
  createdAt: number;
  lastActive?: number;
}
```

### Group (Firestore)
```typescript
{
  groupId: string;
  groupName: string;
  type: 'public' | 'private';
  creatorAnonId: string;
  rules: string;
  termsAndConditions: string;
  memberAnonIds: string[];
  moderators: string[];
  avatar?: string;
  createdAt: number;
  lastActivity?: number;
}
```

### TransientMessage (Ephemeral - Firestore)
```typescript
{
  id: string;
  senderAnonId: string;
  target: string;         // groupId or channelId
  messageType: 'text' | 'media' | 'voice' | 'sticker';
  content: string;        // Text or Base64 data URI
  timestamp: number;
  _ttl?: number;          // TTL in milliseconds
  replyTo?: string;
}
```

### LocalMessage (AsyncStorage)
```typescript
{
  ...TransientMessage,
  isRead: boolean;
  isSent: boolean;
  localId: string;
}
```

## 🔐 Security & Privacy

### Zero-PII Architecture
1. **No Phone Number Storage**: Used only once for invite link generation (in-memory)
2. **No Real Names**: Only pseudonyms
3. **No Email Addresses**: Anonymous auth only
4. **No Photo Storage**: Base64 strings, transient only

### Anonymous Identities
- Each user has a UUID v4 `anonId`
- Mapping from Firebase UID → anonId stored locally only
- Firestore never sees Firebase UIDs or any PII
- All communication uses `anonId`

### Ephemeral Messages
- Written to `/transient/messages` or `/transient/dm/{channelId}/messages`
- TTL: 10 seconds by default
- Deleted by sender after write
- Deleted by receiver after read
- Backup cleanup by Cloud Function every minute
- Never stored centrally

### Local Storage Only
- All chat history in AsyncStorage
- User can wipe history anytime
- Nothing recoverable from server

## 🚀 Deployment

### Firebase Setup
1. Create Firebase project
2. Enable Anonymous Authentication
3. Create Firestore database
4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Deploy Cloud Functions:
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

### App Configuration
1. Update `src/config/firebase.ts` with your Firebase config
2. Set `APP_ID` constant (default: 'gossipin-v1')

### Build & Run
```bash
# Install dependencies
npm install

# Run on Android
npx react-native run-android

# Build release APK
cd android
./gradlew assembleRelease
```

## 📱 Screens & UI Flow

### Implemented
- ✅ **HomeScreen**: Shows joined groups & public discovery
- ✅ Loading & error states in App.tsx

### To Be Implemented (Structure Ready)
- ⏳ **ProfileSetupScreen**: Avatar & pseudonym selection
- ⏳ **CreateGroupScreen**: Create public/private groups with rules
- ⏳ **GroupChatScreen**: Real-time group messaging
- ⏳ **DMChatScreen**: 1:1 direct messaging
- ⏳ **InviteScreen**: Generate invite links (ephemeral phone number)
- ⏳ **SettingsScreen**: Wipe history, change avatar
- ⏳ **VoiceRoomScreen**: WebRTC P2P voice

## 🎨 Features

### Stickers
Preset gossip stickers in `src/constants/stickers.ts`:
- WOW 🤯, Really? 🤨, LOL 😂, FR 🫡, TBH 😶, OMG 😱
- Fire 🔥, Tea 🍵, Dead 💀, Eyes 👀, Cap 🧢, Clown 🤡

### Avatars
100+ emoji avatars in `src/constants/avatars.ts`

### Moderation Roles
- **Creator**: Define rules, assign moderators, approve joins
- **Moderator**: Invite members, approve joins
- **Member**: Send messages, participate

## 🔧 Services API

### AuthService
```typescript
await AuthService.signInAnonymous();
await AuthService.updateProfile({ avatar: '😎', displayName: 'CoolUser' });
const anonId = AuthService.getCurrentAnonId();
await AuthService.signOut();
```

### TransientMessagingService
```typescript
await TransientMessagingService.sendMessage(groupId, 'text', 'Hello!');

const unsubscribe = TransientMessagingService.listenToMessages(
  groupId,
  (message) => console.log('New message:', message)
);

await TransientMessagingService.markAsRead(groupId, messageId);
```

### GroupService
```typescript
const group = await GroupService.createGroup('My Group', 'public', 'Be nice!', 'T&C here');
await GroupService.joinGroup(groupId);
const groups = await GroupService.getPublicGroups();
await GroupService.leaveGroup(groupId);
```

### MediaService
```typescript
const base64Image = await MediaService.pickImage();
const base64Photo = await MediaService.takePhoto();
const sizeMB = MediaService.estimateSize(base64Image);
const isOk = MediaService.isAcceptableSize(base64Image, 5);
```

## 📝 TODO: Remaining Features

1. **WebRTC Voice**
   - Implement WebRTC signaling using `/transient/voice_sessions`
   - P2P audio for group voice rooms
   - 1:1 voice calls

2. **Complete UI Screens**
   - GroupChatScreen with message list
   - DMChatScreen for direct messages
   - CreateGroupScreen form
   - SettingsScreen for preferences

3. **Invite Flow**
   - In-memory phone number entry
   - Generate invite token
   - Share via OS share sheet
   - Immediately discard number

4. **Notifications**
   - Firebase Cloud Messaging
   - New message notifications
   - Group invites

5. **Additional Features**
   - Message reactions
   - Typing indicators
   - Read receipts
   - Group discovery filters

## 📦 Dependencies

### Core
- `firebase`: Backend services
- `@react-native-async-storage/async-storage`: Local storage
- `react-native-get-random-values`: UUID generation
- `uuid`: UUID library

### UI (To Install)
- `expo`: Framework enhancements
- `expo-image-picker`: Media selection
- `expo-file-system`: File operations
- `react-native-paper`: UI components

### Voice (Future)
- `react-native-webrtc`: WebRTC for voice

## 🎯 Achievement Summary

✅ **100% Zero-PII Architecture**
✅ **Anonymous Authentication with UUID v4**
✅ **Ephemeral Transient Messaging**
✅ **Client-Side Persistence Only**
✅ **Base64 Media Transmission**
✅ **Group Management with Moderation**
✅ **Firestore Security Rules**
✅ **Cloud Functions for Cleanup**
✅ **Type-Safe TypeScript Implementation**
✅ **Production-Ready Services**

## 🔍 Testing

1. **Auth Flow**: Test anonymous sign-in and anonId generation
2. **Groups**: Create, join, and leave groups
3. **Messaging**: Send/receive transient messages
4. **Local Storage**: Verify chat history persistence
5. **TTL Cleanup**: Confirm messages auto-delete after 10s
6. **Media**: Test Base64 image transmission

## 📄 License

MIT License - See LICENSE file

## 👥 Contributors

Built with ❤️ for privacy-conscious gossipers everywhere.

---

**GossipIn** - Where secrets are safe because nothing is saved. 🤐

