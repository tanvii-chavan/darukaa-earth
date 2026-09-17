import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

/**
 * Renders all existing sites as polygons and lets the admin draw a new
 * polygon to create a site. Calls onPolygonDrawn(geojsonGeometry) when a
 * new polygon is finished, and onSiteClick(site) when an existing site is
 * clicked.
 */
export default function MapView({ sites, onPolygonDrawn, onSiteClick }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  useEffect(() => {
    if (!mapboxgl.accessToken) {
      // eslint-disable-next-line no-console
      console.warn(
        "VITE_MAPBOX_TOKEN is not set. Map will not render tiles. Get a free token at mapbox.com."
      );
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [73.84, 15.28],
      zoom: 11,
    });
    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    drawRef.current = draw;
    map.addControl(draw, "top-left");

    map.on("draw.create", (e) => {
      const feature = e.features[0];
      onPolygonDrawn(feature.geometry);
      // clear the drawn shape locally; the real polygon will render once
      // the site is saved and `sites` prop updates
      draw.deleteAll();
    });

    map.on("load", () => {
      renderSites(map, sites, onSiteClick);
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render site polygons whenever the sites list changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderSites(mapRef.current, sites, onSiteClick);
    }
  }, [sites, onSiteClick]);

  return <div ref={mapContainer} className="map-container" />;
}

function renderSites(map, sites, onSiteClick) {
  const sourceId = "sites-source";
  const geojson = {
    type: "FeatureCollection",
    features: sites.map((s) => ({
      type: "Feature",
      geometry: s.geometry,
      properties: { id: s.id, name: s.name },
    })),
  };

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(geojson);
    return;
  }

  map.addSource(sourceId, { type: "geojson", data: geojson });

  map.addLayer({
    id: "sites-fill",
    type: "fill",
    source: sourceId,
    paint: { "fill-color": "#2f9e44", "fill-opacity": 0.35 },
  });

  map.addLayer({
    id: "sites-outline",
    type: "line",
    source: sourceId,
    paint: { "line-color": "#2f9e44", "line-width": 2 },
  });

  map.on("click", "sites-fill", (e) => {
    const props = e.features[0].properties;
    const site = sites.find((s) => s.id === props.id);
    if (site) onSiteClick(site);
  });

  map.on("mouseenter", "sites-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "sites-fill", () => {
    map.getCanvas().style.cursor = "";
  });
}
