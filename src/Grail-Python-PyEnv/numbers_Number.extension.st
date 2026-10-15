Extension { #name : 'numbers_Number' }

{ #category : 'Grail-ABC' }
numbers_Number class >> ___grailAbcMetaclassInChain___ [
	"The numbers ABCs are ABCMeta classes in CPython, so instantiating one,
	or a subclass, is checked for abstract methods.  Here they are Smalltalk
	classes with no Python metaclass, which the ABCMeta probe this overrides
	cannot see -- so numbers.Complex() built an object."

	^ true

]

{ #category : 'Grail-ABC' }
numbers_Number class >> ___grailAbstractInstantiationError___ [
	"The common case first: a concrete subclass -- fractions.Fraction, built
	on every arithmetic result -- has an empty set, read from the holder
	without formatting anything."

	(self __abstractmethods__ @env0:size) @env0:= 0 ifTrue: [^ nil].
	^ super ___grailAbstractInstantiationError___

]

{ #category : 'Grail-ABC' }
numbers_Number class >> ___numbersAbcAbstractNames___ [
	"CPython's ``__abstractmethods__'' for the numbers ABC that IS the
	receiver -- copied from CPython 3.14's numbers.py, where Real supplies
	real / imag / conjugate / __complex__ concretely, Rational __float__,
	and Integral __float__ / numerator / denominator -- or nil for any other
	class, a Python subclass included."

	self @env0:== numbers_Number ifTrue: [^ #()].
	self @env0:== numbers_Complex ifTrue: [^ #(
		#'__abs__' #'__add__' #'__complex__' #'__eq__' #'__mul__' #'__neg__'
		#'__pos__' #'__pow__' #'__radd__' #'__rmul__' #'__rpow__'
		#'__rtruediv__' #'__truediv__' #'conjugate' #'imag' #'real' )].
	self @env0:== numbers_Real ifTrue: [^ #(
		#'__abs__' #'__add__' #'__ceil__' #'__eq__' #'__float__' #'__floor__'
		#'__floordiv__' #'__le__' #'__lt__' #'__mod__' #'__mul__' #'__neg__'
		#'__pos__' #'__pow__' #'__radd__' #'__rfloordiv__' #'__rmod__'
		#'__rmul__' #'__round__' #'__rpow__' #'__rtruediv__' #'__truediv__'
		#'__trunc__' )].
	self @env0:== numbers_Rational ifTrue: [^ #(
		#'__abs__' #'__add__' #'__ceil__' #'__eq__' #'__floor__'
		#'__floordiv__' #'__le__' #'__lt__' #'__mod__' #'__mul__' #'__neg__'
		#'__pos__' #'__pow__' #'__radd__' #'__rfloordiv__' #'__rmod__'
		#'__rmul__' #'__round__' #'__rpow__' #'__rtruediv__' #'__truediv__'
		#'__trunc__' #'denominator' #'numerator' )].
	self @env0:== numbers_Integral ifTrue: [^ #(
		#'__abs__' #'__add__' #'__and__' #'__ceil__' #'__eq__' #'__floor__'
		#'__floordiv__' #'__int__' #'__invert__' #'__le__' #'__lshift__'
		#'__lt__' #'__mod__' #'__mul__' #'__neg__' #'__or__' #'__pos__'
		#'__pow__' #'__radd__' #'__rand__' #'__rfloordiv__' #'__rlshift__'
		#'__rmod__' #'__rmul__' #'__ror__' #'__round__' #'__rpow__'
		#'__rrshift__' #'__rshift__' #'__rtruediv__' #'__rxor__'
		#'__truediv__' #'__trunc__' #'__xor__' )].
	^ nil

]

{ #category : 'Grail-ABC' }
numbers_Number class >> ___numbersClass: aClass defines: aSym [
	"Does aClass ITSELF give the Python name aSym an implementation: a method
	compiled at any arity (unary, ``name:'', ``name:_:'', ..., the varargs
	``_name:kw:''), or a class attribute in its own holder?  A secondary
	base's methods count: Grail copies them onto the class."

	| s sel |
	s := aSym @env0:asString.
	(aClass @env0:includesSelector: s @env0:asSymbol environmentId: 1) ifTrue: [^ true].
	(aClass @env0:includesSelector: ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol environmentId: 1)
		ifTrue: [^ true].
	sel := s @env0:, ':'.
	1 @env0:to: 6 do: [:n |
		(aClass @env0:includesSelector: sel @env0:asSymbol environmentId: 1) ifTrue: [^ true].
		sel := sel @env0:, '_:'].
	^ (aClass ___classBodyDynamicRead___: s @env0:asSymbol) @env0:notNil

]

{ #category : 'Grail-ABC' }
numbers_Number class >> ___numbersComputeAbstract___ [
	"The abstract methods a Python subclass of a numbers ABC leaves
	unimplemented: its nearest numbers ABC's set, less every name a class
	between the two implements.  ABCMeta.__new__'s computation, which is
	what decides that ``class C(numbers.Integral): pass'' cannot be
	instantiated."

	| abc own names |
	abc := self.
	[(own := abc ___numbersAbcAbstractNames___) @env0:isNil]
		whileTrue: [abc := abc @env0:superclass].
	names := own @env0:reject: [:n |
		| c found |
		c := self.
		found := false.
		[found @env0:not @env0:and: [c @env0:~~ abc]] whileTrue: [
			found := self ___numbersClass: c defines: n.
			c := c @env0:superclass].
		found].
	^ frozenset @env0:withAll: (names @env0:collect: [:n | n @env0:asString])

]

{ #category : 'Grail-ABC' }
numbers_Number class >> ___pyClassDefined___: attrNames [
	"After the default hook, record the subclass's abstract methods, once,
	at the moment CPython's ABCMeta.__new__ computes them: a method
	assigned to the class later does not change the answer in either."

	| result |
	result := super ___pyClassDefined___: attrNames.
	self ___classHolderAttrStore___: #'__abstractmethods__'
		put: self ___numbersComputeAbstract___.
	^ result

]

{ #category : 'Grail-Class Attrs' }
numbers_Number class >> __abstractmethods__ [
	"Read by object class >> ___grailAbstractInstantiationError___ on every
	instantiation, so numbers.Complex() and a subclass that leaves an
	abstract method unimplemented are refused with CPython's TypeError
	(#1592).  The ABCs answer CPython's sets; a Python subclass answers the
	set computed when it was defined (___pyClassDefined___:), as CPython's
	ABCMeta does -- or computes it, for a class defined before this
	existed.

	The definition-time set is stored as the class's own
	``__abstractmethods__'', where CPython keeps it too, so an explicit
	``C.__abstractmethods__ = ...'' -- abc.update_abstractmethods does it --
	replaces it.  The session overlay is read first: a store on a canonical
	class lands there."

	| own stored |
	own := self ___numbersAbcAbstractNames___.
	own @env0:notNil ifTrue: [
		^ frozenset @env0:withAll: (own @env0:collect: [:n | n @env0:asString])].
	stored := self ___classAttrOverlayLookup___: self name: #'__abstractmethods__'.
	stored @env0:notNil ifTrue: [^ stored].
	stored := self ___classBodyDynamicRead___: #'__abstractmethods__'.
	stored @env0:notNil ifTrue: [^ stored].
	^ self ___numbersComputeAbstract___

]

{ #category : 'Grail-ABC' }
numbers_Number class >> __instancecheck__: instance [
	"Check if instance is an instance of this ABC.
	Returns true if instance's class is a subclass of this ABC,
	or if instance's class has been registered with this ABC or any of its sub-ABCs."

	| instanceClass |
	instanceClass := instance @env0:class.

	"Check normal inheritance - use env 0 for isSubclassOf:"
	(instanceClass @env0:isSubclassOf: self) ifTrue: [^ true].

	"Check registered types in this ABC and all subclass ABCs"
	(self isClassRegistered: instanceClass) ifTrue: [^ true].

	^ false

]

{ #category : 'Grail-ABC' }
numbers_Number class >> __subclasscheck__: aClass [
	"Check if aClass is a subclass of this ABC.
	Returns true if aClass inherits from this ABC,
	or if aClass has been registered with this ABC or any of its sub-ABCs."

	"Check normal inheritance - use env 0 for isSubclassOf:"
	(aClass @env0:isSubclassOf: self) ifTrue: [^ true].

	"Check if aClass is registered with this ABC or any subclass ABC"
	(self isClassRegistered: aClass) ifTrue: [^ true].

	^ false

]

{ #category : 'Grail-ABC' }
numbers_Number class >> isClassRegistered: aClass [
	"Check if aClass or any of its superclasses is registered with this ABC or any ABC subclass of this ABC."

	| currentClass abcSubclasses |

	"Check if any superclass of aClass is registered directly with us"
	currentClass := aClass.
	[currentClass notNil] whileTrue: [
		(self registeredTypes @env0:includes: currentClass) ifTrue: [^ true].
		currentClass := currentClass @env0:superclass.
	].

	"Check if aClass is registered with any of our ABC subclasses"
	abcSubclasses := self @env0:subclasses.
	abcSubclasses @env0:do: [:subABC |
		(subABC isClassRegistered: aClass) ifTrue: [^ true].
	].

	^ false

]

{ #category : 'Grail-ABC' }
numbers_Number class >> register: aClass [
	"Register a class as a virtual subclass of this ABC.
	After registration, isinstance(instance, ABC) returns True."

	self registeredTypes @env0:add: aClass

]

{ #category : 'Grail-ABC' }
numbers_Number class >> registeredTypes [
	"The set of registered types for this ABC.  SESSION-LOCAL
	(SessionTemps, keyed per ABC class): registrations run from the
	numbers module's initialize (session time) and from user code
	(ABC.register(cls)); the old classInstVar write dirtied the
	committed ABC classes (multi-user commit conflicts).  The
	classInstVar declaration remains but is unused."

	| all mine |
	all := SessionTemps @env0:current @env0:at: #GrailNumbersRegistry otherwise: nil.
	all == nil ifTrue: [
		all := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #GrailNumbersRegistry put: all].
	mine := all @env0:at: self otherwise: nil.
	mine == nil ifTrue: [
		mine := IdentitySet ___new___.
		all @env0:at: self put: mine].
	^ mine

]
