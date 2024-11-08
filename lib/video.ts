import { generateFullVoiceover } from './openai';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

// Function: Generate Video
export const generateVideo = async ({ audioFilePath, imageFilePath }): Promise<string> => {
  const outputVideoPath = './outputs/video.mp4';

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imageFilePath)
      .loop() // Loop the image for the duration of the audio
      .input(audioFilePath)
      .outputOptions('-c:v libx264') // Video codec
      .outputOptions('-c:a aac')     // Audio codec
      .outputOptions('-b:a 192k')    // Audio bitrate
      .outputOptions('-pix_fmt yuv420p') // Pixel format to ensure compatibility
      .save(outputVideoPath)
      .on('start', (commandLine) => {
        console.log('Spawned FFmpeg with command: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('end', () => {
        console.log('Video creation completed successfully.');
        resolve(outputVideoPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error occurred: ' + err.message);
        console.error('ffmpeg output:\n' + stdout);
        console.error('ffmpeg stderr:\n' + stderr);
        reject(err);
      });
  });
};