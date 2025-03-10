import { LRUCache } from 'lru-cache';
import cheerio from 'cheerio';
import axios from 'axios';
import crypto from 'crypto';

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
  related_urls?: string[];
}

interface ArticleWithImage {
  title: string;
  image_url: string | null;
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
 * Extrae la imagen principal de una noticia usando cheerio (versión 0.22.0)
 */
function extractMainImage(html: string, baseUrl: string = 'https://www.df.cl'): string | null {
  try {
    const $ = cheerio.load(html);
    
    // Buscar meta tag og:image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      return ogImage.startsWith('/') ? `${baseUrl}${ogImage}` : ogImage;
    }
    
    // Buscar contenedor principal de imagen del artículo
    const mainImgContainer = $('.art-img img');
    if (mainImgContainer.length && mainImgContainer.attr('src')) {
      const src = mainImgContainer.attr('src') || null;
      return src ? (src.startsWith('/') ? `${baseUrl}${src}` : src) : null;
    }
    
    // Buscar primera imagen en el contenido del artículo
    const contentImg = $('.article-content img, .content img, .post-content img').first();
    if (contentImg.length && contentImg.attr('src')) {
      const src = contentImg.attr('src') || null;
      return src ? (src.startsWith('/') ? `${baseUrl}${src}` : src) : null;
    }
    
    // Buscar cualquier imagen en el contenido
    const anyImg = $('img').first();
    if (anyImg.length && anyImg.attr('src')) {
      const src = anyImg.attr('src') || null;
      return src ? (src.startsWith('/') ? `${baseUrl}${src}` : src) : null;
    }
    
    return null;
  } catch (error) {
    console.error('Error al extraer la imagen principal:', error);
    return null;
  }
}

/**
 * Extrae el título de una noticia usando cheerio (versión 0.22.0)
 */
function extractTitle(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Buscar título en h1
    const h1Title = $('h1').first().text().trim();
    if (h1Title) {
      return h1Title;
    }
    
    // Buscar meta tag og:title
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      return ogTitle.trim();
    }
    
    // Buscar meta tag title
    const metaTitle = $('title').text();
    if (metaTitle) {
      return metaTitle.trim();
    }
    
    return '';
  } catch (error) {
    console.error('Error al extraer el título:', error);
    return '';
  }
}

/**
 * Extrae la descripción de una noticia usando cheerio (versión 0.22.0)
 */
function extractDescription(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Buscar meta tag description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) {
      return metaDesc.trim();
    }
    
    // Buscar meta tag og:description
    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (ogDesc) {
      return ogDesc.trim();
    }
    
    // Buscar primer párrafo del artículo
    const firstParagraph = $('article p, .article-content p, .content p').first().text().trim();
    if (firstParagraph) {
      return firstParagraph;
    }
    
    return '';
  } catch (error) {
    console.error('Error al extraer la descripción:', error);
    return '';
  }
}

/**
 * Extrae la categoría de una noticia usando cheerio (versión 0.22.0)
 */
function extractCategory(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Buscar meta tag article:section
    const section = $('meta[property="article:section"]').attr('content');
    if (section) {
      return section.trim();
    }
    
    // Buscar elementos con clase category
    const category = $('.category').text().trim();
    if (category) {
      return category;
    }
    
    // Buscar por URL path para inferir categoría
    const canonicalUrl = $('link[rel="canonical"]').attr('href');
    if (canonicalUrl) {
      const urlParts = canonicalUrl.split('/');
      const possibleCategories = ['empresas', 'economia', 'mercados', 'internacional', 'opinion', 'tecnologia'];
      
      for (const urlPart of urlParts) {
        if (possibleCategories.includes(urlPart.toLowerCase())) {
          return urlPart.charAt(0).toUpperCase() + urlPart.slice(1);
        }
      }
    }
    
    return 'General';
  } catch (error) {
    console.error('Error al extraer la categoría:', error);
    return 'General';
  }
}

/**
 * Extrae la fecha de publicación de una noticia usando cheerio (versión 0.22.0)
 */
