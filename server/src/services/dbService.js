/**
 * RouteReady Campus - Central Database Service
 * Provides unified access to Supabase PostgreSQL with resilient fallback
 * to demonstration store if tables have not yet been migrated (PGRST205).
 */

const { supabaseAdmin, demoStore, logAudit } = require('../utils/supabase');
const config = require('../config');
const logger = require('../utils/logger');

class DBService {
  /**
   * Returns true when the Supabase error indicates tables don't exist yet
   * (migrations not applied) — triggers demo store fallback.
   */
  isSchemaMissing(error) {
    return error && (
      error.code === 'PGRST205' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist')
    );
  }

  /**
   * Returns true when: no service_role key is configured AND the live DB
   * returned an empty result. This means either migrations haven't been run
   * yet or RLS blocks all reads with the anon key — either way, serve demo data.
   */
  isEmptyWithoutServiceRole(data) {
    return !config.supabase?.serviceRoleKey && Array.isArray(data) && data.length === 0;
  }

  // ==========================================
  // BUSES
  // ==========================================
  async getBuses(collegeId = config.defaultCollegeId, activeOnly = false) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('buses')
          .select(`
            id, college_id, bus_number, registration_number, capacity, status, created_at, updated_at,
            route_buses (
              route_id,
              routes (id, route_code, name, status)
            )
          `)
          .eq('college_id', collegeId);

        if (activeOnly) {
          query = query.eq('status', 'active');
        }

