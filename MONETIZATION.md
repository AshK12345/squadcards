# Slop Cards — Monetization Strategy

## Core Philosophy

Constraints should fall on the **sender**, not the recipient — blocking sharing hurts virality.
Rate limits only work with an **account system** (phone/Google auth); localStorage can be cleared.
Rarity boosts are a **gift mechanic** (you elevate someone else's card), not pay-to-win.

---

## Free Tier Constraints

| Resource | Free Limit |
|---|---|
| Pack sends | 3 / week |
| Cards in pool | 30 cards |
| Card creates | 5 / week |
| Reactions on received cards | 2 / week |

Free users can build and preview packs locally without limit — the scarce resource is the shareable send link.

---

## Paid Tier — Squad Pro (~$3.99/month)

| Feature | Free | Squad Pro |
|---|---|---|
| Pack sends | 3/week | Unlimited |
| Cards in pool | 30 | Unlimited |
| Card creates | 5/week | Unlimited |
| Reactions on received cards | 2/week | Unlimited |
| Premium pack themes | ✗ | ✓ |
| Premium reaction stamps | ✗ | ✓ |
| Rarity boosts | $1.99 each | $1.99 each |

Rarity boosts stay as a per-purchase item even for Pro subscribers — they're a meaningful one-time gesture, not something to commoditize.

---

## Revenue Ideas

### 1. Premium Pack Themes
Cosmetic pack wrapping — holographic, birthday, sports, seasonal editions.
Price: $0.99–$2.99 per theme.

### 2. Rarity Boosts
Pay to upgrade a specific card's rarity (e.g. bump a friend to Legendary).
Price: $1.99 per boost. Impulse-buy friendly — it's a gift for someone else.
The reveal animation should feel special to justify the purchase.

### 3. Animated / Foil Card Variants
Base cards are static. Unlock animated effects (spinning foil, particle burst on hover) per card or via subscription.

### 4. Squad Pro Subscription (~$3.99/month)
Classic freemium funnel. Unlocks limits above. Needs a meaningful user base before conversion rates matter.

### 5. Group Pack Drops
A paid organizer event — one person pays ~$4.99 to drop the same pack to an entire friend group simultaneously (birthdays, graduations, team end-of-season). Social occasion = high willingness to pay.

### 6. Physical Card Printing
Print-on-demand partnership. User pays ~$15–25 for a real printed card set mailed to them.
Zero inventory, high novelty, high margin.

### 7. Custom Card Backs
Default back is the SC logo. Sell custom backs (team colors, personal photo, school logo) as one-time unlocks (~$1.99) or included in Pro.

### 8. Hall of Fame Public Profiles
Free collections are private/link-only. Pay for a public browsable profile URL.
Useful for sports teams, classrooms, content creators.

### 9. Brand / Org Licensing (B2B)
White-label version sold to schools, sports clubs, companies.
End-of-season gift sets, employee cards, etc.
Price: $99–499/year per org. Higher ceiling than consumer.

### 10. Limited Edition Card Slots
Artificial scarcity — only N "secret rare" cards can exist per month globally.
First-come or auctioned. Drives urgency and eventual secondary market behavior.

---

## Received Card Customization ("Reactions")

Received cards are **locked** — the original is always preserved.
Customization adds a layer *on top*: stamps, captions, badges (roast, MVP crown, anniversary, etc.).

- Free: 2 reactions/week across all received cards
- Pro: unlimited reactions + premium stamp sets
- The weekly reset creates "which card do I spend my reaction on" engagement decisions

---

## Prerequisites Before Shipping Monetization

1. **Account system** — rate limits require server-side identity (phone number or Google SSO). localStorage is clearable and device-local.
2. **Backend for limits** — weekly quotas need to be enforced server-side, not client-side.
3. **Payment integration** — Stripe or similar for subscriptions and one-time purchases.

## Where to Start

**Highest immediate willingness to pay:** Physical printing (#6) and Group Pack Drops (#5) — tied to real-world occasions with clear emotional value.

**Right long-term engine:** Squad Pro subscription (#4) — but needs user base first.

**Quickest to build:** Rarity boosts and card reactions — self-contained features, no auth required for the UX (can gate with a paywall modal for now).
