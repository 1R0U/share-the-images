PRAGMA foreign_keys = ON;

-- Better Auth core tables (D1 / SQLite)
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	name TEXT,
	email TEXT NOT NULL UNIQUE,
	email_verified INTEGER NOT NULL DEFAULT 0,
	image TEXT,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	token TEXT NOT NULL UNIQUE,
	expires_at TEXT NOT NULL,
	ip_address TEXT,
	user_agent TEXT,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	provider_id TEXT NOT NULL,
	account_id TEXT NOT NULL,
	access_token TEXT,
	refresh_token TEXT,
	id_token TEXT,
	access_token_expires_at TEXT,
	refresh_token_expires_at TEXT,
	scope TEXT,
	password TEXT,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (provider_id, account_id)
);

CREATE TABLE IF NOT EXISTS verifications (
	id TEXT PRIMARY KEY,
	identifier TEXT NOT NULL,
	value TEXT NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	UNIQUE (identifier, value)
);

-- App domain tables
CREATE TABLE IF NOT EXISTS communities (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS members (
	user_id TEXT NOT NULL,
	community_id TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY (user_id, community_id),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media (
	id TEXT PRIMARY KEY,
	community_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	type TEXT NOT NULL CHECK (type IN ('image', 'video')),
	r2_key TEXT NOT NULL,
	r2_url TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reactions (
	id TEXT PRIMARY KEY,
	media_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	emoji_type TEXT,
	comment_text TEXT,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roulette_history (
	id TEXT PRIMARY KEY,
	community_id TEXT NOT NULL,
	media_id TEXT NOT NULL,
	target_month_year TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
	FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
	UNIQUE (community_id, target_month_year)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_members_community_id ON members(community_id);
CREATE INDEX IF NOT EXISTS idx_media_community_created_at ON media(community_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_media_id ON reactions(media_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_community_month ON roulette_history(community_id, target_month_year);
