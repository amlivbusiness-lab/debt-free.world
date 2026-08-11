// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.29
// Base: v16.28 (sha256 94059cfec5384cdebfc2b79900e5d97b30ca43d049ae651feee4abff4bc04bb8)
//
// RAITA N · BRÄNDIASU JA TUOTENIMET. Ei logiikkaa, ei rakennetta, ei uusia
// avaimia — vain asiakkaalle näkyviä nimiä. Jokainen kenttä, KV-avain,
// funktio, ympäristömuuttuja ja osoite on ennallaan; se on LASKETTU, ei
// luvattu: test_nimet.mjs (N-5, N-6) ja prove_regions_v16.29.mjs.
//
// Tämä otsikko ei luettele vanhoja nimiä, uusia tuotenimiä eikä suojattuja
// tunnisteita. Se on tarkoituksellista: tämä tiedosto on niiden sääntöjen
// ALAINEN, ja luettelo tässä vääristäisi juuri ne laskennat jotka todistavat
// passin oikeaksi. Täydellinen luettelo on kahdessa paikassa, jotka eivät ole
// sääntöjen alaisia:
//     N_passi_muistiinpanot.md   — mitä muuttui, rinnakkain, ja miksi
//     test_nimet.mjs EXCEPTIONS  — jokainen sallittu poikkeus nimeltä
//
// MIKSI TÄMÄ PASSI OLI TARPEEN
//   Maksullisen tuotteen vanha nimi oli englanniksi perintätoimialan
//   vakiotermi: velkoja perii saatavansa. Tuote oli siis nimetty velkojan
//   näkökulmasta ja veti hakukoneissa väärää yleisöä. Uusi nimi lupaa
//   saattamisen, ei lopputulosta — ja 90 päivän saattaminen on ainoa asia
//   jonka voimme varmasti toimittaa.
//
// PYSYVÄ SÄÄNTÖ, jota test_nimet.mjs valvoo jokaisen tulevan passin yhteydessä:
//   velattomuutta tarkoittava englanninkielinen sanapari saa esiintyä VAIN
//   osana brändinimeä. Poikkeukset on nimetty test_nimet.mjs:ssä, eivät tässä.
//
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.28
// Base: v16.27.1 (sha256 aed493ba57372eb2018cdbf9d7a8c2438290dabc3e09e9656f6eddc9b951fa22)
// TRACK R · R1 — the encrypted KV snapshot. Additive. Nothing above the
// v16.27 header below is reordered, and exactly two existing lines of logic
// change: a third cron branch in scheduled(), and one guarded call at the top
// of runSeasonSweep.
//
// WHY THIS PASS EXISTS
//   MEMBER_TOKENS is today the only place member records, seasons, documents
//   and the seven-year payment receipts exist. This file contained exactly one
//   MEMBER_TOKENS.list() before this pass and its prefix was 'feedback:'. If
//   the namespace is lost, it is lost. Customers today: zero. That is the
//   reason to build this now rather than later.
//
// WHAT WAS ADDED
//   (1) runKvBackup(env) — one daily snapshot of the whole namespace, sealed
//       with a public key and written to Backblaze B2. Cron "0 4 * * *", one
//       hour after the season sweep so the snapshot is taken AFTER the purge
//       and never mid-run.
//   (2) cmpEncryptSnapshot() — AES-256-GCM under a random 256-bit session key,
//       the session key wrapped with RSA-OAEP/SHA-256 against a 4096-bit
//       PUBLIC key held in env.R1_PUBLIC_KEY (SPKI, base64).
//       THE PRIVATE KEY IS NOWHERE IN CLOUDFLARE. Not a secret, not a var, not
//       in this file. A compromised Cloudflare account must not be able to
//       read the snapshots, and it cannot: this file has no import of a
//       private key and no reverse operation anywhere in it. The region proof
//       asserts that as a property of the source, not as a claim in a comment.
//       R1_PUBLIC_KEY is an ordinary environment variable and not a secret,
//       because a public key is public by definition.
//   (3) cmpUploadToB2() — B2's NATIVE three-call API (authorize -> get upload
//       url -> upload). The S3-compatible surface would need AWS SigV4 signing,
//       which is hundreds of lines of avoidable code inside a Worker.
//       The application key is scoped to one bucket and holds writeFiles ONLY:
//       no listFiles, no readFiles, no deleteFiles. A compromised Worker can
//       neither read nor destroy an earlier snapshot. This code NEVER deletes
//       a snapshot; the 30-day window is a B2 lifecycle rule, which is a
//       bucket setting and not code.
//   (4) runKvBackupHeartbeatCheck(env) — the two crons watch each other. The
//       backup writes OUTCOMES:'r1:last_success' on success, with no TTL; the
//       03:00 sweep reads it first and mails an alert when it is missing or
//       older than 36 hours. A backup that stopped quietly is worse than no
//       backup, because it manufactures confidence. The check is wrapped at
//       its call site and can neither stop the sweep nor change what it
//       returns.
//
// TWO DECISIONS THAT ARE LOAD-BEARING AND EASY TO GET WRONG
//   · EXPIRATIONS TRAVEL WITH THE SNAPSHOT. KV's get() does not return a TTL,
//     but list() returns `expiration` (unix seconds, absent when the key does
//     not expire) for every key. The snapshot stores it verbatim and the
//     restore computes expiration - now. Without this, restored records would
//     be either immortal or the wrong length, and seven-year receipts would be
//     indistinguishable from 90-day member records. This is the single most
//     important technical point in the pass.
//   · A PARTIAL SNAPSHOT IS FORBIDDEN. Above R1_MAX_KEYS the run ABORTS,
//     writes nothing to B2 and alerts. Same principle as §3.9's snapshot
//     gates in v16.24: do not clean, abort. A partial snapshot that looks
//     complete is worse than no snapshot. Today the namespace holds dozens of
//     keys; a sharded snapshot is its own pass, on the day the threshold gets
//     close, and not before.
//
// VALUES ARE COPIED AS BYTES. The snapshot never parses a KV value, never
// re-serialises one and never repairs one. A value that is not valid JSON must
// come back exactly as it went in.
//
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.27
// Base: v16.26 (sha256 80cdb83ed5051d4f95eac6f5d33d90084fcfbb4e3cfcf7a76e55b9d18b6f4a37)
// Six defects found by the FIRST REAL PURCHASE (2.8.2026) and its follow-up.
// One is P0 and it blocks DR_LIVE. Nothing else in this pass.
//
//   (1) P0 · THE PURCHASE EMAIL SKIPPED ONBOARDING. handleStripeWebhook built
//       the magic link as a hardcoded /member/?token=… with no onboarding test
//       at all, so every paying customer landed in the member area with zero
//       answers stored and no plan was ever produced. The same file already
//       does this correctly in two other places (/member/create-free and
//       /member/request-magic-link); this was the third door.
//       The test is `debt_recovery_plan`, NOT `onboarding_complete`, and the
//       difference is load-bearing: the FREE form also sets onboarding_complete
//       to true, so a Path A customer (free -> paid) would have been sent
//       straight into the paid member area, where member/index.html renders
//       member_plan — the FREE plan — inside the product they paid 19 € for,
//       with no error anywhere. debt_recovery_plan is written only by the
//       non-free branch of handleOnboardingSave, so it is the only field that
//       means "this person has done the the 90-Day Companion form".
//       The same wrong field was in use at /member/request-magic-link's PAID
//       branch. Same defect, another door; corrected in the same pass. The FREE
//       branch keeps onboarding_complete, which is the right field there
//       because the free form is what sets it.
//       DASHBOARD_LINK is written from the same string as the link, because
//       that attribute is the more durable damage: it is reused by every later
//       Brevo message (day 30, 60, 80), not just the one-off purchase email.
//   (2) STRIPE SHOWED THE WITHDRAWAL WAIVER TWICE, in two different wordings,
//       on one screen: the tickbox (TOS_CONSENT_MESSAGE), which is RECORDED,
//       and a custom_text[submit] line, which was recorded nowhere. The same
//       duplicate was removed from ecosystem.html on 2.8.2026 — this is the
//       very directive reference that was removed there, left behind in Stripe.
//       On the community (0 €) branch it was worse than redundant: consent_-
//       collection is deliberately not set there because Art. 16(m) has no
//       subject matter without a payment, so the sub-text asserted a waiver of
//       a refund right that does not exist. The line is deleted, not reworded.
//   (3) THE GRADUATION KIT FOOTER carried three defects at once: the canonical
//       retention sentence (§7.5) was absent from the one artefact the customer
//       keeps forever; "You paid 19 €" was untrue for Community Access; and
//       "We deleted our copy" was written in the past tense in a file that is
//       sent on day 83, seven days BEFORE the deletion it describes.
//   (4) THE MONTHLY ARCHIVE NEVER LEFT THE BUILDING. Brevo infers an
//       attachment's type from its filename extension and rejects an unknown
//       one; `.json` is not on its supported list. Cloudflare log 1.8.2026
//       06:31:00 UTC+3: "outcomes-archive failed archive email failed: 400".
//       The cron fired, the archive ran (164 ms), only the send was refused.
//       The extension becomes .txt; the CONTENT is still JSON.stringify.
//   (5) THAT ERROR MESSAGE CARRIED ONLY A STATUS CODE. Brevo's response body
//       names the field it rejected and would have made (4) a one-minute
//       diagnosis instead of a production investigation. Both send helpers now
//       append the body, clamped to ~300 characters, read defensively so that
//       a failure to read the body cannot replace the failure being reported.
//       The message PREFIXES are unchanged, and both still throw.
//   (6) /member/request-link WAS DEAD CODE. Verified 2.8.2026: the live
//       member/index.html calls /member/request-magic-link and never this
//       route. It also held the last uncorrected NaN pattern in the file: a raw
//       arithmetic floor over data.expires_at with a 3600 s lower bound and no
//       resolver call, on a record that may not carry the field at all. The
//       expression itself is not quoted here on purpose: the region proof
//       asserts ZERO occurrences of it in this file. The whole route block is
//       REMOVED rather than patched with cmpResolveMemberTtl: a correct
//       implementation of a route nobody calls is still a route nobody calls,
//       and a fourth login door is a fourth place for the next field mismatch
//       to hide. The address falls through to the existing 404.
//       The three header comments that mention the endpoint historically are
//       left in place — removing them would be tidying, so the string counter
//       does NOT go to zero and the proof asserts the ROUTE CONDITION and the
//       NaN EXPRESSION instead.
//
// NOT TOUCHED, and asserted so by the region proof: cmpResolveMemberTtl,
// cmpIsReceiptRecord, cmpPurgeMember, cmpBuildOutcome, runSeasonSweep,
// scheduled(), the normalisers and their tables, the k-anonymity gate,
// CMP_PILLAR_A, TOS_CONSENT_MESSAGE, the consent_collection setting,
// `const isPaidTier = data.tier !== 'free'`, sendMagicLinkEmail,
// sendFreeMagicLinkEmail, the 7-year receipt retention, the /api/chat-free
// Turnstile gate, /member/create-free's NEW-record 90-day TTL, and
// /member/validate's first_ip write.
//
// DELIBERATELY OUT OF SCOPE: the four type-checker notices (Date arithmetic
// and the two pattern-table tuple widenings). Zero runtime effect, and they
// sit inside functions this pass locks byte-for-byte. Their own pass.
//
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.26
// Base: v16.25 (sha256 cc3cf4ab36f3447e3f7ae5ac7c2e4e3febf28b231485cfa752e8cc1330599fe4)
// ONE defect, THREE call sites. Nothing else.
//
// A free account carries two clocks that can disagree: the KV record's
// expirationTtl, and data.expires_at inside the record. v16.23 built
// cmpResolveMemberTtl() to make one of them derive from the other and
// converted some of the call sites. Three were left on the old arithmetic.
// This pass finishes that work. The theme is a single sentence: every member
// -record TTL goes through the resolver.
//
//   (1) /member/create-free, EXISTING-account branch — was a hardcoded
//       90 * 24 * 60 * 60 while the record was written back unchanged, so
//       expires_at never moved. The KV entry outlived its own expiry, and
//       /member/validate — which reads expires_at, not the TTL — answered 401.
//       The member asked for a new link, got a new link, got 401 again, and
//       every attempt extended the lifetime of the record they could not reach.
//       The entry never fell out of KV. legal.html promises deletion on day 90;
//       the code did not deliver it.
//   (2) /member/request-magic-link — the same hardcoded 90 days on the same
//       write-back, reached by the same member from the other login form.
//   (3) /onboarding/save — computed the TTL raw and guarded the write with
//       `ttlRemaining > 0`. On a record with no expires_at that is NaN > 0,
//       i.e. false; on a record whose clock has passed it is negative. The
//       write was skipped and the endpoint still answered 200 {ok:true}. The
//       member completed a seven-step form, saw success, and the answers were
//       never stored. The `if` guard is REMOVED, not adjusted:
//       cmpResolveMemberTtl never returns below 60, so the condition can only
//       be true, and leaving it would tell a later reader that the write is
//       still allowed to be skipped. That deleted line is the only removal in
//       this pass and the region proof names it.
//
// PM DECISION (locked 30.7.2026): retention is 90 days from account creation
// or purchase, FIXED. Logging in does not extend it. This supersedes Master
// File OSA 9's earlier "90 days from last login".
//
// The three belong together. (1) and (2) mean an expired record stops existing,
// which makes the negative branch of (3) unreachable and leaves only the
// missing-expires_at case, which the resolver already answers correctly. Any
// one of them alone leaves a hole open.
//
// DELIBERATELY NOT DONE, so the next reader does not mistake it for an
// oversight: no early return for an expired record at either login endpoint.
// That is a behaviour decision waiting on the free path's exit-route spec.
// Line 577 (create-free's NEW record) keeps its fresh 90 days and is guarded
// byte-for-byte by the region proof — it is the one place where a literal 90
// days is correct, because expires_at is written from the same constant
// eleven lines below it.
//
// NOT TOUCHED, and asserted so by the region proof: cmpResolveMemberTtl and
// cmpIsReceiptRecord themselves, cmpPurgeMember, cmpBuildOutcome,
// runSeasonSweep, scheduled(), the normalisers, the k-anonymity gate, the
// consent implementation, CMP_PILLAR_A, the isPaidTier destination logic, the
// mail-template selection, and the 7-year receipt retention.
//
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.25
// Base: v16.24 (sha256 3dab459c1458c701b19bff711bff2f42df6ed0a8620d681e46bfc5e3c2d492a4)
// Implements API-KONTRAKTI rev 1.4 (29.7.2026). The contract wins on conflict.
// Four corrections, and nothing else:
//   (1) /member/request-magic-link — the EMAIL TEMPLATE now follows the tier,
//       the way the destination already did (§4, rev 1.4). A paying customer
//       was still being sent sendFreeMagicLinkEmail(), whose body reads "No
//       payment card. No subscription. Always free." — a false claim about the
//       19 € product they had just bought. tier !== 'free' -> sendMagicLinkEmail();
//       tier === 'free' -> sendFreeMagicLinkEmail(), unchanged. The destination
//       expression, the two receipt branches and the Brevo call are untouched.
//   (2) the Tier-2 normalisers (§3.1 rev 1.4, no longer provisional). Two
//       defects, both found by running v16.24 against the live forms:
//         · "Couple, no children" resolved to `couple_children`, because the
//           pattern table saw the word "children" and had no notion of the
//           negation "no children". That is a VALID BUT WRONG value — worse
//           than `unknown`, because a gap is visible in the data and a
//           misclassification is not, and the source data is deleted at day 90
//           so it cannot be repaired afterwards. Negation is now resolved
//           BEFORE any positive match, generically, for any "no …" form.
//         · "On parental leave" resolved to `unknown`. `parental_leave` is now
//           a §3.3 value in its own right — not `other` — and is in the set
//           cmpBuildOutcome will accept.
//       Both normalisers also gained an EXACT table of the form's own option
//       strings (§3.1, read verbatim from both live forms), consulted before
//       the pattern table. The form values no longer depend on a pattern that
//       "probably matches". The pattern table survives underneath it as the
//       fallback for legacy and free-text values. The output side is still a
//       closed allowlist: every return path, including the exact table, is
//       filtered through CMP_HOUSEHOLD_VALUES / CMP_EMPLOYMENT_VALUES, so no
//       input of any shape can produce a value §3.3 does not permit.
//   (3) cmpPurgeMember — the receipt key is now
//       receipt:{memberId}:{stripe_session} (§2.5 rev 1.4). memberId is derived
//       from the email address and §2.5 deliberately lets a customer come back
//       and buy another season; under one key per member the second purge would
//       overwrite the first season's payment receipt — precisely the 7-year
//       accounting record this structure exists to protect. Zero receipts exist
//       in production (verified 29.7.2026), so there is no migration.
//       Retrieval is unchanged in kind: list({ prefix: 'receipt:' + memberId })
//       returns every receipt for that address.
//       stripe_session missing or null — which no webhook branch can currently
//       produce, since both write session.id — falls back to the DETERMINISTIC
//       suffix `nosession-{season_start epoch ms}`: unique per season, stable
//       across a retried sweep so a partial failure cannot duplicate a receipt,
//       and self-announcing in a key listing. The purge still proceeds: a
//       transient fault (KV down) defers to tomorrow, a permanent data state (a
//       field that is absent) proceeds and is counted. Day-90 erasure of
//       personal data is never blocked by a missing accounting field.
//   (4) runSeasonSweep — t0.receipts_without_session, a counter for (3). Zero
//       is the expected value. The T-7 / T-1 / T-0 order, the outcome-before-
//       purge order and every existing counter are untouched; this pass adds
//       one field to the result object and one increment.
//
// NOT TOUCHED, and asserted so by the region proof: companion logic, the
// sweep's T-7/T-1/T-0 ordering, the receipt-write-before-delete ordering,
// cmpBuildOutcome's allowlist structure, the k-anonymity gate, CMP_PILLAR_A,
// the consent implementation, and the v16.20 hardening.
//
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.24
// Base: v16.23 (sha256 05bfd0a0ea063df4b337aa14503cac2e79bdf1b16b797fc4ee45a8f64ee90c76)
// Implements API-KONTRAKTI rev 1.3 (29.7.2026). The contract wins on conflict.
// Touched regions, and nothing else:
//   (0) this header block
//   (1) /member/request-magic-link — destination is now TIER-AWARE (§4). It
//       previously ignored tier entirely, so a premium customer with unfinished
//       onboarding was sent to the FREE product's form. Nothing else in that
//       endpoint changes; the two v16.23 receipt branches stay as braces.
//   (2) /member/save-document — cmpResolveMemberTtl() instead of arithmetic on
//       a field that may be absent (§4 · NaN).
//   (3) /member/settings — same substitution, same reason.
//   (4) the fail-closed internal router — /internal/outcomes/* joins the block
//       that converts any store failure into 503 STORE_UNAVAILABLE.
//   (5) scheduled() — cron dispatch. "0 3 * * *" still runs the season sweep,
//       verbatim; the new "30 3 1 * *" runs the monthly OUTCOMES archive (§3.6).
//       They are separate cron invocations, so an archive failure cannot touch
//       the sweep. An unrecognised or absent cron string still runs the sweep.
//   (6) constants + Tier-2 collection helpers, appended after
//       cmpResolveMemberTtl(): CMP_HOUSEHOLD / CMP_CHILDREN / CMP_EMPLOYMENT
//       value sets and the three normalisers (§3.1, §3.3).
//   (7) cmpBuildOutcome — schema_version 2 and the three new fields (§3.2).
//       Still an explicit allowlist; the shape of the builder is unchanged.
//   (8) cmpPurgeMember — THE STRUCTURAL CHANGE OF THIS PASS (§2.5).
//   (9) new functions appended at the end of the file: the monthly archive and
//       the two /internal/outcomes/* handlers.
//
// (8) IS THE POINT OF THE PASS. Until now the payment + consent receipt lived
// in the SAME keyspace the token rotation rewrites — accounting data sitting in
// the middle of session data. Three endpoints could destroy it; v16.23 patched
// one of them, and any endpoint written later could reintroduce the bug. The
// receipt now lives under its own key and the purge does exactly three things:
//   1. WRITE   receipt:{memberId}:{stripe_session}  ttl = CMP_RECEIPT_TTL (7 y)
//   2. DELETE  the {tokenHash} record  entirely
//   3. DELETE  the email:{addr} pointer entirely
// The receipt is written BEFORE either delete, and cmpPut throws on failure, so
// a failed receipt write leaves the member record intact and the sweep counts a
// skipped purge. Fail closed.
//
// Consequences — the whole fault class disappears by construction, not by a
// special case in each endpoint:
//   /member/request-magic-link  no email: pointer -> unknown address -> the
//                               same bit-identical 200 {"ok":true}. Decision (a)
//                               of §2.6 now falls out of the STRUCTURE.
//   /member/create-free         no existing record -> a returning purged
//                               customer opens a new free account normally, and
//                               the receipt is never in the path. Intended: we
//                               do not close the door on someone who comes back.
//   /member/request-link,
//   /member/update,
//   /member/save-document,
//   /member/settings            no {tokenHash} record -> 401. No NaN states.
//
// cmpIsReceiptRecord(), cmpResolveMemberTtl() and the 410 SEASON_PURGED code
// are all KEPT. They cover v16.21-era survivors and act as braces. They are
// deliberately NOT removed on the grounds that the new structure makes them
// rarely reachable.
//
// Companion logic, the sweep's T-7/T-1/T-0 ordering, cmpBuildOutcome's
// allowlist structure, CMP_PILLAR_A, the consent implementation, the v16.20
// hardening and the Turnstile logic are untouched. Everything fails closed.
// A KV failure is a 503 STORE_UNAVAILABLE, never an empty 200.
//
// REQUIRES NEW CLOUDFLARE CONFIG — see the manual checklist in the pass notes:
//   a second cron trigger "30 3 1 * *" for the monthly archive (§3.6).
//   Without it the archive never runs; the sweep is unaffected.
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.23
// Base: v16.22 (sha256 1ba6db3022cd84263044ad2302472ca3ed74c013c99bf00e613f3f7dd38b0447)
// TWO CORRECTIONS AND NOTHING ELSE. Touched regions:
//   (0) this header block
//   (1) constants + two helpers, appended immediately after CMP_RECEIPT_TTL:
//       CMP_MEMBER_TTL, cmpIsReceiptRecord(), cmpResolveMemberTtl()
//   (2) /member/request-magic-link — two early-return branches for a purged
//       account, inserted after the record is parsed and before the token
//       rotation. The rotation rewrites the record under a FIXED 90-day TTL.
//       After the day-90 purge that key holds the payment + consent receipt:
//       exactly six fields, retention 7 years (contract §2.4). The email:
//       pointer also lives 7 years, so a purged customer CAN reach this path —
//       and the rewrite then replaced a 7-year retention with a 90-day one,
//       silently. Three months later, in a refund dispute, the only evidence
//       we hold ourselves would already be gone. Nothing is written now, so
//       the TTL is untouched; KV cannot re-stamp a value without rewriting it,
//       which makes "no write" the only way to preserve it.
//   (3) /member/update — 410 SEASON_PURGED for a purged account (contract §4,
//       the same answer /member/validate already gives), and the KV TTL is now
//       resolved explicitly instead of by arithmetic on a field the receipt
//       does not carry. Was: undefined - Date.now() = NaN -> Math.max(60, NaN)
//       = NaN -> KV rejects the whole call.
// Companion logic, sweep order, cmpBuildOutcome, CMP_PILLAR_A, the consent
// implementation, the six purge fields and the v16.20 hardening are untouched.
// Everything still fails closed.
//
// OPEN PM DECISION (deliberately not locked): a purged customer who asks for a
// magic link now receives NO email at all, and the endpoint still answers the
// same 200 {ok:true} it answers for an unknown address. Option (b) — a message
// telling them the season has ended — is one call inside the branch marked
// "PM DECISION POINT" below. See the pass notes for the argument.
//
// KNOWN, OUT OF SCOPE FOR THIS PASS, ESCALATED SEPARATELY: /member/create-free
// and /member/request-link reach the same receipt through the same email:
// pointer. /member/create-free rewrites it exactly as this path used to;
// /member/request-link fails closed by accident (NaN TTL, KV rejects) but
// answers a paying customer with a 500. Contract §4 puts /member/create-free
// out of this pass; neither was touched here.
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.22
// Base: v16.21 (sha256 fe472b156cda50ceab8b21ff880f020d5278cca0999f613feadbdfe1f20e57ff)
// FOUR CORRECTIONS AND NOTHING ELSE. Touched regions:
//   (1) /api/chat ALLOWED_MODELS — 'claude-sonnet-5' added. The next line
//       already fell back to sonnet-4-6 for anything unlisted, so this never
//       threw; it silently ran the wrong model. Fallback behaviour unchanged.
//   (2) cmpPurgeMember survivor narrowed to the payment + consent receipt ONLY
//       (six fields), retention 365 d -> 7 years to match the already-published
//       "Payment records — 7 years" line in legal.html. Email, country,
//       language, currency, tier, plan, created_at, account_state, settings and
//       emergency_card_checked no longer survive day 90 — legal.html promises
//       personal data is deleted then, and email and country ARE personal data.
//       Accepted side effect: sign-in no longer succeeds after day 90. That is
//       the intent, so /member/validate now returns a clean 410 SEASON_PURGED
//       for a receipt record instead of a half-empty dashboard (and before the
//       first_ip write, which would compute a TTL from an absent expires_at).
//   (3) CMP_PILLAR_A populated by DATA TRANSFER from the two verified
//       production structures — /support-data.js (window.SUPPORT_DATA) and
//       COUNTRY_LEGAL in member-free/index.html. 42 countries, 87 organisations,
//       42 legal notes. Nothing invented, nothing dropped, nothing reworded.
//   (4) cmpSendGraduationKitEmail no longer promises "your country's support
//       services" unconditionally. cmpBuildKitHtml now reports whether the
//       attachment actually contains them; when it does not, the email points
//       to the free generic resources on debt-free.world instead.
// Companion logic, sweep order, cmpBuildOutcome, the consent implementation and
// the v16.20 security hardening are untouched. Everything still fails closed.
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.21
// Base: v16.20 (sha256 904cee4a41705b59c4d2f0d9a072fa83fda6d58dea60fac6ac329c20920416e8)
// Implements API-KONTRAKTI rev 1.0 (28.7.2026) §1–§5 — Recovery Companion,
// Malli C season clock, and the Tier-2 anonymous outcome row.
// ADDITIVE ONLY. No pre-existing statement was rewritten, renamed or reordered.
// Touched regions, and nothing else:
//   (a) this header
//   (b) new constants block after COMMUNITY_COUPON_MAP
//   (c) new routes inserted before the 404 fallback in fetch()
//   (d) /member/validate — one new `season` field + the block that computes it
//   (e) /stripe-webhook — one cmpCreateSeason() call in EACH of the two branches
//   (f) scheduled() added to the default export
//   (g) new functions appended after the existing token helpers
// REQUIRES NEW CLOUDFLARE CONFIG — see the deploy checklist in the handoff:
//   KV binding OUTCOMES (new namespace) + cron trigger "0 3 * * *".
//   Without the OUTCOMES binding the sweep writes no outcome row and therefore
//   purges nothing. That is the intended fail-closed behaviour.
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.20
// Changes from v16.19:
//   - SECURITY (AI cost abuse): /api/chat-free now REQUIRES a passing Turnstile
//     check (or a recent verified-IP cache hit). Previously it verified only IF a
//     token was present, so a bot omitting the cf-turnstile-response header
//     bypassed it and reached Anthropic, throttled only by the 3/hr IP limit. Now
//     fails CLOSED: missing token or unset secret -> 403. Mirrors the report
//     endpoint's existing hard gate. Real users unaffected (frontend sends token;
//     verified IPs cached 300s).
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.19
// Changes from v16.18:
//   - FIX (Vaihe 0 · per-debt data honesty): handleOnboardingSave debts clamp now
//     preserves payment (0–9,999,999), enforcement (none|agency|court|unknown) and
//     secured (boolean). Previously the whitelist silently dropped these new
//     mini-form fields so they never reached KV. Deploy + human-verify KV
//     persistence BEFORE pushing the frontend bundle.
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.18
// Changes from v16.17:
//   - FIX (P0 close): handleCreateCheckout sets customer_email from the request
//     body when a valid email is supplied (upgrade path passes the logged-in
//     free-account email). Stripe pre-fills and locks the field, guaranteeing
//     the webhook's customer_details.email == the free record's email, so the
//     v16.17 carry-forward always hits. Direct-buy (no email) is unchanged.
// Changes from v16.16:
//   - FIX (P0 upgrade continuity): handleStripeWebhook now carries forward the
//     existing (free) member record's onboarding + plan + documents on premium/
//     community upgrade, instead of overwriting email:<addr> with a blank record.
//     NOTE: full P0 close still requires locking the checkout email to the free
//     account email (customer_email in create-checkout) — tracked separately.
//   - FIX (P0 ACT persistence): handleOnboardingSave non-free branch now stores
//     the full onboarding blob (mergedOnboarding) incl. act_creditor/act_goal/
//     act_action/act_worry/act_monthly_extra/act_tone. Previously these were
//     dropped (not in clamp whitelist, blob never stored), so the Recovery
//     companion received nothing.
//   - No auth/Stripe/Brevo-list/model changes.
// DEBT-FREE.WORLD — CLOUDFLARE WORKER v16.16
// Changes from v16.15:
//   - FIX (microcopy consistency): the two transactional emails
//     (sendFreeMagicLinkEmail, sendMagicLinkEmail) said "It takes about 2
//     minutes" — this contradicted the locked signup-free copy decision and
//     re-introduced the disappointment risk for anxious users when the form
//     runs long. Both now read "Most people finish in under 5 minutes — take
//     all the time you need." No logic touched.
//   - FIX (data consistency): webhook-created records now store created_at as
//     an ISO string, matching the free-tier path (was epoch ms). Read paths
//     tolerate both; only affects newly written records.
//   - FIX (comment accuracy — verified against code, not changelog): corrected
//     stale comments that v16.15 CLAIMED to fix but had not: (a) future Income
//     attr typo INCOME_DEBT_FREE_DATE → INCOME_FREE_DATE; (b) Community Access
//     comments referenced the pre-rename attribute COMMUNITY_ACCESS — the code
//     actually writes DEBT_COMMUNITY_MEMBER; (c) the "open gap — no Brevo list
//     for community" note was already resolved by List 12 in v16.13.
//   - NO functional/auth/Stripe/Brevo-list/model changes. Flagged-for-decision
//     items (model strings, /member/validate default tier, webhook idempotency
//     ordering) are listed in the review handoff, NOT changed here.
// Changes from v16.14:
//   - FIX (free-tier email): sendFreeMagicLinkEmail copy no longer uses the
//     banned product word; it now reads "build your personalised 90-DAY PLAN
//     plan" ("plan" is the only sanctioned term — never the r-word).
//   - FIX (brand): all email inline-CSS colours migrated to the locked brand
//     green 0f4d28 (the legacy 166534 is fully removed) across
//     sendFreeMagicLinkEmail, buildPlanEmailHtml, sendMagicLinkEmail and
//     /api/sendreport. No logic touched.
//   - FIX (comment only): the attribute-rename map below was corrected — the
//     right-hand (post-rename) names now match the code; the DATE lines
//     previously contained a typo and two X-to-X non-renames.
// Changes from v16.13 (carried forward):
//   - RENAMED (Brevo contact attributes): all attribute names are now
//     product-scoped so Debt and Income series are unambiguous in Brevo
//     contact views, automations, and future debugging.
//     PREMIUM              → DEBT_RECOVERY_MEMBER
//     PREMIUM_DATE         → DEBT_RECOVERY_DATE
//     FREE_TIER            → DEBT_FREE_MEMBER
//     FREE_TIER_DATE       → DEBT_FREE_DATE
//     COMMUNITY_ACCESS     → DEBT_COMMUNITY_MEMBER
//     COMMUNITY_ACCESS_DATE → DEBT_COMMUNITY_DATE
//     ONBOARDING_COMPLETE is shared infrastructure — unchanged.
//     Income Builder will use INCOME_FREE_MEMBER / INCOME_FREE_DATE /
//     INCOME_COMMUNITY_MEMBER / INCOME_COMMUNITY_DATE /
//     INCOME_BUILDER_MEMBER / INCOME_BUILDER_DATE when it ships.
// Changes from v16.12 (carried forward):
//   - FIX: listIds:[12] added to addCommunityAccessBrevoTag() —
//     Community Access completions now added to Brevo List 12
//     (Community Access Members_Debt). Previously attribute-only.
//   - RENAMED: addToBrevoList() → addToBrevoListDebt() — aligns function
//     name with product-scoped naming convention (debt/income suffix).
//     All call sites updated. List ID (7) and contact attribute names
//     (PREMIUM, DEBT_RECOVERY_DATE) unchanged — attribute rename requires
//     separate Brevo contact migration and automation review.
//   - COMMENTS: Brevo list references updated throughout to use confirmed
//     names: List 7 = The 90-Day Companion Members, List 8 = Free Tier Members,
//     List 12 = Community Access Members_Debt.
//   NOTE: Renaming List 7 in Brevo (Dashboard → Contacts → Lists) is a
//     manual UI action, not a code change — do this in Brevo directly.
// Changes from v16.11:
//   - NEW: POST /create-checkout-community — server-side 100% coupon applied
//     before Stripe session creation. No coupon ID, name, or discount
//     mechanism is ever shipped to the browser. Rate limit: 5/IP/hour,
//     separate from the paid checkout path (spec §3.3).
//   - NEW: COMMUNITY_COUPON_MAP — maps priceId to env var name holding that
//     product's coupon ID. One coupon per product per env var keeps
//     redemption tracking and Stripe Dashboard abuse caps fully independent
//     per product. Income Builder entry is stubbed — uncomment when that
//     priceId is confirmed.
//   - CHANGED: handleCreateCheckout() accepts options ({ community: true })
//     so paid and community flows share one code path for all parameters
//     (line items, redirect validation, waiver consent text, Stripe session
//     shape). Only the discount differs between the two.
//   - FIX (Stripe API constraint): allow_promotion_codes:true and discounts[]
//     cannot coexist in the same Checkout Session — Stripe returns
//     invalid_request_error. allow_promotion_codes is now set only for paid
//     flow; community flow uses discounts[0][coupon] only.
//   - FIX (webhook tier integrity): handleStripeWebhook now branches on
//     session.amount_total === 0. Zero-amount sessions receive
//     tier:'community_access' in KV and a DEBT_COMMUNITY_MEMBER Brevo attribute,
//     and are NOT added to Brevo List 7 (premium). Paid sessions unchanged.
//     Keeps revenue reporting in List 7 accurate and makes community-vs-paid
//     conversion measurable.
//   - NOTE (RESOLVED in v16.13): Brevo List 12 (Community Access Members_Debt)
//     is now assigned for the community_access tier. addCommunityAccessBrevoTag()
//     adds the contact to List 12 with DEBT_COMMUNITY_MEMBER + DEBT_COMMUNITY_DATE.
//     Kept here for history; the gap below no longer applies.
//   - NOTE (open gap — localisation): all transactional emails and the Stripe
//     withdrawal-waiver text are hardcoded in English. The waiver text requires
//     jurisdiction-specific native legal review before any multilingual checkout
//     is enabled. Localisation architecture is deferred to a separate work item.
// Changes from v16.11 (carried forward):
//   - FIX: WAITLIST_LISTS filled with confirmed Brevo list IDs
//     (Income Builder=9, Wealth Architect=10, Business Engine=11).
// Changes from v16.9 (carried forward):
//   - NEW: DASHBOARD_LINK attribute kept current on token rotation.
// Changes from v16.8 (carried forward):
//   - NEW: ONBOARDING_COMPLETE sync for Brevo automation branching.
//   - NEW: updateBrevoAttribute() helper.
// Changes from v16.7/internal (carried forward):
//   - NEW: POST /api/feedback, GET /api/feedback/list.
// Changes from v16.6 (carried forward):
//   - NEW: removeFromBrevoListFree() on premium conversion.
// Changes from v16.4 (carried forward):
//   - REMOVED: link_expires_at dead logic.
// Changes from v16.3 (carried forward):
//   - /member/create-free, /member/request-magic-link, /member/update NEW
//   - /onboarding/save: supports tier:'free'
//   - /member/validate: returns tier, onboarding, plan, emergency_card_checked
// ════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://www.debt-free.world',
  'https://debt-free.world',
];

