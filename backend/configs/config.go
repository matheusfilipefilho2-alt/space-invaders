package configs

import (
	"embed"
	"log"
	"os"
	"strings"

	"github.com/braiphub/go-core/queue"
	"github.com/joho/godotenv"
	"github.com/pkg/errors"
	"github.com/spf13/viper"
)

func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
}

//go:embed config.yaml
var _ embed.FS

var cfg *Conf //nolint:gochecknoglobals

func LoadConfig() error {
	viper.AddConfigPath("./configs")
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	if err := viper.ReadInConfig(); err != nil {
		return errors.Wrap(err, "viper read-in-config")
	}

	// help loading keys from .env
	for _, k := range viper.AllKeys() {
		v := viper.GetString(k)

		if strings.HasPrefix(v, "${") {
			viper.Set(k, os.ExpandEnv(v))
		}
	}

	if err := viper.Unmarshal(&cfg); err != nil {
		return errors.Wrap(err, "viper unmarshal config")
	}

	return nil
}

type Conf struct {
	Env      string         `mapstructure:"env"`
	APIPort  uint16         `mapstructure:"apiPort"`
	Database DatabaseConfig `mapstructure:"database"`
	RabbitMQ RabbitMQConfig `mapstructure:"rabbitmq"`
	Redis    RedisConfig    `mapstructure:"redis"`
	HashID   HashIDConfig   `mapstructure:"hashId"`
}

type DatabaseConfig struct {
	ReadDSN  string `mapstructure:"readReplicaDsn"`
	WriteDSN string `mapstructure:"writeReplicaDsn"`
}

type RabbitMQConfig struct {
	ConnectionString string                       `mapstructure:"connectionString"`
	ServiceName      string                       `mapstructure:"serviceName"`
	ExchangeConfig   queue.RabbitMQExchangeConfig `mapstructure:"exchange"`
	QueuesConfig     []queue.RabbitMQQueueConfig  `mapstructure:"queues"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
}

type HashIDConfig struct {
	Salt      string `mapstructure:"salt"`
	MinLength int    `mapstructure:"minLength"`
}

func GetEnv() string {
	return cfg.Env
}

func GetDataBaseConfig() DatabaseConfig {
	return cfg.Database
}

func GetRabbitMQConfig() RabbitMQConfig {
	return cfg.RabbitMQ
}

func GetRedisConfig() RedisConfig {
	return cfg.Redis
}

func GetHashIDConfig() HashIDConfig {
	return cfg.HashID
}

func GetAPIPort() uint16 {
	return cfg.APIPort
}

// New environment variable getters for Space Invaders

func GetDatabaseURL() string {
	return os.Getenv("DATABASE_URL")
}

func GetRedisURL() string {
	return os.Getenv("REDIS_URL")
}

func GetRabbitMQURL() string {
	return os.Getenv("RABBITMQ_URL")
}

func GetAPIPortFromEnv() string {
	port := os.Getenv("PORT")
	if port == "" {
		return "3000"
	}
	return port
}

func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET must be set")
	}
	return secret
}

func GetSolanaRPCURL() string {
	return os.Getenv("SOLANA_RPC_URL")
}

func GetSolanaNetwork() string {
	network := os.Getenv("SOLANA_NETWORK")
	if network == "" {
		return "devnet"
	}
	return network
}

func GetAbacatePayAPIKey() string {
	return os.Getenv("ABACATEPAY_API_KEY")
}

func GetSupabaseURL() string {
	return os.Getenv("SUPABASE_URL")
}

func GetSupabaseKey() string {
	return os.Getenv("SUPABASE_KEY")
}
