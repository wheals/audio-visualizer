import { Writable } from 'stream';
import { spawn } from 'child_process';
import { path as ffmpegPath } from 'ffmpeg-static';

interface FfmpegVideoWriterConfig {
  audioFilename: string;
  videoFileName: string;
  fps: number;
  width: number;
  height: number;
  crf?: string;
  preset?: string;
  onStderr?: (data: any) => any;
}

export const spawnFfmpegVideoWriter = (config: FfmpegVideoWriterConfig) => {
  const crf = config.crf || '23';
  const preset = config.preset || 'medium';
  const args = [
    '-y',
    '-i', config.audioFilename,
    //'-r', `${config.fps}`,
    //'-i', config.bgFileName,
    '-r', `${config.fps}`,
    '-f', "rawvideo",
    '-pixel_format', 'bgra',
    '-video_size', config.width + "x" + config.height,
    '-i', '-',
    //'-filter_complex', 'overlay',
    '-crf', crf,
    '-c:a', 'aac', '-b:a', '384k', '-profile:a', 'aac_low',
    '-c:v', 'libx264', '-r', `${config.fps}`, '-pix_fmt', 'yuv420p', '-preset', preset, config.videoFileName,
  ];
  const ffmpeg = spawn(ffmpegPath, args);
  ffmpeg.stdin.pipe(process.stdout);
  if (config.onStderr) {
    ffmpeg.stderr.on('data', (config.onStderr));
  }
  return ffmpeg;
};

export const getProgress = (onProgress: (currentFrame: number) => any) =>
  (stderrOutput: Buffer) => {
    const matchResult = stderrOutput.toString().match(/frame=[ ]+(\d+)/);
    if (!matchResult) {
      return;
    }
    const currentFrame = +matchResult[1];
    if (isNaN(currentFrame)) {
      return;
    }
    onProgress(currentFrame);
  };

export const calculateProgress = (framesCount: number, callback: (progress: number) => any) =>
  (currentFrame: number) =>
    callback(
      +(currentFrame / framesCount * 100).toFixed(2)
    );

export const waitDrain = (stream: Writable) =>
  new Promise<void>(resolve => stream.once('drain', resolve));
