"use client";

import { useStream } from "@/hooks/useStream";

const OpenPosition = () => {
  const { data: position, loading, error } = useStream<string>("/open-position");

  if (loading) {
    return <p>Loading position data...</p>;
  }

  if (error) {
    return <p>Error loading position data</p>;
  }

  return position ? <p>{position} MW</p> : <p>Waiting for position data...</p>;
};

export default OpenPosition;
