package models

import "time"

// User represents authentication user
type User struct {
	ID        int       `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Teacher represents a teacher in the system
type Teacher struct {
	ID       string `json:"id" db:"id"`
	Name     string `json:"name" db:"name"`
	Subject  string `json:"subject" db:"subject"`
	Email    string `json:"email" db:"email"`
	Phone    string `json:"phone" db:"phone"`
	Status   string `json:"status" db:"status"` // active, inactive
	Avatar   string `json:"avatar,omitempty" db:"avatar"`
	Workload int    `json:"workload" db:"workload"`
}

// Student represents a student in the system
type Student struct {
	ID       string   `json:"id" db:"id"`
	Name     string   `json:"name" db:"name"`
	Age      int      `json:"age" db:"age"`
	Email    string   `json:"email" db:"email"`
	Phone    string   `json:"phone" db:"phone"`
	Subjects []string `json:"subjects"`
	GroupIds []string `json:"groupIds"`
	Avatar   string   `json:"avatar,omitempty" db:"avatar"`
}

// Lesson represents a lesson/class
type Lesson struct {
	ID         string    `json:"id" db:"id"`
	Title      string    `json:"title" db:"title"`
	TeacherID  string    `json:"teacherId" db:"teacher_id"`
	GroupID    string    `json:"groupId,omitempty" db:"group_id"`
	Subject    string    `json:"subject" db:"subject"`
	Start      time.Time `json:"start" db:"start_time"`
	End        time.Time `json:"end" db:"end_time"`
	Room       string    `json:"room" db:"room"`
	RoomID     string    `json:"roomId,omitempty" db:"room_id"`
	Status     string    `json:"status" db:"status"` // scheduled, completed, cancelled
	StudentIds []string  `json:"studentIds"`
}

// Group represents a study group
type Group struct {
	ID         string   `json:"id" db:"id"`
	Name       string   `json:"name" db:"name"`
	Subject    string   `json:"subject" db:"subject"`
	TeacherID  string   `json:"teacherId" db:"teacher_id"`
	StudentIds []string `json:"studentIds"`
	Schedule   string   `json:"schedule" db:"schedule"`
}

// Settings represents application settings
type Settings struct {
	ID         int    `json:"id" db:"id"`
	CenterName string `json:"centerName" db:"center_name"`
	Logo       string `json:"logo,omitempty" db:"logo"`
	ThemeColor string `json:"themeColor" db:"theme_color"`
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RegisterRequest represents registration data
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
	User         *User  `json:"user"`
}

// Room represents a classroom/auditorium
type Room struct {
	ID       string `json:"id" db:"id"`
	Name     string `json:"name" db:"name"`
	Capacity int    `json:"capacity" db:"capacity"`
	Color    string `json:"color" db:"color"`
	Status   string `json:"status" db:"status"` // active, inactive
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
}

// StudentBalance represents a student's financial balance
type StudentBalance struct {
	StudentID       string     `json:"studentId" db:"student_id"`
	Balance         float64    `json:"balance" db:"balance"`
	LastPaymentDate *time.Time `json:"lastPaymentDate,omitempty" db:"last_payment_date"`
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
	Description  string    `json:"description" db:"description"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

// StudentSubscription represents a subscription assigned to a student
type StudentSubscription struct {
	ID                  string     `json:"id" db:"id"`
	StudentID           string     `json:"studentId" db:"student_id"`
	SubscriptionTypeID  string     `json:"subscriptionTypeId" db:"subscription_type_id"`
	LessonsRemaining    int        `json:"lessonsRemaining" db:"lessons_remaining"`
	StartDate           time.Time  `json:"startDate" db:"start_date"`
	EndDate             *time.Time `json:"endDate,omitempty" db:"end_date"` // NULL if no expiry
	Status              string     `json:"status" db:"status"`              // active, expired, frozen
	FreezeDaysRemaining int        `json:"freezeDaysRemaining" db:"freeze_days_remaining"`
	CreatedAt           time.Time  `json:"createdAt" db:"created_at"`
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
	MarkedAt       time.Time `json:"markedAt" db:"marked_at"`
	MarkedBy       *int      `json:"markedBy,omitempty" db:"marked_by"`
}
