export function createMyLocationIcon(
  size = 28,
  color = '#8B5CF6',
  stroke = '#ffffff'
) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <g fill="none" stroke="${stroke}" stroke-width="1.2">
        <circle cx="12" cy="12" r="7" fill="${color}"/>
        <circle cx="12" cy="12" r="2.5" fill="${stroke}" stroke="none"/>
      </g>
    </svg>
  `);

  const url = `data:image/svg+xml;charset=UTF-8,${svg}`;

  return {
    url,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

export function createMissionMarkerIcon(color: string, size = 32) {
  const svg = encodeURIComponent(`
    <svg width="${size}" height="${size * 1.25}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>
  `);

  const url = `data:image/svg+xml;charset=UTF-8,${svg}`;

  return {
    url,
    scaledSize: new google.maps.Size(size, size * 1.25),
    anchor: new google.maps.Point(size / 2, size * 1.25),
  };
}

export function createTechnicianMarkerIcon(color: string, size = 28) {
  const svg = encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="10" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="4" fill="white"/>
    </svg>
  `);

  const url = `data:image/svg+xml;charset=UTF-8,${svg}`;

  return {
    url,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}
