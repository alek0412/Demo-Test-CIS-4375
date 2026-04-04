# Site draft — every page/tab (less redundant, based on old site)

This is a draft of how each page could look and what it would contain. Goals: fewer duplicate ideas, one clear place for each kind of info (like the old houstonbadminton.com but simplified).

---

## CLIENT SIDE (public + logged-in visitors)

**Nav (top):** Home | Book | My Bookings | Membership | More | Profile | [Log in]

*Rationale: "Reserve Court" + "Availability" become one flow under **Book**. "Alternate Services" becomes **More** (Minami, Training, Pickleball, About, etc.) so one tab holds all "other" stuff.*

---

### 1. **Home** (replaces "Dashboard" in nav — same file: Client_Dashboard.html)

**Purpose:** First stop. Answer "What is this?" and "What do I do first?"

**Above the fold:**
- Headline: e.g. "Houston Badminton Center — Fitness through fun and sport"
- Short line: "Book a court, join open play, or train with us."
- Two buttons: **Book a court** → Book page | **First time? Start here** → scroll or link to First time / Waiver

**First time visitor (from old site):**
- Bullet: "Complete a waiver (required for minors under 18)."
- Bullet: "Wear athletic clothing and non-marking shoes."
- Link: [Complete waiver] (could go to Waiver page or external form)

**How to play (from old site):**
- "Reserve a court with the link below, or drop in for court queuing — reservations not required for open play."
- Link: **Book a court** (→ Book page)
- Optional: "Popular times: weeknights after 8pm, weekends after 7pm."

**Quick links (icons or cards, from old site):**
- Waiver | Pricing | Facility | Contact | FAQs

**Footer (every client page):**
- Address: 10550 West Airport Blvd, Stafford, TX 77477
- Tel: 346-229-4921 | info@houstonbadmintoncenter.com
- © 2026 Houston Badminton Center. All rights reserved.

---

### 2. **Book** (single page: pick date → see availability → reserve)

**Purpose:** One place to reserve a court. Replaces separate "Reserve Court" and "View availability" tabs.

**Content:**
- Title: "Book a court"
- Subtitle: "Select a date and see available times."
- Date picker (or calendar)
- List of time slots by court (or simple "next available")
- Form: name, contact, optional notes
- Button: "Confirm reservation"
- Short note: "No reservation? Drop in for court queuing during open play."

**No separate "Availability" tab** — availability is step 1 of this page.

---

### 3. **My Bookings**

**Purpose:** See and manage my reservations (from old site: "View court reservations here").

**Content:**
- Title: "My bookings"
- List/cards: Upcoming (date, time, court, status)
- Past bookings (collapsed or "View past")
- Actions: Cancel, Reschedule (if you build it)
- Empty state: "No upcoming bookings. [Book a court]."

---

### 4. **Membership**

**Purpose:** Pricing + membership actions in one place (old site: Pricing + Contact → Membership Actions).

**Content:**
- Title: "Membership & pricing"
- Short intro: "Day pass or member — we've got options."
- Pricing: day pass, membership tiers (from old "Pricing")
- **Membership actions** (from old site): link or embed to renew, update, etc. (or "Contact us for membership actions" with link to Contact)
- Optional: "Popular times" blurb (from old site)

---

### 5. **More** (replaces "Alternate Services" — one tab for everything else)

**Purpose:** Minami Massage, Training, Pickleball, About, FAQs, so we don't clutter the main nav.

**Content (one scrollable page or sub-sections with anchors):**
- **Minami Massage** — short blurb + link or booking (from old "Minami Massage")
- **Training** — badminton training / coaches (from old "Training")
- **Houston Pickleball Center** — short blurb + link if separate (from old "Houston Pickleball Center")
- **Pickleball / Table tennis** — facility info (from old About → Pickleball/Table Tennis)
- **About** — "Houston's first dedicated badminton facility," mission, 12 courts, badminton/pickleball/table tennis (from old About)
- **Facility** — hours, what's here (from old About → Facility)
- **FAQs** — same questions as old site: member to play?, reserve court?, equipment?, come alone?, best times? (one FAQ section)
- **Contact** — address, phone, email, "We respond within 24 hours," optional form (from old Contact)
- Optional: **Events** / **Video archive** / **Grouper** as small links or subsections if you still need them

**Nav could say "More" or "Info"** — one tab, everything that isn't "book / my bookings / membership / profile."

---

### 6. **Profile**

**Purpose:** Account details and preferences (logged-in user).

**Content:**
- Title: "Profile" or "Account"
- Name, email, phone (view/edit)
- Preferences (e.g. notifications)
- Optional: link to Waiver status or "Complete waiver" if not done

---

### 7. **Waiver** (can be a page or a prominent link from Home / Book)

**Purpose:** From old site — "Complete a waiver; guardians for under 18."

