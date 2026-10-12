import { deepMap } from './utility';

// More info on Open Graph meta tags at https://ogp.me/
export interface OpenGraphMeta {
  // The title of your object as it should appear within the graph, e.g., "The Rock".
  'og:title': string;
  // The type of your object, e.g., "video.movie". Depending on the type you specify, other properties may also be required.
  'og:type': string;
  // The canonical URL of your object that will be used as its permanent ID in the graph, e.g., "https://www.imdb.com/title/tt0117500/".
  'og:url': string;
  // A one to two sentence description of your object.
  'og:description'?: string;
  // If your object is part of a larger web site, the name which should be displayed for the overall site. e.g., "IMDb".
  'og:site_name'?: string;
  images?: OpenGraphImage[];
}

export interface OpenGraphImage {
  // An image URL which should represent your object within the graph.
  'og:image:url': string;
  // The same URL, included in diplicate for broken bots
  'og:image': string;
  // A description of what is in the image (not a caption).
  'og:image:alt'?: string;
  // A MIME type for this image.
  'og:image:type'?: string;
  // The number of pixels wide.
  'og:image:width'?: string;
  // The number of pixels high.
  'og:image:height'?: string;
}

type OpenGraphTags = keyof Omit<OpenGraphMeta, 'images'> | keyof OpenGraphImage;

export const defaultImageWide: OpenGraphImage = {
  'og:image': '/images/site-preview-large-wide.png',
  'og:image:url': '/images/site-preview-large-wide.png',
  'og:image:type': 'image/png',
  'og:image:height': '671',
  'og:image:width': '1200',
  'og:image:alt':
    'An example blueprint, shown against the website editor, next to the blueprint not included logo.',
};

export const SITE_NAME = 'Blueprint Not Included';

// Only the wide image: unfurlers (Slack among them) show the *first* og:image,
// and the square one was a lone example blueprint with no logo or name —
// shared next to a category title, it read as a random thumbnail.
export const defaultWebsiteMeta: OpenGraphMeta = {
  'og:type': 'website',
  'og:url': process.env.HOST || 'https://example.com',
  'og:site_name': SITE_NAME,
  'og:title': SITE_NAME,
  'og:description':
    'A place to upload, build, and share your favourite blueprint designs for Oxygen Not Included.',
  images: [defaultImageWide],
};

// og:image must be absolute (ogp.me); a root-relative path is left to each
// unfurler to guess at, and some drop the image instead.
const absoluteUrl = (url: string) =>
  url.startsWith('/') ? `${process.env.HOST ?? ''}${url}` : url;

// `og:title` carries a user-supplied blueprint name, and these tags are
// rendered raw (`<%- metaTags %>` in index-robots.ejs), so the content has to
// be escaped here — this is the only place it can be. The old ASCII-only name
// regex made this unreachable; Unicode titles allow `"` and `<`, so a title
// like `x" /><script>…` would otherwise close the tag and inject into the
// crawler-served page.
const escapeHtmlAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const htmlMetaTag = (property: OpenGraphTags, content: string) =>
  `<meta property="${escapeHtmlAttribute(property)}" content="${escapeHtmlAttribute(content)}" />`;

export class WebsiteMeta {
  public meta: OpenGraphMeta;

  constructor(meta: Partial<OpenGraphMeta> = {}) {
    this.meta = { ...defaultWebsiteMeta, ...meta };
  }

  public getHtmlTags() {
    const images = (this.meta.images ?? []).map(image => ({
      ...image,
      'og:image': absoluteUrl(image['og:image']),
      'og:image:url': absoluteUrl(image['og:image:url']),
    }));
    const tags = deepMap({ ...this.meta, images }, htmlMetaTag);
    tags.push('<meta name="twitter:card" content="summary_large_image" />');
    if (images.length > 0)
      tags.push(
        `<meta name="twitter:image" content="${escapeHtmlAttribute(images[0]['og:image'])}" />`
      );
    return tags.join('');
  }
}
