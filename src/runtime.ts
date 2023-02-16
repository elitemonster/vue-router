import type { RouteRecordRaw } from 'vue-router'

export { defineLoader as _defineLoader } from './data-fetching/defineLoader'
export type {
  DefineLoaderOptions,
  DataLoader,
} from './data-fetching/defineLoader'
export {
  setupDataFetchingGuard as _setupDataFetchingGuard,
  HasDataLoaderMeta as _HasDataLoaderMeta,
} from './data-fetching/dataFetchingGuard'
export { stopScope as _stopDataFetchingScope } from './data-fetching/dataCache'

/**
 * Defines properties of the route for the current page component.
 *
 * @param route - route information to be added to this page
 */
export const _definePage = (
  route: Partial<Omit<RouteRecordRaw, 'children' | 'components' | 'component'>>
) => route

/**
 * Merges route records.
 *
 * @internal
 *
 * @param main - main route record
 * @param routeRecords - route records to merge
 * @returns merged route record
 */
export function _mergeRouteRecord(
  main: RouteRecordRaw,
  ...routeRecords: Partial<RouteRecordRaw>[]
): RouteRecordRaw {
  // @ts-expect-error: complicated types
  return routeRecords.reduce((acc, routeRecord) => {
    const meta = Object.assign({}, acc.meta, routeRecord.meta)
    const alias: string[] = ([] as string[]).concat(
      acc.alias || [],
      routeRecord.alias || []
    )

    // TODO: other nested properties
    // const props = Object.assign({}, acc.props, routeRecord.props)

    Object.assign(acc, routeRecord)
    acc.meta = meta
    acc.alias = alias
    return acc
  }, main)
}
