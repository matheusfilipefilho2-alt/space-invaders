package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/yourusername/space-invaders/internal/domain/entity"
	"github.com/yourusername/space-invaders/internal/domain/repository"
	"gorm.io/gorm"
)

var (
	ErrInsufficientGold  = errors.New("insufficient gold balance")
	ErrInvalidAmount     = errors.New("invalid conversion amount")
	ErrConversionNotFound = errors.New("conversion not found")
)

const (
	// SPACE has 9 decimals (like Solana's native token)
	SpaceDecimals = 9
	// 1 SPACE = 10^9 lamports
	LamportsPerSpace = 1_000_000_000
)

type ConversionService struct {
	playerRepo     repository.PlayerRepository
	treasuryRepo   repository.TreasuryRepository
	conversionRepo repository.ConversionRepository
	db             *gorm.DB
}

func NewConversionService(
	playerRepo repository.PlayerRepository,
	treasuryRepo repository.TreasuryRepository,
	conversionRepo repository.ConversionRepository,
	db *gorm.DB,
) *ConversionService {
	return &ConversionService{
		playerRepo:     playerRepo,
		treasuryRepo:   treasuryRepo,
		conversionRepo: conversionRepo,
		db:             db,
	}
}

// ConvertGoldToSpace converts Gold to SPACE tokens
// goldAmount: amount of Gold to convert
// Returns: conversion record (pending status)
func (s *ConversionService) ConvertGoldToSpace(ctx context.Context, playerID uint, goldAmount uint64) (*entity.GoldSpaceConversion, error) {
	if goldAmount == 0 {
		return nil, ErrInvalidAmount
	}

	// Get player first (outside transaction)
	player, err := s.playerRepo.FindByID(ctx, playerID)
	if err != nil {
		return nil, fmt.Errorf("failed to find player: %w", err)
	}

	// Check balance
	if player.GoldBalance < goldAmount {
		return nil, ErrInsufficientGold
	}

	// Get treasury config for conversion ratio
	config, err := s.treasuryRepo.GetConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get treasury config: %w", err)
	}

	// Calculate SPACE amount
	// Formula: SPACE = (Gold / ConversionRatio) * LamportsPerSpace
	// Example: 1000 Gold / 100 = 10 SPACE = 10,000,000,000 lamports
	spaceTokens := goldAmount / config.ConversionRatio
	spaceLamports := spaceTokens * LamportsPerSpace

	if spaceLamports == 0 {
		return nil, fmt.Errorf("%w: minimum conversion is %d Gold", ErrInvalidAmount, config.ConversionRatio)
	}

	// Start transaction for the actual updates
	var conversion *entity.GoldSpaceConversion
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deduct gold from player using tx
		err := tx.Model(&entity.Player{}).
			Where("id = ?", playerID).
			Update("gold_balance", gorm.Expr("gold_balance - ?", goldAmount)).Error
		if err != nil {
			return fmt.Errorf("failed to deduct gold: %w", err)
		}

		// Create conversion record (pending status)
		conversion = &entity.GoldSpaceConversion{
			PlayerID:     playerID,
			Type:         entity.ConversionTypeGoldToSpace,
			GoldAmount:   goldAmount,
			SpaceAmount:  spaceLamports,
			ExchangeRate: uint(config.ConversionRatio),
			Status:       entity.ConversionStatusPending,
		}

		if err := tx.Create(conversion).Error; err != nil {
			return fmt.Errorf("failed to create conversion record: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return conversion, nil
}

// GetConversion retrieves a conversion by ID
func (s *ConversionService) GetConversion(ctx context.Context, conversionID uint) (*entity.GoldSpaceConversion, error) {
	conversion, err := s.conversionRepo.FindByID(ctx, conversionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConversionNotFound
		}
		return nil, err
	}
	return conversion, nil
}

// GetPlayerConversions retrieves conversion history for a player
func (s *ConversionService) GetPlayerConversions(ctx context.Context, playerID uint, limit, offset int) ([]entity.GoldSpaceConversion, error) {
	return s.conversionRepo.ListByPlayerID(ctx, playerID, limit, offset)
}

// MarkConversionCompleted marks a conversion as completed with the transaction signature
func (s *ConversionService) MarkConversionCompleted(ctx context.Context, conversionID uint, txSignature string) error {
	conversion, err := s.conversionRepo.FindByID(ctx, conversionID)
	if err != nil {
		return err
	}

	conversion.Status = entity.ConversionStatusCompleted
	conversion.TxSignature = &txSignature
	now := gorm.DeletedAt{Valid: true}
	conversion.CompletedAt = &now.Time

	return s.conversionRepo.Update(ctx, conversion)
}

// MarkConversionFailed marks a conversion as failed and refunds the gold
func (s *ConversionService) MarkConversionFailed(ctx context.Context, conversionID uint) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Find conversion using tx
		var conversion entity.GoldSpaceConversion
		if err := tx.First(&conversion, conversionID).Error; err != nil {
			return err
		}

		// Refund gold using tx
		err := tx.Model(&entity.Player{}).
			Where("id = ?", conversion.PlayerID).
			Update("gold_balance", gorm.Expr("gold_balance + ?", conversion.GoldAmount)).Error
		if err != nil {
			return fmt.Errorf("failed to refund gold: %w", err)
		}

		// Update status using tx
		conversion.Status = entity.ConversionStatusFailed
		return tx.Save(&conversion).Error
	})
}
