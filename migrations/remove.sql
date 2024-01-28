DELETE FROM vault.secrets WHERE NAME = 'supaqueue_secret';

DROP SCHEMA IF EXISTS supaqueue CASCADE;