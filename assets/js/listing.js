let listingApiBase = window.location.origin || 'http://localhost:4000';
if (listingApiBase.startsWith('file://')) {
  listingApiBase = 'http://localhost:4000';
}

let editingListingImages = [];
const DEFAULT_LISTING_IMAGE_LIMIT = 6;
const PHOTOGRAPHY_LISTING_IMAGE_LIMIT = 12;
let myListingsCache = [];
let myListingsView = localStorage.getItem('biscoonListingView') || 'grid';
let myListingsQuery = '';
let myListingsSort = 'newest';

function normalizeListingCategory(category) {
  const aliases = {
    pg: 'paying-guest',
    rojgar: 'jobs',
    students: 'student',
    realestate: 'real-estate',
  };
  return aliases[category] || category || '';
}

const SPECIFIC_TYPE_TO_CATEGORY = {
  tech: 'jobs',
  healthcare: 'jobs',
  insurance: 'jobs',
  cpa: 'jobs',
  legal: 'jobs',
  finance: 'jobs',
  education: 'jobs',
  student: 'jobs',
  tutoring: 'jobs',
  'ai-services': 'jobs',
  immigration: 'jobs',
  'paying-guest': 'housing',
  'real-estate': 'housing',
  moving: 'housing',
  kinbech: 'marketplace',
  services: 'marketplace',
  restaurants: 'marketplace',
  shops: 'marketplace',
  childcare: 'marketplace',
  beauty: 'marketplace',
  auto: 'marketplace',
  cleaning: 'marketplace',
  produce: 'marketplace',
  'business-for-sale': 'marketplace',
  translation: 'marketplace',
  organizations: 'community',
  events: 'community',
  literature: 'community',
  music: 'community',
  art: 'community',
  sports: 'community',
  yoga: 'community',
  jyotish: 'community',
  matchmaker: 'community',
  matrimony: 'community',
  'pen-pals': 'community',
  travel: 'community',
};

function getCategoryAndSpecificType(value) {
  const normalized = normalizeListingCategory(value);
  const category = SPECIFIC_TYPE_TO_CATEGORY[normalized] || normalized;
  return {
    category,
    subcategory: category === normalized ? '' : normalized,
  };
}

function getSelectedListingCategory() {
  return normalizeListingCategory(document.getElementById('category')?.value || '');
}

function getMaxListingImages(category = getSelectedListingCategory()) {
  return category === 'photography' ? PHOTOGRAPHY_LISTING_IMAGE_LIMIT : DEFAULT_LISTING_IMAGE_LIMIT;
}

function isPhotographyOnlyMode() {
  return new URLSearchParams(window.location.search).get('category') === 'photography';
}

const CATEGORY_FIELD_PRESETS = {
  jobs: {
    subcategoryPlaceholder: 'e.g. tech, healthcare, tutoring, immigration',
    availabilityPlaceholder: 'e.g. Starts immediately, weekdays, night shift',
    subcategories: ['general', 'tech', 'healthcare', 'education', 'student', 'tutoring', 'ai-services', 'finance', 'cpa', 'insurance', 'legal', 'immigration'],
    availability: ['Starts immediately', 'Weekdays', 'Weekends', 'Evening shift', 'Night shift', 'Flexible start'],
  },
  tech: {
    subcategoryPlaceholder: 'e.g. web development, IT support, QA, DevOps',
    availabilityPlaceholder: 'e.g. Remote, contract, starts this month',
    subcategories: ['web development', 'mobile app', 'IT support', 'QA testing', 'DevOps', 'data/AI', 'cybersecurity'],
    availability: ['Remote', 'Hybrid', 'Contract', 'Part-time', 'Starts this month', 'Flexible schedule'],
  },
  healthcare: {
    subcategoryPlaceholder: 'e.g. caregiver, clinic, nursing, home health',
    availabilityPlaceholder: 'e.g. Day shift, overnight, weekends',
    subcategories: ['caregiver', 'home health', 'clinic', 'nursing', 'pharmacy', 'dental', 'medical assistant'],
    availability: ['Day shift', 'Evening shift', 'Overnight', 'Weekends', 'On call', 'Immediate opening'],
  },
  housing: {
    subcategoryPlaceholder: 'e.g. room, apartment, paying-guest, real-estate',
    availabilityPlaceholder: 'e.g. Available now, June 1, month-to-month',
    subcategories: ['room', 'apartment', 'roommate', 'studio', 'sublet', 'paying-guest', 'real-estate', 'moving'],
    availability: ['Available now', 'Available this week', 'Available June 1', 'Month-to-month', 'Long-term', 'Short-term'],
  },
  'paying-guest': {
    subcategoryPlaceholder: 'e.g. free PG, paid PG, family host, student',
    availabilityPlaceholder: 'e.g. Available now, temporary, meals included',
    subcategories: ['free PG', 'paid PG', 'family host', 'student PG', 'female only', 'male only', 'with meals'],
    availability: ['Available now', 'Temporary stay', 'Long-term', 'Meals included', 'Weekdays only', 'Flexible'],
  },
  'real-estate': {
    subcategoryPlaceholder: 'e.g. house sale, condo, land, rental property',
    availabilityPlaceholder: 'e.g. Showing this weekend, move-in ready',
    subcategories: ['house sale', 'condo', 'land', 'rental property', 'commercial', 'open house', 'agent listing'],
    availability: ['Move-in ready', 'Showing this weekend', 'By appointment', 'Closing flexible', 'Available this month'],
  },
  services: {
    subcategoryPlaceholder: 'e.g. cleaning, repair, tutoring, catering',
    availabilityPlaceholder: 'e.g. Weekends, same day, by appointment',
    subcategories: ['cleaning', 'handyman', 'tutoring', 'catering', 'delivery', 'beauty', 'translation', 'tax help'],
    availability: ['Same day', 'Weekends', 'Evenings', 'By appointment', 'Emergency service', 'Flexible'],
  },
  cleaning: {
    subcategoryPlaceholder: 'e.g. home cleaning, office, move-out, deep clean',
    availabilityPlaceholder: 'e.g. Same day, weekly, weekends',
    subcategories: ['home cleaning', 'office cleaning', 'move-out cleaning', 'deep clean', 'laundry', 'carpet cleaning'],
    availability: ['Same day', 'Weekly', 'Biweekly', 'Weekends', 'Morning slots', 'Evening slots'],
  },
  photography: {
    subcategoryPlaceholder: 'e.g. wedding, cultural event, portrait, videography',
    availabilityPlaceholder: 'Not used for photography showcase posts',
    subcategories: [
      'wedding',
      'cultural',
      'portrait',
      'headshot',
      'family',
      'commercial',
      'product',
      'real estate',
      'video',
      'editing',
      'ai',
    ],
    availability: [
      'Available now',
      'Weekends',
      'Evenings',
      'Photo series',
      'Creative edit',
      'Original work',
      'Cultural moment',
      'Outdoor session',
    ],
  },
  restaurants: {
    subcategoryPlaceholder: 'e.g. momo, catering, buffet, tiffin',
    availabilityPlaceholder: 'e.g. Open daily, lunch only, preorder',
    subcategories: ['momo', 'catering', 'tiffin', 'buffet', 'restaurant', 'home kitchen', 'delivery'],
    availability: ['Open daily', 'Lunch only', 'Dinner only', 'Preorder', 'Weekend special', 'Delivery available'],
  },
  kinbech: {
    subcategoryPlaceholder: 'e.g. furniture, electronics, car, clothing',
    availabilityPlaceholder: 'e.g. Pickup today, delivery available',
    subcategories: ['furniture', 'electronics', 'vehicle', 'clothing', 'appliance', 'books', 'moving sale'],
    availability: ['Pickup today', 'Pickup this week', 'Delivery available', 'Meetup only', 'First come first served'],
  },
  auto: {
    subcategoryPlaceholder: 'e.g. car sale, ride, mechanic, insurance',
    availabilityPlaceholder: 'e.g. Available now, weekends, by appointment',
    subcategories: ['car sale', 'ride share', 'airport ride', 'mechanic', 'auto insurance', 'driving lesson'],
    availability: ['Available now', 'Weekends', 'By appointment', 'Airport pickup', 'Local rides', 'Flexible'],
  },
  events: {
    subcategoryPlaceholder: 'e.g. concert, puja, meetup, fundraiser',
    availabilityPlaceholder: 'e.g. May 25, weekend, RSVP required',
    subcategories: ['concert', 'puja', 'meetup', 'fundraiser', 'class', 'festival', 'networking'],
    availability: ['This weekend', 'Next weekend', 'RSVP required', 'Walk-ins welcome', 'One-day event', 'Recurring'],
  },
  education: {
    subcategoryPlaceholder: 'e.g. tutoring, test prep, college help',
    availabilityPlaceholder: 'e.g. After school, online, weekends',
    subcategories: ['tutoring', 'test prep', 'college help', 'language class', 'music lesson', 'online class'],
    availability: ['Online', 'After school', 'Weekends', 'Evenings', 'Summer sessions', 'Flexible'],
  },
  tutoring: {
    subcategoryPlaceholder: 'e.g. math, science, English, SAT, coding',
    availabilityPlaceholder: 'e.g. Online, evenings, weekends',
    subcategories: ['math', 'science', 'English', 'SAT', 'coding', 'Nepali language', 'homework help'],
    availability: ['Online', 'In person', 'Evenings', 'Weekends', 'After school', 'Flexible'],
  },
  legal: {
    subcategoryPlaceholder: 'e.g. immigration, family, business, notary',
    availabilityPlaceholder: 'e.g. Consultation available, appointment only',
    subcategories: ['immigration', 'family law', 'business law', 'notary', 'contract review', 'consultation'],
    availability: ['Appointment only', 'Consultation available', 'Virtual meeting', 'Weekend slots', 'Urgent cases'],
  },
  immigration: {
    subcategoryPlaceholder: 'e.g. TPS, asylum, green card, visa',
    availabilityPlaceholder: 'e.g. Free consultation, appointment only',
    subcategories: ['TPS', 'asylum', 'green card', 'visa', 'citizenship', 'work permit', 'consultation'],
    availability: ['Free consultation', 'Appointment only', 'Virtual meeting', 'Urgent help', 'Weekend slots'],
  },
  cpa: {
    subcategoryPlaceholder: 'e.g. tax filing, bookkeeping, payroll',
    availabilityPlaceholder: 'e.g. Tax season, appointment only, remote',
    subcategories: ['tax filing', 'bookkeeping', 'payroll', 'business setup', 'audit help', 'consultation'],
    availability: ['Tax season', 'Appointment only', 'Remote', 'Weekend slots', 'Year-round'],
  },
  community: {
    subcategoryPlaceholder: 'e.g. organizations, events, music, matrimony',
    availabilityPlaceholder: 'e.g. Ongoing, this weekend, RSVP required',
    subcategories: ['organizations', 'events', 'literature', 'music', 'art', 'sports', 'yoga', 'jyotish', 'matchmaker', 'matrimony', 'pen-pals', 'travel'],
    availability: ['Ongoing', 'This weekend', 'Monthly', 'RSVP required', 'Open to all'],
  },
};

