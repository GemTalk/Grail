# CPython's _codecs_hk: getcodec(name) for big5hkscs.  The engines
# are _cjk's, over tables generated from CPython by scripts/generate_cjk.py.

import _cjk

_NAMES = ('big5hkscs',)
_codecs = {}


def getcodec(name):
    name = str(name)
    if name not in _NAMES:
        raise LookupError('no such codec is supported.')
    codec = _codecs.get(name)
    if codec is None:
        codec = _cjk.make_codec(name)
        _codecs[name] = codec
    return codec
