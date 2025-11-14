// EventSettingsFormContainer Component
// Main container that wires all tab components together

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { GeneralTab } from './GeneralTab';
import { BarcodeTab } from './BarcodeTab';
import { CustomFieldsTab } from './CustomFieldsTab';
import { IntegrationsTab } from './IntegrationsTab';
import { SortableCustomField } from './SortableCustomField';
import { CustomFieldForm } from './CustomFieldForm';
import { FieldMappingForm } from './FieldMappingForm';
import { useEventSettingsForm } from './useEventSettingsForm';
import { EventSettingsFormProps } from './types';

export function EventSettingsFormContainer({
  isOpen,
  onClose,
  onSave,
  eventSettings
}: EventSettingsFormProps) {
  const {
    // State
    loading,
    activeTab,
    formData,
    customFields,
    fieldMappings,
    integrationStatus,
    
    // Modal state
    editingField,
    showFieldForm,
    showMappingForm,
    editingFieldMapping,
    
    // Handlers
    setActiveTab,
    handleInputChange,
    handleSubmit,
    setCustomFields,
    
    // Custom field handlers
    handleAddCustomField,
    handleEditCustomField,
    handleSaveCustomField,
    handleDeleteCustomField,
    setShowFieldForm,
    setEditingField,
    
    // Field mapping handlers
    handleAddFieldMapping,
    handleEditFieldMapping,
    handleSaveFieldMapping,
    handleDeleteFieldMapping,
    setShowMappingForm,
    setEditingFieldMapping,
  } = useEventSettingsForm({ eventSettings, isOpen, onSave, onClose });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {eventSettings ? "Edit Event Settings" : "Create Event Settings"}
          </DialogTitle>
          <DialogDescription>
            Configure your event details, barcode settings, and integrations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" data-form-type="other">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="barcode">Barcode</TabsTrigger>
              <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab 
                formData={formData} 
                onInputChange={handleInputChange} 
              />
            </TabsContent>

            <TabsContent value="barcode">
              <BarcodeTab 
                formData={formData} 
                onInputChange={handleInputChange} 
              />
            </TabsContent>

            <TabsContent value="custom-fields">
              <CustomFieldsTab
                customFields={customFields}
                onFieldsChange={setCustomFields}
                onAddField={handleAddCustomField}
                onEditField={handleEditCustomField}
                onDeleteField={handleDeleteCustomField}
                SortableFieldComponent={SortableCustomField}
              />
            </TabsContent>

            <TabsContent value="integrations">
              <IntegrationsTab
                formData={formData}
                onInputChange={handleInputChange}
                integrationStatus={integrationStatus}
                customFields={customFields}
                fieldMappings={fieldMappings}
                onAddFieldMapping={handleAddFieldMapping}
                onEditFieldMapping={handleEditFieldMapping}
                onDeleteFieldMapping={handleDeleteFieldMapping}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {eventSettings ? "Update Settings" : "Create Settings"}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Custom Field Form Modal */}
        {showFieldForm && (
          <CustomFieldForm
            isOpen={showFieldForm}
            field={editingField}
            onSave={handleSaveCustomField}
            onCancel={() => {
              setShowFieldForm(false);
              setEditingField(null);
            }}
          />
        )}

        {/* Field Mapping Form Modal */}
        {showMappingForm && (
          <FieldMappingForm
            isOpen={showMappingForm}
            customFields={customFields}
            editingMapping={editingFieldMapping}
            onSave={handleSaveFieldMapping}
            onCancel={() => {
              setShowMappingForm(false);
              setEditingFieldMapping(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