CATEGORY_FIELD_PRESETS.marketplace = {
  subcategoryPlaceholder: 'e.g. kinbech, restaurants, cleaning, auto',
  availabilityPlaceholder: 'e.g. Pickup today, open daily, by appointment',
  subcategories: ['kinbech', 'restaurants', 'shops', 'services', 'cleaning', 'childcare', 'beauty', 'auto', 'produce', 'business-for-sale', 'translation'],
  availability: ['Available now', 'Pickup today', 'Delivery available', 'By appointment', 'Open daily', 'Weekends', 'Flexible'],
};

const DEFAULT_FIELD_PRESET = {
  subcategoryPlaceholder: 'e.g. jobs, housing, services, event',
  availabilityPlaceholder: 'e.g. Available now, weekends, starts June 1',
  subcategories: ['room', 'apartment', 'full-time', 'part-time', 'remote', 'cleaning', 'tutoring', 'translation', 'catering', 'event', 'sale'],
  availability: ['Available now', 'This week', 'Weekends', 'Evenings', 'By appointment', 'Flexible'],
};

const LISTING_FORM_PROFILES = {
  base: {
    visible: { availability: true, location: true, price: true, contact: true, link: true },
    required: { availability: false, location: true, price: false, contactEmail: true, photos: false },
    defaults: {},
    missing: {
      title: 'Title is required.',
      description: 'Description is required.',
      subcategory: 'Specific type is required.',
      location: 'Area and state are required.',
      contactEmail: 'Email is required.',
      price: 'Price or rate is required.',
      availability: 'Availability or timing is required.',
      photos: 'Please upload at least one image.',
    },
  },
  housing: {
    required: { availability: true, location: true, price: true, contactEmail: true, photos: false },
    missing: {
      availability: 'Move-in date or availability is required.',
      price: 'Rent or monthly cost is required. Use "free" if there is no charge.',
    },
  },
  jobs: {
    required: { availability: true, location: true, price: false, contactEmail: true, photos: false },
    missing: {
      availability: 'Start date, shift, or schedule is required.',
    },
  },
  services: {
    required: { availability: false, location: true, price: false, contactEmail: true, photos: false },
  },
  marketplace: {
    required: { availability: false, location: true, price: true, contactEmail: true, photos: false },
    missing: {
      price: 'Asking price is required. Use "free" or "negotiable" if needed.',
    },
  },
  event: {
    required: { availability: true, location: true, price: false, contactEmail: true, photos: false },
    missing: {
      availability: 'Event date or timing is required.',
    },
  },
  professional: {
    required: { availability: false, location: true, price: false, contactEmail: true, photos: false },
  },
  community: {
    required: { availability: false, location: true, price: false, contactEmail: true, photos: false },
  },
  photography: {
    visible: { availability: false, location: false, price: false, contact: false, link: false },
    required: { availability: false, location: false, price: false, contactEmail: false, photos: true },
    defaults: {
      location: 'Photography showcase',
      locationType: 'showcase',
      availability: '',
      price: '',
      priceNote: '',
      contactEmail: '',
      contactPhone: '',
      contactPreference: '',
      externalLink: '',
    },
    missing: {
      title: 'Title is required.',
      description: 'Caption or story is required.',
      subcategory: 'Photo style or genre is required.',
      photos: 'Please upload at least one photo for a photography post.',
    },
  },
};

const SPECIFIC_TYPE_PROFILE = {
  events: 'event',
  restaurants: 'marketplace',
  shops: 'marketplace',
  produce: 'marketplace',
  kinbech: 'marketplace',
  auto: 'marketplace',
  'business-for-sale': 'marketplace',
  cleaning: 'services',
  services: 'services',
  childcare: 'services',
  beauty: 'services',
  translation: 'services',
  legal: 'professional',
  immigration: 'professional',
  cpa: 'professional',
  finance: 'professional',
  insurance: 'professional',
  education: 'professional',
  tutoring: 'professional',
  organizations: 'community',
  literature: 'community',
  music: 'event',
  art: 'event',
  sports: 'event',
  yoga: 'community',
  travel: 'community',
  matchmaker: 'community',
  matrimony: 'community',
  'pen-pals': 'community',
};

