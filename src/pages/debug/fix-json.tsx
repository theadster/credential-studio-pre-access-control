import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, AlertCircle, Loader2, Copy, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch, ApiFetchError } from '@/lib/apiFetch';

interface ErrorContext {
  before?: string;
  content: string;
  after?: string;
}

interface LineData {
  lineNumber: number;
  content: string;
}

interface SwitchboardTemplateData {
  requestBody?: string;
  parseError?: string;
  errorLine?: number;
  errorColumn?: number;
  errorContext?: ErrorContext;
  suggestions?: string[];
  lines?: LineData[];
}

export default function FixSwitchboardJson() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SwitchboardTemplateData | null>(null);
  const [editedJson, setEditedJson] = useState('');
  const { toast } = useToast();

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<SwitchboardTemplateData>('/api/integrations/fix-switchboard-json');
      setData(result);
      setEditedJson(result.requestBody || '');
    } catch (err) {
      const errorMessage = err instanceof ApiFetchError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unknown error';

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/integrations/fix-switchboard-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestBody: editedJson })
      });

      toast({
        title: 'Success',
        description: 'Template saved successfully!'
      });

      // Reload to show updated data
      await loadTemplate();
    } catch (err) {
      const errorMessage = err instanceof ApiFetchError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Unknown error';

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(editedJson);
      setEditedJson(JSON.stringify(parsed, null, 2));
      toast({
        title: 'Success',
        description: 'JSON formatted successfully!'
      });
    } catch (e) {
      const error = e as Error;
      toast({
        variant: 'destructive',
        title: 'Invalid JSON',
        description: error.message
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Copied to clipboard'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Copied to clipboard'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Unable to access clipboard'
      });
    }
  };
    const example = {
      "template_id": "{{template_id}}",
      "data": {
        "firstName": "{{firstName}}",
        "lastName": "{{lastName}}",
        "barcodeNumber": "{{barcodeNumber}}",
        "photoUrl": "{{photoUrl}}",
        "eventName": "{{eventName}}"
      }
    };
    setEditedJson(JSON.stringify(example, null, 2));
    toast({
      title: 'Example Loaded',
      description: 'You can now edit and save this template'
    });
  };

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fix Switchboard JSON Template</h1>
        <p className="text-muted-foreground">
          View and fix JSON syntax errors in your Switchboard request body template.
        </p>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Error Card */}
          {data.parseError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>JSON Parse Error</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-mono text-sm">{data.parseError}</div>
                  {data.errorContext && (
                    <div className="mt-4 space-y-2">
                      <div className="font-semibold">
                        Error at Line {data.errorLine}, Column {data.errorColumn}:
                      </div>
                      <div className="bg-black/10 p-3 rounded font-mono text-xs space-y-1">
                        {data.errorContext.before && (
                          <div className="text-gray-600">
                            {(data.errorLine ?? 0) - 1}: {data.errorContext.before}
                          </div>
                        )}
                        <div className="text-red-600 font-bold">
                          {data.errorLine}: {data.errorContext.content}
                          <span className="inline-block ml-1">
                            {' '.repeat(Math.max(0, (data.errorColumn ?? 0) - 1))}↑
                          </span>
                        </div>
                        {data.errorContext.after && (
                          <div className="text-gray-600">
                            {(data.errorLine ?? 0) + 1}: {data.errorContext.after}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Suggestions */}
          {data.suggestions && data.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  Common JSON Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {data.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Template</CardTitle>
              <CardDescription>
                Fix the JSON syntax errors below, then click Save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={formatJson} variant="outline" size="sm">
                  Format JSON
                </Button>
                <Button onClick={useExampleTemplate} variant="outline" size="sm">
                  Use Example Template
                </Button>
                <Button
                  onClick={() => copyToClipboard(editedJson)}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>

              <Textarea
                value={editedJson}
                onChange={(e) => setEditedJson(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="Paste your JSON template here..."
              />

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {editedJson.length} characters, {editedJson.split('\n').length} lines
                </div>
                <Button onClick={saveTemplate} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Original Template Display */}
          {data.lines && data.lines.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                View Original Template with Line Numbers
              </summary>
              <Card>
                <CardContent className="pt-6">
                  <div className="bg-gray-50 p-4 rounded font-mono text-xs overflow-x-auto">
                    {data.lines.map((line) => (
                      <div
                        key={line.lineNumber}
                        className={`${line.lineNumber === data.errorLine
                          ? 'bg-red-100 text-red-900 font-bold'
                          : ''
                          }`}
                      >
                        <span className="text-gray-400 select-none mr-4">
                          {String(line.lineNumber).padStart(3, ' ')}
                        </span>
                        <span>{line.content}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
