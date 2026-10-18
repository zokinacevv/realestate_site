"use client";

import { Circle, CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useRef } from "react";

type Entry = { id: string; title: string; price: string; latitude: number; longitude: number };
type Location = { latitude: number; longitude: number };

type Props = {
  tool: "radius" | "polygon";
  center: Location | null;
  radiusMeters: number;
  polygon: Location[];
  listings: Entry[];
  onCenterChange: (location: Location) => void;
  onPolygonChange: (locations: Location[]) => void;
  onListingClick: (id: string) => void;
};

function DrawControls({ tool, onCenterChange, onPolygonChange }: Pick<Props, "tool" | "onCenterChange" | "onPolygonChange">) {
  const map = useMap();
  const drawing = useRef(false);
  const points = useRef<Location[]>([]);
  useEffect(() => {
    if (tool === "polygon") map.dragging.disable();
    else map.dragging.enable();
    return () => { map.dragging.enable(); };
  }, [map, tool]);
  useMapEvents({
    click(event) {
      if (tool === "radius") onCenterChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
    mousedown(event) {
      if (tool !== "polygon") return;
      drawing.current = true;
      points.current = [{ latitude: event.latlng.lat, longitude: event.latlng.lng }];
      onPolygonChange(points.current);
    },
    mousemove(event) {
      if (!drawing.current || tool !== "polygon") return;
      const next = { latitude: event.latlng.lat, longitude: event.latlng.lng };
      const previous = points.current.at(-1);
      if (!previous || Math.abs(previous.latitude - next.latitude) + Math.abs(previous.longitude - next.longitude) > 0.00008) {
        points.current = [...points.current, next];
        onPolygonChange(points.current);
      }
    },
    mouseup() {
      if (!drawing.current) return;
      drawing.current = false;
      if (points.current.length < 3) onPolygonChange([]);
    },
  });
  return null;
}

export default function SearchMap({ tool, center, radiusMeters, polygon, listings, onCenterChange, onPolygonChange, onListingClick }: Props) {
  return <div className="search-street-map">
    <MapContainer center={[41.9981, 21.4254]} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <DrawControls tool={tool} onCenterChange={onCenterChange} onPolygonChange={onPolygonChange} />
      {tool === "radius" && center && <Circle center={[center.latitude, center.longitude]} radius={radiusMeters} pathOptions={{ color: "#176158", weight: 2, fillColor: "#5ca98c", fillOpacity: .18 }} />}
      {tool === "polygon" && polygon.length >= 3 && <Polygon positions={polygon.map((point) => [point.latitude, point.longitude])} pathOptions={{ color: "#176158", weight: 2, fillColor: "#5ca98c", fillOpacity: .18 }} />}
      {listings.map((listing) => <CircleMarker key={listing.id} center={[listing.latitude, listing.longitude]} radius={9} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0c3935", fillOpacity: 1 }} eventHandlers={{ click: () => onListingClick(listing.id) }}><Tooltip direction="top" offset={[0, -10]} opacity={1}>{listing.title + " · " + listing.price}</Tooltip></CircleMarker>)}
    </MapContainer>
  </div>;
}
