import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { storage } from '../../../lib/firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  const { videoUrl } = await request.json();

  // Download the video from Firebase Storage
  const inputPath = path.join('/tmp', 'input.mp4'); // Temporary file path
  const outputPath = path.join('/tmp', 'output.mp4'); // Output file path

  // Download the video
  const response = await fetch(videoUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(inputPath, Buffer.from(buffer));

  // Check if the video is HDR
  const isHDR = await new Promise<boolean>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const colorPrimaries = metadata.streams[0].color_primaries;
        resolve(colorPrimaries === 'bt2020');
      }
    });
  });

  // Trim silences using FFmpeg and handle HDR video if necessary
  await new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .audioFilters('silenceremove=start_periods=1') // Remove silences
      .videoCodec('libx264') // Use H.264 codec for SDR support
      .audioCodec('aac'); // Use AAC codec for audio

    if (isHDR) {
      command
        .videoCodec('libx265') // Use H.265 codec for HDR support
        .outputOptions([
          '-pix_fmt yuv420p10le', // Preserve 10-bit color depth
          '-color_primaries bt2020', // Set color primaries to BT.2020
          '-color_trc smpte2084', // Set transfer characteristics to SMPTE 2084 (PQ)
          '-colorspace bt2020nc', // Set color space to BT.2020 non-constant
        ]);
    }

    command
      .on('end', resolve) // Resolve when done
      .on('error', reject) // Reject on error
      .save(outputPath); // Save the output
  });

  // Upload the trimmed video back to Firebase Storage
  const outputFile = fs.readFileSync(outputPath);
  const storageRef = ref(storage, `videos/trimmed-${Date.now()}.mp4`);
  await uploadBytes(storageRef, outputFile);

  // Get the download URL for the trimmed video
  const downloadURL = await getDownloadURL(storageRef);

  return NextResponse.json({ downloadURL });
}