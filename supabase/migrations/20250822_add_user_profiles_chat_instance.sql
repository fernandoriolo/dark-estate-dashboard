alter table public.user_profiles add column if not exists chat_instance text;
create index if not exists idx_user_profiles_chat_instance on public.user_profiles(chat_instance);


