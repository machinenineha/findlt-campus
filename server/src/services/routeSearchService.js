/**
 * RouteReady Campus - Route & Stop Search Service
 * Implements strict sequence validation for origin-to-destination searches,
 * case-insensitive fuzzy stop/bus lookups, and geographic nearby stop calculations.
 */

const dbService = require('./dbService');

class RouteSearchService {
  /**
   * Search active stops by name or locality
   */
  async searchStops(query, collegeId) {
    if (!query || typeof query !== 'string') return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const stops = await dbService.getStops(collegeId, true);
    return stops.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(normalized);
      const localityMatch = s.locality && s.locality.toLowerCase().includes(normalized);
      const addressMatch = s.address && s.address.toLowerCase().includes(normalized);
      return nameMatch || localityMatch || addressMatch;
    });
  }

  /**
   * Search bus by bus number and return its route assignments and schedules
   */
  async searchBuses(query, collegeId) {
    if (!query || typeof query !== 'string') return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const buses = await dbService.getBuses(collegeId, false);
    const matched = buses.filter(b => b.bus_number.toLowerCase().includes(normalized));

    // For each matched bus, fetch associated routes and timetables
    const results = [];
    for (const bus of matched) {
      const busDetails = await dbService.getBusById(bus.id);
      results.push(busDetails);
    }
    return results;
  }

  /**
   * Origin-to-Destination Search with strict stop-sequence order validation
   */
  async findRoutesOriginToDestination(originStopQuery, destinationStopQuery, servicePeriod, collegeId) {
    const originTerm = originStopQuery.trim().toLowerCase();
    const destTerm = destinationStopQuery.trim().toLowerCase();

    const allRoutes = await dbService.getRoutes(collegeId, true);
    const matchedRoutes = [];

    for (const route of allRoutes) {
      // Find stops on this route
      const stops = route.stops || [];
      const originMatch = stops.find(s => s.name && s.name.toLowerCase().includes(originTerm));
      const destMatch = stops.find(s => s.name && s.name.toLowerCase().includes(destTerm));

      // Direct route only valid if both stops are present and origin sequence < destination sequence
      if (originMatch && destMatch && originMatch.sequence < destMatch.sequence) {
        // Fetch detailed route with schedules; fall back to the list-level route if not found
        const detailedRoute = await dbService.getRouteById(route.id) || route;
        let schedules = detailedRoute.schedules || [];
        if (servicePeriod && servicePeriod !== 'all') {
          schedules = schedules.filter(s => s.service_period === servicePeriod);
        }

        // Slice intermediate stops
        const intermediateStops = stops.filter(
          s => s.sequence >= originMatch.sequence && s.sequence <= destMatch.sequence
        );

        matchedRoutes.push({
          route: {
            id: detailedRoute.id,
            route_code: detailedRoute.route_code,
            name: detailedRoute.name,
            description: detailedRoute.description,
            status: detailedRoute.status
          },
          buses: detailedRoute.buses || [],
          origin_stop: originMatch,
          destination_stop: destMatch,
          stop_count_between: intermediateStops.length,
          stops_in_journey: intermediateStops,
          schedules: schedules.map(sch => {
            const originTime = (sch.schedule_stop_times || []).find(st => st.route_stop_id === originMatch.route_stop_id);
            const destTime = (sch.schedule_stop_times || []).find(st => st.route_stop_id === destMatch.route_stop_id);
            return {
              id: sch.id,
              service_period: sch.service_period,
              operating_days: sch.operating_days,
              origin_departure_time: originTime ? originTime.scheduled_time : null,
              destination_arrival_time: destTime ? destTime.scheduled_time : null
            };
          })
        });
      }
    }

    return matchedRoutes;
  }

  /**
   * Nearby stops calculation using standard Haversine distance formula (in km)
   */
  async findNearbyStops(lat, lon, maxDistanceKm = 10, collegeId) {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      throw new Error('Valid latitude and longitude coordinates are required for nearby search.');
    }

    const stops = await dbService.getStops(collegeId, true);
    const withDistances = stops
      .filter(s => s.latitude !== null && s.longitude !== null)
      .map(s => {
        const dist = this._calculateHaversineDistance(lat, lon, s.latitude, s.longitude);
        return {
          ...s,
          distance_km: Math.round(dist * 100) / 100
        };
      })
      .filter(s => s.distance_km <= maxDistanceKm)
      .sort((a, b) => a.distance_km - b.distance_km);

    return withDistances;
  }

  _calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = new RouteSearchService();