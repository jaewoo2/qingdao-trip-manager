import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, Bookmark, CalendarDays, Check, CheckCheck, ChevronDown, ClipboardCheck, Coffee, Compass, FlaskConical, Heart, House, Info, MapPin, Moon, Plane, Printer, RotateCcw, ShieldCheck, Sparkles, Utensils, Waves, X } from 'lucide-react';
import { seed, type TripEvent } from './lib/data';
import { DAY_KEY, emptyState, importState, loadState, MAX_BACKUP_BYTES, saveState, selectedPlaceId, selectPlace, STORAGE_KEY, toggleCompleted, type UserState } from './lib/state';
import { PlaceActions } from './components/PlaceActions';
import { MapLinkLab, downloadJson } from './components/MapLinkLab';
import { Modal } from './components/Modal';
import { PackingList } from './components/PackingList';
import { RestaurantList } from './components/RestaurantList';
import { MealSummary } from './components/MealSummary';
import { places, plannedEvent } from './lib/tripPlan';
import { isDayComplete, setDayComplete } from './lib/tripProgress';
import { useOffline } from './lib/offline';
import './styles.css';

const icons = { meal: Utensils, cafe: Coffee, breakfast: Coffee, hotel: House, flight: Plane, travel: Compass, activity: MapPin, snack: Utensils, nightlife: Moon, admin: Bookmark };
const categories: Record<string, string> = { meal: '식사', cafe: '카페', breakfast: '호텔 조식', hotel: '숙소', flight: '항공', travel: '이동', activity: '둘러보기', snack: '간식', nightlife: '나이트라이프', admin: '여행 준비' };

