import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const port = Number.parseInt(process.env.EXTENSION_E2E_PORT ?? "4174", 10);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"]
]);

function resolveRequestPath(url) {
  const pathname = new URL(url, `http://127.0.0.1:${port}`).pathname;
  if (pathname === "/" || pathname === "/mock-composer.html") {
    return resolve(here, "mock-composer.html");
  }

  return null;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1");
