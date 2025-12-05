/**
 * RuleBuilder Component
 * 
 * Visual rule builder for creating approval profile rules with:
 * - Field selector (core and custom fields)
 * - Operator selector
 * - Value input
 * - AND/OR logic grouping
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 3.3, 3.4, 3.5
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FolderPlus, GripVertical } from 'lucide-react';
import { RuleGroup, Rule, RuleOperator } from '@/types/approvalProfile';

interface RuleBuilderProps {
  rules: RuleGroup;
  onChange: (rules: RuleGroup) => void;
}

interface FieldOption {
  value: string;
  label: string;
  type: 'text' | 'boolean' | 'number' | 'select' | 'date';
  options?: string[];
}

// Core attendee fields
const CORE_FIELDS: FieldOption[] = [
  { value: 'firstName', label: 'First Name', type: 'text' },
  { value: 'lastName', label: 'Last Name', type: 'text' },
  { value: 'barcodeNumber', label: 'Barcode Number', type: 'text' },
  { value: 'notes', label: 'Notes', type: 'text' },
];

// Operator definitions with labels and applicable types
const OPERATORS: { value: RuleOperator; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Equals', types: ['text', 'number', 'select', 'date'] },
  { value: 'not_equals', label: 'Not Equals', types: ['text', 'number', 'select', 'date'] },
  { value: 'in_list', label: 'In List', types: ['text', 'select'] },
  { value: 'not_in_list', label: 'Not In List', types: ['text', 'select'] },
  { value: 'greater_than', label: 'Greater Than', types: ['number', 'date'] },
  { value: 'less_than', label: 'Less Than', types: ['number', 'date'] },
  { value: 'between', label: 'Between', types: ['number', 'date'] },
  { value: 'is_true', label: 'Is True', types: ['boolean'] },
  { value: 'is_false', label: 'Is False', types: ['boolean'] },
  { value: 'is_empty', label: 'Is Empty', types: ['text', 'number', 'select', 'date'] },
  { value: 'is_not_empty', label: 'Is Not Empty', types: ['text', 'number', 'select', 'date'] },
];

export default function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const [customFields, setCustomFields] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Load custom fields
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const response = await fetch('/api/mobile/custom-fields');
        if (response.ok) {
          const data = await response.json();
          const fields = (data.data?.fields || []).map((field: any) => ({
            value: `customFieldValues.${field.internalFieldName || field.id}`,
            label: field.fieldName,
            type: field.fieldType === 'checkbox' ? 'boolean' : 
                  field.fieldType === 'number' ? 'number' :
                  field.fieldType === 'select' ? 'select' :
                  field.fieldType === 'date' ? 'date' : 'text',
            options: field.fieldOptions,
          }));
          setCustomFields(fields);
        }
      } catch (err) {
        console.error('Error loading custom fields:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCustomFields();
  }, []);

  const allFields = [...CORE_FIELDS, ...customFields];

  // Get field by value
  const getField = (fieldValue: string): FieldOption | undefined => {
    return allFields.find(f => f.value === fieldValue);
  };

  // Get applicable operators for a field type
  const getOperatorsForField = (fieldValue: string) => {
    const field = getField(fieldValue);
    const fieldType = field?.type || 'text';
    return OPERATORS.filter(op => op.types.includes(fieldType));
  };

  // Add a new rule to a group
  const addRule = (groupPath: number[]) => {
    const newRule: Rule = {
      field: CORE_FIELDS[0].value,
      operator: 'equals',
      value: '',
    };
    
    const newRules = JSON.parse(JSON.stringify(rules));
    const group = getGroupAtPath(newRules, groupPath);
    group.conditions.push(newRule);
    onChange(newRules);
  };

  // Add a new nested group
  const addGroup = (groupPath: number[]) => {
    const newGroup: RuleGroup = {
      logic: 'AND',
      conditions: [{
        field: CORE_FIELDS[0].value,
        operator: 'equals',
        value: '',
      }],
    };
    
    const newRules = JSON.parse(JSON.stringify(rules));
    const group = getGroupAtPath(newRules, groupPath);
    group.conditions.push(newGroup);
    onChange(newRules);
  };

  // Remove a condition (rule or group)
  const removeCondition = (groupPath: number[], index: number) => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const group = getGroupAtPath(newRules, groupPath);
    group.conditions.splice(index, 1);
    onChange(newRules);
  };

  // Update group logic
  const updateGroupLogic = (groupPath: number[], logic: 'AND' | 'OR') => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const group = getGroupAtPath(newRules, groupPath);
    group.logic = logic;
    onChange(newRules);
  };

  // Update a rule
  const updateRule = (groupPath: number[], index: number, updates: Partial<Rule>) => {
    const newRules = JSON.parse(JSON.stringify(rules));
    const group = getGroupAtPath(newRules, groupPath);
    const rule = group.conditions[index] as Rule;
    Object.assign(rule, updates);
    
    // Reset value when field or operator changes
    if (updates.field || updates.operator) {
      const newOperator = updates.operator || rule.operator;
      if (['is_true', 'is_false', 'is_empty', 'is_not_empty'].includes(newOperator)) {
        rule.value = null;
      } else if (updates.field) {
        rule.value = '';
      }
    }
    
    onChange(newRules);
  };

  // Get group at path
  const getGroupAtPath = (root: RuleGroup, path: number[]): RuleGroup => {
    let current = root;
    for (const index of path) {
      current = current.conditions[index] as RuleGroup;
    }
    return current;
  };

  // Render a single rule
  const renderRule = (rule: Rule, groupPath: number[], index: number) => {
    const field = getField(rule.field);
    const operators = getOperatorsForField(rule.field);
    const needsValue = !['is_true', 'is_false', 'is_empty', 'is_not_empty'].includes(rule.operator);
    const needsListValue = ['in_list', 'not_in_list'].includes(rule.operator);
    const needsRangeValue = rule.operator === 'between';

    return (
      <div key={index} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
        
        {/* Field Selector */}
        <Select
          value={rule.field}
          onValueChange={(value) => updateRule(groupPath, index, { field: value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="" disabled>Core Fields</SelectItem>
            {CORE_FIELDS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
            {customFields.length > 0 && (
              <>
                <SelectItem value="" disabled>Custom Fields</SelectItem>
                {customFields.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Operator Selector */}
        <Select
          value={rule.operator}
          onValueChange={(value) => updateRule(groupPath, index, { operator: value as RuleOperator })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map(op => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        {needsValue && (
          <>
            {field?.type === 'select' && field.options ? (
              <Select
                value={String(rule.value || '')}
                onValueChange={(value) => updateRule(groupPath, index, { value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : needsListValue ? (
              <Input
                value={Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value || '')}
                onChange={(e) => updateRule(groupPath, index, { 
                  value: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                })}
                placeholder="Value1, Value2, ..."
                className="w-48"
              />
            ) : needsRangeValue ? (
              <div className="flex items-center gap-1">
                <Input
                  value={Array.isArray(rule.value) ? rule.value[0] || '' : ''}
                  onChange={(e) => updateRule(groupPath, index, { 
                    value: [e.target.value, Array.isArray(rule.value) ? rule.value[1] || '' : '']
                  })}
                  placeholder="Min"
                  className="w-24"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  value={Array.isArray(rule.value) ? rule.value[1] || '' : ''}
                  onChange={(e) => updateRule(groupPath, index, { 
                    value: [Array.isArray(rule.value) ? rule.value[0] || '' : '', e.target.value]
                  })}
                  placeholder="Max"
                  className="w-24"
                />
              </div>
            ) : (
              <Input
                value={String(rule.value || '')}
                onChange={(e) => updateRule(groupPath, index, { value: e.target.value })}
                placeholder="Enter value"
                className="w-48"
              />
            )}
          </>
        )}

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeCondition(groupPath, index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Render a rule group
  const renderGroup = (group: RuleGroup, path: number[] = []) => {
    const isRoot = path.length === 0;

    return (
      <Card className={isRoot ? '' : 'ml-6 border-l-4 border-l-primary/30'}>
        <CardContent className="pt-4 space-y-3">
          {/* Group Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Match</span>
              <Select
                value={group.logic}
                onValueChange={(value) => updateGroupLogic(path, value as 'AND' | 'OR')}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">ALL</SelectItem>
                  <SelectItem value="OR">ANY</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">of the following:</span>
              <Badge variant="outline" className="ml-2">
                {group.logic === 'AND' ? 'AND' : 'OR'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => addRule(path)}>
                <Plus className="h-4 w-4 mr-1" />
                Rule
              </Button>
              <Button variant="outline" size="sm" onClick={() => addGroup(path)}>
                <FolderPlus className="h-4 w-4 mr-1" />
                Group
              </Button>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            {group.conditions.map((condition, index) => {
              const conditionKey = `${[...path, index].join('-')}`;
              if ('logic' in condition) {
                // Nested group
                return (
                  <div key={conditionKey} className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(path, index)}
                      className="absolute -left-4 top-2 text-destructive hover:text-destructive z-10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {renderGroup(condition as RuleGroup, [...path, index])}
                  </div>
                );
              }
              // Single rule
              return (
                <div key={conditionKey}>
                  {renderRule(condition as Rule, path, index)}
                </div>
              );
            })}
          </div>

          {group.conditions.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No rules yet. Click &quot;Rule&quot; to add one.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading fields...
      </div>
    );
  }

  return renderGroup(rules);
}