const CATEGORY_CONTEXTS = {
  housing: {
    label: 'Housing listing',
    hint: 'Show rent, lease timing, move-in date, utilities, roommates, and neighborhood details.',
    titleLabel: 'Housing headline',
    titlePlaceholder: 'e.g. Room in Somerville, $950, utilities included',
    titleNote: 'Include neighborhood, room type, and price if possible.',
    descriptionLabel: 'Housing details',
    descriptionPlaceholder: 'Mention room/apartment size, utilities, lease length, roommates, parking, transit, house rules, and who would be a good fit.',
    areaLabel: 'Neighborhood / city',
    priceLabel: 'Rent / monthly cost',
    pricePlaceholder: 'e.g. $950/month, utilities included',
    priceNoteLabel: 'Lease / utility note',
    priceNotePlaceholder: 'e.g. no broker fee, utilities split, deposit required',
    locationTypeLabel: 'Housing format',
    locationTypes: [['in-person', 'In person showing'], ['remote', 'Virtual tour'], ['hybrid', 'In person or virtual']],
    tagsPlaceholder: 'roommate, utilities included, near train, parking',
    tagsNote: 'Add housing filters people search for, like transit, parking, furnished, or gender preference.',
    imagesLabel: 'Upload room/property photos',
    imagesNote: 'Photos of the room, kitchen, bathroom, building, and street help people decide faster.',
    linkLabel: 'External listing link',
  },
  jobs: {
    label: 'Job listing',
    hint: 'Show role type, schedule, pay range, eligibility, work location, and how applicants should respond.',
    titleLabel: 'Job title',
    titlePlaceholder: 'e.g. Part-time server needed in Queens',
    titleNote: 'Include role, location, and full-time/part-time if possible.',
    descriptionLabel: 'Job description',
    descriptionPlaceholder: 'Mention responsibilities, pay, schedule, required experience, language needs, visa/work authorization requirements, and application steps.',
    areaLabel: 'Work location',
    priceLabel: 'Pay / compensation',
    pricePlaceholder: 'e.g. $18/hr, $55k-$70k, negotiable',
    priceNoteLabel: 'Pay note',
    priceNotePlaceholder: 'e.g. tips included, paid training, weekly pay',
    locationTypeLabel: 'Work setup',
    locationTypes: [['in-person', 'On-site'], ['remote', 'Remote'], ['hybrid', 'Hybrid']],
    contactPreferenceLabel: 'Application contact method',
    linkLabel: 'Application link',
    tagsPlaceholder: 'part-time, Nepali-speaking, restaurant, no experience',
    tagsNote: 'Use tags for shift, industry, language, or experience level.',
    imagesLabel: 'Upload workplace images',
    imagesNote: 'Optional: add workplace, flyer, or hiring poster images.',
  },
  services: {
    label: 'Service listing',
    hint: 'Show what you do, service area, pricing, response time, and proof of work.',
    titleLabel: 'Service headline',
    titlePlaceholder: 'e.g. Nepali-speaking home cleaning in Boston',
    titleNote: 'Include service type and service area.',
    descriptionLabel: 'Service details',
    descriptionPlaceholder: 'Mention what is included, service area, experience, pricing, availability, travel fees, and booking steps.',
    areaLabel: 'Service area',
    priceLabel: 'Rate / starting price',
    pricePlaceholder: 'e.g. From $80, $25/hr, quote after visit',
    priceNoteLabel: 'Pricing note',
    priceNotePlaceholder: 'e.g. materials extra, free estimate, travel fee applies',
    locationTypeLabel: 'Service format',
    locationTypes: [['in-person', 'In person'], ['remote', 'Remote'], ['hybrid', 'Remote or in person'], ['delivery', 'Delivery available']],
    linkLabel: 'External link',
    tagsPlaceholder: 'insured, same-day, free estimate, Nepali-speaking',
    tagsNote: 'Add trust and service tags such as insured, licensed, emergency, or same-day.',
    imagesLabel: 'Upload work samples',
    imagesNote: 'Before/after photos, flyers, menus, or portfolio images build trust.',
  },
  photography: {
    label: 'Photography posting',
    hint: 'Share photos as a creative showcase: the story, style, mood, and inspiration behind your work.',
    titleLabel: 'Photo post title',
    titlePlaceholder: 'e.g. Dashain evening portraits in golden light',
    titleNote: 'Use a title that describes the subject, mood, or creative idea.',
    descriptionLabel: 'Caption / story',
    descriptionPlaceholder: 'Write the story behind the photos, what you were trying to capture, the mood, setting, camera/editing notes, or what this work means to you.',
    areaLabel: 'Showcase area',
    priceLabel: 'Package / starting rate',
    pricePlaceholder: 'e.g. From $1,500, $250/session, quote after consultation',
    priceNoteLabel: 'Package note',
    priceNotePlaceholder: 'e.g. deposit required, travel extra, edited gallery included',
    locationTypeLabel: 'Post format',
    locationTypes: [['showcase', 'Photo showcase']],
    contactPreferenceLabel: 'Contact method',
    linkLabel: 'Portfolio / booking link',
    tagsPlaceholder: 'portrait, street, wedding, nature, black and white, festival',
    tagsNote: 'Use tags for genre, mood, subject, technique, camera style, or cultural theme.',
    imagesLabel: 'Upload your photos',
    imagesNote: 'Add the photos you want to showcase. This section is for sharing your talent, not booking services.',
  },
  marketplace: {
    label: 'Marketplace item',
    hint: 'Show item condition, pickup/delivery, price, included accessories, and clear photos.',
    titleLabel: 'Item headline',
    titlePlaceholder: 'e.g. IKEA desk for sale, good condition',
    titleNote: 'Include item, condition, and price if possible.',
    descriptionLabel: 'Item details',
    descriptionPlaceholder: 'Mention condition, size, brand, included items, reason for selling, pickup location, and whether delivery is available.',
    areaLabel: 'Pickup / meetup area',
    priceLabel: 'Asking price',
    pricePlaceholder: 'e.g. $120, free, negotiable',
    priceNoteLabel: 'Pickup / payment note',
    priceNotePlaceholder: 'e.g. cash only, pickup only, delivery extra',
    locationTypeLabel: 'Exchange option',
    locationTypes: [['pickup', 'Pickup only'], ['delivery', 'Delivery available'], ['in-person', 'Meetup'], ['hybrid', 'Pickup or delivery']],
    linkLabel: 'Product / reference link',
    tagsPlaceholder: 'used, like new, moving sale, negotiable',
    tagsNote: 'Condition, brand, pickup, and urgency tags help buyers scan quickly.',
    imagesLabel: 'Upload item photos',
    imagesNote: 'Add front, side, detail, and any defect photos.',
  },
  event: {
    label: 'Event listing',
    hint: 'Show date, venue, audience, ticket/RSVP details, and organizer contact.',
    titleLabel: 'Event name',
    titlePlaceholder: 'e.g. Nepali cultural night in Dallas',
    titleNote: 'Include event name and city.',
    descriptionLabel: 'Event details',
    descriptionPlaceholder: 'Mention date, time, venue, who should attend, ticket/RSVP process, performers/speakers, parking, and organizer info.',
    areaLabel: 'Venue city / area',
    priceLabel: 'Ticket / entry cost',
    pricePlaceholder: 'e.g. Free, $25 ticket, donation based',
    priceNoteLabel: 'Ticket note',
    priceNotePlaceholder: 'e.g. RSVP required, kids free, early bird pricing',
    locationTypeLabel: 'Event format',
    locationTypes: [['in-person', 'In person'], ['remote', 'Online'], ['hybrid', 'Hybrid']],
    contactPreferenceLabel: 'RSVP contact method',
    linkLabel: 'Event / ticket link',
    tagsPlaceholder: 'family-friendly, RSVP, cultural, fundraiser',
    tagsNote: 'Add tags for audience, language, culture, or RSVP requirements.',
    imagesLabel: 'Upload flyer or venue images',
    imagesNote: 'A flyer, poster, venue photo, or speaker image makes events easier to trust.',
  },
  professional: {
    label: 'Professional help listing',
    hint: 'Show specialty, credentials, consultation options, pricing, and appointment process.',
    titleLabel: 'Professional service headline',
    titlePlaceholder: 'e.g. Immigration consultation for TPS and asylum',
    titleNote: 'Include specialty and audience.',
    descriptionLabel: 'Professional service details',
    descriptionPlaceholder: 'Mention specialties, credentials, languages, consultation process, fees, document needs, and appointment availability.',
    areaLabel: 'Office / service area',
    priceLabel: 'Fee / consultation cost',
    pricePlaceholder: 'e.g. Free consultation, $150/session',
    priceNoteLabel: 'Fee note',
    priceNotePlaceholder: 'e.g. first consultation free, flat fee available',
    locationTypeLabel: 'Consultation format',
    locationTypes: [['remote', 'Virtual'], ['in-person', 'Office visit'], ['hybrid', 'Virtual or office']],
    contactPreferenceLabel: 'Appointment contact method',
    linkLabel: 'Website / booking link',
    tagsPlaceholder: 'licensed, Nepali-speaking, consultation, urgent',
    tagsNote: 'Add specialty, language, credential, and urgency tags.',
    imagesLabel: 'Upload logo or credential images',
    imagesNote: 'Optional: upload your logo, office photo, flyer, or credential image.',
  },
  community: {
    label: 'Community listing',
    hint: 'Show purpose, who it is for, schedule, location, and how people can join.',
    titleLabel: 'Community headline',
    titlePlaceholder: 'e.g. Nepali youth volunteer group in Maryland',
    titleNote: 'Include group/activity and location.',
    descriptionLabel: 'Community details',
    descriptionPlaceholder: 'Mention purpose, audience, meeting schedule, location, organizer, fees if any, and how to participate.',
    areaLabel: 'Community area',
    priceLabel: 'Fee / cost',
    pricePlaceholder: 'e.g. Free, membership fee, donation optional',
    priceNoteLabel: 'Participation note',
    priceNotePlaceholder: 'e.g. open to all, RSVP required, members only',
    locationTypeLabel: 'Participation format',
    locationTypes: [['in-person', 'In person'], ['remote', 'Online'], ['hybrid', 'Hybrid']],
    linkLabel: 'Group / registration link',
    tagsPlaceholder: 'volunteer, cultural, youth, free, Nepali',
    tagsNote: 'Use tags for audience, activity type, and participation requirements.',
    imagesLabel: 'Upload flyer or group images',
    imagesNote: 'Flyers, group photos, or event images help people understand the community.',
  },
};

