from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/sites/{site_id}", response_model=schemas.SiteAnalyticsOut)
def get_site_analytics(
    site_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    site = db.query(models.Site).filter(models.Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    metrics = (
        db.query(models.SiteMetric)
        .filter(models.SiteMetric.site_id == site_id)
        .order_by(models.SiteMetric.date)
        .all()
    )
    return {
        "site_id": site.id,
        "site_name": site.name,
        "metrics": metrics,
    }
