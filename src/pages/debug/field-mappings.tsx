import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DebugFieldMappings() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/integrations/test-template-processing');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data?.debugInfo) {
    return (
      <div className="container mx-auto py-8">
        <p>No debug data available</p>
      </div>
    );
  }

  const { customFieldValues, fieldMappings, customFieldsAvailable } = data.debugInfo;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Field Mappings Diagnostic</h1>

      {/* Custom Field Values */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Custom Field Values (from Attendee)</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(customFieldValues).length === 0 ? (
            <p className="text-red-600">⚠️ No custom field values found on this attendee!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Field ID</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Field Name</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(customFieldValues).map(([fieldId, value]) => {
                  const field = customFieldsAvailable.find((f: any) => f.id === fieldId);
                  return (
                    <tr key={fieldId} className="border-b">
                      <td className="p-2 font-mono text-xs">{fieldId}</td>
                      <td className="p-2">{String(value)}</td>
                      <td className="p-2">{field?.name || '(unknown)'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Field Mappings Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {fieldMappings.length === 0 ? (
            <p className="text-orange-600">⚠️ No field mappings configured!</p>
          ) : (
            <div className="space-y-4">
              {fieldMappings.map((mapping: any, index: number) => {
                const field = customFieldsAvailable.find((f: any) => f.id === mapping.fieldId);
                const hasValue = customFieldValues[mapping.fieldId] !== undefined;
                const value = customFieldValues[mapping.fieldId];
                
                return (
                  <div key={index} className="border rounded p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <div>
                        <span className="font-medium">JSON Variable:</span>{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded">{`{{${mapping.jsonVariable}}}`}</code>
                      </div>
                      <div>
                        <span className="font-medium">Field Type:</span> {mapping.fieldType}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Maps to Field:</span>{' '}
                        {field?.name || '(unknown)'} <code className="text-xs">({mapping.fieldId})</code>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Attendee has value:</span>{' '}
                        {hasValue ? (
                          <span className="text-green-600">✓ Yes: "{String(value)}"</span>
                        ) : (
                          <span className="text-red-600">✗ No value</span>
                        )}
                      </div>
                    </div>
                    
                    {mapping.valueMapping && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="font-medium text-sm mb-1">Value Mappings:</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">Input Value</th>
                              <th className="text-left p-1">Maps To</th>
                              <th className="text-left p-1">Match?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(mapping.valueMapping).map(([key, mappedValue]) => {
                              const isMatch = hasValue && String(value) === key;
                              return (
                                <tr key={key} className={`border-b ${isMatch ? 'bg-green-50' : ''}`}>
                                  <td className="p-1 font-mono">{key}</td>
                                  <td className="p-1 break-all">{String(mappedValue)}</td>
                                  <td className="p-1">
                                    {isMatch && <span className="text-green-600 font-bold">✓ MATCH</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Custom Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Available Custom Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Field Name</th>
                <th className="text-left p-2">Internal Name</th>
                <th className="text-left p-2">Field ID</th>
                <th className="text-left p-2">Has Value?</th>
              </tr>
            </thead>
            <tbody>
              {customFieldsAvailable.map((field: any) => {
                const hasValue = customFieldValues[field.id] !== undefined;
                return (
                  <tr key={field.id} className="border-b">
                    <td className="p-2">{field.name}</td>
                    <td className="p-2">
                      {field.internalName ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {`{{${field.internalName}}}`}
                        </code>
                      ) : (
                        <span className="text-gray-400">(not set)</span>
                      )}
                    </td>
                    <td className="p-2 font-mono text-xs">{field.id}</td>
                    <td className="p-2">
                      {hasValue ? (
                        <span className="text-green-600">✓ {String(customFieldValues[field.id])}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
