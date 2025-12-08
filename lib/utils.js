import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Helper function to create page URLs
// Note: Routes are defined with PascalCase (e.g., /Dashboard, /Documents)
export function createPageUrl(pageName, params = {}) {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  // Keep the original case to match route definitions
  const baseUrl = `/${pageName}`;
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