function extractDate(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Buscar meta tag article:published_time
    const publishedTime = $('meta[property="article:published_time"]').attr('content');
    if (publishedTime) {
      return publishedTime.trim();
    }
    
    // Buscar elementos con clase date
    const dateElem = $('.date, .article-date, .publish-date, time').first();
    if (dateElem.length) {
      const dateText = dateElem.attr('datetime') || dateElem.text().trim();
      if (dateText) {
        return dateText;
      }
    }
    
    return new Date().toISOString();
  } catch (error) {
    console.error('Error al extraer la fecha:', error);
    return new Date().toISOString();
  }
}

/**
 * Limpia el texto HTML quitando etiquetas y espacios innecesarios
 */
function cleanHtmlText(htmlText: string): string {
  return htmlText
    .replace(/<[^>]*>/g, '') // Eliminar etiquetas HTML
    .replace(/\s+/g, ' ')    // Reemplazar espacios múltiples por uno solo
    .trim();                 // Eliminar espacios al inicio y final
}

/**
 * Extrae el contenido principal de una noticia usando cheerio (versión 0.22.0)
 */
function extractContent(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // Identificar el contenedor principal del artículo
    let contentContainer = $('article, .article-content, .content, .post-content');
    
    // Si no encontramos un contenedor específico, buscar donde hay mayor concentración de párrafos
    if (contentContainer.length === 0) {
      let maxParagraphs = 0;
      let bestContainerId = '';
      
      // Asignar IDs temporales a los divs para poder referenciarlos después
      $('div').each((i, elem) => {
        $(elem).attr('data-temp-id', 'div-' + i);
        const paragraphCount = $(elem).find('p').length;
        if (paragraphCount > maxParagraphs) {
          maxParagraphs = paragraphCount;
          bestContainerId = 'div-' + i;
        }
      });
      
      if (bestContainerId) {
        contentContainer = $(`div[data-temp-id="${bestContainerId}"]`);
      } else {
        // Si no encontramos nada, usar el body
        contentContainer = $('body');
      }
    }
    
    // Extraer y limpiar todos los párrafos
    const paragraphs: string[] = [];
    contentContainer.find('p').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 20) {  // Ignorar párrafos muy cortos
        paragraphs.push(text);
      }
    });
    
    // Si no encontramos párrafos, buscar el texto en todo el contenedor
    if (paragraphs.length === 0 && contentContainer.length > 0) {
      const containerText = contentContainer.text().trim();
      // Dividir el texto en párrafos por saltos de línea
      const splitParagraphs = containerText.split(/\n+/).filter(p => p.trim().length > 20);
      paragraphs.push(...splitParagraphs);
    }
    
    // Unir párrafos con doble salto de línea
    return paragraphs.join('\n\n');
  } catch (error) {
    console.error('Error al extraer el contenido:', error);
    return '';
  }
}

/**
 * Genera un resumen del contenido
 */
export function generateSummary(this: void, content: string, title: string): string {
  try {
    // Dividir en párrafos
    const paragraphs = content.split('\n\n');
    
    // Si hay muy pocos párrafos, devolver todo el contenido
    if (paragraphs.length <= 3) {
      return content;
    }
    
    // Calcular el número de párrafos para el resumen (25-30% del total o mínimo 3)
    const numParagraphs = Math.max(3, Math.ceil(paragraphs.length * 0.3));
    
    // Crear resumen con el título y los primeros párrafos
    let summary = `${title}\n\n${paragraphs.slice(0, numParagraphs).join('\n\n')}`;
    
    // Añadir indicador de continuación si hay más contenido
    if (paragraphs.length > numParagraphs) {
      summary += '\n\n...';
    }
    
    return summary;
  } catch (error) {
    console.error('Error al generar resumen:', error);
    return content.split('\n\n').slice(0, 2).join('\n\n') + '...';
  }
}

/**
 * Extrae enlaces a noticias relacionadas del artículo usando cheerio (versión 0.22.0)
 */
