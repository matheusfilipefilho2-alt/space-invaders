package database

import (
	"github.com/pkg/errors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type DBClient struct {
	ReadDB  *gorm.DB
	WriteDB *gorm.DB
}

func NewDBClient(readDSN string, writeDSN string) (*DBClient, error) {
	readDB, err := setupDatabase(readDSN)
	if err != nil {
		return nil, errors.Wrap(err, "setup read database")
	}
	writeDB, err := setupDatabase(writeDSN)
	if err != nil {
		return nil, errors.Wrap(err, "setup write database")
	}

	return &DBClient{
		ReadDB:  readDB,
		WriteDB: writeDB,
	}, nil
}

//nolint:exhaustruct
func setupDatabase(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, errors.Wrap(err, "database connect")
	}

	return db, nil
}
