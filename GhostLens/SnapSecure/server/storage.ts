import { 
  users, 
  mediaFiles, 
  messages, 
  securityLogs, 
  permissions,
  blockchainTransactions,
  type User, 
  type InsertUser,
  type MediaFile,
  type InsertMediaFile,
  type Message,
  type InsertMessage,
  type SecurityLog,
  type InsertSecurityLog,
  type Permission,
  type InsertPermission,
  type BlockchainTransaction,
  type InsertBlockchainTransaction
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, lt, gt } from "drizzle-orm";

// Storage interface for dependency injection
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Media file management
  createMediaFile(insertMediaFile: InsertMediaFile): Promise<MediaFile>;
  getMediaFile(id: string): Promise<MediaFile | undefined>;
  getUserMediaFiles(userId: number): Promise<MediaFile[]>;
  deleteMediaFile(id: string): Promise<boolean>;
  
  // Message management
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  getUserMessages(userId: number): Promise<Message[]>;
  markMessageViewed(id: string): Promise<boolean>;
  deleteExpiredMessages(): Promise<number>;
  
  // Security and permissions
  createSecurityLog(insertLog: InsertSecurityLog): Promise<SecurityLog>;
  getUserPermissions(userId: number): Promise<Permission[]>;
  updatePermission(userId: number, permissionType: string, isGranted: boolean): Promise<Permission>;
  
  // Blockchain integration
  createBlockchainTransaction(insertTx: InsertBlockchainTransaction): Promise<BlockchainTransaction>;
  getBlockchainTransaction(txHash: string): Promise<BlockchainTransaction | undefined>;
  confirmBlockchainTransaction(txHash: string, blockNumber: number): Promise<boolean>;
}

// Database storage implementation with security features
export class DatabaseStorage implements IStorage {
  
  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    // Log user creation for security audit
    await this.createSecurityLog({
      userId: user.id,
      eventType: 'user_registration',
      eventDescription: `User registered with username: ${user.username}`,
      riskLevel: 'low',
    });
    
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (user) {
      await this.createSecurityLog({
        userId: id,
        eventType: 'user_profile_update',
        eventDescription: `User profile updated`,
        riskLevel: 'low',
      });
    }
    
    return user || undefined;
  }

  // Media file management methods
  async createMediaFile(insertMediaFile: InsertMediaFile): Promise<MediaFile> {
    const [mediaFile] = await db
      .insert(mediaFiles)
      .values({
        ...insertMediaFile,
        createdAt: new Date(),
      })
      .returning();
    
    await this.createSecurityLog({
      userId: mediaFile.userId,
      eventType: 'media_file_created',
      eventDescription: `Media file created: ${mediaFile.fileName}`,
      riskLevel: 'low',
    });
    
    return mediaFile;
  }

  async getMediaFile(id: string): Promise<MediaFile | undefined> {
    const [mediaFile] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, id), eq(mediaFiles.isDeleted, false)));
    return mediaFile || undefined;
  }

  async getUserMediaFiles(userId: number): Promise<MediaFile[]> {
    return await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.userId, userId), eq(mediaFiles.isDeleted, false)))
      .orderBy(desc(mediaFiles.createdAt));
  }

  async deleteMediaFile(id: string): Promise<boolean> {
    const [updated] = await db
      .update(mediaFiles)
      .set({ isDeleted: true })
      .where(eq(mediaFiles.id, id))
      .returning();
    
    if (updated) {
      await this.createSecurityLog({
        userId: updated.userId,
        eventType: 'media_file_deleted',
        eventDescription: `Media file deleted: ${updated.fileName}`,
        riskLevel: 'low',
      });
    }
    
    return !!updated;
  }

  // Message management methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        createdAt: new Date(),
      })
      .returning();
    
    await this.createSecurityLog({
      userId: message.senderId,
      eventType: 'message_sent',
      eventDescription: `Message sent to user ${message.recipientId}`,
      riskLevel: 'low',
    });
    
    return message;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.isDeleted, false)));
    return message || undefined;
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.isDeleted, false),
          gt(messages.expiresAt, new Date())
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async markMessageViewed(id: string): Promise<boolean> {
    const [updated] = await db
      .update(messages)
      .set({
        isViewed: true,
        viewedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning();
    
    if (updated) {
      await this.createSecurityLog({
        userId: updated.recipientId,
        eventType: 'message_viewed',
        eventDescription: `Message viewed: ${id}`,
        riskLevel: 'low',
      });
    }
    
    return !!updated;
  }

  async deleteExpiredMessages(): Promise<number> {
    const expired = await db
      .update(messages)
      .set({ isDeleted: true })
      .where(lt(messages.expiresAt, new Date()))
      .returning();
    
    return expired.length;
  }

  // Security and permissions methods
  async createSecurityLog(insertLog: InsertSecurityLog): Promise<SecurityLog> {
    const [log] = await db
      .insert(securityLogs)
      .values({
        ...insertLog,
        createdAt: new Date(),
      })
      .returning();
    
    return log;
  }

  async getUserPermissions(userId: number): Promise<Permission[]> {
    return await db
      .select()
      .from(permissions)
      .where(eq(permissions.userId, userId))
      .orderBy(desc(permissions.createdAt));
  }

  async updatePermission(userId: number, permissionType: string, isGranted: boolean): Promise<Permission> {
    // Check if permission already exists
    const [existing] = await db
      .select()
      .from(permissions)
      .where(
        and(
          eq(permissions.userId, userId),
          eq(permissions.permissionType, permissionType)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(permissions)
        .set({
          isGranted,
          grantedAt: isGranted ? new Date() : null,
          revokedAt: !isGranted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, existing.id))
        .returning();
      
      await this.createSecurityLog({
        userId,
        eventType: 'permission_updated',
        eventDescription: `Permission ${permissionType} ${isGranted ? 'granted' : 'revoked'}`,
        riskLevel: isGranted ? 'low' : 'medium',
      });
      
      return updated;
    } else {
      const [newPermission] = await db
        .insert(permissions)
        .values({
          userId,
          permissionType,
          isGranted,
          grantedAt: isGranted ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      await this.createSecurityLog({
        userId,
        eventType: 'permission_created',
        eventDescription: `Permission ${permissionType} ${isGranted ? 'granted' : 'created as revoked'}`,
        riskLevel: 'low',
      });
      
      return newPermission;
    }
  }

  // Blockchain integration methods
  async createBlockchainTransaction(insertTx: InsertBlockchainTransaction): Promise<BlockchainTransaction> {
    const [transaction] = await db
      .insert(blockchainTransactions)
      .values({
        ...insertTx,
        createdAt: new Date(),
      })
      .returning();
    
    return transaction;
  }

  async getBlockchainTransaction(txHash: string): Promise<BlockchainTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(blockchainTransactions)
      .where(eq(blockchainTransactions.txHash, txHash));
    return transaction || undefined;
  }

  async getAllBlockchainTransactions(): Promise<BlockchainTransaction[]> {
    return await db
      .select()
      .from(blockchainTransactions)
      .orderBy(desc(blockchainTransactions.createdAt));
  }

  async confirmBlockchainTransaction(txHash: string, blockNumber: number): Promise<boolean> {
    const [updated] = await db
      .update(blockchainTransactions)
      .set({
        isConfirmed: true,
        blockNumber,
        confirmedAt: new Date(),
      })
      .where(eq(blockchainTransactions.txHash, txHash))
      .returning();
    
    return !!updated;
  }
}

export const storage = new DatabaseStorage();