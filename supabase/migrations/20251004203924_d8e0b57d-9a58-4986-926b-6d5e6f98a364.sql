-- Create project_media table for storing photos/videos with location metadata
create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  
  -- File storage
  file_url text not null,
  file_name text not null,
  file_type text not null check (file_type in ('image', 'video')),
  mime_type text not null,
  file_size bigint not null,
  
  -- Media metadata
  caption text,
  description text,
  
  -- Location data (from device GPS or EXIF)
  taken_at timestamp with time zone,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  location_name text,
  altitude decimal(10, 2),
  
  -- Device/upload metadata
  device_model text,
  uploaded_by uuid references auth.users(id) on delete set null,
  upload_source text check (upload_source in ('camera', 'gallery', 'web')),
  
  -- Timestamps
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for performance
create index idx_project_media_project_id on public.project_media(project_id);
create index idx_project_media_taken_at on public.project_media(taken_at);
create index idx_project_media_uploaded_by on public.project_media(uploaded_by);
create index idx_project_media_file_type on public.project_media(file_type);

-- Enable RLS
alter table public.project_media enable row level security;

-- Trigger for updated_at
create trigger update_project_media_updated_at
  before update on public.project_media
  for each row
  execute function public.update_updated_at_column();

-- RLS Policies for project_media table
create policy "Users can view project media"
  on public.project_media
  for select
  to authenticated
  using (true);

create policy "Users can upload project media"
  on public.project_media
  for insert
  to authenticated
  with check (uploaded_by = auth.uid());

create policy "Users can update their own media"
  on public.project_media
  for update
  to authenticated
  using (uploaded_by = auth.uid());

create policy "Users can delete their own media"
  on public.project_media
  for delete
  to authenticated
  using (uploaded_by = auth.uid());

-- Create storage bucket for project media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media',
  'project-media',
  false,
  157286400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]
);

-- RLS Policies for project-media storage bucket
create policy "Users can upload project media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view project media"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'project-media');

create policy "Users can delete their own media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );