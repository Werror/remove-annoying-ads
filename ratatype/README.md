# Ratatype Kid-Safe

A Tampermonkey userscript for [Ratatype](https://www.ratatype.com/) that hides ads and anything asking for payment, so kids can practice typing safely.

## What it hides

- Third-party display ads (Google AdSense and common ad networks).
- Ratatype "house" promos: Black Friday / Ratatype Plus sidebar and footer banners (`house_*`).
- The top discount banner and the Black Friday "tag hunt" badges and buttons.
- Payment popups ("Go to payment", "Get -60%", "Sign up to collect 60% off"), which are blocked before they open.
- "Remove ads", "Ratatype Plus", upgrade, subscription and pricing links.
- Navigation to payment pages (Ratatype Plus, Black Friday, checkout, Paddle/Stripe/PayPal) redirects to the home page.

Typing lessons, the keyboard, and normal navigation are left intact.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the [install link](https://raw.githubusercontent.com/Werror/remove-annoying-ads/main/ratatype/ratatype-kidsafe.user.js) — Tampermonkey will offer to install it (and auto-update it).
   Or: Tampermonkey Dashboard → **+** → paste the file contents → save.
3. Reload ratatype.com.

Works on ratatype.com and its country sites (.ua, .pl, .it, .fr, .es, .de, .com.tr, .com.br).
