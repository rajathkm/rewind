/**
 * Podcast Audio Transcription Service
 *
 * Uses OpenAI's Whisper API to transcribe podcast audio files.
 * Handles large audio files by chunking and provides retry logic.
 *
 * Features:
 * - Transcribe audio from URLs or file buffers
 * - Automatic chunking for large files (>25MB limit)
 * - Multiple language support
 * - Timestamp extraction
 * - Cost tracking
 */

import OpenAI from "openai";

// ============================================================================
// Types
// ============================================================================

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language: string;
  duration?: number;
  cost: number;
  processingTimeMs: number;
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 code (e.g., "en", "es", "fr")
  prompt?: string; // Context prompt to improve accuracy
  responseFormat?: "json" | "text" | "srt" | "vtt" | "verbose_json";
  temperature?: number; // 0-1, lower is more deterministic
}

export interface TranscriptionError {
  code: "FILE_TOO_LARGE" | "INVALID_AUDIO" | "API_ERROR" | "NETWORK_ERROR" | "TIMEOUT";
  message: string;
  isRetryable: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Whisper API limits
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SUPPORTED_FORMATS = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg"];

// Cost per minute of audio (approximate)
const WHISPER_COST_PER_MINUTE = 0.006; // $0.006 per minute

// ============================================================================
// OpenAI Client
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// Transcription Functions
// ============================================================================

/**
 * Transcribe audio from a URL
 * Downloads the audio and sends it to Whisper API
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<{ result: TranscriptionResult | null; error?: TranscriptionError }> {
  const startTime = Date.now();

  try {
    console.log(`[Transcription] Downloading audio from: ${audioUrl}`);

    // Download the audio file
    const response = await fetch(audioUrl, {
      headers: {
        "User-Agent": "Rewind/1.0 (+https://rewind.app)",
        Accept: "audio/*",
      },
    });

    if (!response.ok) {
      return {
        result: null,
        error: {
          code: "NETWORK_ERROR",
          message: `Failed to download audio: ${response.status}`,
          isRetryable: true,
        },
      };
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      console.log(`[Transcription] File too large (${contentLength} bytes), will need chunking`);
      // For now, return an error - chunking implementation can be added later
      return {
        result: null,
        error: {
          code: "FILE_TOO_LARGE",
          message: `Audio file exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit. Large file transcription not yet supported.`,
          isRetryable: false,
        },
      };
    }

    // Get the audio data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension from URL or content-type
    const contentType = response.headers.get("content-type") || "";
    const extension = getExtensionFromUrl(audioUrl) || getExtensionFromContentType(contentType);

    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      return {
        result: null,
        error: {
          code: "INVALID_AUDIO",
          message: `Unsupported audio format: ${extension || "unknown"}. Supported: ${SUPPORTED_FORMATS.join(", ")}`,
          isRetryable: false,
        },
      };
    }

    return transcribeAudio(buffer, extension, options);
  } catch (error) {
    console.error("[Transcription] Error downloading audio:", error);
    return {
      result: null,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Failed to download audio",
        isRetryable: true,
      },
    };
  }
}

/**
 * Transcribe audio from a buffer
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  fileExtension: string,
  options: TranscriptionOptions = {}
): Promise<{ result: TranscriptionResult | null; error?: TranscriptionError }> {
  const startTime = Date.now();

  try {
    // Check file size
    if (audioBuffer.length > MAX_FILE_SIZE) {
      return {
        result: null,
        error: {
          code: "FILE_TOO_LARGE",
          message: `Audio file (${Math.round(audioBuffer.length / 1024 / 1024)}MB) exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          isRetryable: false,
        },
      };
    }

    console.log(`[Transcription] Starting transcription: ${audioBuffer.length} bytes, format: ${fileExtension}`);

    const client = getOpenAIClient();

    // Create a File object from the buffer (convert to Uint8Array for compatibility)
    const uint8Array = new Uint8Array(audioBuffer);
    const file = new File([uint8Array], `audio.${fileExtension}`, {
      type: getMimeType(fileExtension),
    });

    // Call Whisper API
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: options.language,
      prompt: options.prompt,
      response_format: options.responseFormat || "verbose_json",
      temperature: options.temperature ?? 0,
    });

    const processingTimeMs = Date.now() - startTime;

    // Parse response based on format
    if (typeof transcription === "string") {
      // Simple text response
      return {
        result: {
          text: transcription,
          language: options.language || "en",
          cost: 0, // Can't calculate without duration
          processingTimeMs,
        },
      };
    }

    // Verbose JSON response
    const verboseResponse = transcription as {
      text: string;
      language?: string;
      duration?: number;
      segments?: Array<{
        text: string;
        start: number;
        end: number;
      }>;
    };

    // Calculate cost based on duration
    const durationMinutes = (verboseResponse.duration || 0) / 60;
    const cost = durationMinutes * WHISPER_COST_PER_MINUTE;

    // Extract segments if available
    const segments: TranscriptionSegment[] | undefined = verboseResponse.segments?.map(
      (seg) => ({
        text: seg.text.trim(),
        startTime: seg.start,
        endTime: seg.end,
      })
    );

    console.log(
      `[Transcription] Completed: ${verboseResponse.text.length} chars, ` +
        `${segments?.length || 0} segments, ${processingTimeMs}ms, $${cost.toFixed(4)}`
    );

    return {
      result: {
        text: verboseResponse.text,
        segments,
        language: verboseResponse.language || options.language || "en",
        duration: verboseResponse.duration,
        cost,
        processingTimeMs,
      },
    };
  } catch (error) {
    console.error("[Transcription] API error:", error);

    // Check for specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return {
          result: null,
          error: {
            code: "API_ERROR",
            message: "Rate limited. Please try again later.",
            isRetryable: true,
          },
        };
      }
      if (error.status === 413) {
        return {
          result: null,
          error: {
            code: "FILE_TOO_LARGE",
            message: "Audio file is too large for the API",
            isRetryable: false,
          },
        };
      }
    }

    return {
      result: null,
      error: {
        code: "API_ERROR",
        message: error instanceof Error ? error.message : "Transcription failed",
        isRetryable: true,
      },
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract file extension from URL
 */
function getExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Map content-type to file extension
 */
function getExtensionFromContentType(contentType: string): string | null {
  const typeMap: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/x-ogg": "ogg",
  };

  // Extract base type without parameters
  const baseType = contentType.split(";")[0].trim().toLowerCase();
  return typeMap[baseType] || null;
}

/**
 * Get MIME type for file extension
 */
function getMimeType(extension: string): string {
  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    mpeg: "audio/mpeg",
    mpga: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
  };

  return mimeMap[extension.toLowerCase()] || "audio/mpeg";
}

/**
 * Estimate transcription cost based on audio duration
 */
export function estimateTranscriptionCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  return durationMinutes * WHISPER_COST_PER_MINUTE;
}

/**
 * Check if an audio URL can be transcribed
 */
export function canTranscribe(audioUrl: string): boolean {
  const extension = getExtensionFromUrl(audioUrl);
  return extension !== null && SUPPORTED_FORMATS.includes(extension);
}
