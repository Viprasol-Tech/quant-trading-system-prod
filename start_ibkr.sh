#!/bin/bash
# IBKR Gateway startup script with IBC auto-login

echo "========================================"
echo "Starting IBKR Gateway with IBC"
echo "========================================"

# ---- 1. Virtual Display ----
echo "[1/3] Starting Xvfb (virtual display)..."
rm -f /tmp/.X0-lock
Xvfb :0 -screen 0 1024x768x24 -ac &
export DISPLAY=:0
sleep 2

# ---- 2. VNC + noVNC ----
echo "[2/3] Starting VNC + noVNC (web GUI)..."

VNC_PW="${VNC_PASSWORD:-trading123}"
mkdir -p /root/.vnc

# Store VNC password
x11vnc -storepasswd "$VNC_PW" /root/.vnc/passwd 2>/dev/null || true

# Start x11vnc
x11vnc -display :0 -rfbauth /root/.vnc/passwd -rfbport 5900 -shared -forever -noxdamage 2>/dev/null &
sleep 1

# Start noVNC
websockify --web=/opt/novnc 6080 localhost:5900 &
sleep 1

echo "noVNC available at http://0.0.0.0:6080"

# Start openbox window manager
openbox &
sleep 1

# ---- 3. IB Gateway via IBC ----
echo "[3/3] Starting IB Gateway via IBC..."

# Determine trading mode from port
IB_PORT="${IB_PORT:-4002}"
if [ "$IB_PORT" = "4001" ]; then
    TRADING_MODE="live"
else
    TRADING_MODE="paper"
fi

# Create logs directory
mkdir -p /app/logs

# Detect installed Gateway version
TWS_MAJOR_VRSN=$(ls -1 /root/Jts/ibgateway/ 2>/dev/null | head -1)

if [ -z "$TWS_MAJOR_VRSN" ]; then
    echo "ERROR: No IB Gateway version found in /root/Jts/ibgateway/"
    echo "Full /root/Jts/ tree:"
    ls -laR /root/Jts/ 2>/dev/null || echo "  /root/Jts does not exist"
    exit 1
else
    echo "Detected IB Gateway version: $TWS_MAJOR_VRSN"

    echo "Launching IBC with auto-restart watchdog..."
    echo "  Mode: ${TRADING_MODE}"
    echo "  Port: ${IB_PORT}"

    # IBC restart watchdog - handles crashed IBC gracefully
    (while true; do
        echo "[IBC-watchdog] Starting IBC (ibcstart.sh)..."
        /opt/ibc/scripts/ibcstart.sh "${TWS_MAJOR_VRSN}" -g \
            "--tws-path=/root/Jts" \
            "--ibc-path=/opt/ibc" \
            "--ibc-ini=/opt/ibc/config.ini" \
            "--mode=${TRADING_MODE}" \
            "--on2fatimeout=restart"
        echo "[IBC-watchdog] IBC exited with code $?. Restarting in 10 seconds..."
        sleep 10
    done) &
    IBC_WATCHDOG_PID=$!
    echo "IBC watchdog started with PID: $IBC_WATCHDOG_PID"
fi

# Wait for IB Gateway to be ready
echo "Waiting for IB Gateway to be ready on port $IB_PORT..."
for i in $(seq 1 120); do
    if nc -z 127.0.0.1 "$IB_PORT" 2>/dev/null; then
        echo "IB Gateway ready on port $IB_PORT!"
        break
    fi
    if [ "$i" -eq 120 ]; then
        echo "WARNING: IB Gateway not ready after 120 seconds"
    fi
    sleep 1
done

echo "IBKR Gateway startup complete"
echo "IB Gateway: http://0.0.0.0:6080 (noVNC)"
echo "API Port: $IB_PORT"

# Keep container running
tail -f /dev/null