const CATEGORY_GUIDES = {
  photography: {
    sections: ['Choose photo genre', 'Write the photo story', 'Contact hidden for showcase', 'Add photos and tags'],
    must: ['At least one original photo', 'Photo genre or style', 'A title', 'Caption or creative story', 'Useful tags'],
    useful: ['Camera or editing notes', 'Location only inside the caption if it matters', 'Cultural context', 'Series name or theme'],
    skip: ['Booking details', 'Phone number or email', 'Package pricing', 'Service-area language', 'Stock images that are not your work'],
    bestTitle: 'Strong photography posts include',
    best: ['A clear creative title.', 'A caption that explains the mood, subject, or story.', 'Multiple original photos from the same theme or series.', 'Tags for genre, culture, style, and technique.'],
    next: ['Your post appears on the photography page.', 'People can browse and appreciate your work.', 'You can edit the caption, tags, or photos later.'],
    types: ['Portrait', 'Street photography', 'Wedding moment', 'Cultural event', 'Nature', 'Black and white', 'Creative edit'],
  },
  housing: {
    sections: ['Place this housing post', 'Describe the space', 'Contact and showing details', 'Help renters find it'],
    must: ['Rent or monthly cost', 'Move-in date or availability', 'Neighborhood/city and state', 'Room/property details', 'Contact email'],
    useful: ['Photos of the room or property', 'Utilities and deposit details', 'Transit/parking info', 'Lease length or house rules'],
    skip: ['External link unless you already have one', 'Too many generic tags', 'Vague titles like "room available"'],
    bestTitle: 'Strong housing posts include',
    best: ['Rent, move-in date, and neighborhood in the title.', 'Clear details about utilities, deposit, roommates, parking, and transit.', 'Photos of the room, kitchen, bathroom, and building when possible.', 'Any rules or preferences stated politely and clearly.'],
    next: ['Renters can view your listing from housing pages and search.', 'People can message or contact you using the contact details you provide.', 'You can edit price, availability, or photos anytime.'],
    types: ['Room / shared housing', 'Apartment or studio', 'Paying guest', 'Sublet', 'Real estate / property'],
  },
  jobs: {
    sections: ['Place this job post', 'Describe the role', 'Application contact', 'Help applicants find it'],
    must: ['Role title', 'Pay or compensation range', 'Schedule/shift', 'Work location or remote status', 'How to apply'],
    useful: ['Experience requirements', 'Language preference', 'Start date', 'Visa/work authorization notes if relevant'],
    skip: ['Photos unless you have a flyer or workplace image', 'Unclear pay language', 'A long company pitch without duties'],
    bestTitle: 'Strong job posts include',
    best: ['Role, location, and schedule in the headline.', 'Pay range, shift, responsibilities, and requirements.', 'Clear application instructions and response expectations.', 'Work setup: on-site, remote, or hybrid.'],
    next: ['Applicants can find it through job and search pages.', 'You can update pay, shift, or availability later.', 'Use messages or email to manage interested applicants.'],
    types: ['Full-time job', 'Part-time shift', 'Restaurant / retail', 'Remote tech work', 'Internship or student work'],
  },
  services: {
    sections: ['Place this service', 'Describe the service', 'Booking contact', 'Help customers find it'],
    must: ['Service type', 'Service area', 'Starting price or quote process', 'Availability', 'Booking/contact method'],
    useful: ['Experience or credentials', 'Before/after photos', 'Travel fee or material cost', 'Languages spoken'],
    skip: ['Exact price if every job needs a quote', 'Personal details not related to service', 'Too many unrelated service tags'],
    bestTitle: 'Strong service posts include',
    best: ['What you do and where you serve.', 'Starting price, quote process, and availability.', 'Proof of work such as photos, portfolio, or credentials.', 'Simple booking instructions.'],
    next: ['Customers can browse by service category and location.', 'People can contact you directly or message through Biscoon.', 'You can refresh availability as your schedule changes.'],
    types: ['Cleaning', 'Tutoring', 'Translation', 'Photography', 'Beauty / salon', 'Repair or handyman'],
  },
  marketplace: {
    sections: ['Place this item', 'Describe the item', 'Buyer contact', 'Help buyers find it'],
    must: ['Item name', 'Asking price', 'Condition', 'Pickup/delivery option', 'Pickup area'],
    useful: ['Photos from multiple angles', 'Brand/model/size', 'Defects or missing parts', 'Payment preference'],
    skip: ['External link unless it helps identify the product', 'Overly broad category labels', 'Stock images without real photos'],
    bestTitle: 'Strong marketplace posts include',
    best: ['Item, condition, and price in the headline.', 'Pickup area, delivery option, and payment preference.', 'Real photos, including any scratches or defects.', 'Clear answer on whether price is negotiable.'],
    next: ['Buyers can find it in marketplace and search pages.', 'People can message or contact you for pickup details.', 'Delete it after sale to keep the marketplace clean.'],
    types: ['Furniture', 'Electronics', 'Moving sale', 'Car / auto', 'Groceries or produce', 'Business for sale'],
  },
  event: {
    sections: ['Place this event', 'Describe the event', 'RSVP contact', 'Help attendees find it'],
    must: ['Event name', 'Date and time', 'Venue or online link', 'Ticket/entry cost', 'RSVP or contact method'],
    useful: ['Flyer image', 'Audience or age group', 'Parking/transit details', 'Organizer name'],
    skip: ['Monthly price language', 'Unclear timing like "soon"', 'Too many unrelated tags'],
    bestTitle: 'Strong event posts include',
    best: ['Date, city, and event name in the headline.', 'Venue, timing, cost, and RSVP instructions.', 'Flyer or poster image if available.', 'Who the event is for and what attendees should expect.'],
    next: ['Attendees can find it on event/community pages.', 'You can update RSVP, ticket, or venue details.', 'Use a link if tickets or registration live elsewhere.'],
    types: ['Community event', 'Concert or cultural night', 'Puja / gathering', 'Fundraiser', 'Workshop or class'],
  },
  professional: {
    sections: ['Place this professional listing', 'Describe your expertise', 'Appointment contact', 'Help clients find it'],
    must: ['Specialty/service area', 'Consultation format', 'Fee or quote process', 'Credentials or experience', 'Appointment method'],
    useful: ['Website or booking link', 'Languages spoken', 'Urgent availability', 'Document checklist'],
    skip: ['Guarantees you cannot promise', 'Unverified credential claims', 'Unrelated tags'],
    bestTitle: 'Strong professional posts include',
    best: ['Specialty and target audience in the headline.', 'Credentials, consultation process, and fees.', 'Virtual/office availability and appointment instructions.', 'Website or booking link when available.'],
    next: ['Clients can find it by professional category and search.', 'People can contact you directly for appointments.', 'You can update availability or consultation fee later.'],
    types: ['Immigration help', 'Legal service', 'CPA / tax', 'Insurance', 'Finance', 'Tutoring / education'],
  },
  community: {
    sections: ['Place this community post', 'Describe the group or activity', 'Participation contact', 'Help people find it'],
    must: ['Purpose of the post', 'Who it is for', 'Location or online format', 'Schedule/availability', 'How to join/contact'],
    useful: ['Flyer or group image', 'Organizer name', 'Cost or membership info', 'Language/community focus'],
    skip: ['Price if it is free', 'Private personal details', 'Overly broad tags like "community" only'],
    bestTitle: 'Strong community posts include',
    best: ['Purpose, audience, and city in the headline.', 'Schedule, organizer, and how people can join.', 'Any fee, RSVP, or membership requirement.', 'Flyer or image when it helps explain the activity.'],
    next: ['Community members can discover it through community pages.', 'People can contact you or join using your details.', 'You can update meeting times, RSVP, or links later.'],
    types: ['Organization', 'Volunteer group', 'Cultural activity', 'Matrimony / matchmaker', 'Pen pals', 'Yoga / wellness'],
  },
};

function getCategoryContextKey(category) {
  if (category === 'photography') return 'photography';
  if (category === 'marketplace') return 'marketplace';
  if (['housing', 'paying-guest', 'real-estate'].includes(category)) return 'housing';
  if (['jobs', 'rojgar', 'tech', 'healthcare', 'student'].includes(category)) return 'jobs';
  if (['services', 'cleaning', 'moving', 'beauty', 'photography', 'translation', 'ai-services'].includes(category)) return 'services';
  if (['kinbech', 'auto', 'produce', 'shops', 'business-for-sale'].includes(category)) return 'marketplace';
  if (['events', 'music', 'art', 'sports', 'travel'].includes(category)) return 'event';
  if (['legal', 'immigration', 'cpa', 'finance', 'insurance', 'education', 'tutoring', 'jyotish'].includes(category)) return 'professional';
  if (['community', 'organizations', 'literature', 'matchmaker', 'matrimony', 'pen-pals', 'yoga', 'childcare'].includes(category)) return 'community';
  return 'services';
}

function normalizeSpecificKey(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function getActiveListingProfileKey(category = getSelectedListingCategory(), subcategory = document.getElementById('subcategory')?.value || '') {
  const normalizedCategory = normalizeListingCategory(category);
  if (normalizedCategory === 'photography') return 'photography';
  const specificKey = normalizeSpecificKey(subcategory);
  return SPECIFIC_TYPE_PROFILE[specificKey] || getCategoryContextKey(normalizedCategory);
}

function mergeListingProfile(profileKey) {
  const base = LISTING_FORM_PROFILES.base;
  const profile = LISTING_FORM_PROFILES[profileKey] || {};
  return {
    visible: { ...base.visible, ...(profile.visible || {}) },
    required: { ...base.required, ...(profile.required || {}) },
    defaults: { ...base.defaults, ...(profile.defaults || {}) },
    missing: { ...base.missing, ...(profile.missing || {}) },
  };
}

function getActiveListingFormProfile(category = getSelectedListingCategory(), subcategory = document.getElementById('subcategory')?.value || '') {
  return mergeListingProfile(getActiveListingProfileKey(category, subcategory));
}

function getToken() {
  if (window.biscoonSession && typeof window.biscoonSession.getToken === 'function') {
    return window.biscoonSession.getToken();
  }
  return localStorage.getItem('biscoonToken');
}

function showListingMessage(message, type = 'error') {
  const el = document.getElementById('listingMessage');
  if (!el) return;
  if (!message) {
    el.textContent = '';
    el.className = 'form-helper';
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.textContent = message;
  el.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
  if (message) showListingToast(message, type);
}

function showListingToast(message, type = 'success') {
  let tray = document.getElementById('listingToastTray');
  if (!tray) {
    tray = document.createElement('div');
    tray.id = 'listingToastTray';
    tray.className = 'listing-toast-tray';
    document.body.appendChild(tray);
  }
  const toast = document.createElement('div');
  toast.className = `listing-toast ${type === 'success' ? 'success' : 'error'}`;
  toast.textContent = message;
  tray.appendChild(toast);
  window.setTimeout(() => toast.classList.add('show'), 10);
  window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => toast.remove(), 180);
  }, 2800);
}

