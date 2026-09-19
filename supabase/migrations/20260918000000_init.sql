create table public.profile (
  id uuid primary key default auth.uid() references auth.users on delete cascade,
  sex text not null check (sex in ('male','female')),
  birth_year int not null check (birth_year between 1900 and 2015),
  height_in numeric not null check (height_in between 48 and 96),
  activity text not null check (activity in ('sedentary','light','moderate','active','very_active')),
  goal text not null check (goal in ('cut','maintain','bulk')),
  rate_lb_per_week numeric not null check (rate_lb_per_week between 0 and 2),
  override jsonb, adaptive_enabled boolean not null default true,
  tdee_estimate numeric, tdee_updated_on date, tdee_previous numeric,
  updated_at timestamptz not null, deleted_at timestamptz);
create table public.food_log (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null, meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  hall text, station text, name text not null check (length(name) between 1 and 200),
  recipe_number text, custom_food_id uuid, portion text not null, servings numeric not null check (servings > 0 and servings <= 50),
  per_serving jsonb not null, updated_at timestamptz not null, deleted_at timestamptz);
create table public.custom_foods (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 200), portion text not null, per_serving jsonb not null,
  updated_at timestamptz not null, deleted_at timestamptz);
create table public.weights (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null, weight_lb numeric not null check (weight_lb between 50 and 700),
  updated_at timestamptz not null, deleted_at timestamptz, unique (user_id, date));
create index on public.food_log (user_id, updated_at);
create index on public.custom_foods (user_id, updated_at);
create index on public.weights (user_id, updated_at);
alter table public.profile enable row level security;
alter table public.food_log enable row level security;
alter table public.custom_foods enable row level security;
alter table public.weights enable row level security;
create policy own_profile on public.profile for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_log on public.food_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_custom on public.custom_foods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_weights on public.weights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke delete on public.profile, public.food_log, public.custom_foods, public.weights from anon, authenticated;
-- Newer Supabase stacks no longer auto-grant public tables to API roles; grant explicitly (no delete: soft deletes only).
grant select, insert, update on public.profile, public.food_log, public.custom_foods, public.weights to authenticated;
