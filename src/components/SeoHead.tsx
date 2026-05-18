import { Helmet } from "react-helmet-async";

const BASE = "https://ito-genius-pricing.lovable.app";

interface Props {
  title: string;
  description: string;
  path: string;
}

export default function SeoHead({ title, description, path }: Props) {
  const url = `${BASE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
