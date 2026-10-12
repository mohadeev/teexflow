// Search landing pages: one per thing people look for that TeexFlow does
// well. Each renders at /<slug> (app/(landing)/[slug]) and is in the sitemap.
// Keep every claim true to the product — these pages are a promise.

export type LandingPage = {
  slug: string
  // <title> and the first thing in search results; ~60 characters.
  title: string
  // Search snippet; ~155 characters.
  description: string
  eyebrow: string
  h1: string
  lead: string
  // Shows the code block demo under the hero.
  demo?: 'code'
  steps: { title: string; text: string }[]
  features: { title: string; text: string }[]
  faq: { q: string; a: string }[]
  related: string[]
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'teleprompter-for-coding-tutorials',
    title: 'Teleprompter for Coding Tutorials, with Code Blocks',
    description:
      'A teleprompter made for programming videos: paste code and it shows as a framed, syntax-highlighted block while you read the words around it.',
    eyebrow: 'For developers who make videos',
    h1: 'The teleprompter for coding tutorials',
    lead:
      'Ordinary teleprompters turn code into a wall of broken text. TeexFlow keeps your script readable and shows every snippet as a clean, syntax-highlighted code block — so you can read the explanation and glance at the exact code to type, in one place.',
    demo: 'code',
    steps: [
      {
        title: 'Paste your script and your code',
        text: 'Paste from VS Code and TeexFlow recognizes the code, picks the language and frames it. Or type ``` and press Enter to start a block.',
      },
      {
        title: 'Read on any screen',
        text: 'Open the display on the screen next to your camera. Sentences start on their own lines; code stays in its frame with its indentation.',
      },
      {
        title: 'Control it from your phone',
        text: 'Play, pause, change speed and pages from your phone, so your hands stay on the keyboard while you code on camera.',
      },
    ],
    features: [
      {
        title: 'Syntax highlighting on the prompter',
        text: 'JavaScript, TypeScript, Python, HTML, CSS, SQL, Bash, Go, Rust, Java, C#, PHP and more, colored the way your editor does.',
      },
      {
        title: 'Finds code you didn’t mark',
        text: 'Code pasted straight into the script is spotted and framed on the prompter, while the sentences around it stay normal text.',
      },
      {
        title: 'Copy button on every block',
        text: 'On the controller, copy a snippet in one tap to paste it into your editor while recording.',
      },
      {
        title: 'Voice follow skips code',
        text: 'With voice follow (Pro), the prompter tracks what you say and jumps over code blocks you type rather than read aloud.',
      },
    ],
    faq: [
      {
        q: 'Can a teleprompter show code with syntax highlighting?',
        a: 'Yes. TeexFlow shows code in framed blocks with syntax colors and the original indentation, both in the editor and on the teleprompter display.',
      },
      {
        q: 'Do I need to format the code myself?',
        a: 'No. Code pasted from VS Code is framed automatically with its language, and code inside plain text is detected on the prompter. You can also type ``` to start a block.',
      },
      {
        q: 'Which languages are supported?',
        a: 'Around twenty, including JavaScript, TypeScript, JSX/TSX, Python, HTML, CSS, JSON, SQL, Bash, Go, Rust, Java, Kotlin, Swift, C, C++, C#, PHP, Ruby, YAML and Markdown. The language is detected automatically or chosen per block.',
      },
      {
        q: 'Is it free?',
        a: 'Code blocks are part of the free plan, which includes up to 3 scripts. Pro adds unlimited scripts and voice follow, with a 15-day free trial.',
      },
    ],
    related: ['pdf-teleprompter', 'voice-activated-teleprompter', 'phone-teleprompter-remote'],
  },
  {
    slug: 'pdf-teleprompter',
    title: 'PDF Teleprompter: Import a PDF, Keep Every Page',
    description:
      'Upload a PDF script and read it on a teleprompter in your browser. Every PDF page becomes a prompter page, with clean paragraphs and no page numbers.',
    eyebrow: 'Import PDF and text files',
    h1: 'Turn any PDF into a teleprompter script',
    lead:
      'Drop in the PDF your client, producer or writer sent you. TeexFlow rebuilds clean paragraphs from it, keeps each PDF page as its own teleprompter page, and puts it on any screen — no app to install, no copy-pasting line by line.',
    steps: [
      { title: 'Drop the PDF in', text: 'Click Import or drag a PDF, .txt or .md file onto your scripts. It becomes a new script, named after the file.' },
      { title: 'Pages stay pages', text: 'A 10-page PDF becomes a 10-page script. Move between pages from the controller as you record.' },
      { title: 'Read anywhere', text: 'Open the display on a laptop, tablet or monitor next to your camera, and control it from your phone.' },
    ],
    features: [
      {
        title: 'Paragraphs, not broken lines',
        text: 'PDFs break text into short lines. TeexFlow joins them back into sentences and paragraphs, and rejoins words hyphenated across lines.',
      },
      { title: 'Page numbers removed', text: 'Footers like “Page 3 of 10” are dropped so they don’t show up mid-read.' },
      {
        title: 'Code survives too',
        text: 'Monospaced code in a PDF comes in as a framed code block with its indentation — handy for tutorial scripts.',
      },
      { title: 'Text files welcome', text: 'Import .txt and .md as well, including old Windows-encoded files, accents intact.' },
    ],
    faq: [
      {
        q: 'Can I use a PDF on a teleprompter?',
        a: 'Yes. Import the PDF into TeexFlow and it becomes a script you can read on any screen. Each PDF page becomes a teleprompter page.',
      },
      {
        q: 'Does it work with scanned PDFs?',
        a: 'Not yet: a scan is a picture of text, so there is no text to read. TeexFlow tells you when a PDF has no selectable text.',
      },
      { q: 'How big can the file be?', a: 'Up to 15 MB per file.' },
      {
        q: 'Do I have to install an app?',
        a: 'No. TeexFlow runs in the browser on your laptop, tablet or phone.',
      },
    ],
    related: ['teleprompter-for-coding-tutorials', 'phone-teleprompter-remote', 'online-teleprompter'],
  },
  {
    slug: 'voice-activated-teleprompter',
    title: 'Voice-Activated Teleprompter That Runs on Your Device',
    description:
      'A teleprompter that scrolls as you speak, in your browser. Speech is recognized on your device with Whisper — your audio never leaves it.',
    eyebrow: 'Voice follow',
    h1: 'A teleprompter that follows your voice — privately',
    lead:
      'Stop fighting a scroll speed. TeexFlow listens as you read and keeps your line in place: pause, ad-lib or go back, and it follows. Speech recognition runs on your own device with OpenAI’s open-source Whisper model, so your audio is never uploaded anywhere.',
    steps: [
      { title: 'Turn on Voice', text: 'Press Voice on the controller. The display downloads the speech model once (about 40 MB) and keeps it for next time.' },
      { title: 'Just read', text: 'Words you have said fade, the next few light up, and the line you are on stays a third of the way down the screen.' },
      { title: 'Go off script', text: 'Skip a sentence or repeat one and it finds your place again. Code blocks are skipped automatically.' },
    ],
    features: [
      { title: 'Audio stays on your device', text: 'Recognition happens in the browser on the display device. Nothing is sent to TeexFlow, OpenAI or anyone else.' },
      { title: 'Works in every modern browser', text: 'Chrome, Edge, Safari and Firefox — it doesn’t depend on a browser’s built-in speech service.' },
      { title: 'Six languages', text: 'English, Spanish, French, German, Italian and Portuguese, detected from your script.' },
      { title: 'Built for real reading', text: 'Tolerates filler words, missed words and different spellings, so the prompter doesn’t jump around.' },
    ],
    faq: [
      {
        q: 'What is a voice-activated teleprompter?',
        a: 'A teleprompter that listens to you read and scrolls the script to match, instead of scrolling at a fixed speed.',
      },
      {
        q: 'Is my voice recorded or uploaded?',
        a: 'No. TeexFlow recognizes speech on your device with the open-source Whisper model. Audio is not recorded, stored or sent anywhere.',
      },
      {
        q: 'Do I need an internet connection?',
        a: 'Only to load the page and download the speech model the first time. Recognition itself runs on the device.',
      },
      {
        q: 'Is voice follow free?',
        a: 'Voice follow is part of Pro ($9/month or $79/year), and you can try Pro free for 15 days.',
      },
    ],
    related: ['teleprompter-for-coding-tutorials', 'phone-teleprompter-remote', 'online-teleprompter'],
  },
  {
    slug: 'phone-teleprompter-remote',
    title: 'Use Your Phone as a Teleprompter Remote — No App',
    description:
      'Control a teleprompter on your laptop, tablet or monitor from your phone’s browser. Sign in on both and they connect by themselves.',
    eyebrow: 'Two devices, one prompter',
    h1: 'Your phone is the teleprompter remote',
    lead:
      'Read from the screen in front of your camera and run everything from the phone in your hand: play, pause, speed, pages, mirror and voice. No app to install on either device — just the browser.',
    steps: [
      { title: 'Sign in on both devices', text: 'Choose “Display” on the screen by your camera and “Controller” on your phone.' },
      { title: 'Press Display it', text: 'Open a script on your phone and press Display it. It appears on the display by itself — no code to type.' },
      { title: 'Switch scripts any time', text: 'Present another script and the display follows. Or join any session with its six-letter room code.' },
    ],
    features: [
      { title: 'Instant sync', text: 'Scroll, speed, pages and edits sync live between the controller and every display.' },
      { title: 'Beam-splitter ready', text: 'Mirror horizontally or vertically and rotate the display for teleprompter glass and rigs.' },
      { title: 'Edit while you present', text: 'Fix a typo on your phone and the display updates right away.' },
      { title: 'Keyboard shortcuts too', text: 'Prefer a laptop or a Bluetooth keyboard? Space to play, arrows to move, H to hide controls.' },
    ],
    faq: [
      {
        q: 'Can I control a teleprompter from my phone?',
        a: 'Yes. Open TeexFlow on your phone as the controller and on another screen as the display; they connect over the internet, so they don’t even need to be on the same Wi-Fi.',
      },
      {
        q: 'Do I need to install an app?',
        a: 'No. Both the controller and the display run in a web browser.',
      },
      {
        q: 'Can more than one screen show the script?',
        a: 'Yes. Every display that joins the session shows the same script, in sync.',
      },
    ],
    related: ['voice-activated-teleprompter', 'pdf-teleprompter', 'online-teleprompter'],
  },
  {
    slug: 'online-teleprompter',
    title: 'Free Online Teleprompter in Your Browser',
    description:
      'A free online teleprompter: paste your script, read it on any screen, control it from your phone. Mirror mode, smooth scrolling, no download.',
    eyebrow: 'Free to start',
    h1: 'A free online teleprompter that just works',
    lead:
      'Paste your script, press Display it, and read. TeexFlow runs in the browser on any computer, tablet or phone, with smooth scrolling, sentence-per-line formatting and a remote in your pocket.',
    steps: [
      { title: 'Write or paste', text: 'Write your script, paste it, or import a PDF or text file. Split it into pages if you like.' },
      { title: 'Open the display', text: 'Use the screen in front of your camera — laptop, tablet, monitor or teleprompter glass.' },
      { title: 'Press play', text: 'Set the speed, or let voice follow keep up with you (Pro).' },
    ],
    features: [
      { title: 'Easy to read', text: 'Each sentence starts on its own line, spacing is cleaned up, and the width adjusts to your screen.' },
      { title: 'Mirror and rotate', text: 'Flip horizontally or vertically and rotate for beam-splitter rigs.' },
      { title: 'Paragraph mode', text: 'Show one block at a time, big and centered, and step through with arrow keys.' },
      { title: 'Free plan', text: 'Up to 3 scripts with scrolling, phone control, mirror mode and shortcuts. No card needed.' },
    ],
    faq: [
      { q: 'Is TeexFlow free?', a: 'Yes, the free plan includes up to 3 scripts. Pro adds unlimited scripts and voice follow, with a 15-day free trial.' },
      { q: 'Does it work on Mac, Windows, iPad and Android?', a: 'Yes. It runs in any modern web browser.' },
      { q: 'Can I use it with teleprompter glass?', a: 'Yes. Mirror mode flips the text for beam-splitter teleprompters.' },
    ],
    related: ['phone-teleprompter-remote', 'voice-activated-teleprompter', 'pdf-teleprompter'],
  },
]

export function landingPage(slug: string) {
  return LANDING_PAGES.find((p) => p.slug === slug) ?? null
}
