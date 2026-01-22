export interface VideoSettings {
  prompt: string;
  duration: 15 | 30 | 60;
  resolution: '1080x1920' | '720x1280';
  voice: string;
}

export interface VideoClip {
  url: string;
  duration: number;
  startTime?: number;
}

export interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface ScriptSegment {
  text: string;
  duration: number;
  keywords: string[];
}

export interface VideoProject {
  script: ScriptSegment[];
  clips: VideoClip[];
  subtitles: SubtitleSegment[];
  audioUrl?: string;
}
