/* ==========================================================================
   data.js — every word and every media path lives here.
   Edit freely: nothing in app.js needs to change when you edit this file.

   Chapter shape:
   {
     id: Number,
     cardTitle: String,       // shown on the dashboard card — must NOT spoil
     title: String,           // shown once the chapter is opened (usually
                               // the same as cardTitle — only Chapter 2 and
                               // Chapter 11 lean on cardTitle for mystery)
     type: "message" | "photo" | "song" | "delivery" | "surprise"
         | "memoryCoupon" | "diary" | "tiles" | "letter" | "final",
     unlockAt: ISO string (IST) — omit for a chapter that uses manualUnlock instead,
     manualUnlock: true        // optional — see js/unlocks.js; ignores unlockAt entirely
     content: { ...type-specific fields }
   }
   ========================================================================== */

const CHAPTERS = [
  {
    id: 1,
    cardTitle: "Happy 21st, Bebu ❤️",
    title: "Happy 21st, Bebu",
    type: "message",
    unlockAt: unlockTime(0, 0, 0),
    content: {
      eyebrow: "01",
      heading: "Happy 21st, Bebu ❤️",
      body: [
        "Today is about you.",
        "So I made you a little place filled with pieces of us.",
        "Memories. Little things. Things I love about you. And a few surprises.",
        "Take your time. There's no rush.",
      ],
    },
  },

  {
    id: 2,
    cardTitle: "A Little Surprise",
    title: "A Little Surprise",
    type: "surprise",
    unlockAt: CONFIG.chapter2RevealTime,
    content: {
      lockedLine: "LOCKED",
      openLines: ["It's time. ❤️", "You've got a little something with you.", "Time to open it."],
      openButtonLabel: "I OPENED IT ❤️",
      wearLines: ["Put it on."],
      wearButtonLabel: "I'M WEARING IT",
      listenLine: "Now listen to this.",
      audioLabel: "VOICE NOTE",
      audioTitle: "For you",
      audioSrc: "assets/audio/pendent audio.mp3",
      goodnightLines: [
        "That's enough for tonight. ❤️",
        "Sleep well, birthday girl.",
        "There's more waiting for you in the morning.",
      ],
    },
  },

  {
    id: 3,
    cardTitle: "How It Started",
    title: "How It Started",
    type: "message",
    unlockAt: unlockTime(0, 9, 0),
    content: {
      eyebrow: "03",
      heading: "How It Started",
      body: [
        "You were my junior. We ended up working together for the college fest, and somewhere in the middle of all of it, I started noticing you — how loving, playful, and cheerful you were about everything. You made things fun without even trying.",
        "Then came the first time we went to Ashok Redi. We sat there for a long time, talking about nothing in particular.",
        "On the way back, I told myself I should hug you goodbye. Instead, I shook your hand. And immediately my brain went: “Bhai... hug karna chahiye tha.”",
        "So I gave you an awkward side-hug, and then basically ran.",
        "For the rest of that night, all I could think was: “Bhai hug bhi diya... ab ye mere baare mein kya soch rahi hogi?” I was so sure I'd messed the whole thing up.",
      ],
    },
  },

  {
    id: 4,
    cardTitle: "The Jacket That Stayed",
    title: "The Jacket That Stayed",
    type: "message",
    unlockAt: unlockTime(0, 10, 0),
    content: {
      eyebrow: "04",
      heading: "The Jacket That Stayed",
      pullQuote: "You never gave it back.",
      body: [
        "During the fest, before any of this had officially started, you were cold one day.",
        "I had two team jackets meant for the juniors. You had a choice between them.",
        "And somehow, you picked the one with my name printed on it.",
        "Honestly? I don't think I ever wanted it back.",
      ],
    },
  },

  {
    id: 5,
    cardTitle: "Your Hair",
    title: "Your Hair",
    type: "photo",
    unlockAt: unlockTime(0, 11, 0),
    content: {
      image: "assets/images/YOUR MESSY BUN.jpg",
      alt: "Your messy bun",
      caption:
        "It's mostly your messy bun — the one you don't even try for. But there's also the hair stick I got you that summer term in Goa. You loved that thing so much. When it broke, you actually cried. I know exactly how much it mattered to you, and I still owe you a replacement — next trip, promise.",
    },
  },

  {
    id: 6,
    cardTitle: "Little Things",
    title: "Little Things",
    type: "message",
    unlockAt: unlockTime(0, 12, 0),
    content: {
      eyebrow: "06",
      heading: "Little Things",
      body: [
        "Clutches. Jewellery. Jhumkas. The smallest things make you so genuinely excited — and when one of them breaks, you get just as genuinely sad about it.",
        "At this rate, I'm going to have to build you an entire room just for your jewellery, clutches, and jhumkas.",
      ],
    },
  },

  {
    id: 7,
    cardTitle: "I Like Listening To You",
    title: "I Like Listening To You",
    type: "message",
    unlockAt: unlockTime(0, 13, 0),
    content: {
      eyebrow: "07",
      heading: "I Like Listening To You",
      body: [
        "You tell every single story with your whole body — hands moving, face running through about six expressions, full dramatic reenactments included.",
        "I don't always remember what the story was actually about. I just remember listening to you tell it.",
      ],
    },
  },

  {
    id: 8,
    cardTitle: "Little Bebu Things",
    title: "Little Bebu Things",
    type: "reveal",
    unlockAt: unlockTime(0, 14, 0),
    content: {
      eyebrow: "08",
      heading: "Little Bebu Things",
      teaser: "There are a few things about you that I don't think you realise I notice.",
      steps: [
        { label: "ONE", reveal: "You're unbearably cute when you talk in your sleep — or half-asleep." },
        { label: "ANOTHER", reveal: "You randomly start dancing the second you're happy or excited." },
        { label: "WAIT…", reveal: "You have basically claimed every jacket and hoodie I own at this point." },
      ],
      payoffLabel: "This is you",
      payoff: {
        body: ["These are the tiny things that make you, you."],
      },
    },
  },

  {
    id: 9,
    cardTitle: "You Were There",
    title: "You Were There",
    type: "reveal",
    unlockAt: unlockTime(0, 15, 0),
    content: {
      eyebrow: "09",
      heading: "You Were There",
      teaser: "You probably don't realise how often you were there.",
      steps: [
        { label: "Continue", reveal: "Not always in the obvious moments." },
        { label: "Continue", reveal: "Sometimes just by being there." },
      ],
      payoffLabel: "Show me",
      payoff: {
        body: [
          "You had your own tests going on, and you still showed up for every single one of my interviews.",
          "Before my first one, you ironed my shirt, brought me dahi-cheeni for luck, and wished me well — and somehow you remembered the details of that test better than I did.",
          "Whenever I'm upset about something, you drop everything else just to make me feel better. Every single time.",
        ],
      },
    },
  },

  {
    id: 10,
    cardTitle: "Our First Proper Date",
    title: "Our First Proper Date",
    type: "reveal",
    unlockAt: unlockTime(0, 16, 0),
    content: {
      eyebrow: "10",
      heading: "Our First Proper Date",
      teaser: "We had already made memories before this.",
      steps: [
        { label: "Continue", reveal: "But this one felt different." },
        { label: "Continue", reveal: "Because this was our first proper date." },
      ],
      payoffLabel: "Bean Me Up, Goa",
      payoff: {
        image: "assets/images/first date bean me up.jpg",
        alt: "Bean Me Up, Goa",
        body: [
          "Bean Me Up, Goa — our first real date. Candlelight, and you in that black dress I still think about. We'd already eaten together a hundred times before — campus, Ashok Redi, wherever — but this was the first time it actually felt like a date.",
          "Afterwards, back at the hotel, I realized I'd left my wallet behind. You panicked more than I did. We went back, the place was already closed, and somehow we still got it back — you were scared the entire way there that it was gone for good.",
        ],
      },
    },
  },

  {
    id: 11,
    cardTitle: "Go Downstairs 👀",
    title: "Go Downstairs 👀",
    type: "delivery",
    manualUnlock: true,
    content: {
      stageA: {
        lines: ["I know one thing you love a little too much. 👀", "Go downstairs."],
        buttonLabel: "I'M GOING 👀",
      },
      stageB: {
        lines: ["Something is waiting for you.", "Go get it. ❤️"],
        prompt: "Did you get it?",
        buttonLabel: "I GOT IT ❤️",
      },
      stageC: {
        lines: ["Good.", "Now enjoy. ❤️"],
      },
    },
  },

  {
    id: 12,
    cardTitle: "Nainital",
    title: "Nainital",
    type: "message",
    unlockAt: unlockTime(0, 17, 0),
    content: {
      eyebrow: "12",
      heading: "Nainital",
      images: [
        { src: "assets/images/NANITAL TRIP.jpg", alt: "Nainital" },
        { src: "assets/images/BUNNY.jpg", alt: "The bunny-ear winter cap" },
      ],
      body: [
        "This was our first trip with friends after you confessed — right after we'd finished working together at the fest. I was terrified that once the fest ended, you'd get busy and I wouldn't see you again until some other club thing came up. So this trip mattered to me more than I let on.",
        "Planning it was chaos. Nobody could agree on a location, there was a whole Airbnb-vs-hotel argument, and at one point you left the group entirely. I genuinely thought the trip might fall apart, so I messaged everyone individually just to hold it together.",
        "On the trip, you were my scooty partner. We rode slower than everyone else and always ended up at the back of the three scooties — which just meant more time, just us.",
        "Nobody else knew we'd started seeing each other, since you'd confessed right before the trip, after all the planning was already done.",
        "That first day, you drank for the first time — because you felt safe with me — and then confessed in front of everyone, not caring what anyone thought. That moment did a lot for us, and it took away most of the senior-junior awkwardness too.",
        "We were both slow walkers, so naturally we got left behind and reached the BNB almost an hour late. A dog somehow ended up showing us the way. You got way too excited about a winter cap with bunny ears that moved when you pulled them. And we bought matching keychains.",
      ],
    },
  },

  {
    id: 13,
    cardTitle: "A Year of Us",
    title: "A Year of Us — Photo Diary",
    type: "diary",
    unlockAt: unlockTime(0, 18, 0),
    content: {
      heading: "A Year of Us — Photo Diary",
      subheading: "About a year and a half of us, since April 9, 2025 — in pictures.",
      entries: [
        {
          image: "assets/images/FIRST gARBA NIGHT.jpg",
          alt: "First Garba night",
          caption:
            "Our first campus Garba, during Navratri. The first attempt at getting a lift there failed completely — we made it eventually.",
        },
        {
          image:
            "assets/images/OUR FIRST LANAGR TOGETEHR- YOU WERE THE RESAON I WENT TO SO MANY PALCES FOR THE FIRST TIME IN MY COLLEGE LIFE.jpg",
          alt: "Our first langar together",
          caption:
            "The campus langar you took me to — the reason I started exploring so many new places on campus for the first time.",
        },
        {
          image: "assets/images/OUR FIRST N20.jpg",
          alt: "Our first N20",
          caption: "Our first comic show together on campus, during the fest.",
        },
        {
          image: "assets/images/FIRST PROM.HEIC",
          alt: "First prom",
          caption: "Our first prom, together.",
        },
        {
          image: "assets/images/OUR FIRST PHOTO IN FORMALS.jpg",
          alt: "First photo in formals",
          caption: "Our first photo in formals.",
        },
        {
          image: "assets/images/oUR FIRST PHOTO IN YOU WEARING SAREE - I COULDNT LIFT MY EYES OFF.JPG",
          alt: "First saree photo",
          caption: "The first time I saw you in a saree. I couldn't lift my eyes off.",
        },
        {
          image: "assets/images/OUR FIRST BEACH TOGEHTER.jpg",
          alt: "Our first beach together",
          caption: "Our first beach, together.",
        },
        {
          image: "assets/images/OUR FIRST CONCERT TOGETHER.jpg",
          alt: "Our first concert together",
          caption: "Our first concert, together.",
        },
        {
          image: "assets/images/OUR FIRST MOVIE IN THEATER.jpg",
          alt: "Our first movie in a theatre",
          caption: "Our first movie in a theatre.",
        },
        {
          image: "assets/images/FIRST PAHARI MANDIR TRIP.jpg",
          alt: "First Pahari Mandir trip",
          caption: "Our first Pahari Mandir trip.",
        },
        {
          image: "assets/images/NANITAL TRIP.jpg",
          alt: "Nainital",
          caption: "Nainital. (The full story gets its own chapter.)",
        },
        {
          image: "assets/images/YOUR MESSY BUN.jpg",
          alt: "Your messy bun",
          caption: "Your messy bun.",
        },
        {
          image: "assets/images/MY FAVOURITE PHOTO OF YOU.jpg",
          alt: "My favourite photo of you",
          caption: "My favourite photo of you.",
        },
      ],
    },
  },

  {
    id: 14,
    cardTitle: "The Song We Still Remember",
    title: "The Song We Still Remember",
    type: "song",
    unlockAt: unlockTime(0, 19, 0),
    content: {
      eyebrow: "14",
      heading: "The Song We Still Remember",
      preLines: ["Some songs stay songs.", "And some become memories."],
      lostVideoTop: "VIDEO: LOST",
      lostVideoBottom: "MEMORY: VERY MUCH ALIVE",
      note:
        "This one doesn't need a big story. Some songs just remind you of someone the second they start playing. This is one of those, for me.",
      label: "SONG",
      title: "Aye Udi Udi Udi",
      src: "assets/audio/aye_udi_udi.mp3",
      postLine: "Still remember?",
    },
  },

  {
    id: 15,
    cardTitle: "10 Things I Love About You",
    title: "10 Things I Love About You",
    type: "message",
    unlockAt: unlockTime(0, 20, 0),
    content: {
      eyebrow: "15",
      heading: "10 Things I Love About You",
      body: [],
      list: [
        "The way you get excited over clutches, jewellery, and jhumkas like it's the best day of your life.",
        "Your messy bun that you never even try for.",
        "How you tell every story with your whole body — hands, face, everything.",
        "The way you talk — or half-talk — in your sleep.",
        "How you randomly start dancing the second you're happy.",
        "That you've basically claimed every jacket and hoodie I own.",
        "How you fought that entire battle at Domino's without blinking.",
        "That you showed up for every interview, tests or no tests, and remembered the details better than I did.",
        "The night in Nainital when you stopped caring what anyone thought and just told me how you felt.",
        "That you picked the jacket with my name on it, and never once thought about giving it back.",
      ],
    },
  },

  {
    id: 16,
    cardTitle: "For Your 21st Year",
    title: "For Your 21st Year",
    type: "letter",
    unlockAt: unlockTime(0, 20, 30),
    content: {
      heading: "For Your 21st Year",
      paragraphs: [
        "I hope twenty-one is loud in all the right ways — new places, new people, new things you didn't expect to be good at.",
        "I hope you stay this confident, this sure of yourself, even on the days it's harder to be.",
        "I hope there's more peace than chaos this year, and when there's chaos, I hope you're laughing through most of it.",
        "Mostly, I just hope you have a genuinely good year — new memories, a little more growth, a little more fun, and a career you end up proud to talk about.",
      ],
      signOff: "Happy 21st.\nChaitu",
    },
  },

  {
    id: 17,
    cardTitle: "For Us",
    title: "For Us",
    type: "tiles",
    unlockAt: unlockTime(0, 21, 0),
    content: {
      eyebrow: "17",
      heading: "For Us",
      intro: "A few things I can already imagine us doing:",
      tiles: [
        "Seeing the world, one place at a time.",
        "Careers we're actually proud of.",
        "A mountain trip, just the two of us.",
        "A small house that's really ours.",
        "Fancy cutlery we probably won't use enough.",
        "Putting in the effort, always.",
        "Being there for each other, no matter what.",
        "Building an actual life together.",
        "All the ordinary, unremarkable, perfect everyday moments.",
      ],
    },
  },

  {
    id: 18,
    cardTitle: "Someday",
    title: "Someday",
    type: "message",
    unlockAt: unlockTime(0, 21, 30),
    content: {
      heading: "Someday",
      atmosphere: true,
      body: [
        "I don't know exactly what everything will look like.",
        "But I know I want to find out with you.",
      ],
    },
  },

  {
    id: 19,
    cardTitle: "My Girl ❤️",
    title: "My Girl ❤️",
    type: "memoryCoupon",
    unlockAt: unlockTime(0, 22, 0),
    content: {
      eyebrow: "19",
      heading: "My Girl ❤️",
      body: [
        "We ordered pure veg. They sent non-veg instead. And the woman at the counter decided to get rude about it.",
        "You didn't let that slide for a second — you fought that whole battle for both of us, while I just sat there, quietly thinking: I have a girl who'll do everything for me.",
      ],
      coupons: [
        {
          preamble: [
            "A Little Something For You",
            "I wanted to give you something you can use whenever you want.",
            "One wish. No rules about what it has to be. No list to choose from. No expiry date.",
            "You decide. ❤️",
          ],
          code: "COUPON № 01",
          title: "ONE WISH",
          description: "This coupon is good for one wish. Whatever you want. Whenever you want. Keep this coupon safe.",
          keepButtonLabel: "KEEP MY COUPON",
          keepMessage: "It's yours. ❤️",
          keepSubtext: ["Keep it safe.", "Whenever you're ready, send me this coupon along with your wish."],
        },
        {
          preamble: [
            "Okay...",
            "You thought you only got one?",
            "Maybe one wish wasn't enough.",
            "So I thought about it. And decided you get one more.",
          ],
          code: "COUPON № 02",
          title: "ONE MORE WISH",
          description: "One more wish. Whatever you want. Whenever you want. No expiry date. Keep this coupon safe. ❤️",
          keepButtonLabel: "KEEP MY COUPON",
          keepMessage: "It's yours too. ❤️",
          keepSubtext: [
            "Keep your coupons safe.",
            "When you're ready, send me this coupon along with your wish.",
          ],
        },
      ],
      closingLines: ["You never know when you'll want to use them.", "👀❤️"],
    },
  },

  {
    id: 20,
    cardTitle: "Before I Finish",
    title: "Before I Finish",
    type: "bridge",
    unlockAt: unlockTime(0, 22, 30),
    content: {
      lines: ["Before you finish this,", "there's one more thing I want you to hear."],
      buttonLabel: "Continue",
    },
  },

  {
    id: 21,
    cardTitle: "One Last Thing ❤️",
    title: "One Last Thing ❤️",
    type: "final",
    unlockAt: unlockTime(0, 23, 0),
    content: {
      lockedLine: "LOCKED",
      openingLines: [
        "You've collected the memories.",
        "The little things.",
        "The wishes.",
        "And everything in between.",
        "There's only one thing left.",
      ],
      anticipationLines: ["One Last Thing ❤️"],
      afterClickLine: "",
      playButtonLabel: "One Last Thing",
      finalAudio: "assets/audio/audio 2 last chapter.mp3",
      closingLines: ["Happy 21st, Bebu. ❤️", "Thank you for being you."],
    },
  },
];
