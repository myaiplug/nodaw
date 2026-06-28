import { useEffect, useRef } from 'react';

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
  style?: React.CSSProperties;
}

// Google AdSense publisher ID
export const AD_CLIENT = 'ca-pub-9580768376514550';

// Ad slot IDs — replace these with actual slot IDs from your AdSense account
export const AD_SLOTS = {
  BANNER_TOP: 'xxxxxxxxxx1',
  BANNER_MID: 'xxxxxxxxxx2',
  BANNER_BOTTOM: 'xxxxxxxxxx3',
  RECTANGLE: 'xxxxxxxxxx4',
  IN_FEED: 'xxxxxxxxxx5',
};

const AdUnit: React.FC<AdUnitProps> = ({ slot, format = 'auto', className = '', style }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Avoid double-push in StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Push the ad — timeout ensures the DOM is ready
    const timer = setTimeout(() => {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.warn('AdSense push failed:', e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      initializedRef.current = false;
    };
  }, [slot]);

  return (
    <div ref={adRef} className={`ad-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdUnit;
