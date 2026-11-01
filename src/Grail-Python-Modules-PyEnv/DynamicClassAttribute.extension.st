Extension { #name : 'DynamicClassAttribute' }

{ #category : 'Grail-Private' }
DynamicClassAttribute >> ___getterIsAbstract___ [
	"``bool(getattr(fget, '__isabstractmethod__', False))'', as CPython's
	DynamicClassAttribute.__init__ spells it: the getter alone, where a
	property asks all three functions."

	fget == nil ifTrue: [^ false].
	^ ([fget ___pyAttrLoad___: #'__isabstractmethod__']
		@env0:on: AttributeError do: [:e | e @env0:return: false]) ___isTruthy___

]

{ #category : 'Grail-Private' }
DynamicClassAttribute >> ___pyPropInit___: fg _: fs _: fd _: dc [
	"CPython's DynamicClassAttribute.__init__ ends by computing
	``bool(getattr(fget, '__isabstractmethod__', False))'', so a getter whose
	__isabstractmethod__ refuses truth testing raises at construction
	(test_dynamicclassattribute test_property___isabstractmethod__descriptor),
	where a property raises only when asked.

	It is evaluated here and answered LIVE by __isabstractmethod__, not
	stored as CPython stores it: the descriptor of a declarative def is
	built while the class body runs, before Grail applies the def's inner
	decorators, so an ``@abc.abstractmethod'' under ``@DynamicClassAttribute''
	marks the getter only after a stored answer was taken."

	super ___pyPropInit___: fg _: fs _: fd _: dc.
	self ___getterIsAbstract___.
	^ self

]

{ #category : 'Grail-Descriptor Protocol' }
DynamicClassAttribute >> ___readOffClass___: aClass [
	"The class read of a declarative def: refused, as __get__ refuses it, and
	the refusal goes on to the metaclass's __getattr__ -- what the descriptor
	is for, in CPython's words ``virtual attributes on the class with the same
	name''.  A DynamicClassAttribute the body ASSIGNED gets that from the
	read's miss; this read had found the def's getter, so it never missed."

	^ [self __get__: None _: aClass]
		@env0:on: AttributeError
		do: [:refusal |
			(aClass ___grailMetaclassGetattr___: self ___propName___)
				@env0:ifNil: [refusal @env0:pass]
				ifNotNil: [:answer | refusal @env0:return: answer @env0:value]]

]

{ #category : 'Grail-Descriptor Protocol' }
DynamicClassAttribute >> __get__: instance _: owner [
	"Instance access runs the getter, exactly as a property does.  CLASS access
	is REFUSED -- that is the entire point of the descriptor, and the one place
	it parts company with its superclass, which answers the descriptor itself.

	The message is the one an ordinary missing attribute produces, because to
	the caller that is what this is: CPython's DynamicClassAttribute.__get__
	raises a bare AttributeError so the class's own __getattr__ gets its turn.

	Except for an ABSTRACT one, which a class read answers, as CPython's does:
	ABCMeta finds an inherited abstract attribute by reading it off the
	subclass (test_dynamicclassattribute test_abstract_virtual)."

	(instance == nil or: [instance == None]) ifTrue: [
		(self ___pyAttrLoad___: #'__isabstractmethod__') ___isTruthy___
			ifTrue: [^ self].
		^ AttributeError @env0:___signalMissing___: self ___propName___ @env0:asString
			on: owner].
	^ super __get__: instance _: owner

]

{ #category : 'Grail-Reflection' }
DynamicClassAttribute >> __isabstractmethod__ [
	"Whether the GETTER is an abstract method, as CPython's
	DynamicClassAttribute asks -- not any of the three functions, as a
	property does.  An outer ``@abc.abstractmethod'' stores the attribute on
	the descriptor itself, which is read before this method and so shadows it."

	^ self ___getterIsAbstract___

]
