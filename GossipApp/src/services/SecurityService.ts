import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { encryptionService } from '../utils/encryption';

export class SecurityService {
  private static instance: SecurityService;
  private securityChecks: Map<string, boolean> = new Map();

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async performSecurityAudit(): Promise<SecurityAuditResult> {
    const results: SecurityAuditResult = {
      isSecure: true,
      securityScore: 0,
      checks: [],
      recommendations: [],
    };

    // Check 1: Device Security
    const deviceSecurity = await this.checkDeviceSecurity();
    results.checks.push(deviceSecurity);

    // Check 2: Encryption Status
    const encryptionStatus = await this.checkEncryptionStatus();
    results.checks.push(encryptionStatus);

    // Check 3: Key Storage Security
    const keyStorage = await this.checkKeyStorageSecurity();
    results.checks.push(keyStorage);

    // Check 4: Network Security
    const networkSecurity = await this.checkNetworkSecurity();
    results.checks.push(networkSecurity);

    // Check 5: Data Protection
    const dataProtection = await this.checkDataProtection();
    results.checks.push(dataProtection);

    // Check 6: App Integrity
    const appIntegrity = await this.checkAppIntegrity();
    results.checks.push(appIntegrity);

    // Calculate overall security score
    const passedChecks = results.checks.filter(check => check.passed).length;
    const totalChecks = results.checks.length;
    results.securityScore = Math.round((passedChecks / totalChecks) * 100);
    
    results.isSecure = results.securityScore >= 80;
    
    if (!results.isSecure) {
      results.recommendations = this.generateRecommendations(results.checks);
    }

    return results;
  }

  private async checkDeviceSecurity(): Promise<SecurityCheck> {
    try {
      // Check if device has biometric authentication
      const hasBiometrics = await this.hasBiometricAuthentication();
      
      // Check if device is rooted/jailbroken
      const isDeviceSecure = await this.isDeviceSecure();
      
      // Check if developer options are disabled
      const developerOptionsDisabled = await this.areDeveloperOptionsDisabled();

      const passed = hasBiometrics && isDeviceSecure && developerOptionsDisabled;
      
      return {
        name: 'Device Security',
        description: 'Device security features and integrity',
        passed,
        details: {
          hasBiometrics,
          isDeviceSecure,
          developerOptionsDisabled,
        },
        severity: passed ? 'info' : 'warning',
      };
    } catch (error) {
      return {
        name: 'Device Security',
        description: 'Device security features and integrity',
        passed: false,
        details: { error: error.message },
        severity: 'error',
      };
    }
  }

  private async checkEncryptionStatus(): Promise<SecurityCheck> {
    try {
      // Check if encryption keys are properly generated
      const hasValidKeys = await this.hasValidEncryptionKeys();
      
      // Check if messages are being encrypted
      const encryptionWorking = await this.isEncryptionWorking();
      
      // Check key rotation status
      const keyRotationStatus = await this.getKeyRotationStatus();

      const passed = hasValidKeys && encryptionWorking && keyRotationStatus.isValid;
      
      return {
        name: 'Encryption Status',
        description: 'End-to-end encryption implementation',
        passed,
        details: {
          hasValidKeys,
          encryptionWorking,
          keyRotationStatus,
        },
        severity: passed ? 'info' : 'critical',
      };
    } catch (error) {
      return {
        name: 'Encryption Status',
        description: 'End-to-end encryption implementation',
        passed: false,
        details: { error: error.message },
        severity: 'critical',
      };
    }
  }

  private async checkKeyStorageSecurity(): Promise<SecurityCheck> {
    try {
      // Check if keys are stored in secure storage
      const keysInSecureStorage = await this.areKeysInSecureStorage();
      
      // Check if keys are properly encrypted
      const keysEncrypted = await this.areKeysEncrypted();
      
      // Check for key exposure
      const noKeyExposure = await this.checkForKeyExposure();

      const passed = keysInSecureStorage && keysEncrypted && noKeyExposure;
      
      return {
        name: 'Key Storage Security',
        description: 'Security of encryption key storage',
        passed,
        details: {
          keysInSecureStorage,
          keysEncrypted,
          noKeyExposure,
        },
        severity: passed ? 'info' : 'critical',
      };
    } catch (error) {
      return {
        name: 'Key Storage Security',
        description: 'Security of encryption key storage',
        passed: false,
        details: { error: error.message },
        severity: 'critical',
      };
    }
  }

