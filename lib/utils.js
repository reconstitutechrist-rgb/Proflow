import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Helper function to create page URLs
export function createPageUrl(pageName, params = {}) {
  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  const baseUrl = `/${pageName.toLowerCase()}`;
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
} 