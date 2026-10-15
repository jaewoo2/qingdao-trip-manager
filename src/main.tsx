import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="page-width"><h1>여행 노트를 열지 못했어요.</h1><p>저장 데이터를 삭제하지 말고 다시 실행해주세요. 문제가 계속되면 내려받은 JSON·인쇄 백업을 사용하세요.</p><button onClick={() => location.reload()}>다시 열기</button></main>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
