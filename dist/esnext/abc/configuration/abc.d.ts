import { AbcApi } from "../api/AbcApi";
import { IAbcApiConfig } from "../../types/abc";
import { IFmModelConstructor } from "../../types";
import { Model } from "firemodel";
/**
 * Returns an array of **AbcApi** API's: `get`, `load`, and `watch`
 */
export declare function abc<T extends Model>(model: IFmModelConstructor<T>, config?: IAbcApiConfig<T>): [AbcApi<T>["get"], AbcApi<T>["load"], AbcApi<T>["watch"]];
