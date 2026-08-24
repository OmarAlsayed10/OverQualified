import type { SeoProps } from "./Seo.types";

// React 19 hoists title/meta rendered anywhere into <head>, so no helmet library.
const Seo = ({ title, description, noIndex }: SeoProps) => (
  <>
    <title>{`${title} | OverQualified`}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    {noIndex && <meta name="robots" content="noindex" />}
  </>
);

export default Seo;
