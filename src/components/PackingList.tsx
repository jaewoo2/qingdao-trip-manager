import { useState } from 'react';
import { CheckCheck, ChevronDown, CloudSun, ExternalLink, Luggage, Shirt } from 'lucide-react';
import { packingGroups, packingItemIds } from '../data/packing';
import { togglePacking, type UserState } from '../lib/state';

export function PackingList({ state, commit, locked }: { state: UserState; commit: (next: UserState) => void; locked: boolean }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const count = state.packingCheckedIds.length;
  return <main className="page-width collection-page" id="packing">
    <header className="collection-heading"><p className="section-eyebrow"><Luggage size={16} /> BEFORE WE GO</p><h1>가볍게 챙기고,<br /><span>편하게 떠나요.</span></h1><p>내 준비물은 내 기기에. 모두 챙긴 분류는 자동으로 접혀요.</p></header>
    <section className="weather-guide panel" aria-labelledby="weather-heading"><p className="section-eyebrow"><CloudSun size={16} /> 계절에 맞게 준비하기</p><h2 id="weather-heading">여행 전, 기온과 바람을 확인하세요</h2><p>옷차림과 준비물은 여행하는 계절과 개인 필요에 맞춰 조절하세요. 이 예시 앱은 실시간 날씨를 제공하지 않습니다.</p><div className="weather-outfits"><div><Shirt size={20} /><strong>기온 확인</strong><span>낮과 밤의 기온 차이에 맞게 겹쳐 입을 옷</span></div><div><Shirt size={20} /><strong>바닷바람 대비</strong><span>바람을 막는 겉옷과 필요한 보온 용품</span></div><div><Shirt size={20} /><strong>편한 이동</strong><span>걷기 편한 신발과 작은 우산</span></div></div><div className="weather-links"><a href="https://www.timeanddate.com/weather/china/qingdao/ext" target="_blank" rel="noopener noreferrer">방문 전 최신 예보 확인 <ExternalLink size={13} /></a></div></section>
    <section className="packing-progress" aria-label="준비물 진행 상황"><div><strong>{count}<span> / {packingItemIds.length}</span></strong><p>준비 완료</p></div><progress aria-label="준비 완료" max={packingItemIds.length} value={count} /><span>{Math.round(count / packingItemIds.length * 100)}%</span></section>
    <p className="collection-note">추천 체크리스트예요. 필요한 항목을 챙겼거나 해당하지 않는 항목을 확인했다면 체크하세요. 체크는 자동 저장되며, 보관함의 JSON 백업에도 포함됩니다.</p>
    <div className="packing-grid">{packingGroups.map(group => {
      const completed = group.items.filter(item => state.packingCheckedIds.includes(item.id)).length;
      const allDone = completed === group.items.length;
      const expanded = opened[group.id] ?? !allDone;
      return <section className={`packing-group panel ${allDone ? 'all-done' : ''}`} key={group.id} data-testid={`packing-${group.id}`}>
        <h2><button className="packing-group-toggle" aria-expanded={expanded} aria-controls={`packing-body-${group.id}`} onClick={() => setOpened({ ...opened, [group.id]: !expanded })}><span><strong>{group.title}</strong><small>{allDone ? '준비 완료' : group.subtitle}</small></span><span className="packing-group-count">{completed}/{group.items.length} {allDone && <CheckCheck size={16} />}<ChevronDown size={18} className={expanded ? 'rotated' : ''} /></span></button></h2>
        <div className="packing-body" id={`packing-body-${group.id}`} hidden={!expanded}>{group.items.map(item => {
          const checked = state.packingCheckedIds.includes(item.id);
          return <label className={`packing-item ${checked ? 'checked' : ''}`} key={item.id}><input type="checkbox" checked={checked} disabled={locked} onChange={() => { setOpened(current => { const next = { ...current }; delete next[group.id]; return next; }); commit(togglePacking(state, item.id)); }} /><span><strong>{item.title}</strong>{!checked && <small>{item.note}</small>}</span></label>;
        })}</div>
      </section>;
    })}</div>
    <p className="collection-note">완료한 분류도 제목을 누르면 다시 열어 체크를 해제할 수 있어요. 동행자와 자동 동기화되지 않습니다.</p>
  </main>;
}
