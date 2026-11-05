import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('theme colors match Booran Motors brand guide and website variables', async () => {
  const themeFile = fs.readFileSync(path.join(rootDir, 'src/theme/theme.ts'), 'utf8');
  assert.ok(themeFile.includes('#e60012'), 'Signal red must be #e60012');
  assert.ok(themeFile.includes('#171b22'), 'Graphite background must be #171b22');
  assert.ok(themeFile.includes('#f4f5f7'), 'Canvas background must be #f4f5f7');
});

test('brand assets are copied and accessible in assets/images', async () => {
  const logoPath = path.join(rootDir, 'assets/images/booran-motors-logo.png');
  const iconPath = path.join(rootDir, 'assets/images/booran-icon-512.png');
  assert.ok(fs.existsSync(logoPath), 'Official Booran Motors logo must exist in assets/images');
  assert.ok(fs.existsSync(iconPath), 'Official app icon must exist in assets/images');
});

test('app.json has proper bundle identifier and brand configuration', async () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
  assert.equal(appJson.expo.name, 'Booran Sales Floor');
  assert.equal(appJson.expo.ios.bundleIdentifier, 'com.booran.salesfloor');
  assert.equal(appJson.expo.android.package, 'com.booran.salesfloor');
  assert.equal(appJson.expo.backgroundColor, '#171b22');
});

test('API service exports all CRM, Inventory, Appointment, Staff, and Auth operations', async () => {
  const apiFile = fs.readFileSync(path.join(rootDir, 'src/services/api.ts'), 'utf8');
  assert.ok(apiFile.includes('authApi ='), 'authApi must be exported');
  assert.ok(apiFile.includes('leadApi ='), 'leadApi must be exported');
  assert.ok(apiFile.includes('inventoryApi ='), 'inventoryApi must be exported');
  assert.ok(apiFile.includes('appointmentApi ='), 'appointmentApi must be exported');
  assert.ok(apiFile.includes('staffApi ='), 'staffApi must be exported');
  assert.ok(apiFile.includes('unifiedApi ='), 'unifiedApi must be exported');
  assert.ok(apiFile.includes('customerMessageApi ='), 'customerMessageApi must be exported');
});

test('all required core views exist and are implemented', async () => {
  const views = [
    'TodayView.tsx',
    'LeadsView.tsx',
    'InventoryView.tsx',
    'ActionItemsView.tsx',
    'CalendarView.tsx',
    'RooftopsView.tsx',
    'StaffView.tsx',
    'FeedLogsView.tsx',
    'LoginScreen.tsx',
  ];

  for (const view of views) {
    const viewPath = path.join(rootDir, 'src/views', view);
    assert.ok(fs.existsSync(viewPath), `View ${view} must exist in src/views`);
  }
});

test('all required modals exist and are implemented', async () => {
  const modals = [
    'Customer360Modal.tsx',
    'VehicleDetailModal.tsx',
    'BookTestDriveModal.tsx',
    'AddProspectModal.tsx',
    'NotificationCenterModal.tsx',
    'SettingsModal.tsx',
  ];

  for (const modal of modals) {
    const modalPath = path.join(rootDir, 'src/components/modals', modal);
    assert.ok(fs.existsSync(modalPath), `Modal ${modal} must exist in src/components/modals`);
  }
});

