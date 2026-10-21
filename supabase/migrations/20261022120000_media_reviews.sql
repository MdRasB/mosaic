-- M12 — Written reviews.
--
-- Reviews need their own table: unlike a rating they carry text, visibility and
-- spoiler state, plus timestamps and (later) likes and comments. The review is
-- attached to the existing user_media relationship so it reuses the shared
-- media identity and the (user_id, media_id) uniqueness guarantee.
--
-- Visibility is deliberately separate from user_media.visibility: a public
-- review must never make a private collection, watchlist or favorites entry
-- visible. Public review reads join through user_media but only ever expose the
-- review and the author's display name.

CREATE TABLE IF NOT EXISTS public.media_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  user_media_id BIGINT NOT NULL
    REFERENCES public.user_media(id)
    ON DELETE CASCADE,

  title TEXT,
  body TEXT NOT NULL,

  visibility TEXT NOT NULL DEFAULT 'private',
  contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_review_per_user_media UNIQUE (user_media_id),

  CONSTRAINT review_title_length_check
    CHECK (
      title IS NULL
      OR char_length(title) BETWEEN 1 AND 120
    ),

  CONSTRAINT review_body_length_check
    CHECK (char_length(body) BETWEEN 20 AND 5000),

  CONSTRAINT review_visibility_check
    CHECK (visibility IN ('private', 'public'))
);

-- The unique constraint already indexes user_media_id for owner lookups.
-- Public listings are the other hot path.
CREATE INDEX IF NOT EXISTS media_reviews_public_recent_idx
  ON public.media_reviews (updated_at DESC, id DESC)
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS media_reviews_updated_idx
  ON public.media_reviews (updated_at DESC, id DESC);
