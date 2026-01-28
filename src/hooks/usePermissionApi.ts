import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { toast } from 'sonner';

/**
 * Hook to perform API calls with strict permission checks.
 * Prevents 403 errors by checking permissions client-side before sending the request.
 */
export const usePermissionApi = () => {
    const { can } = useAuth();

    const checkPermission = useCallback((permission: string | null | undefined, operationName: string) => {
        // Step 3: Hard Fail in Development
        if (permission === undefined) {
            const msg = `[PermissionAPI] FATAL: API call for '${operationName}' attempted without permission check. Pass a permission string or explicit 'null' to bypass.`;
            if (process.env.NODE_ENV === 'development') {
                throw new Error(msg);
            } else {
                console.error(msg);
                return true; // Soft fail in prod? Or block? Safe is block, but might break legacy. Block for now.
            }
        }

        // Explicit bypass
        if (permission === null) {
            return true;
        }

        // Check permission
        if (!can(permission)) {
            console.warn(`[PermissionAPI] Blocked unauthorized call: ${operationName} (Missing: ${permission})`);
            return false;
        }

        return true;
    }, [can]);

    const get = useCallback(async (permission: string | null, url: string, config?: any) => {
        if (!checkPermission(permission, `GET ${url}`)) return null;
        try {
            return await api.get(url, { ...config, headers: { ...config?.headers, 'X-Permission-Checked': 'true' } });
        } catch (error) {
            throw error;
        }
    }, [checkPermission]);

    const post = useCallback(async (permission: string | null, url: string, data?: any, config?: any) => {
        if (!checkPermission(permission, `POST ${url}`)) return null;
        try {
            return await api.post(url, data, { ...config, headers: { ...config?.headers, 'X-Permission-Checked': 'true' } });
        } catch (error) {
            throw error;
        }
    }, [checkPermission]);

    const put = useCallback(async (permission: string | null, url: string, data?: any, config?: any) => {
        if (!checkPermission(permission, `PUT ${url}`)) return null;
        try {
            return await api.put(url, data, { ...config, headers: { ...config?.headers, 'X-Permission-Checked': 'true' } });
        } catch (error) {
            throw error;
        }
    }, [checkPermission]);

    const patch = useCallback(async (permission: string | null, url: string, data?: any, config?: any) => {
        if (!checkPermission(permission, `PATCH ${url}`)) return null;
        try {
            return await api.patch(url, data, { ...config, headers: { ...config?.headers, 'X-Permission-Checked': 'true' } });
        } catch (error) {
            throw error;
        }
    }, [checkPermission]);

    const del = useCallback(async (permission: string | null, url: string, config?: any) => {
        if (!checkPermission(permission, `DELETE ${url}`)) return null;
        try {
            return await api.delete(url, { ...config, headers: { ...config?.headers, 'X-Permission-Checked': 'true' } });
        } catch (error) {
            throw error;
        }
    }, [checkPermission]);

    return {
        get,
        post,
        put,
        patch,
        delete: del,
        can // re-export for convenience
    };
};
