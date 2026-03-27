-- Credit cards table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

create table if not exists public.user_credit_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  bank          text not null default 'Otro',
  last_four     text,
  tan           numeric(6,2) default 0,
  tae           numeric(6,2) default 0,
  credit_limit  numeric(20,2) default 0,
  currency      text default 'PYG',
  closing_day   smallint default 1,
  due_day       smallint default 15,
  annual_fee    numeric(20,2) default 0,
  notes         text,
  -- Latest statement snapshot (updated each time a PDF is loaded)
  statement_date         date,
  due_date               date,
  credit_available       numeric(20,2),
  previous_debt          numeric(20,2) default 0,
  payments               numeric(20,2) default 0,
  financed_balance       numeric(20,2) default 0,
  purchases_charges      numeric(20,2) default 0,
  total_debt             numeric(20,2) default 0,
  minimum_payment        numeric(20,2) default 0,
  interest               numeric(20,2) default 0,
  punitory               numeric(20,2) default 0,
  iva_on_charges         numeric(20,2) default 0,
  total_financial_charges numeric(20,2) default 0,
  days_in_default        smallint default 0,
  card_holder            text,
  card_number_masked     text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Row Level Security
alter table public.user_credit_cards enable row level security;

create policy "Users manage own cards"
  on public.user_credit_cards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger credit_cards_updated_at
  before update on public.user_credit_cards
  for each row execute function public.set_updated_at();
