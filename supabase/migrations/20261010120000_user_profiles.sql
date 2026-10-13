CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_username_format
    CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  CONSTRAINT user_profiles_display_name_length
    CHECK (char_length(display_name) BETWEEN 1 AND 60),
  CONSTRAINT user_profiles_bio_length
    CHECK (char_length(bio) <= 300),
  CONSTRAINT user_profiles_avatar_url_format
    CHECK (avatar_url IS NULL OR avatar_url ~ '^https://[^[:space:]]+$')
);

INSERT INTO public.user_profiles (user_id, username, display_name)
SELECT
  u.id,
  'u_' || substr(u.id, 1, 22),
  'Mosaic User'
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
);

CREATE INDEX IF NOT EXISTS user_profiles_visibility_idx
  ON public.user_profiles(visibility);
