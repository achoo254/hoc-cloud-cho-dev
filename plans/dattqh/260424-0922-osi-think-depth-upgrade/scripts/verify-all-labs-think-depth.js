/**
 * Final verify — all 8 labs have misconceptions >= 2 + tldr.why with RFC cite.
 */
import mongoose from 'mongoose';

const SLUGS = ['tcp-ip-packet-journey', 'arp', 'dhcp', 'dns', 'http', 'icmp-ping', 'subnet-cidr', 'tcp-udp'];
const RFC_RX = /<a\s+href=.*(rfc|iso\.org)/i;

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }

await mongoose.connect(uri);
const Lab = mongoose.model('Lab', new mongoose.Schema({}, { strict: false }), 'labs');

let allOk = true;
console.log('slug                        | misc | tldr | walk | tldr[0].cite | misc[0].cite');
console.log('----------------------------|------|------|------|--------------|-------------');
for (const slug of SLUGS) {
  const d = await Lab.findOne({ slug }, { tldr: 1, walkthrough: 1, misconceptions: 1, _id: 0 }).lean();
  if (!d) { console.log(`${slug.padEnd(28)}| NOT FOUND`); allOk = false; continue; }
  const miscOk = (d.misconceptions?.length ?? 0) >= 2;
  const tldrCite = RFC_RX.test(d.tldr?.[0]?.why ?? '');
  const miscCite = RFC_RX.test((d.misconceptions?.[0]?.right ?? '') + (d.misconceptions?.[0]?.why ?? ''));
  const row = [
    slug.padEnd(28),
    String(d.misconceptions?.length ?? '—').padEnd(5),
    String(d.tldr?.length ?? '—').padEnd(5),
    String(d.walkthrough?.length ?? '—').padEnd(5),
    (tldrCite ? '✓' : '✗').padEnd(13),
    miscCite ? '✓' : '✗',
  ].join('| ');
  console.log(row);
  if (!miscOk || !tldrCite) allOk = false;
}
console.log('----------------------------');
console.log(allOk ? '✓ ALL 8 LABS PASS' : '✗ SOME LABS FAIL');

await mongoose.disconnect();
process.exit(allOk ? 0 : 1);