  private async checkNetworkSecurity(): Promise<SecurityCheck> {
    try {
      // Check if all traffic is encrypted
      const allTrafficEncrypted = await this.isAllTrafficEncrypted();
      
      // Check certificate pinning
      const certificatePinningEnabled = await this.isCertificatePinningEnabled();
      
      // Check for cleartext traffic
      const noCleartextTraffic = await this.hasNoCleartextTraffic();

      const passed = allTrafficEncrypted && certificatePinningEnabled && noCleartextTraffic;
      
      return {
        name: 'Network Security',
        description: 'Network communication security',
        passed,
        details: {
          allTrafficEncrypted,
          certificatePinningEnabled,
          noCleartextTraffic,
        },
        severity: passed ? 'info' : 'warning',
      };
    } catch (error) {
      return {
        name: 'Network Security',
        description: 'Network communication security',
        passed: false,
        details: { error: error.message },
        severity: 'warning',
      };
    }
  }

  private async checkDataProtection(): Promise<SecurityCheck> {
    try {
      // Check if sensitive data is properly protected
      const sensitiveDataProtected = await this.isSensitiveDataProtected();
      
      // Check screenshot protection
      const screenshotProtectionEnabled = await this.isScreenshotProtectionEnabled();
      
      // Check data retention policies
      const dataRetentionCompliant = await this.isDataRetentionCompliant();

      const passed = sensitiveDataProtected && screenshotProtectionEnabled && dataRetentionCompliant;
      
      return {
        name: 'Data Protection',
        description: 'Data protection and privacy measures',
        passed,
        details: {
          sensitiveDataProtected,
          screenshotProtectionEnabled,
          dataRetentionCompliant,
        },
        severity: passed ? 'info' : 'warning',
      };
    } catch (error) {
      return {
        name: 'Data Protection',
        description: 'Data protection and privacy measures',
        passed: false,
        details: { error: error.message },
        severity: 'warning',
      };
    }
  }

  private async checkAppIntegrity(): Promise<SecurityCheck> {
    try {
      // Check if app is not tampered with
      const appNotTampered = await this.isAppNotTampered();
      
      // Check if debugging is disabled in production
      const debuggingDisabled = await this.isDebuggingDisabled();
      
      // Check app signature
      const validSignature = await this.hasValidSignature();

      const passed = appNotTampered && debuggingDisabled && validSignature;
      
      return {
        name: 'App Integrity',
        description: 'Application integrity and tamper detection',
        passed,
        details: {
          appNotTampered,
          debuggingDisabled,
          validSignature,
        },
        severity: passed ? 'info' : 'critical',
      };
    } catch (error) {
      return {
        name: 'App Integrity',
        description: 'Application integrity and tamper detection',
        passed: false,
        details: { error: error.message },
        severity: 'critical',
      };
    }
  }

