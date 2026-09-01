ALTER TABLE moments
    MODIFY COLUMN status ENUM('draft', 'published', 'scheduled', 'offline') NOT NULL DEFAULT 'draft';
