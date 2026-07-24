-- =============================================================
-- INSEN funnel — migration initiale (schéma PRD §4.2)
-- Applique : tables leads + lead_events, trigger updated_at, index, RLS.
-- =============================================================

-- Table centrale : un lead = une personne/organisation entrée dans le funnel
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- identité
  full_name text not null,
  email text not null,
  phone text,                          -- format libre, indicatif +213 suggéré à l'UI
  company text,
  -- qualification (formulaire /projet)
  sector text check (sector in ('tourisme_hospitalite','sante_bienetre_formation','nouveaux_concepts','autre')),
  project_summary text,                -- "le projet en une phrase"
  maturity text check (maturity in ('explore','cahier_des_charges','compare')),
  timeline text check (timeline in ('moins_1_mois','1_3_mois','pas_presse')),
  referral_source text,                -- "comment vous nous avez connus" (déclaratif)
  -- attribution (capturée automatiquement)
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  landing_path text,                   -- première page vue côté app
  referrer text,
  -- cycle de vie
  status text not null default 'nouveau'
    check (status in ('nouveau','call_reserve','call_effectue','proposition','signe','perdu','non_qualifie')),
  channel text not null default 'site' check (channel in ('site','outbound','referral','autre')),
  notes text
);

-- Journal d'événements : chaque étape du funnel est un fait horodaté
create table lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid references leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in
    ('form_submitted','booking_created','booking_rescheduled','booking_cancelled',
     'call_completed','status_changed','note_added')),
  payload jsonb                        -- données brutes (Cal.com webhook, ancien/nouveau statut…)
);

-- Trigger updated_at sur leads
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- Index
create index idx_leads_status      on leads(status);
create index idx_leads_created_at   on leads(created_at desc);
create index idx_lead_events_lead   on lead_events(lead_id);

-- RLS : tout est fermé par défaut
alter table leads       enable row level security;
alter table lead_events enable row level security;

-- Aucune policy anon. L'insertion publique passe EXCLUSIVEMENT par une route API
-- server-side (service role), qui bypass RLS. Le back-office /admin lit/écrit via
-- le rôle authenticated.
create policy "admin read leads"    on leads       for select to authenticated using (true);
create policy "admin update leads"  on leads       for update to authenticated using (true) with check (true);
create policy "admin read events"   on lead_events for select to authenticated using (true);
