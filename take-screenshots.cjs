const { chromium } = require('playwright');

async function setupMockAuth(page) {
  await page.evaluate(() => {
    const mockAttendee = {
      uid: 'test-user-123',
      displayName: 'Test User',
      organization: 'Test Organization',
      photoURL: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem('beat-street-attendee', JSON.stringify(mockAttendee));
    localStorage.setItem('location-consent', 'true');
    localStorage.setItem('beat-street-venue', 'msuj');
  });
}

async function takeDesktopScreenshots() {
  console.log('\n=== DESKTOP SCREENSHOTS ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  const screenshotsDir = '/Users/jamditis/Desktop/Sandbox/ccm/cjs-beat-street/screenshots';

  // Initial load (login screen)
  console.log('Taking login screen screenshot...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${screenshotsDir}/desktop-01-login.png` });

  // Set up mock auth and reload
  await setupMockAuth(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  console.log('Taking main game view...');
  await page.screenshot({ path: `${screenshotsDir}/desktop-02-game-main.png` });

  // Wait more for assets to load
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${screenshotsDir}/desktop-03-game-loaded.png` });

  // Click on notifications button (first button)
  console.log('Opening notifications panel...');
  const notifBtn = await page.$('button[aria-label*="notification"], nav button:first-child');
  if (notifBtn) {
    await notifBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotsDir}/desktop-04-notifications.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Click on leaderboard button
  console.log('Opening leaderboard panel...');
  const leaderboardBtn = await page.$('button[aria-label="Open leaderboard"]');
  if (leaderboardBtn) {
    await leaderboardBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/desktop-05-leaderboard.png` });
    // Close by clicking X
    const closeBtn = await page.$('[role="dialog"] button, .absolute.top-4.right-4 button');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Click on achievements button
  console.log('Opening achievements panel...');
  const achievementsBtn = await page.$('button[aria-label="Open achievements"]');
  if (achievementsBtn) {
    await achievementsBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/desktop-06-achievements.png` });
    // Close
    const closeBtn = await page.$('button:has(svg.lucide-x)');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Click on settings button
  console.log('Opening settings panel...');
  const settingsBtn = await page.$('button[aria-label="Open settings"]');
  if (settingsBtn) {
    await settingsBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/desktop-07-settings.png` });
  }

  // Final state
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${screenshotsDir}/desktop-08-final.png` });

  if (errors.length > 0) {
    console.log('\nConsole errors:');
    errors.forEach(e => console.log('  -', e));
  }

  await browser.close();
}

async function takeMobileScreenshots() {
  console.log('\n=== MOBILE SCREENSHOTS ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  const screenshotsDir = '/Users/jamditis/Desktop/Sandbox/ccm/cjs-beat-street/screenshots';

  // Login screen mobile
  console.log('Taking mobile login screen...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${screenshotsDir}/mobile-01-login.png` });

  // Set up mock auth and reload
  await setupMockAuth(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  console.log('Taking mobile game view...');
  await page.screenshot({ path: `${screenshotsDir}/mobile-02-game.png` });

  // Wait more
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${screenshotsDir}/mobile-03-game-loaded.png` });

  // Look for touch UI elements
  const touchUI = await page.$('[class*="TouchUI"], [class*="joystick"], .fixed.bottom-4');
  if (touchUI) {
    console.log('Touch UI found');
  } else {
    console.log('No touch UI detected');
  }

  // Check for any buttons on mobile
  const buttons = await page.$$('button');
  console.log(`Found ${buttons.length} buttons on mobile`);

  await browser.close();
}

async function takeTabletScreenshots() {
  console.log('\n=== TABLET SCREENSHOTS ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  const screenshotsDir = '/Users/jamditis/Desktop/Sandbox/ccm/cjs-beat-street/screenshots';

  // Set up mock auth
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await setupMockAuth(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  console.log('Taking tablet game view...');
  await page.screenshot({ path: `${screenshotsDir}/tablet-01-game.png` });

  await browser.close();
}

async function main() {
  try {
    await takeDesktopScreenshots();
    await takeMobileScreenshots();
    await takeTabletScreenshots();
    console.log('\n=== DONE ===');
    console.log('Screenshots saved to: /Users/jamditis/Desktop/Sandbox/ccm/cjs-beat-street/screenshots/');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
