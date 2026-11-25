// ==UserScript==
// @name         Ratatype Kid-Safe (No Ads, No Payment Prompts)
// @namespace    ratatype-kidsafe
// @version      1.2.0
// @description  Hides ads and anything asking for payment (Premium, upgrade, pricing, checkout) on Ratatype so kids can practice safely.
// @match        *://ratatype.com/*
// @match        *://*.ratatype.com/*
// @match        *://*.ratatype.ua/*
// @match        *://*.ratatype.pl/*
// @match        *://*.ratatype.it/*
// @match        *://*.ratatype.fr/*
// @match        *://*.ratatype.es/*
// @match        *://*.ratatype.de/*
// @match        *://*.ratatype.com.tr/*
// @match        *://*.ratatype.com.br/*
// @run-at       document-start
// @homepageURL  https://github.com/Werror/remove-annoying-ads/tree/main/ratatype
// @downloadURL  https://raw.githubusercontent.com/Werror/remove-annoying-ads/main/ratatype/ratatype-kidsafe.user.js
// @updateURL    https://raw.githubusercontent.com/Werror/remove-annoying-ads/main/ratatype/ratatype-kidsafe.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const DEBUG = false;
  const HIDDEN_ATTR = 'data-kidsafe-hidden';
  const log = (...a) => DEBUG && console.log('[kidsafe]', ...a);

  // ---- 1. Never let kids land on payment pages ---------------------------
  const PAYMENT_PATH = /\/(ratatype-plus[\w-]*|manage-subscription|premium|plus|black-friday|cyber-monday|sale|deals?|offers?|promo|spotlight|pricing|prices?|plans?|checkout|payment|pay|subscribe|subscription|upgrade|billing|buy|purchase|order|cart)(\/|$|\?|#)/i;
  const PAYMENT_HOST = /(paddle\.com|stripe\.com|paypal\.|fastspring|2checkout|chargebee|recurly|braintree|checkout\.)/i;

  const isPaymentUrl = (url) => {
    try {
      const u = new URL(url, location.href);
      return PAYMENT_HOST.test(u.hostname) ||
        (/(^|\.)ratatype\.(com|ua|pl|it|fr|es|de|com\.tr|com\.br)$/i.test(u.hostname) && PAYMENT_PATH.test(u.pathname + '/'));
    } catch (e) { return false; }
  };

  const goHome = () => {
    const lang = (location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//i) || [])[1];
    location.replace(lang && !PAYMENT_PATH.test('/' + lang + '/') ? '/' + lang + '/' : '/');
  };

  if (isPaymentUrl(location.href)) { goHome(); return; }

  for (const fn of ['pushState', 'replaceState']) {
    const orig = history[fn];
    history[fn] = function (state, title, url) {
      if (url && isPaymentUrl(url)) { log('blocked nav', url); return; }
      return orig.apply(this, arguments);
    };
  }

  const origOpen = window.open;
  window.open = function (url) {
    if (url && isPaymentUrl(url)) { log('blocked popup', url); return null; }
    return origOpen.apply(this, arguments);
  };

  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href], [data-href]');
    const href = a && (a.getAttribute('href') || a.getAttribute('data-href'));
    if (href && isPaymentUrl(href)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      log('blocked click', href);
    }
  }, true);

  // Stop Bootstrap from opening payment popups at all (avoids leftover dark overlay).
  const PAY_MODAL_IDS = /^(buySubscription|discountModal|discountModalSignUp)$/;
  document.addEventListener('show.bs.modal', (e) => {
    const m = e.target;
    if (m && (PAY_MODAL_IDS.test(m.id) || /ratatype\s*plus|discount|% off|remove ads|subscription|payment/i.test(m.textContent || ''))) {
      e.preventDefault();
      log('blocked modal', m.id);
    }
  }, true);

  // ---- 2. Neutralise ad scripts ------------------------------------------
  try {
    const noopQueue = { push() {}, loaded: true, length: 0 };
    Object.defineProperty(window, 'adsbygoogle', { get: () => noopQueue, set() {}, configurable: false });
  } catch (e) { /* already defined */ }

  const AD_SRC = /(googlesyndication|doubleclick|googletagservices|adservice\.google|amazon-adsystem|adnxs|taboola|outbrain|criteo|pubmatic|rubiconproject|openx|media\.net|adform|smartadserver|yandex\.ru\/ads|an\.yandex|mc\.yandex|propellerads|popads|ezoic|mgid|adthrive|carbonads|buysellads)/i;

  // ---- 3. CSS: hide known ad / upsell containers immediately --------------
  const AD_SELECTORS = [
    'ins.adsbygoogle', '[class*="adsbygoogle"]', '[data-ad-slot]', '[data-ad-client]', '[data-ad]',
    '[id^="google_ads"]', '[id^="div-gpt-ad"]', '[id*="gpt-ad"]', '[class*="gpt-ad"]',
    'iframe[src*="googlesyndication"]', 'iframe[src*="doubleclick"]', 'iframe[id^="google_ads_iframe"]',
    'iframe[src*="amazon-adsystem"]', 'iframe[src*="taboola"]', 'iframe[src*="outbrain"]',
    '[id*="taboola"]', '[class*="taboola"]', '[id*="outbrain"]', '[class*="outbrain"]',
    '[class~="ad"]', '[class~="ads"]', '[class~="advert"]', '[class*="advertis"]', '[id*="advertis"]',
    '[class^="ad-"]', '[class*=" ad-"]', '[class*="-ad "]', '[class$="-ad"]', '[class*="_ad_"]',
    '[id^="ad-"]', '[id^="ad_"]', '[id$="-ad"]', '[id$="_ad"]', '[id*="-ad-"]', '[id*="_ad_"]',
    '[class*="ad-banner"]', '[class*="ad-container"]', '[class*="ad-wrapper"]', '[class*="ad-slot"]',
    '[class*="adBanner"]', '[class*="adContainer"]', '[class*="AdContainer"]', '[class*="adWrapper"]',
    '[class*="banner-ad"]', '[class*="sponsor"]', '[id*="sponsor"]',
  ];
  // Checked in JS (with size/typing-area guards) rather than CSS, so a page-wide
  // wrapper class like "is-premium" can never blank the whole site.
  const UPSELL_CLASS_SEL = [
    '[class*="premium"]', '[class*="Premium"]', '[id*="premium"]', '[id*="Premium"]',
    '[class*="upgrade"]', '[class*="Upgrade"]', '[class*="paywall"]', '[class*="Paywall"]',
    '[class*="pricing"]', '[class*="Pricing"]', '[class*="upsell"]', '[class*="Upsell"]',
    '[class*="subscribe"]', '[class*="subscription"]', '[class*="Subscription"]',
    '[class*="checkout"]', '[class*="Checkout"]', '[class*="paddle"]', '[class*="stripe-"]',
  ].join(', ');
  const PAY_LINK_SELECTORS = [
    // Ratatype-specific: "Ratatype Plus" upsells and the Black Friday "discount tag hunt".
    '#discountHeaderLine', '#discountModal', '#discountModalSignUp', '#buySubscription',
    '#discountContainerHuntPage', '#discountItemsPlusPage', '#discountPercentPlusPage',
    '.js-discount-item', '.js-discount-badge', '.btn-discount-hunt', '[data-dh-widget-animated]',
    '[id^="RatatypePlus"]', '[id^="RemoveAds"]', '[id^="License_"]',
    'a[href*="ratatype-plus"]', 'a[href*="manage-subscription"]', 'a[href*="/certificate/purchase"]',
    'li:has(> a[href*="ratatype-plus"])',
    // Ratatype's own "house" promos (e.g. Black Friday / Ratatype Plus banners).
    'a[id^="house_"]', '[id^="house_"]', '[id*="BlackFriday"]', '[id*="CyberMonday"]',
    'a[href*="/plus"]', 'a[href*="black-friday"]', 'a[href*="cyber-monday"]', 'a[href*="/sale"]',
    'a[href*="/deal"]', 'a[href*="/offer"]', 'a[href*="/promo"]', 'a[href*="/spotlight"]',
    'a:has(img[src*="/spotlight/"])', 'picture:has(img[src*="/spotlight/"])', 'img[src*="/spotlight/"]',
    'a:has(img[alt*="Plus"])', 'a:has(img[alt*="Premium"])',
    'a[href*="/premium"]', 'a[href*="/pricing"]', 'a[href*="/price"]', 'a[href*="/plans"]',
    'a[href*="/checkout"]', 'a[href*="/payment"]', 'a[href*="/subscribe"]', 'a[href*="/subscription"]',
    'a[href*="/upgrade"]', 'a[href*="/billing"]', 'a[href*="/buy"]', 'a[href*="/purchase"]',
    'a[href*="paddle.com"]', 'a[href*="stripe.com"]', 'a[href*="paypal."]', 'a[href*="fastspring"]',
    'iframe[src*="paddle"]', 'iframe[src*="stripe"]', 'iframe[src*="checkout"]', 'iframe[src*="paypal"]',
  ];

  const HIDE_RULE = `{
      display: none !important; visibility: hidden !important;
      height: 0 !important; min-height: 0 !important; max-height: 0 !important;
      overflow: hidden !important; pointer-events: none !important;
    }`;
  // One rule per selector, so a selector an older browser doesn't support (e.g. :has)
  // can't invalidate all the others.
  const css = ['[' + HIDDEN_ATTR + ']'].concat(AD_SELECTORS.concat(PAY_LINK_SELECTORS).map((x) => 'body ' + x))
    .map((sel) => sel + ' ' + HIDE_RULE).join('\n') +
    '\nhtml.kidsafe-unlock, html.kidsafe-unlock body { overflow: auto !important; }' +
    // The fixed header is pushed down to make room for the (now hidden) discount banner.
    '\nbody:has(#discountHeaderLine) header#header { top: 0 !important; }';

  const injectStyle = () => {
    const parent = document.head || document.documentElement;
    if (!parent || document.getElementById('kidsafe-style')) return;
    const s = document.createElement('style');
    s.id = 'kidsafe-style';
    s.textContent = css;
    parent.appendChild(s);
  };
  injectStyle();

  // ---- 4. Text-based detection of payment prompts ------------------------
  // Strong phrases: hide wherever they appear (outside the typing exercise).
  const STRONG = new RegExp([
    '\\bpremium\\b', '\\bratatype\\s*plus\\b', '\\bblack\\s*friday\\b', '\\bcyber\\s*monday\\b', '\\bremove ads\\b', '\\bno ads\\b', '\\bad[- ]?free\\b', '\\bwithout ads\\b',
    '\\bfree trial\\b', '\\btry (it )?(for )?free\\b', '\\bstart (your )?trial\\b',
    '\\b(go|get|try|buy|become|join|upgrade to)\\s+(ratatype\\s+)?(premium|pro|plus)\\b',
    '\\bunlock (all|full|every|more)\\b', '\\bsubscribe now\\b', '\\bbuy now\\b', '\\bget access\\b',
    '\\bspecial offer\\b', '\\blimited offer\\b', '\\d+\\s?% off\\b', '\\bper (month|year)\\b',
    '\\/\\s?(mo|month|yr|year)\\b', '[$€£₴₽]\\s?\\d', '\\d\\s?(usd|eur|gbp|uah)\\b',
    // a few common translations of "premium / remove ads / subscribe"
    'преміум', 'премиум', 'без реклами', 'без рекламы', 'підписк', 'подписк', 'prémium', 'sin anuncios',
    'sans publicité', 'ohne werbung', 'bez reklam',
  ].join('|'), 'i');

  // Weak words: only act on them inside buttons, links, dialogs and banners.
  const WEAK = /\b(subscribe|subscription|upgrade|buy|purchase|checkout|pricing|price|plans?|pay|payment|billing|unlock|discount|offer|sale|pro)\b|оплат|купит|купи/i;

  const DIALOG_SEL = 'dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"], [class*="modal"], [class*="Modal"], [class*="popup"], [class*="Popup"], [class*="overlay"], [class*="Overlay"], [class*="lightbox"], [class*="drawer"]';
  const PROMO_SEL = '[class*="banner"], [class*="Banner"], [class*="promo"], [class*="Promo"], [class*="offer"], [class*="Offer"], [class*="sale"], [class*="discount"], [class*="toast"], [class*="snackbar"], [class*="notice"], [class*="callout"], [class*="cta"], [class*="CTA"]';
  const CLICKABLE_SEL = 'a, button, [role="button"], [role="link"], input[type="submit"], input[type="button"]';

  // Guess at the typing area so it is never touched.
  const PROTECT_SEL = '[class*="typing"], [class*="Typing"], [class*="trainer"], [class*="Trainer"], [class*="exercise"], [class*="Exercise"], [class*="keyboard"], [class*="Keyboard"], [class*="lesson-text"], [class*="mainTxt"], [id*="trainer"], [id*="typing"], textarea, [contenteditable="true"]';

  const isRoot = (el) => !el || el === document.body || el === document.documentElement ||
    el.tagName === 'MAIN' || el.id === 'root' || el.id === 'app' || el.id === '__next';

  // Like Element.closest, but ignores <html>/<body>/app roots (their classes such as
  // "modal-open" or "has-offer" must not make the whole page look like a popup).
  const closestNonRoot = (el, sel) => {
    for (let p = el; p && !isRoot(p); p = p.parentElement) if (p.matches(sel)) return p;
    return null;
  };

  const isTypingArea = (el) => {
    if (!el || closestNonRoot(el, DIALOG_SEL)) return false;
    if (el.closest(PROTECT_SEL)) return true;
    // Typing text is usually rendered as many tiny character/word spans.
    let p = el;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      if (p.children.length > 40) return true;
    }
    return false;
  };

  const isSafeToHide = (el) => {
    if (isRoot(el)) return false;
    if (el.querySelector && el.querySelector(PROTECT_SEL + ', input[type="text"]:not([name*="mail"])')) return false;
    const pos = getComputedStyle(el).position;
    if (pos === 'fixed' || pos === 'sticky') return true;
    const r = el.getBoundingClientRect();
    const vp = Math.max(1, innerWidth * innerHeight);
    return (r.width * r.height) / vp < 0.5;
  };

  let unlockScroll = false;

  const hide = (el, why) => {
    if (!el || el.hasAttribute(HIDDEN_ATTR)) return;
    el.setAttribute(HIDDEN_ATTR, why);
    log('hid', why, el);
  };

  const hideFixedAncestor = (el) => {
    let p = el;
    for (let i = 0; i < 10 && p && !isRoot(p); i++, p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === 'fixed' || pos === 'sticky') {
        if (isSafeToHide(p)) { hide(p, 'floating'); return true; }
        return false;
      }
    }
    return false;
  };

  const handleMatch = (el, strong) => {
    if (!el || el.closest('[' + HIDDEN_ATTR + ']') || isTypingArea(el)) return;

    // Outermost popup layer (wrapper + content), so no invisible overlay is left behind.
    let dlg = null;
    for (let p = el; p && !isRoot(p); p = p.parentElement) {
      if (p.matches(DIALOG_SEL) && isSafeToHide(p)) dlg = p;
    }
    if (dlg) {
      hide(dlg, 'dialog');
      unlockScroll = true;
      return;
    }
    if (hideFixedAncestor(el)) return;

    const promo = closestNonRoot(el, PROMO_SEL);
    if (promo && isSafeToHide(promo)) { hide(promo, 'promo'); return; }

    const btn = closestNonRoot(el, CLICKABLE_SEL);
    if (btn) { hide(btn, 'button'); return; }

    if (strong) {
      // Hide the smallest block that wraps the message (e.g. a card or paragraph).
      let block = el;
      while (block.parentElement && !isRoot(block.parentElement) &&
             block.parentElement.textContent.trim().length < 400 &&
             isSafeToHide(block.parentElement)) {
        block = block.parentElement;
      }
      if (isSafeToHide(block)) hide(block, 'text');
    }
  };

  const scanText = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue.trim();
      if (t.length < 2 || t.length > 300) continue;
      const el = n.parentElement;
      if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
      if (STRONG.test(t)) { handleMatch(el, true); continue; }
      if (WEAK.test(t) && closestNonRoot(el, CLICKABLE_SEL + ', ' + DIALOG_SEL + ', ' + PROMO_SEL)) handleMatch(el, false);
    }
    // Buttons/links labelled only via attributes (icons).
    root.querySelectorAll('[aria-label], [title], img[alt]').forEach((el) => {
      const t = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '';
      if (STRONG.test(t)) handleMatch(el, true);
    });
  };

  const scanElements = (root) => {
    root.querySelectorAll('script[src], iframe[src]').forEach((el) => {
      if (AD_SRC.test(el.src)) {
        if (el.tagName === 'IFRAME') hide(el.parentElement && isSafeToHide(el.parentElement) && el.parentElement.children.length === 1 ? el.parentElement : el, 'ad-iframe');
        else el.remove();
      } else if (el.tagName === 'IFRAME' && PAYMENT_HOST.test(el.src)) {
        hide(el, 'pay-iframe');
      }
    });
    root.querySelectorAll(UPSELL_CLASS_SEL).forEach((el) => {
      if (!el.closest('[' + HIDDEN_ATTR + ']') && !isTypingArea(el) && isSafeToHide(el)) hide(el, 'upsell-class');
    });
    root.querySelectorAll('a[href], [data-href]').forEach((a) => {
      const href = a.getAttribute('href') || a.getAttribute('data-href');
      if (href && isPaymentUrl(href)) handleMatch(a, false);
    });
  };

  // Empty backdrops / scroll locks left behind once a popup is hidden.
  const cleanupAfterPopups = () => {
    if (!unlockScroll) return;
    document.querySelectorAll('[class*="backdrop"], [class*="Backdrop"]').forEach((b) => {
      if (!isRoot(b) && !b.textContent.trim()) hide(b, 'backdrop');
    });
    document.documentElement.classList.add('kidsafe-unlock');
    document.body.classList.remove('modal-open', 'no-scroll', 'noscroll', 'overflow-hidden', 'is-locked');
  };

  const run = () => {
    if (!document.body) return;
    injectStyle();
    try {
      scanElements(document.body);
      scanText(document.body);
      cleanupAfterPopups();
    } catch (e) { log('scan error', e); }
  };

  // Block ad scripts as soon as they are inserted.
  const earlyObserver = new MutationObserver((muts) => {
    injectStyle();
    for (const m of muts) for (const node of m.addedNodes) {
      if (node.tagName === 'SCRIPT' && node.src && AD_SRC.test(node.src)) {
        node.type = 'javascript/blocked';
        node.remove();
      }
    }
  });
  earlyObserver.observe(document, { childList: true, subtree: true });

  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; run(); }, 150);
  };

  const start = () => {
    run();
    new MutationObserver(schedule).observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['class', 'style', 'href', 'src'],
    });
    // Catch timed popups that appear without DOM churn.
    setInterval(run, 2000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
