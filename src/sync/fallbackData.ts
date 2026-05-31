export const fallbackData = [
  { name:"Colors", icon:"🎨", kind:"Page", date:"2026-05-20", tags:[{text:"Design",color:"purple"}], size:"2.4 KB", cover:"img-3", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Jan 8, 2026"},{l:"Modified",v:"May 20, 2026"},{l:"Status",v:'<span class="tag green">Complete</span>'}],
    content:`<div class="preview-block h2">Color Palette</div>
<div class="preview-block">Our design system uses a semantic color palette organized by purpose rather than hue. Each color maps to a specific meaning in the UI.</div>
<div class="preview-block h2">Core Colors</div>
<div class="preview-block bullet">Primary: #007AFF (interactive elements)</div>
<div class="preview-block bullet">Success: #34C759 (positive states)</div>
<div class="preview-block bullet">Warning: #FF9500 (caution states)</div>
<div class="preview-block bullet">Danger: #FF3B30 (destructive actions)</div>
<div class="preview-block">Dark mode variants are generated automatically using HSL color shifts. Contrast ratios meet WCAG AA standards.</div>`
  },
  { name:"Typography", icon:"🔤", kind:"Page", date:"2026-05-18", tags:[{text:"Design",color:"purple"}], size:"1.8 KB", cover:"img-5", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Jan 10, 2026"},{l:"Modified",v:"May 18, 2026"},{l:"Status",v:'<span class="tag green">Complete</span>'}],
    content:`<div class="preview-block h2">Type Scale</div>
<div class="preview-block">We use a modular type scale based on a 1.25 ratio. All sizes are defined as CSS custom properties for easy theming.</div>
<div class="preview-block h2">Font Stack</div>
<div class="preview-block code">--font-sans: -apple-system, BlinkMacSystemFont,
  "SF Pro Text", "Segoe UI", sans-serif;
--font-mono: "SF Mono", "Menlo", "Consolas",
  monospace;</div>
<div class="preview-block">Headings use SF Pro Display for tighter tracking at large sizes. Body text uses SF Pro Text optimized for reading.</div>`
  },
  { name:"Components", icon:"🧩", kind:"Page", date:"2026-05-28", tags:[{text:"Design",color:"purple"},{text:"UI",color:"blue"}], size:"3.1 KB", cover:"img-2", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Mar 12, 2026"},{l:"Modified",v:"May 28, 2026"},{l:"Status",v:'<span class="tag green">In Progress</span>'}],
    content:`<div class="preview-block h2">Component Library</div>
<div class="preview-block">A comprehensive set of reusable UI components for our design system. Each component includes variants, states, and documentation.</div>
<div class="preview-block h2">Status</div>
<div class="preview-block todo done">Buttons — complete</div>
<div class="preview-block todo done">Inputs — complete</div>
<div class="preview-block todo">Modals — in progress</div>
<div class="preview-block todo">Navigation — not started</div>
<div class="preview-block todo">Data tables — not started</div>
<div class="preview-block h2">Usage</div>
<div class="preview-block code">import { Button } from '@design/ui';

&lt;Button variant="primary"&gt;
  Click me
&lt;/Button&gt;</div>`
  },
  { name:"Brand Guidelines", icon:"📐", kind:"Page", date:"2026-04-15", tags:[{text:"Design",color:"purple"},{text:"Brand",color:"orange"}], size:"4.7 KB", cover:"img-4", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Feb 2, 2026"},{l:"Modified",v:"Apr 15, 2026"},{l:"Status",v:'<span class="tag blue">Review</span>'}],
    content:`<div class="preview-block h2">Brand Voice</div>
<div class="preview-block">Our brand speaks with clarity and confidence. We are technical but approachable, precise but not cold.</div>
<div class="preview-block h2">Logo Usage</div>
<div class="preview-block">The logo should always have a minimum clear space of 1.5x the icon height. Never stretch, rotate, or apply effects to the logo.</div>
<div class="preview-block bullet">Primary: Full color on light backgrounds</div>
<div class="preview-block bullet">Reversed: White on dark backgrounds</div>
<div class="preview-block bullet">Monochrome: Single color for restricted palettes</div>`
  },
  { name:"Icon Set", icon:"✨", kind:"Page", date:"2026-03-22", tags:[{text:"Design",color:"purple"}], size:"1.2 KB", cover:"img-6", subtitle:"Design System · Page",
    props:[{l:"Created",v:"Mar 1, 2026"},{l:"Modified",v:"Mar 22, 2026"},{l:"Status",v:'<span class="tag green">Complete</span>'}],
    content:`<div class="preview-block h2">Icon Library</div>
<div class="preview-block">48 custom icons designed at 24×24 grid. All icons use 1.5px stroke weight with rounded caps and joins.</div>
<div class="preview-block h2">Categories</div>
<div class="preview-block bullet">Navigation (12 icons)</div>
<div class="preview-block bullet">Actions (16 icons)</div>
<div class="preview-block bullet">Objects (12 icons)</div>
<div class="preview-block bullet">Status (8 icons)</div>`
  },
  { name:"Roadmap", icon:"🗺️", kind:"Database", date:"2026-05-25", tags:[{text:"Planning",color:"green"},{text:"Q2 2026",color:"blue"}], size:"8.3 KB", cover:"img-5", subtitle:"Database · Roadmap",
    props:[{l:"Created",v:"Jan 1, 2026"},{l:"Modified",v:"May 25, 2026"},{l:"Type",v:"Database"},{l:"Entries",v:"24 items"}],
    content:`<div class="preview-block h2">Q2 2026 Roadmap</div>
<div class="preview-block">Product roadmap tracking all major initiatives for the quarter. Updated weekly in sprint planning.</div>
<div class="preview-block h2">In Progress</div>
<div class="preview-block todo done">Design system v2 launch</div>
<div class="preview-block todo">Mobile app beta release</div>
<div class="preview-block todo">API rate limiting</div>
<div class="preview-block h2">Up Next</div>
<div class="preview-block todo">SSO integration</div>
<div class="preview-block todo">Webhook system</div>`
  },
  { name:"Contacts", icon:"👥", kind:"Database", date:"2026-05-10", tags:[{text:"People",color:"green"}], size:"12.1 KB", cover:"img-4", subtitle:"Database · Contacts",
    props:[{l:"Created",v:"Dec 15, 2025"},{l:"Modified",v:"May 10, 2026"},{l:"Type",v:"Database"},{l:"Entries",v:"156 contacts"}],
    content:`<div class="preview-block h2">Team Directory</div>
<div class="preview-block">Company-wide contact database with roles, departments, and communication preferences.</div>
<div class="preview-block h2">Departments</div>
<div class="preview-block bullet">Engineering — 42 people</div>
<div class="preview-block bullet">Design — 12 people</div>
<div class="preview-block bullet">Product — 8 people</div>
<div class="preview-block bullet">Marketing — 18 people</div>
<div class="preview-block bullet">Operations — 14 people</div>`
  },
  { name:"Sprint Retrospective", icon:"🔄", kind:"Page", date:"2026-05-22", tags:[{text:"Meeting",color:"yellow"},{text:"Team",color:"green"}], size:"1.5 KB", cover:"img-7", subtitle:"Page",
    props:[{l:"Created",v:"May 22, 2026"},{l:"Modified",v:"May 22, 2026"},{l:"Status",v:'<span class="tag green">Done</span>'}],
    content:`<div class="preview-block h2">Sprint 14 Retrospective</div>
<div class="preview-block h2">What went well</div>
<div class="preview-block bullet">Shipped design system tokens on schedule</div>
<div class="preview-block bullet">Cross-team collaboration improved significantly</div>
<div class="preview-block bullet">Zero P0 incidents this sprint</div>
<div class="preview-block h2">What to improve</div>
<div class="preview-block bullet">Reduce context switching between projects</div>
<div class="preview-block bullet">Better async communication for remote team members</div>`
  },
];
