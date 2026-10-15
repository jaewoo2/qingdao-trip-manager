import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, MapPin, Utensils } from 'lucide-react';
import { restaurantCandidates, heldRestaurants, restaurantProfile, type RestaurantCandidate, type RestaurantCategory } from '../data/restaurants';
import { PlaceActions } from './PlaceActions';
import { Modal } from './Modal';
import { restaurantIllustrations } from '../data/restaurantIllustrations';
import { seed } from '../lib/data';
import { eventDayIndex, isDayComplete } from '../lib/tripProgress';
import { places } from '../lib/tripPlan';
import { selectedPlaceId, type UserState } from '../lib/state';
import { applyRestaurantToSlot, restaurantDayStatus, restaurantSlots } from '../lib/restaurantSlots';

export function RestaurantList({ state, commit, locked }: { state: UserState; commit: (next: UserState) => void; locked: boolean }) {
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRestaurant = detailId ? restaurantProfile(detailId) : null;
  const [category, setCategory] = useState<'전체' | RestaurantCategory>('전체');
  const [selection, setSelection] = useState<{ candidateId: string; eventId: string } | null>(null);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ id: string; index: number } | null>(null);
  const previewRestaurant = preview && restaurantProfile(preview.id);
  const previewSet = preview ? restaurantIllustrations[preview.id] : null;
  const previewImages = previewSet ? [previewSet, ...(previewSet.more ?? [])] : [];
  const previewImage = preview ? previewImages[preview.index] : null;
  const candidate = restaurantCandidates.find(item => item.id === selection?.candidateId);
  const options = candidate ? restaurantSlots(candidate).filter(slot => !slot.event.protected) : [];
  const selected = options.find(slot => slot.event.id === selection?.eventId);
  const currentId = selected ? selectedPlaceId(selected.event, state) : null;
  const currentPlace = currentId ? places[currentId] : null;
  const alreadySelected = Boolean(candidate && currentId === candidate.id);
  const meals = seed.days.flatMap(day => day.events.filter(event => event.type === 'meal'));
  const used = new Set(meals.filter(event => !isDayComplete(state, eventDayIndex(event.id)) && (dayFilter === null || eventDayIndex(event.id) === dayFilter)).map(event => selectedPlaceId(event, state)));
  const appliesToFilter = (item: RestaurantCandidate) => restaurantDayStatus(item, state).activeDays.some(index => dayFilter === null || index === dayFilter);
  const visible = restaurantCandidates.filter(item => category === '전체' || item.category === category);
  const groups = [
    { id: 'current', title: '현재 일정에 담긴 식당', description: '지금 선택한 식당을 한곳에서 확인해요.', items: visible.filter(item => appliesToFilter(item) && used.has(item.id)) },
    { id: 'alternatives', title: '바꿔 볼 대안 식당', description: '대기·메뉴·영업 상황에 맞춰 같은 끼니의 식당을 바꿔요.', items: visible.filter(item => appliesToFilter(item) && !used.has(item.id)) },
  ];
  function card(item: RestaurantCandidate, detailed = false, archiveDay?: number) {
    const slots = restaurantSlots(item);
    const editable = slots.filter(slot => !slot.event.protected);
    const illustration = restaurantIllustrations[item.id];
    const held = item.status === 'held';
    return <article className={`${held ? 'held-restaurant-card' : 'restaurant-card'} ${detailed ? 'restaurant-detail-card' : 'restaurant-summary-card'}`} key={item.id} data-testid={`${detailed ? 'restaurant-detail' : archiveDay !== undefined ? `restaurant-past-${archiveDay}` : 'restaurant'}-${item.id}`}>
      {!detailed && <button className="restaurant-tile" aria-label={`${item.name} 상세 보기`} onClick={() => setDetailId(item.id)}><img src={illustration.src} alt="" width={1254} height={1254} loading="lazy" /><strong>{item.name}</strong><span>{item.cuisine.split(' · ')[0]}</span>{!held && <small>{archiveDay !== undefined ? (slots.some(slot => eventDayIndex(slot.event.id) === archiveDay && selectedPlaceId(slot.event, state) === item.id) ? '선택 식당' : '당시 대안') : used.has(item.id) ? '✓ 일정' : '대안'}</small>}</button>}
      <figure className={`restaurant-illustration food-${item.category === '훠궈' ? 'hotpot' : item.category === '카오위' ? 'fish' : 'chinese'}`}><button className="illustration-button" aria-label={`${item.name} 음식 일러스트 크게 보기`} onClick={() => setPreview({ id: item.id, index: 0 })}><img src={illustration.src} alt={`${item.name} 카드용 ${illustration.dish} AI 일러스트`} width={1254} height={1254} loading="lazy" decoding="async" /><span className="illustration-zoom" aria-hidden="true">{illustration.more ? '이미지 2장 ↗' : '크게 보기 ↗'}</span></button><figcaption>AI 생성 음식 일러스트 · 실제 매장·메뉴 사진 아님</figcaption></figure>
      <div className="restaurant-card-body"><span className={`restaurant-origin ${used.has(item.id) && !held ? 'in-itinerary' : ''}`}>{held ? '영업 재확인 · 보류' : used.has(item.id) ? '현재 일정' : '대안 식당'}</span><h3>{item.name}</h3><p className="restaurant-zh" lang="zh-CN">{item.place.zh}</p><p className="restaurant-cuisine">{item.cuisine}</p><p className="restaurant-description">{item.description}</p><p className="restaurant-menu-summary">{item.menuSummary}</p>{item.serviceNotice && <p className="restaurant-service-note">{item.serviceNotice}</p>}<div className="restaurant-location"><MapPin size={16} /><div><p>{item.locationNote}</p>{item.place.addressZh && <p lang="zh-CN">{item.place.addressZh}</p>}</div></div>
        <details className="restaurant-source-details"><summary>영업 정보·출처</summary><p>{item.publishedHours}</p><p>제공된 조사 자료 기준 · 2026-10-15. 여행 당일 영업과 메뉴는 다시 확인해주세요.</p>{item.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">자료 출처 {index + 1} ↗</a>)}</details>
        <PlaceActions place={item.place} event={{ type: 'meal', navigationEligible: true }} />
        {!held && <section className="restaurant-slot-list" aria-label={`${item.name} 교체 가능한 일정`}><h4>어느 일정과 맞을까요?</h4>{slots.map(slot => {
          const inUse = selectedPlaceId(slot.event, state) === item.id;
          return <div className="restaurant-slot" key={slot.event.id}><strong>{inUse && <Check size={13} />}{slot.label}<small>{isDayComplete(state, eventDayIndex(slot.event.id)) ? '지난 일정 · 완료' : slot.event.protected ? '필수 일정 · 교체 불가' : inUse ? '현재 선택됨' : '교체 가능'}</small></strong><p>{slot.reason}</p></div>;
        })}<button className="secondary restaurant-apply-button" disabled={locked || !editable.length} onClick={() => { setMessage(''); setSelection({ candidateId: item.id, eventId: editable.find(slot => (dayFilter === null || eventDayIndex(slot.event.id) === dayFilter) && !isDayComplete(state, eventDayIndex(slot.event.id)) && selectedPlaceId(slot.event, state) !== item.id)?.event.id ?? editable[0].event.id }); }}><CalendarDays size={15} />일정에 넣기</button></section>}
        {held && <p className="restaurant-service-note">이전 예시 일정의 점심 후보였어요. 현재 예시 기본 식당은 구룡이며, 잠정 휴업 자료로 보류 중이에요. 재영업 확인 전에는 새 일정에 넣지 않아요.{used.has(item.id) && ' 이전에 저장한 선택·방문 기록은 일정에 그대로 남아 있습니다.'}</p>}
      </div>
    </article>;
  }
  return <main className="page-width collection-page" id="restaurants">
    <header className="collection-heading"><p className="section-eyebrow"><Utensils size={16} /> A TABLE IN QINGDAO</p><h1>다음 한 끼는,<br /><span>어디로 갈까요?</span></h1><p>일정에 담긴 식당과 바꿔 볼 대안을 나눠서 살펴봐요.</p></header>
    <p className="restaurant-usage"><CalendarDays size={16} /><span><strong>‘일정에 넣기’</strong>에서 날짜·끼니를 골라 교체할 수 있어요. 연결된 권역과 이동 조건은 각 식당에서 확인하세요.</span></p>
    <p className="restaurant-apply-message" role="status">{message}</p>
    <nav className="restaurant-day-filters" aria-label="식당 일정별 보기"><button aria-pressed={dayFilter === null} onClick={() => setDayFilter(null)}>전체 일정</button>{seed.days.map((day, index) => <button key={day.date} aria-pressed={dayFilter === index} onClick={() => setDayFilter(index)}>{index + 1}일차{isDayComplete(state, index) ? ' ✓' : ''}</button>)}</nav>
    <nav className="restaurant-filters" aria-label="식당 음식 종류">{(['전체', '중식·해산물', '훠궈', '카오위'] as const).map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{item === '전체' && <span>10</span>}</button>)}</nav>
    <p className="restaurant-count" role="status">{visible.filter(appliesToFilter).length}곳의 식당 · 완료한 날짜는 지난 일정에서 확인</p>
    {!groups.some(group => group.items.length) && <p className="restaurant-empty">진행 중인 일정에 연결된 식당이 없어요. 아래 지난 일정을 확인하거나 날짜·음식 종류를 바꿔보세요.</p>}
    {groups.filter(group => group.items.length > 0).map(group => <section className={`restaurant-group group-${group.id}`} key={group.id} aria-label={group.title} data-testid={`restaurant-group-${group.id}`}><header className="restaurant-group-heading"><div><h2>{group.title} <span>{group.items.length}</span></h2><p>{group.description}</p></div></header>{group.items.length ? <div className="restaurant-grid">{group.items.map(item => card(item))}</div> : <p className="restaurant-empty">이 음식 종류로 분류된 식당이 없어요.</p>}</section>)}
    {seed.days.map((day, index) => isDayComplete(state, index) && (dayFilter === null || dayFilter === index) && <details className="past-restaurants held-restaurants" key={day.date} data-testid={`past-day-${index}`}><summary>이미 지난 일정 · {index + 1}일차 <span>{day.label}</span></summary><p className="collection-note">이 날짜의 모든 일정이 완료됐어요. 다른 날에도 연결된 식당은 진행 중 목록에도 표시해요.</p><div className="restaurant-grid">{visible.filter(item => restaurantDayStatus(item, state).completedDays.includes(index)).map(item => card(item, false, index))}</div>{!visible.some(item => restaurantDayStatus(item, state).completedDays.includes(index)) && <p className="restaurant-empty">이 날짜·음식 종류에 연결된 후보 식당이 없어요.</p>}</details>)}
    <details className="held-restaurants"><summary>영업 재확인 필요 · 메이다얼</summary><div>{heldRestaurants.map(item => card(item))}</div></details>
    <p className="collection-note">음식 이미지는 사용자가 제공한 AI 일러스트예요. 음식 종류를 표현한 참고 그림으로 실제 매장·메뉴 사진이 아닙니다.</p>
    {detailRestaurant && !selection && <Modal title={`${detailRestaurant.name} 상세`} onClose={() => setDetailId(null)}>{card(detailRestaurant, true)}</Modal>}
    {previewRestaurant && previewImage && preview && <Modal title={`${previewRestaurant.name} 음식 일러스트`} onClose={() => setPreview(null)}><img className="illustration-preview" src={previewImage.src} alt={`${previewRestaurant.name} 카드용 ${previewImage.dish} AI 일러스트`} width={1254} height={1254} /><p className="illustration-preview-caption">{previewImage.dish}<br />AI 생성 음식 일러스트 · 실제 매장·메뉴 사진이 아닙니다.</p>{previewImages.length > 1 && <div className="illustration-gallery-controls"><button className="secondary" disabled={preview.index === 0} aria-label="이전 음식 이미지" onClick={() => setPreview({ ...preview, index: preview.index - 1 })}><ArrowLeft size={16} /></button><span>{preview.index + 1} / {previewImages.length}</span><button className="secondary" disabled={preview.index === previewImages.length - 1} aria-label="다음 음식 이미지" onClick={() => setPreview({ ...preview, index: preview.index + 1 })}><ArrowRight size={16} /></button></div>}</Modal>}
    {candidate && selection && <Modal title="이 식당을 일정에 넣기" onClose={() => setSelection(null)}>
      <p><strong>{candidate.name}</strong><br /><span lang="zh-CN">{candidate.place.zh}</span><br /><span lang="zh-CN">{candidate.place.addressZh}</span></p>
      <label className="restaurant-slot-select" htmlFor="restaurant-slot">교체할 날짜·끼니<select id="restaurant-slot" value={selection.eventId} onChange={e => setSelection({ ...selection, eventId: e.target.value })}>{options.map(slot => <option key={slot.event.id} value={slot.event.id}>{slot.label} · 현재 {places[selectedPlaceId(slot.event, state)!].ko}</option>)}</select></label>
      {selected && <><div className="restaurant-swap-preview"><div><small>현재 일정</small><strong>{currentPlace?.ko}</strong><span lang="zh-CN">{currentPlace?.addressZh}</span></div><ArrowRight size={20} /><div><small>교체 후</small><strong>{candidate.name}</strong><span lang="zh-CN">{candidate.place.addressZh}</span></div></div><p className="restaurant-swap-reason">{selected.reason}</p></>}
      <div className="notice"><strong>식당·중국어 주소·지도 목적지가 함께 바뀌어요.</strong><p>이 끼니의 메모는 유지하고 방문 완료 체크는 해제합니다. 다른 끼니는 그대로예요. 여행 일정의 대안 보기에서 기본 식당으로 되돌릴 수 있습니다.</p></div>
      {meals.some(event => event.id !== selection.eventId && selectedPlaceId(event, state) === candidate.id) && <p className="restaurant-swap-reason">다른 끼니에도 이 식당이 있어요. 중복해서 먹을지 확인해주세요.</p>}
      {candidate.id === 'luyu' && <p className="restaurant-swap-reason">월요일 저녁에 루위를 선택해도 토요일 점심은 자동 이동되지 않아요. 카오위 식사 여부는 별도로 체크해주세요.</p>}
      <div className="restaurant-swap-actions"><button className="secondary" onClick={() => setSelection(null)}>취소</button><button className="primary" disabled={locked || !selected || alreadySelected} onClick={() => { if (!selected) return; commit(applyRestaurantToSlot(state, candidate.id, selected.event.id)); setMessage(`${selected.label} 식당을 ${candidate.name}(으)로 변경했습니다. 지도 목적지도 함께 바뀌었어요.`); setSelection(null); setDetailId(null); }}>{alreadySelected ? '이미 선택된 식당' : '이 끼니 교체하기'}</button></div>
    </Modal>}
  </main>;
}
