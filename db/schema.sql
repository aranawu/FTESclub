PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  registration_no TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  class_name TEXT NOT NULL,
  student_id_hash TEXT NOT NULL UNIQUE,
  student_id_masked TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  last_result_email_at TEXT
);

CREATE TABLE IF NOT EXISTS registration_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','waitlist','rejected')),
  waitlist_no INTEGER,
  reviewed_at TEXT,
  result_email_sent_at TEXT,
  FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
  UNIQUE (registration_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_choices_club_status ON registration_choices(club_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_submitted_at ON registrations(submitted_at);
