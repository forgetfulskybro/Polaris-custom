const { createCanvas, loadImage, ImageData } = require("canvas");
const { spawn } = require("child_process");
const UPNG = require("upng-js");
const { GifReader } = require("omggif");
const { GIFEncoder, quantize } = require("gifenc");
const connectionEmojis = require("../json/connection_emojis.json");

const WIDTH = 600;
const HEIGHT = 760;
const CARD = { x: 20, y: 18, w: 560, h: 724, r: 26 };
const BANNER_H = 200;
const AVATAR = { x: 40, y: 144, size: 112 };
const NAME_X = 40;
const NAME_BASELINE = 288;
const HANDLE_BASELINE = 316;
const BIO_X = 40;
const BIO_Y = 366;
const BIO_W = 520;
const MEMBER_SINCE_Y = 438;
const CONNECTIONS_Y = 462;
const DIVIDER_Y = 506;
const PREVIEW_LABEL_Y = 528;
const PREVIEW = { x: 56, y: 552, w: 488, h: 132 };
const PREVIEW_STRIP = { x: 76, y: 576, w: 448, h: 84 };

const MAX_FRAMES = 96;
const TARGET_FRAME_MS = 60;
const MAX_ANIMATION_MS = 4800;
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 40;
const CARD_CACHE_TTL = 15 * 60 * 1000;
const CARD_CACHE_MAX = 25;
const EFFECT_CACHE_TTL = 6 * 60 * 60 * 1000;
const EFFECT_CACHE_MAX = 80;

const FONT = '"Segoe UI", "gg sans", Arial, sans-serif';
const BODY = "#1e1f22";
const TEXT = "#f2f3f5";
const MUTED = "#b5bac1";
const FAINT = "#80848e";
const FALLBACK_ACCENT = 0x5865f2;

const assetCache = new Map();
const cardCache = new Map();
const effectProductCache = new Map();
const frameCanvases = new WeakMap();

function intToHex(value) {
  return `#${(Number(value) & 0xffffff).toString(16).padStart(6, "0")}`;
}

function shade(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function customEmojiURL(emoji) {
  const match = /^<(a?):([^:>]+):(\d+)>$/.exec(String(emoji || ""));
  if (!match) return null;
  const extension = match[1] === "a" ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${match[3]}.${extension}?size=64`;
}

function withDiscordImageSize(url, size) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)discordapp\.com$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set("size", String(size));
    return parsed.toString();
  } catch {
    return url;
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function topRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function drawCover(ctx, image, x, y, w, h) {
  const iw = image.width || 1;
  const ih = image.height || 1;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawContain(ctx, image, x, y, w, h) {
  const iw = image.width || 1;
  const ih = image.height || 1;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function fitText(ctx, text, font, maxWidth) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function collectibleURL(item, kind) {
  if (!item) return null;
  if (Array.isArray(item)) {
    for (const entry of item) {
      const url = collectibleURL(entry, kind);
      if (url) return url;
    }
    return null;
  }
  if (typeof item === "string") {
    return /^https?:\/\//i.test(item) ? item : null;
  }

  const candidates = [
    item.static_image_url,
    item.staticImageUrl,
    item.staticFrameSrc,
    item.static_frame_src,
    item.thumbnailPreviewSrc,
    item.reducedMotionSrc,
    item.url,
    item.src,
    item.image_url,
    item.imageUrl,
    item.assets?.static_image_url,
    item.assets?.staticImageUrl,
    item.assets?.static,
    item.assets?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
  }

  if (Array.isArray(item.effects)) {
    for (const effect of item.effects) {
      if (typeof effect?.src === "string" && /^https?:\/\//i.test(effect.src)) {
        return effect.src;
      }
    }
  }

  if (Array.isArray(item.layers)) {
    for (const layer of item.layers) {
      const candidate =
        layer?.url || layer?.src || layer?.image_url || layer?.assets?.static_image_url;
      if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
    }
  }

  if (typeof item.asset === "string" && item.asset.trim()) {
    if (/^https?:\/\//i.test(item.asset)) return item.asset;
    const path = item.asset.trim().replace(/^\/+|\/+$/g, "");

    if (kind === "effect") {
      if (path.startsWith("profile_effects/")) {
        return `https://cdn.discordapp.com/assets/${path}/static.png`;
      }
      if (path.startsWith("effects/")) {
        return `https://cdn.discordapp.com/assets/profile_effects/${path}/static.png`;
      }
    }
    if (kind === "frame") {
      return `https://cdn.discordapp.com/assets/collectibles/${path}/static.png`;
    }
  }

  return null;
}

function selectFrames(frames, total, maxFrames) {
  if (frames.length <= maxFrames) return frames;

  const selected = [];
  for (let i = 0; i < maxFrames; i++) {
    const time = (i * total) / maxFrames;
    let picked = frames[0];
    for (const frame of frames) {
      if (frame.start <= time) picked = frame;
      else break;
    }
    if (!selected.length || selected[selected.length - 1].index !== picked.index) {
      selected.push(picked);
    }
  }
  return selected;
}

