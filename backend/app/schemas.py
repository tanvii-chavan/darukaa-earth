import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Project ----------
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: str = "carbon"


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    project_type: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Site ----------
class SiteCreate(BaseModel):
    project_id: str
    name: str
    # Standard GeoJSON geometry: {"type": "Polygon", "coordinates": [[[lng,lat], ...]]}
    geometry: dict
    area_hectares: Optional[float] = None


class SiteOut(BaseModel):
    id: str
    project_id: str
    name: str
    geometry: Any  # returned as GeoJSON dict
    area_hectares: Optional[float] = None
    created_at: datetime.datetime


# ---------- Metrics ----------
class SiteMetricOut(BaseModel):
    date: datetime.datetime
    carbon_tons: float
    biodiversity_index: float

    class Config:
        from_attributes = True


class SiteAnalyticsOut(BaseModel):
    site_id: str
    site_name: str
    metrics: List[SiteMetricOut]
