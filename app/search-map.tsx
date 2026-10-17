"use client";

import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

type Entry = { id: string; title: string; price: string; latitude: number; longitude: number };
type Location = { latitude: number; longitude: number };

type Props = {
  center: Location | null;
  radiusMeters: number;
  listings: Entry[];
  onCenterChange: (location: Location) => void;
  onListingClick: (id: string) => void;
};

function RadiusControl({ onCenterChange }: { onCenterChange: (location: Location) => void }) {
  useMapEvents({ click: (event) => onCenterChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }) });
  return null;
}

export default function SearchMap({ center, radiusMeters, listings, onCenterChange, onListingClick }: Props) {
  return <div className="search-street-map">
    <MapContainer center={[41.9981, 21.4254]} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RadiusControl onCenterChange={onCenterChange} />
      {center && <Circle center={[center.latitude, center.longitude]} radius={radiusMeters} pathOptions={{ color: "#176158", weight: 2, fillColor: "#5ca98c", fillOpacity: .18 }} />}
      {listings.map((listing) => <CircleMarker key={listing.id} center={[listing.latitude, listing.longitude]} radius={9} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0c3935", fillOpacity: 1 }} eventHandlers={{ click: () => onListingClick(listing.id) }}><Tooltip direction="top" offset={[0, -10]} opacity={1}>{listing.title + " · " + listing.price}</Tooltip></CircleMarker>)}
    </MapContainer>
  </div>;
}
