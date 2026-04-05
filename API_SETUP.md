# API Setup Guide - Esteban

## Quick Start for Phone Testing

### 1. Find Your Machine IP

On macOS, run:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for your local network IP (typically `192.168.x.x` or `10.0.x.x`).

Example output:
```
inet 192.168.1.7 netmask 0xffffff00 broadcast 192.168.1.255
```

Your IP is: **192.168.1.7**

### 2. Update Client Environment

Edit `/client/.env.local` and replace the IP with yours:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_MACHINE_IP:5000
```

Example:
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.7:5000
```

### 3. Start the Flask Server

```bash
cd /Users/xav/Documents/projects/esteban/server
python -m venv .venv
source .venv/bin/activate
pip install -e .
python main.py
```

Server runs at: `http://YOUR_MACHINE_IP:5000`
Swagger UI: `http://YOUR_MACHINE_IP:5000/apidocs`

### 4. Start the Expo Client

```bash
cd /Users/xav/Documents/projects/esteban/client
npm install
npx expo start
```

Press `a` for Android emulator, or scan QR code with Expo Go on your phone.

### 5. Test

- Open chat screen in app
- Type a question
- Verify response streams from Ollama

## Troubleshooting

**Phone can't reach server:**
- Ensure phone and machine are on **same WiFi network**
- Check IP is correct: `ping 192.168.1.7` from phone terminal
- Verify Flask server is running: `curl http://192.168.1.7:5000/` (should return `{"message":"Use POST /chat/stream","status":"ok"}`)
- Check firewall isn't blocking port 5000

**CORS errors in console:**
- Already handled in server with `flask-cors`
- Make sure you installed `flask-cors` in server venv

**Ollama not responding:**
- Ensure `ollama serve` is running in background
- Check model exists: `ollama list | grep llama3.2`

## Architecture

```
Phone (React Native/Expo)
    ↓ HTTP POST /chat/stream
Machine (Flask API)
    ↓ Real-time streaming
Ollama (LLM)
    ↓ Token generation
Machine (Flask API)
    ↓ Stream chunks
Phone (Chat UI)
```

## Environment Variables

### Server (server/main.py)
- `FLASK_ENV=development` (optional, for debug mode)
- Default port: 5000
- Listens on: 0.0.0.0 (all interfaces)

### Client (client/.env.local)
- `EXPO_PUBLIC_API_BASE_URL` — Full URL to Flask server
- Must start with `EXPO_PUBLIC_` to be bundled by Expo
