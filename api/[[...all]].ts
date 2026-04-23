import server from "../dist/server/server.js";

function toBodyText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function handler(req: any, res: any) {
  const host = req.headers.host || "localhost";
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const url = `${protocol}://${host}${req.url || "/"}`;

  const bodyText = ["GET", "HEAD"].includes(req.method || "GET")
    ? undefined
    : toBodyText(req.body);

  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: bodyText,
  });

  const response = await server.fetch(request);

  response.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value);
  });

  res.status(response.status);
  const arrayBuffer = await response.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
}