export function EventCard({ event, state, commit, locked }: { event: TripEvent; state: UserState; commit: (s: UserState) => void; locked: boolean }) {
  const id = selectedPlaceId(event, state);
  const place = id ? places[id] : null;
  const changed = id !== event.placeId;
  const completed = state.completedEventIds.includes(event.id);
  const [alternatives, setAlternatives] = useState(false);
  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const collapsed = completed && !expandedCompleted;
  const Icon = icons[event.type as keyof typeof icons] ?? MapPin;
  return <article className={`event-card ${event.required ? 'required' : ''} ${completed ? 'completed' : ''} ${collapsed ? 'collapsed' : ''}`} data-testid={event.id}>
    <div className="timeline-dot" aria-hidden="true"><Icon size={16} /></div>
    <div className="event-meta"><span className="time-label">{event.timeLabel}</span><span className="category">{categories[event.type] ?? event.type}</span>{event.required && <span className="badge required-badge"><Sparkles size={11} /> 필수</span>}{event.optional && <span className="badge optional-badge">선택</span>}{changed && <span className="badge changed-badge">대안 선택됨</span>}</div>
    <div className="event-heading"><h3>{changed && place ? place.ko : event.title}</h3><button disabled={locked} className={`done-button ${completed ? 'is-done' : ''}`} aria-label={`${changed && place ? place.ko : event.title} 방문 완료`} aria-pressed={completed} title="실제로 방문한 뒤 체크하세요" onClick={() => { setExpandedCompleted(false); commit(toggleCompleted(state, event.id)); }}><Check size={18} /></button></div>
    {completed && <button className="completed-toggle" aria-expanded={!collapsed} aria-controls={`body-${event.id}`} onClick={() => setExpandedCompleted(!expandedCompleted)}><CheckCheck size={14} /> 방문 완료 · {collapsed ? '상세 펼치기' : '상세 접기'} <ChevronDown size={14} className={collapsed ? '' : 'rotated'} /></button>}
    <div className="event-body" id={`body-${event.id}`} hidden={collapsed}>
    {place && <>
      {event.title !== place.ko && !changed && <p className="place-ko">{place.ko}</p>}
      <p className="chinese-name" lang="zh-CN">{place.zh || '중국어 상호 미확정'}</p>
      {place.addressZh && <p className="address" lang="zh-CN"><MapPin size={13} />{place.addressZh}</p>}
      {changed && <p className="original-place">원래 일정: {event.title}</p>}
      {event.notes && <p className="event-note">{event.notes}</p>}
      {place.note && place.note !== event.notes && <p className="place-note">{place.note}</p>}
      {event.type === 'meal' && id && <MealSummary placeId={id} />}
      <PlaceActions place={place} event={event} />
    </>}
    {state.notesByEventId[event.id] && <p className="print-user-note">내 메모: {state.notesByEventId[event.id]}</p>}
    <div className="card-tools">
      {event.alternativePlaceIds.length > 0 && <button className="alternative-toggle" aria-expanded={alternatives} aria-controls={`alt-${event.id}`} onClick={() => setAlternatives(!alternatives)}><RotateCcw size={14} /> 대안 보기 <ChevronDown size={14} className={alternatives ? 'rotated' : ''} /></button>}
      <details className="note-details"><summary>내 메모{state.notesByEventId[event.id] ? ' · 작성됨' : ''}</summary><label htmlFor={`note-${event.id}`} className="sr-only">{event.title} 메모</label><textarea id={`note-${event.id}`} placeholder="기억해 둘 내용을 적어두세요" value={state.notesByEventId[event.id] ?? ''} maxLength={2000} disabled={locked} onChange={e => commit({ ...state, notesByEventId: { ...state.notesByEventId, [event.id]: e.target.value }, lastUpdated: new Date().toISOString() })} /><small>이 기기에만 저장 · 최대 2,000자</small></details>
    </div>
    {alternatives && <div className="alternatives" id={`alt-${event.id}`}>
      <p>같은 시간대의 장소와 지도 대상이 함께 바뀝니다.</p>
      {[event.placeId, ...event.alternativePlaceIds].filter((v): v is string => Boolean(v)).map(candidateId => {
        const candidate = places[candidateId];
        return <button key={candidateId} className={`alternative-option ${id === candidateId ? 'selected' : ''}`} disabled={locked} aria-pressed={id === candidateId} onClick={() => commit(selectPlace(state, event.id, candidateId))}>
          <span><strong>{candidate.ko}</strong><span lang="zh-CN">{candidate.zh}</span>{candidate.addressZh && <small lang="zh-CN">{candidate.addressZh}</small>}<small>{candidateId === event.placeId ? '원래 장소 · 선택하면 원복' : '대안'}</small></span>{id === candidateId ? <CheckCheck size={20} /> : <ArrowUpRight size={18} />}
        </button>;
      })}
    </div>}
    </div>
  </article>;
}

