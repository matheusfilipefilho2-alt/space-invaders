package database

import (
	"context"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

type leagueRepository struct {
	db *gorm.DB
}

// NewLeagueRepository creates a new instance of LeagueRepository
func NewLeagueRepository(db *gorm.DB) repository.LeagueRepository {
	return &leagueRepository{db: db}
}

// Create creates a new league in the database
func (r *leagueRepository) Create(ctx context.Context, league *entity.League) error {
	return r.db.WithContext(ctx).Create(league).Error
}

// FindByID retrieves a league by ID
func (r *leagueRepository) FindByID(ctx context.Context, id uint) (*entity.League, error) {
	var league entity.League
	err := r.db.WithContext(ctx).
		First(&league, id).Error
	if err != nil {
		return nil, err
	}
	return &league, nil
}

// Update updates an existing league
func (r *leagueRepository) Update(ctx context.Context, league *entity.League) error {
	return r.db.WithContext(ctx).Save(league).Error
}

// Delete soft deletes a league by ID
func (r *leagueRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&entity.League{}, id).Error
}

// FindAll retrieves all leagues ordered by min points
func (r *leagueRepository) FindAll(ctx context.Context) ([]*entity.League, error) {
	var leagues []*entity.League
	err := r.db.WithContext(ctx).
		Order("min_points ASC").
		Find(&leagues).Error
	if err != nil {
		return nil, err
	}
	return leagues, nil
}

// FindByPoints finds the appropriate league for a given points value
func (r *leagueRepository) FindByPoints(ctx context.Context, points uint) (*entity.League, error) {
	var league entity.League
	err := r.db.WithContext(ctx).
		Where("min_points <= ? AND max_points >= ?", points, points).
		First(&league).Error
	if err != nil {
		return nil, err
	}
	return &league, nil
}
