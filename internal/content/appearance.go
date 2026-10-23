package content

import (
	"context"
	"net/url"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
	"mossline/internal/attachment"
	"mossline/internal/httpx"
)

// SiteAppearance 是前台公开的外观配置，不包含管理端信息。
type SiteAppearance struct {
	DesktopBackgroundURL string `json:"desktop_background_url"`
	MobileBackgroundURL  string `json:"mobile_background_url"`
	OverlayEnabled       bool   `json:"overlay_enabled"`
}

type SiteAppearanceInput struct {
	DesktopBackgroundURL  string `json:"desktop_background_url" maxLength:"1000"`
	MobileBackgroundURL   string `json:"mobile_background_url" maxLength:"1000"`
	OverlayEnabled        *bool  `json:"overlay_enabled"`
	AttachmentRelationKey string `json:"attachment_relation_key" required:"false" maxLength:"64"`
}

func registerAppearanceRoutes(api *apidoc.Router, handler *Handler, admin gin.HandlerFunc) {
	api.GET("/site/appearance", apidoc.Operation{Summary: "获取站点外观", Tag: "站点外观", Output: httpx.Response[SiteAppearance]{}}, handler.GetAppearance)
	api.PUT("/site/appearance", apidoc.Operation{Summary: "更新站点外观", Tag: "站点外观", Input: SiteAppearanceInput{}, Output: httpx.Response[SiteAppearance]{}, Protected: true}, admin, handler.SaveAppearance)
}

func (h *Handler) GetAppearance(c *gin.Context) {
	item, err := h.service.GetAppearance(c.Request.Context())
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}

func (h *Handler) SaveAppearance(c *gin.Context) {
	var input SiteAppearanceInput
	if !httpx.BindJSON(c, &input) {
		return
	}
	item, err := h.service.SaveAppearance(c.Request.Context(), input)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}

func (s *Service) GetAppearance(ctx context.Context) (SiteAppearance, error) {
	var item SiteAppearance
	err := s.db.QueryRowContext(ctx, `SELECT desktop_background_url,mobile_background_url,overlay_enabled FROM site_appearance WHERE id=1`).Scan(&item.DesktopBackgroundURL, &item.MobileBackgroundURL, &item.OverlayEnabled)
	return item, err
}

// validBackgroundURL 只允许站内绝对路径或完整 HTTP(S) 地址，空值表示恢复默认背景。
func validBackgroundURL(raw string) bool {
	if raw == "" {
		return true
	}
	if len(raw) > 1000 || strings.ContainsAny(raw, `\`) || strings.IndexFunc(raw, unicode.IsSpace) >= 0 || strings.IndexFunc(raw, unicode.IsControl) >= 0 {
		return false
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.User != nil || parsed.Fragment != "" {
		return false
	}
	if parsed.Scheme == "" {
		return parsed.Host == "" && strings.HasPrefix(parsed.Path, "/") && !strings.HasPrefix(parsed.Path, "//") && !strings.Contains(parsed.Path, "..") && !strings.ContainsAny(parsed.Path, `\`)
	}
	return (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Hostname() != ""
}

func (s *Service) SaveAppearance(ctx context.Context, input SiteAppearanceInput) (SiteAppearance, error) {
	input.DesktopBackgroundURL = strings.TrimSpace(input.DesktopBackgroundURL)
	input.MobileBackgroundURL = strings.TrimSpace(input.MobileBackgroundURL)
	if input.OverlayEnabled == nil || !validBackgroundURL(input.DesktopBackgroundURL) || !validBackgroundURL(input.MobileBackgroundURL) || len(input.AttachmentRelationKey) > 64 {
		return SiteAppearance{}, ErrInvalid
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return SiteAppearance{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `UPDATE site_appearance SET desktop_background_url=?,mobile_background_url=?,overlay_enabled=? WHERE id=1`, input.DesktopBackgroundURL, input.MobileBackgroundURL, *input.OverlayEnabled)
	if err != nil {
		return SiteAppearance{}, err
	}
	if err = attachment.SyncReferences(ctx, tx, "site", 1, input.AttachmentRelationKey, "首页背景", input.DesktopBackgroundURL+"\n"+input.MobileBackgroundURL); err != nil {
		return SiteAppearance{}, err
	}
	if err = tx.Commit(); err != nil {
		return SiteAppearance{}, err
	}
	return SiteAppearance{DesktopBackgroundURL: input.DesktopBackgroundURL, MobileBackgroundURL: input.MobileBackgroundURL, OverlayEnabled: *input.OverlayEnabled}, nil
}
