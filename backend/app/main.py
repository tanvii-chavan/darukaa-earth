from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth as auth_router
from app.routers import projects as projects_router
from app.routers import sites as sites_router
from app.routers import analytics as analytics_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Darukaa.Earth API",
    description="Geospatial carbon & biodiversity project analytics platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production to the deployed frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(projects_router.router)
app.include_router(sites_router.router)
app.include_router(analytics_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
