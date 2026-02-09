'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { ThemeProvider } from './context/ThemeContext'

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                {children}
            </ThemeProvider>
        </SessionProvider>
    )
}
