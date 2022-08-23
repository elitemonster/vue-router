import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from '../options'
import { createPrefixTree } from './tree'
import { TreeNodeType } from './treeNodeValue'

describe('Tree', () => {
  it('creates an empty tree', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    expect(tree.children.size).toBe(0)
  })

  it('creates a tree with a single static path', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('foo.vue')
    expect(tree.children.size).toBe(1)
    const child = tree.children.get('foo')!
    expect(child).toBeDefined()
    expect(child.value).toMatchObject({
      rawSegment: 'foo',
      path: '/foo',
      _type: TreeNodeType.static,
    })
    expect(child.children.size).toBe(0)
  })

  it('creates a tree with a single param', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('[id].vue')
    expect(tree.children.size).toBe(1)
    const child = tree.children.get('[id]')!
    expect(child).toBeDefined()
    expect(child.value).toMatchObject({
      rawSegment: '[id]',
      params: [{ paramName: 'id' }],
      path: '/:id',
      _type: TreeNodeType.param,
    })
    expect(child.children.size).toBe(0)
  })

  it('creates params in nested files', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    const nestedId = tree.insert('nested/[id].vue')

    expect(nestedId.value.isParam()).toBe(true)
    expect(nestedId.params).toEqual([
      expect.objectContaining({
        isSplat: false,
        modifier: '',
        optional: false,
        paramName: 'id',
        repeatable: false,
      }),
    ])

    const nestedAId = tree.insert('nested/a/[id].vue')
    expect(nestedAId.value.isParam()).toBe(true)
    expect(nestedAId.params).toEqual([
      expect.objectContaining({
        isSplat: false,
        modifier: '',
        optional: false,
        paramName: 'id',
        repeatable: false,
      }),
    ])
  })

  it('creates params in nested folders', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)

    let node = tree.insert('nested/[id]/index.vue')
    const id = tree.children.get('nested')!.children.get('[id]')!
    expect(id.value.isParam()).toBe(true)
    expect(id.params).toEqual([
      expect.objectContaining({
        isSplat: false,
        modifier: '',
        optional: false,
        paramName: 'id',
        repeatable: false,
      }),
    ])

    expect(node.value.isParam()).toBe(false)
    expect(node.params).toEqual([
      expect.objectContaining({
        isSplat: false,
        modifier: '',
        optional: false,
        paramName: 'id',
        repeatable: false,
      }),
    ])

    node = tree.insert('nested/[a]/other.vue')
    expect(node.value.isParam()).toBe(false)
    expect(node.params).toEqual([
      expect.objectContaining({
        isSplat: false,
        modifier: '',
        optional: false,
        paramName: 'a',
        repeatable: false,
      }),
    ])

    node = tree.insert('nested/a/[id]/index.vue')
    expect(node.value.isParam()).toBe(false)
    expect(node.params).toEqual([
      expect.objectContaining({
        isSplat: false,
        modifier: '',
        optional: false,
        paramName: 'id',
        repeatable: false,
      }),
    ])
  })

  it('handles named views', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('index.vue')
    tree.insert('index@a.vue')
    tree.insert('index@b.vue')
    tree.insert('nested/foo@a.vue')
    tree.insert('nested/foo@b.vue')
    tree.insert('nested/[id]@a.vue')
    tree.insert('nested/[id]@b.vue')
    tree.insert('not.nested.path@a.vue')
    tree.insert('not.nested.path@b.vue')
    tree.insert('deep/not.nested.path@a.vue')
    tree.insert('deep/not.nested.path@b.vue')
    expect([...tree.children.get('index')!.value.filePaths.keys()]).toEqual([
      'default',
      'a',
      'b',
    ])
    expect([
      ...tree.children
        .get('nested')!
        .children.get('foo')!
        .value.filePaths.keys(),
    ]).toEqual(['a', 'b'])
    expect([
      ...tree.children
        .get('nested')!
        .children.get('[id]')!
        .value.filePaths.keys(),
    ]).toEqual(['a', 'b'])
    expect([
      ...tree.children.get('not.nested.path')!.value.filePaths.keys(),
    ]).toEqual(['a', 'b'])
    expect([
      ...tree.children
        .get('deep')!
        .children.get('not.nested.path')!
        .value.filePaths.keys(),
    ]).toEqual(['a', 'b'])
  })

  it('handles single named views that are not default', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('index@a.vue')
    expect([...tree.children.get('index')!.value.filePaths.keys()]).toEqual([
      'a',
    ])
  })

  it('removes the node after all named views', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('index.vue')
    tree.insert('index@a.vue')
    expect(tree.children.get('index')).toBeDefined()
    tree.remove('index@a.vue')
    expect(tree.children.get('index')).toBeDefined()
    tree.remove('index.vue')
    expect(tree.children.get('index')).toBeUndefined()
  })

  it('handles multiple params', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('[a]-[b].vue')
    tree.insert('o[a]-[b]c.vue')
    tree.insert('o[a][b]c.vue')
    tree.insert('nested/o[a][b]c.vue')
    expect(tree.children.size).toBe(4)
    expect(tree.children.get('[a]-[b]')!.value).toMatchObject({
      pathSegment: ':a-:b',
    })
  })

  it('creates a tree of nested routes', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('index.vue')
    tree.insert('a/index.vue')
    tree.insert('a/b/index.vue')
    expect(Array.from(tree.children.keys())).toEqual(['index', 'a'])
    const index = tree.children.get('index')!
    expect(index.value).toMatchObject({
      rawSegment: '',
      path: '/',
    })
    expect(index).toBeDefined()
    const a = tree.children.get('a')!
    expect(a).toBeDefined()
    expect(a.value.filePaths.get('default')).toBeUndefined()
    expect(a.value).toMatchObject({
      rawSegment: 'a',
      path: '/a',
    })
    expect(Array.from(a.children.keys())).toEqual(['index', 'b'])
    const aIndex = a.children.get('index')!
    expect(aIndex).toBeDefined()
    expect(Array.from(aIndex.children.keys())).toEqual([])
    expect(aIndex.value).toMatchObject({
      rawSegment: '',
      path: '/a/',
    })

    tree.insert('a.vue')
    expect(a.value.filePaths.get('default')).toBe('a.vue')
    expect(a.value).toMatchObject({
      rawSegment: 'a',
      path: '/a',
    })
  })

  it('handles a modifier for single params', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('[id]+.vue')
    expect(tree.children.size).toBe(1)
    const child = tree.children.get('[id]+')!
    expect(child).toBeDefined()
    expect(child.value).toMatchObject({
      rawSegment: '[id]+',
      params: [{ paramName: 'id', modifier: '+' }],
      path: '/:id+',
      pathSegment: ':id+',
      _type: TreeNodeType.param,
    })
    expect(child.children.size).toBe(0)
  })

  it('removes nodes', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('foo.vue')
    tree.insert('[id].vue')
    tree.remove('foo.vue')
    expect(tree.children.size).toBe(1)
    const child = tree.children.get('[id]')!
    expect(child).toBeDefined()
    expect(child.value).toMatchObject({
      rawSegment: '[id]',
      params: [{ paramName: 'id' }],
      path: '/:id',
      pathSegment: ':id',
    })
    expect(child.children.size).toBe(0)
  })

  it('removes empty folders', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('a/b/c/d.vue')
    expect(tree.children.size).toBe(1)
    tree.remove('a/b/c/d.vue')
    expect(tree.children.size).toBe(0)
  })

  it('insert returns the node', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    const a = tree.insert('a.vue')
    expect(tree.children.get('a')).toBe(a)
    const bC = tree.insert('b/c.vue')
    expect(tree.children.get('b')!.children.get('c')).toBe(bC)
    const bCD = tree.insert('b/c/d.vue')
    expect(tree.children.get('b')!.children.get('c')!.children.get('d')).toBe(
      bCD
    )
  })

  it('keeps parent with file but no children', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    tree.insert('a/b/c/d.vue')
    tree.insert('a/b.vue')
    expect(tree.children.size).toBe(1)
    const child = tree.children.get('a')!.children.get('b')!
    expect(child).toBeDefined()
    expect(child.children.size).toBe(1)

    tree.remove('a/b/c/d.vue')
    expect(tree.children.size).toBe(1)
    expect(tree.children.get('a')!.children.size).toBe(1)
    expect(child.children.size).toBe(0)
  })

  it('allows a custom name', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    let node = tree.insert('[a]-[b].vue')
    node.value.setOverride('', {
      name: 'custom',
    })
    expect(node.name).toBe('custom')

    node = tree.insert('auth/login.vue')
    node.value.setOverride('', {
      name: 'custom-child',
    })
    expect(node.name).toBe('custom-child')
  })

  it('allows a custom path', () => {
    const tree = createPrefixTree(DEFAULT_OPTIONS)
    let node = tree.insert('[a]-[b].vue')
    node.value.setOverride('', {
      path: '/custom',
    })
    expect(node.path).toBe('/custom')
    expect(node.fullPath).toBe('/custom')

    node = tree.insert('auth/login.vue')
    node.value.setOverride('', {
      path: '/custom-child',
    })
    expect(node.path).toBe('/custom-child')
    expect(node.fullPath).toBe('/custom-child')
  })
})
