export interface User {
  id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
  lastSeen: Date;
  isVerified: boolean;
  publicKey: string;
  privateKeyEncrypted: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  code: string; // sis code or bro code
  codeType: 'sis' | 'bro';
  createdBy: string;
  createdAt: Date;
  members: GroupMember[];
  settings: GroupSettings;
  encryptionKey: string; // Encrypted group encryption key
  isActive: boolean;
}

export interface GroupMember {
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  approvedBy: string[];
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  lastActive: Date;
}

export interface GroupSettings {
  approvalRequired: boolean;
  minApprovals: number;
  maxMembers: number;
  allowInvites: boolean;
  messageRetention: number; // days
  allowFileSharing: boolean;
  allowScreenshots: boolean;
  autoDeleteMessages: boolean;
  autoDeleteAfter: number; // hours
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  encryptedContent: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  fileUrl?: string;
  fileSize?: number;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  reactions: MessageReaction[];
  replyTo?: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface ApprovalRequest {
  id: string;
  groupId: string;
  requesterId: string;
  requestedAt: Date;
  approvers: ApprovalVote[];
  status: 'pending' | 'approved' | 'rejected';
  completedAt?: Date;
  message?: string;
}

export interface ApprovalVote {
  userId: string;
  vote: 'approve' | 'reject';
  timestamp: Date;
  comment?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'group_invite' | 'approval_request' | 'new_message' | 'member_joined' | 'member_left';
  title: string;
  body: string;
  data: any;
  timestamp: Date;
  isRead: boolean;
  groupId?: string;
}

export interface EncryptionKey {
  publicKey: string;
  privateKey: string;
  keyId: string;
  createdAt: Date;
}

export interface SecuritySettings {
  biometricAuth: boolean;
  autoLock: boolean;
  autoLockTimeout: number; // minutes
  screenshotProtection: boolean;
  notificationPrivacy: boolean;
  dataRetention: number; // days
}
