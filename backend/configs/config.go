package configs

import (
	"embed"
	"os"
	"strings"

	"github.com/braiphub/go-core/queue"
	"github.com/pkg/errors"
	"github.com/spf13/viper"
)

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
