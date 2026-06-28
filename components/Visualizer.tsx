
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  analyser?: AnalyserNode;
  height?: number;
  width?: number;
}

export const PeakMeter: React.FC<VisualizerProps & { vertical?: boolean }> = ({ isPlaying, analyser, height = 40, width = 160, vertical = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);
    
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.max(0, (dataArray[i] || 0) * 0.95 + (Math.random() * 2 - 1));
        }
      }

      const barCount = 30;
      const spacing = 1.5;
      
      if (vertical) {
        const barHeight = (h - (barCount - 1) * spacing) / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = analyser ? dataArray[Math.floor(i * dataArray.length / barCount)] / 255 : 0.02 + Math.random() * 0.05;
          const barWidth = val * w;
          const gradient = ctx.createLinearGradient(0, 0, w, 0);
          gradient.addColorStop(0, '#06B6D4');
          gradient.addColorStop(1, '#A855F7');
          
          ctx.fillStyle = val > 0.05 ? gradient : '#F1F5F9';
          ctx.beginPath();
          ctx.roundRect(0, h - (i * (barHeight + spacing)) - barHeight, barWidth, barHeight, 0.5);
          ctx.fill();
        }
      } else {
        const barWidth = (w - (barCount - 1) * spacing) / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = analyser && isPlaying ? dataArray[Math.floor(i * dataArray.length / barCount)] / 255 : 0.05;
          const currentBarHeight = val * h;
          const gradient = ctx.createLinearGradient(0, h, 0, 0);
          gradient.addColorStop(0, '#06B6D4');
          gradient.addColorStop(1, '#A855F7');
          
          ctx.fillStyle = val > 0.1 ? gradient : '#F1F5F9';
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + spacing), h - currentBarHeight, barWidth, currentBarHeight, 0.5);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying, vertical]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="rounded-sm"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};

export const SpectralAnalyzer: React.FC<VisualizerProps> = ({ isPlaying, analyser, height = 60, width = 300 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser?.frequencyBinCount || 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255.0;
        const y = h - (v * h);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(w, h);
      ctx.stroke();

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.01)');
      ctx.fillStyle = gradient;
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="rounded-lg bg-slate-50/50"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
