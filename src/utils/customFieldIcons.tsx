/**
 * Custom Field Icon Utilities
 * 
 * Provides consistent icon mapping and labeling for custom field types
 * across the application.
 */

import {
  Type,
  Hash,
  Mail,
  Link,
  Calendar,
  ChevronDown,
  ToggleLeft,
  FileText
} from 'lucide-react';

/**
 * Get the appropriate icon component for a custom field type
 * 
 * @param fieldType - The type of custom field (text, number, email, etc.)
 * @returns JSX element with the appropriate icon
 */
export function getCustomFieldIcon(fieldType: string) {
  switch (fieldType) {
    case 'text':
      return <Type className="h-4 w-4 text-muted-foreground" />;
    case 'number':
      return <Hash className="h-4 w-4 text-muted-foreground" />;
    case 'email':
      return <Mail className="h-4 w-4 text-muted-foreground" />;
    case 'url':
      return <Link className="h-4 w-4 text-muted-foreground" />;
    case 'date':
      return <Calendar className="h-4 w-4 text-muted-foreground" />;
    case 'select':
      return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    case 'boolean':
      return <ToggleLeft className="h-4 w-4 text-muted-foreground" />;
    case 'textarea':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Get the human-readable label for a custom field type
 * 
 * @param fieldType - The type of custom field
 * @returns Human-readable label string
 */
export function getCustomFieldLabel(fieldType: string): string {
  const labels: Record<string, string> = {
    text: 'Text',
    number: 'Number',
    email: 'Email',
    url: 'URL',
    date: 'Date',
    select: 'Dropdown',
    checkbox: 'Checkbox',
    boolean: 'Yes/No',
    textarea: 'Long Text'
  };
  
  return labels[fieldType] || 'Text';
}
