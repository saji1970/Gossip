# Gossip - Secure Mobile Chat App

A secure, privacy-focused mobile application for iOS and Android built with React Native. This app allows users to create and join gossip groups with military-grade encryption and advanced security features.

## 🔐 Security Features

### End-to-End Encryption
- **AES-256 encryption** for all messages
- **RSA key pairs** for user authentication
- **Group-specific encryption keys** that are never stored in plaintext
- **Perfect Forward Secrecy** - messages are encrypted with unique keys

### Access Control
- **SIS Code / BRO Code** system for group access
- **Multi-approval system** - configurable number of approvals required
- **Role-based permissions** (Admin, Moderator, Member)
- **Invite-only groups** with approval workflow

### Privacy Protection
- **Screenshot protection** - blocks screenshots and screen recording
- **Auto-delete messages** - configurable message expiration
- **No message storage** on servers
- **Biometric authentication** for app access
- **Data retention policies** with automatic cleanup

### Advanced Security
- **No cleartext traffic** - all communications encrypted
- **Certificate pinning** for API communications
- **Secure key storage** using device keychain/keystore
- **Tamper detection** and anti-debugging measures

## 🚀 Features

### Group Management
- Create groups with SIS CODE or BRO CODE
- Join groups using unique codes
- Member approval system with configurable requirements
- Group settings and permissions management

### Messaging
- Real-time encrypted messaging
- Message reactions and replies
- File sharing with encryption
- Voice messages (planned)
- Message editing and deletion

### User Experience
- Modern, intuitive UI/UX
- Dark mode support
- Push notifications
- Offline message sync
- Cross-platform compatibility

## 📱 Installation

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)
- CocoaPods (for iOS dependencies)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gossip-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Android Setup**
   ```bash
   # Start Metro bundler
   npm start
   
   # Run on Android
   npm run android
   ```

5. **iOS Setup**
   ```bash
   # Run on iOS
   npm run ios
   ```

## 🔧 Configuration

### Environment Variables
Create a `.env` file with the following variables:

```env
# API Configuration
API_BASE_URL=https://your-api-domain.com
API_VERSION=v1

# Firebase Configuration (for push notifications)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_MESSAGING_SENDER_ID=your_sender_id

# Encryption Configuration
ENCRYPTION_KEY_ROTATION_DAYS=30
MAX_MESSAGE_LENGTH=1000
MAX_FILE_SIZE_MB=10

# Security Configuration
SCREENSHOT_PROTECTION=true
BIOMETRIC_AUTH=true
AUTO_LOCK_TIMEOUT_MINUTES=5
```

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication, Firestore, and Cloud Messaging
3. Download configuration files:
   - Android: `google-services.json` → `android/app/`
   - iOS: `GoogleService-Info.plist` → `ios/GossipApp/`

### Security Configuration
The app uses multiple layers of security:

1. **Network Security**
   - Certificate pinning
   - TLS 1.3 enforcement
   - No cleartext traffic allowed

2. **Data Encryption**
   - AES-256 for message encryption
   - RSA-2048 for key exchange
   - Secure key storage in device keychain

3. **Authentication**
   - Biometric authentication
   - Multi-factor authentication support
   - Session management with automatic timeout

## 🏗️ Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
│   └── common/         # Common components (Button, Input, Card)
├── screens/            # Screen components
│   ├── auth/          # Authentication screens
│   ├── groups/        # Group management screens
│   ├── chat/          # Chat screens
│   ├── approvals/     # Approval request screens
│   └── profile/       # User profile screens
├── services/          # Business logic services
│   ├── AuthService.ts
│   ├── GroupService.ts
│   └── MessageService.ts
├── utils/             # Utility functions
│   ├── encryption.ts
│   └── crypto.ts
├── types/             # TypeScript type definitions
└── navigation/        # Navigation configuration
```

### Security Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Secure API    │    │   Database      │
│                 │    │                 │    │                 │
│ • E2E Encryption│◄──►│ • TLS 1.3       │◄──►│ • Encrypted     │
│ • Key Management│    │ • Auth Tokens   │    │ • No Message    │
│ • Biometric Auth│    │ • Rate Limiting │    │   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Security Considerations

### Data Protection
- **No message storage** on servers - messages are only stored locally
- **Encrypted local storage** using device keychain
- **Automatic data cleanup** based on retention policies
- **Secure deletion** when messages are deleted

### Network Security
- **Certificate pinning** prevents man-in-the-middle attacks
- **Request signing** prevents replay attacks
- **Rate limiting** prevents abuse
- **No logging** of sensitive data

### Key Management
- **Unique keys** for each group
- **Key rotation** every 30 days
- **Secure key exchange** using RSA encryption
- **Key escrow** for recovery (optional)

## 🧪 Testing

### Security Testing
```bash
# Run security tests
npm run test:security

# Run encryption tests
npm run test:encryption

# Run integration tests
npm run test:integration
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Group creation with different codes
- [ ] Member approval workflow
- [ ] Message encryption/decryption
- [ ] Screenshot protection
- [ ] Biometric authentication
- [ ] Auto-delete functionality
- [ ] Cross-platform compatibility

## 🚀 Deployment

### Android
```bash
# Build release APK
npm run build:android

# Build signed bundle
cd android && ./gradlew bundleRelease
```

### iOS
```bash
# Build for App Store
npm run build:ios

# Archive for distribution
cd ios && xcodebuild -workspace GossipApp.xcworkspace -scheme GossipApp archive
```

### App Store Submission
1. **Security Review**: Ensure all security features are documented
2. **Privacy Policy**: Update privacy policy for data handling
3. **Permissions**: Justify all requested permissions
4. **Testing**: Complete thorough security testing

## 📋 Roadmap

### Phase 1 (Current)
- [x] Basic group creation and management
- [x] End-to-end encryption
- [x] Member approval system
- [x] Basic messaging

### Phase 2 (Next)
- [ ] Voice messages
- [ ] Video calls
- [ ] File sharing
- [ ] Message search

### Phase 3 (Future)
- [ ] Group video calls
- [ ] Screen sharing
- [ ] Advanced moderation tools
- [ ] Bot integration

## 🤝 Contributing

### Security Guidelines
1. **Never commit secrets** or API keys
2. **Use secure coding practices**
3. **Test all security features**
4. **Document security decisions**
5. **Follow OWASP guidelines**

### Development Setup
```bash
# Install development dependencies
npm install --dev

# Setup pre-commit hooks
npm run setup:hooks

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Security Issues
For security vulnerabilities, please email security@gossip-app.com

### General Support
- Documentation: [docs.gossip-app.com](https://docs.gossip-app.com)
- Community: [community.gossip-app.com](https://community.gossip-app.com)
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

## ⚠️ Disclaimer

This application is designed for educational and personal use. Users are responsible for complying with local laws and regulations. The developers are not responsible for any misuse of this application.

---

**Remember**: Security is only as strong as its weakest link. Always keep your app updated and follow security best practices.