function toggleListingForm(enabled) {
  const form = document.getElementById('listingForm');
  if (!form) return;
  Array.from(form.elements).forEach(element => {
    if (element.id === 'listingSigninLink') return;
    element.disabled = !enabled;
  });
}

function setListingAuthState() {
  const token = getToken();
  const form = document.getElementById('listingForm');
  const guard = document.getElementById('listingGuardMessage');
  const signinLink = document.getElementById('listingSigninLink');
  if (!form) return;

  if (token) {
    if (guard) guard.style.display = 'none';
    if (signinLink) signinLink.style.display = 'none';
    showListingMessage('', 'success');
    toggleListingForm(true);
  } else {
    if (guard) guard.style.display = 'block';
    if (signinLink) signinLink.style.display = '';
    showListingMessage('Please log in to publish, edit, or delete your listings.', 'error');
    toggleListingForm(false);
  }
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function serializeImages(inputEl) {
  const limit = getMaxListingImages();
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return editingListingImages.slice(0, limit);
  const files = Array.from(inputEl.files).filter(file => file.type.startsWith('image/')).slice(0, limit);
  return Promise.all(files.map(resizeImageFile));
}

async function addSelectedImages(inputEl) {
  if (!inputEl || !inputEl.files || inputEl.files.length === 0) return editingListingImages;
  const limit = getMaxListingImages();
  const slotsLeft = Math.max(0, limit - editingListingImages.length);
  const files = Array.from(inputEl.files).filter(file => file.type.startsWith('image/')).slice(0, slotsLeft);
  const newImages = await Promise.all(files.map(resizeImageFile));
  editingListingImages = editingListingImages.concat(newImages).slice(0, limit);
  inputEl.value = '';
  return editingListingImages;
}

function getDefaultListingImageMarkup(category = 'other') {
  const defaults = {
    jobs: '💼',
    rojgar: '💼',
    housing: '🏠',
    'paying-guest': '🏡',
    'real-estate': '🏘️',
    services: '🛠️',
    cleaning: '🧹',
    photography: '📸',
    restaurants: '🍛',
    kinbech: '🛍️',
    marketplace: '🛍️',
    auto: '🚗',
    events: '📅',
    community: '🤝',
  };
  return `<span class="listing-default-image">${defaults[category] || '📄'}</span>`;
}

function getImageMarkup(images, alt = 'Listing image', category = 'other') {
  const image = Array.isArray(images) && images.length ? images[0] : '';
  return image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}">` : getDefaultListingImageMarkup(category);
}

function renderImagePreview(images = []) {
  const target = document.getElementById('imagePreviewList');
  if (!target) return;
  const limit = getMaxListingImages();
  target.innerHTML = images.map((image, index) => `
    <div class="image-preview-item">
      <img src="${escapeHtml(image)}" alt="Selected listing image ${index + 1}">
      <span class="image-preview-count">${index + 1}</span>
      <button class="image-remove-btn" type="button" data-remove-listing-image="${index}" aria-label="Remove image">×</button>
    </div>
  `).join('') + (images.length < limit ? `
    <label class="image-preview-add" for="imagesUpload">
      <span>+</span>
      <small>${limit - images.length} left</small>
    </label>
  ` : '');
  updateListingProgress();
}

