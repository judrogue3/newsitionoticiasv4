'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';
import Link from 'next/link';
import { getNewsByProvider, NewsItem } from '@/lib/services/news-service';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ExternalLink, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function FirebaseFeaturedNews() {
  const [featuredNews, setFeaturedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    const fetchFeaturedNews = async () => {
      try {
        setLoading(true);
        // Obtener específicamente noticias de Bloomberg
        const news = await getNewsByProvider('Bloomberg', { limit: 5 });
        if (news && news.length > 0) {
          // Seleccionar la primera noticia como destacada
          setFeaturedNews(news[0]);
        }
      } catch (err) {
        console.error('Error fetching Bloomberg featured news:', err);
        setError('No se pudieron cargar las noticias destacadas de Bloomberg');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedNews();
  }, []);

  // Función para formatear la fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="relative h-[70vh] min-h-[600px] w-full flex items-center justify-center bg-gradient-to-r from-slate-900 to-blue-900">
        <div className="text-2xl font-medium text-white">Cargando noticia destacada de Bloomberg...</div>
      </div>
    );
  }

  if (error || !featuredNews) {
    return (
      <div className="relative h-[70vh] min-h-[600px] w-full flex items-center justify-center bg-gradient-to-r from-slate-900 to-blue-900">
        <div className="text-2xl font-medium text-white">
          {error || 'No hay noticias destacadas de Bloomberg disponibles'}
        </div>
      </div>
    );
  }

  // Construir URL para la noticia
  const newsUrl = `/news/bloomberg-${featuredNews.id}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative h-[70vh] min-h-[600px] w-full overflow-hidden"
    >
      {/* Imagen de fondo con overlay */}
      <Image
        src={featuredNews.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab'}
        alt={featuredNews.title}
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/30" />
      
      {/* Contenido */}
      <div className="container relative h-full flex flex-col justify-end pb-16">
        <div className="absolute top-8 left-8 z-10">
          <div className="flex items-center space-x-2">
            <div className="bg-black/50 backdrop-blur-md p-2 rounded-full">
              <Image 
                src="/bloomberg-logo.png" 
                alt="Bloomberg" 
                width={40} 
                height={40}
                className="rounded-full"
                onError={(e) => {
                  // Fallback si la imagen no existe
                  const target = e.target as HTMLImageElement;
                  target.src = "https://upload.wikimedia.org/wikipedia/commons/5/56/Bloomberg_logo.svg";
                }}
              />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Bloomberg</span>
          </div>
        </div>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl space-y-6 backdrop-blur-sm bg-black/30 p-8 rounded-xl"
        >
          <div className="flex items-center space-x-4">
            <span className="inline-block bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              {featuredNews.category || 'Finanzas'}
            </span>
            <div className="flex items-center text-gray-300 text-sm">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(featuredNews.created_at)}</span>
            </div>
            <div className="flex items-center text-gray-300 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              <span>5 min lectura</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {featuredNews.title}
          </h1>
          
          <p className="text-xl text-gray-200 leading-relaxed">
            {featuredNews.description}
          </p>
          
          <div className="flex items-center space-x-4 pt-4">
            <Link href={newsUrl}>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-6 font-medium transition-all duration-300 flex items-center space-x-2 h-12">
                <span>Leer Artículo Completo</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            
            {featuredNews.url && (
              <Link href={featuredNews.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-white text-white hover:bg-white/20 rounded-full px-6 h-12 font-medium transition-all duration-300 flex items-center space-x-2">
                  <span>Fuente Original</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
