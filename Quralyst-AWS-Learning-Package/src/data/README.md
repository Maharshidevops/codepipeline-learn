# src/data/

Static app content and datasets bundled with the client — verbatim ports of constants that lived in the Flask backend (config modules, route files, inline template JS). No fetching; some of this may move behind API endpoints later.

| File                | Purpose                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `faq.tsx`           | FAQ sections/questions ported verbatim from `Backup/routes/faq.py`; rich answers are JSX (no `dangerouslySetInnerHTML`).                                                                                                  |
| `locationData.json` | Bundled continent→country reference tree consumed by `locationService.getLocationData()` / LocationSelector (states + cities are still fetched from the backend). Moved here from the former `src/mocks/`.                |
| `profileData.json`  | Raw dataset extracted from `Backup/config/{constants,locations}.py` + profile.py: countries, phone prefixes, per-country timezone options, mobile placeholders.                                                           |
| `profileData.ts`    | Typed accessor over `profileData.json` (`countries`, `phonePrefixes`, `countryTimezones`, `mobilePlaceholders`); used by ProfilePage for the country→timezone/prefix cascade.                                             |
| `subIndustryMap.ts` | Static industry→sub-industry map plus the exact 20-item ordered `industryList`, ported from the JS object embedded in the legacy research templates; drives the dependent Sub-Industry Select on all three process pages. |
