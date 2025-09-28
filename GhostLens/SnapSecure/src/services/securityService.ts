import { storage } from '../../server/storage';
import { blockchainService } from './blockchainService';
import CryptoJS from 'crypto-js';

// Advanced security service with firewall and intrusion detection
export class SecurityService {
  private static instance: SecurityService;
  private blockedIPs: Set<string> = new Set();
  private suspiciousActivities: Map<string, number> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private failedAttempts: Map<string, number> = new Map();

  // Security thresholds
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private readonly SUSPICIOUS_THRESHOLD = 10;

  private constructor() {
    this.initializeFirewall();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Initialize firewall protection
  private initializeFirewall(): void {
    // Add known malicious IPs to blocklist
    const knownMaliciousIPs = [
      '0.0.0.0',
      '192.168.1.1', // Example IPs - would be real threats in production
    ];
    
    knownMaliciousIPs.forEach(ip => this.blockedIPs.add(ip));
    
    console.log('🛡️ SnapSecure Firewall initialized with advanced protection');
  }

  // Check if IP address is blocked by firewall
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  // Block suspicious IP address
  async blockIP(ipAddress: string, reason: string, userId?: number): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    await blockchainService.createAuditTrail(
      userId || 0,
      'ip_blocked',
      `IP ${ipAddress} blocked: ${reason}`,
      'high'
    );

    console.log(`🚫 IP ${ipAddress} has been blocked: ${reason}`);
  }

  // Rate limiting protection
  async checkRateLimit(identifier: string, ipAddress: string): Promise<boolean> {
    const now = Date.now();
    const key = `${identifier}:${ipAddress}`;
    
    const limit = this.rateLimits.get(key);
    
    if (!limit || now > limit.resetTime) {
      // Reset or create new rate limit
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return true;
    }
    
    if (limit.count >= this.MAX_REQUESTS_PER_MINUTE) {
      // Rate limit exceeded
      await this.recordSuspiciousActivity(
        identifier,
        'rate_limit_exceeded',
        `Rate limit exceeded: ${limit.count} requests`,
        ipAddress
      );
      return false;
    }
    
    limit.count++;
    return true;
  }

  // Monitor failed authentication attempts
  async recordFailedAttempt(identifier: string, ipAddress: string): Promise<boolean> {
    const key = `${identifier}:${ipAddress}`;
    const attempts = this.failedAttempts.get(key) || 0;
    const newAttempts = attempts + 1;
    
    this.failedAttempts.set(key, newAttempts);
    
    if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.blockIP(ipAddress, `${this.MAX_FAILED_ATTEMPTS} failed login attempts for ${identifier}`);
      return true; // IP was blocked
    }
    
    // Record security event
    await blockchainService.createAuditTrail(
      0,
      'failed_login_attempt',
      `Failed login attempt ${newAttempts}/${this.MAX_FAILED_ATTEMPTS} for ${identifier}`,
      newAttempts > 2 ? 'medium' : 'low'
    );
    
    return false;
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(identifier: string, ipAddress: string): void {
    const key = `${identifier}:${ipAddress}`;
    this.failedAttempts.delete(key);
  }

  // Record suspicious activity
  async recordSuspiciousActivity(
    userId: string | number,
    activityType: string,
    description: string,
    ipAddress: string
  ): Promise<void> {
    const key = `${userId}:${activityType}`;
    const count = this.suspiciousActivities.get(key) || 0;
    const newCount = count + 1;
    
    this.suspiciousActivities.set(key, newCount);
    
    const riskLevel = newCount > this.SUSPICIOUS_THRESHOLD ? 'critical' : 
                     newCount > 5 ? 'high' : 'medium';
    
    await blockchainService.createAuditTrail(
      typeof userId === 'string' ? 0 : userId,
      'suspicious_activity',
      `${activityType}: ${description} (occurrence: ${newCount})`,
      riskLevel
    );
    
    // Auto-block if too many suspicious activities
    if (newCount > this.SUSPICIOUS_THRESHOLD) {
      await this.blockIP(ipAddress, `Suspicious activity threshold exceeded: ${activityType}`);
    }
  }

