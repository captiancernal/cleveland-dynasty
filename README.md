# Cleveland Dynasty Reference

A Baseball-Reference-style site for the Cleveland Indians MLB The Show 26 franchise dynasty.

- **Live data:** every page reads the "Cleveland Dynasty DB" Google Sheet when it loads, so new rows show up on the next visit (cached for 5 minutes per browser tab; use "Refresh data" in the footer to force it). The Sheet must stay shared as *Anyone with the link: Viewer*.
- **Headshots:** come from the `mlbam_id` column on the `players` tab (real MLB player IDs). Leave it blank for a silhouette.
- **Highlights:** come from the `highlights`, `highlight_media` and `highlight_players` tabs; media files must be link-viewable in Drive.
- **Logos:** MLB team logos by team name (see `TEAMS` in `js/config.js`). To use your own Indians logo, add it under `assets/logos/` and set `franchiseLogoOverride` in `js/config.js`.

No build step: plain HTML, CSS and JavaScript modules, hosted on GitHub Pages.

Run locally: `python -m http.server 8765`, then open http://localhost:8765.
