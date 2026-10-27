#!/bin/bash
# Record one iPhone scene from the simulator (iPhone 17 Pro, light, status bar 9:41) into media/ios/<name>.mp4.
#   record/ios.sh 05-survey S1234567A survey 25        # name, demo login, CGH_SCREEN, seconds
# While it records, drive the app by hand in the Simulator window (or from another terminal with the simulator tool).
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; LOGIN=$2; SCREEN=${3:-overview}; SECS=${4:-15}
U=$(xcrun simctl list devices available | grep "iPhone 17 Pro (" | grep -oE "[0-9A-F-]{36}" | head -1)
BUNDLE=com.yorha.cghproms
mkdir -p media/ios
xcrun simctl bootstatus "$U" -b >/dev/null
xcrun simctl ui "$U" appearance light
xcrun simctl status_bar "$U" override --time "9:41" --batteryLevel 100 --batteryState charged --cellularBars 4 --wifiBars 3 --dataNetwork wifi
xcrun simctl terminate "$U" $BUNDLE 2>/dev/null || true
SIMCTL_CHILD_CGH_DEMO_LOGIN=$LOGIN SIMCTL_CHILD_CGH_SCREEN=$SCREEN xcrun simctl launch "$U" $BUNDLE >/dev/null
sleep 6
echo "recording $SECS s -> media/ios/$NAME.mp4 (drive the app now)"
xcrun simctl io "$U" recordVideo --codec h264 --force "media/ios/$NAME.mp4" &
REC=$!
sleep "$SECS"
kill -INT $REC; wait $REC 2>/dev/null || true
echo "done: media/ios/$NAME.mp4"
