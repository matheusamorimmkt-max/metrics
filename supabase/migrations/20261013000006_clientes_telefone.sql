-- Telefone do comprador (vem do gateway; mostrado só nas listas de destaque da aba Clientes).
alter table public.clientes add column if not exists telefone text
  check (telefone is null or length(telefone) between 3 and 40);
