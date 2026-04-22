// Stub for ssh2 — docker-modem requires it at module scope for SSH transport,
// but hoc-cloud uses Unix socket / named pipe only. Any attempt to call into
// ssh2 will throw; docker-modem's ssh() codepath is never invoked by us.
const unavailable = () => {
  throw new Error('ssh2 is stubbed — Docker client uses Unix socket transport');
};
export const Client = unavailable;
export const Server = unavailable;
export const utils = {};
export default { Client, Server, utils };
