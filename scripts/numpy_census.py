"""A census of everyday numpy operations, for diffing Grail against CPython.

Each case prints one line: its name and the repr of its result, or the
exception it raised.  Arrays are printed through .tolist(), because str() and
repr() of an array hit the VM's user-action limit (docs/Shim_NumPy.md).

    python3.14 -I scripts/numpy_census.py SITE_PACKAGES > cpython.out
    ./grail scripts/numpy_census.py SITE_PACKAGES > grail.out
    diff cpython.out grail.out

SITE_PACKAGES is a venv's site-packages holding numpy (docs/Shim_NumPy.md,
"Repro").  NP_SKIP=name,name skips cases (one that kills the session);
NP_ONLY=name,name runs only those; NP_W widens the exception text.
"""
import os
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np

def tl(x):
    return x.tolist() if hasattr(x, 'tolist') else x

CASES = [
 ('arange', lambda: tl(np.arange(6))),
 ('reshape', lambda: tl(np.arange(6).reshape(2, 3))),
 ('shape', lambda: np.arange(6).reshape(2, 3).shape),
 ('dtype name', lambda: np.arange(3.0).dtype.name),
 ('add', lambda: tl(np.arange(3) + np.arange(3))),
 ('scalar mul', lambda: tl(np.arange(3) * 2.5)),
 ('sum', lambda: tl(np.arange(10).sum())),
 ('mean', lambda: tl(np.arange(10).mean())),
 ('std', lambda: round(float(np.arange(10).std()), 6)),
 ('axis sum', lambda: tl(np.arange(6).reshape(2, 3).sum(axis=0))),
 ('slice', lambda: tl(np.arange(10)[2:8:2])),
 ('fancy idx', lambda: tl(np.arange(10)[[1, 3, 5]])),
 ('bool idx', lambda: tl(np.arange(10)[np.arange(10) % 2 == 0])),
 ('setitem', lambda: (lambda a: (a.__setitem__(slice(0, 2), 9), tl(a))[1])(np.zeros(4))),
 ('zeros', lambda: tl(np.zeros((2, 2)))),
 ('ones int', lambda: tl(np.ones(3, dtype=int))),
 ('eye', lambda: tl(np.eye(2))),
 ('linspace', lambda: tl(np.linspace(0, 1, 5))),
 ('dot', lambda: tl(np.dot([[1, 2], [3, 4]], [[5, 6], [7, 8]]))),
 ('matmul', lambda: tl(np.array([[1, 2], [3, 4]]) @ np.array([1, 1]))),
 ('transpose', lambda: tl(np.arange(6).reshape(2, 3).T)),
 ('concatenate', lambda: tl(np.concatenate([np.arange(2), np.arange(3)]))),
 ('stack', lambda: tl(np.stack([np.arange(2), np.arange(2)]))),
 ('where', lambda: tl(np.where(np.arange(5) > 2, 1, 0))),
 ('argmax', lambda: tl(np.argmax(np.array([3, 9, 2])))),
 ('sort', lambda: tl(np.sort(np.array([3, 1, 2])))),
 ('argsort', lambda: tl(np.argsort(np.array([3, 1, 2])))),
 ('unique', lambda: tl(np.unique(np.array([3, 1, 3, 2])))),
 ('cumsum', lambda: tl(np.cumsum(np.arange(5)))),
 ('sqrt', lambda: tl(np.sqrt(np.array([4.0, 9.0])))),
 ('exp', lambda: round(float(np.exp(1.0)), 6)),
 ('clip', lambda: tl(np.clip(np.arange(6), 1, 4))),
 ('astype', lambda: tl(np.arange(3).astype(np.float32))),
 ('float32 dtype', lambda: np.float32(1.5).dtype.name),
 ('scalar type', lambda: type(np.arange(3)[0]).__name__),
 ('item', lambda: np.arange(3)[1].item()),
 ('int()', lambda: int(np.int64(7))),
 ('float()', lambda: float(np.float64(2.5))),
 ('bool()', lambda: bool(np.bool_(True))),
 ('len', lambda: len(np.arange(4))),
 ('iter', lambda: [int(x) for x in np.arange(3)]),
 ('list()', lambda: [int(x) for x in list(np.arange(3))]),
 ('== array', lambda: tl(np.arange(3) == np.array([0, 5, 2]))),
 ('all/any', lambda: (bool(np.all(np.arange(3) >= 0)), bool(np.any(np.arange(3) > 5)))),
 ('isnan', lambda: tl(np.isnan(np.array([1.0, np.nan])))),
 ('nan const', lambda: str(np.nan)),
 ('pi', lambda: np.pi),
 ('from list of lists', lambda: tl(np.array([[1.5, 2], [3, 4]]))),
 ('from tuple', lambda: tl(np.array((1, 2, 3)))),
 ('from range', lambda: tl(np.array(range(4)))),
 ('from generator', lambda: tl(np.fromiter((i * i for i in range(4)), dtype=int))),
 ('asarray', lambda: tl(np.asarray([1, 2]))),
 ('copy', lambda: tl(np.arange(3).copy())),
 ('inplace +=', lambda: (lambda a: (a.__iadd__(1), tl(a))[1])(np.arange(3))),
 ('broadcast', lambda: tl(np.arange(3).reshape(3, 1) + np.arange(2))),
 ('random seed', lambda: tl(np.random.default_rng(0).integers(0, 10, 3))),
 ('linalg.inv', lambda: [[round(v, 6) for v in r] for r in tl(np.linalg.inv(np.array([[2.0, 0], [0, 4.0]])))]),
 ('linalg.det', lambda: round(float(np.linalg.det(np.array([[1.0, 2], [3, 4]]))), 6)),
 ('polyfit', lambda: [round(v, 6) for v in tl(np.polyfit([0, 1, 2], [1, 3, 5], 1))]),
 ('fft', lambda: [round(abs(v), 6) for v in tl(np.fft.fft(np.array([1.0, 0, 0, 0])))]),
 ('structured', lambda: tl(np.array([(1, 2.0)], dtype=[('a', 'i4'), ('b', 'f8')])['b'])),
 ('datetime64', lambda: str(np.datetime64('2020-01-01') + np.timedelta64(1, 'D'))),
 ('str dtype', lambda: tl(np.array(['ab', 'c']))),
 ('object dtype', lambda: tl(np.array([1, 'x', None], dtype=object))),
 ('isinstance ndarray', lambda: isinstance(np.arange(2), np.ndarray)),
 ('subclass ndarray', lambda: type(np.arange(3).view(type('Sub', (np.ndarray,), {}))).__name__),
 ('matrix', lambda: tl(np.matrix([[1, 2], [3, 4]]).T)),
 ('ma', lambda: tl(np.ma.masked_array([1, 2, 3], mask=[0, 1, 0]).sum())),
 ('savetxt/loadtxt', lambda: (lambda io: (np.savetxt(io, np.arange(3.0)), io.seek(0), tl(np.loadtxt(io)))[2])(__import__('io').StringIO())),
 ('np.save/load', lambda: (lambda io: (np.save(io, np.arange(3)), io.seek(0), tl(np.load(io)))[2])(__import__('io').BytesIO())),
 ('tobytes', lambda: np.array([1, 2], dtype='<i2').tobytes()),
 ('frombuffer', lambda: tl(np.frombuffer(b'\x01\x00\x02\x00', dtype='<i2'))),
 ('vectorize', lambda: tl(np.vectorize(lambda x: x + 1)(np.arange(3)))),
 ('apply_along_axis', lambda: tl(np.apply_along_axis(sum, 1, np.arange(6).reshape(2, 3)))),
 ('__doc__', lambda: (np.array.__doc__ or '')[:30]),
 ('ufunc __name__', lambda: np.add.__name__),
 ('ufunc nin', lambda: np.add.nin),
 ('ufunc reduce', lambda: tl(np.add.reduce(np.arange(5)))),
 ('errstate', lambda: (lambda: [np.errstate(divide='ignore').__enter__(), tl(np.array([1.0]) / 0)][1])()),
 ('divide warning', lambda: tl(np.array([1.0]) / 0)),
 ('array_equal', lambda: np.array_equal([1, 2], [1, 2])),
 ('allclose', lambda: bool(np.allclose([1.0], [1.0 + 1e-10]))),
 ('ndim/size', lambda: (np.zeros((2, 3)).ndim, np.zeros((2, 3)).size)),
 ('np.float64 arith', lambda: float(np.float64(1.5) + 1)),
 ('hash scalar', lambda: hash(np.int64(5)) == hash(5)),
 ('dict key scalar', lambda: {np.int64(5): 'x'}[5]),
 ('format scalar', lambda: '%.2f' % np.float64(1.234)),
 ('f-string scalar', lambda: f'{np.float64(1.5):.1f}'),
 ('str scalar', lambda: str(np.float64(1.5))),
 ('repr scalar', lambda: repr(np.int64(3))),
 ('str array', lambda: str(np.arange(3))),
 ('repr array', lambda: repr(np.arange(3))),
 ('str dtype obj', lambda: str(np.dtype('float64'))),
 ('pickle', lambda: tl(__import__('pickle').loads(__import__('pickle').dumps(np.arange(3))))),
 ('deepcopy', lambda: tl(__import__('copy').deepcopy(np.arange(3)))),
 ('memoryview', lambda: memoryview(np.arange(3, dtype='<i4')).tolist()),
 ('array from memoryview', lambda: tl(np.asarray(memoryview(b'ab')))),
 ('nditer', lambda: [int(x) for x in np.nditer(np.arange(3))]),
 ('ndenumerate', lambda: [(i, int(v)) for i, v in np.ndenumerate(np.arange(2))]),
 ('einsum', lambda: tl(np.einsum('ij->j', np.arange(4).reshape(2, 2)))),
 ('histogram', lambda: tl(np.histogram([1, 2, 2, 3], bins=3)[0])),
 ('percentile', lambda: float(np.percentile(np.arange(5), 50))),
 ('meshgrid', lambda: tl(np.meshgrid(np.arange(2), np.arange(2))[0])),
 ('char', lambda: tl(np.char.upper(np.array(['ab'])))),
 ('set_printoptions', lambda: np.set_printoptions(precision=3) is None),
]

SKIP = set(filter(None, os.environ.get('NP_SKIP', '').split(',')))
ONLY = set(filter(None, os.environ.get('NP_ONLY', '').split(',')))
for name, fn in CASES:
    if name in SKIP or (ONLY and name not in ONLY):
        continue
    try:
        r = fn()
        out = repr(r)
    except BaseException as e:
        out = 'EXC ' + type(e).__name__ + ': ' + str(e)[:int(os.environ.get('NP_W', '100'))]
    print('%-22s %s' % (name, out))
