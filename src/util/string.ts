export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
      return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

export function generateBarcode(type: string, length: number): string {
  let result = '';
  
  if (type === 'numerical') {
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
  } else {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  return result;
}

export function generateInternalFieldName(fieldName: string): string {
  if (!fieldName) return '';
  
  return fieldName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}