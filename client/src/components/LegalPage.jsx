import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <main className="ff-section" style={{ minHeight: "70vh" }}>
      <div className="ff-container" style={{ maxWidth: 900 }}>
        <div className="ff-kicker">Fluid Fancy Fibre</div>
        <h1 className="ff-heading">Privacy notice</h1>
        <p className="ff-lede">Last updated: October 15, 2026</p>
        <h2>Information you send us</h2>
        <p>When you contact us or request a specification brochure, we receive the details you enter, such as your name, company, email address, product interest and message. We use those details to reply, prepare quotations and send requested product information.</p>
        <h2>How information is handled</h2>
        <p>Enquiries are stored in our MongoDB Atlas database. Website hosting and delivery are provided through Vercel. If you request a brochure, your email address is used by our email provider to deliver the brochure link. We do not sell enquiry details.</p>
        <h2>Site measurement and security</h2>
        <p>We use Vercel Analytics for website performance and usage measurement. The admin area uses a secure session cookie for sign-in. We use submitted details only for the purposes described above and for related business records.</p>
        <h2>Your request</h2>
        <p>To ask about, correct or request removal of an enquiry, email <a href="mailto:fluidfancyenterprisepvtltd@gmail.com">fluidfancyenterprisepvtltd@gmail.com</a>. Some records may need to be retained where required for business or legal obligations.</p>
        <p><Link to="/">Return to the website</Link></p>
      </div>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="ff-section" style={{ minHeight: "70vh" }}>
      <div className="ff-container" style={{ maxWidth: 900 }}>
        <div className="ff-kicker">Fluid Fancy Fibre</div>
        <h1 className="ff-heading">Website terms</h1>
        <p className="ff-lede">Last updated: October 15, 2026</p>
        <h2>Product information and quotations</h2>
        <p>Website content is general product information. Specifications, availability, samples, prices and delivery details are confirmed by our team for each enquiry. A quotation or order is binding only when confirmed in writing by Fluid Fancy Fibre LLP.</p>
        <h2>Using this website</h2>
        <p>Please use the website lawfully and provide accurate contact details when sending an enquiry. Do not attempt to access the admin area or disrupt the website.</p>
        <h2>External links and content</h2>
        <p>Some links, including the brochure link, open services operated by other providers. Their content and privacy practices are managed by those providers. Website text, photographs and brand materials belong to Fluid Fancy Fibre LLP or their respective owners.</p>
        <h2>Contact</h2>
        <p>Questions about these terms can be sent to <a href="mailto:fluidfancyenterprisepvtltd@gmail.com">fluidfancyenterprisepvtltd@gmail.com</a>.</p>
        <p><Link to="/">Return to the website</Link></p>
      </div>
    </main>
  );
}
