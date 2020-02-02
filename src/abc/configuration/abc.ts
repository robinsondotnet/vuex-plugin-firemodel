import { AbcApi } from "../api/AbcApi";
import { IAbcApiConfig } from "../../types/abc";
import { IFmModelConstructor } from "../../types";
import { Model } from "firemodel";
import { database } from "../../shared/database";

/**
 * Returns an array of **AbcApi** API's: `get`, `load`, and `watch`
 */
export function abc<T extends Model>(
  model: IFmModelConstructor<T>,
  config: IAbcApiConfig<T> = {}
): [AbcApi<T>["get"], AbcApi<T>["load"], AbcApi<T>["watch"]] {
  const api = new AbcApi(model, config);

  return [api.get.bind(api), api.load.bind(api), api.watch.bind(api)];
}
