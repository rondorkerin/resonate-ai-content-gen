
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

const models = {
  gpt4: 'gpt-4o-mini',
  gpt3: 'gpt-4o-mini',
};
/**
 * Generates text from GPT-4 based on a provided prompt.
 * @param {string} prompt - The input prompt to send to GPT-4.
 * @param {number} [maxTokens=150] - Optional: The maximum number of tokens for the response.
 * @param {string} [model="gpt-4"] - Optional: The OpenAI model to use (default is "gpt-4").
 * @returns {Promise<string>} - The generated response text from GPT-4.
 */
export async function generateText(prompt: string, maxTokens = 4000, model = models.gpt3) {
    try {
        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt },
            ],
            max_tokens: maxTokens,
        });
        
      // Extract and return the response text from the model
      console.log('openAI response\n', response.choices[0].message?.content)
      return response.choices[0].message?.content?.toString() || ''
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
}


/**
 * Generates a voiceover audio file from text using OpenAI's text-to-speech model.
 * @param {string} inputText - The text to convert into speech.
 * @param {string} outputFilePath - The path to save the generated MP3 file.
 * @param {string} voice - The voice model to use for TTS (default: "onyx").
 * @returns {Promise<void>}
 */
export async function generateVoiceover(inputText: string, outputFilePath: string = './speech.mp3', voice: any = 'onyx') {
  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: inputText,
    });
    const speechFile = path.resolve(outputFilePath);

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
      

    console.log(`Voiceover saved to ${outputFilePath}`);
  } catch (error) {
    console.error('Error generating voiceover:', error);
    throw error;
  }
}



/**
 * Splits a large text into chunks with a specified maximum character length.
 * @param {string} text - The text to split.
 * @param {number} maxLength - The maximum character length for each chunk.
 * @returns {string[]} - Array of text chunks.
 */
function splitTextIntoChunks(text, maxLength = 4096) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = start + maxLength;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Generates a full voiceover by splitting the text into manageable chunks,
 * generating individual voiceover files for each chunk, and combining them into one file.
 * @param {string} inputText - The full text to convert into speech.
 * @param {string} outputFilePath - The path to save the final concatenated MP3 file.
 * @param {string} voice - The voice model to use for TTS (default: "onyx").
 * @returns {Promise<void>}
 */
export async function generateFullVoiceover(inputText, outputFilePath = './outputs/full_speech.mp3', voice = 'onyx') {
  try {
    const chunks = splitTextIntoChunks(inputText);
    const tempFiles = [];

    // Generate voiceover for each chunk and save it to a temporary file
    for (let i = 0; i < chunks.length; i++) {
      const chunk = `speech_chunk_${uuidv4()}.mp3`
      console.log('generating voiceover chunk', chunk)
      const tempFilePath = path.join('./temp', chunk);
      await generateVoiceover(chunks[i], tempFilePath, voice);
      tempFiles.push(tempFilePath);
    }

    // Combine all the temporary MP3 files into one
    await new Promise((resolve, reject) => {
      const ffmpegCommand = ffmpeg();

      tempFiles.forEach((file) => {
        ffmpegCommand.input(file);
      });

      ffmpegCommand
        .on('end', resolve)
        .on('error', reject)
        .mergeToFile(outputFilePath);
    });

    console.log(`Full voiceover saved to ${outputFilePath}`);
    
    return outputFilePath
    // Clean up temporary files
    tempFiles.forEach((file) => fs.unlinkSync(file));
  } catch (error) {
    console.error('Error generating full voiceover:', error);
    throw error;
  }
}

// Function to generate image
/**
 * Generates an image based on subject and style inputs.
 * @param {string} subject - The main subject of the image.
 * @param {string} style - The style in which the image should be created.
 * @returns {Promise<void>} - Saves the generated image to './outputs/image.png'.
 */
export async function generateImage(subject, style) {
  const prompt = `${subject} in a ${style} style`;
  
  try {
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024"
    });

    const imageUrl = response.data[0].url;
    const outputImagePath = path.resolve('./outputs/image.png');
    
    // Download and save the image
    await downloadImage(imageUrl, outputImagePath);
    return outputImagePath;
    console.log(`Image saved to ${outputImagePath}`);
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

// Helper function to download the image
async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const request = require('https').get(url, (response) => {
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });
    }).on('error', (error) => {
      fs.unlink(outputPath, () => reject(error));
    });
  });
}