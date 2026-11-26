// ==UserScript==
// @name         YouTube 清爽版：去广告 + 原生字幕美化
// @name:en      YouTube Clean: Adblock + Native Caption Styler
// @namespace    https://github.com/TianYina/youtube-clean-subtitles
// @version      1.0.0
// @description  去除 YouTube 页面与视频广告，并直接美化原生 CC 字幕为透明描边歌词样式。
// @description:en  Remove YouTube ads and restyle native captions with a transparent outlined lyric look.
// @author       TianYina
// @license      MIT
// @match        *://*.youtube.com/*
// @exclude      *://accounts.youtube.com/*
// @exclude      *://www.youtube.com/live_chat_replay*
// @exclude      *://www.youtube.com/persist_identity*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

/*
 * Ad-blocking logic is based on youtube-adb 6.21 by iamfugui:
 * https://github.com/iamfugui/youtube-adb
 * Copyright (c) iamfugui, licensed under the MIT License.
 * Subtitle styling, rewrite and maintenance: TianYina, 2026.
 */

(function () {
  'use strict';

  const AD_STYLE_ID = 'ty-yt-adblock-style';
  const CAPTION_STYLE_ID = 'ty-yt-caption-style';
  const CAPTION_SETTINGS_KEY = 'ty-yt-native-caption-style-v1';
  const COLORS = ['#FFFFFF', '#FFE000', '#66FF99', '#66CCFF', '#FF66CC', '#FF8040'];
  const DEFAULT_CAPTION_STYLE = { fontSize: 42, color: '#FFFFFF' };

  const AD_SELECTORS = [
    '#masthead-ad',
    'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(.ytd-display-ad-renderer)',
    '.video-ads.ytp-ad-module',
    'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    '#related #player-ads',
    '#related ytd-ad-slot-renderer',
    'ytd-ad-slot-renderer',
    'yt-mealbar-promo-renderer',
    'ytd-popup-container:has(a[href="/premium"])',
    'ad-slot-renderer',
    'ytm-companion-ad-renderer',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot'
  ];

  const CAPTION_CSS = `
    .ytp-caption-window-container,
    .ytp-caption-window-container .caption-window,
    .ytp-caption-window-container .captions-text,
    .ytp-caption-window-container .caption-visual-line,
    .ytp-caption-window-container .ytp-caption-segment {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    .ytp-caption-window-container * {
      background-color: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
    }

    .ytp-caption-window-container .ytp-caption-segment {
      margin: 0 !important;
      padding: 0 !important;
      color: var(--ty-caption-color, #FFFFFF) !important;
      font-family: "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", sans-serif !important;
      font-size: var(--ty-caption-size, 42px) !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      letter-spacing: 0.02em !important;
      text-shadow:
        -2px -2px 0 #000,
         2px -2px 0 #000,
        -2px  2px 0 #000,
         2px  2px 0 #000,
        -2px  0   0 #000,
         2px  0   0 #000,
         0   -2px 0 #000,
         0    2px 0 #000,
         0    4px 8px rgba(0, 0, 0, 0.9) !important;
      -webkit-font-smoothing: antialiased;
    }
  `;

  let captionStyle = { ...DEFAULT_CAPTION_STYLE };
  try {
    captionStyle = {
      ...DEFAULT_CAPTION_STYLE,
      ...JSON.parse(localStorage.getItem(CAPTION_SETTINGS_KEY) || '{}')
    };
  } catch (_) {
    // Ignore invalid local settings.
  }
  if (!COLORS.includes(captionStyle.color)) captionStyle.color = '#FFFFFF';
  captionStyle.fontSize = Math.min(88, Math.max(20, Number(captionStyle.fontSize) || 42));

  function saveCaptionStyle() {
    try {
      localStorage.setItem(CAPTION_SETTINGS_KEY, JSON.stringify(captionStyle));
    } catch (_) {
      // Storage is optional.
    }
  }

  function injectStyle(id, css) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      const parent = document.head || document.documentElement;
      if (!parent) return;
      parent.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }

  function applyCaptionStyle() {
    document.documentElement.style.setProperty('--ty-caption-size', `${captionStyle.fontSize}px`);
    document.documentElement.style.setProperty('--ty-caption-color', captionStyle.color);
  }

  function ensureStyles() {
    injectStyle(
      AD_STYLE_ID,
      AD_SELECTORS.map((selector) => `${selector}{display:none!important}`).join('\n')
    );
    injectStyle(CAPTION_STYLE_ID, CAPTION_CSS);
    applyCaptionStyle();
  }

  let adWorkTimer = 0;
  let mutedBeforeAd = null;
  let adWasShowing = false;

  function closeAdblockPrompts() {
    document.querySelectorAll('ytd-popup-container').forEach((container) => {
      if (container.querySelector('a[href="/premium"]')) container.remove();
    });

    const hasEnforcementMessage = Boolean(
      document.querySelector('ytd-enforcement-message-view-model')
    );
    document.querySelectorAll('ytd-enforcement-message-view-model').forEach((message) => {
      message.remove();
    });

    document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((backdrop) => {
      if (backdrop.style.zIndex === '2201'
          || (hasEnforcementMessage && backdrop.hasAttribute('opened'))) {
        backdrop.remove();
      }
    });
  }

  function getVideo() {
    return document.querySelector('.ad-showing video')
      || document.querySelector('video.html5-main-video')
      || document.querySelector('video');
  }

  function handlePlayerAds() {
    const adShowing = Boolean(document.querySelector('.ad-showing'));
    const video = getVideo();

    if (video) {
      if (adShowing) {
        adWasShowing = true;
        if (mutedBeforeAd === null) mutedBeforeAd = video.muted;
        video.muted = true;

        const skipButton = document.querySelector(
          '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern'
        );
        if (skipButton) {
          try { skipButton.click(); } catch (_) { /* Ignore click errors. */ }
        }

        if (document.querySelector('.ad-showing')
            && Number.isFinite(video.duration) && video.duration > 0
            && video.currentTime > 0.25) {
          try { video.currentTime = video.duration; } catch (_) { /* Ignore seek errors. */ }
        }
      } else if (mutedBeforeAd !== null) {
        video.muted = mutedBeforeAd;
        mutedBeforeAd = null;
      }
    }

    if (!adShowing && adWasShowing) {
      adWasShowing = false;
      if (video && video.paused && video.currentTime < 1) {
        video.play().catch(() => {});
      }
    }

    closeAdblockPrompts();
  }

  function scheduleAdWork() {
    if (adWorkTimer) return;
    adWorkTimer = window.setTimeout(() => {
      adWorkTimer = 0;
      handlePlayerAds();
    }, 120);
  }

  function startAdHandling() {
    if (!document.body) return;
    ensureStyles();
    handlePlayerAds();

    const observer = new MutationObserver(scheduleAdWork);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('yt-navigate-finish', scheduleAdWork, true);
    document.addEventListener('yt-page-data-updated', scheduleAdWork, true);
  }

  window.addEventListener('keydown', (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target && target.closest && target.closest('input, textarea, [contenteditable="true"]')) return;

    if (event.code === 'KeyC') {
      event.preventDefault();
      const index = COLORS.indexOf(captionStyle.color);
      captionStyle.color = COLORS[(index + 1) % COLORS.length];
    } else if (event.code === 'BracketLeft' || event.code === 'BracketRight') {
      event.preventDefault();
      captionStyle.fontSize = Math.min(88, Math.max(20,
        captionStyle.fontSize + (event.code === 'BracketRight' ? 2 : -2)));
    } else if (event.code === 'Digit0') {
      event.preventDefault();
      captionStyle = { ...DEFAULT_CAPTION_STYLE };
    } else {
      return;
    }

    applyCaptionStyle();
    saveCaptionStyle();
  }, true);

  ensureStyles();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAdHandling, { once: true });
  } else {
    startAdHandling();
  }

  // YouTube is a single-page app and may replace the document head. Keep the
  // ad and caption styles present without relying on background timers.
  setInterval(ensureStyles, 2000);
})();
