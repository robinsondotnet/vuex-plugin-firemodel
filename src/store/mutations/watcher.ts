import { IFiremodelState } from "../../index";
import { IFmWatcherStopped, IWatcherEventContext } from "firemodel";
import { FmConfigMutation } from "../../types/mutations/FmConfigMutation";
import { MutationTree } from "vuex";
import Vue from "vue";

export const watcher = <T>() =>
  ({
    [FmConfigMutation.watcherStarting](
      state: IFiremodelState<T>,
      payload: IWatcherEventContext
    ) {
      // nothing to do
    },

    [FmConfigMutation.watcherStarted](
      state: IFiremodelState<T>,
      payload: IWatcherEventContext
    ) {
      Vue.set(
        state,
        "watching",
        state.watching ? state.watching.concat(payload) : [payload]
      );
    },

    [FmConfigMutation.watcherStopped](
      state: IFiremodelState<T>,
      payload: IFmWatcherStopped
    ) {
      state.watching = state.watching.filter(
        i => i.watcherId !== payload.watcherId
      );
    },
    [FmConfigMutation.watcherAllStopped](state: IFiremodelState<T>, payload) {
      state.watching = [];
    },

    [FmConfigMutation.watcherMuted](
      state: IFiremodelState<T>,
      watcherId: string
    ) {
      state.muted = state.muted.concat(watcherId);
    },

    [FmConfigMutation.watcherUnmuted](
      state: IFiremodelState<T>,
      watcherId: string
    ) {
      state.muted = state.muted.filter(i => i !== watcherId);
    }
  } as MutationTree<IFiremodelState<T>>);
