# Subclassing a C extension type from Python

Status: **design proposal** (2026-10-13).  Steps 1 and 2 of §6 are
implemented (2026-10-14; see Shim_NumPy.md, stage 3); steps 3 and 4, real
subclass instances, are not.
It is written for the numpy frontier in [Shim_NumPy.md](Shim_NumPy.md), stage 2,
and builds on [Shim_Object_Model.md](Shim_Object_Model.md) and on the type
mirrors of [Support_Pydantic.md](Support_Pydantic.md), Phase 5.

## 1. The wall

```python
# numpy/_core/memmap.py:24
class memmap(ndarray):
```

```
TypeError: cannot subclass a non-class base (ShimForeignObject)
```

`ndarray` is numpy's C type. Under the shim it reaches Grail as a
`ShimForeignObject`, a proxy for a C pointer. Grail compiles `class C(base)` into
a `___subclass___:` send to the base object, and a proxy has no answer for that.

### Where it matters

`import numpy` defines four such classes and creates no instances of them:
`memmap(ndarray)`, `recarray(ndarray)`, `record(void)` (a subclass of a numpy
*scalar* type) and `matrix(ndarray)`. The fourth is imported by
`numpy/__init__.py`. `numpy.ma` loads lazily, defines `MaskedArray(ndarray)` and
two subclasses of it, and creates an instance at import:
`masked = MaskedConstant()`.

numpy is not the only case. Any extension whose types Python code subclasses
needs the same thing. pandas is the obvious next one: its `Timestamp`,
`Timedelta` and `Period` are Python subclasses of Cython extension types. lxml's
`ElementBase` is another.

## 2. What CPython does, and what numpy relies on

In CPython, `class memmap(ndarray)` makes a **heap type**:

* a new `PyTypeObject` whose `tp_base` is `&PyArray_Type`;
* `tp_basicsize` is ndarray's plus room for `__dict__` and `__weakref__`;
* every slot memmap does not override is inherited from ndarray;
* every dunder memmap does define in Python (`__getitem__`, `__add__`, ...)
  replaces the matching C slot with a `slot_*` function that calls the Python
  method.

An instance is **one object**: a block of memory in ndarray's layout, plus the
instance-dict pointer, whose `ob_type` is the memmap type.

numpy's C code depends on that in specific places. Each was confirmed in the
2.5.4 source:

| What numpy does | Where | What it needs |
| --- | --- | --- |
| Allocates through the subtype: `subtype->tp_alloc(subtype, 0)` | `ctors.c:681` | the subtype's type object decides size and layout |
| Sets no `tp_alloc` of its own on `PyArray_Type`, so it inherits object's, and under the shim that is the shim's `PyType_GenericAlloc` | `arrayobject.c` (`PyArray_Type`), `cpython.cc` | the array *object* is allocated by a call into the shim. Only its *data buffer* bypasses the shim: numpy's default handler calls libc `malloc` directly |
| Asks the **type** for `__array_finalize__` and calls it if it is not ndarray's own | `ctors.c:898-904` | a type-level attribute read that finds the Python function |
| Asks the type for `__array_ufunc__`, `__array_wrap__`, `__array_priority__`, ... | `PyArray_LookupSpecial`, `get_attr_string.h:51` | the same |
| Makes views and results in the caller's type (`Py_TYPE(self)`) | throughout | C **creates** subclass instances by itself, with no Python constructor involved |
| `PyArray_Check(op)` is `PyObject_TypeCheck(op, &PyArray_Type)` | `ndarrayobject.h:25` | `Py_TYPE(op)`'s base chain reaches `PyArray_Type` |
| Reads its own fields inline (`PyArray_DATA`, `PyArray_DIMS`, ...) | everywhere | the instance really has ndarray's layout |

The fourth row rules out most shortcuts. A subclass instance cannot only come
into existence through Python's `memmap(...)`. `m[1:]` is created inside numpy's
C code, by `tp_alloc` on memmap's type, and must still arrive in Python as a
memmap.

## 3. Why it is hard in Grail

A Grail Python class is a **Smalltalk class**. Its methods are compiled
Smalltalk methods, found by Smalltalk method lookup on the receiver's class. So
`self.flush()` inside memmap's code works only if the receiver's Smalltalk class
is memmap or a subclass of it.

numpy's half of the instance is **C memory** in ndarray's layout, allocated by
numpy, whose `ob_type` numpy reads.

The instance must therefore be two things at once, in two memory systems.

