#!/usr/bin/env python3
"""
IBKR Gateway Raw Socket Diagnostic
Tests if Gateway is accepting API connections at the binary protocol level
"""

import socket
import struct
import time
import sys

def test_raw_socket_connection(host='46.202.89.48', port=4002):
    """Test raw socket connection to IBKR Gateway"""
    print(f"\n{'='*60}")
    print(f"IBKR Gateway Raw Socket Diagnostic")
    print(f"Target: {host}:{port}")
    print(f"{'='*60}\n")

    # Step 1: TCP Connection
    print("[1] Testing TCP connection...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        print(f"    Connecting to {host}:{port}...")
        sock.connect((host, port))
        print(f"    [OK] TCP connection successful\n")
    except Exception as e:
        print(f"    [FAIL] TCP connection failed: {e}\n")
        return False

    # Step 2: Check if we get any data from Gateway
    print("[2] Waiting for initial response from Gateway...")
    try:
        sock.settimeout(2)
        data = sock.recv(1024)
        if data:
            print(f"    [OK] Received {len(data)} bytes from Gateway")
            print(f"    Data (hex): {data.hex()}")
            print(f"    Data (raw): {data}\n")
        else:
            print(f"    [WARN] No data received from Gateway (connection silent)\n")
    except socket.timeout:
        print(f"    [WARN] Timeout waiting for response (Gateway not sending data)\n")
    except Exception as e:
        print(f"    [FAIL] Error receiving: {e}\n")

    # Step 3: Send StartAPI message (ib_insync protocol)
    # StartAPI format: message code (71) + version + optional session ID
    print("[3] Attempting to send StartAPI handshake...")
    try:
        # IB API Start Message format:
        # - Message code: 71 (0x47)
        # - API Version: varies, typically "9.72" or similar
        # - Optional: session/client ID

        # Build a minimal StartAPI message
        start_api_msg = b'\x00\x00\x00\x00\x47'  # Message code 71
        start_api_msg += b'API v9.72\x00'  # Simple API version string

        print(f"    Sending StartAPI handshake ({len(start_api_msg)} bytes)...")
        sock.sendall(start_api_msg)
        print(f"    [OK] StartAPI message sent\n")

        # Wait for response
        print("[4] Waiting for Gateway response to StartAPI...")
        sock.settimeout(3)
        response = sock.recv(1024)
        if response:
            print(f"    [OK] Received {len(response)} bytes")
            print(f"    Response (hex): {response.hex()}")
            print(f"    Response (raw): {response}")
            print(f"    [OK] API PROTOCOL HANDSHAKE SUCCESSFUL!\n")
        else:
            print(f"    [FAIL] No response to StartAPI (Gateway rejected/disconnected)\n")

    except socket.timeout:
        print(f"    [FAIL] Timeout waiting for StartAPI response (Gateway did not respond)\n")
    except Exception as e:
        print(f"    [FAIL] Error: {e}\n")
    finally:
        sock.close()
        print("[5] Socket closed\n")

    print(f"{'='*60}")
    print("Diagnostic complete")
    print(f"{'='*60}\n")

def test_local_gateway(host='127.0.0.1', port=4002):
    """Test local Gateway if accessible"""
    print("\n[BONUS] Testing local Gateway access (127.0.0.1:4002)...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        sock.connect((host, port))
        print(f"    [OK] Local Gateway is reachable\n")
        sock.close()
    except Exception as e:
        print(f"    [FAIL] Local Gateway not reachable: {e}\n")

if __name__ == '__main__':
    # Test against production server
    test_raw_socket_connection(host='46.202.89.48', port=4002)

    # Also try localhost in case running locally
    test_local_gateway()
