import axios from 'axios';
import config from './frontmatter-config.mjs';

/**
 * Fetches data from a URL with retry logic
 * @param {string} url - The URL to fetch from
 * @param {Object} options - Additional options for the request
 * @param {number} retries - Number of retries remaining
 * @param {number} retryCount - Number of retries used so far
 * @returns {Promise<Object>} The response from the request
 */
export async function fetchWithRetry(url, options = {}, retries = config.environment.maxRetries, retryCount = 0) {
    try {
        const response = await axios.get(url, {
            ...options,
            timeout: config.environment.timeout
        });
        // Add retry count to response if any retries were used
        if (retryCount > 0) {
            console.log(`[DEBUG] Adding retryCount=${retryCount} to response for ${url}`);
            response.retryCount = retryCount;
        }
        return response;
    } catch (error) {
        // Only log on initial failure (when retries equals maxRetries)
        if (retries === config.environment.maxRetries) {
            console.log(`Request failed for ${url}:`, {
                error: error.message,
                code: error.code,
                retriesRemaining: retries,
                timeout: config.environment.timeout
            });
        }

        if (retries > 0) {
            console.log(`Retrying request to ${url} (${retries} retries remaining)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1, retryCount + 1);
        }
        throw error;
    }
}
