# Form usability improvements

Implemented across public pages and the admin panel:

- Shared form guidance associates labels with controls, identifies required fields, provides inline validation feedback, clears errors as values are corrected, and clears stale errors on reset.
- Password fields have keyboard-accessible show/hide controls and persistent creation guidance. Signup and reset passwords enforce the eight-character minimum in the browser.
- Account forms retain bilingual labels and now use bilingual primary actions. Removed the unimplemented Remember me checkbox. Signup no longer references a missing verification button when email delivery fails.
- Profile password changes are grouped under an optional disclosure. Listing category editing offers choices instead of requiring users to know category identifiers.
- Listing posting explains that the contact email is public. Discussion creation explains its public audience and how to enter optional tags.
- Admin staff, event, listing, discussion, announcement, spotlight, and news controls share label and validation assistance. Modal save checks invalid fields before sending; errors retain the original action label. Announcement expiry explains local time and blank values.
- Reporting uses a labeled modal with a reason selector, optional details, inline server errors, retry, cancel, and focus restoration.
- Message replies and news search have accessible names. Donation wording explicitly describes an email request with no payment taken.
- Mobile account forms fit narrow screens; password controls and inputs have visible keyboard focus.

## Verification

- `npm run check`: 92 existing regression tests passed, server and browser TypeScript checks passed, client assets built.
- `node scripts/checks/forms.cjs`: Chromium checks at 390px and 1440px cover account, listing, discussion, date converter, news search, donation, and admin login pages; dynamic field guidance; admin event validation; report failure and retry.
- Browser requests are mocked: checks do not create accounts, listings, reports, or admin records. Real email delivery and database-backed submission are not exercised by this browser suite.
- To rerun browser checks, serve the repository locally on port 4173 (`python3 -m http.server 4173 --bind 127.0.0.1`), or set `FORMS_BASE_URL` to a running local site. Install Chromium with `npx playwright install chromium` if needed.
