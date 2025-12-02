// Mapbox configuration loaded from config.js
// Make sure config.js exists and contains your Mapbox access token
// See config.example.js for the template

// Initialize map centered on Stockholm
const map = L.map('map').setView([59.3293, 18.0686], 11);

// Add Mapbox tiles
// Available Mapbox styles: 'streets-v12', 'outdoors-v12', 'light-v11',
// 'dark-v11', 'satellite-v9', 'satellite-streets-v12'
const mapboxUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/' +
    '{z}/{x}/{y}?access_token=' + MAPBOX_ACCESS_TOKEN;
const mapboxAttribution = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ' +
    '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';

L.tileLayer(mapboxUrl, {
    attribution: mapboxAttribution,
    maxZoom: 22,
    tileSize: 512,
    zoomOffset: -1
}).addTo(map);

// Remove default Leaflet attribution if present
map.attributionControl.setPrefix('');

// Coordinate transformation from EPSG:3006 (Swedish) to WGS84
const epsg3006 = "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
const epsg4326 = "+proj=longlat +datum=WGS84 +no_defs";
proj4.defs("EPSG:3006", epsg3006);
proj4.defs("EPSG:4326", epsg4326);

// Function to transform coordinates
function transformCoordinates(coords) {
    if (Array.isArray(coords[0])) {
        return coords.map(coord => transformCoordinates(coord));
    }
    const [x, y] = coords;
    const [lon, lat] = proj4('EPSG:3006', 'EPSG:4326', [x, y]);
    return [lat, lon];
}

// Function to get color based on category
function getCategoryColor(category) {
    const colors = {
        'Utsatt område': '#ffc107',              // Yellow
        'Särskilt utsatt område': '#dc3545'      // Red
    };
    return colors[category] || '#ffc107';  // Default to yellow
}

// Store for vulnerable areas layer
let vulnerableAreasLayer = L.layerGroup().addTo(map);

// Load vulnerable areas from GeoJSON
async function loadVulnerableAreas() {
    try {
        const response = await fetch('uso_2025.geojson');
        const data = await response.json();
        
        data.features.forEach(feature => {
            const coords = feature.geometry.coordinates[0];
            const transformedCoords = coords.map(coord => transformCoordinates(coord));
            
            const category = feature.properties.KATEGORI || 'Vulnerable Area';
            const color = getCategoryColor(category);
            
            const polygon = L.polygon(transformedCoords, {
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 2
            });
            
            const name = feature.properties.NAMN || 'Unknown Area';
            const lokalpolisomrade = feature.properties.LOKALPOLISOMRADE || 'N/A';
            const aktualitetStart = feature.properties.AKTUALITET_START || 'N/A';
            
            const popupContent = `
                <div style="min-width: 200px;">
                    <h3 style="margin: 0 0 0.5rem 0; color: #333;">${name}</h3>
                    <p style="margin: 0.25rem 0; color: #666;">
                        <strong>Local Police Area:</strong> ${lokalpolisomrade}
                    </p>
                    <p style="margin: 0.25rem 0; color: #666;">
                        <strong>Category:</strong> ${category}
                    </p>
                    <p style="margin: 0.25rem 0; color: #666;">
                        <strong>Start Date:</strong> ${aktualitetStart}
                    </p>
                </div>
            `;
            polygon.bindPopup(popupContent);
            
            vulnerableAreasLayer.addLayer(polygon);
        });
        
        // Fit map to bounds
        if (vulnerableAreasLayer.getLayers().length > 0) {
            map.fitBounds(vulnerableAreasLayer.getBounds());
        }
    } catch (error) {
        console.error('Error loading vulnerable areas:', error);
    }
}

// Add legend to header
function addLegend() {
    const legendDiv = document.getElementById('legend');
    const utsattTooltip = 'A Vulnerable Area is a socioeconomically disadvantaged ' +
        'location where criminal influence impacts social norms and creates a ' +
        'culture of silence, causing residents to adapt their behavior to ' +
        'criminals rather than the criminals controlling the area outright.';
    const sarskiltTooltip = 'An Especially Vulnerable Area is a location in an ' +
        'acute state where parallel societal structures, religious extremism, ' +
        'or systematic threats against the legal system make it difficult or ' +
        'nearly impossible for the police to operate without special adaptation.';
    
    legendDiv.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background: #ffc107;"></div>
            <span>Utsatt område</span>
            <span class="info-icon" data-tooltip="${utsattTooltip}">ℹ️</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #dc3545;"></div>
            <span>Särskilt utsatt område</span>
            <span class="info-icon" data-tooltip="${sarskiltTooltip}">ℹ️</span>
        </div>
    `;
}

// Initialize
addLegend();
loadVulnerableAreas();
