const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

async function testRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const http = require('http');
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: url,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }, (res) => {
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
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

test('Security Audit - Student Cannot Modify Protected Fields (Role/College)', async () => {
  // A student attempts to update their role to admin via profile endpoint
  const res = await testRequest('PATCH', '/api/v1/me/profile', {
    Authorization: 'Bearer demo-token-student'
  }, {
    full_name: 'Priya Sharma Updated',
    role: 'admin', // Malicious privilege escalation attempt
    college_id: 'c9999999-9999-9999-9999-999999999999'
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  // Role MUST remain student!
  assert.equal(res.body.data.role, 'student');
  assert.notEqual(res.body.data.college_id, 'c9999999-9999-9999-9999-999999999999');
});

test('Security Audit - SQL Injection Prevention in Search', async () => {
  const maliciousQuery = "Majestic' OR '1'='1";
  const res = await testRequest('GET', `/api/v1/stops/search?q=${encodeURIComponent(maliciousQuery)}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  // Should return empty array or only literal matches, never full table dump
  assert.equal(res.body.data.length, 0);
});

test('Security Audit - Non-existent UUIDs Handled Gracefully without Stack Leak', async () => {
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const res = await testRequest('GET', `/api/v1/routes/${fakeId}`);
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Route not found');
  assert.equal(res.body.stack, undefined);
});

