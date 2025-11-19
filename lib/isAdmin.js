export const isAdmin = async (sock, groupJid, userJid) => {
  const metadata = await sock.groupMetadata(groupJid);
  return metadata.participants.some(p => p.id === userJid && p.admin);
};