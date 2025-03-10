'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';
import { NewsItem } from '@/lib/services/news-service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientTabsProps {
  categories: string[];
  news: NewsItem[];
}

export default function ClientTabs({ categories, news }: ClientTabsProps) {
  const [activeTab, setActiveTab] = useState('All');

  const filteredNews = activeTab === 'All' 
    ? news 
    : news.filter(item => item.category === activeTab);

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

  // Función para generar la URL de la noticia
  const getNewsUrl = (newsItem: NewsItem) => {
    return `/news/${newsItem.provider?.toLowerCase()}-${newsItem.id}`;
  };

  return (
    <Tabs defaultValue="All" className="space-y-8">
      <TabsList className="flex flex-wrap gap-2">
        {categories.map(category => (
          <TabsTrigger 
            key={category} 
            value={category}
            onClick={() => setActiveTab(category)}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {category}
          </TabsTrigger>
        ))}
      </TabsList>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.length > 0 ? (
              filteredNews.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 w-full">
                    <Image
                      src={item.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab'}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                        {item.category || 'General'}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 text-lg">
                      <Link href={getNewsUrl(item)} className="hover:text-primary transition-colors">
                        {item.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="line-clamp-3">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>5 min lectura</span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center h-64">
                <p className="text-muted-foreground text-lg">
                  No hay noticias disponibles en esta categoría
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}