import requests
from bs4 import BeautifulSoup
import hashlib
import re
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import time
import logging
from cachetools import LRUCache, TTLCache
import aiohttp
from urllib.parse import urlparse, parse_qs, quote, unquote, quote_plus

# Configurar logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("scraping_service")

# Cache para páginas (TTL de 30 minutos)
page_cache = TTLCache(maxsize=20, ttl=1800)

# Cache para noticias (TTL de 24 horas)
news_cache = TTLCache(maxsize=100, ttl=86400)

# Modelo para noticias scrapeadas
class ScrapedNewsItem:
    def __init__(
        self,
        id: str,
        title: str,
        description: str,
        content: str,
        summary: str,
        url: str,
        image_url: str,
        provider: str,
        category: str,
        created_at: str,
        related_urls: List[str] = None
    ):
        self.id = id
        self.title = title
        self.description = description
        self.content = content
        self.summary = summary
        self.url = url
        self.image_url = image_url
        self.provider = provider
        self.category = category
        self.created_at = created_at
        self.related_urls = related_urls or []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte el objeto a un diccionario"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "content": self.content,
            "summary": self.summary,
            "url": self.url,
            "image_url": self.image_url,
            "provider": self.provider,
            "category": self.category,
            "created_at": self.created_at,
            "related_urls": self.related_urls
        }

class NewsCategory(Dict[str, List[ScrapedNewsItem]]):
    """Categoriza noticias desde la página principal"""
    pass

