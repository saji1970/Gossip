// Firebase Auth Service - Using Firestore for persistent storage
import firestore from '@react-native-firebase/firestore';

interface User {
  uid: string;
  email: string;
  displayName: string;
  username: string;
}

interface AuthError {
  code: string;
  message: string;
}

interface StoredUser {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

class FirebaseAuthService {
  private currentUser: User | null = null;
  private users: Map<string, StoredUser> = new Map();
  private usernameMap: Map<string, string> = new Map(); // username -> email mapping
  private initialized: boolean = false;

  // Initialize with a test user and load from storage
  constructor() {
    this.initializeAsync();
  }

  private async initializeAsync() {
    if (this.initialized) return;
    
    await this.loadUsersFromStorage();
    
    // Add default test users if no users exist
    if (this.users.size === 0) {
      this.users.set('test@test.com', {
        email: 'test@test.com',
        password: 'test123',
        displayName: 'Test User',
        username: 'testuser'
      });
      this.usernameMap.set('testuser', 'test@test.com');
      await this.saveUsersToStorage();
    }
    
    this.initialized = true;
  }

  private async loadUsersFromStorage() {
    try {
      // Load users from Firestore
      const usersDoc = await firestore().collection('auth_storage').doc('users').get();
      const usernameMapDoc = await firestore().collection('auth_storage').doc('username_map').get();
      
      if (usersDoc.exists) {
        const data = usersDoc.data();
        if (data) {
          this.users = new Map(Object.entries(data));
        }
      }
      
      if (usernameMapDoc.exists) {
        const data = usernameMapDoc.data();
        if (data) {
          this.usernameMap = new Map(Object.entries(data));
        }
      }
    } catch (error) {
      console.error('Error loading users from storage:', error);
    }
  }

  private async saveUsersToStorage() {
    try {
      const usersObj = Object.fromEntries(this.users);
      const usernameMapObj = Object.fromEntries(this.usernameMap);
      
      await firestore().collection('auth_storage').doc('users').set(usersObj);
      await firestore().collection('auth_storage').doc('username_map').set(usernameMapObj);
    } catch (error) {
      console.error('Error saving users to storage:', error);
    }
  }

  async signIn(usernameOrEmail: string, password: string): Promise<User> {
    await this.initializeAsync();
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        // Check if input is username or email
        let email = usernameOrEmail.toLowerCase();
        
        // If it doesn't contain @, treat it as username
        if (!usernameOrEmail.includes('@')) {
          const mappedEmail = this.usernameMap.get(usernameOrEmail.toLowerCase());
          if (!mappedEmail) {
            reject({
              code: 'auth/user-not-found',
              message: 'No user found with this username'
            } as AuthError);
            return;
          }
          email = mappedEmail;
        }
        
        const user = this.users.get(email);
        
        if (!user) {
          reject({
            code: 'auth/user-not-found',
            message: 'No user found with this email or username'
          } as AuthError);
          return;
        }

        if (user.password !== password) {
          reject({
            code: 'auth/wrong-password',
            message: 'Incorrect password'
          } as AuthError);
          return;
        }

        this.currentUser = {
          uid: this.generateUID(email),
          email: user.email,
          displayName: user.displayName,
          username: user.username
        };

        // Save current user to storage
        await firestore().collection('app_storage').doc('current_user').set(this.currentUser);

        resolve(this.currentUser);
      }, 500);
    });
  }

  async signUp(email: string, password: string, displayName: string, username: string): Promise<User> {
    await this.initializeAsync();
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const emailLower = email.toLowerCase();
        const usernameLower = username.toLowerCase();
        
        if (this.users.has(emailLower)) {
          reject({
            code: 'auth/email-already-in-use',
            message: 'This email is already registered'
          } as AuthError);
          return;
        }

        if (this.usernameMap.has(usernameLower)) {
          reject({
            code: 'auth/username-already-in-use',
            message: 'This username is already taken'
          } as AuthError);
          return;
        }

        if (password.length < 6) {
          reject({
            code: 'auth/weak-password',
            message: 'Password must be at least 6 characters'
          } as AuthError);
          return;
        }

        // Store the new user
        this.users.set(emailLower, {
          email: emailLower,
          password,
          displayName,
          username: usernameLower
        });
        
        this.usernameMap.set(usernameLower, emailLower);
        await this.saveUsersToStorage();

        this.currentUser = {
          uid: this.generateUID(email),
          email: emailLower,
          displayName,
          username: usernameLower
        };

        // Save current user to storage
        await firestore().collection('app_storage').doc('current_user').set(this.currentUser);

        resolve(this.currentUser);
      }, 500);
    });
  }

  async signOut(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        this.currentUser = null;
        await firestore().collection('app_storage').doc('current_user').delete();
        resolve();
      }, 300);
    });
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    // Try to load from Firestore
    try {
      const userDoc = await firestore().collection('app_storage').doc('current_user').get();
      if (userDoc.exists) {
        this.currentUser = userDoc.data() as User;
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    
    return null;
  }
  
  getCurrentUserSync(): User | null {
    return this.currentUser;
  }

  async resetPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.users.has(email.toLowerCase())) {
          reject({
            code: 'auth/user-not-found',
            message: 'No user found with this email address'
          } as AuthError);
          return;
        }
        resolve();
      }, 500);
    });
  }

  private generateUID(email: string): string {
    return `user_${email.replace(/[@.]/g, '_')}_${Date.now()}`;
  }

  // Helper method to get all registered users (for testing)
  getAllUsers(): string[] {
    return Array.from(this.users.keys());
  }
}

export const firebaseAuth = new FirebaseAuthService();
export type { User, AuthError };
