package middleware

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/braiphub/go-core/log"
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

type HTTPError struct {
	Message       string            `example:"error message"                               json:"message"`
	InvalidFields map[string]string `example:"field: invalid value for this field message" json:"invalid_fields,omitempty"`
	RequestID     string            `example:"nPeca3Cqv9UHYJOZ3NYojBGOFLSVb9zd"            json:"request_id,omitempty"`
}

const (
	errorLogLevelWarning = "warning"
	errorLogLevelError   = "error"
)

func ErrorHandler(logger log.LoggerI) func(err error, c echo.Context) {
	return func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}

		// base vars
		var fields []any
		level := errorLogLevelError
		code := http.StatusInternalServerError
		httpErr := HTTPError{
			Message:       err.Error(),
			RequestID:     c.Response().Header().Get(echo.HeaderXRequestID),
			InvalidFields: nil,
		}

		// error decision handler
		switch {
		case errors.Is(err, sql.ErrNoRows), errors.Is(err, gorm.ErrRecordNotFound):
			level = errorLogLevelWarning
			code = http.StatusNotFound
			httpErr.Message = "record not found"

		case isValidationErr(err):
			code = http.StatusUnprocessableEntity
			httpErr.Message = "validation error"
			httpErr.InvalidFields = validateErrFields(err)
		}

		// log error
		fields = append(
			fields,
			log.Any("http_code", code),
			log.Any("httpErr", httpErr),
			log.Any("url", c.Request().URL),
		)
		switch level {
		case errorLogLevelError:
			logger.WithContext(c.Request().Context()).Error("http_error", err, fields...)
		case errorLogLevelWarning:
			fields = append(fields, log.Error(err))
			logger.WithContext(c.Request().Context()).Warn("http_error", fields...)
		}

		// return json error
		if err := c.JSON(code, httpErr); err != nil {
			logger.WithContext(c.Request().Context()).Error("write out", err, log.Any("httpErr", httpErr))
		}
	}
}

func isValidationErr(err error) bool {
	return errors.As(err, &validator.ValidationErrors{})
}

//nolint:errorlint
func validateErrFields(err error) map[string]string {
	fields := map[string]string{}

	if errCast, ok := errors.Cause(err).(validator.ValidationErrors); ok {
		for _, v := range errCast {
			_, msg, found := strings.Cut(v.Error(), "' Error:")
			if !found {
				fields[v.Field()] = v.Error()
			} else {
				fields[v.Field()] = msg
			}
		}
	}

	return fields
}
