import { IAbcApiConfig } from "../../types/abc";
import { IFmModelConstructor } from "../../types";
import { Model } from "firemodel";
/**
 * Constructs a `AbcApi` object instance for the given `Model`
 */
export declare function get<T extends Model>(model: IFmModelConstructor<T>, config?: IAbcApiConfig<T>): (request: import("../../types").IAbcParam<T>, options?: import("../../types").IAbcOptions<T>) => Promise<import("..").AbcResult<T>>;
