-- Sample data: Avir Society FY 2025-26 (optional)
INSERT INTO entries(date,particulars,type,amount,category,member,mode) VALUES
  ('2025-08-07','Annual Maintenance — Prakash Patil (1st instalment)','credit',10000,NULL,'Prakash Patil','Bank'),
  ('2025-08-09','Annual Maintenance — Prasad Patil (full payment)','credit',15000,NULL,'Prasad Patil','Bank'),
  ('2025-08-09','Water bill','debit',445,'Water',NULL,NULL),
  ('2025-09-09','Electricity bill','debit',4130,'Electricity',NULL,NULL),
  ('2025-09-22','Water bill','debit',1377,'Water',NULL,NULL),
  ('2025-10-27','Annual Maintenance — Mahawadikar (1st instalment)','credit',10000,NULL,'Mahawadikar','Cash'),
  ('2025-10-29','Water bill','debit',1878,'Water',NULL,NULL),
  ('2025-11-06','Electricity bill','debit',4530,'Electricity',NULL,NULL),
  ('2025-11-07','Annual Maintenance — Gaurkar (1st instalment)','credit',10000,NULL,'Gaurkar','GPay'),
  ('2025-11-22','Water bill','debit',473,'Water',NULL,NULL),
  ('2025-11-23','Sweeper salary','debit',1500,'Sweeper',NULL,NULL),
  ('2025-11-23','Cleaning materials','debit',500,'Cleaning',NULL,NULL),
  ('2025-12-09','Electricity bill','debit',2420,'Electricity',NULL,NULL),
  ('2025-12-23','Water bill','debit',466,'Water',NULL,NULL),
  ('2025-12-31','Electricity bill','debit',2110,'Electricity',NULL,NULL),
  ('2026-01-05','Sweeper salary (37 days)','debit',1875,'Sweeper',NULL,NULL),
  ('2026-01-22','Water bill','debit',460,'Water',NULL,NULL),
  ('2026-01-31','Electricity bill','debit',2270,'Electricity',NULL,NULL),
  ('2026-02-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL),
  ('2026-03-04','Annual Maintenance — Santosh (full payment)','credit',15000,NULL,'Santosh','GPay'),
  ('2026-03-10','Electricity bill','debit',2160,'Electricity',NULL,NULL),
  ('2026-03-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL),
  ('2026-03-26','Electricity bill','debit',2320,'Electricity',NULL,NULL),
  ('2026-04-11','Drinking-water motor ball repair','debit',780,'Repair',NULL,NULL),
  ('2026-04-24','Water bill','debit',457,'Water',NULL,NULL),
  ('2026-04-26','Sweeper salary (incl. phenyl)','debit',1800,'Sweeper',NULL,NULL),
  ('2026-04-26','Electricity bill','debit',2300,'Electricity',NULL,NULL),
  ('2026-05-27','Electricity bill','debit',2260,'Electricity',NULL,NULL),
  ('2026-05-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL),
  ('2026-06-05','Annual Maintenance — Prakash Patil (final instalment)','credit',5000,NULL,'Prakash Patil','Bank'),
  ('2026-06-05','Annual Maintenance — Mahawadikar (final instalment)','credit',5000,NULL,'Mahawadikar','Cash'),
  ('2026-06-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL),
  ('2026-06-21','Annual Maintenance — Gaurkar (final instalment)','credit',5000,NULL,'Gaurkar','GPay');

-- Populate the roster from the sample entries (only if empty).
INSERT INTO members (name)
SELECT DISTINCT member FROM entries
WHERE member IS NOT NULL AND TRIM(member) <> ''
  AND NOT EXISTS (SELECT 1 FROM members);
