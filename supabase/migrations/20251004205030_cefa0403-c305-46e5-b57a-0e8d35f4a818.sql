-- Add DELETE policy for project-media storage bucket
create policy "Users can delete their own media files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );