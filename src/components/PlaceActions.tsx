import { useId, useState } from 'react';
import { Copy, Navigation, Search, Check } from 'lucide-react';
import type { Place, TripEvent } from '../lib/data';
import { navigationLinks, type TravelMode } from '../lib/amapLink';

export function PlaceActions({ place, event }: { place: Place; event: Pick<TripEvent, 'navigationEligible' | 'type'> }) {
  const [mode, setMode] = useState<TravelMode>('walk');
  const [copyStatus, setCopyStatus] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const modeId = useId();
  const links = navigationLinks(event, place, mode);
  const text = [place.zh, place.addressZh].filter(Boolean).join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopyStatus('복사했어요'); }
    catch { setManualCopy(true); setCopyStatus('텍스트를 길게 눌러 직접 복사하세요.'); }
  }
  return <>
    {links && <div className="place-actions">
      {links.route ? <>
        <label className="sr-only" htmlFor={modeId}>이동수단</label>
        <select id={modeId} aria-label="이동수단" value={mode} onChange={e => setMode(e.target.value as TravelMode)}><option value="walk">도보</option><option value="drive">차량</option><option value="transit">대중교통</option></select>
        <a className="button route-button" href={links.route}><Navigation size={16} /> 길찾기</a>
        {links.webRoute && <a className="text-link" href={links.webRoute} target="_blank" rel="noopener noreferrer">온라인 경로 대안</a>}
      </> : links.search && <a className="button route-button" href={links.search} target="_blank" rel="noopener noreferrer"><Search size={16} /> 고덕지도에서 찾기 <span aria-hidden="true">↗</span></a>}
      {text && <button className="copy-button" onClick={copy}>{copyStatus === '복사했어요' ? <Check size={16} /> : <Copy size={16} />} 중국어 복사</button>}
    </div>}
    {links && <p className="link-disclaimer">{links.route ? (place.routeVerifiedOnIPhone ? '이 기기에서도 목적지·경로를 다시 확인하세요.' : 'iPhone 경로 결과 미검증 · 앱 전환 후 지점을 확인하세요.') : '목적지 미검증 · 새 창에서 검색 후 지점과 주소를 확인하세요.'}</p>}
    {!links && !place.zh && <p className="unknown-place">장소 미확정 · 중국어 상호·좌표 확인 전 지도 연결 안 함</p>}
    <span className="sr-only" role="status">{copyStatus}</span>
    {manualCopy && <textarea className="manual-copy" aria-label="직접 복사할 중국어" readOnly value={text} onFocus={e => e.currentTarget.select()} />}
  </>;
}
