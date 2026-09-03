package content

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"mossline/internal/attachment"
)

const postSelect = `SELECT p.id,p.title,p.slug,p.description,p.cover_url,p.content,p.content_type,p.status,p.is_top,p.view_count,
	p.seo_title,p.seo_description,p.published_at,p.created_at,p.updated_at,
	u.id,u.username,u.nickname,c.id,c.name,c.slug,c.description,c.parent_id,c.sort_order,c.status,c.created_at,c.updated_at
	FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN categories c ON c.id=p.category_id`

func scanPost(scanner interface{ Scan(...any) error }) (Post, error) {
	var p Post
	var desc, cover, seoTitle, seoDesc sql.NullString
	var published sql.NullTime
	var categoryID sql.NullInt64
	var categoryName, categorySlug, categoryDesc, categoryStatus sql.NullString
	var categoryParent sql.NullInt64
	var categorySort sql.NullInt64
	var categoryCreated, categoryUpdated sql.NullTime
	err := scanner.Scan(&p.ID, &p.Title, &p.Slug, &desc, &cover, &p.Content, &p.ContentType, &p.Status, &p.IsTop, &p.ViewCount,
		&seoTitle, &seoDesc, &published, &p.CreatedAt, &p.UpdatedAt, &p.Author.ID, &p.Author.Username, &p.Author.Nickname,
		&categoryID, &categoryName, &categorySlug, &categoryDesc, &categoryParent, &categorySort, &categoryStatus, &categoryCreated, &categoryUpdated)
	if err != nil {
		return Post{}, err
	}
	p.Desc = nullString(desc)
	p.Cover = nullString(cover)
	p.SEOTitle = nullString(seoTitle)
	p.SEODescription = nullString(seoDesc)
	p.PublishedAt = nullTime(published)
	p.Tags = []Tag{}
	if categoryID.Valid {
		c := Category{ID: uint64(categoryID.Int64), Name: nullString(categoryName), Slug: nullString(categorySlug), Description: nullString(categoryDesc), Sort: int(categorySort.Int64), Activate: categoryStatus.String == "active", CreatedAt: categoryCreated.Time, UpdatedAt: categoryUpdated.Time}
		if categoryParent.Valid {
			id := uint64(categoryParent.Int64)
			c.ParentID = &id
		}
		p.Category = &c
	}
	return p, nil
}

