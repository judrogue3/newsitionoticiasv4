'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Card, CardContent } from '@/components/ui/card';

interface NewsCardProps {
  title: string;
  content: string;
  image: string;
  category: string;
  date: string;
  vendorId?: string;
  newsId?: string;
}

export default function NewsCard({ title, content, image, category, date, vendorId, newsId }: NewsCardProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Construir la URL correctamente para DF.cl
  let newsUrl = '#';
  if (vendorId && newsId) {
    // Si es DF.cl, usar el formato especial df-[id]
    if (vendorId.toLowerCase() === 'df.cl') {
      // Asegurarse de que el ID no contenga ya el prefijo 'df-'
      const cleanId = newsId.startsWith('df-') ? newsId : `df-${newsId}`;
      newsUrl = `/news/${cleanId}`;
      console.log(`Construyendo URL para noticia DF.cl: ${newsUrl} (ID original: ${newsId})`);
    } else {
      // Para otros proveedores, mantener el formato original
      newsUrl = `/news/${vendorId}-${newsId}`;
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Link href={newsUrl}>
        <Card className="news-card h-full overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                {category}
              </span>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold leading-tight hover:text-primary cursor-pointer transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{content}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{date}</span>
                <span className="text-sm font-medium text-primary hover:underline">
                  Read more
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}