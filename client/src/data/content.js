// Copy and structured content lifted directly from "Fluid Fibers Site.dc.html".
// Keep this file as the single source of truth for site copy.

export const NAV_ITEMS = [
  { label: "Catalogue", href: "#catalogue", num: "01" },
  { label: "Process", href: "#process", num: "02" },
  { label: "The mill", href: "#mill", num: "03" },
  { label: "People", href: "#people", num: "04" },
  { label: "Reviews", href: "#reviews", num: "05" },
  { label: "FAQ", href: "#faq", num: "06" },
  { label: "Contact", href: "#contact", num: "07" }
];

export const WHY_US = [
  {
    id: "consistency",
    title: "Batch-true consistency",
    body: "Every cone is matched against a reference sample, lot after lot, so nothing surprises you on the loom."
  },
  {
    id: "trace",
    title: "Full lot traceability",
    body: "Bale to beam, every stage is logged. Any cone you're running can be traced back to the exact bale."
  },
  {
    id: "sample",
    title: "48-hour sampling",
    body: "Physical samples of running counts dispatch within two working days of your enquiry, no exceptions."
  },
  {
    id: "export",
    title: "Export-ready paperwork",
    body: "Certificates of analysis, packing lists and export documentation prepared in-house, every shipment."
  }
];

export const STATS = [
  { target: 20, suffix: "+", label: "Years exporting" },
  { target: 11, suffix: "", label: "Production lines" },
  { target: 100, suffix: "%", label: "Lot traceability" },
  { target: 6, suffix: "", label: "Export markets" }
];

export const TICKER_WORDS = ["Mono", "Lino", "Cascet", "Slub", "Ready beam", "Dyed cone"];

export const LINES = [
  {
    id: "mono",
    name: "Mono Yarn",
    tag: "Premium synthetic",
    body: "Engineered for absolute uniformity and high tensile strength — built for technical textiles and fast processing speeds.",
    specs: [
      ["Composition", "100% Polyester"],
      ["Count range", "30s – 60s"],
      ["Application", "Warp & weft"]
    ],
    image: "mill"
  },
  {
    id: "lino",
    name: "Lino Yarn",
    tag: "Natural blend",
    body: "Linen's breathability with added durability — a shirting and luxury-apparel workhorse that holds its hand after washing.",
    specs: [
      ["Composition", "Linen / viscose"],
      ["Count range", "20s – 40s"],
      ["Application", "Luxury shirting"]
    ],
    image: "hero"
  },
  {
    id: "cascet",
    name: "Cascet Yarn",
    tag: "Specialty twist",
    body: "Core-spun construction giving elasticity under a natural sheath, for stretch denim and comfort knits.",
    specs: [
      ["Composition", "Core-spun blend"],
      ["Count range", "16s – 32s"],
      ["Application", "Stretch denim"]
    ],
    image: "mill"
  },
  {
    id: "slub",
    name: "Slub Yarn",
    tag: "Character count",
    body: "Controlled slub profiles programmed per metre, so the texture reads as intentional across the whole run.",
    specs: [
      ["Profile", "Programmed to brief"],
      ["Count range", "10s – 30s"],
      ["Application", "Fashion wovens"]
    ],
    image: "hero"
  },
  {
    id: "beam",
    name: "Ready Beam",
    tag: "Prepared warp",
    body: "Pre-warped beams to your loom's exact specification, cutting changeover time and beam-gaiting errors.",
    specs: [
      ["Width", "Up to 220 cm"],
      ["Ends", "Custom to order"],
      ["Delivery", "Direct to loom"]
    ],
    image: "mill"
  }
];

export const GALLERY = [
  { id: "gal-0", label: "Mono 40s", ref: "P/40", image: "mill" },
  { id: "gal-1", label: "Lino 30s", ref: "L/30", image: "hero" },
  { id: "gal-2", label: "Cascet 24s", ref: "C/24", image: "mill" },
  { id: "gal-3", label: "Slub 16s", ref: "S/16", image: "hero" },
  { id: "gal-4", label: "Dyed cones", ref: "D/XX", image: "mill" },
  { id: "gal-5", label: "Ready beam", ref: "B/220", image: "hero" }
];

export const STEPS = [
  { num: "01", title: "Fibre intake", body: "Bale-by-bale inspection for staple length, micronaire and trash before anything reaches the line." },
  { num: "02", title: "Blowroom & carding", body: "Opening and cleaning tuned per blend, with waste extraction logged against the lot." },
  { num: "03", title: "Ring spinning", body: "Eleven lines running to a fixed twist multiplier, checked hourly by the floor technician." },
  { num: "04", title: "Winding & clearing", body: "Electronic yarn clearers set per programme — thin places, thick places and neps cut to your tolerance." },
  { num: "05", title: "QC & dispatch", body: "Reference-cone matching, packing to your brief, and a certificate of analysis in the carton." }
];

export const CREDENTIALS = [
  "Uster-benchmarked count and twist testing on every lot",
  "ISO 9001-aligned quality procedures",
  "Named technician on each programme",
  "Certificate of analysis shipped with each order"
];

