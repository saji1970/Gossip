# GossipIn - Feature Access Guide

Quick reference guide for accessing all features in the GossipIn app.

## 🚀 Quick Start

### First Time Users
1. Open app → **Login Screen**
2. Click **"Sign Up"** → **Registration Screen**
3. Fill in details → Click **"Create Account"**
4. Login with credentials → **Main App**

### Returning Users
1. Open app → **Login Screen**
2. Enter email and password → Click **"Sign In"**
3. App automatically checks for pending invites
4. You're in!

---

## 📱 Main Navigation (Bottom Tabs)

### 1. Chats Tab
- View all your active conversations
- See recent messages
- Access chat history
- **Actions:**
  - Tap chat to open conversation
  - Send text messages
  - Send media (images, videos, files)
  - Send stickers
  - React to messages
  - Edit your messages
  - Delete messages

### 2. Groups Tab
- View all your groups
- Create new groups
- Join public groups
- **Actions:**
  - Tap **"+"** button to create group
  - Tap group card to open chat
  - Tap **"Invite"** button to invite members
  - Long press for group options

### 3. Approvals Tab
- View pending join requests
- Manage member approvals (if you're a moderator)
- **Actions:**
  - Approve requests
  - Reject requests
  - View requester details

### 4. Profile Tab
- View your profile
- Access settings
- View features
- Logout
- **Access Points:**
  - **Ephemeral Chat** → Tap "Ephemeral Chat"
  - **App Settings** → Tap "App Settings"
  - **Logout** → Scroll down, tap "Logout"

---

## 🎯 How to Access Each Feature

### Authentication Features

#### Register an Account
**Path:** Login Screen → Sign Up button
- Fill in username, email, password
- Optional: Add phone number for invites
- Optional: Add status message
- Choose avatar and gender
- Tap **"Create Account"**

#### Login
**Path:** Login Screen
- Enter email and password
- Tap **"Sign In"**

#### Update Profile
**Path:** Profile Tab → Edit Profile
- Tap on avatar to change
- Update details
- Save changes

---

### Group Features

#### Create a Group
**Path:** Groups Tab → **"+"** button
- Enter group name
- Toggle Public/Private
- Enter group rules
- Add terms & conditions (optional)
- Tap **"Create"**

#### Join a Public Group
**Path:** Groups Tab → Browse groups
- Tap group card
- Tap **"Join Group"**
- Accept rules
- You're in!

#### Invite Members to Group
**Path:** Groups Tab → Tap group → **"Invite"** button
- Enter phone number
- Tap **"Send Invite"**
- Share generated link

#### Leave a Group
**Path:** Group Chat → Settings → Leave Group
- Confirm action
- You'll be removed from group

---

### Messaging Features

#### Send Text Message
**Path:** Any Chat Screen
- Type message in text box
- Tap send button

#### Send Media (Image/Video)
**Path:** Chat Screen → Media button
- Select media from gallery
- Add caption (optional)
- Send

#### Send Sticker
**Path:** Chat Screen → Sticker button
- Browse sticker pack
- Tap sticker to send

#### Edit Message
**Path:** Chat Screen → Long press your message → Edit
- Modify text
- Save changes
- (Available within 15 minutes of sending)

#### Delete Message
**Path:** Chat Screen → Long press message → Delete
- Confirm deletion
- Message deleted for everyone

#### React to Message
**Path:** Chat Screen → Long press message → Add Reaction
- Choose emoji
- Reaction added

---

### Ephemeral Features

#### Access Ephemeral Chat
**Path:** Profile Tab → Ephemeral Chat
- View temporary groups
- Create ephemeral groups
- Messages auto-delete after 10 seconds

#### Create Ephemeral Group
**Path:** Ephemeral Home → Create Group
- Enter group name
- Set rules
- Create group
- All messages delete after 10 seconds

---

### Invite Features

#### Send Invite by Phone Number
**Path:** Groups Tab → Select Group → **"Invite"** button
1. Tap **"Invite"** on group card
2. Enter recipient's phone number (with country code)
3. Tap **"Send Invite"**
4. Share the generated link

**Invite Link Formats:**
- Custom: `gossipin://invite/{inviteId}`
- Web: `https://gossipin.app/invite/{inviteId}`

#### Accept an Invite
**Method 1: Via Deep Link**
1. Tap invite link
2. App opens automatically
3. If logged in with matching phone → Auto-joins
4. Welcome message sent to group

**Method 2: Manual Entry**
1. Open app
2. Login with phone number from invite
3. App auto-processes pending invites
4. You're added to invited groups

---

### Voice/Video Features

#### Start Group Call
**Path:** Group Chat → Call button
- Tap phone icon
- Invite members
- Start call

#### Join Ongoing Call
**Path:** Group Chat → Active call notification
- Tap **"Join Call"**
- You're in!

---

### Settings Features

#### Access App Settings
**Path:** Profile Tab → App Settings
- Clear chat history
- Manage notifications
- Data retention settings
- Cache management

#### Access Security Settings
**Path:** Profile Tab → Security & Privacy
- Biometric authentication
- Screenshot protection
- Auto-lock settings
- Notification privacy

#### Logout
**Path:** Profile Tab → Scroll down → **"Logout"** button
- Confirm logout
- Returns to login screen

#### Delete Account
**Path:** Profile Tab → Danger Zone → Delete Account
- Double confirmation required
- All data permanently deleted

---

## 🔍 Feature Matrix

| Feature | Access Path | Notes |
|---------|-------------|-------|
| Register | Login Screen → Sign Up | New users |
| Login | Login Screen → Sign In | Returning users |
| Create Group | Groups Tab → + button | Public or private |
| Join Group | Groups Tab → Browse → Join | Public groups only |
| Invite Members | Group → Invite button | By phone number |
| Send Message | Chat Screen → Type & Send | Text, media, stickers |
| Ephemeral Chat | Profile → Ephemeral Chat | Self-destructing messages |
| Voice Call | Group Chat → Call button | WebRTC-based |
| Edit Message | Long press → Edit | Within 15 min |
| Delete Message | Long press → Delete | Sender or admin |
| React to Message | Long press → React | Emoji reactions |
| Approvals | Approvals Tab | Moderators only |
| Settings | Profile → App Settings | App configuration |
| Logout | Profile → Logout | Sign out |

---

## 💡 Pro Tips

### For New Users
1. **Set up your profile completely** - Add avatar, status, and phone number
2. **Start with public groups** - Easy to join and explore
3. **Enable notifications** - Stay updated on messages
4. **Try ephemeral chat** - For ultra-private conversations

### For Group Creators
1. **Set clear rules** - Help members understand expectations
2. **Use phone invites** - Easy way to add friends
3. **Make moderators** - Distribute management work
4. **Regular cleanup** - Remove inactive members

### For Privacy-Conscious Users
1. **Use ephemeral chat** - Messages auto-delete
2. **Don't save chat history** - Turn off in settings
3. **Use pseudonym** - No need for real name
4. **Private groups only** - Control who joins

---

## 🎨 UI Navigation Shortcuts

### Swipe Gestures
- Swipe left on message → Quick actions
- Swipe right on chat → Archive (coming soon)
- Pull down → Refresh

### Long Press
- Long press message → Message options
- Long press group → Group options
- Long press avatar → Profile options

### Keyboard Shortcuts (Android)
- Enter → Send message
- Ctrl+B → Bold text (in supported fields)

---

## 🔗 Deep Link Examples

### Invite Links
```
gossipin://invite/abc123xyz
https://gossipin.app/invite/abc123xyz
```

### Group Links (Future)
```
gossipin://group/group_id_123
https://gossipin.app/group/group_id_123
```

---

## ❓ Common Questions

### How do I find my invite link?
**Answer:** Create group → Tap "Invite" → Enter phone number → Copy link

### Can I use the app without phone number?
**Answer:** Yes! Phone number is optional. Only needed for invites.

### How long do invites last?
**Answer:** 7 days from creation

### Can I join a private group without invite?
**Answer:** No. Private groups require invitation or approval.

### Where are my messages stored?
**Answer:** Locally on your device. Optionally synced to Firebase.

### Are ephemeral messages really deleted?
**Answer:** Yes! They auto-delete after 10 seconds from Firestore.

---

## 🆘 Need Help?

### Can't Login?
1. Check email/password
2. Try "Forgot Password" (coming soon)
3. Re-register if needed

### Not Receiving Invites?
1. Check phone number in profile
2. Verify invite hasn't expired
3. Try logging out and back in

### Messages Not Sending?
1. Check internet connection
2. Verify group membership
3. Check app permissions

### App Crashing?
1. Clear cache (Settings → Clear Cache)
2. Restart app
3. Reinstall if needed

---

## 📞 Support

For issues not covered here:
1. Check `TROUBLESHOOTING.md`
2. Review Firebase Console logs
3. Check device logs: `adb logcat | grep GossipIn`

---

*Happy Gossiping! 🎉*

---

*Last Updated: October 8, 2025*

