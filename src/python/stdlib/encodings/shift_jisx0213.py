#
# shift_jisx0213.py: Python Unicode Codec for SHIFT_JISX0213
#
# Written by Hye-Shik Chang <perky@FreeBSD.org>
#
#
# GRAIL: upstream CPython 3.14.6, with the ONE class of edit utf_8.py
# describes: upstream binds ``codec.encode`` / ``codec.decode`` (C methods)
# straight into ``Codec``'s body, which Grail's shadowing forwarder would
# call with ``self`` as the input, so they are spelled out as ``def``s.
# The codec behind them is _cjk's (see _codecs_*.py).

import _codecs_jp, codecs
import _multibytecodec as mbc

codec = _codecs_jp.getcodec('shift_jisx0213')

class Codec(codecs.Codec):
    def encode(self, input, errors='strict'):
        return codec.encode(input, errors)

    def decode(self, input, errors='strict'):
        return codec.decode(input, errors)

class IncrementalEncoder(mbc.MultibyteIncrementalEncoder,
                         codecs.IncrementalEncoder):
    codec = codec

class IncrementalDecoder(mbc.MultibyteIncrementalDecoder,
                         codecs.IncrementalDecoder):
    codec = codec

class StreamReader(Codec, mbc.MultibyteStreamReader, codecs.StreamReader):
    codec = codec

class StreamWriter(Codec, mbc.MultibyteStreamWriter, codecs.StreamWriter):
    codec = codec

def getregentry():
    return codecs.CodecInfo(
        name='shift_jisx0213',
        encode=Codec().encode,
        decode=Codec().decode,
        incrementalencoder=IncrementalEncoder,
        incrementaldecoder=IncrementalDecoder,
        streamreader=StreamReader,
        streamwriter=StreamWriter,
    )
