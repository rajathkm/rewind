/**
 * Podcast module exports
 *
 * Provides comprehensive podcast capabilities including:
 * - Discovery and search via iTunes API
 * - RSS feed parsing
 * - Episode transcript fetching
 * - Audio transcription via Whisper
 * - Complete episode processing (transcribe + summarize)
 */

export {
  searchPodcasts,
  getPodcastByItunesId,
  fetchPodcastFeed,
  fetchEpisodeTranscript,
  validatePodcastFeed,
  getTopPodcasts,
  type PodcastSearchResult,
  type PodcastDetails,
  type PodcastEpisode,
  type DiscoveryError,
} from "./discovery";

export {
  transcribeAudio,
  transcribeAudioFromUrl,
  estimateTranscriptionCost,
  canTranscribe,
  type TranscriptionResult,
  type TranscriptionOptions,
  type TranscriptionError,
} from "./transcription";

export {
  processPodcastEpisode,
  processPodcastBatch,
  getPendingPodcastEpisodes,
  type ProcessingResult,
  type ProcessingOptions,
} from "./processor";
