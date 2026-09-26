import http from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("x-request-id", requestId);

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      data: { status: "ok", service: "smart-english-api" },
      request_id: requestId,
      server_time: new Date().toISOString()
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: { code: "SYS_NOT_FOUND", message: "Resource not found", retryable: false },
    request_id: requestId
  }));
});

server.listen(port, () => {
  console.log(`smart-english-api listening on :${port}`);
});