function nearestPaletteIndex(r, g, b, palette) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let index = 0; index < palette.length; index++) {
    const color = palette[index];
    const dr = color[0] - r;
    const dg = color[1] - g;
    const db = color[2] - b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function buildGlobalPalette(frames, extraColors = []) {
  const stride = 4;
  const pixelsPerFrame = Math.ceil((WIDTH * HEIGHT) / stride);
  const sample = new Uint8ClampedArray(frames.length * pixelsPerFrame * 4);
  let offset = 0;

  for (const frame of frames) {
    for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += stride) {
      const i = pixel * 4;
      sample[offset++] = frame[i];
      sample[offset++] = frame[i + 1];
      sample[offset++] = frame[i + 2];
      sample[offset++] = 255;
    }
  }

  const palette = quantize(sample, 222, { format: "rgb565" });
  const seen = new Set(palette.map((color) => color.join(",")));
  const add = (color) => {
    if (!color || palette.length >= 256) return;
    const key = color.join(",");
    if (seen.has(key)) return;
    seen.add(key);
    palette.push(color);
  };

  for (const hex of extraColors) add(hexToRgb(hex));

  for (let index = 0; index < 32; index++) {
    const t = index / 31;
    add([
      Math.round(21 + (39 - 21) * t),
      Math.round(22 + (40 - 22) * t),
      Math.round(26 + (44 - 26) * t),
    ]);
  }

  return palette;
}

function applyStablePalette(rgba, palette, colorCache) {
  const indexed = new Uint8Array(rgba.length / 4);

  for (let pixel = 0, i = 0; i < rgba.length; i += 4, pixel++) {
    const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    let index = colorCache.get(key);

    if (index === undefined) {
      index = nearestPaletteIndex(rgba[i], rgba[i + 1], rgba[i + 2], palette);
      colorCache.set(key, index);
    }

    indexed[pixel] = index;
  }

  return indexed;
}

function clearPixelRect(pixels, width, height, x, y, w, h) {
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const right = Math.min(width, x + w);
  const bottom = Math.min(height, y + h);

  for (let row = top; row < bottom; row++) {
    const start = (row * width + left) * 4;
    const end = (row * width + right) * 4;
    pixels.fill(0, start, end);
  }
}

function decodeGif(buffer, maxFrames) {
  const reader = new GifReader(buffer);
  const width = reader.width;
  const height = reader.height;
  const frames = [];
  let total = 0;

  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i);
    const delay = info.delay > 0 ? info.delay * 10 : 100;
    frames.push({ index: i, start: total, delay });
    total += delay;
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  const selected = selectFrames(frames, total, maxFrames);
  const wanted = new Set(selected.map((frame) => frame.index));
  const composed = new Map();
  let restorePixels = null;

  for (let i = 0; i < reader.numFrames(); i++) {
    const info = reader.frameInfo(i);

    if (i > 0) {
      const previous = reader.frameInfo(i - 1);
      if (previous.disposal === 2) {
        clearPixelRect(
          pixels,
          width,
          height,
          previous.x,
          previous.y,
          previous.width,
          previous.height,
        );
      } else if (previous.disposal === 3 && restorePixels) {
        pixels.set(restorePixels);
      }
    }

    if (info.disposal === 3) {
      restorePixels = new Uint8ClampedArray(pixels);
    }

    reader.decodeAndBlitFrameRGBA(i, pixels);

    if (wanted.has(i)) {
      composed.set(i, new Uint8ClampedArray(pixels));
    }
  }

  return {
    width,
    height,
    image: null,
    duration: total,
    frames: selected.map((frame) => ({
      start: frame.start,
      delay: frame.delay,
      imageData: new ImageData(composed.get(frame.index), width, height),
    })),
  };
}

function samePixels(a, b) {
  if (a.length !== b.length) return false;
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(
    Buffer.from(b.buffer, b.byteOffset, b.byteLength),
  );
}

function decodeApng(buffer, maxFrames) {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const png = UPNG.decode(arrayBuffer);
  const rgba = UPNG.toRGBA8(png);
  const frames = [];
  let total = 0;

  (png.frames || []).forEach((frame, index) => {
    const delay = frame.delay > 0 ? frame.delay : 100;
    frames.push({ index, start: total, delay });
    total += delay;
  });

  if (!frames.length) {
    frames.push({ index: 0, start: 0, delay: 100 });
    total = 100;
  }

  const selected = selectFrames(frames, total, maxFrames);

  return {
    width: png.width,
    height: png.height,
    image: null,
    duration: total,
    frames: selected.map((frame) => ({
      start: frame.start,
      delay: frame.delay,
      imageData: new ImageData(
        new Uint8ClampedArray(rgba[frame.index] || rgba[0]),
        png.width,
        png.height,
      ),
    })),
  };
}

