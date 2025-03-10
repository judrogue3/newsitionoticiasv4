import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import NewsContent from '@/components/NewsContent';
import { vendors } from '@/app/page';
import { getNewsById } from '@/lib/services/news-service';

interface Props {
  params: {
    id: string;
  };
}

export async function generateStaticParams() {
  const params = vendors.flatMap(vendor => 
    vendor.news.map(news => ({
      id: `${vendor.id}-${news.id}`
    }))
  );
  
  // No incluimos noticias de DF.cl en los parámetros estáticos
  // ya que estas se obtienen dinámicamente
  
  return params;
}

export default async function NewsPage({ params }: Props) {
  const { id } = params;
  
  console.log('Página de noticia - ID recibido:', id);
  
  try {
    // Si el ID comienza con 'df-', es una noticia de DF.cl
    if (id.startsWith('df-')) {
      console.log('Intentando obtener noticia de DF.cl con ID:', id);
      
      const article = await getNewsById(id);
      console.log('Resultado de getNewsById:', article ? 'Noticia encontrada' : 'Noticia no encontrada');
      
      if (!article) {
        console.log('Noticia de DF.cl no encontrada, redirigiendo a 404');
        notFound();
      }
      
      const fullArticle = {
        ...article,
        vendorName: 'DF.cl',
        vendorLogo: '📰', // Puedes reemplazar esto con el logo real de DF.cl
        date: new Date(article.created_at || '').toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        category: article.category || 'General',
        readTime: '5 min de lectura',
        image: article.image_url || '/placeholder-image.jpg',
        content: article.content || ''
      };
      
      return (
        <div className="min-h-screen bg-background">
          {/* Hero Section - Made taller and more impactful */}
          <div className="relative h-[80vh] w-full overflow-hidden">
            <Image
              src={fullArticle.image}
              alt={fullArticle.title || ''}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="container relative h-full flex items-end pb-24">
              <div className="max-w-5xl space-y-8">
                <div className="flex items-center space-x-4">
                  <Link href="/">
                    <Button variant="outline" size="icon" className="bg-white/20 backdrop-blur-sm border-none hover:bg-white/30">
                      <ChevronLeft className="h-4 w-4 text-white" />
                    </Button>
                  </Link>
                  <span className="text-white/80 text-sm font-medium">{fullArticle.date}</span>
                  <span className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                    {fullArticle.category}
                  </span>
                </div>
                <h1 className="headline text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl font-serif leading-tight">
                  {fullArticle.title}
                </h1>
                <div className="flex items-center space-x-4 text-white/90">
                  <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                    {fullArticle.vendorLogo}
                    <span className="font-medium">{fullArticle.vendorName}</span>
                  </div>
                  <span className="text-white/60">•</span>
                  <span className="font-medium">{fullArticle.readTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Article Content - Increased padding and width */}
          <div className="container py-16">
            <NewsContent article={fullArticle} />
          </div>
        </div>
      );
    }
    
    // Para las noticias de otros proveedores, mantener el código original
    const [vendorId, newsId] = id.split('-');
    
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
      notFound();
    }

    const article = vendor.news.find(n => n.id === newsId);
    if (!article) {
      notFound();
    }

    const fullArticle = {
      ...article,
      vendorName: vendor.name,
      vendorLogo: vendor.logo
    };

    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section - Made taller and more impactful */}
        <div className="relative h-[80vh] w-full overflow-hidden">
          <Image
            src={fullArticle.image}
            alt={fullArticle.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="container relative h-full flex items-end pb-24">
            <div className="max-w-5xl space-y-8">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="outline" size="icon" className="bg-white/20 backdrop-blur-sm border-none hover:bg-white/30">
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </Button>
                </Link>
                <span className="text-white/80 text-sm font-medium">{fullArticle.date}</span>
                <span className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                  {fullArticle.category}
                </span>
              </div>
              <h1 className="headline text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl font-serif leading-tight">
                {fullArticle.title}
              </h1>
              <div className="flex items-center space-x-4 text-white/90">
                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  {fullArticle.vendorLogo}
                  <span className="font-medium">{fullArticle.vendorName}</span>
                </div>
                <span className="text-white/60">•</span>
                <span className="font-medium">{fullArticle.readTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Article Content - Increased padding and width */}
        <div className="container py-16">
          <NewsContent article={fullArticle} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error al cargar la noticia:', error);
    notFound();
  }
}