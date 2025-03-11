"""
Servicio para interactuar con la API de Google Gemini para la generación de resúmenes
"""

import os
import aiohttp
import json
import logging
from typing import Optional
from cachetools import TTLCache

# Configurar logging
logger = logging.getLogger(__name__)

# Cache para resultados de Gemini (TTL de 2 horas)
gemini_cache = TTLCache(maxsize=50, ttl=7200)

# Tu API key de Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDKODMWup7Fa9DI-WchhXtZBH87dlNvw4c")  # Key temporal para pruebas
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

async def generate_summary(text: str, max_length: int = 300) -> Optional[str]:
    """
    Genera un resumen del texto proporcionado utilizando Google Gemini
    
    Args:
        text: Texto a resumir
        max_length: Longitud máxima del resumen en caracteres
        
    Returns:
        Resumen generado o None si hay un error
    """
    # Verificar caché usando MD5 del texto como clave
    import hashlib
    cache_key = hashlib.md5(text.encode()).hexdigest()
    
    if cache_key in gemini_cache:
        logger.info(f"Resumen encontrado en caché")
        return gemini_cache[cache_key]
    
    # Si el texto es muy corto, no es necesario resumirlo
    if len(text) < max_length:
        logger.info("Texto demasiado corto para resumir, devolviendo original")
        return text
    
    try:
        # Construir prompt para Gemini
        prompt = f"""Resume el siguiente artículo de noticias en español en un párrafo conciso de no más de {max_length} caracteres, 
        manteniendo los puntos clave y preservando la objetividad periodística:
        
        {text[:4000]}  # Limitamos el texto para evitar tokens excesivos
        
        Resumen:"""
        
        # Construir la solicitud a la API de Gemini
        params = {
            "key": GEMINI_API_KEY
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 500,
            }
        }
        
        # Realizar la solicitud a la API
        async with aiohttp.ClientSession() as session:
            async with session.post(
                GEMINI_URL, 
                params=params,
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error en respuesta de Gemini: {response.status}, {error_text}")
                    return None
                
                data = await response.json()
                
                # Extraer el resumen generado
                if "candidates" in data and len(data["candidates"]) > 0:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if parts and "text" in parts[0]:
                            summary = parts[0]["text"].strip()
                            
                            # Guardar en caché
                            gemini_cache[cache_key] = summary
                            
                            return summary
                
                logger.warning("No se pudo extraer el resumen de la respuesta de Gemini")
                return None
                
    except Exception as e:
        logger.error(f"Error al generar resumen con Gemini: {str(e)}", exc_info=True)
        return None

async def extract_article_data(html_content: str) -> Optional[dict]:
    """
    Extrae información estructurada de un artículo de noticias usando Gemini
    
    Args:
        html_content: Contenido HTML del artículo
        
    Returns:
        Diccionario con información del artículo o None si hay un error
    """
    try:
        # Verificar caché
        import hashlib
        cache_key = hashlib.md5(html_content.encode()).hexdigest()
        
        if cache_key in gemini_cache:
            logger.info(f"Datos del artículo encontrados en caché")
            return gemini_cache[cache_key]
        
        # Construir prompt para Gemini
        prompt = f"""Analiza el siguiente contenido HTML de un artículo de noticias en español y extrae esta información:
        1. Título del artículo
        2. Contenido principal (solo texto, sin HTML)
        3. Categoría del artículo (Economía, Política, Empresas, etc.)
        4. URL de la imagen principal (si existe)
        5. Fecha de publicación (en formato YYYY-MM-DD)
        
        Formato de salida: JSON con las claves "title", "content", "category", "image_url", "published_date"
        
        HTML:
        {html_content[:5000]}  # Limitamos el HTML para evitar tokens excesivos
        
        JSON:"""
        
        # Construir la solicitud a la API de Gemini
        params = {
            "key": GEMINI_API_KEY
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1000,
            }
        }
        
        # Realizar la solicitud a la API
        async with aiohttp.ClientSession() as session:
            async with session.post(
                GEMINI_URL, 
                params=params,
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error en respuesta de Gemini: {response.status}, {error_text}")
                    return None
                
                data = await response.json()
                
                # Extraer el JSON generado
                if "candidates" in data and len(data["candidates"]) > 0:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if parts and "text" in parts[0]:
                            json_text = parts[0]["text"].strip()
                            
                            # Extraer solo el JSON (ignorar texto adicional)
                            import re
                            json_match = re.search(r'(\{.*\})', json_text, re.DOTALL)
                            if json_match:
                                json_text = json_match.group(1)
                            
                            try:
                                article_data = json.loads(json_text)
                                
                                # Guardar en caché
                                gemini_cache[cache_key] = article_data
                                
                                return article_data
                            except json.JSONDecodeError as e:
                                logger.error(f"Error al decodificar JSON: {str(e)}")
                                return None
                
                logger.warning("No se pudo extraer datos del artículo de la respuesta de Gemini")
                return None
                
    except Exception as e:
        logger.error(f"Error al extraer datos del artículo con Gemini: {str(e)}", exc_info=True)
        return None
