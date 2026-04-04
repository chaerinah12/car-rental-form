const https = require('https');

function supabaseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const baseUrl = process.env.SUPABASE_URL.replace('https://', '');
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: baseUrl,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const result = await supabaseRequest('GET', '/rest/v1/bookings?select=car_id,start_dt,end_dt');
      const bookings = (result.data || []).map(b => ({
        carId: b.car_id,
        startDT: b.start_dt,
        endDT: b.end_dt,
      }));
      res.status(200).json(bookings);
    } else if (req.method === 'POST') {
      const rawBody = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      const booking = JSON.parse(rawBody);
      await supabaseRequest('POST', '/rest/v1/bookings', {
        car_id: booking.carId,
        start_dt: booking.startDT,
        end_dt: booking.endDT,
        name: booking.name,
        phone: booking.phone,
        destinations: Array.isArray(booking.destinations) ? booking.destinations.join(', ') : '',
        delivery_type: booking.deliveryType || '',
        delivery_address: booking.deliveryAddress || '',
      });
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
