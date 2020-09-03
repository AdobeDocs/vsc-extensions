'use strict';

module.exports.VIDEO_SCHEMA = {
  title: 'Video',
  $schema: 'https://dotnet.github.io/docfx/schemas/v1.0/schema.json#',
  version: '1.0.0',
  description: 'Video Extension',
  id: 'https://static.docs.com/ui/latest/schemas/extensions/Video.schema.json',
  type: 'object',
  additionalProperties: false,
  required: ['source'],
  properties: {
    source: {
      type: 'string',

      description: 'The https source path of the video.',

      contentType: 'href',
    },
    title: {
      type: 'string',
      description:
        'The video description for accessibility and screen-readers.',
      tags: ['localizable'],
    },
    'max-width': {
      type: 'number',
      description: 'The max-width of the video size in px.',
      minimum: 0,
    },
  },
  metadata: '/metadata',
};
