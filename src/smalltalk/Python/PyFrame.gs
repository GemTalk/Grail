! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyFrame class (Python 'frame' object -- tb.tb_frame)
expectvalue /Class
doit
object subclass: 'PyFrame'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyFrame comment:
'Python frame object -- what ``tb.tb_frame`` returns and what
``traceback.walk_tb`` yields.

Grail has no real interpreter frames, so this is a lightweight carrier of the
fields a traceback consumer reads: ``f_code`` (a PyCode), ``f_lineno``,
``f_back`` (the caller frame or None) and ``f_globals``.  Stored as dynamic
instVars so Python attribute reads resolve the value directly through the
___pyAttrLoad___ dynamic-instVar probe (same mechanism as ``slice`` / PyCode).

Part of Phase 1 of the traceback design (docs/Python_Traceback_Design.md).
'
%

expectvalue /Class
doit
PyFrame category: 'Grail-Tracebacks'
%

! ------------------- Remove existing methods from PyFrame
expectvalue /Metaclass3
doit
PyFrame removeAllMethods.
PyFrame class removeAllMethods.
PyFrame removeAllMethods: 1.
PyFrame class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyFrame
code: aCode lineno: aLineno back: aBack globals: aGlobals
	"Build a frame object.  ``aBack``/``aGlobals`` may be the Python None
	singleton (never Smalltalk nil, which the ___pyAttrLoad___ probe treats as
	absent)."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'f_code' put: aCode.
	inst dynamicInstVarAt: #'f_lineno' put: aLineno.
	inst dynamicInstVarAt: #'f_back' put: aBack.
	inst dynamicInstVarAt: #'f_globals' put: aGlobals.
	^ inst
%

set compile_env: 1

category: 'Grail-String Representation'
method: PyFrame
__repr__
	| stream |
	stream := AppendStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '<frame at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPutAll: ', line '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'f_lineno') @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
