! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyCode class (Python 'code' object -- func.__code__)
expectvalue /Class
doit
object subclass: 'PyCode'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyCode comment:
'Python code object -- what ``func.__code__`` returns.

Grail has no bytecode, so this is a lightweight metadata carrier holding only
the fields conformance code actually reads: ``co_name``, ``co_qualname``,
``co_filename`` and ``co_firstlineno`` (the 1-based source line of the ``def``
keyword, populated from FunctionDefAst>>beginLine).  Fields live in dynamic
instVars so a Python attribute read (``co.co_firstlineno``) resolves the VALUE
directly through object>>___pyAttrLoad___''s dynamic-instVar probe -- no
accessor method and no ___pythonValueAttrs___ whitelist entry needed (same
mechanism as ``slice``).

Phase 1 of the traceback design (docs/Python_Traceback_Design.md) defines this
class; Phase 2 stamps a PyCode onto every function at def-time so
``func.__code__`` answers a real object instead of raising AttributeError.
'
%

expectvalue /Class
doit
PyCode category: 'Grail-Tracebacks'
%

! ------------------- Remove existing methods from PyCode
expectvalue /Metaclass3
doit
PyCode removeAllMethods.
PyCode class removeAllMethods.
PyCode removeAllMethods: 1.
PyCode class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0; called by codegen + Smalltalk callers)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyCode
name: aName qualname: aQualname filename: aFilename firstlineno: aLine
	"Build a code object.  Fields are stored as dynamic instVars named exactly
	as the Python attributes so ``co.co_firstlineno`` reads the value straight
	through the ___pyAttrLoad___ dynamic-instVar probe."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'co_name' put: aName.
	inst dynamicInstVarAt: #'co_qualname' put: aQualname.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	inst dynamicInstVarAt: #'co_firstlineno' put: aLine.
	^ inst
%

category: 'Instance Creation'
classmethod: PyCode
name: aName firstlineno: aLine
	"Convenience for the def-time codegen stamp, which only has the def's
	name + line cheaply to hand: co_qualname defaults to the name and
	co_filename to a placeholder (neither is conformance-critical yet; a real
	file path is a later refinement)."

	^ self name: aName qualname: aName filename: '<grail>' firstlineno: aLine
%

set compile_env: 1

category: 'Grail-String Representation'
method: PyCode
__repr__
	"A <code object NAME, file FILE, line N> style string -- close enough to
	CPython for debugging; nothing conformance-critical reads this."

	| stream |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<code object '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_name') @env0:asString.
	stream @env0:nextPutAll: ', file "'.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_filename') @env0:asString.
	stream @env0:nextPutAll: '", line '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_firstlineno') @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
