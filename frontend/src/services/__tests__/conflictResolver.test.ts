/**
 * 冲突解决机制测试
 */

import { describe, it, expect } from 'vitest'
import {
    detectConflict,
    resolveConflictLocal,
    resolveConflictRemote,
    resolveConflictLastWrite,
    resolveConflictMerge,
    applyConflictResolution,
    generateVersion,
    compareVersions,
} from '@/services/conflictResolver'

describe('conflictResolver', () => {
    describe('detectConflict', () => {
        it('should detect conflict when versions differ', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            expect(detectConflict(local, remote, 100, 200)).toBe(true)
        })

        it('should not detect conflict when versions are same', () => {
            const local = { content: 'same' }
            const remote = { content: 'same' }
            expect(detectConflict(local, remote, 100, 200)).toBe(false)
        })
    })

    describe('resolveConflictLocal', () => {
        it('should return local version', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            expect(resolveConflictLocal(local, remote)).toEqual(local)
        })
    })

    describe('resolveConflictRemote', () => {
        it('should return remote version', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            expect(resolveConflictRemote(local, remote)).toEqual(remote)
        })
    })

    describe('resolveConflictLastWrite', () => {
        it('should return local version if local is newer', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            expect(resolveConflictLastWrite(local, remote, 200, 100)).toEqual(local)
        })

        it('should return remote version if remote is newer', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            expect(resolveConflictLastWrite(local, remote, 100, 200)).toEqual(remote)
        })
    })

    describe('resolveConflictMerge', () => {
        it('should merge tags from both versions', () => {
            const local = { tags: ['tag1', 'tag2'] }
            const remote = { tags: ['tag2', 'tag3'] }
            const merged = resolveConflictMerge(local, remote)
            expect(merged.tags).toContain('tag1')
            expect(merged.tags).toContain('tag2')
            expect(merged.tags).toContain('tag3')
        })

        it('should prefer longer content', () => {
            const local = { content: 'This is a longer content' }
            const remote = { content: 'Short' }
            const merged = resolveConflictMerge(local, remote)
            expect(merged.content).toBe(local.content)
        })
    })

    describe('applyConflictResolution', () => {
        it('should apply local strategy', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            const result = applyConflictResolution('local', local, remote, 100, 200)
            expect(result).toEqual(local)
        })

        it('should apply remote strategy', () => {
            const local = { content: 'local' }
            const remote = { content: 'remote' }
            const result = applyConflictResolution('remote', local, remote, 100, 200)
            expect(result).toEqual(remote)
        })

        it('should apply merge strategy', () => {
            const local = { tags: ['tag1'] }
            const remote = { tags: ['tag2'] }
            const result = applyConflictResolution('merge', local, remote, 100, 200)
            expect(result.tags).toContain('tag1')
            expect(result.tags).toContain('tag2')
        })
    })

    describe('generateVersion', () => {
        it('should generate unique versions', () => {
            const v1 = generateVersion()
            const v2 = generateVersion()
            expect(v1).not.toBe(v2)
        })

        it('should generate version in correct format', () => {
            const version = generateVersion()
            expect(version).toMatch(/^\d+-[a-z0-9]+$/)
        })
    })

    describe('compareVersions', () => {
        it('should return 1 if v1 is newer', () => {
            expect(compareVersions('200-abc', '100-def')).toBe(1)
        })

        it('should return -1 if v1 is older', () => {
            expect(compareVersions('100-abc', '200-def')).toBe(-1)
        })

        it('should return 0 if versions have same timestamp', () => {
            expect(compareVersions('100-abc', '100-def')).toBe(0)
        })
    })
})