function serializeTags(value = '') {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function tagsToInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function safeExternalHref(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function getCategoryPreset(category) {
  return CATEGORY_FIELD_PRESETS[category] || DEFAULT_FIELD_PRESET;
}

function getCategoryContext(category, subcategory = '') {
  return CATEGORY_CONTEXTS[getActiveListingProfileKey(category, subcategory)] || CATEGORY_CONTEXTS.services;
}

function getCategoryGuide(category, subcategory = '') {
  return CATEGORY_GUIDES[getActiveListingProfileKey(category, subcategory)] || CATEGORY_GUIDES.services;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && value) element.textContent = value;
}

function setPlaceholder(id, value) {
  const element = document.getElementById(id);
  if (element && value) element.placeholder = value;
}

function setLocationTypeOptions(options = []) {
  const select = document.getElementById('locationType');
  if (!select || !options.length) return;
  const current = select.value;
  select.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
  select.value = options.some(([value]) => value === current) ? current : options[0][0];
}

function renderGuideList(title, items = [], className = '') {
  if (!items.length) return '';
  return `
    <div class="category-guide-column ${className}">
      <strong>${escapeHtml(title)}</strong>
      <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

function setSidebarList(id, items = []) {
  const list = document.getElementById(id);
  if (!list) return;
  list.innerHTML = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function applyCategoryGuide(category, subcategory = '') {
  const guide = getCategoryGuide(category, subcategory);
  const guideEl = document.getElementById('categoryFieldGuide');
  if (guideEl) {
    guideEl.innerHTML = [
      renderGuideList('Must include', guide.must, 'must'),
      renderGuideList('Useful if relevant', guide.useful, 'useful'),
      renderGuideList('Can skip', guide.skip, 'skip'),
    ].join('');
  }

  if (Array.isArray(guide.sections)) {
    setText('sectionPlacementTitle', guide.sections[0]);
    setText('sectionOfferingTitle', guide.sections[1]);
    setText('sectionContactTitle', guide.sections[2]);
    setText('sectionSearchTitle', guide.sections[3]);
  }
  setText('sidebarBestTitle', guide.bestTitle);
  setSidebarList('sidebarBestList', guide.best);
  setSidebarList('sidebarNextList', guide.next);
  setSidebarList('sidebarTypesList', guide.types);
}

function applyCategoryContext(category, subcategory = '') {
  const context = getCategoryContext(category, subcategory);
  applyCategoryGuide(category, subcategory);
  const contextEl = document.getElementById('categoryContext');
  if (contextEl) {
    contextEl.innerHTML = `
      <strong>${escapeHtml(context.label)}</strong>
      <span>${escapeHtml(context.hint)}</span>
    `;
  }

  setText('titleLabel', context.titleLabel);
  setPlaceholder('title', context.titlePlaceholder);
  setText('titleNote', context.titleNote);
  setText('descriptionLabel', context.descriptionLabel);
  setPlaceholder('description', context.descriptionPlaceholder);
  setText('areaLabel', context.areaLabel);
  setText('locationTypeLabel', context.locationTypeLabel);
  setText('priceLabel', context.priceLabel);
  setPlaceholder('price', context.pricePlaceholder);
  setText('priceNoteLabel', context.priceNoteLabel);
  setPlaceholder('priceNote', context.priceNotePlaceholder);
  setText('contactPreferenceLabel', context.contactPreferenceLabel);
  setText('linkLabel', context.linkLabel);
  setText('tagsLabel', context.tagsLabel || 'Tags / keywords');
  setPlaceholder('tags', context.tagsPlaceholder);
  setText('tagsNote', context.tagsNote);
  setText('imagesLabel', context.imagesLabel);
  setText('imagesNote', context.imagesNote);
  setLocationTypeOptions(context.locationTypes);
}

function updateImageLimitCopy(category) {
  const note = document.getElementById('imagesNote');
  if (!note) return;
  const limit = getMaxListingImages(category);
  note.textContent = `${note.textContent} You can add up to ${limit} photo${limit === 1 ? '' : 's'}.`;
}

function enforceImageLimitForCurrentCategory() {
  const limit = getMaxListingImages();
  if (editingListingImages.length > limit) {
    editingListingImages = editingListingImages.slice(0, limit);
  }
  renderImagePreview(editingListingImages);
}

function setFieldRequired(id, required) {
  const element = document.getElementById(id);
  if (!element) return;
  element.required = required;
}

function setGroupVisible(id, visible) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.toggle('listing-field-hidden', !visible);
}

function applyListingFormProfile(category, subcategory = '') {
  const profileKey = getActiveListingProfileKey(category, subcategory);
  const profile = mergeListingProfile(profileKey);
  const isPhotoMode = profileKey === 'photography';

  document.body.classList.toggle('photography-post-mode', isPhotoMode);
  setGroupVisible('availabilityGroup', profile.visible.availability);
  setGroupVisible('locationDetailsGroup', profile.visible.location);
  setGroupVisible('priceDetailsGroup', profile.visible.price);
  setGroupVisible('contactDetailsSection', profile.visible.contact);
  setGroupVisible('linkGroup', profile.visible.link);

  setFieldRequired('availability', profile.required.availability && profile.visible.availability);
  setFieldRequired('area', profile.required.location && profile.visible.location);
  setFieldRequired('state', profile.required.location && profile.visible.location);
  setFieldRequired('price', profile.required.price && profile.visible.price);
  setFieldRequired('contactEmail', profile.required.contactEmail && profile.visible.contact);

  Object.entries(profile.defaults).forEach(([id, value]) => {
    const htmlId = id === 'externalLink' ? 'link' : id;
    const element = document.getElementById(htmlId);
    if (element) element.value = value;
  });
}

function setDatalistOptions(id, values = []) {
  const datalist = document.getElementById(id);
  if (!datalist) return;
  datalist.innerHTML = values.map(value => `<option value="${escapeHtml(value)}"></option>`).join('');
}

function renderQuickPicks(containerId, values = [], targetId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = values.slice(0, 7).map(value => `
    <button class="dynamic-suggestion" type="button" data-fill-target="${escapeHtml(targetId)}" data-fill-value="${escapeHtml(value)}">${escapeHtml(value)}</button>
  `).join('');
}

function updateCategoryDependentFields(options = {}) {
  const category = document.getElementById('category');
  const subcategory = document.getElementById('subcategory');
  const availability = document.getElementById('availability');
  if (!category || !subcategory || !availability) return;

  const normalizedCategory = normalizeListingCategory(category.value);
  if (category.value !== normalizedCategory) category.value = normalizedCategory;
  const selectedSubcategory = options.clearValues ? '' : subcategory.value;
  const profileKey = getActiveListingProfileKey(normalizedCategory, selectedSubcategory);
  const preset = getCategoryPreset(normalizedCategory);
  applyCategoryContext(normalizedCategory, selectedSubcategory);
  applyListingFormProfile(normalizedCategory, selectedSubcategory);
  updateImageLimitCopy(normalizedCategory);
  subcategory.placeholder = preset.subcategoryPlaceholder;
  availability.placeholder = preset.availabilityPlaceholder;
  setText('subcategoryLabel', profileKey === 'photography' ? 'Photo style / genre' : 'Specific type');
  setText('availabilityLabel', profileKey === 'event' ? 'Date / timing' : 'Availability / timing');
  setText('subcategoryNote', normalizedCategory ? 'Choose one of these common options or type your own.' : 'Use a short searchable label people can filter by.');
  setDatalistOptions('subcategorySuggestions', preset.subcategories);
  setDatalistOptions('availabilitySuggestions', preset.availability);
  renderQuickPicks('subcategoryQuickPicks', preset.subcategories, 'subcategory');
  renderQuickPicks('availabilityQuickPicks', preset.availability, 'availability');

  if (options.clearValues) {
    subcategory.value = '';
    availability.value = '';
  }
  enforceImageLimitForCurrentCategory();
  updateListingProgress();
}

function setElementText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function applyPhotographyOnlyMode() {
  if (!isPhotographyOnlyMode()) return;

  document.body.classList.add('photography-post-mode');
  const category = document.getElementById('category');
  if (category) {
    category.value = 'photography';
    category.setAttribute('aria-readonly', 'true');
  }

  setElementText('.breadcrumb span:last-child', 'Post Photography');
  setElementText('.post-hero .page-hero-eyebrow', 'Biscoon · Photography');
  const heroTitle = document.querySelector('.post-hero .page-hero-title');
  if (heroTitle) heroTitle.innerHTML = '<span class="emoji">📸</span>Post Photography';
  setElementText('.post-hero .page-hero-devanagari', 'तपाईंको फोटो कला साझा गर्नुहोस्');
  setElementText('.post-hero .page-hero-desc', 'Share your photos, caption, creative story, style, and tags. No booking, pricing, contact, or location details needed.');
  setElementText('.post-card > h2', 'Share a photography post');
  setElementText('.post-card > p', 'Post your own photos like a creative forum: choose a genre, write the story behind the images, upload multiple photos, and publish.');

  const group = document.getElementById('categoryGroup');
  if (group && !group.querySelector('.photography-lock-note')) {
    const note = document.createElement('div');
    note.className = 'photography-lock-note';
    note.textContent = 'Photography showcase only. Booking, location, price, and contact fields are hidden.';
    group.appendChild(note);
  }
}

function formatSpecificLocation(area, state) {
  return [area, state].map(value => value.trim()).filter(Boolean).join(', ');
}

function splitSpecificLocation(location = '') {
  const parts = location.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return { area: location || '', state: '' };
  return {
    area: parts.slice(0, -1).join(', '),
    state: parts[parts.length - 1],
  };
}

async function mapFormToListing() {
  const category = document.getElementById('category');
  const subcategory = document.getElementById('subcategory');
  const availability = document.getElementById('availability');
  const title = document.getElementById('title');
  const description = document.getElementById('description');
  const area = document.getElementById('area');
  const state = document.getElementById('state');
  const locationType = document.getElementById('locationType');
  const location = document.getElementById('location');
  const price = document.getElementById('price');
  const priceNote = document.getElementById('priceNote');
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  const contactPreference = document.getElementById('contactPreference');
  const externalLink = document.getElementById('link');
  const tags = document.getElementById('tags');
  const imagesUpload = document.getElementById('imagesUpload');
  const normalizedCategory = normalizeListingCategory(category.value.trim());
  const profile = getActiveListingFormProfile(normalizedCategory, subcategory.value);
  const specificLocation = profile.visible.location
    ? formatSpecificLocation(area.value, state.value)
    : (profile.defaults.location || `${getCategoryContext(normalizedCategory, subcategory.value).label} post`);
  if (location) location.value = specificLocation;

  return {
    title: title.value.trim(),
    description: description.value.trim(),
    category: normalizedCategory,
    subcategory: subcategory.value.trim(),
    availability: profile.visible.availability ? availability.value.trim() : (profile.defaults.availability || ''),
    price: profile.visible.price ? price.value.trim() : (profile.defaults.price || ''),
    priceNote: profile.visible.price ? priceNote.value.trim() : (profile.defaults.priceNote || ''),
    location: specificLocation,
    locationType: profile.visible.location ? locationType.value.trim() : (profile.defaults.locationType || ''),
    contactEmail: profile.visible.contact ? contactEmail.value.trim() : (profile.defaults.contactEmail || ''),
    contactPhone: profile.visible.contact ? contactPhone.value.trim() : (profile.defaults.contactPhone || ''),
    contactPreference: profile.visible.contact ? contactPreference.value.trim() : (profile.defaults.contactPreference || ''),
    externalLink: profile.visible.link ? externalLink.value.trim() : (profile.defaults.externalLink || ''),
    tags: serializeTags(tags.value),
    images: await serializeImages(imagesUpload),
  };
}

function resetListingForm() {
  const form = document.getElementById('listingForm');
  if (!form) return;
  form.removeAttribute('data-editing-id');
  form.reset();
  document.getElementById('listingSubmitButton').textContent = 'Publish listing';
  editingListingImages = [];
  renderImagePreview([]);
  if (isPhotographyOnlyMode()) {
    document.getElementById('category').value = 'photography';
    updateCategoryDependentFields();
    applyPhotographyOnlyMode();
  }
  updateListingProgress();
}

function getListingValidationError(listing) {
  const profile = getActiveListingFormProfile(listing.category, listing.subcategory);
  if (!listing.title) return profile.missing.title;
  if (!listing.description) return profile.missing.description;
  if (!listing.category) return 'Category is required.';
  if (!listing.subcategory) return profile.missing.subcategory;
  if (profile.required.availability && !listing.availability) return profile.missing.availability;
  if (profile.required.location && !listing.location) return profile.missing.location;
  if (profile.required.price && !listing.price) return profile.missing.price;
  if (profile.required.contactEmail && !listing.contactEmail) return profile.missing.contactEmail;
  if (profile.required.photos && !listing.images.length) return profile.missing.photos;
  return '';
}

async function submitListing(event) {
  event.preventDefault();
  const token = getToken();
  if (!token) {
    showListingMessage('Please sign in to publish or manage listings.', 'error');
    return;
  }

  const listing = await mapFormToListing();
  const validationError = getListingValidationError(listing);
  if (validationError) {
    showListingMessage(validationError, 'error');
    return;
  }

  const form = document.getElementById('listingForm');
  const submitButton = document.getElementById('listingSubmitButton');
  const editingId = form.getAttribute('data-editing-id');
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `/api/listings/${editingId}` : '/api/listings';

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = editingId ? 'Saving...' : 'Publishing...';
  }

  try {
    const response = await fetch(`${listingApiBase}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(listing),
    });

    const result = await response.json();
    if (!response.ok) {
      return showListingMessage(result.error || 'Unable to save listing.', 'error');
    }

    showListingMessage(editingId ? 'Listing updated successfully.' : 'Listing published successfully.', 'success');
    resetListingForm();
    fetchMyListings();
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = form.getAttribute('data-editing-id') ? 'Save changes' : 'Publish listing';
    }
  }
}

function getListingTimestamp(listing) {
  return new Date(listing.updatedAt || listing.createdAt || 0).getTime() || 0;
}

