ALTER TABLE public.user_media
  ADD COLUMN IF NOT EXISTS in_collection BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS user_media_collection_recent_idx
  ON public.user_media (user_id, created_at DESC, id DESC)
  WHERE in_collection = TRUE;
