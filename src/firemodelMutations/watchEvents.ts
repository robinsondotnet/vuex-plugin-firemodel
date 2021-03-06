import { MutationTree } from "vuex";
import { FmCrudMutation } from "../types";
import { IFmWatchEvent } from "firemodel";
import { IDictionary } from "common-types";
import { isRecord } from "../shared/isRecord";
import { changeRoot } from "../shared/changeRoot";
import Vue from "vue";

export function watchEvents<T>(propOffset?: keyof T & string): MutationTree<T> {
  const offset = !propOffset ? ("all" as keyof T & string) : propOffset;

  return {
    /**
     * Bring in the server's current state at the point that a
     * watcher has been setup.
     */
    [FmCrudMutation.serverStateSync](
      state: T | IDictionary<T[]>,
      payload: IFmWatchEvent<T>
    ) {
      if (isRecord(state, payload)) {
        changeRoot<T>(state, payload.value, payload.localPath);
      } else {
        Vue.set(state, offset, payload.value);
      }
    }
  };
}
