import { ESLint } from "eslint";

(async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["src/config/browser.ts"]);

  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  console.log(resultText);
})().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