function getFilteredListings() {
  const query = myListingsQuery.trim().toLowerCase();
  return [...myListingsCache]
    .filter(listing => {
      if (!query) return true;
      return [
        listing.title,
        listing.description,
        listing.category,
        listing.subcategory,
        listing.location,
        listing.price,
        ...(Array.isArray(listing.tags) ? listing.tags : []),
      ].join(' ').toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (myListingsSort === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
      if (myListingsSort === 'price') return String(a.price || '').localeCompare(String(b.price || ''));
      return getListingTimestamp(b) - getListingTimestamp(a);
    });
}

function ensureListingControls() {
  const section = document.getElementById('myListingsSection');
  if (!section || document.getElementById('myListingsToolbar')) return;
  const toolbar = document.createElement('div');
  toolbar.id = 'myListingsToolbar';
  toolbar.className = 'my-listings-toolbar';
  toolbar.innerHTML = `
    <div class="my-listings-search">
      <input class="form-input" id="myListingsSearch" type="search" placeholder="Search your listings" autocomplete="off">
    </div>
    <select class="form-select my-listings-sort" id="myListingsSort" aria-label="Sort listings">
      <option value="newest">Newest first</option>
      <option value="title">Title A-Z</option>
      <option value="price">Price text</option>
    </select>
    <div class="my-listings-view-toggle" role="group" aria-label="Listing view">
      <button type="button" class="${myListingsView === 'grid' ? 'active' : ''}" data-listing-view="grid" title="Grid view">▦</button>
      <button type="button" class="${myListingsView === 'compact' ? 'active' : ''}" data-listing-view="compact" title="Compact view">☰</button>
    </div>
  `;
  section.insertBefore(toolbar, document.getElementById('listingList'));
}

function renderListingList(listings = myListingsCache) {
  const listEl = document.getElementById('listingList');
  if (!listEl) return;
  ensureListingControls();
  myListingsCache = Array.isArray(listings) ? listings : [];
  const visibleListings = getFilteredListings();
  const summary = document.getElementById('myListingsSummary') || document.createElement('div');
  summary.id = 'myListingsSummary';
  summary.className = 'my-listings-summary';
  summary.textContent = `${visibleListings.length} of ${myListingsCache.length} listing${myListingsCache.length === 1 ? '' : 's'} shown`;
  document.getElementById('myListingsToolbar')?.after(summary);

  if (!myListingsCache.length) {
    listEl.innerHTML = '<div class="listing-empty-panel"><strong>No listings yet.</strong><span>Use the form above to create your first listing.</span></div>';
    return;
  }
  if (!visibleListings.length) {
    listEl.innerHTML = '<div class="listing-empty-panel"><strong>No matches.</strong><span>Try a different search term or clear the filter.</span></div>';
    return;
  }

  listEl.innerHTML = `<div class="my-listings-grid ${myListingsView === 'compact' ? 'compact' : ''}">${
    visibleListings
    .map(listing => `
      <div class="my-listing-card view-listing" role="button" tabindex="0" data-id="${escapeHtml(listing.id)}">
        <span class="my-listing-media">${getImageMarkup(listing.images, listing.title || 'Listing image', listing.category)}</span>
        <span class="my-listing-body">
          <span class="my-listing-title">${escapeHtml(listing.title)}</span>
          <span class="my-listing-summary">${escapeHtml(listing.description)}</span>
          <span class="my-listing-meta">
            <span>${escapeHtml(listing.category)}</span>
            <span>${escapeHtml(listing.subcategory || 'General')}</span>
            <span>${escapeHtml(listing.location || 'N/A')}</span>
            <span>${escapeHtml(listing.price || 'Open')}</span>
          </span>
        </span>
        <span class="my-listing-actions">
          <button class="btn-ghost share-listing" data-id="${escapeHtml(listing.id)}">Share</button>
          <button class="btn-ghost edit-listing" data-id="${escapeHtml(listing.id)}">Edit</button>
          <button class="btn-danger delete-listing" data-id="${escapeHtml(listing.id)}">Delete</button>
        </span>
      </div>
    `)
    .join('')
  }</div>`;

  listEl.querySelectorAll('.view-listing').forEach(button => {
    button.addEventListener('click', event => {
      if (event.target.closest('.edit-listing, .delete-listing, .share-listing')) return;
      openMyListingModal(event.currentTarget.dataset.id);
    });
    button.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openMyListingModal(event.currentTarget.dataset.id);
    });
  });

  listEl.querySelectorAll('.edit-listing').forEach(button => {
    button.addEventListener('click', event => loadListing(event.target.dataset.id));
  });

  listEl.querySelectorAll('.share-listing').forEach(button => {
    button.addEventListener('click', event => shareListing(event.target.dataset.id));
  });

  listEl.querySelectorAll('.delete-listing').forEach(button => {
    button.addEventListener('click', event => deleteListing(event.target.dataset.id));
  });
}

function ensureMyListingModal() {
  let modal = document.getElementById('myListingModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'myListingModal';
  modal.className = 'listing-modal';
  modal.innerHTML = `
    <div class="listing-modal-backdrop" data-close-my-listing-modal></div>
    <div class="listing-modal-panel" role="dialog" aria-modal="true" aria-labelledby="myListingModalTitle">
      <button class="listing-modal-close" type="button" data-close-my-listing-modal aria-label="Close listing details">×</button>
      <div id="myListingModalBody" class="listing-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeMyListingModal() {
  const modal = document.getElementById('myListingModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('listing-modal-open');
}

function renderInteractiveGallery(listing) {
  const images = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
  if (!images.length) {
    return `<div class="listing-detail-gallery single-default">${getDefaultListingImageMarkup(listing.category)}</div>`;
  }
  return `
    <div class="listing-gallery-shell" data-gallery>
      <button class="listing-gallery-main" type="button" data-gallery-open="${escapeHtml(images[0])}">
        <img src="${escapeHtml(images[0])}" alt="${escapeHtml(listing.title || 'Listing image')}">
      </button>
      ${images.length > 1 ? `
        <div class="listing-gallery-thumbs">
          ${images.map((image, index) => `
            <button class="${index === 0 ? 'active' : ''}" type="button" data-gallery-thumb="${escapeHtml(image)}" aria-label="Show image ${index + 1}">
              <img src="${escapeHtml(image)}" alt="">
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderListingDetail(listing) {
  const images = renderInteractiveGallery(listing);
  const detailRows = [
    ['Category', listing.category],
    ['Specific type', listing.subcategory || 'General'],
    ['Location', listing.location || 'N/A'],
    ['Location type', listing.locationType],
    ['Availability', listing.availability],
    ['Price note', listing.priceNote],
    ['Tags', Array.isArray(listing.tags) ? listing.tags.join(', ') : ''],
    ['Contact preference', listing.contactPreference],
  ].filter(([, value]) => value).map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join('');
  const externalHref = safeExternalHref(listing.externalLink);
  const externalLink = externalHref ? `<a class="btn-ghost" href="${escapeHtml(externalHref)}" target="_blank" rel="noopener">Open link</a>` : '';

  return `
    <div class="listing-detail-kicker">${escapeHtml(listing.category || 'Listing')}</div>
    <h2 id="myListingModalTitle">${escapeHtml(listing.title || 'Untitled listing')}</h2>
    ${images}
    <div class="listing-detail-meta">${detailRows}</div>
    <div class="listing-detail-price">${escapeHtml(listing.price || 'Open')}</div>
    <p>${escapeHtml(listing.description || 'No description provided.')}</p>
    <div class="listing-detail-contact">
      ${listing.contactEmail ? `<a class="btn-primary" href="mailto:${escapeHtml(listing.contactEmail)}">Email</a>` : ''}
      ${listing.contactPhone ? `<a class="btn-ghost" href="tel:${escapeHtml(listing.contactPhone)}">${escapeHtml(listing.contactPhone)}</a>` : ''}
      ${externalLink}
      <button class="btn-ghost" type="button" data-share-from-modal="${escapeHtml(listing.id)}">Share</button>
      <button class="btn-primary" type="button" data-edit-from-modal="${escapeHtml(listing.id)}">Edit listing</button>
    </div>
  `;
}

async function openMyListingModal(id) {
  const token = getToken();
  if (!token) return;
  const modal = ensureMyListingModal();
  const body = modal.querySelector('#myListingModalBody');
  modal.classList.add('open');
  document.body.classList.add('listing-modal-open');
  body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Loading listing...</h3></div>';

  const response = await fetch(`${listingApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h3>Unable to load listing</h3></div>';
    return;
  }
  const listing = await response.json();
  body.innerHTML = renderListingDetail(listing);
  bindListingModalInteractions(body, listing);
  body.querySelector('[data-edit-from-modal]')?.addEventListener('click', event => {
    closeMyListingModal();
    loadListing(event.currentTarget.dataset.editFromModal);
  });
  body.querySelector('[data-share-from-modal]')?.addEventListener('click', event => {
    shareListing(event.currentTarget.dataset.shareFromModal);
  });
}

function bindListingModalInteractions(body) {
  body.querySelectorAll('[data-gallery-thumb]').forEach(button => {
    button.addEventListener('click', () => {
      const shell = button.closest('[data-gallery]');
      const mainImage = shell?.querySelector('.listing-gallery-main img');
      const mainButton = shell?.querySelector('.listing-gallery-main');
      if (mainImage) mainImage.src = button.dataset.galleryThumb;
      if (mainButton) mainButton.dataset.galleryOpen = button.dataset.galleryThumb;
      shell?.querySelectorAll('[data-gallery-thumb]').forEach(item => item.classList.toggle('active', item === button));
    });
  });
  body.querySelector('[data-gallery-open]')?.addEventListener('click', event => {
    openImageLightbox(event.currentTarget.dataset.galleryOpen);
  });
}

async function fetchMyListings() {
  const token = getToken();
  if (!token) {
    setListingAuthState();
    renderListingList([]);
    return;
  }

  const response = await fetch(`${listingApiBase}/api/listings/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    showListingMessage('Unable to load your listings.', 'error');
    renderListingList([]);
    return;
  }

  const data = await response.json();
  myListingsCache = data.listings || [];
  renderListingList(myListingsCache);
}

async function loadListing(id) {
  const token = getToken();
  if (!token) return;

  const response = await fetch(`${listingApiBase}/api/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    showListingMessage('Unable to load listing details.', 'error');
    return;
  }

  const listing = await response.json();
  const form = document.getElementById('listingForm');
  if (!form) return;

  form.setAttribute('data-editing-id', id);
  document.getElementById('listingSubmitButton').textContent = 'Save changes';
  const locationParts = splitSpecificLocation(listing.location || '');
  const categoryScope = getCategoryAndSpecificType(listing.category || '');
  document.getElementById('category').value = categoryScope.category || listing.category || '';
  document.getElementById('subcategory').value = listing.subcategory || categoryScope.subcategory || '';
  updateCategoryDependentFields();
  document.getElementById('availability').value = listing.availability || '';
  document.getElementById('title').value = listing.title || '';
  document.getElementById('description').value = listing.description || '';
  document.getElementById('area').value = locationParts.area;
  document.getElementById('state').value = locationParts.state;
  document.getElementById('locationType').value = listing.locationType || 'in-person';
  document.getElementById('location').value = listing.location || '';
  document.getElementById('price').value = listing.price || '';
  document.getElementById('priceNote').value = listing.priceNote || '';
  document.getElementById('contactEmail').value = listing.contactEmail || '';
  document.getElementById('contactPhone').value = listing.contactPhone || '';
  document.getElementById('contactPreference').value = listing.contactPreference || 'email';
  document.getElementById('link').value = listing.externalLink || '';
  document.getElementById('tags').value = tagsToInput(listing.tags);
  editingListingImages = Array.isArray(listing.images) ? listing.images : [];
  renderImagePreview(editingListingImages);
  updateListingProgress();
  showListingMessage('Loaded listing for editing. Update the fields and save.', 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteListing(id) {
  const token = getToken();
  if (!token) return;

  if (!confirm('Delete this listing? This cannot be undone.')) return;

  const response = await fetch(`${listingApiBase}/api/listings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json();
  if (!response.ok) {
    showListingMessage(result.error || 'Unable to delete listing.', 'error');
    return;
  }

  showListingMessage(result.message || 'Listing deleted.', 'success');
  fetchMyListings();
}

function getListingPublicUrl(id) {
  return `${window.location.origin}/pages/post/detail.html?id=${encodeURIComponent(id)}`;
}

async function shareListing(id) {
  if (!id) return;
  const url = getListingPublicUrl(id);
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Biscoon listing', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    showListingToast('Listing link copied.', 'success');
  } catch {
    showListingToast('Could not copy the listing link.', 'error');
  }
}

function openImageLightbox(src) {
  if (!src) return;
  let lightbox = document.getElementById('listingImageLightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'listingImageLightbox';
    lightbox.className = 'listing-image-lightbox';
    lightbox.innerHTML = '<button type="button" aria-label="Close image preview">×</button><img alt="Listing image preview">';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox || event.target.tagName === 'BUTTON') lightbox.classList.remove('open');
    });
  }
  lightbox.querySelector('img').src = src;
  lightbox.classList.add('open');
}

