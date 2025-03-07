'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const plans = {
  free: { price: 0, annual: 0 },
  standard: { price: 9.99, annual: 99.99 },
  premium: { price: 19.99, annual: 199.99 },
};

export default function SignUpPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const annualDiscount = 15; // 15% discount for annual plans

  const formatPrice = (price: number) => price.toFixed(2);

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="container max-w-6xl">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight mb-4"
          >
            Choose your plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground"
          >
            Get unlimited access to all our features
          </motion.p>

          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-sm ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>Monthly</span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <span className={`text-sm ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
              Annually <span className="text-green-500 font-medium">({annualDiscount}% off)</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(plans).map(([key, plan], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full flex flex-col">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold capitalize">{key}</h3>
                  <p className="text-muted-foreground mt-2">
                    {key === 'free' ? 'Perfect for getting started' :
                     key === 'standard' ? 'Great for regular readers' :
                     'For professional users'}
                  </p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      ${formatPrice(isAnnual ? plan.annual / 12 : plan.price)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                    {isAnnual && plan.annual > 0 && (
                      <p className="text-sm text-green-500 mt-1">
                        Billed annually (${formatPrice(plan.annual)}/year)
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 flex-grow">
                  {[
                    ...(key === 'free' ? [
                      'Access to basic news articles',
                      'Limited daily reads',
                      'Basic search functionality',
                      'Email notifications',
                    ] : []),
                    ...(key === 'standard' ? [
                      'Everything in Free',
                      'Unlimited article access',
                      'Advanced search filters',
                      'Personalized news feed',
                      'Ad-free experience',
                      'Premium newsletters',
                    ] : []),
                    ...(key === 'premium' ? [
                      'Everything in Standard',
                      'Early access to news',
                      'Expert analysis',
                      'Market data access',
                      'API access',
                      'Custom reports',
                      'Priority support',
                    ] : []),
                  ].map((feature) => (
                    <div key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/subscribe?plan=${key}&billing=${isAnnual ? 'annual' : 'monthly'}`}
                  className="mt-8 block"
                >
                  <Button className="w-full" variant={key === 'standard' ? 'default' : 'outline'}>
                    Get started
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}