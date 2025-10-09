import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function TestTemplateProcessing() {
  const [loading, setLoading] = useState(false);
  const [attendeeId, setAttendeeId] = useState('');
  const [result, setResult] = useState<any>(null);

  const testProcessing = async () => {
    setLoading(true);
    try {
      const url = attendeeId 
        ? `/api/integrations/test-template-processing?attendeeId=${encodeURIComponent(attendeeId)}`
        : '/api/integrations/test-template-processing';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Test Template Processing</h1>
        <p className="text-muted-foreground">
          See exactly how your Switchboard template is processed with placeholder replacement.
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Optionally provide an attendee ID to test with real data, or leave blank for dummy data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attendeeId">Attendee ID (optional)</Label>
            <Input
              id="attendeeId"
              value={attendeeId}
              onChange={(e) => setAttendeeId(e.target.value)}
              placeholder="Leave blank for dummy data"
            />
          </div>
          <Button onClick={testProcessing} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Template Processing
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Status */}
          <Alert variant={result.status === 'valid' ? 'default' : 'destructive'}>
            {result.status === 'valid' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Template is Valid</AlertTitle>
                <AlertDescription>
                  The processed template is valid JSON and ready to send to Switchboard.
                </AlertDescription>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <AlertTitle>Template is Invalid</AlertTitle>
                <AlertDescription>
                  {result.parseError || result.error}
                </AlertDescription>
              </>
            )}
          </Alert>

          {/* Attendee Data */}
          {result.attendeeData && (
            <Card>
              <CardHeader>
                <CardTitle>Attendee Data Used</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result.attendeeData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Placeholders */}
          {result.placeholders && (
            <Card>
              <CardHeader>
                <CardTitle>Placeholders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">String Placeholders</h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(result.placeholders.string, null, 2)}
                  </pre>
                </div>
                {Object.keys(result.placeholders.numeric || {}).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Numeric Placeholders</h4>
                    <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                      {JSON.stringify(result.placeholders.numeric, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Unreplaced Placeholders */}
          {result.unreplacedPlaceholders && result.unreplacedPlaceholders.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Unreplaced Placeholders Found</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  {result.unreplacedPlaceholders.map((p: string, i: number) => (
                    <code key={i} className="block text-xs bg-black/10 px-2 py-1 rounded mb-1">
                      {p}
                    </code>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Original Template */}
          <Card>
            <CardHeader>
              <CardTitle>Original Template</CardTitle>
              <CardDescription>From Switchboard integration configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                {result.originalTemplate}
              </pre>
            </CardContent>
          </Card>

          {/* Processed Template */}
          <Card>
            <CardHeader>
              <CardTitle>Processed Template (After Placeholder Replacement)</CardTitle>
              <CardDescription>
                {result.status === 'valid' 
                  ? 'This is what will be sent to Switchboard' 
                  : 'This has JSON syntax errors'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                {result.processedTemplate}
              </pre>
            </CardContent>
          </Card>

          {/* Parsed JSON */}
          {result.parsedJson && (
            <Card>
              <CardHeader>
                <CardTitle>Parsed JSON (Pretty Printed)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result.parsedJson, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Debug Info */}
          {result.debugInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
                <CardDescription>Raw data used for processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Custom Field Values from Attendee</h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(result.debugInfo.customFieldValues, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Field Mappings Configuration</h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(result.debugInfo.fieldMappings, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Available Custom Fields</h4>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(result.debugInfo.customFieldsAvailable, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
