package controller

import (
	"net/http"

	"github.com/braiphub/go-scaffold/internal/domain/service"
	"github.com/braiphub/go-scaffold/internal/infra/anticorruption/frontend"
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
)

type ChapterController struct {
	chapterService *service.ChapterService
	validator      *validator.Validate
}

func NewChapterController(
	chapterService *service.ChapterService,
) *ChapterController {
	return &ChapterController{
		chapterService: chapterService,
		validator:      validator.New(),
	}
}

func (cc *ChapterController) Create(c echo.Context) error {
	var req frontend.CreateChapterRequestDTO

	if err := c.Bind(&req); err != nil {
		return errors.Wrap(err, "bind")
	}

	if err := cc.validator.Struct(req); err != nil {
		return errors.Wrap(err, "validate")
	}

	chapter := frontend.TranslateCreateChapterRequestDTOToNewChapterEntity(req)

	if err := cc.chapterService.Create(c.Request().Context(), &chapter); err != nil {
		return errors.Wrap(err, "create chapter")
	}

	if err := c.NoContent(http.StatusCreated); err != nil {
		return errors.Wrap(err, "write out")
	}

	return nil
}
