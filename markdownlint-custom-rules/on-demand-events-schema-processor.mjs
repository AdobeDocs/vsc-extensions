// @ts-check
"use strict";

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import config from "./frontmatter-config.mjs";
import FrontmatterSchemaProcessor from "./frontmatter-schema-processor.mjs";

/**
 * On-demand events schema processor
 * - Sync loading (safe for markdownlint)
 * - Reuses AM020 processor's sync HTTP + pagination + caching behavior
 * - Injects enums for:
 *   role   -> roles
 *   level  -> levels
 *   product-> solution endpoint (solutions list)
 */
class OnDemandEventSchemaProcessor extends FrontmatterSchemaProcessor {
  constructor() {
    super();

    // Override schema path to the events schema file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.schemaPath = join(__dirname, "on-demand-events-frontmatter-schema.yaml");
  }

  /**
   * Override: load only the fields we care about for events,
   * and map "product" to the "solution" endpoint.
   *
   * This method is called by the base class's loadSchemaSync() path via loadSchemaWithApiSync().
   */
  loadCriticalFieldsDirectly(schema) {
    const fields = [
      { name: "role", endpointKey: "role" },       // roles
      { name: "level", endpointKey: "level" },     // levels
      { name: "product", endpointKey: "solution" } // solutions (product maps to solution endpoint)
    ];

    let successCount = 0;

    for (const field of fields) {
      try {
        if (config.debug.enableConsoleLogging) {
          console.log(`Loading ${field.name} values for events...`);
        }

        const endpoint = config.api.endpoints[field.endpointKey];
        if (!endpoint) {
          if (config.debug.enableConsoleLogging) {
            console.warn(`No endpoint mapping found for ${field.endpointKey}`);
          }
          continue;
        }

        const pageSize = 100;
        let currentUrl = `${config.environment.apiUrl}/${endpoint}?page_size=${pageSize}`;
        let isLastPage = false;
        const allData = [];

        while (!isLastPage) {
          const responseText = this.httpGetSync(currentUrl, 3000);
          const data = JSON.parse(responseText);

          if (data.error) {
            if (config.debug.enableConsoleLogging) {
              console.warn(`Error in API response for ${field.name}:`, data.error);
            }
            break;
          }

          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            // - solution endpoint returns strings directly
            // - others return objects with Name
            if (field.endpointKey === "solution") {
              allData.push(...data.data);
            } else {
              allData.push(...data.data.map(entry => entry.Name));
            }
          }

          // Pagination
          const links = data.links || [];
          const nextLink = links.find(link => link.rel === "next");
          const lastLink = links.find(link => link.rel === "last");

          if (nextLink && nextLink.uri) {
            currentUrl = nextLink.uri.startsWith("https://experienceleague.adobe.com")
              ? nextLink.uri
              : `https://experienceleague.adobe.com${nextLink.uri}`;
          } else if (lastLink && lastLink.uri) {
            const lastPageMatch = lastLink.uri.match(/[?&]page=(\d+)/);
            const currentPageMatch = currentUrl.match(/[?&]page=(\d+)/);

            if (lastPageMatch && currentPageMatch) {
              const lastPageNum = parseInt(lastPageMatch[1], 10);
              const currentPageNum = parseInt(currentPageMatch[1], 10);

              if (currentPageNum < lastPageNum) {
                const nextPageNum = currentPageNum + 1;
                currentUrl = currentUrl.replace(/([?&]page=)\d+/, `$1${nextPageNum}`);
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

        // Inject into schema:
        // Events schema should define role/level/product as arrays with items
        if (allData.length > 0 && schema.properties?.[field.name]?.items) {
          const unique = [...new Set(allData)];
          schema.properties[field.name].items.enum = unique;
          successCount++;

          if (config.debug.enableConsoleLogging) {
            console.log(`Injected ${unique.length} values for ${field.name}`);
          }
        } else if (config.debug.enableConsoleLogging) {
          console.warn(`No enum values injected for ${field.name} (no data or schema path missing)`);
        }
      } catch (error) {
        if (config.debug.enableConsoleLogging) {
          console.error(`Failed loading ${field.name}: ${error.message}`);
        }
      }
    }

    // Return true if at least one field was successfully populated
    return successCount > 0;
  }
}

export default OnDemandEventSchemaProcessor;