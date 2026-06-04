# GeoWatch Environment Variables Template

## Instructions
1. Copy this file to .env.development and .env.production
2. Never commit .env files to Git
3. Keep .env.example in repo with dummy values

---

## Development (.env.development)

NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=geowatch_dev
DB_USER=geowatch_user
DB_PASSWORD=your_secure_password_here

JWT_SECRET=your_super_secret_random_string_min_32_chars
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

MARTIN_URL=http://localhost:8080
MBTILES_PATH=/home/YOUR_USERNAME/GlassGhost/01-Projects/geowatch/assets/map.mbtiles

USER_WEB_URL=http://localhost:5173
ADMIN_WEB_URL=http://localhost:5174

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

TWITTER_OEMBED_URL=https://publish.twitter.com/oembed

# File Storage — local for dev, R2 for production
STORAGE_PROVIDER=local              # 'local' | 'r2'
UPLOAD_DIR=./uploads                # Local disk path (dev only)
# R2_BUCKET=geowatch-media          # R2 bucket name (production)
# R2_ENDPOINT=https://...           # R2 S3-compatible endpoint
# R2_ACCESS_KEY_ID=...              # R2 API token
# R2_SECRET_ACCESS_KEY=...          # R2 API secret
# R2_PUBLIC_URL=https://...         # CDN/public URL prefix for served files

# Google OAuth (public user sign-in)
# Get your Client ID from https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

---

## Production (.env.production)

NODE_ENV=production
PORT=3000
API_URL=https://api.geowatch.app

DB_HOST=your_vps_ip_or_hostname
DB_PORT=5432
DB_NAME=geowatch_prod
DB_USER=geowatch_user
DB_PASSWORD=your_very_secure_password_here

JWT_SECRET=your_production_secret_min_64_chars_random
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

MARTIN_URL=https://tiles.geowatch.app

USER_WEB_URL=https://geowatch.app
ADMIN_WEB_URL=https://admin.geowatch.app

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

TWITTER_OEMBED_URL=https://publish.twitter.com/oembed

# Google OAuth (public user sign-in)
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

---

## Security Checklist
- JWT_SECRET is random and greater than 32 characters
- DB_PASSWORD is unique, not reused anywhere
- .env files are in .gitignore
- Production DB is not exposed to internet
- Production uses HTTPS only