/* ══════════════════════════════════════════════════════════════════════════
   DEBT-FREE.WORLD — CRISIS SUPPORT DATA (single source of truth)
   window.CRISIS_DATA — read by: /onboarding-debt-recovery.html,
   /onboarding-debt-free.html. Do NOT inline copies elsewhere (drift-proof).

   ⚠ NOTHING IN THIS FILE MAY BE INVENTED.
   Every number, name and URL below was verified by the project manager on
   10.8.2026 against mieli.fi and punainenristi.fi. A wrong number on this
   screen is the worst failure this product can produce.

   Countries with no entry fall back to `universal` — never to an empty view,
   never to a guess. Adding a country means verifying it first, from the
   country's own national source, and dating the verification here.

   This file is DATA ONLY. It contains no network calls, no logic that reads
   what the person typed, and nothing that leaves the browser.
   ══════════════════════════════════════════════════════════════════════════ */
window.CRISIS_DATA = {

  /* Shown for every country, including Finland. ThroughLine's directory
     covers 175+ countries and is the honest answer where we have not
     verified a national line ourselves. */
  universal: {
    emergency_note: 'If you are in immediate danger, call your local emergency number.',
    directory_url:  'https://findahelpline.com',
    directory_name: 'Find A Helpline'
  },

  countries: {

    /* FINLAND — verified 10.8.2026, source mieli.fi
       Hours are deliberately NOT hard-coded for the limited-hours lines:
       published hours change and a stale hour on this screen sends someone
       to a line that does not answer. The 24/7 line is listed first. */
    FI: {
      emergency: '112',
      lines: [
        { name: 'MIELI Kriisipuhelin',
          number: '09 2525 0111',
          language: 'Suomi',
          hours: '24/7',
          url: 'https://mieli.fi/kriisipuhelin' },

        { name: 'MIELI Kriisipuhelin (soitto ulkomailta / from abroad)',
          number: '+358 9 2525 0111',
          language: 'Suomi',
          hours: '24/7',
          url: 'https://mieli.fi/kriisipuhelin' },

        { name: 'MIELI Kristelefon',
          number: '09 2525 0112',
          language: 'Svenska',
          hours: 'mieli.fi',
          url: 'https://mieli.fi/kriisipuhelin' },

        { name: 'MIELI Crisis Helpline',
          number: '09 2525 0116',
          language: 'English',
          hours: 'mieli.fi',
          url: 'https://mieli.fi/kriisipuhelin' }
      ]
    }

  },

  /* The onboarding country selector stores full country names ("Finland"),
     not ISO codes. This maps the names we may receive onto the codes above.
     It contains no support data of its own. */
  aliases: {
    'finland': 'FI',
    'suomi':   'FI',
    'fi':      'FI'
  }

};
