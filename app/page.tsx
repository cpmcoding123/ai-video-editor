'use client'; // Mark this as a Client Component (required for interactivity)
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useState } from 'react';
import { storage } from '../lib/firebase';

export default function Home() {
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
    <div style={styles.container}>
      <h1 style={styles.title}>AI Video Editor</h1>
      <input
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        style={styles.fileInput}
        id="file-upload"
      />
      <label htmlFor="file-upload" style={styles.uploadButton}>
        Upload Video
      </label>
      {uploadProgress > 0 && (
        <div style={styles.progressContainer}>
          <progress value={uploadProgress} max="100" style={styles.progressBar} />
          <p style={styles.progressText}>{uploadProgress}% uploaded</p>
        </div>
      )}
      {trimmedVideoUrl && (
        <div style={styles.trimmedVideoContainer}>
          <p style={styles.trimmedVideoText}>Trimmed Video:</p>
          <video
            src={trimmedVideoUrl}
            controls
            style={styles.video}
          ></video>
          <a href={trimmedVideoUrl} download="trimmed-video.mp4" style={styles.downloadButton}>
            Download Trimmed Video
          </a>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    textAlign: 'center' as 'center',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '1.5rem',
    color: '#333',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0070f3',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
  },
  uploadButtonHover: {
    backgroundColor: '#005bb5',
  },
  progressContainer: {
    marginTop: '1rem',
  },
  progressBar: {
    width: '100%',
    height: '1rem',
    borderRadius: '4px',
  },
  progressText: {
    marginTop: '0.5rem',
    fontSize: '1rem',
    color: '#555',
  },
  trimmedVideoContainer: {
    marginTop: '2rem',
  },
  trimmedVideoText: {
    fontSize: '1.25rem',
    color: '#333',
  },
  video: {
    width: '100%',
    marginTop: '1rem',
    borderRadius: '8px',
  },
  downloadButton: {
    display: 'inline-block',
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0070f3',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    textDecoration: 'none',
    transition: 'background-color 0.3s',
  },
  downloadButtonHover: {
    backgroundColor: '#005bb5',
  },
};