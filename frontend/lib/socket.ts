 import { io } from 'socket.io-client'

 // Use HTTP(S) URL for Socket.IO; it will upgrade transports automatically.
 const base = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
 export const socket = io(base, {
   path: '/ws/socket.io',
   autoConnect: false,
   transports: ['websocket', 'polling'],
   reconnection: true,
   reconnectionAttempts: 10,
   reconnectionDelay: 500,
 })
