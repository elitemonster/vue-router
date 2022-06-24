import chokidar from 'chokidar'
import { resolve } from 'path'
import { Options } from '../options'
import { createPrefixTree } from './tree'
import { promises as fs } from 'fs'
import { logTree, throttle } from './utils'
import { generateRouteNamedMap } from '../codegen/generateRouteMap'
import { MODULE_ROUTES_PATH, MODULE_VUE_ROUTER } from './moduleConstants'
import { generateRouteRecord } from '../codegen/generateRouteRecords'

export function createRoutesContext(options: Required<Options>) {
  const { dts: preferDTS, root } = options
  const dts =
    preferDTS === false
      ? false
      : preferDTS === true
      ? resolve(root, 'typed-router.d.ts')
      : resolve(root, preferDTS)

  const routeTree = createPrefixTree()

  const resolvedRoutesFolder = resolve(root, options.routesFolder)
  const serverWatcher = chokidar.watch(resolvedRoutesFolder, {
    // TODO: create a scanRouteFolders() function that also works for build
    // ignoreInitial: true,
    disableGlobbing: true,
    ignorePermissionErrors: true,
    // useFsEvents: true,
    // TODO: allow user options
  })

  function stripRouteFolder(path: string) {
    return path.slice(resolvedRoutesFolder.length + 1)
  }

  function setupWatcher() {
    serverWatcher
      .on('change', (path) => {
        // TODO: parse defineRoute macro?
        console.log('change', path)
        writeConfigFiles()
      })
      .on('add', (path) => {
        console.log('added', path)
        routeTree.insert(
          stripRouteFolder(path),
          // './' + path
          resolve(root, path)
        )
        writeConfigFiles()
      })
      .on('unlink', (path) => {
        console.log('remove', path)
        routeTree.remove(stripRouteFolder(path))
        writeConfigFiles()
      })
  }

  function stop() {
    serverWatcher.close()
  }

  function generateRoutes() {
    return `export const routes = ${generateRouteRecord(routeTree)}`
  }

  function generateDTS(): string {
    return `
// Generated by unplugin-vue-router. ‼️ DO NOT MODIFY THIS FILE ‼️
// It's recommended to commit this file.
// Make sure to add this file to your tsconfig.json file as an "includes" or "files" entry.

/// <reference types="unplugin-vue-router/client" />

import type {
  _RouterTyped,
  RouteRecordInfo,
  RouterLinkTyped,
  RouteLocationNormalizedLoadedTypedList,
  RouteLocationAsString,
  NavigationGuard,
  _ParamValue,
  _ParamValueOneOrMore,
  _ParamValueZeroOrMore,
  _ParamValueZeroOrOne,
} from 'unplugin-vue-router'

declare module '${MODULE_ROUTES_PATH}' {
${generateRouteNamedMap(routeTree)
  .split('\n')
  .filter((line) => line)
  .map((line) => '  ' + line) // not the same as padStart(2)
  .join('\n')}
}

declare module '${MODULE_VUE_ROUTER}' {
  import type { RouteNamedMap } from '${MODULE_ROUTES_PATH}'

  export function useRoute<Name extends keyof RouteNamedMap = keyof RouteNamedMap>(name?: Name): RouteLocationNormalizedLoadedTypedList<RouteNamedMap>[Name]

  export type RouterTyped = _RouterTyped<RouteNamedMap>
  /**
   * Generate a type safe route location. Requires the name of the route to be passed as a generic.
   */
  export type Route<Name extends keyof RouteNamedMap> = RouteLocationNormalizedLoadedTypedList<RouteNamedMap>[Name]
  /**
   * Generate a type safe params for a route location. Requires the name of the route to be passed as a generic.
   */
  export type RouteParams<Name extends keyof RouteNamedMap> = RouteNamedMap[Name]['params']
  /**
   * Generate a type safe raw params for a route location. Requires the name of the route to be passed as a generic.
   */
  export type RouteParamsRaw<Name extends keyof RouteNamedMap> = RouteNamedMap[Name]['paramsRaw']

  export function useRouter(): RouterTyped

  export function onBeforeRouteLeave(guard: NavigationGuard<RouteMap>): void
  export function onBeforeRouteUpdate(guard: NavigationGuard<RouteMap>): void
}

declare module 'vue' {
  import type { RouteNamedMap } from '${MODULE_ROUTES_PATH}'

  export interface GlobalComponents {
    RouterLink: RouterLinkTyped<RouteNamedMap>
  }
}
`
  }

  let lastDTS: string | undefined
  async function _writeConfigFiles() {
    console.log('writing')
    logTree(routeTree)
    if (dts) {
      const content = generateDTS()
      if (lastDTS !== content) {
        await fs.writeFile(dts, content, 'utf-8')
        lastDTS = content
      }
    }
  }
  const writeConfigFiles = throttle(_writeConfigFiles, 500)

  setupWatcher()

  return {
    stop,
    writeConfigFiles,

    generateRoutes,
  }
}
