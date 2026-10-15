Extension { #name : 'AbstractPyStr' }

{ #category : 'Grail-Instantiation' }
AbstractPyStr class >> __new__ [
	"str() with no argument -> an empty boxed string."

	| inst |
	inst := self @env0:basicNew.
	inst @env0:dynamicInstVarAt: #value put: Unicode7 @env0:new.
	^ inst

]

{ #category : 'Grail-Instantiation' }
AbstractPyStr class >> __new__: source [
	"``class MyStr(str): pass`` then ``MyStr(x)`` -> a boxed string whose
	#value is ``str(x)'' (an already-string source is stored directly;
	anything else is stringified via __str__)."

	| inst |
	inst := self @env0:basicNew.
	inst @env0:dynamicInstVarAt: #value put: (source __str__).
	^ inst

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> ___isTruthy___ [
	"Non-empty string is truthy; empty is falsy (Python)."

	^ self @env0:___strValue___ @env0:isEmpty @env0:not

]

{ #category : 'Grail-Introspection' }
AbstractPyStr >> ___pyHiddenStateNames___ [
	"The dynamic instVars that are Grail's IMPLEMENTATION rather than Python
	attributes: a subclass instance of this root keeps its builtin value under
	#value.  The __dict__ view and __getstate__ leave them out -- otherwise
	``vars(MyInt(7))'' answered {'value': 7} and a pickle of it carried that as
	instance state, which CPython would read back as a real attribute."

	^ #( #value )

]

{ #category : 'Grail-Introspection' }
AbstractPyStr >> __dict__ [
	"``obj.__dict__'' for a SUBCLASS instance (every instance of this root is
	one: an exact builtin value is a kernel object) -- the live dynamic-instVar
	view list and bytes publish, minus ___pyHiddenStateNames___.  test_pickle's
	newobj tests read it to compare a round-tripped object's attributes."

	^ self ___grailInstanceDictView___

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __eq__: other [
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __eq__: ov

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __format__: aSpec [
	^ self @env0:___strValue___ __format__: aSpec

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __ge__: other [
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __ge__: ov

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __getattr__: name [
	"Attribute access that misses the boxed class chain (a string METHOD:
	member.upper, member.startswith, ...) forwards to the wrapped value,
	yielding the str method bound to it.  ``member.upper()'' then calls
	it and returns a plain str -- the DNU forwarder only catches direct
	sends, but ``obj.method()'' compiles as attribute-load-then-call."

	^ self @env0:___strValue___ ___pyAttrLoad___: name @env0:asSymbol

]

{ #category : 'Grail-Pickle' }
AbstractPyStr >> __getnewargs__ [
	"CPython's str.__getnewargs__: the argument tuple that rebuilds this
	value through __new__.

	The wrapped string as a plain str, matching CPython's
	str.__getnewargs__().

	It exists for PICKLING an immutable builtin's subclass.  Such a subclass
	carries its value in the CONSTRUCTOR, not in instance state, so
	object.__reduce_ex__'s new-style reduction has to hand the value back as a
	__new__ argument -- ``str.__new__(MySub)'' alone rebuilds an empty one and
	the value is gone.  Grail's pickle used to reduce any str subclass to a
	plain str, losing the class outright."

	| tupleClass |
	tupleClass := Python @env0:at: #tuple otherwise: Array.
	^ tupleClass @env0:withAll: { self ___strValue___ }

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __gt__: other [
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __gt__: ov

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __hash__ [
	"Hash by value so a wrapper and its plain string collide -- a member
	used as a dict key matches its string value (CPython)."

	^ self @env0:___strValue___ __hash__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __le__: other [
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __le__: ov

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __lt__: other [
	| ov |
	ov := (other isKindOf: AbstractPyStr) ifTrue: [other @env0:___strValue___] ifFalse: [other].
	^ self @env0:___strValue___ __lt__: ov

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __ne__: other [
	| r |
	r := self __eq__: other.
	r == true ifTrue: [^ false].
	r == false ifTrue: [^ true].
	^ r

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __repr__ [
	"Default repr is the string's repr (``'hello'``).  Enum subclasses
	override with the ``<Cls.NAME: 'value'>`` form."

	^ self @env0:___strValue___ __repr__

]

{ #category : 'Grail-Python Protocol' }
AbstractPyStr >> __str__ [
	"str(x) is the wrapped string.  For a StrEnum member this is exactly
	the ReprEnum contract (str == value); subclasses that need a
	different repr override __repr__, not this."

	^ self @env0:___strValue___

]
