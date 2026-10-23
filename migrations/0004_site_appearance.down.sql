DELETE FROM attachment_refs WHERE owner_type = 'site';
ALTER TABLE attachment_refs MODIFY owner_type ENUM('post', 'moment', 'about', 'user', 'friend') NOT NULL;
DROP TABLE site_appearance;
