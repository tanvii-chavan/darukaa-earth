import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from shapely.geometry import shape, mapping

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/sites", tags=["sites"])


def _site_to_out(site: models.Site) -> dict:
    geom_shape = to_shape(site.geom)
    return {
        "id": site.id,
        "project_id": site.project_id,
        "name": site.name,
        "geometry": mapping(geom_shape),
        "area_hectares": site.area_hectares,
        "created_at": site.created_at,
    }


@router.post("/", response_model=schemas.SiteOut)
def create_site(
    payload: schemas.SiteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == payload.project_id,
            models.Project.owner_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        geom_shape = shape(payload.geometry)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid GeoJSON geometry")

    site = models.Site(
        project_id=payload.project_id,
        name=payload.name,
        geom=f"SRID=4326;{geom_shape.wkt}",
        area_hectares=payload.area_hectares,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return _site_to_out(site)


@router.get("/", response_model=List[schemas.SiteOut])
def list_sites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    sites = (
        db.query(models.Site)
        .join(models.Project)
        .filter(models.Project.owner_id == current_user.id)
        .all()
    )
    return [_site_to_out(s) for s in sites]


@router.get("/{site_id}", response_model=schemas.SiteOut)
def get_site(
    site_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    site = db.query(models.Site).filter(models.Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return _site_to_out(site)
