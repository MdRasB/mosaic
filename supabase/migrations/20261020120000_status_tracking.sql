ALTER TABLE public.user_media
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

UPDATE public.user_media
SET status_changed_at = updated_at
WHERE status IS NOT NULL
  AND status_changed_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_media_status_timestamp_check'
  ) THEN
    ALTER TABLE public.user_media
      ADD CONSTRAINT user_media_status_timestamp_check
      CHECK (
        (status IS NULL AND status_changed_at IS NULL)
        OR (status IS NOT NULL AND status_changed_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_media_status_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_media_id BIGINT NOT NULL REFERENCES public.user_media(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL CHECK (
    new_status IN ('watchlist', 'watching', 'paused', 'completed', 'dropped')
  ),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    previous_status IS NULL OR previous_status IN (
      'watchlist', 'watching', 'paused', 'completed', 'dropped'
    )
  ),
  CHECK (previous_status IS DISTINCT FROM new_status)
);

CREATE INDEX IF NOT EXISTS user_media_status_history_recent_idx
  ON public.user_media_status_history (user_media_id, changed_at DESC, id DESC);
