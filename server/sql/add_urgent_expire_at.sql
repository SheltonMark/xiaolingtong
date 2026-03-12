-- Add urgentExpireAt column to jobs table
ALTER TABLE jobs ADD COLUMN urgentExpireAt DATETIME NULL AFTER urgent;