1. **Grail half:** an object whose Smalltalk class is memmap.
2. **C half:** a C body in ndarray's layout, typed as memmap's C type.

That raises five questions any design has to answer:

* **Who creates it?** Sometimes Python (`memmap(...)`), sometimes C (`m[1:]`, a
  ufunc result). Either side must be able to create the other half.
* **Identity.** Crossing the boundary in either direction must give back the
  same object, or `m is m[...].base`-style code and attribute storage break.
* **Dispatch.** C calls Python-defined methods (`__array_finalize__`, and any
  dunder the subclass overrides) through the type. Python calls ndarray's
  methods and slots through the C half.
* **Lifetime.** GemStone's garbage collector cannot see C memory, and C holds
  references the collector does not know about. The shim currently never frees
  a C object (`_Py_Dealloc` is a no-op).
* **Persistence.** Grail classes can be committed, as deployed modules are, but
  C pointers die with the gem process.

## 4. What already exists

Most of the pieces exist. They need to be connected.

* **Type mirrors** (pydantic Phase 5). A Grail class crosses into C as a
  full-size `PyTypeObject` built Smalltalk-side by
  `CPythonShim>>___buildTypeMirrorFor:`.
  * It has a real `tp_name`, `tp_flags` and `tp_base` chain.
  * The class's OOP is in `tp_weaklist` and a magic number is in `tp_cache`.
  * `tp_new` is a trampoline into `cls.__new__`.
  * Attribute reads on a mirror already go to the Grail class, so numpy's
    `PyObject_GetAttr(subtype, "__array_finalize__")` would find the Python
    function as things stand.

  What mirrors cannot do yet: instances of a mirrored class are 32-byte Grail
  wrappers (`tp_basicsize` 32), not bodies in a base type's layout.
* **C-to-Grail references.** A Grail value reaches C as a *wrapper*: a 32-byte
  `CByteArray` made with `gcMalloc:`, so its bytes are C memory, holding the
  value's OOP at offset 16 (`CPythonShim>>wrap:`). The session's wrapper map
  (`GrailShimWrapperMap`, Grail value to wrapper) keeps both alive while C's
  reference count is above zero, and `sweep` lets them go once it reaches zero.
  Type mirrors carry their class's OOP the same way, in `tp_weaklist`. This is
  exactly what a subclass instance needs between its two halves.
* **Foreign proxies** (`ShimForeignObject`). A wheel's object crosses into
  Grail as a proxy. The proxy forwards:
  * attribute reads, calls, `str` and `repr` to C;
  * since stage 2, attribute stores and the instance dict too.
* **Guarded callbacks.** Grail code that C calls catches Python exceptions and
  turns them into C's pending error, so a Python method running under a C
  frame is safe.
* **`PyType_Ready` slot inheritance**, for the `tp_*` slots. The number,
  mapping and sequence suites are not copied.

One gap is a **prerequisite**, whatever happens with subclassing.
`ShimForeignObject` does not forward Python's operator protocol to C slots:
`a + 1`, `a[0]`, `len(a)`, `iter(a)`, `bool(a)`, comparisons. By reading, not
yet measured: `a + 1` on a foreign ndarray looks up `__add__`, finds no slot
wrapper in ndarray's type dict, and fails. Every plain `ndarray` needs this, and
so does the ndarray half of every subclass instance.

## 5. The options

### Option A: twin objects with a subtype mirror (recommended)

Do what CPython does, with the instance split across the two worlds.

* **The C type.** `class memmap(ndarray)` builds a **subtype mirror**, a type
  mirror whose base is the foreign type.
  * It starts as a copy of `PyArray_Type`, so every slot is inherited, with the
    suites copied rather than shared.
  * It sets `tp_base`, `tp_name`, the mirror magic and the class OOP.
  * `tp_basicsize` is the base's plus one word, and `tp_flags` is the base's
    plus `HEAPTYPE`.
  * For each dunder the Grail class defines, the matching slot is replaced by a
    trampoline into Grail, which is CPython's `slot_*` mechanism. `tp_getattro`
    is always a trampoline, so C's reads of Python-level attributes find them.
* **The Grail class.** For each foreign type that gets subclassed, Grail
  synthesises one Smalltalk class, e.g. `ShimForeign_numpy_ndarray`, a subclass
  of `ShimForeignObject`. It carries the forwarding protocol (attributes,
  operators, calls), and memmap's Smalltalk superclass is that class.
  * Python sees memmap's base as the `ndarray` proxy itself: `__bases__`,
    `__mro__` and `issubclass(memmap, np.ndarray)`, the last answered in C by
    `PyType_IsSubtype`.
