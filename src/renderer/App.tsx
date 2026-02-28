import React, { useEffect, useState } from 'react';

function App() {
  const [pong, setPong] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 验证 Electron IPC 通信
  useEffect(() => {
    const testIPC = async () => {
      try {
        const result = await window.electronAPI.ping();
        setPong(result);
        setError('');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('IPC test failed:', err);
        setError(`IPC 通信失败: ${errorMessage}`);
      }
    };

    testIPC();
  }, []);

  return (
    <div style={{
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#1a1a1a',
      color: '#e0e0e0',
      minHeight: '100vh',
    }}>
      <h1>ausome-terminal</h1>
      <p>React + TypeScript + Vite 集成成功!</p>
      {pong && <p style={{ color: '#4ade80' }}>IPC 通信测试: {pong}</p>}
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
    </div>
  );
}

export default App;
