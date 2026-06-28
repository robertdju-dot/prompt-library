import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, template } = body;

    if (!title && !template) {
      return NextResponse.json(
        { error: 'Provide at least a title or a template instructions.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'mock_key' && !apiKey.startsWith('mock_')) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze the following AI prompt title and template, and suggest:
1. A short, concise description/subtitle (1-2 sentences, max 100 characters) explaining what the prompt does.
2. A list of 3-5 relevant, short lowercase tags.

Title: "${title || 'Untitled'}"
Template instructions: "${template || ''}"

Return your suggestion as a JSON object with keys "description" (string) and "tags" (array of strings).`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  description: { type: "STRING" },
                  tags: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["description", "tags"]
              }
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Gemini API error status:", response.status, errText);
          throw new Error(`Gemini API returned ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return NextResponse.json({
            description: parsed.description || "",
            tags: parsed.tags || [],
            source: 'gemini'
          });
        }
      } catch (geminiError) {
        console.warn("Failed to contact Gemini API, using fallback:", geminiError);
        // Fail over to fallback generator
      }
    }

    // Heuristic fallback generator
    const suggestions = generateFallback(title, template);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('API Suggest Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

function generateFallback(title, template) {
  const tagsSet = new Set();
  const textToScan = `${title || ''} ${template || ''}`.toLowerCase();

  // 1. Analyze text for common keywords
  const keywordMap = {
    'sql': 'SQL',
    'database': 'Database',
    'postgres': 'Database',
    'mysql': 'Database',
    'react': 'React',
    'next.js': 'Next.js',
    'nextjs': 'Next.js',
    'vue': 'Vue',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'html': 'HTML',
    'css': 'CSS',
    'tailwind': 'Tailwind',
    'seo': 'SEO',
    'marketing': 'Marketing',
    'email': 'Email',
    'copywriting': 'Writing',
    'blog': 'Blog',
    'writing': 'Writing',
    'api': 'API',
    'docker': 'DevOps',
    'kubernetes': 'DevOps',
    'aws': 'Cloud',
    'security': 'Security',
    'design': 'Design',
    'ux': 'UI/UX',
    'ui': 'UI/UX',
    'testing': 'Testing',
    'rust': 'Rust',
    'go': 'Go',
  };

  for (const [key, tag] of Object.entries(keywordMap)) {
    if (textToScan.includes(key)) {
      tagsSet.add(tag);
    }
  }

  // 2. Scan for variables
  const varRegex = /##([a-zA-Z0-9_-]+)##/g;
  let match;
  const variables = [];
  while (template && (match = varRegex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  if (variables.length > 0) {
    tagsSet.add('Dynamic');
  }

  // Fallback default tags if none matched
  if (tagsSet.size === 0) {
    tagsSet.add('General');
    tagsSet.add('AI');
  }

  // 3. Construct description
  let description = '';
  if (title) {
    description = `A prompt template for ${title}.`;
  } else {
    description = 'A general-purpose prompt template for automated tasks.';
  }

  if (variables.length > 0) {
    const varList = variables.slice(0, 3).join(', ');
    description += ` Features dynamic inputs: ${varList}${variables.length > 3 ? '...' : ''}.`;
  }

  return {
    description: description.substring(0, 100),
    tags: Array.from(tagsSet).slice(0, 5),
    source: 'fallback'
  };
}
