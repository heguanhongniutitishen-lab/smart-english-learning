export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Invalid JSON"), { code: "SYS_INVALID_JSON", status: 400 }); }
}
export function send(res, status, data, requestId) {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8","x-request-id":requestId});
  res.end(JSON.stringify({...data, request_id: requestId, server_time:new Date().toISOString()}));
}
export function ok(res,data,requestId,status=200){ send(res,status,{success:true,data},requestId); }
export function fail(res,status,code,message,requestId,retryable=false){ send(res,status,{success:false,error:{code,message,retryable}},requestId); }
