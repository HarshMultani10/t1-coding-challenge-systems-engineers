"use client";

import { useStream } from "@/hooks/useStream";

const TestComponent = () => {
  console.log('TestComponent is rendering');
  
  const { data, loading, error, isConnected } = useStream<string[]>("/api/pnl", 5000);
  
  console.log('TestComponent useStream result:', { data, loading, error, isConnected });

  return (
    <div className="p-4">
      <h1>Test Component</h1>
      <p>Loading: {loading ? 'true' : 'false'}</p>
      <p>Connected: {isConnected ? 'true' : 'false'}</p>
      <p>Error: {error || 'none'}</p>
      <p>Data length: {data ? data.length : 'null'}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default TestComponent; 