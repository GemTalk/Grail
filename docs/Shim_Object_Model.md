# Shim Object Model — current design, the "prefix OOP" proposal, and wall analysis

Status: **analysis / design record** (2026-06-14).  No architecture change made
yet; this captures the options and the data so we can revisit deliberately.

## 1. The current hybrid object model

A `PyObject*` the shim hands to a C extension is one of three kinds:

1. **Grail-backed wrapper** — 32-byte `CByteArray` from Smalltalk `wrap:`:
   `[ob_refcnt@0][ob_type@8][oop@16][magic@24]`.  Offsets 0 and 8 are
   ABI-correct; **offset 16 is the GemStone OOP**, which collides with where a
   real CPython object keeps `ob_size`/`ob_item[0]`/payload.  So these are
   *opaque* — usable only through shim *functions* (which delegate to the
   server), never via inlined struct-access macros.  The `GRAILWP1` sentinel at
   offset 24 lets `is_foreign()` recognize them.
2. **Real-layout object** — `ShimListObject` / `ShimTupleObject`, ABI-identical
   to `PyListObject`/`PyTupleObject` (real `ob_item`, and tuple carries CPython
   3.14's `ob_hash`).  `calloc`'d by the shim, registered in `g_real_reg`, **no
   OOP** (bridged to a Grail value on demand via `real_obj_to_oop`).
3. **Foreign object** — a wheel's own C object (numpy DType / scalar / method /
   ufunc, including *static* type structs in the wheel's data segment).  Real
   CPython layout, allocated by the wheel, no OOP.  Crosses *into* Grail as a
   `ShimForeignObject` reverse proxy.

Two independent bridging directions:
* **Grail → C** (our object handed to the extension).  Breaks when the
  extension *inlines* struct access (it bypasses our functions).  Mitigated by
  giving the type a real layout (kind 2).
* **C → Grail** (the extension's object handed to Grail).  Handled by the
  reverse proxy (`ShimForeignObject`).

## 2. The "prefix OOP" proposal

Move the OOP from inside the object (offset 16) to a hidden header *before* the
pointer we hand out — exactly how CPython hides its `PyGC_Head`:

```
[ magic | oop ]  <object body: real CPython layout>
  ^-16    ^-8     ^ ptr handed to the extension
```

`pyobj_oop(ptr)` reads `ptr-8`; `oop == 0` (or no magic at `ptr-16`) ⇒ no
GemStone object.  This **frees the body for a real CPython layout**, so a single
object can be *both* real-layout *and* OOP-backed — collapsing kinds 1 and 2
into one.

### What it genuinely buys
* Grail-backed objects become struct-accessible by extensions (retires the
  inline-access class of bug for *our* objects).
* Identity-stable bridging: cache the Grail OOP in the prefix, so re-crossing
  returns the same object (and a OOP→pointer cache preserves CPython object
  identity, e.g. cached small ints / interned strings).

### What it does NOT solve / costs (things easy to miss)
* **Not all objects are ours.** numpy's *static* type structs live in the
  wheel's data segment — no prefix; `ptr-8`/`ptr-16` reads garbage, not 0.  So
  foreign detection is still required (prefix-magic for heap + a precomputed
  data-segment range check for static — `dladdr` / `malloc_zone_from_ptr` /
  cached `__DATA` ranges from `_dyld_*`).  The prefix relocates the marker; it
  doesn't remove detection.
* **The win is gated on materializing real bodies.**  A real body must hold the
  actual CPython representation (`PyUnicodeObject` kind+buffer, `PyLongObject`
  digits, `PyDictObject` table…).  Cheap and safe only for **immutable**,
  inline-accessed types (materialize-once-cache).  For **mutable** types it's a
  cache-coherence hazard (two sources of truth: the live GemStone object vs the
  C body).  Mature FFIs (JNI, PyObjC, CFFI) proxy mutables, mirror immutables —
  the same split.
* **GC header ordering.**  Real GC-tracked objects expect `[PyGC_Head][PyObject]`
  with the head at `ptr-16`.  A prefix collides unless we reserve a uniform
  32-byte header (OOP@-32, GC head@-16) — wasting 16 bytes on non-GC objects.
  We currently *no-op* GC (GemStone is the real collector), so we can keep a
  16-byte prefix and skip real GC heads — provided no extension walks the GC
  list (numpy's GC path is already neutered).
* **Read-safety.**  Reading `ptr-16` can fault at a segment boundary (rare);
  reading *after* the object (today's offset-24 magic) never does.
* **Refactor surface.**  `pyobj_oop` hot path, the Smalltalk `wrap:` allocator,
  sweep/free, and alignment (need 16-byte prefix) all change.

## 3. Empirical wall analysis (2026-06-14)

Categories: **INLINE-LAYOUT** (extension inlines struct access on *our* object —
prefix/real-layout helps), **FOREIGN-BRIDGE** (extension's object into Grail —
reverse proxy; prefix does *not* help), **FUNCTION** (stub or wrong behavior in
a shim function — neither helps), **BUILD**.

Retrospective — walls actually cleared driving `import numpy`:

| Wall | Category |
|------|----------|
| SIGSEGV npy_cpu_baseline_list (inlined PyList_SET_ITEM) | INLINE-LAYOUT |
| "Info must be a tuple" (inlined PyTuple_GET_SIZE on Grail tuple) | INLINE-LAYOUT |
| PyUFunc_AddLoop crash (missing tuple `ob_hash`, ob_item@32) | INLINE-LAYOUT |
| os.unsetenv missing | FUNCTION |
| PyType_Ready clobbers custom metaclass | FUNCTION |
| PyArg_ParseTupleAndKeywords stub | FUNCTION |
| PyType_Ready no slot inheritance (tp_alloc NULL) | FUNCTION |
| stub run: PyList_GetItemRef, PyDict_GetItemRef, PyNumber_Long, PyObject_Init | FUNCTION ×4 |
| cpython.h linkage → 0x0 | BUILD |
| _add_dtype_helper(DType) — foreign DType into Grail | FOREIGN-BRIDGE |
| PyObject_Call(StringDType) — foreign callable | FOREIGN-BRIDGE (+inline args) |
| RichCompareBool over bridged tuples of foreign proxies | FOREIGN-BRIDGE (+inline) |
| numpy.int64.__index__ (foreign scalar numeric slot) — *current* | FOREIGN-BRIDGE |

Forward sample — temporarily swallowed the int-conversion wall and re-probed:
the next genuine gaps were `PyComplex_AsCComplex` and `PyUnicode_AsUTF8String`
(**FUNCTION** stubs) plus the foreign-scalar str/numeric protocol
(**FOREIGN-BRIDGE**) — **no new INLINE-LAYOUT walls**.  Foreign-object crossings
dominate the run: `numpy._DTypeMeta` ×1120, `numpy._ArrayMethod` ×508,
`numpy.ufunc` ×88, `numpy.int64` ×25, plus every concrete dtype.

### Conclusion
* **INLINE-LAYOUT walls (3) were front-loaded** (our lists/tuples) and are
  **already cleared**.  This is exactly the class the prefix/materialization
  architecture targets — so adopting it *now* invests in walls we've passed.
* **The dominant and increasing pressure is FOREIGN-BRIDGE** (numpy's own
  objects into Grail) **+ FUNCTION** (stubs / behavior).  The prefix-on-*our*-
  objects scheme helps neither.

## 4. Recommendation

1. **Do not adopt the prefix now.**  The data shows near-term leverage is in the
   reverse proxy and function implementations, which it doesn't address.
2. **Near-term priorities** (highest leverage first):
   * Reverse-proxy **protocol forwarding** for foreign objects: numeric
     (`nb_index`/`nb_int`/`nb_float` → `PyLong_As*`/`PyNumber_Index`), `str`,
     and likely buffer/sequence — invoked via the foreign object's own C slots
     in C, not the proxy's absent Python dunders.  (Current frontier:
     `numpy.int64` in ufunc-identity setup.)
   * On-demand function implementations as walls surface (the numpy symbol gap
     is already 0; blind stubs are latent crashes, not progress).
3. **Cheap fragility insurance now:** a build-time file that `#include`s the
   *real* `Python.h` and `static_assert`s the offsets we depend on
   (`offsetof(PyTupleObject, ob_item) == 32`, header offsets, etc.).  This
   catches the next CPython-version layout change at compile time — the
   `ob_hash` class of bug — without the full prefix investment.
4. **Revisit the prefix if** a future extension forces inline access of *our*
   immutable scalar types (e.g. `PyUnicode_DATA`/`PyLong` internals on a Grail
   value), or if we decide to make the object model uniformly real-layout.  The
   prefix is the right primitive for that; scope it to immutable inline-accessed
   types and prototype on one type (`str`) to measure materialization cost first.

See `docs/Shim_NumPy.md` for the running numpy progress and the live frontier.
