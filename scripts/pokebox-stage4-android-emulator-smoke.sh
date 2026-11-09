#!/usr/bin/env bash
# The emulator runner executes script lines independently, so run this entire file in bash.
set -euo pipefail
qa="$(find qa-android -name '*.apk' -type f -print -quit)"
prod="$(find prod-android -name '*.apk' -type f -print -quit)"
test -s "$qa"
test -s "$prod"
echo "Installing official APK and separate PokéBox QA APK"
adb install -r "$prod"
adb install -r "$qa"
adb shell pm list packages | grep -q '^package:com.votrivalley.pkmsvv.fulllan'
adb shell pm list packages | grep -q '^package:com.votrivalley.pkmsvv.box4qa0'
echo "Both package names coexist without overwrite or installer conflict"
adb shell monkey -p com.votrivalley.pkmsvv.box4qa0 -c android.intent.category.LAUNCHER 1
sleep 25
adb shell pidof com.votrivalley.pkmsvv.box4qa0
adb shell dumpsys activity activities | grep -E 'ResumedActivity|topResumedActivity' | head -6 || true
adb logcat -d -t 12000 > qa-android-logcat.txt
if grep -E -A 8 'FATAL EXCEPTION: main' qa-android-logcat.txt | grep -q 'com.votrivalley.pkmsvv.box4qa0'; then
 echo "QA Android process has an uncaught fatal exception" >&2
 exit 1
fi
adb exec-out screencap -p > qa-android-screenshot.png
test -s qa-android-screenshot.png
echo "PASS: production and QA packages coexist; QA Activity launched and remains alive; screenshot recorded."
