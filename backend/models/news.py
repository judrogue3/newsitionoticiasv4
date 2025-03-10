from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class News(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    published_date = Column(DateTime, default=datetime.utcnow)
    image_url = Column(String(255), nullable=True)
    
    # Relaciones (si se implementan más adelante)
    # comments = relationship("Comment", back_populates="news")
    
    def __repr__(self):
        return f"<News(id={self.id}, title='{self.title}', category='{self.category}')>"
