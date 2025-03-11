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
from datetime import timedelta
import asyncio

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }
        
        # Configurar timeout más largo y reintentos
        timeout = aiohttp.ClientTimeout(total=30)
        
        # Intentar hasta 3 veces con pequeños delays
        for attempt in range(3):
            try:
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(url, headers=headers, allow_redirects=True) as response:
                        if response.status != 200:
                            logger.warning(f"Intento {attempt+1}: No se pudo obtener la página - Status: {response.status}")
                            if response.status == 403:
                                logger.warning("Posible bloqueo de acceso (403 Forbidden)")
                            elif response.status == 404:
                                logger.warning("Página no encontrada (404 Not Found)")
                            elif response.status == 429:
                                logger.warning("Demasiadas solicitudes (429 Too Many Requests)")
                            elif response.status >= 500:
                                logger.warning(f"Error del servidor ({response.status})")
                            
                            if attempt < 2:  # Si no es el último intento
                                # Esperar más tiempo entre intentos
                                wait_time = (attempt + 1) * 2
                                logger.info(f"Esperando {wait_time} segundos antes del siguiente intento...")
                                await asyncio.sleep(wait_time)
                                continue
                            else:
                                raise RuntimeError(f"No se pudo obtener el contenido de {url} después de 3 intentos")
                        
                        html = await response.text()
                        if not html or len(html) < 500:
                            logger.warning(f"Respuesta HTML demasiado corta: {len(html)} caracteres")
                            if attempt < 2:
                                await asyncio.sleep((attempt + 1) * 2)
                                continue
                            else:
                                raise RuntimeError(f"Respuesta HTML insuficiente de {url}")
                        
                        # Verificar que no sea una página de redirección/bloqueo
                        if "captcha" in html.lower() or "blocked" in html.lower() or "access denied" in html.lower():
                            logger.warning("Se detectó una página de captcha o bloqueo")
                            if attempt < 2:
                                await asyncio.sleep((attempt + 1) * 3)
                                continue
                            else:
                                raise RuntimeError(f"Acceso bloqueado a {url}")
                        
                        # Guardar en caché
                        logger.info(f"Contenido obtenido exitosamente: {len(html)} caracteres")
                        page_cache[url] = html
                        return html
                        
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                logger.warning(f"Intento {attempt+1}: Error de conexión: {str(e)}")
                if attempt < 2:
                    await asyncio.sleep((attempt + 1) * 2)
                    continue
                else:
                    raise RuntimeError(f"Error de conexión persistente con {url}: {str(e)}")
        
    except Exception as error:
        logger.error(f"Error al obtener la página {url}: {str(error)}", exc_info=True)
        raise RuntimeError(f"No se pudo obtener el contenido de {url}: {str(error)}")

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
        title_element = soup.select_one('h1, .article-title, .entry-title')
        title = title_element.get_text().strip() if title_element else "Sin título"
        
        # Extraer fecha de publicación
        publication_date = None
        date_element = soup.select_one('.article-date, .date, time, .post-date, .published')
        if date_element:
            publication_date = date_element.get_text().strip()
        
        # Si no se encontró fecha, usar la actual
        if not publication_date:
            publication_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Extraer imagen principal
        img_url = ""
        # Primero buscar en meta tags (usualmente la mejor calidad)
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            img_url = og_image.get('content')
            # Asegurar que la URL sea absoluta
            if not img_url.startswith('http'):
                img_url = f"https://www.df.cl{img_url}" if not img_url.startswith('/') else f"https://www.df.cl/{img_url}"
        
        # Si no hay meta image, buscar en el contenido
        if not img_url:
            img_element = soup.select_one('figure img, .article-img img, .featured-image img, .post-thumbnail img')
            if img_element and 'src' in img_element.attrs:
                img_url = img_element['src']
                # Asegurar que la URL sea absoluta
                if not img_url.startswith('http'):
                    img_url = f"https://www.df.cl{img_url}" if not img_url.startswith('/') else f"https://www.df.cl/{img_url}"
        
        # Extraer contenido
        content = ""
        
        # Intentar encontrar el contenido en un artículo o div con clases específicas
        content_container = soup.select_one('article, .article-content, .post-content, .entry-content, .content')
        if content_container:
            # Extraer todos los párrafos del contenedor
            paragraphs = content_container.select('p')
            content = "\n\n".join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
        
        # Si no se encontró contenido con el método anterior
        if not content:
            # Buscar contenido en la estructura general
            content_elements = soup.select('p:not(header p):not(footer p):not(nav p):not(.no-content p)')
            if content_elements:
                content = "\n\n".join([p.get_text().strip() for p in content_elements if p.get_text().strip()])
        
        # Limpiar el contenido
        content = limpiar_contenido_df(content)
        
        # Determinar categoría
        category = "Economía"  # Categoría por defecto
        # Extraer categoría de la URL y otros elementos
        if 'mercados' in url or soup.find('a', string=lambda text: text and 'mercados' in text.lower()):
            category = "Mercados"
        elif 'empresas' in url or soup.find('a', string=lambda text: text and 'empresas' in text.lower()):
            category = "Empresas"
        elif 'economia' in url or 'economia-y-politica' in url or soup.find('a', string=lambda text: text and ('economia' in text.lower() or 'política' in text.lower())):
            category = "Economía"
        elif 'opinion' in url or soup.find('a', string=lambda text: text and 'opinion' in text.lower()):
            category = "Opinión"
        
        # Si el contenido está vacío, intentar un último método
        if not content:
            # Obtener todo el texto del cuerpo
            body = soup.find('body')
            if body:
                all_text = body.get_text()
                # Dividir por líneas y filtrar para eliminar líneas cortas y de navegación
                lines = [line.strip() for line in all_text.split('\n') if len(line.strip()) > 40]
                content = "\n\n".join(lines)
                
        # Si aún no hay contenido, fallar
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

