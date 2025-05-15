import OpenAI from "openai";

const scrapedData = "not available";
const GROKKEY = process.env.GROK_API;
const client = new OpenAI({
  apiKey: GROKKEY,
  baseURL: "https://api.x.ai/v1",
});

// -------------------- PROMPT 1 --------------------
// const completion = await client.chat.completions.create({
//   model: "grok-3-mini-beta",
//   messages: [
//     {
//       role: "system",
//       content: `You are a helpful assistant that writes concise and personalized cover letter messages for software developer job seekers. Using the scraped content from the company’s website, generate a short, compelling message (30–50 words) suitable for insertion into the middle of an HTML-based cover letter. Highlight the company's unique qualities—such as mission, team culture, products, or tech focus—that would attract a passionate developer. Do not repeat any resume content. Avoid generalizations. Maintain a casual-professional, enthusiastic, and authentic tone, as if written by a genuinely interested developer. Focus only on what makes this company stand out. Return only valid JSON in this format:
// {
// "email": [{name:"name to say Hello with", email:"email@domain.com"}, {name: "name to say Hello with", email:"email2@domain.com"}, ..]
// "message": "Your message here, between 30 - 50 words."
// }`,
//     },
//  role: "user",
//     content: `Use this information and give me a valid format JSON OUTPUT FORMAT:{
//     "email": [{name:"name to say Hello with", email:"email@domain.com"}, {name: "name to say Hello with", email:"email2@domain.com"}, ..]
//     "message": "Your message here in HTML-Format, between 30 - 50 words."
//     }
//     ---
//     SCRAPED INFO: ${scrapedData}
//     `,
//   },
//   ],
// });

// -------------------- PROMPT 2 --------------------
// const completion = await client.chat.completions.create({
//   model: "grok-3-mini-beta",
//   messages: [
//     {
//       role: "system",
//       content: `You are a helpful assistant that enhances HTML-formatted cover letters for software developer job seekers by adding a personalized message based on company-specific information.
//       You already have a pre-written HTML cover letter template and you'll recieve company's information scraped from their website.

//       Analyze the company’s content and write a personalized paragraph (30–50 words) that shows genuine enthusiasm for the company — focusing on what makes the company unique, such as its mission, technologies, culture, or impact. that would attract a passionate developer
//       Ensure the overall cover letter reads smoothly and naturally.
//       Maintain a casual-professional, authentic, and enthusiastic tone. Avoid generic statements or resume repetition
//       as if written by a genuinely interested developer. Focus only on what makes this company stand out. Avoid generalizations.
//       Ensure the final letter flows naturally and the total word count is between 150–190 words.
//       Return only valid JSON in this format:
//       OUTPUT FORMAT:{
//         "email": [{name:"name to say Hello with", email:"email@domain.com"}, {name: "name to say Hello with", email:"email2@domain.com"}, ..]
//         "message": "Your message here in HTML-Format, between 30 - 50 words."
//         }
//         TEMPLATE:" <p>Hey {{name}},</p>
//         <p>My name is Rahat Sayyed, and I bring over two years of hands-on experience in software development, spanning a broad spectrum of technologies. My technical portfolio includes modern frontend frameworks such as <strong>React</strong>, <strong>Next.js</strong>, and <strong>TypeScript</strong>, as well as robust backend environments like <strong>Node.js</strong>, <strong>Express.js</strong>, paired with databases including <strong>MongoDB</strong>, <strong>Firestore</strong>, and <strong>Supabase (Postgres)</strong>. I’ve worked across domains including <strong>Ethereum</strong>, <strong>Cardano</strong>, and backend.</p>

//         <p>I am deeply confident in my ability to onboard rapidly and contribute effectively. I have a proven track record of acquiring new technical stacks within 20–25 days and have consistently demonstrated the capability to operate independently once ramped up. This adaptable agility makes me a low-risk, high-return candidate especially in roles that require immediate upskilling.</p>

//         <p>I would welcome the opportunity to discuss how my adaptable skill set and growth mindset can add value to your team.</p>

//         <p> portfolio: <a href="https://rahatsayyed.xyz" target="_blank">rahatsayyed</a><br>
//       resume: <a href="https://flowcv.com/resume/w0f4aim4wh" target="_blank">Rahat Sayyed - Resume</a>
//       </p>

