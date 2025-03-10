from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Crear la aplicación FastAPI
app = FastAPI(
    title="Noticias API",
    description="API para el servicio de noticias",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar routers
from api.news import router as news_router
from api.auth import router as auth_router

# Incluir routers
app.include_router(news_router, prefix="/api/news", tags=["news"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

@app.get("/api/test-df")
async def test_df_scraping(url: str):
    """Endpoint de prueba para el scraping de DF.cl"""
    from services.scraping_service import get_news_from_df
    import logging
    
    logger = logging.getLogger("test_endpoint")
    
    try:
        logger.info(f"Probando scraping con URL: {url}")
        
        news_item = await get_news_from_df(url)
        
        if news_item:
            return {
                "success": True,
                "id": news_item.id,
                "title": news_item.title,
                "content_preview": news_item.content[:100] + "..." if len(news_item.content) > 100 else news_item.content
            }
        else:
            return {
                "success": False,
                "message": "No se pudo obtener el artículo"
            }
    except Exception as e:
        logger.error(f"Error en test-df: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/test-df-html")
async def test_df_html(url: str):
    """Endpoint de prueba para obtener el HTML de DF.cl"""
    import aiohttp
    import logging
    
    logger = logging.getLogger("test_html_endpoint")
    
    try:
        logger.info(f"Obteniendo HTML de: {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                logger.info(f"Código de estado: {response.status}")
                
                if response.status != 200:
                    return {
                        "success": False,
                        "status_code": response.status,
                        "message": "No se pudo obtener la página"
                    }
                
                html = await response.text()
                
                # Devolver sólo un fragmento del HTML para análisis
                html_preview = html[:500] + "..." if len(html) > 500 else html
                
                return {
                    "success": True,
                    "status_code": response.status,
                    "content_length": len(html),
                    "html_preview": html_preview
                }
                
    except Exception as e:
        logger.error(f"Error al obtener HTML: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/test-df-extract")
async def test_df_extract(url: str):
    """Endpoint de prueba para extraer contenido de DF.cl"""
    import aiohttp
    import logging
    from bs4 import BeautifulSoup
    
    logger = logging.getLogger("test_extract_endpoint")
    
    try:
        logger.info(f"Extrayendo contenido de: {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                logger.info(f"Código de estado: {response.status}")
                
                if response.status != 200:
                    return {
                        "success": False,
                        "status_code": response.status,
                        "message": "No se pudo obtener la página"
                    }
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extraer información relevante
                result = {
                    "success": True,
                    "url": url,
                    "page_title": soup.title.text if soup.title else "No title found",
                    "structure": {}
                }
                
                # Buscar elementos principales
                headline = soup.select_one('h1')
                if headline:
                    result["headline"] = headline.text.strip()
                    result["headline_parent"] = str(headline.parent.name)
                
                # Buscar contenido principal
                article_content = soup.select_one('article')
                if article_content:
                    result["structure"]["article_found"] = True
                    result["structure"]["article_classes"] = article_content.get('class', [])
                    
                    # Buscar párrafos
                    paragraphs = article_content.select('p')
                    if paragraphs:
                        result["structure"]["paragraphs_count"] = len(paragraphs)
                        result["structure"]["first_paragraph"] = paragraphs[0].text.strip() if paragraphs else "No paragraph found"
                else:
                    result["structure"]["article_found"] = False
                    
                # Buscar imágenes
                main_image = soup.select_one('figure img')
                if main_image:
                    result["structure"]["main_image_found"] = True
                    result["structure"]["main_image_src"] = main_image.get('src', '')
                else:
                    result["structure"]["main_image_found"] = False
                
                return result
                
    except Exception as e:
        logger.error(f"Error al extraer contenido: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/api/test-df-articles")
async def test_df_articles():
    """Endpoint para extraer y probar artículos recientes de DF.cl"""
    import aiohttp
    import logging
    from bs4 import BeautifulSoup
    from services.scraping_service import get_news_from_df
    
    logger = logging.getLogger("test_articles_endpoint")
    
    try:
        df_homepage = "https://www.df.cl/"
        logger.info(f"Extrayendo artículos recientes de la portada: {df_homepage}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        articles = []
        
        async with aiohttp.ClientSession() as session:
            async with session.get(df_homepage, headers=headers, timeout=10) as response:
                logger.info(f"Código de estado: {response.status}")
                
                if response.status != 200:
                    return {
                        "success": False,
                        "status_code": response.status,
                        "message": "No se pudo obtener la página"
                    }
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Buscar artículos en la portada
                article_links = []
                
                # Buscar enlaces que podrían ser artículos
                for link in soup.select('a[href]'):
                    href = link.get('href')
                    
                    # Considerar sólo enlaces internos que parezcan artículos
                    if href and ("df.cl" in href or href.startswith("/")) and not href.endswith("#"):
                        # Convertir URLs relativas a absolutas
                        if href.startswith('/'):
                            href = f"https://www.df.cl{href}"
                        
                        # Filtrar URLs que no parecen ser artículos
                        if any(x in href for x in ['/mercados/', '/empresas/', '/economia-y-politica/', '/opinion/', '/internacional/']):
                            if href not in article_links:
                                article_links.append(href)
                
                # Tomar los primeros 5 enlaces para probar
                test_links = article_links[:5]
                
                # Probar cada enlace
                for url in test_links:
                    try:
                        news_item = await get_news_from_df(url)
                        if news_item:
                            articles.append({
                                "url": url,
                                "title": news_item.title,
                                "id": news_item.id,
                                "success": True
                            })
                        else:
                            articles.append({
                                "url": url,
                                "success": False,
                                "error": "No se pudo extraer el contenido"
                            })
                    except Exception as e:
                        articles.append({
                            "url": url,
                            "success": False,
                            "error": str(e)
                        })
                
                return {
                    "success": True,
                    "articles_tested": len(articles),
                    "articles": articles,
                    "total_links_found": len(article_links)
                }
                
    except Exception as e:
        logger.error(f"Error al extraer artículos: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/")
async def root():
    """Endpoint raíz para verificar que la API está funcionando."""
    return {"message": "Bienvenido a la API de Noticias"}

@app.get("/health")
async def health_check():
    """Endpoint para verificar el estado de la API."""
    return {"status": "healthy"}

if __name__ == "__main__":
    # Obtener puerto del entorno o usar 8000 por defecto
    port = int(os.getenv("PORT", 8000))
    
    # Iniciar el servidor
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
