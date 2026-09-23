# CPython's _codecs_jp: getcodec(name) for shift_jis, cp932, euc_jp, shift_jis_2004, shift_jisx0213, euc_jis_2004, euc_jisx0213.  The engines
# are _cjk's, over tables generated from CPython by scripts/generate_cjk.py.

import _cjk

_NAMES = ('shift_jis', 'cp932', 'euc_jp', 'shift_jis_2004', 'shift_jisx0213', 'euc_jis_2004', 'euc_jisx0213')
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
