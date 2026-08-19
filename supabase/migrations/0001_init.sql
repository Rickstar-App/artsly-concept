-- ===========================================================================
-- CURIO — INITIAL SCHEMA
-- PRD §31 (data model), §32 (auth, roles, RLS), §9 (taxonomy CHECK constraints)
--
-- ONE CANONICAL SCHEMA. v1.0 had two disagreeing ones (§0.1 defect #5): its §9
-- artwork model and its §25 `artworks` table disagreed on nearly every field
-- name. There is exactly one definition of every column here.
--
-- All money is `integer` cents. All timestamps are `timestamptz`.
-- Tag arrays are `text[]` validated against §9 by CHECK constraints.
--
-- §31.4 ordering note: `rentals.mystery_subscription_id` references a table the
-- PRD defines later, so `mystery_subscriptions` is created BEFORE `rentals`.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- §31.1 Enums
-- ---------------------------------------------------------------------------
create type user_role            as enum ('collector','artist','admin');
create type size_category        as enum ('small','medium','large','oversized');
create type artwork_availability as enum ('available','reserved','rented','sold');
create type rental_status        as enum ('active','ending','returned','purchased','cancelled');
create type rental_source        as enum ('library','swap','mystery');
create type return_reason        as enum ('different','space','style','price','other');
create type mystery_piece_type   as enum ('curated','custom','surprise');
create type mystery_status       as enum ('matching','matched','active','cancelled','completed');
create type change_frequency     as enum ('monthly','quarterly','biannual','annual','when-i-find-something');
create type budget_band          as enum ('under-25','25-50','50-100','100-200','200-plus');

-- ---------------------------------------------------------------------------
-- §9 Taxonomy guards.
--
-- Generated from `src/lib/taxonomy.ts`. `taxonomy-sql.test.ts` asserts these
-- arrays match the TypeScript source exactly — that test is the second half of
-- the regression guard against v1.0's defect #1, where survey strings and
-- artwork tags silently disagreed and three of twelve styles scored a
-- permanent zero.
--
-- Note `valid_rooms` deliberately EXCLUDES 'any': the wildcard is user-side
-- only and is never a valid artwork tag (§9.4).
-- ---------------------------------------------------------------------------
create or replace function valid_styles() returns text[] language sql immutable parallel safe as $$
  select array['abstract','minimalist','contemporary','impressionist','photography','pop',
               'landscape','portrait','street','surreal','traditional','mixed-media']::text[] $$;

create or replace function valid_colors() returns text[] language sql immutable parallel safe as $$
  select array['neutral','monochrome','blue','green','red','orange','yellow','purple',
               'earth','vibrant']::text[] $$;

create or replace function valid_moods() returns text[] language sql immutable parallel safe as $$
  select array['calm','energetic','sophisticated','cozy','playful','dramatic','inspiring']::text[] $$;

create or replace function valid_rooms() returns text[] language sql immutable parallel safe as $$
  select array['living-room','bedroom','office','dining-room','hallway']::text[] $$;

-- ---------------------------------------------------------------------------
-- §31.2 Tables
-- ---------------------------------------------------------------------------

-- Mirrors auth.users. Supabase Auth owns credentials; we never store passwords.
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  avatar_url    text,
  role          user_role not null default 'collector',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table user_preferences (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references profiles(id) on delete cascade,
  -- §10: Q1 is SINGLE-SELECT, so this is `text`, not `text[]`. v1.0 mismatched
  -- a single-select question against a `rooms[]` array column.
  room             text not null check (room = 'any' or room = any(valid_rooms())),
  styles           text[] not null default '{}' check (styles <@ valid_styles()),
  colors           text[] not null default '{}' check (colors <@ valid_colors()),
  moods            text[] not null default '{}' check (moods  <@ valid_moods()),
  size_preference  size_category not null,
  boldness         smallint not null check (boldness between 1 and 10),
  budget_band      budget_band not null,
  budget_min_cents integer not null check (budget_min_cents >= 0),
  budget_max_cents integer not null,
  change_frequency change_frequency not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint budget_order check (budget_max_cents > budget_min_cents),
  -- §10 selection caps. These are a PRODUCT decision, not a UI nicety: the
  -- overlap coefficient in §12.2 degrades toward noise past these limits.
  constraint survey_caps check (
        coalesce(array_length(styles,1),0) between 1 and 5
    and coalesce(array_length(colors,1),0) between 1 and 4
    and coalesce(array_length(moods, 1),0) between 1 and 3
  )
);

-- §13 Behavioural taste weights. Size and room deliberately excluded: they are
-- physical facts about the user's wall, not taste.
create table user_affinity (
  user_id    uuid not null references profiles(id) on delete cascade,
  tag_type   text not null check (tag_type in ('style','color','mood')),
  tag        text not null,
  weight     real not null default 0 check (weight between -1 and 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, tag_type, tag)
);

create table artists (
  id                   uuid primary key default gen_random_uuid(),
  -- §32.2: nullable so the ten seeded fictional artists exist without accounts.
  -- This column is what closes v1.0's gap where artists had a dashboard and no
  -- way to log in (§0.1 defect #16).
  user_id              uuid unique references profiles(id) on delete set null,
  name                 text not null,
  slug                 text not null unique,
  tagline              text,
  bio                  text,
  location             text,
  profile_image_url    text,
  mediums              text[] not null default '{}',
  styles               text[] not null default '{}' check (styles <@ valid_styles()),
  commission_available boolean not null default false,
  is_fictional         boolean not null default true,   -- drives the §37.4 disclosure
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table artworks (
  id                    uuid primary key default gen_random_uuid(),
  artist_id             uuid not null references artists(id) on delete cascade,
  title                 text not null,
  slug                  text not null unique,
  description           text,
  artist_note           text,
  image_url             text not null,
  thumbnail_url         text not null,
  blur_data_url         text,                    -- §37.3 base64 placeholder
  image_credit          text,                    -- required when licensed, not generated
  alt_text              text not null,           -- §45, generated at seed time
  medium                text not null,
  materials             text,
  year_created          smallint,
  styles                text[] not null check (styles <@ valid_styles()),
  colors                text[] not null check (colors <@ valid_colors()),
  moods                 text[] not null check (moods  <@ valid_moods()),
  -- §9.4: never empty, NEVER 'any'. A piece tagged for zero rooms is a bug.
  rooms                 text[] not null check (rooms  <@ valid_rooms()),
  boldness              smallint not null check (boldness between 1 and 10),
  width_in              numeric(6,2) not null check (width_in > 0),
  height_in             numeric(6,2) not null check (height_in > 0),
  size_category         size_category not null,  -- DERIVED from dimensions, §9.5
  rental_1m_cents       integer not null,
  rental_3m_cents       integer not null,
  rental_6m_cents       integer not null,
  rental_12m_cents      integer not null,
  purchase_price_cents  integer not null,
  availability          artwork_availability not null default 'available',
  featured              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint tags_present  check (array_length(styles,1) >= 1
                              and array_length(colors,1) >= 1
                              and array_length(moods,1)  >= 1
                              and array_length(rooms,1)  >= 1),

  -- §7.2 monotonic ladder. A rental must cost more the longer you keep it...
  constraint ladder_order  check (rental_1m_cents  < rental_3m_cents
                              and rental_3m_cents  < rental_6m_cents
                              and rental_6m_cents  < rental_12m_cents
                              and rental_12m_cents < purchase_price_cents),

  -- ...and less PER MONTH. Cross-multiplied to stay in integers.
  constraint ladder_value  check (rental_3m_cents  * 1 < rental_1m_cents * 3
                              and rental_6m_cents  * 3 < rental_3m_cents * 6
                              and rental_12m_cents * 6 < rental_6m_cents * 12),

  -- §9.5 size_category must agree with the dimensions it was derived from.
  -- Seed data and filters cannot disagree if the database refuses to let them.
  constraint size_derived check (
    size_category = case
      when greatest(width_in, height_in) <= 18 then 'small'::size_category
      when greatest(width_in, height_in) <= 30 then 'medium'::size_category
      when greatest(width_in, height_in) <= 48 then 'large'::size_category
      else 'oversized'::size_category end
  )
);

-- §31.4: created before `rentals`, which references it.
create table mystery_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  piece_type             mystery_piece_type not null,
  number_of_pieces       smallint not null check (number_of_pieces between 1 and 4),
  size                   size_category not null,          -- resolved from custom dims if given
  custom_width_in        numeric(6,2) check (custom_width_in  is null or custom_width_in  > 0),
  custom_height_in       numeric(6,2) check (custom_height_in is null or custom_height_in > 0),
  styles                 text[] not null default '{}' check (styles <@ valid_styles()),
  colors                 text[] not null default '{}' check (colors <@ valid_colors()),
  room                   text not null check (room = 'any' or room = any(valid_rooms())),
  boldness               smallint not null check (boldness between 1 and 10),
  budget_band            budget_band not null,
  budget_min_cents       integer not null,
  budget_max_cents       integer not null,
  special_requests       text check (special_requests is null or length(special_requests) <= 500),
  monthly_price_cents    integer not null check (monthly_price_cents >= 0),
  -- §25.4: stamped so an existing subscriber's price does not silently move
  -- when the rate table changes.
  pricing_config_version text not null,
  status                 mystery_status not null default 'matching',
  cycle                  smallint not null default 1 check (cycle >= 1),
  minimum_term_months    smallint not null default 3,
  current_period_start   date not null,
  current_period_end     date not null,
  next_rotation_at       date not null,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint period_order check (current_period_end > current_period_start)
);

create table rentals (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references profiles(id) on delete cascade,
  artwork_id              uuid not null references artworks(id),
  source                  rental_source not null default 'library',
  mystery_subscription_id uuid references mystery_subscriptions(id) on delete set null,
  status                  rental_status not null default 'active',
  start_date              date not null,
  end_date                date not null,
  ended_at                date,
  -- cumulative; extensions sum into this (§19.4)
  rental_period_months    smallint not null check (rental_period_months between 1 and 24),
  -- §26.3: 0 for source='mystery'. Billing lives on the subscription, NOT the
  -- rental. Analytics must read Mystery revenue from `mystery_subscriptions`
  -- and never sum rental prices, or Mystery revenue vanishes from every report.
  price_cents             integer not null check (price_cents >= 0),
  -- §7.3: snapshotted at creation so historical earnings never move.
  artist_share_rate       numeric(4,3) not null default 0.600,
  extensions              jsonb not null default '[]',
  return_reason           return_reason,
  return_note             text check (return_note is null or length(return_note) <= 200),
  contact_name            text not null,
  contact_email           text not null,
  shipping_address        jsonb not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint date_order   check (end_date > start_date),
  constraint mystery_is_free check (source <> 'mystery' or price_cents = 0),
  constraint mystery_has_subscription check (source <> 'mystery' or mystery_subscription_id is not null)
);

-- ONE ACTIVE RENTAL PER ARTWORK.
--
-- Scoped to 'active' only: an 'ending' rental means the piece is notionally in
-- transit back and its artwork is already 'available' (§23.1), so it must not
-- block the next renter — mystery rotation (§26.5) depends on this.
--
-- This is the inventory backstop behind the §17.3 availability re-check, and
-- the thing that makes §48's "two browsers cannot rent the same artwork" true
-- even if application code has a race.
create unique index one_active_rental_per_artwork
  on rentals (artwork_id) where status = 'active';

create table purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  -- unique: one physical piece, one sale. §23.1 makes `sold` terminal.
  artwork_id        uuid not null unique references artworks(id),
  rental_id         uuid references rentals(id) on delete set null,
  price_cents       integer not null check (price_cents >= 0),
  artist_share_rate numeric(4,3) not null default 0.700,
  shipping_address  jsonb not null,
  created_at        timestamptz not null default now()
);

create table favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  artwork_id uuid not null references artworks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, artwork_id)
);

