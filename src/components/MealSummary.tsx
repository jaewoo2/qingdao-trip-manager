import { restaurantProfile } from '../data/restaurants';
import { restaurantIllustrations } from '../data/restaurantIllustrations';

export function MealSummary({ placeId }: { placeId: string }) {
  const profile = restaurantProfile(placeId);
  const image = restaurantIllustrations[placeId] ?? (placeId === 'naxienian' ? restaurantIllustrations.muye : undefined);
  if (!profile && !image) return null;
  return <section className="meal-summary" aria-label="식당 주메뉴">
    {image && <figure><img src={image.src} alt={`${profile?.name ?? '꼬치류'} 음식 참고 AI 일러스트`} width={96} height={96} loading="lazy" decoding="async" /><figcaption>AI 음식 일러스트</figcaption></figure>}
    <div><span>주메뉴</span><p>{profile?.menuSummary ?? '꼬치류. 현재 메뉴와 재료는 현장에서 확인해주세요.'}</p>{profile?.serviceNotice && <small className="meal-service-note">{profile.serviceNotice}</small>}</div>
  </section>;
}
