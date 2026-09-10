const { readJob } = require("../src/detector");

const load = (html, url = "https://www.linkedin.com/jobs/view/123") => {
  document.documentElement.innerHTML = html;
  const parsed = new URL(url);
  delete window.location;
  window.location = { href: url, hostname: parsed.hostname };
};

const jsonLd = (posting) =>
  `<head><script type="application/ld+json">${JSON.stringify(posting)}</script></head><body></body>`;

describe("readJob via JSON-LD", () => {
  test("reads a complete JobPosting", () => {
    load(jsonLd({
      "@type": "JobPosting",
      title: "Senior Backend Engineer",
      datePosted: "2026-09-01",
      hiringOrganization: { name: "Paymob" },
      jobLocation: { address: { addressLocality: "Cairo", addressCountry: "Egypt" } },
      description: "<p>Build <b>APIs</b></p>",
    }));
    expect(readJob()).toMatchObject({
      title: "Senior Backend Engineer",
      company: "Paymob",
      location: "Cairo, Egypt",
      description: "Build APIs",
      postedAt: "2026-09-01",
      via: "json-ld",
      board: "linkedin",
      detected: true,
    });
  });

  test("finds the posting inside an @graph wrapper", () => {
    load(jsonLd({ "@graph": [{ "@type": "WebSite" }, { "@type": "JobPosting", title: "QA Engineer" }] }));
    expect(readJob()).toMatchObject({ title: "QA Engineer", via: "json-ld" });
  });

  test("handles an array of JSON-LD blocks", () => {
    load(jsonLd([{ "@type": "Organization" }, { "@type": "JobPosting", title: "Data Analyst" }]));
    expect(readJob()).toMatchObject({ title: "Data Analyst", via: "json-ld" });
  });

  test("resolves a nested addressCountry object", () => {
    load(jsonLd({
      "@type": "JobPosting",
      title: "DevOps Engineer",
      jobLocation: [{ address: { addressLocality: "Dubai", addressCountry: { name: "UAE" } } }],
    }));
    expect(readJob().location).toBe("Dubai, UAE");
  });

  test("ignores malformed JSON and falls back to selectors", () => {
    load('<head><script type="application/ld+json">{not json</script></head><body><h1>Product Manager</h1></body>');
    expect(readJob()).toMatchObject({ title: "Product Manager", via: "selectors" });
  });
});

describe("readJob via selectors", () => {
  test("uses the LinkedIn pack", () => {
    load(`<body>
      <h1 class="job-details-jobs-unified-top-card__job-title">Frontend Developer</h1>
      <div class="job-details-jobs-unified-top-card__company-name">Instabug</div>
      <div id="job-details">Build UI</div>
    </body>`);
    expect(readJob()).toMatchObject({
      title: "Frontend Developer", company: "Instabug", via: "selectors", detected: true,
    });
  });

  test("falls back to the default pack on an unknown host", () => {
    load("<body><h1>Accountant</h1><main>Ledgers</main></body>", "https://example.com/jobs/9");
    expect(readJob()).toMatchObject({ title: "Accountant", board: "example", detected: true });
  });

  test("reports not-detected on a page with no job", () => {
    load("<body><p>nothing here</p></body>");
    expect(readJob().detected).toBe(false);
  });
});

describe("payload safety", () => {
  test("caps a very long description", () => {
    load(jsonLd({ "@type": "JobPosting", title: "Engineer", description: "x".repeat(60000) }));
    expect(readJob().description.length).toBeLessThanOrEqual(40000);
  });

  test("always carries the page url", () => {
    load(jsonLd({ "@type": "JobPosting", title: "Engineer" }), "https://wuzzuf.net/jobs/p/42");
    expect(readJob()).toMatchObject({ url: "https://wuzzuf.net/jobs/p/42", board: "wuzzuf" });
  });
});
