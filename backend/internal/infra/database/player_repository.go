package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type playerRepository struct {
	db *gorm.DB
}

// NewPlayerRepository creates a new instance of PlayerRepository
func NewPlayerRepository(db *gorm.DB) repository.PlayerRepository {
	return &playerRepository{db: db}
}

// Create creates a new player in the database
func (r *playerRepository) Create(ctx context.Context, player *entity.Player) error {
	return r.db.WithContext(ctx).Create(player).Error
}

// FindByID retrieves a player by ID with league preloaded
func (r *playerRepository) FindByID(ctx context.Context, id uint) (*entity.Player, error) {
	var player entity.Player
	err := r.db.WithContext(ctx).
		Preload("League").
		First(&player, id).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

// Update updates an existing player
func (r *playerRepository) Update(ctx context.Context, player *entity.Player) error {
	return r.db.WithContext(ctx).Save(player).Error
}

// Delete soft deletes a player by ID
func (r *playerRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&entity.Player{}, id).Error
}

// FindByUsername retrieves a player by username
func (r *playerRepository) FindByUsername(ctx context.Context, username string) (*entity.Player, error) {
	var player entity.Player
	err := r.db.WithContext(ctx).
		Where("username = ?", username).
		Preload("League").
		First(&player).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

// FindByEmail retrieves a player by email
func (r *playerRepository) FindByEmail(ctx context.Context, email string) (*entity.Player, error) {
	var player entity.Player
	err := r.db.WithContext(ctx).
		Where("email = ?", email).
		Preload("League").
		First(&player).Error
	if err != nil {
		return nil, err
	}
	return &player, nil
}

// FindAll retrieves all players with pagination
func (r *playerRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.Player, error) {
	var players []*entity.Player
	err := r.db.WithContext(ctx).
		Preload("League").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&players).Error
	if err != nil {
		return nil, err
	}
	return players, nil
}

// UpdateGoldBalance updates the gold balance by a delta amount
func (r *playerRepository) UpdateGoldBalance(ctx context.Context, playerID uint, delta int64) error {
	return r.db.WithContext(ctx).
		Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("gold_balance", gorm.Expr("gold_balance + ?", delta)).Error
}

// UpdateSpaceBalance updates the space token balance by a delta amount
func (r *playerRepository) UpdateSpaceBalance(ctx context.Context, playerID uint, delta int64) error {
	return r.db.WithContext(ctx).
		Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("space_balance", gorm.Expr("space_balance + ?", delta)).Error
}

// UpdateHighScore updates the high score only if the new score is higher
func (r *playerRepository) UpdateHighScore(ctx context.Context, playerID uint, newScore uint64) error {
	return r.db.WithContext(ctx).
		Model(&entity.Player{}).
		Where("id = ? AND high_score < ?", playerID, newScore).
		Update("high_score", newScore).Error
}

// IncrementTotalGames increments the total games counter by 1
func (r *playerRepository) IncrementTotalGames(ctx context.Context, playerID uint) error {
	return r.db.WithContext(ctx).
		Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("total_games", gorm.Expr("total_games + 1")).Error
}

// IncrementTotalKills increments the total kills counter
func (r *playerRepository) IncrementTotalKills(ctx context.Context, playerID uint, kills uint) error {
	return r.db.WithContext(ctx).
		Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("total_kills", gorm.Expr("total_kills + ?", kills)).Error
}

// UpdateLeague updates the player's league
func (r *playerRepository) UpdateLeague(ctx context.Context, playerID uint, leagueID uint) error {
	return r.db.WithContext(ctx).
		Model(&entity.Player{}).
		Where("id = ?", playerID).
		Update("league_id", leagueID).Error
}

// FindTopByScore retrieves top players ordered by high score (global leaderboard)
func (r *playerRepository) FindTopByScore(ctx context.Context, limit, offset int) ([]*entity.Player, error) {
	var players []*entity.Player
	err := r.db.WithContext(ctx).
		Preload("League").
		Order("high_score DESC").
		Limit(limit).
		Offset(offset).
		Find(&players).Error
	return players, err
}

// FindTopByScoreInLeague retrieves top players in a specific league
func (r *playerRepository) FindTopByScoreInLeague(ctx context.Context, leagueID uint, limit, offset int) ([]*entity.Player, error) {
	var players []*entity.Player
	err := r.db.WithContext(ctx).
		Preload("League").
		Where("league_id = ?", leagueID).
		Order("high_score DESC").
		Limit(limit).
		Offset(offset).
		Find(&players).Error
	return players, err
}
