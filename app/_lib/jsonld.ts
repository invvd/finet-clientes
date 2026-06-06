import type { Plan } from "../_data/planes";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finet.cl";

function parsePrecio(precio: string): string {
  return precio.replace(/[$.]/g, "");
}

type BreadcrumbItem = { name: string; url: string };

export function productJsonLd(plan: Plan) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: plan.nombre,
    description: plan.descripcion,
    brand: {
      "@type": "Brand",
      name: "Finet",
    },
    offers: {
      "@type": "Offer",
      price: parsePrecio(plan.precio),
      priceCurrency: "CLP",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/contratar/${plan.id}`,
    },
  });
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

export function itemListJsonLd(planes: Plan[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: planes.map((plan, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: plan.nombre,
        description: plan.descripcion,
        offers: {
          "@type": "Offer",
          price: parsePrecio(plan.precio),
          priceCurrency: "CLP",
          availability: "https://schema.org/InStock",
          url: `${BASE_URL}/contratar/${plan.id}`,
        },
      },
    })),
  });
}

type FaqItem = { question: string; answer: string };

export function faqJsonLd(faqs: FaqItem[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  });
}
