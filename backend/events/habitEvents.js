// Simple Server-Sent Events broadcaster for habit real-time updates
const clients = new Set();

function sseHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) res.flushHeaders();
  const client = { res };
  clients.add(client);
  const interval = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch (e) { /* ignore */ }
  }, 25000);
  req.on('close', () => { clearInterval(interval); clients.delete(client); });
  res.write(`event: ready\n`);
  res.write(`data: {"message":"connected"}\n\n`);
}

function broadcast(event, payload) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    try { c.res.write(data); } catch (e) { /* drop */ }
  }
}

module.exports = { sseHandler, broadcast };
