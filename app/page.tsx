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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>AI Video Editor</h1>
      <input
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: '#0070f3',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Upload Video
      </label>
      {videoFile && (
        <p style={{ marginTop: '1rem' }}>Selected: {videoFile.name}</p>
      )}
      {uploadProgress > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <progress value={uploadProgress} max="100" style={{ width: '100%' }} />
          <p>{uploadProgress}% uploaded</p>
        </div>
      )}
      {trimmedVideoUrl && (
        <div style={{ marginTop: '2rem' }}>
          <p>Trimmed Video:</p>
          <video
            src={trimmedVideoUrl}
            controls
            style={{ width: '100%', marginTop: '1rem', borderRadius: '8px' }}
          ></video>
          <a href={trimmedVideoUrl} download="trimmed-video.mp4">Download Trimmed Video</a>
        </div>
      )}
    </div>
  );
}