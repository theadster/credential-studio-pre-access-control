import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

interface PhotoUploadSectionProps {
  photoUrl: string;
  firstName: string;
  lastName: string;
  onUpload: () => void;
  onRemove: () => void;
}

export function PhotoUploadSection({
  photoUrl,
  firstName,
  lastName,
  onUpload,
  onRemove
}: PhotoUploadSectionProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <Camera className="h-5 w-5 text-muted-foreground" />
          Photo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Photo of ${firstName} ${lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-lg"
              role="img"
              aria-label={`Placeholder initials for ${firstName} ${lastName}`}
            >
              {firstName.charAt(0)}{lastName.charAt(0)}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={onUpload}
            className="w-full"
            size="sm"
            aria-label={photoUrl ? 'Change attendee photo' : 'Upload attendee photo'}
          >
            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
            {photoUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="w-full"
              aria-label="Remove attendee photo"
            >
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Remove Photo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
