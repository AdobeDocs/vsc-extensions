import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import config from './frontmatter-config.mjs';
import { fetchWithRetry } from './utils.mjs';

class FrontmatterSchemaProcessor {
    constructor() {
        this.schema = null;
        this.validateFrontmatter = null;
        this.cache = new Map(); // Cache for API responses
        // Get the directory of the current module for ES modules
        const __filename = fileURLToPath(import.meta.url);
        this.__dirname = dirname(__filename);
        this.schemaPath = join(this.__dirname, 'frontmatter-schema.yaml');
    }

        /**
     * Synchronous HTTP GET request using Node.js spawnSync
     * This is more reliable than busy-wait approaches
     * @param {string} url - The URL to fetch
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {string} Response body
     */
    httpGetSync(url, timeout = 3000) {
        // Create a simple Node.js script to make the HTTP request
        const script = `
            import https from 'https';
            import http from 'http';
            import { URL } from 'url';

            const url = '${url.replace(/'/g, "\\'")}';
            const urlObj = new URL(url);
            const httpModule = urlObj.protocol === 'https:' ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout: ${timeout},
                headers: {
                    'User-Agent': 'markdownlint-custom/1.0.0'
                }
            };

            const req = httpModule.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(data);
                        process.exit(0);
                    } else {
                        console.error(\`HTTP \${res.statusCode}: \${res.statusMessage}\`);
                        process.exit(1);
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                console.error('Request timeout');
                process.exit(1);
            });

            req.on('error', (error) => {
                console.error(error.message);
                process.exit(1);
            });

            req.end();
        `;

        try {
            const result = spawnSync('node', ['--input-type=module', '-e', script], {
                encoding: 'utf8',
                timeout: timeout + 1000, // Add buffer to the spawn timeout
                stdio: ['pipe', 'pipe', 'pipe'],
                maxBuffer: 1024 * 1024 // 1MB buffer to handle large API responses
            });

            if (result.error) {
                throw new Error(`Spawn error: ${result.error.message}`);
            }

            if (result.status !== 0) {
                throw new Error(`HTTP request failed: ${result.stderr || 'Unknown error'}`);
            }

            return result.stdout.trim();
        } catch (error) {
            throw new Error(`HTTP request failed: ${error.message}`);
        }
    }

    async loadSchema() {
        try {
            if (!existsSync(this.schemaPath)) {
                throw new Error('No YAML schema file found (frontmatter-schema.yaml)');
            }

            const schemaContent = readFileSync(this.schemaPath, 'utf8');
            let schema = yaml.load(schemaContent);

            // Inject dynamic enum values
            await this.injectDynamicEnums(schema);

            // Compile the schema
            const ajv = new Ajv({
                allErrors: true,
                verbose: true,
                strict: false
            });
            addFormats(ajv);

            this.schema = schema;
            this.validateFrontmatter = ajv.compile(schema);

            if (config.debug.enableConsoleLogging) {
                console.log('Frontmatter schema loaded with dynamic enums');
            }
            return true;
        } catch (error) {
            console.error('Failed to load frontmatter schema:', error.message);
            return false;
        }
    }

    // Synchronous schema loading that waits for API data
    loadSchemaSync() {
        if (this.schema && this.validateFrontmatter) {
            return true; // Already loaded
        }

        if (config.debug.enableConsoleLogging) {
            console.log('Loading schema synchronously...');
        }

        try {
            if (!existsSync(this.schemaPath)) {
                throw new Error('No YAML schema file found (frontmatter-schema.yaml)');
            }

            const schemaContent = readFileSync(this.schemaPath, 'utf8');
            let schema = yaml.load(schemaContent);

            // Try to load with API data first, fall back to static if needed
            if (config.debug.enableApiCalls) {
                const success = this.loadSchemaWithApiSync(schema);
                if (success) {
                    return true;
                }
            }

            // If API loading fails, don't use fallbacks - let validation fail
            if (config.debug.enableConsoleLogging) {
                console.log('API loading failed - schema will not have complete enum data');
            }

            return false; // Don't fall back to static enums
        } catch (error) {
            if (config.debug.enableConsoleLogging) {
                console.error('Failed to load schema synchronously:', error.message);
            }
            return false;
        }
    }

