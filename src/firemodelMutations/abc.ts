import { MutationTree } from "vuex";
import { changeRoot } from "../shared/changeRoot";
import { arrayToHash, hashToArray } from "typed-conversions";

import Vue from "vue";
import {
  AbcMutation,
  IDiscreteLocalResults,
  IDiscreteServerResults,
  IAbcResult,
  IDiscreteResult
} from "../types";
import { IDictionary } from "common-types";
import { AbcResult } from "../abc/api/AbcResult";
import { AbcApi } from "../abc/api/AbcApi";
import get from "lodash.get";

export function abc<T>(propOffset?: keyof T & string): MutationTree<T> {
  return {
    [AbcMutation.ABC_VUEX_UPDATE_FROM_IDX]<T extends IDictionary>(
      state: T,
      payload: AbcResult<any>
    ) {
      if (payload.vuex.isList) {
        Vue.set(state, payload.vuex.fullPath, payload.records);
      } else {
        if (!validResultSize(payload, "local")) {
          return;
        }
        changeRoot<T>(state, payload.records[0], payload.vuex.moduleName);
      }
    },

    [AbcMutation.ABC_INDEXED_SKIPPED]<T extends IDictionary>(
      state: T,
      payload: IDiscreteLocalResults<any>
    ) {
      // nothing to do; mutation is purely for informational/debugging purposes
    },

    [AbcMutation.ABC_FIREBASE_TO_VUEX_UPDATE]<T extends IDictionary>(
      state: T,
      payload: AbcResult<T>
    ) {
      if (payload.vuex.isList) {
        const vuexRecords = state[payload.vuex.modulePostfix];
        const updated = hashToArray({
          ...arrayToHash(vuexRecords || []),
          ...arrayToHash(payload.records || [])
        });

        Vue.set(state, payload.vuex.modulePostfix.replace(/\//g, "."), updated);
      } else {
        if (!validResultSize(payload, "server")) {
          return;
        }
        changeRoot<T>(state, payload.records[0], payload.vuex.moduleName);
      }
    },

    [AbcMutation.ABC_FIREBASE_REFRESH_INDEXED_DB]<T>(
      state: T,
      payload: IDiscreteServerResults<any>
    ) {
      // nothing to do; mutation is purely for informational/debugging purposes
    },

    [AbcMutation.ABC_INDEXED_DB_REFRESH_FAILED]<T extends IDictionary>(
      state: T,
      payload: IDiscreteServerResults<any> & {
        errorMessage: string;
        errorStack: any;
      }
    ) {
      console.group("Indexed DB Problem");
      console.warn("Failure to refresh the IndexedDB!", payload.errorMessage);
      console.warn("Stack Trace: ", payload.errorStack);
      console.warn("Records attempted:", payload.missing);
      console.groupEnd();
    },

    [AbcMutation.ABC_NO_CACHE]<T>(state: T, payload: IDiscreteResult<any>) {
      // nothing to do; mutation is purely for informational/debugging purposes
    },
    [AbcMutation.ABC_LOCAL_QUERY_EMPTY]<T>(
      state: T,
      payload: IDiscreteResult<any>
    ) {
      // nothing to do; mutation is purely for informational/debugging purposes
    },

    [AbcMutation.ABC_LOCAL_QUERY_TO_VUEX]<T extends IDictionary>(
      state: T,
      payload: AbcResult<T>
    ) {
      if (payload.vuex.isList) {
        Vue.set(state, payload.vuex.modulePostfix, payload.records);
      } else {
        if (!validResultSize(payload)) {
          return;
        }
        changeRoot<T>(state, payload.records[0], payload.vuex.moduleName);
      }
    },

    [AbcMutation.ABC_PRUNE_STALE_IDX_RECORDS]<T extends IDictionary>(
      state: T,
      payload: { pks: string[]; vuex: AbcApi<T>["vuex"] }
    ) {
      // nothing to do; mutation is purely for informational/debugging purposes
    },

    [AbcMutation.ABC_PRUNE_STALE_VUEX_RECORDS]<T extends IDictionary>(
      state: T,
      payload: { pks: string[]; vuex: AbcApi<T>["vuex"] }
    ) {
      if (payload.vuex.isList) {
        const current: any[] = get(state, payload.vuex.modulePostfix, []);

        Vue.set(
          state,
          payload.vuex.modulePostfix,
          current.filter(i => !payload.pks.includes(i.id))
        );
      } else {
        changeRoot<T>(state, null, payload.vuex.moduleName);
      }
    }
  };
}

function validResultSize<T>(
  payload: AbcResult<T>,
  where: ("local" | "server") & keyof IAbcResult<T, any> = "server"
) {
  const records = payload.records;
  if (records.length > 1) {
    console.warn(
      `There were ${records.length} records in the payload of the ${AbcMutation.ABC_VUEX_UPDATE_FROM_IDX} mutation for the ${payload.vuex.moduleName} Vuex module; this module is configured as for storage of a SINGULAR record not a list of records! This mutation will be ignored until this problem is corrected.`,
      records
    );
    return false;
  }
  if (records.length === 0) {
    console.warn(
      `There were zero records in the payload of the ${AbcMutation.ABC_VUEX_UPDATE_FROM_IDX} mutation for the ${payload.vuex.moduleName} Vuex module! This mutation will be ignored; use the ${AbcMutation.ABC_MODULE_CLEARED} mutation if your intent is to remove state from a Vuex module with the ABC API.`
    );
    return false;
  }

  return true;
}
