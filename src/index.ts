import path from 'path';
import { createAudioBuffer, createSpectrumsProcessor } from './audio';
import { createVisualizerFrame } from './image';
import { spawnFfmpegVideoWriter, getProgress, calculateProgress, waitDrain } from './video';

export interface Config {
  audio: {
    path: string
  };
  outVideo: {
    path: string;
    fps?: number;
    spectrum?: {
      width?: number;
      height?: number;
    }
  };
  tweaks?: {
    ffmpeg_cfr?: string;
    ffmpeg_preset?: string;
    frame_processing_delay?: number;
  };
}

const sleep = (timeout: number) =>
  new Promise(resolve => setTimeout(resolve, 1000));

export const renderAudioVisualizer = (config: Config, onProgress?: (progress: number) => any, shouldStop?: () => boolean) =>
  new Promise<number>(async (resolve) => {
    const audioFilePath = path.resolve(config.audio.path);
    const outVideoPath = path.resolve(config.outVideo.path);

    const audioReader = await createAudioBuffer(audioFilePath);
    const audioBuffer = audioReader.audioBuffer;
    const sampleRate = audioReader.sampleRate;

    const FPS = config.outVideo.fps || 60;
    const ffmpeg_cfr =
      config.tweaks && config.tweaks.ffmpeg_cfr;
    const ffmpeg_preset =
      config.tweaks && config.tweaks.ffmpeg_preset;
    const frame_processing_delay =
      config.tweaks && config.tweaks.frame_processing_delay;
    const spectrumBusesCount = 64;

    const audioDuration = audioBuffer.length / sampleRate;
    const framesCount = Math.trunc(audioDuration * FPS);
    const audioDataStep = Math.trunc(audioBuffer.length / framesCount);
    const width = 800;
    const height = 600;

    const ffmpegVideoWriter = spawnFfmpegVideoWriter({
      audioFilename: audioFilePath,
      videoFileName: outVideoPath,
      fps: FPS,
      ...(!!onProgress && { onStderr: getProgress(calculateProgress(framesCount + 1, onProgress)) }),
      ...(ffmpeg_cfr && { crf: ffmpeg_cfr }),
      ...(ffmpeg_preset && { preset: ffmpeg_preset }),
      width,
      height
    });
    ffmpegVideoWriter.on('exit', (code: number) => resolve(code));

    const processSpectrum = createSpectrumsProcessor(spectrumBusesCount, audioDataStep);
    for (let i = 0; i < framesCount; i++) {
      const spectrum = processSpectrum(i, audioBuffer);
      const frameImage = createVisualizerFrame(
        spectrum,
        { width, height });
      const isFrameProcessed = ffmpegVideoWriter.stdin.write(frameImage);
      if (!isFrameProcessed) {
        await waitDrain(ffmpegVideoWriter.stdin);
      }
      if (shouldStop && shouldStop()) {
        break;
      }
      if (frame_processing_delay) {
        await sleep(frame_processing_delay);
      }
    }

    ffmpegVideoWriter.stdin.end();
  });
