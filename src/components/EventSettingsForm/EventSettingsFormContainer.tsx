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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {eventSettings ? "Edit Event Settings" : "Create Event Settings"}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            Configure your event details, barcode settings, and integrations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-0" autoComplete="off" data-form-type="other">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mb-6">
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

          <div className="flex justify-end space-x-2 pt-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800 -mx-6 -mb-6 px-6">
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
