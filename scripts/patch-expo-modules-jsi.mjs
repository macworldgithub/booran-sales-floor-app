import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packagePath = require.resolve('expo-modules-jsi/package.json');
const { version } = JSON.parse(readFileSync(packagePath, 'utf8'));

// Keep this workaround scoped to the dependency version verified locally.
if (version === '58.0.22') {
  const sourcePath = join(
    dirname(packagePath),
    'apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift',
  );
  const replacements = [
    [
      '    nonisolated(unsafe) let slot = buffer.baseAddress!',
      '    let slot = buffer.baseAddress!\n    let sendableSlot = UncheckedSendable(slot)',
    ],
    [
      '        try encode(JavaScriptValue.Slot(slot), runtime)',
      '        try encode(JavaScriptValue.Slot(sendableSlot.value), runtime)',
    ],
  ];
  let source = readFileSync(sourcePath, 'utf8');

  // Swift 6.2 rejects a raw pointer captured by assumeIsolated even with
  // nonisolated(unsafe). Use Expo's existing UncheckedSendable helper, as its
  // other synchronous JS-thread callbacks do. The allocation and its lifetime,
  // actor assertion, encoding, and destruction all remain on the same thread.
  if (replacements.every(([, patched]) => source.includes(patched))) {
    console.log('ExpoModulesJSI Swift compatibility patch already applied.');
  } else {
    for (const [original, patched] of replacements) {
      if (source.split(original).length !== 2) {
        throw new Error(`ExpoModulesJSI ${version} source changed; review the Swift compatibility patch.`);
      }
      source = source.replace(original, patched);
    }
    writeFileSync(sourcePath, source);
    console.log('Applied ExpoModulesJSI Swift compatibility patch.');
  }
} else {
  console.log(`Skipping ExpoModulesJSI Swift compatibility patch for ${version}; only 58.0.22 is patched.`);
}
