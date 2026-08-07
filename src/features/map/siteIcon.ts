export const createSiteIconUrl = (color: string) => {
  // Ultra-premium Map Pin integrating Lucide RadioTower vectors natively 
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30" width="36" height="46">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <!-- Base pin droplet -->
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)" />
      
      <!-- Embedded Lucide RadioTower scaled and centered inside droplet -->
      <g transform="translate(6, 3) scale(0.5)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
        <circle cx="12" cy="12" r="2" fill="#ffffff"/>
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
      </g>
    </svg>
  `;
  // Use standard base64 encoding
  if (typeof btoa !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
};

export const SITE_ICONS = {
  Zong: createSiteIconUrl("#22C55E"), // Green
  Jazz: createSiteIconUrl("#EF4444"), // Red 
  Ufone: createSiteIconUrl("#A855F7"), // Purple
  Unknown: createSiteIconUrl("#94A3B8"),
};