    // Synchronous loading using a different approach - try to use the existing async loading
    loadSchemaWithApiSync(schema) {
        const startTime = Date.now();
        const maxWaitTime = 2000; // 2 seconds max wait

        if (config.debug.enableConsoleLogging) {
            console.log('Trying to load API data synchronously...');
        }

                // Since the API call is fast (~0.3s), let's try a simpler approach
        // Use native Node.js HTTP request for schema loading
        try {
            // Load all critical field data directly for better validation
            const success = this.loadCriticalFieldsDirectly(schema);

            if (success) {
                // Compile the schema with solution data
                const ajv = new Ajv({
                    allErrors: true,
                    verbose: true,
                    strict: false
                });
                addFormats(ajv);

                this.schema = schema;
                this.validateFrontmatter = ajv.compile(schema);

                if (config.debug.enableConsoleLogging) {
                    console.log(`Schema loaded with all API data in ${Date.now() - startTime}ms`);
                }
                return true;
            }
        } catch (error) {
            if (config.debug.enableConsoleLogging) {
                console.error(`Failed to load solution API data: ${error.message}`);
            }
        }

        if (config.debug.enableConsoleLogging) {
            console.log(`Solution API loading failed, falling back to static values`);
        }
        return false;
    }

        // Load all critical field data using native Node.js HTTP for true synchronous execution
    loadCriticalFieldsDirectly(schema) {
        const fields = config.validation.metadataFields.map(field => ({
            name: field,
            endpoint: config.api.endpoints[field]
        }));

        let successCount = 0;

        for (const field of fields) {
            try {
                if (config.debug.enableConsoleLogging) {
                    console.log(`Loading ${field.name} data via direct call...`);
                }

                let allData = [];

                // Hybrid approach: Use YML for features, API for others
                if (field.name === 'feature') {
                    // Load features from YML file (complete dataset)
                    const yamlValues = this.loadFromYamlFileSync(field.name);
                    if (yamlValues && yamlValues.length > 0) {
                        allData = yamlValues;
                        if (config.debug.enableConsoleLogging) {
                            console.log(`Loaded ${allData.length} ${field.name} values from YML file`);
                        }
                    } else {
                        if (config.debug.enableConsoleLogging) {
                            console.warn(`Failed to load ${field.name} from YML file`);
                        }
                    }
                } else {
                    // Load other fields from API
                    const pageSize = 100;
                    let currentUrl = `https://experienceleague.adobe.com/api/${field.endpoint}?page_size=${pageSize}`;
                    let isLastPage = false;

                    // Handle pagination for synchronous calls
                    while (!isLastPage) {
                        const response = this.httpGetSync(currentUrl, 3000);
                        const data = JSON.parse(response);

                        if (data.error) {
                            if (config.debug.enableConsoleLogging) {
                                console.warn(`Error in API response for ${field.name}:`, data.error);
                            }
                            break;
                        }

                        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                            // Handle different response formats
                            if (field.name === 'solution') {
                                // Solutions endpoint returns strings directly
                                allData.push(...data.data);
                            } else {
                                // Other endpoints return objects with Name property
                                allData.push(...data.data.map(entry => entry.Name));
                            }
                        }

                        // Check for next page - handle both 'next' link and manual page increment
                        const links = data.links || [];
                        const nextLink = links.find(link => link.rel === 'next');
                        const lastLink = links.find(link => link.rel === 'last');

                        if (nextLink && nextLink.uri) {
                            // Direct next link available
                            currentUrl = nextLink.uri.startsWith('https://experienceleague.adobe.com') ?
                                nextLink.uri : `https://experienceleague.adobe.com${nextLink.uri}`;
                            if (config.debug.enableConsoleLogging) {
                                console.log(`Fetching next page for ${field.name}: ${currentUrl}`);
                            }
                        } else if (lastLink && lastLink.uri) {
                            // No next link, but check if we can infer the next page from last link
                            const lastPageMatch = lastLink.uri.match(/[?&]page=(\d+)/);
                            const currentPageMatch = currentUrl.match(/[?&]page=(\d+)/);

                            if (lastPageMatch && currentPageMatch) {
                                const lastPageNum = parseInt(lastPageMatch[1]);
                                const currentPageNum = parseInt(currentPageMatch[1]);

                                if (currentPageNum < lastPageNum) {
                                    // Build next page URL
                                    const nextPageNum = currentPageNum + 1;
                                    currentUrl = currentUrl.replace(/([?&]page=)\d+/, `$1${nextPageNum}`);
                                    if (config.debug.enableConsoleLogging) {
                                        console.log(`Inferred next page for ${field.name}: ${currentUrl} (${nextPageNum}/${lastPageNum})`);
                                    }
                                } else {
                                    isLastPage = true;
                                }
                            } else {
                                isLastPage = true;
                            }
                        } else {
                            isLastPage = true;
                        }
                    }
                }

                if (allData.length > 0 && schema.properties[field.name] && schema.properties[field.name].items) {
                    schema.properties[field.name].items.enum = allData;
                    successCount++;

                    if (config.debug.enableConsoleLogging) {
                        console.log(`Loaded ${allData.length} ${field.name} values via direct call`);
                    }

                }
            } catch (error) {
                if (config.debug.enableConsoleLogging) {
                    console.error(`Direct ${field.name} loading failed: ${error.message}`);
                }
                // Don't fail completely, continue with other fields
            }
        }

