import { Suspense } from 'react';
import { Newspaper, Building2, Building, BookOpen, LineChart, BarChart, TrendingUp, ArrowLeftRight } from 'lucide-react';
import FirebaseFeaturedNews from '@/components/FirebaseFeaturedNews';
import FirebaseVendorSection from '@/components/FirebaseVendorSection';

// Export vendors so it can be imported in other files
export const vendors = [
  {
    id: 'df.cl',
    name: 'DF.cl',
    logo: <Newspaper className="h-8 w-8 text-blue-600" />,
    news: []
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    logo: <Newspaper className="h-8 w-8 text-orange-600" />,
    news: []
  },
  {
    id: 'wsj',
    name: 'Wall Street Journal',
    logo: <Newspaper className="h-8 w-8 text-primary" />,
    news: []
  },
  {
    id: 'ft',
    name: 'Financial Times',
    logo: <BookOpen className="h-8 w-8 text-pink-600" />,
    news: []
  },
  {
    id: 'cmf',
    name: 'CMF',
    logo: <Building2 className="h-8 w-8 text-green-600" />,
    news: []
  },
  {
    id: 'markets',
    name: 'Markets',
    logo: <LineChart className="h-8 w-8 text-violet-600" />,
    news: []
  },
  {
    id: 'banco-central',
    name: 'Banco Central',
    logo: <Building className="h-8 w-8 text-blue-600" />,
    news: []
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <FirebaseFeaturedNews />
      <div className="container py-8 space-y-16">
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Cargando noticias de Bloomberg...</div>}>
          <FirebaseVendorSection 
            providerId="bloomberg" 
            providerName="Bloomberg" 
            logo={<Newspaper className="h-8 w-8 text-orange-600" />} 
          />
        </Suspense>
        
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Cargando noticias de DF.cl...</div>}>
          <FirebaseVendorSection 
            providerId="df.cl" 
            providerName="DF.cl" 
            logo={<Newspaper className="h-8 w-8 text-blue-600" />} 
          />
        </Suspense>
      </div>
    </div>
  );
}
