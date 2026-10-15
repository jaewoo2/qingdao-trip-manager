/* global console, process */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
function builtFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? builtFiles(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const bad = [];
const patterns = [/https?:\/\/[^\s"'<>]*\.vercel\.app/i, /gh[pousr]_[A-Za-z0-9]{20,}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /file_[0-9a-f]{24,}/, new RegExp(['X-Amz-', 'Signature='].join(''), 'i')];
for (const file of [...new Set([...files, ...builtFiles('dist')])]) {
  if (/(^|\/)\.env(?:\.|$)|(^|\/)\.vercel\//.test(file)) { bad.push(file); continue; }
  if (!/\.(?:md|json|tsx?|m?js|html|ya?ml|svg|webmanifest|css|txt)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (patterns.some(pattern => pattern.test(text))) bad.push(file);
}
const seed = JSON.parse(readFileSync('src/data/itinerary.seed.json', 'utf8'));
if (seed.trip.id !== 'qingdao-demo' || seed.places.hotel.addressZh || seed.places.hotel.amapSearch) bad.push('demo data');
if (bad.length) { console.error('공개 파일 검토 필요:', [...new Set(bad)].join(', ')); process.exit(1); }
console.log('공개 파일 검사 통과: 예시 데이터·배포 주소·주요 비밀정보 패턴 확인');
