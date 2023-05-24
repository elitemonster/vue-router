import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import { join } from 'pathe'
import Inspect from 'vite-plugin-inspect'
import Markdown from 'vite-plugin-vue-markdown'
// @ts-ignore: the plugin should not be checked in the playground
import VueRouter from '../src/vite'
import {
  getFileBasedRouteName,
  getPascalCaseRouteName,
  VueRouterAutoImports,
} from '../src'
import Vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  clearScreen: false,
  build: {
    sourcemap: true,
  },
  // optimizeDeps: {
  //   exclude: ['ufo', 'mlly', 'magic-string', 'fsevents'],
  // },

  plugins: [
    VueRouter({
      dataFetching: true,
      extensions: ['.page.vue', '.vue', '.md'],
      extendRoute(route) {
        // console.log('extending route', route.meta)

        // example of deleting routes
        // if (route.name.startsWith('/users')) {
        //   route.delete()
        // }

        if (route.name === '/[name]') {
          route.addAlias('/hello-vite-:name')
        }

        // if (route.name === '/deep/nesting') {
        //   const children = [...route]
        //   children.forEach((child) => {
        //     // TODO: remove one node while copying the children to its parent
        //   })
        // }

        // example moving a route (without its children to the root)
        if (route.fullPath.startsWith('/deep/nesting/works/too')) {
          route.parent!.insert(
            '/at-root-but-from-nested',
            route.components.get('default')!
          )
          // TODO: make it easier to access the root
          let root = route
          while (root.parent) {
            root = root.parent
          }
          route.delete()
          const newRoute = root.insert(
            '/custom/page',
            route.components.get('default')!
          )
          // newRoute.components.set('default', route.components.get('default')!)
          newRoute.meta = {
            'custom-meta': 'works',
          }
        }
      },
      beforeWriteFiles(root) {
        root.insert('/from-root', join(__dirname, './src/pages/index.vue'))
      },
      routesFolder: [
        // can add multiple routes folders
        {
          src: 'src/pages',
          // can even add params
          // path: ':lang/',
        },
        {
          src: 'src/docs',
          path: 'docs/:lang/',
          // doesn't take into account files directly at src/docs, only subfolders
          filePatterns: ['*/**/*'],
          // ignores .vue files
          extensions: ['.md'],
        },
        // {
        //   src: 'src/features/',
        //   path: 'features-prefix/',
        // },
      ],
      logs: true,
      // getRouteName: getPascalCaseRouteName,
      exclude: [
        '**/ignored/**',
        // '**/ignored/**/*',
        '**/__*',
        '**/__**/*',
        '**/*.component.vue',
        // resolve(__dirname, './src/pages/ignored'),
        //
        // './src/pages/**/*.spec.ts',
      ],
    }),
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    Markdown(),
    AutoImport({
      imports: [VueRouterAutoImports],
    }),
    Inspect(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
