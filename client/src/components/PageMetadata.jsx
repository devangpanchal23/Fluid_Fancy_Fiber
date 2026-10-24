import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PAGE_META = {
  "/": {
    title: "Fluid Fancy Fibre LLP | Consistent to the last metre.",
    description: "Mono, lino and specialty yarn counts with lot-level traceability and technician sign-off from Fluid Fancy Fibre LLP."
  },
  "/products": {
    title: "Products & Yarn Catalogue | Fluid Fancy Fibre LLP",
    description: "Mono, lino and specialty yarn counts with lot-level traceability and technician sign-off from Fluid Fancy Fibre LLP."
  },
  "/catalog": {
    title: "Products & Yarn Catalogue | Fluid Fancy Fibre LLP",
    description: "Mono, lino and specialty yarn counts with lot-level traceability and technician sign-off from Fluid Fancy Fibre LLP."
  },
  "/about": {
    title: "About Us & Mill | Fluid Fancy Fibre LLP",
    description: "Woman-led, lot-level traceability, ring-spun yarn since 2005. Consistent to the last metre."
  },
  "/contact": {
    title: "Contact Us | Fluid Fancy Fibre LLP",
    description: "Get in touch with Fluid Fancy Fibre LLP for technical queries, quotations, and sample requests."
  },
  "/privacy": {
    title: "Privacy notice | Fluid Fancy Fibre LLP",
    description: "How Fluid Fancy Fibre uses and protects information submitted through its website."
  },
  "/privacy-policy": {
    title: "Privacy notice | Fluid Fancy Fibre LLP",
    description: "How Fluid Fancy Fibre uses and protects information submitted through its website."
  },
  "/terms": {
    title: "Website terms | Fluid Fancy Fibre LLP",
    description: "Terms for using the Fluid Fancy Fibre website and requesting product information or quotations."
  },
  "/terms-of-service": {
    title: "Website terms | Fluid Fancy Fibre LLP",
    description: "Terms for using the Fluid Fancy Fibre website and requesting product information or quotations."
  }
};

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.append(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

export default function PageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/$/, "") || "/";
    const page = PAGE_META[path];
    const isAdmin = path === "/admin" || path.startsWith("/admin/");
    const isUnknown = !page && !isAdmin;
    const title = page?.title || (isAdmin ? "Admin | Fluid Fancy Fibre LLP" : "Page not found | Fluid Fancy Fibre LLP");
    const description = page?.description || "Fluid Fancy Fibre LLP, consistent to the last metre.";
    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: isAdmin || isUnknown ? "noindex, nofollow" : "index, follow" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: "Fluid Fancy Fibre LLP brand mark" });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });

    const configuredSite = import.meta.env.VITE_SITE_URL || "https://www.fluidfancyenterprise.com";
    let siteBase = "https://www.fluidfancyenterprise.com";
    try {
      const parsedSite = new URL(configuredSite);
      if (parsedSite.protocol === "https:") siteBase = parsedSite.origin;
    } catch {
      siteBase = "https://www.fluidfancyenterprise.com";
    }
    const image = document.head.querySelector('meta[property="og:image"]')?.content;
    if (image && siteBase) upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: new URL(image, siteBase).href });
    const canonicalUrl = siteBase ? new URL(path, siteBase).href : "";
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonicalUrl && !isAdmin && !isUnknown) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = canonicalUrl;
      upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    } else {
      canonical?.remove();
      document.head.querySelector('meta[property="og:url"]')?.remove();
    }

    const schema = document.getElementById("ff-organization-schema");
    if (schema) schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Fluid Fancy Fibre LLP",
      logo: new URL("/favicon.png", siteBase || window.location.origin).href,
      ...(siteBase ? { url: siteBase } : {})
    });
  }, [pathname]);

  return null;
}
