package repository

import (
	"classmate-central/internal/models"
	"database/sql"
	"fmt"
	"strings"
)

type RoomRepository struct {
	db *sql.DB
}

func NewRoomRepository(db *sql.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) GetAll(companyID, branchID string) ([]models.Room, error) {
	return r.GetAllByBranches(companyID, []string{branchID})
}

// GetAllByBranches gets rooms from specified accessible branches (for branch isolation)
func (r *RoomRepository) GetAllByBranches(companyID string, branchIDs []string) ([]models.Room, error) {
	var query string
	var args []interface{}
	
	// Check if branchIDs contains companyID (fallback mode)
	hasFallback := false
	for _, bid := range branchIDs {
		if bid == companyID {
			hasFallback = true
			break
		}
	}
	
	if hasFallback && len(branchIDs) == 1 {
		// Fallback mode: don't filter by branch_id
		query = `SELECT id, name, capacity, color, status, branch_id FROM rooms WHERE company_id = $1 ORDER BY name`
		args = []interface{}{companyID}
	} else {
		// Filter by accessible branches only
		placeholders := make([]string, len(branchIDs))
		for i := range branchIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
		}
		query = fmt.Sprintf(`SELECT id, name, capacity, color, status, branch_id FROM rooms WHERE company_id = $1 AND branch_id IN (%s) ORDER BY name`, strings.Join(placeholders, ","))
		args = make([]interface{}, len(branchIDs)+1)
		args[0] = companyID
		for i, bid := range branchIDs {
			args[i+1] = bid
		}
	}
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := []models.Room{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var room models.Room
		if err := rows.Scan(&room.ID, &room.Name, &room.Capacity, &room.Color, &room.Status, &room.BranchID); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}

	return rooms, nil
}

func (r *RoomRepository) GetByID(id string, companyID string) (*models.Room, error) {
	query := `SELECT id, name, capacity, color, status FROM rooms WHERE id = $1 AND company_id = $2`
	var room models.Room
	err := r.db.QueryRow(query, id, companyID).Scan(&room.ID, &room.Name, &room.Capacity, &room.Color, &room.Status)
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *RoomRepository) Create(room *models.Room, companyID, branchID string) error {
	query := `INSERT INTO rooms (id, name, capacity, color, status, company_id, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.db.Exec(query, room.ID, room.Name, room.Capacity, room.Color, room.Status, companyID, branchID)
	return err
}

func (r *RoomRepository) Update(room *models.Room, companyID string) error {
	query := `UPDATE rooms SET name = $1, capacity = $2, color = $3, status = $4 WHERE id = $5 AND company_id = $6`
	_, err := r.db.Exec(query, room.Name, room.Capacity, room.Color, room.Status, room.ID, companyID)
	return err
}

func (r *RoomRepository) Delete(id string, companyID string) error {
	query := `DELETE FROM rooms WHERE id = $1 AND company_id = $2`
	_, err := r.db.Exec(query, id, companyID)
	return err
}
