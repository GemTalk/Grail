Extension { #name : 'ExecBlock' }

{ #category : 'Grail-Callable' }
ExecBlock >> ___pyCallValue___: positional kw: kwargs [
	"Polymorphic Python call.  A Smalltalk block stored as a Python
	callable comes in two shapes:

	  (1) A block produced by Grail's CallAst.printKeywordsDictOn:
	      pattern — ``[:positional2 :keywords2 | <body>]'' that
	      takes two args (the positional array and the kwargs dict).
	      Decorator factories like ``functools.lru_cache(N)'' return
	      this shape so a subsequent decorator invocation ``deco(fn)''
	      can route uniformly through ``___pyCallValue___:kw:''.
	  (2) A bare block whose arity matches ``positional size''.

	Dispatch on numArgs to pick the right shape: when the block
	takes exactly 2 args, forward as (positional, kwargs);
	otherwise splat ``positional'' via ``valueWithArguments:''.
	Kwargs are dropped in case (2) — the call shape doesn't carry
	them."

	^ self @env0:numArgs == 2
		@env0:ifTrue: [self @env0:value: positional value: kwargs]
		@env0:ifFalse: [self @env0:valueWithArguments: positional]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___setKwDefaults___: value [
	"Backing for ``func.__kwdefaults__ = value''.  Mutates the shared def-time
	cell in place rather than replacing the slot, so the function body -- which
	captured that same cell object at def-time -- consults the new value on the
	next call.  Python None clears the defaults (stored as nil, so every
	keyword-only parameter becomes required again).  A block with no cell yet
	(had no keyword-only params) gets one created, so the attribute round-trips.

	Anything but None or a dict is refused, as CPython's setter refuses it:
	Grail stored a list of pairs, and the next call failed far from here."

	| cell stored b |
	stored := (value == (ExecBlock @env0:___pyNone___)) ifTrue: [nil] ifFalse: [value].
	stored @env0:isNil ifFalse: [
		b := (Python @env0:at: #builtins) @env0:___instance___.
		((b @env1:isinstance: stored _: (b @env1:___pyAttrLoad___: #'dict'))
			@env1:___isTruthy___) ifFalse: [
				^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'TypeError')
					___signal___: '__kwdefaults__ must be set to a dict object']].
	cell := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__kwdefaults__'.
	cell @env0:isNil ifTrue: [
		cell := Array @env0:new: 1.
		(ExecBlock @env0:___pyAttrsClass___) @env0:staticSlotAt: self attr: '__kwdefaults__' put: cell].
	cell @env0:at: 1 put: stored.
	^ ExecBlock @env0:___pyNone___

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __annotate__ [
	"``func.__annotate__'' — PEP 649's annotation-computing function, a
	one-argument callable taking a Format and answering the annotation
	dict.  FunctionDefAst stamps it at def-time for any def that carries
	an annotation; None when the def carries none, as in CPython.

	It is the SHARED, identity-bearing object the annotation protocol is
	built on: functools.update_wrapper copies this attribute rather than
	the computed dict, and test_update_wrapper_annotations asserts
	``wrapper.__annotate__ is inner.__annotate__''."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__annotate__')
		ifNil: [ExecBlock @env0:___pyNone___]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __annotations__ [
	"``func.__annotations__'' — the parameter/return annotation dict.

	PEP 649: this is DERIVED, by calling the def's ``__annotate__'' with
	Format.VALUE.  The annotation expressions are therefore evaluated
	HERE, on first read, not at def-time -- which is what makes a forward
	reference to a name bound later in the module work, and what a
	NameError from an annotation naming nothing at all reports (CPython
	raises it from the read, not from the module load).

	An un-annotated closure has no ``__annotate__'' and gets a fresh empty
	dict, matching CPython where every function has the mapping.  A value
	attribute (see ___pythonValueAttrs___) so the read returns the dict
	rather than a BoundMethod wrap.

	The result is MEMOIZED into the slot on first read, as CPython does.
	Returning a new one per call would make ``f.__annotations__ is
	f.__annotations__'' false, and functools.update_wrapper's contract is
	identity-based: check_wrapper asserts ``wrapper.__annotations__ is
	wrapped.__annotations__'' after the copy.  Memoizing also means a
	NameError is raised on EVERY read rather than once, since a failed
	call stores nothing."

	| attrs cur annotate |
	attrs := ExecBlock @env0:___pyAttrsClass___.
	cur := attrs @env0:slotAt: self attr: '__annotations__'.
	cur == nil ifFalse: [^ cur].
	annotate := attrs @env0:slotAt: self attr: '__annotate__'.
	annotate == nil ifTrue: [
		^ attrs @env0:slotAt: self attr: '__annotations__'
			put: (KeyValueDictionary @env0:new)].
	^ attrs @env0:slotAt: self attr: '__annotations__'
		put: (annotate @env0:value: { 1 } value: nil)

]

{ #category : 'Grail-Callable' }
ExecBlock >> __call__: args [
	"Call the block with the given arguments.
	 This makes ExecBlock callable in Python's sense."

	^ self @env0:valueWithArguments: args

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __closure__ [
	"``func.__closure__'' -- a tuple of PyCell, one per FREE VARIABLE of the
	def, in sorted name order; None for a function that closes over nothing,
	as in CPython.

	FunctionDefAst cascades ``___pyClosure___:'' at the def site with the
	reader/writer block pair for each free variable, so each cell reads and
	writes the enclosing scope's live binding rather than a snapshot.  The
	free-variable set is the one CallAst computes for locals()
	(___freeVariableNamesFor___:), so the two answers cannot drift apart.

	CPython orders __closure__ by co_freevars, which is sorted; the stamp
	emits sorted names for the same reason.  #'__closure__' is in
	___pythonValueAttrs___ so a read returns the tuple, not a BoundMethod."

	| cells |
	cells := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__closure__'.
	cells @env0:isNil ifTrue: [^ ExecBlock @env0:___pyNone___].
	^ (ExecBlock @env0:___pyTupleClass___) @env0:perform: #'withAll:' env: 0 withArguments: { cells }

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __code__ [
	"``func.__code__'' -- the PyCode stamped at def-time (FunctionDefAst cascades
	``___pyCode___:'' onto the block), or AttributeError for a synthetic block
	that never got one (CPython real functions always have a code object; a bare
	block is not one).  #'__code__' is in ___pythonValueAttrs___ so a read
	returns the PyCode value, not a BoundMethod-wrapped selector."

	| c |
	c := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__code__'.
	c ifNotNil: [ ^ c ].
	"AttributeError lives in the Python dictionary, which is NOT on the symbol
	list when this kernel-extension file is filed by install_base (SystemUser,
	3.7.x) -- naming the class directly there is a compile-time ``undefined
	symbol''.  Resolve it at RUNTIME via the symbol list, the same rule
	___pyNone___ uses."
	^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError')
		___signal___: '''function'' object has no attribute ''__code__'''

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __delattr__: name [
	"``del block.attr'' / ``delattr(block, name)'' — drop the entry from the
	``__dict__'' table.  Object's default ___pyAttrDelete___: works on
	dynamic instVars, which a primitive ExecBlock has none of, so without
	this every deletion raised AttributeError even for an attribute that
	had just been set (functools' test_missing_attributes deletes the
	wrapper's ``dict_attr'' and expects the NEXT update_wrapper to be the
	thing that raises).

	A genuinely absent name still raises, per CPython.

	``del func.__kwdefaults__'' is not a removal: the attribute is a getset
	in CPython, and deleting it stores None, so every keyword-only parameter
	becomes required."

	(name @env0:asSymbol == #'__kwdefaults__') ifTrue: [
		^ self @env1:___setKwDefaults___: ExecBlock @env0:___pyNone___].
	((ExecBlock @env0:___pyAttrsClass___) @env0:removeAt: self attr: name)
		ifTrue: [^ ExecBlock @env0:___pyNone___].
	^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError') ___signal___:
		(name @env0:asString)

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __dict__ [
	"``func.__dict__'' — the LIVE user-attribute mapping, not a snapshot.

	Liveness is required, not a nicety: functools.update_wrapper copies
	attributes by doing ``getattr(wrapper, '__dict__').update(...)'', so a
	copy handed back here would absorb the merge and leave the wrapper's
	real attributes untouched.

	Excludes __name__ / __qualname__ / __module__ / __doc__ /
	__annotations__ / __type_params__ — CPython implements those as getset
	descriptors rather than dict entries, and they live in a separate slot
	table for exactly that reason (see ExecBlockAttrs)."

	^ (ExecBlock @env0:___pyAttrsClass___) @env0:forBlock: self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __doc__ [
	"``func.__doc__'' — the def's docstring, or None.

	Object>>__doc__ answers the docstring of ``object'' itself, and every
	receiver inherits it, so before this method EVERY Grail closure claimed
	to be documented as ``The base class of the class hierarchy...'' —
	including one that had just been handed a real docstring by
	``setattr(f, '__doc__', ...)'', because a compiled method outranks the
	side-table __getattr__ read.  CPython answers None for an undocumented
	function, and functools' test_no_update / test_selective_update assert
	exactly that."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__doc__')
		ifNil: [ExecBlock @env0:___pyNone___]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __getattr__: name [
	"Look up ``name'' in the ExecBlockAttrs side-table.  Raises
	AttributeError on miss, matching CPython's object.__getattr__
	fallback semantics so ``hasattr(block, name)'' returns the
	expected truth value.

	Only the ``__dict__'' table is consulted: every SLOT name has a real
	env-1 method below, and Grail's attribute protocol prefers a compiled
	method over ``__getattr__'' — so a slot read never arrives here."

	| value |
	value := (ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: name.
	value == nil ifTrue: [
		^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError') ___signal___:
			('ExecBlock object has no attribute ''' @env0:, name @env0:asString @env0:, '''')
	].
	^ value

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __kwdefaults__ [
	"``func.__kwdefaults__'' -- a dict mapping each keyword-only parameter that
	has a default to that default's VALUE, or None when the function declares no
	keyword-only defaults.  FunctionDefAst stamps a def-time CELL (a one-slot
	holder) via ___pyKwDefaults___:; the value read here is the cell's current
	contents, so a later ``func.__kwdefaults__ = X'' (which mutates the same
	cell) is reflected both here and in what the next call binds.  #'__kwdefaults__'
	is in ___pythonValueAttrs___ so this returns the dict/None value, not a
	BoundMethod-wrapped selector.  A block that never got a cell (no keyword-only
	params, or a synthetic block) reads None, matching CPython."

	| cell |
	cell := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__kwdefaults__'.
	cell @env0:isNil ifTrue: [^ ExecBlock @env0:___pyNone___].
	^ (cell @env0:at: 1) ifNil: [ExecBlock @env0:___pyNone___]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __module__ [
	"Default ``func.__module__'' for a closure-shaped callable.
	Same slot-table-first semantics as __name__; falls back to the
	placeholder string when no decorator has stamped a value.

	The fallback is a method LITERAL, so every unstamped closure answers
	the identical object -- ``update_wrapper'' copies it and
	``wrapper.__module__ is wrapped.__module__'' then holds, which is what
	CPython guarantees for a real module name."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__module__')
		ifNil: ['<closure>']

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __name__ [
	"Default ``func.__name__'' for a closure-shaped callable.  No
	lexical name is recoverable from a plain block, so return a
	generic placeholder that decorator consumers (Flask's
	``@app.route'' reading ``view_func.__name__'' to pick the
	rule's endpoint, functools.wraps copying the stamp) can store
	without crashing.  A prior ``__setattr__: '__name__''' write
	wins — the side-table read in ``__getattr__'' fires first via
	the Python attribute protocol, and this fallback only runs
	when the slot is unset.

	Phrased as a normal env-1 method (not a __getattr__ branch) so
	``hasattr(block, '__name__')'' is always true."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__name__')
		ifNil: ['<closure>']

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __qualname__ [
	"``func.__qualname__'' — a stamped value if one exists, else __name__.
	Grail closures don't track lexical nesting, so the fallback is the bare
	name; the slot read has to come first because functools.update_wrapper
	assigns __qualname__ INDEPENDENTLY of __name__ (with ``assigned=()''
	the wrapper must keep its own name while a later explicit
	``wrapper.__qualname__ = ...'' still sticks)."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__qualname__')
		ifNil: [self __name__]

]

{ #category : 'Grail-Representation' }
ExecBlock >> __repr__ [
	"``<function NAME at 0xADDR>'', CPython's shape.  Grail answered
	``<ExecBlock object>'', which shows up wherever a function is printed --
	including inside error messages callers match on (functools' register()
	names the offending function in the TypeError it raises).

	Must live in the env-1 region: compiled into env 0 it is invisible to
	Python attribute dispatch, so ``repr(f)'' kept reaching Object's default."

	^ ('<function ' @env0:, self __qualname__ @env0:asString
		@env0:, ' at 0x' @env0:, (self @env0:identityHash @env0:printStringRadix: 16)
		@env0:asLowercase @env0:, '>') @env0:asUnicodeString

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __setattr__: name _: value [
	"Store ``name -> value'' in the ExecBlockAttrs side-table.
	GemStone's primitive ExecBlock has no varying instVars, so the
	default Object>>__setattr__ path (dynamicInstVarAt:put: on the
	receiver) raises ImproperOperation.  Routes through the helper
	class so Python code that legitimately tags closures with
	metadata (jinja2.async_utils stamps ``wrapper.jinja_async_variant
	= True'' on the nested decorator-output closure) round-trips
	through a subsequent ``__getattr__'' read.

	The six identifying-metadata dunders go to the SLOT table, every
	other name to the ``__dict__'' table — see ___isSlotName___:."

	"``func.__kwdefaults__ = X'' must change what the NEXT call binds, so it is
	routed to the shared kwdefaults cell (a def-time holder the function body
	captures) rather than overwriting the slot -- see ___setKwDefaults___:."
	(name @env0:asSymbol == #'__kwdefaults__') ifTrue: [
		^ self @env1:___setKwDefaults___: value].
	"ASSIGNING __annotations__ RETIRES __annotate__, as CPython's function setter
	 does (measured: after ``f.__annotations__ = d'', f.__annotate__ is None).
	 Otherwise the old annotate function survived the assignment, and the
	 STRING format -- which asks __annotate__ first -- kept answering the
	 ORIGINAL annotations.  HERE, on the Python assignment, and not in the slot
	 writer: the __annotations__ GETTER memoises through that same writer, so
	 retiring there fired on the first READ and broke MUTATING the dict
	 (``f.__annotations__['x'] = str'' must leave __annotate__ alone --
	 test_modify_annotations).  Stored as None explicitly: a nil per-object
	 entry reads as absent and falls back to the def-time annotate."
	(name @env0:asSymbol == #'__annotations__') ifTrue: [
		(ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__annotate__'
			put: ExecBlock @env0:___pyNone___].
	^ (ExecBlock @env0:___isSlotName___: name)
		@env0:ifTrue: [
			(ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: name put: value]
		@env0:ifFalse: [
			(ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: name put: value]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __signature_spec__ [
	"The def-time parameter spec inspect.signature reads -- an Array of
	``(name, kind-index, default-source-text-or-nil)'' triples in declaration
	order, stamped by FunctionDefAst.  None for a def with no parameters,
	which renders as ``()'' regardless.

	Grail has no code object to introspect, so the compiler records what it
	already knows instead of synthesising ``co_varnames''/``co_argcount''.
	Nothing observable needs the code-object form: across the whole CPython
	corpus the only ``co_*'' fields read are co_firstlineno and co_name,
	both of which PyCode already carries."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__signature_spec__')
		ifNil: [ExecBlock @env0:___pyNone___]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> __type_params__ [
	"``func.__type_params__'' — PEP 695 type parameters.

	The def site stamps the NAMES (___pyTypeParams___:) and the placeholders
	are built here on first read; the empty tuple for a def that declares
	none.  It must never be absent: it is one of functools.WRAPPER_ASSIGNMENTS,
	and a name in that list that raises AttributeError on the WRAPPER turns
	update_wrapper's callers into errors rather than copies.

	Memoized on first read for the same identity reason as
	__annotations__."

	| attrs cur names built |
	attrs := ExecBlock @env0:___pyAttrsClass___.
	cur := attrs @env0:slotAt: self attr: '__type_params__'.
	cur == nil ifFalse: [^ cur].
	"The def site stamps the NAMES (``def f[T]'' -> #('T')); the placeholders are
	built on first read, so nothing has to reach typing at def time."
	names := attrs @env0:staticSlotAt: self attr: '___typeParamNames___'.
	built := (names == nil or: [names @env0:isEmpty])
		ifTrue: [#()]
		ifFalse: [ | g |
			"The live module namespace the def was written in -- what
			``f.__globals__'' answers, computed by ExecBlockAttrs."
			g := [attrs @env0:___globalsFor___: self]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
			names @env0:collect: [:n | ExecBlock @env0:___pyTypeVarNamed___: n globals: g]].
	^ attrs @env0:slotAt: self attr: '__type_params__'
		put: ((ExecBlock @env0:___pyTupleClass___) @env0:withAll: built)

]

{ #category : 'Grail-Block Evaluation' }
ExecBlock >> valueWithArguments: anArray [
	"Evaluate the block with an array of arguments"

	^ self @env0:valueWithArguments: anArray

]
