! ===============================================================================
! Object Methods (Python 'object' type)
! ===============================================================================
! This file contains method implementations for the Object class when used
! as the Python 'object' type. Since Object is a fundamental GemStone Smalltalk
! class, we only add Python-specific methods here.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from object
expectvalue /Metaclass3
doit
object removeAllMethods: 1.
object class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Bridge'
classmethod: object
___new___: arg
	"Convenience method: self perform: #__new__: env: 1 withArguments: {arg}"
	^ self @env1:__new__: arg
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Grail-Bridge'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

! ------- performMethod variants for higher arities -------
! GemStone ships ``performMethod:`` (0-arg) and ``with:performMethod:``
! (1-arg) on Object env-0.  Both invoke primitive 2027, which dispatches
! by inspecting the supplied selector's arity.  Add 2- through 4-arg
! variants so ``Super >> doesNotUnderstand:args:envId:`` can invoke a
! parent class's compiled method on the substituted receiver without
! going through the receiver's class dispatch (which would re-fire the
! same override).  These fit on the SystemUser side of install.gs;
! DataCurator can't modify Object.

category: 'Grail-perform method'
method: object
with: argOne with: argTwo performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 2-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:performMethod:'
		args: { argOne. argTwo. aGsNMethod }
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo with: argThree performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 3-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. aGsNMethod }
%

category: 'Grail-perform method'
method: object
with: argOne with: argTwo with: argThree with: argFour performMethod: aGsNMethod
	"Execute aGsNMethod as if it were a 4-arg keyword send to self."

	<primitive: 2027>
	aGsNMethod _validateClass: GsNMethod.
	^ self _primitiveFailed: #'with:with:with:with:performMethod:'
		args: { argOne. argTwo. argThree. argFour. aGsNMethod }
%

set compile_env: 1

category: 'Grail-Convenience Methods'
classmethod: object
___new___

	^ self @env0:new
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___: arg1 _: arg2
	"Convenience method for calling __new__:_: from env 1 code"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Grail-Convenience Methods'
classmethod: object
___new___: arg1 _: arg2 _: arg3
	"Convenience method for calling __new__:_:_: from env 1 code"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

category: 'Grail-Initialization'
classmethod: object
__init_subclass__
	"Called when a class is subclassed.
	This is a class method that receives the subclass as the receiver.
	Default implementation does nothing."

	^ None
%

category: 'Grail-Initialization'
classmethod: object
__new__
	"Create a new instance of this class.
	This is a class method that takes the class as the receiver.
	In Python: object.__new__(cls) creates a new instance of cls."

	^ self @env0:new
%

category: 'Grail-Introspection'
classmethod: object
__name__
	"Python ``cls.__name__`` returns the class's short name as a string.
	Inherited through the metaclass chain to every class, so
	``OrderedCollection.__name__`` answers 'OrderedCollection',
	``ExecBlock.__name__`` answers 'ExecBlock', etc.  Grail uses the
	Smalltalk class name unchanged — downstream inspect.ismethod /
	isfunction stubs are written to match the Smalltalk names
	('BoundMethod', 'ExecBlock').

	User Python classes (created via ClassDefAst) get a unique
	encoded name (e.g. ``Blinker_base_Signal``); their ``__name__``
	therefore reflects the encoded form, not the original Python
	identifier.  Python-side code that compares __name__ to a
	literal (rare outside introspection helpers) may need updating."

	^ self @env0:name @env0:asString
%

category: 'Grail-Callable'
classmethod: object
value: positional value: kwargs
	"Python `cls(*positional, **kwargs)` semantics on a class object,
	via the legacy callable form `func value: { args } value: kw`.

	Grail user classes (subclasses of PythonInstance) get a per-class
	`value:value:` synthesized by ClassDefAst (see
	emitInstantiationMethodFor:); this method is the fallback for
	built-in classes mapped from Python types (e.g. ``list`` →
	OrderedCollection, ``dict`` → KeyValueDictionary), which need to
	be callable through the same indirect path so that code like
	``f = obj.cls_attr; f()`` works when ``cls_attr`` resolved to a
	built-in class.

	Dispatch order:
	  1. With kwargs present: forward to ``_new:kw:`` if implemented
	     (dict, set — varargs entry point).
	  2. No kwargs, 0 positional: ``__new__``.
	  3. No kwargs, 1 positional: ``__new__:``.
	  4. No kwargs, 2..N positional: ``__new__:_:_:…`` keyword form
	     built per the standard fast-path convention.
	  5. None of the above resolve → MessageNotUnderstood (mapped to
	     Python TypeError at the env-1 DNU backstop)."

	| nargs sel |
	(kwargs == nil or: [kwargs @env0:isEmpty]) ifFalse: [
		^ self @env1:_new: positional kw: kwargs
	].
	nargs := positional @env0:size.
	nargs @env0:= 0 ifTrue: [^ self @env1:__new__].
	nargs @env0:= 1 ifTrue: [^ self @env1:__new__: (positional @env0:at: 1)].
	sel := WriteStream @env0:on: String @env0:new.
	sel @env0:nextPutAll: '__new__:'.
	2 @env0:to: nargs do: [:i | sel @env0:nextPutAll: '_:'].
	^ self @env0:perform: sel @env0:contents @env0:asSymbol env: 1 withArguments: positional
