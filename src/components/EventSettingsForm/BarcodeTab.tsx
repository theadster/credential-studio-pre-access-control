// BarcodeTab Component
// Handles barcode generation configuration

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BARCODE_TYPES, MIN_BARCODE_LENGTH, MAX_BARCODE_LENGTH } from './constants';
import { EventSettings } from './types';

interface BarcodeTabProps {
  formData: EventSettings;
  onInputChange: (field: keyof EventSettings, value: any) => void;
}

export const BarcodeTab = memo(function BarcodeTab({ formData, onInputChange }: BarcodeTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Barcode Configuration</CardTitle>
          <CardDescription>Configure how barcodes are generated for attendees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="barcodeType">Barcode Type</Label>
              <Select 
                value={formData.barcodeType} 
                onValueChange={(value) => onInputChange("barcodeType", value)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {formData.barcodeType === 'numerical'
                      ? 'Numerical (0-9)'
                      : 'Alphanumerical (A-Z, 0-9)'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BARCODE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="barcodeLength">Barcode Length</Label>
              <Input
                id="barcodeLength"
                type="number"
                min={MIN_BARCODE_LENGTH}
                max={MAX_BARCODE_LENGTH}
                value={formData.barcodeLength}
                onChange={(e) => onInputChange("barcodeLength", parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Length must be between {MIN_BARCODE_LENGTH} and {MAX_BARCODE_LENGTH} characters
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="barcodeUnique"
              checked={formData.barcodeUnique}
              onCheckedChange={(checked) => onInputChange("barcodeUnique", checked)}
            />
            <Label htmlFor="barcodeUnique">Ensure unique barcodes</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.formData.barcodeType === nextProps.formData.barcodeType &&
    prevProps.formData.barcodeLength === nextProps.formData.barcodeLength &&
    prevProps.formData.barcodeUnique === nextProps.formData.barcodeUnique
  );
});
