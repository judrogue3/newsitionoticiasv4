import axios from 'axios';
import * as cheerio from 'cheerio';
import { LRUCache } from 'lru-cache';

// Interfaz para los datos de la noticia
export interface ScrapedNewsItem {
  id: string;
  title: string;
  description: string;
  content: string;
  summary: string;
  url: string;
  image_url: string;
  provider: string;
  category: string;
  created_at: string;
}

// Configuración del caché
const newsCache = new LRUCache<string, ScrapedNewsItem>({
  max: 100, // Máximo de 100 noticias en caché
  ttl: 1000 * 60 * 60 * 24, // TTL de 24 horas
});

// Caché para las páginas completas (para no hacer scraping repetidamente)
const pageCache = new LRUCache<string, string>({
  max: 20, // Máximo de 20 páginas en caché
  ttl: 1000 * 60 * 30, // TTL de 30 minutos
});

/**
 * Obtiene el contenido HTML de una URL con caché
 */
async function fetchPageContent(url: string): Promise<string> {
  // Verificar si la página está en caché
  const cachedPage = pageCache.get(url);
  if (cachedPage) {
    console.log(`Usando página en caché para: ${url}`);
    return cachedPage;
  }

  try {
    console.log(`Obteniendo contenido de: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      },
      timeout: 10000,
    });

    // Guardar en caché
    pageCache.set(url, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener contenido de ${url}:`, error);
    throw new Error(`No se pudo obtener el contenido de ${url}`);
  }
}

/**
 * Extrae la imagen principal de una noticia
 */
function extractMainImage(html: string, baseUrl: string = 'https://www.df.cl'): string | null {
  try {
    const $ = cheerio.load(html);
    
    // Buscar en contenedor de imagen principal
    const mainImgContainer = $('.art-img img, .article-image img, .main-image img').first();
    if (mainImgContainer.length > 0) {
      const imgUrl = mainImgContainer.attr('src');
      if (imgUrl) {
        return imgUrl.startsWith('/') ? `${baseUrl}${imgUrl}` : imgUrl;
      }
    }
    
    // Buscar en metaetiqueta og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      return ogImage.startsWith('/') ? `${baseUrl}${ogImage}` : ogImage;
    }
    
    // Buscar primera imagen en el contenido
    const firstContentImg = $('.article-content img, .content img').first().attr('src');
    if (firstContentImg) {
      return firstContentImg.startsWith('/') ? `${baseUrl}${firstContentImg}` : firstContentImg;
    }
    
    return null;
  } catch (error) {
    console.error('Error al extraer la imagen principal:', error);
    return null;
  }
}

/**
 * Limpia el contenido HTML y extrae el texto principal
 */
function cleanContent(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Eliminar elementos no deseados
    $('.ad, .advertisement, .banner, script, style, .comments, .related-articles, footer, header, nav').remove();
    
    // Obtener el contenido principal
    const articleContent = $('.article-content, .content, article, .post-content').first();
    
    if (articleContent.length === 0) {
      // Si no se encuentra un contenedor específico, usar el body
      return $('body').text().trim();
    }
    
    // Extraer párrafos y encabezados
    const paragraphs: string[] = [];
    articleContent.find('p, h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        paragraphs.push(text);
      }
    });
    
    return paragraphs.join('\n\n');
  } catch (error) {
    console.error('Error al limpiar el contenido:', error);
    return '';
  }
}

/**
 * Genera un resumen del contenido (simulado por ahora)
 */
function generateSummary(content: string): string {
  // Aquí se podría integrar una API de IA para generar resúmenes
  // Por ahora, simplemente tomamos los primeros párrafos
  const paragraphs = content.split('\n\n');
  return paragraphs.slice(0, 2).join('\n\n') + '...';
}

/**
 * Obtiene los datos de una noticia específica de DF.cl
 */
