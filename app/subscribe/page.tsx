'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  cardNumber: z.string().min(16, 'Invalid card number'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiry date (MM/YY)'),
  cvc: z.string().length(3, 'Invalid CVC'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const plans = {
  free: { price: 0, annual: 0 },
  standard: { price: 9.99, annual: 99.99 },
  premium: { price: 19.99, annual: 199.99 },
};

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'free';
  const billing = searchParams.get('billing') || 'monthly';
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const showPaymentFields = plan !== 'free';
  const price = billing === 'monthly' 
    ? plans[plan as keyof typeof plans].price 
    : +(plans[plan as keyof typeof plans].annual / 12).toFixed(2);

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    setPaymentError(null);

    try {
      if (showPaymentFields) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to initialize');

        const { paymentMethod, error: paymentMethodError } = await stripe.createPaymentMethod({
          type: 'card',
          card: {
            number: data.cardNumber,
            exp_month: parseInt(data.expiryDate.split('/')[0]),
            exp_year: parseInt('20' + data.expiryDate.split('/')[1]),
            cvc: data.cvc,
          },
        });

        if (paymentMethodError) {
          throw new Error(paymentMethodError.message);
        }

        console.log('Payment Method:', paymentMethod.id);
      }

      console.log('Form Data:', { ...data, plan, billing });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Complete your registration
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You selected the <span className="font-medium capitalize">{plan}</span> plan with{' '}
            <span className="font-medium">{billing}</span> billing
            {showPaymentFields && (
              <>
                {' '}at <span className="font-medium">${price.toFixed(2)}/month</span>
              </>
            )}
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className="w-full mt-1"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className="w-full mt-1"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                {...register('email')}
                type="email"
                className="w-full mt-1"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                {...register('password')}
                type="password"
                className="w-full mt-1"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                {...register('confirmPassword')}
                type="password"
                className="w-full mt-1"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {showPaymentFields && (
              <>
                <Separator className="my-8" />
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Payment Information</h3>
                  
                  <div>
                    <Label htmlFor="cardNumber">Card number</Label>
                    <Input
                      id="cardNumber"
                      {...register('cardNumber')}
                      placeholder="1234 5678 9012 3456"
                      className="w-full mt-1"
                    />
                    {errors.cardNumber && (
                      <p className="mt-1 text-sm text-destructive">{errors.cardNumber.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry date</Label>
                      <Input
                        id="expiryDate"
                        {...register('expiryDate')}
                        placeholder="MM/YY"
                        className="w-full mt-1"
                      />
                      {errors.expiryDate && (
                        <p className="mt-1 text-sm text-destructive">{errors.expiryDate.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        {...register('cvc')}
                        placeholder="123"
                        className="w-full mt-1"
                      />
                      {errors.cvc && (
                        <p className="mt-1 text-sm text-destructive">{errors.cvc.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {paymentError && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                {paymentError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : `Subscribe${showPaymentFields ? ` for $${price.toFixed(2)}/month` : ''}`}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                // TODO: Implement Google signup
              }}
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Sign up with Google
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}