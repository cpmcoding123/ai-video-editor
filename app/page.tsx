'use client'; // Mark this as a Client Component (required for interactivity)
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useState } from 'react';
import { storage } from '../lib/firebase';

export default function Home() {
  const [videoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trimmedVideoUrl, setTrimmedVideoUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const file = files[0];
    if (!file) return;

    // Upload to Firebase Storage
    const storageRef = ref(storage, `videos/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
      },
      async () => {
        // Upload complete
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        // Call the API route to trim silences
        const response = await fetch('/api/process-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: downloadURL }),
        });
        const { downloadURL: trimmedUrl } = await response.json();

        // Set the trimmed video URL
        setTrimmedVideoUrl(trimmedUrl);
      }
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>AI Video Editor</h1>
      <input type="file" accept="video/*" onChange={handleFileUpload} />
      {videoFile && <p>Selected: {videoFile.name}</p>}
      {uploadProgress > 0 && (
        <div>
          <progress value={uploadProgress} max="100" />
          <p>{uploadProgress}% uploaded</p>
        </div>
      )}
      {trimmedVideoUrl && (
        <div>
          <p>Trimmed Video:</p>
          <video src={trimmedVideoUrl} controls style={{ width: '100%' }} />
          <a href={trimmedVideoUrl} download="trimmed-video.mp4">Download Trimmed Video</a>
        </div>
      )}
    </div>
  );
}