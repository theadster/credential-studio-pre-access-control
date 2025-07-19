export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
      return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

export function generateInternalFieldName(fieldName: string): string {
  return fieldName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}