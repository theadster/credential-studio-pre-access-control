// GeneralTab Component
// Handles general event information, name settings, and attendee list configuration

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TIME_ZONES, SORT_FIELDS, SORT_DIRECTIONS, MIN_CUSTOM_FIELD_COLUMNS, MAX_CUSTOM_FIELD_COLUMNS, DEFAULT_CUSTOM_FIELD_COLUMNS } from './constants';
import { EventSettings } from './types';

interface GeneralTabProps {
  formData: EventSettings;
  onInputChange: (field: keyof EventSettings, value: any) => void;
}

export const GeneralTab = memo(function GeneralTab({ formData, onInputChange }: GeneralTabProps) {
  return (
    <div className="space-y-4">
      {/* Event Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>Basic details about your event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventName">Event Name *</Label>
              <Input
                id="eventName"
                value={formData.eventName}
                onChange={(e) => onInputChange("eventName", e.target.value)}
                placeholder="Enter event name"
                required
              />
            </div>
            <div>
              <Label htmlFor="eventDate">Event Date *</Label>
              <Input
                id="eventDate"
                type="date"
                value={formData.eventDate}
                onChange={(e) => onInputChange("eventDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventTime">Event Time</Label>
              <Input
                id="eventTime"
                type="time"
                value={formData.eventTime || ""}
                onChange={(e) => onInputChange("eventTime", e.target.value)}
                placeholder="Select event time"
              />
            </div>
            <div>
              <Label htmlFor="timeZone">Time Zone</Label>
              <Select
                value={formData.timeZone}
                onValueChange={(value) => onInputChange("timeZone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_ZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="eventLocation">Event Location *</Label>
            <Input
              id="eventLocation"
              value={formData.eventLocation}
              onChange={(e) => onInputChange("eventLocation", e.target.value)}
              placeholder="Enter event location"
              required
            />
          </div>

          <div>
            <Label htmlFor="bannerImageUrl">Banner Image URL</Label>
            <Input
              id="bannerImageUrl"
              value={formData.bannerImageUrl || ""}
              onChange={(e) => onInputChange("bannerImageUrl", e.target.value)}
              placeholder="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            />
          </div>

          <div>
            <Label htmlFor="signInBannerUrl">Sign In Banner URL</Label>
            <Input
              id="signInBannerUrl"
              value={formData.signInBannerUrl || ""}
              onChange={(e) => onInputChange("signInBannerUrl", e.target.value)}
              placeholder="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            />
          </div>
        </CardContent>
      </Card>

      {/* Name Field Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Name Field Settings</CardTitle>
          <CardDescription>Configure how attendee names are handled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Force First Name to Uppercase</Label>
              <p className="text-xs text-muted-foreground">
                Automatically convert first names to uppercase when entered
              </p>
            </div>
            <Switch
              checked={formData.forceFirstNameUppercase || false}
              onCheckedChange={(checked) => onInputChange("forceFirstNameUppercase", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Force Last Name to Uppercase</Label>
              <p className="text-xs text-muted-foreground">
                Automatically convert last names to uppercase when entered
              </p>
            </div>
            <Switch
              checked={formData.forceLastNameUppercase || false}
              onCheckedChange={(checked) => onInputChange("forceLastNameUppercase", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendee List Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Attendee List Settings</CardTitle>
          <CardDescription>Configure default sorting and display options for the attendee list</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="attendeeSortField">Sort By</Label>
              <Select
                value={formData.attendeeSortField || 'lastName'}
                onValueChange={(value) => onInputChange("attendeeSortField", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="attendeeSortDirection">Sort Direction</Label>
              <Select
                value={formData.attendeeSortDirection || 'asc'}
                onValueChange={(value) => onInputChange("attendeeSortDirection", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_DIRECTIONS.map((dir) => (
                    <SelectItem key={dir.value} value={dir.value}>
                      {dir.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="customFieldColumns">Custom Field Columns (Desktop)</Label>
            <Select
              value={String(formData.customFieldColumns || DEFAULT_CUSTOM_FIELD_COLUMNS)}
              onValueChange={(value) => onInputChange("customFieldColumns", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: MAX_CUSTOM_FIELD_COLUMNS - MIN_CUSTOM_FIELD_COLUMNS + 1 },
                  (_, i) => MIN_CUSTOM_FIELD_COLUMNS + i
                ).map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} Column{num !== 1 ? 's' : ''} {num === DEFAULT_CUSTOM_FIELD_COLUMNS ? '(Default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Number of custom field columns to display before wrapping to the next line on large screens. Adjust based on your screen resolution.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
