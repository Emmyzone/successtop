-- SuccessTop: admin helpers (run after 001-004). Safe to run more than once.
-- Lets the main admin see staff email addresses on the Staff page.
-- Emails live in auth.users, which the browser cannot read directly, so this
-- function checks the caller is an active admin before returning anything.

create or replace function public.bst_list_staff()
returns table (id uuid, email text, full_name text, role text, is_active boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.bst_is_admin() then
    raise exception 'not_allowed';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.is_active, p.created_at
    from public.bst_profiles p
    join auth.users u on u.id = p.id
    order by p.created_at;
end $$;

revoke all on function public.bst_list_staff() from public, anon;
grant execute on function public.bst_list_staff() to authenticated;
