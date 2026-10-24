'use strict';
/* Web-only: fix missing host-side ICE candidates and recover stuck connections.
 * The pinned upstream net.js sometimes receives guest ICE candidates before
 * its SDP answer; without flushing those candidates the host may never connect.
 * This does NOT enable costly Firebase gameplay relay or pretend TURN exists. */
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'vendor', 'pokesurvivor', 'js', 'net', 'net.js');
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replaceOnce(from, to) {
  if (src.split(from).length !== 2) throw Error('WebRTC source anchor changed: ' + from.slice(0, 90));
  src = src.replace(from, to);
}
// ICE arriving before the host receives the SDP answer must be applied after it.
// The guest already does this on offer, but the original host branch did not.
replaceOnce(
  "      } else if (sig.sdp && sig.sdp.type === 'answer') {\n        if (p && p.pc) await p.pc.setRemoteDescription(sig.sdp);\n      } else if (sig.c) {",
  "      } else if (sig.sdp && sig.sdp.type === 'answer') {\n" +
  "        if (isHost && p && p.pc && p.pc.signalingState === 'have-local-offer') {\n" +
  "          await p.pc.setRemoteDescription(sig.sdp);\n" +
  "          for (const c of pendingIce.get(from) || []) await p.pc.addIceCandidate(c).catch(() => {});\n" +
  "          pendingIce.delete(from);\n" +
  "        }\n" +
  "      } else if (sig.c) {"
);
// Old ICE candidates must never bleed into another room.
replaceOnce(
  "    roomId = null; isHost = false; hostUid = null;",
  "    pendingIce.clear();\n    roomId = null; isHost = false; hostUid = null;"
);
// The upstream fallback labels the connection 'relay' even though relay is OFF.
replaceOnce(
  "    catch (e) { p.mode = 'relay'; emitPeer(u); return p; }",
  "    catch (e) { p.mode = ALLOW_RELAY ? 'relay' : 'failed'; emitPeer(u); return p; }"
);
// Some networks stay 'disconnected' for a long time but never reach 'failed'.
// Wait 8s to tolerate brief interruptions, then let the existing 15s host retry
// and the separate 45s active-match reconnect grace logic take over.
replaceOnce(
  "    pc.onconnectionstatechange = () => {\n      if (pc.connectionState === 'failed' && p.mode !== 'closed') useRelay(u);\n    };",
  "    pc.onconnectionstatechange = () => {\n" +
  "      if (pc.connectionState === 'failed' && p.mode !== 'closed') useRelay(u);\n" +
  "      if (pc.connectionState === 'disconnected' && p.mode === 'direct' && !p.disconnectTimer) {\n" +
  "        p.disconnectTimer = setTimeout(() => {\n" +
  "          p.disconnectTimer = 0;\n" +
  "          if (pc.connectionState === 'disconnected' && p.mode === 'direct') {\n" +
  "            p.mode = 'connecting'; useRelay(u);\n" +
  "          }\n" +
  "        }, 8000);\n" +
  "      } else if (pc.connectionState === 'connected' || pc.connectionState === 'closed') {\n" +
  "        clearTimeout(p.disconnectTimer); p.disconnectTimer = 0;\n" +
  "      }\n" +
  "    };"
);
replaceOnce(
  "    clearTimeout(p.timer);\n    p.mode = 'closed';",
  "    clearTimeout(p.timer);\n    clearTimeout(p.disconnectTimer);\n    p.mode = 'closed';"
);
fs.writeFileSync(file, src, 'utf8');
console.log('PKMSVV Web: host early ICE flush, disconnected recovery, honest no-relay status.');
