import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ReceiptDownloadData {
  id: string;
  attachment_url: string;
  worker_name: string;
  project_number: string;
  expense_date: string;
  hours: number;
}

/**
 * Download a single receipt file
 */
export const downloadSingleReceipt = async (url: string, filename: string) => {
  try {
    // If it's a Supabase storage URL, get the signed URL
    let downloadUrl = url;
    
    if (url.includes('supabase.co/storage')) {
      // Extract bucket and path from URL
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length > 1) {
        const [bucket, ...pathParts] = urlParts[1].split('/');
        const path = pathParts.join('/');
        
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60); // 60 second expiry
        
        if (data?.signedUrl) {
          downloadUrl = data.signedUrl;
        }
      }
    }

    // Fetch the image
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    
    // Create download link
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Failed to download receipt:', error);
    throw error;
  }
};

/**
 * Download multiple receipts as a ZIP file
 */
export const downloadReceiptsAsZip = async (
  receipts: ReceiptDownloadData[],
  zipFilename: string
) => {
  try {
    const zip = new JSZip();
    
    // Download all receipts and add to ZIP
    for (const receipt of receipts) {
      try {
        // Get signed URL if needed
        let downloadUrl = receipt.attachment_url;
        
        if (receipt.attachment_url.includes('supabase.co/storage')) {
          const urlParts = receipt.attachment_url.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const path = pathParts.join('/');
            
            const { data } = await supabase.storage
              .from(bucket)
              .createSignedUrl(path, 60);
            
            if (data?.signedUrl) {
              downloadUrl = data.signedUrl;
            }
          }
        }

        // Fetch image blob
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        
        // Generate filename
        const dateStr = format(new Date(receipt.expense_date), 'yyyy-MM-dd');
        const sanitizedName = receipt.worker_name.replace(/[^a-zA-Z0-9]/g, '_');
        const extension = receipt.attachment_url.split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `receipt_${sanitizedName}_${dateStr}.${extension}`;
        
        // Add to ZIP
        zip.file(filename, blob);
      } catch (error) {
        console.error(`Failed to add receipt ${receipt.id} to ZIP:`, error);
        // Continue with other receipts
      }
    }
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Download ZIP
    const blobUrl = window.URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Failed to create ZIP file:', error);
    throw error;
  }
};
