import { FFT } from "@rkesters/dsp.ts";

export const AUDIO_SAMPLE_RATE : number = 44100;

export const analyzeSpectrum = (buffer: number[], bufferSize: number) => {
  const k = Math.floor(Math.log(bufferSize) / Math.LN2);
  if (Math.pow(2, k) !== bufferSize) {
    throw new Error('Invalid buffer size, must be a power of 2');
  }
  if (bufferSize !== buffer.length) {
    throw new Error(`Supplied buffer is not the same size as defined FFT. FFT Size: ${bufferSize} Buffer Size: ${buffer.length}`);
  }

  // run window function
  for (let i = 0; i < bufferSize; ++i)
    buffer[i] *= 0.5*(1 - Math.cos(6.283185307179586*i/bufferSize));
  const spectrum: number[] = new Array(bufferSize / 2);
  const fft = new FFT(bufferSize, 44100);
  fft.forward(buffer);
  const numbers = fft.calculateSpectrum()
  for (let i = 0; i < bufferSize / 2; ++i)
    spectrum[i] = numbers[i];
  return spectrum;
};

export const brutForceFFTSignalLength = (PCMDataLength: number) => {
  let exponent = 1;
  while (true) {
    exponent++;
    if (Math.pow(2, exponent) > PCMDataLength) {
      return Math.pow(2, exponent - 1);
    }
  }
};

export const getSpectrum = (PCMData: number[]) => {
  const signalLength = brutForceFFTSignalLength(PCMData.length);
  const signalStartIndex = Math.trunc(PCMData.length / 2 - signalLength / 2);
  const signal = PCMData.slice(signalStartIndex, signalStartIndex + signalLength);

  return analyzeSpectrum(signal, signalLength);
}
