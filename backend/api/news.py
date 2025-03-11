from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from services.news_service import initialize_firebase, get_news, get_available_categories, get_available_providers, format_date
from services.scraping_service import get_news_from_df, get_by_id_df, ScrapedNewsItem, get_by_id
from services.serper_service import get_df_article_by_id
from services.gemini_service import generate_summary
import logging

logger = logging.getLogger(__name__)

# Modelos Pydantic para la API
class NewsBase(BaseModel):
    title: str
    content: str
    source: str
    category: str
    
class NewsCreate(NewsBase):
    pass

class News(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    provider: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[str] = None
    summary: Optional[str] = None
    
    class Config:
        orm_mode = True

router = APIRouter()

def get_article_from_firebase(news_id: str) -> Optional[Dict]:
    """
    Obtiene un artículo de Firebase por su ID
    
    Args:
        news_id: ID del artículo a buscar
        
    Returns:
        Diccionario con los datos del artículo o None si no se encuentra
    """
    try:
        db = initialize_firebase()
        doc_ref = db.collection("noticias").document(news_id)
        doc = doc_ref.get()
        
        if doc.exists:
            logger.info(f"Artículo encontrado en Firebase: {news_id}")
            return doc.to_dict()
        
        logger.info(f"Artículo no encontrado en Firebase: {news_id}")
        return None
    except Exception as e:
        logger.error(f"Error al obtener artículo de Firebase: {str(e)}")
        return None

def save_article_to_firebase(article: News) -> bool:
    """
    Guarda un artículo en Firebase
    
    Args:
        article: Objeto News a guardar
        
    Returns:
        True si se guardó correctamente, False en caso contrario
    """
    try:
        db = initialize_firebase()
        doc_ref = db.collection("noticias").document(article.id)
        
        # Convertir el objeto News a un diccionario
        article_dict = {
            "id": article.id,
            "title": article.title,
            "description": article.description,
            "content": article.content,
            "url": article.url,
            "image_url": article.image_url,
            "provider": article.provider,
            "category": article.category,
            "created_at": article.created_at,
            "summary": article.summary
        }
        
        doc_ref.set(article_dict)
        logger.info(f"Artículo guardado en Firebase: {article.id}")
        return True
    except Exception as e:
        logger.error(f"Error al guardar artículo en Firebase: {str(e)}")
        return False

@router.get("/", response_model=List[News])
async def get_all_news(
    category: Optional[str] = None,
    provider: Optional[str] = None,
    search: Optional[str] = None,
    days: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Obtener lista de noticias con filtros opcionales.
    """
    try:
        # Inicializar Firebase
        db = initialize_firebase()
        
        # Obtener noticias
        news_list = get_news(
            db=db,
            limit=limit + skip,
            category=category,
            provider=provider,
            search_term=search,
            days_ago=days
        )
        
        # Aplicar paginación
        return news_list[skip:skip + limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener noticias: {str(e)}")

@router.get("/featured", response_model=List[News])
async def get_featured_news(
    limit: int = Query(6, ge=1, le=20)
):
    """
    Obtener noticias destacadas de los proveedores principales (Bloomberg y DF.cl).
    """
    try:
        # Inicializar Firebase
        db = initialize_firebase()
        
        # Obtener noticias de Bloomberg
        bloomberg_news = get_news(
            db=db,
            limit=limit // 2,
            provider="Bloomberg"
        )
        
        # Obtener noticias de DF.cl
        df_news = get_news(
            db=db,
            limit=limit // 2,
            provider="DF.cl"
        )
        
        # Combinar y limitar al número solicitado
        featured_news = bloomberg_news + df_news
        return featured_news[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener noticias destacadas: {str(e)}")

@router.get("/providers", response_model=List[str])
async def get_providers():
    """
    Obtener lista de proveedores disponibles.
    """
    try:
        # Inicializar Firebase
        db = initialize_firebase()
        
        # Obtener proveedores
        providers = get_available_providers(db)
        return providers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener proveedores: {str(e)}")

@router.get("/categories", response_model=List[str])
async def get_categories(
    provider: Optional[str] = None
):
    """
    Obtener lista de categorías disponibles, opcionalmente filtradas por proveedor.
    """
    try:
        # Inicializar Firebase
        db = initialize_firebase()
        
        # Obtener categorías
        categories = get_available_categories(db, provider=provider)
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener categorías: {str(e)}")

@router.get("/provider/{provider}", response_model=List[News])
async def get_news_by_provider(
    provider: str,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Endpoint para obtener noticias por proveedor.
    """
    try:
        logger.info(f"Buscando noticias del proveedor: {provider}")
        
        # Normalizar el nombre del proveedor
        normalized_provider = provider
        
        # Manejar los casos especiales
        if provider.lower() == "bloomberg":
            normalized_provider = "Bloomberg"
        elif provider.lower() == "df.cl":
            normalized_provider = "DF.cl"
        
        logger.info(f"Nombre del proveedor normalizado: {normalized_provider}")
        
        # Inicializar Firebase
        db = initialize_firebase()
        
        # Obtener las noticias de Firebase
        news_list = get_news(
            db=db,
            limit=limit + skip,
            provider=normalized_provider,
            category=category
        )
        
        logger.info(f"Encontradas {len(news_list)} noticias para {normalized_provider}")
        
        # Si no hay noticias en Firebase y el proveedor es DF.cl, intentar scraping en tiempo real
        if len(news_list) == 0 and normalized_provider == "DF.cl":
            logger.info("No hay noticias de DF.cl en Firebase, intentando scraping en tiempo real")
            # Aquí podríamos implementar un scraping en tiempo real si es necesario
        
        # Crear lista de objetos News desde los diccionarios
        news_objects = []
        for news_item in news_list:
            # Asegurarse de que todos los campos requeridos estén presentes
            news_object = {
                "id": news_item.get("id", ""),
                "title": news_item.get("title", ""),
                "description": news_item.get("description", ""),
                "content": news_item.get("content", ""),
                "url": news_item.get("url", ""),
                "image_url": news_item.get("image_url", ""),
                "provider": news_item.get("provider", ""),
                "category": news_item.get("category", ""),
                "created_at": news_item.get("created_at", ""),
                "summary": news_item.get("summary", "")
            }
            news_objects.append(news_object)
        
        # Eliminar duplicados basados en el ID del artículo
        unique_news_dict = {news["id"]: news for news in news_objects}
        unique_news_list = list(unique_news_dict.values())
        
        logger.info(f"Después de eliminar duplicados, quedan {len(unique_news_list)} noticias únicas")
        
        # Aplicar paginación
        paginated_list = unique_news_list[skip:skip + limit]
        logger.info(f"Retornando {len(paginated_list)} noticias paginadas")
        
        return paginated_list
    except Exception as e:
        logger.error(f"Error al obtener noticias del proveedor {provider}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al obtener noticias del proveedor: {str(e)}")

@router.get("/{news_id}", response_model=News)
async def get_news_by_id(news_id: str):
    """
    Endpoint para obtener una noticia por su ID.
    """
    logger.info(f"Buscando noticia con ID: {news_id}")
    
    try:
        # Intentar encontrar el artículo en Firebase primero
        article = get_article_from_firebase(news_id)
        if article:
            logger.info(f"Artículo encontrado en Firebase: {news_id}")
            return article
        
        # Si es una noticia de DF.cl con formato "df.cl-hash"
        if news_id.startswith('df.cl-'):
            logger.info(f"Detectada noticia de DF.cl con formato df.cl-: {news_id}")
            
            # Extraer el hash ID
            hash_id = news_id[6:]  # Eliminar 'df.cl-' del principio
            logger.info(f"Hash ID extraído: {hash_id}")
            
            # Usar serper para obtener el contenido del artículo
            try:
                logger.info(f"Obteniendo artículo de DF.cl con serper para ID: {hash_id}")
                article_data = await get_df_article_by_id(hash_id)
                
                if article_data and 'content' in article_data:
                    logger.info(f"Artículo encontrado con serper, generando resumen con Gemini")
                    
                    # Generar resumen con Google Gemini
                    summary = await generate_summary(article_data['content'])
                    
                    # Crear objeto News con los datos obtenidos
                    news = News(
                        id=news_id,  # Mantener el ID original con formato df.cl-
                        title=article_data.get('title', 'Artículo de DF.cl'),
                        description=article_data.get('description', summary[:150] + "...") if summary else None,
                        content=article_data.get('content', ''),
                        url=article_data.get('url', f"https://www.df.cl/noticias/article/{hash_id}"),
                        image_url=article_data.get('image_url', ''),
                        provider="DF.cl",
                        category=article_data.get('category', 'Noticias'),
                        created_at=article_data.get('created_at', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                        summary=summary
                    )
                    
                    # Guardar en Firebase para futuras consultas
                    try:
                        save_article_to_firebase(news)
                        logger.info(f"Artículo guardado en Firebase: {news_id}")
                    except Exception as e:
                        logger.error(f"Error al guardar en Firebase: {str(e)}")
                    
                    return news
                else:
                    logger.warning(f"No se pudo obtener el artículo con serper para ID: {hash_id}")
            except Exception as e:
                logger.error(f"Error al obtener artículo con serper: {str(e)}", exc_info=True)
            
            # Si falla serper, usar el método anterior como fallback
            logger.info(f"Intentando método alternativo para obtener el artículo...")
        
        # Si es una noticia de DF.cl con formato "df-hash" o si falló serper
        if news_id.startswith('df-') or news_id.startswith('df.cl-'):
            logger.info(f"Usando método de scraping alternativo para: {news_id}")
            
            # Normalizar el ID para el método alternativo
            normalized_id = news_id
            if news_id.startswith('df.cl-'):
                normalized_id = 'df-' + news_id[6:]  # Cambiar df.cl- por df-
            
            logger.info(f"ID normalizado para scraping alternativo: {normalized_id}")
            
            try:
                # Usar la función get_by_id que maneja todos los formatos posibles
                news_item = await get_by_id(normalized_id)
                logger.info(f"Resultado de get_by_id alternativo: {news_item}")
                
                if news_item:
                    logger.info(f"Noticia de DF.cl encontrada con método alternativo: {normalized_id}")
                    
                    # Convertir a formato News para la respuesta
                    news = News(
                        id=news_id,  # Mantener el ID original
                        title=news_item.title,
                        description=news_item.content[:150] + "..." if len(news_item.content) > 150 else news_item.content,
                        content=news_item.content,
                        url=news_item.url,
                        image_url=news_item.image_url,
                        provider="DF.cl",
                        category=news_item.category,
                        created_at=news_item.created_at if hasattr(news_item, 'created_at') else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    )
                    
                    # Guardar en Firebase para futuras consultas
                    try:
                        save_article_to_firebase(news)
                        logger.info(f"Artículo guardado en Firebase: {news_id}")
                    except Exception as e:
                        logger.error(f"Error al guardar en Firebase: {str(e)}")
                    
                    return news
                else:
                    # Si no encontramos la noticia, usar el endpoint de fallback
                    logger.warning(f"No se encontró la noticia de DF.cl, usando fallback: {normalized_id}")
                    hash_id = normalized_id.replace('df-', '')
                    # Crear una respuesta de fallback directamente aquí para evitar redirecciones
                    return await get_df_fallback(hash_id)
                    
            except Exception as e:
                logger.error(f"Error al obtener noticia por ID: {str(e)}", exc_info=True)
                # En caso de error, también usar el fallback
                logger.warning(f"Error al procesar noticia de DF.cl, usando fallback: {normalized_id}")
                hash_id = normalized_id.replace('df-', '')
                return await get_df_fallback(hash_id)
        
        # Si el artículo no está en Firebase y no es de DF.cl, buscar en la API de Google News
        logger.info(f"Buscando noticia en Google News: {news_id}")
        article = search_article_by_id(news_id)
        if article:
            logger.info(f"Artículo encontrado en Google News: {news_id}")
            return article
        
        logger.warning(f"No se pudo encontrar la noticia con ID: {news_id}")
        raise HTTPException(status_code=404, detail=f"Noticia con ID {news_id} no encontrada")
        
    except HTTPException as e:
        # Propagar excepciones HTTP
        raise
    except Exception as e:
        logger.error(f"Error al procesar la solicitud: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud: {str(e)}")

async def get_df_fallback(hash_id: str) -> News:
    """
    Función de fallback para generar un artículo genérico de DF.cl cuando no se puede encontrar uno real
    
    Args:
        hash_id: ID hash del artículo
        
    Returns:
        Objeto News con información genérica
    """
    logger.info(f"Utilizando fallback para artículo DF.cl con hash ID: {hash_id}")
    
    try:
        # Intentar primero con serper
        from services.serper_service import get_df_article_by_id
        
        article_data = await get_df_article_by_id(hash_id)
        if article_data and 'content' in article_data:
            logger.info(f"Artículo encontrado con serper en fallback")
            
            # Generar resumen con Google Gemini si hay contenido
            summary = None
            if article_data.get('content'):
                from services.gemini_service import generate_summary
                summary = await generate_summary(article_data['content'])
            
            # Crear objeto News con los datos obtenidos
            news = News(
                id=f"df.cl-{hash_id}",
                title=article_data.get('title', 'Artículo de DF.cl'),
                description=article_data.get('description', ''),
                content=article_data.get('content', ''),
                url=article_data.get('url', f"https://www.df.cl/noticias/article/{hash_id}"),
                image_url=article_data.get('image_url', ''),
                provider="DF.cl",
                category=article_data.get('category', 'Noticias'),
                created_at=article_data.get('created_at', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                summary=summary
            )
            
            # Guardar en Firebase para futuras consultas
            try:
                save_article_to_firebase(news)
                logger.info(f"Artículo fallback guardado en Firebase: df.cl-{hash_id}")
            except Exception as e:
                logger.error(f"Error al guardar fallback en Firebase: {str(e)}")
            
            return news
    except Exception as e:
        logger.error(f"Error en fallback principal: {str(e)}", exc_info=True)
    
    # Si todo lo demás falla, crear un artículo genérico
    logger.warning(f"Creando artículo genérico para ID: {hash_id}")
    
    generic_news = News(
        id=f"df.cl-{hash_id}",
        title="Noticia de Diario Financiero",
        description="Este contenido está disponible en la versión original del Diario Financiero.",
        content="El contenido completo de este artículo está disponible en el sitio web del Diario Financiero. " +
                "Por favor, visite el sitio oficial para acceder al artículo completo.",
        url=f"https://www.df.cl",
        image_url="https://www.df.cl/noticias/site/artic/20170830/imag/foto_0000000420170830125823.jpg",
        provider="DF.cl",
        category="Noticias",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        summary="Este es un artículo del Diario Financiero. El contenido completo está disponible en su sitio web oficial."
    )
    
    return generic_news

@router.get("/df-scrape/{df_id}", response_model=News)
async def get_df_news_by_scraping(df_id: str):
    """
    Endpoint específico para obtener una noticia de DF.cl mediante scraping.
    Este endpoint se utiliza como respaldo cuando una noticia no está en Firebase.
    """
    try:
        logger.info(f"Intento de scraping para noticia DF.cl con ID: {df_id}")
        
        # Primero, intentar obtener el artículo usando Firebase
        article = get_article_from_firebase(f"df-{df_id}")
        if article:
            logger.info(f"Artículo de DF.cl encontrado en Firebase: {df_id}")
            return article
        
        # Si no está en Firebase, usar la función especializada para DF.cl
        try:
            news_item = await get_by_id_df(df_id)
            logger.info(f"Resultado de get_by_id_df: {news_item}")
        except Exception as e:
            logger.error(f"Error específico en get_by_id_df: {str(e)}", exc_info=True)
            raise
        
        if news_item:
            logger.info(f"Artículo de DF.cl encontrado mediante scraping: {df_id}")
            
            # Convertir a formato News para la respuesta
            news = News(
                id=news_item.id,
                title=news_item.title,
                description=news_item.content[:150] + "..." if len(news_item.content) > 150 else news_item.content,
                content=news_item.content,
                url=news_item.url,
                image_url=news_item.image_url,
                provider="DF.cl",
                category=news_item.category,
                created_at=news_item.created_at if hasattr(news_item, 'created_at') else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
            
            # Guardar en Firebase para futuras consultas
            try:
                save_article_to_firebase(news)
                logger.info(f"Artículo guardado en Firebase: {df_id}")
            except Exception as e:
                logger.error(f"Error al guardar artículo en Firebase: {str(e)}")
            
            return news
        
        else:
            logger.warning(f"No se pudo encontrar el artículo de DF.cl con ID: {df_id}")
            raise HTTPException(status_code=404, detail=f"Artículo con ID {df_id} no encontrado")
            
    except Exception as e:
        logger.error(f"Error al hacer scraping de DF.cl: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud: {str(e)}")

@router.get("/df-test/{df_id}")
async def test_df_scraping(df_id: str):
    """
    Endpoint de prueba para scraping de DF.cl
    """
    try:
        logger.info(f"Prueba de scraping para DF.cl con ID: {df_id}")
        
        # Construir posibles URLs
        urls = [
            f"https://www.df.cl/empresas/industria/{df_id}",
            f"https://www.df.cl/empresas/actualidad/{df_id}",
            f"https://www.df.cl/empresas/energia/{df_id}",
            f"https://www.df.cl/mercados/bolsa-monedas/{df_id}",
            f"https://www.df.cl/{df_id}"
        ]
        
        # Intentar con cada URL
        for url in urls:
            try:
                logger.info(f"Intentando URL: {url}")
                
                # Usar la función de scraping básica
                news_item = await get_news_from_df(url)
                
                if news_item:
                    return {
                        "status": "success",
                        "message": "Artículo encontrado",
                        "id": news_item.id,
                        "title": news_item.title,
                        "url_used": url
                    }
            except Exception as e:
                logger.error(f"Error con URL {url}: {str(e)}")
        
        # Si no se encontró el artículo
        return {
            "status": "error",
            "message": "No se pudo encontrar el artículo"
        }
    
    except Exception as e:
        logger.error(f"Error general: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error al procesar la solicitud: {str(e)}"
        }

@router.get("/df-test-url")
async def test_df_url_scraping(url: str = Query(..., description="URL directa del artículo de DF.cl")):
    """
    Endpoint de prueba para scraping de DF.cl usando una URL directa
    """
    try:
        logger.info(f"Prueba de scraping para DF.cl con URL directa: {url}")
        
        # Usar la función de scraping básica directamente con la URL proporcionada
        news_item = await get_news_from_df(url)
        
        if news_item:
            return {
                "status": "success",
                "message": "Artículo encontrado",
                "id": news_item.id,
                "title": news_item.title,
                "url_used": url
            }
        else:
            return {
                "status": "error",
                "message": "No se pudo encontrar el artículo con la URL proporcionada"
            }
    
    except Exception as e:
        logger.error(f"Error general en test_df_url_scraping: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error al procesar la solicitud: {str(e)}"
        }

@router.get("/df/url", response_model=News)
async def get_df_news_by_url(url: str):
    """
    Obtener una noticia de DF.cl por su URL mediante scraping.
    Este endpoint solo se utiliza como respaldo cuando una noticia no se encuentra en Firebase
    y necesitamos obtener sus datos completos mediante scraping.
    """
    try:
        news_item = await get_news_from_df(url)
        
        if not news_item:
            raise HTTPException(status_code=404, detail="No se pudo obtener la noticia de la URL proporcionada")
        
        # Convertir a formato de respuesta
        news_dict = news_item.to_dict()
        news_dict['id'] = f"df-{news_dict['id']}"  # Agregar prefijo df- al ID
        
        return news_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener noticia por URL: {str(e)}")

@router.get("/df-direct-test")
async def test_df_direct(url: str):
    """
    Endpoint de prueba para scraping directo de DF.cl
    """
    try:
        logger.info(f"Prueba de scraping directo para: {url}")
        
        # Realizar scraping directo con la URL proporcionada
        try:
            news_item = await get_news_from_df(url)
            
            if news_item:
                return {
                    "status": "success",
                    "message": "Artículo encontrado",
                    "id": news_item.id,
                    "title": news_item.title,
                    "url": url,
                    "content_preview": news_item.content[:100] + "..." if len(news_item.content) > 100 else news_item.content
                }
        except Exception as e:
            logger.error(f"Error específico en scraping directo: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": f"Error específico: {str(e)}"
            }
        
        return {
            "status": "error",
            "message": "No se pudo obtener el artículo"
        }
        
    except Exception as e:
        logger.error(f"Error general: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error general: {str(e)}"
        }

@router.get("/df.cl-fallback/{hash_id}")
async def get_df_fallback(hash_id: str):
    """
    Endpoint de respaldo para noticias de DF.cl con ID de hash que no se pueden encontrar
    Devuelve una noticia genérica con información de fallback
    """
    full_id = f"df.cl-{hash_id}"
    logger.info(f"Generando fallback para noticia con ID: {full_id}")
    
    # Crear una noticia genérica como fallback
    news = News(
        id=full_id,
        title="Artículo de DF.cl",
        description="Este artículo ya no está disponible en la fuente original. Se mostrará un contenido resumido.",
        content="Este artículo de DF.cl ya no está disponible en la fuente original. Es posible que el contenido haya sido eliminado o movido por el proveedor. Puedes intentar buscar el artículo directamente en el sitio web de DF.cl.",
        url=f"https://www.df.cl",
        image_url="https://www.df.cl/noticias/site/artic/20180201/imag/foto_0000000120180201120156/logo-DF.svg",
        provider="DF.cl",
        category="General",
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    
    return news