export async function getNewsFromDF(url: string): Promise<ScrapedNewsItem | null> {
  // Verificar si la noticia está en caché
  const cachedNews = newsCache.get(url);
  if (cachedNews) {
    console.log(`Usando noticia en caché: ${url}`);
    return cachedNews;
  }
  
  try {
    const html = await fetchPageContent(url);
    const $ = cheerio.load(html);
    
    // Extraer datos básicos
    const title = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const image_url = extractMainImage(html) || '';
    
    // Extraer fecha de publicación
    const publishedTime = $('meta[property="article:published_time"]').attr('content') || 
                          $('.article-date, .date, time').first().text().trim() || 
                          new Date().toISOString();
    
    // Extraer categoría
    const category = $('.category, .article-category').first().text().trim() || 
                     $('meta[property="article:section"]').attr('content') || 
                     'General';
    
    // Extraer y limpiar contenido
    const content = cleanContent(html);
    
    // Generar resumen
    const summary = generateSummary(content);
    
    // Generar ID único basado en la URL
    const id = url.split('/').pop()?.split('.')[0] || 
               Buffer.from(url).toString('base64').substring(0, 12);
    
    // Crear objeto de noticia
    const newsItem: ScrapedNewsItem = {
      id,
      title,
      description,
      content,
      summary,
      url,
      image_url,
      provider: 'DF.cl',
      category,
      created_at: publishedTime,
    };
    
    // Guardar en caché
    newsCache.set(url, newsItem);
    
    return newsItem;
  } catch (error) {
    console.error(`Error al obtener noticia de ${url}:`, error);
    return null;
  }
}

/**
 * Obtiene una lista de noticias recientes de DF.cl
 */
export async function getLatestDFNews(limit: number = 8): Promise<ScrapedNewsItem[]> {
  try {
    console.log(`Obteniendo ${limit} noticias recientes de DF.cl`);
    
    // URL de la página principal de DF.cl
    const mainPageUrl = 'https://www.df.cl';
    const html = await fetchPageContent(mainPageUrl);
    const $ = cheerio.load(html);
    
    const newsItems: ScrapedNewsItem[] = [];
    
    // Seleccionar los elementos de noticias en la página principal
    // Ajustar los selectores según la estructura real de DF.cl
    const newsElements = $('.article-card, .news-item, article, .featured-news').slice(0, limit * 2);
    
    // Procesar cada elemento de noticia
    for (let i = 0; i < newsElements.length && newsItems.length < limit; i++) {
      const element = newsElements.eq(i);
      
      // Extraer URL de la noticia
      const relativeUrl = element.find('a').attr('href');
      if (!relativeUrl) continue;
      
      const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${mainPageUrl}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
      
      // Verificar si es una URL válida de noticia
      if (!isValidNewsUrl(fullUrl)) continue;
      
      try {
        // Obtener los detalles completos de la noticia
        const newsItem = await getNewsFromDF(fullUrl);
        if (newsItem) {
          newsItems.push(newsItem);
        }
      } catch (error) {
        console.error(`Error al procesar noticia ${fullUrl}:`, error);
        // Continuar con la siguiente noticia
      }
    }
    
    return newsItems;
  } catch (error) {
    console.error('Error al obtener noticias recientes de DF.cl:', error);
    return [];
  }
}

/**
 * Verifica si una URL es válida para scraping
 */
export function isValidNewsUrl(url: string): boolean {
  // Verificar si la URL es de DF.cl
  if (!url.includes('df.cl')) return false;
  
  // Verificar si es una URL de artículo (ajustar según la estructura real de DF.cl)
  // Por ejemplo, las URLs de artículos suelen tener patrones como /noticias/, /economia/, etc.
  const validPatterns = ['/noticias/', '/economia/', '/empresas/', '/mercados/', '/opinion/', '/internacional/'];
  return validPatterns.some(pattern => url.includes(pattern));
}

/**
 * Limpia el caché de noticias
 */
export function clearNewsCache(): void {
  console.log('Limpiando caché de noticias');
  newsCache.clear();
  pageCache.clear();
}
