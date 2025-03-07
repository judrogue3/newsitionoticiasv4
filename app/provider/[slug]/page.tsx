import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ClientTabs from './client-tabs';

// Import the vendors data from the home page to ensure consistency
import { vendors } from '@/app/page';

export function generateStaticParams() {
  return vendors.map((vendor) => ({
    slug: vendor.id,
  }));
}

interface Props {
  params: {
    slug: string;
  };
}

export default function ProviderPage({ params }: Props) {
  const { slug } = params;
  const provider = vendors.find(v => v.id === slug);
  
  if (!provider) {
    notFound();
  }

  const categories = ['All', ...new Set(provider.news.map(item => item.category))];

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            {provider.logo}
            <h1 className="text-2xl font-bold">{provider.name}</h1>
          </div>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ClientTabs categories={categories} news={provider.news} />
      </Suspense>
    </div>
  );
}