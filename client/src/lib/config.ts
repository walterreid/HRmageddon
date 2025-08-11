// client/src/lib/config.ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4001";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "ws://localhost:4001";

export const config = { API_URL, SOCKET_URL };
