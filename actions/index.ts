import { generateFullVoiceover, generateImage, generateText, generateVoiceover } from '../lib/openai';
import { generateVideo } from '../lib/video';
import fs from 'fs';

export type Action = {
    name: string;
    execute: (context: Context, input?: any) => Promise<any>;
};

export interface Context {
    prompt: string;
    idea?: string;
    synopsis?: string;
    outline?: string[];
    contentSections?: Array<{ number: string; content: string }>;
    finalContent?: string;
    voiceoverFile?: string;
    imageFile?: string;
    videoFile?: string;
}

export const brainstormIdea: Action = {
    name: "Brainstorm Idea",
    execute: async (context) => {
        const prompt = `
        You are tasked with helping generate and refine story ideas based on the theme: "${context.prompt}".
        
        Specifically, do a story about the world of investment banking and private equity.

        ---
        1. First, generate three distinct story ideas.
        2. Next, provide a brief critique of each idea.
        3. Finally, select the best idea based on the critiques and explain your choice.
        4. Respond with the winning idea and a brief synopsis of the winning idea in the specific format below:

        Respond using this exact format:

        Winning Idea: Your winning idea
        Synopsis: A brief synopsis of the winning idea
        `;

        const response = await generateText(prompt, 4000);
        console.log("Full response:", response.trim());

        // Extract the winning idea and synopsis using simpler regex
        const winningIdeaMatch = response.match(/Winning Idea:([\s\S]*?)(?=Synopsis:)/);
        const synopsisMatch = response.match(/Synopsis:([\s\S]*)/);

        context.idea = winningIdeaMatch ? winningIdeaMatch[1].trim() : "No winning idea found.";
        context.synopsis = synopsisMatch ? synopsisMatch[1].trim() : "No synopsis found.";

        console.log("Selected winning idea:", context.idea);
        console.log("Synopsis:", context.synopsis);

        return context;
    },
};

// Action: Write Outline with simplified parsing

export const writeOutline = {
    name: "Write Outline",
    execute: async (context: Context) => {
        if (!context.idea || !context.synopsis) {
            throw new Error("Requires idea and synopsis from brainstorm step");
        }

        const prompt = `
        General Prompt: ${context.prompt}
        Create an outline for the following story idea: "${context.idea}".
        Structure the outline in a simple, numbered format using square brackets around each section's numbering, to a depth of up to 5 levels. Use the following structure:
        [1] Introduction - set the context and provide an overview of the topic. (200 words)
            [1.1] Background - provide relevant history or context to the topic.
                [1.1.1] Key Details - add specific details that help understand the background. (200 words)
                [1.2] Main Characters or Elements - introduce key figures, companies, or components involved. (200 words)
        [2] Problem or Challenge - present the key challenge or issue being addressed.(200 words)
            [2.1] Explanation of the Problem - go deeper into why this is a challenge. (200 words)
                [2.1.1] Stakeholders - who is affected and why.
            [2.2] Implications - outline the potential consequences of the problem. (200 words)
        [3] Solutions or Strategies - present possible solutions or approaches taken.(200 words)
            [3.1] Key Strategy or Action - describe what was done to address the problem.
                [3.1.1] Supporting Details - provide examples or case studies that illustrate the strategy.
        [4] Outcome or Lessons Learned - explain what happened and the key takeaways.(300 words)
            [4.1] Results - summarize what resulted from the actions taken. (2 minutes)
                [4.1.1] Metrics or Outcomes - provide data or anecdotes that support the result. (1 minute)
            [4.2] Lessons for the Audience - highlight key takeaways viewers can apply. (1 minute)
        

        Only respond with the numbered outline using this format (e.g., [1], [1.1], [1.1.1]) and ensure it follows this structure exactly, with each line being a numbered section or sub-section.
        `;

        const response = await generateText(prompt, 4000, 'gpt-4');
        console.log("Generated outline response:", response.trim());

        context.outline = parseFlatOutline(response);
        console.log("Parsed flat outline:", JSON.stringify(context.outline, null, 2));
        
        return context;
    },
};

