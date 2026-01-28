-- Trigger: auto-create profile when a new user signs up via Supabase Auth
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, currency, language, default_month)
  values (
    new.id,
    '',
    'BRL',
    'pt',
    to_char(now(), 'YYYY-MM')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
