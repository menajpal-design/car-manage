# FleetMaster Pro - Domain & Server Configuration Documentation

This document describes the unified single-domain server architecture, port mappings, Nginx settings, and GPS hardware setup configured for **FleetMaster Pro**.

---

## 1. Unified Domain Architecture
For ease of management and to avoid browser **Mixed Content** blocks and CORS complications, all applications and APIs have been unified under a single domain: **`fleet-web.duckdns.org`**.

| Component | Public URL | Internal Server Port |
| :--- | :--- | :--- |
| **Admin Dashboard** (`web`) | `https://fleet-web.duckdns.org` | `http://localhost:3001` |
| **Driver Mobile Portal** (`mobile`) | `https://fleet-web.duckdns.org/driver` | `http://localhost:3002` |
| **Express Backend API** (`server`) | `https://fleet-web.duckdns.org/api` | `http://localhost:5001` |
| **WebSockets** (`Socket.io`) | `wss://fleet-web.duckdns.org/socket.io` | `ws://localhost:5001/socket.io` |
| **GPS Traccar Web Panel** (`Traccar`) | `https://fleet-gps.duckdns.org` | `http://localhost:8082` |

---

## 2. Nginx Proxy Configuration
The file `/etc/nginx/sites-available/fleetmaster-api` contains the routing settings for Nginx. It directs traffic from port `80` (HTTP) and `443` (HTTPS) to the correct internal server ports.

### Configuration Template:
```nginx
server {
    listen 80;
    server_name fleet-web.duckdns.org;

    # Driver Mobile App (served under /driver path)
    location /driver {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_bypass;
    }

    # Express API Backend
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_bypass;
    }

    # WebSockets (Socket.io)
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_bypass;
    }

    # Admin/Owner Dashboard
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_bypass;
    }
}

server {
    listen 80;
    server_name fleet-gps.duckdns.org;

    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_bypass;
    }
}
```

---

## 3. SinoTrack ST-901 GPS Configuration
The physical SinoTrack ST-901 tracker installed in the vehicle sends locations to the server.

1. **Server IP and Port Setup:**
   Send this SMS to the tracker's SIM card to point it to your DigitalOcean droplet IP:
   `8040000 159.65.227.91 5013`
   *(Port `5013` is Traccar's default listener for the SinoTrack protocol)*.

2. **Upload Interval Setup:**
   Send this SMS to set the update interval to 20 seconds:
   `8050000 20`

3. **Webhook Link:**
   Traccar is configured in `/opt/traccar/conf/traccar.xml` to forward all incoming coordinates to the Node.js API:
   ```xml
   <entry key='event.forward.enable'>true</entry>
   <entry key='event.forward.url'>http://localhost:5001/api/tracking/webhook</entry>
   ```
