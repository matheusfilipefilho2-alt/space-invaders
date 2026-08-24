package main

import (
	"context"
	"github.com/braiphub/go-scaffold/configs"
	"log"

	"github.com/braiphub/go-scaffold/cmd/http/components"
	"github.com/braiphub/go-scaffold/internal/api/http"
	_ "github.com/joho/godotenv/autoload"
	"github.com/pkg/errors"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	appCtx := context.Background()

	stp, err := components.SetUp(appCtx)
	if err != nil {
		return errors.Wrap(err, "components")
	}

	// domain event listeners
	stp.Container.EventHandler().StartListeners()

	// integration event consumers
	stp.Container.MsBooksAdapter().StartConsumers(appCtx)

	// api handler
	apiServer := http.NewAPIServer(stp.Container.Logger())
	apiServer.ConfigureRoutes(
		stp.Container.BookController(),
		stp.Container.ChapterController(),
	)
	apiServer.Start(configs.GetAPIPort())

	return nil
}
