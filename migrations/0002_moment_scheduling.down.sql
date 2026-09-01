UPDATE moments SET status = 'draft' WHERE status = 'scheduled';
ALTER TABLE moments
    MODIFY COLUMN status ENUM('draft', 'published', 'offline') NOT NULL DEFAULT 'draft';
