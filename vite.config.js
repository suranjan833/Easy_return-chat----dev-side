import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  base:'./',
  plugins: [react()],
  // server: {
  //   proxy: {
  //     '/messaging': {
  //       target: 'https://chatsupport.fskindia.com',
  //       changeOrigin: true, // Sets Host header to target URL
  //       secure: false, // Allow self-signed certificates (for local dev)
  //       logLevel: 'debug', // Detailed proxy logs
  //       // Handle preflight OPTIONS requests
  //       configure: (proxy, _options) => {
  //         proxy.on('proxyReq', (proxyReq, req, _res) => {
  //           console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.getHeader('host')}${proxyReq.path}`);
  //         });
  //         proxy.on('proxyRes', (proxyRes, req, _res) => {
  //           console.log(`Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  //           // Attempt to add CORS headers (note: may not always work due to browser restrictions)
  //           proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173';
  //           proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
  //           proxyRes.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept';
  //         });
  //         proxy.on('error', (err, req, _res) => {
  //           console.error(`Proxy error for ${req.method} ${req.url}:`, err);
  //         });
  //       },
  //       // Bypass for OPTIONS to return 200 locally
  //       bypass: (req, res, proxyOptions) => {
  //         if (req.method === 'OPTIONS') {
  //           console.log(`Handling OPTIONS ${req.url} locally`);
  //           res.writeHead(200);
  //           res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  //           res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  //           res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  //           res.end();
  //           return true; // Bypass proxy for OPTIONS
  //         }
  //       },
  //     },
  //     '/users': {
  //       target: 'https://chatsupport.fskindia.com',
  //       changeOrigin: true,
  //       secure: false,
  //       logLevel: 'debug',
  //       configure: (proxy) => {
  //         proxy.on('proxyReq', (proxyReq, req) => {
  //           console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.getHeader('host')}${proxyReq.path}`);
  //         });
  //         proxy.on('proxyRes', (proxyRes, req) => {
  //           console.log(`Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  //         });
  //         proxy.on('error', (err, req) => {
  //           console.error(`Proxy error for ${req.method} ${req.url}:`, err);
  //         });
  //       },
  //       bypass: (req, res) => {
  //         if (req.method === 'OPTIONS') {
  //           console.log(`Handling OPTIONS ${req.url} locally`);
  //           res.writeHead(200);
  //           res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  //           res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  //           res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  //           res.end();
  //           return true;
  //         }
  //       },
  //     },
  //   },
  // },

  css: {
    devSourcemap: true
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
})
