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
	"CPython's tb_lasti is the BYTECODE offset the frame was executing at, and
	the only documented consumer is a disassembler.  Grail compiles to Smalltalk
	and has no bytecode offset to report, so every node carries -1 -- which is
	not a placeholder invented here but CPython's OWN value for ``no instruction
	index'', used for frames it synthesises.  It is an int, which is what
	test_raise's test_attrs asserts, and it is honest about being unknown in a
	way that 0 would not be."
	inst dynamicInstVarAt: #'tb_lasti' put: -1.
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

category: 'Grail-Instance Creation'
classmethod: PyTraceback
__new__: aNext _: aFrame _: aLasti _: aLineno
	"``types.TracebackType(tb_next, tb_frame, tb_lasti, tb_lineno)'' -- CPython's
	public constructor for a traceback node.

	A CLASSMETHOD named __new__, not an instance-side __init__: PyTraceback is a
	Smalltalk-defined class rather than a Grail-compiled Python one, so calling
	it lands in ``object class >> value:value:'', which dispatches on arity to
	``__new__:_:_:…'' on the metaclass and never consults __init__ at all.  An
	__init__ here compiles and installs and is simply never reached, which is
	how the first cut of this reported ``PyTraceback() takes wrong number of
	arguments'' with the method sitting right there.

	It exists so that code can EDIT a traceback: the documented use is trimming
	frames off a chain before re-raising, which needs a way to build a
	replacement node.  Grail had no constructor at all, so ``types.TracebackType''
	was not callable and the whole idiom was unavailable.

	The four arguments are checked, and each with CPython's own message, because
	the messages differ in shape -- ``expected traceback object or None'' names
	what was wanted, ``must be frame, not str'' names the argument, and the two
	integers get the generic ``cannot be interpreted as an integer''.  Code that
	branches on the text is rare; code that READS it is not.

	The PEP 657 fields a Grail-built node carries (tb_end_lineno, tb_colno,
	tb_end_colno, tb_line) have no CPython counterpart in this signature, so a
	constructed node reports None for each rather than leaving the slot absent --
	an absent dynamic instVar answers AttributeError, and a node built here must
	be usable everywhere a node built by the unwind is."

	| nxt inst |
	nxt := ((aNext == None) @env0:or: [aNext @env0:isNil])
		ifTrue: [None]
		ifFalse: [
			(aNext @env0:isKindOf: PyTraceback) ifFalse: [
				^ TypeError ___signal___: 'expected traceback object or None, got '''
					@env0:, (bytes ___pyTypeNameOf___: aNext) @env0:, ''''].
			aNext].
	(aFrame @env0:isKindOf: PyFrame) ifFalse: [
		^ TypeError ___signal___: 'traceback() argument ''tb_frame'' must be frame, not '
			@env0:, (bytes ___pyTypeNameOf___: aFrame)].
	(aLasti @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: '''' @env0:, (bytes ___pyTypeNameOf___: aLasti)
			@env0:, ''' object cannot be interpreted as an integer'].
	(aLineno @env0:isKindOf: Integer) ifFalse: [
		^ TypeError ___signal___: '''' @env0:, (bytes ___pyTypeNameOf___: aLineno)
			@env0:, ''' object cannot be interpreted as an integer'].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'tb_next' put: nxt.
	inst @env0:dynamicInstVarAt: #'tb_frame' put: aFrame.
	inst @env0:dynamicInstVarAt: #'tb_lasti' put: aLasti.
	inst @env0:dynamicInstVarAt: #'tb_lineno' put: aLineno.
	inst @env0:dynamicInstVarAt: #'tb_end_lineno' put: None.
	inst @env0:dynamicInstVarAt: #'tb_colno' put: None.
	inst @env0:dynamicInstVarAt: #'tb_end_colno' put: None.
	inst @env0:dynamicInstVarAt: #'tb_line' put: None.
	^ inst
%

category: 'Grail-Attribute Access'
method: PyTraceback
__setattr__: name _: value
	"``tb_next'' is the ONE writable field of a traceback, and it is writable
	precisely so a chain can be re-linked -- which is also why it is guarded.

	Grail stored whatever it was given: ``tb.tb_next = 'asdf''' left a string
	where every walker expects a node or None, so the failure surfaced later, in
	whichever traceback formatter walked into it.  And a chain pointed at itself
	is worse than wrong: format() walks tb_next until None, so a loop HANGS.
	CPython refuses both, with two different exception types -- TypeError for the
	wrong kind of value, ValueError for a value that would make a cycle -- and
	test_raise's test_attrs checks each.

	Every other name takes the ordinary store; a traceback is not otherwise
	read-only in Grail and nothing is gained by making it so here."

	(name @env0:asString @env0:= 'tb_next') ifFalse: [
		^ super @env1:__setattr__: name _: value].
	((value == None) @env0:or: [value @env0:isNil]) ifTrue: [
		^ self @env0:dynamicInstVarAt: #'tb_next' put: None].
	(value @env0:isKindOf: PyTraceback) ifFalse: [
		^ TypeError ___signal___: 'expected traceback object, got '''
			@env0:, (bytes ___pyTypeNameOf___: value) @env0:, ''''].
	(self ___wouldLoopThrough___: value) ifTrue: [
		^ ValueError ___signal___: 'traceback loop detected'].
	^ self @env0:dynamicInstVarAt: #'tb_next' put: value
%

category: 'Grail-Attribute Access'
method: PyTraceback
__delattr__: name
	"``del tb.tb_next'' is a TypeError, not an AttributeError: the attribute
	exists and is writable, so what is refused is the DELETION.  Grail deleted
	the dynamic instVar, which left the node with no tb_next at all -- and an
	absent slot reads back as AttributeError, so the next walker stopped with a
	different error entirely, three frames from the ``del''."

	(name @env0:asString @env0:= 'tb_next') ifTrue: [
		^ TypeError ___signal___: 'can''t delete tb_next attribute'].
	^ super @env1:__delattr__: name
%

category: 'Grail-Attribute Access'
method: PyTraceback
___wouldLoopThrough___: candidate
	"Would pointing this node's tb_next at ``candidate'' make a cycle?

	True when self is already somewhere in candidate's chain -- including when
	candidate IS self, which is the direct ``tb.tb_next = tb''.  Bounded by the
	chain itself, which is acyclic by this method's own guarantee, so the walk
	terminates."

	| probe |
	probe := candidate.
	[(probe @env0:notNil) and: [probe @env0:~~ None]] @env0:whileTrue: [
		probe @env0:== self ifTrue: [^ true].
		probe := [probe @env0:dynamicInstVarAt: #'tb_next']
			@env0:on: AbstractException do: [:e | e @env0:return: nil]].
	^ false
%

category: 'Grail-String Representation'
method: PyTraceback
__repr__
	| stream |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<traceback object at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
