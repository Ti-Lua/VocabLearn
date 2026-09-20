// Word & Topic Visual Illustration Resolver
// Maps vocabulary keywords, topic categories, and domains to curated high-resolution educational photography & vector art

interface VisualCategory {
  keywords: string[];
  imageUrl: string;
  badgeGradient: string;
  tag: string;
}

const CATEGORIES: VisualCategory[] = [
  {
    keywords: ['business', 'money', 'economy', 'market', 'trade', 'finance', 'company', 'job', 'work', 'career', 'corporate', 'office', 'contract', 'salary', 'profit', 'investment', 'deal'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    tag: 'Business & Economy',
  },
  {
    keywords: ['tech', 'technology', 'computer', 'digital', 'software', 'ai', 'data', 'internet', 'code', 'cyber', 'algorithm', 'screen', 'device', 'app', 'online', 'robot', 'automation'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    tag: 'Technology & Science',
  },
  {
    keywords: ['travel', 'journey', 'flight', 'airport', 'holiday', 'trip', 'destination', 'explore', 'tourism', 'tourist', 'hotel', 'luggage', 'passport', 'vacation', 'abroad', 'voyage'],
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-sky-500/20 via-indigo-500/10 to-transparent',
    tag: 'Travel & Exploration',
  },
  {
    keywords: ['nature', 'environment', 'climate', 'green', 'forest', 'ocean', 'sea', 'river', 'mountain', 'wildlife', 'animal', 'plant', 'earth', 'ecology', 'weather', 'rain', 'storm', 'sun'],
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    tag: 'Nature & Environment',
  },
  {
    keywords: ['food', 'cook', 'kitchen', 'restaurant', 'meal', 'dish', 'recipe', 'fruit', 'vegetable', 'coffee', 'tea', 'bread', 'breakfast', 'dinner', 'taste', 'flavor', 'diet', 'bake'],
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-rose-500/20 via-amber-500/10 to-transparent',
    tag: 'Food & Culinary',
  },
  {
    keywords: ['health', 'medical', 'medicine', 'doctor', 'hospital', 'disease', 'fitness', 'sport', 'exercise', 'body', 'heart', 'mental', 'wellness', 'therapy', 'patient', 'clinic', 'gym'],
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-red-500/20 via-pink-500/10 to-transparent',
    tag: 'Health & Wellness',
  },
  {
    keywords: ['emotion', 'feeling', 'happy', 'sad', 'angry', 'fear', 'love', 'anxiety', 'joy', 'smile', 'mood', 'passion', 'calm', 'hope', 'grief', 'psychology', 'mind', 'attitude'],
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    tag: 'Feelings & Psychology',
  },
  {
    keywords: ['society', 'people', 'human', 'family', 'friend', 'community', 'culture', 'law', 'politics', 'government', 'citizen', 'social', 'relationship', 'generation', 'childhood'],
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-violet-500/20 via-indigo-500/10 to-transparent',
    tag: 'Society & People',
  },
  {
    keywords: ['education', 'study', 'learn', 'student', 'school', 'university', 'college', 'book', 'exam', 'read', 'write', 'academic', 'knowledge', 'library', 'research', 'lesson'],
    imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    tag: 'Education & Study',
  },
  {
    keywords: ['art', 'music', 'creative', 'paint', 'song', 'film', 'theater', 'design', 'fashion', 'style', 'color', 'draw', 'dance', 'museum', 'exhibition', 'sculpture', 'poetry'],
    imageUrl: 'https://images.unsplash.com/photo-1460661419200-1a6c628e37c0?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-fuchsia-500/20 via-purple-500/10 to-transparent',
    tag: 'Arts & Culture',
  },
  {
    keywords: ['city', 'building', 'street', 'house', 'home', 'urban', 'architecture', 'place', 'living', 'room', 'apartment', 'neighborhood', 'traffic', 'road'],
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=600&q=80',
    badgeGradient: 'from-neutral-500/20 via-stone-500/10 to-transparent',
    tag: 'Urban & Architecture',
  },
];

const DEFAULT_CATEGORY: VisualCategory = {
  keywords: [],
  imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  badgeGradient: 'from-[#FF202F]/20 via-red-900/10 to-transparent',
  tag: 'Vocabulary Master',
};

/**
 * Returns a high-definition illustration URL matching a word or topic context
 */
export function getWordVisual(
  word: string,
  topicName: string = '',
  wordImage?: string | null
): { imageUrl: string; tag: string; gradient: string } {
  // If explicit word_image is provided in DB, prioritize it
  if (wordImage && wordImage.trim().length > 5) {
    return {
      imageUrl: wordImage.trim(),
      tag: 'Illustration',
      gradient: DEFAULT_CATEGORY.badgeGradient,
    };
  }

  const combined = `${word} ${topicName}`.toLowerCase();

  for (const cat of CATEGORIES) {
    if (cat.keywords.some((k) => combined.includes(k))) {
      return {
        imageUrl: cat.imageUrl,
        tag: cat.tag,
        gradient: cat.badgeGradient,
      };
    }
  }

  // Hash-based deterministic category fallback so every word consistently gets a distinct visual
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = (hash << 5) - hash + word.charCodeAt(i);
    hash |= 0;
  }
  const picked = CATEGORIES[Math.abs(hash) % CATEGORIES.length];

  return {
    imageUrl: picked.imageUrl,
    tag: picked.tag,
    gradient: picked.badgeGradient,
  };
}
