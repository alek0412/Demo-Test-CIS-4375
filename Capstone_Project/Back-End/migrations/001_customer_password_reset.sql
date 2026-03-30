-- Run once on reservation_db (RDS / MySQL Workbench).
-- Your `customer` table already has `password` and `salt` columns.
-- This app stores a bcrypt hash in `password` (salt embedded in the hash; `salt` stays NULL).
-- This migration only adds columns needed for forgot-password links.

ALTER TABLE `customer`
  ADD COLUMN `reset_token` VARCHAR(64) NULL DEFAULT NULL,
  ADD COLUMN `reset_token_expires` DATETIME NULL DEFAULT NULL;
