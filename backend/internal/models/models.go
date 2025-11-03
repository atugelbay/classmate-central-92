package models

import "time"

// User represents authentication user
type User struct {
	ID        int       `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	Name      string    `json:"name" db:"name"`
	CompanyID string    `json:"companyId" db:"company_id"`
	RoleID    *string   `json:"roleId,omitempty" db:"role_id"`
	Roles     []*Role   `json:"roles,omitempty"` // Populated via JOIN
	Permissions []string `json:"permissions,omitempty"` // Populated from roles
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Company represents a company/tenant in the system
type Company struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// Teacher represents a teacher in the system
type Teacher struct {
	ID        string `json:"id" db:"id"`
	Name      string `json:"name" db:"name"`
	Subject   string `json:"subject" db:"subject"`
	Email     string `json:"email" db:"email"`
	Phone     string `json:"phone" db:"phone"`
	Status    string `json:"status" db:"status"` // active, inactive
	Avatar    string `json:"avatar,omitempty" db:"avatar"`
	Workload  int    `json:"workload" db:"workload"`
	CompanyID string `json:"companyId" db:"company_id"`
}

// Student represents a student in the system
type Student struct {
	ID        string   `json:"id" db:"id"`
	Name      string   `json:"name" db:"name"`
	Age       int      `json:"age" db:"age"`
	Email     string   `json:"email" db:"email"`
	Phone     string   `json:"phone" db:"phone"`
	Status    string   `json:"status" db:"status"` // active, inactive, frozen, graduated
	Subjects  []string `json:"subjects"`
	GroupIds  []string `json:"groupIds"`
	Avatar    string   `json:"avatar,omitempty" db:"avatar"`
	CompanyID string   `json:"companyId" db:"company_id"`
	CreatedAt string   `json:"createdAt" db:"created_at"`
}

// Lesson represents a lesson/class
type Lesson struct {
	ID         string    `json:"id" db:"id"`
	Title      string    `json:"title" db:"title"`
	TeacherID  string    `json:"teacherId" db:"teacher_id"`
	TeacherName string   `json:"teacherName,omitempty" db:"teacher_name"` // Populated via JOIN
	GroupID    string    `json:"groupId,omitempty" db:"group_id"`
	GroupName  string    `json:"groupName,omitempty" db:"group_name"` // Populated via JOIN
	Subject    string    `json:"subject" db:"subject"`
	Start      time.Time `json:"start" db:"start_time"`
	End        time.Time `json:"end" db:"end_time"`
	Room       string    `json:"room" db:"room"`
	RoomID     string    `json:"roomId,omitempty" db:"room_id"`
	RoomName   string    `json:"roomName,omitempty" db:"room_name"` // Populated via JOIN
	Status     string    `json:"status" db:"status"` // scheduled, completed, cancelled
	StudentIds []string  `json:"studentIds"`
	CompanyID  string    `json:"companyId" db:"company_id"`
}

// Group represents a study group
type Group struct {
	ID          string   `json:"id" db:"id"`
	Name        string   `json:"name" db:"name"`
	Subject     string   `json:"subject" db:"subject"`
	TeacherID   string   `json:"teacherId" db:"teacher_id"`
	TeacherName string   `json:"teacherName,omitempty" db:"teacher_name"` // Populated via JOIN
	RoomID      string   `json:"roomId" db:"room_id"`
	RoomName    string   `json:"roomName,omitempty" db:"room_name"` // Populated via JOIN
	StudentIds  []string `json:"studentIds"`
	Schedule    string   `json:"schedule" db:"schedule"`
	Description string   `json:"description" db:"description"`
	Status      string   `json:"status" db:"status"` // active, inactive
	Color       string   `json:"color" db:"color"`
	CompanyID   string   `json:"companyId" db:"company_id"`
}

// Settings represents application settings
type Settings struct {
	ID         int    `json:"id" db:"id"`
	CenterName string `json:"centerName" db:"center_name"`
	Logo       string `json:"logo,omitempty" db:"logo"`
	ThemeColor string `json:"themeColor" db:"theme_color"`
    Timezone   string `json:"timezone" db:"timezone"`
	CompanyID  string `json:"companyId" db:"company_id"`
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RegisterRequest represents registration data
type RegisterRequest struct {
	Name        string `json:"name" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	CompanyName string `json:"companyName" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
	User         *User  `json:"user"`
}

// Room represents a classroom/auditorium
type Room struct {
	ID        string `json:"id" db:"id"`
	Name      string `json:"name" db:"name"`
	Capacity  int    `json:"capacity" db:"capacity"`
	Color     string `json:"color" db:"color"`
	Status    string `json:"status" db:"status"` // active, inactive
	CompanyID string `json:"companyId" db:"company_id"`
}

// Lead represents a potential student
type Lead struct {
	ID         string    `json:"id" db:"id"`
	Name       string    `json:"name" db:"name"`
	Phone      string    `json:"phone" db:"phone"`
	Email      string    `json:"email" db:"email"`
	Source     string    `json:"source" db:"source"` // call, website, social, referral, other
	Status     string    `json:"status" db:"status"` // new, in_progress, enrolled, rejected
	Notes      string    `json:"notes" db:"notes"`
	AssignedTo *int      `json:"assignedTo,omitempty" db:"assigned_to"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt  time.Time `json:"updatedAt" db:"updated_at"`
}

