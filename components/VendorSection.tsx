'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import NewsCard from './NewsCard';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
}

interface VendorProps {
  vendor: {
    id: string;
    name: string;
    logo: React.ReactNode;
    news: NewsItem[];
  };
}

export default function VendorSection({ vendor }: VendorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className="relative"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          {vendor.logo}
          <h2 className="text-2xl font-bold">{vendor.name}</h2>
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
          <Link href={`/provider/${vendor.id}`}>
            <Button variant="default">View All</Button>
          </Link>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
      >
        {vendor.news.map((item, index) => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0 }
            }}
            className="min-w-[300px] md:min-w-[350px] snap-start"
          >
            <NewsCard
              title={item.title}
              content={item.description}
              image={item.image}
              category={item.category}
              date={`${item.date} · ${item.readTime}`}
              vendorId={vendor.id}
              newsId={item.id}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}