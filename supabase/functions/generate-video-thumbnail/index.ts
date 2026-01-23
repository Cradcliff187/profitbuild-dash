import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mediaId, videoPath } = await req.json();

    if (!mediaId || !videoPath) {
      throw new Error('mediaId and videoPath are required');
    }

    console.log('Generating thumbnail for:', { mediaId, videoPath });

    // Download video from storage
    const { data: videoData, error: downloadError } = await supabase
      .storage
      .from('project-media')
      .download(videoPath);

    if (downloadError || !videoData) {
      throw new Error(`Failed to download video: ${downloadError?.message}`);
    }

    // Convert blob to array buffer for FFmpeg
    const videoBuffer = await videoData.arrayBuffer();
    const videoBytes = new Uint8Array(videoBuffer);

    // Use FFmpeg to extract thumbnail
    // Command: ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -vf scale=320:180 output.jpg
    const command = new Deno.Command('ffmpeg', {
      args: [
        '-i', 'pipe:0',           // Read from stdin
        '-ss', '00:00:01',        // Seek to 1 second
        '-vframes', '1',          // Extract 1 frame
        '-vf', 'scale=320:180',   // Resize to 320x180
        '-f', 'image2',           // Output format
        'pipe:1'                  // Write to stdout
      ],
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped',
    });

    const process = command.spawn();

    // Write video data to stdin
    const writer = process.stdin.getWriter();
    await writer.write(videoBytes);
    await writer.close();

    // Read thumbnail from stdout
    const { code, stdout, stderr } = await process.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error('FFmpeg error:', errorText);
      throw new Error(`FFmpeg failed with code ${code}`);
    }

    // Upload thumbnail to storage
    const thumbnailFileName = `${mediaId}.jpg`;
    const thumbnailPath = `thumbnails/${thumbnailFileName}`;

    const { error: uploadError } = await supabase
      .storage
      .from('project-media-thumbnails')
      .upload(thumbnailPath, stdout, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
    }

    // Get signed URL for thumbnail
    const { data: signedUrlData } = await supabase
      .storage
      .from('project-media-thumbnails')
      .createSignedUrl(thumbnailPath, 60 * 60 * 24 * 365); // 1 year

    const thumbnailUrl = signedUrlData?.signedUrl;

    // Update project_media with thumbnail URL
    const { error: updateError } = await supabase
      .from('project_media')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', mediaId);

    if (updateError) {
      throw new Error(`Failed to update media record: ${updateError.message}`);
    }

    console.log('Thumbnail generated successfully:', { mediaId, thumbnailUrl });

    return new Response(
      JSON.stringify({ success: true, thumbnailUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating thumbnail:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
