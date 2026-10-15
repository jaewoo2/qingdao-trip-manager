import { places } from '../lib/tripPlan';
import type { Place } from '../lib/data';

export type RestaurantCategory = '중식·해산물' | '훠궈' | '카오위';
export type RestaurantCandidate = {
  id: string; name: string; place: Place; category: RestaurantCategory; cuisine: string;
  description: string; locationNote: string; menuSummary: string; serviceNotice: string | null;
  publishedHours: string; sources: string[]; status: 'active' | 'held';
};
const entry = (id: string, name: string, category: RestaurantCategory, cuisine: string, menuSummary: string,
  description: string, locationNote: string, publishedHours: string, sources: string[], serviceNotice: string | null = null,
  status: 'active' | 'held' = 'active'): RestaurantCandidate => ({ id, name, place: places[id], category, cuisine, menuSummary, description, locationNote, publishedHours, sources, serviceNotice, status });

// User-supplied research dated 2026-10-15. These references are not iPhone route verification.
export const restaurantCandidates: RestaurantCandidate[] = [
  entry('luyu', '루위', '카오위', '카오위 · 생선구이 전골', '생선구이 전골. 마늘맛·장향맛 등은 당일 메뉴를 확인해요.', '예시 일정의 기본 식당. 명가딤섬으로 교체해볼 수 있어요.', '완샹청 5층 L511', '10:30–14:30 / 16:30–21:00 게시', ['https://gs.ctrip.com/html5/you/foods/fooddetail/2737/12771393.html']),
  entry('pingjie', '핑지에훠궈', '훠궈', '충칭식 훠궈', '매운 충칭식 훠궈. 비매운 국물 제공 여부는 확인이 필요해요.', '훠궈 후보 예시. 영업 여부를 확인한 뒤 방문해요.', '완샹청 B1층 B123', '현재 영업시간 미확인', ['https://qd.city8.com/cater/8c88ja7e1kkvb95b94'], '현재 영업 확인 필요'),
  entry('forest', '삼림해선대배당', '중식·해산물', '해산물·가정식', '해산물 요리. 꽃게 도삭면·게살덮밥은 당일 메뉴를 확인해요.', '해산물 식사 후보 예시. 여러 요리를 나눠 먹는 한 끼예요.', '단양로점 · 단양로 68호', '09:00–익일 00:30 게시 · 다른 자료와 마감시간 상충', ['https://ditu.amap.com/place/B0FFMEXCLC'], '메뉴·마감시간 재확인'),
  entry('muye', '무예슬거', '중식·해산물', '양꼬치·해산물구이', '숯불 양꼬치와 해산물구이. 원하는 메뉴·주문량은 현장에서 확인해요.', '양꼬치 식사 후보 예시. 당일 메뉴와 영업시간을 확인해요.', '연길로점 표기 · 사평로 39호갑', '11:30–24:00 / 16:30 시작 자료가 상충', ['https://hk.trip.com/restaurant/china/qingdao/detail/restaurant-36962458/'], '영업 시작시간 재확인'),
  entry('chunhelou', '춘화루', '중식·해산물', '산둥 전통 중식', '바삭한 닭요리·새우와 배추요리 등 산둥식 중식.', '구도심 식사 후보 예시. 여러 산둥 요리를 나눠 먹어요.', '중산로 본점 · 중산로 146호', '10:00–22:00 게시', ['https://www.amap.com/place/B0LGV4SLXX']),
  entry('chuange', '촨거위수이자오', '중식·해산물', '생선 만두·칭다오 요리', '생선·해산물 모둠만두와 바지락볶음 등 칭다오 요리.', '만두 식사 후보 예시. 연결된 끼니를 선택할 수 있어요.', '완샹청 B1층 B127', '11:00–21:00 게시', ['https://gs.ctrip.com/html5/you/foods/fooddetail/120119/11952343.html']),
  entry('mingjia', '명가딤섬', '중식·해산물', '광둥식 딤섬', '홍미창펀·커스터드번 등 딤섬류. 당일 판매 메뉴를 확인해요.', '완샹청에서 식사 종류를 바꾸고 싶을 때. 이미 먹은 끼니와 중복도 확인해요.', '완샹청 1기 5층 L502', '10:30–21:00 게시', ['https://triple.guide/restaurants/d46cede3-6ffb-4b09-a7e4-683bd5b37968']),
  entry('wanhechun', '완허춘', '중식·해산물', '갈비 뚝배기·밥', '갈비·등뼈 뚝배기와 밥으로 간단히 먹는 한 끼.', '예시 일정의 점심·저녁 대안. 다른 끼니와 중복되는지 살펴봐요.', '타이동팔로점 · 타이동팔로 66호', '10:30–21:00 게시', ['https://tw.trip.com/restaurant/china/qingdao/detail/restaurant-11695822/']),
  entry('jiulong', '구룡식당', '중식·해산물', '산둥·현지 중식', '오징어튀김·돼지고기와 꼴뚜기볶음 등 현지 중식.', '예시 일정의 구도심 점심 식당이에요.', '대고로 노점 · 대고로 6호', '11:00–14:00 / 16:30–20:30 게시', ['https://ditu.amap.com/place/B0FFFY629P']),
  entry('haidilao', '하이디라오', '훠궈', '훠궈', '여러 국물과 재료를 선택하는 훠궈. 지점의 현재 메뉴는 확인이 필요해요.', '훠궈 대안 예시. 완샹청 밖이라 별도 이동을 고려해요.', '인쭤광장점 · 인쭤센터 6층', '09:00 또는 10:00–익일 07:00 자료가 상충', ['https://www.amap.com/place/B0FFHWI5KF'], '완샹청 밖 · 이동·영업시간 확인'),
];
export const heldRestaurants: RestaurantCandidate[] = [entry('meidaer', '메이다얼', '중식·해산물', '바비큐·가지튀김', '가지튀김 등 메뉴 참고. 재영업 확인 전 방문을 보류해요.', '제공된 조사에서 잠정 휴업 표시가 있어 현재 선택 목록에서는 제외했어요.', '중산로점 · 중산로 125호', '잠정 휴업 표시 · 재개 시점 미확인', ['https://gs.ctrip.com/html5/you/foods/Qingdao5/66464.html'], '잠정 휴업 자료 · 재영업 확인 필요', 'held')];
export const allRestaurantProfiles = [...restaurantCandidates, ...heldRestaurants];
export function restaurantProfile(id: string | null) { return allRestaurantProfiles.find(item => item.id === id); }
export const archivedRestaurantIds = ['kaihai', 'qianhaiyan', 'coucou'];