async def get_by_id_df(df_id: str) -> Optional[ScrapedNewsItem]:
    """
    Obtiene una noticia de DF.cl por su ID
    
    Args:
        df_id: ID de la noticia en DF.cl
        
    Returns:
        Objeto ScrapedNewsItem con los datos de la noticia, o None si no se pudo obtener
    """
    logger.info(f"Buscando noticia de DF.cl con ID: {df_id}")
    
    # Verificar si el ID ya incluye el prefijo 'df-'
    df_id = df_id.replace('df-', '') if df_id.startswith('df-') else df_id
    
    # Verificar caché
    cache_key = f"df-{df_id}"
    for key, item in news_cache.items():
        if item.id == cache_key:
            logger.info(f"Noticia encontrada en caché con ID: {cache_key}")
            return item
    
    # En lugar de intentar múltiples URLs basadas en el ID, que nunca funcionarán
    # para IDs tipo hash (40d7cc6fed422b53ba988253ba4ed927), intentaremos
    # un enfoque más directo
    
    # Si el ID parece ser un hash (largo y alfanumérico), usamos una estrategia alternativa
    if len(df_id) > 20 and re.match(r'^[a-zA-Z0-9]+$', df_id):
        logger.info(f"ID parece ser un hash, usando estrategia alternativa")
        
        # Intentar obtener el artículo de la página principal de DF.cl
        try:
            logger.info("Intentando buscar el artículo en la página principal de DF.cl")
            main_url = "https://www.df.cl"
            main_html = await fetch_page_content(main_url)
            
            if main_html:
                soup = BeautifulSoup(main_html, 'html.parser')
                
                # Buscar todos los links en la página
                links = soup.find_all('a', href=True)
                article_links = []
                
                for link in links:
                    href = link['href']
                    # Filtrar solo links de artículos
                    if ('noticias' in href or 'empresas' in href or 'economia' in href) and 'df.cl' in href:
                        # Asegurarse de que es una URL completa
                        if not href.startswith(('http://', 'https://')):
                            if href.startswith('/'):
                                href = f"https://www.df.cl{href}"
                            else:
                                href = f"https://www.df.cl/{href}"
                        article_links.append(href)
                
                logger.info(f"Encontrados {len(article_links)} posibles links de artículos")
                
                # Intentar hasta 5 links de artículos más recientes
                for article_url in article_links[:5]:
                    try:
                        logger.info(f"Intentando obtener artículo de: {article_url}")
                        news_item = await get_news_from_df(article_url)
                        if news_item:
                            # Asignar el ID correcto
                            news_item.id = f"df-{df_id}"
                            # Guardar en caché
                            news_cache[article_url] = news_item
                            return news_item
                    except Exception as e:
                        logger.error(f"Error al obtener artículo de {article_url}: {str(e)}")
                        continue
        
        except Exception as e:
            logger.error(f"Error en estrategia alternativa: {str(e)}")
    
    # Si no es un hash o la estrategia alternativa falló, intentamos con URLs específicas
    # pero limitamos el número de intentos para evitar demasiadas solicitudes
    
    # Definir posibles secciones y dominios del DF (reducidas a las más comunes)
    sections = [
        "noticias/empresas",
        "noticias/mercados",
        "noticias/economia",
        "economia-y-politica/macro"
    ]
    
    domains = ["www.df.cl"]
    
    # Lista para almacenar todas las URLs posibles a probar (limitada)
    urls_to_try = []
    
    # Construir posibles URLs (solo unas pocas)
    for domain in domains:
        for section in sections:
            urls_to_try.append(f"https://{domain}/{section}/{df_id}")
    
    # También probar el patrón antiguo
    urls_to_try.append(f"https://www.df.cl/noticias/site/artic/20{df_id}")
    
    # Intentar cada URL posible (limitado)
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

