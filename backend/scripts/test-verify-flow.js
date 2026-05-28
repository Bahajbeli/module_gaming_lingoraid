require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/api/auth/login', {
    email: 'admin@deutsche-lernen.com',
    password: 'admin123',
  });
  console.log('login', login.status, login.data.slice(0, 120));
  const token = JSON.parse(login.data).token;
  const verify = await request('GET', '/api/auth/verify', null, token);
  console.log('verify', verify.status, verify.data);
})().catch((e) => console.error(e.message));
