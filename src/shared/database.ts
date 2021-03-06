import { DB, IFirebaseClientConfig } from "abstracted-client";
import { FireModelPluginError } from "../errors/FiremodelPluginError";
import { FireModel } from "firemodel";

let _db: DB;
let _config: IFirebaseClientConfig;
/**
 * connects to a Firebase DB unless already connected in which case it
 * it just hands back the existing connection.
 */
export async function database(config?: IFirebaseClientConfig) {
  if (config) {
    if (JSON.stringify(config) !== JSON.stringify(_config) || !_db) {
      _config = config;
      _db = await DB.connect(config);
    }
    FireModel.defaultDb = _db;
  }

  if (!_db && !_config) {
    throw new FireModelPluginError(
      "Trying to get the database connection but it has not been established yet!",
      "not-ready"
    );
  }

  return _db;
}
