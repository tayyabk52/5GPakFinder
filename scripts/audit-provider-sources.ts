import { SITE_DATASET } from "../src/data/siteDataset";

const jazzUrl = SITE_DATASET.providers.find((provider) => provider.name === "Jazz")!.sourceUrl;
const zongUrl = SITE_DATASET.providers.find((provider) => provider.name === "Zong")!.sourceUrl;
const ufoneUrl = SITE_DATASET.providers.find((provider) => provider.name === "Ufone / Onic")!.sourceUrl;

async function fetchText(url: string) {
  const response = await fetch(url, { headers: { "user-agent": "5GPak provider-source audit" } });
  return { response, text: await response.text() };
}

async function main() {
  const [jazz, zong, ufone] = await Promise.all([fetchText(jazzUrl), fetchText(zongUrl), fetchText(ufoneUrl)]);
  if (!jazz.response.ok) throw new Error(`Jazz source returned ${jazz.response.status}`);
  if (!zong.response.ok) throw new Error(`Zong source returned ${zong.response.status}`);

  const jazzPoints = [...jazz.text.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/gi)].filter((match) => /<Point\b/i.test(match[0])).length;
  const locsMatch = zong.text.match(/(?:const|var|let)\s+LOCS\s*=\s*\[([\s\S]*?)\];/);
  if (!locsMatch) throw new Error("Could not find Zong LOCS array");
  const zongRecords = (locsMatch[1].match(/\{\s*lat\s*:/g) ?? []).length;
  const jazzExpected = SITE_DATASET.providers.find((provider) => provider.name === "Jazz")!.count;
  const zongExpected = SITE_DATASET.providers.find((provider) => provider.name === "Zong")!.count;

  console.log(`Jazz KML Point placemarks: ${jazzPoints} (release: ${jazzExpected})`);
  console.log(`Zong LOCS records: ${zongRecords} (release: ${zongExpected})`);
  console.log(`Ufone source status: ${ufone.response.status} ${ufone.response.statusText}`);

  if (jazzPoints !== jazzExpected || zongRecords !== zongExpected) {
    throw new Error("Provider source counts changed. Review the source and rebuild the dataset before publishing new counts.");
  }
  if (!ufone.response.ok) console.warn("Ufone source is unavailable. Keep the dated snapshot limitation visible until an official replacement is verified.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
