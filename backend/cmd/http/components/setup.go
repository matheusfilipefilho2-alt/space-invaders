package components

import (
	"context"

	"github.com/braiphub/go-core/cache/redis"
	"github.com/braiphub/go-core/eventbus"
	"github.com/braiphub/go-core/hashid/hashids"
	"github.com/braiphub/go-core/log"
	"github.com/braiphub/go-core/queue"
	"github.com/yourusername/space-invaders/configs"
	"github.com/yourusername/space-invaders/database/migrations"
	"github.com/yourusername/space-invaders/internal/app/dig"
	"github.com/yourusername/space-invaders/internal/infra/database"
	"github.com/pkg/errors"
	"github.com/pressly/goose/v3"
	"gorm.io/gorm"
)

type Components struct {
	Container *dig.IoCContainer
}

var ErrUndefinedDatabaseConfig = errors.New("As strings de conexão do banco de dados não estão definidas")

func SetUp(ctx context.Context) (*Components, error) {
	if err := configs.LoadConfig(); err != nil {
		return nil, errors.Wrap(err, "load-config")
	}

	logger, err := log.NewZap(configs.GetEnv(), 1)
	if err != nil {
		return nil, errors.Wrap(err, "init logger instance")
	}

	dbClient, err := setupDatabase()
	if err != nil {
		return nil, errors.Wrap(err, "database main connect")
	}

	amqpRabbitClient, err := setupMessageQueue(ctx, logger)
	if err != nil {
		return nil, errors.Wrap(err, "message queue setup")
	}

	redisCache, err := setupRedis()
	if err != nil {
		return nil, errors.Wrap(err, "cache setup")
	}

	hashID, err := setupHashID()
	if err != nil {
		return nil, errors.Wrap(err, "hash-id setup")
	}

	bus := setupBus(logger)
	container := dig.NewIoCContainer(
		logger,
		dbClient.ReadDB,
		dbClient.WriteDB,
		amqpRabbitClient,
		redisCache,
		hashID,
		bus,
	)

	return &Components{
		Container: container,
	}, nil
}

func setupDatabase() (*database.DBClient, error) {
	cfg := configs.GetDataBaseConfig()
	if cfg.ReadDSN == "" || cfg.WriteDSN == "" {
		return nil, ErrUndefinedDatabaseConfig
	}

	dbClient, err := database.NewDBClient(cfg.ReadDSN, cfg.WriteDSN)
	if err != nil {
		return nil, errors.Wrap(err, "new db-client")
	}

	if err := migrateDatabase(dbClient.WriteDB); err != nil {
		return nil, errors.Wrap(err, "migrate database")
	}

	return dbClient, nil
}

func setupMessageQueue(ctx context.Context, logger log.LoggerI) (*queue.RabbitMQConnection, error) {
	cfg := configs.GetRabbitMQConfig()

	rabbitMQClient := queue.NewRabbitMQConnection(
		queue.Config{
			Dsn:         cfg.ConnectionString,
			ServiceName: cfg.ServiceName,
			Exchange:    cfg.ExchangeConfig.Name,
		}, queue.WithLogger(logger))
	if err := rabbitMQClient.Connect(ctx); err != nil {
		return nil, errors.Wrap(err, "rabbit-mq connect")
	}

	// prepare local environment for use
	if err := setupLocalQueuesForDevelopment(ctx, rabbitMQClient); err != nil {
		return nil, errors.Wrap(err, "setup local queues")
	}

	// prepare production ready environment
	if err := rabbitMQClient.Setup(ctx, cfg.ExchangeConfig, cfg.QueuesConfig); err != nil {
		return nil, errors.Wrap(err, "rabbit-mq setup")
	}

	return rabbitMQClient, nil
}

func setupRedis() (*redis.RedisAdapter, error) {
	cfg := configs.GetRedisConfig()

	redisSetup, err := redis.NewRedisAdapter(cfg.Host, cfg.Port, cfg.Password)
	if err != nil {
		return nil, errors.Wrap(err, "init redis adapter")
	}

	return redisSetup, nil
}

func setupLocalQueuesForDevelopment(ctx context.Context, rabbitMQClient *queue.RabbitMQConnection) error {
	if configs.GetEnv() != "local" {
		return nil
	}

	cfg := configs.GetRabbitMQConfig()

	// init other microservices exchange
	for _, queueCfg := range cfg.QueuesConfig {
		if err := rabbitMQClient.DeclareExchange(ctx, queueCfg.Exchange, cfg.ExchangeConfig.Type); err != nil {
			return errors.Wrap(err, "declare exchange")
		}
	}

	return nil
}

func setupHashID() (*hashids.HashIDsAdapter, error) {
	cfg := configs.GetHashIDConfig()

	hashID, err := hashids.New(cfg.Salt, cfg.MinLength)
	if err != nil {
		return nil, errors.Wrap(err, "init new hash-id instance")
	}

	return hashID, nil
}

func migrateDatabase(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return errors.Wrap(err, "get DB instance")
	}

	goose.SetBaseFS(migrations.Embed)

	if err := goose.SetDialect("postgres"); err != nil {
		return errors.Wrap(err, "goose set dialect")
	}

	if err := goose.Up(sqlDB, "."); err != nil {
		return errors.Wrap(err, "goose up migrations")
	}

	return nil
}

func setupBus(logger log.LoggerI) *eventbus.Bus {
	errorsHandler := func(err error) {
		// handle errors here, e.g., log them
	}

	bus := eventbus.New(
		eventbus.Config{
			PanicOnSubscribeFailed: true,
		},
		eventbus.WithLogger(logger),
		eventbus.WithErrorHandler(errorsHandler),
	)

	return bus
}
