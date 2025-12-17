-- Fix existing quote attachment_url (uploaded before auto-update fix)
UPDATE quotes 
SET attachment_url = 'https://clsjdxwbsjbhjibvlqbz.supabase.co/storage/v1/object/public/project-documents/a96c5573-f7bc-456f-9fbb-af0e54084e7e/quotes/1765971708801-A_B_Flooring__2_.pdf'
WHERE id = '5fa48404-e812-481c-adb7-b79f5938184e';