func (s *Service) postTags(ctx context.Context, id uint64) ([]Tag, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT t.id,t.name,t.slug,t.description,t.status,t.created_at,t.updated_at FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=? AND t.deleted_at IS NULL ORDER BY t.name`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Tag, 0)
	for rows.Next() {
		var i Tag
		var desc sql.NullString
		var status string
		if err = rows.Scan(&i.ID, &i.Name, &i.Slug, &desc, &status, &i.CreatedAt, &i.UpdatedAt); err != nil {
			return nil, err
		}
		i.Description = nullString(desc)
		i.Activate = status == "active"
		items = append(items, i)
	}
	return items, rows.Err()
}

func (s *Service) ListPosts(ctx context.Context, opt ListOptions) ([]Post, int64, error) {
	if err := s.publishDue(ctx); err != nil {
		return nil, 0, err
	}
	where := []string{"p.deleted_at IS NULL"}
	args := []any{}
	if !opt.Admin {
		where = append(where, "p.status='published'", "p.published_at IS NOT NULL", "p.published_at<=UTC_TIMESTAMP(6)")
	} else if opt.Status != "" {
		if !validStatus(opt.Status, "draft", "published", "scheduled", "offline") {
			return nil, 0, ErrInvalid
		}
		where = append(where, "p.status=?")
		args = append(args, opt.Status)
	}
	if opt.Search != "" {
		where = append(where, "(p.title LIKE ? OR p.slug LIKE ? OR p.description LIKE ? OR p.content LIKE ?)")
		needle := "%" + opt.Search + "%"
		args = append(args, needle, needle, needle, needle)
	}
	if opt.Category != "" {
		where = append(where, "EXISTS (SELECT 1 FROM categories fc WHERE fc.id=p.category_id AND (CAST(fc.id AS CHAR)=? OR fc.slug=? OR fc.name=?))")
		args = append(args, opt.Category, opt.Category, opt.Category)
	}
	if opt.Tag != "" {
		where = append(where, "EXISTS (SELECT 1 FROM post_tags fpt JOIN tags ft ON ft.id=fpt.tag_id WHERE fpt.post_id=p.id AND (CAST(ft.id AS CHAR)=? OR ft.slug=? OR ft.name=?))")
		args = append(args, opt.Tag, opt.Tag, opt.Tag)
	}
	if opt.DateFrom != "" {
		where = append(where, "p.published_at>=?")
		args = append(args, opt.DateFrom)
	}
	if opt.DateTo != "" {
		where = append(where, "p.published_at<DATE_ADD(?,INTERVAL 1 DAY)")
		args = append(args, opt.DateTo)
	}
	clause := strings.Join(where, " AND ")
	var total int64
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM posts p WHERE "+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := orderBy(opt.Sort, opt.Order, "p.published_at", map[string]string{"title": "p.title", "status": "p.status", "view_count": "p.view_count", "published_at": "p.published_at", "created_at": "p.created_at", "updated_at": "p.updated_at"})
	if !opt.Admin {
		order = "p.is_top DESC, " + order
	}
	rows, err := s.db.QueryContext(ctx, postSelect+" WHERE "+clause+" ORDER BY "+order+" LIMIT ? OFFSET ?", append(args, opt.Size, (opt.Page-1)*opt.Size)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Post, 0)
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, 0, err
		}
		p.Tags, err = s.postTags(ctx, p.ID)
		if err != nil {
			return nil, 0, err
		}
		if !opt.Admin {
			p.Content = ""
		}
		items = append(items, p)
	}
	return items, total, rows.Err()
}

// GetPost accepts a numeric ID for the admin editor and a slug for public
// readers. Public reads atomically increment the durable view counter.
func (s *Service) GetPost(ctx context.Context, identifier string, admin bool) (Post, error) {
	if err := s.publishDue(ctx); err != nil {
		return Post{}, err
	}
	where := "p.deleted_at IS NULL"
	args := []any{}
	if admin {
		id, err := strconv.ParseUint(identifier, 10, 64)
		if err != nil || id == 0 {
			return Post{}, ErrInvalid
		}
		where += " AND p.id=?"
		args = append(args, id)
	} else {
		where += " AND p.slug=? AND p.status='published' AND p.published_at IS NOT NULL AND p.published_at<=UTC_TIMESTAMP(6)"
		args = append(args, identifier)
	}
	p, err := scanPost(s.db.QueryRowContext(ctx, postSelect+" WHERE "+where+" LIMIT 1", args...))
	if errors.Is(err, sql.ErrNoRows) {
		return Post{}, ErrNotFound
	}
	if err != nil {
		return Post{}, err
	}
	p.Tags, err = s.postTags(ctx, p.ID)
	if err != nil {
		return Post{}, err
	}
	if !admin {
		if _, err = s.db.ExecContext(ctx, "UPDATE posts SET view_count=view_count+1 WHERE id=?", p.ID); err == nil {
			p.ViewCount++
		}
	}
	return p, err
}

func (s *Service) publishDue(ctx context.Context) error {
	now := time.Now().UTC()
	if _, err := s.db.ExecContext(ctx, `UPDATE posts SET status='published' WHERE status='scheduled' AND published_at IS NOT NULL AND published_at<=? AND deleted_at IS NULL`, now); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `UPDATE moments SET status='published' WHERE status='scheduled' AND published_at IS NOT NULL AND published_at<=? AND deleted_at IS NULL`, now)
	return err
}

func mergePostInput(existing Post, input PostInput) PostInput {
	if input.Title == nil {
		input.Title = &existing.Title
	}
	if input.Slug == nil {
		input.Slug = &existing.Slug
	}
	if input.Desc == nil {
		input.Desc = &existing.Desc
	}
	if input.Cover == nil {
		input.Cover = &existing.Cover
	}
	if input.Content == nil {
		input.Content = &existing.Content
	}
	if input.ContentType == nil {
		input.ContentType = &existing.ContentType
	}
	if input.Status == nil {
		input.Status = &existing.Status
	}
	if input.IsTop == nil {
		input.IsTop = &existing.IsTop
	}
	if input.SEOTitle == nil {
		input.SEOTitle = &existing.SEOTitle
	}
	if input.SEODescription == nil {
		input.SEODescription = &existing.SEODescription
	}
	if input.PublishedAt == nil && existing.PublishedAt != nil {
		v := existing.PublishedAt.Format(time.RFC3339)
		input.PublishedAt = &v
	}
	if input.CategoryID == nil && existing.Category != nil {
		input.CategoryID = fmt.Sprint(existing.Category.ID)
	}
	if input.TagIDs == nil {
		input.TagIDs = make([]any, len(existing.Tags))
		for i, t := range existing.Tags {
			input.TagIDs[i] = fmt.Sprint(t.ID)
		}
	}
	return input
}

func (s *Service) SavePost(ctx context.Context, id, authorID uint64, input PostInput) (Post, error) {
	if id > 0 {
		existing, err := s.GetPost(ctx, strconv.FormatUint(id, 10), true)
		if err != nil {
			return Post{}, err
		}
		input = mergePostInput(existing, input)
	}
	if input.Title == nil || strings.TrimSpace(*input.Title) == "" || len([]rune(*input.Title)) > 120 || input.Slug == nil || !validSlug(*input.Slug) || input.Content == nil || strings.TrimSpace(*input.Content) == "" {
		return Post{}, ErrInvalid
	}
	status := "draft"
	if input.Status != nil {
		status = *input.Status
	}
	if !validStatus(status, "draft", "published", "scheduled", "offline") {
		return Post{}, ErrInvalid
	}
	contentType := "markdown"
	if input.ContentType != nil {
		contentType = *input.ContentType
	}
	if contentType != "markdown" && contentType != "html" {
		return Post{}, ErrInvalid
	}
	published, err := parseDate(input.PublishedAt)
	if err != nil {
		return Post{}, err
	}
	now := time.Now().UTC()
	published, err = normalizePostPublishedAt(status, published, now)
	if err != nil {
		return Post{}, err
	}
	categoryID, err := nullableUint(input.CategoryID)
	if err != nil {
		return Post{}, err
	}
	tagIDs, err := parseIDs(input.TagIDs)
	if err != nil {
		return Post{}, err
	}
	if categoryID != nil {
		var exists int
		if err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM categories WHERE id=? AND deleted_at IS NULL", categoryID).Scan(&exists); err != nil {
			return Post{}, err
		}
		if exists == 0 {
			return Post{}, ErrInvalid
		}
	}
	for _, tagID := range tagIDs {
		var exists int
		if err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM tags WHERE id=? AND deleted_at IS NULL", tagID).Scan(&exists); err != nil {
			return Post{}, err
		}
		if exists == 0 {
			return Post{}, ErrInvalid
		}
	}
	desc, cover, seoTitle, seoDesc := "", "", "", ""
	if input.Desc != nil {
		desc = *input.Desc
	}
	if input.Cover != nil {
		cover = *input.Cover
	}
	if input.SEOTitle != nil {
		seoTitle = *input.SEOTitle
	}
	if input.SEODescription != nil {
		seoDesc = *input.SEODescription
	}
	isTop := false
	if input.IsTop != nil {
		isTop = *input.IsTop
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Post{}, err
	}
	defer tx.Rollback()
	if id == 0 {
		res, err := tx.ExecContext(ctx, `INSERT INTO posts(author_id,category_id,title,slug,description,cover_url,seo_title,seo_description,content,content_type,status,is_top,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, authorID, categoryID, strings.TrimSpace(*input.Title), strings.TrimSpace(*input.Slug), nullable(desc), nullable(cover), nullable(seoTitle), nullable(seoDesc), *input.Content, contentType, status, isTop, published, now, now)
		if err != nil {
			return Post{}, classifyDB(err)
		}
		v, _ := res.LastInsertId()
		id = uint64(v)
	} else {
		res, err := tx.ExecContext(ctx, `UPDATE posts SET category_id=?,title=?,slug=?,description=?,cover_url=?,seo_title=?,seo_description=?,content=?,content_type=?,status=?,is_top=?,published_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL`, categoryID, strings.TrimSpace(*input.Title), strings.TrimSpace(*input.Slug), nullable(desc), nullable(cover), nullable(seoTitle), nullable(seoDesc), *input.Content, contentType, status, isTop, published, now, id)
		if err != nil {
			return Post{}, classifyDB(err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return Post{}, ErrNotFound
		}
	}
	if _, err = tx.ExecContext(ctx, "DELETE FROM post_tags WHERE post_id=?", id); err != nil {
		return Post{}, err
	}
	for _, tagID := range tagIDs {
		if _, err = tx.ExecContext(ctx, "INSERT INTO post_tags(post_id,tag_id,created_at) VALUES(?,?,?)", id, tagID, now); err != nil {
			return Post{}, classifyDB(err)
		}
	}
	referencedContent := *input.Content + "\n" + cover
	if err = attachment.SyncReferences(ctx, tx, "post", id, input.AttachmentRelationKey, strings.TrimSpace(*input.Title), referencedContent); err != nil {
		return Post{}, err
	}
	if err = tx.Commit(); err != nil {
		return Post{}, err
	}
	return s.GetPost(ctx, strconv.FormatUint(id, 10), true)
}

func (s *Service) SetPostStatus(ctx context.Context, ids []uint64, status string) error {
	if len(ids) == 0 || !validStatus(status, "draft", "published", "scheduled", "offline") {
		return ErrInvalid
	}
	set := "status=?,updated_at=?"
	args := []any{status, time.Now().UTC()}
	if status == "published" {
		set += ",published_at=CASE WHEN published_at IS NULL OR published_at>UTC_TIMESTAMP(6) THEN UTC_TIMESTAMP(6) ELSE published_at END"
	}
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.ExecContext(ctx, "UPDATE posts SET "+set+" WHERE id IN ("+placeholders(len(ids))+") AND deleted_at IS NULL", args...)
	return err
}
func (s *Service) DeletePosts(ctx context.Context, ids []uint64) error {
	if len(ids) == 0 {
		return ErrInvalid
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		if _, err = tx.ExecContext(ctx, "DELETE FROM attachment_refs WHERE owner_type='post' AND owner_id=?", id); err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, "UPDATE posts SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL", time.Now().UTC(), time.Now().UTC(), id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
