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
	"Stored ONLY when a caller supplies a real namespace.  ___pyAttrLoad___ probes
	dynamic instVars BEFORE the method chain, so storing None here would shadow
	the lazy f_globals accessor below and every frame would report None."
	(aGlobals isNil or: [aGlobals == None]) ifFalse: [
		inst dynamicInstVarAt: #'f_globals' put: aGlobals].
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

category: 'Grail-Tracebacks'
method: PyFrame
f_globals
	"The module globals this frame was executing in, as the LIVE PyModuleDict view
	-- the same object semantics as ``globals()'' inside that module.

	Derived rather than captured.  Grail has no real interpreter frames: a
	traceback frame is reconstructed from the VM's (method, ip, receiver) triples,
	and threading a namespace through that walk would mean touching the most
	delicate code in the traceback path.  The frame's PyCode already carries
	``co_filename'', which identifies the module unambiguously -- one entry in
	sys.modules has that __file__ -- so the namespace is resolved on demand
	instead.

	Answers None when the module cannot be identified (a synthesised frame, or
	code with no file), which is what a consumer must tolerate anyway.

	This is what lets traceback.py suggest a name for a NameError: its candidates
	are the frame's locals, globals and builtins, and with globals absent there
	was nothing to match a misspelled module-level name against."

	| code fname found |
	code := [self @env0:dynamicInstVarAt: #'f_code']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(code isNil or: [code == None]) ifTrue: [^ None].
	fname := [code @env0:dynamicInstVarAt: #'co_filename']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(fname isNil or: [fname == None]) ifTrue: [^ None].
	found := nil.
	"sys.modules is a SymbolDictionary, so this is a Smalltalk iteration over its
	VALUES -- not a Python mapping walk."
	[(importlib @env1:modules) @env0:do: [:mod |
		(found isNil and: [(mod isKindOf: module)
			and: [((mod @env0:dynamicInstVarAt: #'__file__') @env0:= fname) == true]])
				ifTrue: [found := mod]]]
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	found isNil ifTrue: [^ None].
	^ (Python @env0:at: #'PyModuleDict') @env0:on: found
%

set compile_env: 0

category: 'Grail-Attribute Access'
classmethod: PyFrame
___pythonValueAttrs___
	"``f_globals'' is a NAMESPACE -- a value, not a callable -- so a read must
	invoke the accessor and hand back the mapping rather than BoundMethod-wrapping
	the selector.  Every other frame field is a dynamic instVar, which
	___pyAttrLoad___ already returns by value.

	Deliberately NO ``f_builtins''.  CPython's is the real builtins module dict;
	Grail's builtins are METHODS on the builtins class, so there is no mapping to
	hand back and any dict built here would have to invent its values.  The names
	are available honestly as dir(builtins), and traceback.py reads them from there
	-- see its _candidates_for."

	^ IdentitySet new
		add: #'f_globals';
		yourself
%

set compile_env: 0
