-- Watchlist membership is the reserved user_media.status column.
-- A row is on the watchlist when status IS NOT NULL; the value tracks
-- progress through the documented collection state model.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_media_status_values'
  ) THEN
    ALTER TABLE public.user_media
      ADD CONSTRAINT user_media_status_values
      CHECK (status IS NULL OR status IN ('watchlist', 'watching', 'completed', 'dropped', 'paused'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_media_watchlist_recent_idx
  ON public.user_media (user_id, created_at DESC, id DESC)
  WHERE status IS NOT NULL;