        // Return true if we loaded at least some data successfully
        return successCount > 0;
    }



    // Asynchronous loading for background updates
    async loadSchemaAsync() {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadSchema();
        return this.loadingPromise;
    }

    // Load enum values from YAML files only - no fallbacks
    injectStaticEnums(schema) {
        // Define which fields should get dynamic enum values
        const dynamicFields = config.validation.metadataFields;
        let loadedFields = 0;

        for (const field of dynamicFields) {
            if (schema.properties[field]) {
                try {
                    const enumValues = this.loadFromYamlFileSync(field);
                    if (enumValues && enumValues.length > 0) {
                        // Remove duplicates to prevent schema validation errors
                        const uniqueValues = [...new Set(enumValues)];
                        schema.properties[field].items.enum = uniqueValues;
                        loadedFields++;
                        if (config.debug.enableConsoleLogging) {
                            console.log(`Loaded ${uniqueValues.length} static values for field: ${field}`);
                        }
                    } else {
                        if (config.debug.enableConsoleLogging) {
                            console.error(`No static values available for ${field} - validation will be incomplete`);
                        }
                        // Don't set any enum values - let validation fail if needed
                    }
                } catch (error) {
                    if (config.debug.enableConsoleLogging) {
                        console.error(`Failed to load static enum values for ${field}:`, error.message);
                    }
                    // Don't use fallbacks - let the field remain without enum validation
                }
            }
        }

        return loadedFields > 0;
    }

    async injectDynamicEnums(schema) {
        // Define which fields should get dynamic enum values
        const dynamicFields = config.validation.metadataFields;

        for (const field of dynamicFields) {
            if (schema.properties[field]) {
                try {
                    const enumValues = await this.fetchEnumValues(field);
                    if (enumValues.length > 0) {
                        // Remove duplicates to prevent schema validation errors
                        const uniqueValues = [...new Set(enumValues)];
                        schema.properties[field].items.enum = uniqueValues;
                        if (config.debug.enableConsoleLogging) {
                            console.log(`Injected ${uniqueValues.length} unique values for field: ${field} (${enumValues.length - uniqueValues.length} duplicates removed)`);
                        }
                    } else {
                        // No enum values available - validation will be incomplete
                        if (config.debug.enableConsoleLogging) {
                            console.error(`No enum values available for ${field} - validation will be incomplete`);
                        }
                        // Don't set enum values - let validation work without strict enum checking
                    }
                } catch (error) {
                    if (config.debug.enableConsoleLogging) {
                        console.error(`Failed to fetch enum values for ${field}:`, error.message);
                    }
                    // API call failed - don't set enum values
                }
            }
        }
    }



    async fetchEnumValues(field) {
        // Hybrid approach: Use YML for features (more complete), API for others (always current)
        if (field === 'feature') {
            // Strategy 1: Use YML file for features (complete dataset)
            const yamlValues = await this.loadFromYamlFile(field);
            if (yamlValues && yamlValues.length > 0) {
                if (config.debug.enableConsoleLogging) {
                    console.log(`Using YAML values for ${field}: ${yamlValues.length} items`);
                }
                return yamlValues;
            }
        } else {
            // Strategy 1: Fetch from API endpoints for other fields (primary source)
            const apiValues = await this.fetchFromAPI(field);
            if (apiValues && apiValues.length > 0) {
            if (config.debug.enableConsoleLogging) {
                console.log(`Using API values for ${field}: ${apiValues.length} items`);
            }
                return apiValues;
            }
        }

        // Strategy 2: Load from local YAML files (fallback for API fields)
        const yamlValues = await this.loadFromYamlFile(field);
        if (yamlValues && yamlValues.length > 0) {
            if (config.debug.enableConsoleLogging) {
                console.log(`Using YAML values for ${field}: ${yamlValues.length} items`);
            }
            return yamlValues;
        }

        // No values available from any source - schema validation will be incomplete
        if (config.debug.enableConsoleLogging) {
            console.error(`No enum values available for ${field} from any source`);
        }
        return [];
    }

    // Synchronous version of loadFromYamlFile
    loadFromYamlFileSync(field) {
        const yamlPath = join(this.__dirname, `${field}.yml`);
        if (existsSync(yamlPath)) {
            try {
                const content = readFileSync(yamlPath, 'utf8');
                const data = yaml.load(content);

                // Handle special case for features YML structure
                if (field === 'feature' && data && data['feature-set']) {
                    // Store the solution-feature mapping for context-aware validation
                    this.solutionFeatureMap = data['feature-set'];

                    // For schema compilation, we still need all features as enum
                    // But validation will be context-aware based on solution
                    const allFeatures = [];
                    Object.values(data['feature-set']).forEach(solutionFeatures => {
                        if (Array.isArray(solutionFeatures)) {
                            allFeatures.push(...solutionFeatures);
                        }
                    });
                    // Remove duplicates to prevent schema validation errors
                    return [...new Set(allFeatures)];
                }

                return Array.isArray(data) ? data : [data];
            } catch (error) {
                console.warn(`Failed to load YAML file for ${field}:`, error.message);
            }
        }
        return null;
    }

    async loadFromYamlFile(field) {
        return this.loadFromYamlFileSync(field);
    }



    async fetchFromAPI(field) {
        // Skip API calls if disabled in debug config
        if (!config.debug.enableApiCalls) {
            return [];
        }

        // Check cache first
        if (this.cache.has(field)) {
            if (config.debug.enableConsoleLogging) {
                console.log(`Using cached values for ${field}`);
            }
            return this.cache.get(field);
        }

        try {
            let allData = [];
            let currentUrl = `${config.environment.apiUrl}/${config.api.endpoints[field]}?page_size=100`;
            let isLastPage = false;

            console.log(`Fetching values for ${field} from ${currentUrl}`);
            while (!isLastPage) {
                const response = await fetchWithRetry(currentUrl);

                if (response.data.error) {
                    if (config.debug.enableConsoleLogging) {
                        console.warn(`Error in API response for ${field}:`, response.data.error);
                    }
                    break;
                }

                // Add current page's data
                if (field === 'solution') {
                    allData.push(...response.data.data);
                } else {
                    allData.push(...response.data.data.map(entry => entry.Name));
                }

                // Check for next page - handle both 'next' link and manual page increment
                const links = response.data.links || [];
                const nextLink = links.find(link => link.rel === 'next');
                const lastLink = links.find(link => link.rel === 'last');

                if (nextLink && nextLink.uri) {
                    // Direct next link available
                    const uri = nextLink.uri.startsWith(`${config.environment.baseUrl}`) ? nextLink.uri : `${config.environment.baseUrl}${nextLink.uri}`;
                    currentUrl = uri;
                    if (config.debug.enableConsoleLogging) {
                        console.log(`Fetching next page: ${currentUrl}`);
                    }
                } else if (lastLink && lastLink.uri) {
                    // No next link, but check if we can infer the next page from last link
                    const lastPageMatch = lastLink.uri.match(/[?&]page=(\d+)/);
                    const currentPageMatch = currentUrl.match(/[?&]page=(\d+)/);

                    if (lastPageMatch && currentPageMatch) {
                        const lastPageNum = parseInt(lastPageMatch[1]);
                        const currentPageNum = parseInt(currentPageMatch[1]);

                        if (currentPageNum < lastPageNum) {
                            // Build next page URL
                            const nextPageNum = currentPageNum + 1;
                            currentUrl = currentUrl.replace(/([?&]page=)\d+/, `$1${nextPageNum}`);
                            if (config.debug.enableConsoleLogging) {
                                console.log(`Inferred next page: ${currentUrl} (${nextPageNum}/${lastPageNum})`);
                            }
                        } else {
                            isLastPage = true;
                            if (config.debug.enableConsoleLogging) {
                                console.log(`Reached last page. Pagination complete for ${field}. Total items: ${allData.length}`);
                            }
                        }
                    } else {
                        isLastPage = true;
                        if (config.debug.enableConsoleLogging) {
                            console.log(`Cannot determine pagination. Complete for ${field}. Total items: ${allData.length}`);
                        }
                    }
                } else {
                    // No next or last link found, we're done
                    isLastPage = true;
                    if (config.debug.enableConsoleLogging) {
                        console.log(`No pagination links found. Complete for ${field}. Total items: ${allData.length}`);
                    }
                }
            }

            // Cache the result
            this.cache.set(field, allData);
            return allData;
        } catch (error) {
            if (config.debug.enableConsoleLogging) {
                console.warn(`Failed to fetch values for ${field}: ${error.message}`, {
                    url: `${config.environment.apiUrl}/${config.api.endpoints[field]}`,
                    error: error.message
                });
            }
            return [];
        }
    }

    // Fallback values method removed - system now fails when API data is unavailable

    getValidator() {
        return this.validateFrontmatter;
    }

    getSchema() {
        return this.schema;
    }

    /**
     * Get fields that support comma-separated values based on schema
     * @returns {Array<string>} Array of field names that support CSV
     */
    getCsvSupportedFields() {
        if (!this.schema || !this.schema.properties) {
            return [];
        }

        return Object.keys(this.schema.properties).filter(fieldName => {
            const fieldSchema = this.schema.properties[fieldName];
            return fieldSchema && fieldSchema['x-supports-csv'] === true;
        });
    }

    /**
     * Get valid features for a specific solution
     * @param {string} solution - The solution name
     * @returns {Array<string>} Array of valid features for the solution
     */
    getFeaturesForSolution(solution) {
        if (!this.solutionFeatureMap || !solution) {
            return [];
        }

        // Handle both string and array solutions
        const solutions = Array.isArray(solution) ? solution : [solution];
        const validFeatures = new Set();

        solutions.forEach(sol => {
            if (this.solutionFeatureMap[sol] && Array.isArray(this.solutionFeatureMap[sol])) {
                this.solutionFeatureMap[sol].forEach(feature => validFeatures.add(feature));
            }
        });

        return Array.from(validFeatures);
    }

    /**
     * Validate features against their solution context
     * @param {Array<string>} features - Features to validate
     * @param {Array<string>} solutions - Solutions to validate against
     * @returns {Object} Validation result with valid/invalid features
     */
    validateFeaturesForSolution(features, solutions) {
        if (!features || !Array.isArray(features) || !solutions || !Array.isArray(solutions)) {
            return { valid: [], invalid: features || [] };
        }

        const validFeaturesForSolutions = this.getFeaturesForSolution(solutions);

        if (validFeaturesForSolutions.length === 0) {
            // If no valid features found for solutions, fall back to general validation
            // Use the complete feature enum from the schema instead of accepting everything
            const allValidFeatures = this.schema?.properties?.feature?.items?.enum || [];

            if (allValidFeatures.length === 0) {
                // Schema not loaded or no enum defined - can't validate
                return { valid: features, invalid: [] };
            }

            const valid = [];
            const invalid = [];

            // Use Set for O(1) lookups instead of O(n) with includes()
            const allValidFeaturesSet = new Set(allValidFeatures);

            features.forEach(feature => {
                if (allValidFeaturesSet.has(feature)) {
                    valid.push(feature);
                } else {
                    invalid.push(feature);
                }
            });

            return { valid, invalid, availableFeatures: allValidFeatures };
        }

        const valid = [];
        const invalid = [];

        features.forEach(feature => {
            if (validFeaturesForSolutions.includes(feature)) {
                valid.push(feature);
            } else {
                invalid.push(feature);
            }
        });

        return { valid, invalid, availableFeatures: validFeaturesForSolutions };
    }
}

export default FrontmatterSchemaProcessor;