//       <p>Best regards,<br>
//       Rahat Sayyed</p>"`,
//     },
//     {
//       role: "user",
//       content: `Use this information and give me a valid format JSON OUTPUT FORMAT:{
//       "email": [{name:"name to say Hello with", email:"email@domain.com"}, {name: "name to say Hello with", email:"email2@domain.com"}, ..]
//       "message": "Your message here in HTML-Format, between 30 - 50 words."
//       }
//       ---
//       SCRAPED INFO: ${scrapedData}
//       `,
//     },
//   ],
// });

// -------------------- PROMPT 2 enhanced by grok --------------------
async function coverLetter() {
  const completion = await client.chat.completions.create({
    model: "grok-3-mini-beta",
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that creates HTML-formatted cover letters for software developer job seekers by modifying a template to include personalized content based on company-specific information. You will receive company information scraped from their website.

      **Input Format**:
      {
        "emails": string[], // Array of email addresses, e.g., ["john@company.com", "sarah@company.com"]
        "pages": Record<URL, Content> // Scraped content from company website
      }

      **Tasks**:
      1. **Analyze Company Data**: Use the scraped 'pages' content to identify unique aspects of the company (e.g., mission, technologies, culture, or impact) that would attract a passionate developer.
      2. **Modify Template for Personalization**: Rewrite the provided HTML template to seamlessly incorporate personalized content (30–50 words) highlighting the company’s unique qualities. Ensure the personalization is specific, avoids generic statements, and maintains a casual-professional tone. The modified template should feel cohesive and natural, as if written specifically for the company.
      3. **Generate Email Names**: For each email in the input 'email' array, auto-generate a name by extracting the part before the "@" (e.g., "john@company.com" becomes "John"). Capitalize the first letter of the name.
      4. **Word Count**: Ensure the total cover letter (excluding HTML tags) is 150–190 words, with the personalized content(woven into the template) being 30–50 words. Adjust the template wording if needed to stay within limits.
      5. **Output**: Return only valid JSON with the entire modified cover letter in HTML format in the 'message' field.

      **Output Format**:
      {
        "email": [{ "name": "Generated Name", "email": "email@domain.com" }, ...],
        "message": "Complete HTML-formatted cover letter with personalized content"
      }

      **Tone**: Maintain a casual-professional, authentic, and enthusiastic tone throughout, as if written by a genuinely interested developer. Avoid resume repetition or generalizations.

      **HTML Template**:
      <p>Hi {{name}},</p>
      <p>I’m Rahat Sayyed, a software developer with two years of experience building with tools like <strong>React</strong>, <strong>Next.js</strong>, <strong>TypeScript</strong>, <strong>Node.js</strong>, <strong>Express.js</strong>, <strong>MongoDB</strong>, and a little experience with <strong>Firestore</strong>, and <strong>Supabase (Postgres)</strong>. I also have experience with <strong>Ethereum</strong> and <strong>Cardano</strong>.</p>
      <p>I pick up new tech stacks in 20–25 days and thrive in roles where I can jump in and make an impact. I’m excited to bring my skills and growth mindset to your team.</p>
      <p>Check out my work: <a href="https://rahatsayyed.xyz" target="_blank">portfolio</a> | <a href="https://flowcv.com/resume/w0f4aim4wh" target="_blank">resume</a></p>
      <p>Looking forward to chatting about how I can contribute!</p>
      <p>Best,<br>Rahat Sayyed</p>

      **Requirements**:
      - Modify the template to weave in personalized content (30–50 words) about the company’s unique qualities, ensuring a smooth, cohesive letter.
      - Ensure the 'message' field contains the entire modified HTML cover letter with valid, properly nested HTML tags.
      - Escape special characters in the JSON output to prevent parsing errors.
      - Verify the total word count (excluding HTML tags) is 150–190 words before finalizing the output.
      - If scraped data is incomplete, use reasonable assumptions about the company’s mission or tech stack to craft compelling personalized content.`,
      },
      {
        role: "user",
        content: `Use this information to generate a valid JSON output:
      {
        "email": [{ "name": "Generated Name", "email": "email@domain.com" }, ...],
        "message": "Complete HTML-formatted cover letter with personalized content"
      }
      ---
      SCRAPED INFO: ${scrapedData}
      `,
      },
    ],
  });
  console.log(completion.choices[0].message);
}