// LeadActivity represents an interaction with a lead
type LeadActivity struct {
	ID           int       `json:"id" db:"id"`
	LeadID       string    `json:"leadId" db:"lead_id"`
	ActivityType string    `json:"activityType" db:"activity_type"` // call, meeting, note, email
	Description  string    `json:"description" db:"description"`
	CreatedBy    *int      `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

// LeadTask represents a follow-up task for a lead
type LeadTask struct {
	ID          int        `json:"id" db:"id"`
	LeadID      string     `json:"leadId" db:"lead_id"`
	Title       string     `json:"title" db:"title"`
	Description string     `json:"description" db:"description"`
	DueDate     *time.Time `json:"dueDate,omitempty" db:"due_date"`
	Status      string     `json:"status" db:"status"` // pending, completed
	AssignedTo  *int       `json:"assignedTo,omitempty" db:"assigned_to"`
	CreatedAt   time.Time  `json:"createdAt" db:"created_at"`
	CompletedAt *time.Time `json:"completedAt,omitempty" db:"completed_at"`
}

// LeadConversionStats represents lead conversion statistics
type LeadConversionStats struct {
	TotalLeads      int     `json:"totalLeads"`
	NewLeads        int     `json:"newLeads"`
	InProgressLeads int     `json:"inProgressLeads"`
	EnrolledLeads   int     `json:"enrolledLeads"`
	RejectedLeads   int     `json:"rejectedLeads"`
	ConversionRate  float64 `json:"conversionRate"`
}

// ============= FINANCE MODULE =============

// PaymentTransaction represents a payment transaction
type PaymentTransaction struct {
	ID            int       `json:"id" db:"id"`
	StudentID     string    `json:"studentId" db:"student_id"`
	Amount        float64   `json:"amount" db:"amount"`
	Type          string    `json:"type" db:"type"`                    // payment, refund, debt
	PaymentMethod string    `json:"paymentMethod" db:"payment_method"` // cash, card, transfer, other
	Description   string    `json:"description" db:"description"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	CreatedBy     *int      `json:"createdBy,omitempty" db:"created_by"`
	CompanyID     string    `json:"companyId" db:"company_id"`
}

// StudentBalance represents a student's financial balance
type StudentBalance struct {
	StudentID       string     `json:"studentId" db:"student_id"`
	Balance         float64    `json:"balance" db:"balance"`
	LastPaymentDate *time.Time `json:"lastPaymentDate,omitempty" db:"last_payment_date"`
	Version         int        `json:"version" db:"version"` // For optimistic locking
}

// Tariff represents a pricing plan
type Tariff struct {
	ID           string    `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Description  string    `json:"description" db:"description"`
	Price        float64   `json:"price" db:"price"`
	DurationDays *int      `json:"durationDays,omitempty" db:"duration_days"` // NULL for unlimited
	LessonCount  *int      `json:"lessonCount,omitempty" db:"lesson_count"`   // NULL for unlimited
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

// DebtRecord represents a debt record for a student
type DebtRecord struct {
	ID        int        `json:"id" db:"id"`
	StudentID string     `json:"studentId" db:"student_id"`
	Amount    float64    `json:"amount" db:"amount"`
	DueDate   *time.Time `json:"dueDate,omitempty" db:"due_date"`
	Status    string     `json:"status" db:"status"` // pending, paid
	Notes     string     `json:"notes" db:"notes"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
	CompanyID string     `json:"companyId" db:"company_id"`
}

// ============= SUBSCRIPTION MODULE =============

