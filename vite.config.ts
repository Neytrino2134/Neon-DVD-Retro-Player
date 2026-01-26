
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    server: {
      host: true, 
      open: false, 
    },
    define: {
      // This is critical for the Google GenAI SDK to work if it relies on process.env
      // or if we use process.env.API_KEY in our code.
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY)
      }
    }
  }
})
