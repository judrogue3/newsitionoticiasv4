import firebase_admin
from firebase_admin import firestore
import datetime
from typing import List, Dict, Any, Optional

# Importar el objeto de credenciales desde el archivo de configuración
try:
    from firebase_config import cred
except ImportError as e:
    print(f"Error al importar credenciales: {e}")
    print("Asegúrate de que el archivo firebase_config.py existe con las credenciales correctas.")
    exit(1)

# Definición de proveedores principales
MAIN_PROVIDERS = ["DF.cl", "Bloomberg"]

def initialize_firebase():
    """
    Inicializa la conexión con Firebase utilizando las credenciales del archivo de configuración.
    """
    try:
        # Verificar si la aplicación ya está inicializada
        if not firebase_admin._apps:
            # Inicializar con las credenciales importadas
            firebase_admin.initialize_app(cred)
            print("Firebase inicializado correctamente.")

        # Retornar el cliente de Firestore
        return firestore.client()
    except Exception as e:
        print(f"Error al inicializar Firebase: {e}")
        print("Asegúrate de que el archivo de credenciales existe y es válido.")
        raise

def format_date(timestamp):
    """
    Formatea un objeto Timestamp de Firestore a una cadena legible.
    """
    if not timestamp:
        return "N/A"

    # Verificar si es el valor centinela SERVER_TIMESTAMP
    if timestamp == firestore.SERVER_TIMESTAMP:
        return "Pendiente"

    try:
        # Convertir a datetime si es un timestamp
        if hasattr(timestamp, "seconds"):
            dt = datetime.datetime.fromtimestamp(timestamp.seconds)
        else:
            dt = timestamp

        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(timestamp)

def get_news(
        db: firestore.Client,
        collection_name: str = "noticias",
        limit: int = 20,
        category: Optional[str] = None,
        provider: Optional[str] = None,
        search_term: Optional[str] = None,
        days_ago: Optional[int] = None,
        order_by: str = "created_at",
        order_desc: bool = True
) -> List[Dict[str, Any]]:
    """
    Obtiene noticias de Firebase con filtros opcionales.

    Args:
        db: Cliente de Firestore
        collection_name: Nombre de la colección
        limit: Número máximo de noticias a recuperar
        category: Filtrar por categoría (opcional)
        provider: Filtrar por proveedor (opcional)
        search_term: Buscar término en el título (opcional)
        days_ago: Filtrar noticias de los últimos N días (opcional)
        order_by: Campo por el cual ordenar
        order_desc: True para orden descendente, False para ascendente

    Returns:
        Lista de diccionarios con la información de las noticias
    """
    try:
        # Comenzar la consulta
        query = db.collection(collection_name)

        # Aplicar filtros
        if category:
            query = query.where("category", "==", category)

        if provider:
            query = query.where("provider", "==", provider)

        if days_ago:
            # Calcular la fecha de hace N días
            date_limit = datetime.datetime.now() - datetime.timedelta(days=days_ago)
            query = query.where("created_at", ">=", date_limit)

        # Ordenar resultados
        if order_desc:
            query = query.order_by(order_by, direction=firestore.Query.DESCENDING)
        else:
            query = query.order_by(order_by)

        # Limitar número de resultados
        query = query.limit(limit)

        # Ejecutar consulta
        news_docs = query.stream()

        # Procesar resultados
        news_list = []
        for doc in news_docs:
            news_data = doc.to_dict()
            news_data['id'] = doc.id

            # Filtrar por término de búsqueda si se proporcionó
            if search_term and search_term.lower() not in news_data.get('title', '').lower():
                continue

            # Formatear fechas para que sean serializables
            if 'created_at' in news_data and news_data['created_at']:
                news_data['created_at'] = format_date(news_data['created_at'])
            
            if 'updated_at' in news_data and news_data['updated_at']:
                news_data['updated_at'] = format_date(news_data['updated_at'])

            news_list.append(news_data)

        return news_list

    except Exception as e:
        print(f"Error al recuperar noticias: {e}")
        return []

def get_available_categories(db: firestore.Client, collection_name: str = "noticias", provider: Optional[str] = None) -> List[str]:
    """
    Obtiene todas las categorías disponibles en la colección de noticias.
    Opcionalmente filtra por proveedor.
    """
    try:
        # Crear la consulta base
        query = db.collection(collection_name).limit(1000)

        # Filtrar por proveedor si se especifica
        if provider:
            query = query.where("provider", "==", provider)

        # Ejecutar la consulta
        news_docs = query.stream()
        categories = set()

        for doc in news_docs:
            news_data = doc.to_dict()
            if 'category' in news_data and news_data['category']:
                categories.add(news_data['category'])

        return sorted(list(categories))
    except Exception as e:
        print(f"Error al obtener categorías: {e}")
        return []

def get_available_providers(db: firestore.Client, collection_name: str = "noticias") -> List[str]:
    """
    Obtiene todos los proveedores disponibles en la colección de noticias.
    """
    try:
        news_docs = db.collection(collection_name).limit(1000).stream()
        providers = set()

        for doc in news_docs:
            news_data = doc.to_dict()
            if 'provider' in news_data and news_data['provider']:
                providers.add(news_data['provider'])

        return sorted(list(providers))
    except Exception as e:
        print(f"Error al obtener proveedores: {e}")
        return []
