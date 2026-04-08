import { algoliasearch } from "algoliasearch";

const client = algoliasearch("6POL09V9CE", "e5dc18776a79d159ffeddd55280227fc");

// Fetch and index objects in Algolia
const BASE_URL = "http://localhost:5009";
const INDEX_NAME = "portfolio_search";

const processRecords = async () => {
  console.log(`Connecting to APIs at ${BASE_URL}...`);

  // 1. Fetch Portfolios
  const portfoliosRes = await fetch(`${BASE_URL}/api/portfolios`);
  const portfolios = await portfoliosRes.json();

  // 2. Fetch Experiences (from /api/about)
  const aboutRes = await fetch(`${BASE_URL}/api/about`);
  const aboutData = await aboutRes.json();
  const experiences = aboutData.experiences || [];

  // 3. Fetch Tags
  const tagsRes = await fetch(`${BASE_URL}/api/tags`);
  const tags = await tagsRes.json();

  console.log(
    `Found ${portfolios.length} portfolios, ${experiences.length} experiences, and ${tags.length} tags.`
  );

  const records = [];

  // Map Portfolios
  portfolios.forEach((p) => {
    records.push({
      objectID: `portfolio-${p.id}`,
      id: p.id,
      type: "portfolio",
      title: p.title,
      description: p.description,
      tags: (p.Tag || []).map((t) => t.name),
      company: p.Experience?.company || "",
      role: p.Experience?.role || "",
      image:
        (p.PortfolioImage || []).find((img) => img.isLogo)?.url ||
        p.PortfolioImage?.[0]?.url ||
        "",
      url: `/portfolio/${p.id}`,
    });
  });

  // Map Experiences
  experiences.forEach((e) => {
    records.push({
      objectID: `experience-${e.id}`,
      id: e.id,
      type: "experience",
      title: `${e.role} at ${e.company}`,
      description: Array.isArray(e.description)
        ? e.description.join(" ")
        : e.description || "",
      tags: (e.Skill || []).map((s) => s.name),
      company: e.company,
      role: e.role,
      url: `/experience/${e.id}`,
    });
  });

  // Map Tags
  tags.forEach((t) => {
    records.push({
      objectID: `tag-${t.id}`,
      id: t.id,
      type: "tag",
      title: t.name,
      description: `Browse all projects tagged with ${t.name}`,
      tags: [t.name],
      url: `/portfolio?tag=${encodeURIComponent(t.name)}`,
    });
  });

  console.log(`Indexing ${records.length} records to '${INDEX_NAME}'...`);
  return await client.saveObjects({ indexName: INDEX_NAME, objects: records });
};

processRecords()
  .then(() => console.log(`Successfully indexed objects to "${INDEX_NAME}"!`))
  .catch((err) => {
    console.error("Error during indexing:");
    console.error(err);
    console.error(
      '\nTips: Make sure "npm run dev" is running at http://localhost:5009'
    );
  });
