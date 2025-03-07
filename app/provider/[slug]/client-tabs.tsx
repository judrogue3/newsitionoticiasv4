'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NewsCard from '@/components/NewsCard';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
}

interface ClientTabsProps {
  categories: string[];
  news: NewsItem[];
}

export default function ClientTabs({ categories, news }: ClientTabsProps) {
  const [activeTab, setActiveTab] = useState('All');

  const filteredNews = activeTab === 'All' 
    ? news 
    : news.filter(item => item.category === activeTab);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNews.map(news => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <NewsCard
                  title={news.title}
                  content={news.description}
                  image={news.image}
                  category={news.category}
                  date={`${news.date} · ${news.readTime}`}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
}