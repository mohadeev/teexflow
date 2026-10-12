// How-to articles answering questions people search for. Each renders at
// /guides/<slug> and points to the feature page it relates to. Keep the
// advice genuinely useful on its own — that's what earns links and rankings.

export type GuideSection = {
  heading: string
  paragraphs: string[]
  list?: string[]
}

export type Guide = {
  slug: string
  title: string
  description: string
  published: string // ISO date
  readMinutes: number
  intro: string
  sections: GuideSection[]
  // The feature page this guide leads to.
  feature: string
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-read-code-while-recording-a-coding-tutorial',
    title: 'How to Read Code While Recording a Coding Tutorial',
    description:
      'Keep eye contact, explain clearly and type the right code on camera: a practical setup for scripting and recording programming videos.',
    published: '2026-10-12',
    readMinutes: 6,
    intro:
      'Coding tutorials are hard to record because you are doing three things at once: talking to the viewer, remembering what comes next, and typing code without mistakes. A script solves the first two — if you can see the words and the code clearly while you record.',
    sections: [
      {
        heading: 'Write the script around the code, not the other way round',
        paragraphs: [
          'Start from the code you want to end up with, then split it into the steps a viewer can follow. For each step, write one or two sentences that say why the code exists before you show what it is. Viewers forgive slow typing; they don’t forgive not knowing why.',
          'Keep spoken sentences short. Long sentences that look fine on paper make you run out of breath on camera.',
        ],
        list: [
          'One idea per step: “add state”, “handle the click”, “show the result”.',
          'Say the file name and the line you are editing before you type.',
          'Put the exact code for each step right under the sentence that introduces it.',
        ],
      },
      {
        heading: 'Keep code readable on the prompter',
        paragraphs: [
          'Most teleprompters treat everything as prose: indentation collapses, braces wrap onto new lines, and a ten-line function turns into an unreadable paragraph. That is when people look away from the camera to check their editor.',
          'Use a prompter that keeps code as code — monospaced, indented and ideally colored — so a glance is enough to see what to type next. In TeexFlow, code you paste from your editor becomes a framed, syntax-highlighted block, and the sentences around it stay normal text.',
        ],
      },
      {
        heading: 'Place the prompter where your eyes already are',
        paragraphs: [
          'For screen-recorded tutorials with a face cam, put the prompter window directly under the webcam, as narrow as you can read comfortably. Your eyes then move only a few degrees between the lens and the text.',
          'If you film with a separate camera, use a tablet or second monitor right below or behind the lens, or a beam-splitter teleprompter with the text mirrored.',
        ],
      },
      {
        heading: 'Control the prompter without leaving the keyboard',
        paragraphs: [
          'Your hands are busy typing, so scrolling the script by hand breaks the flow. Two options work well:',
        ],
        list: [
          'A phone as the remote: play, pause and change speed with your thumb between typing bursts.',
          'Voice follow: the prompter listens and keeps up with what you say. A good one skips code blocks, since you type those rather than read them aloud.',
        ],
      },
      {
        heading: 'Record in short takes',
        paragraphs: [
          'Record one step at a time and keep a clean pause before and after each. If you stumble, stop, take a breath and redo the step from its first sentence — the pauses make the edit easy.',
          'Finally, run the finished code before you publish. Nothing costs a tutorial more trust than code that doesn’t work.',
        ],
      },
    ],
    feature: 'teleprompter-for-coding-tutorials',
  },
  {
    slug: 'how-to-use-a-pdf-on-a-teleprompter',
    title: 'How to Use a PDF on a Teleprompter (Without Retyping It)',
    description:
      'Scripts often arrive as PDFs. Here’s how to get one onto a teleprompter with clean paragraphs, page breaks that make sense and nothing lost.',
    published: '2026-10-12',
    readMinutes: 5,
    intro:
      'Clients, producers and script writers love PDFs: they look the same everywhere and nobody can accidentally edit them. Teleprompters don’t: text in a PDF is stored as positioned lines, so copying it out gives you broken sentences, page numbers in the middle of paragraphs and words split with hyphens.',
    sections: [
      {
        heading: 'Why copy-paste from a PDF goes wrong',
        paragraphs: [
          'A PDF doesn’t know about paragraphs — only about lines at positions on a page. When you copy text out, every line break comes along, so a paragraph turns into ten short lines. Headers, footers and page numbers are mixed in with the script, and words hyphenated at the end of a line stay split.',
          'On a teleprompter that is distracting at best: the line ends where the PDF line ended, not where your sentence does.',
        ],
      },
      {
        heading: 'Option 1: clean it up by hand',
        paragraphs: ['For a one-page script, manual cleanup is fine:'],
        list: [
          'Paste into a plain-text editor first, not straight into the prompter.',
          'Join the lines of each paragraph back together and remove page numbers.',
          'Search for “- ” at line ends to rejoin hyphenated words.',
          'Add a blank line between paragraphs so the prompter shows clear breaks.',
        ],
      },
      {
        heading: 'Option 2: import the PDF directly',
        paragraphs: [
          'For anything longer, use a teleprompter that imports PDFs and rebuilds the text for you. TeexFlow reads the layout of each page, joins lines back into paragraphs, rejoins hyphenated words and drops page numbers. Each PDF page becomes a teleprompter page, so “page 3” means the same thing to you and to whoever wrote the script.',
          'Code printed in a monospaced font comes in as a code block with its indentation, which matters for technical scripts.',
        ],
      },
      {
        heading: 'Check these before you record',
        paragraphs: ['Whatever route you take, read the script once on the prompter before the camera rolls:'],
        list: [
          'Scanned PDFs are pictures of text: they need OCR (text recognition) before any prompter can read them.',
          'Tables and two-column layouts rarely survive conversion — rewrite them as sentences you can say.',
          'Stage directions like [SCREEN] or (pause) are easier to spot on their own line.',
        ],
      },
    ],
    feature: 'pdf-teleprompter',
  },
  {
    slug: 'how-to-look-at-the-camera-while-reading-a-script',
    title: 'How to Look at the Camera While Reading a Script',
    description:
      'Read a script on camera without looking like you’re reading: where to put the text, how wide to make it, how fast to scroll and how to practise.',
    published: '2026-10-12',
    readMinutes: 5,
    intro:
      'Viewers notice when your eyes drift away from the lens, even for a second. The fix isn’t to memorize everything — it’s to put the words where the lens is, make them easy to take in at a glance, and let them move at your pace.',
    sections: [
      {
        heading: 'Put the text as close to the lens as possible',
        paragraphs: [
          'The smaller the angle between the lens and the words, the less your eyes visibly move. With a webcam, place the reading window right under the camera. With a separate camera, use a beam-splitter teleprompter, which reflects the text onto glass in front of the lens — the text has to be mirrored to read correctly.',
          'Sitting further back helps too: from two meters away, a few centimeters of eye movement is invisible.',
        ],
      },
      {
        heading: 'Make the column narrow',
        paragraphs: [
          'Wide lines force your eyes to sweep left and right, which looks like reading. A narrow column of large text — five to eight words per line — lets you take in each line almost without moving your eyes.',
          'Starting each sentence on a new line helps as well: you always know where the next thought begins.',
        ],
      },
      {
        heading: 'Let the script move at your pace',
        paragraphs: [
          'A fixed scroll speed means either rushing to keep up or waiting for the text. Someone running the prompter for you solves it; so does a remote in your hand, or a prompter that listens to your voice and keeps your current line in place.',
        ],
      },
      {
        heading: 'Write for speaking',
        paragraphs: ['Scripts written to be read sound written. Before recording:'],
        list: [
          'Read the script out loud once and change every sentence you stumble on.',
          'Use contractions (“it’s”, “you’ll”) and short sentences.',
          'Mark the words you want to stress, and where you’ll pause.',
        ],
      },
      {
        heading: 'Practise once, then record',
        paragraphs: [
          'Do a full run-through on the prompter before you record. You’ll find the lines that are too long, the speed that suits you and the spots where you naturally pause — and the real take will look like a conversation, not a reading.',
        ],
      },
    ],
    feature: 'voice-activated-teleprompter',
  },
  {
    slug: 'diy-teleprompter-with-a-tablet-and-phone',
    title: 'DIY Teleprompter With a Tablet and Your Phone',
    description:
      'Build a working teleprompter with what you already own: a tablet or laptop as the screen, your phone as the remote, and optional glass for eye contact.',
    published: '2026-10-12',
    readMinutes: 6,
    intro:
      'You don’t need a studio rig to read a script on camera. A tablet or laptop shows the text, your phone controls it, and a sheet of glass turns it into a proper beam-splitter teleprompter if you want perfect eye contact.',
    sections: [
      {
        heading: 'What you need',
        paragraphs: ['The basic setup uses things most people already have:'],
        list: [
          'A screen to read from: tablet, laptop or spare monitor.',
          'Your phone, as the remote control.',
          'A camera — your phone, a webcam or a dedicated camera.',
          'Optional, for a beam splitter: a picture-frame glass or a piece of acrylic, and a cardboard hood to block light.',
        ],
      },
      {
        heading: 'Setup 1: screen under the camera (5 minutes)',
        paragraphs: [
          'Put the screen directly below the camera lens, as high as it will go, and keep the text column narrow. Open the teleprompter on the screen as the display and on your phone as the controller. This is enough for most talking-head videos, especially if you sit a little back from the camera.',
        ],
      },
      {
        heading: 'Setup 2: beam-splitter glass (an afternoon)',
        paragraphs: [
          'For eye contact straight into the lens, lay the tablet flat, face up, under the camera. Hold the glass above it at 45°, with the camera behind the glass looking through it at you. The glass reflects the tablet’s screen towards you while the camera films straight through.',
          'Because a reflection is reversed, turn on the teleprompter’s mirror mode so the text reads correctly. Use a dark cloth or cardboard around the glass so the room isn’t reflected in it.',
        ],
      },
      {
        heading: 'Control it from your phone',
        paragraphs: [
          'Once you’re in front of the camera, you can’t reach the tablet. Use the phone as the remote: play, pause, speed and pages. With TeexFlow, sign in on both devices — choose Display on the tablet and Controller on the phone — and whatever you present on the phone appears on the tablet by itself.',
        ],
      },
      {
        heading: 'Tips for a clean result',
        paragraphs: [],
        list: [
          'Turn the tablet’s brightness up — glass loses a lot of light.',
          'Use large, high-contrast text and a black background.',
          'Lock the tablet’s auto-sleep and rotation before you start.',
          'Do a test recording to check the glass isn’t visible in the shot.',
        ],
      },
    ],
    feature: 'phone-teleprompter-remote',
  },
]

export function guide(slug: string) {
  return GUIDES.find((g) => g.slug === slug) ?? null
}
