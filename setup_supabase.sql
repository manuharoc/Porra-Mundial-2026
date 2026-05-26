-- =======================================================
-- PORRA MUNDIAL 2026 - Script de configuracion Supabase
-- Ejecutar completo en: Supabase > SQL Editor > New query
-- =======================================================

-- Ligas
create table if not exists ligas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  created_at timestamptz default now()
);

-- Participantes
create table if not exists participantes (
  id uuid primary key default gen_random_uuid(),
  liga_id uuid references ligas(id) on delete cascade,
  nombre text not null,
  emoji text default ':)',
  avatar_bg text,
  avatar_color text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  unique(liga_id, nombre)
);

-- Predicciones de fase de grupos
create table if not exists predicciones_grupos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid references participantes(id) on delete cascade,
  match_key text not null,
  goles_local integer,
  goles_visitante integer,
  created_at timestamptz default now(),
  unique(participante_id, match_key)
);

-- Predicciones de eliminatorias
create table if not exists predicciones_elim (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid references participantes(id) on delete cascade,
  match_code text not null,
  ganador text,
  created_at timestamptz default now(),
  unique(participante_id, match_code)
);

-- Predicciones especiales
create table if not exists predicciones_especiales (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid references participantes(id) on delete cascade,
  tipo text not null,
  valor text,
  registrado_at timestamptz default now(),
  unique(participante_id, tipo)
);

-- Resultados globales (los introduce el superadmin, valen para TODAS las ligas)
-- tipo: 'grupos' | 'elim' | 'especiales'
-- match_key: clave del partido (ej: 'GA_1', 'M73', 'campeon')
-- valor: jsonb con los datos (ej: {"gl":2,"gv":1} o "España")
create table if not exists resultados_globales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  match_key text not null,
  valor jsonb,
  updated_at timestamptz default now(),
  unique(tipo, match_key)
);

-- Normas y puntuacion
create table if not exists normas (
  id uuid primary key default gen_random_uuid(),
  liga_id uuid references ligas(id) on delete cascade,
  tipo text not null,
  datos jsonb not null,
  orden integer default 0
);

-- Desactivar RLS (app de confianza entre amigos, sin autenticacion formal)
alter table ligas disable row level security;
alter table participantes disable row level security;
alter table predicciones_grupos disable row level security;
alter table predicciones_elim disable row level security;
alter table predicciones_especiales disable row level security;
alter table resultados_globales disable row level security;
alter table normas disable row level security;

-- Habilitar Realtime en las tablas clave
alter publication supabase_realtime add table participantes;
alter publication supabase_realtime add table predicciones_grupos;
alter publication supabase_realtime add table predicciones_elim;
alter publication supabase_realtime add table predicciones_especiales;
alter publication supabase_realtime add table resultados_globales;

