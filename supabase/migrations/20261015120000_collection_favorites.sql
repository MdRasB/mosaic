CREATE TABLE IF NOT EXISTS public.media_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'tmdb'),
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  provider_media_id TEXT NOT NULL CHECK (provider_media_id ~ '^[1-9][0-9]{0,15}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  poster_path TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, media_type, provider_media_id)
);

CREATE TABLE IF NOT EXISTS public.user_media (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL REFERENCES public.media_items(id),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  favorited_at TIMESTAMPTZ,
  status TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility = 'private'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((is_favorite AND favorited_at IS NOT NULL) OR (NOT is_favorite AND favorited_at IS NULL)),
  UNIQUE (user_id, media_id)
);

CREATE INDEX IF NOT EXISTS user_media_user_recent_idx
  ON public.user_media (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS user_media_favorite_recent_idx
  ON public.user_media (user_id, favorited_at DESC, id DESC)
  WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS user_media_media_idx
  ON public.user_media (media_id);
