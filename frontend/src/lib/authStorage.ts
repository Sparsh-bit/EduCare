const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

const getStorage = (): Storage | null => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
};

export const authStorage = {
    getToken(): string | null {
        const storage = getStorage();
        return storage ? storage.getItem(TOKEN_KEY) : null;
    },

    setAuth(token: string, refreshToken: string, user: unknown) {
        const storage = getStorage();
        if (!storage) return;

        storage.setItem(TOKEN_KEY, token);
        storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        storage.setItem(USER_KEY, JSON.stringify(user));
    },

    clear() {
        const storage = getStorage();
        if (!storage) return;

        storage.removeItem(TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        storage.removeItem(USER_KEY);
    },
};