async function fetchBuffer(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Failed to fetch asset (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function decodeAsset(buffer, animated, maxFrames) {
  const isGif = buffer.length > 6 && buffer.toString("ascii", 0, 3) === "GIF";
  const isApng = buffer.includes("acTL");
  const isWebm =
    buffer.length > 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3;

  if (animated && isGif) return decodeGif(buffer, maxFrames);
  if (animated && isApng) return decodeApng(buffer, maxFrames);
  if (animated && isWebm) return decodeApng(await decodeWebm(buffer), maxFrames);

  const image = await loadImage(buffer);
  return { width: image.width, height: image.height, image, frames: null, duration: 0 };
}

async function getAsset(url, { animated = false, maxFrames = MAX_FRAMES } = {}) {
  if (!url) return null;

  const key = `${animated ? "animated" : "static"}:${url}`;
  const cached = assetCache.get(key);
  if (cached && cached.expires > Date.now()) {
    assetCache.delete(key);
    assetCache.set(key, cached);
    return cached.value;
  }

  const value = await decodeAsset(await fetchBuffer(url), animated, maxFrames);

  if (assetCache.size >= CACHE_MAX) {
    assetCache.delete(assetCache.keys().next().value);
  }
  assetCache.set(key, { value, expires: Date.now() + CACHE_TTL });
  return value;
}

function makeModel(user, data, options = {}) {
  const d = data || {};
  const extra = options || {};
  const id = d.id || user.id;
  const username = d.username || user.username || "unknown";
  const discriminator = d.discriminator ?? user.discriminator ?? "0";
  const displayName = d.global_name || user.globalName || username;

  const avatar = d.avatar ?? user.avatar ?? null;
  const avatarAnimated = typeof avatar === "string" && avatar.startsWith("a_");
  const fallbackAvatarURL =
    d.defaultAvatarURL ||
    (typeof user.defaultAvatarURL === "function"
      ? user.defaultAvatarURL()
      : user.defaultAvatarURL) ||
    user.displayAvatarURL?.({ extension: "png", size: 256 });
  const avatarURL = avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatarAnimated ? "gif" : "png"}?size=256`
    : typeof d.avatarURL === "string" && /^https?:\/\//i.test(d.avatarURL)
      ? d.avatarURL
      : fallbackAvatarURL;

  const banner = d.banner ?? user.banner ?? null;
  const bannerAnimated = typeof banner === "string" && banner.startsWith("a_");
  const bannerSize = bannerAnimated ? 1024 : 2048;
  const bannerURL = withDiscordImageSize(
    banner
      ? `https://cdn.discordapp.com/banners/${id}/${banner}.${bannerAnimated ? "gif" : "png"}?size=${bannerSize}`
      : typeof d.bannerURL === "string" && /^https?:\/\//i.test(d.bannerURL)
        ? d.bannerURL
        : user.bannerURL?.({ extension: "png", size: bannerSize }) || null,
    bannerSize,
  );

  const decorationData = d.avatar_decoration_data ?? user.avatarDecorationData ?? null;
  const decorationURL = decorationData?.asset
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData.asset}.png?size=160&passthrough=true`
    : null;

  const nameplate = d.collectibles?.nameplate ?? user.collectibles?.nameplate ?? null;
  const nameplateAsset = nameplate?.asset
    ? `${String(nameplate.asset).replace(/^\/+/, "").replace(/\/?$/, "")}/`
    : null;
  const nameplateURL = nameplateAsset
    ? `https://cdn.discordapp.com/assets/collectibles/${nameplateAsset}static.png`
    : null;
  const nameplateAnimatedURL = nameplateAsset
    ? `https://cdn.discordapp.com/assets/collectibles/${nameplateAsset}asset.webm`
    : null;

  const profileEffectCollectible = Array.isArray(d.user_profile?.collectibles)
    ? d.user_profile.collectibles.find((item) => item?.type === 1)
    : null;
  const effect =
    extra.effect ||
    d.user_profile?.profile_effect ||
    d.user_profile?.profileEffect ||
    profileEffectCollectible ||
    d.collectibles?.profile_effect ||
    d.collectibles?.profile_effects ||
    d.collectibles?.profileEffect ||
    d.collectibles?.profileEffects ||
    d.profile_effect ||
    d.profile_effects ||
    d.profileEffect ||
    d.profileEffects ||
    user.profileEffect ||
    user.profileEffects ||
    null;
  const effectSku =
    effect?.sku_id ||
    effect?.skuId ||
    effect?.id ||
    (typeof effect === "string" && /^\d+$/.test(effect) ? effect : null);
  const frame =
    d.collectibles?.profile_frame ||
    d.collectibles?.profile_frames ||
    d.collectibles?.profileFrame ||
    d.collectibles?.profileFrames ||
    d.collectibles?.frame ||
    d.collectibles?.frames ||
    d.profile_frame ||
    d.profile_frames ||
    d.profileFrame ||
    d.profileFrames ||
    user.profileFrame ||
    user.profileFrames ||
    null;

  const clan = d.clan || d.primary_guild || user.primaryGuild || null;
  const clanGuildId = clan?.identity_guild_id || clan?.identityGuildId || null;
  const clanEnabled = clan?.identity_enabled ?? clan?.identityEnabled ?? true;
  const clanBadgeURL =
    clanGuildId && clan?.badge && clanEnabled !== false
      ? `https://cdn.discordapp.com/clan-badges/${clanGuildId}/${clan.badge}.png`
      : null;

  const rawBadges = Array.isArray(extra.badges)
    ? extra.badges
    : Array.isArray(d.badges)
      ? d.badges
      : [];
  const seenBadges = new Set();
  const badges = rawBadges
    .map((badge) => {
      const url =
        typeof badge?.simple_icon_url === "string" && /^https?:\/\//i.test(badge.simple_icon_url)
          ? badge.simple_icon_url
          : typeof badge?.icon === "string" && badge.icon
            ? `https://cdn.discordapp.com/badge-icons/${badge.icon}.png`
            : typeof badge?.icon_url === "string" && /^https?:\/\//i.test(badge.icon_url)
              ? badge.icon_url
              : null;
      return {
        id: badge?.id || badge?.name || "badge",
        description: badge?.description || badge?.name || "",
        url,
      };
    })
    .filter((badge) => {
      if (!badge.url || seenBadges.has(badge.id)) return false;
      seenBadges.add(badge.id);
      return true;
    });

  const rawConnections = Array.isArray(extra.connections)
    ? extra.connections
    : Array.isArray(d.connections)
      ? d.connections
      : [];
  const seenConnections = new Set();
  const connections = [];
  for (const connection of rawConnections) {
    const type = String(connection?.type || "").trim().toLowerCase();
    if (!type || seenConnections.has(type)) continue;
    seenConnections.add(type);
    connections.push({
      type,
      name: connection?.name || "",
      url: connection?.url || null,
      iconURL: customEmojiURL(connectionEmojis[type]),
    });
  }

  const accentValue =
    extra.accentColor ??
    d.accent_color ??
    d.user_profile?.accent_color ??
    user.accentColor ??
    null;
  let accent =
    typeof accentValue === "number" && accentValue >= 0
      ? intToHex(accentValue)
      : typeof d.banner_color === "string" && /^#[0-9a-f]{6}$/i.test(d.banner_color)
        ? d.banner_color
        : intToHex(FALLBACK_ACCENT);

  let nameColors = Array.isArray(d.display_name_styles?.colors)
    ? d.display_name_styles.colors.filter((c) => Number.isFinite(c)).map(intToHex)
    : [];
  if (!nameColors.length) nameColors = [TEXT];

  return {
    id,
    username,
    displayName,
    handle:
      discriminator && discriminator !== "0"
        ? `${username}#${discriminator}`
        : `@${username}`,
    avatarURL,
    bannerURL,
    decorationURL,
    nameplateURL,
    nameplateAnimatedURL,
    effectURL: collectibleURL(effect, "effect"),
    effectSku,
    frameURL: collectibleURL(frame, "frame"),
    clanTag: clan?.tag || null,
    clanBadgeURL,
    badges,
    connections,
    accent,
    nameColors,
    bio: String(extra.bio ?? d.bio ?? d.user_profile?.bio ?? ""),
    pronouns: String(extra.pronouns ?? d.pronouns ?? d.user_profile?.pronouns ?? ""),
    createdAt: extra.createdAt ?? d.created_at ?? user.createdTimestamp ?? null,
  };
}

