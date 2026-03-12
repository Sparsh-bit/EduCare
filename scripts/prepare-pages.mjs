import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const outputDir = resolve(root, ".cloudflare/public");
const sourcePublic = resolve(root, "public");
const sourceApp = resolve(root, "app");
const sourceIndex = resolve(root, "index.html");

async function buildOutput() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await cp(sourcePublic, outputDir, { recursive: true, force: true });
  await cp(sourceApp, resolve(outputDir, "app"), { recursive: true, force: true });
  await cp(sourceIndex, resolve(outputDir, "index.html"), { force: true });
}

buildOutput()
  .then(() => {
    process.stdout.write(`Prepared Cloudflare Pages output at ${outputDir}\n`);
  })
  .catch((error) => {
    process.stderr.write(`Failed to prepare Pages output: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
