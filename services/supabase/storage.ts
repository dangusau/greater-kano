import { supabase } from './client';

export const storageService = {
  async uploadMarketplaceImages(files: File[], userId: string): Promise<string[]> {
    const imageUrls: string[] = [];
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `marketplace/${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('marketplace-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('marketplace-images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    
    return imageUrls;
  },

  async uploadPostImages(files: File[], userId: string): Promise<string[]> {
    const imageUrls: string[] = [];
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `posts/${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading post image:', error);
        throw error;
      }
    }
    
    return imageUrls;
  },

  async uploadBusinessImages(files: File[], userId: string): Promise<string[]> {
    const imageUrls: string[] = [];
    
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `business/${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('business-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('business-images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading business image:', error);
        throw error;
      }
    }
    
    return imageUrls;
  },

  async deleteImage(fileUrl: string): Promise<void> {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userId = urlParts[urlParts.length - 2];
      const folder = urlParts[urlParts.length - 3];
      const filePath = `${folder}/${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('marketplace-images')
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  },

  async getStorageStats(): Promise<{ used: number; available: number }> {
    return { used: 0, available: 1024 * 1024 * 100 };
  }
};