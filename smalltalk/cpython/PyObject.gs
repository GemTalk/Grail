! ------------------- Superclass check
run
CByteArray ifNil: [self error: 'CByteArray is not defined. Check file ordering.'].
%

! ------- PyObject class definition
expectvalue /Class
doit
CByteArray subclass: 'PyObject'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyObject comment:
'A CByteArray subclass used as a marker class for CPython PyObject wrappers.

Each instance is a 24-byte C heap buffer with the following layout:
  offset 0:  ob_refcnt   (8 bytes) — matches Python.h
  offset 8:  ob_type     (8 bytes) — pointer to a PyTypeObject in C memory
  offset 16: _oop        (8 bytes) — GemStone OOP of the wrapped value

C code sees only the first 16 bytes (standard PyObject struct).
The OOP at offset 16 lets the C shim read the wrapped Smalltalk object
with a single pointer dereference — no GCI call needed.

Wrapping state and methods live on CPythonShim (the singleton).'
%

expectvalue /Class
doit
PyObject category: 'CPython'
%
