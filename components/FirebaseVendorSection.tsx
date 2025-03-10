'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import NewsCard from './NewsCard';
import { getNewsByProvider, NewsItem, formatNewsItem } from '@/lib/services/news-service';

interface VendorProps {
  providerId: string;
  providerName: string;
  logo?: React.ReactNode;
}

export default function FirebaseVendorSection({ providerId, providerName, logo }: VendorProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // Normalizar el ID del proveedor para asegurar que coincida con el formato esperado por el backend
        // Bloomberg y DF.cl son los valores esperados en el backend
        const normalizedProviderId = providerId === 'bloomberg' ? 'Bloomberg' : 
                                    providerId === 'df.cl' ? 'DF.cl' : 
                                    providerId;
        
        console.log(`Fetching news for provider: ${normalizedProviderId}`);
        const newsData = await getNewsByProvider(normalizedProviderId, { limit: 8 });
        setNews(newsData);
      } catch (err) {
        console.error(`Error fetching news for ${providerName}:`, err);
        setError(`No se pudieron cargar las noticias de ${providerName}`);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [providerId, providerName]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  // Definir logo por defecto si no se proporciona uno
  const defaultLogo = (
    <Newspaper 
      className={`h-8 w-8 ${
        providerId.toLowerCase() === 'df.cl' ? 'text-blue-600' : 
        providerId.toLowerCase() === 'bloomberg' ? 'text-orange-600' : 
        'text-primary'
      }`} 
    />
  );

  const vendorLogo = logo || defaultLogo;

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center space-x-3 mb-8">
          {vendorLogo}
          <h2 className="text-2xl font-bold">{providerName}</h2>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">Cargando noticias...</p>
        </div>
      </div>
    );
  }

  if (error || news.length === 0) {
    return (
      <div className="py-8">
        <div className="flex items-center space-x-3 mb-8">
          {vendorLogo}
          <h2 className="text-2xl font-bold">{providerName}</h2>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">{error || `No hay noticias disponibles de ${providerName}`}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className="relative py-8"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {vendorLogo}
          <h2 className="text-2xl font-bold">{providerName}</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link href={`/provider/${providerId}`}>
            <Button variant="outline" className="text-sm">
              View All
            </Button>
          </Link>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
      >
        {news.map((item, index) => {
          const formattedItem = formatNewsItem(item);
          return (
            <motion.div
              key={item.id}
              variants={{
                hidden: { opacity: 0, x: 20 },
                visible: { opacity: 1, x: 0 }
              }}
              className="min-w-[300px] md:min-w-[350px] snap-start"
            >
              <NewsCard
                title={formattedItem.title}
                content={formattedItem.description}
                image={formattedItem.image}
                category={formattedItem.category}
                date={formattedItem.date}
                vendorId={providerId.toLowerCase()}
                newsId={item.id}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
