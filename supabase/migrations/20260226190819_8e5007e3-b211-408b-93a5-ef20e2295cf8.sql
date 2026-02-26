-- Fix: Postgres doesn't support CREATE POLICY IF NOT EXISTS

-- 1) Storage bucket for resumes
insert into storage.buckets (id, name, public)
values ('talent-resumes', 'talent-resumes', false)
on conflict (id) do update set public = excluded.public;

-- 2) Applications table
create table if not exists public.talent_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'novo',

  full_name text not null,
  phone text not null,
  email text not null,
  area_of_interest text not null,
  experience text null,
  notes text null,

  resume_path text null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.talent_applications enable row level security;

-- Policies: public.talent_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'talent_applications'
      AND policyname = 'Public can submit talent applications'
  ) THEN
    EXECUTE $pol$
      create policy "Public can submit talent applications"
      on public.talent_applications
      for insert
      to anon, authenticated
      with check (
        length(trim(full_name)) between 2 and 120
        and length(trim(phone)) between 8 and 30
        and position('@' in trim(email)) > 1
        and length(trim(email)) <= 255
        and length(trim(area_of_interest)) between 2 and 80
        and (experience is null or length(trim(experience)) <= 2000)
        and (notes is null or length(trim(notes)) <= 2000)
        and (resume_path is null or length(trim(resume_path)) <= 500)
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'talent_applications'
      AND policyname = 'Admins can read talent applications'
  ) THEN
    EXECUTE $pol$
      create policy "Admins can read talent applications"
      on public.talent_applications
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'))
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'talent_applications'
      AND policyname = 'Admins can update talent applications'
  ) THEN
    EXECUTE $pol$
      create policy "Admins can update talent applications"
      on public.talent_applications
      for update
      to authenticated
      using (public.has_role(auth.uid(), 'admin'))
      with check (public.has_role(auth.uid(), 'admin'))
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'talent_applications'
      AND policyname = 'Admins can delete talent applications'
  ) THEN
    EXECUTE $pol$
      create policy "Admins can delete talent applications"
      on public.talent_applications
      for delete
      to authenticated
      using (public.has_role(auth.uid(), 'admin'))
    $pol$;
  END IF;
END $$;

-- Policies: storage.objects (bucket talent-resumes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can upload talent resumes'
  ) THEN
    EXECUTE $pol$
      create policy "Public can upload talent resumes"
      on storage.objects
      for insert
      to anon, authenticated
      with check (bucket_id = 'talent-resumes')
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can read talent resumes'
  ) THEN
    EXECUTE $pol$
      create policy "Admins can read talent resumes"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'talent-resumes' and public.has_role(auth.uid(), 'admin'))
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete talent resumes'
  ) THEN
    EXECUTE $pol$
      create policy "Admins can delete talent resumes"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'talent-resumes' and public.has_role(auth.uid(), 'admin'))
    $pol$;
  END IF;
END $$;