function extractRelatedUrls(html: string, baseUrl: string = 'https://www.df.cl'): string[] {
  try {
    const $ = cheerio.load(html);
    const relatedUrls: string[] = [];
    
    // Buscar enlaces en secciones de "Noticias relacionadas", "Te puede interesar", etc.
    $('.related-news a, .read-more a, .recommended a, .also-read a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        if (isValidNewsUrl(fullUrl) && relatedUrls.indexOf(fullUrl) === -1) {
          relatedUrls.push(fullUrl);
        }
      }
    });
    
    return relatedUrls;
  } catch (error) {
    console.error('Error al extraer URLs relacionadas:', error);
    return [];
  }
}

/**
 * Extrae enlaces a noticias de la página principal con sus imágenes asociadas (versión 0.22.0)
 */
function extractNewsLinks(html: string, baseUrl: string = 'https://www.df.cl'): Map<string, ArticleWithImage> {
  try {
    const $ = cheerio.load(html);
    const newsLinks = new Map<string, ArticleWithImage>();
    
    // Buscar diferentes tipos de contenedores de artículos
    const articleSelectors = [
      'article', '.featured-article', '.main-article', '.highlight-article',
      '.article-item', '.news-item', '.article-list article', '.news-list article'
    ];
    
    $(articleSelectors.join(', ')).each((i, elem) => {
      const link = $(elem).find('a[href]').first();
      const href = link.attr('href');
      
      if (href) {
        // Normalizar URL
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        
        if (isValidNewsUrl(fullUrl) && !newsLinks.has(fullUrl)) {
          // Extraer título
          let title = '';
          const titleElem = $(elem).find('h1, h2, h3, h4, h5').first();
          if (titleElem.length) {
            title = titleElem.text().trim();
          } else {
            title = link.text().trim();
          }
          
          // Extraer imagen
          let imageUrl: string | null = null;
          const img = $(elem).find('img').first();
          if (img.length) {
            const src = img.attr('src') || img.attr('data-src');
            if (src) {
              imageUrl = src.startsWith('/') ? `${baseUrl}${src}` : src;
            }
          }
          
          // Si no hay imagen en img, buscar en background-image del CSS
          if (!imageUrl) {
            $(elem).find('[style*="background-image"]').each((i, elem) => {
              const style = $(elem).attr('style') || '';
              const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/i);
              if (match && match[1]) {
                imageUrl = match[1].startsWith('/') ? `${baseUrl}${match[1]}` : match[1];
              }
            });
          }
          
          // Guardar enlace con título e imagen
          if (title) {
            newsLinks.set(fullUrl, { title, image_url: imageUrl });
          }
        }
      }
    });
    
    return newsLinks;
  } catch (error) {
    console.error('Error al extraer enlaces de noticias:', error);
    return new Map();
  }
}

/**
 * Categoriza noticias desde la página principal
 */
interface NewsCategory {
  [category: string]: ScrapedNewsItem[];
}

function categorizeNews(newsLinks: Map<string, ArticleWithImage>): NewsCategory {
  const categorizedNews: NewsCategory = {
    'Empresas': [],
    'Economía': [],
    'Mercados': [],
    'Internacional': [],
    'Opinión': [],
    'Tecnología': [],
    'General': []
  };
  
  // Palabras clave para categorización
  const categoryKeywords: { [key: string]: string[] } = {
    'Empresas': ['empresas', 'negocios', 'compania', 'compañia', 'industria'],
    'Economía': ['economia', 'economico', 'económico', 'fiscal', 'banco', 'central', 'politica', 'inflacion'],
    'Mercados': ['mercado', 'bolsa', 'finanzas', 'financiero', 'acciones', 'bursatil', 'bursátil', 'inversiones'],
    'Internacional': ['internacional', 'mundo', 'global', 'eeuu', 'europa', 'asia', 'exterior'],
    'Opinión': ['opinion', 'columna', 'columnista', 'editorial', 'analisis'],
    'Tecnología': ['tecnologia', 'tech', 'innovacion', 'digital', 'internet', 'startup']
  };
  
  for (const [url, articleInfo] of newsLinks.entries()) {
    // Intentar determinar categoría por URL
    let category = 'General';
    const lowerUrl = url.toLowerCase();
    
    // Primero verificar patrones específicos en la URL
    for (const cat in categoryKeywords) {
      if (categoryKeywords.hasOwnProperty(cat)) {
        const keywords = categoryKeywords[cat];
        if (keywords.some(keyword => lowerUrl.indexOf(keyword) !== -1)) {
          category = cat;
          break;
        }
      }
    }
    
    // Crear un objeto de noticia básico para la lista categorizada
    const newsItem: ScrapedNewsItem = {
      id: crypto.createHash('md5').update(url).digest('hex'),
      title: articleInfo.title,
      description: '',
      content: '',
      summary: '',
      url: url,
      image_url: articleInfo.image_url || '',
      provider: 'DF.cl',
      category: category,
      created_at: new Date().toISOString()
    };
    
    // Añadir a la categoría correspondiente
    categorizedNews[category].push(newsItem);
  }
  
  return categorizedNews;
}

