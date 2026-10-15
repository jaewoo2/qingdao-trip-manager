import { useEffect, useRef, useState } from 'react';

type OfflineStatus = 'checking' | 'ready' | 'unavailable' | 'development';
export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>(import.meta.env.DEV ? 'development' : 'checking');
  const [message, setMessage] = useState('처음에는 인터넷에 연결해 필수 파일을 저장해주세요.');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const updating = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV) { setMessage('서비스 워커는 프로덕션 빌드에서만 사용합니다.'); return; }
    if (!('serviceWorker' in navigator) || !isSecureContext) { setStatus('unavailable'); setMessage('HTTPS와 서비스 워커 지원이 필요합니다. 일정은 열려 있어도 캐시 준비는 확인되지 않았습니다.'); return; }
    let alive = true;
    const channels = new Set<MessageChannel>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function check() {
      if (!alive) return;
      const controller = navigator.serviceWorker.controller;
      if (!controller) { setStatus('checking'); return; }
      const channel = new MessageChannel(); channels.add(channel);
      const timer = setTimeout(() => {
        channel.port1.close(); channels.delete(channel); timers.delete(timer);
        if (alive) { setStatus('unavailable'); setMessage('캐시 점검 응답을 받지 못했습니다. 인터넷에서 다시 실행해주세요.'); }
      }, 8000); timers.add(timer);
      channel.port1.onmessage = event => {
        clearTimeout(timer); timers.delete(timer); channel.port1.close(); channels.delete(channel);
        if (!alive) return;
        const ready = event.data?.ready === true;
        setStatus(ready ? 'ready' : 'unavailable');
        setMessage(ready ? '필수 자산 캐시를 확인했습니다.' : '필수 캐시가 누락되었거나 현재 버전과 다릅니다. 인터넷에서 앱을 다시 준비해주세요.');
      };
      const script = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
      controller.postMessage({ type: 'CHECK_OFFLINE', entry: script ? new URL(script.src).pathname : null }, [channel.port2]);
    }
    const onController = () => { if (updating.current) location.reload(); else check(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    document.addEventListener('visibilitychange', onVisibility);
    const startupTimer = setTimeout(() => {
      if (alive && !navigator.serviceWorker.controller) { setStatus('unavailable'); setMessage('아직 서비스 워커가 이 화면을 제어하지 않습니다. 인터넷에서 다시 열어주세요.'); }
    }, 15000); timers.add(startupTimer);
    navigator.serviceWorker.register('/sw.js').then(reg => {
      registration.current = reg;
      if (alive) setUpdateAvailable(Boolean(reg.waiting));
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => { if (alive && worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateAvailable(true); });
      });
      return navigator.serviceWorker.ready;
    }).then(check).catch(() => { if (alive) { setStatus('unavailable'); setMessage('캐시 설치에 실패했습니다. 인터넷 연결·기기 저장 공간을 확인해주세요.'); } });
    return () => {
      alive = false; for (const timer of timers) clearTimeout(timer); for (const channel of channels) channel.port1.close();
      navigator.serviceWorker.removeEventListener('controllerchange', onController); document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return { status, message, updateAvailable, update: () => {
    if (registration.current?.waiting) { updating.current = true; registration.current.waiting.postMessage({ type: 'SKIP_WAITING' }); }
  } };
}