// SubscriptionType represents a subscription type/plan
type SubscriptionType struct {
	ID           string    `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	LessonsCount int       `json:"lessonsCount" db:"lessons_count"`
	ValidityDays *int      `json:"validityDays,omitempty" db:"validity_days"` // NULL = unlimited
	Price        float64   `json:"price" db:"price"`
	CanFreeze    bool      `json:"canFreeze" db:"can_freeze"`
	BillingType  string    `json:"billingType" db:"billing_type"` // per_lesson, monthly, unlimited
	Description  string    `json:"description" db:"description"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	CompanyID    string    `json:"companyId" db:"company_id"`
}

// StudentSubscription represents a subscription assigned to a student
type StudentSubscription struct {
	ID                   string     `json:"id" db:"id"`
	StudentID            string     `json:"studentId" db:"student_id"`
	SubscriptionTypeID   string     `json:"subscriptionTypeId,omitempty" db:"subscription_type_id"`
	SubscriptionTypeName string     `json:"subscriptionTypeName,omitempty" db:"subscription_type_name"` // Added for display
	BillingType          string     `json:"billingType,omitempty" db:"billing_type"`                    // Added for display
	GroupID              *string    `json:"groupId,omitempty" db:"group_id"`
	TeacherID            *string    `json:"teacherId,omitempty" db:"teacher_id"`
	TotalLessons         int        `json:"totalLessons" db:"total_lessons"`
	UsedLessons          int        `json:"usedLessons" db:"used_lessons"`
	LessonsRemaining     int        `json:"lessonsRemaining" db:"lessons_remaining"` // Computed field
	TotalPrice           float64    `json:"totalPrice" db:"total_price"`
	PricePerLesson       float64    `json:"pricePerLesson" db:"price_per_lesson"`
	StartDate            time.Time  `json:"startDate" db:"start_date"`
	EndDate              *time.Time `json:"endDate,omitempty" db:"end_date"` // NULL if no expiry
	PaidTill             *time.Time `json:"paidTill,omitempty" db:"paid_till"`
	Status               string     `json:"status" db:"status"` // active, expired, frozen, completed
	FreezeDaysRemaining  int        `json:"freezeDaysRemaining" db:"freeze_days_remaining"`
	CreatedAt            time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt            time.Time  `json:"updatedAt" db:"updated_at"`
	CompanyID            string     `json:"companyId" db:"company_id"`
	Version              int        `json:"version" db:"version"` // For optimistic locking
}

