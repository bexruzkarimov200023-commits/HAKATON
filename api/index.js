import app from "../server/index.js";

export default function handler(request, response) {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`,
  );
  const apiPath = url.searchParams.get("__path");
  if (apiPath) {
    url.searchParams.delete("__path");
    request.url = `/api/${apiPath}${url.search}`;
  }
  return app(request, response);
}
