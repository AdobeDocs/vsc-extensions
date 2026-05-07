export default {
    debug: {
        enableApiCalls: true,
        enableConsoleLogging: false
    },
    environment: {
        baseUrl: 'https://experienceleague.adobe.com',
        apiUrl: 'https://experienceleague.adobe.com/api',
        timeout: 3000,
        maxRetries: 2,
        batchSize: 5,
        batchDelay: 1000
    },
    validation: {
        frontmatterSchemaPath: './frontmatter-schema.yaml',
        allowedExtensions: ['.md', '.markdown'],
        metadataFields: ['role', 'level', 'solution', 'feature'],
        maxFileSize: 1024 * 1024, // 1MB
        hierarchy: {
            enabled: true,
            repoMetadataFile: 'metadata.md',
            tocMetadataFile: 'TOC.md',
            cacheMetadata: true,
            skipValidationOnHierarchyFiles: true
        }
    },
    api: {
        endpoints: {
            'role': 'roles',
            'level': 'levels',
            'solution': 'solutions',
            'feature': 'features'
        }
    }
};