  // Helper methods for security checks
  private async hasBiometricAuthentication(): Promise<boolean> {
    try {
      // This would check if biometric authentication is available
      // Implementation depends on the biometric library used
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async isDeviceSecure(): Promise<boolean> {
    try {
      // Check if device is rooted (Android) or jailbroken (iOS)
      // Implementation would use libraries like react-native-device-info
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async areDeveloperOptionsDisabled(): Promise<boolean> {
    try {
      // Check if developer options are disabled
      // This is platform-specific
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async hasValidEncryptionKeys(): Promise<boolean> {
    try {
      // Check if user has valid encryption keys
      const user = await AsyncStorage.getItem('user_session');
      return !!user;
    } catch {
      return false;
    }
  }

  private async isEncryptionWorking(): Promise<boolean> {
    try {
      // Test encryption/decryption
      const testMessage = 'Test encryption';
      const encrypted = await encryptionService.encryptMessage(testMessage, 'test-key');
      const decrypted = await encryptionService.decryptMessage(encrypted, 'test-key');
      return decrypted === testMessage;
    } catch {
      return false;
    }
  }

  private async getKeyRotationStatus(): Promise<{ isValid: boolean; lastRotation?: Date }> {
    try {
      // Check when keys were last rotated
      const lastRotation = await AsyncStorage.getItem('last_key_rotation');
      if (!lastRotation) {
        return { isValid: false };
      }
      
      const rotationDate = new Date(lastRotation);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      return {
        isValid: rotationDate > thirtyDaysAgo,
        lastRotation: rotationDate,
      };
    } catch {
      return { isValid: false };
    }
  }

  private async areKeysInSecureStorage(): Promise<boolean> {
    try {
      // Check if keys are stored in secure storage (keychain/keystore)
      const credentials = await Keychain.getInternetCredentials('gossip_app_user');
      return !!credentials;
    } catch {
      return false;
    }
  }

  private async areKeysEncrypted(): Promise<boolean> {
    try {
      // Check if keys are encrypted at rest
      return true; // Placeholder - would check encryption status
    } catch {
      return false;
    }
  }

  private async checkForKeyExposure(): Promise<boolean> {
    try {
      // Check for any potential key exposure
      return true; // Placeholder - would scan for exposed keys
    } catch {
      return false;
    }
  }

  private async isAllTrafficEncrypted(): Promise<boolean> {
    // This would be checked at the network level
    return true; // Placeholder
  }

  private async isCertificatePinningEnabled(): Promise<boolean> {
    // This would be configured in the network security config
    return true; // Placeholder
  }

  private async hasNoCleartextTraffic(): Promise<boolean> {
    // This would be enforced by the network security config
    return true; // Placeholder
  }

  private async isSensitiveDataProtected(): Promise<boolean> {
    try {
      // Check if sensitive data is not stored in plaintext
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async isScreenshotProtectionEnabled(): Promise<boolean> {
    // This would be implemented in the UI components
    return true; // Placeholder
  }

  private async isDataRetentionCompliant(): Promise<boolean> {
    try {
      // Check if data retention policies are being followed
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async isAppNotTampered(): Promise<boolean> {
    // This would check app signature and integrity
    return true; // Placeholder
  }

  private async isDebuggingDisabled(): Promise<boolean> {
    // This would check if debugging is disabled in production
    return __DEV__ === false; // In production, this should be false
  }

  private async hasValidSignature(): Promise<boolean> {
    // This would validate the app signature
    return true; // Placeholder
  }

  private generateRecommendations(checks: SecurityCheck[]): string[] {
    const recommendations: string[] = [];
    
    checks.forEach(check => {
      if (!check.passed) {
        switch (check.name) {
          case 'Device Security':
            recommendations.push('Enable biometric authentication and ensure device is not rooted/jailbroken');
            break;
          case 'Encryption Status':
            recommendations.push('Verify encryption is working properly and rotate keys if needed');
            break;
          case 'Key Storage Security':
            recommendations.push('Ensure encryption keys are stored securely in device keychain');
            break;
          case 'Network Security':
            recommendations.push('Enable certificate pinning and ensure all traffic is encrypted');
            break;
          case 'Data Protection':
            recommendations.push('Enable screenshot protection and review data retention policies');
            break;
          case 'App Integrity':
            recommendations.push('Verify app integrity and disable debugging in production');
            break;
        }
      }
    });
    
    return recommendations;
  }
}

interface SecurityCheck {
  name: string;
  description: string;
  passed: boolean;
  details: any;
  severity: 'info' | 'warning' | 'critical';
}

interface SecurityAuditResult {
  isSecure: boolean;
  securityScore: number;
  checks: SecurityCheck[];
  recommendations: string[];
}

export const securityService = SecurityService.getInstance();
