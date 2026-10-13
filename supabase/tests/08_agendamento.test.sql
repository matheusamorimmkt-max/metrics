-- Agendamento: configuração no Vault e permissões. pg_cron/pg_net não existem no
-- Postgres local, então o disparo só é testado até a checagem da extensão.
begin;
set client_min_messages to warning;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@teste.com');

select has_function('public', 'configurar_agendamento', array['text', 'text'], 'função configurar_agendamento');
select has_function('public', 'disparar_ciclo_agendado', array['text'], 'função disparar_ciclo_agendado');
select is(public.conector_da_integracao('meta'), 'meta-sync', 'meta → meta-sync');
select is(public.conector_da_integracao('greenn'), null, 'greenn ainda sem conector');

-- Usuário comum não configura nem dispara
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;
select throws_ok(
  $$select public.configurar_agendamento('https://x.supabase.co/functions/v1', 'chave-de-teste-longa-o-bastante')$$,
  '42501', null, 'authenticated não configura o agendamento'
);
reset role;

-- service_role configura: segredos vão para o Vault
do $$ begin perform set_config('request.jwt.claims', '{"role":"service_role"}', true); end $$;
set local role service_role;
select alike(
  public.configurar_agendamento('https://x.supabase.co/functions/v1/', 'chave-de-teste-longa-o-bastante'),
  '%Segredos salvos%', 'sem pg_cron local, salva os segredos e avisa'
);
reset role;
select is(
  (select decrypted_secret from vault.decrypted_secrets where name = 'app/url_funcoes'),
  'https://x.supabase.co/functions/v1', 'URL salva no Vault sem a barra final'
);

select * from finish();
rollback;
