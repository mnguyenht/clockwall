// Webpack emits the bundle and the favicon, but nothing copies the rest of
// public/ into dist/ — so robots.txt and sitemap.xml would 404 in production.
// A dozen lines here beats adding copy-webpack-plugin for two static files.
import { cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await cp(resolve(root, "public"), resolve(root, "dist"), {
  recursive: true,
  force: true,
});

console.log("copied public/ -> dist/");