/**
 * Obtiene los datos completos de una noticia específica
 */
export async function getNewsFromDF(url: string): Promise<ScrapedNewsItem | null> {
  // Verificar si la noticia está en caché
  const cachedNews = newsCache.get(url);
  if (cachedNews) {
    console.log(`Usando noticia en caché: ${url}`);
    return cachedNews;
  }
  
  try {
    console.log(`Obteniendo noticia de DF.cl desde URL: ${url}`);
    
    // Asegurarse de que la URL sea válida para DF.cl
    if (!isValidNewsUrl(url)) {
      console.log(`URL no válida para scraping: ${url}`);
      return null;
    }
    
    const html = await fetchPageContent(url);
    
    // Extraer datos usando cheerio
    const title = extractTitle(html);
    const description = extractDescription(html);
    const image_url = extractMainImage(html, 'https://www.df.cl') || '';
    const category = extractCategory(html);
    const created_at = extractDate(html);
    const content = extractContent(html);
    const summary = generateSummary(content, title);
    const related_urls = extractRelatedUrls(html);
    
    // Generar ID único basado en la URL
    // Usar solo la parte de la ruta para mayor consistencia
    let urlPath = '';
    try {
      const urlObj = new URL(url);
      urlPath = urlObj.pathname;
    } catch (e) {
      // Si no es una URL válida, usar la URL completa
      urlPath = url;
    }
    
    // Generar un ID más corto y consistente
    const id = crypto.createHash('md5').update(urlPath).digest('hex').substring(0, 10);
    
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
      created_at,
      related_urls
    };
    
    // Guardar en caché
    newsCache.set(url, newsItem);
    
    console.log(`Noticia obtenida con éxito: ${title} (ID: ${id})`);
    return newsItem;
  } catch (error) {
    console.error(`Error al obtener noticia de ${url}:`, error);
    return null;
  }
}

/**
 * Obtiene una lista de noticias recientes categorizadas de DF.cl
 */
