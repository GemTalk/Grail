Extension { #name : 'PythonInstance' }

{ #category : 'Python-Callable' }
PythonInstance >> ___pyCallValue___: positional kw: kwargs [
	"Forward the INDIRECT call protocol to ``value:value:'' above, which
	does the real ``__call__'' dispatch.  Overrides
	Object>>___pyCallValue___:kw:, whose default answer is the TypeError
	``'<typename>' object is not callable'' — wrong for an instance whose
	class defines __call__, since in CPython ``obj(...)'' works exactly
	when ``type(obj).__call__'' exists.  Same forwarding shape as
	BoundMethod>>___pyCallValue___:kw:.

	Reached whenever a callable INSTANCE is invoked other than as a
	literal ``obj(...)'' call site: through a variable, and — the case
	that motivated this — as a DECORATOR.  A decorator built as a class
	instance (``cpython_only = _SkipDecorator(...)'' in test.support, and
	the ``@retry(...)''-style objects common in libraries) is applied by
	codegen through ___pyCallValue___:kw:, so it raised the not-callable
	TypeError inside the decorator-application guard and was SILENTLY
	dropped: the decorator never ran, at module scope and in class bodies
	alike, while the same object called explicitly worked.  Plain-function
	decorators were unaffected, which is why this went unnoticed.

	Instances only.  Calling a CLASS through the indirect protocol still
	lands on Object>>___pyCallValue___:kw: and still reports not-callable
	— see the discussion there of why the classes that want it opt in
	individually (the enum member builder counts a descriptor produced by
	``@enum.property'' / ``@member'' as a member)."

	^ self value: positional value: kwargs

]

{ #category : 'Grail-Private' }
PythonInstance >> ___wrappedIsAbstract___ [
	"__isabstractmethod__ of the wrapped callable, defaulting to false.
	Shared by both wrappers; guarded because most callables do not answer it."

	^ [| f v |
		f := self @env0:dynamicInstVarAt: #'__func__'.
		v := f @env1:___pyAttrLoad___: #'__isabstractmethod__'.
		v == true]
			@env0:on: AbstractException
			do: [:ex | ex @env0:return: false]

]

{ #category : 'Grail-Attribute Access' }
PythonInstance >> ___wrappedMeta___: aName [
	"Read aName off the wrapped ``__func__'' through the Python attribute
	protocol.  Shared by both wrappers."

	^ (self @env0:dynamicInstVarAt: #'__func__') @env1:___pyAttrLoad___: aName

]

{ #category : 'Grail-Reflection' }
PythonInstance >> ___wrapperRepr___: aTypeName [
	"``<staticmethod(<function f at 0x...>)>'' -- CPython's form, naming the
	wrapped callable through its own repr.  Shared by both wrappers.

	The wrapped repr is taken through the Python protocol rather than
	printString, so a wrapped object with its own __repr__ is honoured."

	| f inner |
	f := self @env0:dynamicInstVarAt: #'__func__'.
	inner := [(f @env1:__repr__) @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: '?'].
	^ ('<' @env0:, aTypeName @env0:, '(' @env0:, inner @env0:, ')>')
		@env0:asUnicodeString

]

{ #category : 'Grail-Python Protocol' }
PythonInstance >> __delitem__: key [
	"Item deletion without __delitem__: catchable TypeError.

	The message comes from the shared ___pyItemDeletionMessage___ so that a
	user class takes CPython's HEAP-TYPE wording -- ``'C' object doesn't
	support item deletion'', with the contraction; the ``does not'' spelling
	is what CPython uses only for a type with no sequence slot at all."

	"A class attribute under the name -- ``Cls.__delitem__ = v'' after the class
	exists, or a value no compiled forwarder stands for -- is the protocol
	(issue #1218)."
	(self ___typeDunder___: #'__delitem__') @env0:ifNotNil: [:___fn |
		^ self ___callTypeAttr___: ___fn with: { key }].
	TypeError ___signal___: (self @env0:___pyItemDeletionMessage___)

]

{ #category : 'Python-Introspection' }
PythonInstance >> __dict__ [
	"Python ``obj.__dict__'' — return a LIVE view of the instance's
	dynamic-instVar storage.  Reads probe the instance directly;
	writes (``self.__dict__['x'] = v'') and bulk updates
	(``rv.__dict__.update(self.__dict__)'') propagate back into the
	instance's dynamic-instVar storage.  A snapshot-only KeyValueDictionary
	silently dropped writes — jinja2's Frame.copy() / Symbols.copy()
	idiom (``rv = object.__new__(cls); rv.__dict__.update(self.__dict__)'')
	left rv empty, which broke ``{% if %}'' template compilation
	through Frame's require_output_check accessor."

	"Strict __slots__ classes have no per-instance __dict__ — match
	CPython by raising AttributeError instead of handing back an (always
	empty) dynamic-instVar view.  The marker is emitted by ClassDefAst
	when the class declares __slots__ without a ``__dict__'' member."
	(self @env0:class @env0:whichClassIncludesSelector: #'___pySlotsStrict___' environmentId: 1) notNil ifTrue: [
		"...and the marker's VALUE decides, because a class that declares no
		__slots__ of its own overrides it with false: CPython gives such a
		class a __dict__ no matter what its bases declare."
		self ___pySlotsStrict___ ifTrue: [
			^ AttributeError ___signal___:
				'''' @env0:, self @env0:class @env0:name @env0:asString @env0:,
					''' object has no attribute ''__dict__'''
		]
	].
	^ PyInstanceDict @env0:on: self

]

{ #category : 'Grail-Python Protocol' }
PythonInstance >> __getitem__: key [
	"Subscripting an instance whose class defines no __getitem__:
	catchable TypeError (CPython).  A real __getitem__ on the user
	class overrides this; the legacy-iteration probe in __iter__ uses
	whichClassIncludesSelector (not a send), so it is unaffected.

	Named through ___pyDnuTypeName___ (``type(x).__name__'') rather than
	``self class name'': for a user class the two agree, but a GRAIL class
	that happens to be PythonInstance-backed reported its Smalltalk name --
	``'PythonGenerator' object is not subscriptable'' where CPython says
	``'generator'''."

	"A class attribute under the name -- ``Cls.__getitem__ = v'' after the class
	exists, or a value no compiled forwarder stands for -- is the protocol
	(issue #1218)."
	(self ___typeDunder___: #'__getitem__') @env0:ifNotNil: [:___fn |
		^ self ___callTypeAttr___: ___fn with: { key }].
	TypeError ___signal___: ('''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' object is not subscriptable')

]

{ #category : 'Grail-Python Protocol' }
PythonInstance >> __iter__ [
	"CPython's LEGACY sequence-iteration protocol: an object with
	__getitem__ but no __iter__ iterates by successive integer indices
	until IndexError (test_heapq's __getitem__-only fixtures).  Returns a
	LAZY seq_iterator that calls __getitem__ one index at a time on each
	__next__ -- a class whose __getitem__ answers a value for EVERY index
	(an unbounded sequence) must not be materialized; the former eager walk
	spun forever and OOM-killed the session (test_iter's NoIterClass /
	UnlimitedSequenceClass).  Without __getitem__ raise CPython's catchable
	TypeError -- the bare env-1 MNU was uncatchable.  A user class defining
	its own __iter__ overrides this (nearer in the chain)."

	"Gate on REAL __getitem__ OWNERSHIP (below the PythonInstance/Object
	fallback): every instance carries a fallback __getitem__: that itself
	raises 'not subscriptable', so whichClassIncludesSelector never sees
	nil and cannot tell a genuine sequence from a non-subscriptable object.
	CPython's iter(x) raises TypeError up front for the latter (its
	PySequence_Check tests a real sq_item); the former eager walk did too,
	incidentally, by probing __getitem__(0).  ___hasProtocolForCall___
	restores that (test_error_iter's DefaultIterClass)."
	"``__iter__ = None'' is CPython's explicit opt-out, and it wins over
	__getitem__ for every consumer: builtins >> iter: asked, but list(),
	tuple() and a for loop reach this fallback directly and walked the
	sequence protocol anyway -- typing's _NotIterable forms ran away."
	(self ___classAttrDunder___: #'__iter__') == None
		ifTrue: [
			TypeError ___signal___: ('''' @env0:, self ___pyTypeNameForError___
				@env0:, ''' object is not iterable')].
	"A class attribute under the name -- ``Cls.__iter__ = v'' after the class
	exists, or a value no compiled forwarder stands for -- is the protocol
	(issue #1218)."
	(self ___typeDunder___: #'__iter__') @env0:ifNotNil: [:___fn |
		^ self ___callTypeAttr___: ___fn with: #()].
	(self ___hasProtocolForCall___: '__getitem__')
		ifFalse: [
			TypeError ___signal___: ('''' @env0:, self ___pyTypeNameForError___
				@env0:, ''' object is not iterable')].
	^ seq_iterator ___on: self

]

{ #category : 'Grail-Python Protocol' }
PythonInstance >> __next__ [
	"An object whose __iter__ returned self but which defines no
	__next__ (test_heapq's broken-iterator fixtures): CPython raises
	TypeError; the bare env-1 MNU was uncatchable.  A real __next__
	on the user class overrides this.

	SO DOES A METACLASS'S, when the receiver is a class.  object has no
	__next__ at all, so a class whose metaclass defines one would have
	reached it through doesNotUnderstand: -- except that a class built here
	inherits THIS default, which resolves the send and stops the fall
	through.  Asked before raising, exactly as object's context-manager and
	iteration defaults now do."

	"A class attribute under the name -- ``Cls.__next__ = v'' after the class
	exists, or a value no compiled forwarder stands for -- is the protocol
	(issue #1218)."
	(self ___typeDunder___: #'__next__') @env0:ifNotNil: [:___fn |
		^ self ___callTypeAttr___: ___fn with: #()].
	(self ___grailMetaclassMethodFor___: #'__next__') @env0:ifNotNil: [:___m |
		^ self @env0:performMethod: ___m].
	TypeError ___signal___: ('''' @env0:, self ___pyTypeNameForError___
		@env0:, ''' object is not an iterator')

]

{ #category : 'Grail-Python Protocol' }
PythonInstance >> __setitem__: key _: aValue [
	"Item assignment without __setitem__: catchable TypeError
	(test_heapq's LenOnly fixture -- heappush into a non-sequence).
	Named through ___pyDnuTypeName___ for the reason __getitem__: gives."

	"A class attribute under the name -- ``Cls.__setitem__ = v'' after the class
	exists, or a value no compiled forwarder stands for -- is the protocol
	(issue #1218)."
	(self ___typeDunder___: #'__setitem__') @env0:ifNotNil: [:___fn |
		^ self ___callTypeAttr___: ___fn with: { key. aValue }].
	TypeError ___signal___: ('''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' object does not support item assignment')

]

{ #category : 'Grail-Smalltalk Bridge' }
PythonInstance >> asFloat [
	"env-1 twin of the env-0 bridge above."

	((self @env0:class @env0:whichClassIncludesSelector: #'__float__' environmentId: 1) ~~ nil)
		ifTrue: [^ self @env0:perform: #'__float__' env: 1].
	TypeError ___signal___: ('must be real number, not '
		@env0:, self @env0:class @env0:name @env0:asString)

]

{ #category : 'Python-Callable' }
PythonInstance >> value: positional value: kwargs [
	"Python ``obj(...)`` semantics on a user-class instance: dispatch
	to ``__call__`` if defined.  Built-in callables (ExecBlock,
	BoundMethod, classes) implement ``value:value:`` directly; this
	bridges Python user classes that override ``__call__`` (e.g.
	``weakref.ref.__call__(self): return self._obj``) into the same
	unified call protocol.

	Dispatch shape mirrors ``BoundMethod >> value:value:``: pick
	the fixed-arity ``__call__:_:_:`` selector for 0..3 positional
	args with no kwargs; otherwise fall through to ``___call__:kw:``
	varargs if present.  Raises a TypeError-shaped DNU if the
	class doesn't implement ``__call__`` at all."

	| nargs cls callSel varargsSel |
	cls := self @env0:class.
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifTrue: [
		nargs := positional @env0:size.
		callSel := nargs @env0:= 0
			ifTrue: [#'__call__']
			ifFalse: [
				| s |
				s := AppendStream @env0:on: Unicode7 @env0:new.
				s @env0:nextPutAll: '__call__:'.
				2 @env0:to: nargs do: [:i | s @env0:nextPutAll: '_:'].
				s @env0:contents @env0:asSymbol].
		((cls @env0:whichClassIncludesSelector: callSel environmentId: 1) notNil) ifTrue: [
			^ self @env0:perform: callSel env: 1 withArguments: positional
		].
	].
	"Three underscore prefix from BoundMethod's ``'_' , '__call__'
	, ':kw:''' convention: 1 (underscore) + 2 (__call__'s leading
	underscores) = 3 leading underscores; trailing underscores
	unchanged."
	varargsSel := #'___call__:kw:'.
	((cls @env0:whichClassIncludesSelector: varargsSel environmentId: 1) notNil) ifTrue: [
		^ self @env0:perform: varargsSel env: 1 withArguments: { positional. kwargs }
	].
	"``__call__'' ASSIGNED in the class body rather than defined there.

		def _idfunc(_, x): return x
		class NewType:
			__call__ = _idfunc

	is CPython 3.14's typing.NewType, verbatim, and the idiom is not rare --
	it is how a class borrows an existing function as a dunder.  Neither probe
	above can see it: ClassDefAst compiles a class-body ASSIGNMENT to an
	accessor pair on the METACLASS, so there is no ``__call__'' among the
	class's own env-1 instance selectors and ``UserId(5)'' died on the DNU
	below -- a MessageNotUnderstood, which no Python ``except'' can catch.

	CPython's rule is that the attribute is looked up on the TYPE and then
	bound by the descriptor protocol -- ``type(obj).__call__(obj, *args)''
	for a function.  ___classAttrDunder___: requires the accessor PAIR,
	exactly as the module branch of Object>>___pyAttrLoad___: does, so that
	an ordinary class-side METHOD named __call__ is not mistaken for a class
	attribute holding one.

	The value is found by ___classAttrDunder___:, which also sees a
	``Cls.__call__ = v'' stored after the class exists, and it is bound the
	way CPython's slot lookup binds it (object >> ___typeAttrBound___:): a
	function gets the instance first, a staticmethod or an ALREADY-BOUND
	method or a callable instance does not (issue #1218).  This used to
	prepend self to whatever it found, so ``__call__ = obj.m'' ran m with the
	instance as an extra argument."
	(self ___typeDunder___: #'__call__') @env0:ifNotNil: [:fn |
		^ (self ___typeAttrBound___: fn) @env1:___pyCallValue___: positional kw: kwargs].
	"No __call__: CPython's TypeError, raised here.  This used to fall
	through to a DNU on the original selector, on the theory that the DNU
	path would reshape it -- it did not: the send reached the CLASS side,
	surfaced as ``a K class does not understand #__call__'', and no Python
	``except'' could catch it, so ``obj()'' on any non-callable instance
	ended the whole program.  typing's TypeVar, ForwardRef and NoDefault
	tests call an instance precisely to see the TypeError."
	^ TypeError ___signal___: ('''' @env0:, self ___pyTypeNameForError___
		@env0:, ''' object is not callable')

]
