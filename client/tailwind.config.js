/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#4ade80',
                    DEFAULT: '#16a34a', // Green 600
                    dark: '#15803d',
                },
                secondary: {
                    light: '#60a5fa',
                    DEFAULT: '#2563eb', // Blue 600
                    dark: '#1d4ed8',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
