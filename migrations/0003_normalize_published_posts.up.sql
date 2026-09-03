UPDATE posts
SET published_at = UTC_TIMESTAMP(6)
WHERE status = 'published'
  AND (published_at IS NULL OR published_at > UTC_TIMESTAMP(6));
