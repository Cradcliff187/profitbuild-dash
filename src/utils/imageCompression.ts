interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
}

/**
 * Compress an image file using Canvas API
 * Reduces file size while maintaining acceptable quality for construction site photos
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    targetSizeKB = 500
  } = options;

  // Skip compression for small images
  if (file.size < targetSizeKB * 1024) {
    console.log('✅ Image already small enough:', (file.size / 1024).toFixed(0), 'KB');
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          const originalKB = (file.size / 1024).toFixed(0);
          const compressedKB = (compressedFile.size / 1024).toFixed(0);
          const savings = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
          console.log(`📦 Compressed: ${originalKB}KB → ${compressedKB}KB (${savings}% reduction)`);

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
