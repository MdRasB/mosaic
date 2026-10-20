CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_unique_idx
  ON public.user_profiles (username);
