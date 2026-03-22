import React, { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function NetworkGraph({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!data || !data.nodes || !data.links) return null;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {dimensions.width > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          nodeLabel="id"
          nodeColor={() => '#2563EB'}
          nodeRelSize={6}
          linkColor={() => '#CBD5E1'}
          linkWidth={link => Math.min(link.value / 2, 5)}
          backgroundColor="#F8FAFC"
          cooldownTicks={100}
        />
      )}
      <div className="absolute top-2 left-2 bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-500 border border-slate-200 shadow-sm pointer-events-none">
        Scroll to zoom, drag to pan
      </div>
    </div>
  );
}
