/**
 * RouteReady Campus - Leaflet Map Integration
 * Handles interactive route maps, stop markers, route polylines, and popups.
 */

export class CampusMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.map = null;
    this.markersLayer = null;
    this.routeLine = null;
    this.defaultCenter = options.center || [12.9772, 77.5713]; // Bangalore default
    this.defaultZoom = options.zoom || 12;
  }

  init() {
    const el = document.getElementById(this.containerId);
    if (!el || !window.L) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = window.L.map(this.containerId, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView(this.defaultCenter, this.defaultZoom);

    // OpenStreetMap standard tile layer with required attribution
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.markersLayer = window.L.layerGroup().addTo(this.map);
  }

  renderRouteStops(stops = []) {
    if (!this.map || !this.markersLayer) this.init();
    this.markersLayer.clearLayers();
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    const validCoordinates = [];

    stops.forEach((stop, index) => {
      if (stop.latitude !== null && stop.longitude !== null && !isNaN(stop.latitude) && !isNaN(stop.longitude)) {
        const latLng = [stop.latitude, stop.longitude];
        validCoordinates.push(latLng);

        // Marker color distinction for start, intermediate, and terminus stops
        const isStart = index === 0;
        const isEnd = index === stops.length - 1;
        const markerColor = isStart ? '#0d9488' : isEnd ? '#0f172a' : '#1e3a8a';

        const customIcon = window.L.divIcon({
          className: 'custom-bus-pin',
          html: `<div style="
            background-color: ${markerColor};
            color: #ffffff;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${stop.sequence || index + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = window.L.marker(latLng, { icon: customIcon });

        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.4;">
            <strong style="color: #0f172a; font-size: 14px;">${stop.name}</strong>
            ${stop.locality ? `<br><span style="color: #64748b;">${stop.locality}</span>` : ''}
            <br><span style="font-size: 11px; color: #1e3a8a; font-weight: 600;">Stop #${stop.sequence || index + 1}</span>
            <div style="margin-top: 4px; font-size: 11px; color: #475569;">Scheduled times only</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.markersLayer.addLayer(marker);
      }
    });

    // Draw route polyline if at least 2 stops have coordinates
    if (validCoordinates.length >= 2) {
      this.routeLine = window.L.polyline(validCoordinates, {
        color: '#1e3a8a',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(this.map);

      this.map.fitBounds(this.routeLine.getBounds(), { padding: [40, 40] });
    } else if (validCoordinates.length === 1) {
      this.map.setView(validCoordinates[0], 14);
    }
  }

  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

