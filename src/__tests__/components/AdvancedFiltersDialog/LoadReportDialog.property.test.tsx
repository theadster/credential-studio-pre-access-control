/**
 * Property-Based Tests for LoadReportDialog
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 13: Report List Display Completeness.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 3.1**
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LoadReportDialog } from '../../../components/AdvancedFiltersDialog/components/LoadReportDialog';
import type { SavedReport } from '../../../types/reports';

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate a valid ISO date string using integer timestamps
 * This avoids issues with invalid Date objects
 */
const isoDateArbitrary = fc
  .integer({ min: 1577836800000, max: 1893456000000 }) // 2020-01-01 to 2030-01-01
  .map((timestamp) => new Date(timestamp).toISOString());

/**
 * Generate a valid report name (non-empty, non-whitespace)
 */
const reportNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0 && !s.includes('\n') && !s.includes('\r'))
  .map((s) => s.trim());

/**
 * Generate an optional description
 */
const descriptionArbitrary = fc.option(
  fc.string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0 && !s.includes('\n') && !s.includes('\r'))
    .map((s) => s.trim()),
  { nil: undefined }
);

/**
 * Generate a valid SavedReport object (without $id - will be assigned in array)
 */
const savedReportWithoutIdArbitrary = fc.record({
  name: reportNameArbitrary,
  description: descriptionArbitrary,
  userId: fc.uuid(),
  filterConfiguration: fc.constant('{}'), // Simplified for display tests
  createdAt: isoDateArbitrary,
  updatedAt: isoDateArbitrary,
  lastAccessedAt: fc.option(isoDateArbitrary, { nil: undefined }),
});

/**
 * Generate an array of SavedReport objects with guaranteed unique IDs
 * Uses UUID for uniqueness across all iterations
 */
const reportsArrayArbitrary = fc.array(savedReportWithoutIdArbitrary, { minLength: 1, maxLength: 5 })
  .chain((reports) => {
    // Generate unique UUIDs for each report in the array
    return fc.array(fc.uuid(), { minLength: reports.length, maxLength: reports.length })
      .map((uuids) => reports.map((report, index) => ({
        ...report,
        $id: uuids[index],
      } as SavedReport)));
  });

// ============================================================================
// Test Setup
// ============================================================================

// Mock handlers
const mockOnLoad = vi.fn();
const mockOnEdit = vi.fn().mockResolvedValue(undefined);
const mockOnDelete = vi.fn().mockResolvedValue(undefined);
const mockOnOpenChange = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ============================================================================
// Property 13: Report List Display Completeness
// ============================================================================

/**
 * **Feature: saved-reports, Property 13: Report List Display Completeness**
 * **Validates: Requirements 3.1**
 *
 * *For any* report in the list view, the rendered output should include
 * the report name, description (if present), creation date, and last
 * accessed date (if present).
 */