// SubscriptionFreeze represents a freeze period for a subscription
type SubscriptionFreeze struct {
	ID             int        `json:"id" db:"id"`
	SubscriptionID string     `json:"subscriptionId" db:"subscription_id"`
	FreezeStart    time.Time  `json:"freezeStart" db:"freeze_start"`
	FreezeEnd      *time.Time `json:"freezeEnd,omitempty" db:"freeze_end"` // NULL if still frozen
	Reason         string     `json:"reason" db:"reason"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
}

// LessonAttendance represents attendance tracking for a lesson
type LessonAttendance struct {
	ID             int       `json:"id" db:"id"`
	LessonID       string    `json:"lessonId" db:"lesson_id"`
	StudentID      string    `json:"studentId" db:"student_id"`
	SubscriptionID *string   `json:"subscriptionId,omitempty" db:"subscription_id"`
	Status         string    `json:"status" db:"status"` // attended, missed, cancelled
	Reason         string    `json:"reason,omitempty" db:"reason"`
	Notes          string    `json:"notes,omitempty" db:"notes"`
	MarkedAt       time.Time `json:"markedAt" db:"marked_at"`
	MarkedBy       *int      `json:"markedBy,omitempty" db:"marked_by"`
	CompanyID      string    `json:"companyId" db:"company_id"`
}

// ============= STUDENT MANAGEMENT MODULE =============

// StudentActivityLog represents an activity/action performed with a student
type StudentActivityLog struct {
	ID           int       `json:"id" db:"id"`
	StudentID    string    `json:"studentId" db:"student_id"`
	ActivityType string    `json:"activityType" db:"activity_type"` // payment, attendance, subscription_change, status_change, note, debt_created, freeze
	Description  string    `json:"description" db:"description"`
	Metadata     *string   `json:"metadata,omitempty" db:"metadata"` // JSON string
	CreatedBy    *int      `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

// StudentNote represents a note about a student
type StudentNote struct {
	ID        int       `json:"id" db:"id"`
	StudentID string    `json:"studentId" db:"student_id"`
	Note      string    `json:"note" db:"note"`
	CreatedBy *int      `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// Notification represents a system notification
type Notification struct {
	ID        int       `json:"id" db:"id"`
	StudentID string    `json:"studentId" db:"student_id"`
	Type      string    `json:"type" db:"type"` // debt_reminder, subscription_expiring, subscription_expired
	Message   string    `json:"message" db:"message"`
	IsRead    bool      `json:"isRead" db:"is_read"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// StudentDetailedInfo represents comprehensive student information
type StudentDetailedInfo struct {
	Student             *Student               `json:"student"`
	Balance             *StudentBalance        `json:"balance"`
	ActiveSubscriptions []*StudentSubscription `json:"activeSubscriptions"`
	RecentActivities    []*StudentActivityLog  `json:"recentActivities"`
	AttendanceStats     *AttendanceStats       `json:"attendanceStats"`
	UnreadNotifications int                    `json:"unreadNotifications"`
}

// AttendanceStats represents attendance statistics for a student
type AttendanceStats struct {
	TotalLessons   int     `json:"totalLessons"`
	Attended       int     `json:"attended"`
	Missed         int     `json:"missed"`
	Cancelled      int     `json:"cancelled"`
	AttendanceRate float64 `json:"attendanceRate"`
}

// AttendanceJournalEntry represents a detailed attendance record with lesson info
type AttendanceJournalEntry struct {
	AttendanceID   int       `json:"attendanceId" db:"id"`
	LessonID       string    `json:"lessonId" db:"lesson_id"`
	LessonTitle    string    `json:"lessonTitle" db:"lesson_title"`
	Subject        string    `json:"subject" db:"subject"`
	TeacherName    string    `json:"teacherName" db:"teacher_name"`
	GroupName      *string   `json:"groupName,omitempty" db:"group_name"`
	StartTime      time.Time `json:"startTime" db:"start_time"`
	EndTime        time.Time `json:"endTime" db:"end_time"`
	Status         string    `json:"status" db:"status"`
	Reason         *string   `json:"reason,omitempty" db:"reason"`
	Notes          *string   `json:"notes,omitempty" db:"notes"`
	SubscriptionID *string   `json:"subscriptionId,omitempty" db:"subscription_id"`
	MarkedAt       time.Time `json:"markedAt" db:"marked_at"`
}

// MarkAttendanceRequest represents a request to mark attendance
type MarkAttendanceRequest struct {
	LessonID  string `json:"lessonId" binding:"required"`
	StudentID string `json:"studentId" binding:"required"`
	Status    string `json:"status" binding:"required"` // attended, missed, cancelled
	Reason    string `json:"reason,omitempty"`
	Notes     string `json:"notes,omitempty"`
}

// ============= ENROLLMENT MODULE =============

// Enrollment represents a student's enrollment in a group
type Enrollment struct {
	ID        int64      `json:"id" db:"id"`
	StudentID string     `json:"studentId" db:"student_id"`
	GroupID   string     `json:"groupId" db:"group_id"`
	JoinedAt  time.Time  `json:"joinedAt" db:"joined_at"`
	LeftAt    *time.Time `json:"leftAt,omitempty" db:"left_at"`
	CompanyID string     `json:"companyId" db:"company_id"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
}

// IndividualEnrollment represents a student's individual enrollment with a teacher
type IndividualEnrollment struct {
	ID        int64      `json:"id" db:"id"`
	StudentID string     `json:"studentId" db:"student_id"`
	TeacherID string     `json:"teacherId" db:"teacher_id"`
	StartedAt time.Time  `json:"startedAt" db:"started_at"`
	EndedAt   *time.Time `json:"endedAt,omitempty" db:"ended_at"`
	CompanyID string     `json:"companyId" db:"company_id"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
}

// ============= SCHEDULE RULE MODULE =============

// ScheduleRule represents a recurring schedule rule (RRULE format)
type ScheduleRule struct {
	ID              int64      `json:"id" db:"id"`
	OwnerType       string     `json:"ownerType" db:"owner_type"` // 'group' or 'individual'
	OwnerID         string     `json:"ownerId" db:"owner_id"`
	RRule           string     `json:"rrule" db:"rrule"` // RFC 5545 RRULE format
	DTStart         time.Time  `json:"dtstart" db:"dtstart"`
	DTEnd            *time.Time `json:"dtend,omitempty" db:"dtend"`
	DurationMinutes int        `json:"durationMinutes" db:"duration_minutes"`
	Timezone        string     `json:"timezone" db:"timezone"`
	Location        *string    `json:"location,omitempty" db:"location"`
	CompanyID       string     `json:"companyId" db:"company_id"`
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time  `json:"updatedAt" db:"updated_at"`
}

// LessonOccurrence represents a materialized lesson generated from a schedule rule
type LessonOccurrence struct {
	ID        int64     `json:"id" db:"id"`
	RuleID    int64     `json:"ruleId" db:"rule_id"`
	StartsAt  time.Time `json:"startsAt" db:"starts_at"`
	EndsAt    time.Time `json:"endsAt" db:"ends_at"`
	Status    string    `json:"status" db:"status"` // scheduled, moved, cancelled, done
	CompanyID string    `json:"companyId" db:"company_id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// ============= SUBSCRIPTION CONSUMPTION MODULE =============

// SubscriptionConsumption represents a lesson deduction from a subscription
type SubscriptionConsumption struct {
	ID             int64     `json:"id" db:"id"`
	SubscriptionID string    `json:"subscriptionId" db:"subscription_id"`
	AttendanceID   int       `json:"attendanceId" db:"attendance_id"`
	Units          int       `json:"units" db:"units"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	CompanyID      string    `json:"companyId" db:"company_id"`
}

// ============= INVOICE MODULE =============

// Invoice represents a bill/invoice for a student
type Invoice struct {
	ID        int64      `json:"id" db:"id"`
	StudentID string     `json:"studentId" db:"student_id"`
	IssuedAt  time.Time  `json:"issuedAt" db:"issued_at"`
	DueAt     *time.Time `json:"dueAt,omitempty" db:"due_at"`
	Status    string     `json:"status" db:"status"` // unpaid, partially, paid, void
	CompanyID string     `json:"companyId" db:"company_id"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time  `json:"updatedAt" db:"updated_at"`
}

// InvoiceItem represents a line item in an invoice
type InvoiceItem struct {
	ID          int64   `json:"id" db:"id"`
	InvoiceID   int64   `json:"invoiceId" db:"invoice_id"`
	Description string  `json:"description" db:"description"`
	Quantity    int     `json:"quantity" db:"quantity"`
	UnitPrice   float64 `json:"unitPrice" db:"unit_price"`
	Meta        *string `json:"meta,omitempty" db:"meta"` // JSONB stored as string
	CompanyID   string  `json:"companyId" db:"company_id"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

// ============= TRANSACTION MODULE =============

// Transaction represents a unified financial transaction
type Transaction struct {
	ID            int64      `json:"id" db:"id"`
	PaymentID     *int       `json:"paymentId,omitempty" db:"payment_id"`
	InvoiceID     *int64     `json:"invoiceId,omitempty" db:"invoice_id"`
	SubscriptionID *string   `json:"subscriptionId,omitempty" db:"subscription_id"`
	Amount        float64    `json:"amount" db:"amount"`
	Kind          string     `json:"kind" db:"kind"` // pay_invoice, buy_subscription, refund, deduction, payment
	CreatedAt     time.Time  `json:"createdAt" db:"created_at"`
	CompanyID     string     `json:"companyId" db:"company_id"`
}

// ============= RBAC MODULE =============

// Role represents a user role
type Role struct {
	ID          string       `json:"id" db:"id"`
	Name        string       `json:"name" db:"name"`
	Description string       `json:"description" db:"description"`
	CompanyID   string       `json:"companyId" db:"company_id"`
	Permissions []*Permission `json:"permissions,omitempty"` // Populated via JOIN
	CreatedAt   time.Time    `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time    `json:"updatedAt" db:"updated_at"`
}

// Permission represents a permission/resource action
type Permission struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Resource    string    `json:"resource" db:"resource"`
	Action      string    `json:"action" db:"action"`
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
}

// UserRole represents the relationship between a user and a role
type UserRole struct {
	UserID     int       `json:"userId" db:"user_id"`
	RoleID     string    `json:"roleId" db:"role_id"`
	CompanyID  string    `json:"companyId" db:"company_id"`
	AssignedAt time.Time `json:"assignedAt" db:"assigned_at"`
	AssignedBy *int      `json:"assignedBy,omitempty" db:"assigned_by"`
}

// CreateRoleRequest represents a request to create a role
type CreateRoleRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	PermissionIDs []string `json:"permissionIds"`
}

// UpdateRoleRequest represents a request to update a role
type UpdateRoleRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	PermissionIDs []string `json:"permissionIds"`
}

// AssignRoleRequest represents a request to assign a role to a user
type AssignRoleRequest struct {
	UserID int    `json:"userId" binding:"required"`
	RoleID string `json:"roleId" binding:"required"`
}