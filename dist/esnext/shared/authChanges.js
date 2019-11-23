import { database } from "./database";
import { runQueue } from "./runQueue";
let _uid;
let _isAnonymous;
export const authChanged = (context) => async (user) => {
    const ctx = () => (Object.assign(Object.assign({}, context), { isAnonymous: user ? user.isAnonymous : false, uid: user ? user.uid : "", emailVerified: user ? user.emailVerified : false, email: user ? user.email : "", fullProfile: user }));
    if (user) {
        console.group("Login Event");
        if (user.credential) {
            // TODO: look into why this is happening
            const e = new Error();
            console.warn("Auth changed but it appears to have given us a UserCredential rather than a User object!", e.stack);
            user = user.user;
        }
        console.info(`Login detected [uid: ${user.uid}, anonymous: ${user.isAnonymous}]`);
        if (!user.isAnonymous && _isAnonymous === true) {
            console.log(`anonymous user ${_uid} was abandoned in favor of user ${user.uid}`);
            ctx().commit("USER_ABANDONED" /* userAbandoned */, {
                user,
                priorUid: _uid
            });
            await runQueue(ctx(), "user-abandoned");
        }
        ctx().commit("USER_LOGGED_IN" /* userLoggedIn */, user);
        const token = await user.getIdTokenResult();
        ctx().commit("SET_CUSTOM_CLAIMS", token.claims);
        ctx().commit("SET_AUTH_TOKEN", token.token);
        _uid = user.uid;
        _isAnonymous = user.isAnonymous;
        await runQueue(ctx(), "logged-in");
        console.groupEnd();
    }
    else {
        console.group("Logout Event");
        console.info(`User`, user);
        ctx().commit("USER_LOGGED_OUT" /* userLoggedOut */, user);
        await runQueue(ctx(), "logged-out");
        if (ctx().config.anonymousAuth) {
            const auth = await (await database()).auth();
            const anon = await auth.signInAnonymously();
            ctx().commit("USER_LOGGED_IN" /* userLoggedIn */, anon);
        }
        console.groupEnd();
    }
};
