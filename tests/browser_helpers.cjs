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
module.exports = {previewFrames};
