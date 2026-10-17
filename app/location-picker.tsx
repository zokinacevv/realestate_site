"use client";

import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

type Location = { latitude: number; longitude: number };

type Props = {
  value: Location | null;
  onChange?: (location: Location) => void;
  readOnly?: boolean;
  height?: number;
};

const SKOPJE: Location = { latitude: 41.9981, longitude: 21.4254 };

function Pin({ value, onChange, readOnly }: { value: Location | null; onChange?: (location: Location) => void; readOnly: boolean }) {
  useMapEvents({
    click(event) {
      if (!readOnly && onChange) onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  if (!value) return null;
  return <CircleMarker center={[value.latitude, value.longitude]} radius={10} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#176158", fillOpacity: 1 }} />;
}

export default function LocationPicker({ value, onChange, readOnly = false, height = 340 }: Props) {
  const center = value ?? SKOPJE;
  return <div className="street-map" style={{ height }}>
    <MapContainer center={[center.latitude, center.longitude]} zoom={value ? 16 : 12} scrollWheelZoom={!readOnly} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Pin value={value} onChange={onChange} readOnly={readOnly} />
    </MapContainer>
  </div>;
}
