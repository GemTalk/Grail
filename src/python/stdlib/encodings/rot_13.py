#!/usr/bin/env python
""" Python Character Mapping Codec for ROT13.

This codec de/encodes from str to str.

Written by Marc-Andre Lemburg (mal@lemburg.com).
"""
#
# GRAIL: upstream CPython 3.14.7, with the ONE class of edit this package
# always needs -- an entry point bound straight into a class body is
# spelled out as a ``def`` that calls it, because Grail installs a
# self-passing forwarder when a class-body attribute shadows an inherited
# method.  See latin_1.py for the full explanation.
#
# The MAP is also built rather than transcribed.  Upstream lists all 52
# letter entries literally under an identity dict for range(256); the
# arithmetic below produces exactly the same mapping, and a table nobody
# can proof-read by eye is a poor way to carry thirteen.

import codecs

### Codec APIs

class Codec(codecs.Codec):
    def encode(self, input, errors='strict'):
        return (str.translate(input, rot13_map), len(input))

    def decode(self, input, errors='strict'):
        return (str.translate(input, rot13_map), len(input))

class IncrementalEncoder(codecs.IncrementalEncoder):
    def encode(self, input, final=False):
        return str.translate(input, rot13_map)

class IncrementalDecoder(codecs.IncrementalDecoder):
    def decode(self, input, final=False):
        return str.translate(input, rot13_map)

class StreamWriter(Codec, codecs.StreamWriter):
    pass

class StreamReader(Codec, codecs.StreamReader):
    pass

### encodings module API

def getregentry():
    return codecs.CodecInfo(
        name='rot-13',
        encode=Codec().encode,
        decode=Codec().decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamwriter=StreamWriter,
        streamreader=StreamReader,
        _is_text_encoding=False,
    )

### Map

rot13_map = codecs.make_identity_dict(range(256))
for _base in (0x0041, 0x0061):
    for _i in range(26):
        rot13_map[_base + _i] = _base + (_i + 13) % 26
del _base, _i

### Filter API

def rot13(infile, outfile):
    outfile.write(codecs.encode(infile.read(), 'rot-13'))

if __name__ == '__main__':
    import sys
    rot13(sys.stdin, sys.stdout)
