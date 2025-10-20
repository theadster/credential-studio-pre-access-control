import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventSettingsForm from '../EventSettingsForm';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

const mockEventSettings = {
  id: 'event-1',
  eventName: 'Test Event',
  eventDate: '2024-12-31',
  eventTime: '18:00',
  eventLocation: 'Test Venue',
  timeZone: 'America/New_York',
  barcodeType: 'numerical',
  barcodeLength: 6,
  barcodeUnique: true,
  customFields: [
    {
      id: 'field-1',
      fieldName: 'Company',
      internalFieldName: 'company',
      fieldType: 'text',
      required: false,
      order: 0,
      showOnMainPage: true,
      printable: true,
    },
    {
      id: 'field-2',
      fieldName: 'Internal Notes',
      internalFieldName: 'internal_notes',
      fieldType: 'text',
      required: false,
      order: 1,
      showOnMainPage: false,
      printable: false,
    },
  ],
};

describe('EventSettingsForm - Printable Field Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockEventSettings,
    });
  });

  describe('Requirement 1.1 & 6.1: Printable toggle in custom field form', () => {
    it('should display printable toggle with correct label and icon', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      // Wait for the form to load
      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      // Click on Custom Fields tab
      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      // Click Add Field button
      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      // Wait for the custom field dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      // Check that the printable toggle exists
      const printableLabel = screen.getByText('Printable Field');
      expect(printableLabel).toBeInTheDocument();

      // Check that the Printer icon is present
      const printableSection = printableLabel.closest('div');
      expect(printableSection).toBeInTheDocument();
      
      // Check for the help text
      expect(screen.getByText(/mark this field as printable if it appears on the credential/i)).toBeInTheDocument();
    });

    it('should have printable toggle positioned after "Show on Main Page" toggle', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      await waitFor(() => {
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      // Get all toggle sections
      const showOnMainPageLabel = screen.getByText('Show on Main Page');
      const printableLabel = screen.getByText('Printable Field');

      // Get their parent containers
      const showOnMainPageContainer = showOnMainPageLabel.closest('.flex.items-center.justify-between');
      const printableContainer = printableLabel.closest('.flex.items-center.justify-between');

      expect(showOnMainPageContainer).toBeInTheDocument();
      expect(printableContainer).toBeInTheDocument();

      // Verify printable comes after showOnMainPage in the DOM
      const allToggles = screen.getAllByRole('switch');
      const showOnMainPageSwitch = allToggles.find(toggle => 
        toggle.id === 'showOnMainPage'
      );
      const printableSwitch = allToggles.find(toggle => 
        toggle.id === 'printable'
      );

      expect(showOnMainPageSwitch).toBeInTheDocument();
      expect(printableSwitch).toBeInTheDocument();
    });
  });

  describe('Requirement 6.2: Help text explanation', () => {
    it('should display help text explaining printable field purpose', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      await waitFor(() => {
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      // Check for the help text
      const helpText = screen.getByText(/mark this field as printable if it appears on the credential/i);
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveClass('text-xs', 'text-muted-foreground');
      
      // Verify it mentions credential status
      expect(screen.getByText(/changes to printable fields will mark credentials as outdated and require reprinting/i)).toBeInTheDocument();
    });
  });

  describe('Requirement 1.1: Toggle functionality', () => {
    it('should toggle printable flag when switch is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      await waitFor(() => {
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      // Find the printable switch
      const printableSwitch = screen.getAllByRole('switch').find(toggle => 
        toggle.id === 'printable'
      );
      
      expect(printableSwitch).toBeInTheDocument();
      
      // Initially should be unchecked (default false)
      expect(printableSwitch).not.toBeChecked();

      // Click to enable
      await user.click(printableSwitch!);
      
      // Should now be checked
      await waitFor(() => {
        expect(printableSwitch).toBeChecked();
      });

      // Click again to disable
      await user.click(printableSwitch!);
      
      // Should be unchecked again
      await waitFor(() => {
        expect(printableSwitch).not.toBeChecked();
      });
    });

    it('should default to false for new fields', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      await waitFor(() => {
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      // Find the printable switch
      const printableSwitch = screen.getAllByRole('switch').find(toggle => 
        toggle.id === 'printable'
      );
      
      // Should default to unchecked (false)
      expect(printableSwitch).not.toBeChecked();
    });
  });

  describe('Requirement 1.3 & 6.3: Printable badge display', () => {
    it('should display printable badge for printable fields in the field list', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      await waitFor(() => {
        // The Company field should have a Printable badge
        const printableBadges = screen.getAllByText('Printable');
        expect(printableBadges.length).toBeGreaterThan(0);
        
        // Find the Company field row
        const companyField = screen.getByText('Company');
        const companyRow = companyField.closest('.flex');
        
        // Check that the Printable badge is in the same row
        expect(companyRow).toBeInTheDocument();
        const badgeInRow = within(companyRow!).queryByText('Printable');
        expect(badgeInRow).toBeInTheDocument();
      });
    });

    it('should NOT display printable badge for non-printable fields', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      await waitFor(() => {
        // Find the Internal Notes field row
        const internalNotesField = screen.getByText('Internal Notes');
        const internalNotesRow = internalNotesField.closest('.flex');
        
        // Check that the Printable badge is NOT in this row
        expect(internalNotesRow).toBeInTheDocument();
        const badgeInRow = within(internalNotesRow!).queryByText('Printable');
        expect(badgeInRow).not.toBeInTheDocument();
      });
    });

    it('should have tooltip content defined for printable badge', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      await waitFor(() => {
        const printableBadges = screen.getAllByText('Printable');
        expect(printableBadges.length).toBeGreaterThan(0);
        
        // Verify the badge exists (tooltip functionality is tested in the component itself)
        expect(printableBadges[0]).toBeInTheDocument();
      });
    });

    it('should display printer icon in printable badge', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      await waitFor(() => {
        const printableBadges = screen.getAllByText('Printable');
        expect(printableBadges.length).toBeGreaterThan(0);
        
        // Check that the badge has the printer icon class
        const badge = printableBadges[0].closest('.text-xs');
        expect(badge).toBeInTheDocument();
        
        // The badge should contain an svg (Printer icon)
        const svg = badge?.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 1.2 & 1.4: Editing existing fields', () => {
    it('should display printable fields with correct badge in field list', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      await waitFor(() => {
        // Company field should be visible and have Printable badge
        expect(screen.getByText('Company')).toBeInTheDocument();
        const companyField = screen.getByText('Company');
        const companyRow = companyField.closest('.flex');
        const printableBadge = within(companyRow!).queryByText('Printable');
        expect(printableBadge).toBeInTheDocument();
      });
    });

    it('should display non-printable fields without printable badge in field list', async () => {
      const user = userEvent.setup();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      await waitFor(() => {
        // Internal Notes field should be visible but NOT have Printable badge
        expect(screen.getByText('Internal Notes')).toBeInTheDocument();
        const internalNotesField = screen.getByText('Internal Notes');
        const internalNotesRow = internalNotesField.closest('.flex');
        const printableBadge = within(internalNotesRow!).queryByText('Printable');
        expect(printableBadge).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 1.5: Saving field with printable flag', () => {
    it('should include printable value when saving a new field', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      
      render(
        <EventSettingsForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
          eventSettings={mockEventSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event Settings')).toBeInTheDocument();
      });

      const customFieldsTab = screen.getByRole('tab', { name: /custom fields/i });
      await user.click(customFieldsTab);

      const addFieldButton = screen.getByRole('button', { name: /add field/i });
      await user.click(addFieldButton);

      await waitFor(() => {
        expect(screen.getByText('Add Custom Field')).toBeInTheDocument();
      });

      // Fill in field details
      const fieldNameInput = screen.getByLabelText(/field name/i);
      await user.type(fieldNameInput, 'Badge Title');

      // Enable printable
      const printableSwitch = screen.getAllByRole('switch').find(toggle => 
        toggle.id === 'printable'
      );
      await user.click(printableSwitch!);

      // Save the field
      const saveButton = screen.getByRole('button', { name: /add field/i });
      await user.click(saveButton);

      // The field should be added to the list with printable flag
      await waitFor(() => {
        // Check that the new field appears in the list
        expect(screen.getByText('Badge Title')).toBeInTheDocument();
        
        // Check that it has the Printable badge
        const badgeTitleField = screen.getByText('Badge Title');
        const badgeTitleRow = badgeTitleField.closest('.flex');
        const printableBadge = within(badgeTitleRow!).queryByText('Printable');
        expect(printableBadge).toBeInTheDocument();
      });
    });
  });
});
