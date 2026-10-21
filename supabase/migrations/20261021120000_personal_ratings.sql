-- M11 — Personal ratings.
--
-- A rating is a property of the user's relationship with a title, so it lives
-- on user_media rather than in a separate table: there is at most one current
-- rating per (user_id, media_id), which is exactly the row's uniqueness.
--
-- An unrated title stores NULL/NULL. Ratings are only meaningful when a
-- relationship exists, but a relationship does not require a rating: a user can
-- rate a title without adding it to the collection, favorites or watchlist.

ALTER TABLE public.user_media
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1);

ALTER TABLE public.user_media
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Enforce the personal-rating scale: 1.0–10.0 in half-point steps. The
-- multiplication trick rejects values such as 8.3 without floating-point
-- comparisons in application code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_media_rating_check'
  ) THEN
    ALTER TABLE public.user_media
      ADD CONSTRAINT user_media_rating_check
      CHECK (
        rating IS NULL
        OR (
          rating BETWEEN 1.0 AND 10.0
          AND rating * 2 = trunc(rating * 2)
        )
      );
  END IF;
END $$;

-- A rating and its timestamp are recorded together or not at all.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_media_rating_timestamp_check'
  ) THEN
    ALTER TABLE public.user_media
      ADD CONSTRAINT user_media_rating_timestamp_check
      CHECK (
        (rating IS NULL AND rated_at IS NULL)
        OR (rating IS NOT NULL AND rated_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_media_rated_recent_idx
  ON public.user_media (user_id, rated_at DESC, id DESC)
  WHERE rating IS NOT NULL;