export default function App() {
  const [hash, setHash] = useState(location.hash);
  const [boot] = useState(() => { try { return loadState(localStorage); } catch { return { state: emptyState(), error: '기기 저장소에 접근할 수 없습니다. 변경 사항을 백업하세요.', locked: false, raw: null }; } });
  const [state, setState] = useState(boot.state);
  const [locked, setLocked] = useState(boot.locked);
  const [saveError, setSaveError] = useState<string | null>(boot.error);
  const [saved, setSaved] = useState(false);
  const [dayIndex, setDayIndex] = useState(() => { try { const value = Number(localStorage.getItem(DAY_KEY)); return Number.isInteger(value) && value >= 0 && value < seed.days.length ? value : 0; } catch { return 0; } });
  const [panel, setPanel] = useState<'backup' | 'hotel' | 'airport' | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const offline = useOffline();
  useEffect(() => { const listener = () => setHash(location.hash); addEventListener('hashchange', listener); return () => removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      try {
        const next = loadState(localStorage);
        setState(next.state); setLocked(next.locked); setSaveError(next.error);
      } catch { setSaveError('다른 탭의 변경 사항을 읽지 못했습니다. 백업 후 다시 여세요.'); }
    };
    addEventListener('storage', listener); return () => removeEventListener('storage', listener);
  }, []);
  function commit(next: UserState, recovery = false) {
    if (locked && !recovery) return;
    setState(next); setSaved(false);
    try { saveState(localStorage, next); setSaveError(null); setLocked(false); setSaved(true); }
    catch { setSaveError('기기 저장에 실패했습니다. 지금 변경은 화면에만 남아 있습니다. 앱을 닫기 전에 JSON 백업을 내려받으세요.'); }
  }
  function chooseDay(index: number) {
    setDayIndex(index);
    try { localStorage.setItem(DAY_KEY, String(index)); } catch { /* Date preference is optional; itinerary saves show their own error. */ }
  }
  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error();
      const next = importState(await file.text());
      if (!confirm('이 백업으로 현재 변경 사항과 메모를 교체할까요?')) return;
      saveState(localStorage, next); setState(next); setSaveError(null); setLocked(false); setSaved(true); setImportMessage('백업을 복원했습니다.');
    } catch { setImportMessage('복원 실패: 파일 형식·일정 ID·대안·저장 권한을 확인하세요. 기존 상태는 유지했습니다.'); }
    finally { e.target.value = ''; }
  }
  const activeTab = hash === '#packing' ? 'packing' : hash === '#restaurants' ? 'restaurants' : 'itinerary';
  const day = seed.days[dayIndex];
  const doneCount = day.events.filter(event => state.completedEventIds.includes(event.id)).length;
  const kaoyu = state.requiredGoalAcknowledgements.kaoyuEaten;
  if (hash === '#map-link-lab') return <MapLinkLab />;
  return <>
    <a className="skip-link" href={`#${activeTab}`}>본문으로 건너뛰기</a>
    <header className="site-header"><div className="header-inner"><a href="#" className="brand"><span className="brand-mark"><Waves size={23} /></span>칭다오 노트<span className="brand-en">QINGDAO NOTE</span></a><div className="header-actions"><span className="private-label"><ShieldCheck size={14} /> 예시 여행</span><button className="icon-button" aria-label="백업과 여행 준비" onClick={() => setPanel('backup')}><Bookmark size={20} /></button></div></div></header>
    <p className="public-demo-banner page-width">공개용 예시 앱 · 실제 여행·예약 정보가 아닙니다. 변경 사항은 이 기기에만 저장됩니다.</p>
    <nav className="app-tabs page-width" aria-label="칭다오 노트 메뉴"><a href="#itinerary" aria-current={activeTab === 'itinerary' ? 'page' : undefined}><CalendarDays size={17} />여행 일정</a><a href="#packing" aria-current={activeTab === 'packing' ? 'page' : undefined}><ClipboardCheck size={17} />여행 준비물</a><a href="#restaurants" aria-current={activeTab === 'restaurants' ? 'page' : undefined}><Utensils size={17} />식당 후보 10곳</a></nav>
    {saveError && activeTab !== 'itinerary' && <div className="page-width"><div className="notice warning" role="alert"><p>{saveError}</p><button className="secondary" onClick={() => setPanel('backup')}>백업·복구 열기</button></div></div>}
    {activeTab === 'packing' && <PackingList state={state} commit={commit} locked={locked} />}
    {activeTab === 'restaurants' && <RestaurantList state={state} commit={commit} locked={locked} />}
    <main className="page-width itinerary-page" hidden={activeTab !== 'itinerary'}>
      <section className="trip-hero" aria-labelledby="trip-title">
        <div className="hero-copy"><p className="eyebrow"><span /> A LITTLE GETAWAY TO QINGDAO</p><h1 id="trip-title">예시로 만나는 칭다오,<br /><span>한 손에 담다.</span></h1><p className="hero-description">바다를 걷고, 맛있는 것을 나누는 3박 4일.<br />함께할 순간들을 이곳에 차곡차곡.</p><div className="trip-chips"><span><CalendarDays size={15} />공개용 예시 일정 · 4일</span><span>예시 인원 {seed.trip.adults}명</span></div></div>
        <div className="hero-art" aria-hidden="true"><img src="/qingdao-coast.svg" alt="" /><div className="travel-stamp"><span>青岛</span><small>GOOD DAYS<br />BY THE SEA</small></div><span className="art-caption">산책과 한 끼, 그리고 바다.</span></div>
      </section>
      <nav className="hero-quicklinks" aria-label="숙소와 공항 바로가기"><button onClick={() => setPanel('hotel')}><House size={15} />숙소·조식 <ArrowUpRight size={13} /></button><button onClick={() => setPanel('airport')}><Plane size={15} />항공편·공항 <ArrowUpRight size={13} /></button></nav>
      <section className={`offline-status ${offline.status === 'ready' ? 'ready' : ''}`} aria-label="오프라인 준비 상태"><span className="status-icon"><ShieldCheck size={20} /></span><div><strong>{offline.status === 'ready' ? '오프라인 준비 완료' : offline.status === 'checking' ? '오프라인 준비 확인 중' : offline.status === 'development' ? '개발 모드 · 오프라인 검증은 빌드에서' : '오프라인 준비 미완료'}</strong><p>{offline.status === 'ready' ? '일정과 변경 사항은 이 기기에서. 지도 경로는 고덕 앱의 인터넷·GPS를 사용해요.' : offline.message}</p></div><span className="status-pill">{offline.status === 'ready' ? '기기 캐시 확인됨' : '확인 필요'}</span></section>
      {offline.updateAvailable && <div className="notice update-notice"><p>새 버전이 준비되었습니다. 저장된 일정·메모를 보존한 채 업데이트합니다.</p><button className="secondary" onClick={offline.update}>새 버전 적용</button></div>}
      {saveError && <div className="notice warning" role="alert"><p>{saveError}</p><button className="secondary" onClick={() => setPanel('backup')}>백업·복구 열기</button></div>}
      <div className="workspace">
        <div className="itinerary-column" id="itinerary">
          <nav className="date-tabs" aria-label="여행 날짜">{seed.days.map((item, index) => <button key={item.date} aria-pressed={dayIndex === index} className={dayIndex === index ? 'active' : ''} onClick={() => chooseDay(index)}><small>DAY {index + 1}</small><strong>{item.label}</strong><span>{['도착과 첫 한 끼', '맥주와 야시장', '골목과 밤바다', '다시, 집으로'][index]}</span></button>)}</nav>
          <div className="day-intro"><div><p className="section-eyebrow">DAY {String(dayIndex + 1).padStart(2, '0')} · {day.label}</p><h2>{day.title}</h2><p>{day.events.length}개의 순간 <span>·</span> 중국 현지 시간 (Asia/Shanghai)</p></div><div className="day-progress"><span>{doneCount}<small> / {day.events.length}</small></span><small>방문 완료</small></div></div>
          <div className="day-completion"><label><input type="checkbox" checked={isDayComplete(state, dayIndex)} disabled={locked} onChange={e => commit(setDayComplete(state, dayIndex, e.target.checked))} /><span>{dayIndex + 1}일차 일정 모두 완료</span></label><p>{isDayComplete(state, dayIndex) ? '체크를 해제하면 이 날짜의 완료 표시를 모두 해제해요.' : '모든 일정을 마쳤을 때 체크하세요. 완료한 날의 식당은 지난 일정으로 모아요.'}</p></div>
          <div className="daily-note"><Info size={16} /><p>{dayIndex === 0 ? '점심은 루위가 기본이에요. 대기나 취향에 따라 같은 완샹청의 명가딤섬으로 바꿀 수 있어요.' : dayIndex === 1 ? '식당 대기 30분을 넘기면 같은 권역의 대안으로. 카페는 하루 한 곳이면 충분해요.' : dayIndex === 2 ? '예시 산책 일정이에요. 방문 시간과 운영 여부는 별도로 확인하세요.' : '돌아가는 편과 체크아웃 시간은 실제 예약 정보를 따로 확인하세요.'}</p></div>
          {seed.days.map((item, index) => <section key={item.date} className="day-content" hidden={index !== dayIndex} aria-label={`${item.label} 일정`}><h2 className="print-day-title">{item.label} · {item.title}</h2><div className="timeline">{item.events.map(event => <EventCard key={event.id} event={plannedEvent(event)} state={state} commit={commit} locked={locked} />)}</div></section>)}
          <div className="end-of-day"><Waves size={19} /><span>서두르지 않아도 좋은 여행.</span></div>
        </div>
        <aside className="trip-sidebar">
          <section className="panel essentials"><p className="section-eyebrow"><Heart size={14} /> 놓치지 않을 순간</p><h2>이번 여행의 작은 약속</h2><div className="goal-item"><span className={`goal-dot ${kaoyu ? 'checked' : ''}`}>{kaoyu ? <Check size={13} /> : '1'}</span><div><strong>따뜻한 카오위 한 끼</strong><p>{kaoyu ? '직접 먹었다고 확인했어요.' : '토요일 점심 기본 후보예요. 명가딤섬으로 바꿔도 괜찮아요.'}</p><label className="check-label"><input type="checkbox" checked={kaoyu} disabled={locked} onChange={e => commit({ ...state, requiredGoalAcknowledgements: { kaoyuEaten: e.target.checked }, lastUpdated: new Date().toISOString() })} />실제로 카오위를 먹었어요</label></div></div><div className="goal-item"><span className="goal-dot">2</span><div><strong>예시 일정의 해변 산책</strong><p>예시 일정 · 방문 시간 별도 확인<br />완료·체크 기능을 보여주는 예시</p></div></div>
            {state.selectedPlaceByEventId['d1-dinner'] === 'chuange' && <p className="subtle-warning">토요일 촨거를 선택했어요. 월요일은 명가딤섬, 카오위가 먹고 싶다면 루위도 검토하세요.</p>}
          </section>
          <section className="panel stay-card"><div className="stay-icon"><House size={22} /></div><p className="section-eyebrow">OUR LITTLE BASE</p><h2>여행의 시작과 끝,<br />우리의 숙소</h2><p lang="zh-CN">示例住宿</p><p className="muted">실제 숙소 정보는 포함하지 않았어요.</p><button className="text-link" onClick={() => setPanel('hotel')}>숙소 정보 보기 <ArrowUpRight size={16} /></button></section>
          <section className="panel quick-info"><h2>여행 주머니</h2><button onClick={() => setPanel('airport')}><Plane size={17} /> 항공편과 공항 <ArrowUpRight size={15} /></button><button onClick={() => setPanel('backup')}><ArrowDownToLine size={17} /> 백업과 오프라인 준비 <ArrowUpRight size={15} /></button><a href="#map-link-lab"><FlaskConical size={17} /> 지도 연결 실험실 <ArrowUpRight size={15} /></a></section>
          <p className="sidebar-footnote">예약된 식당은 없어요. 영업·대기·조명은 현장에서 확인해주세요. 이동 시간은 실시간 경로로 제공하지 않습니다.</p>
        </aside>
      </div>
      <footer className="site-footer"><Waves size={20} /><p>칭다오 노트 · 우리만의 3박 4일</p><small>v0.1.0 · 이 기기에 저장 · iPhone 실기기 검증 대기</small><span role="status" className="save-status">{saved && !saveError ? '변경 사항을 이 기기에 저장했어요.' : ''}</span></footer>
    </main>
    <nav className="mobile-nav" aria-label="바로가기"><a className={activeTab === 'itinerary' ? 'active' : ''} href="#itinerary" aria-current={activeTab === 'itinerary' ? 'page' : undefined}><CalendarDays size={20} />여행 일정</a><a className={activeTab === 'packing' ? 'active' : ''} href="#packing" aria-current={activeTab === 'packing' ? 'page' : undefined}><ClipboardCheck size={20} />여행 준비물</a><a className={activeTab === 'restaurants' ? 'active' : ''} href="#restaurants" aria-current={activeTab === 'restaurants' ? 'page' : undefined}><Utensils size={20} />식당 후보 10곳</a></nav>
    {panel && <Modal title={panel === 'backup' ? '백업과 여행 준비' : panel === 'hotel' ? '우리의 숙소' : '항공편과 공항'} onClose={() => setPanel(null)}>
      {panel === 'backup' ? <>
        <div className="notice"><strong>출국 전, 꼭 한 번 준비해주세요.</strong><p>안정적인 인터넷에서 Safari → 공유 → 홈 화면에 추가. 설치 앱에서 ‘오프라인 준비 완료’를 확인한 뒤 비행기 모드에서 두 번 재실행·수정해보세요.</p></div>
        <p>JSON 다운로드는 오프라인 사용의 필수 조건이 아니에요. 위의 ‘오프라인 준비 완료’를 확인하면 일정과 변경 사항을 이 기기에서 사용할 수 있어요.</p><p>변경 사항은 이 기기에 자동 저장됩니다. JSON은 기기 변경·데이터 삭제에 대비한 백업용이에요. 준비물 체크도 함께 보관돼요. 다른 기기와 자동 동기화되지 않으며, iOS가 저장 공간을 정리하면 캐시·변경 사항이 사라질 수 있습니다.</p>
        <div className="backup-actions"><button className="primary" onClick={() => downloadJson(state, 'qingdao-trip-backup.json')}><ArrowDownToLine size={18} />JSON 백업 내려받기</button><button className="secondary" onClick={() => fileInput.current?.click()}><ArrowUpFromLine size={18} />JSON 백업 복원</button><input ref={fileInput} className="sr-only" tabIndex={-1} type="file" accept="application/json,.json" aria-label="복원할 백업 파일" onChange={restore} /><button className="secondary" onClick={() => window.print()}><Printer size={18} />4일 일정 인쇄 / PDF</button><button className="danger-button" onClick={() => { if (confirm('모든 대안 선택·메모·완료 표시·준비물 체크를 원본으로 되돌릴까요? 먼저 백업을 권장합니다.')) { commit(emptyState(), true); setImportMessage(''); } }}><RotateCcw size={17} />원본으로 되돌리기</button></div>
        {boot.raw && locked && <button className="secondary" onClick={() => { const url = URL.createObjectURL(new Blob([boot.raw!], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = 'qingdao-unreadable-state.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>읽지 못한 기존 저장 데이터 보관</button>}
        <p role="status">{importMessage}</p>
        <div className="notice warning"><strong>지도는 별도 인터넷이 필요해요.</strong><p>비행기 모드에서는 여행 일정만 확인하세요. 지도 경로 시험은 eSIM/Wi-Fi를 켜고 여행 서버만 차단해 진행합니다. 현재 모든 장소는 미검증이므로 검색·지점 확인이 필요합니다.</p></div>
      </> : <>
        {panel === 'airport' && <div className="flight-info"><p><strong>{seed.trip.outboundFlight.number} · 가는 편</strong><br />{seed.trip.outboundFlight.depart}<br />→ {seed.trip.outboundFlight.arrive}</p><p><strong>{seed.trip.returnFlight.number} · 오는 편</strong><br />{seed.trip.returnFlight.depart}<br />→ {seed.trip.returnFlight.arrive}</p><p className="muted">각 지역 시간 기준 · 실제 운항은 항공사에서 확인</p></div>}
        <h3>{seed.places[panel].ko}</h3><p lang="zh-CN">{seed.places[panel].zh}</p><p lang="zh-CN">{seed.places[panel].addressZh}</p>{panel === 'hotel' && <p>숙소 정보 화면 예시입니다. 실제 숙소명·주소·예약 정보는 포함하지 않았습니다.</p>}<PlaceActions place={seed.places[panel]} event={{ type: 'travel', navigationEligible: true }} />
      </>}
    </Modal>}
    {saveError && <button className="save-error-float" onClick={() => setPanel('backup')}><X size={16} />저장 문제 · 백업 열기</button>}
  </>;
}
