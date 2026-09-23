# CPython's _codecs_iso2022: getcodec(name) for iso2022_jp, iso2022_jp_1, iso2022_jp_2, iso2022_jp_2004, iso2022_jp_3, iso2022_jp_ext, iso2022_kr.  The engines
# are _cjk's, over tables generated from CPython by scripts/generate_cjk.py.

import _cjk

_NAMES = ('iso2022_jp', 'iso2022_jp_1', 'iso2022_jp_2', 'iso2022_jp_2004', 'iso2022_jp_3', 'iso2022_jp_ext', 'iso2022_kr')
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