* **An instance** is two objects **born together**, in the subtype mirror's
  `tp_alloc`. numpy allocates every instance through `subtype->tp_alloc`, and
  the shim supplies that allocator, so every subclass instance, whoever asked
  for it, passes through code we write. The allocator calls back into Grail,
  which:
  * makes the **Grail half** with `cls basicNew`: an instance of memmap, with no
    `__init__` run, as CPython runs none at allocation;
  * makes the **C body** as a `CByteArray` with `gcMalloc:`, sized `tp_basicsize`
    (the base's size plus one word) and zeroed, with `ob_type` set to the subtype
    mirror;
  * stores the Grail half's OOP in the body's last word, as a wrapper stores it
    at offset 16;
  * points the Grail half at the body, and enters the pair in the wrapper map.

  So `memmap(...)`, which runs `memmap.__new__`, then `ndarray.__new__(memmap,
  ...)`, then numpy's `array_new` and `tp_alloc`, and `m[1:]`, which numpy makes
  by itself, produce the same thing. There is no special case for C-created
  instances, and `type(m[1:]) is memmap` holds because the body's type is
  memmap's mirror.
* **Identity.** Body to Grail half is the OOP in the body's last word, which
  `pyobj_oop` reads when the body's `ob_type` is a subtype mirror. The mirror
  records the offset. Grail half to body is the reference the half holds. No
  new registry: the wrapper map already does this job.
* **Why not one object?** A `CByteArray` subclass can be made with `gcMalloc:`
  and takes dynamic instance variables (probed in topaz), so its own bytes
  could *be* the body. But every Grail Python class descends from
  `PythonInstance`, and Grail's attribute machinery tests `isKindOf:
  PythonInstance` in 39 places (property reads, class-attribute fallbacks).
  Smalltalk has single inheritance, so one object cannot be both.
* **Attribute storage.** On the Grail half, as for any Grail object. C reaches
  attributes through the `tp_getattro` trampoline, so the C-side instance dict
  (`tp_dictoffset`) is not needed for this design.
* **The recursion trap.** When memmap overrides `__add__` and calls
  `super().__add__(x)`, forwarding must call the **base** type's `nb_add`, not
  the subtype mirror's: that slot is the trampoline back into memmap, and calling
  it would recurse forever. Forwarding always names the foreign type that
  defines the slot, never `Py_TYPE(self)`.
* **Lifetime** comes from the wrapper rules, unchanged.
  * While C holds a reference (count above zero), the wrapper map keeps the
    Grail half, and through it the body, alive.
  * While Python holds the Grail half, the half keeps the body alive.
  * When both have let go, GemStone collects the half, and the `gcMalloc`'d body
    with it.

  What this does not cover is numpy's own cleanup. Its `array_dealloc`, which
  frees the data buffer, never runs, because the shim's `_Py_Dealloc` is a
  no-op. That is already true of every plain ndarray today.
* **Persistence.** The Grail class can be committed. Its synthetic superclass
  is stateless and found by the foreign type's `tp_name`, and the subtype
  mirror is rebuilt per session, as mirrors already are. *Instances* are
  session-bound, like every foreign proxy, and should refuse to commit with a
  clear error.
* **Multiple inheritance.** The foreign type must be the class's *solid base*,
  the one that decides the layout, as in CPython. Python mixins come along
  through Grail's existing secondary-base handling. Two foreign bases with
  different layouts raise CPython's "multiple bases have instance lay-out
  conflict".

**Cost.** It is the largest of the options, but nearly every part is an
extension of something that exists: mirrors, wrappers and their map, proxies,
guarded callbacks, `PyType_Ready` inheritance. The genuinely new parts are the
Grail-aware `tp_alloc` and the slot-trampoline table. A dozen slots covers what numpy's subclasses override:
`tp_getattro`, `tp_setattro`, `mp_subscript`, `mp_ass_subscript`, `sq_length`,
the arithmetic `nb_*`, `tp_richcompare`, `tp_repr`, `tp_str`, `tp_iter`,
`tp_call`, `tp_hash`.

**What it gets right** is every row of the table in §2. The instance really has
ndarray's layout and type, C creates subclass instances with no Python
involvement, and Python methods run as ordinary Grail methods.

### Option B: composition, a Grail object that wraps a plain ndarray

Make memmap an ordinary Grail class whose instances hold an ordinary ndarray.
Unknown attributes are delegated to it, and the inner ndarray is passed when
crossing into C.

Rejected. C would never see a memmap. Views and ufunc results come back as
plain ndarrays, so subclass preservation is gone. numpy never calls
`__array_finalize__`, `__array_wrap__` or `__array_ufunc__` on the subclass.
`ndarray.__new__(memmap, ...)` would hand numpy a type whose `tp_alloc` makes
the wrong size of object. `MaskedArray` runs its masks through exactly those
hooks, so it would compute **wrong answers silently**, which is worse than
failing. It is cheap, but it only looks like it works.

### Option C: let the class statement succeed, refuse instances (a stopgap)

`ShimForeignObject>>___subclass___:` makes a Grail class that can be defined,
imported, inspected and used in `isinstance`. Constructing one raises a clear
`TypeError` ("subclassing a C extension type is not supported yet").

Not a solution, but it is cheap and costs nothing later: Option A replaces the
refusal with real instances. It would let `import numpy` finish, since the four
classes it defines are never instantiated during import. That exposes the walls
beyond memmap, which can then be mapped and worked on in parallel (see
"Parallelise discovery, not the fix" in the memory notes). `numpy.ma` would
still fail at `MaskedConstant()`, and any use of `np.memmap`, `np.matrix` or
`np.recarray` would fail clearly.

### Not an option on its own: the "prefix OOP" object model

`Shim_Object_Model.md` §2 proposes moving the GemStone OOP into a header before
every object the shim hands out. It is about *Grail's* objects having real
layouts, and does not decide how a subclass instance is created or dispatched.
Option A gets the same benefit locally: the subtype's `tp_alloc` is the
shim's, so it lays out the body and puts the OOP where it likes. Option A uses
the last word; a header before the object would also work.

## 6. Recommended order

| Step | What | Exit test (each answer compared with CPython 3.14) |
| --- | --- | --- |
| 1 | **Stopgap (C).** The class statement succeeds and instantiation refuses clearly. | `import numpy` completes, or names its next wall |
| 2 | **Foreign operator protocol.** `ShimForeignObject` forwards operators, subscripts, `len`, `iter`, `bool` and comparisons to the object's C slots. | `np.arange(5) * 2 + 1`, `a[1:3]`, `len(a)`, `a.sum()`, `a == a` |
| 3 | **Subtype mirrors (A).** The C type, the synthetic Grail base, the Grail-aware `tp_alloc`, and the `tp_getattro` trampoline. | `type(np.memmap(f, dtype='u1', shape=3)[1:]) is np.memmap`; `np.rec.array(...)` field access; `np.matrix([[1,2],[3,4]]) * np.matrix(...)` |
| 4 | **Slot trampolines for the dunders subclasses override**, and `numpy.ma` | `np.ma.masked_array([1, 2, 3], mask=[0, 1, 0]).sum() == 4`; numpy's own `ma` tests, as a subset |

Step 2 comes before step 3 because the ndarray half of a subclass instance *is*
a foreign object. Without the protocol it cannot do arithmetic either, and step
2 is also what makes ordinary numpy usable. Step 1 is independent and cheap. It
mainly gives information: how much of `import numpy` remains beyond this wall.

## 7. Not established

* **Whether foreign operators fail today.** This is by reading only. Step 2
  starts by measuring it.
* **The cost of the `tp_getattro` trampoline.** numpy reads attributes off
  subclass instances often (`__array_priority__` on most binary operations).
  Measure it once step 3 runs. A per-type cache of "this name is not defined in
  Python" is the obvious remedy if it matters.
* **numpy's cyclic garbage collection.** A `HEAPTYPE` subtype with an instance
  dict would normally have `HAVE_GC` and `tp_traverse`. The shim does no cyclic
  GC (numpy's GC path is already neutered), so this should be harmless, but it
  is unverified.
* **Deallocation.** `_Py_Dealloc` is a no-op, so numpy's `array_dealloc` never
  runs, and an array's data buffer is never freed. That is true of every
  ndarray today, not only subclasses. Making it run brings in numpy's base and
  buffer handling, which has never run under the shim. The body itself is
  `gcMalloc`'d and collected by GemStone, which `tp_free` must therefore not
  `free()`.
* **Borrowed references.** `sweep` drops a pair once C's count reaches zero. A
  body C still uses through a *borrowed* pointer, which it never counted, would
  then be collectable. Wrappers carry the same risk today.
* **Cython types (pandas).** Cython extension types are ordinary static types,
  so the same model should apply. It has not been tried.
