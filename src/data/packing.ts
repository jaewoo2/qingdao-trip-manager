export const packingGroups = [
  { id: 'documents', title: '여권·항공·숙소', subtitle: '출발 전에 한 번 더', items: [
    { id: 'passport', title: '여권', note: '유효기간과 입국 요건은 출발 전 공식 안내로 확인하세요.' },
    { id: 'flight', title: '항공편·탑승 정보 확인', note: '항공사 앱과 출발 공항·시간을 확인해두세요.' },
    { id: 'hotel', title: '숙소 중국어 이름·주소 저장', note: '앱의 숙소 정보와 별도로 스크린샷도 준비하면 편해요.' },
    { id: 'insurance', title: '여행자보험·긴급 연락처 확인', note: '가입한 경우 보장 내용과 연락 방법을 확인하세요.' },
  ] },
  { id: 'payment', title: '결제·통신·앱', subtitle: '현지에서 바로 사용할 수 있게', items: [
    { id: 'payment-app', title: '알리페이·위챗페이 사용 준비', note: '사용할 결제 수단의 등록·인증 상태를 확인하세요.' },
    { id: 'payment-backup', title: '예비 결제 수단', note: '필요한 현금과 카드 등 본인에게 맞는 예비 수단을 챙기세요.' },
    { id: 'connectivity', title: 'eSIM·로밍·유심 준비', note: '설치 방법·데이터 제공 범위·개통 시점을 확인하세요.' },
    { id: 'amap', title: '고덕지도 설치·위치 권한 확인', note: '중국어 장소 검색과 앱 전환을 미리 시험해두세요.' },
    { id: 'pwa', title: '칭다오 노트 홈 화면 설치·오프라인 시험', note: '오프라인 준비 완료 후 비행기 모드에서 두 번 재실행하세요.' },
    { id: 'backup', title: '필요한 메모·일정 백업', note: 'JSON은 선택 사항이에요. 변경 사항을 보관하거나 옮길 때 사용하세요.' },
  ] },
  { id: 'clothes', title: '의류·생활용품', subtitle: '여행 계절과 날씨를 확인', items: [
    { id: 'coat', title: '겉옷·바람막이', note: '긴팔·니트 위에 걸칠 바람을 막는 겉옷, 추위를 타면 경량 패딩·목도리를 준비하세요.' },
    { id: 'layers', title: '여벌 옷·속옷·양말', note: '3박 4일 일정과 개인 필요에 맞게 챙기세요.' },
    { id: 'shoes', title: '편한 신발', note: '오래 걸어도 편한 신발을 우선하세요.' },
    { id: 'toiletries', title: '세면도구·개인 위생용품', note: '평소 사용하는 용품을 필요한 만큼 준비하세요.' },
    { id: 'weather', title: '우산·날씨 확인', note: '실시간 기상 예보는 출발 직전에 다시 확인하세요.' },
  ] },
  { id: 'devices', title: '전자기기', subtitle: '충전과 기내 반입 확인', items: [
    { id: 'charger', title: '휴대폰 충전기·케이블', note: '동행자 기기별 충전 규격을 확인하세요.' },
    { id: 'powerbank', title: '보조배터리', note: '용량·표시·기내 반입 규정은 항공사 안내로 확인하세요.' },
    { id: 'adapter', title: '필요한 플러그·어댑터 확인', note: '기기 입력 전압과 숙소 콘센트 호환 여부를 확인하세요.' },
  ] },
  { id: 'health', title: '건강·상비약', subtitle: '평소 필요한 것 위주로', items: [
    { id: 'medicine', title: '개인 복용약·필요한 상비약', note: '복용법과 반입 가능 여부를 확인하고 원래 포장으로 준비하세요.' },
    { id: 'care', title: '밴드·마스크·개인 관리용품', note: '개인 상태와 필요에 맞게 준비하세요.' },
    { id: 'glasses', title: '안경·렌즈 등 개인 필수품', note: '사용하는 경우 여분과 관리용품도 챙기세요.' },
  ] },
] as const;
export const packingItemIds: readonly string[] = packingGroups.flatMap(group => group.items.map(item => item.id));
