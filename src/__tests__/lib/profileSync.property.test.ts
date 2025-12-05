/**
 * Property-Based Tests for Profile Sync
 * 
 * These tests verify the correctness properties for approval profile synchronization
 * between server and mobile devices.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Feature: mobile-access-control, Property 6: Profile sync version comparison**
 * **Validates: Requirements 4.2, 4.3**
 * 
 * *For any* server profile version greater than local version, sync SHALL update
 * the local profile.
 */
describe('Property 6: Profile sync version comparison', () => {
  // Arbitrary for generating profile data
  const profileArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    version: fc.integer({ min: 1, max: 1000 }),
  });

  // Arbitrary for generating a map of local profile versions
  const localVersionsArbitrary = fc.array(
    fc.record({
      id: fc.uuid(),
      version: fc.integer({ min: 1, max: 1000 }),
    }),
    { minLength: 0, maxLength: 10 }
  ).map((profiles) => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      map[p.id] = p.version;
    });
    return map;
  });

  /**
   * Helper function that simulates the sync logic:
   * Returns profiles that should be synced (server version > local version)
   */
  function getProfilesToSync(
    serverProfiles: Array<{ id: string; name: string; version: number }>,
    localVersions: Record<string, number>
  ): Array<{ id: string; name: string; version: number }> {
    return serverProfiles.filter((serverProfile) => {
      const localVersion = localVersions[serverProfile.id];
      
      // If profile doesn't exist locally, sync it
      if (localVersion === undefined) {
        return true;
      }
      
      // If server version is greater than local version, sync it
      return serverProfile.version > localVersion;
    });
  }

  it('syncs profiles when server version > local version', () => {
    fc.assert(
      fc.property(
        fc.array(profileArbitrary, { minLength: 1, maxLength: 10 }),
        localVersionsArbitrary,
        (serverProfiles, localVersions) => {
          const profilesToSync = getProfilesToSync(serverProfiles, localVersions);
          
          // Verify that all profiles to sync meet the sync criteria
          profilesToSync.forEach((profile) => {
            const localVersion = localVersions[profile.id];
            
            if (localVersion === undefined) {
              // New profile - verify it exists in server profiles
              expect(serverProfiles.some((p) => p.id === profile.id)).toBe(true);
            } else {
              // Existing profile - server version should be greater than local
              expect(profile.version).toBeGreaterThan(localVersion);
            }
          });
          
          // Verify all server profiles that should sync are included
          serverProfiles.forEach((serverProfile) => {
            const localVersion = localVersions[serverProfile.id];
            const shouldSync = localVersion === undefined || serverProfile.version > localVersion;
            const isInSyncList = profilesToSync.some((p) => p.id === serverProfile.id);
            
            expect(isInSyncList).toBe(shouldSync);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('correctly determines sync decision for all profiles based on version comparison', () => {
    fc.assert(
      fc.property(
        fc.array(profileArbitrary, { minLength: 1, maxLength: 10 }),
        localVersionsArbitrary,
        (serverProfiles, localVersions) => {
          const profilesToSync = getProfilesToSync(serverProfiles, localVersions);
          const syncedIds = new Set(profilesToSync.map((p) => p.id));
          
          // Verify each server profile's sync decision
          serverProfiles.forEach((serverProfile) => {
            const localVersion = localVersions[serverProfile.id];
            const isSynced = syncedIds.has(serverProfile.id);
            
            if (localVersion === undefined) {
              // New profile - should be synced
              expect(isSynced).toBe(true);
            } else if (serverProfile.version > localVersion) {
              // Server version is newer - should be synced
              expect(isSynced).toBe(true);
            } else {
              // Server version <= local version - should NOT be synced
              expect(isSynced).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('syncs all profiles when local versions are empty', () => {
    fc.assert(
      fc.property(
        fc.array(profileArbitrary, { minLength: 1, maxLength: 10 }),
        (serverProfiles) => {
          const localVersions: Record<string, number> = {};
          const profilesToSync = getProfilesToSync(serverProfiles, localVersions);
          
          // All server profiles should be synced when no local versions exist
          expect(profilesToSync.length).toBe(serverProfiles.length);
          
          // Verify all server profiles are in the sync list
          serverProfiles.forEach((serverProfile) => {
            expect(profilesToSync.some((p) => p.id === serverProfile.id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('syncs no profiles when all local versions are up-to-date or newer', () => {
    fc.assert(
      fc.property(
        fc.array(profileArbitrary, { minLength: 1, maxLength: 10 }).chain((serverProfiles) =>
          fc.record({
            serverProfiles: fc.constant(serverProfiles),
            offsets: fc.array(fc.integer({ min: 0, max: 10 }), {
              minLength: serverProfiles.length,
              maxLength: serverProfiles.length,
            }),
          })
        ),
        ({ serverProfiles, offsets }) => {
          // Create local versions that are all >= server versions
          const localVersions: Record<string, number> = {};
          serverProfiles.forEach((profile, index) => {
            // Set local version to be equal or greater than server version
            localVersions[profile.id] = profile.version + offsets[index];
          });
          
          const profilesToSync = getProfilesToSync(serverProfiles, localVersions);
          
          // No profiles should be synced
          expect(profilesToSync.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('correctly handles mixed scenarios (some need sync, some do not)', () => {
    fc.assert(
      fc.property(
        fc.array(profileArbitrary, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 10 }), // Random offset for version comparison
        (serverProfiles, versionOffset) => {
          // Create a mixed scenario:
          // - Some profiles have local version < server version (need sync)
          // - Some profiles have local version >= server version (no sync)
          // - Some profiles don't exist locally (need sync)
          const localVersions: Record<string, number> = {};
          
          serverProfiles.forEach((profile, index) => {
            if (index % 3 === 0) {
              // Profile doesn't exist locally - should sync
              // Don't add to localVersions
            } else if (index % 3 === 1) {
              // Local version is older - should sync
              // Ensure local version is always strictly less than server version
              localVersions[profile.id] = Math.max(0, profile.version - versionOffset - 1);
            } else {
              // Local version is up-to-date or newer - should NOT sync
              localVersions[profile.id] = profile.version + versionOffset;
            }
          });
          
          const profilesToSync = getProfilesToSync(serverProfiles, localVersions);
          
          // Verify each profile's sync decision is correct
          serverProfiles.forEach((serverProfile) => {
            const localVersion = localVersions[serverProfile.id];
            const shouldSync = profilesToSync.some((p) => p.id === serverProfile.id);
            
            if (localVersion === undefined) {
              // Profile doesn't exist locally - should sync
              expect(shouldSync).toBe(true);
            } else if (serverProfile.version > localVersion) {
              // Server version is newer - should sync
              expect(shouldSync).toBe(true);
            } else {
              // Local version is up-to-date or newer - should NOT sync
              expect(shouldSync).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('version comparison is strictly greater than (not greater than or equal)', () => {
    fc.assert(
      fc.property(
        profileArbitrary,
        (profile) => {
          // Local version equals server version
          const localVersions = { [profile.id]: profile.version };
          const profilesToSync = getProfilesToSync([profile], localVersions);
          
          // Should NOT sync when versions are equal
          expect(profilesToSync.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