async function resolveEffectAssets(sku) {
  if (!sku) return null;
  const key = String(sku);
  const cached = effectProductCache.get(key);
  if (cached && cached.expires > Date.now()) {
    effectProductCache.delete(key);
    effectProductCache.set(key, cached);
    return cached.assets;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/collectibles-products/${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(7000) },
    );
    if (!response.ok) return null;

    const product = await response.json();
    const items = Array.isArray(product.items) ? product.items : [];
    const item = items.find((entry) => entry?.type === 1) || items[0] || null;
    const staticURL =
      item?.staticFrameSrc ||
      item?.thumbnailPreviewSrc ||
      item?.reducedMotionSrc ||
      null;

    const layers = (Array.isArray(item?.effects) ? item.effects : [])
      .filter(
        (entry) =>
          typeof entry?.src === "string" && /^https?:\/\//i.test(entry.src),
      )
      .map((entry, index) => ({
        url: entry.src,
        start: Math.max(0, Number(entry.start) || 0),
        duration: Math.max(0, Number(entry.duration) || 0),
        loop: entry.loop !== false,
        loopDelay: Math.max(0, Number(entry.loopDelay) || 0),
        zIndex: Number.isFinite(Number(entry.zIndex))
          ? Number(entry.zIndex)
          : index,
      }))
      .sort((a, b) => a.zIndex - b.zIndex);
    const assets = {
      staticURL: typeof staticURL === "string" && /^https?:\/\//i.test(staticURL) ? staticURL : null,
      layers,
    };
    if (!assets.staticURL && !assets.layers.length) return null;

    if (effectProductCache.size >= EFFECT_CACHE_MAX) {
      effectProductCache.delete(effectProductCache.keys().next().value);
    }
    effectProductCache.set(key, { assets, expires: EFFECT_CACHE_TTL });
    return assets;
  } catch {
    return null;
  }
}

function decodeWebm(buffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      FFMPEG_PATH,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-c:v",
        "libvpx-vp9",
        "-i",
        "pipe:0",
        "-vf",
        "format=rgba",
        "-pix_fmt",
        "rgba",
        "-f",
        "apng",
        "-plays",
        "0",
        "pipe:1",
      ],
      { windowsHide: true },
    );
    const stdout = [];
    const stderr = [];

    ffmpeg.stdout.on("data", (chunk) => stdout.push(chunk));
    ffmpeg.stderr.on("data", (chunk) => stderr.push(chunk));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout));
      else reject(new Error(`ffmpeg exited with ${code}: ${Buffer.concat(stderr).toString().slice(0, 300)}`));
    });
    ffmpeg.stdin.on("error", () => {});
    ffmpeg.stdin.end(buffer);
  });
}

function getFrameCanvas(source, frame) {
  let canvas = frameCanvases.get(source);
  if (!canvas) {
    canvas = createCanvas(source.width, source.height);
    frameCanvases.set(source, canvas);
  }
  canvas.getContext("2d").putImageData(frame.imageData, 0, 0);
  return canvas;
}

function sourceImage(source, frame) {
  if (!source) return null;
  if (frame?.imageData) return getFrameCanvas(source, frame);
  return source.image;
}

function drawBackdrop(ctx, model) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#0c0d10");
  background.addColorStop(1, "#18191d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    20,
    WIDTH / 2,
    HEIGHT / 2,
    WIDTH * 0.64,
  );
  glow.addColorStop(0, shade(model.accent, 0.22));
  glow.addColorStop(1, shade(model.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.62)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 14;
  roundedRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.fillStyle = BODY;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.clip();

  const body = ctx.createLinearGradient(
    CARD.x,
    CARD.y + BANNER_H,
    CARD.x + CARD.w,
    CARD.y + CARD.h,
  );
  body.addColorStop(0, "#212226");
  body.addColorStop(1, "#18191d");
  ctx.fillStyle = body;
  ctx.fillRect(CARD.x, CARD.y + BANNER_H, CARD.w, CARD.h - BANNER_H);

  ctx.restore();
}

