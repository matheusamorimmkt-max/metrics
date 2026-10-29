-- Colunas de orçamento (verba) em campanhas e conjuntos.
begin;
set client_min_messages to warning;
select plan(4);

select has_column('public', 'campanhas', 'verba_diaria', 'campanhas.verba_diaria existe');
select has_column('public', 'campanhas', 'verba_total', 'campanhas.verba_total existe');
select has_column('public', 'conjuntos', 'verba_diaria', 'conjuntos.verba_diaria existe');
select has_column('public', 'conjuntos', 'verba_total', 'conjuntos.verba_total existe');

select * from finish();
rollback;
