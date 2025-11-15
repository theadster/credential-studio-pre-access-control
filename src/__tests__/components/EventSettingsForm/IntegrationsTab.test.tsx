import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { IntegrationsTab } from '@/components/EventSettingsForm/IntegrationsTab';
import { EventSettings, IntegrationStatus, FieldMapping, CustomField } from '@/components/EventSettingsForm/types';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('IntegrationsTab - Input Field Verification', () => {
  const mockOnInputChange = vi.fn();
  const mockOnAddFieldMapping = vi.fn();
  const mockOnEditFieldMapping = vi.fn();
  const mockOnDeleteFieldMapping = vi.fn();

  const mockFormData: EventSettings = {
    eventName: 'Test Event',
    barcodeType: 'numerical',
    barcodeLength: 6,
    cloudinaryEnabled: true,
    cloudinaryCloudName: '',
    cloudinaryUploadPreset: '',
    cloudinaryAutoOptimize: false,
    cloudinaryGenerateThumbnails: false,
    cloudinaryDisableSkipCrop: false,
    cloudinaryCropAspectRatio: '1',
    switchboardEnabled: true,
    switchboardApiEndpoint: '',
    switchboardAuthHeaderType: 'Bearer',
    switchboardTemplateId: '',
    switchboardRequestBody: '',
    oneSimpleApiEnabled: true,
    oneSimpleApiUrl: '',
    oneSimpleApiFormDataKey: '',
    oneSimpleApiFormDataValue: '',
    oneSimpleApiRecordTemplate: '',
    customFields: [],
    switchboardFieldMappings: []
  };

  const mockIntegrationStatus: IntegrationStatus = {
    cloudinary: true,
    switchboard: true
  };

  const mockCustomFields: CustomField[] = [];
  const mockFieldMappings: FieldMapping[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OneSimpleAPI Fields', () => {
    it('should accept input in Webhook URL field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Webhook URL/i);
      const testUrl = 'https://api.example.com/webhook';
      
      fireEvent.change(input, { target: { value: testUrl } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('oneSimpleApiUrl', testUrl);
      });
    });

    it('should accept input in Form Data Key field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Form Data Key/i);
      const testKey = 'attendee_data';
      
      fireEvent.change(input, { target: { value: testKey } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('oneSimpleApiFormDataKey', testKey);
      });
    });

    it('should accept HTML in Form Data Value Template field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const textarea = screen.getByLabelText(/Form Data Value Template/i);
      const testHtml = '<div>{{firstName}} {{lastName}}</div>';
      
      fireEvent.change(textarea, { target: { value: testHtml } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('oneSimpleApiFormDataValue', testHtml);
      });
    });

    it('should accept HTML in Record Template field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const textarea = screen.getByLabelText(/Record Template/i);
      const testHtml = '<p>Barcode: {{barcodeNumber}}</p>';
      
      fireEvent.change(textarea, { target: { value: testHtml } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('oneSimpleApiRecordTemplate', testHtml);
      });
    });
  });

  describe('Cloudinary Fields', () => {
    it('should accept input in Cloud Name field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Cloud Name/i);
      const testCloudName = 'my-cloud-name';
      
      fireEvent.change(input, { target: { value: testCloudName } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('cloudinaryCloudName', testCloudName);
      });
    });

    it('should accept input in Upload Preset field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Upload Preset/i);
      const testPreset = 'my-upload-preset';
      
      fireEvent.change(input, { target: { value: testPreset } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('cloudinaryUploadPreset', testPreset);
      });
    });

    it('should toggle Auto-optimize images switch', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      // Find the switch by looking for the text and then finding the switch in the same container
      const autoOptimizeText = screen.getByText(/Auto-optimize images/i);
      const switchContainer = autoOptimizeText.closest('.flex.items-center.justify-between');
      const switchElement = switchContainer?.querySelector('[role="switch"]') as HTMLElement;
      
      expect(switchElement).toBeTruthy();
      fireEvent.click(switchElement);
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('cloudinaryAutoOptimize', true);
      });
    });

    it('should toggle Generate thumbnails switch', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      // Find the switch by looking for the text and then finding the switch in the same container
      const generateThumbnailsText = screen.getByText(/Generate thumbnails/i);
      const switchContainer = generateThumbnailsText.closest('.flex.items-center.justify-between');
      const switchElement = switchContainer?.querySelector('[role="switch"]') as HTMLElement;
      
      expect(switchElement).toBeTruthy();
      fireEvent.click(switchElement);
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('cloudinaryGenerateThumbnails', true);
      });
    });
  });

  describe('Switchboard Fields', () => {
    it('should accept input in API Endpoint field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Switchboard API Endpoint/i);
      const testEndpoint = 'https://api.switchboard.ai/v1/generate';
      
      fireEvent.change(input, { target: { value: testEndpoint } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('switchboardApiEndpoint', testEndpoint);
      });
    });

    it('should accept input in Template ID field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Template ID/i);
      const testTemplateId = 'template_abc123';
      
      fireEvent.change(input, { target: { value: testTemplateId } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('switchboardTemplateId', testTemplateId);
      });
    });

    it('should accept JSON in Request Body field', async () => {
      render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const textarea = screen.getByLabelText(/API Request Body/i);
      const testJson = '{"template_id": "{{template_id}}", "data": {"firstName": "{{firstName}}"}}';
      
      fireEvent.change(textarea, { target: { value: testJson } });
      
      await waitFor(() => {
        expect(mockOnInputChange).toHaveBeenCalledWith('switchboardRequestBody', testJson);
      });
    });
  });

  describe('Component Re-rendering', () => {
    it('should re-render when formData changes', () => {
      const { rerender } = render(
        <IntegrationsTab
          formData={mockFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const updatedFormData = {
        ...mockFormData,
        oneSimpleApiUrl: 'https://updated.example.com'
      };

      rerender(
        <IntegrationsTab
          formData={updatedFormData}
          onInputChange={mockOnInputChange}
          integrationStatus={mockIntegrationStatus}
          customFields={mockCustomFields}
          fieldMappings={mockFieldMappings}
          onAddFieldMapping={mockOnAddFieldMapping}
          onEditFieldMapping={mockOnEditFieldMapping}
          onDeleteFieldMapping={mockOnDeleteFieldMapping}
        />
      );

      const input = screen.getByLabelText(/Webhook URL/i) as HTMLInputElement;
      expect(input.value).toBe('https://updated.example.com');
    });
  });
});
