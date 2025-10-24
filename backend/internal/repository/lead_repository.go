package repository

import (
	"classmate-central/internal/models"
	"database/sql"
	"time"
)

type LeadRepository struct {
	db *sql.DB
}

func NewLeadRepository(db *sql.DB) *LeadRepository {
	return &LeadRepository{db: db}
}

func (r *LeadRepository) GetAll() ([]models.Lead, error) {
	query := `SELECT id, name, phone, email, source, status, notes, assigned_to, created_at, updated_at 
	          FROM leads ORDER BY created_at DESC`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	leads := []models.Lead{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var lead models.Lead
		var email, notes sql.NullString
		var assignedTo sql.NullInt64
		if err := rows.Scan(&lead.ID, &lead.Name, &lead.Phone, &email, &lead.Source,
			&lead.Status, &notes, &assignedTo, &lead.CreatedAt, &lead.UpdatedAt); err != nil {
			return nil, err
		}
		if email.Valid {
			lead.Email = email.String
		}
		if notes.Valid {
			lead.Notes = notes.String
		}
		if assignedTo.Valid {
			val := int(assignedTo.Int64)
			lead.AssignedTo = &val
		}
		leads = append(leads, lead)
	}

	return leads, nil
}

func (r *LeadRepository) GetByID(id string) (*models.Lead, error) {
	query := `SELECT id, name, phone, email, source, status, notes, assigned_to, created_at, updated_at 
	          FROM leads WHERE id = $1`
	var lead models.Lead
	var email, notes sql.NullString
	var assignedTo sql.NullInt64
	err := r.db.QueryRow(query, id).Scan(&lead.ID, &lead.Name, &lead.Phone, &email,
		&lead.Source, &lead.Status, &notes, &assignedTo, &lead.CreatedAt, &lead.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if email.Valid {
		lead.Email = email.String
	}
	if notes.Valid {
		lead.Notes = notes.String
	}
	if assignedTo.Valid {
		val := int(assignedTo.Int64)
		lead.AssignedTo = &val
	}
	return &lead, nil
}

func (r *LeadRepository) Create(lead *models.Lead) error {
	query := `INSERT INTO leads (id, name, phone, email, source, status, notes, assigned_to, created_at, updated_at) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	now := time.Now()
	_, err := r.db.Exec(query, lead.ID, lead.Name, lead.Phone, lead.Email, lead.Source,
		lead.Status, lead.Notes, lead.AssignedTo, now, now)
	return err
}

func (r *LeadRepository) Update(lead *models.Lead) error {
	query := `UPDATE leads SET name = $1, phone = $2, email = $3, source = $4, status = $5, 
	          notes = $6, assigned_to = $7, updated_at = $8 WHERE id = $9`
	_, err := r.db.Exec(query, lead.Name, lead.Phone, lead.Email, lead.Source, lead.Status,
		lead.Notes, lead.AssignedTo, time.Now(), lead.ID)
	return err
}

func (r *LeadRepository) Delete(id string) error {
	query := `DELETE FROM leads WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *LeadRepository) GetByStatus(status string) ([]models.Lead, error) {
	query := `SELECT id, name, phone, email, source, status, notes, assigned_to, created_at, updated_at 
	          FROM leads WHERE status = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	leads := []models.Lead{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var lead models.Lead
		var email, notes sql.NullString
		var assignedTo sql.NullInt64
		if err := rows.Scan(&lead.ID, &lead.Name, &lead.Phone, &email, &lead.Source,
			&lead.Status, &notes, &assignedTo, &lead.CreatedAt, &lead.UpdatedAt); err != nil {
			return nil, err
		}
		if email.Valid {
			lead.Email = email.String
		}
		if notes.Valid {
			lead.Notes = notes.String
		}
		if assignedTo.Valid {
			val := int(assignedTo.Int64)
			lead.AssignedTo = &val
		}
		leads = append(leads, lead)
	}

	return leads, nil
}

func (r *LeadRepository) GetBySource(source string) ([]models.Lead, error) {
	query := `SELECT id, name, phone, email, source, status, notes, assigned_to, created_at, updated_at 
	          FROM leads WHERE source = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, source)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	leads := []models.Lead{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var lead models.Lead
		var email, notes sql.NullString
		var assignedTo sql.NullInt64
		if err := rows.Scan(&lead.ID, &lead.Name, &lead.Phone, &email, &lead.Source,
			&lead.Status, &notes, &assignedTo, &lead.CreatedAt, &lead.UpdatedAt); err != nil {
			return nil, err
		}
		if email.Valid {
			lead.Email = email.String
		}
		if notes.Valid {
			lead.Notes = notes.String
		}
		if assignedTo.Valid {
			val := int(assignedTo.Int64)
			lead.AssignedTo = &val
		}
		leads = append(leads, lead)
	}

	return leads, nil
}

