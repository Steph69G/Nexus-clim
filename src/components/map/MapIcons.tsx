import L from "leaflet";

export const createMissionIcon = (color: string) =>
  L.divIcon({
    className: "mission-marker",
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z"
              fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });

export const createMyLocationIcon = () =>
  L.divIcon({
    className: "my-location-marker",
    html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28">
        <text x="14" y="24" text-anchor="middle" font-size="24">📍</text>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

export const createSubcontractorIcon = (color: string) =>
  L.divIcon({
    className: "st-marker",
    html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="20" height="20" fill="${color}" stroke="white" stroke-width="2" rx="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export const createEmployeeIcon = (color: string) =>
  L.divIcon({
    className: "sal-marker",
    html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export const createTechnicianIcon = (color: string) =>
  L.divIcon({
    className: "tech-marker",
    html: `<div style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="4" fill="white"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
