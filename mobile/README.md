# LITS Mobile (Expo)

Quick scaffold for an Expo app integrated with the existing LITS backend.

Run:

```powershell
cd mobile
npm install
npx expo start
```

Notes:
- By default `src/api/axios.js` points to `http://10.0.2.2:8000` (Android emulator). Change to your backend host when testing on a device or iOS simulator.
- If you don't have `expo` installed globally, use `npx expo`.
- For device testing: use the LAN QR code and ensure your phone can reach the backend host.
