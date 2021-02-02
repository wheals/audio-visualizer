import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { getSpectrum, AUDIO_SAMPLE_RATE } from './dsp';


export const bufferToUInt8 = (buffer: Buffer, start: number, end: number) => {
  const numbers = [];
  for (let i = start; i < end; i += 1) {
    numbers.push(buffer.readUInt8(i));
  }
  return numbers;
};

export const PCM_FORMAT = {
  bit: 8,
  sign: 'u',
  parseFunction: bufferToUInt8
};
const FFMPEG_FORMAT = `${PCM_FORMAT.sign}${PCM_FORMAT.bit}`;

export const smoothValues = (spectrums: number[], prevSpectrums?: number[]) => {
  if (!prevSpectrums) {
    return spectrums;
  }
  const resultSpectrum: number[] = [];
  for(let i = 0; i < spectrums.length; i++) {
    const currValue = spectrums[i];
    const prevValue = prevSpectrums[i] || 0;
    let avgValue;
    if (currValue > prevValue)
      avgValue = currValue * 0.8 + prevValue * 0.2;
    else
      avgValue = currValue * 0.1 + prevValue * 0.9;

    resultSpectrum.push(avgValue);
  }
  return resultSpectrum;
};

const averageValues = (spectrums: number[], busesCount: number) => {
  const width = spectrums.length / busesCount;
  const resultSpectrum: number[] = [];
  for (let i = 0; i < spectrums.length; i += width) {
    let sum = 0;
    for (let j = 0; j < width; j++) {
      sum += spectrums[i + j];
    }
    resultSpectrum.push(sum / width);
  }
  //console.log(resultSpectrum)
  return resultSpectrum;
}

export const createSpectrumsProcessor = (busesCount: number, audioDataStep: number) => {
  let prevSpectrums: number[] = [];

  return (frameIndex: number, audioBuffer: Buffer) => {
    const audioDataNormalized =
      normalizeAudioData(PCM_FORMAT.parseFunction(audioBuffer, frameIndex * audioDataStep, frameIndex * audioDataStep + audioDataStep));

    const spectrum = getSpectrum(audioDataNormalized);

    const averagedSpectrum = averageValues(spectrum, busesCount);
    const smoothedSpectrum = smoothValues(averagedSpectrum, prevSpectrums);
    prevSpectrums = [...smoothedSpectrum];
    for (let i = 0; i < smoothedSpectrum.length; i++) {
      // convert to db [-90, 0]
      let x = smoothedSpectrum[i];
      x = 20 * Math.log10(x);
      x = Math.min(0, x);
      x = Math.max(-80, x);
      // convert to [0, 1]
      x = x/80 + 1;
      smoothedSpectrum[i] = x;
      // attenuates low freqs and boosts highs
      //spectrum[i] *= -1 * Math.log(((signalLength - i)/2) / (5 * signalLength)) * signalLength;
    }
    //console.log(Math.max(...spectrum));
    //console.log(Math.min(...spectrum));

    return smoothedSpectrum;
  };
};

export const normalizeAudioData = (PCMData: number[]) =>
  PCMData.map(num => (num - 128) / 128);

export const spawnFfmpegAudioReader = (filename: string, format: string) => {
  const ffmpegProcess = spawn(ffmpeg.path, ['-i', filename, '-f', format, '-ac', '1', '-']);
  return ffmpegProcess;
};

export const createAudioBuffer = (filename: string) =>
  new Promise<{ audioBuffer: Buffer, sampleRate: number }>((resolve, reject) => {
    let sampleRate: number;
    const sampleRateRegExp = /(\d+) Hz/m;
    const audioBuffers: Buffer[] = [];
    const ffmpegAudioReader = spawnFfmpegAudioReader(filename, FFMPEG_FORMAT);

    ffmpegAudioReader.stderr.on('data', function (data) {
      const match = data.toString().match(sampleRateRegExp);
      if (!sampleRate && match) {
        sampleRate = parseInt(match[1]);
      }
    });
    ffmpegAudioReader.stdout.on('data', function (chunkBuffer) {
      audioBuffers.push(chunkBuffer);
    });
    ffmpegAudioReader.stdout.on('end', function () {
      const audioBuffer = Buffer.concat(audioBuffers);
      if (!sampleRate) {
        throw new Error('ffmpeg didn\'t show audio sample rate');
      }
      if (sampleRate !== AUDIO_SAMPLE_RATE) {
        throw new Error('sample rate of ' + sampleRate + ' not accepted, need ' + AUDIO_SAMPLE_RATE);
      }
      resolve({ audioBuffer, sampleRate });
    });
  });

