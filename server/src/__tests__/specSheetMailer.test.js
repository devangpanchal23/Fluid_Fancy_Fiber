import test from "node:test";
import assert from "node:assert/strict";
import {
  sendSpecSheetEmail,
  sendEnquiryNotification,
  setTransporterForTesting,
  resetTransporterForTesting
} from "../utils/mailer.js";

test("sendSpecSheetEmail delivers to customer with Google Drive link", async () => {
  const sent = [];
  setTransporterForTesting({
    sendMail: async (opts) => {
      sent.push(opts);
      return { messageId: "mock-spec-1" };
    }
  });

  try {
    const enquiry = {
      email: "buyer@textile-mill.com",
      lineName: "Combed Organic Cotton"
    };

    await sendSpecSheetEmail(enquiry);

    assert.equal(sent.length, 1);
    const mail = sent[0];
    assert.equal(mail.to, "buyer@textile-mill.com");
    assert.match(mail.subject, /specification brochure/i);
    assert.match(mail.text, /https:\/\/drive\.google\.com\/file\/d\/1DZA2vWxAtDk6MavmxLi2nW2MRVPLQeBs\/view\?usp=sharing/);
    assert.match(mail.html, /https:\/\/drive\.google\.com\/file\/d\/1DZA2vWxAtDk6MavmxLi2nW2MRVPLQeBs\/view\?usp=sharing/);
    assert.match(mail.html, /Combed Organic Cotton/);
  } finally {
    resetTransporterForTesting();
  }
});

test("sendSpecSheetEmail escapes malicious input in lineName", async () => {
  const sent = [];
  setTransporterForTesting({
    sendMail: async (opts) => {
      sent.push(opts);
      return { messageId: "mock-spec-2" };
    }
  });

  try {
    const enquiry = {
      email: "safe@example.com",
      lineName: '<script>alert("xss")</script> & "special"'
    };

    await sendSpecSheetEmail(enquiry);

    assert.equal(sent.length, 1);
    const html = sent[0].html;
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("&amp;"));
    assert.ok(html.includes("&quot;special&quot;"));
  } finally {
    resetTransporterForTesting();
  }
});

test("sendSpecSheetEmail rejects non-HTTPS SPEC_SHEET_URL override", async () => {
  const origEnv = process.env.SPEC_SHEET_URL;
  process.env.SPEC_SHEET_URL = "http://insecure.example.com/spec.pdf";
  setTransporterForTesting({
    sendMail: async () => ({ messageId: "mock-spec-3" })
  });

  try {
    await assert.rejects(
      () => sendSpecSheetEmail({ email: "buyer@example.com", lineName: "Test" }),
      /must use HTTPS/
    );
  } finally {
    if (origEnv !== undefined) {
      process.env.SPEC_SHEET_URL = origEnv;
    } else {
      delete process.env.SPEC_SHEET_URL;
    }
    resetTransporterForTesting();
  }
});

test("sendEnquiryNotification sends internal notification without throwing on failure", async () => {
  setTransporterForTesting({
    sendMail: async () => {
      throw new Error("SMTP connection dropped");
    }
  });

  try {
    // Must not throw even when delivery fails
    await assert.doesNotReject(async () => {
      await sendEnquiryNotification({
        type: "spec",
        email: "visitor@example.com",
        lineName: "Cotton Luxe"
      });
    });
  } finally {
    resetTransporterForTesting();
  }
});
