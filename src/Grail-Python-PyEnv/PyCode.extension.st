Extension { #name : 'PyCode' }

{ #category : 'Grail-Attribute Access' }
PyCode >> ___declaresParameters___ [
	"Does this code object take any parameter -- positional, keyword-only, or
	the *args / **kwargs that co_flags' VARARGS (4) and VARKEYWORDS (8) bits
	record?  An unset count or flags word reads as zero: the traceback frames
	are built with a name, a file and a line and nothing else."

	| n |
	n := 0.
	#( #'co_argcount' #'co_kwonlyargcount' ) @env0:do: [:k | | v |
		v := [self @env0:dynamicInstVarAt: k]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		(v @env0:isKindOf: Integer) ifTrue: [n := n @env0:+ v]].
	n @env0:> 0 ifTrue: [^ true].
	n := [self @env0:dynamicInstVarAt: #'co_flags']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(n @env0:isKindOf: Integer) ifFalse: [^ false].
	^ (n @env0:bitAnd: 12) @env0:~= 0

]

{ #category : 'Grail-Comparison' }
PyCode >> __eq__: other [
	"CPython's code objects compare by VALUE, not by identity, so this is
	ordinary conformance rather than a concession -- unlike PyFrame's __eq__,
	which 9.47 records as a deliberate divergence.

	Grail mints a fresh PyCode for each reconstructed frame, so identity would
	answer False for two readings of one function.  The identifying fields are
	the name, the file and the first line; two different functions cannot share
	all three."

	(other @env0:isKindOf: PyCode) ifFalse: [^ false].
	^ ((self @env0:dynamicInstVarAt: #'co_name')
			@env0:= (other @env0:dynamicInstVarAt: #'co_name'))
		and: [((self @env0:dynamicInstVarAt: #'co_filename')
			@env0:= (other @env0:dynamicInstVarAt: #'co_filename'))
		and: [(self @env0:dynamicInstVarAt: #'co_firstlineno')
			@env0:= (other @env0:dynamicInstVarAt: #'co_firstlineno')]]

]

{ #category : 'Grail-Comparison' }
PyCode >> __hash__ [
	"Consistent with __eq__: name, file, first line."

	^ ((self @env0:dynamicInstVarAt: #'co_name') @env0:hash)
		@env0:bitXor: (((self @env0:dynamicInstVarAt: #'co_filename') @env0:hash)
			@env0:bitXor: ((self @env0:dynamicInstVarAt: #'co_firstlineno') @env0:hash))

]

{ #category : 'Grail-Comparison' }
PyCode >> __ne__: other [
	^ (self __eq__: other) @env0:not

]

{ #category : 'Grail-Pickling' }
PyCode >> __reduce__ [
	^ TypeError ___signal___: 'cannot pickle code objects'

]

{ #category : 'Grail-Pickling' }
PyCode >> __reduce_ex__: aProtocol [
	"A code object cannot be pickled, and CPython says so from HERE, with a
	TypeError -- measured on 3.14.6: ``cannot pickle code objects'' for protocol
	2 and up.  Without it pickle fell through to its generic reduce, tried to
	save the ``code'' class by reference, and failed with a PicklingError about
	the lookup instead: the wrong exception type, which ``except TypeError''
	(and test_annotationlib's test_special_attrs, pickling a ForwardRef whose
	compiled form is cached) does not catch."

	^ TypeError ___signal___: 'cannot pickle code objects'

]

{ #category : 'Grail-String Representation' }
PyCode >> __repr__ [
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

]

{ #category : 'Grail-Python Protocol' }
PyCode >> _replace: positional kw: kwargs [
	"``code.replace(**kwargs)'': a COPY with the named co_ fields changed.

	jinja2's debug.py calls ``code.replace(co_name=location)'' on every
	compile() result to name a template frame, and that call is the reason
	this exists.  While compile() answered the SOURCE STRING it reached
	str.replace instead -- ``replace'' is in both APIs, and the collision made
	a keyword-only call on a string, which used to kill a Flask app rendering
	a template that named a missing filter.  Now that compile() answers a real
	code object the call has to land somewhere, and this is where.

	A COPY, never a mutation: CPython's code objects are immutable, and
	jinja2 keeps the original.  Unknown keywords are refused rather than
	ignored, because a silently-dropped co_ field is a wrong frame name rather
	than a missing one.

	Only the fields Grail carries can be set; the rest of CPython's code
	object -- bytecode, constants, line tables -- does not exist here, so
	asking for one is a TypeError naming it."

	| copy known |
	positional @env0:isEmpty @env0:ifFalse: [
		^ TypeError ___signal___:
			'replace() takes no positional arguments'].
	known := #('co_name' 'co_qualname' 'co_filename' 'co_firstlineno' 'co_flags'
		'co_consts').
	copy := self @env0:class @env0:new.
	#('co_name' 'co_qualname' 'co_filename' 'co_firstlineno' 'co_flags'
	  'co_consts' '___grailSource___' '___grailMode___' '___varnames___') @env0:do: [:n |
		| v |
		v := [self @env0:dynamicInstVarAt: n @env0:asSymbol]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		v @env0:isNil @env0:ifFalse: [
			copy @env0:dynamicInstVarAt: n @env0:asSymbol put: v]].
	kwargs @env0:isNil @env0:ifFalse: [
		kwargs @env0:keysAndValuesDo: [:k :v |
			(known @env0:includes: k @env0:asString) @env0:ifFalse: [
				^ TypeError ___signal___: ('replace() got an unexpected keyword argument '''
					@env0:, k @env0:asString @env0:, '''')].
			copy @env0:dynamicInstVarAt: k @env0:asString @env0:asSymbol put: v]].
	^ copy

]

{ #category : 'Grail-Attribute Access' }
PyCode >> co_argcount [
	"``code.co_argcount'' -- the positional parameter count, or 0 for a code object built without
	one.  A def's and a lambda's carry it as a dynamic instVar, which the
	attribute read answers before reaching this; the frames try/with build for
	a traceback are made with a name, a file and a line only, and CPython's
	code objects always have the field -- pytest's getargs reads it off every
	frame it renders (#1460)."

	^ ([self @env0:dynamicInstVarAt: #'co_argcount']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]) @env0:ifNil: [0]

]

{ #category : 'Grail-Python Protocol' }
PyCode >> co_consts [
	"``code.co_consts'': the constants the code references, with any NESTED
	code objects among them.

	Grail compiles Python to Smalltalk methods and keeps no constant pool, so
	this is EMPTY -- and empty is the honest answer rather than a placeholder:
	there is nothing to enumerate, not an unknown number of things.

	It has to exist, though, and the reason is worth recording.  While
	compile() answered a str, code that walks a code object's constants took
	its ``isinstance(maybe_code, types.CodeType)'' guard and skipped -- which
	looked like passing.  test_listcomps' _recursive_replace is exactly that
	shape, and the moment compile() answered a real code object it went
	through the guard and reached here.  A missing attribute would have turned
	a correct change into a regression in a module that never mentions
	compile().

	What an empty tuple costs is a test that COUNTS what is in there:
	test_builtin's test_all_any_tuple_optimization asserts a genexp leaves
	exactly one nested code object, and gets none."

	| v |
	"dynamicInstVarAt: answers NIL for a name that was never stored rather
	than raising, so the handler alone is not enough -- an unset slot came
	back as Smalltalk nil, which Python saw as an UndefinedObject and could
	not iterate."
	v := [self @env0:dynamicInstVarAt: #'co_consts']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	v @env0:isNil ifTrue: [^ tuple @env0:withAll: (Array @env0:new: 0)].
	^ v

]

{ #category : 'Grail-Attribute Access' }
PyCode >> co_flags [
	"``code.co_flags'' -- the flags word, or 0 for a code object built without
	one.  A def's and a lambda's carry it as a dynamic instVar, which the
	attribute read answers before reaching this; the frames try/with build for
	a traceback are made with a name, a file and a line only, and CPython's
	code objects always have the field -- pytest's getargs reads it off every
	frame it renders (#1460)."

	^ ([self @env0:dynamicInstVarAt: #'co_flags']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]) @env0:ifNil: [0]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> co_freevars [
	"``code.co_freevars'' -- a tuple of the def's free variable names.

	An empty tuple when the def closes over nothing, which is CPython's answer
	and not an absence: ``len(co.co_freevars)'' is how the __code__ assignment
	rule is stated, so a missing attribute would make the check impossible to
	write rather than merely unavailable."

	| names |
	"``dynamicInstVarAt:'' is env-0 EXPLICITLY: a bare send from this env-1
	method is looked up in env 1, where there is none, so the handler swallowed
	the MessageNotUnderstood and every code object reported an empty tuple."
	names := [self @env0:dynamicInstVarAt: #'___freevars___']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	^ (ExecBlock @env0:___pyTupleClass___)
		@env0:perform: #'withAll:' env: 0
		withArguments: { names @env0:ifNil: [#()] }

]

{ #category : 'Grail-Attribute Access' }
PyCode >> co_kwonlyargcount [
	"``code.co_kwonlyargcount'' -- the keyword-only parameter count, or 0 for a code object built without
	one.  A def's and a lambda's carry it as a dynamic instVar, which the
	attribute read answers before reaching this; the frames try/with build for
	a traceback are made with a name, a file and a line only, and CPython's
	code objects always have the field -- pytest's getargs reads it off every
	frame it renders (#1460)."

	^ ([self @env0:dynamicInstVarAt: #'co_kwonlyargcount']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]) @env0:ifNil: [0]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> co_posonlyargcount [
	"``code.co_posonlyargcount'' -- the positional-only parameter count, or 0 for a code object built without
	one.  A def's and a lambda's carry it as a dynamic instVar, which the
	attribute read answers before reaching this; the frames try/with build for
	a traceback are made with a name, a file and a line only, and CPython's
	code objects always have the field -- pytest's getargs reads it off every
	frame it renders (#1460)."

	^ ([self @env0:dynamicInstVarAt: #'co_posonlyargcount']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]) @env0:ifNil: [0]

]

{ #category : 'Grail-Attribute Access' }
PyCode >> co_varnames [
	"``code.co_varnames'' -- the def's parameter names, in CPython's order.

	CPython continues the tuple with the body's locals; Grail records the
	parameters only (FunctionDefAst >> ___coVarnames___ says why), which is the
	part ``inspect.getargs'' -- and pytest's failure report through it -- reads
	(#1460).

	A code object that recorded nothing and DECLARES NO PARAMETERS answers the
	empty tuple: a module's, a class body's, the frames try/with build for a
	traceback.  CPython's is () there too, and pytest reads co_varnames off
	every frame of a traceback it renders with funcargs -- which it does for
	the interrupted session a collection error ends in, so an AttributeError
	here turned a reported error into a crash.  One that recorded nothing but
	does take parameters (a lambda's) still has no such attribute, rather than
	a tuple that would be wrong."

	| names |
	names := [self @env0:dynamicInstVarAt: #'___varnames___']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	names @env0:isNil ifTrue: [
		self ___declaresParameters___ ifFalse: [names := #()]].
	names @env0:isNil ifTrue: [
		^ AttributeError ___signal___: '''code'' object has no attribute ''co_varnames'''].
	^ (ExecBlock @env0:___pyTupleClass___)
		@env0:perform: #'withAll:' env: 0
		withArguments: { names }

]
