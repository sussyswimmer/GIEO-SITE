// Records the home page scrolled top to bottom (desktop 1440x900, phone 390x844, Vietnamese) as MP4s in
// qa/showcase/, from Chrome's screencast (Playwright's own recorder needs a binary this setup lacks) and the
// system ffmpeg. Against a production build on :3101. Usage: node scripts/record-showcase.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const out = 'qa/showcase';
const b = await chromium.launch(process.env.CHROME_PATH || process.platform === 'linux' ? { executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' } : { channel: 'chrome' });
for (const [name, w, h, phone, route] of [['desktop', 1440, 900, false, '/'], ['phone', 390, 844, true, '/']]) {
  const dir = `${out}/frames-${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, locale: 'vi-VN', hasTouch: phone, isMobile: phone });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3101' + route + (process.env.QUERY ?? ''), { waitUntil: 'networkidle' });
  await p.waitForFunction(() => 'motionReady' in document.documentElement.dataset, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2000);
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const i = frames.length;
    fs.writeFileSync(`${dir}/${String(i).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'));
    frames.push(f.metadata.timestamp);
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: phone ? 780 : 1440, maxHeight: phone ? 1688 : 900, everyNthFrame: 1 });
  await p.waitForTimeout(1500);
  const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const step = phone ? 12 : 50, pause = phone ? 30 : 60;
  for (let y = 0; y < total; y += step) {
    if (phone) await p.evaluate((d) => window.scrollBy(0, d), step);
    else await p.mouse.wheel(0, step);
    await p.waitForTimeout(pause);
  }
  await p.waitForTimeout(2000);
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // Concat list with each frame's real duration, so the video runs at the speed it was scrolled.
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const d = i + 1 < frames.length ? Math.min(0.5, frames[i + 1] - frames[i]) : 0.5;
    lines.push(`file '${String(i).padStart(5, '0')}.jpg'`, `duration ${d.toFixed(4)}`);
  }
  lines.push(`file '${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  fs.writeFileSync(`${dir}/list.txt`, lines.join('\n'));
  const secs = frames.at(-1) - frames[0];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'medium', '-movflags', '+faststart', `${out}/home-${name}.mp4`]);
  console.log(name, frames.length, 'frames over', secs.toFixed(1), 's, page', total, 'px');
}
await b.close();
