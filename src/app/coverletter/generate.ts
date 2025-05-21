import OpenAI from "openai/index.mjs";

type inputType = { resumeUrl: string; template: string; pages: string[] };
export async function coverLetter(data: inputType) {
  const client = new OpenAI({
    apiKey: process.env.GROK_API,
    baseURL: "https://api.x.ai/v1",
  });
  try {
    const completion = await client.chat.completions.create({
      model: "grok-3-mini-beta",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that creates HTML-formatted cover letters for software developer job seekers by modifying a template to include personalized content based on company-specific information. You will receive company's website.

      **Input Format**:
      {
        "pages": string[] //  company website and subpages from where you can fetch data
      }

      **Tasks**:
      1. **Fetch and Analyze Resume Data**: Retrieve the resume content from the provided resumeUrl. Extract key details such as skills, experiences , and achievements. Use this to highlight relevant qualifications in the cover letter.
      2. **Analyze Company Data**: Use the provided company website links to fetch content and identify unique aspects of the company (e.g., mission, technologies, culture, or impact) that would attract a passionate developer. If the company’s tech stack or mission aligns with the candidate’s skills, emphasize this alignment.
      3. **Modify Template for Personalization**: Rewrite the provided HTML template to seamlessly incorporate:
        - Personalized content (50–80 words) highlighting the company’s unique qualities, ensuring specificity and a casual-professional tone.
        - Relevant skills and experiences from the resume that match the company’s needs or tech stack, avoiding generic statements or resume repetition.
        The modified template should feel cohesive, natural, and tailored to the company.
      5. **Word Count**: Ensure the total cover letter (excluding HTML tags) is 170–200 words, with the personalized content (woven into the template) being 50–80 words. Adjust template wording if needed to stay within limits.
      6. **Output**: Return only modified cover letter in HTML format in the field.
      7. **Keep Name Handle**: Ensure the generated cover lettet (HTML-FORMATTED) includes {{name}} as it is.

      **Output Format**:
        "Complete HTML-formatted cover letter with personalized content without <html> & <body> tags"

      **Tone**: 
          Maintain a casual-professional, authentic, and enthusiastic tone, as if written by a genuinely interested developer. Emphasize the candidate’s passion for technologies relevant to the company, drawing from their resume.

      **HTML Template**: 
        ${data.template}

      **Resume URL**:
        ${data.resumeUrl}

      **Requirements**:
      - Fetch resume data from ${data.resumeUrl} to identify the candidate’s skills, experiences, and achievements.
      - Modify the template to weave in personalized content (50–80 words) about the company’s unique qualities, ensuring a smooth, cohesive letter.
      - Verify the total word count (excluding HTML tags) is 170–200 words before finalizing the output.
      - If company or resume data is incomplete, make reasonable assumptions about the company’s mission or tech stack and use known resume skills to craft compelling content.
      `,
        },
        {
          role: "user",
          content: `Use this information to generate a valid output:
       "Complete HTML-formatted cover letter with personalized content without <html> & <body> tags":
            ---
      WEBSITE TO SCRAPE: 
      ${data.pages}
      `,
        },
      ],
    });
    const result = completion.choices[0].message;
    if (!result || !result.content) {
      throw new Error("AI response not found");
    }
    return result.content;
  } catch (error: any) {
    console.error("API Error:", error.message); // Log the error message to the console;
    throw new Error(error.message);
  }
}
