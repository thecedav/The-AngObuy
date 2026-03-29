import { supabase } from '../lib/supabaseClient';

// 12. STORAGE INTEGRATION (CRITICAL)
export const uploadFile = async (
  bucket: 'profiles' | 'products' | 'services' | 'stores' | 'documents',
  folderId: string,
  file: File
) => {
  try {
    // 14. FILE NAMING STANDARD
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExt}`;
    
    // Path structure: bucket/folderId/fileName
    const path = `${folderId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return { data, error: null, path };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { data: null, error, path: null };
  }
};

// 13. GET PUBLIC IMAGE URL
export const getPublicImageUrl = (
  bucket: 'profiles' | 'products' | 'services' | 'stores' | 'documents',
  path: string | null | undefined
) => {
  if (!path) {
    // Fallback image if null
    return 'https://picsum.photos/seed/placeholder/800/600';
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  
  // Basic validation for broken URLs (though getPublicUrl usually returns something)
  if (!data.publicUrl) {
    return 'https://picsum.photos/seed/placeholder/800/600';
  }

  return data.publicUrl;
};
