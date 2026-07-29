import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(repositoryRoot, "apps/demo/dist");
const indexPath = resolve(outputDirectory, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const routeMetadata = {
  privacy: {
    url: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
    title: "プライバシーポリシー | AIまえチェック"
  },
  support: {
    url: "https://shunya-mabuchi.github.io/ai-mae-check/support/",
    title: "サポート | AIまえチェック"
  }
};

for (const [route, metadata] of Object.entries(routeMetadata)) {
  const routeDirectory = resolve(outputDirectory, route);
  await mkdir(routeDirectory, { recursive: true });
  const routeHtml = indexHtml
    .replace(/<link rel="canonical" href="[^"]+"\s*\/>/u, `<link rel="canonical" href="${metadata.url}" />`)
    .replace(/<meta property="og:url" content="[^"]+"\s*\/>/u, `<meta property="og:url" content="${metadata.url}" />`)
    .replace(/<title>[^<]+<\/title>/u, `<title>${metadata.title}</title>`);
  await writeFile(resolve(routeDirectory, "index.html"), routeHtml, "utf8");
}

await copyFile(indexPath, resolve(outputDirectory, "404.html"));
await writeFile(resolve(outputDirectory, ".nojekyll"), "", "utf8");

console.log("GitHub Pages用の静的ルートを生成しました");
