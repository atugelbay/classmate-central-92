export interface Branch {
  id: string;
  name: string;
  companyId: string;
  address?: string;
  phone?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface UserBranch {
  userId: number;
  branchId: string;
  roleId?: string;
  companyId: string;
  assignedAt: string;
  assignedBy?: number;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  avatar?: string;
  workload: number; // lessons per week
}

export type StudentStatus = "active" | "inactive" | "frozen" | "graduated";

export interface Student {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
  status: StudentStatus;
  subjects: string[];
  groupIds: string[];
  avatar?: string;
}

export interface Lesson {
  id: string;
  title: string;
  teacherId: string;
  teacherName?: string; // Populated via JOIN from backend
  groupId?: string;
  groupName?: string; // Populated via JOIN from backend
  subject: string;
  start: Date;
  end: Date;
  room: string;
  roomId?: string;
  roomName?: string; // Populated via JOIN from backend
  status: "scheduled" | "completed" | "cancelled";
  studentIds: string[];
  lessonType?: "group" | "individual";
  isRecurring?: boolean;
}

export interface ConflictInfo {
  lessonId: string;
  title: string;
  start: Date;
  end: Date;
  teacherName?: string;
  roomName?: string;
  conflictType: "teacher" | "room";
}

export interface SuggestedTime {
  start: string;
  end: string;
  roomId?: string;
  roomName?: string;
}

export interface CheckConflictsRequest {
  teacherId?: string;
  roomId?: string;
  start: string;
  end: string;
  excludeLessonId?: string;
}

export interface CheckConflictsResponse {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
  suggestedTimes?: SuggestedTime[];
}

export interface BulkCreateLessonRequest {
  lessons: Omit<Lesson, 'id'>[];
}

export interface BulkCreateLessonResponse {
  created: number;
  skipped: number;
  messages?: string[];
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  teacherName?: string; // Populated via JOIN from backend
  roomId?: string;
  roomName?: string; // Populated via JOIN from backend
  studentIds: string[];
  schedule: string;
  description?: string;
  status?: "active" | "inactive";
  color?: string;
}

export interface Settings {
  centerName: string;
  logo?: string;
  themeColor: string;
  timezone?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  color: string;
  status: "active" | "inactive";
}

export type LeadSource = "call" | "website" | "social" | "referral" | "other";
export type LeadStatus = "new" | "in_progress" | "enrolled" | "rejected";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  assignedTo?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadActivityType = "call" | "meeting" | "note" | "email";

export interface LeadActivity {
  id: number;
  leadId: string;
  activityType: LeadActivityType;
  description: string;
  createdBy?: number;
  createdAt: Date;
}

export type LeadTaskStatus = "pending" | "completed";

export interface LeadTask {
  id: number;
  leadId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: LeadTaskStatus;
  assignedTo?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface LeadConversionStats {
  totalLeads: number;
  newLeads: number;
  inProgressLeads: number;
  enrolledLeads: number;
  rejectedLeads: number;
  conversionRate: number;
}

// ============= FINANCE MODULE =============

export interface PaymentTransaction {
  id: number;
  studentId: string;
  amount: number;
  type: "payment" | "refund" | "debt";
  paymentMethod: "cash" | "card" | "transfer" | "other";
  description: string;
  createdAt: string;
  createdBy?: number;
}

export interface StudentBalance {
  studentId: string;
  balance: number;
  lastPaymentDate?: string;
}

export interface Tariff {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays?: number; // null = unlimited
  lessonCount?: number; // null = unlimited
  createdAt: string;
}

export interface Discount {
  id: string;
  name: string;
  description: string;
  type: "percentage" | "fixed";
  value: number; // Percentage (0-100) or fixed amount
  isActive: boolean;
  createdAt: string;
  companyId?: string;
}

export interface StudentDiscount {
  id: number;
  studentId: string;
  discountId: string;
  appliedAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DebtRecord {
  id: number;
  studentId: string;
  amount: number;
  dueDate?: string;
  status: "pending" | "paid";
  notes: string;
  createdAt: string;
}

// ============= SUBSCRIPTION MODULE =============

export type BillingType = "per_lesson" | "monthly" | "unlimited";

export interface SubscriptionType {
  id: string;
  name: string;
  lessonsCount: number;
  validityDays?: number; // null = unlimited
  price: number;
  canFreeze: boolean;
  billingType: BillingType; // NEW: type of billing
  description: string;
  createdAt: string;
  companyId: string;
}

export interface StudentSubscription {
  id: string;
  studentId: string;
  subscriptionTypeId?: string; // Optional for custom subscriptions
  subscriptionTypeName?: string; // Added for display
  billingType?: BillingType; // NEW: type of billing for display
  groupId?: string; // Optional group assignment
  teacherId?: string; // Optional teacher assignment
  totalLessons: number; // Total lessons in subscription
  usedLessons: number; // Lessons already used
  lessonsRemaining: number; // Computed: total - used
  totalPrice: number; // Total price (can be customized)
  pricePerLesson: number; // Price per lesson
  startDate: string;
  endDate?: string; // null = no expiry
  paidTill?: string; // Paid until date
  status: "active" | "expired" | "frozen" | "completed";
  freezeDaysRemaining: number;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface SubscriptionFreeze {
  id: number;
  subscriptionId: string;
  freezeStart: string;
  freezeEnd?: string; // null = still frozen
  reason: string;
  createdAt: string;
}

export interface LessonAttendance {
  id: number;
  lessonId: string;
  studentId: string;
  subscriptionId?: string;
  status: "attended" | "missed" | "cancelled";
  reason?: string;
  notes?: string;
  markedAt: string;
  markedBy?: number;
}

// ============= STUDENT MANAGEMENT MODULE =============

export type StudentActivityType = 
  | "payment"
  | "attendance"
  | "subscription_change"
  | "status_change"
  | "note"
  | "debt_created"
  | "freeze";

export interface StudentActivityLog {
  id: number;
  studentId: string;
  activityType: StudentActivityType;
  description: string;
  metadata?: string; // JSON string
  createdBy?: number;
  createdAt: string;
}

export interface StudentNote {
  id: number;
  studentId: string;
  note: string;
  createdBy?: number;
  createdAt: string;
}

export type NotificationType = 
  | "debt_reminder"
  | "subscription_expiring"
  | "subscription_expired";

export interface Notification {
  id: number;
  studentId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AttendanceStats {
  totalLessons: number;
  attended: number;
  missed: number;
  cancelled: number;
  attendanceRate: number;
}

export interface AttendanceJournalEntry {
  attendanceId: number;
  lessonId: string;
  lessonTitle: string;
  subject: string;
  teacherName: string;
  groupName?: string;
  startTime: string;
  endTime: string;
  status: "attended" | "missed" | "cancelled";
  reason?: string;
  notes?: string;
  subscriptionId?: string;
  markedAt: string;
}

export interface StudentDetailedInfo {
  student: Student;
  balance?: StudentBalance;
  activeSubscriptions: StudentSubscription[];
  recentActivities: StudentActivityLog[];
  attendanceStats: AttendanceStats;
  unreadNotifications: number;
}

export interface MarkAttendanceRequest {
  lessonId: string;
  studentId: string;
  status: "attended" | "missed" | "cancelled";
  reason?: string;
  notes?: string;
}

// ============= UI/UX PREFERENCES =============

export type ColorThemeName = "blue" | "purple" | "green" | "orange" | "red" | "pink";
export type InterfaceSize = "compact" | "normal" | "comfortable";
export type DataDensity = "compact" | "standard" | "spacious";

export interface ColorTheme {
  name: ColorThemeName;
  label: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryForeground: string;
}

export interface UIPreferences {
  colorTheme: ColorThemeName;
  interfaceSize: InterfaceSize;
  animationsEnabled: boolean;
  dataDensity: DataDensity;
}

// ============= RBAC MODULE =============

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  companyId: string;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  userId: number;
  roleId: string;
  companyId: string;
  assignedAt: string;
  assignedBy?: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  companyId: string;
  roleId?: string;
  roles?: Role[];
  permissions?: string[];
  branches?: Branch[];
  currentBranchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface AssignRoleRequest {
  userId: number;
  roleId: string;
}

export interface InviteUserRequest {
  name: string;
  email: string;
  roleId: string;
}

export interface AcceptInviteRequest {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}