export type VideoTranscriptSegment = {
  text: string;
  offsetSeconds: number;
  durationSeconds: number;
  offsetLabel: string;
};

export type VideoTranscriptPayload = {
  videoId: string;
  language: string | null;
  fetchedAt: string;
  fromCache: boolean;
  fullText: string;
  segments: VideoTranscriptSegment[];
};

export type VideoTranscriptErrorCode =
  | "invalid_video_id"
  | "video_unavailable"
  | "transcript_disabled"
  | "transcript_not_available"
  | "too_many_requests"
  | "upstream_error";

export type VideoTranscriptErrorPayload = {
  error: string;
  errorCode: VideoTranscriptErrorCode;
};
