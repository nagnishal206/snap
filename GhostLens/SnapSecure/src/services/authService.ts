import { storage } from '../../server/storage';
import { securityService } from './securityService';
import { blockchainService } from './blockchainService';
import bcrypt from 'bcryptjs';
import * as SecureStore from 'expo-secure-store';

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Register new user with blockchain integration
  async register(
    username: string,
    email: string,
    password: string,
    ipAddress: string = '127.0.0.1'
  ): Promise<AuthResult> {
    try {
      // Check rate limiting
      const rateLimitOk = await securityService.checkRateLimit('register', ipAddress);
      if (!rateLimitOk) {
        return { success: false, message: 'Rate limit exceeded. Please try again later.' };
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        await securityService.recordSuspiciousActivity(
          username,
          'duplicate_registration',
          'Attempted to register existing username',
          ipAddress
        );
        return { success: false, message: 'Username already exists' };
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return { success: false, message: 'Email already exists' };
      }

      // Hash password securely
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await storage.createUser({
        username,
        email,
        passwordHash,
        displayName: username,
        securityScore: 100,
        isVerified: false,
      });

      // Register user on blockchain
      const blockchainTxHash = await blockchainService.registerUserOnChain(
        newUser.id,
        { username, email, registrationTime: new Date().toISOString() }
      );

      // Set initial permissions
      await storage.updatePermission(newUser.id, 'CAMERA', false);
      await storage.updatePermission(newUser.id, 'MICROPHONE', false);
      await storage.updatePermission(newUser.id, 'GALLERY', false);

      // Generate authentication token
      const token = await this.generateAuthToken(newUser.id);

      // Store token securely
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user_id', newUser.id.toString());

      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          displayName: newUser.displayName,
          securityScore: newUser.securityScore,
        },
        token,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  // Login user with security checks
  async login(
    username: string,
    password: string,
    ipAddress: string = '127.0.0.1'
  ): Promise<AuthResult> {
    try {
      // Check if IP is blocked
      if (securityService.isIPBlocked(ipAddress)) {
        return { success: false, message: 'Access denied from this IP address' };
      }

      // Check rate limiting
      const rateLimitOk = await securityService.checkRateLimit('login', ipAddress);
      if (!rateLimitOk) {
        return { success: false, message: 'Too many login attempts. Please try again later.' };
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        await securityService.recordFailedAttempt(username, ipAddress);
        return { success: false, message: 'Invalid username or password' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        const wasBlocked = await securityService.recordFailedAttempt(username, ipAddress);
        if (wasBlocked) {
          return { success: false, message: 'Account temporarily locked due to suspicious activity' };
        }
        return { success: false, message: 'Invalid username or password' };
      }

      // Clear failed attempts on successful login
      securityService.clearFailedAttempts(username, ipAddress);

      // Check intrusion detection
      const intrusionCheck = await securityService.detectIntrusion(
        user.id,
        'login_attempt',
        { ipAddress, timestamp: Date.now() }
      );

      if (intrusionCheck.threat && intrusionCheck.action === 'block_user') {
        return { success: false, message: 'Account temporarily suspended for security reasons' };
      }

      // Update last active
      await storage.updateUser(user.id, { lastActive: new Date() });

      // Generate authentication token
      const token = await this.generateAuthToken(user.id);

      // Store token securely
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('user_id', user.id.toString());

      // Create audit trail
      await blockchainService.createAuditTrail(
        user.id,
        'user_login',
        `User ${username} logged in successfully`,
        'low'
      );

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          securityScore: user.securityScore,
        },
        token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Get current user
      const userId = await SecureStore.getItemAsync('user_id');
      
      if (userId) {
        // Create audit trail
        await blockchainService.createAuditTrail(
          parseInt(userId),
          'user_logout',
          'User logged out',
          'low'
        );
      }

      // Clear stored tokens
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_id');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userId = await SecureStore.getItemAsync('user_id');
      
      if (!token || !userId) {
        return false;
      }

      // Validate token (in production, you'd verify JWT signature)
      const isValid = await this.validateAuthToken(token, parseInt(userId));
      return isValid;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<any | null> {
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        return null;
      }

      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        securityScore: user.securityScore,
        isVerified: user.isVerified,
      };
    } catch (error) {
      console.error('Get current user failed:', error);
      return null;
    }
  }

  // Generate secure authentication token
  private async generateAuthToken(userId: number): Promise<string> {
    const tokenData = {
      userId,
      timestamp: Date.now(),
      random: Math.random().toString(36),
    };
    
    const tokenString = JSON.stringify(tokenData);
    return securityService.encryptData(tokenString);
  }

  // Validate authentication token
  private async validateAuthToken(token: string, userId: number): Promise<boolean> {
    try {
      const decryptedData = securityService.decryptData(token);
      if (!decryptedData) {
        return false;
      }

      const tokenData = JSON.parse(decryptedData);
      
      // Check if token is for the correct user
      if (tokenData.userId !== userId) {
        return false;
      }

      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - tokenData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      return tokenAge < maxAge;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  // Request permission with security checks
  async requestPermission(
    permissionType: 'CAMERA' | 'MICROPHONE' | 'GALLERY',
    reason: string
  ): Promise<{ granted: boolean; message: string }> {
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        return { granted: false, message: 'User not authenticated' };
      }

      const userIdNum = parseInt(userId);

      // Security check for permission request
      const securityCheck = await securityService.checkPermissionSecurity(
        userIdNum,
        permissionType,
        { reason, timestamp: Date.now() }
      );

      if (!securityCheck.allowed) {
        return { granted: false, message: securityCheck.reason || 'Permission denied for security reasons' };
      }

      // Update permission in database
      await storage.updatePermission(userIdNum, permissionType, true);

      // Create audit trail
      await blockchainService.createAuditTrail(
        userIdNum,
        'permission_granted',
        `${permissionType} permission granted: ${reason}`,
        'low'
      );

      return { granted: true, message: `${permissionType} permission granted` };
    } catch (error) {
      console.error('Permission request failed:', error);
      return { granted: false, message: 'Permission request failed' };
    }
  }

  // Revoke permission
  async revokePermission(permissionType: 'CAMERA' | 'MICROPHONE' | 'GALLERY'): Promise<void> {
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        return;
      }

      const userIdNum = parseInt(userId);

      // Update permission in database
      await storage.updatePermission(userIdNum, permissionType, false);

      // Create audit trail
      await blockchainService.createAuditTrail(
        userIdNum,
        'permission_revoked',
        `${permissionType} permission revoked`,
        'medium'
      );
    } catch (error) {
      console.error('Permission revocation failed:', error);
    }
  }

  // Get user permissions
  async getUserPermissions(): Promise<any[]> {
    try {
      const userId = await SecureStore.getItemAsync('user_id');
      if (!userId) {
        return [];
      }

      return await storage.getUserPermissions(parseInt(userId));
    } catch (error) {
      console.error('Get permissions failed:', error);
      return [];
    }
  }
}

export const authService = AuthService.getInstance();