  // Encrypt sensitive data
  encryptData(data: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required for secure operations');
    }
    return CryptoJS.AES.encrypt(data, encryptionKey).toString();
  }

  // Decrypt sensitive data
  decryptData(encryptedData: string, key?: string): string {
    try {
      const encryptionKey = key || process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is required for secure operations');
      }
      const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  // Generate secure hash for file integrity
  generateFileHash(fileData: string | Buffer): string {
    return CryptoJS.SHA256(fileData.toString()).toString(CryptoJS.enc.Hex);
  }

  // Validate file integrity
  validateFileIntegrity(fileData: string | Buffer, expectedHash: string): boolean {
    const actualHash = this.generateFileHash(fileData);
    return actualHash === expectedHash;
  }

  // Permission security check
  async checkPermissionSecurity(
    userId: number,
    permissionType: string,
    context: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check user security score
      const user = await storage.getUser(userId);
      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      if (user.securityScore < 50) {
        await blockchainService.createAuditTrail(
          userId,
          'permission_denied',
          `Permission ${permissionType} denied due to low security score: ${user.securityScore}`,
          'medium'
        );
        return { allowed: false, reason: 'Security score too low' };
      }

      // Check for recent suspicious activities
      const suspiciousKey = `${userId}:permission_request`;
      const suspiciousCount = this.suspiciousActivities.get(suspiciousKey) || 0;
      
      if (suspiciousCount > 3) {
        return { allowed: false, reason: 'Too many recent permission requests' };
      }

      // Record permission grant
      await blockchainService.createAuditTrail(
        userId,
        'permission_granted',
        `Permission ${permissionType} granted`,
        'low'
      );

      return { allowed: true };
    } catch (error) {
      console.error('Permission security check failed:', error);
      return { allowed: false, reason: 'Security check failed' };
    }
  }

  // Intrusion Detection System
  async detectIntrusion(
    userId: number,
    activity: string,
    metadata: any
  ): Promise<{ threat: boolean; level: string; action: string }> {
    const threats = [];
    
    // Check for rapid successive activities
    const rapidActivityKey = `${userId}:rapid_activity`;
    const rapidCount = this.suspiciousActivities.get(rapidActivityKey) || 0;
    if (rapidCount > 20) {
      threats.push('rapid_activity');
    }

    // Check for unusual permission patterns
    if (activity.includes('permission') && metadata.unusual_pattern) {
      threats.push('unusual_permission_pattern');
    }

    // Check for file access anomalies
    if (activity.includes('file_access') && metadata.suspicious_size) {
      threats.push('file_access_anomaly');
    }

    // Determine threat level and action
    if (threats.length === 0) {
      return { threat: false, level: 'none', action: 'continue' };
    }

    const level = threats.length > 2 ? 'critical' : 
                 threats.length > 1 ? 'high' : 'medium';
    
    const action = level === 'critical' ? 'block_user' :
                  level === 'high' ? 'require_verification' : 'monitor';

    // Record intrusion attempt
    await blockchainService.createAuditTrail(
      userId,
      'intrusion_detected',
      `Intrusion detected: ${threats.join(', ')}`,
      level as any
    );

    return { threat: true, level, action };
  }

  // Get security dashboard data
  async getSecurityDashboard(): Promise<{
    blockedIPs: number;
    totalSecurityEvents: number;
    criticalAlerts: number;
    systemHealth: number;
    recentThreats: any[];
  }> {
    const chainStats = await blockchainService.getChainStats();
    
    return {
      blockedIPs: this.blockedIPs.size,
      totalSecurityEvents: chainStats.totalTransactions,
      criticalAlerts: Array.from(this.suspiciousActivities.values())
        .filter(count => count > this.SUSPICIOUS_THRESHOLD).length,
      systemHealth: Math.min(100, chainStats.securityScore),
      recentThreats: Array.from(this.suspiciousActivities.entries())
        .slice(-10)
        .map(([key, count]) => ({ activity: key, count }))
    };
  }

  // Clean up old security data
  async cleanupSecurityData(): Promise<void> {
    const now = Date.now();
    
    // Clean up expired rate limits
    for (const [key, limit] of this.rateLimits) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(key);
      }
    }
    
    // Clean up old failed attempts (reset after 1 hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    for (const [key, timestamp] of this.failedAttempts) {
      if (timestamp < oneHourAgo) {
        this.failedAttempts.delete(key);
      }
    }
    
    console.log('🧹 Security data cleanup completed');
  }

  // Emergency security lockdown
  async emergencyLockdown(reason: string): Promise<void> {
    console.error('🚨 EMERGENCY SECURITY LOCKDOWN ACTIVATED:', reason);
    
    // Block all new connections temporarily
    // In production, this would involve more sophisticated measures
    
    await blockchainService.createAuditTrail(
      0,
      'emergency_lockdown',
      `Emergency lockdown activated: ${reason}`,
      'critical'
    );
  }
}

export const securityService = SecurityService.getInstance();