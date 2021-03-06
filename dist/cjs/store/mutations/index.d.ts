import { MutationTree } from "vuex";
import { IFiremodelState } from "../../types";
/**
 * The **mutations** to the `@firemodel` state node; this state node will be off the
 * root of a state tree which is defined by the application but remains
 * unknown/generic to this plugin
 */
export declare const mutations: <T>() => MutationTree<IFiremodelState<T>>;
export declare type IFiremodelMutation = keyof typeof mutations;
