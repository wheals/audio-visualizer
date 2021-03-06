import { expect } from 'chai';
import { Readable, Writable, Pipe } from 'stream';
import child_process, { ChildProcessWithoutNullStreams } from 'child_process';
import {
  bufferToUInt8,
  normalizeAudioData,
  spawnFfmpegAudioReader,
  smoothValues,
  createSpectrumsProcessor,
} from '../audio';
import { createSandbox } from 'sinon';

let childProcessStream = {
  stdin: new Writable(),
  stderr: new Readable(),
};

const videoSandbox = createSandbox();

describe('audio', function () {

  this.beforeAll(function () {
    videoSandbox.stub(child_process, 'spawn').returns(childProcessStream as ChildProcessWithoutNullStreams);
  });

  this.afterAll(function () {
    videoSandbox.restore();
  });

  it('bufferToUInt8', function () {
    const expected = [1, 2, 3, 4, 5];
    const buffer = Buffer.from(new Uint8Array(expected));
    const result = bufferToUInt8(buffer, 0, 5);
    expect(result).deep.equal(expected);
  });

  it('normalizeAudioData', function () {
    const result = normalizeAudioData([4, 5, 23, 78, 2]);
    const expected = [-0.96875, -0.9609375, -0.8203125, -0.390625, -0.984375];
    expect(result).deep.equal(expected);
  });

  it('spawnFfmpegAudioReader', function (done) {
    const childProcessReadableStream = new Readable();
    const childProcessWritableStream = new Writable();
    childProcessReadableStream._read = () => { done(); };
    (<Pipe>childProcessWritableStream.pipe) = () => childProcessWritableStream;

    childProcessStream.stdin = childProcessWritableStream;
    childProcessStream.stderr = childProcessReadableStream;

    const ffmpegProcess = spawnFfmpegAudioReader('filename', 'format');
    ffmpegProcess.stderr.on('data', (data) => {
      expect(data).equal('some data');
    });

    childProcessStream.stderr.emit('data', 'some data');
  });
});
