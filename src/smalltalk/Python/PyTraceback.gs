! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyTraceback class (Python 'traceback' object -- exc.__traceback__)
expectvalue /Class
doit
object subclass: 'PyTraceback'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyTraceback comment:
'Python traceback object -- the linked list ``exc.__traceback__`` points at.

Each node carries one frame at one source position.  CPython derives the
column span lazily from ``co_positions(tb_lasti)``; Grail has no bytecode, so
the PEP 657 quadruple is stored directly on the node:

  tb_frame        a PyFrame
  tb_lineno       1-based start line
  tb_next         the next (deeper) PyTraceback, or the None singleton
  tb_end_lineno   1-based end line
  tb_colno        0-based absolute start column
  tb_end_colno    0-based absolute end column
  tb_line         the source line text (raw; traceback.FrameSummary strips it)

Nodes are prepended as an exception unwinds (Phase 2), so the head is the
shallowest frame and ``extract_tb(tb)[0]`` is the frame that caught the
exception -- matching CPython.  ``tb_next`` is ALWAYS stored (as None on the
last node) so ``while cur is not None`` terminates: a nil dynamic instVar is
treated as absent by the ___pyAttrLoad___ probe and would not answer None.

Part of Phase 1 of the traceback design (docs/Python_Traceback_Design.md).
'
%

expectvalue /Class
doit
PyTraceback category: 'Grail-Tracebacks'
%

! ------------------- Remove existing methods from PyTraceback
expectvalue /Metaclass3
doit
PyTraceback removeAllMethods.
PyTraceback class removeAllMethods.
PyTraceback removeAllMethods: 1.
PyTraceback class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0; called by codegen + Smalltalk callers)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyTraceback
frame: aFrame lineno: aLineno next: aNext endLineno: anEndLineno colno: aColno endColno: anEndColno line: aLine
	"Build a traceback node.  ``aNext`` must be either a PyTraceback or the
	Python None singleton -- never Smalltalk nil."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'tb_frame' put: aFrame.
	inst dynamicInstVarAt: #'tb_lineno' put: aLineno.
	inst dynamicInstVarAt: #'tb_next' put: aNext.
	inst dynamicInstVarAt: #'tb_end_lineno' put: anEndLineno.
	inst dynamicInstVarAt: #'tb_colno' put: aColno.
	inst dynamicInstVarAt: #'tb_end_colno' put: anEndColno.
	inst dynamicInstVarAt: #'tb_line' put: aLine.
	^ inst
%

category: 'Grail-Traceback Building'
method: PyTraceback
___setNext: aNext
	"Re-point tb_next when prepending a new head during unwind (Phase 2)."

	self dynamicInstVarAt: #'tb_next' put: aNext.
	^ self
%

set compile_env: 1

category: 'Grail-String Representation'
method: PyTraceback
__repr__
	| stream |
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '<traceback object at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