// Function to parse the response by capturing each line without extra parsing logic
function parseFlatOutline(text) {
    return text
        .trim()                       // Remove leading/trailing whitespace
        .split('\n')                  // Split by line
        .map(line => line.trim())     // Trim whitespace around each line
        .filter(line => line.length > 0); // Filter out any empty lines
}

export const writeContentSections = {
    name: "Write Content Sections",
    execute: async (context: Context) => {
        if (!context.outline) {
            throw new Error("Requires outline from previous step");
        }

        const generateContent = async () => {
            const content = [];
            let cumulativeContent = "";
                        const MAX_CONTEXT_LENGTH = 2000;

            for (const section of context.outline) {
                const prompt = `
                General Instructions: ${context.prompt}
                ---
                Story Overview: ${context.idea} ${context.synopsis}
                ---
                Story Outline: ${context.outline.join('\n')}
                ---
                The most recent section of the story (continue writing from here):\n"""${cumulativeContent}"""\n
                Your Current Position (Write this section only!): ${section}\n

                Speak the section of the narration of the story at the current position. ONLY output the spoken words by the narrator, no other formatting or metadata about the show. This is a pure transcript\n`;

                const sectionContent = await generateText(prompt, 4000, 'gpt-4');
                const trimmedContent = sectionContent.trim();

                content.push({ number: section, content: trimmedContent });
                cumulativeContent = (cumulativeContent + ' ' + trimmedContent)
                    .slice(-MAX_CONTEXT_LENGTH)
                    .trim();
            }
            return content;
        };

        context.contentSections = await generateContent();
        console.log("Written content sections:", JSON.stringify(context.contentSections, null, 2));
        
        return context;
    },
};



// Action: Critique Each Section
export const critiqueSections: Action = {
    name: "Critique Sections",
    execute: async (context, sections) => {
        const critiques: string[] = [];
        for (const section of sections) {
            const prompt = `Provide a critique for the following section:\n"${section}". Focus on narrative depth and clarity.`;
            const critique = await generateText(prompt, 4000);
            critiques.push(critique.trim());
        }
        console.log("Critiqued sections:", critiques);
        return critiques;
    },
};

// Action: Save Final Piece
// coalesce array of sections into a final product

export const saveFinalPiece = {
    name: "Save Final Piece",
    execute: async (context: Context) => {
        if (!context.contentSections) {
            throw new Error("Requires content sections from previous step");
        }

        context.finalContent = context.contentSections
            .map(section => section.content)
            .join("\n\n");

        fs.writeFileSync('./outputs/story.txt', context.finalContent, 'utf8');
        console.log("Saved final content to ./outputs/story.txt");
        
        return context;
    },
};



// Action: Generate Voiceover 
export const generateVoiceoverFromText: Action = {
    name: "Generate Voiceover Piece",
    execute: async (context: Context) => {
        if (!context.finalContent) {
            throw new Error("Requires final content from previous step");
        }

        context.voiceoverFile = await generateFullVoiceover(context.finalContent);
        return context;
    },
};

export const generateStoryImage: Action = {
    name: "Generate Story Image",
    execute: async (context: Context) => {
        if (!context.synopsis || !context.idea) {
            throw new Error("Requires synopsis and idea from previous steps");
        }

        const imagePrompt = `
        ${context.idea}
        - ${context.synopsis}
        `;

        context.imageFile = await generateImage(imagePrompt, " Digital art, dramatic lighting, cinematic composition, rich colors, detailed environment, movie poster quality, 4K resolution");
        return context;
    },
};

export const generateStoryVideo: Action = {
    name: "Generate Story Video",
    execute: async (context: Context) => {
        if (!context.voiceoverFile || !context.imageFile) {
            throw new Error("Requires voiceover and image files from previous steps");
        }

        context.videoFile = await generateVideo({
            audioFilePath: context.voiceoverFile,
            imageFilePath: context.imageFile
        });

        return context;
    },
};
