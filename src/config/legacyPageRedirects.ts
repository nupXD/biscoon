/**
 * Old thin category pages were folded into parent pages with ?subcategory=.
 * Keep 301s so bookmarks and external links still resolve.
 */
export const LEGACY_PAGE_REDIRECTS: Record<string, string> = {
  '/pages/community/art.html': '/pages/community/events.html?subcategory=art',
  '/pages/community/jyotish.html': '/pages/community/events.html?subcategory=jyotish',
  '/pages/community/literature.html': '/pages/community/events.html?subcategory=literature',
  '/pages/community/matchmaker.html': '/pages/community/events.html?subcategory=matchmaker',
  '/pages/community/matrimony.html': '/pages/community/events.html?subcategory=matrimony',
  '/pages/community/music.html': '/pages/community/events.html?subcategory=music',
  '/pages/community/pen-pals.html': '/pages/community/events.html?subcategory=pen-pals',
  '/pages/community/sports.html': '/pages/community/events.html?subcategory=sports',
  '/pages/community/travel.html': '/pages/community/events.html?subcategory=travel',
  '/pages/community/yoga.html': '/pages/community/events.html?subcategory=yoga',
  '/pages/housing/moving.html': '/pages/housing/housing.html?subcategory=moving',
  '/pages/jobs/ai-services.html': '/pages/jobs/jobs.html?subcategory=ai-services',
  '/pages/jobs/cpa.html': '/pages/jobs/jobs.html?subcategory=cpa',
  '/pages/jobs/education.html': '/pages/jobs/jobs.html?subcategory=education',
  '/pages/jobs/finance.html': '/pages/jobs/jobs.html?subcategory=finance',
  '/pages/jobs/healthcare.html': '/pages/jobs/jobs.html?subcategory=healthcare',
  '/pages/jobs/insurance.html': '/pages/jobs/jobs.html?subcategory=insurance',
  '/pages/jobs/legal.html': '/pages/jobs/jobs.html?subcategory=legal',
  '/pages/jobs/tech.html': '/pages/jobs/jobs.html?subcategory=tech',
  '/pages/jobs/tutoring.html': '/pages/jobs/jobs.html?subcategory=tutoring',
  '/pages/marketplace/auto.html': '/pages/marketplace/services.html?subcategory=auto',
  '/pages/marketplace/beauty.html': '/pages/marketplace/services.html?subcategory=beauty',
  '/pages/marketplace/business-for-sale.html': '/pages/marketplace/kinbech.html?subcategory=business-for-sale',
  '/pages/marketplace/childcare.html': '/pages/marketplace/services.html?subcategory=childcare',
  '/pages/marketplace/cleaning.html': '/pages/marketplace/services.html?subcategory=cleaning',
  '/pages/marketplace/produce.html': '/pages/marketplace/kinbech.html?subcategory=produce',
  '/pages/marketplace/shops.html': '/pages/marketplace/kinbech.html?subcategory=shops',
  '/pages/marketplace/translation.html': '/pages/marketplace/services.html?subcategory=translation',
};
