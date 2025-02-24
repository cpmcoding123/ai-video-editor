import { NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import { storage } from '../../../lib/firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json();

    // Temporary file paths
    const inputPath = path.join('/tmp', `input_${Date.now()}.mp4`);
    const outputPath = path.join('/tmp', `output_${Date.now()}.mp4`);

    // Download video
    const response = await fetch(videoUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(buffer));

    // Detect HDR metadata
    const { isHDR, colorPrimaries } = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        resolve({
          isHDR: metadata.streams[0].color_primaries === 'bt2020',
          colorPrimaries: metadata.streams[0].color_primaries
        });
      });
    });

    // FFmpeg processing with proper codec handling
    await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .audioFilters('silenceremove=start_periods=1:detection=peak') // Better silence detection
        .videoCodec('libx264') // Force H.264 for better browser compatibility
        .outputOptions([
          '-profile:v main', // Standard H.264 profile
          '-pix_fmt yuv420p', // Universal pixel format
          '-movflags +faststart', // Web optimization
          '-vsync vfr', // Handle variable frame rates
          ...(isHDR ? [
            '-x264-params "colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc"',
            '-preset slow -crf 18' // Higher quality for HDR
          ] : [
            '-color_primaries bt709 -color_trc bt709 -colorspace bt709' // SDR standards
          ])
        ])
        .on('progress', (p) => console.log(`Processing: ${Math.round(p.percent ?? 0)}%`))
        .on('end', resolve)
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .save(outputPath);
    });

    // Upload processed video
    const outputFile = fs.readFileSync(outputPath);
    const storageRef = ref(storage, `videos/trimmed-${Date.now()}.mp4`);
    await uploadBytes(storageRef, outputFile);

    // Cleanup temp files
    [inputPath, outputPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));

    return NextResponse.json({ 
      downloadURL: await getDownloadURL(storageRef) 
    });

  } catch (error) {
    console.error('Processing failed:', error);
    return NextResponse.json(
      { error: 'Video processing failed' },
      { status: 500 }
    );
  }
}