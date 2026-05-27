import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';

export function DrawingCanvas({ isDrawer, strokes }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState({ color: '#111827', size: 5 });
  const drawing = useRef(false);
  const last = useRef(null);

  const drawPoint = (ctx, from, to, color, size) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes?.forEach((stroke) => {
      for (let i = 1; i < stroke.length; i += 1) {
        drawPoint(ctx, stroke[i - 1], stroke[i], stroke[0].color, stroke[0].size);
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      redraw();
    };

    resize();
    window.addEventListener('resize', resize);
    socket.on('draw_data', (data) => {
      if (data.event === 'draw_start') last.current = data;
      if (data.event === 'draw_move' || data.event === 'draw_end') {
        drawPoint(canvas.getContext('2d'), last.current || data, data, data.color || last.current?.color || '#111827', data.size || last.current?.size || 5);
        last.current = data;
      }
    });
    socket.on('canvas_clear', () => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height));
    socket.on('draw_undo', redraw);

    return () => {
      window.removeEventListener('resize', resize);
      socket.off('draw_data');
      socket.off('canvas_clear');
      socket.off('draw_undo');
    };
  }, [strokes]);

  useEffect(redraw, [strokes]);

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      color: tool.color,
      size: tool.size
    };
  };

  const start = (event) => {
    if (!isDrawer) return;
    drawing.current = true;
    const p = point(event);
    last.current = p;
    socket.emit('draw_start', p);
  };

  const move = (event) => {
    if (!drawing.current || !isDrawer) return;
    const p = point(event);
    drawPoint(canvasRef.current.getContext('2d'), last.current, p, tool.color, tool.size);
    last.current = p;
    socket.emit('draw_move', p);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    socket.emit('draw_end', last.current);
  };

  return (
    <div className="canvas-wrap">
      <div className="tools">
        {['#111827', '#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#ffffff'].map((color) => (
          <button
            key={color}
            className="swatch"
            style={{ background: color }}
            aria-label={color === '#ffffff' ? 'Eraser' : color}
            onClick={() => setTool((current) => ({ ...current, color, size: color === '#ffffff' ? 18 : current.size }))}
          />
        ))}
        <input type="range" min="2" max="24" value={tool.size} onChange={(event) => setTool((current) => ({ ...current, size: Number(event.target.value) }))} />
        <button disabled={!isDrawer} onClick={() => socket.emit('draw_undo')}>Undo</button>
        <button disabled={!isDrawer} onClick={() => socket.emit('canvas_clear')}>Clear</button>
      </div>
      <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
    </div>
  );
}
