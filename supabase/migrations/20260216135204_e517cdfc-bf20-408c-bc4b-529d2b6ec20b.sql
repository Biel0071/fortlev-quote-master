-- Update has_role to support bootstrap via admin_allowlist
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- bootstrap: any authenticated user whose email is allowlisted is admin
    (
      _role = 'admin'
      and exists (
        select 1
        from public.admin_allowlist a
        where a.email = (auth.jwt() ->> 'email')
      )
    )
    or exists (
      select 1
      from public.user_roles
      where user_id = _user_id
        and role = _role
    )
$$;

-- Allow a user to check if THEY are allowlisted (without exposing full list)
drop policy if exists "Admins can read allowlist" on public.admin_allowlist;
drop policy if exists "Admins can manage allowlist" on public.admin_allowlist;

create policy "Users can read own allowlist row"
on public.admin_allowlist
for select
to authenticated
using (email = (auth.jwt() ->> 'email'));

create policy "Admins can manage allowlist"
on public.admin_allowlist
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Seed initial admin email
insert into public.admin_allowlist(email)
values ('liderv813@gmail.com')
on conflict (email) do nothing;