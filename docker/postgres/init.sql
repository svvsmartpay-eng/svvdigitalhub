-- PostgreSQL init script for SVV AMS
-- Runs once on first container start

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for full-text search
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- for search normalization

-- Set timezone
SET timezone = 'Asia/Kolkata';
