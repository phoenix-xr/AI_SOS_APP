-- HealthMitra PostgreSQL Schema Initialization
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- Default Admin Account (Username: admin, Password: admin)
INSERT INTO users (username, email, hashed_password, full_name, is_active)
VALUES (
    'admin',
    'admin@healthmitra.com',
    '$2b$12$1kpLnZ5L9yBsvb/GcVq3ru9fFwXk91SBE8lmmH.UqqFVjA/xb3Gga',
    'Administrator',
    TRUE
)
ON CONFLICT (username) DO NOTHING;
