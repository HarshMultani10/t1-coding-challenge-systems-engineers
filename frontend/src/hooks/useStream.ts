import { useEffect, useState, useRef } from "react";

interface StreamState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    isConnected: boolean;
    lastUpdate: string | null;
    updateCount: number;
}

export function useStream<T>(endpoint: string, pollInterval: number = 10000) {
    const [state, setState] = useState<StreamState<T>>({
        data: null,
        loading: true,
        error: null,
        isConnected: false,
        lastUpdate: null,
        updateCount: 0
    });
    
    const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = async () => {
        try {
            console.log(`Fetching data from: ${endpoint}`);
            
            const response = await fetch(endpoint);
            
            console.log(`Response status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Received data:`, data);
            console.log(`Data type:`, typeof data);
            console.log(`Data length:`, Array.isArray(data) ? data.length : 'not an array');
            
            // Create a new array reference to ensure React detects the change
            const newData = Array.isArray(data) ? [...data] : data;
            const timestamp = new Date().toISOString();
            
            setState(prev => {
                const newState = { 
                    data: newData,
                    loading: false,
                    isConnected: true,
                    error: null,
                    lastUpdate: timestamp,
                    updateCount: prev.updateCount + 1
                };
                
                console.log(`Previous state:`, prev);
                console.log(`New state will be:`, newState);
                return newState;
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error(`Fetch error:`, errorMessage);
            setState(prev => ({ 
                ...prev, 
                loading: false, 
                error: errorMessage,
                isConnected: false 
            }));
        }
    };

    const startPolling = () => {
        console.log(`Starting polling for endpoint: ${endpoint}`);
        
        // Clear any existing timeout
        if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
        }

        // Fetch data immediately
        fetchData();

        // Set up polling
        const poll = () => {
            console.log(`Polling for endpoint: ${endpoint}`);
            fetchData();
            pollTimeoutRef.current = setTimeout(poll, pollInterval);
        };

        // Start polling after the initial fetch
        pollTimeoutRef.current = setTimeout(poll, pollInterval);
    };

    useEffect(() => {
        console.log(`useStream hook initialized for endpoint: ${endpoint} with ${pollInterval}ms polling`);
        console.log('useEffect is running, calling startPolling...');
        startPolling();

        // Cleanup function
        return () => {
            console.log(`Cleaning up useStream hook for endpoint: ${endpoint}`);
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
            }
        };
    }, [endpoint, pollInterval]);

    const reconnect = () => {
        console.log(`Manual reconnect requested for endpoint: ${endpoint}`);
        if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
        }
        startPolling();
    };

    console.log(`useStream hook returning state:`, state);

    return {
        ...state,
        reconnect
    };
};