create table mystery_matches (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references mystery_subscriptions(id) on delete cascade,
  cycle           smallint not null default 1,
  kind            text not null check (kind in ('curated','commission')),
  artist_id       uuid not null references artists(id),
  artwork_id      uuid references artworks(id),      -- null for commissions (§27.3)
  match_score     smallint not null check (match_score between 0 and 100),
  selected        boolean not null default false,
  revealed_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint commission_has_no_artwork check (kind <> 'commission' or artwork_id is null),
  constraint curated_has_artwork       check (kind <> 'curated'    or artwork_id is not null)
);

-- ONE TABLE, NOT TWO. v1.0 had `interactions` for the recommender and an
-- unbacked analytics event list (§0.1 defect #30). Dual-writing the same fact to
-- two tables guarantees drift. One `events` log, plus the materialised
-- `user_affinity` rollup that the recommender actually reads on every request.
--
-- §42: NO PII IN THE PAYLOAD. IDs only.
create table events (
  id         bigserial primary key,
  user_id    uuid references profiles(id) on delete set null,
  artwork_id uuid references artworks(id) on delete set null,
  artist_id  uuid references artists(id)  on delete set null,
  event_type text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §31.3 Indexes
-- ---------------------------------------------------------------------------
create index artworks_styles_gin on artworks using gin (styles);
create index artworks_colors_gin on artworks using gin (colors);
create index artworks_moods_gin  on artworks using gin (moods);
create index artworks_rooms_gin  on artworks using gin (rooms);
create index artworks_avail_size on artworks (availability, size_category);
create index artworks_artist     on artworks (artist_id);
create index artworks_featured   on artworks (featured, created_at desc);
create index rentals_user        on rentals  (user_id, status);
create index rentals_artwork     on rentals  (artwork_id, status);
create index events_user         on events   (user_id, event_type, created_at desc);
create index favorites_user      on favorites (user_id, created_at desc);
create index mystery_matches_sub on mystery_matches (subscription_id, cycle);

-- §29.1 search: title, artist name, medium. A single ILIKE/tsvector query is
-- sufficient — no semantic search.
create index artworks_title_trgm on artworks using gin (title gin_trgm_ops);
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- §32.3 Row Level Security — enabled on EVERY table.
--
-- Every mutation additionally goes through a Next.js server action that
-- re-derives auth.uid() server-side. RLS is the BACKSTOP, not the primary
-- check. Never trust a user_id sent from the client (§32.3).
-- ---------------------------------------------------------------------------
alter table profiles              enable row level security;
alter table user_preferences      enable row level security;
alter table user_affinity         enable row level security;
alter table artists               enable row level security;
alter table artworks              enable row level security;
alter table rentals               enable row level security;
alter table purchases             enable row level security;
alter table favorites             enable row level security;
alter table mystery_subscriptions enable row level security;
alter table mystery_matches       enable row level security;
alter table events                enable row level security;

create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

/** True when the current user owns the `artists` row backing this artwork. */
create or replace function owns_artist(a_id uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from artists where id = a_id and user_id = auth.uid()) $$;

-- artists / artworks: public read, owner-artist or admin write.
create policy artists_read   on artists  for select using (true);
create policy artists_write  on artists  for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

create policy artworks_read  on artworks for select using (true);
create policy artworks_write on artworks for all
  using (owns_artist(artist_id) or is_admin())
  with check (owns_artist(artist_id) or is_admin());

-- profiles / preferences / affinity / favorites: self only.
create policy profiles_self    on profiles         for all using (id = auth.uid())      with check (id = auth.uid());
create policy prefs_self       on user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy affinity_self    on user_affinity    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_self   on favorites        for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- rentals / purchases: self, plus the artist may READ rows for their own works.
create policy rentals_read on rentals for select using (
  user_id = auth.uid()
  or is_admin()
  or exists (select 1 from artworks aw where aw.id = rentals.artwork_id and owns_artist(aw.artist_id))
);
create policy rentals_write on rentals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy purchases_read on purchases for select using (
  user_id = auth.uid()
  or is_admin()
  or exists (select 1 from artworks aw where aw.id = purchases.artwork_id and owns_artist(aw.artist_id))
);
create policy purchases_write on purchases for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- mystery: self.
create policy mystery_subs_self on mystery_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy mystery_matches_self on mystery_matches for all
  using (exists (select 1 from mystery_subscriptions s where s.id = subscription_id and s.user_id = auth.uid()))
  with check (exists (select 1 from mystery_subscriptions s where s.id = subscription_id and s.user_id = auth.uid()));

-- events: admin reads; any authenticated user may insert their OWN row.
create policy events_admin_read on events for select using (is_admin());
create policy events_self_write on events for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- §17.3 / §23.3 Concurrency.
--
-- "Two laptops open on the demo table will find it if it's missing."
--
-- Locks the artwork row, re-checks availability INSIDE the transaction, and
-- flips it atomically. Returns false if someone else got there first, so the
-- caller can render §41.2 instead of creating an orphaned rental.
-- ---------------------------------------------------------------------------
create or replace function claim_artwork(
  p_artwork_id uuid,
  p_from artwork_availability,
  p_to   artwork_availability
) returns boolean language plpgsql as $$
declare v_current artwork_availability;
begin
  select availability into v_current from artworks where id = p_artwork_id for update;
  if v_current is null or v_current <> p_from then
    return false;
  end if;
  update artworks set availability = p_to, updated_at = now() where id = p_artwork_id;
  return true;
end $$;

-- New profile rows follow auth.users automatically.
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();
