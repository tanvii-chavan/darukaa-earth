"""
Seed script: creates a demo user + project + a couple of sites (real-ish polygons
around a reforestation region) + 12 months of mock carbon/biodiversity metrics.

Run with:  python -m app.seed
"""

import datetime
import random

from app.database import SessionLocal, Base, engine
from app import models, auth

Base.metadata.create_all(bind=engine)

db = SessionLocal()

DEMO_EMAIL = "demo@darukaa.earth"
DEMO_PASSWORD = "demo1234"

user = db.query(models.User).filter(models.User.email == DEMO_EMAIL).first()
if not user:
    user = models.User(
        email=DEMO_EMAIL,
        hashed_password=auth.hash_password(DEMO_PASSWORD),
        full_name="Demo Admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")

project = (
    db.query(models.Project)
    .filter(
        models.Project.owner_id == user.id, models.Project.name == "Western Ghats Reforestation"
    )
    .first()
)
if not project:
    project = models.Project(
        name="Western Ghats Reforestation",
        description="Mixed carbon + biodiversity restoration project across degraded forest land.",
        project_type="mixed",
        owner_id=user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

# Two mock site polygons (small squares near real-ish coordinates)
site_defs = [
    {
        "name": "Site A - Valley Ridge",
        "coords": [[73.80, 15.30], [73.82, 15.30], [73.82, 15.32], [73.80, 15.32], [73.80, 15.30]],
        "area": 42.5,
    },
    {
        "name": "Site B - River Basin",
        "coords": [[73.85, 15.25], [73.87, 15.25], [73.87, 15.27], [73.85, 15.27], [73.85, 15.25]],
        "area": 28.0,
    },
]

for sd in site_defs:
    existing = db.query(models.Site).filter(models.Site.name == sd["name"]).first()
    if existing:
        continue
    geom_wkt = "POLYGON((" + ", ".join(f"{lng} {lat}" for lng, lat in sd["coords"]) + "))"
    site = models.Site(
        project_id=project.id,
        name=sd["name"],
        geom=f"SRID=4326;{geom_wkt}",
        area_hectares=sd["area"],
    )
    db.add(site)
    db.commit()
    db.refresh(site)

    # 12 months of mock metrics, mildly upward-trending carbon + biodiversity
    base_carbon = random.uniform(50, 150)
    base_bio = random.uniform(0.3, 0.6)
    today = datetime.datetime.utcnow()
    for i in range(12, 0, -1):
        month_date = today - datetime.timedelta(days=30 * i)
        metric = models.SiteMetric(
            site_id=site.id,
            date=month_date,
            carbon_tons=round(base_carbon + (12 - i) * random.uniform(2, 6), 2),
            biodiversity_index=round(
                min(1.0, base_bio + (12 - i) * random.uniform(0.005, 0.02)), 3
            ),
        )
        db.add(metric)
    db.commit()
    print(f"Seeded site: {sd['name']} with 12 months of metrics")

db.close()
print("Seeding complete.")