function drawBanner(ctx, model, source, frame) {
  ctx.save();
  topRoundedRect(ctx, CARD.x, CARD.y, CARD.w, BANNER_H, CARD.r);
  ctx.clip();
  ctx.fillStyle = model.accent;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, BANNER_H);

  const image = sourceImage(source, frame);
  if (image) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    drawCover(ctx, image, CARD.x, CARD.y, CARD.w, BANNER_H);
  }
  ctx.restore();
}

function drawAvatarAt(ctx, model, source, frame, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size / 2;
  const image = sourceImage(source, frame);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#111214";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    drawCover(ctx, image, x, y, size, size);
  } else {
    const fallback = ctx.createLinearGradient(x, y, x + size, y + size);
    fallback.addColorStop(0, shade(model.accent, 0.95));
    fallback.addColorStop(1, shade(model.accent, 0.45));
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(15, 16, 18, 0.65)";
  ctx.stroke();
}

function drawAvatar(ctx, model, source, frame) {
  drawAvatarAt(ctx, model, source, frame, AVATAR.x, AVATAR.y, AVATAR.size);
}

function drawDecorationAt(ctx, source, frame, cx, cy, size) {
  const image = sourceImage(source, frame);
  if (!image) return;
  ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
}

function drawDecoration(ctx, model, source, frame) {
  drawDecorationAt(
    ctx,
    source,
    frame,
    AVATAR.x + AVATAR.size / 2,
    AVATAR.y + AVATAR.size / 2,
    AVATAR.size * 1.4,
  );
}

function drawNameplatePreview(
  ctx,
  model,
  source,
  frame,
  avatar,
  avatarFrame,
  decoration,
  decorationFrame,
  clanSource,
) {
  ctx.save();
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = FAINT;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("MEMBER LIST PREVIEW", PREVIEW.x, PREVIEW_LABEL_Y);

  roundedRect(ctx, PREVIEW.x, PREVIEW.y, PREVIEW.w, PREVIEW.h, 16);
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const { x, y, w, h } = PREVIEW_STRIP;
  ctx.save();
  roundedRect(ctx, x, y, w, h, 10);
  ctx.clip();

  const image = sourceImage(source, frame);
  if (image) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    drawCover(ctx, image, x, y, w, h);
  } else {
    const base = ctx.createLinearGradient(x, y, x + w, y);
    base.addColorStop(0, shade(model.accent, 0.9));
    base.addColorStop(1, "#17181c");
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
  }

  const scrim = ctx.createLinearGradient(x, 0, x + 330, 0);
  scrim.addColorStop(0, "rgba(6, 7, 10, 0.62)");
  scrim.addColorStop(0.7, "rgba(6, 7, 10, 0.12)");
  scrim.addColorStop(1, "rgba(6, 7, 10, 0.02)");
  ctx.fillStyle = scrim;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  roundedRect(ctx, x, y, w, h, 10);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawAvatarAt(ctx, model, avatar, avatarFrame, x + 12, y + 10, 64);
  drawDecorationAt(ctx, decoration, decorationFrame, x + 44, y + 42, 64 * 1.4);

  ctx.save();
  ctx.textBaseline = "alphabetic";
  const clan = clanTagMetrics(ctx, model, clanSource);
  const nameFont = `700 24px ${FONT}`;
  const maxNameWidth = Math.max(
    40,
    w - 96 - 14 - (clan ? clan.width + 10 : 0),
  );
  const name = fitText(ctx, model.displayName, nameFont, maxNameWidth);
  ctx.font = nameFont;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 6;
  const nameX = x + 96;
  ctx.fillText(name, nameX, y + 50);
  ctx.shadowBlur = 0;
  const nameWidth = ctx.measureText(name).width;
  ctx.restore();

  if (clan) {
    drawClanTag(ctx, model, clanSource, nameX + nameWidth + 10, y + 42);
  }
}

function clanTagMetrics(ctx, model, source) {
  if (!model.clanTag) return null;

  const font = `600 12px ${FONT}`;
  const label = fitText(ctx, model.clanTag, font, 54);
  ctx.font = font;
  const textWidth = ctx.measureText(label).width;
  const crestSize = source?.image ? 18 : 0;
  const crestGap = crestSize ? 5 : 0;

  return {
    font,
    label,
    crestSize,
    crestGap,
    width: 8 + crestSize + crestGap + textWidth + 9,
    height: 24,
  };
}

