ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_image BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_content_type TEXT;

CREATE INDEX IF NOT EXISTS user_profiles_avatar_image_idx
  ON public.user_profiles(user_id)
  WHERE avatar_image IS NOT NULL;