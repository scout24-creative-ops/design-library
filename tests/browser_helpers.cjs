async function previewFrames(page) {
  const handles = await page.locator('iframe[data-preview-key]').elementHandles();
  const frames = [];
  for (const handle of handles) {
    const frame = await handle.contentFrame();
    await frame.waitForSelector('#preview-root[data-ready="true"]', {timeout:30000});
    frames.push(frame);
  }
  return frames;
}
async function selectPreviewMode(page, width) {
  const mode = width < 669 ? 'mobile' : 'desktop';
  const control = page.locator(`[data-preview-mode="${mode}"]`);
  if (await control.count() && await control.getAttribute('aria-pressed') !== 'true') {
    await control.click();
  }
}
module.exports = {previewFrames, selectPreviewMode};
