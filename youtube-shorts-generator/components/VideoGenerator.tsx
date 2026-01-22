'use client';

import { useState, useEffect } from 'react';
import { VideoSettings, ScriptSegment, VideoClip, SubtitleSegment } from '@/types';
import { generateScript, createFallbackScript } from '@/lib/scriptGenerator';
import { searchVideos, selectClipsForDuration } from '@/lib/videoSearch';
import { generateVoiceover, generateSubtitles, getAvailableVoices } from '@/lib/textToSpeech';
import { composeVideo, loadFFmpeg } from '@/lib/videoComposer';

export default function VideoGenerator() {
  const [settings, setSettings] = useState<VideoSettings>({
    prompt: '',
    duration: 30,
    resolution: '1080x1920',
    voice: '',
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadVoices = async () => {
      const availableVoices = await getAvailableVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        setSettings(prev => ({ ...prev, voice: availableVoices[0].name }));
      }
    };

    loadVoices();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress('Starting video generation...');
    setCurrentStep(0);
    setError('');
    setVideoUrl('');

    try {
      // Step 1: Generate script
      setCurrentStep(1);
      setProgress('Generating AI script...');
      let scriptSegments: ScriptSegment[];
      try {
        scriptSegments = await generateScript(settings.prompt, settings.duration);
      } catch (error) {
        console.error('Using fallback script:', error);
        scriptSegments = createFallbackScript(settings.prompt, settings.duration);
      }

      // Step 2: Search for videos
      setCurrentStep(2);
      setProgress('Searching for relevant videos...');
      const allKeywords = scriptSegments.flatMap(s => s.keywords);
      const uniqueKeywords = Array.from(new Set(allKeywords));
      const videoClips = await searchVideos(uniqueKeywords, settings.duration);

      if (videoClips.length === 0) {
        throw new Error('No videos found for the given prompt');
      }

      const selectedClips = selectClipsForDuration(videoClips, settings.duration);

      // Step 3: Generate voiceover
      setCurrentStep(3);
      setProgress('Generating voiceover...');
      const fullScript = scriptSegments.map(s => s.text).join(' ');
      const { audioBlob, duration } = await generateVoiceover(fullScript, settings.voice);

      // Step 4: Generate subtitles
      setCurrentStep(4);
      setProgress('Creating subtitles...');
      const subtitles = generateSubtitles(fullScript, duration || settings.duration);

      // Step 5: Load FFmpeg
      setCurrentStep(5);
      setProgress('Loading video processor...');
      await loadFFmpeg();

      // Step 6: Compose final video
      setCurrentStep(6);
      setProgress('Composing final video...');
      const videoBlob = await composeVideo(
        selectedClips,
        subtitles,
        audioBlob,
        settings.resolution,
        (progress) => {
          setProgress(`Composing video: ${progress.toFixed(0)}%`);
        }
      );

      // Create download URL
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      setProgress('Video generated successfully!');
      setCurrentStep(7);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const steps = [
    'Ready',
    'Generating Script',
    'Searching Videos',
    'Creating Voiceover',
    'Adding Subtitles',
    'Loading Processor',
    'Composing Video',
    'Complete',
  ];

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <div className="space-y-6">
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Video Prompt
          </label>
          <textarea
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none text-gray-900"
            rows={3}
            placeholder="E.g., Create a motivational workout video"
            value={settings.prompt}
            onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
            disabled={isGenerating}
          />
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Duration
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[15, 30, 60].map((duration) => (
              <button
                key={duration}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  settings.duration === duration
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSettings({ ...settings, duration: duration as 15 | 30 | 60 })}
                disabled={isGenerating}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>

        {/* Resolution Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Resolution
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: '1080x1920', label: 'Full HD (1080x1920)' },
              { value: '720x1280', label: 'HD (720x1280)' },
            ].map((res) => (
              <button
                key={res.value}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  settings.resolution === res.value
                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() =>
                  setSettings({ ...settings, resolution: res.value as '1080x1920' | '720x1280' })
                }
                disabled={isGenerating}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Voice
          </label>
          <select
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
            value={settings.voice}
            onChange={(e) => setSettings({ ...settings, voice: e.target.value })}
            disabled={isGenerating}
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <button
          className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
            isGenerating || !settings.prompt
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
          onClick={handleGenerate}
          disabled={isGenerating || !settings.prompt}
        >
          {isGenerating ? 'Generating...' : 'Generate Video'}
        </button>

        {/* Progress Section */}
        {(isGenerating || progress) && (
          <div className="mt-6 space-y-4">
            {/* Progress Steps */}
            <div className="flex justify-between items-center">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index <= currentStep
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 hidden sm:block">{step}</span>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Progress Text */}
            <p className="text-center text-gray-700 font-medium">{progress}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
            <p className="text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Video Preview */}
        {videoUrl && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Your Video is Ready!</h3>
            <video
              className="w-full max-w-md mx-auto rounded-lg shadow-lg"
              controls
              src={videoUrl}
            />
            <a
              href={videoUrl}
              download="youtube-short.mp4"
              className="block w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-center transition-all shadow-lg hover:shadow-xl"
            >
              Download Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
