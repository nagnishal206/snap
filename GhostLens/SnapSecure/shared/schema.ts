import { relations } from 'drizzle-orm';
import { 
  pgTable, 
  text, 
  integer, 
  timestamp, 
  boolean, 
  serial,
  jsonb,
  varchar,
  uuid
} from 'drizzle-orm/pg-core';

// Users table for authentication and profile data
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 100 }),
  avatar: text('avatar'),
  isVerified: boolean('is_verified').default(false),
  publicKey: text('public_key'), // For blockchain integration
  privateKeyEncrypted: text('private_key_encrypted'), // Encrypted private key
  securityScore: integer('security_score').default(100),
  lastActive: timestamp('last_active').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Media files table for photos and videos
export const mediaFiles = pgTable('media_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(), // 'image' or 'video'
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  duration: integer('duration'), // For videos, in seconds
  metadata: jsonb('metadata'), // Camera settings, location, etc.
  encryptionKey: text('encryption_key').notNull(), // For file encryption
  hash: text('hash').notNull(), // Blockchain hash for integrity
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Messages/Snaps table for secure messaging
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  recipientId: integer('recipient_id').references(() => users.id).notNull(),
  mediaFileId: uuid('media_file_id').references(() => mediaFiles.id),
  messageType: varchar('message_type', { length: 20 }).notNull(), // 'snap', 'text', 'video'
  content: text('content'), // Encrypted message content
  viewDuration: integer('view_duration').default(10), // Seconds before auto-delete
  isViewed: boolean('is_viewed').default(false),
  viewedAt: timestamp('viewed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  encryptionKey: text('encryption_key').notNull(),
  blockchainTxHash: text('blockchain_tx_hash'), // Blockchain transaction hash
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Security logs table for tracking all security events
export const securityLogs = pgTable('security_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'login', 'permission_grant', 'file_access', etc.
  eventDescription: text('event_description').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceInfo: jsonb('device_info'),
  riskLevel: varchar('risk_level', { length: 20 }).default('low'), // 'low', 'medium', 'high', 'critical'
  blockchainHash: text('blockchain_hash'), // Hash stored on blockchain for immutability
  isAnomaly: boolean('is_anomaly').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Permissions table for tracking app permissions
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  permissionType: varchar('permission_type', { length: 50 }).notNull(), // 'CAMERA', 'MICROPHONE', 'GALLERY'
  isGranted: boolean('is_granted').notNull(),
  grantedAt: timestamp('granted_at'),
  revokedAt: timestamp('revoked_at'),
  autoRevoke: boolean('auto_revoke').default(false),
  securityContext: jsonb('security_context'), // Additional security metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Blockchain transactions table for security and integrity
export const blockchainTransactions = pgTable('blockchain_transactions', {
  id: serial('id').primaryKey(),
  txHash: text('tx_hash').notNull().unique(),
  txType: varchar('tx_type', { length: 50 }).notNull(), // 'user_registration', 'message_sent', 'security_event'
  relatedEntityId: text('related_entity_id'), // ID of related user, message, etc.
  data: jsonb('data').notNull(), // Transaction data
  blockNumber: integer('block_number'),
  gasUsed: integer('gas_used'),
  isConfirmed: boolean('is_confirmed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at'),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  mediaFiles: many(mediaFiles),
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'recipient' }),
  securityLogs: many(securityLogs),
  permissions: many(permissions),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one, many }) => ({
  user: one(users, {
    fields: [mediaFiles.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: 'recipient',
  }),
  mediaFile: one(mediaFiles, {
    fields: [messages.mediaFileId],
    references: [mediaFiles.id],
  }),
}));

export const securityLogsRelations = relations(securityLogs, ({ one }) => ({
  user: one(users, {
    fields: [securityLogs.userId],
    references: [users.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  user: one(users, {
    fields: [permissions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = typeof mediaFiles.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = typeof securityLogs.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
export type BlockchainTransaction = typeof blockchainTransactions.$inferSelect;
export type InsertBlockchainTransaction = typeof blockchainTransactions.$inferInsert;