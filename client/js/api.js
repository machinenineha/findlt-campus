/**
 * RouteReady Campus - Centralized API Client
 * Wraps Fetch with Bearer token injection, structured error handling,
 * and standard response parsing.
 */

import { CONFIG } from './config.js';

export class ApiClient {
  static getToken() {
    const session = localStorage.getItem('rr_session');
    if (!session) return null;
    try {
      const parsed = JSON.parse(session);
      return parsed.token || null;
    } catch {
      return null;
    }
  }

  static async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401 && !window.location.pathname.includes('login.html')) {
          localStorage.removeItem('rr_session');
          // Optional redirect on unauthorized
        }
        const error = new Error(data?.message || `HTTP Error ${response.status}`);
        error.status = response.status;
        error.errors = data?.errors || null;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  // Public endpoints
  static getRoutes() {
    return this.request('/routes');
  }

  static getRouteById(id) {
    return this.request(`/routes/${id}`);
  }

  static searchOriginDestination(origin, destination, period = 'all') {
    const params = new URLSearchParams({ origin, destination, service_period: period });
    return this.request(`/routes/search/origin-destination?${params}`);
  }

  static searchNearby(lat, lon, radius = 10) {
    const params = new URLSearchParams({ lat, lon, radius });
    return this.request(`/routes/search/nearby?${params}`);
  }

  static getStops() {
    return this.request('/stops');
  }

  static searchStops(q) {
    return this.request(`/stops/search?q=${encodeURIComponent(q)}`);
  }

  static getBuses() {
    return this.request('/buses');
  }

  static getTimetables(period = null) {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    return this.request(`/timetables${query}`);
  }

  static getAnnouncements() {
    return this.request('/announcements');
  }

  // Profile endpoints
  static getProfile() {
    return this.request('/me/profile');
  }

  static updateProfile(profileData) {
    return this.request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData)
    });
  }

  // Admin endpoints
  static getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  static createBus(busData) {
    return this.request('/admin/buses', {
      method: 'POST',
      body: JSON.stringify(busData)
    });
  }

  static updateBus(id, busData) {
    return this.request(`/admin/buses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(busData)
    });
  }

  static deactivateBus(id) {
    return this.request(`/admin/buses/${id}`, {
      method: 'DELETE'
    });
  }

  static createStop(stopData) {
    return this.request('/admin/stops', {
      method: 'POST',
      body: JSON.stringify(stopData)
    });
  }

  static updateStop(id, stopData) {
    return this.request(`/admin/stops/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(stopData)
    });
  }

  static createRoute(routeData) {
    return this.request('/admin/routes', {
      method: 'POST',
      body: JSON.stringify(routeData)
    });
  }

  static updateRoute(id, routeData) {
    return this.request(`/admin/routes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(routeData)
    });
  }

  static setRouteStops(routeId, stopIds) {
    return this.request(`/admin/routes/${routeId}/stops`, {
      method: 'PUT',
      body: JSON.stringify({ stops: stopIds })
    });
  }

  static updateScheduleStopTimes(scheduleId, stopTimes) {
    return this.request(`/admin/schedules/${scheduleId}/stop-times`, {
      method: 'PUT',
      body: JSON.stringify({ stop_times: stopTimes })
    });
  }

  static getAllAdminAnnouncements() {
    return this.request('/admin/announcements');
  }

  static createAnnouncement(announcementData) {
    return this.request('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    });
  }

  static updateAnnouncement(id, announcementData) {
    return this.request(`/admin/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(announcementData)
    });
  }
}

