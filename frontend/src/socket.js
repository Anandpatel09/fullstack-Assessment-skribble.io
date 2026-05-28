// import { io } from 'socket.io-client';

// const defaultServerUrl = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

// export const socket = io(defaultServerUrl, {
//   reconnectionAttempts: 5,
//   timeout: 5000
// });
import { io } from 'socket.io-client';

const serverUrl = import.meta.env.DEV
  ? 'http://localhost:4000'
  : import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}`;

export const socket = io(serverUrl, {
  reconnectionAttempts: 5,
  timeout: 5000
});

// import { io } from 'socket.io-client';

// const serverUrl =
//   import.meta.env.VITE_API_URL ||
//   'https://anands-skribble-io.onrender.com';

// export const socket = io(serverUrl, {
//   reconnectionAttempts: 5,
//   timeout: 5000
// });