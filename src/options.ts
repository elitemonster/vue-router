import { isPackageExists } from 'local-pkg'
import { getFileBasedRouteName, isArray } from './core/utils'
import type { TreeNode } from './core/tree'
import { resolve } from 'pathe'

export interface RoutesFolderOption {
  src: string
  path?: string
}

export type _RoutesFolder = string | RoutesFolderOption
export type RoutesFolder = _RoutesFolder[] | _RoutesFolder

export interface ResolvedOptions {
  /**
   * Extensions of files to be considered as pages. Defaults to `['.vue']`. Cannot be empty.
   */
  extensions: string[]

  /**
   * Folder containing the components that should be used for routes. Can also be an array if you want to add multiple
   * folders, or an object if you want to define a route prefix. Supports glob patterns but must be a folder, use
   * `extensions` and `exclude` to filter files.
   *
   * @default "src/pages"
   */
  routesFolder: RoutesFolderOption[]

  /**
   * Method to generate the name of a route.
   */
  getRouteName: (node: TreeNode) => string

  /**
   * Enables EXPERIMENTAL data fetching. See https://github.com/posva/unplugin-vue-router/tree/main/src/data-fetching
   */
  dataFetching: boolean

  /**
   * Defines how page components should be imported. Defaults to dynamic imports to enable lazy loading of pages.
   */
  importMode: _OptionsImportMode

  /**
   * Array of file globs to ignore. Defaults to `[]`.
   */
  exclude: string[]

  /**
   * Root of the project. All paths are resolved relatively to this one. Defaults to `process.cwd()`.
   */
  root: string

  /**
   * Language for `<route>` blocks in SFC files. Defaults to `'json5'`.
   */
  routeBlockLang: string

  /**
   * Should generate d.ts files. Defaults to `true` if `typescript` is installed.
   */
  dts: boolean | string

  /**
   * Allows inspection by vite-plugin-inspect by not adding the leading `\0` to the id of virtual modules.
   * @internal
   */
  _inspect: boolean

  /**
   * Activates debug logs.
   */
  logs: boolean
}

/**
 * @internal
 */
export type _OptionsImportMode =
  | 'sync'
  | 'async'
  | ((filepath: string) => 'sync' | 'async')

export interface Options
  extends Partial<Omit<ResolvedOptions, 'routesFolder'>> {
  routesFolder?: RoutesFolder
}

export const DEFAULT_OPTIONS: Required<Options> = {
  extensions: ['.vue'],
  exclude: [],
  routesFolder: 'src/pages',
  routeBlockLang: 'json5',
  getRouteName: getFileBasedRouteName,
  dataFetching: false,
  importMode: 'async',
  root: process.cwd(),
  dts: isPackageExists('typescript'),
  logs: false,
  _inspect: false,
}

export interface ServerContext {
  invalidate: (module: string) => void
  reload: () => void
}

function normalizeRoutesFolderOption(
  routesFolder: RoutesFolder
): RoutesFolderOption[] {
  return (isArray(routesFolder) ? routesFolder : [routesFolder]).map(
    (routeOption) =>
      typeof routeOption === 'string' ? { src: routeOption } : routeOption
  )
}

/**
 * Normalize user options with defaults and resolved paths.
 *
 * @param options - user provided options
 * @returns normalized options
 */
export function resolveOptions(options: Options): ResolvedOptions {
  const root = options.root || DEFAULT_OPTIONS.root

  // normalize the paths with the root
  const routesFolder = normalizeRoutesFolderOption(
    options.routesFolder || DEFAULT_OPTIONS.routesFolder
  ).map((routeOption) => ({
    ...routeOption,
    src: resolve(root, routeOption.src),
  }))

  return {
    ...DEFAULT_OPTIONS,
    ...options,
    routesFolder,
  }
}
