import { useState, type FormEvent } from 'react';
import { ArrowLeft, FlaskConical, Download, ExternalLink } from 'lucide-react';
import { seed } from '../lib/data';
import { routeLink, searchLink, webRouteLink, type TravelMode } from '../lib/amapLink';

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function MapLinkLab() {
  const [placeId, setPlaceId] = useState('beer_museum');
  const [mode, setMode] = useState<TravelMode>('walk');
  const [kind, setKind] = useState('poi');
  const [candidate, setCandidate] = useState<{ ios: string; web: string | null; source: string; generatedAt: string } | null>(null);
  const [error, setError] = useState('');
  const place = seed.places[placeId];
  const [environment, setEnvironment] = useState({ ios: '', amap: '', surface: 'Safari', network: 'Wi-Fi', serverBlocked: false });
  const unrun = { appOpened: 'not-run', currentLocation: 'not-run', correctDestination: 'not-run', routeResults: 'not-run', returnState: 'not-run' };
  const [results, setResults] = useState<Record<string, string>>(unrun);
  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCandidate(null); setError('');
    const data = new FormData(event.currentTarget);
    if (data.get('identity') !== 'on' || !String(data.get('source')).trim()) { setError('실제 지점 대조와 출처가 필요합니다.'); return; }
    const poi = String(data.get('poi') ?? '').trim();
    const lat = Number(data.get('lat')); const lon = Number(data.get('lon'));
    if (kind === 'poi' ? !poi : !data.get('lat') || !data.get('lon') || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { setError('직접 확인한 ID 또는 유효한 GCJ-02 위도·경도 쌍을 입력하세요.'); return; }
    const testPlace = { ...place, amapPoiId: kind === 'poi' ? poi : null, amapPoiIdStatus: kind === 'poi' ? 'verified' as const : 'unverified' as const, coordsGCJ02: kind === 'coords' ? { lat, lon } : null, coordsStatus: kind === 'coords' ? 'verified' as const : 'unverified' as const };
    const ios = routeLink(testPlace, mode);
    if (ios) { setCandidate({ ios, web: webRouteLink(testPlace, mode), source: String(data.get('source')).trim(), generatedAt: new Date().toISOString() }); setResults(unrun); }
  }
  return <main className="lab page-width">
    <a className="back-link" href="#"><ArrowLeft size={18} /> 일정으로 돌아가기</a>
    <div className="section-eyebrow"><FlaskConical size={18} /> MAP LINK LAB · WP-0</div>
    <h1>고덕지도 연결 실험실</h1>
    <p>iPhone Safari와 홈 화면 PWA에서 직접 시험하는 화면입니다. 앱 실행과 현재 위치 → 정확한 목적지의 <strong>경로 결과</strong>를 각각 확인하세요.</p>
    <div className="notice warning"><strong>실기기 미검증 · Go 판정 보류</strong><p>정본의 32개 장소 모두 ID·좌표 미확인입니다. 출처 URL의 문자열을 POI ID로 자동 추출하지 않습니다. 아래 입력은 이 화면에서만 쓰며 정본이나 일정의 검증 상태를 바꾸지 않습니다.</p></div>
    <form className="panel lab-form" onSubmit={generate} onChange={() => { setCandidate(null); setResults(unrun); }}>
      <h2>1. 목적지 직접 대조</h2>
      <label>테스트 장소<select aria-label="테스트 장소" value={placeId} onChange={e => setPlaceId(e.target.value)}>{['hotel', 'beer_museum', 'forest', 'wanhechun'].map(id => <option key={id} value={id}>{seed.places[id].ko}</option>)}</select></label>
      <p lang="zh-CN">{place.zh}<br />{place.addressZh}</p>
      {place.sourceAmapUrl && <a href={place.sourceAmapUrl} rel="noreferrer" target="_blank">제공된 장소 출처 보기 <ExternalLink size={14} /></a>}
      <a className="button secondary" href={searchLink(place)!} target="_blank" rel="noopener noreferrer">고덕지도에서 찾기</a>
      <p className="muted">검색 후 주소·층·지점을 대조하세요. 검색은 경로 화면 성공이 아닙니다.</p>
      <label>식별 방식<select aria-label="식별 방식" value={kind} onChange={e => setKind(e.target.value)}><option value="poi">확인한 고덕 POI ID</option><option value="coords">확인한 GCJ-02 좌표</option></select></label>
      {kind === 'poi' ? <label>POI ID<input name="poi" required autoComplete="off" /></label> : <div className="two-columns"><label>위도 (lat)<input name="lat" type="number" step="any" min="-90" max="90" required /></label><label>경도 (lon)<input name="lon" type="number" step="any" min="-180" max="180" required /></label></div>}
      <label>확인 출처·일시<input name="source" required placeholder="고덕 앱에서 주소·지점을 대조한 근거" /></label>
      <label className="check-label"><input name="identity" type="checkbox" required />실제 목적지의 지점·주소와 ID 또는 GCJ-02 좌표를 직접 확인했습니다.</label>
      <label>이동수단<select aria-label="이동수단" value={mode} onChange={e => setMode(e.target.value as TravelMode)}><option value="walk">도보</option><option value="drive">차량</option><option value="transit">대중교통</option></select></label>
      <button className="primary" type="submit">테스트 후보 링크 만들기</button>
      {error && <p role="alert">{error}</p>}
    </form>
    {candidate && <section className="panel"><h2>2. 실제 iPhone에서 탭</h2><p>후보 링크입니다. iPhone 경로 결과 확인 전에는 성공으로 간주하지 않습니다.</p><code className="url-output">{candidate.ios}</code><a className="button primary" href={candidate.ios}>고덕 iOS 경로 후보 열기</a>{candidate.web && <a className="button secondary" href={candidate.web} target="_blank" rel="noopener noreferrer">온라인 HTTPS 대안 열기</a>}<p className="muted">실패 시 위 검색을 사용하거나 중국어 상호·주소를 복사하세요. 앱 설치 여부는 웹에서 판별하지 않습니다.</p></section>}
    <section className="panel lab-form"><h2>3. 수동 시험 기록</h2><p>환경·장소·이동수단 조합마다 기록을 내려받으세요. 도보와 차량, Safari와 홈 화면 PWA를 각각 반복합니다. 실제 사용하는 기기와 고덕지도 앱 버전을 직접 확인해 입력하세요.</p>
      <div className="two-columns"><label>iOS 버전<input value={environment.ios} onChange={e => setEnvironment({ ...environment, ios: e.target.value })} /></label><label>고덕 앱 버전<input value={environment.amap} onChange={e => setEnvironment({ ...environment, amap: e.target.value })} /></label></div>
      <label>실행 환경<select aria-label="실행 환경" value={environment.surface} onChange={e => { setEnvironment({ ...environment, surface: e.target.value }); setResults(unrun); }}><option>Safari</option><option>홈 화면 PWA</option></select></label>
      <label>네트워크<select aria-label="네트워크" value={environment.network} onChange={e => { setEnvironment({ ...environment, network: e.target.value }); setResults(unrun); }}><option>Wi-Fi</option><option>eSIM</option><option>비행기 모드 (지도 경로 판정 제외)</option></select></label>
      <label className="check-label"><input type="checkbox" checked={environment.serverBlocked} onChange={e => setEnvironment({ ...environment, serverBlocked: e.target.checked })} />인터넷은 켜 두고 여행 웹앱 서버만 차단</label>
      {Object.entries({ appOpened: '고덕 앱 전환', currentLocation: '출발지 = 내 위치', correctDestination: '정확한 지점·주소', routeResults: '경로 결과 화면', returnState: 'PWA 복귀·변경 유지' }).map(([key, label]) => <label key={key}>{label}<select value={results[key]} onChange={e => setResults({ ...results, [key]: e.target.value })}><option value="not-run">미실행</option><option value="pass">직접 확인 · 통과</option><option value="fail">실패</option></select></label>)}
      <button className="secondary" onClick={() => downloadJson({ kind: 'manual-iphone-evidence', recordedAt: new Date().toISOString(), environment, placeId, chineseName: place.zh, address: place.addressZh, mode, candidate, results, note: '사용자 수동 기록. 자동 테스트의 성공 판정과 별개.' }, `amap-iphone-${placeId}-${mode}.json`)}><Download size={17} /> 수동 기록 내려받기</button>
    </section>
  </main>;
}
