# CPython's _codecs_cn: getcodec(name) for gb2312, gbk, gb18030, hz.  The engines
# are _cjk's, over tables generated from CPython by scripts/generate_cjk.py.

import _cjk

_NAMES = ('gb2312', 'gbk', 'gb18030', 'hz')
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
