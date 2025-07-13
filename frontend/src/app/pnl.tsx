"use client";

import { useStream } from "@/hooks/useStream";
import { useState } from "react";

interface PnL {
  startTime: string;
  endTime: string;
  pnl: number;
}

// Utility function to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Utility function to format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Utility function to get PnL color class
const getPnLColorClass = (pnl: number): string => {
  if (pnl > 0) return 'text-green-500';
  if (pnl < 0) return 'text-red-500';
  return 'text-gray-500';
};

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-gray-600">Loading PnL data...</span>
  </div>
);

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <div className="text-red-600 mb-4">
      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-red-800 mb-2">Connection Error</h3>
    <p className="text-red-700 mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
    >
      Retry Connection
    </button>
  </div>
);

// Connection status indicator
const ConnectionStatus = ({ isConnected }: { isConnected: boolean }) => (
  <div className="flex items-center mb-4">
    <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
    <span className={`text-sm ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  </div>
);

// Summary stats component
const SummaryStats = ({ pnls }: { pnls: PnL[] }) => {
  if (!pnls || pnls.length === 0) return null;

  const totalPnL = pnls.reduce((sum, pnl) => sum + pnl.pnl, 0);
  const positiveCount = pnls.filter(pnl => pnl.pnl > 0).length;
  const negativeCount = pnls.filter(pnl => pnl.pnl < 0).length;
  const avgPnL = totalPnL / pnls.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm font-medium text-gray-500">Total PnL</div>
        <div className={`text-2xl font-bold ${getPnLColorClass(totalPnL)}`}>
          {formatCurrency(totalPnL)}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm font-medium text-gray-500">Average PnL</div>
        <div className={`text-2xl font-bold ${getPnLColorClass(avgPnL)}`}>
          {formatCurrency(avgPnL)}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm font-medium text-gray-500">Profitable Periods</div>
        <div className="text-2xl font-bold text-green-600">
          {positiveCount} / {pnls.length}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm font-medium text-gray-500">Loss Periods</div>
        <div className="text-2xl font-bold text-red-600">
          {negativeCount} / {pnls.length}
        </div>
      </div>
    </div>
  );
};

// Enhanced table component
const PnLTable = ({ pnls }: { pnls: PnL[] }) => {
  const [sortField, setSortField] = useState<'startTime' | 'pnl'>('startTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedPnls = [...pnls].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field: 'startTime' | 'pnl') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('startTime')}
              >
                <div className="flex items-center">
                  Period Start
                  {sortField === 'startTime' && (
                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period End
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('pnl')}
              >
                <div className="flex items-center">
                  Profit/Loss
                  {sortField === 'pnl' && (
                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPnls.map((pnl, index) => (
              <tr key={`${pnl.startTime}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(pnl.startTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(pnl.endTime)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getPnLColorClass(pnl.pnl)}`}>
                  {formatCurrency(pnl.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main PnL component
const PnLs = () => {
  const { data: pnls, loading, error, isConnected, reconnect } = useStream<PnL[]>("/api/pnl", 5000);

  // Debug logging
  console.log('PnL Component Render:', {
    loading,
    error,
    isConnected,
    dataLength: pnls?.length || 0,
    hasData: !!pnls,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    console.log('Showing loading spinner');
    return <LoadingSpinner />;
  }

  if (error) {
    console.log('Showing error display:', error);
    return <ErrorDisplay error={error} onRetry={reconnect} />;
  }

  if (!pnls || pnls.length === 0) {
    console.log('No PnL data available');
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No PnL data available</div>
      </div>
    );
  }

  console.log('Rendering PnL dashboard with', pnls.length, 'records');
  console.log('Latest PnL record:', pnls[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Profit & Loss Dashboard</h2>
        <ConnectionStatus isConnected={isConnected} />
      </div>
      
      <SummaryStats pnls={pnls} />
      <PnLTable pnls={pnls} />
    </div>
  );
};

export default PnLs;