const ALLOWED_PRICE_IDS = [
  'price_1TdqWbIuko2ODVfsv1xuAHsZ', // The 90-Day Companion 19€
];

// Community Access — one coupon per product in its own env var.
// Keeps redemption tracking and abuse caps separable per product in the
// Stripe Dashboard. Add Income Builder priceId here when it goes live;
// nothing else in this file changes.
const COMMUNITY_COUPON_MAP = {
  'price_1TdqWbIuko2ODVfsv1xuAHsZ': 'COMMUNITY_ACCESS_COUPON_ID_DEBT',
  // 'price_XXXXXXXXXXXXXXXXXXXXXXXX': 'COMMUNITY_ACCESS_COUPON_ID_INCOME', // Income Builder — uncomment when priceId confirmed
};

// ════════════════════════════════════════════════
// v16.21 · STRIPE CONSENT (contract §4 extension, P0)
// PROPOSED WORDING — NOT LOCKED. PM owns the final text; legal review advised.
// It must carry BOTH statutory elements of EU Directive 2011/83/EU Art. 16(m):
//   (a) the customer's express request that performance begin immediately, and
//   (b) the customer's acknowledgment that the 14-day withdrawal right is then lost.
// Stripe limit: 1200 characters, Markdown links and bold permitted.
// ════════════════════════════════════════════════
const TOS_CONSENT_MESSAGE =
  'I ask Debt-Free.World to start straight away, and I understand that once my plan is created I lose my 14-day right to cancel. I agree to the [Terms of Service](https://www.debt-free.world/legal.html#terms).';

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-member-token, x-internal-key, cf-turnstile-response',
    'Vary': 'Origin',
  };
}

