export default {
  name: "ping",
  execute: async ({ sock, from }) => {
    await sock.sendMessage(from, { text: "Pong! 🧛‍♀️ VAMPARINA V1 by Arnold Chirchir" });
  }
};