import { ScrapedNewsItem } from './simple-scraping-service';

/**
 * Servicio para obtener noticias desde la API del backend
 */

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  content?: string;
  url?: string;
  image_url?: string;
  provider?: string;
  category?: string;
  created_at?: string;
  is_featured?: boolean;
  summary?: string;
}

// URL base de la API (ajustar según la configuración del backend)
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Obtiene noticias destacadas de los proveedores Bloomberg y DF.cl
 */
export async function getFeaturedNews(limit: number = 5): Promise<NewsItem[]> {
  const featuredNews: NewsItem[] = [];
  
  try {
    // Obtener noticias destacadas desde la API (que incluyen noticias de DF.cl desde Firebase)
    const response = await fetch(`${API_BASE_URL}/news/featured?limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      featuredNews.push(...data);
    }
    
    return featuredNews.slice(0, limit);
  } catch (error) {
    console.error('Error al obtener noticias destacadas:', error);
    return [];
  }
}

/**
 * Obtiene todas las noticias con filtros opcionales
 */
export async function getAllNews(
  params: {
    category?: string;
    provider?: string;
    search?: string;
    days?: number;
    skip?: number;
    limit?: number;
  } = {}
): Promise<NewsItem[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.provider) queryParams.append('provider', params.provider);
    if (params.search) queryParams.append('search', params.search);
    if (params.days) queryParams.append('days', params.days.toString());
    if (params.skip) queryParams.append('skip', params.skip.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `${API_BASE_URL}/news?${queryParams.toString()}`;
    console.log(`Fetching all news from: ${url}`);
    
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      throw new Error('Error al obtener noticias');
    }
    
    const data = await response.json();
    console.log(`Received ${data.length} news items`);
    return data;
  } catch (error) {
    console.error('Error al obtener noticias:', error);
    return [];
  }
}

/**
 * Obtiene noticias de un proveedor específico
 */
export async function getNewsByProvider(
  provider: string,
  params: {
    category?: string;
    skip?: number;
    limit?: number;
  } = {}
): Promise<NewsItem[]> {
  try {
    // Para todos los proveedores, usar la API del backend
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.skip) queryParams.append('skip', params.skip.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `${API_BASE_URL}/news/provider/${provider}?${queryParams.toString()}`;
    console.log(`Fetching news from provider: ${url}`);
    
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      throw new Error(`Error al obtener noticias del proveedor ${provider}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.length} news items from provider ${provider}`);
    return data;
  } catch (error) {
    console.error(`Error al obtener noticias del proveedor ${provider}:`, error);
    return [];
  }
}

/**
 * Obtiene una noticia por su ID
 */
export async function getNewsById(newsId: string): Promise<NewsItem | null> {
  console.log(`getNewsById llamado con ID: ${newsId}`);
  
  try {
    // Si no es un ID de DF.cl (no comienza con df-), obtener desde Firebase usando los vendors estáticos
    if (!newsId.startsWith('df-')) {
      console.log('Obteniendo noticia normal (no DF.cl):', newsId);
      const response = await fetch(`${API_BASE_URL}/news/${newsId}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } 
    
    // Si es un ID con formato df-[hash], obtener el detalle desde la API
    else {
      console.log('Obteniendo noticia de DF.cl con ID:', newsId);
      const dfId = newsId.substring(3); // Eliminar 'df-' del principio
      
      // Intentar primero el endpoint específico de scraping para DF
      console.log(`Intentando endpoint específico de scraping para DF.cl: /news/df-scrape/${dfId}`);
      const dfResponse = await fetch(`${API_BASE_URL}/news/df-scrape/${dfId}`, {
        cache: 'no-store'
      });
      
      if (dfResponse.ok) {
        const data = await dfResponse.json();
        console.log('Noticia obtenida con éxito a través del scraping específico');
        return data;
      }
      
      // Si el scraping específico falla, intentar obtener la noticia con el ID completo
      console.log(`Intentando obtener con ID completo: /news/${newsId}`);
      const response = await fetch(`${API_BASE_URL}/news/${newsId}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Noticia obtenida con éxito de la API con ID completo');
        return data;
      }
      
      console.log('No se encontró la noticia en la API. Todos los intentos fallaron.');
      return null;
    }
  } catch (error) {
    console.error(`Error al obtener noticia con ID ${newsId}:`, error);
    return null;
  }
}

/**
 * Obtiene las categorías disponibles
 */
export async function getCategories(provider?: string): Promise<string[]> {
  try {
    const url = provider 
      ? `${API_BASE_URL}/news/categories?provider=${provider}`
      : `${API_BASE_URL}/news/categories`;
    
    console.log(`Fetching categories: ${url}`);
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      throw new Error('Error al obtener categorías');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

/**
 * Obtiene los proveedores disponibles
 */
export async function getProviders(): Promise<string[]> {
  try {
    const url = `${API_BASE_URL}/news/providers`;
    console.log(`Fetching providers: ${url}`);
    
    const response = await fetch(url, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      throw new Error('Error al obtener proveedores');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return [];
  }
}

/**
 * Formatea una noticia de la API para que coincida con el formato esperado por los componentes
 */
export function formatNewsItem(news: NewsItem): {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
} {
  return {
    id: news.id,
    title: news.title || 'Sin título',
    description: news.description || 'Sin descripción',
    image: news.image_url || 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3',
    category: news.category || 'General',
    date: news.created_at || 'Fecha desconocida',
    readTime: '5 min read' // Valor por defecto
  };
}
