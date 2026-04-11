#!/bin/bash

LOG_FILE="/tmp/startup.log"
exec 1> >(tee -a $LOG_FILE)
exec 2>&1

sed -i 's/TWS_MAJOR_VRSN=1019/TWS_MAJOR_VRSN=1037/' /opt/ibc/gatewaystart.sh

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ====== STARTING IBKR + VNC SYSTEM ======"

pkill -f Xvfb 2>/dev/null || true
pkill -f x11vnc 2>/dev/null || true
pkill -f websockify 2>/dev/null || true

export DISPLAY=:0
export XAUTHORITY=/tmp/.Xauthority

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [1/5] Starting Xvfb display server..."
Xvfb :0 -screen 0 1024x768x24 -ac -nolisten tcp >/dev/null 2>&1 &
XVFB_PID=$!
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Xvfb PID: $XVFB_PID"
sleep 4

if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Xvfb failed to start!"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Xvfb running"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [2/5] Starting window manager (openbox)..."
openbox >/dev/null 2>&1 &
OB_PID=$!
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Openbox PID: $OB_PID"
sleep 2

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [3/5] Starting VNC server (x11vnc)..."
x11vnc -display :0 -forever -nopw -rfbport 5900 -repeat -loop100 >/dev/null 2>&1 &
VNC_PID=$!
echo "[$(date '+%Y-%m-%d %H:%M:%S')] x11vnc PID: $VNC_PID"
sleep 2

if ! kill -0 $VNC_PID 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: VNC server failed to start!"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: VNC server running on port 5900"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [4/5] Starting websockify bridge..."
websockify --web /opt/novnc 6080 localhost:5900 >/dev/null 2>&1 &
WS_PID=$!
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Websockify PID: $WS_PID"
sleep 2

if ! kill -0 $WS_PID 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Websockify failed to start!"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Websockify running on port 6080"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [5/5] Starting IBC and IB Gateway..."

export DISPLAY=:0
export PATH="/opt/ibc/scripts:$PATH"

cd /opt/ibc

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Launching IBC Gateway with inline output..."

bash ./scripts/ibcstart.sh 1037 -g \
    --tws-path=/home/ibgateway \
    --ibc-path=/opt/ibc \
    --ibc-ini=/opt/ibc/config.ini \
    --user=alharthy2026 \
    --pw=Nasra_2026 \
    --mode=paper \
    >> /tmp/ibc_startup.log 2>&1 &

IBC_PID=$!
echo "[$(date '+%Y-%m-%d %H:%M:%S')] IBC PID: $IBC_PID"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Gateway log: /tmp/ibc_startup.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ====== SYSTEM READY ======"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] All processes started. Waiting for exit signal..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log file: $LOG_FILE"

wait

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Container shutting down..."