async def get_by_id(news_id: str) -> Optional[ScrapedNewsItem]:
    """
    Función general para obtener noticias por ID.
    Maneja tanto IDs de DF.cl como de otros proveedores.
    
    Args:
        news_id: ID de la noticia a buscar
        
    Returns:
        ScrapedNewsItem con los datos de la noticia o None si no se encuentra
    """
    logger.info(f"Buscando noticia con ID genérico: {news_id}")
    
    # Verificar si es un ID de DF.cl
    if news_id.startswith('df-') or news_id.startswith('df.cl-'):
        # Limpiar el ID
        clean_id = news_id
        if news_id.startswith('df-'):
            clean_id = news_id[3:]  # Quitar 'df-'
        elif news_id.startswith('df.cl-'):
            clean_id = news_id[6:]  # Quitar 'df.cl-'
            
        logger.info(f"ID de DF.cl detectado, buscando con ID limpio: {clean_id}")
        
        # Buscar usando la función especializada
        result = await get_by_id_df(clean_id)
        if result:
            # Asegurar que tenga el ID original para mantener consistencia
            result.id = news_id
            return result
    
    # Si llegamos aquí, no se encontró la noticia o no es de DF.cl
    logger.warning(f"No se pudo obtener la noticia con ID: {news_id}")
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
        "Copyright 2024",
        "Derechos Reservados",
        "Términos y condiciones",
        "Política de privacidad",
        "Ver comentarios",
        "Para continuar leyendo",
        "Acceso ilimitado",
        "Leer más",
        "¿Ya eres suscriptor?",
        "Inicia sesión",
        "Regístrate",
        "ARTÍCULOS RELACIONADOS",
        "MÁS EN",
        "DESTACAMOS"
    ]
    
    for text in unwanted_texts:
        content = content.replace(text, "")
    
    # Eliminar líneas muy cortas que probablemente sean basura
    lines = content.split('\n')
    filtered_lines = [line for line in lines if len(line.strip()) > 10 or not line.strip()]
    content = '\n'.join(filtered_lines)
    
    # Eliminar texto después de secciones típicas de final
    end_markers = ["TE PUEDE INTERESAR", "TAMBIÉN PUEDES LEER", "CONTENIDO EXCLUSIVO", "LEE TAMBIÉN", "QUIZÁS TE INTERESE"]
    for marker in end_markers:
        if marker in content:
            content = content.split(marker)[0]
    
    return content.strip()

# Resto del código...
