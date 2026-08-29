import { LanguageEnum } from './src/enums/language.enum'
import { performance } from 'perf_hooks'

const iterations = 1_000_000;
const testVal = 'en';

const start1 = performance.now();
for (let i = 0; i < iterations; i++) {
  Object.values(LanguageEnum).includes(testVal as any);
}
const end1 = performance.now();

const ALLOWED_LANGUAGES = new Set(Object.values(LanguageEnum));
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  ALLOWED_LANGUAGES.has(testVal as any);
}
const end2 = performance.now();

console.log(`Baseline (Object.values): ${(end1 - start1).toFixed(2)} ms`);
console.log(`Optimized (Set.has): ${(end2 - start2).toFixed(2)} ms`);
