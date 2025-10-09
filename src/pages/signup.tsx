import { useFormik } from 'formik';
import React, { useContext, useState, useEffect } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import GoogleButton from '@/components/GoogleButton';
import Logo from '@/components/Logo';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SignUpPage = () => {
  const router = useRouter();
  const { initializing } = useContext(AuthContext);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);
  interface InvitationData {
    email: string;
    role?: {
      name: string;
    };
    [key: string]: unknown;
  }

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validatingInvitation, setValidatingInvitation] = useState(false);
  const { toast } = useToast();

  /**
   * Validates invitation token format
   * Expected format: UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)
   * Adjust regex pattern based on your backend's token format
   */
  const validateTokenFormat = (token: string): boolean => {
    if (!token || token.trim() === '') {
      setTokenValidationError('Invitation token is required');
      return false;
    }

    // UUID v4 format validation (adjust if your backend uses different format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(token.trim())) {
      setTokenValidationError('Invalid invitation token format');
      return false;
    }

    setTokenValidationError(null);
    return true;
  };

  // Check for invitation token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invitation');
    if (token) {
      // Validate token format before proceeding
      if (validateTokenFormat(token)) {
        setInvitationToken(token);
        validateInvitation(token);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Invitation Token",
          description: tokenValidationError || "The invitation token format is invalid.",
        });
        router.push('/signup');
      }
    }
  }, []);

  const validateInvitation = async (token: string) => {
    setValidatingInvitation(true);
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setInvitationData(data.user);
        formik.setFieldValue('email', data.user.email);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid Invitation",
          description: data.error || "This invitation link is invalid or has expired.",
        });
        router.push('/signup');
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to validate invitation.",
      });
      router.push('/signup');
    } finally {
      setValidatingInvitation(false);
    }
  };

  interface FormValues {
    email: string;
    password: string;
  }

  const handleSignUp = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const { email, password } = values;

      // Validate invitation token format if present
      if (invitationToken && !validateTokenFormat(invitationToken)) {
        toast({
          variant: "destructive",
          title: "Invalid Token",
          description: tokenValidationError || "The invitation token format is invalid.",
        });
        setIsLoading(false);
        return;
      }

      // Prepare request body - only include invitationToken if it's valid
      const requestBody: { email: string; password: string; invitationToken?: string } = {
        email,
        password,
      };

      // Only include invitationToken if it exists and passed validation
      if (invitationToken && validateTokenFormat(invitationToken)) {
        requestBody.invitationToken = invitationToken;
      }

      // Use the signup API endpoint which handles both regular and invitation signups
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      if (invitationToken) {
        toast({
          title: "Success",
          description: "Your account has been created successfully! You can now log in.",
        });
      } else {
        toast({
          title: "Success",
          description: "Sign up successful! Please login to continue.",
        });
      }

      router.push('/login');
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const validationSchema = Yup.object().shape({
    email: Yup.string().required("Email is required").email("Email is invalid"),
    password: Yup.string()
      .required("Password is required")
      .min(4, "Must be at least 4 characters")
      .max(40, "Must not exceed 40 characters"),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: handleSignUp,
  });

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      formik.handleSubmit();
    }
  };

  return (
    <div className="flex h-screen bg-background justify-center items-center">
      <div className="flex flex-col gap-5 h-auto">
        <div className="w-full flex justify-center cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>

        <Card className="w-full md:w-[440px]" onKeyDown={handleKeyPress}>
          <CardHeader>
            <CardTitle className="text-center">
              {invitationToken ? 'Complete Your Invitation' : 'Sign up'}
            </CardTitle>
            {invitationData && (
              <div className="text-center text-sm text-muted-foreground">
                You&apos;ve been invited to join as <span className="font-semibold">{invitationData.role?.name || 'User'}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {validatingInvitation ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Validating invitation...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={formik.handleSubmit}>
                <div className="flex flex-col gap-6">
                  {!invitationToken && (
                    <>
                      <div className="flex flex-col gap-4">
                        <GoogleButton />
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            router.push('/magic-link-login');
                          }}
                          variant="outline"
                        >
                          Continue with Magic Link
                        </Button>
                      </div>

                      <div className="flex items-center w-full">
                        <Separator className="flex-1" />
                        <span className="mx-4 text-muted-foreground text-sm font-semibold whitespace-nowrap">or</span>
                        <Separator className="flex-1" />
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-6">
                    <p className="text-center text-sm text-muted-foreground">
                      {invitationToken ? 'Set your password to complete registration' : 'Enter your details'}
                    </p>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          disabled={!!invitationToken}
                          className={invitationToken ? "bg-muted" : ""}
                        />
                        {formik.touched.email && formik.errors.email && (
                          <p className="text-destructive text-xs">{formik.errors.email}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPw ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={formik.values.password}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPw(!showPw)}
                          >
                            {showPw
                              ? <FaEye className="text-muted-foreground" />
                              : <FaEyeSlash className="text-muted-foreground" />
                            }
                          </Button>
                        </div>
                        {formik.touched.password && formik.errors.password && (
                          <p className="text-destructive text-xs">{formik.errors.password}</p>
                        )}
                      </div>

                      {!invitationToken && (
                        <div className="flex justify-end mt-2 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span>Already have an account?</span>
                            <Button
                              type="button"
                              variant="link"
                              className="p-0"
                              onClick={() => router.push('/login')}
                            >
                              Log in
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || initializing || !formik.values.email || !formik.values.password || !formik.isValid}
                  >
                    {invitationToken ? 'Complete Registration' : 'Sign Up'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUpPage;