function drawClanTag(ctx, model, source, x, centerY) {
  const metrics = clanTagMetrics(ctx, model, source);
  if (!metrics) return 0;

  const { font, label, crestSize, crestGap, width, height } = metrics;
  const y = centerY - height / 2;

  roundedRect(ctx, x, y, width, height, 7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();

  let contentX = x + 8;
  if (crestSize) {
    ctx.drawImage(source.image, contentX, centerY - crestSize / 2, crestSize, crestSize);
    contentX += crestSize + crestGap;
  }

  ctx.font = font;
  ctx.fillStyle = "#e6e8eb";
  ctx.fillText(label, contentX, centerY + 4);
  return width;
}

function drawBadges(ctx, sources, x, centerY, maxWidth, size = 20, gap = 4) {
  const available = sources.filter((source) => source?.image);
  if (!available.length) return { right: x, bottom: centerY, rows: 0 };

  let currentX = x;
  let currentY = centerY;
  let rows = 1;

  for (const source of available) {
    if (currentX > x && currentX + size > x + maxWidth) {
      currentX = x;
      currentY += size + gap;
      rows++;
    }
    ctx.drawImage(source.image, currentX, currentY - size / 2, size, size);
    currentX += size + gap;
  }

  return { right: currentX - gap, bottom: currentY + size / 2, rows };
}

function drawConnections(ctx, model, y = CONNECTIONS_Y) {
  if (!model.connections.length) return;

  const colors = {
    github: "#e6edf3",
    steam: "#66c0f4",
    twitch: "#9146ff",
    youtube: "#ff4444",
    twitter: "#1d9bf0",
    x: "#e7e9ea",
    spotify: "#1db954",
    reddit: "#ff4500",
    xbox: "#107c10",
    playstation: "#0070d1",
    epicgames: "#f4f4f4",
    riotgames: "#d32936",
    battlenet: "#148eff",
    roblox: "#e2231a",
    bluesky: "#1185fe",
    tiktok: "#ffffff",
    instagram: "#e1306c",
    facebook: "#1877f2",
    paypal: "#003087",
    ebay: "#e53238",
    crunchyroll: "#f47521",
    bungie: "#ffffff",
    domain: "#9aa0a6",
    leagueoflegends: "#d6b36a",
    mastodon: "#6364ff",
  };

  const labels = model.connections.map((connection) => connection.type);
  const displayNames = {
    github: "GitHub",
    youtube: "YouTube",
    xbox: "Xbox",
    playstation: "PlayStation",
    epicgames: "Epic Games",
    riotgames: "Riot Games",
    battlenet: "Battle.net",
    crunchyroll: "Crunchyroll",
    bluesky: "Bluesky",
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    paypal: "PayPal",
    ebay: "eBay",
    leagueoflegends: "League of Legends",
    domain: "Domain",
    x: "X",
    twitter: "Twitter",
    roblox: "Roblox",
    spotify: "Spotify",
    reddit: "Reddit",
    steam: "Steam",
    twitch: "Twitch",
    mastodon: "Mastodon",
    bungie: "Bungie",
  };
  const maxWidth = CARD.x + CARD.w - 36 - BIO_X;
  const visible = [];
  let used = 0;

  for (let index = 0; index < labels.length; index++) {
    const type = labels[index];
    if (visible.length >= 4) break;
    const font = `500 12px ${FONT}`;
    const label = fitText(
      ctx,
      displayNames[type] || type.charAt(0).toUpperCase() + type.slice(1),
      font,
      70,
    );
    ctx.font = font;
    const width = 28 + ctx.measureText(label).width + 10;
    const remaining = labels.length - visible.length - 1;
    const reserve = remaining > 0 ? 34 : 0;

    if (visible.length && used + width + reserve > maxWidth) break;
    visible.push({ type, label, width, icon: model.connections[index].icon });
    used += width;
  }

  const extra = labels.length - visible.length;
  const chipHeight = 24;
  const chipY = y;
  let x = BIO_X;

  function chip(label, color, width, icon) {
    roundedRect(ctx, x, chipY, width, chipHeight, 8);
    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    ctx.fill();

    if (icon?.image) {
      ctx.drawImage(icon.image, x + 8, chipY + 5, 14, 14);
    } else {
      ctx.beginPath();
      ctx.arc(x + 15, chipY + chipHeight / 2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.font = `500 12px ${FONT}`;
    ctx.fillStyle = "#c7cbd1";
    ctx.fillText(label, x + 28, chipY + 16);
    x += width + 6;
  }

  for (const item of visible) {
    chip(item.label, colors[item.type] || FAINT, item.width, item.icon);
  }
  if (extra > 0) {
    const label = `+${extra}`;
    ctx.font = `500 12px ${FONT}`;
    chip(label, FAINT, 28 + ctx.measureText(label).width + 10);
  }
}

function drawPronounChip(ctx, text, x, baseline) {
  if (!text) return x;
  const font = `500 11px ${FONT}`;
  ctx.font = font;
  const label = fitText(ctx, text, font, 90);
  const width = ctx.measureText(label).width + 16;
  roundedRect(ctx, x, baseline - 14, width, 19, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fill();
  ctx.fillStyle = "#c7cbd1";
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, baseline);
  ctx.textAlign = "left";
  return x + width + 8;
}

function drawIdentity(ctx, model, badgeSources, clanSource) {
  const nameFont = `700 30px ${FONT}`;
  const name = fitText(ctx, model.displayName, nameFont, BIO_W);

  ctx.font = nameFont;
  ctx.textBaseline = "alphabetic";

  if (model.nameColors.length >= 2) {
    const width = Math.max(1, ctx.measureText(name).width);
    const gradient = ctx.createLinearGradient(NAME_X, 0, NAME_X + width, 0);
    model.nameColors.forEach((color, index) => {
      gradient.addColorStop(index / (model.nameColors.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = model.nameColors[0] || TEXT;
  }
  ctx.fillText(name, NAME_X, NAME_BASELINE);

  const handleFont = `500 15px ${FONT}`;
  const handle = fitText(ctx, model.handle, handleFont, 240);
  ctx.font = handleFont;
  ctx.fillStyle = MUTED;
  ctx.fillText(handle, NAME_X, HANDLE_BASELINE);

  let lineRight = NAME_X + ctx.measureText(handle).width;
  if (model.pronouns) {
    lineRight = drawPronounChip(ctx, model.pronouns, lineRight + 10, HANDLE_BASELINE - 1);
    lineRight += 2;
  } else {
    lineRight += 10;
  }

  if (model.clanTag) {
    const clanWidth = drawClanTag(
      ctx,
      model,
      clanSource,
      lineRight,
      HANDLE_BASELINE - 5,
    );
    if (clanWidth) lineRight += clanWidth;
  }

  const right = CARD.x + CARD.w - 36;
  let bottom = HANDLE_BASELINE + 8;
  const available = badgeSources.filter((source) => source?.image);

  if (available.length) {
    const badgeX = lineRight + 12;
    const badgeCenterY = HANDLE_BASELINE - 5;
    const needed = available.length * 24 - 4;

    if (needed <= right - badgeX) {
      const result = drawBadges(
        ctx,
        badgeSources,
        badgeX,
        badgeCenterY,
        right - badgeX,
        20,
        4,
      );
      bottom = Math.max(bottom, result.bottom);
    } else {
      const result = drawBadges(
        ctx,
        badgeSources,
        NAME_X,
        HANDLE_BASELINE + 22,
        BIO_W,
        20,
        4,
      );
      bottom = Math.max(bottom, result.bottom);
    }
  }

  return { bottom };
}

function cleanBio(text) {
  return String(text || "")
    .replace(/<a?:([^:>]+):\d+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|__|~~|`|\*|_/g, "")
    .replace(/\r/g, "")
    .trim();
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawBio(ctx, model, y = BIO_Y) {
  const text = cleanBio(model.bio);
  if (!text) return y;

  const font = `400 14px ${FONT}`;
  ctx.font = font;
  ctx.fillStyle = "#c9ccd1";
  ctx.textBaseline = "alphabetic";
  const lines = wrapText(ctx, text, BIO_W);
  const maxLines = 3;
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = shown[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > BIO_W) {
      last = last.slice(0, -1);
    }
    shown[maxLines - 1] = `${last}…`;
  }

  let lineY = y;
  for (const line of shown) {
    ctx.fillText(line, BIO_X, lineY);
    lineY += 19;
  }
  return lineY;
}

function drawMemberSince(ctx, model, y = MEMBER_SINCE_Y) {
  if (!model.createdAt) return;
  const date = new Date(model.createdAt);
  if (Number.isNaN(date.getTime())) return;
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  ctx.font = `500 12px ${FONT}`;
  ctx.fillStyle = FAINT;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`Member since ${label}`, BIO_X, y);
}

function drawDivider(ctx, y = DIVIDER_Y) {
  ctx.beginPath();
  ctx.moveTo(BIO_X, y);
  ctx.lineTo(CARD.x + CARD.w - 36, y);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function effectLayerLocalTime(layer, time) {
  if (!layer?.source) return null;
  const start = Math.max(0, layer.start || 0);
  if (time < start) return null;

  const duration = layer.source.duration || layer.duration || 0;
  if (!duration) return 0;

  const elapsed = time - start;
  if (!layer.loop) return elapsed < duration ? elapsed : null;

  const cycle = duration + Math.max(0, layer.loopDelay || 0);
  const local = elapsed % cycle;
  return local < duration ? local : null;
}

function drawEffect(ctx, layers, time, opacity = 1) {
  if (!Array.isArray(layers) || !layers.length || opacity <= 0) return;

  ctx.save();
  roundedRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.clip();
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (const layer of layers) {
    const local = effectLayerLocalTime(layer, time);
    if (local === null) continue;
    const image = sourceImage(layer.source, frameAt(layer.source, local));
    if (image) ctx.drawImage(image, CARD.x, CARD.y, CARD.w, CARD.h);
  }
  ctx.restore();
}

function drawFrame(ctx, source) {
  if (!source?.image) return;
  const pad = 18;
  drawContain(
    ctx,
    source.image,
    CARD.x - pad,
    CARD.y - pad,
    CARD.w + pad * 2,
    CARD.h + pad * 2,
  );
}

function frameAt(source, time) {
  if (!source?.frames?.length) return null;
  if (source.frames.length === 1) return source.frames[0];

  const local = source.duration > 0 ? time % source.duration : 0;
  let picked = source.frames[0];
  for (const frame of source.frames) {
    if (frame.start <= local) picked = frame;
    else break;
  }
  return picked;
}

function isAnimated(source) {
  return !!source?.frames && source.frames.length > 1;
}

function rememberCard(userId, card) {
  if (cardCache.size >= CARD_CACHE_MAX) {
    cardCache.delete(cardCache.keys().next().value);
  }
  cardCache.set(userId, { card, expires: Date.now() + CARD_CACHE_TTL });
}

function getCachedProfileCard(userId) {
  const entry = cardCache.get(userId);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    cardCache.delete(userId);
    return null;
  }
  return entry.card;
}

async function buildProfileCard(user, data = null, options = {}) {
  const model = makeModel(user, data, options);
  const effectAssets = model.effectSku ? await resolveEffectAssets(model.effectSku) : null;
  const effectStaticURL = model.effectURL || effectAssets?.staticURL || null;
  const effectLayers = effectAssets?.layers || [];
  const effectLayerPromises = effectLayers.map((layer) =>
    getAsset(layer.url, { animated: true, maxFrames: 48 }).catch(() => null),
  );

  const [banner, avatar, decoration, nameplateStatic, nameplateAnimated, effectStatic, frame, clanBadge] =
    await Promise.all([
      model.bannerURL ? getAsset(model.bannerURL, { animated: true }).catch(() => null) : null,
      model.avatarURL ? getAsset(model.avatarURL, { animated: true }).catch(() => null) : null,
      model.decorationURL
        ? getAsset(model.decorationURL, { animated: true }).catch(() => null)
        : null,
      model.nameplateURL ? getAsset(model.nameplateURL).catch(() => null) : null,
      model.nameplateAnimatedURL
        ? getAsset(model.nameplateAnimatedURL, { animated: true, maxFrames: 96 }).catch(() => null)
        : null,
      effectStaticURL ? getAsset(effectStaticURL).catch(() => null) : null,
      model.frameURL ? getAsset(model.frameURL).catch(() => null) : null,
      model.clanBadgeURL ? getAsset(model.clanBadgeURL).catch(() => null) : null,
    ]);

  const nameplate = isAnimated(nameplateAnimated) ? nameplateAnimated : nameplateStatic;
  const effectLayerSources = await Promise.all(effectLayerPromises);
  const effectRenderLayers = effectLayers
    .map((layer, index) => ({ ...layer, source: effectLayerSources[index] }))
    .filter((layer) => layer.source);
  if (!effectRenderLayers.length && effectStatic) {
    effectRenderLayers.push({
      source: effectStatic,
      start: 0,
      duration: 0,
      loop: true,
      loopDelay: 0,
      zIndex: 0,
    });
  }

  const [badgeSources, connectionIcons] = await Promise.all([
    Promise.all(
      model.badges.map((badge) =>
        badge.url ? getAsset(badge.url).catch(() => null) : null,
      ),
    ),
    Promise.all(
      model.connections.slice(0, 5).map((connection) =>
        connection.iconURL ? getAsset(connection.iconURL).catch(() => null) : null,
      ),
    ),
  ]);
  connectionIcons.forEach((icon, index) => {
    model.connections[index].icon = icon;
  });

  const animatedParts = [
    banner,
    avatar,
    decoration,
    nameplate,
    ...effectRenderLayers.map((layer) => layer.source),
  ].filter(isAnimated);
  const animated = animatedParts.length > 0;
  const duration = animated
    ? Math.min(
        MAX_ANIMATION_MS,
        Math.max(600, ...animatedParts.map((part) => part.duration || 0)),
      )
    : 0;
  const effectFadeMs = Math.min(700, duration * 0.18);

  function effectOpacity(time) {
    if (!duration) return 1;
    const local = ((time % duration) + duration) % duration;
    const amount = Math.min(1, local / effectFadeMs, (duration - local) / effectFadeMs);
    return Math.max(0, amount * amount * (3 - 2 * amount));
  }

  const background = createCanvas(WIDTH, HEIGHT);
  const backgroundCtx = background.getContext("2d");
  drawBackdrop(backgroundCtx, model);

  const foreground = createCanvas(WIDTH, HEIGHT);
  const foregroundCtx = foreground.getContext("2d");
  if (!isAnimated(avatar)) {
    drawAvatar(foregroundCtx, model, avatar, frameAt(avatar, 0));
  }
  const identity = drawIdentity(foregroundCtx, model, badgeSources, clanBadge);
  const bioY = Math.max(BIO_Y, identity.bottom + 22);
  const bioBottom = drawBio(foregroundCtx, model, bioY);
  const memberY = Math.max(MEMBER_SINCE_Y, bioBottom + 26);
  const connectionsY = memberY + 24;
  drawMemberSince(foregroundCtx, model, memberY);
  drawDivider(foregroundCtx, connectionsY + 44);
  drawConnections(foregroundCtx, model, connectionsY);

  const top = createCanvas(WIDTH, HEIGHT);
  const topCtx = top.getContext("2d");
  if (!isAnimated(decoration)) {
    drawDecoration(topCtx, model, decoration, frameAt(decoration, 0));
  }
  drawFrame(topCtx, frame);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  function compose(time) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(background, 0, 0);
    drawBanner(ctx, model, banner, isAnimated(banner) ? frameAt(banner, time) : null);
    ctx.drawImage(foreground, 0, 0);
    if (isAnimated(avatar)) {
      drawAvatar(ctx, model, avatar, frameAt(avatar, time));
    }
    drawNameplatePreview(
      ctx,
      model,
      nameplate,
      frameAt(nameplate, time),
      avatar,
      frameAt(avatar, time),
      decoration,
      frameAt(decoration, time),
      clanBadge,
    );
    if (isAnimated(decoration)) {
      drawDecoration(ctx, model, decoration, frameAt(decoration, time));
    }
    drawEffect(ctx, effectRenderLayers, time, effectOpacity(time));
    ctx.drawImage(top, 0, 0);
  }

  if (!animated) {
    compose(0);
    const card = {
      buffer: canvas.toBuffer("image/png"),
      name: `profile-${model.id}.png`,
      animated: false,
    };
    rememberCard(model.id, card);
    return card;
  }

  const frameCount = Math.max(
    10,
    Math.min(MAX_FRAMES, Math.round(duration / TARGET_FRAME_MS)),
  );
  const delay = Math.max(30, Math.round(duration / frameCount / 10) * 10);

  const renderedFrames = [];
  for (let index = 0; index < frameCount; index++) {
    compose(index * delay);
    renderedFrames.push(new Uint8ClampedArray(ctx.getImageData(0, 0, WIDTH, HEIGHT).data));
  }

  const uniqueFrames = [];
  for (const pixels of renderedFrames) {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && samePixels(previous.pixels, pixels)) {
      previous.delay += delay;
    } else {
      uniqueFrames.push({ pixels, delay });
    }
  }

  const palette = buildGlobalPalette(
    uniqueFrames.map((frame) => frame.pixels),
    [model.accent],
  );
  const colorCache = new Map();
  const gif = GIFEncoder();

  for (let index = 0; index < uniqueFrames.length; index++) {
    const frame = uniqueFrames[index];
    const indexed = applyStablePalette(frame.pixels, palette, colorCache);

    gif.writeFrame(indexed, WIDTH, HEIGHT, {
      palette: index === 0 ? palette : undefined,
      delay: frame.delay,
      repeat: index === 0 ? 0 : undefined,
    });
  }

  gif.finish();

  const card = {
    buffer: Buffer.from(gif.bytes()),
    name: `profile-${model.id}.gif`,
    animated: true,
  };
  rememberCard(model.id, card);
  return card;
}

module.exports = { buildProfileCard, getCachedProfileCard };
