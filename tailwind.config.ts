import type { Config } from "tailwindcss";

export default {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#03c95c',
                    dark: '#02b350',
                },
            },
            borderRadius: {
                DEFAULT: '12px',
            },
        },
    },
    plugins: [],
} satisfies Config;
