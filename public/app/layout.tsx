import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Competency360 | Staff Competency & Gap Analysis', description: 'Staff competency assessment and training gap analysis system.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