**Options:**
- **Option A:** Dedicated page `Client_Waiver.html` with short copy + link to external waiver form (if you use one).
- **Option B:** No separate tab; strong "First time? Complete waiver" on Home and/or Book, linking to same form.
- **Recommendation:** One **Waiver** page (in nav under "More" or linked from Home) so there's a single URL to share.

---

### 8. **Contact** (optional standalone page)

**Purpose:** From old site — "Get in touch," form, hours.

**Options:**
- **Option A:** Only inside **More** (Contact section) — less redundancy.
- **Option B:** Separate "Contact" tab if you want it in the main nav.
- **Recommendation:** Keep Contact as a section on **More** and repeat address/phone in footer on every page. No separate Contact tab unless you really want it.

---

## CLIENT-SIDE PAGE LIST (summary)

| # | Nav label | Page / file           | What it is |
|---|-----------|------------------------|------------|
| 1 | Home      | Client_Dashboard.html  | Landing: hero, first-time, how to play, quick links |
| 2 | Book      | Client_Book.html       | One flow: date → availability → reserve (merge Reserve + Availability) |
| 3 | My Bookings | Client_Bookings.html | Upcoming + past reservations |
| 4 | Membership | Client_Membership.html | Pricing + membership actions |
| 5 | More      | Client_More.html       | Minami, Training, Pickleball, About, Facility, FAQs, Contact |
| 6 | Profile   | Client_Profile.html    | Account details + preferences |
| 7 | Waiver    | Client_Waiver.html (or section in More) | Waiver copy + link to form |
| — | (no separate Contact tab) | — | Contact = section on More + footer everywhere |

**Removed as separate tabs:** "Reserve Court" and "Availability" → merged into **Book**. "Alternate Services" → folded into **More**.

---

## ADMIN SIDE (staff only)

**Nav (sidebar):** Same as now; one place per job.

| # | Tab            | Page                    | What it is (no redundancy) |
|---|----------------|-------------------------|----------------------------|
| 1 | Dashboard      | Admin_Dashboard.html    | Overview: today's bookings, quick stats, shortcuts to Classes/Appointments/Clients |
| 2 | Classes        | Admin_Classes.html      | Manage classes (schedule, capacity) |
| 3 | Appointments   | Admin_Appointments.html | Appointments (view, add, edit, cancel) |
| 4 | Courses        | Admin_Courses.html      | Courses (programs, not one-off classes) |
| 5 | Rooms          | Admin_Rooms.html        | Courts/rooms and availability |
| 6 | Check In       | Admin_CheckIn.html      | Check-in guests/members |
| 7 | Clients        | Admin_Clients.html     | Client list, search, basic info |
| 8 | Point of Sale  | Admin_PointOfSale.html  | POS / sales |
| 9 | Insights       | Admin_Insights.html     | Reports, analytics |
| 10| Layout         | Admin_Layout.html       | Public + customer page layout (imagery, presentation) |
| 11| Services & Products | Admin_Services_Products.html | Catalog of services/products |
| 12| Staff          | Admin_Staff.html        | Staff accounts, roles |
| 13| Settings       | Admin_Settings.html     | Site/business settings |
| — | Login          | Admin_Login.html        | Admin login (no sidebar) |

**No change to admin tab count** — each tab is one job. Redundancy fix on admin is in **shared layout** (one sidebar/topbar, one script), not in merging tabs.

---

## WHAT CHANGES FROM CURRENT SETUP

**Client:**
- **Reserve Court** + **Availability** → one **Book** page (pick date → see slots → reserve).
- **Alternate Services** → **More** (Minami, Training, Pickleball, About, Facility, FAQs, Contact in one place).
- **Home** = Dashboard (rename in nav to "Home" so it matches old site and first-time visitors).
- Add **Waiver** as a page or clear section (from old site).
- Add **First time?** and **FAQs** content on Home and/or More (from old site).
- Footer on every client page: address, phone, email, © (from old Contact).

**Admin:**
- Keep all current tabs; reduce redundancy by using one shared header/sidebar/footer (e.g. includes or one inject script) so each page only holds that tab's main content.

---

## FILE RENAMES (if you follow this draft)

| Current                    | Proposed (for clarity)   |
|---------------------------|---------------------------|
| Client_Dashboard.html      | Keep (nav label "Home")   |
| Client_Reserve.html        | Merge into Client_Book.html |
| Client_Availability.html   | Merge into Client_Book.html |
| Client_Bookings.html       | Keep                      |
| Client_Membership.html     | Keep                      |
| Client_AlternateServices.html | Client_More.html (or keep name, change nav to "More") |
| Client_Profile.html        | Keep                      |
| (new)                     | Client_Waiver.html (optional) |
| (new)                     | Client_Book.html (Reserve + Availability combined) |

You can keep current filenames and only change nav labels and content; the table above is for a "full rename" pass if you want it.

---

This draft is what I'm thinking: one **Book** flow, one **More** tab for everything that isn't book/bookings/membership/profile, and content from the old site (waiver, first-time, FAQs, contact, pricing, membership actions) mapped to specific sections so nothing is duplicated across tabs.