export const CASE_METRICS = [
  { v: "40t", k: "Programme volume" },
  { v: "0", k: "Shade rejections" },
  { v: "−18%", k: "Loom stops" }
];

export const PEOPLE = [
  {
    id: "team-0",
    name: "Meera Nair",
    role: "Managing partner",
    tag: "Partner",
    initials: "MN",
    bio: "Runs the mill floor and signs off every programme brief. Twenty years in ring spinning, most of it in quality.",
    links: [
      { label: "LinkedIn", href: "#" },
      { label: "meera@fluidfibers.com", href: "#contact" }
    ]
  },
  {
    id: "team-1",
    name: "Arjun Rao",
    role: "Co-partner, exports",
    tag: "Co-partner",
    initials: "AR",
    bio: "Handles quoting, documentation and shipping across six markets. Your first reply usually comes from him.",
    links: [
      { label: "LinkedIn", href: "#" },
      { label: "arjun@fluidfibers.com", href: "#contact" }
    ]
  },
  {
    id: "team-2",
    name: "Nisha Patel",
    role: "Social & community",
    tag: "Social media",
    initials: "NP",
    bio: "Posts the floor as it actually looks — lot photos, trial runs, shade cards. Message her anywhere and it reaches the mill.",
    links: [
      { label: "Instagram", href: "#" },
      { label: "WhatsApp", href: "#contact" }
    ]
  }
];

export const REVIEWS = [
  {
    text: "Three suppliers, three different 40s. Fluid was the only one whose second container matched the first — we stopped re-testing on arrival after the third lot.",
    name: "Lorenzo Bianchi",
    meta: "Head of weaving · Italy",
    initials: "LB",
    stars: 5
  },
  {
    text: "The core-spun programme let us drop a whole correction step. Loom stops fell by a fifth in the first quarter and nothing else changed on our side.",
    name: "Ayşe Demir",
    meta: "Production director · Türkiye",
    initials: "AD",
    stars: 5
  },
  {
    text: "They send the sample before we ask for it. That sounds small until you've waited two weeks for one somewhere else.",
    name: "Priya Raghavan",
    meta: "Sourcing lead · India",
    initials: "PR",
    stars: 4
  }
];

export const SHORT_REVIEWS = [
  { text: "Certificate of analysis in every carton. Our auditors love them.", name: "Miguel Costa", meta: "Porto, PT", stars: 5 },
  { text: "Twist held inside tolerance across a 40-tonne run. Verified it ourselves.", name: "Hannah Weber", meta: "Bremen, DE", stars: 5 },
  { text: "A named technician who answers the phone. Rare in this trade.", name: "Rahul Menon", meta: "Tiruppur, IN", stars: 5 },
  { text: "Ready beams arrived gaited exactly to our loom spec.", name: "Sofia Marchetti", meta: "Biella, IT", stars: 5 },
  { text: "Slub profile matched the brief metre for metre on the repeat order.", name: "Omar Haddad", meta: "Casablanca, MA", stars: 4 },
  { text: "Quoted in a day, sampled in two. The rest was just logistics.", name: "Elif Kaya", meta: "Bursa, TR", stars: 5 }
];

export const FAQS = [
  {
    q: "What is your minimum order?",
    a: "One tonne per count on running programmes, five tonnes on custom dye lots. Trial quantities below that are possible for a first order — we'd rather you test us at small scale."
  },
  {
    q: "How long does a sample take?",
    a: "Physical samples of running counts dispatch within 48 hours of the enquiry. Custom blends or programmed slub profiles take seven to ten working days including trial spinning."
  },
  {
    q: "Can you hold shade across repeat orders?",
    a: "Yes. We keep a reference cone per programme and match every subsequent lot against it, with the lot number logged at each stage so any drift is traceable to the bale."
  },
  {
    q: "Which markets do you export to?",
    a: "Six countries across Europe, the Middle East and South Asia. Export documentation, packing lists and certificates of analysis are prepared in-house."
  },
  {
    q: "Do you work to buyer specifications?",
    a: "Most of our volume is. Send the count, twist tolerance, clearer settings and packing brief; we'll confirm feasibility and quote against it within a working day."
  }
];

export const CONTACTS = [
  { label: "Technical desk", value: "sales@fluidfibers.com", sub: "Replies within one working day" },
  { label: "WhatsApp / phone", value: "+91 90000 00000", sub: "Mon–Sat, 9:00–18:00 IST" },
  { label: "Mill address", value: "Industrial Textile Zone", sub: "Manufacturing District, Global Hub" }
];

export const FOOTER_COLUMNS = [
  { title: "Catalogue", links: LINES.map((l) => ({ label: l.name, href: "#catalogue" })) },
  {
    title: "Company",
    links: [
      { label: "Process", href: "#process" },
      { label: "The mill", href: "#mill" },
      { label: "People", href: "#people" },
      { label: "Reviews", href: "#reviews" },
      { label: "FAQ", href: "#faq" }
    ]
  },
  {
    title: "Contact",
    links: [
      { label: "Enquiry form", href: "#contact" },
      { label: "sales@fluidfibers.com", href: "#contact" },
      { label: "+91 90000 00000", href: "#contact" }
    ]
  }
];
