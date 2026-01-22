'use client';

import VideoGenerator from '@/components/VideoGenerator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            YouTube Shorts Generator
          </h1>
          <p className="text-xl text-gray-300">
            Create engaging vertical videos with AI-powered scripts, voiceovers, and subtitles
          </p>
        </div>
        <VideoGenerator />
      </div>
    </main>
  );
}
