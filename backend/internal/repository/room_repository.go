package repository

import (
	"classmate-central/internal/models"
	"database/sql"
)

type RoomRepository struct {
	db *sql.DB
}

func NewRoomRepository(db *sql.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) GetAll() ([]models.Room, error) {
	query := `SELECT id, name, capacity, color, status FROM rooms ORDER BY name`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := []models.Room{} // Initialize as empty slice instead of nil
	for rows.Next() {
		var room models.Room
		if err := rows.Scan(&room.ID, &room.Name, &room.Capacity, &room.Color, &room.Status); err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}

	return rooms, nil
}

func (r *RoomRepository) GetByID(id string) (*models.Room, error) {
	query := `SELECT id, name, capacity, color, status FROM rooms WHERE id = $1`
	var room models.Room
	err := r.db.QueryRow(query, id).Scan(&room.ID, &room.Name, &room.Capacity, &room.Color, &room.Status)
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *RoomRepository) Create(room *models.Room) error {
	query := `INSERT INTO rooms (id, name, capacity, color, status) VALUES ($1, $2, $3, $4, $5)`
	_, err := r.db.Exec(query, room.ID, room.Name, room.Capacity, room.Color, room.Status)
	return err
}

func (r *RoomRepository) Update(room *models.Room) error {
	query := `UPDATE rooms SET name = $1, capacity = $2, color = $3, status = $4 WHERE id = $5`
	_, err := r.db.Exec(query, room.Name, room.Capacity, room.Color, room.Status, room.ID)
	return err
}

func (r *RoomRepository) Delete(id string) error {
	query := `DELETE FROM rooms WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