describe('Property 13: Report List Display Completeness', () => {
  describe('Report name is always displayed', () => {
    it('displays the name for every report in the list', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          // Clean up any previous renders
          cleanup();
          
          const { unmount } = render(
            <LoadReportDialog
              open={true}
              onOpenChange={mockOnOpenChange}
              reports={reports}
              isLoading={false}
              onLoad={mockOnLoad}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
            />
          );

          try {
            // Verify each report's name is displayed
            for (const report of reports) {
              const nameElement = screen.getByTestId(`report-name-${report.$id}`);
              expect(nameElement).toBeInTheDocument();
              expect(nameElement).toHaveTextContent(report.name);
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Report description is displayed when present', () => {
    it('displays description for reports that have one', () => {
      fc.assert(
        fc.property(
          reportsArrayArbitrary.filter((reports) =>
            reports.some((r) => r.description !== undefined)
          ),
          (reports) => {
            let unmount: (() => void) | undefined;
            try {
              const result = render(
                <LoadReportDialog
                  open={true}
                  onOpenChange={mockOnOpenChange}
                  reports={reports}
                  isLoading={false}
                  onLoad={mockOnLoad}
                  onEdit={mockOnEdit}
                  onDelete={mockOnDelete}
                />
              );
              unmount = result.unmount;

              // Verify descriptions are displayed for reports that have them
              for (const report of reports) {
                if (report.description) {
                  const descElement = screen.getByTestId(`report-description-${report.$id}`);
                  expect(descElement).toBeInTheDocument();
                  expect(descElement).toHaveTextContent(report.description);
                }
              }
            } finally {
              if (unmount) {
                unmount();
              } else {
                cleanup();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('does not display description element for reports without one', () => {
      fc.assert(
        fc.property(
          reportsArrayArbitrary.filter((reports) =>
            reports.some((r) => r.description === undefined)
          ),
          (reports) => {
            let unmount: (() => void) | undefined;
            try {
              const result = render(
                <LoadReportDialog
                  open={true}
                  onOpenChange={mockOnOpenChange}
                  reports={reports}
                  isLoading={false}
                  onLoad={mockOnLoad}
                  onEdit={mockOnEdit}
                  onDelete={mockOnDelete}
                />
              );
              unmount = result.unmount;

              // Verify no description element for reports without description
              for (const report of reports) {
                if (report.description === undefined) {
                  const descElement = screen.queryByTestId(`report-description-${report.$id}`);
                  expect(descElement).not.toBeInTheDocument();
                }
              }
            } finally {
              if (unmount) {
                unmount();
              } else {
                cleanup();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Creation date is always displayed', () => {
    it('displays the creation date for every report', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          let unmount: (() => void) | undefined;
          try {
            const result = render(
              <LoadReportDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                reports={reports}
                isLoading={false}
                onLoad={mockOnLoad}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );
            unmount = result.unmount;

            // Verify each report's creation date is displayed
            for (const report of reports) {
              const createdElement = screen.getByTestId(`report-created-${report.$id}`);
              expect(createdElement).toBeInTheDocument();
              // Should contain "Created" text
              expect(createdElement.textContent).toContain('Created');
            }
          } finally {
            unmount?.();
          }
        }),
        { numRuns: 50 }
      );
    });

    it('formats creation date correctly', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          let unmount: (() => void) | undefined;
          try {
            const result = render(
              <LoadReportDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                reports={reports}
                isLoading={false}
                onLoad={mockOnLoad}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );
            unmount = result.unmount;

            for (const report of reports) {
              const createdElement = screen.getByTestId(`report-created-${report.$id}`);
              const text = createdElement.textContent || '';
              
              // Should contain a year (4 digits)
              expect(text).toMatch(/\d{4}/);
              
              // Should contain a valid day (01-31)
              expect(text).toMatch(/\b(0?[1-9]|[12]\d|3[01])\b/);
              
              // Should contain "Created" label
              expect(text).toContain('Created');
            }
          } finally {
            unmount?.();
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Last accessed date is displayed when present', () => {
    it('displays last accessed date for reports that have one', () => {
      fc.assert(
        fc.property(
          reportsArrayArbitrary.filter((reports) =>
            reports.some((r) => r.lastAccessedAt !== undefined)
          ),
          (reports) => {
            let unmount: (() => void) | undefined;
            try {
              const result = render(
                <LoadReportDialog
                  open={true}
                  onOpenChange={mockOnOpenChange}
                  reports={reports}
                  isLoading={false}
                  onLoad={mockOnLoad}
                  onEdit={mockOnEdit}
                  onDelete={mockOnDelete}
                />
              );
              unmount = result.unmount;

              // Verify last accessed date is displayed for reports that have it
              for (const report of reports) {
                if (report.lastAccessedAt) {
                  const accessedElement = screen.getByTestId(`report-accessed-${report.$id}`);
                  expect(accessedElement).toBeInTheDocument();
                  expect(accessedElement.textContent).toContain('Last used');
                }
              }
            } finally {
              if (unmount) {
                unmount();
              } else {
                cleanup();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('does not display last accessed element for reports without one', () => {
      fc.assert(
        fc.property(
          reportsArrayArbitrary.filter((reports) =>
            reports.some((r) => r.lastAccessedAt === undefined)
          ),
          (reports) => {
            let unmount: (() => void) | undefined;
            try {
              const result = render(
                <LoadReportDialog
                  open={true}
                  onOpenChange={mockOnOpenChange}
                  reports={reports}
                  isLoading={false}
                  onLoad={mockOnLoad}
                  onEdit={mockOnEdit}
                  onDelete={mockOnDelete}
                />
              );
              unmount = result.unmount;

              // Verify no last accessed element for reports without it
              for (const report of reports) {
                if (report.lastAccessedAt === undefined) {
                  const accessedElement = screen.queryByTestId(`report-accessed-${report.$id}`);
                  expect(accessedElement).not.toBeInTheDocument();
                }
              }
            } finally {
              if (unmount) {
                unmount();
              } else {
                cleanup();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('All reports in the list are rendered', () => {
    it('renders exactly the number of reports provided', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          let unmount: (() => void) | undefined;
          try {
            const result = render(
              <LoadReportDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                reports={reports}
                isLoading={false}
                onLoad={mockOnLoad}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );
            unmount = result.unmount;

            // Count rendered report items
            const reportsList = screen.getByTestId('reports-list');
            const reportItems = reportsList.querySelectorAll('[data-testid^="report-item-"]');
            
            expect(reportItems.length).toBe(reports.length);
          } finally {
            unmount?.();
          }
        }),
        { numRuns: 50 }
      );
    });

    it('renders each report with a unique identifier', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          let unmount: (() => void) | undefined;
          try {
            const result = render(
              <LoadReportDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                reports={reports}
                isLoading={false}
                onLoad={mockOnLoad}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );
            unmount = result.unmount;

            // Verify each report has its own item
            for (const report of reports) {
              const reportItem = screen.getByTestId(`report-item-${report.$id}`);
              expect(reportItem).toBeInTheDocument();
            }
          } finally {
            unmount?.();
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Edit and delete buttons are present for each report', () => {
    it('renders edit button for every report', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          let unmount: (() => void) | undefined;
          try {
            const result = render(
              <LoadReportDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                reports={reports}
                isLoading={false}
                onLoad={mockOnLoad}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );
            unmount = result.unmount;

            for (const report of reports) {
              const editButton = screen.getByTestId(`report-edit-${report.$id}`);
              expect(editButton).toBeInTheDocument();
            }
          } finally {
            unmount?.();
          }
        }),
        { numRuns: 50 }
      );
    });

    it('renders delete button for every report', () => {
      fc.assert(
        fc.property(reportsArrayArbitrary, (reports) => {
          let unmount: (() => void) | undefined;
          try {
            const result = render(
              <LoadReportDialog
                open={true}
                onOpenChange={mockOnOpenChange}
                reports={reports}
                isLoading={false}
                onLoad={mockOnLoad}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );
            unmount = result.unmount;

            for (const report of reports) {
              const deleteButton = screen.getByTestId(`report-delete-${report.$id}`);
              expect(deleteButton).toBeInTheDocument();
            }
          } finally {
            unmount?.();
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Empty state handling', () => {
    it('shows empty state message when no reports exist', () => {
      render(
        <LoadReportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          reports={[]}
          isLoading={false}
          onLoad={mockOnLoad}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('No saved reports yet')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      render(
        <LoadReportDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          reports={[]}
          isLoading={true}
          onLoad={mockOnLoad}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should not show empty state when loading
      expect(screen.queryByText('No saved reports yet')).not.toBeInTheDocument();
    });
  });
});