async def fetch_page_content(url: str) -> str:
    """
    Obtiene el contenido HTML de una URL con caché
    """
    # Verificar si la página está en caché
    if url in page_cache:
        logger.info(f"Usando página en caché para: {url}")
        return page_cache[url]
    
    try:
        logger.info(f"Obteniendo contenido de: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                if response.status != 200:
                    logger.warning(f"No se pudo obtener la página: {response.status}")
                    raise RuntimeError(f"No se pudo obtener el contenido de {url}")
                    
                html = await response.text()
                
                # Guardar en caché
                page_cache[url] = html
                return html
    except Exception as error:
        logger.error(f"Error al obtener contenido de {url}: {error}")
        raise RuntimeError(f"No se pudo obtener el contenido de {url}")

async def get_news_from_df(url: str) -> Optional[ScrapedNewsItem]:
    """
    Realiza scraping de una noticia desde DF.cl
    """
    logger.info(f"Obteniendo noticia de DF.cl desde URL: {url}")
    
    # Verificar cache
    if url in news_cache:
        logger.info(f"Noticia encontrada en caché: {url}")
        return news_cache[url]
    
    try:
        # Obtener el contenido HTML
        html = await fetch_page_content(url)
        
        # Parsear contenido con BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extraer el ID del artículo de la URL
        parsed_url = urlparse(url)
        path_parts = parsed_url.path.strip('/').split('/')
        df_id = path_parts[-1] if path_parts else "unknown"
        
        # Extraer título
        title_element = soup.select_one('h1')
        title = title_element.get_text().strip() if title_element else "Sin título"
        
        # Extraer fecha de publicación
        publication_date = None
        date_element = soup.select_one('.article-date')
        if date_element:
            publication_date = date_element.get_text().strip()
        else:
            # Intentar encontrar la fecha en otros formatos
            date_element = soup.select_one('time')
            if date_element:
                publication_date = date_element.get_text().strip()
        
        # Si no se encontró fecha, usar la actual
        if not publication_date:
            publication_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Extraer imagen principal
        img_url = ""
        img_element = soup.select_one('figure img')
        if img_element and 'src' in img_element.attrs:
            img_url = img_element['src']
            # Asegurar que la URL sea absoluta
            if not img_url.startswith('http'):
                img_url = f"https://www.df.cl{img_url}" if not img_url.startswith('/') else f"https://www.df.cl/{img_url}"
        
        # Extraer contenido
        content = ""
        
        # Intentar encontrar el contenido en un artículo
        article = soup.select_one('article')
        if article:
            # Extraer todos los párrafos del artículo
            paragraphs = article.select('p')
            content = "\n\n".join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
        
        # Si no se encontró un artículo, buscar párrafos en la página
        if not content:
            # Buscar contenido en la estructura general
            content_elements = soup.select('.article-content p, .content p')
            if content_elements:
                content = "\n\n".join([p.get_text().strip() for p in content_elements if p.get_text().strip()])
        
        # Si aún no hay contenido, usar una estrategia más amplia
        if not content:
            # Buscar todos los párrafos que no estén en menús o pie de página
            all_paragraphs = soup.select('p:not(header p):not(footer p):not(nav p)')
            content = '\n\n'.join([p.get_text().strip() for p in all_paragraphs if p.get_text().strip()])
        
        # Limpiar el contenido
        content = limpiar_contenido_df(content)
        
        # Determinar categoría
        category = "Economía"  # Categoría por defecto
        # Extraer categoría de la URL
        if 'mercados' in url:
            category = "Mercados"
        elif 'empresas' in url:
            category = "Empresas"
        elif 'economia' in url or 'economia-y-politica' in url:
            category = "Economía"
        elif 'opinion' in url:
            category = "Opinión"
        
        # Si el contenido está vacío, no se pudo extraer el artículo
        if not content:
            logger.warning(f"No se pudo extraer el contenido del artículo: {url}")
            return None
            
        # Crear objeto de noticia
        news_item = ScrapedNewsItem(
            id=f"df-{df_id}",
            title=title,
            description=content[:150] + "..." if len(content) > 150 else content,
            content=content,
            summary=content[:250] + "..." if len(content) > 250 else content,
            url=url,
            image_url=img_url if img_url else "",
            provider="DF.cl",
            category=category,
            created_at=publication_date if publication_date else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            related_urls=[]
        )
        
        # Guardar en caché
        news_cache[url] = news_item
        
        logger.info(f"Noticia extraída correctamente: {title}")
        return news_item
        
    except Exception as e:
        logger.error(f"Error al hacer scraping de {url}: {str(e)}", exc_info=True)
        return None

def limpiar_contenido_df(content: str) -> str:
    """
    Limpia el contenido extraído de DF.cl eliminando elementos no deseados
    """
    if not content:
        return ""
    
    # Eliminar espacios y saltos de línea excesivos
    content = re.sub(r'\n{3,}', '\n\n', content)
    content = re.sub(r'\s{2,}', ' ', content)
    
    # Eliminar textos comunes no deseados
    unwanted_texts = [
        "También puede leer:",
        "Te puede interesar:",
        "Lee también:",
        "Suscríbete",
        "Diario Financiero",
        "www.df.cl",
        "Copyright 2023",
        "Derechos Reservados",
        "Términos y condiciones",
        "Política de privacidad"
    ]
    
    for text in unwanted_texts:
        content = content.replace(text, "")
    
    # Eliminar líneas muy cortas que probablemente sean basura
    lines = content.split('\n')
    filtered_lines = [line for line in lines if len(line.strip()) > 10 or not line.strip()]
    content = '\n'.join(filtered_lines)
    
    return content.strip()

async def get_by_id_df(news_id: str) -> Optional[ScrapedNewsItem]:
    """
    Obtiene una noticia de DF.cl por su ID
    
    Args:
        news_id: ID de la noticia en DF.cl (último segmento de la URL)
        
    Returns:
        Objeto ScrapedNewsItem con los datos de la noticia, o None si no se pudo obtener
    """
    logger.info(f"Buscando noticia de DF.cl con ID: {news_id}")
    
    # Verificar si el ID ya incluye el prefijo 'df-'
    df_id = news_id.replace('df-', '') if news_id.startswith('df-') else news_id
    
    # Verificar caché
    cache_key = f"df-{df_id}"
    for key, item in news_cache.items():
        if item.id == cache_key:
            logger.info(f"Noticia encontrada en caché con ID: {cache_key}")
            return item
    
    # Definir posibles secciones y dominios del DF
    sections = [
        "empresas/industria",
        "empresas/energia",
        "empresas/actualidad",
        "empresas/innovacion-y-startups",
        "empresas/retail",
        "economia-y-politica/macro",
        "economia-y-politica/politica",
        "economia-y-politica/pais",
        "mercados/bolsa-monedas",
        "mercados/commodities",
        "mercados/fondos-personales",
        "opinion/columnistas",
        "internacional/economia",
        "internacional/politica"
    ]
    
    domains = ["www.df.cl", "df.cl"]
    
    # Lista para almacenar todas las URLs posibles a probar
    urls_to_try = []
    
    # Construir posibles URLs
    for domain in domains:
        # URL directa sin sección
        urls_to_try.append(f"https://{domain}/{df_id}")
        
        # URLs con diferentes secciones
        for section in sections:
            urls_to_try.append(f"https://{domain}/{section}/{df_id}")
    
    # También puede ser un artículo reciente en la portada
    urls_to_try.append(f"https://www.df.cl/noticias/site/artic/20{df_id}")
    
    # Intentar cada URL posible
    logger.info(f"Probando {len(urls_to_try)} posibles URLs para ID: {df_id}")
    
    for url in urls_to_try:
        try:
            news_item = await get_news_from_df(url)
            if news_item:
                logger.info(f"Noticia encontrada en URL: {url}")
                # Asegurarse de que tenga el ID correcto
                news_item.id = f"df-{df_id}"
                return news_item
        except Exception as e:
            logger.debug(f"Error al intentar URL {url}: {str(e)}")
            continue
    
    # Si llegamos aquí, ninguna URL funcionó
    logger.warning(f"No se pudo encontrar la noticia con ID: {df_id}")
    return None

async def get_latest_df_news() -> NewsCategory:
    """
    Obtiene una lista de noticias recientes categorizadas de DF.cl
    """
    try:
        logger.info("Obteniendo noticias recientes de DF.cl")
        
        # URL de la página principal de DF.cl
        main_page_url = 'https://www.df.cl'
        html = await fetch_page_content(main_page_url)
        
        # Extraer enlaces a noticias con sus imágenes
        news_links = extract_news_links(html, main_page_url)
        
        # Categorizar las noticias
        categorized_news = categorize_news(news_links)
        
        # Para cada categoría, obtener los detalles completos de hasta 5 noticias
        result = NewsCategory()
        max_news_per_category = 5
        
        for category, news_list in categorized_news.items():
            if news_list:
                result[category] = []
                limited_news = news_list[:max_news_per_category]
                
                for news_item in limited_news:
                    try:
                        full_news_item = await get_news_from_df(news_item.url)
                        if full_news_item:
                            result[category].append(full_news_item)
                    except Exception as err:
                        logger.error(f"Error obteniendo detalles para {news_item.url}: {err}")
        
        return result
    except Exception as error:
        logger.error(f"Error al obtener noticias recientes de DF.cl: {error}")
        return NewsCategory()

def extract_main_image(html: str, base_url: str = 'https://www.df.cl') -> Optional[str]:
    """
    Extrae la imagen principal de una noticia usando BeautifulSoup
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar meta tag og:image
        og_image = soup.find('meta', {'property': 'og:image'})
        if og_image and og_image.get('content'):
            img_src = og_image.get('content')
            return f"{base_url}{img_src}" if img_src.startswith('/') else img_src
        
        # Buscar contenedor principal de imagen del artículo
        main_img_container = soup.select_one('.art-img img')
        if main_img_container and main_img_container.get('src'):
            img_src = main_img_container.get('src')
            return f"{base_url}{img_src}" if img_src.startswith('/') else img_src
        
        # Buscar primera imagen en el contenido del artículo
        content_img = soup.select_one('.article-content img, .content img, .post-content img')
        if content_img and content_img.get('src'):
            img_src = content_img.get('src')
            return f"{base_url}{img_src}" if img_src.startswith('/') else img_src
        
        # Buscar cualquier imagen en el contenido
        any_img = soup.find('img')
        if any_img and any_img.get('src'):
            img_src = any_img.get('src')
            return f"{base_url}{img_src}" if img_src.startswith('/') else img_src
        
        return None
    except Exception as error:
        logger.error(f"Error al extraer la imagen principal: {error}")
        return None

def extract_title(html: str) -> str:
    """
    Extrae el título de una noticia usando BeautifulSoup
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar título en h1
        h1_title = soup.find('h1')
        if h1_title:
            return h1_title.get_text().strip()
        
        # Buscar meta tag og:title
        og_title = soup.find('meta', {'property': 'og:title'})
        if og_title and og_title.get('content'):
            return og_title.get('content').strip()
        
        # Buscar meta tag title
        meta_title = soup.find('title')
        if meta_title:
            return meta_title.get_text().strip()
        
        return ''
    except Exception as error:
        logger.error(f"Error al extraer el título: {error}")
        return ''

def extract_description(html: str) -> str:
    """
    Extrae la descripción de una noticia usando BeautifulSoup
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar meta tag description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc.get('content').strip()
        
        # Buscar meta tag og:description
        og_desc = soup.find('meta', {'property': 'og:description'})
        if og_desc and og_desc.get('content'):
            return og_desc.get('content').strip()
        
        # Buscar primer párrafo del artículo
        first_paragraph = soup.select_one('article p, .article-content p, .content p')
        if first_paragraph:
            return first_paragraph.get_text().strip()
        
        return ''
    except Exception as error:
        logger.error(f"Error al extraer la descripción: {error}")
        return ''

def extract_category(html: str) -> str:
    """
    Extrae la categoría de una noticia usando BeautifulSoup
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar meta tag article:section
        section = soup.find('meta', {'property': 'article:section'})
        if section and section.get('content'):
            return section.get('content').strip()
        
        # Buscar elementos con clase category
        category = soup.select_one('.category')
        if category:
            return category.get_text().strip()
        
        # Buscar por URL path para inferir categoría
        canonical_url = soup.find('link', {'rel': 'canonical'})
        if canonical_url and canonical_url.get('href'):
            url_parts = canonical_url.get('href').split('/')
            possible_categories = ['empresas', 'economia', 'mercados', 'internacional', 'opinion', 'tecnologia']
            
            for url_part in url_parts:
                if url_part.lower() in possible_categories:
                    return url_part.capitalize()
        
        return 'General'
    except Exception as error:
        logger.error(f"Error al extraer la categoría: {error}")
        return 'General'

def extract_date(html: str) -> str:
    """
    Extrae la fecha de publicación de una noticia usando BeautifulSoup
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar meta tag article:published_time
        published_time = soup.find('meta', {'property': 'article:published_time'})
        if published_time and published_time.get('content'):
            try:
                date_str = published_time.get('content')
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return date_obj.strftime('%Y-%m-%d %H:%M:%S')
            except:
                pass
        
        # Buscar elementos con fecha
        date_element = soup.select_one('.date, .publishedAt, time')
        if date_element:
            return date_element.get_text().strip()
        
        # Si no se encuentra fecha, usar la actual
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    except Exception as error:
        logger.error(f"Error al extraer la fecha: {error}")
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def clean_html_text(html_text: str) -> str:
    """
    Limpia el texto HTML quitando etiquetas y espacios innecesarios
    """
    # Remover etiquetas HTML
    text = re.sub(r'<[^>]+>', '', html_text)
    # Normalizar espacios
    text = re.sub(r'\s+', ' ', text)
    # Remover espacios al inicio y fin
    return text.strip()

def extract_content(html: str) -> str:
    """
    Extrae el contenido principal de una noticia usando BeautifulSoup
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar el contenedor principal del artículo
        article_content = soup.select_one('.article-content, .content, .post-content, article')
        
        if article_content:
            # Obtener todos los párrafos
            paragraphs = article_content.find_all('p')
            
            # Si hay párrafos, unirlos
            if paragraphs:
                content = '\n\n'.join([p.get_text().strip() for p in paragraphs])
                return content
            
            # Si no hay párrafos, usar todo el texto
            return article_content.get_text().strip()
        
        # Contenido no encontrado en contenedores habituales
        # Buscar cualquier párrafo
        paragraphs = soup.find_all('p')
        if paragraphs:
            # Filtrar párrafos muy cortos (posiblemente no son contenido)
            filtered_paragraphs = [p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 50]
            if filtered_paragraphs:
                return '\n\n'.join(filtered_paragraphs)
        
        # Si todo falla, extraer el texto del body
        body = soup.find('body')
        if body:
            return clean_html_text(str(body))
        
        return ''
    except Exception as error:
        logger.error(f"Error al extraer el contenido: {error}")
        return ''

def generate_summary(content: str, title: str) -> str:
    """
    Genera un resumen del contenido
    """
    try:
        # Si el contenido es muy corto, usarlo como resumen
        if len(content) < 300:
            return content
        
        # Tomar los primeros párrafos como resumen (hasta 300 caracteres)
        paragraphs = content.split('\n\n')
        summary = []
        total_length = 0
        
        for p in paragraphs:
            if total_length + len(p) <= 300:
                summary.append(p)
                total_length += len(p)
            else:
                # Agregar parcialmente el último párrafo
                remaining = 300 - total_length
                if remaining > 20:  # Solo si queda suficiente espacio
                    summary.append(p[:remaining] + '...')
                break
        
        result = ' '.join(summary)
        
        # Si el resumen es demasiado corto, incluir el título
        if len(result) < 100 and title:
            result = title + '. ' + result
            
        return result
    except Exception as error:
        logger.error(f"Error al generar resumen: {error}")
        return content[:200] + '...' if len(content) > 200 else content

def extract_related_urls(html: str, base_url: str = 'https://www.df.cl') -> List[str]:
    """
    Extrae enlaces a noticias relacionadas del artículo usando BeautifulSoup
    """
    related_urls = []
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar secciones de noticias relacionadas
        related_containers = soup.select('.related-news, .related-articles, .recommendations')
        
        if not related_containers:
            # Buscar cualquier enlace que parezca una noticia relacionada
            links = soup.find_all('a', href=True)
            for link in links:
                href = link.get('href', '')
                # Si parece un enlace a una noticia interna
                if href and '/noticia/' in href or '/articulo/' in href:
                    full_url = f"{base_url}{href}" if href.startswith('/') else href
                    if is_valid_news_url(full_url) and full_url not in related_urls:
                        related_urls.append(full_url)
        else:
            # Extraer enlaces de contenedores relacionados
            for container in related_containers:
                links = container.find_all('a', href=True)
                for link in links:
                    href = link.get('href', '')
                    full_url = f"{base_url}{href}" if href.startswith('/') else href
                    if is_valid_news_url(full_url) and full_url not in related_urls:
                        related_urls.append(full_url)
        
        # Limitar a 5 enlaces relacionados
        return related_urls[:5]
    except Exception as error:
        logger.error(f"Error al extraer URLs relacionadas: {error}")
        return []

class ArticleWithImage:
    def __init__(self, title: str, url: str, image_url: Optional[str] = None):
        self.title = title
        self.url = url
        self.image_url = image_url

def extract_news_links(html: str, base_url: str = 'https://www.df.cl') -> Dict[str, ArticleWithImage]:
    """
    Extrae enlaces a noticias de la página principal con sus imágenes asociadas
    """
    result = {}
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Buscar todos los enlaces
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href', '')
            
            # Verificar si el enlace parece ser una noticia
            if is_valid_news_url(href):
                full_url = f"{base_url}{href}" if href.startswith('/') else href
                
                # Evitar duplicados
                if full_url in result:
                    continue
                
                # Buscar título e imagen
                title_element = link.find('h1') or link.find('h2') or link.find('h3') or link.find('h4')
                title = title_element.get_text().strip() if title_element else link.get_text().strip()
                
                # Buscar imagen en este link o sus padres
                img = link.find('img')
                if not img:
                    # Buscar en elementos contenedores
                    parent = link.parent
                    if parent:
                        img = parent.find('img')
                
                image_url = None
                if img and img.get('src'):
                    img_src = img.get('src')
                    image_url = f"{base_url}{img_src}" if img_src.startswith('/') else img_src
                
                # Solo agregar si tiene un título significativo
                if title and len(title) > 10:
                    result[full_url] = ArticleWithImage(title, full_url, image_url)
        
        return result
    except Exception as error:
        logger.error(f"Error al extraer enlaces de noticias: {error}")
        return {}

def categorize_news(news_links: Dict[str, ArticleWithImage]) -> NewsCategory:
    """
    Categoriza noticias desde la página principal
    """
    result = NewsCategory()
    
    # Categorías predeterminadas
    categories = {
        'destacadas': [],
        'empresas': [],
        'economia': [],
        'mercados': [],
        'internacional': []
    }
    
    # Categorizar por URL
    for url, article in news_links.items():
        assigned = False
        
        # Intentar inferir categoría de la URL
        for category in categories.keys():
            if category in url.lower():
                # Solo incluir artículos con imagen para categorías destacadas
                if category == 'destacadas' and article.image_url:
                    categories[category].append(article)
                    assigned = True
                elif category != 'destacadas':
                    categories[category].append(article)
                    assigned = True
                break
        
        # Si no se asignó a una categoría específica, verificar si es destacada por tener imagen
        if not assigned and article.image_url:
            categories['destacadas'].append(article)
    
    # Si no hay destacadas, usar los primeros artículos con imagen
    if not categories['destacadas']:
        with_images = [article for article in news_links.values() if article.image_url]
        categories['destacadas'] = with_images[:5]
    
    # Limitar cada categoría a 5-10 artículos
    for category, articles in categories.items():
        limit = 5 if category == 'destacadas' else 10
        # Convertir a lista vacía para que no aparezca en el resultado si está vacía
        if not articles:
            result[category] = []
        else:
            result[category] = articles[:limit]
    
    return result

def is_valid_news_url(url: str) -> bool:
    """
    Verifica si una URL es válida para scraping
    """
    # Debe ser una URL de DF.cl
    if "df.cl" not in url.lower():
        return False
    
    # Excluir URLs que no son noticias
    excluded_patterns = [
        '/tag/', '/autor/', '/multimedia/', '/suscribete/', 
        '/publicidad/', '/quienes-somos/', '/contacto/', 
        '/politica-de-privacidad/', '/terminos-y-condiciones/',
        'javascript:', '#'
    ]
    
    for pattern in excluded_patterns:
        if pattern in url.lower():
            return False
    
    # Incluir solo URLs que parecen noticias
    included_patterns = [
        '/noticias/', '/articulo/', '/noticia/', '/opinion/', 
        '/empresas/', '/economia/', '/mercados/', 
        '/internacional/', '/tecnologia/'
    ]
    
    for pattern in included_patterns:
        if pattern in url.lower():
            return True
    
    return False

async def get_by_id(news_id: str) -> Optional[ScrapedNewsItem]:
    """
    Obtiene una noticia por su ID a través de diferentes estrategias:
    1. Primero intenta encontrarla en caché
    2. Luego intenta diferentes URLs basadas en el ID
    3. Finalmente intenta buscar en las noticias más recientes
    """
    logger.info(f"Buscando noticia con ID: {news_id}")
    
    # Manejar formato específico del frontend "df.cl-hash"
    if news_id.startswith('df.cl-'):
        logger.info(f"Detectado ID en formato df.cl-hash: {news_id}")
        
        # 1. Verificar caché primero
        for _, cached_item in news_cache.items():
            if cached_item.id == news_id:
                logger.info(f"Noticia encontrada en caché con ID: {news_id}")
                return cached_item
        
        # 2. Como el ID es un hash, no podemos construir la URL directamente
        # Intentar encontrar entre las noticias recientes
        try:
            logger.info(f"Buscando entre artículos recientes para ID de frontend: {news_id}")
            latest_news = await get_latest_df_news()
            for item in latest_news.items:
                if item.id == news_id:
                    logger.info(f"Noticia encontrada entre las recientes: {news_id}")
                    return item
        except Exception as e:
            logger.error(f"Error al buscar entre artículos recientes: {str(e)}")
            
        logger.warning(f"No se pudo encontrar la noticia con ID de frontend: {news_id}")
        return None
        
    # Si es un ID con prefijo df-, eliminar el prefijo
    elif news_id.startswith('df-'):
        original_id = news_id
        news_id = news_id[3:]
        logger.info(f"ID limpio (sin prefijo df-): {news_id}")
    else:
        original_id = f"df-{news_id}"
    
    # Verificar en caché usando cualquiera de los formatos de ID
    for cache_id in [news_id, original_id]:
        for url, cached_item in news_cache.items():
            if cached_item.id == cache_id:
                logger.info(f"Noticia encontrada en caché con ID: {cache_id}")
                return cached_item
    
    # Intentar diferentes formatos de URL potenciales para DF.cl
    possible_urls = [
        f"https://www.df.cl/empresas/industria/{news_id}",
        f"https://www.df.cl/empresas/actualidad/{news_id}",
        f"https://www.df.cl/empresas/energia/{news_id}",
        f"https://www.df.cl/empresas/salud/{news_id}",
        f"https://www.df.cl/empresas/retail/{news_id}",
        f"https://www.df.cl/empresas/{news_id}",
        f"https://www.df.cl/mercados/bolsa-monedas/{news_id}",
        f"https://www.df.cl/mercados/commodities/{news_id}",
        f"https://www.df.cl/mercados/banca-fintech/{news_id}",
        f"https://www.df.cl/mercados/{news_id}",
        f"https://www.df.cl/economia-y-politica/macro/{news_id}",
        f"https://www.df.cl/economia-y-politica/pais/{news_id}",
        f"https://www.df.cl/economia-y-politica/laboral-personas/{news_id}",
        f"https://www.df.cl/economia-y-politica/actualidad/{news_id}",
        f"https://www.df.cl/economia-y-politica/{news_id}",
        f"https://www.df.cl/opinion/columnistas/{news_id}",
        f"https://www.df.cl/opinion/{news_id}",
        f"https://www.df.cl/internacional/economia/{news_id}",
        f"https://www.df.cl/internacional/{news_id}",
        f"https://www.df.cl/lifestyle/tendencias/{news_id}",
        f"https://www.df.cl/lifestyle/{news_id}",
        f"https://www.df.cl/dflab/{news_id}",
        f"https://www.df.cl/podcast/df-lab/{news_id}",
        f"https://www.df.cl/podcast/{news_id}",
        f"https://www.df.cl/{news_id}"
    ]
    
    # Intentar cada URL posible
    for url in possible_urls:
        try:
            logger.info(f"Intentando URL: {url}")
            news_item = await get_news_from_df(url)
            if news_item:
                # Asegurarnos de que el ID sea consistente
                news_item.id = original_id
                logger.info(f"Noticia encontrada en URL: {url}")
                return news_item
        except Exception as e:
            logger.error(f"Error al intentar URL {url}: {str(e)}")
    
    # Si no se encontró con ninguna URL, intentar buscar en las noticias más recientes
    try:
        logger.info(f"Buscando entre artículos recientes para ID: {news_id}")
        latest_news = await get_latest_df_news()
        for item in latest_news.items:
            if item.id == news_id:
                logger.info(f"Noticia encontrada entre las recientes: {news_id}")
                return item
    except Exception as e:
        logger.error(f"Error al buscar entre artículos recientes: {str(e)}")
            
    logger.warning(f"No se pudo encontrar la noticia con ID: {news_id}")
    return None

async def get_by_id_google(domain: str, news_id: str) -> Optional[ScrapedNewsItem]:
    """Esta función ha sido eliminada en favor de un enfoque más directo sin depender de búsquedas externas."""
    logger.warning("get_by_id_google está obsoleta y no debe usarse.")
    return None

async def search_df_article_on_google(query: str) -> List[str]:
    """Esta función ha sido eliminada en favor de un enfoque más directo sin depender de búsquedas externas."""
    logger.warning("search_df_article_on_google está obsoleta y no debe usarse.")
    return []

async def clear_cache():
    """
    Limpia los cachés
    """
    page_cache.clear()
    news_cache.clear()
    logger.info("Cachés limpiados")
