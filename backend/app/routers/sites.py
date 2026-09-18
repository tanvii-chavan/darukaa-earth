import datetime
import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape

# from geoalchemy2.types import Geography
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


def _seed_mock_metrics(db: Session, site: models.Site, months: int = 12) -> None:
    """
    Generate plausible-looking carbon/biodiversity history for a freshly
    created site so its analytics chart isn't empty. There's no live
    remote-sensing feed behind this demo (see README trade-offs), so this
    keeps the "view analytics for a site" user story working end-to-end for
    any site created through the UI, not just the seeded demo ones.
    """
    base_carbon = random.uniform(50, 150)
    base_bio = random.uniform(0.3, 0.6)
    today = datetime.datetime.utcnow()
    for i in range(months, 0, -1):
        month_date = today - datetime.timedelta(days=30 * i)
        db.add(
            models.SiteMetric(
                site_id=site.id,
                date=month_date,
                carbon_tons=round(base_carbon + (months - i) * random.uniform(2, 6), 2),
                biodiversity_index=round(
                    min(1.0, base_bio + (months - i) * random.uniform(0.005, 0.02)), 3
                ),
            )
        )
    db.commit()


def _compute_area_hectares(db: Session, site: models.Site) -> float:
    """
    Calculate geodesic area directly in PostGIS.
    The site geometry is stored in EPSG:4326, so casting
    the database column to geography makes ST_Area return m².
    """
    result = db.execute(
        text(
            """
            SELECT ST_Area(geom::geography)
            FROM sites
            WHERE id = :site_id
        """
        ),
        {"site_id": site.id},
    ).scalar()

    if result is None:
        return 0.0

    return round(float(result) / 10000, 2)


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

    if payload.area_hectares is None:
        site.area_hectares = _compute_area_hectares(db, site)
        db.commit()
        db.refresh(site)

    _seed_mock_metrics(db, site)

    return _site_to_out(site)


@router.delete("/{site_id}", status_code=204)
def delete_site(
    site_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    site = (
        db.query(models.Site)
        .join(models.Project)
        .filter(models.Site.id == site_id, models.Project.owner_id == current_user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)  # cascades to site_metrics (see relationship in models.py)
    db.commit()
    return None


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
