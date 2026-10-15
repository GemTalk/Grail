"Python functools.partial as a REAL class (CPython test_functools
subclasses it at import time; the previous closure-returning module
function could not be subclassed).  State lives in dynamic instVars
func / args / keywords, so attribute reads resolve through the
standard PythonInstance probe.  Construction is implemented as the
instance-side __new__ protocol (___new__:kw:) so ClassDefAst-emitted
subclass instantiation and direct partial(...) calls share it."
Class {
	#name : 'functools_partial',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}