        const { data, error } = await query.order('bus_number', { ascending: true });
        if (error) {
          if (this.isSchemaMissing(error)) {
            logger.warn('Table buses not found in live Supabase. Fallback to demo store.');
            return this._getDemoBuses(collegeId, activeOnly);
          }
          throw error;
        }
        if (this.isEmptyWithoutServiceRole(data)) {
          logger.warn('Buses query returned empty without service_role key. Fallback to demo store.');
          return this._getDemoBuses(collegeId, activeOnly);
        }
        return data.map(b => ({
          ...b,
          assigned_routes: (b.route_buses || []).map(rb => rb.routes).filter(Boolean)
        }));
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._getDemoBuses(collegeId, activeOnly);
        throw err;
      }
    }
    return this._getDemoBuses(collegeId, activeOnly);
  }

  _getDemoBuses(collegeId, activeOnly) {
    let buses = demoStore.buses.filter(b => b.college_id === collegeId);
    if (activeOnly) {
      buses = buses.filter(b => b.status === 'active');
    }
    return buses.map(bus => {
      const assignedRouteBuses = demoStore.route_buses.filter(rb => rb.bus_id === bus.id);
      const assigned_routes = assignedRouteBuses
        .map(rb => demoStore.routes.find(r => r.id === rb.route_id))
        .filter(Boolean);
      return { ...bus, assigned_routes };
    });
  }

  async getBusById(id) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('buses')
          .select(`
            id, college_id, bus_number, registration_number, capacity, status, created_at, updated_at,
            route_buses (
              route_id,
              routes (id, route_code, name, status)
            )
          `)
          .eq('id', id)
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._getDemoBusById(id);
          return null;
        }
        return {
          ...data,
          assigned_routes: (data.route_buses || []).map(rb => rb.routes).filter(Boolean)
        };
      } catch {
        return this._getDemoBusById(id);
      }
    }
    return this._getDemoBusById(id);
  }

  _getDemoBusById(id) {
    const bus = demoStore.buses.find(b => b.id === id);
    if (!bus) return null;
    const assignedRouteBuses = demoStore.route_buses.filter(rb => rb.bus_id === bus.id);
    const assigned_routes = assignedRouteBuses
      .map(rb => demoStore.routes.find(r => r.id === rb.route_id))
      .filter(Boolean);
    return { ...bus, assigned_routes };
  }

  async createBus(busData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('buses')
          .insert([{
            college_id: busData.college_id || config.defaultCollegeId,
            bus_number: busData.bus_number,
            registration_number: busData.registration_number || null,
            capacity: busData.capacity || null,
            status: busData.status || 'active'
          }])
          .select()
          .single();

        if (error) {
          if (this.isSchemaMissing(error)) return this._createDemoBus(busData, actorId);
          throw error;
        }

        if (busData.route_id) {
          await supabaseAdmin.from('route_buses').insert([{
            route_id: busData.route_id,
            bus_id: data.id
          }]);
        }

        logAudit(actorId, 'CREATE_BUS', 'BUS', data.id, { bus_number: data.bus_number });
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._createDemoBus(busData, actorId);
        throw err;
      }
    }
    return this._createDemoBus(busData, actorId);
  }

  _createDemoBus(busData, actorId) {
    const newBus = {
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      college_id: busData.college_id || config.defaultCollegeId,
      bus_number: busData.bus_number,
      registration_number: busData.registration_number || null,
      capacity: busData.capacity || null,
      status: busData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    demoStore.buses.push(newBus);

    if (busData.route_id) {
      demoStore.route_buses.push({
        id: `rb-${Date.now()}`,
        route_id: busData.route_id,
        bus_id: newBus.id
      });
    }

    logAudit(actorId, 'CREATE_BUS', 'BUS', newBus.id, { bus_number: newBus.bus_number });
    return newBus;
  }

  async updateBus(id, updateData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('buses')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._updateDemoBus(id, updateData, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._updateDemoBus(id, updateData, actorId);
        throw err;
      }
    }
    return this._updateDemoBus(id, updateData, actorId);
  }

  _updateDemoBus(id, updateData, actorId) {
    const index = demoStore.buses.findIndex(b => b.id === id);
    if (index === -1) return null;
    demoStore.buses[index] = {
      ...demoStore.buses[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    logAudit(actorId, 'UPDATE_BUS', 'BUS', id, updateData);
    return demoStore.buses[index];
  }

  // ==========================================
  // STOPS
  // ==========================================
  async getStops(collegeId = config.defaultCollegeId, activeOnly = false) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('stops')
          .select('id, college_id, name, address, locality, latitude, longitude, status, created_at, updated_at')
          .eq('college_id', collegeId);

        if (activeOnly) {
          query = query.eq('status', 'active');
        }

        const { data, error } = await query.order('name', { ascending: true });
        if (error) {
          if (this.isSchemaMissing(error)) return this._getDemoStops(collegeId, activeOnly);
          throw error;
        }
        if (this.isEmptyWithoutServiceRole(data)) {
          logger.warn('Stops query returned empty without service_role key. Fallback to demo store.');
          return this._getDemoStops(collegeId, activeOnly);
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._getDemoStops(collegeId, activeOnly);
        throw err;
      }
    }
    return this._getDemoStops(collegeId, activeOnly);
  }

  _getDemoStops(collegeId, activeOnly) {
    let stops = demoStore.stops.filter(s => s.college_id === collegeId);
    if (activeOnly) {
      stops = stops.filter(s => s.status === 'active');
    }
    return stops.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getStopById(id) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('stops')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return demoStore.stops.find(s => s.id === id) || null;
          return null;
        }
        return data;
      } catch {
        return demoStore.stops.find(s => s.id === id) || null;
      }
    }
    return demoStore.stops.find(s => s.id === id) || null;
  }

  async createStop(stopData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('stops')
          .insert([{
            college_id: stopData.college_id || config.defaultCollegeId,
            name: stopData.name,
            address: stopData.address || null,
            locality: stopData.locality || null,
            latitude: stopData.latitude !== undefined ? stopData.latitude : null,
            longitude: stopData.longitude !== undefined ? stopData.longitude : null,
            status: stopData.status || 'active'
          }])
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._createDemoStop(stopData, actorId);
          throw error;
        }
        logAudit(actorId, 'CREATE_STOP', 'STOP', data.id, { name: data.name });
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._createDemoStop(stopData, actorId);
        throw err;
      }
    }
    return this._createDemoStop(stopData, actorId);
  }

  _createDemoStop(stopData, actorId) {
    const newStop = {
      id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      college_id: stopData.college_id || config.defaultCollegeId,
      name: stopData.name,
      address: stopData.address || null,
      locality: stopData.locality || null,
      latitude: stopData.latitude !== undefined ? stopData.latitude : null,
      longitude: stopData.longitude !== undefined ? stopData.longitude : null,
      status: stopData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    demoStore.stops.push(newStop);
    logAudit(actorId, 'CREATE_STOP', 'STOP', newStop.id, { name: newStop.name });
    return newStop;
  }

  async updateStop(id, updateData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('stops')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._updateDemoStop(id, updateData, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._updateDemoStop(id, updateData, actorId);
        throw err;
      }
    }
    return this._updateDemoStop(id, updateData, actorId);
  }

  _updateDemoStop(id, updateData, actorId) {
    const index = demoStore.stops.findIndex(s => s.id === id);
    if (index === -1) return null;
    demoStore.stops[index] = {
      ...demoStore.stops[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    logAudit(actorId, 'UPDATE_STOP', 'STOP', id, updateData);
    return demoStore.stops[index];
  }

  // ==========================================
  // ROUTES & ROUTE STOPS
  // ==========================================
  async getRoutes(collegeId = config.defaultCollegeId, activeOnly = false) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('routes')
          .select(`
            id, college_id, route_code, name, description, status, created_at, updated_at,
            route_buses (
              buses (id, bus_number, status)
            ),
            route_stops (
              id, stop_sequence,
              stops (id, name, locality, latitude, longitude, status)
            )
          `)
          .eq('college_id', collegeId);

        if (activeOnly) {
          query = query.eq('status', 'active');
        }

        const { data, error } = await query.order('route_code', { ascending: true });
        if (error) {
          if (this.isSchemaMissing(error)) return this._getDemoRoutes(collegeId, activeOnly);
          throw error;
        }

        if (this.isEmptyWithoutServiceRole(data)) {
          logger.warn('Routes query returned empty without service_role key. Fallback to demo store.');
          return this._getDemoRoutes(collegeId, activeOnly);
        }

        return data.map(r => ({
          ...r,
          buses: (r.route_buses || []).map(rb => rb.buses).filter(Boolean),
          stops: (r.route_stops || [])
            .sort((a, b) => a.stop_sequence - b.stop_sequence)
            .map(rs => ({
              route_stop_id: rs.id,
              sequence: rs.stop_sequence,
              ...rs.stops
            }))
        }));
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._getDemoRoutes(collegeId, activeOnly);
        throw err;
      }
    }
    return this._getDemoRoutes(collegeId, activeOnly);
  }

  _getDemoRoutes(collegeId, activeOnly) {
    let routes = demoStore.routes.filter(r => r.college_id === collegeId);
    if (activeOnly) {
      routes = routes.filter(r => r.status === 'active');
    }

    return routes.map(r => {
      const routeBusIds = demoStore.route_buses.filter(rb => rb.route_id === r.id).map(rb => rb.bus_id);
      const buses = demoStore.buses.filter(b => routeBusIds.includes(b.id));

      const rStops = demoStore.route_stops
        .filter(rs => rs.route_id === r.id)
        .sort((a, b) => a.stop_sequence - b.stop_sequence)
        .map(rs => {
          const s = demoStore.stops.find(st => st.id === rs.stop_id);
          return {
            route_stop_id: rs.id,
            sequence: rs.stop_sequence,
            ...(s || {})
          };
        });

      return {
        ...r,
        buses,
        stops: rStops
      };
    });
  }

  async getRouteById(id) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('routes')
          .select(`
            id, college_id, route_code, name, description, status, created_at, updated_at,
            route_buses (
              buses (id, bus_number, registration_number, capacity, status)
            ),
            route_stops (
              id, stop_sequence,
              stops (id, name, address, locality, latitude, longitude, status)
            ),
            schedules (
              id, service_period, operating_days, status,
              schedule_stop_times (
                id, route_stop_id, scheduled_time
              )
            )
          `)
          .eq('id', id)
          .single();

        if (error) {
          if (this.isSchemaMissing(error)) return this._getDemoRouteById(id);
          return null;
        }

        const sortedStops = (data.route_stops || [])
          .sort((a, b) => a.stop_sequence - b.stop_sequence)
          .map(rs => ({
            route_stop_id: rs.id,
            sequence: rs.stop_sequence,
            ...rs.stops
          }));

        return {
          ...data,
          buses: (data.route_buses || []).map(rb => rb.buses).filter(Boolean),
          stops: sortedStops,
          schedules: data.schedules || []
        };
      } catch {
        return this._getDemoRouteById(id);
      }
    }
    return this._getDemoRouteById(id);
  }

  _getDemoRouteById(id) {
    const r = demoStore.routes.find(rt => rt.id === id);
    if (!r) return null;

    const routeBusIds = demoStore.route_buses.filter(rb => rb.route_id === r.id).map(rb => rb.bus_id);
    const buses = demoStore.buses.filter(b => routeBusIds.includes(b.id));

    const stops = demoStore.route_stops
      .filter(rs => rs.route_id === r.id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map(rs => {
        const s = demoStore.stops.find(st => st.id === rs.stop_id);
        return {
          route_stop_id: rs.id,
          sequence: rs.stop_sequence,
          ...(s || {})
        };
      });

    const schedules = demoStore.schedules
      .filter(sch => sch.route_id === r.id)
      .map(sch => {
        const stop_times = demoStore.schedule_stop_times.filter(sst => sst.schedule_id === sch.id);
        return {
          ...sch,
          schedule_stop_times: stop_times
        };
      });

    return {
      ...r,
      buses,
      stops,
      schedules
    };
  }

  async createRoute(routeData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('routes')
          .insert([{
            college_id: routeData.college_id || config.defaultCollegeId,
            route_code: routeData.route_code,
            name: routeData.name,
            description: routeData.description || null,
            status: routeData.status || 'active'
          }])
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._createDemoRoute(routeData, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._createDemoRoute(routeData, actorId);
        throw err;
      }
    }
    return this._createDemoRoute(routeData, actorId);
  }

  _createDemoRoute(routeData, actorId) {
    const newRoute = {
      id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      college_id: routeData.college_id || config.defaultCollegeId,
      route_code: routeData.route_code,
      name: routeData.name,
      description: routeData.description || null,
      status: routeData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    demoStore.routes.push(newRoute);
    logAudit(actorId, 'CREATE_ROUTE', 'ROUTE', newRoute.id, { route_code: newRoute.route_code });
    return newRoute;
  }

  async updateRoute(id, updateData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('routes')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._updateDemoRoute(id, updateData, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._updateDemoRoute(id, updateData, actorId);
        throw err;
      }
    }
    return this._updateDemoRoute(id, updateData, actorId);
  }

  _updateDemoRoute(id, updateData, actorId) {
    const index = demoStore.routes.findIndex(r => r.id === id);
    if (index === -1) return null;
    demoStore.routes[index] = {
      ...demoStore.routes[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    logAudit(actorId, 'UPDATE_ROUTE', 'ROUTE', id, updateData);
    return demoStore.routes[index];
  }

  async setRouteStops(routeId, stopIdsInOrder, actorId) {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('route_stops').delete().eq('route_id', routeId);
        const rows = stopIdsInOrder.map((stopId, idx) => ({
          route_id: routeId,
          stop_id: stopId,
          stop_sequence: idx + 1
        }));
        const { data, error } = await supabaseAdmin.from('route_stops').insert(rows).select();
        if (error) {
          if (this.isSchemaMissing(error)) return this._setDemoRouteStops(routeId, stopIdsInOrder, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._setDemoRouteStops(routeId, stopIdsInOrder, actorId);
        throw err;
      }
    }
    return this._setDemoRouteStops(routeId, stopIdsInOrder, actorId);
  }

  _setDemoRouteStops(routeId, stopIdsInOrder, actorId) {
    demoStore.route_stops = demoStore.route_stops.filter(rs => rs.route_id !== routeId);
    const newRouteStops = stopIdsInOrder.map((stopId, idx) => ({
      id: `rs-${Date.now()}-${idx}`,
      route_id: routeId,
      stop_id: stopId,
      stop_sequence: idx + 1
    }));
    demoStore.route_stops.push(...newRouteStops);
    logAudit(actorId, 'REORDER_ROUTE_STOPS', 'ROUTE', routeId, { stop_count: newRouteStops.length });
    return newRouteStops;
  }

  // ==========================================
  // SCHEDULES & STOP TIMES
  // ==========================================
  async getSchedules(collegeId = config.defaultCollegeId, servicePeriod = null) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('schedules')
          .select(`
            id, route_id, bus_id, service_period, operating_days, valid_from, valid_until, status, created_at, updated_at,
            routes!inner (id, college_id, route_code, name, status),
            buses (id, bus_number),
            schedule_stop_times (
              id, route_stop_id, scheduled_time,
              route_stops (
                stop_sequence,
                stops (id, name, locality)
              )
            )
          `)
          .eq('routes.college_id', collegeId);

        if (servicePeriod) {
          query = query.eq('service_period', servicePeriod);
        }

        const { data, error } = await query;
        if (error) {
          if (this.isSchemaMissing(error)) return this._getDemoSchedules(collegeId, servicePeriod);
          throw error;
        }

        return data.map(sch => ({
          ...sch,
          stop_times: (sch.schedule_stop_times || [])
            .sort((a, b) => (a.route_stops?.stop_sequence || 0) - (b.route_stops?.stop_sequence || 0))
            .map(st => ({
              id: st.id,
              route_stop_id: st.route_stop_id,
              sequence: st.route_stops?.stop_sequence,
              stop_name: st.route_stops?.stops?.name,
              scheduled_time: st.scheduled_time
            }))
        }));
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._getDemoSchedules(collegeId, servicePeriod);
        throw err;
      }
    }
    return this._getDemoSchedules(collegeId, servicePeriod);
  }

  _getDemoSchedules(collegeId, servicePeriod) {
    let schedules = demoStore.schedules.filter(sch => {
      const route = demoStore.routes.find(r => r.id === sch.route_id);
      if (!route || route.college_id !== collegeId) return false;
      if (servicePeriod && sch.service_period !== servicePeriod) return false;
      return true;
    });

    return schedules.map(sch => {
      const route = demoStore.routes.find(r => r.id === sch.route_id);
      const bus = demoStore.buses.find(b => b.id === sch.bus_id);
      const stop_times = demoStore.schedule_stop_times
        .filter(sst => sst.schedule_id === sch.id)
        .map(sst => {
          const rs = demoStore.route_stops.find(s => s.id === sst.route_stop_id);
          const stop = rs ? demoStore.stops.find(st => st.id === rs.stop_id) : null;
          return {
            id: sst.id,
            route_stop_id: sst.route_stop_id,
            sequence: rs ? rs.stop_sequence : 0,
            stop_name: stop ? stop.name : '',
            scheduled_time: sst.scheduled_time
          };
        })
        .sort((a, b) => a.sequence - b.sequence);

      return {
        ...sch,
        routes: route,
        buses: bus,
        stop_times
      };
    });
  }

  async saveScheduleStopTimes(scheduleId, stopTimesArray, actorId) {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('schedule_stop_times').delete().eq('schedule_id', scheduleId);
        const rows = stopTimesArray.map(st => ({
          schedule_id: scheduleId,
          route_stop_id: st.route_stop_id,
          scheduled_time: st.scheduled_time
        }));
        const { data, error } = await supabaseAdmin.from('schedule_stop_times').insert(rows).select();
        if (error) {
          if (this.isSchemaMissing(error)) return this._saveDemoScheduleStopTimes(scheduleId, stopTimesArray, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._saveDemoScheduleStopTimes(scheduleId, stopTimesArray, actorId);
        throw err;
      }
    }
    return this._saveDemoScheduleStopTimes(scheduleId, stopTimesArray, actorId);
  }

  _saveDemoScheduleStopTimes(scheduleId, stopTimesArray, actorId) {
    demoStore.schedule_stop_times = demoStore.schedule_stop_times.filter(st => st.schedule_id !== scheduleId);
    const newTimes = stopTimesArray.map((st, idx) => ({
      id: `sst-${Date.now()}-${idx}`,
      schedule_id: scheduleId,
      route_stop_id: st.route_stop_id,
      scheduled_time: st.scheduled_time
    }));
    demoStore.schedule_stop_times.push(...newTimes);
    logAudit(actorId, 'UPDATE_SCHEDULE_STOP_TIMES', 'SCHEDULE', scheduleId, { count: newTimes.length });
    return newTimes;
  }

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  async getAnnouncements(collegeId = config.defaultCollegeId, activeOnly = true) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('announcements')
          .select(`
            id, college_id, title, message, category, route_id, bus_id, status, publish_at, expires_at, created_at, updated_at,
            routes (id, route_code, name),
            buses (id, bus_number)
          `)
          .eq('college_id', collegeId);

        if (activeOnly) {
          const now = new Date().toISOString();
          query = query
            .eq('status', 'published')
            .lte('publish_at', now)
            .or(`expires_at.is.null,expires_at.gt.${now}`);
        }

        const { data, error } = await query.order('publish_at', { ascending: false });
        if (error) {
          if (this.isSchemaMissing(error)) return this._getDemoAnnouncements(collegeId, activeOnly);
          throw error;
        }
        if (this.isEmptyWithoutServiceRole(data)) {
          logger.warn('Announcements query returned empty without service_role key. Fallback to demo store.');
          return this._getDemoAnnouncements(collegeId, activeOnly);
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._getDemoAnnouncements(collegeId, activeOnly);
        throw err;
      }
    }
    return this._getDemoAnnouncements(collegeId, activeOnly);
  }

  _getDemoAnnouncements(collegeId, activeOnly) {
    const now = new Date();
    let list = demoStore.announcements.filter(a => a.college_id === collegeId);
    if (activeOnly) {
      list = list.filter(a => {
        if (a.status !== 'published') return false;
        if (a.publish_at && new Date(a.publish_at) > now) return false;
        if (a.expires_at && new Date(a.expires_at) <= now) return false;
        return true;
      });
    }

    return list.map(a => {
      const route = a.route_id ? demoStore.routes.find(r => r.id === a.route_id) : null;
      const bus = a.bus_id ? demoStore.buses.find(b => b.id === a.bus_id) : null;
      return {
        ...a,
        routes: route,
        buses: bus
      };
    }).sort((a, b) => new Date(b.publish_at) - new Date(a.publish_at));
  }

  async createAnnouncement(data, actorId) {
    if (supabaseAdmin) {
      try {
        const { data: created, error } = await supabaseAdmin
          .from('announcements')
          .insert([{
            college_id: data.college_id || config.defaultCollegeId,
            title: data.title,
            message: data.message,
            category: data.category || 'general',
            route_id: data.route_id || null,
            bus_id: data.bus_id || null,
            status: data.status || 'published',
            publish_at: data.publish_at || new Date().toISOString(),
            expires_at: data.expires_at || null,
            created_by: actorId || null
          }])
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._createDemoAnnouncement(data, actorId);
          throw error;
        }
        return created;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._createDemoAnnouncement(data, actorId);
        throw err;
      }
    }
    return this._createDemoAnnouncement(data, actorId);
  }

  _createDemoAnnouncement(data, actorId) {
    const newAnnouncement = {
      id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      college_id: data.college_id || config.defaultCollegeId,
      title: data.title,
      message: data.message,
      category: data.category || 'general',
      route_id: data.route_id || null,
      bus_id: data.bus_id || null,
      status: data.status || 'published',
      publish_at: data.publish_at || new Date().toISOString(),
      expires_at: data.expires_at || null,
      created_by: actorId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    demoStore.announcements.unshift(newAnnouncement);
    logAudit(actorId, 'CREATE_ANNOUNCEMENT', 'ANNOUNCEMENT', newAnnouncement.id, { title: newAnnouncement.title });
    return newAnnouncement;
  }

  async updateAnnouncement(id, updateData, actorId) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('announcements')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          if (this.isSchemaMissing(error)) return this._updateDemoAnnouncement(id, updateData, actorId);
          throw error;
        }
        return data;
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._updateDemoAnnouncement(id, updateData, actorId);
        throw err;
      }
    }
    return this._updateDemoAnnouncement(id, updateData, actorId);
  }

  _updateDemoAnnouncement(id, updateData, actorId) {
    const index = demoStore.announcements.findIndex(a => a.id === id);
    if (index === -1) return null;
    demoStore.announcements[index] = {
      ...demoStore.announcements[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    logAudit(actorId, 'UPDATE_ANNOUNCEMENT', 'ANNOUNCEMENT', id, updateData);
    return demoStore.announcements[index];
  }

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================
  async getDashboardStats(collegeId = config.defaultCollegeId) {
    if (supabaseAdmin) {
      try {
        const [
          { count: busCount, error: bErr },
          { count: routeCount, error: rErr },
          { count: stopCount, error: sErr },
          { count: announcementCount, error: aErr },
          { data: auditLogs, error: logErr }
        ] = await Promise.all([
          supabaseAdmin.from('buses').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('status', 'active'),
          supabaseAdmin.from('routes').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('status', 'active'),
          supabaseAdmin.from('stops').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('status', 'active'),
          supabaseAdmin.from('announcements').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('status', 'published'),
          supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
        ]);

        if (bErr || rErr || sErr || aErr || logErr) {
          return this._getDemoDashboardStats(collegeId);
        }

        // If all counts are 0 and no service_role key is set, the DB is either
        // unpopulated or RLS blocks reads — serve demo stats instead.
        const totalLive = (busCount || 0) + (routeCount || 0) + (stopCount || 0);
        if (totalLive === 0 && !config.supabase?.serviceRoleKey) {
          logger.warn('Dashboard counts all zero without service_role key. Fallback to demo store.');
          return this._getDemoDashboardStats(collegeId);
        }

        return {
          activeBuses: busCount || 0,
          activeRoutes: routeCount || 0,
          activeStops: stopCount || 0,
          activeAnnouncements: announcementCount || 0,
          recentAudits: auditLogs || []
        };
      } catch (err) {
        if (this.isSchemaMissing(err)) return this._getDemoDashboardStats(collegeId);
        throw err;
      }
    }
    return this._getDemoDashboardStats(collegeId);
  }

  _getDemoDashboardStats(collegeId) {
    return {
      activeBuses: demoStore.buses.filter(b => b.college_id === collegeId && b.status === 'active').length,
      activeRoutes: demoStore.routes.filter(r => r.college_id === collegeId && r.status === 'active').length,
      activeStops: demoStore.stops.filter(s => s.college_id === collegeId && s.status === 'active').length,
      activeAnnouncements: demoStore.announcements.filter(a => a.college_id === collegeId && a.status === 'published').length,
      recentAudits: demoStore.audit_logs.slice(0, 10)
    };
  }
}

module.exports = new DBService();
