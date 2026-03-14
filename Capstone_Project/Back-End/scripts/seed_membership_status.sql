-- Run this BEFORE seed_customers_50.sql
-- membership.membership_status is an INTEGER column. This inserts the two IDs
-- so customer.membership_status (FK) can reference them.
-- Use reservation_db (or your DB) in MySQL Workbench.
--
-- If you already ran the old script (with 'Active'/'Inactive' strings), MySQL may have
-- inserted 0 or wrong values. Clean up first: DELETE FROM membership WHERE membership_status NOT IN (1, 2);
-- then run the INSERT below.

USE reservation_db;

-- Insert integer status IDs: 1 = Active, 2 = Inactive
INSERT IGNORE INTO membership (membership_status) VALUES (1), (2);
