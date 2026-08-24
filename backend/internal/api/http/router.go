package http

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/braiphub/go-core/log"
	"github.com/yourusername/space-invaders/internal/api/http/controller"
	"github.com/yourusername/space-invaders/internal/api/http/middleware"
	"github.com/labstack/echo/v4"
	echo_middleware "github.com/labstack/echo/v4/middleware"
)

// APIServer struct manages the HTTP server.
type APIServer struct {
	router *echo.Echo
	logger log.LoggerI
}

//nolint:exhaustruct
func NewAPIServer(logger log.LoggerI) *APIServer {
	router := echo.New()
	router.HideBanner = true
	router.HidePort = true

	router.Use(echo_middleware.RequestIDWithConfig(echo_middleware.RequestIDConfig{
		Skipper:      echo_middleware.DefaultSkipper,
		Generator:    echo_middleware.DefaultRequestIDConfig.Generator,
		TargetHeader: echo.HeaderXRequestID,
	}))
	router.Use(echo_middleware.Recover())
	router.Use(echo_middleware.CORS())
	router.Use(middleware.Logger(logger))
	router.HTTPErrorHandler = middleware.ErrorHandler(logger)

	return &APIServer{
		router: router,
		logger: logger,
	}
}

// Start initiates the API server on the specified port.
func (server *APIServer) Start(port uint16) {
	if port == 0 { //
		server.logger.Fatal("Failed to start server: missing port")
	}

	//nolint:exhaustruct
	srv := &http.Server{
		Handler:      server.router,
		Addr:         fmt.Sprintf("0.0.0.0:%d", port),
		WriteTimeout: 15 * time.Second, //nolint:mnd
		ReadTimeout:  15 * time.Second, //nolint:mnd
	}

	server.logger.WithContext(context.Background()).Info(fmt.Sprintf("Starting API server on port [%d]", port))

	if err := server.router.Start(srv.Addr); err != nil {
		server.logger.WithContext(context.Background()).Fatal("Failed to start server:", log.Error(err))
	}
}

func (server *APIServer) ConfigureRoutes(
	bookController *controller.BookController,
	chapterController *controller.ChapterController,
) {
	server.router.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})

	server.router.GET("/books", bookController.Search)
	server.router.POST("/chapters", chapterController.Create)
}
