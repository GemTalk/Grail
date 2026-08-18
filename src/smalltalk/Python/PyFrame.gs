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

category: 'Grail-Comparison'
method: PyFrame
__eq__: other
	"Two frames are equal when they describe the same frame: same code, same
	line, same caller chain.

	CPython compares frames by IDENTITY, and Grail cannot -- 9.47.  A live stack
	is read by RAISING and reading the VM's captured (method, ip, receiver)
	triples, so every walk RECONSTRUCTS its frames and two walks of one unchanged
	stack yield equal-valued but distinct objects.  Real identity would need a
	cache keyed to a physical frame, and the measurement in 9.47 says no such key
	exists: one activation walked twice and three separate activations of the
	same method on the same receiver at the same depth produce byte-identical
	(method, ip, receiver), while CPython answers one frame object for the first
	and three for the second.  Claiming identity would therefore assert something
	unverifiable, and would silently report a loop's repeated calls as a single
	frame that moved.

	So equality states what Grail can actually know.  BoundMethod settled the
	same question the same way and for the same reason -- every attribute access
	mints a fresh handle -- and this follows it exactly, including defining ONLY
	the Python-level __eq__/__hash__: Smalltalk =/hash are untouched, so
	Grail-internal collections that key frames by identity are unaffected.

	``f_back'' is compared RECURSIVELY, and it is what keeps this from
	over-matching.  Two frames that share a code object -- a recursive function's
	activations, say -- still differ in their caller chains, so only frames at the
	same depth of the same stack compare equal.  The chain terminates at None (see
	live_frames.py's the_chain_ends_rather_than_looping), so the recursion does.

	``f_lineno'' is deliberately NOT compared, which was measured rather than
	assumed.  A frame's line is mutable STATE -- in CPython it advances while the
	frame object stays the same -- so including it makes two readings of one frame
	taken at different lines unequal, where CPython (holding one object) says
	equal.  And it buys nothing against the case it looks like it should catch:
	two separate activations of the same function at the same depth return from
	the SAME line, so they compared equal with the line included too.  It is a
	false-negative source with no offsetting discrimination.  Consumers that care
	about the line read it directly, and traceback.walk_stack yields it alongside
	the frame as its own tuple element, so it is still compared there."

	| mine theirs myBack itsBack |
	(other @env0:isKindOf: PyFrame) ifFalse: [^ false].
	mine := self @env0:dynamicInstVarAt: #'f_code'.
	theirs := other @env0:dynamicInstVarAt: #'f_code'.
	(mine @env0:== theirs) ifFalse: [
		((mine @env0:isKindOf: PyCode) and: [theirs @env0:isKindOf: PyCode])
			ifFalse: [^ false].
		(mine __eq__: theirs) ifFalse: [^ false]].
	myBack := self @env0:dynamicInstVarAt: #'f_back'.
	itsBack := other @env0:dynamicInstVarAt: #'f_back'.
	(myBack @env0:== itsBack) ifTrue: [^ true].
	((myBack @env0:isNil or: [myBack @env0:== None])
		or: [itsBack @env0:isNil or: [itsBack @env0:== None]]) ifTrue: [^ false].
	^ myBack __eq__: itsBack
%

category: 'Grail-Comparison'
method: PyFrame
__ne__: other
	^ (self __eq__: other) @env0:not
%

category: 'Grail-Comparison'
method: PyFrame
__hash__
	"Consistent with __eq__, and deliberately NOT over the f_back chain.
	Equal frames agree on their code, so hashing that alone keeps equal objects
	equal-hashing -- all a hash must promise -- without walking a stack that may
	be hundreds deep on every lookup."

	| code |
	code := self @env0:dynamicInstVarAt: #'f_code'.
	^ (code @env0:isKindOf: PyCode) ifTrue: [code __hash__] ifFalse: [0]
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

category: 'Grail-Tracebacks'
classmethod: PyFrame
___isInternalTempName___: aString
	"Is this temp name Grail's or the VM's rather than the Python program's?

	Three kinds get dropped.  ``___curPos___'' and ``___f___'' are Grail's own
	bookkeeping temps, emitted into every generated method by the AST codegen --
	___curPos___ carries (line, col, endLine, endCol, sourceLine), which is how a
	traceback finds its line.  ``self'' is the Smalltalk receiver.  And a name
	beginning with a period is a VM-synthesised evaluation temp: the kernel's
	_frameContentsAt: names those '.t1', '.t2', ... itself, so they are an artefact
	of reading the frame, not anything the source declared.

	The ___name___ rule can in principle hide a Python local actually spelled
	``___x___''.  That is legal Python and would be wrongly suppressed; it is
	accepted because a name in that shape inside a Python program is
	vanishingly rare next to the certainty that every single generated method
	carries ___curPos___."

	| sz |
	aString isNil ifTrue: [^ true].
	sz := aString size.
	sz == 0 ifTrue: [^ true].
	(aString at: 1) == $. ifTrue: [^ true].
	aString = 'self' ifTrue: [^ true].
	^ (sz >= 7)
		and: [((aString copyFrom: 1 to: 3) = '___')
			and: [(aString copyFrom: sz - 2 to: sz) = '___']]
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___tempsFromFrameContents___: aFrameContents
	"Name -> value for the local variables in one frame-contents Array, as a
	Smalltalk Dictionary.  Answers nil when the Array is unusable.

	TAKES THE CONTENTS, NOT A LEVEL, AND THAT IS THE WHOLE POINT.  ``GsProcess
	class >> _frameContentsAt:'' numbers levels from the SENDER of the method that
	calls it, so a level is meaningful only inside the frame that computed it.  A
	first version of this read the primitive itself, and a caller that found a
	frame at level L and asked for its temps got the temps of level L+1 -- the
	numbering had shifted by the one frame between the two methods.  It reported
	``first -> <absent>'' with a frame full of ___pyRaiseNew___''s arguments, which
	is a confusing enough symptom to be worth designing out rather than
	commenting on.  So the primitive is called by whoever owns the walk, and this
	method only interprets what came back.

	Layout (from the kernel method's own comment): 9 is argAndTempNames, 10 is the
	receiver, and 11.. are the argument and temp VALUES -- so names[i] pairs with
	contents[10 + i].

	THE COMMENT ON THE KERNEL METHOD IS WRONG ON 4.0.  It says that for the
	class-side variant element 9 ``is always nil''.  It is not: the names come
	back, which is what makes this usable rather than a list of anonymous values.
	Read defensively anyway -- nil names are treated as no answer -- because the
	documented contract says one thing and the implementation another.

	An UNASSIGNED temp reads as Smalltalk nil and is OMITTED, which matches
	CPython: f_locals holds only bound names.  That is safe precisely because
	Python's None is a distinct object in Grail and never Smalltalk nil, so a
	local explicitly assigned None is still reported."

	| names dict |
	aFrameContents isNil ifTrue: [^ nil].
	aFrameContents size < 10 ifTrue: [^ nil].
	names := aFrameContents at: 9.
	names isNil ifTrue: [^ nil].
	dict := Dictionary new.
	1 to: names size do: [:i | | nm val |
		nm := (names at: i) asString.
		val := aFrameContents atOrNil: 10 + i.
		((self ___isInternalTempName___: nm) or: [val isNil])
			ifFalse: [dict at: nm put: val]].
	^ dict
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___liveTempsReport___: aMaxLevel
	"Diagnostic dump of the live stack: one line per readable level, giving the
	method selector, the names and the values.  Exists so that a FAILING
	assertion about locals can say what it actually saw.

	The capability this rests on is gem-dependent in a way that cannot be
	reproduced locally -- see ___liveTempsAtLevel___ -- so when it breaks it will
	break on CI, on a machine nobody is sitting at.  A bare ``expected 3, got
	nil'' would leave no way to tell a primitive that failed outright from names
	that came back empty from values that came back nil."

	| s |
	s := WriteStream on: String new.
	1 to: aMaxLevel do: [:lvl | | fc |
		fc := [GsProcess _frameContentsAt: lvl]
			on: AbstractException do: [:e | e return: nil].
		fc isNil
			ifTrue: [s nextPutAll: 'L'; print: lvl; nextPutAll: ' <nil frame>'; nl]
			ifFalse: [
				s nextPutAll: 'L'; print: lvl; nextPutAll: ' sel=';
					nextPutAll: ((fc at: 1) isNil
						ifTrue: ['<no method>']
						ifFalse: [(fc at: 1) selector printString]);
					nextPutAll: ' names='; nextPutAll: (fc at: 9) printString;
					nextPutAll: ' vals='.
				11 to: fc size do: [:i |
					s nextPutAll: (fc atOrNil: i) printString; nextPutAll: ' '].
				s nl]].
	^ s contents
%

set compile_env: 0

category: 'Grail-Tracebacks'
classmethod: PyFrame
___innermostPythonFrameLocals___
	"Name -> value for the locals of the innermost GRAIL-GENERATED frame on the
	live stack, or nil if there is none.  Answers a Smalltalk Dictionary.

	Called at RAISE time, which is the only moment the values exist.  A rendered
	traceback is built after the stack unwound, from the VM's captured (method,
	ip, receiver) triples, and those carry no temporaries -- CPython keeps real
	frame objects alive and Grail reconstructs them, so locals are recoverable
	only while the frame is still on the stack.

	FINDS THE FRAME BY MARKER, NOT BY DEPTH.  Every method the AST codegen emits
	carries a ___curPos___ temp, and no hand-written Smalltalk runtime method
	does, so the first level whose names include it is the innermost Python
	frame.  The alternative -- counting the frames of the raise path -- would
	break whenever that path gained or lost a hop, and it has several shapes
	(___pyRaiseNew___:args:kw:, ___signal___:, the runtime's own hand-built
	raises), so there is no one depth to count.

	Levels are numbered from THIS method's sender, and that is safe here only
	because the walk starts at 1 and stops at a marker: no level number crosses a
	method boundary.  See ___tempsFromFrameContents___ for what happens when one
	does."

	| lvl |
	lvl := 1.
	[lvl <= 64] whileTrue: [
		| fc names |
		fc := [GsProcess _frameContentsAt: lvl]
			on: AbstractException do: [:e | e return: nil].
		fc isNil ifFalse: [
			names := fc size >= 9 ifTrue: [fc at: 9] ifFalse: [nil].
			(names notNil and: [self ___namesIncludeCodegenMarker___: names])
				ifTrue: [^ self ___tempsFromFrameContents___: fc]].
		lvl := lvl + 1].
	^ nil
%

category: 'Grail-Tracebacks'
classmethod: PyFrame
___namesIncludeCodegenMarker___: names
	"Does this frame's temp-name list mark it as a method the AST codegen emitted?

	``___curPos___'' is the position temp every generated method carries; it holds
	(line, col, endLine, endCol, sourceLine) and is how a traceback finds its
	line.  Testing for it identifies a Python frame without needing to know
	anything about the method's name or class."

	1 to: names size do: [:i |
		((names at: i) asString = '___curPos___') ifTrue: [^ true]].
	^ false
%

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
