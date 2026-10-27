# Wi-Fi crossplay — no rented server (v1.5.29 work in progress)

Final user requirement, 2026-10-28: PC, Web and APK play together on the same
Wi-Fi. Any device can run the authoritative Host. No mandatory PC, Internet
room directory, Node service rental, STUN or TURN. Offline AI stays independent.

## Pairing

1. All devices open the game on the same Wi-Fi; Host chooses mode / Create room.
2. Host chooses **Mời bạn cùng Wi-Fi**, generates a separate invitation per guest.
3. Guest chooses Join and opens/pastes the invitation or reads its QR image.
4. Guest generates an answer and transfers it back to Host by text, file or QR.
5. Host accepts that answer; Guest chooses Enter room. Repeat for another guest.

This is two-way manual signaling, not a short room code or automatic LAN search.
Invitations expire after two minutes. Cancel pending invitations before retrying.
The QR encoder is bundled locally with MIT notices; QR image reading uses the
browser's BarcodeDetector when available, with text/file fallback. No remote QR
service, external script, cloud account or game-save upload is involved.

The Web version must have been loaded/installed with its needed assets before
losing Internet; a website's address alone does not make the game available
offline. Wi-Fi client isolation can prevent direct connections even on the same
SSID. Host needs to remain open and foregrounded, especially on Android.

## Implementation and boundaries

`src/lan/wifi-bus.js` replaces the room bus only on `pkmsvvWifi=1`. It uses
RTCPeerConnection with an empty ICE server list and ordered reliable data channels.
Host owns room membership, AI additions, kicks and game events. A reply must match
the one-time invitation token and room. Guests cannot impersonate another peer's
channel identity. No save keys, ticket ownership or Shiny ownership are changed.
The original PC LAN bus remains available for existing LAN invitation links.

`src/lan/wifi-ui.js` is shared by all packaged engines. Host/Join in the shared
menu route to it; Android stays on its own packaged origin instead of borrowing
a PC-served origin. `scripts/bundle-wifi-qr.cjs` bundles the installed QR encoder.

Tests: `tests/wifi-transport-runtime.cjs` exercises ten independent browser clients,
ordered data, Host authority, room cap, replay rejection, kick and leave, with
WebSocket forbidden and HTTP blocked after initial loading. `wifi-coop-runtime.cjs`
exercises the actual compiled game in all three modes, two human contexts and up
to eight AI. Local browser tests are not proof of actual installed APK / separate
PC / public HTTPS Web networking. Physical mixed-device Wi-Fi testing remains
required. There is no seamless Host migration or in-match reconnect guarantee.

Keep the persistent Android release signature. Never label a debug APK as a
player update. See `ANDROID_UPDATE_SIGNING.md` and `CLOUD_HANDOFF.md`.