func (r *LeadRepository) GetConversionStats() (*models.LeadConversionStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_leads,
			COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
			COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_leads,
			COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as enrolled_leads,
			COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_leads
		FROM leads
	`
	var stats models.LeadConversionStats
	err := r.db.QueryRow(query).Scan(&stats.TotalLeads, &stats.NewLeads,
		&stats.InProgressLeads, &stats.EnrolledLeads, &stats.RejectedLeads)
	if err != nil {
		return nil, err
	}

	// Calculate conversion rate
	if stats.TotalLeads > 0 {
		stats.ConversionRate = float64(stats.EnrolledLeads) / float64(stats.TotalLeads) * 100
	}

	return &stats, nil
}

// Lead Activities
func (r *LeadRepository) GetActivities(leadID string) ([]models.LeadActivity, error) {
	query := `SELECT id, lead_id, activity_type, description, created_by, created_at 
	          FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, leadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activities := []models.LeadActivity{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var activity models.LeadActivity
		var createdBy sql.NullInt64
		if err := rows.Scan(&activity.ID, &activity.LeadID, &activity.ActivityType,
			&activity.Description, &createdBy, &activity.CreatedAt); err != nil {
			return nil, err
		}
		if createdBy.Valid {
			val := int(createdBy.Int64)
			activity.CreatedBy = &val
		}
		activities = append(activities, activity)
	}

	return activities, nil
}

func (r *LeadRepository) AddActivity(activity *models.LeadActivity) error {
	query := `INSERT INTO lead_activities (lead_id, activity_type, description, created_by, created_at) 
	          VALUES ($1, $2, $3, $4, $5) RETURNING id`
	err := r.db.QueryRow(query, activity.LeadID, activity.ActivityType, activity.Description,
		activity.CreatedBy, time.Now()).Scan(&activity.ID)
	return err
}

// Lead Tasks
func (r *LeadRepository) GetTasks(leadID string) ([]models.LeadTask, error) {
	query := `SELECT id, lead_id, title, description, due_date, status, assigned_to, created_at, completed_at 
	          FROM lead_tasks WHERE lead_id = $1 ORDER BY due_date ASC`
	rows, err := r.db.Query(query, leadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := []models.LeadTask{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var task models.LeadTask
		var description sql.NullString
		var dueDate, completedAt sql.NullTime
		var assignedTo sql.NullInt64
		if err := rows.Scan(&task.ID, &task.LeadID, &task.Title, &description, &dueDate,
			&task.Status, &assignedTo, &task.CreatedAt, &completedAt); err != nil {
			return nil, err
		}
		if description.Valid {
			task.Description = description.String
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if assignedTo.Valid {
			val := int(assignedTo.Int64)
			task.AssignedTo = &val
		}
		if completedAt.Valid {
			task.CompletedAt = &completedAt.Time
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

func (r *LeadRepository) CreateTask(task *models.LeadTask) error {
	query := `INSERT INTO lead_tasks (lead_id, title, description, due_date, status, assigned_to, created_at) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`
	err := r.db.QueryRow(query, task.LeadID, task.Title, task.Description, task.DueDate,
		task.Status, task.AssignedTo, time.Now()).Scan(&task.ID)
	return err
}

func (r *LeadRepository) UpdateTask(task *models.LeadTask) error {
	query := `UPDATE lead_tasks SET title = $1, description = $2, due_date = $3, status = $4, 
	          assigned_to = $5, completed_at = $6 WHERE id = $7`
	var completedAt *time.Time
	if task.Status == "completed" && task.CompletedAt == nil {
		now := time.Now()
		completedAt = &now
	} else {
		completedAt = task.CompletedAt
	}
	_, err := r.db.Exec(query, task.Title, task.Description, task.DueDate, task.Status,
		task.AssignedTo, completedAt, task.ID)
	return err
}
