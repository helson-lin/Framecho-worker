import { readFile } from "node:fs/promises";
import ts from "typescript";

// Test the actual TypeScript modules without adding a second build tool.
export async function loadModule(path, imports = {}) {
  let source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  for (const [specifier, replacement] of Object.entries(imports)) {
    source = source.replaceAll(specifier, replacement);
  }
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return { module: await import(url), url, source: outputText };
}
