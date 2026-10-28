const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

// Helper to make mock requests to express app without running network port
async function testRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const http = require('http');
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const reqOptions = {
        hostname: '127.0.0.1',
        port,
        path: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(reqOptions, (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          server.close();
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = rawData;
          }
          resolve({ status: res.statusCode, body: json });
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

test('API Health Check Endpoint', async () => {
  const res = await testRequest('GET', '/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.equal(res.body.service, 'RouteReady Campus API');
});

test('Public Routes Listing', async () => {
  const res = await testRequest('GET', '/api/v1/routes');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 4);
});

test('Public Stops Listing & Case-Insensitive Search', async () => {
  const res = await testRequest('GET', '/api/v1/stops/search?q=majestic');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data[0].name.toLowerCase().includes('majestic'));
});

test('Public Active Announcements', async () => {
  const res = await testRequest('GET', '/api/v1/announcements');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);
});

test('Origin to Destination Route Search - Valid Sequence Order', async () => {
  // Majestic is sequence 1, Hebbal is sequence 4 on R-101
  const res = await testRequest('GET', '/api/v1/routes/search/origin-destination?origin=Majestic&destination=Hebbal');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.length > 0);
  assert.equal(res.body.data[0].route.route_code, 'R-101');
});

test('Origin to Destination Route Search - Invalid Reverse Sequence Order (Must return 0 direct routes)', async () => {
  // Hebbal is seq 4, Majestic is seq 1 -> Reverse direction should NOT claim direct route
  const res = await testRequest('GET', '/api/v1/routes/search/origin-destination?origin=Hebbal&destination=Majestic');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 0);
});

test('Protected Admin Route - Access Denied without Auth Token', async () => {
  const res = await testRequest('GET', '/api/v1/admin/dashboard');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('Protected Admin Route - Access Denied for Student Token', async () => {
  const res = await testRequest('GET', '/api/v1/admin/dashboard', {
    Authorization: 'Bearer demo-token-student'
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('Protected Admin Route - Allowed for Admin Token', async () => {
  const res = await testRequest('GET', '/api/v1/admin/dashboard', {
    Authorization: 'Bearer demo-token-admin'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.activeBuses >= 5);
  assert.ok(res.body.data.activeRoutes >= 4);
});

test('Input Validation - Rejects Invalid Bus Creation', async () => {
  const res = await testRequest(
    'POST',
    '/api/v1/admin/buses',
    { Authorization: 'Bearer demo-token-admin' },
    { bus_number: '', capacity: -5 } // Invalid!
  );
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(Array.isArray(res.body.errors));
});

