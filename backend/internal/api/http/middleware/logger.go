package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/braiphub/go-core/log"
	"github.com/labstack/echo/v4"
)

//nolint:funlen,nonamedreturns,nakedret,cyclop
func Logger(logger log.LoggerI) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		// copied from echo handler
		return func(c echo.Context) (err error) {
			if c.Response().Committed {
				return
			}

			req := c.Request()
			res := c.Response()
			start := time.Now()
			if err = next(c); err != nil {
				c.Error(err)
			}
			stop := time.Now()

			requestID := req.Header.Get(echo.HeaderXRequestID)
			if requestID == "" {
				requestID = res.Header().Get(echo.HeaderXRequestID)
			}

			path := req.URL.Path
			if path == "" {
				path = "/"
			}

			bytesIn := req.Header.Get(echo.HeaderContentLength)
			if bytesIn == "" {
				bytesIn = "0"
			}

			statusCode := res.Status

			fields := []any{
				log.Field{Key: "request_id", Data: requestID},
				log.Field{Key: "status", Data: statusCode},
				log.Field{Key: "method", Data: req.Method},
				log.Field{Key: "path", Data: path},
				log.Field{Key: "remote_ip", Data: c.RealIP()},
				log.Field{Key: "host", Data: req.Host},
				log.Field{Key: "uri", Data: req.RequestURI},
				log.Field{Key: "route", Data: c.Path()},
				log.Field{Key: "protocol", Data: req.Proto},
				log.Field{Key: "referer", Data: req.Referer()},
				log.Field{Key: "user_agent", Data: req.UserAgent()},
				log.Field{Key: "latency", Data: strconv.FormatInt(int64(stop.Sub(start)), 10)},
				log.Field{Key: "latency_human", Data: stop.Sub(start).String()},
				log.Field{Key: "bytes_in", Data: bytesIn},
				log.Field{Key: "bytes_out", Data: strconv.FormatInt(res.Size, 10)},
			}

			if err != nil && statusCode < http.StatusInternalServerError {
				fields = append(fields, log.Error(err))
			}

			switch {
			case statusCode >= http.StatusInternalServerError:
				logger.Error("http_request", err, fields...)
			case statusCode >= http.StatusBadRequest:
				logger.Warn("http_request", fields...)
			default:
				logger.Debug("http_request", fields...)
			}

			return
		}
	}
}
