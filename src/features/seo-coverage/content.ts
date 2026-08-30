export type CoverageGuide = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ title: string; paragraphs: string[]; checks?: string[] }>;
  questions: Array<{ question: string; answer: string }>;
  sources: Array<{ label: string; href: string }>;
};

export const COVERAGE_GUIDES: CoverageGuide[] = [
  {
    slug: "how-to-check-5g-coverage-pakistan",
    title: "How to Check 5G Coverage in Pakistan",
    description: "Check Jazz, Zong and Ufone 5G site records near an exact Pakistan location, then verify handset, settings and operator eligibility.",
    eyebrow: "Practical coverage guide",
    intro: "A city-wide availability claim is not precise enough. Search the street, neighbourhood, workplace or landmark where you will actually use 5G, inspect the provider record, and then confirm the remaining requirements on your phone.",
    sections: [
      {
        title: "Check the exact location",
        paragraphs: ["Open the 5GPak map, search your area, and filter to the operator you use. A nearby point is evidence of a provider-published site record, not a prediction of signal inside your building."],
        checks: ["Search a precise landmark or neighbourhood.", "Filter Jazz, Zong and Ufone / Onic separately.", "Open the marker and review its source and accuracy note.", "Test where you normally use the phone, both indoors and outdoors."],
      },
      {
        title: "Confirm the phone and account",
        paragraphs: ["Check the exact handset model against the operator's compatibility information. Regional variants can differ. Also confirm that 5G is enabled, the software is current, and your SIM or account is eligible."],
      },
      {
        title: "Kya mere area mein 5G available hai?",
        paragraphs: ["Map par apna exact area search karein. Qareebi site record useful evidence hai, lekin indoor signal ya guaranteed speed ka wada nahin. Apne operator aur exact handset model se bhi tasdeeq karein."],
      },
    ],
    questions: [
      { question: "Does a nearby site guarantee 5G?", answer: "No. Buildings, terrain, antenna direction, spectrum, maintenance, congestion, handset support and account eligibility can all affect service." },
      { question: "Can I compare operators using record totals?", answer: "You can compare the records in this dated release, but the totals are not a ranking of signal quality, speed, population coverage or current live sites." },
    ],
    sources: [
      { label: "Jazz compatible 5G handsets", href: "https://jazz.com.pk/5g-handsets" },
      { label: "Zong compatible 5G smartphones", href: "https://www.zong.com.pk/vas/compatible-5g-smartphones--handsets" },
      { label: "Zong device setup guide", href: "https://www.zong.com.pk/vas/how-to-enable-5g-on-your-device" },
    ],
  },
  {
    slug: "why-5g-is-not-showing-pakistan",
    title: "Why 5G Is Not Showing on Your Phone in Pakistan",
    description: "Troubleshoot missing 5G in Pakistan by checking mapped sites, handset variants, settings, SIM eligibility and local signal conditions.",
    eyebrow: "5G troubleshooting",
    intro: "Seeing a 5G site near you does not mean every phone will immediately display 5G. Work through location, handset, settings and operator eligibility in that order so you can isolate the likely cause.",
    sections: [
      {
        title: "Start with local availability",
        paragraphs: ["Search the exact place on the map and filter to your operator. If the nearest published record is far away, location is the first likely constraint. If it is nearby, continue with the device checks."],
      },
      {
        title: "Check the exact model and settings",
        paragraphs: ["Confirm the full model number, not only the marketing name. Enable 5G or 5G Auto, install current carrier and system updates, and restart the connection after changing settings."],
        checks: ["Exact model appears on the operator compatibility list.", "5G or 5G Auto is enabled.", "Software and carrier settings are current.", "The operator confirms SIM, plan and account eligibility."],
      },
      {
        title: "Mere phone par 5G kyun nahin aa raha?",
        paragraphs: ["Pehle exact location aur network ka site record check karein. Phir phone ka poora model number, 5G setting, software update, SIM aur package eligibility operator se confirm karein."],
      },
    ],
    questions: [
      { question: "Can indoor coverage differ from outdoors?", answer: "Yes. Building materials and room position can change reception, so compare outdoors and indoors at the same location." },
      { question: "Is a speed test enough to prove 5G coverage?", answer: "No. A speed result describes one device, place and moment. Check the network indicator and retain the test context." },
    ],
    sources: [
      { label: "Jazz compatible 5G handsets", href: "https://jazz.com.pk/5g-handsets" },
      { label: "Zong device setup guide", href: "https://www.zong.com.pk/vas/how-to-enable-5g-on-your-device" },
    ],
  },
  {
    slug: "5g-phone-compatibility-pakistan",
    title: "5G Phone Compatibility in Pakistan",
    description: "Check whether an exact phone model can use 5G in Pakistan and understand why model variants, software and operator support matter.",
    eyebrow: "Device compatibility guide",
    intro: "A phone sold as 5G-ready is not automatically compatible with every Pakistan operator configuration. The exact model variant, supported radio bands, software and operator provisioning all matter.",
    sections: [
      {
        title: "Use the exact model number",
        paragraphs: ["Find the model number in the phone settings or packaging and compare it with official operator compatibility information. Devices with the same retail name can have different regional radio support."],
      },
      {
        title: "Compatibility is only one requirement",
        paragraphs: ["A compatible phone still needs local service, correct settings, current software and an eligible operator account. Use the map for location evidence and the operator for account confirmation."],
        checks: ["Exact model variant is supported.", "5G is enabled in network settings.", "Software is current.", "A provider-published site record exists near the intended location.", "The operator confirms account eligibility."],
      },
      {
        title: "Pakistan mein mera phone 5G support karta hai?",
        paragraphs: ["Sirf phone ka naam check na karein. Settings se exact model number nikaal kar operator ki official list se match karein, aur SIM, software aur location bhi verify karein."],
      },
    ],
    questions: [
      { question: "Does importing a 5G phone create compatibility risk?", answer: "It can. Regional variants may support different bands or carrier configurations, so verify the exact model rather than assuming from the product name." },
      { question: "Does 5GPak certify compatible phones?", answer: "No. 5GPak links to operator information and explains the checks; the mobile operator must confirm current device and account support." },
    ],
    sources: [
      { label: "Jazz compatible 5G handsets", href: "https://jazz.com.pk/5g-handsets" },
      { label: "Zong compatible 5G smartphones", href: "https://www.zong.com.pk/vas/compatible-5g-smartphones--handsets" },
    ],
  },
];

export function getCoverageGuide(slug: string) {
  return COVERAGE_GUIDES.find((guide) => guide.slug === slug) ?? null;
}
