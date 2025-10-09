import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FieldMapping {
  fieldId: string;
  jsonVariable?: string;
  valueMapping?: Record<string, any>;
  fieldType?: string;
}

interface SwitchboardTestResult {
  status?: 'valid' | 'invalid';
  issues?: string[];
  integration?: {
    enabled: boolean;
    apiEndpoint?: string;
    hasApiKey: boolean;
    apiKeyLength: number;
    authHeaderType?: string;
    templateId?: string;
    requestBody?: {
      configured: boolean;
      valid: boolean;
      error?: string | null;
      length: number;
      preview?: string;
      placeholders?: string[];
    };
    fieldMappings?: {
      configured: boolean;
      valid: boolean;
      error?: string | null;
      count: number;
      mappings?: FieldMapping[];
    };
  };
  help?: string;
  error?: string;
  details?: string;
}

export default function DebugSwitchboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwitchboardTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/integrations/test-switchboard');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to test configuration');
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    testConfiguration();
  }, [testConfiguration]);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Switchboard Configuration Debugger</h1>
        <p className="text-muted-foreground">
          This page helps you diagnose issues with your Switchboard Canvas integration.
        </p>
      </div>

      <div className="mb-4">
        <Button onClick={testConfiguration} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test Configuration
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.status === 'valid' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Configuration Valid
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    Configuration Invalid
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {result.help || 'Configuration status'}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Issues Card */}
          {result.issues && result.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Issues Found ({result.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {result.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600">
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Integration Details */}
          {result.integration && (
            <Card>
              <CardHeader>
                <CardTitle>Integration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Enabled</div>
                    <div className="text-lg">
                      {result.integration.enabled ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-red-600">✗ No</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">API Endpoint</div>
                    <div className="text-sm break-all">
                      {result.integration.apiEndpoint || (
                        <span className="text-red-600">Not configured</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">API Key</div>
                    <div className="text-sm">
                      {result.integration.hasApiKey ? (
                        <span className="text-green-600">
                          ✓ Configured ({result.integration.apiKeyLength} chars)
                        </span>
                      ) : (
                        <span className="text-red-600">✗ Not configured</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Template ID</div>
                    <div className="text-sm">
                      {result.integration.templateId || (
                        <span className="text-red-600">Not configured</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Auth Header Type</div>
                    <div className="text-sm">
                      {result.integration.authHeaderType || 'Bearer'}
                    </div>
                  </div>
                </div>

                {/* Request Body */}
                {result.integration.requestBody && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Request Body Template
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span>Status:</span>
                        {result.integration.requestBody.valid ? (
                          <span className="text-green-600">✓ Valid JSON</span>
                        ) : (
                          <span className="text-red-600">✗ Invalid JSON</span>
                        )}
                      </div>

                      {result.integration.requestBody.error && (
                        <Alert variant="destructive">
                          <AlertTitle>JSON Parse Error</AlertTitle>
                          <AlertDescription className="font-mono text-xs">
                            {result.integration.requestBody.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Length: {result.integration.requestBody.length} characters
                      </div>

                      {result.integration.requestBody.placeholders && (
                        <div>
                          <div className="text-sm font-medium mb-1">Detected Placeholders:</div>
                          <div className="flex flex-wrap gap-1">
                            {result.integration.requestBody.placeholders.map((p, i) => (
                              <code key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {p}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Preview Template
                        </summary>
                        <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto">
                          {result.integration.requestBody.preview}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}

                {/* Field Mappings */}
                {result.integration.fieldMappings && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Field Mappings
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span>Status:</span>
                        {result.integration.fieldMappings.valid ? (
                          <span className="text-green-600">✓ Valid JSON</span>
                        ) : (
                          <span className="text-red-600">✗ Invalid JSON</span>
                        )}
                      </div>

                      {result.integration.fieldMappings.error && (
                        <Alert variant="destructive">
                          <AlertTitle>JSON Parse Error</AlertTitle>
                          <AlertDescription className="font-mono text-xs">
                            {result.integration.fieldMappings.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Mappings: {result.integration.fieldMappings.count}
                      </div>

                      {result.integration.fieldMappings.mappings &&
                        result.integration.fieldMappings.mappings.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium">
                              View Mappings
                            </summary>
                            <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(result.integration.fieldMappings.mappings, null, 2)}
                            </pre>
                          </details>
                        )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw Response */}
          <details>
            <summary className="cursor-pointer text-sm font-medium mb-2">
              View Raw Response
            </summary>
            <Card>
              <CardContent className="pt-6">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </details>
        </div>
      )}
    </div>
  );
}
