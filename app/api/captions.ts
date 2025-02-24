import OpenAI from 'openai';
import { storage } from '../../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get video URL from Firebase Storage
  const storageRef = ref(storage, req.body.videoPath);
  const videoUrl = await getDownloadURL(storageRef);

  // Download the file and convert it to a suitable type
  const response = await fetch(videoUrl);
  const blob = await response.blob();
  const file = new File([blob], 'audio.mp3', { type: blob.type });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
  });

  res.status(200).json({ captions: transcription.text });
}