export const DEFAULT_PROFILE = {
  name: 'Jaskirat Singh',
  email: 'jaskiratsingh314276@gmail.com',
  phone: '+91 8340361891',
  location: 'Ranchi, Jharkhand, India',
  target_role: 'Software Engineering / Full-stack Developer roles',
  summary:
    'Final-year B.Tech (Electrical & Electronics) student at BIT Mesra (graduating May 2026, CGPA 7.26). Hands-on full-stack and AI/ML developer — shipped production web apps on AWS and built AI pipelines with LangChain, RAG, and vector databases. Currently interning at Productimate AI Solutions.',
  skills: [
    'React.js', 'Next.js', 'TypeScript', 'JavaScript',
    'Node.js', 'Express.js', 'Python', 'C++',
    'PostgreSQL', 'MySQL', 'Prisma ORM',
    'AWS', 'Docker', 'CI/CD (GitHub Actions)', 'Terraform',
    'LangChain', 'RAG', 'Vector Databases',
  ],
  experience: [
    {
      company: 'Productimate AI Solutions',
      title: 'Software Developer Intern',
      period: 'Jan 2026 — May 2026',
      bullets: [
        'Built and deployed an end-to-end school ERP web application (Next.js + PostgreSQL on AWS) with an automated CI/CD pipeline that ships any code change to production in 2 minutes at $7/month',
        'Built responsive, role-specific dashboards for 4 user types (admin, teacher, student, parent) with full CRUD on students, classes, exams, attendance, and results',
        'Developed REST APIs with role-based access controls across 15 endpoints; resolved a class-enrollment race condition and rate-limited login attempts',
      ],
    },
    {
      company: 'Productimate AI Solutions',
      title: 'Software Developer Intern',
      period: 'May 2025 — July 2025',
      bullets: [
        'Built end-to-end features for a scalable B2B SaaS Sales Agent platform, reducing manual sales processing time by ~40% through automated dashboard components',
        'Built REST APIs and implemented role-based authentication with persistent session management',
      ],
    },
  ],
  projects: [
    {
      name: 'Warehouse Optimiser',
      tech: ['Python', 'FastAPI', 'YOLOv8', 'EasyOCR', 'Groq LLM', 'ARIMA', 'WebSocket', 'Docker'],
      description:
        'Full-stack warehouse-operations tool. Operators photograph incoming stock and an AI pipeline (YOLOv8 → EasyOCR → Groq LLM) proposes a structured product list for one-click approval into inventory. Includes ARIMA-based demand forecasting and a shipment-suggestion engine scoring low-stock urgency.',
      impact: 'Cut Docker cold builds ~10x using uv; real-time WebSocket events',
    },
    {
      name: 'AI LinkedIn Post Generator',
      tech: ['Python', 'LangChain', 'RAG', 'Vector Database', 'Streamlit'],
      description:
        'AI-powered tool that generates context-aware LinkedIn posts using a Retrieval-Augmented Generation (RAG) pipeline backed by a vector database to preserve the user\'s original writing style.',
      impact: 'Live deployment',
    },
  ],
  links: {
    portfolio: 'https://portfoliojaskirat.netlify.app/',
    linkedin: 'https://www.linkedin.com/in/jaskirat-singh-b644a4255/',
    github: 'https://github.com/',
    leetcode: 'https://leetcode.com/Jaskirat-singh',
  },
  subject_template: 'Application for software engineering roles at {{company}}',
  body_template: `Hi {{first_name}},

I'm Jaskirat Singh, a final-year B.Tech (Electrical & Electronics) student at BIT Mesra, graduating May 2026. I'm reaching out to express my interest in software engineering opportunities at {{company}}.

I have 2+ years of hands-on experience building production web applications. At my current internship at Productimate AI Solutions, I designed and shipped an end-to-end school ERP web application on AWS (Next.js + PostgreSQL) with an automated CI/CD pipeline that deploys in 2 minutes at $7/month, serving four user roles with full CRUD across 15 REST endpoints.

Alongside web work, I've built an AI Warehouse Optimiser (FastAPI + YOLOv8 + EasyOCR + Groq LLM + ARIMA) that turns warehouse photographs into structured inventory and cut Docker cold builds ~10x using uv.

My tech stack: React.js, Next.js, TypeScript, Node.js, Express, Python, PostgreSQL, AWS, Docker, and CI/CD with GitHub Actions.

I'd love the chance to contribute to {{company}} in any relevant engineering role. My portfolio with full project write-ups is at https://portfoliojaskirat.netlify.app/ and you can reach me at jaskiratsingh314276@gmail.com or +91 8340361891.

Thank you for your time — looking forward to hearing from you.

Best regards,
Jaskirat Singh`,
};