function updateListingProgress() {
  const progress = document.getElementById('listingProgressFill');
  const label = document.getElementById('listingProgressLabel');
  if (!progress || !label) return;
  const category = getSelectedListingCategory();
  const subcategory = document.getElementById('subcategory')?.value || '';
  const profile = getActiveListingFormProfile(category, subcategory);
  const isPhotographyPost = category === 'photography';
  const fields = ['category', 'subcategory', 'title', 'description'];
  if (profile.required.location && profile.visible.location) fields.push('area', 'state');
  if (profile.required.availability && profile.visible.availability) fields.push('availability');
  if (profile.required.price && profile.visible.price) fields.push('price');
  if (profile.required.contactEmail && profile.visible.contact) fields.push('contactEmail');
  const filled = fields.filter(id => document.getElementById(id)?.value.trim()).length;
  const photoScore = profile.required.photos ? Math.min(editingListingImages.length, 1) : Math.min(editingListingImages.length, 1);
  const score = Math.min(100, Math.round(((filled + photoScore) / (fields.length + 1)) * 100));
  progress.style.width = `${score}%`;
  label.textContent = score < 45 ? (isPhotographyPost ? 'Needs photo basics' : 'Needs basics') : score < 85 ? 'Almost ready' : 'Ready to publish';
}

function ensureListingProgress() {
  const form = document.getElementById('listingForm');
  if (!form || document.getElementById('listingProgress')) return;
  const progress = document.createElement('div');
  progress.id = 'listingProgress';
  progress.className = 'listing-progress';
  progress.innerHTML = `
    <div class="listing-progress-top">
      <span>Listing strength</span>
      <strong id="listingProgressLabel">Needs basics</strong>
    </div>
    <div class="listing-progress-track"><span id="listingProgressFill"></span></div>
  `;
  form.insertBefore(progress, form.querySelector('.form-section'));
}

function bindInteractiveForm() {
  ensureListingProgress();
  document.addEventListener('input', event => {
    if (event.target.id === 'myListingsSearch') {
      myListingsQuery = event.target.value;
      renderListingList();
    }
    if (event.target.id === 'subcategory') {
      updateCategoryDependentFields();
    }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'myListingsSort') {
      myListingsSort = event.target.value;
      renderListingList();
    }
  });
  document.addEventListener('click', event => {
    const quickPick = event.target.closest('[data-fill-target][data-fill-value]');
    if (quickPick) {
      const input = document.getElementById(quickPick.dataset.fillTarget);
      if (input) {
        input.value = quickPick.dataset.fillValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    const viewButton = event.target.closest('[data-listing-view]');
    if (!viewButton) return;
    myListingsView = viewButton.dataset.listingView;
    localStorage.setItem('biscoonListingView', myListingsView);
    document.querySelectorAll('[data-listing-view]').forEach(button => button.classList.toggle('active', button === viewButton));
    renderListingList();
  });
  document.querySelectorAll('#listingForm input, #listingForm textarea, #listingForm select').forEach(input => {
    input.addEventListener('input', updateListingProgress);
    input.addEventListener('change', updateListingProgress);
  });
  document.getElementById('category')?.addEventListener('change', event => {
    if (isPhotographyOnlyMode()) {
      event.currentTarget.value = 'photography';
    }
    updateCategoryDependentFields({ clearValues: true });
    applyPhotographyOnlyMode();
  });

  const uploadArea = document.querySelector('.file-upload');
  if (uploadArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, event => {
        event.preventDefault();
        uploadArea.classList.add('dragging');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, event => {
        event.preventDefault();
        uploadArea.classList.remove('dragging');
      });
    });
    uploadArea.addEventListener('drop', async event => {
      const input = document.getElementById('imagesUpload');
      if (!input || !event.dataTransfer?.files?.length) return;
      const transfer = new DataTransfer();
      Array.from(event.dataTransfer.files).forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      editingListingImages = await addSelectedImages(input);
      renderImagePreview(editingListingImages);
      showListingToast('Images added.', 'success');
    });
  }
  updateCategoryDependentFields();
  updateListingProgress();
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('listingForm');
  if (form) {
    form.addEventListener('submit', submitListing);
  }
  document.getElementById('imagesUpload')?.addEventListener('change', async event => {
    editingListingImages = await addSelectedImages(event.currentTarget);
    renderImagePreview(editingListingImages);
    showListingToast('Images added.', 'success');
  });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-my-listing-modal]')) closeMyListingModal();
    const removeButton = event.target.closest('[data-remove-listing-image]');
    if (removeButton) {
      editingListingImages.splice(Number(removeButton.dataset.removeListingImage), 1);
      renderImagePreview(editingListingImages);
    }
  });
  setListingAuthState();
  bindInteractiveForm();
  fetchMyListings();

  const urlCategory = new URLSearchParams(window.location.search).get('category');
  if (urlCategory) {
    const categorySelect = document.getElementById('category');
    const subcategoryInput = document.getElementById('subcategory');
    const scope = getCategoryAndSpecificType(urlCategory);
    if (categorySelect) categorySelect.value = scope.category;
    updateCategoryDependentFields({ clearValues: true });
    if (subcategoryInput && scope.subcategory) subcategoryInput.value = scope.subcategory;
  }
  applyPhotographyOnlyMode();
  if (isPhotographyOnlyMode()) updateCategoryDependentFields();
});
