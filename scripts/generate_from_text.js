import { generatePdf } from './pdf_generator.js';
import path from 'path';

// Manually constructed CV data based on the provided plain‑text CV
const cvData = {
  name: 'Alex Taylor',
  title: 'Product Leader',
  email: 'alex.taylor@example.com',
  phone: '+61 400 000 000',
  linkedin: 'linkedin.com/in/alex-taylor',
  summary: `Executive Product Leader with 10+ years shipping B2B fintech and SaaS products across APAC in payments and credit.`,
  experience: [
    {
      role: 'Co-founder & Head of Product',
      company: 'Foundation (Fintech Infrastructure)',
      period: 'Mar 2024 – Present',
      location: 'Remote',
      bullets: [
        'Built a stablecoin from the ground up — grew TVL to $20M and 5k MAU in under a year',
        'Designed the yield architecture across money markets and lending venues, managing collateral allocation and peg stability across multiple liquidity pools',
        'Ran liquidity operations end-to-end: redemptions, rebalancing, and keeping the peg intact under real market conditions',
        'Took the product into payment rails — established card partnerships with Diners Club Singapore and Visa and Mastercard affiliated partners'
      ]
    },
    {
      role: 'Product Lead',
      company: 'Spenmo YC S20 (Fintech SaaS)',
      period: 'Nov 2021 – Jul 2022',
      location: 'Singapore',
      bullets: [
        'Led the 0 to 1 credit product, working through the lending framework and converting debit clients onto credit',
        'Rolled out Mixpanel across all squads, introduced Braze for lifecycle marketing and established feature flags and A/B testing org‑wide',
        'Scaled the product function by hiring and onboarding PMs, setting analytics standards and building operating rhythms that stuck'
      ]
    },
    {
      role: 'Co‑founder & Head of Product',
      company: 'Dirac AI',
      period: 'Oct 2020 – Sep 2021',
      location: 'Singapore',
      bullets: [
        'Built a B2B sales intelligence platform in APAC competing with tools like Gong and Chorus',
        'Led product and GTM strategy end to end and launched successful pilots with YC startups including Volopay'
      ]
    },
    {
      role: 'Head of Product',
      company: 'Empala, Antler SG4 (Fintech / Lending)',
      period: 'Mar 2020 – Sep 2021',
      location: 'Singapore',
      bullets: [
        "Took a wage access product from zero through discovery, regulatory clearance, payroll partner integrations and full launch in market"
      ]
    },
    {
      role: 'Director of Product',
      company: 'Vincere (B2B SaaS / HR Tech)',
      period: 'Jul 2019 – Feb 2020',
      location: 'Vietnam',
      bullets: [
        'Led global product strategy for a B2B SaaS ATS platform serving recruitment firms managing multiple end‑client relationships',
        'Owned the full roadmap reporting directly to the CEO and board with visibility across all product decisions',
        'Managed a cross‑functional team of 20 across product and engineering and drove delivery across multiple product lines',
        'Pushed the product from reactive feature work into a more structured roadmap and discovery process'
      ]
    },
    {
      role: 'Founder & Head of Product',
      company: 'Answerbuddy',
      period: 'Jan 2018 – Jun 2019',
      location: 'Remote / Vietnam',
      bullets: [
        'Founded a conversational AI startup building dialogue agents and chatbots before the mainstream transformer era',
        'Closed enterprise contracts including Oppo delivering customer support automation at scale'
      ]
    },
    {
      role: 'Senior Product Owner',
      company: 'Navigos / En‑Japan (HR Tech)',
      period: 'Aug 2017 – Jul 2019',
      location: 'Vietnam',
      bullets: [
        'Built and launched 3 products from scratch for En‑Japan\'s Vietnam portfolio',
        'Cut time to market from 12 to 3 months, saved $150K per initiative and grew revenue 25% across launches',
        'Led a cross‑functional team through full product cycles from discovery through to release'
      ]
    },
    {
      role: 'Product Manager',
      company: 'Paymentwall (Global Payments)',
      period: 'Aug 2014 – Jun 2017',
      location: 'Vietnam',
      bullets: [
        'Managed integrations with regional payment methods across APAC and scaled global payment infrastructure',
        'Worked closely with local payment partners across the region to support merchant growth'
      ]
    }
  ],
  // optional additional fields can be added here
  generatedAt: new Date().toISOString()
};

(async () => {
  const fileName = `Sample_CV_${Date.now()}.pdf`;
  const outputPath = path.resolve('data/generated', fileName);
  await generatePdf(cvData, outputPath);
  console.log('PDF generated at', outputPath);
})();
