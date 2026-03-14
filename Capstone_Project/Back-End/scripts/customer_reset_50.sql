-- Clear the customer table and insert exactly 50 rows.
-- Run in MySQL Workbench with reservation_db selected.
-- Safe update mode is turned off so DELETE FROM customer; is allowed, then turned back on.
-- If you get a foreign key error, other tables may reference customer; clear those first or use FOREIGN_KEY_CHECKS.

USE reservation_db;

SET SQL_SAFE_UPDATES = 0;
DELETE FROM customer;
SET SQL_SAFE_UPDATES = 1;

ALTER TABLE customer AUTO_INCREMENT = 1;

-- Zip codes repeat across customers (77002, 77006, 77019, 77024, 77027, 77030, 77056, 77057, 77098, 77081).
INSERT INTO customer (customer_first_name, customer_last_name, phone, email, street_address, city, state, zip_code, membership_status) VALUES
('Marcus', 'Thompson', '281-555-1001', 'marcus.thompson@gmail.com', '4500 Westheimer Rd', 'Houston', 'TX', '77027', 1),
('Olivia', 'Martinez', '832-555-1002', 'olivia.martinez@icloud.com', '1200 Post Oak Blvd', 'Houston', 'TX', '77056', 1),
('Daniel', 'Kim', '713-555-1003', 'daniel.kim@yahoo.com', '2200 W Loop S', 'Houston', 'TX', '77027', 1),
('Isabella', 'Garcia', '346-555-1004', 'isabella.garcia@gmail.com', '1800 Bissonnet St', 'Houston', 'TX', '77056', 1),
('Ethan', 'Lee', '281-555-1005', 'ethan.lee@outlook.com', '3300 Kirby Dr', 'Houston', 'TX', '77098', 1),
('Mia', 'Wilson', '832-555-1006', 'mia.wilson@icloud.com', '2550 Fondren Rd', 'Houston', 'TX', '77027', 1),
('Alexander', 'Brown', '713-555-1007', 'alex.brown@gmail.com', '9100 Southwest Fwy', 'Houston', 'TX', '77024', 1),
('Charlotte', 'Davis', '346-555-1008', 'charlotte.davis@yahoo.com', '6400 Westpark Dr', 'Houston', 'TX', '77057', 2),
('James', 'Anderson', '281-555-1009', 'james.anderson@icloud.com', '10500 Northwest Fwy', 'Houston', 'TX', '77030', 1),
('Amelia', 'Taylor', '832-555-1010', 'amelia.taylor@gmail.com', '7600 Katy Fwy', 'Houston', 'TX', '77024', 1),
('Benjamin', 'Thomas', '713-555-1011', 'benjamin.thomas@outlook.com', '1900 Yorktown St', 'Houston', 'TX', '77056', 1),
('Harper', 'Jackson', '346-555-1012', 'harper.jackson@icloud.com', '5800 San Felipe St', 'Houston', 'TX', '77057', 1),
('Lucas', 'White', '281-555-1013', 'lucas.white@gmail.com', '4200 Montrose Blvd', 'Houston', 'TX', '77006', 1),
('Evelyn', 'Harris', '832-555-1014', 'evelyn.harris@yahoo.com', '1600 Smith St', 'Houston', 'TX', '77002', 2),
('Henry', 'Martin', '713-555-1015', 'henry.martin@outlook.com', '800 Fannin St', 'Houston', 'TX', '77002', 1),
('Abigail', 'Thompson', '346-555-1016', 'abigail.thompson@gmail.com', '3100 Main St', 'Houston', 'TX', '77002', 1),
('Sebastian', 'Robinson', '281-555-1017', 'sebastian.robinson@icloud.com', '7200 Long Point Rd', 'Houston', 'TX', '77030', 1),
('Emily', 'Clark', '832-555-1018', 'emily.clark.demo@gmail.com', '9500 Hempstead Rd', 'Houston', 'TX', '77024', 1),
('Jack', 'Lewis', '713-555-1019', 'jack.lewis@yahoo.com', '5300 Gulfton St', 'Houston', 'TX', '77081', 1),
('Ella', 'Walker', '346-555-1020', 'ella.walker@outlook.com', '11200 Bellaire Blvd', 'Houston', 'TX', '77056', 1),
('Aiden', 'Hall', '281-555-1021', 'aiden.hall@gmail.com', '8500 Bissonnet St', 'Houston', 'TX', '77030', 1),
('Scarlett', 'Allen', '832-555-1022', 'scarlett.allen@icloud.com', '6200 Savoy Dr', 'Houston', 'TX', '77027', 2),
('Owen', 'Young', '713-555-1023', 'owen.young@yahoo.com', '3800 Greenway Plaza', 'Houston', 'TX', '77056', 1),
('Grace', 'King', '346-555-1024', 'grace.king@gmail.com', '1900 St James Pl', 'Houston', 'TX', '77056', 1),
('Liam', 'Wright', '281-555-1025', 'liam.wright@outlook.com', '4400 North Fwy', 'Houston', 'TX', '77019', 1),
('Chloe', 'Scott', '832-555-1026', 'chloe.scott@icloud.com', '6800 Portwest Dr', 'Houston', 'TX', '77024', 1),
('Noah', 'Green', '713-555-1027', 'noah.green@gmail.com', '1700 W Alabama St', 'Houston', 'TX', '77098', 1),
('Victoria', 'Adams', '346-555-1028', 'victoria.adams@yahoo.com', '2400 Midtown Dr', 'Houston', 'TX', '77006', 1),
('Mason', 'Nelson', '281-555-1029', 'mason.nelson@outlook.com', '5000 Mitchelldale St', 'Houston', 'TX', '77030', 1),
('Penelope', 'Baker', '832-555-1030', 'penelope.baker@gmail.com', '7800 Bissonnet St', 'Houston', 'TX', '77027', 1),
('Lucas', 'Hill', '713-555-1031', 'lucas.hill.demo@icloud.com', '4100 Bellaire Blvd', 'Houston', 'TX', '77006', 1),
('Layla', 'Campbell', '346-555-1032', 'layla.campbell@yahoo.com', '9200 Kempwood Dr', 'Houston', 'TX', '77019', 2),
('Elijah', 'Mitchell', '281-555-1033', 'elijah.mitchell@gmail.com', '6000 Chimney Rock Rd', 'Houston', 'TX', '77081', 1),
('Riley', 'Roberts', '832-555-1034', 'riley.roberts@outlook.com', '3500 W Dallas St', 'Houston', 'TX', '77019', 1),
('Logan', 'Turner', '713-555-1035', 'logan.turner@icloud.com', '1100 Louisiana St', 'Houston', 'TX', '77002', 1),
('Emily', 'Chen', '713-556-0123', 'emily.chen@example.com', '1024 Maple St', 'Houston', 'TX', '77002', 1),
('Jacob', 'Ramirez', '832-556-0456', 'jacob.ramirez@gmail.com', '2210 Oak Ridge Dr', 'Houston', 'TX', '77002', 1),
('Sophia', 'Nguyen', '346-556-0788', 'sophia.nguyen@icloud.com', '55 Lakeview Ct', 'Houston', 'TX', '77006', 1),
('William', 'Foster', '281-556-1010', 'william.foster@yahoo.com', '890 Memorial Dr', 'Houston', 'TX', '77006', 2),
('Ava', 'Powell', '832-556-1342', 'ava.powell@outlook.com', '2100 Travis St', 'Houston', 'TX', '77002', 1),
('Michael', 'Simmons', '713-556-1674', 'michael.simmons@gmail.com', '1500 McKinney St', 'Houston', 'TX', '77019', 1),
('Emma', 'Flores', '346-556-2006', 'emma.flores@icloud.com', '4200 Yoakum Blvd', 'Houston', 'TX', '77006', 1),
('David', 'Butler', '281-556-2338', 'david.butler@yahoo.com', '6700 Main St', 'Houston', 'TX', '77030', 1),
('Olivia', 'Barnes', '832-556-2670', 'olivia.barnes@gmail.com', '1 Baylor Plaza', 'Houston', 'TX', '77030', 1),
('Joseph', 'Rivera', '713-556-3002', 'joseph.rivera@outlook.com', '7600 Clarewood Dr', 'Houston', 'TX', '77030', 2),
('Mia', 'Cooper', '346-556-3334', 'mia.cooper@icloud.com', '2500 Dunlavy St', 'Houston', 'TX', '77006', 1),
('Samuel', 'Richardson', '281-556-3666', 'samuel.richardson@gmail.com', '3200 Kirby Dr', 'Houston', 'TX', '77098', 1),
('Charlotte', 'Cox', '832-556-3998', 'charlotte.cox@yahoo.com', '1800 Augusta Dr', 'Houston', 'TX', '77057', 1),
('Matthew', 'Howard', '713-556-4330', 'matthew.howard@outlook.com', '5400 Morningside Dr', 'Houston', 'TX', '77056', 1),
('Amelia', 'Ward', '346-556-4662', 'amelia.ward@gmail.com', '1200 Binz St', 'Houston', 'TX', '77002', 1);