export async function getLatestDFNews(): Promise<NewsCategory> {
  try {
    console.log('Obteniendo noticias recientes de DF.cl');
    
    // URL de la página principal de DF.cl
    const mainPageUrl = 'https://www.df.cl';
    const html = await fetchPageContent(mainPageUrl);
    
    // Extraer enlaces a noticias con sus imágenes
    const newsLinks = extractNewsLinks(html, mainPageUrl);
    
    // Categorizar las noticias
    const categorizedNews = categorizeNews(newsLinks);
    
    // Para cada categoría, obtener los detalles completos de hasta 5 noticias
    const result: NewsCategory = {};
    const maxNewsPerCategory = 5;
    
    for (const category in categorizedNews) {
      if (categorizedNews.hasOwnProperty(category)) {
        const newsList = categorizedNews[category];
        result[category] = [];
        const limitedNews = newsList.slice(0, maxNewsPerCategory);
        
        for (const newsItem of limitedNews) {
          try {
            const fullNewsItem = await getNewsFromDF(newsItem.url);
            if (fullNewsItem) {
              result[category].push(fullNewsItem);
            }
          } catch (err) {
            console.error(`Error obteniendo detalles para ${newsItem.url}:`, err);
            // Usar el objeto básico si falla la obtención de detalles
            result[category].push(newsItem);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error al obtener noticias recientes de DF.cl:', error);
    return {};
  }
}

/**
 * Verifica si una URL es válida para scraping
 */
export function isValidNewsUrl(url: string): boolean {
  try {
    // Verificar si la URL es de DF.cl
    if (url.indexOf('df.cl') === -1) return false;
    
    // Filtrar URLs no deseadas
    const invalidPatterns = [
      '/login', '/registro', '/suscripcion', '/contacto', '/quienes-somos',
      '/privacidad', '/terminos', '/newsletters', '/pdf', '/perfil', '/editar',
      '/users', '/p/', 'twitter.com', 'facebook.com', 'linkedin.com'
    ];
    
    if (invalidPatterns.some(pattern => url.indexOf(pattern) !== -1)) {
      return false;
    }
    
    // Verificar si es una URL de artículo por patrones válidos
    const validPatterns = [
      '/noticias/', '/economia/', '/empresas/', '/mercados/', 
      '/opinion/', '/internacional/', '/tecnologia/', '/dflab/',
      '/negocios/', '/mundo/', '/columnistas/'
    ];
    
    return validPatterns.some(pattern => url.indexOf(pattern) !== -1);
  } catch (error) {
    console.error('Error al validar URL:', error);
    return false;
  }
}

/**
 * Limpia el caché de noticias
 */
export function clearNewsCache(): void {
  console.log('Limpiando caché de noticias');
  newsCache.clear();
  pageCache.clear();
}

/**
 * Obtiene noticias por categoría y límite
 */
export async function getNewsByCategory(category: string, limit: number = 5): Promise<ScrapedNewsItem[]> {
  try {
    const allNews = await getLatestDFNews();
    if (category in allNews) {
      return allNews[category].slice(0, limit);
    }
    
    // Si la categoría no existe, devolver noticias de todas las categorías
    const mixedNews: ScrapedNewsItem[] = [];
    for (const cat in allNews) {
      if (allNews.hasOwnProperty(cat)) {
        mixedNews.push(...allNews[cat]);
      }
    }
    
    // Ordenar por fecha de más reciente a más antigua
    mixedNews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return mixedNews.slice(0, limit);
  } catch (error) {
    console.error(`Error al obtener noticias por categoría ${category}:`, error);
    return [];
  }
}

/**
 * Busca noticias por término
 */
export async function searchNews(term: string, limit: number = 10): Promise<ScrapedNewsItem[]> {
  try {
    // Obtener todas las noticias
    const allNews = await getLatestDFNews();
    const allNewsFlat: ScrapedNewsItem[] = [];
    
    for (const category in allNews) {
      if (allNews.hasOwnProperty(category)) {
        allNewsFlat.push(...allNews[category]);
      }
    }
    
    // Filtrar por término de búsqueda (título, descripción o contenido)
    const lowerTerm = term.toLowerCase();
    const filteredNews = allNewsFlat.filter(news => 
      news.title.toLowerCase().indexOf(lowerTerm) !== -1 || 
      news.description.toLowerCase().indexOf(lowerTerm) !== -1 ||
      news.content.toLowerCase().indexOf(lowerTerm) !== -1
    );
    
    // Ordenar por relevancia (aparición del término en el título es más relevante)
    filteredNews.sort((a, b) => {
      const termInTitleA = a.title.toLowerCase().indexOf(lowerTerm) !== -1 ? 1 : 0;
      const termInTitleB = b.title.toLowerCase().indexOf(lowerTerm) !== -1 ? 1 : 0;
      
      if (termInTitleA !== termInTitleB) {
        return termInTitleB - termInTitleA;
      }
      
      // Si hay empate en el título, ordenar por fecha
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return filteredNews.slice(0, limit);
  } catch (error) {
    console.error(`Error al buscar noticias con término "${term}":`, error);
    return [];
  }
}