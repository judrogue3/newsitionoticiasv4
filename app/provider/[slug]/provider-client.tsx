'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ClientTabs from './client-tabs';
import { getNewsByProvider, getCategories, NewsItem } from '@/lib/services/news-service';

interface ProviderClientProps {
  slug: string;
  normalizedProviderId: string;
  provider: {
    id: string;
    name: string;
    logo: JSX.Element;
  } | undefined;
}

export default function ProviderClient({ slug, normalizedProviderId, provider }: ProviderClientProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  if (!provider) {
    notFound();
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener noticias del proveedor
        console.log(`Fetching news for provider: ${normalizedProviderId}`);
        const newsData = await getNewsByProvider(normalizedProviderId, { limit: 50 });
        setNews(newsData);
        
        // Obtener categorías disponibles para el proveedor
        const categoriesData = await getCategories(normalizedProviderId);
        setCategories(['All', ...categoriesData]);
        
      } catch (err) {
        console.error(`Error fetching data for ${provider.name}:`, err);
        setError(`No se pudieron cargar los datos de ${provider.name}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [normalizedProviderId, provider.name]);

  if (loading) {
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
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl font-medium text-gray-500">Cargando noticias...</div>
        </div>
      </div>
    );
  }

  if (error) {
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
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl font-medium text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

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

      <ClientTabs 
        categories={categories} 
        news={news} 
      />
    </div>
  );
}
