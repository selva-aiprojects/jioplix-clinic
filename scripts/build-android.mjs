/**
 * Build 3 APK variants for Jioplix Android:
 *   - jioplix-patient.apk  (Patient app)
 *   - jioplix-doctor.apk   (Doctor app)
 *   - jioplix-staff.apk    (Staff app)
 *
 * Usage: node scripts/build-android.mjs
 * Requires: ANDROID_HOME, JAVA_HOME, Capacitor + Android platform in apps/web/android
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = resolve(__dirname, '../apps/web');
const ANDROID_DIR = resolve(WEB_DIR, 'android');
const CAP_CONFIG = resolve(WEB_DIR, 'capacitor.config.ts');
const STRINGS_XML = resolve(ANDROID_DIR, 'app/src/main/res/values/strings.xml');
const BUILD_GRADLE = resolve(ANDROID_DIR, 'app/build.gradle');
const MANIFEST = resolve(ANDROID_DIR, 'app/src/main/AndroidManifest.xml');

const CAP_CONFIG_ORIG = readFileSync(CAP_CONFIG, 'utf-8');
const STRINGS_ORIG = readFileSync(STRINGS_XML, 'utf-8');
const GRADLE_ORIG = readFileSync(BUILD_GRADLE, 'utf-8');

const variants = [
  {
    name: 'patient',
    appId: 'com.jioplix.patient',
    appName: 'Jioplix Patient',
    versionCode: 1,
    versionName: '1.0.0',
    description: 'Patient-facing app for booking, teleconsultation, and health records',
  },
  {
    name: 'doctor',
    appId: 'com.jioplix.doctor',
    appName: 'Jioplix Doctor',
    versionCode: 1,
    versionName: '1.0.0',
    description: 'Doctor app for EMR, consultations, prescriptions, and clinical workflows',
  },
  {
    name: 'staff',
    appId: 'com.jioplix.staff',
    appName: 'Jioplix Staff',
    versionCode: 1,
    versionName: '1.0.0',
    description: 'Staff app for reception, pharmacy, lab, and inventory management',
  },
];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: WEB_DIR, stdio: 'inherit', env: process.env });
}

function setCapConfig(variant) {
  const content = CAP_CONFIG_ORIG
    .replace(/appId:\s*'[^']*'/, `appId: '${variant.appId}'`)
    .replace(/appName:\s*'[^']*'/, `appName: '${variant.appName}'`);
  writeFileSync(CAP_CONFIG, content);
}

function setStrings(variant) {
  const content = STRINGS_ORIG
    .replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${variant.appName}</string>`)
    .replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">${variant.appName}</string>`)
    .replace(/<string name="package_name">[^<]*<\/string>/, `<string name="package_name">${variant.appId}</string>`)
    .replace(/<string name="custom_url_scheme">[^<]*<\/string>/, `<string name="custom_url_scheme">${variant.appId}</string>`);
  writeFileSync(STRINGS_XML, content);
}

function setBuildGradle(variant) {
  const content = GRADLE_ORIG
    .replace(/namespace\s*=\s*"[^"]*"/, `namespace = "${variant.appId}"`)
    .replace(/applicationId\s*"[^"]*"/, `applicationId "${variant.appId}"`)
    .replace(/versionCode\s*\d+/, `versionCode ${variant.versionCode}`)
    .replace(/versionName\s*"[^"]*"/, `versionName "${variant.versionName}"`);
  writeFileSync(BUILD_GRADLE, content);
}

function restoreOriginals() {
  writeFileSync(CAP_CONFIG, CAP_CONFIG_ORIG);
  writeFileSync(STRINGS_XML, STRINGS_ORIG);
  writeFileSync(BUILD_GRADLE, GRADLE_ORIG);
}

console.log('\n========================================');
console.log('  Jioplix Android APK Builder');
console.log('  3 variants: Patient, Doctor, Staff');
console.log('========================================\n');

// Build web assets first
console.log('\n[1/4] Building web assets...');
run('npm run build');

// Sync Capacitor
console.log('\n[2/4] Syncing Capacitor...');
run('npx cap sync android');

for (const variant of variants) {
  console.log(`\n[3/4] Configuring variant: ${variant.name} (${variant.appId})`);
  setCapConfig(variant);
  setStrings(variant);
  setBuildGradle(variant);
  
  console.log(`\n[4/4] Building APK: jioplix-${variant.name}.apk`);
  
  // Copy web assets after config change
  run('npx cap copy android');
  
  // Build debug APK
  run(`cd android && ./gradlew assembleDebug`);
  
  // Copy APK to output directory
  const outputDir = resolve(__dirname, '../dist/android');
  try { run(`mkdir -p "${outputDir}"`); } catch {}
  
  const gradleApk = resolve(ANDROID_DIR, `app/build/outputs/apk/debug/app-debug.apk`);
  const outputApk = resolve(outputDir, `jioplix-${variant.name}.apk`);
  
  try {
    run(`copy "${gradleApk}" "${outputApk}"`);
    console.log(`\n  ✓ jioplix-${variant.name}.apk ready`);
  } catch (e) {
    console.warn(`  ⚠ Could not copy APK for ${variant.name}: ${e.message}`);
  }
}

// Restore original configs
restoreOriginals();
run('npx cap sync android');

console.log('\n========================================');
console.log('  Build complete!');
console.log(`  APKs: dist/android/jioplix-{patient,doctor,staff}.apk`);
console.log('========================================\n');
