Extension { #name : 'PyTraceback' }

{ #category : 'Grail-Instance Creation' }
PyTraceback class >> __new__: aNext _: aFrame _: aLasti _: aLineno [
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

]

{ #category : 'Grail-Attribute Access' }
PyTraceback >> ___wouldLoopThrough___: candidate [
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

]

{ #category : 'Grail-Attribute Access' }
PyTraceback >> __delattr__: name [
	"``del tb.tb_next'' is a TypeError, not an AttributeError: the attribute
	exists and is writable, so what is refused is the DELETION.  Grail deleted
	the dynamic instVar, which left the node with no tb_next at all -- and an
	absent slot reads back as AttributeError, so the next walker stopped with a
	different error entirely, three frames from the ``del''."

	(name @env0:asString @env0:= 'tb_next') ifTrue: [
		^ TypeError ___signal___: 'can''t delete tb_next attribute'].
	^ super @env1:__delattr__: name

]

{ #category : 'Grail-Introspection' }
PyTraceback >> __dir__ [
	"``dir(tb)'' is EXACTLY the four traceback members and nothing else.

	CPython's traceback type reports no dunders at all -- measured on 3.14.6,
	``dir(e.__traceback__)'' is ['tb_frame', 'tb_lasti', 'tb_lineno',
	'tb_next'] -- and test_dir asserts the LENGTH, so an extra name is a
	failure and not a cosmetic difference.

	Grail's generic __dir__ answered 29: every dunder object contributes, and
	NONE of the four, because they are read through the attribute chain rather
	than compiled as plain selectors.  So the list was both too long and
	missing the only names anyone asks a traceback for."

	^ (Array @env0:new: 4)
		@env0:at: 1 put: 'tb_frame';
		@env0:at: 2 put: 'tb_lasti';
		@env0:at: 3 put: 'tb_lineno';
		@env0:at: 4 put: 'tb_next';
		@env0:yourself

]

{ #category : 'Grail-String Representation' }
PyTraceback >> __repr__ [
	| stream |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<traceback object at 0x'.
	stream @env0:nextPutAll: (self @env0:identityHash) @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents

]

{ #category : 'Grail-Attribute Access' }
PyTraceback >> __setattr__: name _: value [
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

]
