import { ActionTree } from "vuex";
import { IFiremodelState } from "../../index";
import { FmEvents, IFmWatchEvent } from "firemodel";
import { FmCrudMutation } from "../../types/mutations/FmCrudMutation";
import { determineLocalStateNode } from "../../shared/determineLocalStateNode";

export const recordRollbacks = <T>() =>
  ({
    [FmEvents.RECORD_ADDED_ROLLBACK](
      { commit, state },
      payload: IFmWatchEvent
    ) {
      commit(FmCrudMutation.serverAddRollback, payload);
      commit(
        determineLocalStateNode(payload, FmCrudMutation.serverAddRollback),
        payload,
        {
          root: true
        }
      );
    },
    [FmEvents.RECORD_CHANGED_ROLLBACK](
      { commit, state },
      payload: IFmWatchEvent
    ) {
      commit(FmCrudMutation.serverChangeRollback, payload);
      commit(
        determineLocalStateNode(payload, FmCrudMutation.serverChangeRollback),
        payload,
        {
          root: true
        }
      );
    },
    [FmEvents.RECORD_REMOVED_ROLLBACK](
      { commit, state },
      payload: IFmWatchEvent
    ) {
      commit(FmCrudMutation.serverRemoveRollback, payload);
      commit(
        determineLocalStateNode(payload, FmCrudMutation.serverRemoveRollback),
        payload,
        {
          root: true
        }
      );
    }
  } as ActionTree<IFiremodelState<T>, T>);
