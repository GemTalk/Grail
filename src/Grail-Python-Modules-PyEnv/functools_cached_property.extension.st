Extension { #name : 'functools_cached_property' }

{ #category : 'Grail-Private' }
functools_cached_property class >> ___metaOf___: fn named: aSym [
	"One of the identifying attributes CPython's __init__ copies off the
	wrapped function (``self.__doc__ = func.__doc__'').  Guarded, because
	not every callable answers them."

	^ [fn @env1:___pyAttrLoad___: aSym]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: None]

]

{ #category : 'Grail-Instantiation' }
functools_cached_property class >> ___pyCallValue___: positional kw: kwargs [
	"The INDIRECT call protocol, which is how a class-body DECORATOR reaches
	the class: ``@functools.cached_property'' emits
	``cached_property ___pyCallValue___: { <the def> } kw: nil''.  Without
	this it reached object's ``not callable'' raiser -- and since a class-body
	decorator's rebinding store is wrapped in an error-swallowing guard, the
	decoration silently did not happen and every read re-invoked the method.

	Opt-in per class rather than answered for all of them on ``object'',
	because making every class callable through this path also makes
	``@enum.property'' / ``@member'' apply for the first time, and Grail's
	enum member builder counts the resulting descriptor as a MEMBER."

	^ self value: (positional == nil ifTrue: [#()] ifFalse: [positional])
		value: kwargs

]

{ #category : 'Grail-Reflection' }
functools_cached_property class >> __module__ [
	^ 'functools'

]

{ #category : 'Grail-Reflection' }
functools_cached_property class >> __qualname__ [
	^ 'cached_property'

]

{ #category : 'Grail-Instantiation' }
functools_cached_property class >> value: positional value: keywords [
	"cached_property(fn) -- the class-call entry.  Route through the
	__new__ protocol so subclass instantiation (ClassDefAst emits
	value:value: -> ___allocateInstance___) and a direct call share one
	constructor."

	^ self ___allocateInstance___: positional kw: keywords

]

{ #category : 'Grail-Instantiation' }
functools_cached_property >> ___new__: positional kw: keywords [
	"Constructor body.  self is the CLASS -- ___allocateInstance___ runs a
	__new__ non-virtually with the class as receiver, which is what makes
	``class Sub(cached_property): pass'' construct Sub instances."

	| inst fn |
	(positional == nil or: [positional @env0:isEmpty]) ifTrue: [
		TypeError ___signal___:
			'cached_property expected 1 argument, got 0'].
	positional @env0:size @env0:> 1 ifTrue: [
		TypeError ___signal___: ('cached_property expected 1 argument, got '
			@env0:, positional @env0:size @env0:printString)].
	(keywords == nil or: [keywords @env0:isEmpty]) ifFalse: [
		TypeError ___signal___:
			'cached_property() takes no keyword arguments'].
	fn := positional @env0:at: 1.
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #func put: fn.
	"attrname is None -- not Smalltalk nil -- until __set_name__ fills it
	in: the dynamic-instVar probe at the top of ___pyAttrLoad___ reads nil
	as ABSENT, so a nil slot would send ``cp.attrname'' on to the
	method-wrap fallback instead of answering CPython's None."
	inst @env0:dynamicInstVarAt: #attrname put: None.
	inst @env0:dynamicInstVarAt: #'__doc__' put: (self ___metaOf___: fn named: #'__doc__').
	"``self.__module__ = func.__module__'': the descriptor reports the module
	that DEFINED the wrapped function, not functools.  Without it a read
	falls back to the type's own __module__ and ``Cls.attr.__module__''
	answers 'functools' -- CPython copies it for exactly this reason."
	inst @env0:dynamicInstVarAt: #'__module__' put: (self ___metaOf___: fn named: #'__module__').
	^ inst

]

{ #category : 'Grail-Descriptor' }
functools_cached_property >> ___pyOwnerNameFor___: instance [
	"The name CPython puts in the caching errors: the TYPE of the object being
	cached on.  For an ordinary object that is its class; for a CLASS -- a
	metaclass-level cached_property read as ``C.prop'' -- it is the recorded
	``metaclass='', because that is what type(C) means in Python.  The Smalltalk
	class of a class is its metaclass, whose name is ``C class'', which is not a
	name CPython would ever print."

	| meta |
	(instance isKindOf: Behavior) ifTrue: [
		meta := instance ___grailMetaclass___.
		(meta @env0:notNil and: [meta isKindOf: Behavior])
			ifTrue: [^ meta @env0:name @env0:asString]].
	^ instance @env0:class @env0:name @env0:asString

]

{ #category : 'Grail-Descriptor' }
functools_cached_property >> __get__: instance [
	"``cp.__get__(obj)'' -- CPython's owner argument defaults to None."

	^ self __get__: instance _: None

]

{ #category : 'Grail-Descriptor' }
functools_cached_property >> __get__: instance _: owner [
	"The descriptor read.  Reached from object >> ___descriptorGet___: on an
	INSTANCE read; a read off the class answers the descriptor itself (both
	because CPython's __get__ does that for a None instance, and because
	Grail's class-attribute paths hand back the stored value raw)."

	| name sym cached value |
	(instance == nil or: [instance == None]) ifTrue: [^ self].
	name := self @env0:dynamicInstVarAt: #attrname.
	(name == nil or: [name == None]) ifTrue: [
		TypeError ___signal___:
			'Cannot use cached_property instance without calling __set_name__ on it.'].
	"A class with no instance __dict__ has nowhere to cache.  The test is
	STRICT slots, not merely ``declares __slots__'': declaring them removes
	the __dict__ only when the whole mro does, so a slotted class under a
	plain base -- and a subclass that declares none of its own -- still has
	one and must still cache.  ___pySlotsStrict___ is exactly Grail's
	answer to CPython's ``getattr(instance, '__dict__', None) is None''
	here; ___pyHasSlots___, which this used to ask, is the wider set."
	(instance ___respondsTo___: #'___pySlotsStrict___') ifTrue: [
		instance ___pySlotsStrict___ ifTrue: [
			TypeError ___signal___: ('No ''__dict__'' attribute on '''
				@env0:, instance @env0:class @env0:name @env0:asString
				@env0:, ''' instance to cache ''' @env0:, name @env0:asString
				@env0:, ''' property.')]].
	sym := name @env0:asString @env0:asSymbol.
	"Consult the cache here too, not only through ___pyAttrLoad___'s slot
	probe: an EXPLICIT ``cp.__get__(obj)'' must answer the cached value, and
	so must a subclass that defines __set__ (which makes it a data
	descriptor, so the slot probe no longer wins)."
	cached := instance @env0:dynamicInstVarAt: sym.
	cached == nil ifFalse: [^ cached].
	value := (self @env0:dynamicInstVarAt: #func)
		___pyCallValue___: { instance } kw: nil.
	[instance @env0:dynamicInstVarAt: sym put: value]
		@env0:on: AbstractException
		do: [:ex |
			ex @env0:return: (TypeError ___signal___:
				('The ''__dict__'' attribute on '''
					@env0:, (self ___pyOwnerNameFor___: instance)
					@env0:, ''' instance does not support item assignment for caching '''
					@env0:, name @env0:asString @env0:, ''' property.'))].
	^ value

]

{ #category : 'Grail-Descriptor' }
functools_cached_property >> __set_name__: owner _: name [
	"``__set_name__(owner, name)'', sent by Object >> ___pyClassDefined___:
	for every class-body entry as the class is defined.

	The name is the slot the computed value is cached UNDER, so binding one
	descriptor to two names is a TypeError in CPython: reads of the second
	name would keep recomputing, silently defeating the decorator.  Binding
	the same name on a DIFFERENT class is fine (and common)."

	| current new |
	new := name @env0:asString.
	current := self @env0:dynamicInstVarAt: #attrname.
	(current == nil or: [current == None]) ifTrue: [
		self @env0:dynamicInstVarAt: #attrname put: new @env0:asUnicodeString.
		^ None].
	(current @env0:asString @env0:= new) ifFalse: [
		TypeError ___signal___:
			('Cannot assign the same cached_property to two different names ('''
				@env0:, current @env0:asString @env0:, ''' and ''' @env0:, new
				@env0:, ''').')].
	^ None

]
