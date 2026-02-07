import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * Redact sensitive fields from response objects
 */
const redactSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'apiKey', 'sessionId', 'refreshToken', 'accessToken',
    'authorization', 'bearer', 'jwt', 'credential', 'privateKey', 'key', 'auth', 'passwd',
    'ssn', 'appwriteApiKey', 'appwriteSecret', 'databaseUrl', 'cloudinarySecret'
  ];
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in redacted) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  return redacted;
};

export default function TestAuthPage() {
  const { user, userProfile } = useAuth();
  const [sessionTest, setSessionTest] = useState<any>(null);
  const [apiTest, setApiTest] = useState<any>(null);
  const testSession = async () => {
    try {
      const response = await fetch('/api/auth/test-session');
      if (!response.ok) {
        const errorData = await response.json();
        setSessionTest({ error: errorData.error || 'Request failed' });
        return;
      }
      const data = await response.json();
      setSessionTest(data);
    } catch (error) {
      setSessionTest({ error: String(error) });
    }
  };

  const testApiCall = async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        const errorData = await response.json();
        setApiTest({ success: false, error: errorData.error || 'Request failed' });
        return;
      }
      const data = await response.json();
      setApiTest({ success: true, data });
    } catch (error) {
      setApiTest({ success: false, error: String(error) });
    }
  };

  useEffect(() => {
    if (user) {
      testSession();
      testApiCall();
    }
  }, [user]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client-Side Auth State</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div>
                <p><strong>User ID:</strong> {user.$id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.name}</p>
                {userProfile && (
                  <div className="mt-4">
                    <p><strong>Profile ID:</strong> {userProfile.$id}</p>
                    <p><strong>Role ID:</strong> {userProfile.roleId || 'None'}</p>
                  </div>
                )}
              </div>
            ) : (
              <p>Not authenticated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server-Side Session Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testSession} className="mb-4">Test Session</Button>
            {sessionTest && (
              <pre className="bg-gray-100 p-4 rounded-sm overflow-auto">
                {JSON.stringify(redactSensitiveData(sessionTest), null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Call Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testApiCall} className="mb-4">Test API Call</Button>
            {apiTest && (
              <pre className="bg-gray-100 p-4 rounded-sm overflow-auto">
                {JSON.stringify(redactSensitiveData(apiTest), null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
