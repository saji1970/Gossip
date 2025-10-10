# New Features Guide - GossipIn

This document outlines the new features that have been implemented in the GossipIn app.

## Table of Contents

1. [Username/Password Authentication](#usernamepassword-authentication)
2. [User Profile Status](#user-profile-status)
3. [Registration with Save/Cancel](#registration-with-savecancel)
4. [Group Invites by Phone Number](#group-invites-by-phone-number)
5. [Deep Linking Support](#deep-linking-support)
6. [Auto-Join from Invites](#auto-join-from-invites)

---

## Username/Password Authentication

### Overview
The app now supports traditional username/password authentication instead of anonymous authentication.

### Features
- **Registration**: Users can create an account with:
  - Username
  - Email
  - Password
  - Phone Number (optional)
  - Status message (optional)

- **Login**: Users can sign in with their email and password

### Implementation Details

#### AuthService Updates
- `register(data: RegistrationData)`: Creates a new user with Firebase Authentication
- `login(email: string, password: string)`: Authenticates user with email/password
- After registration, users are automatically signed out and must log in

#### User Flow
1. User opens app → Sees Login screen
2. User clicks "Sign Up" → Registration screen
3. After registration → Redirected to Login screen
4. User logs in → Main app interface

---

## User Profile Status

### Overview
Users can now set a status message on their profile, similar to WhatsApp or Slack.

### Features
- Optional status field (up to 100 characters)
- Status is displayed in user profile
- Status can be set during registration or updated later
- Status is synced across devices via Firestore

### Implementation Details

#### Type Changes
```typescript
export interface UserProfile {
  anonId: AnonId;
  avatar: string;
  displayName?: string;
  status?: string; // NEW
  phoneNumber?: string;
  lastActive?: number;
  createdAt: number;
}
```

#### Setting Status
- During registration in `RegisterScreen`
- In profile setup in `ProfileSetupScreen`
- Can be updated in settings (future enhancement)

---

## Registration with Save/Cancel

### Overview
The registration and profile setup screens now include both "Save" and "Cancel" buttons for better UX.

### Features
- **RegisterScreen**:
  - "Create Account" button (primary action)
  - "Cancel" button (returns to login)

- **ProfileSetupScreen**:
  - "Save Profile" button (completes setup)
  - "Cancel" button (cancels registration)

### UI Changes
- Buttons are arranged side-by-side
- Cancel button uses outline style
- Save/Create button uses primary style

---

## Group Invites by Phone Number

### Overview
Group members can now invite others to join a group using their phone number.

### Features

#### Sending Invites
1. Navigate to a group
2. Click the "Invite" button on the group card
3. Enter the phone number of the person to invite
4. System generates an invite link
5. Invite is stored in Firestore with a 7-day expiration

#### Invite Details
- **Invite Link Format**: `gossipin://invite/{inviteId}`
- **Expiration**: 7 days from creation
- **Status**: pending, accepted, or expired

### Implementation Details

#### InviteService
```typescript
// Send an invite
await InviteService.sendGroupInvite(groupId, phoneNumber);

// Get pending invites for current user
const invites = await InviteService.getPendingInvites();

// Accept an invite
await InviteService.acceptInvite(inviteId);

// Process all pending invites (called on login)
await InviteService.processPendingInvites();
```

#### InviteMembersScreen
- Standalone screen for sending invites
- Validates phone numbers
- Shows list of sent invites
- Generates shareable deep links

---

## Deep Linking Support

### Overview
The app now supports deep links for handling invites and direct navigation.

### Supported URL Schemes

#### Custom Scheme
```
gossipin://invite/{inviteId}
gossipin://group/{groupId}
```

#### Universal Links (HTTPS)
```
https://gossipin.app/invite/{inviteId}
https://gossipin.app/group/{groupId}
```

### Implementation Details

#### Android Configuration
Added intent filters to `AndroidManifest.xml`:
```xml
<!-- Deep Link Support -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="gossipin" />
</intent-filter>

<!-- Universal Links -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="gossipin.app" />
</intent-filter>
```

#### DeepLinkService
- Parses incoming deep links
- Notifies listeners of deep link actions
- Handles invite acceptance automatically

#### App Integration
Deep linking is initialized in `App.tsx`:
```typescript
useEffect(() => {
  DeepLinkService.initialize();
  const unsubscribe = DeepLinkService.addListener(handleDeepLinkAction);
  return () => unsubscribe();
}, []);
```

---

## Auto-Join from Invites

### Overview
When a user logs in or opens the app, the system automatically checks for pending invites and adds them to invited groups.

### How It Works

1. **User receives invite** via phone number
2. **User creates account** or logs in with that phone number
3. **System checks** for pending invites matching the phone number
4. **Auto-accepts** all valid invites
5. **Sends welcome message** to the group
6. **Notifies user** that they've been added to groups

### Implementation Details

#### On Login
```typescript
// In AppNavigator.tsx - initializeApp()
if (authenticated && currentUser) {
  try {
    await InviteService.processPendingInvites();
  } catch (error) {
    console.error('Error processing pending invites:', error);
  }
}
```

#### Invite Processing
```typescript
async processPendingInvites(): Promise<void> {
  const pendingInvites = await this.getPendingInvites();

  for (const invite of pendingInvites) {
    try {
      await this.acceptInvite(invite.inviteId);
    } catch (error) {
      console.error('Failed to process invite:', error);
    }
  }
}
```

#### Welcome Message
When a user joins via invite, a welcome message is automatically sent to the group:
```
"{displayName} has joined the group!"
```

---

## Database Schema Updates

### New Collections

#### invites
```typescript
{
  inviteId: string;
  groupId: string;
  groupName: string;
  inviterAnonId: AnonId;
  inviterDisplayName?: string;
  phoneNumber: string; // Normalized (digits only)
  status: 'pending' | 'accepted' | 'expired';
  createdAt: number;
  expiresAt: number; // 7 days from createdAt
}
```

### Updated Collections

#### users
Added fields:
- `status?: string` - User status message
- `phoneNumber?: string` - Phone number for invites

---

## Testing the Features

### Testing Registration
1. Open app
2. Click "Sign Up"
3. Fill in all fields including status
4. Click "Create Account"
5. Verify redirect to login screen
6. Login with credentials

### Testing Group Invites
1. Login to account A
2. Create or join a group
3. Click "Invite" button on the group
4. Enter phone number of account B
5. Copy the invite link
6. Open invite link on device B
7. If B is logged in, they should auto-join
8. If B is not registered, they should register with that phone number

### Testing Deep Links

#### Android (ADB)
```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "gossipin://invite/test_invite_123"

# Test universal link
adb shell am start -W -a android.intent.action.VIEW -d "https://gossipin.app/invite/test_invite_123"
```

#### iOS
```bash
xcrun simctl openurl booted "gossipin://invite/test_invite_123"
```

---

## Security Considerations

1. **Phone Number Privacy**: Phone numbers are normalized and stored only for invite matching
2. **Invite Expiration**: Invites expire after 7 days
3. **Authentication Required**: All invite operations require user authentication
4. **Member Verification**: Only group members can send invites
5. **Phone Number Validation**: Invites can only be accepted by users with matching phone numbers

---

## Future Enhancements

- [ ] SMS invite delivery
- [ ] Email invite support
- [ ] Invite revocation
- [ ] Batch invites
- [ ] Invite analytics
- [ ] Custom expiration times
- [ ] Profile status updates from settings
- [ ] Status emoji picker

---

## Troubleshooting

### Invites Not Working
1. Check phone number format (include country code)
2. Verify phone number in user profile matches invite
3. Check invite expiration date
4. Ensure Firestore rules allow invite operations

### Deep Links Not Opening App
1. Verify AndroidManifest.xml has intent filters
2. Check app is installed on device
3. Test with ADB command
4. Clear app data and reinstall

### Registration Errors
1. Check Firebase Authentication is enabled
2. Verify email/password provider is enabled in Firebase Console
3. Check network connectivity
4. Review error logs

---

## API Reference

### InviteService

#### sendGroupInvite(groupId: string, phoneNumber: string)
Sends an invite to join a group.

**Parameters:**
- `groupId`: The group to invite to
- `phoneNumber`: Phone number of invitee

**Returns:** `Promise<GroupInvite>`

#### getPendingInvites()
Gets all pending invites for current user.

**Returns:** `Promise<GroupInvite[]>`

#### acceptInvite(inviteId: string)
Accepts a pending invite.

**Parameters:**
- `inviteId`: The invite to accept

**Returns:** `Promise<void>`

### AuthService

#### register(data: RegistrationData)
Creates a new user account.

**Parameters:**
```typescript
{
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
  status?: string;
}
```

**Returns:** `Promise<UserProfile>`

#### login(email: string, password: string)
Authenticates user with email and password.

**Returns:** `Promise<UserProfile>`

### DeepLinkService

#### initialize()
Initializes deep link handling.

#### addListener(callback: (action: DeepLinkAction) => void)
Adds a listener for deep link events.

**Returns:** Unsubscribe function

---

## Support

For issues or questions, please:
1. Check the troubleshooting section
2. Review Firebase Console for errors
3. Check device logs
4. Contact the development team

---

*Last Updated: 2025*

