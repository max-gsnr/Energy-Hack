'use client';

export default function Home() {
  // Dynamic import to keep SSR out of the way for GSAP
  const Dashboard = require('@/components/Dashboard').default;
  return <Dashboard />;
}
