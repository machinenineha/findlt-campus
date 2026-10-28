// Ensure Node.js 20 environment has WebSocket support for Supabase client
if (typeof WebSocket === 'undefined') {
  try {
    global.WebSocket = require('ws');
  } catch {
    // ws package optional if realtime is not invoked
  }
}

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('./logger');

let supabaseAdmin = null;
const activeKey = config.supabase.serviceRoleKey || config.supabase.anonKey;

if (config.supabase.url && activeKey) {
  try {
    supabaseAdmin = createClient(config.supabase.url, activeKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    if (config.supabase.serviceRoleKey) {
      logger.info('Supabase Admin client initialized with privileged service_role key');
    } else {
      logger.info('Supabase client initialized with publishable/anon key');
    }
  } catch (err) {
    logger.error('Failed to initialize Supabase client:', err);
  }
} else {
  logger.info('Running in Local Demonstration Mode. Supabase keys not supplied in .env.');
}

// In-Memory Realistic Demo Store (Active fallback or demo evaluation)
const demoStore = {
  colleges: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'Apex Institute of Technology (Demo Campus)',
      address: 'Campus Road, Knowledge Park, Bengaluru, Karnataka 560064',
      timezone: 'Asia/Kolkata',
      contact_email: 'transport.helpdesk@demo-apextech.edu',
      created_at: new Date().toISOString()
    }
  ],
  profiles: [
    {
      id: 'usr-student-001',
      email: 'student@demo.edu',
      full_name: 'Priya Sharma (Student Demo)',
      role: 'student',
      college_id: 'c0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-admin-001',
      email: 'admin@demo.edu',
      full_name: 'Dr. Ramesh Kumar (Transport In-Charge)',
      role: 'admin',
      college_id: 'c0000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString()
    }
  ],
  buses: [
    { id: 'b0000000-0000-0000-0000-000000000001', college_id: 'c0000000-0000-0000-0000-000000000001', bus_number: 'Bus 01', registration_number: 'KA-01-F-1024', capacity: 52, status: 'active', created_at: new Date().toISOString() },
    { id: 'b0000000-0000-0000-0000-000000000002', college_id: 'c0000000-0000-0000-0000-000000000001', bus_number: 'Bus 02', registration_number: 'KA-01-F-1025', capacity: 52, status: 'active', created_at: new Date().toISOString() },
    { id: 'b0000000-0000-0000-0000-000000000003', college_id: 'c0000000-0000-0000-0000-000000000001', bus_number: 'Bus 03', registration_number: 'KA-01-F-2048', capacity: 45, status: 'active', created_at: new Date().toISOString() },
    { id: 'b0000000-0000-0000-0000-000000000004', college_id: 'c0000000-0000-0000-0000-000000000001', bus_number: 'Bus 04', registration_number: 'KA-01-F-2049', capacity: 45, status: 'active', created_at: new Date().toISOString() },
    { id: 'b0000000-0000-0000-0000-000000000005', college_id: 'c0000000-0000-0000-0000-000000000001', bus_number: 'Bus 05', registration_number: 'KA-01-F-3001', capacity: 55, status: 'active', created_at: new Date().toISOString() },
    { id: 'b0000000-0000-0000-0000-000000000006', college_id: 'c0000000-0000-0000-0000-000000000001', bus_number: 'Bus 06 (Reserve)', registration_number: 'KA-01-F-3002', capacity: 55, status: 'inactive', created_at: new Date().toISOString() }
  ],
  stops: [
    { id: 's0000000-0000-0000-0000-000000000001', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Kempegowda Bus Station (Majestic)', address: 'Opposite City Railway Station', locality: 'Majestic', latitude: 12.9772, longitude: 77.5713, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000002', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Malleshwaram 8th Cross', address: 'Sampige Road', locality: 'Malleshwaram', latitude: 12.9996, longitude: 77.5709, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000003', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Yeshwanthpur Junction', address: 'Near Metro Station Gate 2', locality: 'Yeshwanthpur', latitude: 13.0238, longitude: 77.5503, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000004', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Hebbal Flyover Circle', address: 'Bellary Road Service Lane', locality: 'Hebbal', latitude: 13.0358, longitude: 77.5970, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000005', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Banashankari Bus Terminal', address: 'Near TTMC Platform 4', locality: 'Banashankari', latitude: 12.9155, longitude: 77.5736, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000006', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Jayanagar 4th Block', address: 'Opposite Complex Bus Stop', locality: 'Jayanagar', latitude: 12.9299, longitude: 77.5826, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000007', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'BTM Layout 2nd Stage', address: 'Near Udupi Garden Signal', locality: 'BTM Layout', latitude: 12.9166, longitude: 77.6101, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000008', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Silk Board Junction', address: 'Hosur Road Bus Shelter', locality: 'Silk Board', latitude: 12.9172, longitude: 77.6228, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000009', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'HSR Layout 5th Main', address: 'Sector 1 Ring Road', locality: 'HSR Layout', latitude: 12.9116, longitude: 77.6389, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000010', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Bellandur Central Gate', address: 'Outer Ring Road Bus Stand', locality: 'Bellandur', latitude: 12.9260, longitude: 77.6762, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000011', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Marathahalli Bridge', address: 'Old Airport Road Junction', locality: 'Marathahalli', latitude: 12.9569, longitude: 77.7011, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000012', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Indiranagar 100ft Road', address: 'Near 12th Main Junction', locality: 'Indiranagar', latitude: 12.9719, longitude: 77.6412, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000013', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'MG Road Metro Station', address: 'Trinity Circle Side', locality: 'MG Road', latitude: 12.9756, longitude: 77.6066, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000014', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Kalyan Nagar Bus Shelter', address: 'Ring Road 80ft Road', locality: 'Kalyan Nagar', latitude: 13.0232, longitude: 77.6433, status: 'active', created_at: new Date().toISOString() },
    { id: 's0000000-0000-0000-0000-000000000015', college_id: 'c0000000-0000-0000-0000-000000000001', name: 'Apex Tech Campus Main Gate', address: 'Campus Entrance Terminal', locality: 'Knowledge Park', latitude: 13.0820, longitude: 77.6400, status: 'active', created_at: new Date().toISOString() }
  ],
  routes: [
    { id: 'r0000000-0000-0000-0000-000000000001', college_id: 'c0000000-0000-0000-0000-000000000001', route_code: 'R-101', name: 'North-West Express', description: 'Majestic via Malleshwaram, Yeshwanthpur, Hebbal to Campus', status: 'active', created_at: new Date().toISOString() },
    { id: 'r0000000-0000-0000-0000-000000000002', college_id: 'c0000000-0000-0000-0000-000000000001', route_code: 'R-202', name: 'South City Line', description: 'Banashankari via Jayanagar, BTM, Silk Board, HSR to Campus', status: 'active', created_at: new Date().toISOString() },
    { id: 'r0000000-0000-0000-0000-000000000003', college_id: 'c0000000-0000-0000-0000-000000000001', route_code: 'R-303', name: 'Tech Corridor Link', description: 'Silk Board via Bellandur, Marathahalli, Kalyan Nagar to Campus', status: 'active', created_at: new Date().toISOString() },
    { id: 'r0000000-0000-0000-0000-000000000004', college_id: 'c0000000-0000-0000-0000-000000000001', route_code: 'R-404', name: 'Central Boulevard', description: 'MG Road via Indiranagar, Kalyan Nagar, Hebbal to Campus', status: 'active', created_at: new Date().toISOString() }
  ],
  route_stops: [
    { id: 'rs-101-1', route_id: 'r0000000-0000-0000-0000-000000000001', stop_id: 's0000000-0000-0000-0000-000000000001', stop_sequence: 1 },
    { id: 'rs-101-2', route_id: 'r0000000-0000-0000-0000-000000000001', stop_id: 's0000000-0000-0000-0000-000000000002', stop_sequence: 2 },
    { id: 'rs-101-3', route_id: 'r0000000-0000-0000-0000-000000000001', stop_id: 's0000000-0000-0000-0000-000000000003', stop_sequence: 3 },
    { id: 'rs-101-4', route_id: 'r0000000-0000-0000-0000-000000000001', stop_id: 's0000000-0000-0000-0000-000000000004', stop_sequence: 4 },
    { id: 'rs-101-5', route_id: 'r0000000-0000-0000-0000-000000000001', stop_id: 's0000000-0000-0000-0000-000000000015', stop_sequence: 5 },

    { id: 'rs-202-1', route_id: 'r0000000-0000-0000-0000-000000000002', stop_id: 's0000000-0000-0000-0000-000000000005', stop_sequence: 1 },
    { id: 'rs-202-2', route_id: 'r0000000-0000-0000-0000-000000000002', stop_id: 's0000000-0000-0000-0000-000000000006', stop_sequence: 2 },
    { id: 'rs-202-3', route_id: 'r0000000-0000-0000-0000-000000000002', stop_id: 's0000000-0000-0000-0000-000000000007', stop_sequence: 3 },
    { id: 'rs-202-4', route_id: 'r0000000-0000-0000-0000-000000000002', stop_id: 's0000000-0000-0000-0000-000000000008', stop_sequence: 4 },
    { id: 'rs-202-5', route_id: 'r0000000-0000-0000-0000-000000000002', stop_id: 's0000000-0000-0000-0000-000000000009', stop_sequence: 5 },
    { id: 'rs-202-6', route_id: 'r0000000-0000-0000-0000-000000000002', stop_id: 's0000000-0000-0000-0000-000000000015', stop_sequence: 6 },

    { id: 'rs-303-1', route_id: 'r0000000-0000-0000-0000-000000000003', stop_id: 's0000000-0000-0000-0000-000000000008', stop_sequence: 1 },
    { id: 'rs-303-2', route_id: 'r0000000-0000-0000-0000-000000000003', stop_id: 's0000000-0000-0000-0000-000000000010', stop_sequence: 2 },
    { id: 'rs-303-3', route_id: 'r0000000-0000-0000-0000-000000000003', stop_id: 's0000000-0000-0000-0000-000000000011', stop_sequence: 3 },
    { id: 'rs-303-4', route_id: 'r0000000-0000-0000-0000-000000000003', stop_id: 's0000000-0000-0000-0000-000000000014', stop_sequence: 4 },
    { id: 'rs-303-5', route_id: 'r0000000-0000-0000-0000-000000000003', stop_id: 's0000000-0000-0000-0000-000000000015', stop_sequence: 5 },

    { id: 'rs-404-1', route_id: 'r0000000-0000-0000-0000-000000000004', stop_id: 's0000000-0000-0000-0000-000000000013', stop_sequence: 1 },
    { id: 'rs-404-2', route_id: 'r0000000-0000-0000-0000-000000000004', stop_id: 's0000000-0000-0000-0000-000000000012', stop_sequence: 2 },
    { id: 'rs-404-3', route_id: 'r0000000-0000-0000-0000-000000000004', stop_id: 's0000000-0000-0000-0000-000000000014', stop_sequence: 3 },
    { id: 'rs-404-4', route_id: 'r0000000-0000-0000-0000-000000000004', stop_id: 's0000000-0000-0000-0000-000000000004', stop_sequence: 4 },
    { id: 'rs-404-5', route_id: 'r0000000-0000-0000-0000-000000000004', stop_id: 's0000000-0000-0000-0000-000000000015', stop_sequence: 5 }
  ],
  route_buses: [
    { id: 'rb-1', route_id: 'r0000000-0000-0000-0000-000000000001', bus_id: 'b0000000-0000-0000-0000-000000000001' },
    { id: 'rb-2', route_id: 'r0000000-0000-0000-0000-000000000002', bus_id: 'b0000000-0000-0000-0000-000000000002' },
    { id: 'rb-3', route_id: 'r0000000-0000-0000-0000-000000000003', bus_id: 'b0000000-0000-0000-0000-000000000003' },
    { id: 'rb-4', route_id: 'r0000000-0000-0000-0000-000000000004', bus_id: 'b0000000-0000-0000-0000-000000000004' },
    { id: 'rb-5', route_id: 'r0000000-0000-0000-0000-000000000001', bus_id: 'b0000000-0000-0000-0000-000000000005' }
  ],
  schedules: [
    { id: 'sch-101-m', route_id: 'r0000000-0000-0000-0000-000000000001', bus_id: 'b0000000-0000-0000-0000-000000000001', service_period: 'morning', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-101-e', route_id: 'r0000000-0000-0000-0000-000000000001', bus_id: 'b0000000-0000-0000-0000-000000000001', service_period: 'evening', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-202-m', route_id: 'r0000000-0000-0000-0000-000000000002', bus_id: 'b0000000-0000-0000-0000-000000000002', service_period: 'morning', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-202-e', route_id: 'r0000000-0000-0000-0000-000000000002', bus_id: 'b0000000-0000-0000-0000-000000000002', service_period: 'evening', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-303-m', route_id: 'r0000000-0000-0000-0000-000000000003', bus_id: 'b0000000-0000-0000-0000-000000000003', service_period: 'morning', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-303-e', route_id: 'r0000000-0000-0000-0000-000000000003', bus_id: 'b0000000-0000-0000-0000-000000000003', service_period: 'evening', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-404-m', route_id: 'r0000000-0000-0000-0000-000000000004', bus_id: 'b0000000-0000-0000-0000-000000000004', service_period: 'morning', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() },
    { id: 'sch-404-e', route_id: 'r0000000-0000-0000-0000-000000000004', bus_id: 'b0000000-0000-0000-0000-000000000004', service_period: 'evening', operating_days: [1, 2, 3, 4, 5], status: 'active', created_at: new Date().toISOString() }
  ],
  schedule_stop_times: [
    { id: 'sst-1', schedule_id: 'sch-101-m', route_stop_id: 'rs-101-1', scheduled_time: '07:15:00' },
    { id: 'sst-2', schedule_id: 'sch-101-m', route_stop_id: 'rs-101-2', scheduled_time: '07:30:00' },
    { id: 'sst-3', schedule_id: 'sch-101-m', route_stop_id: 'rs-101-3', scheduled_time: '07:45:00' },
    { id: 'sst-4', schedule_id: 'sch-101-m', route_stop_id: 'rs-101-4', scheduled_time: '08:05:00' },
    { id: 'sst-5', schedule_id: 'sch-101-m', route_stop_id: 'rs-101-5', scheduled_time: '08:30:00' },

    { id: 'sst-6', schedule_id: 'sch-101-e', route_stop_id: 'rs-101-5', scheduled_time: '16:45:00' },
    { id: 'sst-7', schedule_id: 'sch-101-e', route_stop_id: 'rs-101-4', scheduled_time: '17:10:00' },
    { id: 'sst-8', schedule_id: 'sch-101-e', route_stop_id: 'rs-101-3', scheduled_time: '17:30:00' },
    { id: 'sst-9', schedule_id: 'sch-101-e', route_stop_id: 'rs-101-2', scheduled_time: '17:45:00' },
    { id: 'sst-10', schedule_id: 'sch-101-e', route_stop_id: 'rs-101-1', scheduled_time: '18:00:00' },

    { id: 'sst-11', schedule_id: 'sch-202-m', route_stop_id: 'rs-202-1', scheduled_time: '07:00:00' },
    { id: 'sst-12', schedule_id: 'sch-202-m', route_stop_id: 'rs-202-2', scheduled_time: '07:15:00' },
    { id: 'sst-13', schedule_id: 'sch-202-m', route_stop_id: 'rs-202-3', scheduled_time: '07:30:00' },
    { id: 'sst-14', schedule_id: 'sch-202-m', route_stop_id: 'rs-202-4', scheduled_time: '07:45:00' },
    { id: 'sst-15', schedule_id: 'sch-202-m', route_stop_id: 'rs-202-5', scheduled_time: '08:00:00' },
    { id: 'sst-16', schedule_id: 'sch-202-m', route_stop_id: 'rs-202-6', scheduled_time: '08:30:00' },

    { id: 'sst-17', schedule_id: 'sch-303-m', route_stop_id: 'rs-303-1', scheduled_time: '07:15:00' },
    { id: 'sst-18', schedule_id: 'sch-303-m', route_stop_id: 'rs-303-2', scheduled_time: '07:35:00' },
    { id: 'sst-19', schedule_id: 'sch-303-m', route_stop_id: 'rs-303-3', scheduled_time: '07:50:00' },
    { id: 'sst-20', schedule_id: 'sch-303-m', route_stop_id: 'rs-303-4', scheduled_time: '08:10:00' },
    { id: 'sst-21', schedule_id: 'sch-303-m', route_stop_id: 'rs-303-5', scheduled_time: '08:35:00' },

    { id: 'sst-22', schedule_id: 'sch-404-m', route_stop_id: 'rs-404-1', scheduled_time: '07:20:00' },
    { id: 'sst-23', schedule_id: 'sch-404-m', route_stop_id: 'rs-404-2', scheduled_time: '07:40:00' },
    { id: 'sst-24', schedule_id: 'sch-404-m', route_stop_id: 'rs-404-3', scheduled_time: '08:05:00' },
    { id: 'sst-25', schedule_id: 'sch-404-m', route_stop_id: 'rs-404-4', scheduled_time: '08:20:00' },
    { id: 'sst-26', schedule_id: 'sch-404-m', route_stop_id: 'rs-404-5', scheduled_time: '08:40:00' }
  ],
  announcements: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      college_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Outer Ring Road Pipeline Work - Expected 15-Minute Delay on Route 303',
      message: 'Due to civic utility repairs near Marathahalli bridge service road, Bus 03 operating on Route 303 may encounter moderate delays during morning arrivals. Students are advised to arrive 5 minutes early.',
      category: 'delay',
      route_id: 'r0000000-0000-0000-0000-000000000003',
      bus_id: 'b0000000-0000-0000-0000-000000000003',
      status: 'published',
      publish_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      college_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Temporary Boarding Bay Shift at Silk Board Junction',
      message: 'For safety during ongoing metro line construction, Route 202 and Route 303 will pick up passengers from the Outer Service Bay rather than Platform 3 until further notice.',
      category: 'stop_closure',
      route_id: 'r0000000-0000-0000-0000-000000000002',
      bus_id: null,
      status: 'published',
      publish_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      college_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Even Semester Campus Transport Passes Active',
      message: 'Digital RFID bus passes for the ongoing semester are now valid on all college transport lines. Please present your pass to the transport supervisor upon boarding.',
      category: 'general',
      route_id: null,
      bus_id: null,
      status: 'published',
      publish_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      college_id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Route 101 Malleshwaram Diversion Cleared',
      message: 'The earlier road resurfacing work near Sampige Road has concluded. Bus 01 will resume regular scheduled stops at Malleshwaram 8th Cross.',
      category: 'route_change',
      route_id: 'r0000000-0000-0000-0000-000000000001',
      bus_id: 'b0000000-0000-0000-0000-000000000001',
      status: 'published',
      publish_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 5 * 86400 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  audit_logs: [
    {
      id: 'log-001',
      actor_id: 'usr-admin-001',
      action: 'SYSTEM_SEED',
      entity_type: 'COLLEGE_SYSTEM',
      entity_id: 'c0000000-0000-0000-0000-000000000001',
      metadata: { note: 'Initial demonstration records provisioned' },
      created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    }
  ]
};

function logAudit(actorId, action, entityType, entityId, metadata = {}) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    created_at: new Date().toISOString()
  };
  demoStore.audit_logs.unshift(entry);
  if (demoStore.audit_logs.length > 100) {
    demoStore.audit_logs.pop();
  }
  return entry;
}

module.exports = {
  supabaseAdmin,
  demoStore,
  logAudit,
  isDemoMode: config.isDemoMode
};
