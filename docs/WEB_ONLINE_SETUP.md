# Pokémon Survivor – Votri Valley: web / online co-op (dev build)

**Status:** Web build pipeline prepared, not deployed, not end-to-end playtested. The code snapshot comes from ronvotri/PKMSVV v1.2.1 commit 7a40ae7. Offline Windows/Android/Switch releases remain maintained in the original repository. Full upstream Git commit history has NOT been mirrored into this separate repository.

## Own Firebase project (do not use JPTER78's)
1. Create a Votri Valley Firebase project at https://console.firebase.google.com. Enable Authentication > Google and Email/Password; Cloud Firestore; Realtime Database.
2. Set secure rules in both services. This repository provides adapted baseline rules in firebase/firestore.rules and firebase/database.rules.json, originally based on upstream. Review them and deploy before allowing external users. The upstream admin account is deliberately **not** granted access.
3. Add your exact web hostname to Firebase Authentication > Settings > Authorized domains.
4. Copy Firebase *web app* config (not Admin SDK credentials) into config/firebase.web.local.json, including databaseURL. Example:
   {"apiKey":"AIza...","authDomain":"YOUR-PROJECT.firebaseapp.com","projectId":"YOUR-PROJECT","appId":"1:123:web:xyz","databaseURL":"https://YOUR-DB.europe-west1.firebasedatabase.app","allowedHosts":["your-dev-host.example"]}
   This local JSON file is gitignored. Alternatively use PKMSVV_FIREBASE_CONFIG_JSON and PKMSVV_ALLOWED_HOSTS env vars in CI.
5. Configure the host with HTTPS for public WebRTC/Google popup. A host in the allowlist alone is not enough: also authorize it at Firebase. The original author's Firebase config is **explicitly forbidden**.

## Build
Requires Node.js 22+, Git and the upstream pinned source:
   git init vendor/pokesurvivor
   git -C vendor/pokesurvivor remote add origin https://github.com/JPTER78/pokesurvivor.git
   git -C vendor/pokesurvivor fetch --depth 1 origin 11fe868c640b62ac37beacc222e056bc4d9ec892
   git -C vendor/pokesurvivor checkout --detach FETCH_HEAD
   npm install
   npm run test:web
   npm run prepare:web

Output is dist/web. Point your existing HTTPS static server to dist/web. Serve over HTTP only for local testing (localhost), not for public cloud login. For offline-only browser preview without credentials use PKMSVV_WEB_PREVIEW=1 with npm run prepare:web.

## User flow
- / starts at the mode chooser.
- **Local:** persistent browser localStorage save. Requires the same origin and browser profile; no cloud sync.
- **Google/cloud:** Firebase Authentication original login screen and Firestore save logic, plus original friends/room screens and WebRTC co-op up to four participants. This is a development candidate, pending QA on two real clients.
- Rooms: original code uses Firebase Realtime Database for connection signaling and direct WebRTC for live game messages. It has no TURN relay and some networks may fail to connect.
- Existing v1.2.1 added mechanics (6–8 auto-cast skills, evolution, Kecleon, upgrades) need a multiplayer compatibility playtest. Singleplayer and save migration should also be tested on separate profiles.
- Do not open this trial to the public before reviewing IP rights, Firebase rules, privacy notices, quotas and acceptable use. noindex is not access control.

## Smoke tests
1. Build and serve from localhost; confirm Local mode launches, stores save and reloads.
2. Choose Google mode on an allowed host; sign in and verify Firestore save; sign out; sign in again.
3. Test 2/3/4 real clients: invite, join, start, levels, boss, Pokémon evolution, all auto-cast skills, Kecleon effects and late join/disconnect.
4. Confirm local save is not overwritten by cloud login.
5. Confirm unlisted origins are blocked and original JPTER78 Firebase credentials never appear in built assets.

The old PC/Android apps remain offline: this web pipeline makes no updater/native changes.
