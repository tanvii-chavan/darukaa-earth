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

  // The map is created once (see the empty-dependency effect below), but
  // React re-renders pass new function instances for these callbacks on
  // every render (e.g. after selectedProjectId changes in the parent).
  // Event listeners attached inside the mount effect close over whatever
  // value existed at mount time, so without refs they'd keep calling the
  // *original* (stale) versions forever. Keeping these refs in sync lets
  // the listeners always call through to the latest callback.
  const onPolygonDrawnRef = useRef(onPolygonDrawn);
  const onSiteClickRef = useRef(onSiteClick);

  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
  }, [onPolygonDrawn]);

  useEffect(() => {
    onSiteClickRef.current = onSiteClick;
  }, [onSiteClick]);

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
      onPolygonDrawnRef.current(feature.geometry);
      // clear the drawn shape locally; the real polygon will render once
      // the site is saved and `sites` prop updates
      draw.deleteAll();
    });

    map.on("load", () => {
      renderSites(map, sites, (site) => onSiteClickRef.current(site));
    });
    // subsequent calls to renderSites() (triggered by the effect below when
    // `sites` changes) only update the data via setData() and never touch
    // the click listener, so the ref-wrapped callback above is the only one
    // that ever runs — it stays fresh for the life of the component.

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render site polygons whenever the sites list changes. This always
  // hits the setData() early-return path in renderSites (the source was
  // already created on map load), so no new click listener is attached here.
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderSites(mapRef.current, sites, null);
    }
  }, [sites]);

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
    const feature = e.features[0];
    // Built directly from the clicked feature rather than looked up in the
    // `sites` array param, which would otherwise be a second stale closure
    // (this listener is only attached once, the first time this source is
    // created).
    onSiteClick({
      id: feature.properties.id,
      name: feature.properties.name,
      geometry: feature.geometry,
    });
  });

  map.on("mouseenter", "sites-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "sites-fill", () => {
    map.getCanvas().style.cursor = "";
  });
}
