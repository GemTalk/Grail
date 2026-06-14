/* Symbols that must have C linkage / external const linkage, kept out of the
 * C++ TU: PyObject_ClearWeakRefs (header has a static-inline that doesn't
 * export) and _Py_ascii_whitespace (const => internal linkage in C++). */
void PyObject_ClearWeakRefs(void *op) { (void)op; }
const unsigned char _Py_ascii_whitespace[128] = {
 0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1};
