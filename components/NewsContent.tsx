'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

interface Article {
  title: string;
  description: string;
  category: string;
  date: string;
}

interface NewsContentProps {
  article: Article;
}

export default function NewsContent({ article }: NewsContentProps) {
  const [activeTab, setActiveTab] = useState('content');

  const fullContent = `
    Chile's economy is showing promising signs of recovery, according to the latest economic indicators released by the Central Bank. The country's GDP growth has exceeded expectations, marking a significant turnaround from previous quarters.

    Key Highlights:
    • GDP Growth: 3.2% year-over-year increase
    • Employment: Creation of 150,000 new jobs
    • Foreign Investment: 25% increase in direct foreign investment
    • Export Growth: 15% rise in non-mining exports

    The recovery is particularly notable in sectors such as technology, renewable energy, and services. Small and medium-sized enterprises (SMEs) have shown remarkable resilience, with many adapting successfully to digital transformation demands.

    Industry experts attribute this positive trend to several factors:
    1. Successful monetary policy adjustments
    2. Strong commodity prices
    3. Increased regional trade cooperation
    4. Digital transformation initiatives

    The Central Bank's strategic decisions have played a crucial role in stabilizing inflation while maintaining favorable conditions for growth. The government's commitment to digital transformation and sustainable development has also attracted significant international investment.

    Looking ahead, economists project continued growth through 2024, supported by:
    • Infrastructure development projects
    • Green energy initiatives
    • Technology sector expansion
    • Export market diversification

    However, challenges remain, including:
    • Global economic uncertainties
    • Climate change impacts
    • Regional political dynamics
    • Supply chain adjustments

    Despite these challenges, Chile's economic fundamentals remain strong, with analysts predicting sustained growth throughout the year. The government's focus on digital innovation and sustainable development continues to attract international investors and partners.
  `;

  return (
    <div className="max-w-7xl mx-auto px-4">
      <Tabs defaultValue="content" className="space-y-12">
        <div className="flex justify-center">
          <TabsList className="inline-flex h-14 items-center justify-center rounded-full p-1 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger 
              value="content" 
              onClick={() => setActiveTab('content')}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-8 py-3 text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80"
            >
              Full Article
            </TabsTrigger>
            <TabsTrigger 
              value="summary" 
              onClick={() => setActiveTab('summary')}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-8 py-3 text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:bg-muted/80"
            >
              Quick Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <TabsContent value="content" className="space-y-8">
              <Card className="p-8 lg:p-16">
                <div className="prose prose-xl dark:prose-invert prose-headings:font-serif prose-headings:font-bold prose-p:text-xl prose-p:leading-relaxed prose-p:font-sans prose-li:text-lg prose-li:leading-relaxed max-w-none">
                  <div className="whitespace-pre-line">
                    {fullContent}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="space-y-8">
              <Card className="p-8 lg:p-16">
                <div className="prose prose-xl dark:prose-invert max-w-none">
                  <p className="text-2xl leading-relaxed font-serif">
                    {article.description}
                  </p>
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-3xl font-serif font-bold text-primary">Key Points</h3>
                      <ul className="list-disc list-inside space-y-3 text-xl">
                        <li>GDP Growth exceeding expectations</li>
                        <li>Strong employment numbers</li>
                        <li>Increased foreign investment</li>
                        <li>Export sector growth</li>
                      </ul>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-3xl font-serif font-bold text-primary">Outlook</h3>
                      <ul className="list-disc list-inside space-y-3 text-xl">
                        <li>Positive growth trajectory</li>
                        <li>Stable monetary policy</li>
                        <li>Digital transformation focus</li>
                        <li>Sustainable development</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Related Articles Section */}
      <div className="mt-24">
        <h2 className="text-4xl font-serif font-bold mb-12">Related Articles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <h3 className="text-2xl font-serif font-bold mb-4 group-hover:text-primary transition-colors">Infrastructure Investment Plans</h3>
            <p className="text-xl text-muted-foreground">Government announces major infrastructure development projects...</p>
          </Card>
          <Card className="p-8 hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <h3 className="text-2xl font-serif font-bold mb-4 group-hover:text-primary transition-colors">Tech Investment in Chile Surges</h3>
            <p className="text-xl text-muted-foreground">Foreign investment in Chilean technology sector reaches record levels...</p>
          </Card>
        </div>
      </div>
    </div>
  );
}