-- Add 35 more customers so the customer table has 50 total rows.
-- Run this in MySQL Workbench (or via mysql client) against your HBC database.
--
-- IMPORTANT: Run seed_membership_status.sql first so membership has rows with
-- membership_status = 1 and 2 (customer.membership_status is an INT FK to membership.membership_status).
-- We use 1 = Active, 2 = Inactive.
--
-- Columns: customer_first_name, customer_last_name, phone, email, street_address, city, state, zip_code, membership_status (INT)

INSERT INTO customer (customer_first_name, customer_last_name, phone, email, street_address, city, state, zip_code, membership_status) VALUES
('Marcus', 'Thompson', '281-555-1001', 'marcus.thompson@gmail.com', '4500 Westheimer Rd', 'Houston', 'TX', '77027', 1),
('Olivia', 'Martinez', '832-555-1002', 'olivia.martinez@icloud.com', '1200 Post Oak Blvd', 'Houston', 'TX', '77056', 1),
('Daniel', 'Kim', '713-555-1003', 'daniel.kim@yahoo.com', '2200 W Loop S', 'Houston', 'TX', '77027', 1),
('Isabella', 'Garcia', '346-555-1004', 'isabella.garcia@gmail.com', '1800 Bissonnet St', 'Houston', 'TX', '77005', 1),
('Ethan', 'Lee', '281-555-1005', 'ethan.lee@outlook.com', '3300 Kirby Dr', 'Houston', 'TX', '77098', 1),
('Mia', 'Wilson', '832-555-1006', 'mia.wilson@icloud.com', '2550 Fondren Rd', 'Houston', 'TX', '77063', 1),
('Alexander', 'Brown', '713-555-1007', 'alex.brown@gmail.com', '9100 Southwest Fwy', 'Houston', 'TX', '77074', 1),
('Charlotte', 'Davis', '346-555-1008', 'charlotte.davis@yahoo.com', '6400 Westpark Dr', 'Houston', 'TX', '77057', 2),
('James', 'Anderson', '281-555-1009', 'james.anderson@icloud.com', '10500 Northwest Fwy', 'Houston', 'TX', '77092', 1),
('Amelia', 'Taylor', '832-555-1010', 'amelia.taylor@gmail.com', '7600 Katy Fwy', 'Houston', 'TX', '77024', 1),
('Benjamin', 'Thomas', '713-555-1011', 'benjamin.thomas@outlook.com', '1900 Yorktown St', 'Houston', 'TX', '77056', 1),
('Harper', 'Jackson', '346-555-1012', 'harper.jackson@icloud.com', '5800 San Felipe St', 'Houston', 'TX', '77057', 1),
('Lucas', 'White', '281-555-1013', 'lucas.white@gmail.com', '4200 Montrose Blvd', 'Houston', 'TX', '77006', 1),
('Evelyn', 'Harris', '832-555-1014', 'evelyn.harris@yahoo.com', '1600 Smith St', 'Houston', 'TX', '77002', 2),
('Henry', 'Martin', '713-555-1015', 'henry.martin@outlook.com', '800 Fannin St', 'Houston', 'TX', '77002', 1),
('Abigail', 'Thompson', '346-555-1016', 'abigail.thompson@gmail.com', '3100 Main St', 'Houston', 'TX', '77002', 1),
('Sebastian', 'Robinson', '281-555-1017', 'sebastian.robinson@icloud.com', '7200 Long Point Rd', 'Houston', 'TX', '77055', 1),
('Emily', 'Clark', '832-555-1018', 'emily.clark.demo@gmail.com', '9500 Hempstead Rd', 'Houston', 'TX', '77008', 1),
('Jack', 'Lewis', '713-555-1019', 'jack.lewis@yahoo.com', '5300 Gulfton St', 'Houston', 'TX', '77081', 1),
('Ella', 'Walker', '346-555-1020', 'ella.walker@outlook.com', '11200 Bellaire Blvd', 'Houston', 'TX', '77072', 1),
('Aiden', 'Hall', '281-555-1021', 'aiden.hall@gmail.com', '8500 Bissonnet St', 'Houston', 'TX', '77036', 1),
('Scarlett', 'Allen', '832-555-1022', 'scarlett.allen@icloud.com', '6200 Savoy Dr', 'Houston', 'TX', '77036', 2),
('Owen', 'Young', '713-555-1023', 'owen.young@yahoo.com', '3800 Greenway Plaza', 'Houston', 'TX', '77046', 1),
('Grace', 'King', '346-555-1024', 'grace.king@gmail.com', '1900 St James Pl', 'Houston', 'TX', '77056', 1),
('Liam', 'Wright', '281-555-1025', 'liam.wright@outlook.com', '4400 North Fwy', 'Houston', 'TX', '77022', 1),
('Chloe', 'Scott', '832-555-1026', 'chloe.scott@icloud.com', '6800 Portwest Dr', 'Houston', 'TX', '77024', 1),
('Noah', 'Green', '713-555-1027', 'noah.green@gmail.com', '1700 W Alabama St', 'Houston', 'TX', '77098', 1),
('Victoria', 'Adams', '346-555-1028', 'victoria.adams@yahoo.com', '2400 Midtown Dr', 'Houston', 'TX', '77004', 1),
('Mason', 'Nelson', '281-555-1029', 'mason.nelson@outlook.com', '5000 Mitchelldale St', 'Houston', 'TX', '77092', 1),
('Penelope', 'Baker', '832-555-1030', 'penelope.baker@gmail.com', '7800 Bissonnet St', 'Houston', 'TX', '77074', 1),
('Lucas', 'Hill', '713-555-1031', 'lucas.hill.demo@icloud.com', '4100 Bellaire Blvd', 'Houston', 'TX', '77025', 1),
('Layla', 'Campbell', '346-555-1032', 'layla.campbell@yahoo.com', '9200 Kempwood Dr', 'Houston', 'TX', '77080', 2),
('Elijah', 'Mitchell', '281-555-1033', 'elijah.mitchell@gmail.com', '6000 Chimney Rock Rd', 'Houston', 'TX', '77081', 1),
('Riley', 'Roberts', '832-555-1034', 'riley.roberts@outlook.com', '3500 W Dallas St', 'Houston', 'TX', '77019', 1),
('Logan', 'Turner', '713-555-1035', 'logan.turner@icloud.com', '1100 Louisiana St', 'Houston', 'TX', '77002', 1);
