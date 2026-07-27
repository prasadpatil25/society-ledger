PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO "meta" ("key","value") VALUES('name','Avir Residency');
INSERT INTO "meta" ("key","value") VALUES('fy_start','2025-06-01');
INSERT INTO "meta" ("key","value") VALUES('fy_end','2026-06-30');
INSERT INTO "meta" ("key","value") VALUES('opening','0');
INSERT INTO "meta" ("key","value") VALUES('due','15000');
CREATE TABLE entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,                              
  particulars TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount      REAL NOT NULL CHECK (amount > 0),
  category    TEXT,
  member      TEXT,
  mode        TEXT
);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(1,'2025-08-07','Annual Maintenance — Prakash Patil (1st instalment)','credit',10000,NULL,'Prakash Patil','Bank');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(2,'2025-08-09','Annual Maintenance — Prasad Patil (full payment)','credit',15000,NULL,'Prasad Patil','Bank');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(3,'2025-08-09','Water bill','debit',445,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(4,'2025-09-09','Electricity bill','debit',4130,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(5,'2025-09-22','Water bill','debit',1377,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(6,'2025-10-27','Annual Maintenance — Mahawadikar (1st instalment)','credit',10000,NULL,'Mahawadikar','Cash');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(7,'2025-10-29','Water bill','debit',1878,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(8,'2025-11-06','Electricity bill','debit',4530,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(9,'2025-11-07','Annual Maintenance — Gaurkar (1st instalment)','credit',10000,NULL,'Gaurkar','GPay');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(10,'2025-11-22','Water bill','debit',473,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(11,'2025-11-23','Sweeper salary','debit',1500,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(12,'2025-11-23','Cleaning materials','debit',500,'Cleaning',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(13,'2025-12-09','Electricity bill','debit',2420,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(14,'2025-12-23','Water bill','debit',466,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(15,'2025-12-31','Electricity bill','debit',2110,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(16,'2026-01-05','Sweeper salary (37 days)','debit',1875,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(17,'2026-01-22','Water bill','debit',460,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(18,'2026-01-31','Electricity bill','debit',2270,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(19,'2026-02-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(20,'2026-03-04','Annual Maintenance — Santosh (full payment)','credit',15000,NULL,'Santosh','GPay');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(21,'2026-03-10','Electricity bill','debit',2160,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(22,'2026-03-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(23,'2026-03-26','Electricity bill','debit',2320,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(24,'2026-04-11','Drinking-water motor ball repair','debit',780,'Repair',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(25,'2026-04-24','Water bill','debit',457,'Water',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(26,'2026-04-26','Sweeper salary (incl. phenyl)','debit',1800,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(27,'2026-04-26','Electricity bill','debit',2300,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(28,'2026-05-27','Electricity bill','debit',2260,'Electricity',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(29,'2026-05-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(30,'2026-06-05','Annual Maintenance — Prakash Patil (final instalment)','credit',5000,NULL,'Prakash Patil','Bank');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(31,'2026-06-05','Annual Maintenance — Mahawadikar (final instalment)','credit',5000,NULL,'Mahawadikar','Cash');
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(32,'2026-06-15','Sweeper salary','debit',1500,'Sweeper',NULL,NULL);
INSERT INTO "entries" ("id","date","particulars","type","amount","category","member","mode") VALUES(33,'2026-06-21','Annual Maintenance — Gaurkar (final instalment)','credit',5000,NULL,'Gaurkar','GPay');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('entries',33);
CREATE INDEX idx_entries_date ON entries(date);