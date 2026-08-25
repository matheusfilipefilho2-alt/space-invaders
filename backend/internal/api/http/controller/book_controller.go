package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"github.com/yourusername/space-invaders/internal/domain/service"
	"github.com/yourusername/space-invaders/internal/infra/anticorruption/frontend"
)

type BookController struct {
	bookService *service.BookService
}

func NewBookController(
	bookService *service.BookService,
) *BookController {
	return &BookController{
		bookService: bookService,
	}
}

func (bc *BookController) Search(c echo.Context) error {
	var searchParams frontend.SearchBookRequestDTO

	if err := c.Bind(&searchParams); err != nil {
		return errors.Wrap(err, "bind request")
	}

	filters := frontend.SearchBookRequestToFilter(searchParams)

	response, err := bc.bookService.Search(c.Request().Context(), filters)
	if err != nil {
		return errors.Wrap(err, "search books")
	}

	responseDTO := frontend.SearchBookResponseToDTO(response)

	if err := c.JSON(http.StatusOK, responseDTO); err != nil {
		return errors.Wrap(err, "write out response")
	}

	return nil
}
