import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ResetPasswordPage = () => {
  const router = useRouter();
  const { updatePassword } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const { toast } = useToast();

  // Handle auth session from URL parameters
  useEffect(() => {
    const handleAuthSession = async () => {
      try {
        // Check if we have URL parameters for auth (Appwrite recovery flow)
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const secret = urlParams.get('secret');
        
        if (userId && secret) {
          // Appwrite sends userId and secret in the recovery URL
          setSessionReady(true);
        } else {
          setSessionError('Invalid reset link. Please request a new password reset.');
        }
      } catch (error) {
        console.error('Error handling auth session:', error);
        setSessionError('An error occurred. Please try again.');
      }
    };

    handleAuthSession();
  }, []);

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .required("Required")
      .min(8, "Must be at least 8 characters")
      .matches(/[a-zA-Z]/, "Must contain at least one letter")
      .matches(/[0-9]/, "Must contain at least one number"),
    confirmPassword: Yup.string()
      .required("Required")
      .oneOf([Yup.ref('password')], "Passwords must match"),
  });

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        if (!sessionReady) {
          throw new Error('Session not ready. Please try again.');
        }

        // Get URL parameters for Appwrite recovery
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const secret = urlParams.get('secret');

        if (!userId || !secret) {
          throw new Error('Invalid reset link parameters.');
        }

        // Complete the password recovery using Appwrite
        const response = await fetch('/api/auth/complete-recovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            secret,
            password: values.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to reset password');
        }

        toast({
          title: "Success",
          description: "Password reset successfully! Please login with your new password.",
        });

        // Redirect to login page
        router.push('/login');
      } catch (error: unknown) {
        console.error('Error resetting password:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset password. Please try again.';
        setSessionError(errorMessage);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex h-screen bg-background justify-center items-center">
      <div className="flex flex-col gap-5 h-auto">
        <div className="w-full flex justify-center cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>

        <Card className="w-full md:w-[440px]">
          <CardHeader>
            <CardTitle className="text-center">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit}>
              <div className="flex flex-col gap-6">
                <p className="text-center text-sm text-muted-foreground">
                  Enter your new password below.
                </p>

                {sessionError && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-lg text-center">
                    {sessionError}
                  </div>
                )}

                {!sessionReady && !sessionError && (
                  <div className="p-3 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                    Verifying reset link...
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        placeholder="Enter your new password"
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEye className="text-muted-foreground" /> : <FaEyeSlash className="text-muted-foreground" />}
                      </Button>
                    </div>
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-destructive text-xs">{formik.errors.password}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="Confirm your new password"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaEye className="text-muted-foreground" /> : <FaEyeSlash className="text-muted-foreground" />}
                      </Button>
                    </div>
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <p className="text-destructive text-xs">{formik.errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !formik.isValid || !sessionReady || !!sessionError}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0"
                    onClick={() => router.push('/login')}
                  >
                    Back to Login
                  </Button>
                </div>

                {sessionError && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0"
                      onClick={() => router.push('/forgot-password')}
                    >
                      Request New Reset Link
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;