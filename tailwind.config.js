/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
                jersey10: ["Jersey 10 Regular"],
                jersey25: ["Jersey 25 Regular"],
            },
        },
    },
    // plugins: [require("@tailwindcss/line-clamp")],
};
