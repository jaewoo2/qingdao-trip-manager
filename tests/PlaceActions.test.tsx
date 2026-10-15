// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlaceActions } from '../src/components/PlaceActions';
import { seed } from '../src/lib/data';

afterEach(cleanup);
const event = { type: 'meal', navigationEligible: true };
describe('map controls in the rendered UI', () => {
  it('updates the real search href when an alternative replaces a place', () => {
    const { rerender } = render(<PlaceActions event={event} place={seed.places.forest} />);
    expect(new URL(screen.getByRole('link').getAttribute('href')!).searchParams.get('keyword')).toBe(seed.places.forest.amapSearch);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    rerender(<PlaceActions event={event} place={seed.places.wanhechun} />);
    expect(new URL(screen.getByRole('link').getAttribute('href')!).searchParams.get('keyword')).toBe(seed.places.wanhechun.amapSearch);
    expect(screen.queryByText('길찾기', { exact: true })).not.toBeInTheDocument();
  });
  it('uses a direct route anchor for verified identity, with an explicit untested warning', () => {
    const fixture = { ...seed.places.hotel, zh: '测试地点', amapPoiId: 'TEST_ONLY', amapPoiIdStatus: 'verified' as const };
    render(<PlaceActions event={event} place={fixture} />);
    expect(screen.getByRole('link', { name: '길찾기' })).toHaveAttribute('href', expect.stringContaining('iosamap://path?'));
    expect(screen.getByText(/iPhone 경로 결과 미검증/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('이동수단'), { target: { value: 'drive' } });
    expect(new URL(screen.getByRole('link', { name: '길찾기' }).getAttribute('href')!).searchParams.get('t')).toBe('0');
  });
  it('offers selectable text with both Chinese name and address when clipboard access fails', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<PlaceActions event={event} place={seed.places.wanhechun} />);
    fireEvent.click(screen.getByRole('button', { name: '중국어 복사' }));
    expect(await screen.findByRole('textbox', { name: '직접 복사할 중국어' })).toHaveValue(`${seed.places.wanhechun.zh}\n${seed.places.wanhechun.addressZh}`);
  });
});
