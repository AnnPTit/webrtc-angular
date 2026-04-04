// ═══════════════════════════════════════════
// Mock Lesson Data — Simulates API response
// Each lesson has: video + description + quiz questions
// ═══════════════════════════════════════════

import { LessonData } from '../models/course-learning.models';

/**
 * Generates mock lesson data for a given lesson ID and title.
 * In production, this would be replaced by actual API call.
 */
export function getMockLessonData(lessonId: number, lessonTitle: string): LessonData {
  // Map of mock data keyed by lesson ID
  const mockLessons: Record<number, Partial<LessonData>> = {
    1: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      videoDescription: 'In this lesson, you will learn how to make a great first impression in English. We cover formal and informal greetings, body language tips, and common phrases used when meeting someone for the first time.',
      duration: '8 min',
      quiz: [
        {
          id: 1,
          question: 'What is the most common formal greeting in the UK?',
          options: ['A hug', 'A handshake', 'A bow', 'A kiss on the cheek'],
          correctAnswer: 1,
          explanation: 'In the United Kingdom, a firm handshake is the standard formal greeting, especially in business settings.',
        },
        {
          id: 2,
          question: 'Which phrase is used for first-time meetings?',
          options: ['See you later', 'How have you been?', 'Nice to meet you', 'Long time no see'],
          correctAnswer: 2,
          explanation: '"Nice to meet you" is the standard phrase when meeting someone for the first time.',
        },
        {
          id: 3,
          question: 'What does "How do you do?" express?',
          options: ['Asking about health', 'A very formal greeting', 'Asking about occupation', 'An informal goodbye'],
          correctAnswer: 1,
          explanation: '"How do you do?" is a very formal greeting used in traditional British English. It is not a genuine question.',
        },
        {
          id: 4,
          question: 'Choose the correct introduction:',
          options: ['My name Sarah is.', 'I name is Sarah.', 'My name is Sarah.', 'Name my is Sarah.'],
          correctAnswer: 2,
          explanation: 'The correct structure is: "My name is + [Name]." This follows the Subject + Verb + Complement pattern.',
        },
        {
          id: 5,
          question: 'In Japan, what indicates the level of respect in a greeting?',
          options: ['The volume of speech', 'The depth of the bow', 'The number of handshakes', 'Eye contact duration'],
          correctAnswer: 1,
          explanation: 'In Japanese culture, the depth and duration of the bow (ojigi) indicates the level of respect being shown.',
        },
      ],
    },
    2: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      videoDescription: 'Learn essential phrases for ordering food and drinks at a café. This lesson covers polite requests, asking about menu items, and common expressions used in everyday transactions.',
      duration: '10 min',
      quiz: [
        {
          id: 1,
          question: 'What is the polite way to order a coffee?',
          options: ['Give me a coffee', 'I want coffee now', 'I\'d like a coffee, please', 'Coffee!'],
          correctAnswer: 2,
          explanation: '"I\'d like a coffee, please" uses the polite conditional form "would like" which is the standard way to order in English.',
        },
        {
          id: 2,
          question: 'What does "Could I have the bill, please?" mean?',
          options: ['Can I see the menu?', 'May I pay?', 'Can I have more food?', 'Is the food ready?'],
          correctAnswer: 1,
          explanation: '"Could I have the bill?" is a polite way to ask for the check/invoice at a restaurant or café.',
        },
        {
          id: 3,
          question: 'Which response is appropriate when a waiter says "Would you like anything else?"',
          options: ['Yes, give me!', 'No, that\'s all, thank you.', 'I don\'t know what I want.', 'What do you have?'],
          correctAnswer: 1,
          explanation: '"No, that\'s all, thank you" is a polite and complete response when you don\'t need anything more.',
        },
        {
          id: 4,
          question: 'What does "beverage" mean?',
          options: ['A type of food', 'A drink', 'A dessert', 'A snack'],
          correctAnswer: 1,
          explanation: 'A "beverage" is a formal word for any type of drink, including water, coffee, juice, etc.',
        },
      ],
    },
    3: {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoDescription: 'Navigate the airport like a pro! Learn vocabulary and phrases for check-in, security, boarding, and finding your way around an international airport.',
      duration: '12 min',
      quiz: [
        {
          id: 1,
          question: 'What is a "boarding pass"?',
          options: ['A ticket to enter the airport', 'A card that allows you to board the plane', 'A passport', 'A luggage tag'],
          correctAnswer: 1,
          explanation: 'A boarding pass is the document that grants you permission to board the aircraft. It shows your seat, gate, and flight details.',
        },
        {
          id: 2,
          question: 'Where do you collect your luggage after a flight?',
          options: ['At the gate', 'At the check-in counter', 'At the baggage claim', 'At security'],
          correctAnswer: 2,
          explanation: 'The baggage claim area is where passengers collect their checked luggage after arriving at their destination.',
        },
        {
          id: 3,
          question: 'Which phrase is used to ask where your gate is?',
          options: ['"Where is gate B12?"', '"How much is the gate?"', '"When does the gate open?"', '"Who is at the gate?"'],
          correctAnswer: 0,
          explanation: '"Where is gate B12?" uses the correct question word "where" to ask about a location within the airport.',
        },
      ],
    },
  };

  const mock = mockLessons[lessonId];

  // Default fallback for any lesson without specific mock data
  return {
    id: lessonId,
    title: lessonTitle,
    description: mock?.videoDescription || `This is the content for lesson "${lessonTitle}". Watch the video and complete the exercises below.`,
    videoUrl: mock?.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoDescription: mock?.videoDescription || `Watch this video lesson about ${lessonTitle}. Pay close attention to the key concepts discussed.`,
    duration: mock?.duration || '10 min',
    status: 'not-started',
    quiz: mock?.quiz || [
      {
        id: 1,
        question: `What is the main topic of "${lessonTitle}"?`,
        options: ['Grammar rules', 'The topic discussed in the video', 'Mathematical formulas', 'Computer programming'],
        correctAnswer: 1,
        explanation: 'The main topic is covered in the video lesson you just watched.',
      },
      {
        id: 2,
        question: 'Which learning strategy is most effective for language learning?',
        options: ['Memorizing word lists only', 'Regular practice and immersion', 'Reading textbooks only', 'Watching movies without subtitles'],
        correctAnswer: 1,
        explanation: 'Regular practice combined with immersion in the language is proven to be the most effective approach.',
      },
      {
        id: 3,
        question: 'When should you review lesson material?',
        options: ['Never', 'Only before exams', 'Regularly, using spaced repetition', 'Once is enough'],
        correctAnswer: 2,
        explanation: 'Spaced repetition—reviewing material at increasing intervals—is one of the most effective study techniques.',
      },
    ],
  };
}
