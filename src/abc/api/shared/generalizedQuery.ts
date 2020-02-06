import {
  AbcRequestCommand,
  AbcMutation,
  IQueryLocalResults,
  IQueryServerResults,
  IAbcQueryDefinition,
  IAbcOptions
} from "../../../types";
import { AbcApi } from "../AbcApi";
import { getStore, AbcResult } from "../../..";
import get from "lodash.get";
import { Record } from "firemodel";
import { deepEqual } from "fast-equals";
import { findPk } from "../shared/findPk";

export interface IGeneralizedQuery<T> {
  (): Promise<T[]>;
}

/**
 * A generalized flow for queries; specific query helpers
 * should use this flow to standarize their approach.
 */
export async function generalizedQuery<T>(
  queryDefn: IAbcQueryDefinition<T>,
  command: AbcRequestCommand,
  dexieQuery: IGeneralizedQuery<T>,
  firemodelQuery: IGeneralizedQuery<T>,
  ctx: AbcApi<T>,
  options: IAbcOptions<T>
) {
  const store = getStore();
  const vuexRecords = get<T[]>(
    store.state,
    ctx.vuex.fullPath.replace(/\//g, "."),
    []
  );
  const vuexPks = vuexRecords.map(v =>
    Record.compositeKeyRef(ctx.model.constructor, v)
  );

  let idxRecords: T[] = [];
  let local: IQueryLocalResults<T, any>;

  if (command === "get" && ctx.config.useIndexedDb) {
    // Populate Vuex with what IndexedDB knows
    idxRecords = await dexieQuery().catch(e => {
      throw e;
    });

    const indexedDbPks = idxRecords.map(i =>
      Record.compositeKeyRef(ctx.model.constructor, i)
    );
    local = {
      records: idxRecords,
      vuexPks,
      indexedDbPks,
      localPks: Array.from(new Set(vuexPks.concat(...indexedDbPks)))
    };
    const localResults = new AbcResult(ctx, {
      type: "query",
      queryDefn,
      local,
      options
    });

    if (idxRecords.length > 0) {
      store.commit(
        `${ctx.vuex.moduleName}/${AbcMutation.ABC_LOCAL_QUERY_TO_VUEX}`,
        localResults
      );
    } else {
      store.commit(
        `${ctx.vuex.moduleName}/${AbcMutation.ABC_LOCAL_QUERY_EMPTY}`,
        localResults
      );
    }
  } else {
    local = {
      records: vuexRecords,
      vuexPks,
      indexedDbPks: [],
      localPks: vuexPks
    } as IQueryLocalResults<T>;
  }

  const serverRecords = await firemodelQuery();
  const serverPks = serverRecords.map(i =>
    Record.compositeKeyRef(ctx.model.constructor, i)
  );
  const newPks = serverPks.filter(i => !local.localPks.includes(i));
  const cacheHits: string[] = [];
  const stalePks: string[] = [];
  serverRecords.forEach(rec => {
    const pk = Record.compositeKeyRef(ctx.model.constructor, rec);
    if (!newPks.includes(pk)) {
      const localRec = findPk(pk, local.records);
      if (deepEqual(rec, localRec)) {
        cacheHits.push(pk);
      } else {
        stalePks.push(pk);
      }
    }
  });

  ctx.cachePerformance.hits = ctx.cachePerformance.hits + cacheHits.length;
  ctx.cachePerformance.misses =
    ctx.cachePerformance.misses + stalePks.length + newPks.length;

  // PRUNE
  const removeFromIdx = local.indexedDbPks.filter(i => !serverPks.includes(i));
  // Vuex at this point will have both it's old state and whatever IndexedDB
  // contributed
  const removeFromVuex = local.localPks.filter(i => !serverPks.includes(i));
  console.log({ removeFromIdx, removeFromVuex });

  if (removeFromVuex.length > 0) {
    store.commit(
      `${ctx.vuex.moduleName}/${AbcMutation.ABC_PRUNE_STALE_VUEX_RECORDS}`,
      { pks: removeFromVuex, vuex: ctx.vuex }
    );
  }
  if (removeFromIdx.length > 0) {
    await ctx.dexieTable.bulkDelete(removeFromIdx);
    store.commit(
      `${ctx.vuex.moduleName}/${AbcMutation.ABC_PRUNE_STALE_IDX_RECORDS}`,
      { pks: removeFromIdx, vuex: ctx.vuex }
    );
  }

  const server: IQueryServerResults<T> = {
    records: serverRecords,
    serverPks,
    newPks,
    cacheHits,
    stalePks,
    removeFromIdx,
    removeFromVuex,
    overallCachePerformance: ctx.cachePerformance
  };

  const response = new AbcResult(ctx, {
    type: "query",
    queryDefn,
    local,
    server,
    options
  });

  store.commit(
    `${ctx.vuex.moduleName}/${AbcMutation.ABC_FIREBASE_TO_VUEX_UPDATE}`,
    response
  );

  return response;
}