async function isRateLimited(env, key, maxRequests, windowSeconds) {
  const kvKey = `rl:${key}`;
  try {
    const current = await env.MEMBER_TOKENS.get(kvKey);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= maxRequests) return true;
    await env.MEMBER_TOKENS.put(kvKey, String(count + 1), {
      expirationTtl: windowSeconds
    });
    return false;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── STRIPE CREATE CHECKOUT ──
    if (url.pathname === '/create-checkout' && request.method === 'POST') {
      return handleCreateCheckout(request, env, corsHeaders);
    }

    // ── STRIPE CREATE CHECKOUT — COMMUNITY ACCESS ──
    if (url.pathname === '/create-checkout-community' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `commaccess:ip:${ip}`, 5, 3600)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return handleCreateCheckout(request, env, corsHeaders, { community: true });
    }

    // ── STRIPE WEBHOOK ──
    if (url.pathname === '/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env, corsHeaders);
    }

    // ── ONBOARDING SAVE ──
    if (url.pathname === '/onboarding/save' && request.method === 'POST') {
      return handleOnboardingSave(request, env, corsHeaders);
    }

    // ════════════════════════════════════════════════
    // POST /api/feedback
    // ════════════════════════════════════════════════
    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `feedback:ip:${ip}`, 5, 3600)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      function clampFeedbackStr(val, maxLen) {
        if (typeof val !== 'string') return '';
        return val.slice(0, maxLen).replace(/[<>]/g, '');
      }
      const ALLOWED_ATTRIBUTION = ['first_name', 'initials', 'member_no_name', 'country_only', null, ''];
      const rawAttribution = body?.attribution;
      const attribution = ALLOWED_ATTRIBUTION.includes(rawAttribution) ? (rawAttribution || null) : null;
      const entry = {
        helped:           clampFeedbackStr(body?.helped, 2000),
        changed:          clampFeedbackStr(body?.changed, 2000),
        share_anonymized: Boolean(body?.share_anonymized),
        attribution,
        submitted_at:     new Date().toISOString(),
      };
      if (!entry.helped && !entry.changed) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const feedbackId  = generateToken().slice(0, 16);
      const feedbackKey = `feedback:${Date.now()}:${feedbackId}`;
      await env.MEMBER_TOKENS.put(feedbackKey, JSON.stringify(entry));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════
    // GET /api/feedback/list
    // ════════════════════════════════════════════════
    if (url.pathname === '/api/feedback/list' && request.method === 'GET') {
      const internalKey = request.headers.get('x-internal-key');
      if (!internalKey || internalKey !== env.INTERNAL_API_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const listResult = await env.MEMBER_TOKENS.list({ prefix: 'feedback:' });
      const entries = [];
      for (const key of listResult.keys) {
        const raw = await env.MEMBER_TOKENS.get(key.name);
        if (raw) {
          try { entries.push({ key: key.name, ...JSON.parse(raw) }); } catch { /* skip malformed */ }
        }
      }
      entries.sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));
      return new Response(JSON.stringify({ ok: true, count: entries.length, entries }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════
    // POST /member/create-free
    // ════════════════════════════════════════════════
    if (url.pathname === '/member/create-free' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `createfree:ip:${ip}`, 5, 3600)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email address.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (await isRateLimited(env, `createfree:email:${email}`, 3, 3600)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const existingHash = await env.MEMBER_TOKENS.get(`email:${email}`);
      if (existingHash) {
        const existingRaw = await env.MEMBER_TOKENS.get(existingHash);
        if (existingRaw) {
          const existingData = JSON.parse(existingRaw);
          if (existingData.tier === 'premium' || existingData.tier === 'debt_recovery' || existingData.tier === 'community_access') {
            return new Response(JSON.stringify({ exists: true, paid: true }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const newToken = generateToken();
          const newHash  = await hashToken(newToken);
          // ── v16.26 · CORRECTION 1 · the TTL follows the record's own clock ─
          // Was: 90 * 24 * 60 * 60, a fixed 90 days, while existingData is
          // written back UNCHANGED — expires_at is not moved. The KV entry
          // therefore outlived the expiry stored inside it, /member/validate
          // read the field and answered 401, and the next request for a link
          // extended the entry again. The record could not be reached and could
          // not expire. Retention is 90 days from account creation, FIXED
          // (PM 30.7.2026), so the REMAINING lifetime is what this write must
          // carry. Both puts below share it deliberately: the email: pointer
          // must not outlive the record it points at.
          const TTL      = cmpResolveMemberTtl(existingData);
          await env.MEMBER_TOKENS.put(newHash, JSON.stringify(existingData), { expirationTtl: TTL });
          await env.MEMBER_TOKENS.put(`email:${email}`, newHash, { expirationTtl: TTL });
          try { await env.MEMBER_TOKENS.delete(existingHash); } catch { /* non-critical */ }
          const isOnboarded = existingData.onboarding_complete === true;
          const destination = isOnboarded
            ? `https://www.debt-free.world/member-free/?token=${newToken}`
            : `https://www.debt-free.world/onboarding-debt-free.html?token=${newToken}`;
          try { await updateBrevoAttribute(email, env.BREVO_API_KEY, { DASHBOARD_LINK: destination }); } catch { /* non-critical */ }
          await sendFreeMagicLinkEmail(email, destination, env.BREVO_API_KEY);
          return new Response(JSON.stringify({ ok: true, exists: true, token: newToken, onboarding_complete: isOnboarded }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      const token      = generateToken();
      const tokenHash  = await hashToken(token);
      const now        = Date.now();
      const TTL        = 90 * 24 * 60 * 60;
      const memberRecord = {
        email,
        tier:                'free',
        created_at:          new Date(now).toISOString(),
        last_login:          new Date(now).toISOString(),
        onboarding_complete: false,
        plan:                'free',
        member_plan:         null,
        emergency_card_checked: [false, false, false],
        onboarding:          null,
        expires_at:          now + (TTL * 1000),
        settings: { companion_mode: 'guided', reminders: 'Yes' },
      };
      await env.MEMBER_TOKENS.put(tokenHash, JSON.stringify(memberRecord), { expirationTtl: TTL });
      await env.MEMBER_TOKENS.put(`email:${email}`, tokenHash, { expirationTtl: TTL });
      try { await addToBrevoListFree(email, env.BREVO_API_KEY); } catch { /* non-critical */ }
      const magicLink = `https://www.debt-free.world/onboarding-debt-free.html?token=${token}`;
      try { await updateBrevoAttribute(email, env.BREVO_API_KEY, { DASHBOARD_LINK: magicLink }); } catch { /* non-critical */ }
      await sendFreeMagicLinkEmail(email, magicLink, env.BREVO_API_KEY);
      return new Response(JSON.stringify({ ok: true, token }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════
    // POST /member/request-magic-link
    // ════════════════════════════════════════════════
    if (url.pathname === '/member/request-magic-link' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `reqmagic:ip:${ip}`, 5, 3600)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(email)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (await isRateLimited(env, `reqmagic:email:${email}`, 3, 3600)) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const existingHash = await env.MEMBER_TOKENS.get(`email:${email}`);
      if (existingHash) {
        const raw = await env.MEMBER_TOKENS.get(existingHash);
        if (raw) {
          const data = JSON.parse(raw);
          // ── v16.23 · CORRECTION 1 · never rewrite a purged account ────────
          // Everything below this point rotates the token by writing the record
          // back under a fresh hash with a FIXED 90-day TTL. Run over the
          // six-field payment + consent receipt that survives the day-90 purge
          // (§2.4), that write silently replaces a 7-year retention with a
          // 90-day one: the proof of payment and the proof that the withdrawal
          // waiver was collected are destroyed roughly 6.75 years early, and
          // well inside the window in which a refund dispute can still arrive.
          // The email: pointer lives 7 years too, so this is a reachable
          // production path, not a theoretical one.
          //
          // Writing nothing is what preserves the TTL. KV has no operation that
          // extends or re-stamps a value without rewriting it, so the only safe
          // edit to a receipt is no edit at all.
          if (cmpIsReceiptRecord(data)) {
            // No link is sent either. It could only carry the customer to
            // /member/validate, which answers 410 SEASON_PURGED for exactly
            // this record — an empty member area behind a working-looking link.
            // The response is the SAME 200 {ok:true} every other branch of this
            // endpoint returns (unknown address, bad JSON, rate limited), so the
            // endpoint still cannot be used to test whether an address exists.
            //
            // PM DECISION POINT — option (b), a plain "your season has ended"
            // message, is one send call here and nothing else. Deliberately not
            // taken in this pass: the address in a receipt is retained on an
            // accounting basis, not a contact basis, and mailing it for a
            // service reason is a different purpose than the one it is kept
            // for. Flipping this is a one-line change inside this branch.
            return new Response(JSON.stringify({ ok: true }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          if (data.season_purged_at) {
            // Purged, but not receipt-shaped: a v16.21-era survivor, which
            // nulled `onboarding` in place instead of dropping the key. No such
            // record exists in production — no purge has run yet — but if one
            // appeared, /member/validate answers 410 for it too, so a link
            // minted here could only land on a dead page. Same exit, different
            // reason; kept as its own branch so the receipt rule above stays a
            // pure structural test and this one stays a documented legacy case.
            return new Response(JSON.stringify({ ok: true }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          // ── v16.26 · CORRECTION 2 · the same defect, the other login form ──
          // Identical to correction 1: `data` is written back unchanged under a
          // fresh hash, so a fixed 90 days here reset the KV clock while
          // expires_at stayed where it was. This is the endpoint the free
          // member actually reaches from member-free/ and the free onboarding
          // page, and a paid member reaches it too — the resolver returns the
          // season's remaining lifetime for them, so a login cannot stretch a
          // 90-day season either. A receipt record, if one were ever reachable
          // here, keeps CMP_RECEIPT_TTL; the two branches above return before
          // this line, and this is the belt behind those braces.
          const TTL  = cmpResolveMemberTtl(data);
          const newToken = generateToken();
          const newHash  = await hashToken(newToken);
          await env.MEMBER_TOKENS.put(newHash, JSON.stringify(data), { expirationTtl: TTL });
          await env.MEMBER_TOKENS.put(`email:${email}`, newHash, { expirationTtl: TTL });
          try { await env.MEMBER_TOKENS.delete(existingHash); } catch { /* non-critical */ }
          // ── v16.24 · CORRECTION (a) · destination is TIER-AWARE (§4) ──────
          // Was: onboarding_complete ? member-free/ : onboarding-debt-free.html
          // — no tier test at all. A premium or community_access customer who
          // had not finished onboarding was therefore handed the FREE product's
          // form, which collects a different, smaller set of answers and lands
          // them in the free area. They paid 19 € for the 90-Day Companion.
          // The test is `data.tier !== 'free'`, exactly as the contract states.
          // A record with no tier at all is treated as non-free, which is the
          // same default /member/validate has always applied (`data.tier ||
          // 'premium'`); the only records the codebase writes without a tier
          // predate v16.13 and were premium.
          const isPaidTier = data.tier !== 'free';
          // ── v16.27 · CORRECTION 1, the other door · the PAID branch's onboarding
          // test was onboarding_complete, which the FREE form also sets. A Path A
          // customer who upgraded but never did the the 90-Day Companion form was
          // therefore sent to /member/, where member/index.html renders their FREE
          // plan inside the paid product. debt_recovery_plan is written only by
          // handleOnboardingSave's non-free branch, so it is the field that means
          // what this test needs to ask. Both buildFromExisting() and the seven-
          // step form write it through /onboarding/save, so there is no loop.
          // `isPaidTier` itself is unchanged (v16.24 §4). The FREE branch below is
          // unchanged and keeps onboarding_complete, which is correct there
          // because the free form is what sets it.
          const destination = isPaidTier
            ? (!!data.debt_recovery_plan
                ? `https://www.debt-free.world/member/?token=${newToken}`
                : `https://www.debt-free.world/onboarding-debt-recovery.html?token=${newToken}`)
            : (data.onboarding_complete
                ? `https://www.debt-free.world/member-free/?token=${newToken}`
                : `https://www.debt-free.world/onboarding-debt-free.html?token=${newToken}`);
          try { await updateBrevoAttribute(email, env.BREVO_API_KEY, { DASHBOARD_LINK: destination }); } catch { /* non-critical */ }
          // ── v16.25 · CORRECTION · the TEMPLATE follows the tier too (§4 rev 1.4) ─
          // v16.24 fixed where the link points and left the message body alone.
          // The body was sendFreeMagicLinkEmail(), which states "No payment
          // card. No subscription. Always free." To someone who paid 19 € for
          // The 90-Day Companion that is a false statement about the product they own,
          // sent by us, in writing. sendMagicLinkEmail() already exists and is
          // the message the Stripe webhook sends on purchase; it makes no free
          // claim of any kind. The test is the same `data.tier !== 'free'` the
          // destination uses, computed once above, so the link and the letter
          // can never disagree about which product this customer has.
          // The free branch is byte-for-byte the previous behaviour.
          if (isPaidTier) {
            await sendMagicLinkEmail(email, destination, env.BREVO_API_KEY);
          } else {
            await sendFreeMagicLinkEmail(email, destination, env.BREVO_API_KEY);
          }
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════
    // POST /member/update
    // ════════════════════════════════════════════════
    if (url.pathname === '/member/update' && request.method === 'POST') {
      const memberToken = request.headers.get('x-member-token');
      if (!memberToken || memberToken.length !== 64) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const tokenHash = await hashToken(memberToken);
      const raw = await env.MEMBER_TOKENS.get(tokenHash);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const data = JSON.parse(raw);
      // ── v16.23 · CORRECTION 2 · a purged account is not editable ──────────
      // Contract §4: /member/update on a purged record -> 410 SEASON_PURGED,
      // the same answer /member/validate already gives. Placed here, before the
      // expires_at check below, because the receipt carries no expires_at: that
      // check is falsy for it and it would otherwise fall straight through to a
      // write. cmpIsReceiptRecord(data) implies this condition; the wider
      // predicate is used so a v16.21-era survivor gets the same answer.
      if (data.season_purged_at) {
        return new Response(JSON.stringify({
          error: 'This season has ended and its data has been deleted.',
          code:  'SEASON_PURGED'
        }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (data.expires_at && Date.now() > data.expires_at) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const updated = { ...data, last_login: new Date().toISOString() };
      if (Array.isArray(body.emergency_card_checked) && body.emergency_card_checked.length === 3) {
        updated.emergency_card_checked = body.emergency_card_checked.map(v => Boolean(v));
      }
      // ── v16.23 · CORRECTION 2 · explicit TTL, never NaN ───────────────────
      // Was: Math.max(60, Math.floor((data.expires_at - Date.now()) / 1000)).
      // A record with no expires_at gave undefined - Date.now() = NaN, and
      // Math.max(60, NaN) = NaN, which KV rejects — the write failed and the
      // member's save died with it. cmpResolveMemberTtl() covers the three
      // cases explicitly and still returns a receipt's own 7-year TTL if one
      // ever reaches a write path from anywhere.
      const TTL = cmpResolveMemberTtl(data);
      await env.MEMBER_TOKENS.put(tokenHash, JSON.stringify(updated), { expirationTtl: TTL });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── MEMBER VALIDATE ──
    if (url.pathname === '/member/validate' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `validate:${ip}`, 10, 300)) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { token } = body;
      if (!token || token.length !== 64) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const tokenHash = await hashToken(token);
      const raw = await env.MEMBER_TOKENS.get(tokenHash);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const data = JSON.parse(raw);
      // ── v16.22 · purged season -> 410 SEASON_PURGED ──────────────────────
      // After the day-90 purge this key holds a payment + consent receipt, not
      // a member record. It must not authenticate anyone into a dashboard with
      // no plan, no country and no settings behind it. Returned here, before
      // the first_ip write below, because that write derives a KV TTL from
      // expires_at — a field the receipt deliberately no longer carries.
      if (data.season_purged_at) {
        return new Response(JSON.stringify({
          error: 'This season has ended and its data has been deleted.',
          code:  'SEASON_PURGED'
        }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (data.expires_at && Date.now() > data.expires_at) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const requestIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!data.first_ip) {
        const ttlRemaining = Math.max(60, Math.floor((data.expires_at - Date.now()) / 1000));
        await env.MEMBER_TOKENS.put(tokenHash, JSON.stringify({ ...data, first_ip: requestIp }), {
          expirationTtl: ttlRemaining
        });
      }
      // ── v16.21 (additive) · §4 season summary ──────────────────────────
      // One call gives the UI its routing. A premium/community member with no
      // season record (pre-v16.21 purchase) gets one created retroactively from
      // the account date. Deliberately non-throwing: /companion/state is the
      // fail-closed authority, and a KV blip here must never lock anyone out.
      let seasonSummary = null;
      try {
        const vTier = data.tier || 'premium';
        if (vTier !== 'free' && data.email) {
          if (data.season_purged_at) {
            seasonSummary = { phase: 'purged', day: null, days_left: 0 };
          } else {
            const vMemberId = await cmpMemberId(data.email);
            const vRaw = await env.MEMBER_TOKENS.get(`season:${vMemberId}`);
            let vSeason = null;
            if (vRaw) { try { vSeason = JSON.parse(vRaw); } catch { vSeason = null; } }
            if (!vSeason) {
              const rawStart = data.upgraded_at || data.created_at || null;
              vSeason = await cmpCreateSeason(
                env, data.email,
                vTier === 'community_access' ? 'community' : 'paid',
                rawStart
              );
            }
            if (vSeason && vSeason.purged_at) {
              seasonSummary = { phase: 'purged', day: null, days_left: 0 };
            } else if (vSeason) {
              const vPhase = cmpSeasonPhase(vSeason, Date.now());
              seasonSummary = { phase: vPhase.phase, day: vPhase.day, days_left: vPhase.days_left };
            }
          }
        }
      } catch { seasonSummary = null; }

      return new Response(JSON.stringify({
        email:               data.email,
        tier:                data.tier || 'premium',
        season:              seasonSummary,
        expires_at:          data.expires_at,
        created_at:          data.created_at,
        plan:                data.plan || 'premium',
        onboarding:          data.onboarding || null,
        onboarding_complete: data.onboarding_complete || false,
        member_plan:         data.member_plan || null,
        emergency_card_checked: data.emergency_card_checked || [false, false, false],
        firstname:           data.onboarding?.firstname || data.firstname || null,
        country:             data.onboarding?.country   || data.country   || null,
        language:            data.onboarding?.language  || data.language  || 'EN',
        currency:            data.onboarding?.currency  || data.currency  || 'EUR',
        employment:          data.onboarding?.employment|| data.employment|| null,
        household:           data.onboarding?.household || data.household || null,
        children:            data.onboarding?.children  ?? data.children  ?? null,
        income:              data.onboarding?.income    || data.income    || null,
        housing_cost:        data.onboarding?.housing_cost || data.housing_cost || null,
        other_costs:         data.onboarding?.other_costs  || data.other_costs  || null,
        extra_amount:        data.onboarding?.extra_amount || data.extra_amount || null,
        savings:             data.onboarding?.savings   || data.savings   || null,
        collections:         data.onboarding?.collections || data.collections || null,
        situation:           data.onboarding?.situation || data.situation || null,
        debts:               data.onboarding?.debts     || data.debts     || [],
        total_debt:          data.onboarding?.total_debt|| data.total_debt|| data.debt_total || null,
        debt_types:          data.onboarding?.debt_types|| data.debt_types|| null,
        debt_count:          data.onboarding?.debt_count|| data.debt_count|| null,
        barrier:             data.onboarding?.barrier   || data.barrier   || null,
        support_network:     data.onboarding?.support_network || data.support_network || null,
        confidence:          data.onboarding?.confidence ?? data.confidence ?? null,
        primary_goal:        data.onboarding?.primary_goal || data.primary_goal || null,
        own_words:           data.onboarding?.own_words || data.own_words || null,
        debt_recovery_plan:  data.debt_recovery_plan || data.member_plan || null,
        settings: {
          companion_mode: data.settings?.companion_mode || 'guided',
          reminders:      data.settings?.reminders      || 'Yes',
        },
        documents: Array.isArray(data.documents) ? data.documents : [],
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── /member/issue REMOVED ──
    if (url.pathname === '/member/issue') {
      return new Response('Not found', { status: 404 });
    }

    // ── /member/save-document ──
    if (url.pathname === '/member/save-document' && request.method === 'POST') {
      const memberToken = request.headers.get('x-member-token');
      if (!memberToken || memberToken.length !== 64) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const tokenHash = await hashToken(memberToken);
      const raw = await env.MEMBER_TOKENS.get(tokenHash);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const data = JSON.parse(raw);
      if (data.expires_at && Date.now() > data.expires_at) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const doc = body?.document;
      if (!doc || typeof doc.text !== 'string' || !doc.type) {
        return new Response(JSON.stringify({ error: 'Invalid document' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const ALLOWED_TYPES = ['letter', 'negotiation', 'update'];
      const safeDoc = {
        type:       ALLOWED_TYPES.includes(doc.type) ? doc.type : 'letter',
        title:      typeof doc.title === 'string'    ? doc.title.slice(0, 120).replace(/[<>]/g,'') : 'Document',
        creditor:   typeof doc.creditor === 'string' ? doc.creditor.slice(0, 80).replace(/[<>]/g,'') : null,
        subtype:    typeof doc.subtype === 'string'  ? doc.subtype.slice(0, 60).replace(/[<>]/g,'') : null,
        text:       doc.text.slice(0, 8000),
        created_at: new Date().toISOString(),
      };
      const documents = Array.isArray(data.documents) ? data.documents : [];
      documents.push(safeDoc);
      const trimmed = documents.slice(-50);
      // ── v16.24 · CORRECTION (b) · explicit TTL, never NaN (§4) ───────────
      // Was: Math.max(60, Math.floor((data.expires_at - Date.now()) / 1000)).
      // A record without expires_at gave undefined - Date.now() = NaN, and KV
      // rejects the whole call — the member's letter was silently not saved.
      const ttlRemaining = cmpResolveMemberTtl(data);
      await env.MEMBER_TOKENS.put(tokenHash, JSON.stringify({ ...data, documents: trimmed }), {
        expirationTtl: ttlRemaining
      });
      return new Response(JSON.stringify({ ok: true, count: trimmed.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── TOKEN BY SESSION ──
    if (url.pathname === '/member/token-by-session' && request.method === 'GET') {
      const sessionId = url.searchParams.get('session_id');
      if (!sessionId || sessionId.length < 10) {
        return new Response(JSON.stringify({ error: 'Invalid session_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const token = await env.MEMBER_TOKENS.get(`session:${sessionId}`);
      if (!token) {
        return new Response(JSON.stringify({ ready: false }), {
          status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ ready: true, token }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── /member/settings ──
    if (url.pathname === '/member/settings' && request.method === 'POST') {
      const memberToken = request.headers.get('x-member-token');
      if (!memberToken || memberToken.length !== 64) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const tokenHash = await hashToken(memberToken);
      const raw = await env.MEMBER_TOKENS.get(tokenHash);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const data = JSON.parse(raw);
      if (data.expires_at && Date.now() > data.expires_at) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const ALLOWED_COMPANION = ['guided', 'independent'];
      const ALLOWED_REMINDERS = ['Yes', 'No'];
      const newSettings = { ...data.settings };
      if (body.companion_mode !== undefined) {
        if (!ALLOWED_COMPANION.includes(body.companion_mode)) {
          return new Response(JSON.stringify({ error: 'Invalid value' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        newSettings.companion_mode = body.companion_mode;
      }
      if (body.reminders !== undefined) {
        if (!ALLOWED_REMINDERS.includes(body.reminders)) {
          return new Response(JSON.stringify({ error: 'Invalid value' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        newSettings.reminders = body.reminders;
      }
      // ── v16.24 · CORRECTION (b) · explicit TTL, never NaN (§4) ───────────
      // Same substitution and the same reason as /member/save-document above.
      const ttlRemaining = cmpResolveMemberTtl(data);
      await env.MEMBER_TOKENS.put(tokenHash, JSON.stringify({ ...data, settings: newSettings }), {
        expirationTtl: ttlRemaining
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════
    // /api/chat-free
    // ════════════════════════════════════════════════
    if (url.pathname === '/api/chat-free' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `chatfree:${ip}`, 3, 3600)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const turnstileToken = request.headers.get('cf-turnstile-response');
      const cfVerified = await env.MEMBER_TOKENS.get(`chatfree:verified:${ip}`);
      if (!cfVerified) {
        // MANDATORY bot check: /api/chat-free is unauthenticated and calls a paid AI.
        // Fail CLOSED — missing token or unset secret must reject, never bypass (was soft <= v16.19).
        if (!turnstileToken || !env.TURNSTILE_SECRET_KEY) {
          return new Response(JSON.stringify({ error: 'Bot check required. Please refresh and try again.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const tsVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: ip
          }).toString()
        });
        const tsResult = await tsVerify.json();
        if (!tsResult.success) {
          return new Response(JSON.stringify({ error: 'Bot check failed. Please try again.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        await env.MEMBER_TOKENS.put(`chatfree:verified:${ip}`, '1', { expirationTtl: 300 });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
      }
      const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
      const safeMessages = rawMessages
        .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
        .slice(0, 3)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 10000) }));
      if (safeMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: safeMessages })
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── AI PROXY (premium) ──
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const memberToken = request.headers.get('x-member-token');
      if (!memberToken || memberToken.length !== 64) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const memberTokenHash = await hashToken(memberToken);
      const tokenData = await env.MEMBER_TOKENS.get(memberTokenHash);
      if (!tokenData) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const parsed = JSON.parse(tokenData);
      if (parsed.expires_at && Date.now() > parsed.expires_at) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const DAILY_AI_LIMIT = 50;
      const today = new Date().toISOString().split('T')[0];
      const quotaKey = `usage:${memberTokenHash}:${today}`;
      const usageRaw = await env.MEMBER_TOKENS.get(quotaKey);
      const usageCount = usageRaw ? parseInt(usageRaw, 10) : 0;
      if (usageCount >= DAILY_AI_LIMIT) {
        return new Response(JSON.stringify({ error: `Daily limit of ${DAILY_AI_LIMIT} AI requests reached. Resets at midnight UTC.` }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      await env.MEMBER_TOKENS.put(quotaKey, String(usageCount + 1), { expirationTtl: 90000 });
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `chat:${ip}`, 30, 3600)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
      }
      // v16.22: 'claude-sonnet-5' added to the allowlist. The fallback on the
      // next line is deliberately left exactly as it was — an unknown model
      // string keeps degrading silently to sonnet-4-6 rather than erroring.
      const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'];
      const safeModel = ALLOWED_MODELS.includes(body?.model) ? body.model : 'claude-sonnet-4-6';
      const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
      const safeMessages = rawMessages
        .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
        .slice(0, 10)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 8000) }));
      if (safeMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid messages' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const safeMaxTokens = Math.min(Math.max(100, parseInt(body?.max_tokens, 10) || 1000), 2500);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: safeModel, max_tokens: safeMaxTokens, messages: safeMessages })
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── BREVO EMAIL — internal ──
    if (url.pathname === '/api/email' && request.method === 'POST') {
      const internalKey = request.headers.get('x-internal-key');
      if (!internalKey || internalKey !== env.INTERNAL_API_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const emailOrigin = request.headers.get('Origin') || '';
      if (emailOrigin && !ALLOWED_ORIGINS.includes(emailOrigin)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `email:${ip}`, 5, 600)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
      }
      const senderEmail = body?.sender?.email || '';
      const allowedSenders = ['insights@debt-free.world', 'support@debt-free.world'];
      if (!allowedSenders.includes(senderEmail)) {
        return new Response(JSON.stringify({ error: 'Unauthorized sender' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── BREVO SUBSCRIBE ──
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `subscribe:${ip}`, 3, 600)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
      }
      const { email, country, language, waitlist } = body;
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !EMAIL_RE.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const WAITLIST_LISTS = {
        'income-builder':   9,
        'wealth-architect': 10,
        'business-engine':  11,
      };
      const targetListId = WAITLIST_LISTS[waitlist] || 2;
      const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, listIds: [targetListId], updateEnabled: true,
          attributes: { COUNTRY: country || '', LANGUAGE: language || 'EN' }
        })
      });
      if (!brevoRes.ok) {
        const errData = await brevoRes.json().catch(() => ({}));
        const msg = errData?.message || '';
        if (!msg.toLowerCase().includes('already exist')) {
          return new Response(JSON.stringify({ error: 'Subscription failed. Please try again.' }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── SEND REPORT ──
    if (url.pathname === '/api/sendreport' && request.method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (await isRateLimited(env, `report:${ip}`, 3, 600)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const reportToken    = request.headers.get('x-member-token');
      const turnstileToken = request.headers.get('cf-turnstile-response');
      let authorized = false;
      if (reportToken && reportToken.length === 64) {
        const reportTokenHash = await hashToken(reportToken);
        const repTokenRaw = await env.MEMBER_TOKENS.get(reportTokenHash);
        if (repTokenRaw) authorized = true;
      }
      if (!authorized) {
        const verifiedFlag = await env.MEMBER_TOKENS.get(`chatfree:verified:${ip}`);
        if (verifiedFlag) authorized = true;
      }
      if (!authorized) {
        if (turnstileToken && env.TURNSTILE_SECRET_KEY) {
          const tsVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: ip }).toString()
          });
          const tsResult = await tsVerify.json();
          if (!tsResult.success) {
            return new Response(JSON.stringify({ error: 'Bot check failed. Please try again.' }), {
              status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          authorized = true;
        } else if (!env.TURNSTILE_SECRET_KEY) {
          return new Response(JSON.stringify({ error: 'Service temporarily unavailable.' }), {
            status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({ error: 'Bot check required.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      let body;
      try { body = await request.json(); } catch {
        return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
      }
      const { email, plan, country, language, debtFreeDate } = body;
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !EMAIL_RE.test(email) || !plan) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      function escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
      }
      const formattedPlan = escapeHtml(plan).replace(/\n/g, '<br>');
      const dfdLine = debtFreeDate ? `<p style="color:#0f4d28;font-weight:bold;">Your payoff date: ${debtFreeDate}</p>` : '';
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
          replyTo: { email: 'support@debt-free.world' },
          to: [{ email }],
          subject: 'Your 90-day Companion plan — Debt-Free.World',
          htmlContent: buildPlanEmailHtml(formattedPlan, dfdLine, null)
        })
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════
    // v16.21 · RECOVERY COMPANION — API contract rev 1.0 §2
    // Fail closed: any store failure below becomes 503 STORE_UNAVAILABLE.
    // An empty 200 would let the UI infer a season that may not exist.
    // ════════════════════════════════════════════════
    if (url.pathname.startsWith('/companion/') || url.pathname === '/internal/season-sweep'
        || url.pathname.startsWith('/internal/outcomes/')) {
      try {
        if (url.pathname === '/companion/state' && request.method === 'GET') {
          return await handleCompanionState(request, env, corsHeaders);
        }
        if (url.pathname === '/companion/event' && request.method === 'POST') {
          return await handleCompanionEvent(request, env, corsHeaders);
        }
        if (url.pathname === '/companion/graduation-kit' && request.method === 'POST') {
          return await handleGraduationKit(request, env, corsHeaders);
        }
        if (url.pathname === '/internal/season-sweep' && request.method === 'POST') {
          return await handleSeasonSweepEndpoint(request, env, corsHeaders);
        }
        // ── v16.24 · §3.7 · the two export surfaces. Inside this try block on
        // purpose: a KV failure here must be 503 STORE_UNAVAILABLE, never an
        // empty 200 that would read as "no rows in that period".
        if (url.pathname === '/internal/outcomes/export' && request.method === 'POST') {
          return await handleOutcomesExport(request, env, corsHeaders);
        }
        if (url.pathname === '/internal/outcomes/summary' && request.method === 'POST') {
          return await handleOutcomesSummary(request, env, corsHeaders);
        }
      } catch (e) {
        console.error('companion failure', url.pathname, e && e.message);
        return cmpErr('STORE_UNAVAILABLE', 503,
          'We could not read your season right now. Nothing was changed. Please try again shortly.',
          corsHeaders);
      }
    }

    return new Response('Not found', { status: 404 });
  },

  // ── v16.21 · daily season sweep (cron trigger "0 3 * * *") ──
  // ── v16.24 · §3.6 · monthly OUTCOMES archive (cron trigger "30 3 1 * *") ──
  // Two crons, dispatched on event.cron. They are separate invocations of this
  // Worker, so an archive that throws cannot reach the sweep — §3.6's "must not
  // affect the season sweep" holds by construction, not by a try/catch. An
  // absent or unrecognised cron string falls through to the sweep, which is the
  // pre-v16.24 behaviour for the only trigger that existed.
  async scheduled(event, env, ctx) {
    if (String((event && event.cron) || '') === '30 3 1 * *') {
      ctx.waitUntil(
        runOutcomesArchive(env)
          .then(r => console.log('outcomes-archive', JSON.stringify({
            date: r.date, rows: r.row_count, countries: Object.keys(r.by_country).length, sent: r.sent
          })))
          .catch(e => console.error('outcomes-archive failed', e && e.message))
      );
      return;
    }
    // ── v16.28 · R1 · the encrypted KV snapshot (cron trigger "0 4 * * *") ──
    // A third invocation, one hour after the sweep, so the snapshot is taken
    // AFTER the day's purge and never in the middle of it.
    if (String((event && event.cron) || '') === '0 4 * * *') {
      ctx.waitUntil(
        runKvBackup(env)
          .then(r => console.log('kv-backup', JSON.stringify(r)))
          .catch(e => console.error('kv-backup failed', e && e.message))
      );
      return;
    }
    ctx.waitUntil(
      runSeasonSweep(env, cmpTodayUtcDate(), false)
        .then(r => console.log('season-sweep', JSON.stringify({
          date: r.date, t7: r.t7.kits_sent, t1: r.t1.reminders_sent,
          outcomes: r.t0.outcomes_written, purged: r.t0.purged, skipped: r.t0.skipped_purge
        })))
        .catch(e => console.error('season-sweep failed', e && e.message))
    );
  }
};

// ════════════════════════════════════════════════
// ONBOARDING SAVE
// ════════════════════════════════════════════════
async function handleOnboardingSave(request, env, corsHeaders) {
  const memberToken = request.headers.get('x-member-token');
  if (!memberToken || memberToken.length !== 64) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const memberTokenHash = await hashToken(memberToken);
  const tokenRaw = await env.MEMBER_TOKENS.get(memberTokenHash);
  if (!tokenRaw) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const tokenData = JSON.parse(tokenRaw);
  if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  let { session_id, email, plan, onboarding, send_plan_email, tier } = body;
  const resolvedEmail = email || tokenData.email;
  if (!resolvedEmail || resolvedEmail !== tokenData.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  function clampStr(val, maxLen = 100) {
    if (typeof val !== 'string') return undefined;
    return val.slice(0, maxLen).replace(/[<>]/g, '');
  }
  function clampNum(val, min, max) {
    const n = parseFloat(val);
    if (isNaN(n)) return undefined;
    return Math.min(Math.max(n, min), max);
  }
  const VALID_CURRENCIES = [
    'EUR','USD','GBP','SEK','NOK','DKK','PLN','CZK','HUF','RON',
    'HRK','BGN','CHF','CAD','AUD','NZD','SGD','HKD','JPY','BRL',
    'MXN','ZAR','INR','IDR','THB','TRY','AED','SAR','ILS','NGN','PHP',
  ];
  if (onboarding) {
    onboarding.firstname       = clampStr(onboarding.firstname, 60);
    onboarding.country         = clampStr(onboarding.country, 60);
    onboarding.language        = clampStr(onboarding.language, 5);
    onboarding.situation       = clampStr(onboarding.situation, 500);
    onboarding.employment      = clampStr(onboarding.employment, 80);
    onboarding.household       = clampStr(onboarding.household, 60);
    onboarding.savings         = clampStr(onboarding.savings, 60);
    onboarding.collections     = clampStr(onboarding.collections, 80);
    onboarding.barrier         = clampStr(onboarding.barrier, 200);
    onboarding.support_network = clampStr(onboarding.support_network, 80);
    onboarding.primary_goal    = clampStr(onboarding.primary_goal, 200);
    onboarding.own_words       = clampStr(onboarding.own_words, 400);
    onboarding.anything_else   = clampStr(onboarding.anything_else, 500);
    onboarding.debt_types      = clampStr(onboarding.debt_types, 200);
    onboarding.immediate_focus = clampStr(onboarding.immediate_focus, 200);
    onboarding.act_creditor      = clampStr(onboarding.act_creditor, 100);
    onboarding.act_goal          = clampStr(onboarding.act_goal, 40);
    onboarding.act_action        = clampStr(onboarding.act_action, 40);
    onboarding.act_worry         = clampStr(onboarding.act_worry, 40);
    onboarding.act_tone          = clampStr(onboarding.act_tone, 20);
    onboarding.income       = clampNum(onboarding.income, 0, 9999999);
    onboarding.housing_cost = clampNum(onboarding.housing_cost, 0, 9999999);
    onboarding.other_costs  = clampNum(onboarding.other_costs, 0, 9999999);
    onboarding.extra_amount = clampNum(onboarding.extra_amount, 0, 9999999);
    onboarding.total_debt   = clampNum(onboarding.total_debt, 0, 999999999);
    onboarding.confidence   = clampNum(onboarding.confidence, 0, 10);
    onboarding.act_monthly_extra = clampNum(onboarding.act_monthly_extra, 0, 9999999);
    const rawChildren = parseInt(onboarding.children, 10);
    onboarding.children = (!isNaN(rawChildren) && rawChildren >= 0 && rawChildren <= 20) ? rawChildren : undefined;
    const rawDebtCount = parseInt(onboarding.debt_count, 10);
    onboarding.debt_count = (!isNaN(rawDebtCount) && rawDebtCount >= 0 && rawDebtCount <= 50) ? rawDebtCount : undefined;
    onboarding.currency = VALID_CURRENCIES.includes(onboarding.currency) ? onboarding.currency : 'EUR';
    if (Array.isArray(onboarding.debts)) {
      const VALID_ENFORCEMENT = ['none', 'agency', 'court', 'unknown'];
      onboarding.debts = onboarding.debts.slice(0, 20).map(d => ({
        type:     clampStr(d.type, 60)      || 'Other',
        creditor: clampStr(d.creditor, 100) || '',
        amount:   clampNum(d.amount, 0, 999999999) || 0,
        currency: VALID_CURRENCIES.includes(d.currency) ? d.currency : (onboarding.currency || 'EUR'),
        interest: clampNum(d.interest, 0, 150) || 0,
        // v16.19 (Vaihe 0 · per-debt data honesty): preserve the new mini-form fields so
        // trueDisposable + interest-honesty run on real data. Without this whitelist the
        // Worker silently rebuilds each debt and drops these -> they never persist to KV.
        payment:     clampNum(d.payment, 0, 9999999) || 0,
        enforcement: VALID_ENFORCEMENT.includes(d.enforcement) ? d.enforcement : 'none',
        secured:     Boolean(d.secured),
      })).filter(d => d.amount > 0);
    }
  }
  if (plan && plan.length > 12000) plan = plan.slice(0, 12000);
  const emailKey = `email:${resolvedEmail}`;
  const existingTokenHash = await env.MEMBER_TOKENS.get(emailKey);
  if (existingTokenHash) {
    const raw = await env.MEMBER_TOKENS.get(existingTokenHash);
    if (raw) {
      const data = JSON.parse(raw);
      const isFree = tier === 'free' || data.tier === 'free';
      let updated;
      if (isFree) {
        updated = {
          ...data,
          tier:                'free',
          member_plan:         plan,
          onboarding_complete: true,
          onboarding_date:     data.onboarding_date || new Date().toISOString().split('T')[0],
          last_plan_update:    new Date().toISOString().split('T')[0],
          last_login:          new Date().toISOString(),
          onboarding:          onboarding || data.onboarding,
          firstname:  onboarding?.firstname || data.firstname,
          country:    onboarding?.country   || data.country,
          language:   onboarding?.language  || data.language || 'EN',
          currency:   onboarding?.currency  || data.currency || 'EUR',
        };
      } else {
        // v16.17: persist full onboarding blob incl. ACT fields so member/ can
        // consume act_creditor/act_goal/act_action/act_worry/act_monthly_extra/act_tone.
        const mergedOnboarding = (() => {
          const base = (data.onboarding && typeof data.onboarding === 'object') ? { ...data.onboarding } : {};
          if (onboarding && typeof onboarding === 'object') {
            for (const k of Object.keys(onboarding)) {
              if (onboarding[k] !== undefined) base[k] = onboarding[k];
            }
          }
          return base;
        })();
        updated = {
          ...data,
          member_plan:         plan,
          debt_recovery_plan:  plan,
          onboarding:          mergedOnboarding,
          onboarding_complete: true,
          onboarding_date:     data.onboarding_date || new Date().toISOString().split('T')[0],
          last_plan_update:    new Date().toISOString().split('T')[0],
          firstname:           onboarding?.firstname    || data.firstname,
          country:             onboarding?.country      || data.country,
          language:            onboarding?.language     || data.language || 'EN',
          currency:            onboarding?.currency     || data.currency || 'EUR',
          situation:           onboarding?.situation,
          employment:          onboarding?.employment,
          household:           onboarding?.household,
          children:            onboarding?.children,
          income:              onboarding?.income,
          housing_cost:        onboarding?.housing_cost,
          other_costs:         onboarding?.other_costs,
          extra_income:        onboarding?.extra_income,
          extra_amount:        onboarding?.extra_amount,
          savings:             onboarding?.savings,
          collections:         onboarding?.collections,
          debts:               onboarding?.debts        || [],
          total_debt:          onboarding?.total_debt,
          debt_count:          onboarding?.debt_count,
          debt_types:          onboarding?.debt_types,
          barrier:             onboarding?.barrier,
          support_network:     onboarding?.support_network,
          confidence:          onboarding?.confidence,
          primary_goal:        onboarding?.primary_goal,
          own_words:           onboarding?.own_words,
          anything_else:       onboarding?.anything_else,
          settings: {
            companion_mode: onboarding?.companion_mode || data.settings?.companion_mode || 'guided',
            reminders:      onboarding?.reminders      || data.settings?.reminders      || 'Yes',
          },
        };
      }
      // ── v16.26 · CORRECTION 3 · the save that silently did not save ────────
      // Was: Math.floor((data.expires_at - Date.now()) / 1000) guarded by
      // `if (ttlRemaining > 0)`. On a record with no expires_at that expression
      // is NaN and NaN > 0 is false; on a record whose clock has passed it is
      // negative. Either way the put was skipped — and the endpoint still
      // returned 200 {ok:true} below. The member completed the seven-step form,
      // was shown success, and nothing was written.
      //
      // The `if` guard is REMOVED rather than corrected. cmpResolveMemberTtl
      // never returns below 60, so the condition could only ever be true;
      // leaving it standing would tell the next reader that this write is still
      // allowed to be skipped, which is exactly the belief that produced the
      // defect. The expired case cannot arrive here at all — this handler's own
      // `if (tokenData.expires_at && Date.now() > tokenData.expires_at)` gate
      // answers 401 for it — and corrections 1 and 2 stop expired records from
      // existing in the first place. What remains is the missing-expires_at
      // case, which the resolver answers with CMP_MEMBER_TTL.
      const ttlRemaining = cmpResolveMemberTtl(data);
      await env.MEMBER_TOKENS.put(existingTokenHash, JSON.stringify(updated), { expirationTtl: ttlRemaining });
      if (isFree) {
        try { await updateBrevoAttribute(resolvedEmail, env.BREVO_API_KEY, { ONBOARDING_COMPLETE: true }); } catch { /* non-critical */ }
      }
    }
  }
  if (session_id && session_id !== 'direct' && typeof session_id === 'string' && session_id.length > 5) {
    await env.MEMBER_TOKENS.put(
      `session:${session_id}`,
      JSON.stringify({ email: resolvedEmail, onboarding_complete: true }),
      { expirationTtl: 90 * 24 * 60 * 60 }
    );
  }
  if (send_plan_email && plan && resolvedEmail) {
    await sendPlanEmail(resolvedEmail, plan, env.BREVO_API_KEY);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ════════════════════════════════════════════════
// EMAIL HELPERS
// ════════════════════════════════════════════════
async function sendPlanEmail(email, plan, apiKey) {
  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  }
  const formattedPlan = escapeHtml(plan).replace(/\n/g, '<br>');
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
      replyTo: { email: 'support@debt-free.world' },
      to: [{ email }],
      subject: 'Your personalised 90-day Companion plan — Debt-Free.World',
      htmlContent: buildPlanEmailHtml(formattedPlan, '', null)
    })
  });
}

async function sendFreeMagicLinkEmail(email, magicLink, apiKey) {
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
      replyTo: { email: 'support@debt-free.world' },
      to: [{ email }],
      subject: 'Your Debt-Free.World access link',
      textContent: `Your 90-DAY PLAN access link is ready.\n\nGet started here:\n${magicLink}\n\nNo payment card. No subscription. Always free.\n\nThe link is personal to you. If you did not request this, you can ignore this email.\n\nQuestions? support@debt-free.world\n\nAmliv Oy · Nokia, Finland · VAT FI32503518`,
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;"><div style="max-width:560px;margin:0 auto;padding:32px 16px;"><div style="background:#ffffff;border-radius:8px;padding:36px 32px;border:1px solid #e5e7eb;"><p style="font-size:18px;color:#0f4d28;margin:0 0 28px;font-family:Georgia,serif;font-weight:normal;">✦ Debt-Free.World</p><h1 style="font-size:20px;color:#111827;font-family:Georgia,serif;font-weight:normal;margin:0 0 16px;">Your 90-DAY PLAN access link is ready.</h1><p style="font-size:15px;color:#374151;margin:0 0 8px;line-height:1.7;">Click below to build your personalised 90-Day Plan. Most people finish in under 5 minutes — take all the time you need.</p><p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.7;">No payment card. No subscription. Always free.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;"><tr><td style="border-radius:6px;background:#0f4d28;"><a href="${magicLink}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;line-height:1;">Get started — no card needed</a></td></tr></table><p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">Link not working? Copy and paste into your browser:</p><p style="font-size:11px;color:#6b7280;word-break:break-all;margin:0 0 24px;">${magicLink}</p><hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;"><p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">If you did not request this, you can ignore this email.<br>Questions? <a href="mailto:support@debt-free.world" style="color:#0f4d28;">support@debt-free.world</a><br>Amliv Oy · Nokia, Finland · VAT FI32503518</p></div></div></body></html>`
    })
  });
}

function buildPlanEmailHtml(formattedPlan, dfdLine, memberLink) {
  const linkSection = memberLink
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;"><tr><td style="border-radius:6px;background:#0f4d28;"><a href="${memberLink}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;line-height:1;">Open my Member Area</a></td></tr></table>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;"><div style="max-width:580px;margin:0 auto;padding:32px 16px;"><div style="background:#ffffff;border-radius:8px;padding:36px 32px;border:1px solid #e5e7eb;"><p style="font-size:18px;color:#0f4d28;margin:0 0 8px;font-family:Georgia,serif;font-weight:normal;">Debt-Free.World</p><p style="font-size:12px;color:#9ca3af;margin:0 0 28px;">We do this together ✦</p><h1 style="font-size:20px;color:#111827;margin:0 0 8px;font-family:Georgia,serif;font-weight:normal;">Your 90-day Companion plan</h1><p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">This plan was built for your situation. Keep this email — it is your personal reference for the next 90 days.</p>${dfdLine}${linkSection}<div style="background:#f0f8f3;border-radius:6px;padding:20px 24px;border-left:3px solid #0f4d28;margin-bottom:24px;"><p style="font-size:14px;line-height:1.8;color:#374151;margin:0;white-space:pre-wrap;">${formattedPlan}</p></div><hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;"><p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.7;">This plan is generated by AI based on the information you provided. It is for guidance only and does not constitute legal or financial advice.<br><br>Questions? <a href="mailto:support@debt-free.world" style="color:#0f4d28;">support@debt-free.world</a><br>Amliv Oy · Nokia, Finland · VAT FI32503518</p></div></div></body></html>`;
}

async function sendMagicLinkEmail(email, magicLink, apiKey) {
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
      replyTo: { email: 'support@debt-free.world' },
      to: [{ email }],
      subject: 'Your Debt-Free.World Member Area is ready',
      textContent: `Your Member Area is ready at Debt-Free.World.\n\nSign in here:\n${magicLink}\n\nThe link is personal to you.\n\nQuestions? support@debt-free.world\n\nAmliv Oy · Nokia, Finland · VAT FI32503518`,
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;"><div style="max-width:560px;margin:0 auto;padding:32px 16px;"><div style="background:#ffffff;border-radius:8px;padding:36px 32px;border:1px solid #e5e7eb;"><p style="font-size:18px;color:#0f4d28;margin:0 0 28px;font-family:Georgia,serif;font-weight:normal;">Debt-Free.World</p><h1 style="font-size:20px;color:#111827;font-family:Georgia,serif;font-weight:normal;margin:0 0 16px;">Your Member Area is ready.</h1><p style="font-size:15px;color:#374151;margin:0 0 8px;line-height:1.7;">Sign in to build your personalised 90-day Companion plan. Most people finish in under 5 minutes — take all the time you need.</p><p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.7;">This link is personal to you.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;"><tr><td style="border-radius:6px;background:#0f4d28;"><a href="${magicLink}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;line-height:1;">Sign in to my Member Area</a></td></tr></table><p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">Link not working? Copy and paste into your browser:</p><p style="font-size:11px;color:#6b7280;word-break:break-all;margin:0 0 24px;">${magicLink}</p><hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;"><p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">Questions? support@debt-free.world<br>Amliv Oy · Nokia, Finland · VAT FI32503518</p></div></div></body></html>`
    })
  });
}

// ════════════════════════════════════════════════
// BREVO — LISTAT
// Lista 7  = The 90-Day Companion Members (premium, paid)
// Lista 8  = Free Tier Members
// Lista 12 = Community Access Members_Debt
// Attribuutit PREMIUM/DEBT_RECOVERY_DATE säilytetään ennallaan — niiden
// uudelleennimeäminen vaatii erillisen Brevo-kontaktimigration.
// ════════════════════════════════════════════════
async function addToBrevoListDebt(email, apiKey) {
  await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, listIds: [7], updateEnabled: true,
      attributes: { DEBT_RECOVERY_MEMBER: true, DEBT_RECOVERY_DATE: new Date().toISOString().split('T')[0] }
    })
  });
}

async function addToBrevoListFree(email, apiKey) {
  await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, listIds: [8], updateEnabled: true,
      attributes: { DEBT_FREE_MEMBER: true, DEBT_FREE_DATE: new Date().toISOString().split('T')[0], ONBOARDING_COMPLETE: false }
    })
  });
}

// v16.13: listIds:[12] added — Community Access Members_Debt.
// Contact also receives DEBT_COMMUNITY_MEMBER + DEBT_COMMUNITY_DATE attributes.
async function addCommunityAccessBrevoTag(email, apiKey) {
  await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, listIds: [12], updateEnabled: true,
      attributes: { DEBT_COMMUNITY_MEMBER: true, DEBT_COMMUNITY_DATE: new Date().toISOString().split('T')[0] }
    })
  });
}

async function updateBrevoAttribute(email, apiKey, attributes) {
  await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, updateEnabled: true, attributes })
  });
}

async function removeFromBrevoListFree(email, apiKey) {
  await fetch('https://api.brevo.com/v3/contacts/lists/8/contacts/remove', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails: [email] })
  });
}

// ════════════════════════════════════════════════
// STRIPE — CREATE CHECKOUT
// v16.12: options.community → resolves per-product coupon from
// COMMUNITY_COUPON_MAP, attaches via discounts[].
// allow_promotion_codes set only for paid flow — Stripe rejects sessions
// with both discounts and allow_promotion_codes simultaneously.
// ════════════════════════════════════════════════
async function handleCreateCheckout(request, env, corsHeaders, options = {}) {
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const { priceId, successUrl, cancelUrl, email } = body;
  if (!priceId || !successUrl || !cancelUrl) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (!ALLOWED_PRICE_IDS.includes(priceId)) {
    return new Response(JSON.stringify({ error: 'Invalid price' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  let couponId = null;
  if (options.community) {
    const couponEnvKey = COMMUNITY_COUPON_MAP[priceId];
    if (!couponEnvKey) {
      return new Response(JSON.stringify({ error: 'Community access is not available for this product yet.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    couponId = env[couponEnvKey];
    if (!couponId) {
      return new Response(JSON.stringify({ error: 'Checkout is temporarily unavailable. Please contact support@debt-free.world' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  const ALLOWED_REDIRECT_ORIGINS = ['https://www.debt-free.world', 'https://debt-free.world'];
  let successOrigin, cancelOrigin;
  try {
    successOrigin = new URL(successUrl).origin;
    cancelOrigin  = new URL(cancelUrl).origin;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid redirect URL' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (!ALLOWED_REDIRECT_ORIGINS.includes(successOrigin) || !ALLOWED_REDIRECT_ORIGINS.includes(cancelOrigin)) {
    return new Response(JSON.stringify({ error: 'Invalid redirect URL' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const params = new URLSearchParams({
    'mode': 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url': cancelUrl,
    'payment_method_types[0]': 'card',
    'billing_address_collection': 'auto',
  });
  // ── v16.21 · §4 extension (P0) ────────────────────────────────────────────
  // Records the withdrawal-right waiver as an AFFIRMATIVE ACT by the customer.
  // v16.20 already shows waiver text via custom_text[submit], but displayed text
  // is not a recorded consent — nothing was ever stored, which is why the live
  // legal.html claim ("recorded at checkout") was untrue. This fixes it in code.
  //
  // PAID FLOW ONLY. Community Access is 0 €: there is no payment to refund, so
  // the Art. 16(m) waiver has no subject matter and asking for it would be a
  // meaningless consent that dilutes the one that matters.
  //
  // PRECONDITION — DEPLOY ORDER MATTERS: Stripe REJECTS session creation with
  // terms_of_service='required' unless the account has a Terms of service URL in
  // Settings -> Business -> Public details. If this Worker ships first, paid
  // checkout returns 400 and the 19 € product stops selling. Set the URL FIRST.
  // Deliberately no silent fallback: retrying without consent would sell exactly
  // the way this change exists to prevent.
  if (!options.community) {
    params.set('consent_collection[terms_of_service]', 'required');
    params.set('custom_text[terms_of_service_acceptance][message]', TOS_CONSENT_MESSAGE);
  }
  // v16.18 FIX (P0 close): lock checkout email to the upgrader's account email
  // so the webhook carry-forward (v16.17) always matches the free record.
  // Stripe pre-fills AND makes the field read-only when customer_email is set.
  const CO_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email === 'string' && CO_EMAIL_RE.test(email.trim().toLowerCase())) {
    params.set('customer_email', email.trim().toLowerCase());
  }
  if (couponId) {
    params.set('discounts[0][coupon]', couponId);
  } else {
    params.set('allow_promotion_codes', 'true');
  }
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const session = await response.json();
  if (session.url) {
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  // v16.21: surface the exact Stripe error. The most likely cause of a sudden
  // failure here is a missing Terms of service URL on the account (see above).
  console.error('stripe checkout session failed', session.error?.type, session.error?.message);
  return new Response(JSON.stringify({ error: session.error?.message || 'Checkout failed' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ════════════════════════════════════════════════
// STRIPE — WEBHOOK
// v16.12: branches on session.amount_total === 0.
// Paid (amount_total > 0): tier:'premium', List 7, DASHBOARD_LINK, magic link.
// Community (amount_total === 0): tier:'community_access', DEBT_COMMUNITY_MEMBER
//   attribute, List 12 added, List 8 removed, DASHBOARD_LINK, magic link. NOT added to List 7.
// ════════════════════════════════════════════════
async function handleStripeWebhook(request, env, corsHeaders) {
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 400 });
  let event;
  try { event = JSON.parse(body); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const webhookKV = env.WEBHOOK_EVENTS || env.MEMBER_TOKENS;
  const eventKey  = env.WEBHOOK_EVENTS ? event.id : `webhook_event:${event.id}`;
  const alreadyProcessed = await webhookKV.get(eventKey);
  if (alreadyProcessed) return new Response('OK', { status: 200 });
  await webhookKV.put(eventKey, '1', { expirationTtl: 48 * 60 * 60 });

  if (event.type === 'checkout.session.completed') {
    const session       = event.data.object;
    const customerEmail = session.customer_details?.email;
    const isCommunity   = session.amount_total === 0;

    if (customerEmail) {
      const token      = generateToken();
      const now        = Date.now();
      const expires_at = now + (90 * 24 * 60 * 60 * 1000);
      const tokenHash  = await hashToken(token);
      const tier       = isCommunity ? 'community_access' : 'premium';

      // v16.17 FIX (P0 upgrade continuity): carry forward existing (free)
      // onboarding + plan instead of overwriting with a blank record.
      let priorData = null;
      try {
        const priorHash = await env.MEMBER_TOKENS.get(`email:${customerEmail}`);
        if (priorHash) {
          const priorRaw = await env.MEMBER_TOKENS.get(priorHash);
          if (priorRaw) priorData = JSON.parse(priorRaw);
        }
      } catch { priorData = null; }

      await env.MEMBER_TOKENS.put(tokenHash, JSON.stringify({
        email:          customerEmail,
        tier,
        plan:           tier,
        created_at:     priorData?.created_at || new Date(now).toISOString(),
        upgraded_at:    new Date(now).toISOString(),
        expires_at,
        stripe_session: session.id,
        // ── v16.21 · §4 extension — our own copy of the checkout consent ──
        // Stripe holds the authoritative record on the Session object; this is
        // the copy we can produce ourselves without a Dashboard lookup.
        // tos_consent_required makes the community case unambiguous in an audit:
        // required=false + accepted=false is "not applicable", not "not obtained".
        // tos_consent_at is the completion moment of the paid session (the event
        // timestamp), which is when the ticked box became binding.
        tos_consent_required: session.consent_collection?.terms_of_service === 'required',
        tos_consent_accepted: session.consent?.terms_of_service === 'accepted',
        tos_consent_at:       session.consent?.terms_of_service === 'accepted'
          ? new Date(event.created ? event.created * 1000 : now).toISOString()
          : null,
        onboarding:            priorData?.onboarding || null,
        member_plan:           priorData?.member_plan || null,
        debt_recovery_plan:    priorData?.debt_recovery_plan || null,
        onboarding_complete:   priorData?.onboarding_complete || false,
        onboarding_date:       priorData?.onboarding_date || null,
        emergency_card_checked: Array.isArray(priorData?.emergency_card_checked) ? priorData.emergency_card_checked : [false, false, false],
        documents:             Array.isArray(priorData?.documents) ? priorData.documents : [],
        firstname: priorData?.firstname || priorData?.onboarding?.firstname || null,
        country:   priorData?.country   || priorData?.onboarding?.country   || null,
        language:  priorData?.language  || priorData?.onboarding?.language  || 'EN',
        currency:  priorData?.currency  || priorData?.onboarding?.currency  || 'EUR',
        first_ip:       null,
        settings:       priorData?.settings || { companion_mode: 'guided', reminders: 'Yes' }
      }), { expirationTtl: 90 * 24 * 60 * 60 });

      await env.MEMBER_TOKENS.put(`email:${customerEmail}`, tokenHash, { expirationTtl: 90 * 24 * 60 * 60 });
      await env.MEMBER_TOKENS.put(`session:${session.id}`, token, { expirationTtl: 7 * 24 * 60 * 60 });

      // ── v16.27 · CORRECTION 1 (P0) · the purchase email must not skip onboarding ─
      // Was: a hardcoded /member/?token=… with no test of any kind. Every paying
      // customer — premium AND community_access, both branches — received a link
      // into the member area before a single the 90-Day Companion answer existed, so no
      // plan was ever generated. Verified in production on 2.8.2026 with a real
      // purchase and again on 6.8.
      //
      // The test is debt_recovery_plan, NOT onboarding_complete. The free form
      // also sets onboarding_complete to true, so on Path A (free -> paid) an
      // onboarding_complete test sends the customer to /member/, where
      // member/index.html renders member_plan — their FREE plan — inside the paid
      // product, silently. debt_recovery_plan is written only by the non-free
      // branch of handleOnboardingSave, which makes it the only field that means
      // "this person completed the the 90-Day Companion form".
      //
      // Read from the SAME priorData object the record write above uses; a second
      // KV read could disagree with the record we just wrote. At the moment of
      // purchase it is null in practice, so both paths lead to onboarding — which
      // is intended, and is what the live frontend already does (thank-you-
      // premium.html line 171 routes to DR onboarding unconditionally). The link
      // in the email and the path in the browser must not disagree about the same
      // customer. The branch is written out rather than hardcoded to onboarding
      // because the same rule is applied at /member/request-magic-link, where both
      // sides are genuinely reachable.
      //
      // The mail TEMPLATE choice is untouched: both branches still call
      // sendMagicLinkEmail(), locked by v16.25 §4.
      const hasDrPlan = !!(priorData && priorData.debt_recovery_plan);
      const magicLink = hasDrPlan
        ? `https://www.debt-free.world/member/?token=${token}`
        : `https://www.debt-free.world/onboarding-debt-recovery.html?token=${token}`;

      // v16.21 · §1 — the 90-day season clock starts here, in BOTH branches.
      // Non-fatal on purpose: the event-idempotency key is already committed
      // above, so a throw here would be swallowed on Stripe's retry and leave a
      // paying member seasonless. /member/validate back-fills it (§4).
      if (isCommunity) {
        // Community Access: List 12 + attributes, no List 7 — keeps revenue reporting clean.
        try { await cmpCreateSeason(env, customerEmail, 'community', new Date(now).toISOString()); }
        catch (e) { console.error('season create failed (community)', e && e.message); }
        try { await addCommunityAccessBrevoTag(customerEmail, env.BREVO_API_KEY); } catch { /* non-critical */ }
        try { await removeFromBrevoListFree(customerEmail, env.BREVO_API_KEY); } catch { /* non-critical */ }
      } else {
        // Paid premium flow — unchanged from v16.11.
        try { await cmpCreateSeason(env, customerEmail, 'paid', new Date(now).toISOString()); }
        catch (e) { console.error('season create failed (paid)', e && e.message); }
        await addToBrevoListDebt(customerEmail, env.BREVO_API_KEY);
        try { await removeFromBrevoListFree(customerEmail, env.BREVO_API_KEY); } catch { /* non-critical */ }
      }

      try { await updateBrevoAttribute(customerEmail, env.BREVO_API_KEY, { DASHBOARD_LINK: magicLink }); } catch { /* non-critical */ }
      await sendMagicLinkEmail(customerEmail, magicLink, env.BREVO_API_KEY);
    }
  }

  return new Response('OK', { status: 200 });
}

// ════════════════════════════════════════════════
// STRIPE — SIGNATURE VERIFICATION
// ════════════════════════════════════════════════
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const sigElements = sigHeader.split(',');
    const timestampEl = sigElements.find(e => e.startsWith('t='));
    const sigEl       = sigElements.find(e => e.startsWith('v1='));
    if (!timestampEl || !sigEl) return false;
    const timestamp = timestampEl.split('=')[1];
    const sig       = sigEl.split('=')[1];
    const webhookAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (webhookAge > 300 || webhookAge < -60) return false;
    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (sig.length !== expectedSig.length) return false;
    const sigBytes      = new TextEncoder().encode(sig);
    const expectedBytes = new TextEncoder().encode(expectedSig);
    let mismatch = 0;
    for (let i = 0; i < sigBytes.length; i++) mismatch |= sigBytes[i] ^ expectedBytes[i];
    return mismatch === 0;
  } catch { return false; }
}

// ════════════════════════════════════════════════
// TOKEN HELPERS
// ════════════════════════════════════════════════
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ════════════════════════════════════════════════════════════════════════
// v16.21 · RECOVERY COMPANION — MALLI C
// All code below this line is ADDITIVE. Nothing above it was rewritten.
// Contract: API-KONTRAKTI rev 1.0 (28.7.2026). Contract wins on conflict.
// ════════════════════════════════════════════════════════════════════════

// ── Fail-closed store error. Any KV failure on a companion path raises this
//    and is converted to 503 STORE_UNAVAILABLE. Never an empty 200. ──
class CompanionStoreError extends Error {
  constructor(where) { super('store_unavailable:' + (where || '')); this.name = 'CompanionStoreError'; }
}

async function cmpGet(kv, key) {
  if (!kv) throw new CompanionStoreError('binding');
  try { return await kv.get(key); } catch { throw new CompanionStoreError('get:' + key); }
}
async function cmpPut(kv, key, value, opts) {
  if (!kv) throw new CompanionStoreError('binding');
  try { return await kv.put(key, value, opts); } catch { throw new CompanionStoreError('put:' + key); }
}
async function cmpDelete(kv, key) {
  if (!kv) throw new CompanionStoreError('binding');
  try { return await kv.delete(key); } catch { throw new CompanionStoreError('delete:' + key); }
}
async function cmpList(kv, prefix, cursor) {
  if (!kv) throw new CompanionStoreError('binding');
  try { return await kv.list({ prefix, cursor }); } catch { throw new CompanionStoreError('list:' + prefix); }
}

function cmpJson(obj, status, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
function cmpErr(code, status, message, corsHeaders) {
  return cmpJson({ error: message, code }, status, corsHeaders);
}

// Constant-time comparison for x-internal-key (§5: no ===).
function cmpConstantTimeEqual(a, b) {
  const A = new TextEncoder().encode(String(a || ''));
  const B = new TextEncoder().encode(String(b || ''));
  let diff = A.length ^ B.length;
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) diff |= (A[i] || 0) ^ (B[i] || 0);
  return diff === 0;
}

// ── memberId (see AUDIT NOTE 1) ──────────────────────────────────────────
// v16.20 has no member id: records live under a ROTATING tokenHash keyed by
// `email:{addr}`. A season keyed by tokenHash would be orphaned on the next
// magic link. memberId is therefore derived deterministically from the
// normalised email so it survives token rotation. It is Tier-1 pseudonymous
// data, lives only in MEMBER_TOKENS, and never reaches OUTCOMES.
async function cmpMemberId(email) {
  const norm = String(email || '').trim().toLowerCase();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dfw-member-v1:' + norm));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// ── Date helpers (UTC only) ──────────────────────────────────────────────
const CMP_DAY_MS = 86400000;
function cmpTodayUtcDate() { return new Date().toISOString().slice(0, 10); }
function cmpShiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function cmpIsoWeekKey(iso) {
  const d = new Date(iso);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fDayNum + 3);
  const week = 1 + Math.round((t - firstThu) / (7 * CMP_DAY_MS));
  return t.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

// ════════════════════════════════════════════════
// §1 · SEASON CLOCK
// ════════════════════════════════════════════════
const CMP_SEASON_DAYS = 90;
const CMP_SEASON_TTL  = 8640000;          // 100 days — backstop if cron fails
// v16.22 · the post-purge record is an accounting artefact, not an account.
// Finnish bookkeeping law requires payment records to be retained for 7 years,
// and legal.html already publishes "Payment records — 7 years". 365 days would
// have contradicted our own published statement.
const CMP_RECEIPT_TTL = 7 * 365 * 24 * 60 * 60;   // 7 years, in seconds
// v16.23 · the member-record TTL, named. /member/create-free,
// /member/request-magic-link and /stripe-webhook already wrote member records
// under exactly this value as an inline literal. Nothing about them changes;
// cmpResolveMemberTtl() below needs a name to fall back to.
const CMP_MEMBER_TTL  = 90 * 24 * 60 * 60;        // 90 days, in seconds

// ── v16.23 · CORRECTION 1 · what a receipt record IS, structurally ─────────
// The day-90 purge (cmpPurgeMember) replaces the member record under a rotated
// token hash with a payment + consent receipt: exactly the six fields of
// contract §2.4, retained 7 years under CMP_RECEIPT_TTL. The `email:{addr}`
// pointer is rewritten with the same 7-year TTL, so a purged customer who types
// their address into a login form still resolves to this record. It is not a
// dead key and it is not a member record.
//
// Two structural properties identify it. Neither is a guess, neither is a
// version flag, and neither depends on the caller telling us anything:
//   1. season_purged_at is present. Only cmpPurgeMember writes that field.
//   2. the onboarding structure is absent. Every live member record carries
//      BOTH `onboarding` and `onboarding_complete` — /member/create-free writes
//      `onboarding: null` and `onboarding_complete: false` on the very first
//      write, and the webhook and onboarding-save paths only ever fill them in.
//      `null` is a value; the receipt has neither key at all.
// Returns false for every live record: free or paid, onboarded or not, expired
// or not. Returns false for a non-object, so a malformed KV value cannot be
// mistaken for a receipt and granted a 7-year TTL.
function cmpIsReceiptRecord(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.season_purged_at) return false;
  return !('onboarding' in data) && !('onboarding_complete' in data);
}

// ── v16.23 · CORRECTION 2 · the KV TTL for a member-record write ───────────
// Three cases, all explicit, none derived from arithmetic on a field that may
// not exist:
//   receipt        -> CMP_RECEIPT_TTL. No write path may shorten a receipt's
//                     retention, even if one somehow reaches a write with a
//                     receipt in hand. This is the belt; the 410 is the braces.
//   expires_at set -> the remaining lifetime, floored at KV's 60 s minimum.
//                     Byte-for-byte the old behaviour for every live record.
//   no expires_at  -> CMP_MEMBER_TTL. The old expression produced
//                     `undefined - Date.now()` = NaN, Math.max(60, NaN) = NaN,
//                     and KV rejected the call — the member's save failed with
//                     no usable explanation.
function cmpResolveMemberTtl(data) {
  if (cmpIsReceiptRecord(data)) return CMP_RECEIPT_TTL;
  const exp = data && data.expires_at;
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    return Math.max(60, Math.floor((exp - Date.now()) / 1000));
  }
  return CMP_MEMBER_TTL;
}

// ════════════════════════════════════════════════════════════════════════
// v16.24 · §3.1 + §3.3 · TIER-2 COLLECTION FOR THREE ALREADY-ASKED FIELDS
// ════════════════════════════════════════════════════════════════════════
// NO NEW QUESTION IS ADDED ANYWHERE. The form files are not touched. These
// three values are already collected, clamped in handleOnboardingSave() and
// stored on the onboarding object under the names below — which are NOT the
// form's `id` attributes (§3.1 warns about exactly this):
//
//   contract calls it   stored as                        stored type
//   f_household         onboarding.household             string, clamped 60
//   f_children          onboarding.children              INTEGER 0..20, or the
//                                                        key is absent
//   f_employment        onboarding.employment            string, clamped 80
//
// For a non-free tier, handleOnboardingSave ALSO mirrors the same three values
// to the top level of the member record, so both places are read, onboarding
// first — the same precedence cmpBuildOutcome already uses for country and
// language.
//
// v16.25 · §3.1 IS NO LONGER PROVISIONAL. The option lists of both live forms
// (onboarding-debt-recovery.html and onboarding-debt-free.html, which use
// IDENTICAL values) were read and are reproduced verbatim in CMP_HOUSEHOLD_FORM
// and CMP_EMPLOYMENT_FORM below. Those exact tables are consulted BEFORE the
// pattern tables, so no answer a form can actually produce depends on a pattern
// that "probably matches". The pattern tables remain underneath as the fallback
// for legacy records and for free-text values, and `unknown` remains the answer
// for everything neither table recognises.
//
// The output side is still a closed allowlist, and it is now enforced on EVERY
// return path including the exact tables: cmpHouseholdValue/cmpEmploymentValue
// filter their result through CMP_HOUSEHOLD_VALUES / CMP_EMPLOYMENT_VALUES, so
// a wrong entry in any table can only ever cost a row its detail (-> 'unknown').
// It cannot invent a value §3.3 forbids, and it can never leak the raw string.
//
// NEGATION IS RESOLVED BEFORE ANY POSITIVE MATCH. v16.24 read
// "Couple, no children" as `couple_children`: the pattern saw the word
// "children" and had no notion of the negation in front of it. A valid but
// wrong value is worse than `unknown` — a gap is visible in the data and a
// misclassification is not, and the Tier-1 source is deleted at day 90, so it
// cannot be corrected afterwards. cmpStripNegations() removes any negated span
// ("no children", "without kids", "not employed") before the pattern table
// runs, so the fix is general: any future "no …" option is handled by
// construction and not by a special case. The two employment phrases whose
// meaning IS the negation ("not working", "no job") are exempted by name, so
// they still resolve to `unemployed` exactly as before.
//
// Order inside each pattern table is load-bearing. 'unemployed' contains
// 'employed'; 'self employed' contains 'employed'; 'couple with children'
// contains 'couple'. The first match wins, so the more specific pattern is
// listed first.
const CMP_HOUSEHOLD_VALUES  = ['single', 'single_parent', 'couple', 'couple_children', 'shared', 'other'];
// v16.25 · 'parental_leave' is a §3.3 value of its own, not 'other'.
const CMP_EMPLOYMENT_VALUES = ['employed', 'self_employed', 'unemployed', 'sick_leave', 'parental_leave', 'retired', 'student', 'other'];

function cmpNormaliseText(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return '';
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// ── v16.25 · §3.1 · THE FORMS' OWN OPTION STRINGS, VERBATIM ───────────
// Keys are cmpNormaliseText() of the exact option text both live forms render.
// "Single, no children" -> "single no children", and so on. A form value is
// therefore resolved by identity, never by inference. If the option list ever
// changes, §3.1 says this table changes in the same pass.
const CMP_HOUSEHOLD_FORM = {
  'single no children':   'single',
  'single parent':        'single_parent',
  'couple no children':   'couple',
  'couple with children': 'couple_children',
  'other':                'other',
};
const CMP_EMPLOYMENT_FORM = {
  'employed full time':              'employed',
  'employed part time':              'employed',
  'self employed or business owner': 'self_employed',
  'unemployed':                      'unemployed',
  'on sick leave':                   'sick_leave',
  'on parental leave':               'parental_leave',
  'retired':                         'retired',
  'student':                         'student',
};

// ── v16.25 · NEGATION ───────────────────────────────────────
// A negator plus the word it negates is removed from the string the pattern
// table sees, so "couple no children" is matched as "couple". `keep` exempts
// the phrases whose meaning IS the negation; without it, employment's
// "not working" and "no job" would stop meaning `unemployed`.
function cmpStripNegations(s, keep) {
  return String(s).replace(/\b(no|not|without|zero|nil)\s+[a-z0-9]+\b/g,
                           (m) => (keep && keep.test(m)) ? m : ' ')
                  .replace(/\s+/g, ' ').trim();
}
const CMP_EMPLOYMENT_NEG_KEEP = /^(not working|no job)$/;

// The single output gate. Nothing returns a normalised value without passing
// through here, so §3.3 is enforced by the code and not by review.
function cmpAllowedValue(v, allowed) {
  return (typeof v === 'string' && allowed.includes(v)) ? v : null;
}

// An exact contract token ('single_parent', 'couple_children', …) is matched by
// the allowlist check inside cmpHouseholdValue before these patterns run, so if
// the form is ever changed to store the contract's own values this table stops
// being consulted at all and nothing else moves. Phrase forms, specific first:
const CMP_HOUSEHOLD_PATTERNS = [
  [/\b(single|lone|solo|one) (parent|mother|father)\b/, 'single_parent'],
  [/\balone with (a )?(child|children|kids)\b/,         'single_parent'],
  [/\b(couple|partner|married|two adults|we) .*\b(child|children|kids|family)\b/, 'couple_children'],
  [/\bfamily with (child|children|kids)\b/,             'couple_children'],
  [/\b(share|shared|sharing|flatmate|flatmates|housemate|housemates|roommate|roommates|house share|flat share)\b/, 'shared'],
  [/\b(living|live) with (my )?(parents|family|relatives)\b/, 'shared'],
  [/\b(couple|partner|spouse|married|two adults)\b/,    'couple'],
  [/\b(living|live) alone\b/,                           'single'],
  [/\b(single|alone|one adult|just me|myself)\b/,       'single'],
  [/\bother\b/,                                         'other'],
];

function cmpHouseholdValue(raw) {
  const s = cmpNormaliseText(raw);
  if (!s) return 'unknown';
  const token = s.replace(/ /g, '_');
  if (CMP_HOUSEHOLD_VALUES.includes(token)) return token;
  // 1) the form's own option strings, by identity (§3.1)
  const exact = cmpAllowedValue(CMP_HOUSEHOLD_FORM[s], CMP_HOUSEHOLD_VALUES);
  if (exact) return exact;
  // 2) negation first, then the pattern table (§3.1 rev 1.4)
  const t = cmpStripNegations(s);
  if (!t) return 'unknown';
  for (const [re, out] of CMP_HOUSEHOLD_PATTERNS) {
    if (re.test(t)) return cmpAllowedValue(out, CMP_HOUSEHOLD_VALUES) || 'unknown';
  }
  return 'unknown';
}

const CMP_EMPLOYMENT_PATTERNS = [
  [/\b(self employed|selfemployed|freelance|freelancer|sole trader|entrepreneur|business owner|own business)\b/, 'self_employed'],
  [/\b(unemployed|jobseeker|job seeker|looking for work|out of work|between jobs|not working|no job)\b/, 'unemployed'],
  [/\b(sick leave|sickleave|on sick|long term sick|sickness|disability|disabled|incapacity)\b/, 'sick_leave'],
  [/\b(parental|maternity|paternity|childcare|child care) leave\b/, 'parental_leave'],
  [/\b(retired|retiree|pension|pensioner)\b/,           'retired'],
  [/\b(student|studying|at university|in education|apprentice)\b/, 'student'],
  [/\b(employed|employee|full time|fulltime|part time|parttime|working|in work|wage|salaried)\b/, 'employed'],
  [/\bother\b/,                                         'other'],
];

function cmpEmploymentValue(raw) {
  const s = cmpNormaliseText(raw);
  if (!s) return 'unknown';
  const token = s.replace(/ /g, '_');
  if (CMP_EMPLOYMENT_VALUES.includes(token)) return token;
  // 1) the form's own option strings, by identity (§3.1)
  const exact = cmpAllowedValue(CMP_EMPLOYMENT_FORM[s], CMP_EMPLOYMENT_VALUES);
  if (exact) return exact;
  // 2) negation first, then the pattern table (§3.1 rev 1.4)
  const t = cmpStripNegations(s, CMP_EMPLOYMENT_NEG_KEEP);
  if (!t) return 'unknown';
  for (const [re, out] of CMP_EMPLOYMENT_PATTERNS) {
    if (re.test(t)) return cmpAllowedValue(out, CMP_EMPLOYMENT_VALUES) || 'unknown';
  }
  return 'unknown';
}

// children is the one field whose stored TYPE is known from this source:
// handleOnboardingSave runs parseInt and keeps 0..20, or drops the key. 0 is a
// real answer and must not be read as missing, so the test is on the parsed
// number and not on truthiness. §3.3 caps the bracket at '3+'.
function cmpChildrenValue(raw) {
  if (raw === null || raw === undefined || raw === '') return 'unknown';
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 'unknown';
  if (n >= 3) return '3+';
  return String(Math.floor(n));
}

const CMP_FINAL_WEEK_FROM_DAY = 83;       // §1.3

function cmpSeasonPhase(season, nowMs) {
  const start = Date.parse(season.season_start);
  const end   = Date.parse(season.season_end);
  const day   = Math.max(1, Math.floor((nowMs - start) / CMP_DAY_MS) + 1);
  const daysLeft = Math.max(0, Math.ceil((end - nowMs) / CMP_DAY_MS));
  let phase;
  if (nowMs > end) phase = 'graduated';
  else if (day >= CMP_FINAL_WEEK_FROM_DAY) phase = 'final_week';
  else phase = 'active';
  return { day, days_left: daysLeft, start: season.season_start, end: season.season_end, phase };
}

function cmpSeasonWeek(day) {
  return Math.max(1, Math.min(13, Math.floor((day - 1) / 7) + 1));
}

// Creates season:{id} + seasonidx:{end-date}:{id}. Idempotent: an existing
// season is never overwritten by a repeat webhook delivery.
async function cmpCreateSeason(env, email, acquisition, startIso) {
  const memberId = await cmpMemberId(email);
  const existing = await cmpGet(env.MEMBER_TOKENS, `season:${memberId}`);
  if (existing) { try { return JSON.parse(existing); } catch { /* rewrite below */ } }
  const startMs = (typeof startIso === 'number')
    ? startIso
    : (startIso ? Date.parse(startIso) : Date.now());
  const start = new Date(isNaN(startMs) ? Date.now() : startMs).toISOString();
  const end   = new Date(Date.parse(start) + CMP_SEASON_DAYS * CMP_DAY_MS).toISOString();
  const season = {
    v: 1,
    season_start: start,
    season_end: end,
    acquisition: acquisition === 'community' ? 'community' : 'paid',
    kit_generated_at: null,
    kit_sent_at: null,
    outcome_written: false,
    purged_at: null,
    // Tier-1 only. Required because seasonidx carries memberId alone and the
    // sweep must reach the member record, which is keyed by `email:{addr}`.
    // Exact case is preserved: the webhook writes that pointer verbatim.
    member_email: String(email || '').trim(),
    // §4 back-fill: a season reconstructed for an old purchase may already be
    // past its end. The kit then stays available for 14 days before the sweep.
    sweep_date: null,
  };
  const endDate = end.slice(0, 10);
  const today = cmpTodayUtcDate();
  season.sweep_date = endDate >= today ? endDate : cmpShiftDate(today, 14);
  await cmpPut(env.MEMBER_TOKENS, `season:${memberId}`, JSON.stringify(season), { expirationTtl: CMP_SEASON_TTL });
  await cmpPut(env.MEMBER_TOKENS, `seasonidx:${season.sweep_date}:${memberId}`, '1', { expirationTtl: CMP_SEASON_TTL });
  return season;
}

// ════════════════════════════════════════════════
// CONTENT CHAIN — server-authoritative unlocking (§2.1)
// PROVISIONAL (see AUDIT NOTE 3): keys and ordering only. No customer-facing
// copy lives here; labels belong to Track M / the DR content catalog. Content
// can be re-sequenced by editing this array alone — no logic changes.
// ════════════════════════════════════════════════
const CMP_CHAIN = [
  { key: 'w1_map_creditors',      week: 1,  mode: 'both',     requires: [] },
  { key: 'w1_stop_the_bleed',     week: 1,  mode: 'both',     requires: ['w1_map_creditors'] },
  { key: 'w2_letter_intro',       week: 2,  mode: 'hardship', requires: ['w1_map_creditors'] },
  { key: 'w2_subscription_audit', week: 2,  mode: 'momentum', requires: ['w1_map_creditors'] },
  { key: 'w3_first_letter_sent',  week: 3,  mode: 'hardship', requires: ['w2_letter_intro'] },
  { key: 'w3_budget_floor',       week: 3,  mode: 'momentum', requires: ['w2_subscription_audit'] },
  { key: 'w4_creditor_replies',   week: 4,  mode: 'hardship', requires: ['w3_first_letter_sent'] },
  { key: 'w4_allowance_set',      week: 4,  mode: 'momentum', requires: ['w3_budget_floor'] },
  { key: 'w5_plan_checkpoint',    week: 5,  mode: 'both',     requires: ['w1_stop_the_bleed'] },
  { key: 'w6_priority_order',     week: 6,  mode: 'both',     requires: ['w5_plan_checkpoint'] },
  { key: 'w7_escalation_paths',   week: 7,  mode: 'hardship', requires: ['w6_priority_order'] },
  { key: 'w7_extra_capacity',     week: 7,  mode: 'momentum', requires: ['w6_priority_order'] },
  { key: 'w8_local_support',      week: 8,  mode: 'both',     requires: ['w6_priority_order'] },
  { key: 'w9_plan_update',        week: 9,  mode: 'both',     requires: ['w8_local_support'] },
  { key: 'w10_debt_free_date',    week: 10, mode: 'both',     requires: ['w9_plan_update'] },
  { key: 'w11_letters_review',    week: 11, mode: 'hardship', requires: ['w9_plan_update'] },
  { key: 'w11_momentum_review',   week: 11, mode: 'momentum', requires: ['w9_plan_update'] },
  { key: 'w12_kit_preview',       week: 12, mode: 'both',     requires: ['w10_debt_free_date'] },
  { key: 'w13_graduation',        week: 13, mode: 'both',     requires: ['w12_kit_preview'] },
];
const CMP_CHAIN_KEYS = new Set(CMP_CHAIN.map(i => i.key));

function cmpModeMatches(item, mode) {
  if (item.mode === 'both') return true;
  return item.mode === mode;
}

function cmpComputeChain(companion, week) {
  const mode = companion.mode || 'unset';
  const completedMap = companion.completed && typeof companion.completed === 'object' ? companion.completed : {};
  const completed = Object.keys(completedMap).filter(k => CMP_CHAIN_KEYS.has(k));
  const done = new Set(completed);
  const unlocked = [];
  for (const item of CMP_CHAIN) {
    if (!cmpModeMatches(item, mode)) continue;
    if (item.week > week) continue;
    if (!item.requires.every(r => done.has(r))) continue;
    unlocked.push(item.key);
  }
  let next = null;
  for (const item of CMP_CHAIN) {
    if (!cmpModeMatches(item, mode)) continue;
    if (done.has(item.key)) continue;
    const prereqsMet = item.requires.every(r => done.has(r));
    const reached = item.week <= week;
    if (!prereqsMet) continue;
    next = {
      key: item.key,
      available_now: reached,
      opens_on_day: reached ? null : (item.week - 1) * 7 + 1,
    };
    break;
  }
  return { unlocked, completed, next };
}

// ════════════════════════════════════════════════
// COMPANION RECORD (Tier 1)
// ════════════════════════════════════════════════
function cmpBlankCompanion() {
  return {
    v: 1,
    mode: 'unset',
    mode_changed: false,
    completed: {},
    letters_count: 0,
    plan_updates: 0,
    weeks_touched: [],
    momentum: null,
    entry: null,
    exit: null,
    created_at: new Date().toISOString(),
    last_event_at: null,
  };
}

async function cmpLoadCompanion(env, memberId) {
  const raw = await cmpGet(env.MEMBER_TOKENS, `companion:${memberId}`);
  if (!raw) return cmpBlankCompanion();
  try { return { ...cmpBlankCompanion(), ...JSON.parse(raw) }; }
  catch { return cmpBlankCompanion(); }
}

async function cmpSaveCompanion(env, memberId, companion) {
  await cmpPut(env.MEMBER_TOKENS, `companion:${memberId}`, JSON.stringify(companion), { expirationTtl: CMP_SEASON_TTL });
}

// ── Financial derivations (explainable, no interest model, no invented data) ──
function cmpNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }

function cmpTotalDebt(member) {
  const ob = member?.onboarding || {};
  const direct = cmpNum(ob.total_debt ?? member?.total_debt);
  if (direct !== null && direct > 0) return direct;
  const debts = Array.isArray(ob.debts) ? ob.debts : (Array.isArray(member?.debts) ? member.debts : []);
  const sum = debts.reduce((a, d) => a + (cmpNum(d?.amount) || 0), 0);
  return sum > 0 ? sum : null;
}

function cmpDebtCount(member) {
  const ob = member?.onboarding || {};
  const debts = Array.isArray(ob.debts) ? ob.debts : (Array.isArray(member?.debts) ? member.debts : []);
  if (debts.length) return debts.length;
  const dc = cmpNum(ob.debt_count ?? member?.debt_count);
  return dc !== null ? dc : null;
}

function cmpSurplus(member) {
  const ob = member?.onboarding || {};
  const income  = cmpNum(ob.income ?? member?.income);
  const housing = cmpNum(ob.housing_cost ?? member?.housing_cost);
  const other   = cmpNum(ob.other_costs ?? member?.other_costs);
  if (income === null) return null;
  return Math.round((income - (housing || 0) - (other || 0)) * 100) / 100;
}

function cmpEnforcementFlag(member) {
  const ob = member?.onboarding || {};
  const debts = Array.isArray(ob.debts) ? ob.debts : (Array.isArray(member?.debts) ? member.debts : []);
  return debts.some(d => d && (d.enforcement === 'agency' || d.enforcement === 'court'));
}

function cmpBaselineBudget(member) {
  const surplus = cmpSurplus(member);
  if (surplus !== null && surplus > 0) return surplus;
  const extra = cmpNum(member?.onboarding?.extra_amount ?? member?.extra_amount);
  if (extra !== null && extra > 0) return extra;
  return null;
}

function cmpMonthsToPayoff(totalDebt, monthlyBudget) {
  if (!totalDebt || totalDebt <= 0) return null;
  if (!monthlyBudget || monthlyBudget <= 0) return null;
  return Math.ceil(totalDebt / monthlyBudget);
}

// Month-granularity only — never implies a day-accurate promise.
function cmpPayoffDate(months) {
  if (months === null || months === undefined) return null;
  const d = new Date();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  return target.toISOString().slice(0, 10);
}

function cmpSnapshot(member, budgetOverride) {
  const totalDebt = cmpTotalDebt(member);
  const budget = (budgetOverride !== null && budgetOverride !== undefined)
    ? budgetOverride
    : cmpBaselineBudget(member);
  return {
    debt_total: totalDebt,
    debt_count: cmpDebtCount(member),
    surplus: cmpSurplus(member),
    budget: budget,
    payoff_months: cmpMonthsToPayoff(totalDebt, budget),
    enforcement: cmpEnforcementFlag(member),
    at: new Date().toISOString(),
  };
}

function cmpBuildMomentumBlock(member, companion) {
  if ((companion.mode || 'unset') !== 'momentum') return null;
  const totalDebt = cmpTotalDebt(member);
  const baselineBudget = companion.entry?.budget ?? cmpBaselineBudget(member);
  const stored = companion.momentum || {};
  const budget = cmpNum(stored.debt_budget);
  const effective = (budget !== null && budget > 0) ? budget : baselineBudget;
  const months = cmpMonthsToPayoff(totalDebt, effective);
  const baseMonths = cmpMonthsToPayoff(totalDebt, baselineBudget);
  const surplus = cmpSurplus(member);
  let allowance = null;
  if (surplus !== null && effective !== null) {
    allowance = Math.max(0, Math.round((surplus - effective) * 100) / 100);
  }
  return {
    debt_budget: effective === null ? null : Math.round(effective * 100) / 100,
    payoff_date: cmpPayoffDate(months),
    months_saved_vs_baseline: (months !== null && baseMonths !== null) ? Math.max(0, baseMonths - months) : null,
    subscriptions_cancelled: Number.isFinite(stored.subscriptions_cancelled) ? stored.subscriptions_cancelled : 0,
    guilt_free_allowance: allowance,
  };
}

// The single state object — §2.1 and §2.2 return exactly this.
function cmpBuildState(season, companion, member, nowMs) {
  const s = cmpSeasonPhase(season, nowMs);
  const week = cmpSeasonWeek(s.day);
  const chain = cmpComputeChain(companion, week);
  return {
    season: s,
    mode: companion.mode || 'unset',
    week,
    unlocked: chain.unlocked,
    completed: chain.completed,
    next: chain.next,
    momentum: cmpBuildMomentumBlock(member, companion),
    letters_count: Number.isFinite(companion.letters_count) ? companion.letters_count : 0,
    kit: {
      available: s.phase === 'final_week' || s.phase === 'graduated',
      generated_at: season.kit_generated_at || null,
      sent_at: season.kit_sent_at || null,
    },
  };
}

// ════════════════════════════════════════════════
// AUTH — companion endpoints
// Returns { member, memberId, tokenHash } or a Response to return verbatim.
// ════════════════════════════════════════════════
async function cmpAuth(request, env, corsHeaders) {
  const token = request.headers.get('x-member-token');
  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) {
    return { fail: cmpErr('INVALID_TOKEN', 401, 'Invalid or missing member token.', corsHeaders) };
  }
  const tokenHash = await hashToken(token);
  const raw = await cmpGet(env.MEMBER_TOKENS, tokenHash);
  if (!raw) return { fail: cmpErr('INVALID_TOKEN', 401, 'Invalid or missing member token.', corsHeaders) };
  let member;
  try { member = JSON.parse(raw); } catch {
    return { fail: cmpErr('INVALID_TOKEN', 401, 'Invalid or missing member token.', corsHeaders) };
  }
  if (member.expires_at && Date.now() > member.expires_at) {
    return { fail: cmpErr('INVALID_TOKEN', 401, 'Invalid or missing member token.', corsHeaders) };
  }
  const tier = member.tier || 'premium';
  if (tier === 'free') {
    return { fail: cmpErr('UPGRADE_REQUIRED', 403, 'This area is part of the 90-Day Companion.', corsHeaders) };
  }
  if (member.season_purged_at) {
    return { fail: cmpErr('SEASON_PURGED', 410, 'This season has ended and its data has been deleted.', corsHeaders) };
  }
  const memberId = await cmpMemberId(member.email);
  return { member, memberId, tokenHash };
}

async function cmpLoadSeasonOr409(env, memberId, corsHeaders) {
  const raw = await cmpGet(env.MEMBER_TOKENS, `season:${memberId}`);
  if (!raw) return { fail: cmpErr('SEASON_NOT_STARTED', 409, 'No active season on this account.', corsHeaders) };
  try { return { season: JSON.parse(raw) }; }
  catch { return { fail: cmpErr('SEASON_NOT_STARTED', 409, 'No active season on this account.', corsHeaders) }; }
}

// Fail-CLOSED rate limiter for companion paths. The existing isRateLimited()
// fails open by design on other endpoints and is deliberately left untouched.
async function cmpRateLimit(env, key, maxRequests, windowSeconds) {
  const kvKey = `rl:${key}`;
  const current = await cmpGet(env.MEMBER_TOKENS, kvKey);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= maxRequests) return true;
  await cmpPut(env.MEMBER_TOKENS, kvKey, String(count + 1), { expirationTtl: windowSeconds });
  return false;
}

// ════════════════════════════════════════════════
// §2.1 GET /companion/state · §2.2 POST /companion/event
// ════════════════════════════════════════════════
async function handleCompanionState(request, env, corsHeaders) {
  const auth = await cmpAuth(request, env, corsHeaders);
  if (auth.fail) return auth.fail;
  if (await cmpRateLimit(env, `cstate:${auth.tokenHash.slice(0, 32)}`, 120, 3600)) {
    return cmpErr('RATE_LIMITED', 429, 'Too many requests. Try again shortly.', corsHeaders);
  }
  const sr = await cmpLoadSeasonOr409(env, auth.memberId, corsHeaders);
  if (sr.fail) return sr.fail;
  let companion = await cmpLoadCompanion(env, auth.memberId);
  const touched = cmpTouch(companion);
  if (!companion.entry && cmpTotalDebt(auth.member) !== null) {
    companion.entry = cmpSnapshot(auth.member, null);
  }
  if (touched || companion.entry) await cmpSaveCompanion(env, auth.memberId, companion);
  return cmpJson(cmpBuildState(sr.season, companion, auth.member, Date.now()), 200, corsHeaders);
}

function cmpTouch(companion) {
  const wk = cmpIsoWeekKey(new Date().toISOString());
  if (!Array.isArray(companion.weeks_touched)) companion.weeks_touched = [];
  if (!companion.weeks_touched.includes(wk)) {
    companion.weeks_touched.push(wk);
    companion.weeks_touched = companion.weeks_touched.slice(-20);
    return true;
  }
  return false;
}

const CMP_EVENT_TYPES = ['set_mode', 'complete_task', 'momentum_update', 'plan_updated', 'letter_saved'];

async function handleCompanionEvent(request, env, corsHeaders) {
  const auth = await cmpAuth(request, env, corsHeaders);
  if (auth.fail) return auth.fail;
  if (await cmpRateLimit(env, `cevent:${auth.tokenHash.slice(0, 32)}`, 60, 3600)) {
    return cmpErr('RATE_LIMITED', 429, 'Too many requests. Try again shortly.', corsHeaders);
  }
  const sr = await cmpLoadSeasonOr409(env, auth.memberId, corsHeaders);
  if (sr.fail) return sr.fail;

  let body;
  try { body = await request.json(); } catch {
    return cmpErr('INVALID_EVENT', 422, 'Malformed event.', corsHeaders);
  }
  const type = body?.type;
  if (!CMP_EVENT_TYPES.includes(type)) {
    return cmpErr('INVALID_EVENT', 422, 'Unknown event type.', corsHeaders);
  }

  const companion = await cmpLoadCompanion(env, auth.memberId);
  cmpTouch(companion);
  if (!companion.entry && cmpTotalDebt(auth.member) !== null) {
    companion.entry = cmpSnapshot(auth.member, null);
  }

  if (type === 'set_mode') {
    const mode = body?.mode;
    if (mode !== 'hardship' && mode !== 'momentum') {
      return cmpErr('INVALID_EVENT', 422, 'Mode must be hardship or momentum.', corsHeaders);
    }
    const prev = companion.mode || 'unset';
    if (prev !== 'unset' && prev !== mode) companion.mode_changed = true;
    companion.mode = mode;

  } else if (type === 'complete_task') {
    const key = body?.task_key;
    if (typeof key !== 'string' || !CMP_CHAIN_KEYS.has(key)) {
      return cmpErr('INVALID_EVENT', 422, 'Unknown task key.', corsHeaders);
    }
    const week = cmpSeasonWeek(cmpSeasonPhase(sr.season, Date.now()).day);
    const chain = cmpComputeChain(companion, week);
    if (!companion.completed || typeof companion.completed !== 'object') companion.completed = {};
    // Idempotent: already complete -> 200, no second write of the entry.
    if (!companion.completed[key]) {
      if (!chain.unlocked.includes(key)) {
        return cmpErr('INVALID_EVENT', 422, 'That step is not open yet.', corsHeaders);
      }
      companion.completed[key] = new Date().toISOString();
      const payload = body?.payload;
      if (payload && typeof payload === 'object') {
        const clipped = JSON.stringify(payload).slice(0, 2000);
        if (!companion.payloads || typeof companion.payloads !== 'object') companion.payloads = {};
        companion.payloads[key] = clipped;   // Tier 1 only. Never reaches OUTCOMES.
      }
    }

  } else if (type === 'momentum_update') {
    const budget = cmpNum(body?.debt_budget);
    if (budget === null || budget < 0 || budget > 9999999) {
      return cmpErr('INVALID_EVENT', 422, 'debt_budget must be a number.', corsHeaders);
    }
    const subs = parseInt(body?.subscriptions_cancelled, 10);
    if (!companion.momentum || typeof companion.momentum !== 'object') companion.momentum = {};
    companion.momentum.debt_budget = Math.round(budget * 100) / 100;
    if (!isNaN(subs) && subs >= 0 && subs <= 200) companion.momentum.subscriptions_cancelled = subs;
    companion.exit = cmpSnapshot(auth.member, companion.momentum.debt_budget);

  } else if (type === 'plan_updated') {
    companion.plan_updates = (Number.isFinite(companion.plan_updates) ? companion.plan_updates : 0) + 1;
    companion.exit = cmpSnapshot(auth.member, cmpNum(companion.momentum?.debt_budget));

  } else if (type === 'letter_saved') {
    const docId = body?.doc_id;
    if (docId !== undefined && typeof docId !== 'string') {
      return cmpErr('INVALID_EVENT', 422, 'doc_id must be a string.', corsHeaders);
    }
    companion.letters_count = (Number.isFinite(companion.letters_count) ? companion.letters_count : 0) + 1;
  }

  companion.last_event_at = new Date().toISOString();
  await cmpSaveCompanion(env, auth.memberId, companion);
  return cmpJson(cmpBuildState(sr.season, companion, auth.member, Date.now()), 200, corsHeaders);
}

// ════════════════════════════════════════════════
// §2.3 POST /companion/graduation-kit
// ════════════════════════════════════════════════
async function handleGraduationKit(request, env, corsHeaders) {
  const internalKey = request.headers.get('x-internal-key');
  let member = null, memberId = null, tokenHash = null;

  if (internalKey) {
    if (!env.INTERNAL_API_KEY || !cmpConstantTimeEqual(internalKey, env.INTERNAL_API_KEY)) {
      return cmpErr('INTERNAL_AUTH_FAILED', 403, 'Internal authentication failed.', corsHeaders);
    }
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const target = body?.member_id;
    if (typeof target !== 'string' || !/^[0-9a-f]{32}$/.test(target)) {
      return cmpErr('INVALID_EVENT', 422, 'member_id required.', corsHeaders);
    }
    memberId = target;
    const loaded = await cmpLoadMemberByMemberId(env, memberId);
    if (!loaded) return cmpErr('SEASON_NOT_STARTED', 409, 'No account for that member.', corsHeaders);
    member = loaded.member;
  } else {
    const auth = await cmpAuth(request, env, corsHeaders);
    if (auth.fail) return auth.fail;
    if (await cmpRateLimit(env, `ckit:${auth.tokenHash.slice(0, 32)}`, 5, 3600)) {
      return cmpErr('RATE_LIMITED', 429, 'Too many requests. Try again shortly.', corsHeaders);
    }
    member = auth.member; memberId = auth.memberId; tokenHash = auth.tokenHash;
  }

  const sr = await cmpLoadSeasonOr409(env, memberId, corsHeaders);
  if (sr.fail) return sr.fail;
  const companion = await cmpLoadCompanion(env, memberId);

  const built = cmpBuildKitHtml(sr.season, companion, member);
  const generatedAt = new Date().toISOString();
  const season = { ...sr.season, kit_generated_at: sr.season.kit_generated_at || generatedAt };
  await cmpPut(env.MEMBER_TOKENS, `season:${memberId}`, JSON.stringify(season), { expirationTtl: CMP_SEASON_TTL });

  return cmpJson({
    filename: built.filename,
    generated_at: generatedAt,
    html_base64: cmpBase64Utf8(built.html),
  }, 200, corsHeaders);
}

async function cmpLoadMemberByMemberId(env, memberId) {
  const seasonRaw = await cmpGet(env.MEMBER_TOKENS, `season:${memberId}`);
  if (!seasonRaw) return null;
  let season;
  try { season = JSON.parse(seasonRaw); } catch { return null; }
  const email = season.member_email;
  if (!email) return null;
  let hash = await cmpGet(env.MEMBER_TOKENS, `email:${email}`);
  if (!hash) {
    const lower = email.toLowerCase();
    if (lower !== email) hash = await cmpGet(env.MEMBER_TOKENS, `email:${lower}`);
  }
  if (!hash) return { season, member: null, tokenHash: null, email };
  const raw = await cmpGet(env.MEMBER_TOKENS, hash);
  if (!raw) return { season, member: null, tokenHash: hash, email };
  try { return { season, member: JSON.parse(raw), tokenHash: hash, email }; }
  catch { return { season, member: null, tokenHash: hash, email }; }
}

function cmpBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)));
  }
  return btoa(bin);
}

function cmpEsc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

// Locked currency format: amount, space, symbol. Symbol-first is never emitted.
function cmpMoney(amount, currency) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CHF: 'CHF' };
  const sym = SYMBOLS[currency] || currency || '€';
  const n = Math.round(Number(amount) * 100) / 100;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${s} ${sym}`;
}

// ── Pillar A · verified country resources ─────────────────────────────────
// v16.22 · DATA TRANSFER, NOT NEW RESEARCH.
// Every entry below is copied verbatim from the two structures already running
// in production, with no additions, deletions or rewording:
//   organisations -> /support-data.js  (window.SUPPORT_DATA, the canonical
//                    single source read by member-free, member and onboarding)
//   legal notes   -> member-free/index.html  (const COUNTRY_LEGAL)
// Keys are ISO-2 via CMP_COUNTRY_ISO. A country absent from the source is
// absent here; the kit then falls back to the generic debt-free.world pointer
// and cmpSendGraduationKitEmail drops its country-services claim (§4 below).
//
// ⚠ DRIFT WARNING — THIS IS A SECOND COPY OF DATA THAT DECLARES ITSELF THE
//   SINGLE SOURCE OF TRUTH. Provenance of the organisation entries:
//
//     SOURCE FILE : /support-data.js   (window.SUPPORT_DATA)
//     SHA-256     : aa32df6fc1b5079ab3d411809bbed73729fba42b1b9a0bed674241a8721e504e
//     COPIED      : 28.7.2026 · 42 countries · 87 organisations
//
//   Never edit this map by hand. Edit /support-data.js first, then re-transfer
//   and update the SHA-256 line above. If the live file no longer hashes to
//   that value, this copy is STALE and the two have drifted.
//     verify with:  shasum -a 256 support-data.js
//   test.mjs pins the country list (PILLAR-A0), so a country added to or
//   removed from the source fails the suite instead of diverging in silence.
const CMP_PILLAR_A = {
  // Finland
  'FI': [
    { name: 'Takuusäätiö', url: 'takuusaatio.fi', note: 'Guarantees and free debt counselling.' },
    { name: 'Talous- ja velkaneuvonta (oikeusapu.fi)', url: 'oikeusapu.fi', note: 'Statutory free debt counselling.' },
    { name: 'Kela', url: 'kela.fi', note: 'Benefits and financial support.' },
  ],
  // Sweden
  'SE': [
    { name: 'Budget- och skuldrådgivning', note: 'Free municipal debt counselling, by law — contact your kommun.' },
    { name: 'Kronofogden', url: 'kronofogden.se', note: 'Debt enforcement and voluntary payment plans.' },
    { name: 'Konsumentverket', url: 'konsumentverket.se', note: 'Consumer guidance.' },
  ],
  // Norway
  'NO': [
    { name: 'NAV', url: 'nav.no', note: 'Benefits, unemployment and social support.' },
    { name: 'Kommunal gjeldsrådgivning', note: 'Free municipal debt counselling, by law.' },
    { name: 'Forbrukerrådet', url: 'forbrukerradet.no', note: 'Consumer rights.' },
  ],
  // Denmark
  'DK': [
    { name: 'Gældsrådgivning Danmark', url: 'gaeldsraadgivning.dk', note: 'Free debt counselling.' },
    { name: 'Forbrugerrådet Tænk', url: 'taenk.dk', note: 'Consumer advice.' },
    { name: 'Kommunal gældsrådgivning', note: 'Contact your local municipality.' },
  ],
  // Germany
  'DE': [
    { name: 'Caritas Schuldnerberatung', url: 'caritas.de', note: 'Free debt counselling.' },
    { name: 'Verbraucherzentrale', url: 'verbraucherzentrale.de', note: 'Consumer advice centres.' },
    { name: 'Diakonie', url: 'diakonie.de', note: 'Social support including debt help.' },
  ],
  // Netherlands
  'NL': [
    { name: 'Nibud', url: 'nibud.nl', note: 'Budget and debt guidance.' },
    { name: 'Schuldhulpverlening via gemeente', note: 'Free municipal debt help.' },
    { name: 'NVVK', url: 'nvvk.eu', note: 'Debt restructuring.' },
  ],
  // Belgium
  'BE': [
    { name: 'OCMW / CPAS', note: 'Public social welfare centre — contact locally.' },
    { name: 'CAW', url: 'caw.be', note: 'Free social and financial support.' },
  ],
  // France
  'FR': [
    { name: 'CRESUS', url: 'cresus.fr', note: 'Debt mediation and prevention.' },
    { name: 'CCAS', note: 'Municipal social support centres.' },
    { name: 'CDAD', note: 'Free local legal and financial advice.' },
  ],
  // Spain
  'ES': [
    { name: 'ADICAE', url: 'adicae.net', note: 'Consumer and debt advocacy.' },
    { name: 'Cáritas', url: 'caritas.es', note: 'Social and financial support.' },
    { name: 'OCU', url: 'ocu.org', note: 'Consumer rights.' },
  ],
  // Portugal
  'PT': [
    { name: 'DECO', url: 'deco.proteste.pt', note: 'Consumer and debt advice.' },
    { name: 'Santa Casa da Misericórdia', note: 'Social support.' },
  ],
  // Italy
  'IT': [
    { name: 'Adiconsum', url: 'adiconsum.it', note: 'Consumer and debt support.' },
    { name: 'Caritas', url: 'caritas.it', note: 'Social support.' },
  ],
  // Poland
  'PL': [
    { name: 'Federacja Konsumentów', url: 'federacja-konsumentow.org.pl', note: 'Consumer rights and debt advice.' },
    { name: 'UOKiK', url: 'uokik.gov.pl', note: 'Consumer protection office.' },
  ],
  // Czech Republic
  'CZ': [
    { name: 'Poradna při finanční tísni', url: 'financnitisen.cz', note: 'Free debt counselling.' },
    { name: 'dTest', url: 'dtest.cz', note: 'Consumer advice.' },
  ],
  // Estonia
  'EE': [
    { name: 'Tarbijakaitse', url: 'tarbijakaitse.ee', note: 'Consumer and financial protection.' },
    { name: 'Kohalik omavalitsus', note: 'Local municipality debt support.' },
  ],
  // Latvia
  'LV': [
    { name: 'PTAC', url: 'ptac.gov.lv', note: 'Consumer rights and financial guidance.' },
    { name: 'Sociālais dienests', note: 'Municipal social support.' },
  ],
  // Lithuania
  'LT': [
    { name: 'VVTAT', url: 'vvtat.lt', note: 'State consumer rights protection.' },
    { name: 'Savivaldybės socialinė tarnyba', note: 'Municipal social support.' },
  ],
  // Hungary
  'HU': [
    { name: 'MNB Pénzügyi Navigátor', url: 'mnb.hu/penzugyinavigator', note: 'Central bank financial guidance and dispute resolution.' },
    { name: 'Fogyasztóvédelem', url: 'fogyasztovedelem.kormany.hu', note: 'Consumer protection.' },
  ],
  // Romania
  'RO': [
    { name: 'ANPC', url: 'anpc.ro', note: 'National Consumer Protection Authority.' },
    { name: 'Caritas Romania', url: 'caritas.ro', note: 'Social support.' },
  ],
  // Croatia
  'HR': [
    { name: 'HANFA', url: 'hanfa.hr', note: 'Financial regulation authority.' },
    { name: 'Potrošač.hr', url: 'potrosac.hr', note: 'Consumer rights.' },
  ],
  // United Kingdom
  'GB': [
    { name: 'StepChange', url: 'stepchange.org', note: 'Free debt charity — full debt management.' },
    { name: 'National Debtline', url: 'nationaldebtline.org', note: 'Free phone and online advice.' },
    { name: 'Citizens Advice', url: 'citizensadvice.org.uk', note: 'Free legal and financial guidance.' },
  ],
  // Ireland
  'IE': [
    { name: 'MABS', url: 'mabs.ie', note: 'Money Advice and Budgeting Service, free.' },
    { name: 'ISI', url: 'isi.gov.ie', note: 'Insolvency Service of Ireland — formal options.' },
    { name: 'Citizens Information', url: 'citizensinformation.ie', note: 'Benefits and rights.' },
  ],
  // Austria
  'AT': [
    { name: 'Schuldnerberatung', url: 'schuldenberatung.at', note: 'Free public debt counselling.' },
    { name: 'AK Konsumentenschutz', url: 'arbeiterkammer.at', note: 'Free consumer and debt advice.' },
  ],
  // Switzerland
  'CH': [
    { name: 'Schuldenberatung Schweiz', url: 'schulden.ch', note: 'Free debt counselling.' },
  ],
  // Greece
  'GR': [
    { name: 'Εξωδικαστικός Μηχανισμός', url: 'keyd.gov.gr', note: 'Out-of-court debt settlement mechanism.' },
    { name: 'Συνήγορος του Καταναλωτή', url: 'synigoroskatanaloti.gr', note: 'Consumer ombudsman.' },
  ],
  // United States
  'US': [
    { name: 'NFCC', url: 'nfcc.org', note: 'Find local nonprofit credit counselling.' },
    { name: 'CFPB', url: 'consumerfinance.gov', note: 'Consumer Financial Protection Bureau.' },
    { name: '211.org', url: '211.org', note: 'Local social services including financial help.' },
  ],
  // Canada
  'CA': [
    { name: 'Credit Counselling Canada', url: 'creditcounsellingcanada.ca', note: 'Accredited nonprofit agencies.' },
    { name: 'FCAC', url: 'canada.ca/fcac', note: 'Financial Consumer Agency of Canada.' },
  ],
  // Australia
  'AU': [
    { name: 'National Debt Helpline', url: 'ndh.org.au', note: 'Free phone advice from financial counsellors.' },
    { name: 'MoneySmart', url: 'moneysmart.gov.au', note: 'Government financial guidance.' },
  ],
  // New Zealand
  'NZ': [
    { name: 'MoneyTalks', url: 'moneytalks.co.nz', note: 'Free financial helpline.' },
    { name: 'Sorted', url: 'sorted.org.nz', note: 'Free budgeting tools and guides.' },
  ],
  // Brazil
  'BR': [
    { name: 'Consumidor.gov.br', url: 'consumidor.gov.br', note: 'Official consumer dispute platform.' },
    { name: 'Registrato (Banco Central)', url: 'registrato.bcb.gov.br', note: 'See all debts registered in your name.' },
  ],
  // Mexico
  'MX': [
    { name: 'PROFECO', url: 'profeco.gob.mx', note: 'Consumer protection.' },
    { name: 'CONDUSEF', url: 'condusef.gob.mx', note: 'Financial services protection.' },
  ],
  // India
  'IN': [
    { name: 'RBI Ombudsman', url: 'cms.rbi.org.in', note: 'Banking dispute resolution.' },
  ],
  // Indonesia
  'ID': [
    { name: 'OJK', url: 'ojk.go.id', note: 'Financial Services Authority.' },
    { name: 'YLKI', url: 'ylki.or.id', note: 'Consumer protection.' },
  ],
  // Philippines
  'PH': [
    { name: 'BSP Consumer Assistance', url: 'bsp.gov.ph', note: 'Central bank consumer help.' },
    { name: 'SEC', url: 'sec.gov.ph', note: 'Lending regulation.' },
  ],
  // South Africa
  'ZA': [
    { name: 'National Debt Counsellors Association', url: 'ndca.org.za', note: 'Registered debt counsellors.' },
    { name: 'DebtBusters', url: 'debtbusters.co.za', note: 'Debt counselling.' },
  ],
  // Bulgaria
  'BG': [
    { name: 'Commission for Consumer Protection (KZP)', url: 'kzp.bg', note: 'State consumer protection body.' },
    { name: 'BNB Payment Disputes Conciliation Commission', url: 'bnb.bg', note: 'Free out-of-court financial dispute resolution.' },
  ],
  // Slovakia
  'SK': [
    { name: 'Centrum pravnej pomoci', url: 'centrumpravnejpomoci.sk', note: 'State legal aid; personal bankruptcy help.' },
    { name: 'Poradne pre ludi v dlhoch (free debt-advice network)', url: 'pomahamedlznikom.sk', note: 'Free financial, legal, psychological counselling.' },
  ],
  // Argentina
  'AR': [
    { name: 'Banco Central de la República Argentina — Usuarios Financieros', url: 'bcra.gob.ar', note: 'Argentina\'s central bank runs a free channel for financial-services users to raise problems with banks and lenders (interest, charges, abusive collection). For broader consumer disputes, the national Defensa del Consumidor (argentina.gob.ar) also offers free conciliation.' },
  ],
  // Singapore
  'SG': [
    { name: 'Credit Counselling Singapore (CCS)', url: 'ccs.org.sg', note: 'A registered charity and non-profit (since 2004) offering free debt-management talks and credit counselling, and the only agency running the Debt Management Programme, which consolidates unsecured bank debts into one restructured repayment plan.' },
  ],
  // Malaysia
  'MY': [
    { name: 'AKPK — Agensi Kaunseling dan Pengurusan Kredit', url: 'akpk.org.my', note: 'The Credit Counselling and Debt Management Agency set up by the central bank, Bank Negara Malaysia. Provides free financial counselling and a Debt Management Programme that restructures unsecured debts with participating banks — a route to avoid bankruptcy.' },
  ],
  // Thailand
  'TH': [
    { name: 'Debt Clinic by SAM (คลินิกแก้หนี้)', url: 'debtclinicbysam.com', note: 'A Bank of Thailand-initiated debt-restructuring programme (since 2017) run by the state-owned Sukhumvit Asset Management. A one-stop centre that consolidates unsecured personal debt (credit cards, personal loans) up to THB 2 million into a low-interest plan of up to 10 years. Hotline 1443.' },
  ],
  // United Arab Emirates
  'AE': [
    { name: 'Sanadak', url: 'sanadak.gov.ae', note: 'The UAE\'s independent financial and insurance Ombudsman Unit, established by the Central Bank of the UAE (operating since 2024). Provides free, impartial resolution of complaints against banks and lenders — including disputes over loans, charges and salary-deduction limits — as an alternative to going to court.' },
  ],
  // Kenya
  'KE': [
    { name: 'Office of the Official Receiver in Insolvency (Business Registration Service)', url: 'brs.go.ke', note: 'The Kenyan government body that administers personal insolvency under the Insolvency Act 2015, including the no-asset procedure, voluntary arrangements and bankruptcy. Kenya has no dedicated free debt-counselling charity, so this is the official statutory starting point for individual debt relief.' },
  ],
};

// Statutory/rights note per country, verbatim from COUNTRY_LEGAL. '_other' is
// the production generic fallback; it is stored for completeness but the kit
// renders country-specific notes ONLY, so nothing generic is ever presented as
// if it applied to the member's jurisdiction.
const CMP_PILLAR_A_LEGAL = {
  'GB': 'If your total debt is unmanageable, an Individual Voluntary Arrangement (IVA) or a Debt Relief Order may be options — always arranged through a licensed insolvency practitioner, never as a quick fix. Creditors must stop contact once a formal plan is agreed.',
  'US': 'Federal law (the FDCPA) limits how collectors can contact you and bars harassment. For very high debt, Chapter 7 or 13 bankruptcy exists as a last resort — speak to a qualified attorney before deciding.',
  'IE': 'MABS is free and statutory. The ISI offers formal Debt Settlement and Personal Insolvency Arrangements. Creditors must follow the Central Bank’s arrears process before enforcement.',
  'FI': 'You have the right to free statutory debt counselling (talous- ja velkaneuvonta). Järjestelyvelka (debt adjustment) through the court can restructure unmanageable debt; Takuusäätiö may guarantee a consolidation loan.',
  'SE': 'Municipal budget- och skuldrådgivning is free by law. Kronofogden runs skuldsanering (debt relief) for people who cannot reasonably repay within the foreseeable future.',
  'DE': 'Free Schuldnerberatung is available through Caritas and Diakonie. A Privatinsolvenz (consumer insolvency) can discharge remaining debt after a defined good-conduct period.',
  'NL': 'Municipalities must offer schuldhulpverlening. The WSNP route can lead to a court-supervised debt clean slate after roughly three years.',
  'FR': 'The Banque de France commission de surendettement can freeze and restructure debts for over-indebted households — applying pauses most enforcement.',
  'ES': 'The Ley de Segunda Oportunidad (second-chance law) can cancel unpayable debt for individuals acting in good faith. Free advice via ADICAE and Cáritas.',
  'AU': 'Financial counsellors via the National Debt Helpline are free. Hardship provisions require lenders to consider variations; bankruptcy and debt agreements exist as last resorts via AFSA.',
  'CA': 'Licensed Insolvency Trustees administer consumer proposals and bankruptcy. Provincial law caps collector conduct. Nonprofit credit counselling is widely available.',
  'NO': 'NAV provides free national financial and debt counselling (helpline 55 55 33 39) and every municipality must offer debt advice. If you are permanently unable to pay, you can apply through the local enforcement officer (namsmann) for a gjeldsordning (debt settlement) under the Debt Settlement Act — normally a five-year plan, after which remaining unsecured debt is usually cleared. The Debt Collection Act regulates how creditors and agencies may pursue you and prohibits undue pressure.',
  'DK': 'Free, confidential debt counselling is available from volunteer and municipal services, and you can apply to the bankruptcy court (skifteretten) for gaeldssanering — a court-ordered plan, usually around three years, that reduces or cancels remaining debt. It is granted selectively, so getting counselling first is wise. Under the Debt Collection Act, collectors must send a formal notice (inkassovarsel) and may not use harassment or threats; the Consumer Ombudsman supervises these rules.',
  'AT': 'State-recognised debt counselling (Schuldenberatung, the ASB network at schuldenberatung.at) is free and confidential and can even represent you in court. If your debts are unpayable, you can apply at the district court (Bezirksgericht) for a Schuldenregulierungsverfahren (Privatkonkurs), which ends in discharge of remaining debt once you complete the plan. Your subsistence minimum (Existenzminimum) is protected from wage garnishment, and core social benefits are generally exempt.',
  'CH': 'Free, confidential debt counselling is available from Caritas and the cantonal centres coordinated by Schuldenberatung Schweiz (schulden.ch). Be aware that Swiss personal bankruptcy has traditionally NOT written off your debts — creditors receive certificates of loss (Verlustscheine) and can pursue you again for up to 20 years if you later acquire assets, so debt can effectively follow you. Out-of-court restructuring (Schuldensanierung) is possible but needs every creditor to agree; a statutory fresh-start discharge procedure has been proposed (a Federal Council draft is before Parliament) but is not yet in force. Get counselling before acting.',
  'BE': 'You can get free debt mediation and budget guidance from your local public social welfare centre (OCMW/CPAS). For structural, unpayable debt, the collective debt settlement (reglement collectif de dettes / collectieve schuldenregeling) is a court procedure in which a judge appoints a debt mediator and sets a repayment plan of up to seven years, while protecting enough income for a dignified life; remaining debt can be remitted at the end. Starting mediation or a settlement suspends debt-recovery action, and a first payment reminder must now be free of charge.',
  'PT': 'For bank and credit debts, lenders must offer the out-of-court PARI and PERSI procedures before taking legal action, and the free RACE network and DECO (deco.pt) provide independent debt counselling. As a last resort, personal insolvency (insolvencia pessoal) with exoneracao do passivo restante can discharge remaining debt after a three-year cession period, protecting a minimum income — but tax, social-security and maintenance debts are never wiped out. Treat commercial debt-consolidation offers with caution; they are not debt relief.',
  'IT': 'Under the Codice della Crisi (which absorbed Law 3/2012, known as the anti-suicide law), an over-indebted consumer can use the free public OCC (Organismo di Composizione della Crisi) to apply to the court for a consumer debt-restructuring plan, controlled liquidation, or — if you own nothing — a debtor discharge, ending in esdebitazione (cancellation of remaining debt) and a fresh start. Only the OCC can run these procedures, so ignore firms that charge to arrange your discharge. Maintenance debts are not cancelled, and a basic living minimum is protected.',
  'BG': 'Until recently Bulgaria had no personal-insolvency route, but the Law on Insolvency of Natural Persons (in force from 2025, with court applications phased in during 2026) now lets a good-faith individual apply to the district court for a repayment plan and, ultimately, discharge of remaining debt. Only you can start the procedure — no creditor, bank or agency can force you into it — and a minimum income of at least the minimum wage is protected. Dedicated free debt-counselling charities are still scarce here, so verify any adviser carefully and avoid anyone charging to promise debt cancellation.',
  'SK': 'Debt relief (oddlzenie, informally osobny bankrot) is handled only through the state Centre for Legal Aid (centrumpravnejpomoci.sk) or a lawyer it assigns — by law no private company may file for you, so avoid firms promising to arrange your bankruptcy. You can clear debts either by konkurz (assets are liquidated and debts discharged) or a court-set repayment schedule (splatkovy kalendar) that lets you keep your assets. A national network of free debt-advice centres also offers financial, legal and psychological counselling; small statutory fees apply to the discharge consultation and application.',
  'PL': 'Consumer bankruptcy (upadlosc konsumencka) has existed since 2009 and was greatly liberalised in 2020 (in force), letting an insolvent individual apply to the court; a trustee (syndyk) sells any assets, the court sets a repayment plan (normally up to 36 months, or up to seven years if you caused your own insolvency), and the remaining debt is then written off. Free help is available from the Financial Ombudsman (rf.gov.pl) and municipal or county consumer ombudsmen, plus state free legal-aid points. Maintenance, criminal fines and damages for deliberately caused harm are not discharged.',
  'CZ': 'Debt relief (oddluzeni) under the Insolvency Act lets an over-indebted individual ask the court for a fresh start; a 2024 reform implementing EU Directive 2019/1023 (in force since autumn 2024) cut the discharge period to three years and dropped the old minimum-repayment threshold, so remaining debt is normally written off after three years of cooperation. Your petition must be filed through an accredited non-profit debt counsellor, an attorney or an insolvency practitioner — no private firm may charge to arrange it — and free help is available from People in Need (clovekvtisni.cz). Criminal fines, intentional-damage claims and maintenance are not discharged.',
  'EE': 'Under the Natural Person Insolvency Act (reformed in 2022, in force), an individual with solvency problems can apply to the court either to restructure debts — rescheduling, instalments or reduction — or, through bankruptcy, to be released from the remaining obligations; the standard discharge period is now up to three years and can end after one year if you meet every condition. Your local municipality must provide a free debt-counselling service (volanoustamisteenus) under the Social Welfare Act, and the court can refer you to it. Some obligations may remain payable, so get advice on your specific debts first.',
  'LV': 'Under the Insolvency Law, personal insolvency (fiziskas personas maksatnespejas process) lets an over-indebted individual apply to the court; after assets are realised, a settlement plan of one to three years — during which you pay about a third of income above the protected minimum — ends in discharge of the remaining debt. Be aware it requires money upfront (a state fee plus an administrator deposit of roughly two minimum wages), so since 2022 a separate notary-assessed route lets recognised poor or disadvantaged people be released from debt without that cost. The state Insolvency Control Service (mkd.gov.lv) gives free information; dedicated free debt-counselling charities are limited, so verify any adviser carefully.',
  'LT': 'Under the Law on Bankruptcy of Natural Persons (in force since 2013), a good-faith individual whose overdue debts exceed 25 minimum monthly wages can apply to the court — only you can start it, no creditor can force you — and a court-approved solvency-restoration plan (around three years) ends in discharge of the remaining unpaid debt. Not everything is wiped out: child maintenance, damages for injury or death, state fines and secured debts you choose to keep are excluded, and insolvency caused by gambling, addiction or fraud disqualifies you. Dedicated free debt-counselling services are limited, so seek advice carefully and avoid firms charging to arrange your bankruptcy.',
  'HU': 'Hungary has a personal insolvency system (magancsod) under Act CV of 2015 (in force since September 2015), run with the free help of the state Family Insolvency Service (Csaladi Csodvedelmi Szolgalat, csodvedelem.gov.hu). It begins as an out-of-court settlement coordinated by your main mortgage lender and, if no agreement is reached, moves to court; a supervised repayment plan of up to five (exceptionally seven) years ends in discharge of the remaining debt and can protect your home from enforcement. Note it is fairly restrictive — you generally need regular income and debts not exceeding twice your assets — and can be used only once every ten years. The central bank Financial Consumer Protection Centre (MNB) also gives free guidance.',
  'RO': 'Since 1 January 2018, Law 151/2015 gives a good-faith individual with non-business debts of at least 15 minimum wages three routes: an administrative repayment-plan procedure through the territorial insolvency commission, judicial liquidation of assets, or a simplified procedure for those with no seizable assets — each ending in discharge of the remaining debt, and a repayment plan can let you keep your home. The procedure runs under the National Authority for Consumer Protection (ANPC, anpc.ro), which is free to approach, but in practice it has been used by very few people, so treat it realistically and get advice before relying on it.',
  'HR': 'Consumer bankruptcy (stecaj potrosaca) has been in force since 2016 for an insolvent consumer (unable to pay debts over about EUR 3,982 for at least 90 days). It starts with a free out-of-court attempt at a FINA counselling centre (savjetovaliste); if creditors do not agree, the municipal court opens the case, and after a behaviour-checking period of one to five years an honest consumer is released from the remaining debt. Since 2019 a simplified, completely free procedure also exists for small long-standing debts, started automatically by FINA with the State covering the cost. Maintenance and debts from crime or from causing death or serious injury are never discharged.',
  'GR': 'The old Katseli law for over-indebted households (Law 3869/2010) is closed to new applications — it was replaced by the Insolvency Code (Law 4738/2020, "Debt Settlement and Second Chance"), in force since 2021. This provides an online out-of-court debt settlement mechanism (exodikastikos michanismos) for debts to banks and the State, plus a bankruptcy route that can discharge an honest individual from remaining debt after three years (one year in some cases), with special protection for a vulnerable debtor primary home. Be realistic: the out-of-court mechanism depends on creditors agreeing and has helped relatively few people so far, so get independent advice. The State General Secretariat of Financial Sector and Private Debt Management (keyd.gov.gr) runs free borrower-support centres.',
  'MX': 'Mexico\'s federal insolvency law (Ley de Concursos Mercantiles, in force since 2000) applies only to merchants and businesses — ordinary consumers who are not traders have no federal personal-bankruptcy or debt-discharge process, and the rarely used state "concurso civil" does not wipe out remaining debt either. In practice creditors can keep pursuing an unpaid balance, so your strongest tools are negotiating a payment plan directly and, for disputes with banks or lenders, filing a free complaint with CONDUSEF, the financial-consumer protection agency. Be cautious of any company promising to "erase" your debts: no such automatic discharge exists for individuals in Mexico.',
  'BR': 'Brazil\'s Over-Indebtedness Law (Lei 14.181/2021, in force since July 2021) amended the Consumer Defence Code to let a good-faith individual renegotiate all consumer debts at once while keeping a protected "existential minimum" for basic living costs. You can start the process free of charge through the courts, a Procon consumer-protection office, or the Public Defender\'s Office (Defensoria Pública): all creditors are called to a single conciliation hearing to build a payment plan of up to five years, and if they refuse, a judge can impose one. This is a court-supervised renegotiation, not a bankruptcy — it does not declare you insolvent, and traditional "falência" applies only to businesses.',
  'AR': 'Argentina\'s insolvency law (Ley 24.522 de Concursos y Quiebras, in force since 1995) does apply to individuals, including non-merchants: you can file a "concurso preventivo" to reach a court-approved agreement with creditors, or be declared in "quiebra" (bankruptcy), which is followed by "rehabilitación" and a fresh start, typically one year after bankruptcy is declared. There is no separate simplified consumer-insolvency procedure, so the same business-oriented framework applies to ordinary people and it requires a lawyer and the courts. Before going that far, free help exists for disputes with banks and lenders (see the support directory).',
  'NZ': 'New Zealand has one of the more debtor-friendly systems. Under the Insolvency Act 2006, the government Insolvency and Trustee Service offers three options through the Official Assignee: a No Asset Procedure that clears most debts in about 12 months if you have no realisable assets and owe between NZ$1,000 and NZ$50,000; a Debt Repayment Order if you can make partial payments; and full bankruptcy (usually three years). Most unsecured debts are wiped, though student loans, court fines, child support and secured debts are not. Free financial-mentor help is available before you decide (see the support directory).',
  'IN': 'India passed a modern personal-insolvency framework in the Insolvency and Bankruptcy Code 2016, but its individual-insolvency provisions are still not fully in force — only the parts covering personal guarantors of company debts were notified (from December 2019). For ordinary individuals the operative law remains the colonial-era Provincial Insolvency Act 1920 (and the Presidency Towns Insolvency Act 1909 in Mumbai, Kolkata and Chennai), handled through the courts. This means there is no quick modern "fresh start" discharge for most individuals yet, so negotiating with creditors and seeking free legal-aid advice are usually the practical first steps.',
  'ID': 'Indonesia\'s bankruptcy law (Law No. 37 of 2004 on Bankruptcy and Suspension of Debt Payment Obligations, in force since 2004) applies to individuals as well as companies, but it does not recognise debt forgiveness — after a bankruptcy and asset sale, any unpaid balance survives and creditors can still pursue it. The more useful route for most people is PKPU (Penundaan Kewajiban Pembayaran Utang), a court-supervised suspension of payments in which you propose a settlement or composition plan to creditors through the Commercial Court. Because there is no automatic discharge, negotiating a realistic repayment plan — in or out of court — is central.',
  'PH': 'The Philippines\' insolvency law (Financial Rehabilitation and Insolvency Act, FRIA / RA 10142, in force since 2010) covers individuals, offering Suspension of Payments — a court moratorium to negotiate a repayment plan when you have enough assets but a cash-flow problem — and liquidation when liabilities exceed assets and total debt is above PHP 500,000. Importantly, FRIA gives individuals no discharge of remaining debt: after assets are applied, any unpaid balance persists unless settled (proposals to add personal-bankruptcy discharge were pending in Congress as of 2025). In practice, negotiating directly with creditors is often the most effective step.',
  'SG': 'Singapore consolidated its personal-insolvency rules in the Insolvency, Restructuring and Dissolution Act 2018 (in force since July 2020), administered by the Official Assignee at the Ministry of Law. If bankruptcy proceedings are started and you owe no more than S$150,000, the court can place you on the Debt Repayment Scheme — a structured plan of up to five years that lets you avoid a formal bankruptcy order; the bankruptcy threshold itself is S$15,000. Bankruptcy remains available for larger or unmanageable debts. Free credit counselling is available to help you weigh the options (see the support directory).',
  'MY': 'Malaysia\'s personal-insolvency law is the Insolvency Act 1967 (renamed from the Bankruptcy Act in 2017 and reformed again in 2020 and 2023), administered by the Malaysian Department of Insolvency under the Director General of Insolvency. A creditor can only petition to bankrupt you for debts above RM100,000 (in force since 2021), and honest bankrupts can now be automatically discharged three years after filing their statement of affairs. Before bankruptcy, a Voluntary Arrangement or a free debt-management plan through AKPK can restructure what you owe (see the support directory).',
  'TH': 'Thailand\'s Bankruptcy Act B.E. 2483 (1940, as amended) works mainly as a debt-collection tool rather than a fresh-start system: bankruptcy is normally initiated by a creditor, and only where an individual owes at least THB 1 million, so most ordinary over-indebted people fall outside it and cannot obtain a discharge at all. Where it does apply, an individual is usually discharged about three years after being adjudged bankrupt (longer for dishonest or repeat cases). Because formal bankruptcy is out of reach for most, the practical path is negotiated debt restructuring — for example through the Bank of Thailand-backed Debt Clinic (see the support directory).',
  'ZA': 'South Africa offers several statutory routes. Under the National Credit Act 2005 you can enter debt review (debt counselling) with a counsellor registered with the National Credit Regulator, which restructures your payments into one affordable court-ordered plan but does not write off the debt; an administration order (Magistrates\' Courts Act) covers smaller debts; and sequestration under the Insolvency Act 1936 can give a genuine discharge, though rehabilitation typically takes up to ten years and creditors must expect a meaningful payout. A free debt-write-off scheme for very low-income consumers (the National Credit Amendment Act "debt intervention") was passed in 2019 but is not yet in force. Choose the lightest option that fixes the problem.',
  'AE': 'The UAE created a personal-insolvency framework for the first time with Federal Decree-Law No. 19 of 2019 (in force since November 2019), which lets a non-trading individual reschedule debts, reach a court-supervised settlement, or go through bankruptcy with a discharge (usually three years after completion). A critical safety point: since 2 January 2022 a cheque that bounces purely for insufficient funds is no longer a crime and is treated as a civil matter, but issuing a cheque from a closed account, stopping payment without lawful cause, or any fraud or forgery is still criminal and can lead to imprisonment, travel bans and, for expatriates, deportation. If you are struggling with bank debt, act early, keep everything in writing, and get proper legal advice before any cheque or loan default; free help with bank disputes is available through Sanadak (see the support directory).',
  'KE': 'Kenya modernised its law with the Insolvency Act No. 18 of 2015 (in force since 2016), which replaced the old Bankruptcy Act and, unusually for the region, emphasises rescue and a fresh start. Alongside full bankruptcy (automatic discharge after three years unless a creditor objects), it offers gentler alternatives: an individual voluntary arrangement, a summary instalment order, and a no-asset procedure for people with debts of roughly KES 100,000 to 4,000,000 and no assets to sell. These run through the Office of the Official Receiver; note that formal bankruptcy carries court and deposit costs, so the no-asset procedure exists precisely for those who cannot afford them.',
  '_other': 'Most countries protect you from harassment by collectors and offer a formal route to restructure debt you genuinely cannot repay — usually through a court or a government-funded service. Use the free services below to find the protections that apply where you live.',
};

function cmpCountryResources(member) {
  const raw = member?.onboarding?.country || member?.country || '';
  const iso = cmpCountryIso(raw);
  return CMP_PILLAR_A[iso] || null;
}

// Country-specific statutory note, or null. Never falls back to '_other': a
// generic paragraph must not be presented as if it described the member's own
// jurisdiction in a file they keep permanently.
function cmpCountryLegal(member) {
  const raw = member?.onboarding?.country || member?.country || '';
  const iso = cmpCountryIso(raw);
  return CMP_PILLAR_A_LEGAL[iso] || null;
}

function cmpBuildKitHtml(season, companion, member) {
  const ob = member?.onboarding || {};
  const currency = ob.currency || member?.currency || 'EUR';
  const endDate = String(season.season_end || '').slice(0, 10);
  const filename = `My-90-Day-Plan_${endDate}.html`;

  const plan = member?.debt_recovery_plan || member?.member_plan || '';
  const planHtml = plan
    ? cmpEsc(plan).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')
    : '<em>No plan version was saved during this season.</em>';

  // 2 · Progress
  const completedMap = (companion.completed && typeof companion.completed === 'object') ? companion.completed : {};
  const completedRows = Object.keys(completedMap)
    .sort((a, b) => (completedMap[a] < completedMap[b] ? -1 : 1))
    .map(k => `<li><span class="k">${cmpEsc(k)}</span> <span class="d">${cmpEsc(String(completedMap[k]).slice(0, 10))}</span></li>`)
    .join('');
  const planUpdates = Number.isFinite(companion.plan_updates) ? companion.plan_updates : 0;

  // 3 · Payoff date: entry vs now
  const totalDebt = cmpTotalDebt(member);
  const entryBudget = companion.entry?.budget ?? cmpBaselineBudget(member);
  const nowBudget = cmpNum(companion.momentum?.debt_budget) ?? entryBudget;
  const entryMonths = cmpMonthsToPayoff(totalDebt, entryBudget);
  const nowMonths = cmpMonthsToPayoff(totalDebt, nowBudget);
  const saved = (entryMonths !== null && nowMonths !== null) ? Math.max(0, entryMonths - nowMonths) : null;

  // 4 · Country resources
  const res = cmpCountryResources(member);
  const legalNote = cmpCountryLegal(member);
  // v16.22: hasCountryResources is the single truth about what section 4 really
  // contains. cmpSendGraduationKitEmail reads it so the email cannot promise
  // country services that are not in the attachment.
  const hasCountryResources = Boolean((res && res.length) || legalNote);
  const orgsHtml = res && res.length
    ? '<ul>' + res.map(r => `<li><strong>${cmpEsc(r.name)}</strong>${r.url ? ` — ${cmpEsc(r.url)}` : ''}${r.note ? `<br><span class="d">${cmpEsc(r.note)}</span>` : ''}</li>`).join('') + '</ul>'
    : '';
  const legalHtml = legalNote ? `<p>${cmpEsc(legalNote)}</p>` : '';
  const resourcesHtml = hasCountryResources
    ? orgsHtml + legalHtml
    : `<p>Your country's verified support services are listed and kept current at debt-free.world. They are free to everyone, always — you do not need an account to use them.</p>`;

  // 5 · Letters, in full
  const docs = Array.isArray(member?.documents) ? member.documents : [];
  const lettersHtml = docs.length
    ? docs.map(d => `<article class="letter"><h3>${cmpEsc(d.title || 'Letter')}</h3><p class="d">${cmpEsc(d.creditor || '')} · ${cmpEsc(String(d.created_at || '').slice(0, 10))}</p><pre>${cmpEsc(d.text || '')}</pre></article>`).join('')
    : '<p><em>No letters were created during this season.</em></p>';

  const firstname = ob.firstname || member?.firstname || '';

  // ── v16.27 · CORRECTION 3 · the footer told a paying-customer story to
  // everyone. season.acquisition is 'paid' or 'community'; Community Access paid
  // 0 € and was handed a permanent file asserting they paid 19 €. The test is
  // === 'paid' and not !== 'community' on purpose: on a season with no
  // acquisition field the fallback must be the sentence that claims nothing
  // about money, because a false payment claim in the one artefact the customer
  // keeps forever is worse than a vaguer true one. cmpBuildOutcome's opposite
  // default is correct for ITS purpose (a Tier 2 row must never be missing) and
  // is locked byte-for-byte by the region proof; the two are not in conflict.
  // "19 €" appears in the paid branch and nowhere else in this file's output.
  // v16.27.1 · the community arm is PRESENT tense: the kit ships on day 83.
  const keptLine = season.acquisition === 'paid'
    ? 'You paid 19 € for a 90-day season. This file is the part you keep.'
    : 'You have the full 90-day season. This file is the part you keep.';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>My 90-Day Plan</title>
<style>
:root{--g:#0f4d28}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#111;font:16px/1.65 Georgia,'Times New Roman',serif;}
.wrap{max-width:760px;margin:0 auto;padding:48px 24px 80px}
h1{font-size:30px;font-weight:normal;color:var(--g);margin:0 0 6px}
h2{font-size:20px;font-weight:normal;color:var(--g);margin:44px 0 12px;border-left:3px solid var(--g);padding-left:12px}
h3{font-size:16px;margin:22px 0 4px}
p{margin:0 0 14px}
ul{margin:0 0 14px;padding-left:20px}
li{margin:0 0 6px}
.lede{color:#333}
.d{color:#555;font-size:13px}
.k{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
.grid{display:table;width:100%;margin:0 0 14px}
.row{display:table-row}
.row>div{display:table-cell;padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top}
.row>div:first-child{color:#555;width:44%}
pre{white-space:pre-wrap;word-wrap:break-word;font:14px/1.6 Georgia,serif;background:#fafaf8;border-left:3px solid var(--g);padding:14px 16px;margin:0 0 18px}
.letter{margin:0 0 26px}
footer{margin-top:56px;padding-top:18px;border-top:1px solid #eee;color:#555;font-size:13px}
@media print{body{font-size:12pt}.wrap{padding:0}h2{page-break-after:avoid}.letter{page-break-inside:avoid}}
</style></head>
<body><div class="wrap">

<h1>My 90-Day Plan</h1>
<p class="lede">${firstname ? cmpEsc(firstname) + ' — this' : 'This'} is everything you built between ${cmpEsc(String(season.season_start).slice(0, 10))} and ${cmpEsc(endDate)}.</p>

<h2>1 · My plan</h2>
<p>${planHtml}</p>

<h2>2 · What I did</h2>
${completedRows ? `<ul>${completedRows}</ul>` : '<p><em>No steps were recorded during this season.</em></p>'}
<p class="d">Plan updates during the season: ${planUpdates}</p>

<h2>3 · My payoff date</h2>
<div class="grid">
  <div class="row"><div>Total debt at the start</div><div>${cmpMoney(companion.entry?.debt_total ?? totalDebt, currency)}</div></div>
  <div class="row"><div>Monthly amount at the start</div><div>${cmpMoney(entryBudget, currency)}</div></div>
  <div class="row"><div>Monthly amount now</div><div>${cmpMoney(nowBudget, currency)}</div></div>
  <div class="row"><div>Months to payoff at the start</div><div>${entryMonths === null ? '—' : entryMonths}</div></div>
  <div class="row"><div>Months to payoff now</div><div>${nowMonths === null ? '—' : nowMonths}</div></div>
  <div class="row"><div>Difference</div><div>${saved === null ? '—' : (saved + ' months earlier')}</div></div>
</div>
<p class="d">Straight-line estimate: total remaining divided by the monthly amount you set. It does not model interest, and it changes whenever your payment amount changes.</p>

<h2>4 · Support in my country</h2>
${resourcesHtml}

<h2>5 · My letters</h2>
${lettersHtml}

<footer>
<p>${keptLine}</p>
<p><strong>On day 90 we delete your plan, your answers, your documents, and everything personal inside them. What stays is the payment and consent receipt our accounting law requires — no plan, no debts, no amounts. Your kit is yours and works without us.</strong></p>
<p class="d">Debt-Free.World · Amliv Oy · Nokia, Finland · VAT FI32503518 · support@debt-free.world<br>
This file works offline and needs nothing from us to open. It is not financial or legal advice.</p>
</footer>

</div></body></html>`;

  return { filename, html, has_country_resources: hasCountryResources };
}

// ════════════════════════════════════════════════
// §3 · TIER 2 — ANONYMOUS OUTCOME ROW
// ALLOWLIST BUILDER. Every field below is named explicitly. A new Tier-1 field
// cannot leak here by accident. No email, no name, no free text, no exact
// amount, no exact day.
// ════════════════════════════════════════════════
function cmpBracketDebtTotal(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  const n = Number(v);
  if (n < 2000) return '0-2k';
  if (n < 5000) return '2-5k';
  if (n < 10000) return '5-10k';
  if (n < 25000) return '10-25k';
  if (n < 50000) return '25-50k';
  if (n < 100000) return '50-100k';
  return '100k+';
}
function cmpBracketDebtCount(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  const n = Number(v);
  if (n <= 1) return '1';
  if (n === 2) return '2';
  if (n <= 5) return '3-5';
  if (n <= 9) return '6-9';
  return '10+';
}
function cmpBracketSurplus(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  const n = Number(v);
  if (n < 0) return 'negative';
  if (n === 0) return '0';
  if (n <= 50) return '1-50';
  if (n <= 150) return '51-150';
  if (n <= 300) return '151-300';
  if (n <= 600) return '301-600';
  return '600+';
}
function cmpBracketPayoffMonths(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  const n = Number(v);
  if (n <= 12) return '0-12';
  if (n <= 24) return '13-24';
  if (n <= 48) return '25-48';
  if (n <= 84) return '49-84';
  if (n <= 120) return '85-120';
  return '120+';
}
function cmpBracketImproved(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  const n = Number(v);
  if (n <= 0) return 'none';
  if (n <= 3) return '1-3';
  if (n <= 6) return '4-6';
  if (n <= 11) return '7-11';
  if (n <= 24) return '12-24';
  return '24+';
}
function cmpBracketWeeksActive(v) {
  const n = Number(v) || 0;
  if (n <= 2) return '1-2';
  if (n <= 4) return '3-4';
  if (n <= 8) return '5-8';
  return '9-12';
}
function cmpBracketCount(v) {
  const n = Number(v) || 0;
  if (n <= 0) return '0';
  if (n === 1) return '1';
  if (n <= 3) return '2-3';
  if (n <= 6) return '4-6';
  if (n <= 9) return '7-9';
  return '10+';
}

// Bounded allowlist. Anything unrecognised becomes UNKNOWN — never free text.
const CMP_COUNTRY_ISO = {
  'FINLAND': 'FI', 'SUOMI': 'FI', 'SWEDEN': 'SE', 'SVERIGE': 'SE', 'NORWAY': 'NO', 'NORGE': 'NO',
  'DENMARK': 'DK', 'DANMARK': 'DK', 'GERMANY': 'DE', 'DEUTSCHLAND': 'DE', 'NETHERLANDS': 'NL',
  'BELGIUM': 'BE', 'FRANCE': 'FR', 'SPAIN': 'ES', 'ESPANA': 'ES', 'PORTUGAL': 'PT', 'ITALY': 'IT',
  'ITALIA': 'IT', 'POLAND': 'PL', 'POLSKA': 'PL', 'CZECHIA': 'CZ', 'CZECH REPUBLIC': 'CZ',
  'ESTONIA': 'EE', 'LATVIA': 'LV', 'LITHUANIA': 'LT', 'HUNGARY': 'HU', 'ROMANIA': 'RO',
  'CROATIA': 'HR', 'BULGARIA': 'BG', 'SLOVAKIA': 'SK', 'UNITED KINGDOM': 'GB', 'UK': 'GB',
  'GREAT BRITAIN': 'GB', 'IRELAND': 'IE', 'AUSTRIA': 'AT', 'SWITZERLAND': 'CH', 'GREECE': 'GR',
  'UNITED STATES': 'US', 'USA': 'US', 'UNITED STATES OF AMERICA': 'US', 'CANADA': 'CA',
  'BRAZIL': 'BR', 'BRASIL': 'BR', 'MEXICO': 'MX', 'ARGENTINA': 'AR', 'AUSTRALIA': 'AU',
  'NEW ZEALAND': 'NZ', 'INDIA': 'IN', 'INDONESIA': 'ID', 'PHILIPPINES': 'PH', 'SINGAPORE': 'SG',
  'MALAYSIA': 'MY', 'THAILAND': 'TH', 'SOUTH AFRICA': 'ZA', 'UNITED ARAB EMIRATES': 'AE',
  'UAE': 'AE', 'KENYA': 'KE',
};
function cmpCountryIso(raw) {
  const s = String(raw || '').trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  const hit = CMP_COUNTRY_ISO[s.toUpperCase()];
  return hit || 'UNKNOWN';
}

const CMP_LANGS = ['en','fi','sv','de','no','da','nl','es','fr','it','pl','pt','cs','et','lv','lt','hu','ro','hr','el','id'];
function cmpLangCode(raw) {
  const s = String(raw || '').trim().toLowerCase().slice(0, 2);
  return CMP_LANGS.includes(s) ? s : 'unknown';
}

function cmpBuildOutcome(season, companion, member) {
  const entry = companion.entry || null;
  const liveExit = member ? cmpSnapshot(member, cmpNum(companion.momentum?.debt_budget)) : null;
  const exit = liveExit || companion.exit || null;

  const entryMonths = entry ? entry.payoff_months : null;
  const exitMonths  = exit ? exit.payoff_months : null;
  const improved = (entryMonths !== null && exitMonths !== null) ? (entryMonths - exitMonths) : null;

  const mode = companion.mode_changed ? 'mixed' : (companion.mode || 'unset');
  const weeks = Array.isArray(companion.weeks_touched) ? companion.weeks_touched.length : 0;
  const tasks = companion.completed && typeof companion.completed === 'object'
    ? Object.keys(companion.completed).length : 0;

  // ── EXPLICIT ALLOWLIST — this object is the entire Tier 2 surface. ──
  // v16.24 · schema_version 2 and the three §3.1 fields. The builder's shape is
  // unchanged: every field is still named here by hand, so a new Tier-1 field
  // still cannot reach Tier 2 by accident. The three normalisers can only
  // return a value §3.3 permits, and a missing input yields 'unknown' — never
  // an empty string, never null, never an omitted key, so every row is
  // structurally identical (§3.3).
  return {
    schema_version: 2,
    period: String(season.season_start || '').slice(0, 7),   // YYYY-MM only, never a day
    country: cmpCountryIso(member?.onboarding?.country || member?.country),
    language: cmpLangCode(member?.onboarding?.language || member?.language),
    acquisition: season.acquisition === 'community' ? 'community' : 'paid',
    mode,
    household:  cmpHouseholdValue(member?.onboarding?.household ?? member?.household),
    children:   cmpChildrenValue(member?.onboarding?.children ?? member?.children),
    employment: cmpEmploymentValue(member?.onboarding?.employment ?? member?.employment),
    entry: entry ? {
      debt_total: cmpBracketDebtTotal(entry.debt_total),
      debt_count: cmpBracketDebtCount(entry.debt_count),
      surplus: cmpBracketSurplus(entry.surplus),
      payoff_months: cmpBracketPayoffMonths(entry.payoff_months),
      enforcement: Boolean(entry.enforcement),
    } : null,
    exit: exit ? {
      debt_total: cmpBracketDebtTotal(exit.debt_total),
      debt_count: cmpBracketDebtCount(exit.debt_count),
      surplus: cmpBracketSurplus(exit.surplus),
      payoff_months: cmpBracketPayoffMonths(exit.payoff_months),
      enforcement: Boolean(exit.enforcement),
    } : null,
    delta: { payoff_months_improved: cmpBracketImproved(improved) },
    engagement: {
      weeks_active: cmpBracketWeeksActive(weeks),
      tasks_completed: cmpBracketCount(tasks),
      letters_generated: cmpBracketCount(companion.letters_count),
      plan_updates: cmpBracketCount(companion.plan_updates),
    },
    graduated: true,
  };
}

// ════════════════════════════════════════════════
// §2.4 · SEASON SWEEP
// Order is part of the contract: outcome written -> read back -> only then purge.
// ════════════════════════════════════════════════
async function cmpListMemberIdsForDate(env, dateStr) {
  const prefix = `seasonidx:${dateStr}:`;
  const ids = [];
  let cursor;
  for (let guard = 0; guard < 50; guard++) {
    const res = await cmpList(env.MEMBER_TOKENS, prefix, cursor);
    for (const k of res.keys) {
      const id = k.name.slice(prefix.length);
      if (/^[0-9a-f]{32}$/.test(id)) ids.push(id);
    }
    if (res.list_complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return ids;
}

async function runSeasonSweep(env, dateStr, dryRun) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || '')) ? dateStr : cmpTodayUtcDate();
  const result = {
    date, dry_run: Boolean(dryRun),
    t7: { members: [], kits_sent: 0, errors: [] },
    t1: { members: [], reminders_sent: 0, errors: [] },
    t0: { members: [], outcomes_written: 0, purged: 0, skipped_purge: 0,
          receipts_without_session: 0, errors: [] },
  };

  // v16.28 · R1 §1.5 · the crons watch each other. Wrapped at the call site so
  // it cannot stop the sweep or change its return; skipped on a dry run.
  if (!result.dry_run) {
    try { await runKvBackupHeartbeatCheck(env); } catch (e) { console.error('r1-heartbeat', e && e.message); }
  }

  // ── T-7 · generate kit, email it as an attachment ──
  const t7Ids = await cmpListMemberIdsForDate(env, cmpShiftDate(date, 7));
  result.t7.members = t7Ids;
  if (!dryRun) {
    for (const id of t7Ids) {
      try {
        const loaded = await cmpLoadMemberByMemberId(env, id);
        if (!loaded || !loaded.member || loaded.season.kit_sent_at) continue;
        const companion = await cmpLoadCompanion(env, id);
        const built = cmpBuildKitHtml(loaded.season, companion, loaded.member);
        const nowIso = new Date().toISOString();
        await cmpSendGraduationKitEmail(loaded.email, built, env.BREVO_API_KEY);
        await cmpPut(env.MEMBER_TOKENS, `season:${id}`, JSON.stringify({
          ...loaded.season, kit_generated_at: nowIso, kit_sent_at: nowIso
        }), { expirationTtl: CMP_SEASON_TTL });
        result.t7.kits_sent++;
      } catch (e) { result.t7.errors.push({ id, e: String(e && e.message || e) }); }
    }
  }

  // ── T-1 · reminder, no attachment, no regeneration ──
  const t1Ids = await cmpListMemberIdsForDate(env, cmpShiftDate(date, 1));
  result.t1.members = t1Ids;
  if (!dryRun) {
    for (const id of t1Ids) {
      try {
        const loaded = await cmpLoadMemberByMemberId(env, id);
        if (!loaded || !loaded.email) continue;
        await cmpSendFinalReminderEmail(loaded.email, env.BREVO_API_KEY);
        result.t1.reminders_sent++;
      } catch (e) { result.t1.errors.push({ id, e: String(e && e.message || e) }); }
    }
  }

  // ── T-0 · outcome first, purge only on confirmed read-back ──
  const t0Ids = await cmpListMemberIdsForDate(env, date);
  result.t0.members = t0Ids;
  if (!dryRun) {
    for (const id of t0Ids) {
      try {
        const loaded = await cmpLoadMemberByMemberId(env, id);
        if (!loaded) continue;
        const season = loaded.season;
        if (season.purged_at) continue;
        const companion = await cmpLoadCompanion(env, id);

        // 1) + 2) write the outcome row and read it back.
        if (!season.outcome_written) {
          if (!env.OUTCOMES) throw new Error('OUTCOMES binding missing');
          const row = cmpBuildOutcome(season, companion, loaded.member);
          const key = `outcome:${crypto.randomUUID()}`;
          await env.OUTCOMES.put(key, JSON.stringify(row));       // no TTL, no member reference
          const back = await env.OUTCOMES.get(key);
          if (!back) throw new Error('outcome read-back failed');
          JSON.parse(back);
          season.outcome_written = true;
          await cmpPut(env.MEMBER_TOKENS, `season:${id}`, JSON.stringify(season), { expirationTtl: CMP_SEASON_TTL });
          result.t0.outcomes_written++;
        }

        // 3) + 4) purge Tier 1 only now.
        const purge = await cmpPurgeMember(env, id, loaded);
        result.t0.purged++;
        // v16.25 · visibility for the §2.5 fallback key. Zero is the expected
        // value; anything else is a webhook that stopped storing stripe_session.
        if (purge && purge.receipt_without_session) result.t0.receipts_without_session++;
      } catch (e) {
        // Outcome failed -> no purge. Retried tomorrow; the 100-day TTL is the backstop.
        result.t0.skipped_purge++;
        result.t0.errors.push({ id, e: String(e && e.message || e) });
      }
    }
  }

  return result;
}

// Purge: financial + personal payload deleted, the payment + consent receipt
// moved OUT of the token keyspace into its own key (§2.5), live tokens gone.
async function cmpPurgeMember(env, memberId, loaded) {
  const nowIso = new Date().toISOString();
  const email = loaded.email;
  let receiptKey = null;
  let receiptWithoutSession = false;

  if (loaded.member && loaded.tokenHash) {
    const m = loaded.member;
    // ── v16.24 · §2.5 · THE RECEIPT LEAVES THE TOKEN KEYSPACE ─────────────
    // Until v16.23 the six-field receipt survived under a rotated {tokenHash}
    // with the `email:{addr}` pointer aimed at it. That put accounting data,
    // retained for seven years on a bookkeeping basis, inside the keyspace the
    // magic-link token rotation rewrites under a fixed 90-day TTL. Three
    // endpoints could reach it through that pointer and silently destroy 6.75
    // years of retention; v16.23 patched one of them, and a fourth endpoint
    // written later would have reopened the hole. Patching each caller is
    // defensive. Moving the data is structural, so there is nothing left to
    // patch.
    //
    // The purge now does exactly three things, in this order:
    //   1. WRITE  receipt:{memberId}:{stripe_session}  ttl CMP_RECEIPT_TTL (7 y)
    //   2. DELETE the {tokenHash} record   entirely
    //   3. DELETE the email:{addr} pointer entirely
    //
    // The write is first and it is NOT wrapped in a try: cmpPut throws a
    // CompanionStoreError on failure, runSeasonSweep catches it, counts a
    // skipped purge and leaves the member record whole for tomorrow's run. A
    // receipt that could not be stored must never be followed by a delete.
    //
    // The receipt is reachable when it is needed and invisible everywhere else:
    // memberId is derived from the email, so a refund dispute resolves to
    // list({ prefix: 'receipt:' + memberId }). No customer path reads that
    // prefix.
    //
    // ── v16.25 · §2.5 rev 1.4 · ONE KEY PER PURCHASE, NOT PER MEMBER ──────
    // memberId is derived from the email address, and §2.5 deliberately allows
    // a customer to come back and buy another season. Under receipt:{memberId}
    // the second purge would overwrite the first season's payment receipt —
    // the exact seven-year accounting record this structure exists to protect,
    // destroyed silently by a supported customer journey. The key therefore
    // carries the Stripe session, which is unique per purchase and ties our
    // copy to Stripe's own authoritative record. Zero receipts exist in
    // production (verified 29.7.2026), so this costs no migration.
    //
    // stripe_session absent or null: no webhook branch can currently produce
    // that — the paid and the 0 € community branch both store session.id — but
    // the key must still be defined for it. The fallback is DETERMINISTIC, not
    // random: `nosession-{season_start in epoch ms}`. It is unique (the same
    // member cannot start two seasons in the same millisecond), it is stable
    // (a sweep retried after a partial failure rebuilds the same key and
    // therefore cannot duplicate a receipt — a UUID would break precisely
    // this), it names the season the receipt belongs to, and the literal
    // 'nosession' makes the anomaly obvious in a key listing without a log dig.
    //
    // The purge PROCEEDS in that case. The rule is: a transient fault (KV
    // down) defers to tomorrow's run; a permanent data state (a field that is
    // simply not there) proceeds and is counted, in
    // result.t0.receipts_without_session. Erasing personal data on day 90 is
    // never blocked by a missing accounting field. A failed receipt WRITE is
    // still the first kind and still defers the purge — that rule is unchanged.
    //
    // The receipt body is untouched: exactly the six fields of §2.5, and
    // stripe_session simply carries null when there is none. The field is
    // neither dropped nor invented.
    const receipt = {
      email:                m.email || email || null,
      stripe_session:       m.stripe_session || null,
      tos_consent_required: m.tos_consent_required ?? null,
      tos_consent_accepted: m.tos_consent_accepted ?? null,
      tos_consent_at:       m.tos_consent_at ?? null,
      season_purged_at:     nowIso,
    };
    const sessionId = (typeof receipt.stripe_session === 'string' && receipt.stripe_session.trim())
      ? receipt.stripe_session.trim() : null;
    receiptWithoutSession = sessionId === null;
    const seasonStartMs = Date.parse(loaded.season && loaded.season.season_start);
    const receiptSuffix = sessionId !== null
      ? sessionId
      : `nosession-${Number.isFinite(seasonStartMs) ? seasonStartMs : 0}`;
    receiptKey = `receipt:${memberId}:${receiptSuffix}`;
    await cmpPut(env.MEMBER_TOKENS, receiptKey, JSON.stringify(receipt), { expirationTtl: CMP_RECEIPT_TTL });
    // Deleting the record is what invalidates every live magic link. There is
    // no rotated survivor to sign in with any more, by design.
    try { await cmpDelete(env.MEMBER_TOKENS, loaded.tokenHash); } catch { /* TTL backstop */ }
    // Both spellings of the pointer: cmpLoadMemberByMemberId already falls back
    // to the lower-cased form because season.member_email preserves the case
    // the webhook received, and a pointer left behind here would keep a purged
    // address answering differently from an unknown one — the exact thing §2.6
    // forbids.
    try { await cmpDelete(env.MEMBER_TOKENS, `email:${email}`); } catch { /* TTL backstop */ }
    const lowerEmail = String(email || '').toLowerCase();
    if (lowerEmail && lowerEmail !== email) {
      try { await cmpDelete(env.MEMBER_TOKENS, `email:${lowerEmail}`); } catch { /* TTL backstop */ }
    }
  }

  try { await cmpDelete(env.MEMBER_TOKENS, `companion:${memberId}`); } catch { /* TTL backstop */ }
  const idxDate = loaded.season.sweep_date || String(loaded.season.season_end).slice(0, 10);
  try { await cmpDelete(env.MEMBER_TOKENS, `seasonidx:${idxDate}:${memberId}`); } catch { /* TTL backstop */ }
  try { await cmpDelete(env.MEMBER_TOKENS, `season:${memberId}`); } catch { /* TTL backstop */ }

  // Clear the funding-relevant Brevo attributes.
  try {
    await updateBrevoAttribute(email, env.BREVO_API_KEY, {
      DEBT_RECOVERY_MEMBER: false,
      DEBT_COMMUNITY_MEMBER: false,
      DASHBOARD_LINK: '',
    });
  } catch { /* non-critical */ }

  // v16.25 · the caller counts the §2.5 fallback key. Nothing else reads this.
  return { receipt_key: receiptKey, receipt_without_session: receiptWithoutSession };
}

async function cmpSendGraduationKitEmail(email, built, apiKey) {
  // ── v16.22 · the claim is now conditional on the artefact ──────────────
  // Promising "your country's support services" when CMP_PILLAR_A has no entry
  // for that country is a small lie in the one message whose entire job is to
  // make "we delete our copy" credible. When the attachment has no country
  // section, the email says so and points to the free generic resources.
  const hasCountry = built && built.has_country_resources === true;
  const contentsLine = hasCountry
    ? "your plan, your progress, your payoff date, your letters, and your country's support services"
    : 'your plan, your progress, your payoff date, and your letters';
  const resourcesLineText = hasCountry
    ? 'The generic country resources on debt-free.world stay free to everyone, always.'
    : "Support services for your country are not in the file, but they are listed and kept current at debt-free.world — free to everyone, always, with no account needed.";
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
      replyTo: { email: 'support@debt-free.world' },
      to: [{ email }],
      subject: 'Your season ends in 7 days — here is everything you built',
      textContent: `Your 90-day season ends in seven days.\n\nAttached is everything you built: ${contentsLine}. One file. It works offline and it belongs to you.\n\nOn the final day we permanently delete our copy of your personal data. We don't keep it "just in case". Save the attachment somewhere you'll find it again.\n\n${resourcesLineText}\n\nsupport@debt-free.world\nAmliv Oy · Nokia, Finland · VAT FI32503518`,
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;"><div style="max-width:560px;margin:0 auto;padding:32px 16px;"><div style="background:#ffffff;border-radius:8px;padding:36px 32px;border:1px solid #e5e7eb;"><p style="font-size:18px;color:#0f4d28;margin:0 0 28px;font-family:Georgia,serif;">Debt-Free.World</p><h1 style="font-size:20px;color:#111827;font-family:Georgia,serif;font-weight:normal;margin:0 0 16px;">Your season ends in 7 days. Here's everything you built &mdash; it's yours.</h1><p style="font-size:15px;color:#374151;margin:0 0 14px;line-height:1.7;">Attached is one file: ${contentsLine}. It opens offline and needs nothing from us.</p><p style="font-size:15px;color:#374151;margin:0 0 14px;line-height:1.7;">On the final day we permanently delete our copy of your personal data. We don't keep it &ldquo;just in case&rdquo;. Please save the attachment somewhere you'll find it again.</p><p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.7;">${resourcesLineText}</p><hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;"><p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">Questions? support@debt-free.world<br>Amliv Oy &middot; Nokia, Finland &middot; VAT FI32503518</p></div></div></body></html>`,
      attachment: [{ content: cmpBase64Utf8(built.html), name: built.filename }],
    })
  });
  // v16.27 · CORRECTION 5 · the status code alone lost the reason. The prefix and
  // the throw are unchanged: runSeasonSweep still counts a failed kit as an
  // error. cmpBrevoErrDetail never throws, so a body that cannot be read leaves
  // the message exactly as it was before this pass.
  if (!res || !res.ok) throw new Error('kit email failed: ' + (res && res.status) + await cmpBrevoErrDetail(res));
}

async function cmpSendFinalReminderEmail(email, apiKey) {
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
      replyTo: { email: 'support@debt-free.world' },
      to: [{ email }],
      subject: 'Tomorrow: we delete our copy of your data',
      textContent: `Tomorrow your 90-day season closes and we permanently delete our copy of your personal data.\n\nThe file we sent you last week is the part you keep. If you haven't saved it yet, do that today — it can't be regenerated afterwards.\n\nThe generic country resources on debt-free.world stay free to everyone, always.\n\nsupport@debt-free.world\nAmliv Oy · Nokia, Finland · VAT FI32503518`,
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;"><div style="max-width:560px;margin:0 auto;padding:32px 16px;"><div style="background:#ffffff;border-radius:8px;padding:36px 32px;border:1px solid #e5e7eb;"><p style="font-size:18px;color:#0f4d28;margin:0 0 28px;font-family:Georgia,serif;">Debt-Free.World</p><h1 style="font-size:20px;color:#111827;font-family:Georgia,serif;font-weight:normal;margin:0 0 16px;">Tomorrow we delete our copy.</h1><p style="font-size:15px;color:#374151;margin:0 0 14px;line-height:1.7;">The file we sent last week is the part you keep. If you haven't saved it yet, do that today &mdash; it can't be regenerated afterwards.</p><p style="font-size:15px;color:#374151;margin:0 0 28px;line-height:1.7;">The generic country resources on debt-free.world stay free to everyone, always.</p><hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;"><p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">Questions? support@debt-free.world<br>Amliv Oy &middot; Nokia, Finland &middot; VAT FI32503518</p></div></div></body></html>`
    })
  });
}

// ── POST /internal/season-sweep — manual run + dry_run (§2.4) ──
async function handleSeasonSweepEndpoint(request, env, corsHeaders) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const internalKey = request.headers.get('x-internal-key');
  if (!env.INTERNAL_API_KEY || !cmpConstantTimeEqual(internalKey, env.INTERNAL_API_KEY)) {
    return cmpErr('INTERNAL_AUTH_FAILED', 403, 'Internal authentication failed.', corsHeaders);
  }
  if (await cmpRateLimit(env, `csweep:ip:${ip}`, 10, 3600)) {
    return cmpErr('RATE_LIMITED', 429, 'Too many sweep requests.', corsHeaders);
  }
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const date = typeof body?.date === 'string' ? body.date : cmpTodayUtcDate();
  const dryRun = body?.dry_run === true;
  const out = await runSeasonSweep(env, date, dryRun);
  return cmpJson({ ok: true, ...out }, 200, corsHeaders);
}

// ════════════════════════════════════════════════════════════════════════
// v16.24 · §3.6 MONTHLY ARCHIVE · §3.7 EXPORT SURFACES
// Appended. Nothing above this line was reordered.
// ════════════════════════════════════════════════════════════════════════

const CMP_OUTCOME_PREFIX     = 'outcome:';
const CMP_ARCHIVE_RECIPIENT  = 'insights@debt-free.world';
// §3.4.4 — the k-anonymity gate is a NUMBER IN THE CODE, not a convention in a
// consumer. A cell below this many rows is answered with a suppression marker
// and never with a count.
const CMP_SUMMARY_MIN_CELL   = 20;
const CMP_SUMMARY_MAX_DIMS   = 2;
const CMP_SUMMARY_DIMENSIONS = ['country', 'period', 'household', 'employment', 'children', 'acquisition', 'mode'];

// Canonical schema-v2 column order for CSV. Any field a row carries that is not
// listed here is appended, sorted, rather than dropped — a column vanishing
// silently is how an export starts lying about what it contains.
const CMP_OUTCOME_COLUMNS = [
  'schema_version', 'period', 'country', 'language', 'acquisition', 'mode',
  'household', 'children', 'employment',
  'entry_debt_total', 'entry_debt_count', 'entry_surplus', 'entry_payoff_months', 'entry_enforcement',
  'exit_debt_total', 'exit_debt_count', 'exit_surplus', 'exit_payoff_months', 'exit_enforcement',
  'delta_payoff_months_improved',
  'engagement_weeks_active', 'engagement_tasks_completed', 'engagement_letters_generated', 'engagement_plan_updates',
  'graduated',
];

// A period bound may be given as YYYY-MM or YYYY-MM-DD; rows only ever carry a
// month, so both are compared at month granularity. Anything else is ignored
// rather than silently narrowing the result set to nothing.
function cmpPeriodBound(v) {
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}(-\d{2})?$/.test(s) ? s.slice(0, 7) : null;
}

// Reads the OUTCOMES namespace. Fails closed: no binding is a store error, not
// an empty result — an empty 200 here would read as "no rows that month".
async function cmpReadAllOutcomes(env, fromRaw, toRaw) {
  if (!env.OUTCOMES) throw new CompanionStoreError('binding');
  const from = cmpPeriodBound(fromRaw);
  const to   = cmpPeriodBound(toRaw);
  const rows = [];
  let unreadable = 0;
  let scanned = 0;
  let cursor;
  for (let guard = 0; guard < 1000; guard++) {
    const res = await cmpList(env.OUTCOMES, CMP_OUTCOME_PREFIX, cursor);
    for (const k of res.keys) {
      // §3.9 · the prefix test is a hard gate, not a tidiness check. Nothing
      // that is not an outcome row may enter a set that is emailed out.
      if (!k.name.startsWith(CMP_OUTCOME_PREFIX)) continue;
      scanned++;
      const raw = await cmpGet(env.OUTCOMES, k.name);
      if (!raw) { unreadable++; continue; }
      let row;
      try { row = JSON.parse(raw); } catch { unreadable++; continue; }
      if (!row || typeof row !== 'object' || Array.isArray(row)) { unreadable++; continue; }
      const period = String(row.period || '').slice(0, 7);
      if (from && period < from) continue;
      if (to   && period > to)   continue;
      rows.push(row);
    }
    if (res.list_complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return { rows, unreadable, scanned, from, to };
}

function cmpSchemaVersions(rows) {
  const seen = new Set();
  for (const r of rows) seen.add(Number.isFinite(r.schema_version) ? r.schema_version : null);
  return [...seen].sort((a, b) => (a === null ? -1 : b === null ? 1 : a - b));
}

// Key order is sorted, not insertion order: this object is written into a file
// that is archived monthly and read side by side with the previous month's.
function cmpCountryBreakdown(rows) {
  const counts = new Map();
  for (const r of rows) {
    const c = String(r.country || 'UNKNOWN');
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  const out = {};
  for (const c of [...counts.keys()].sort()) out[c] = counts.get(c);
  return out;
}

// Flattens one row to the CSV column names. The nesting is fixed by §3.2, so
// this is a named mapping and not a generic walker — the same reason
// cmpBuildOutcome is an allowlist.
function cmpFlattenOutcome(row) {
  const flat = {};
  for (const k of ['schema_version', 'period', 'country', 'language', 'acquisition', 'mode',
                   'household', 'children', 'employment', 'graduated']) {
    if (k in row) flat[k] = row[k];
  }
  for (const side of ['entry', 'exit']) {
    const o = row[side];
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) flat[`${side}_${k}`] = o[k];
    }
  }
  if (row.delta && typeof row.delta === 'object') {
    for (const k of Object.keys(row.delta)) flat[`delta_${k}`] = row.delta[k];
  }
  if (row.engagement && typeof row.engagement === 'object') {
    for (const k of Object.keys(row.engagement)) flat[`engagement_${k}`] = row.engagement[k];
  }
  return flat;
}

function cmpCsvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function cmpOutcomesCsv(rows) {
  const flats = rows.map(cmpFlattenOutcome);
  const extra = new Set();
  for (const f of flats) for (const k of Object.keys(f)) if (!CMP_OUTCOME_COLUMNS.includes(k)) extra.add(k);
  const columns = [...CMP_OUTCOME_COLUMNS, ...[...extra].sort()];
  const lines = [columns.map(cmpCsvCell).join(',')];
  for (const f of flats) lines.push(columns.map(c => cmpCsvCell(f[c])).join(','));
  return { csv: lines.join('\n'), columns };
}

// ── §3.6 · the monthly archive ──────────────────────────────────────────
// Runs on its own cron ("30 3 1 * *"), so it is a different invocation of this
// Worker from the 03:00 sweep and cannot interfere with it.
async function runOutcomesArchive(env) {
  const date = cmpTodayUtcDate();
  const { rows, unreadable } = await cmpReadAllOutcomes(env, null, null);
  const by_country = cmpCountryBreakdown(rows);
  const document = {
    generated_at:    new Date().toISOString(),
    source:          'OUTCOMES',
    row_count:       rows.length,
    unreadable_keys: unreadable,
    schema_versions: cmpSchemaVersions(rows),
    by_country,
    rows,
  };
  const json = JSON.stringify(document, null, 2);

  // ── §3.9 · receipts are NOT part of this snapshot ──────────────────────
  // receipt:{memberId} holds an email address. This file leaves the building as
  // an email attachment and is designed for genuinely anonymous data. Backing
  // the receipts up belongs to Track R's encrypted KV snapshot (R1), not here.
  // The three tests below are cheap and they abort the send rather than trim
  // the payload: a snapshot that needed cleaning is a snapshot nobody should
  // trust. '@' is the sharpest of them — no value §3.3 permits contains one.
  if (json.includes('@')) throw new Error('archive aborted: an address-shaped value reached the snapshot');
  if (/"?receipt:/.test(json)) throw new Error('archive aborted: a receipt key reached the snapshot');
  if (/tos_consent|stripe_session|season_purged_at/.test(json)) throw new Error('archive aborted: a receipt field reached the snapshot');

  // v16.27 · CORRECTION 4 · Brevo infers the attachment type from the filename
  // extension and rejects an unknown one; .json is not on its supported list, so
  // every monthly snapshot was refused with a bare 400 (Cloudflare log 1.8.2026
  // 06:31:00 UTC+3). Only the extension changes — the CONTENT is still the same
  // JSON.stringify(document, null, 2) built above, and the three §3.9 receipt
  // gates are untouched.
  const filename = `outcomes_${date}.txt`;
  await cmpSendOutcomesArchiveEmail(env, filename, json, rows.length, by_country);
  return { date, filename, row_count: rows.length, by_country, sent: true };
}

// ── v16.27 · CORRECTION 5 · the reason, not just the number ──────────────
// Brevo answers a rejected send with a body that names the offending field.
// Correction 4 cost a production investigation that this one line of context
// would have ended immediately. Three properties matter and each is deliberate:
//   · it CANNOT throw — res.text() may be absent or may itself reject, and an
//     error raised while describing a failure destroys the description;
//   · it is clamped to 300 characters and collapsed to single spaces, so a
//     large HTML error page cannot flood the Cloudflare log;
//   · it returns '' rather than a placeholder when there is nothing to add, so
//     the caller's message is byte-identical to the old one in that case.
async function cmpBrevoErrDetail(res) {
  try {
    if (!res || typeof res.text !== 'function') return '';
    const body = String(await res.text() || '').replace(/\s+/g, ' ').trim();
    return body ? ' · ' + body.slice(0, 300) : '';
  } catch {
    return '';
  }
}

async function cmpSendOutcomesArchiveEmail(env, filename, json, rowCount, byCountry) {
  const countryLines = Object.keys(byCountry).sort()
    .map(c => `${c}: ${byCountry[c]}`).join('\n');
  // The count and the distribution are in the message body on purpose: an
  // anomaly has to be visible without opening the attachment (§3.6).
  const summaryText = `Rows: ${rowCount}\n\nBy country:\n${countryLines || '(none)'}\n`;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
      to: [{ email: CMP_ARCHIVE_RECIPIENT }],
      subject: `OUTCOMES snapshot ${filename} — ${rowCount} rows`,
      textContent: `Monthly snapshot of the OUTCOMES namespace.\n\n${summaryText}\nAttached: ${filename}\n\nAnonymous aggregate data only. No member is identifiable from this file.`,
      attachment: [{ content: cmpBase64Utf8(json), name: filename }],
    })
  });
  // v16.27 · CORRECTION 5 · see cmpBrevoErrDetail. This is the message that said
  // "archive email failed: 400" for three days without naming the field Brevo
  // rejected. Prefix unchanged, still throws, scheduled() still logs it.
  if (!res || !res.ok) throw new Error('archive email failed: ' + (res && res.status) + await cmpBrevoErrDetail(res));
}

// ── §3.7 · shared gate for both export surfaces ─────────────────────────
// x-internal-key ONLY, compared in constant time. A member token cannot reach
// either endpoint: it is not the internal key, so it lands in the same 403.
async function cmpInternalGate(request, env, corsHeaders, rlKey, maxPerHour) {
  const internalKey = request.headers.get('x-internal-key');
  if (!env.INTERNAL_API_KEY || !cmpConstantTimeEqual(internalKey, env.INTERNAL_API_KEY)) {
    return cmpErr('INTERNAL_AUTH_FAILED', 403, 'Internal authentication failed.', corsHeaders);
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await cmpRateLimit(env, `${rlKey}:ip:${ip}`, maxPerHour, 3600)) {
    return cmpErr('RATE_LIMITED', 429, 'Too many requests.', corsHeaders);
  }
  return null;
}

// ── POST /internal/outcomes/export ──────────────────────────────────────
async function handleOutcomesExport(request, env, corsHeaders) {
  const gate = await cmpInternalGate(request, env, corsHeaders, 'coexport', 5);
  if (gate) return gate;
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const format = body?.format === undefined ? 'json' : body.format;
  if (format !== 'json' && format !== 'csv') {
    return cmpErr('INVALID_EVENT', 422, 'format must be "json" or "csv".', corsHeaders);
  }
  const { rows, unreadable, from, to } = await cmpReadAllOutcomes(env, body?.from, body?.to);
  // row_count and schema_versions are present for BOTH formats (§3.7). The CSV
  // therefore travels inside the JSON envelope rather than as a bare body.
  const base = {
    ok: true,
    format,
    row_count: rows.length,
    schema_versions: cmpSchemaVersions(rows),
    unreadable_keys: unreadable,
    from: from || null,
    to: to || null,
  };
  if (format === 'csv') {
    const { csv, columns } = cmpOutcomesCsv(rows);
    return cmpJson({ ...base, columns, csv }, 200, corsHeaders);
  }
  return cmpJson({ ...base, rows }, 200, corsHeaders);
}

// ── POST /internal/outcomes/summary ─────────────────────────────────────
// The k-anonymity gate lives HERE, in the Worker, and not in whatever reads
// the answer (§3.4.4). A cell under CMP_SUMMARY_MIN_CELL rows is returned as
// { n: null, suppressed: true } and the number never leaves the Worker.
async function handleOutcomesSummary(request, env, corsHeaders) {
  const gate = await cmpInternalGate(request, env, corsHeaders, 'cosummary', 20);
  if (gate) return gate;
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const groupBy = Array.isArray(body?.group_by) ? body.group_by : null;
  if (!groupBy || groupBy.length < 1) {
    return cmpErr('INVALID_EVENT', 422, 'group_by must name one or two dimensions.', corsHeaders);
  }
  if (groupBy.length > CMP_SUMMARY_MAX_DIMS) {
    return cmpErr('INVALID_EVENT', 422,
      `group_by accepts at most ${CMP_SUMMARY_MAX_DIMS} dimensions.`, corsHeaders);
  }
  for (const d of groupBy) {
    if (!CMP_SUMMARY_DIMENSIONS.includes(d)) {
      return cmpErr('INVALID_EVENT', 422, `Unknown group_by dimension: ${String(d).slice(0, 40)}`, corsHeaders);
    }
  }
  if (new Set(groupBy).size !== groupBy.length) {
    return cmpErr('INVALID_EVENT', 422, 'group_by dimensions must be distinct.', corsHeaders);
  }

  const { rows, from, to } = await cmpReadAllOutcomes(env, body?.from, body?.to);
  const counts = new Map();
  for (const r of rows) {
    // A v1 row has no household/children/employment. It is counted as
    // 'unknown', never dropped: dropping rows would make a suppressed cell and
    // an absent cell mean different things.
    const key = groupBy.map(d => {
      const v = r[d];
      return (v === null || v === undefined || v === '') ? 'unknown' : String(v);
    });
    const id = JSON.stringify(key);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const cells = [...counts.entries()]
    .map(([id, n]) => {
      const key = JSON.parse(id);
      const cell = {};
      groupBy.forEach((d, i) => { cell[d] = key[i]; });
      // The suppressed branch must not carry the number in any form.
      if (n < CMP_SUMMARY_MIN_CELL) return { ...cell, n: null, suppressed: true };
      return { ...cell, n, suppressed: false };
    })
    .sort((a, b) => (JSON.stringify(groupBy.map(d => a[d])) < JSON.stringify(groupBy.map(d => b[d])) ? -1 : 1));

  return cmpJson({
    ok: true,
    group_by: groupBy,
    min_cell: CMP_SUMMARY_MIN_CELL,
    cells_total: cells.length,
    cells_suppressed: cells.filter(c => c.suppressed).length,
    from: from || null,
    to: to || null,
    cells,
  }, 200, corsHeaders);
}
// ════════════════════════════════════════════════════════════════════════
// v16.28 · TRACK R · R1 · THE ENCRYPTED DAILY KV SNAPSHOT
// Appended. Nothing above this line was reordered.
// ════════════════════════════════════════════════════════════════════════

// One stream, 30 daily snapshots, no monthly copies. Receipts live in KV for
// seven years (CMP_RECEIPT_TTL), so they are in EVERY snapshot automatically
// and a restore always uses the newest one. Keeping year-old copies would have
// retained the personal data of people the service already deleted, which is
// the opposite of what the deletion promise says.
const R1_MAX_KEYS            = 800;
const R1_HEARTBEAT_KEY       = 'r1:last_success';
const R1_HEARTBEAT_MAX_AGE_H = 36;
const R1_ALERT_RECIPIENT     = 'insights@debt-free.world';
// The listing loop is bounded. 1000 keys per page x 40 pages is far above
// R1_MAX_KEYS, so the guard can only be reached by a KV that never sets
// list_complete — in which case stopping is the correct behaviour.
const R1_LIST_PAGE_GUARD     = 40;

// ── byte <-> base64, both directions ─────────────────────────────────────
// The chunking exists because String.fromCharCode(...bytes) blows the argument
// limit somewhere in the low hundreds of thousands, and a snapshot is expected
// to cross that.
function cmpBytesToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
function cmpB64ToBytes(b64) {
  const bin = atob(String(b64 || '').replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function cmpHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function cmpSha256Hex(str) {
  return cmpHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)));
}
// B2 requires SHA-1 of the exact bytes uploaded and verifies it server side.
// It is a transport integrity check demanded by their API, not a security
// claim of ours: the integrity claim that matters is plaintext_sha256, which
// is SHA-256 and is computed before anything leaves this Worker.
async function cmpSha1Hex(bytes) {
  return cmpHex(await crypto.subtle.digest('SHA-1', bytes));
}

// ── §1.6 · list the whole namespace, keeping every expiration ────────────
// list() is the ONLY place a key's expiry is visible. get() does not return
// it, so it has to be captured here or it is gone.
async function cmpListAllWithExpiry(kv) {
  const out = [];
  let cursor;
  for (let page = 0; page < R1_LIST_PAGE_GUARD; page++) {
    const res = await cmpList(kv, '', cursor);
    for (const k of (res && res.keys) || []) {
      const exp = k && k.expiration;
      out.push({
        key: k.name,
        expiration: (typeof exp === 'number' && Number.isFinite(exp)) ? exp : null,
      });
    }
    // Stop early once the threshold is already exceeded: the run is going to
    // abort anyway and there is no reason to spend sub-requests proving it.
    if (out.length > R1_MAX_KEYS) break;
    if (!res || res.list_complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return out;
}

// ── §1.2 · seal the snapshot ─────────────────────────────────────────────
// Hybrid, because RSA cannot carry a payload of this size: a random AES-256
// session key encrypts the body, and only that 32-byte key is wrapped with
// RSA-OAEP. RSA-OAEP and not X25519: Cloudflare Workers' WebCrypto supports
// RSA-OAEP reliably and its X25519 support is limited.
//
// The envelope is SELF-DESCRIBING on purpose. The offline recovery tool must
// need nothing that is not inside the file itself — no version table, no note
// in a document somebody has to still have in three years.
async function cmpEncryptSnapshot(plaintextString, publicKeyB64) {
  if (!publicKeyB64) throw new Error('R1_PUBLIC_KEY missing — refusing to produce an unsealed snapshot');
  const pub = await crypto.subtle.importKey(
    'spki',
    cmpB64ToBytes(publicKeyB64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const rawAes = await crypto.subtle.exportKey('raw', aesKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintextString)
  );
  const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, rawAes);
  return JSON.stringify({
    format: 'dfw-enc',
    v: 1,
    alg: 'AES-256-GCM+RSA-OAEP-SHA256',
    iv: cmpBytesToB64(iv),
    wrapped_key: cmpBytesToB64(wrapped),
    ciphertext: cmpBytesToB64(ciphertext),
  });
}

// ── §1.3 · Backblaze B2, native API, three calls ─────────────────────────
// b2_authorize_account -> b2_get_upload_url -> b2_upload_file. The v3
// authorize response carries apiUrl under apiInfo.storageApi; v2 carried it at
// the top level. Both shapes are accepted because the fallback costs one
// expression and a wrong guess costs a silent outage.
//
// Every non-ok answer throws with the STATUS AND THE BODY. Three days of a
// blind 400 have already been paid for once in this project (v16.27
// correction 5), and cmpBrevoErrDetail is that fix — it never throws, it
// clamps, and it returns '' when there is nothing to add.
async function cmpUploadToB2(env, filename, body) {
  const bodyBytes = new TextEncoder().encode(body);
  const sha1 = await cmpSha1Hex(bodyBytes);

  const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: 'Basic ' + btoa(`${env.B2_KEY_ID}:${env.B2_APP_KEY}`) },
  });
  if (!authRes || !authRes.ok) {
    throw new Error('b2 authorize failed: ' + (authRes && authRes.status) + await cmpBrevoErrDetail(authRes));
  }
  const auth = await authRes.json();
  const storageApi = (auth && auth.apiInfo && auth.apiInfo.storageApi) || {};
  const apiUrl   = storageApi.apiUrl || auth.apiUrl;
  const bucketId = env.B2_BUCKET_ID || storageApi.bucketId;
  if (!apiUrl)   throw new Error('b2 authorize failed: no apiUrl in the response');
  if (!bucketId) throw new Error('b2 authorize failed: no bucketId — set B2_BUCKET_ID or scope the key to one bucket');

  const urlRes = await fetch(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId }),
  });
  if (!urlRes || !urlRes.ok) {
    throw new Error('b2 get_upload_url failed: ' + (urlRes && urlRes.status) + await cmpBrevoErrDetail(urlRes));
  }
  const up = await urlRes.json();
  if (!up || !up.uploadUrl) throw new Error('b2 get_upload_url failed: no uploadUrl in the response');

  const putRes = await fetch(up.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: up.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(filename),
      'Content-Type': 'application/octet-stream',
      'X-Bz-Content-Sha1': sha1,
    },
    body: bodyBytes,
  });
  if (!putRes || !putRes.ok) {
    throw new Error('b2 upload failed: ' + (putRes && putRes.status) + await cmpBrevoErrDetail(putRes));
  }
  return { filename, bytes: bodyBytes.length, sha1 };
}

// ── the alert channel ────────────────────────────────────────────────────
// Never throws. An alert that fails while describing a failure destroys the
// description, exactly as in cmpBrevoErrDetail. The caller decides what to do
// about the underlying condition; this function only tries to say it out loud.
async function cmpSendBackupAlertEmail(env, subject, text) {
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Debt-Free.World', email: 'insights@debt-free.world' },
        to: [{ email: R1_ALERT_RECIPIENT }],
        subject,
        textContent: `${text}\n\nAmliv Oy · Nokia, Finland · VAT FI32503518`,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

// ── §2.1 · the daily run ─────────────────────────────────────────────────
async function runKvBackup(env) {
  const date     = cmpTodayUtcDate();
  const filename = `kv_MEMBER_TOKENS_${date}.json.enc`;

  const listed = await cmpListAllWithExpiry(env.MEMBER_TOKENS);

  // §1.7 · a partial snapshot that looks complete is worse than no snapshot.
  if (listed.length > R1_MAX_KEYS) {
    await cmpSendBackupAlertEmail(
      env,
      `KV BACKUP ABORTED — the ${R1_MAX_KEYS} key threshold was exceeded`,
      `MEMBER_TOKENS holds more than R1_MAX_KEYS (${R1_MAX_KEYS}) keys, so today's snapshot was ABORTED and NOTHING was written to B2.\n\nThis is deliberate: a snapshot that silently covered only part of the namespace would look complete and would not be. Sharding the snapshot is its own pass.\n\nDate: ${date}`
    );
    return { aborted: true, reason: 'key_count_over_threshold', key_count: listed.length, date };
  }

  // §2.1.3 · values are copied as bytes. Not parsed, not normalised, not
  // repaired. A value that expired between the list and the get comes back
  // null and is stored as null rather than dropped, so key_count and the
  // entry count can never disagree.
  const entries = [];
  for (const item of listed) {
    entries.push({
      key: item.key,
      value: await cmpGet(env.MEMBER_TOKENS, item.key),
      expiration: item.expiration,
    });
  }

  const meta = {
    format:    'dfw-kv-snapshot',
    v:         1,
    namespace: 'MEMBER_TOKENS',
    taken_at:  new Date().toISOString(),
    key_count: entries.length,
  };
  // The hash covers meta + entries, computed BEFORE the field that carries it
  // exists — otherwise it would have to hash itself. The recovery tool repeats
  // exactly this: JSON.stringify({ meta, entries }) over the parsed object.
  const inner            = JSON.stringify({ meta, entries });
  const plaintext_sha256 = await cmpSha256Hex(inner);
  const plaintext        = JSON.stringify({ meta, plaintext_sha256, entries });

  const sealed = await cmpEncryptSnapshot(plaintext, env.R1_PUBLIC_KEY);
  await cmpUploadToB2(env, filename, sealed);

  // §1.5 · the heartbeat the 03:00 sweep reads. No TTL: an old value is the
  // signal, so it must not be allowed to disappear and look like "never ran"
  // when it means "ran, then stopped".
  const summary = { at: new Date().toISOString(), key_count: entries.length, bytes: sealed.length, filename };
  await cmpPut(env.OUTCOMES, R1_HEARTBEAT_KEY, JSON.stringify(summary));

  return { aborted: false, date, ...summary };
}

// ── §2.4 · the other half of the mutual watch ────────────────────────────
// Called from the top of runSeasonSweep, inside a try/catch AT THE CALL SITE.
// It must never stop the sweep and never alter what the sweep returns.
async function runKvBackupHeartbeatCheck(env) {
  const raw = await cmpGet(env.OUTCOMES, R1_HEARTBEAT_KEY);
  let last = null;
  if (raw) { try { last = JSON.parse(raw); } catch { last = null; } }
  const atMs = last && last.at ? Date.parse(last.at) : NaN;

  if (!Number.isFinite(atMs)) {
    await cmpSendBackupAlertEmail(
      env,
      'KV BACKUP ALERT — no successful snapshot on record',
      `The season sweep found no readable ${R1_HEARTBEAT_KEY} in OUTCOMES.\n\nEither the daily backup has never succeeded, or the heartbeat was lost. Check the "0 4 * * *" cron trigger and the Cloudflare logs for "kv-backup failed".`
    );
    return { alerted: true, reason: 'missing' };
  }

  const ageH = (Date.now() - atMs) / 3600000;
  if (ageH > R1_HEARTBEAT_MAX_AGE_H) {
    await cmpSendBackupAlertEmail(
      env,
      'KV BACKUP ALERT — the last snapshot is stale',
      `The newest successful KV snapshot is ${ageH.toFixed(1)} hours old, past the ${R1_HEARTBEAT_MAX_AGE_H} hour limit.\n\nLast success: ${last.at}\nFile: ${last.filename}\nKeys: ${last.key_count}\n\nA backup that stopped quietly is worse than no backup. Check the "0 4 * * *" cron trigger, the B2 key and the Cloudflare logs.`
    );
    return { alerted: true, reason: 'stale', age_hours: ageH };
  }
  return { alerted: false, age_hours: ageH };
}
