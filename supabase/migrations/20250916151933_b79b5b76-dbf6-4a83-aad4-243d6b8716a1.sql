-- Create storage bucket for quote attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-attachments', 'quote-attachments', false);

-- Create RLS policies for quote attachments
CREATE POLICY "Users can view their own quote attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'quote-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own quote attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'quote-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own quote attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'quote-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own quote attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'quote-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);