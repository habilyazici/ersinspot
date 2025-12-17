import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485`;

/**
 * Upload a product image to Supabase Storage
 */
export async function uploadProductImage(file: File): Promise<{
  success: boolean;
  url?: string;
  path?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Image upload failed:', data);
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }

    console.log('✅ Image uploaded successfully:', data.url);
    return data;
  } catch (error: any) {
    console.error('Exception during image upload:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Delete a product image from Supabase Storage
 */
export async function deleteProductImage(path: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/delete-image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ path }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Image delete failed:', data);
      return {
        success: false,
        error: data.error || 'Delete failed',
      };
    }

    console.log('✅ Image deleted successfully:', path);
    return data;
  } catch (error: any) {
    console.error('Exception during image delete:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Get all uploaded product images
 */
export async function listProductImages(): Promise<{
  success: boolean;
  images?: Array<{
    name: string;
    path: string;
    url: string;
    size: number;
    createdAt: string;
    updatedAt: string;
  }>;
  count?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/images`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Image list failed:', data);
      return {
        success: false,
        error: data.error || 'Failed to list images',
      };
    }

    return data;
  } catch (error: any) {
    console.error('Exception during image list:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Upload multiple images at once
 */
export async function uploadMultipleImages(files: File[]): Promise<{
  success: boolean;
  results: Array<{
    file: string;
    url?: string;
    error?: string;
  }>;
}> {
  const results = await Promise.all(
    files.map(async (file) => {
      const result = await uploadProductImage(file);
      return {
        file: file.name,
        url: result.url,
        error: result.error,
      };
    })
  );

  const allSuccess = results.every((r) => !r.error);

  return {
    success: allSuccess,
    results,
  };
}
