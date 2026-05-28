const http = require('http');

function login(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const [email, password] of [
    ['admin@deutsche-lernen.com', 'admin123'],
    ['user@deutsche-lernen.com', 'user123'],
  ]) {
    try {
      const r = await login(email, password);
      console.log(email, r.status, r.body.slice(0, 200));
    } catch (e) {
      console.log(email, 'ERROR', e.message);
    }
  }
})();
