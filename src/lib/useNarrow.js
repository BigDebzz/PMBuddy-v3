import { useEffect, useState } from 'react';

// True on a phone-sized screen. Used to show less at once on small screens.
export function useNarrow(max = 640) {
  const query = `(max-width: ${max}px)`;
  const read = () => { try { return window.matchMedia(query).matches; } catch (e) { return false; } };
  const [narrow, setNarrow] = useState(read);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(query); } catch (e) { return undefined; }
    const on = () => setNarrow(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else if (mq.removeListener) mq.removeListener(on); };
  }, [query]);
  return narrow;
}
