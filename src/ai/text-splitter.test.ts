import assert from 'node:assert';
import { describe, it } from 'node:test';

import { RecursiveCharacterTextSplitter } from './text-splitter.js';

describe('RecursiveCharacterTextSplitter', () => {
  it('Should correctly split text by separators', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 50,
      chunkOverlap: 10,
    });
    assert.deepEqual(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter.',
      ),
      ['Hello world', 'this is a test of the recursive text splitter'],
    );

    splitter.chunkSize = 100;
    assert.deepEqual(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter. If I have a period, it should split along the period.',
      ),
      [
        'Hello world, this is a test of the recursive text splitter',
        'If I have a period, it should split along the period.',
      ],
    );

    splitter.chunkSize = 110;
    assert.deepEqual(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter. If I have a period, it should split along the period.\nOr, if there is a new line, it should prioritize splitting on new lines instead.',
      ),
      [
        'Hello world, this is a test of the recursive text splitter',
        'If I have a period, it should split along the period.',
        'Or, if there is a new line, it should prioritize splitting on new lines instead.',
      ],
    );
  });

  it('Should handle empty string', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 50,
      chunkOverlap: 10,
    });
    assert.deepEqual(splitter.splitText(''), []);
  });
});
