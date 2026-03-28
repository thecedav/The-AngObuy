/**
 * CDN Utility to transform image URLs for optimization.
 * In a real scenario, this would point to Cloudflare, CloudFront, or Vercel CDN.
 */

const CDN_DOMAIN = import.meta.env.VITE_CDN_DOMAIN || ''; // e.g., 'https://cdn.example.com'

export const getOptimizedImageUrl = (url: string, options: { width?: number; height?: number; quality?: number; format?: 'webp' | 'avif' } = {}) => {
  if (!url) return '';
  
  // If no CDN is configured, return the original URL
  if (!CDN_DOMAIN) return url;

  // If the URL is already from the CDN, don't double-process
  if (url.startsWith(CDN_DOMAIN)) return url;

  // Skip data URLs (base64)
  if (url.startsWith('data:')) return url;

  // Example transformation logic for a generic CDN (like Cloudinary or Imgix style)
  const { width, height, quality = 80, format = 'webp' } = options;
  
  // Construct CDN URL with optimization parameters
  // This is a placeholder for how you'd typically structure it
  let optimizedUrl = `${CDN_DOMAIN}/${encodeURIComponent(url)}?auto=format&q=${quality}`;
  
  if (width) optimizedUrl += `&w=${width}`;
  if (height) optimizedUrl += `&h=${height}`;
  if (format) optimizedUrl += `&fm=${format}`;

  return optimizedUrl;
};