%

category: 'Grail-Convenience Methods - Unary'
method: object
___isTruthy___
	"Convert any Python object to a Smalltalk Boolean for use in if/while conditions.
	Follows Python truth value testing: https://docs.python.org/3/library/stdtypes.html#truth-value-testing"

	^ bool @env1:__new__: self
%

category: 'Grail-Convenience Methods - Boolean'
method: object
___pyOr___: alternativeBlock
	"Python ``a or b`` semantics: return `a` if it is truthy, else
	evaluate and return `b`.  Smalltalk's `or:` requires a Boolean
	receiver and returns a Boolean, neither of which matches Python's
	short-circuit value-preserving semantics."

	^ self ___isTruthy___ ifTrue: [self] ifFalse: [alternativeBlock value]
%

category: 'Grail-Convenience Methods - Boolean'
method: object
___pyAnd___: alternativeBlock
	"Python ``a and b`` semantics: return `a` if it is falsy, else
	evaluate and return `b`."

	^ self ___isTruthy___ ifTrue: [alternativeBlock value] ifFalse: [self]
%

category: 'Grail-Convenience Methods - Attribute'
method: object
___pyAttrLoad___: aSym
	"Python ``obj.attr`` load semantics, dispatching at runtime.
	The presence of an ``attr:`` keyword method is ambiguous: on a
	Python user class (PythonInstance subclass) it is a synthesized
	setter that pairs with an instVar getter; on a built-in like
	OrderedCollection or KeyValueDictionary `attr:` is just a regular
	1-arg method (e.g. ``append:``, ``add:``).  Discriminate by
	receiver kind:

	  - PythonInstance with ``attr:`` setter → call the unary getter,
	    return the value (covers instVars + @property).
	  - Otherwise, if the class chain has a unary/keyword ``attr``
	    method, return a BoundMethod that wraps (receiver, selector).
	  - Otherwise dispatch the unary message anyway and let DNU
	    produce the appropriate error or fallback."

	| md sym1 sym2 sym3 symVA s isModule isGenerated |
	md := self @env0:class @env0:methodDictForEnv: 1.
	s := aSym @env0:asString.
	sym1 := (s @env0:, ':') @env0:asSymbol.
	sym2 := (s @env0:, ':_:') @env0:asSymbol.
	sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	"Module instances (pre-installed Python modules like html/math, plus
	loaded module classes derived from `module`) always treat unary
	attribute reads as value reads (an attribute holds a function,
	submodule, constant, ...).  Bound-method wrapping doesn't apply."
	isModule := self @env0:isKindOf: module.
	isModule ifTrue: [
		"Module attribute load.  A module attribute can be either a
		stored value (a variable — has a unary accessor compiled by
		loadModuleFromPath:) or a callable method (a function — has
		selectors like ``name:`` / ``name:_:`` / ``_name:kw:``).
		Stored values get invoked through the unary accessor;
		callables get wrapped in a BoundMethod so call sites like
		``enum.global_enum(cls)`` work.  Names that are neither fall
		through to ``self at:``, which the SymbolDictionary
		inheritance provides for dynamically-added attributes."
		"A module attr that publishes a varargs ``_<name>:kw:`` selector
		is a callable forwarder (C extension function or Python module
		function); wrap it as a BoundMethod so the caller's
		``value:value:`` dispatches with the right arity.  Otherwise
		the attribute is a stored value (synthesized ``X ^ X`` accessor
		for module variables) — invoke the unary to fetch the value."
		((self @env0:class @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSym
		].
		((self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil) ifTrue: [
			^ self @env0:perform: aSym env: 1
		].
		(((self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil)
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil]]) ifTrue: [
			^ BoundMethod @env1:receiver: self selector: aSym
		].
		^ self @env0:at: aSym ifAbsent: [
			AttributeError ___signal___: 'module has no attribute ''' @env0:, s @env0:, ''''
		]
	].
	"Class receivers — `Cls.X` where Cls is a Python user class —
	consult the class's own class-side accessors (which are the
	metaclass's instance methods).  A paired ``X``/``X:`` accessor +
	setter is a class-level attribute (e.g. ``class Color: RED = 1``);
	invoke the unary form to return the value.  Without this branch
	the fallback would wrap the accessor in a BoundMethod and Python
	expressions like ``Color.RED`` would yield a callable rather
	than the int 1.

	Walk the metaclass chain via ``whichClassIncludesSelector:`` so
	a subclass that *inherits* a class-attr accessor pair (no own
	redeclaration in ClassDefAst) still resolves through this branch
	— per-class slot storage means ``B.X`` calls the inherited
	accessor on B and reads B's own slot."
	(self @env0:isKindOf: Behavior) ifTrue: [
		"Class-level dunders that should always read as values, never
		wrap as BoundMethods.  Without this, ``type(node).__name__``
		on any class would wrap the inherited Behavior-side getter
		and break visitor dispatch
		(``getattr(self, 'visit_' + type(node).__name__)``)."
		((s @env0:= '__name__' or: [s @env0:= '__module__' or: [s @env0:= '__qualname__']])
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil])
				ifTrue: [^ self @env0:perform: aSym env: 1].
		"Setter-paired class-level accessor on a Python user class —
		value attribute (``class C: X = 1``)."
		((self @env0:inheritsFrom: PythonInstance)
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
				and: [(self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil]])
			ifTrue: [
				^ self @env0:perform: aSym env: 1
		].
	].
	"Python user classes (PythonInstance subclasses) have synthesized
	``attr:`` setters that pair with attribute getters.  If the class
	has both, this is an attribute access — call the unary getter and
	return the value.

	Disambiguate from a regular 1-arg method named ``attr:`` by also
	checking whether ``aSym`` (unary) is in the receiver's class
	chain.  If yes, the pair is a value-accessor (synthesized getter
	+ setter).  If no, ``attr:`` is just a method that happens to take
	one arg — fall through to the ``BoundMethod`` wrap below."
	isGenerated := self @env0:isKindOf: PythonInstance.
	(isGenerated
		and: [(md @env0:includesKey: sym1)
			and: [(self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil]])
		ifTrue: [
			| instVal metaclass |
			instVal := self @env0:perform: aSym env: 1.
			"If the per-instance slot is still nil, fall back to the
			class-side accessor for the class-level default — matches
			Python's instance.__dict__-then-class lookup for any name
			declared as a class attribute (``X: type = expr`` body) AND
			discovered as an instance attribute through ``self.X = …``
			writes.  Without the fallback the instance-slot nil masks
			the class-level default."
			instVal == nil ifTrue: [
				metaclass := self @env0:class @env0:class.
				((metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
					and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil])
					ifTrue: [^ self @env0:class @env0:perform: aSym env: 1].
			].
			^ instVal
	].
	"Instance falling through to a class-side attribute.  When the
	receiver is an instance of a Python user class and the attribute
	isn't on the instance side, consult the class-side accessor pair
	*walking the metaclass chain*.  Class-side instVars are
	per-class storage in Smalltalk; ClassDefAst copies inherited
	parent values into the subclass's own slot at class-build time,
	so calling the accessor on ``self class`` (the immediate class,
	not the metaclass that defined the accessor) returns the
	subclass's per-class value — matching Python's per-class
	override semantics (B.x can differ from A.x).

	BUT: Python's lookup order is ``instance.__dict__`` first, then
	class.  ``class _Rule(NamedTuple): pattern: t.Pattern`` declares
	``pattern`` as a class-side slot (bare annotation, init=nil) AND
	NamedTuple.__init__ writes ``self.pattern`` through the instance
	__dict__.  Without consulting __dict__ here, ``r.pattern``
	would always return the class-side nil and mask the per-instance
	value.  Check __dict__ explicitly before the class-side dispatch."
	(self @env0:isKindOf: PythonInstance) ifTrue: [
		| metaclass dict |
		dict := self @env0:___ensureDict___.
		(dict @env0:includesKey: aSym @env0:asSymbol)
			ifTrue: [^ dict @env0:at: aSym @env0:asSymbol].
		metaclass := self @env0:class @env0:class.
		((metaclass @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
			and: [(metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil]) ifTrue: [
			^ self @env0:class @env0:perform: aSym env: 1
		].
		"@classmethod / @staticmethod live on the metaclass with
		``name:`` or ``_name:kw:`` selectors but NO paired unary
		setter (so the value-attr branch above doesn't catch them).
		Wrap as a BoundMethod whose receiver is the class object so
		``self.cls_method(args)`` dispatches correctly."
		((metaclass @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			or: [(metaclass @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
				or: [(metaclass @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
					or: [(metaclass @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]])
			ifTrue: [^ BoundMethod @env1:receiver: self @env0:class selector: aSym].
	].
	"Shim wrapper classes (SrePattern, SreMatch, ...) advertise the
	subset of their unary methods that should be treated as Python
	*value* attributes (struct-member reads, computed properties)
	rather than callable methods.  Without this, `pattern.groups`
	would always wrap the getter in a BoundMethod instead of
	returning the int — breaking `if index > pattern.groups:` in
	re._parser.parse_template.  The class-side hook returns a
	Smalltalk Set of selector symbols; absent or empty hooks behave
	as today."
	((self @env0:class @env0:respondsTo: #'___pythonValueAttrs___')
		and: [(self @env0:class @env0:___pythonValueAttrs___) @env0:includes: aSym])
		ifTrue: [^ self @env0:perform: aSym env: 1].
	"Other classes (built-in collections, strings, ...): if any class
	in the receiver's class chain implements a same-named callable
	selector, return a BoundMethod handle for `f = obj.method`
	patterns.  Inherited methods (e.g. ``values`` on KeyValueDictionary
	from an IdentityKeyValueDictionary instance) must be picked up
	here — otherwise the bare ``perform:`` fallback below runs the
	method instead of wrapping it, and downstream ``value:value:``
	tries to invoke the *result* rather than the method."
	((self @env0:class @env0:whichClassIncludesSelector: aSym environmentId: 1) notNil
		or: [(self @env0:class @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil
			or: [(self @env0:class @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
				or: [(self @env0:class @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil
					or: [(self @env0:class @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil]]]])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSym].
	"No callable selector matched anywhere in the receiver's class
	chain.  Raise AttributeError instead of falling through to a
	bare ``perform:`` (which would DNU as MessageNotUnderstood and
	bypass Python's standard attribute-miss protocol — breaking
	``getattr(obj, name, default)`` and ``hasattr(obj, name)``)."
	^ AttributeError @env1:___signal___:
		(self @env0:class @env0:name @env0:asString @env0:,
			' object has no attribute ''' @env0:, s @env0:, '''')
%

category: 'Grail-Convenience Methods - Keyword'
method: object
___new___: size
	"Convenience method: self perform: #new: env: 0 withArguments: {size}"
	^ self @env0:new: size
%

category: 'Grail-Convenience Methods - Keyword'
method: object
___signal___: message
	^ self @env0:signal: message
%

category: 'Grail-Attribute Access'
method: object
__class__
	"Return the class of this object (Python type)"

	^ self @env0:class
%

category: 'Grail-Attribute Access'
method: object
__delattr__: name
	"Delete a named attribute. Called by del obj.name
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute deletion"
	AttributeError @env0:signal: 'readonly attribute'
%

category: 'Grail-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object.
	Returns an Array of Strings containing all method names for environment 1 (Python).
	Excludes convenience methods (those starting with ___) that are internal implementation helpers."

	| selectors result myClass |
	myClass := self @env0:class.
	selectors := myClass @env0:allSelectorsForEnvironment: 1.
	"Filter out convenience methods (starting with ___)"
	selectors := selectors @env0:reject: [:selector |
		| selectorStr prefix |
		selectorStr := selector @env0:asString.
		((selectorStr @env0:size) @env0:>= 3) ifTrue: [
			prefix := selectorStr @env0:copyFrom: 1 to: 3.
			prefix @env0:= '___'
		] ifFalse: [false]
	].
	result := selectors @env0:collect: [:selector |
		| index |
		"Convert selector to string, removing trailing colon(s) for keyword methods"
		index := selector @env0:indexOf: $:.
		index == 0
			ifTrue: [selector @env0:asString]
			ifFalse: [selector @env0:copyFrom: 1 to: (index @env0:- 1)]
	].
	^ (result @env0:asSortedCollection) @env0:asArray
%

category: 'Grail-Other'
method: object
__doc__
	"Return the docstring for this object"

	^ 'The base class of the class hierarchy.

When called, it accepts no arguments and returns a new featureless
instance that has no instance attributes and cannot be given any.
'
%

category: 'Grail-Comparison'
method: object
__eq__: other
	"Return self == other"

	^ self @env0:= other
%

category: 'Grail-String Representation'
method: object
__format__: formatSpec
	"Return a formatted string representation"

	self @env0:error: 'Not yet implemented: __format__'
%

category: 'Grail-Comparison'
method: object
__ge__: other
	"Return self >= other"

	self @env0:error: 'Not yet implemented: __ge__'
%

category: 'Grail-Attribute Access'
method: object
__getattribute__: name
	"Get a named attribute. Called for obj.name"

	self @env0:error: 'Not yet implemented: __getattribute__'
%

category: 'Grail-Serialization'
method: object
__getstate__
	"Return state for pickling"

	self @env0:error: 'Not yet implemented: __getstate__'
%

category: 'Grail-Comparison'
method: object
__gt__: other
	"Return self > other"

	self @env0:error: 'Not yet implemented: __gt__'
%

category: 'Grail-Hashing & Identity'
method: object
__hash__
	"Return hash value for this object"

	^ self @env0:hash
%

category: 'Grail-Initialization'
method: object
__init__
	"Initialize a new instance (called after __new__).
	This is an instance method that receives self (the instance).
	In Python: instance.__init__(*args, **kwargs) initializes the instance.
	Default implementation does nothing and returns None."

	^ None
%

category: 'Grail-Comparison'
method: object
__le__: other
	"Return self <= other"

	self @env0:error: 'Not yet implemented: __le__'
%

category: 'Grail-Comparison'
method: object
__lt__: other
	"Return self < other"

	self @env0:error: 'Not yet implemented: __lt__'
%

category: 'Grail-Comparison'
method: object
__ne__: other
	"Return self != other"

	^ (self @env0:= other) @env0:not
%

category: 'Grail-Serialization'
method: object
__reduce__
	"Return state for pickling (protocol 2)"

	self @env0:error: 'Not yet implemented: __reduce__'
%

category: 'Grail-Serialization'
method: object
__reduce_ex__: protocol
	"Return state for pickling with protocol version"

	self @env0:error: 'Not yet implemented: __reduce_ex__'
%

category: 'Grail-String Representation'
method: object
__repr__
	"Return a string representation for debugging"

	| myClass className stream |
	myClass := self @env0:class.
	className := myClass @env0:name.
	stream := WriteStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPut: $<.
	stream @env0:nextPutAll: className.
	stream @env0:nextPutAll: ' object>'.
	^ stream @env0:contents
%

category: 'Grail-Attribute Access'
method: object
__setattr__: name _: value
	"Set a named attribute. Called by obj.name = value
	For base object, attributes are read-only."

	"Python's object doesn't allow attribute setting"
	AttributeError @env0:signal: 'readonly attribute'
%

category: 'Grail-Other'
method: object
__sizeof__
	"Return the size of the object in memory, in bytes.
	Uses GemStone's physicalSize which returns bytes required to represent the object."

	^ self @env0:physicalSize
%

category: 'Grail-String Representation'
method: object
__str__
	"Return a string representation for display"

	^ (self @env0:printString) @env0:asUnicodeString
%

category: 'Grail-Other'
method: object
__subclasshook__: subclass
	"Customize issubclass() for abstract base classes.
	Default implementation should return NotImplemented singleton.
	TODO: Implement once NotImplementedType is created in smalltalk/classes/"

	self @env0:error: 'Not yet implemented: __subclasshook__ (needs NotImplemented singleton)'
%

category: 'Grail-Message Handling'
method: object
perform: aSelectorSymbol env: environmentId

"Sends the receiver the unary message indicated by the argument.
 The argument is the selector of the message.  Generates an error if
 the selector is not unary.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment.
"

<primitive: 2014>
^self @env0:_perform: (aSelectorSymbol @env0:asSymbol) env: environmentId withArguments: #()
%

category: 'Grail-Message Handling'
method: object
perform: aSelectorSymbol env: environmentId withArguments: anArray

"Sends the receiver the message indicated by the arguments.
 The argument, aSelectorSymbol, is the keyword selector of the message.
 The arguments of the message are the elements of anArray.  Generates an
 error if the number of arguments expected by aSelectorSymbol is not
 the same as the number of elements in anArray.

 anArray must be an instance of Array.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment."

<primitive: 2015>
anArray @env0:_validateClass: Array.

"Now just try the primitive again, but send asSymbol to the selector to convert
 it to a Symbol."
^ self @env0:_perform: (aSelectorSymbol @env0:asSymbol) env: environmentId withArguments: anArray
%

category: 'Grail-Message Handling'
method: object
with: anObject perform: aSelectorSymbol env: environmentId

"Sends the receiver the message indicated by the arguments.  The
 first argument is the keyword or binary selector of the message.  The
 second argument is the argument of the message to be sent.  Generates
 an error if the number of arguments expected by the selector is not 1.

 environmentId must be a SmallInteger >= 0 and <= 255,
 specifying a method lookup environment."

<primitive: 2014>
| sel |
sel := aSelectorSymbol @env0:asSymbol.
^self @env0:_perform: sel env: environmentId withArguments: { anObject }
%

set compile_env: 0

category: 'Grail-Attribute Access'
method: object
doesNotUnderstand: aSelector args: anArray envId: envId
	"Bound-method-via-attribute-load fallback.

	In Python, ``obj.method`` (without calling) yields a bound method
	that can be stored, passed around, or later invoked.  Our codegen
	emits attribute reads as ``obj attr`` (a unary message send), so if
	``attr`` names a method that takes arguments (e.g. OrderedCollection
	>> append:), the bare unary form has no matching selector.  Rather
	than emit an explicit BoundMethod wrapper at every attribute load
	(most of which DO refer to instVar/property values), intercept at
	DNU time and synthesize the BoundMethod only when the unary send
	fails AND the class has a same-named callable selector (``attr:``,
	``attr:_:`` etc., or the varargs form ``_attr:kw:``).
	All other unknown sends fall through to super."

	| s md cls |
	envId @env0:= 1 ifFalse: [^ MessageNotUnderstood @env0:signal:
	'env-1 ', aSelector @env0:printString, ' not understood by ', self @env0:class @env0:name @env0:asString].
	s := aSelector @env0:asString.
	cls := self @env0:class.
	md := cls @env0:methodDictForEnv: 1.
	(s @env0:size @env0:> 0 @env0:and: [s @env0:last @env0:= $:]) ifTrue: [
		"Keyword selector like `name:_:_:` — the corresponding Python
		function may have been compiled as varargs (`_name:kw:`) because
		it has *args/**kwargs or defaults.  Extract the base name from
		the selector (everything up to the first colon), look for the
		varargs form on this class, and dispatch with positional={anArray}
		and kwargs=nil."
		| colonIdx baseName varargsSel |
		colonIdx := s @env0:indexOf: $:.
		baseName := s @env0:copyFrom: 1 to: colonIdx @env0:- 1.
		varargsSel := ('_' @env0:, baseName @env0:, ':kw:') @env0:asSymbol.
		(md @env0:includesKey: varargsSel) ifTrue: [
			| wrapped |
			wrapped := Array @env0:new: 2.
			wrapped @env0:at: 1 put: anArray.
			wrapped @env0:at: 2 put: nil.
			^ self @env0:perform: varargsSel env: 1 withArguments: wrapped
		].
		^ MessageNotUnderstood @env0:signal:
			'env-1 ', aSelector @env0:printString, ' not understood by ', cls @env0:name @env0:asString
	].
	"Unary selector with 0 args — return BoundMethod if class has any
	same-named callable form (for `f = obj.method` patterns)."
	anArray @env0:size @env0:= 0 ifFalse: [^ MessageNotUnderstood @env0:signal:
		'env-1 ', aSelector @env0:printString, ' not understood by ', cls @env0:name @env0:asString].
	((md @env0:includesKey: (s @env0:, ':') @env0:asSymbol)
		@env0:or: [(md @env0:includesKey: (s @env0:, ':_:') @env0:asSymbol)
			@env0:or: [(md @env0:includesKey: (s @env0:, ':_:_:') @env0:asSymbol)
				@env0:or: [md @env0:includesKey: ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol]]])
		ifTrue: [^ BoundMethod @env1:receiver: self selector: aSelector].
	^ MessageNotUnderstood @env0:signal:
		'env-1 ', aSelector @env0:printString, ' not understood by ', cls @env0:name @env0:asString
%

set compile_env: 0
