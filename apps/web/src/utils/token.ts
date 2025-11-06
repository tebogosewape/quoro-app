import { isBefore, fromUnixTime } from 'date-fns';
import { jwtDecode } from 'jwt-decode';

export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded: { exp: number } = jwtDecode(token);
        return isBefore(new Date(), fromUnixTime(decoded.exp)) === false;
    } catch {
        return true;
    }
};
