"""
Servicio para interactuar con la API de Serper.dev para obtener contenido de artículos de DF.cl
"""

import os
import aiohttp
import json
import logging
from typing import Dict, Any, Optional
from cachetools import TTLCache
from datetime import datetime

# Configurar logging
logger = logging.getLogger(__name__)

# Cache para resultados de serper (TTL de 2 horas)
serper_cache = TTLCache(maxsize=50, ttl=7200)

# Tu API key de Serper.dev
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "73193eaebfe9911ceac8df59a84d72e203cf8cca")  # Key temporal para pruebas
SERPER_URL = "https://google.serper.dev/search"

async def get_df_article_by_id(article_id: str) -> Optional[Dict[str, Any]]:
    """
    Busca un artículo de DF.cl usando Serper.dev basado en su ID

    Args:
        article_id: ID del artículo de DF.cl

    Returns:
        Diccionario con la información del artículo o None si no se encuentra
    """
    # Verificar caché
    cache_key = f"df.cl-{article_id}"
    if cache_key in serper_cache:
        logger.info(f"Artículo encontrado en caché: {cache_key}")
        return serper_cache[cache_key]

    try:
        # Construir la consulta para Serper
        query = f"df.cl {article_id} noticias empresas"
        
        # Realizar la búsqueda a través de Serper
        logger.info(f"Realizando búsqueda en Serper para: {query}")
        
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "q": query,
            "gl": "cl",  # Geolocalización: Chile
            "hl": "es",  # Idioma: Español
            "num": 10    # Número de resultados
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(SERPER_URL, headers=headers, json=payload) as response:
                if response.status != 200:
                    logger.error(f"Error en respuesta de Serper: {response.status}")
                    return None
                
                data = await response.json()
                
                # Buscar en los resultados orgánicos
                if "organic" not in data:
                    logger.warning("No se encontraron resultados orgánicos en Serper")
                    return None
                
                # Filtrar resultados de DF.cl
                df_results = [result for result in data["organic"] if "df.cl" in result.get("link", "").lower()]
                
                if not df_results:
                    logger.warning("No se encontraron resultados de DF.cl")
                    return None
                
                # Obtener el primer resultado de DF.cl
                df_result = df_results[0]
                
                # Extraer la información relevante
                logger.info(f"Artículo encontrado en Serper: {df_result.get('title')}")
                
                # Construir resultado
                article_data = {
                    "title": df_result.get("title", ""),
                    "url": df_result.get("link", ""),
                    "description": df_result.get("snippet", ""),
                    "image_url": df_result.get("imageUrl", "") if "imageUrl" in df_result else "",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Intenta obtener el contenido completo del artículo
                article_content = await scrape_article_content(article_data["url"])
                if article_content:
                    article_data["content"] = article_content
                    article_data["category"] = extract_category(article_data["url"])
                    
                    # Guardar en caché
                    serper_cache[cache_key] = article_data
                    return article_data
                else:
                    logger.warning(f"No se pudo obtener el contenido del artículo: {article_data['url']}")
                    return None
                
    except Exception as e:
        logger.error(f"Error al obtener artículo de DF.cl con Serper: {str(e)}", exc_info=True)
        return None

async def scrape_article_content(url: str) -> Optional[str]:
    """
    Scrape el contenido del artículo de la URL proporcionada
    
    Args:
        url: URL del artículo
        
    Returns:
        Contenido del artículo o None si hay un error
    """
    try:
        from bs4 import BeautifulSoup
        
        # Realizar la petición HTTP
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Error al obtener la página: {response.status}")
                    return None
                
                html = await response.text()
                
                # Parsear el HTML
                soup = BeautifulSoup(html, 'html.parser')
                
                # Intentar obtener el contenido del artículo (ajustar según la estructura de DF.cl)
                article_content = ""
                
                # Buscar el contenido principal
                main_content = soup.find('div', class_='article-content')
                if main_content:
                    # Extraer todos los párrafos
                    paragraphs = main_content.find_all('p')
                    article_content = "\n\n".join([p.get_text().strip() for p in paragraphs])
                
                # Si no se encuentra contenido con la estructura anterior, intentar con otra
                if not article_content:
                    # Buscar otra estructura común
                    alternative_content = soup.find('div', class_='noticiaTexto')
                    if alternative_content:
                        paragraphs = alternative_content.find_all('p')
                        article_content = "\n\n".join([p.get_text().strip() for p in paragraphs])
                
                # Si aún no hay contenido, probar con una estructura más genérica
                if not article_content:
                    # Encontrar todos los párrafos dentro del cuerpo principal
                    body = soup.find('body')
                    if body:
                        # Buscar divs que puedan contener el artículo
                        possible_article_divs = body.find_all('div', class_=lambda c: c and ('content' in c.lower() or 'article' in c.lower() or 'texto' in c.lower()))
                        
                        for div in possible_article_divs:
                            paragraphs = div.find_all('p')
                            if paragraphs and len(paragraphs) > 3:  # Asumimos que un artículo tiene al menos 3 párrafos
                                article_content = "\n\n".join([p.get_text().strip() for p in paragraphs])
                                break
                
                return article_content if article_content else None
                
    except Exception as e:
        logger.error(f"Error al scrapear el contenido del artículo: {str(e)}", exc_info=True)
        return None

def extract_category(url: str) -> str:
    """
    Extrae la categoría del artículo basado en la URL
    
    Args:
        url: URL del artículo
        
    Returns:
        Categoría del artículo
    """
    try:
        # Definir mapeo de URL a categorías
        category_mappings = {
            "empresas": "Empresas",
            "mercados": "Mercados",
            "economia": "Economía",
            "finanzas": "Finanzas",
            "politica": "Política",
            "negocios": "Negocios",
            "tecnologia": "Tecnología",
            "internacional": "Internacional"
        }
        
        # Buscar coincidencias en la URL
        for key, value in category_mappings.items():
            if key in url.lower():
                return value
        
        # Categoría por defecto
        return "Noticias"
    except Exception:
        return "Noticias"
