'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  timestamp: Date;
}

interface ProviderCardProps {
  provider: string;
  logo: string;
  news: NewsItem[];
  isLoading?: boolean;
}

export default function ProviderCard({ provider, logo, news, isLoading }: ProviderCardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <img src={logo} alt={provider} className="h-6 w-6" />
            <h3 className="font-bold text-lg">{provider}</h3>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {news.map((item) => (
              <motion.li
                key={item.id}
                whileHover={{ x: 5 }}
                className="cursor-pointer"
              >
                <p className="text-sm font-medium hover:text-primary transition-colors">
                  {item.title}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}