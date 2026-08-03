import { mkdir, writeFile } from "node:fs/promises";

const worker = `const worker = {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status === 404 && request.method === "GET" && acceptsHtml) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }

    return response;
  },
};

export default worker;
`;

await mkdir(new URL("../dist/server/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/server/index.js", import.meta.url), worker);
