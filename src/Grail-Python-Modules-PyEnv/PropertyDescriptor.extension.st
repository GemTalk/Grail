Extension { #name : 'PropertyDescriptor' }

{ #category : 'Grail-Attribute Protocol' }
PropertyDescriptor >> ___pyAttrStore___: aName put: aValue [
	"CPython's property has no __dict__: its only writable attributes are
	``__doc__'' and ``__name__'', and any other store is ``'property' object
	has no attribute 'x' and no __dict__ for setting new attributes''.
	typing.override depends on exactly that refusal -- ``@override @property''
	tries ``prop.__override__ = True'' and swallows the AttributeError, so the
	mark lands nowhere (test_typing OverrideDecoratorTests.test_property).

	Only the builtin itself: a Python subclass of property has a __dict__, as
	it does upstream.  Grail's internal ``___'' names pass, as they do on the
	other attribute-less objects (see NoneType >> ___pyAttrStore___:put:)."

	| s |
	self @env0:class == PropertyDescriptor
		ifFalse: [^ super ___pyAttrStore___: aName put: aValue].
	s := aName @env0:asString.
	((s @env0:= '__doc__') @env0:or: [(s @env0:= '__name__')
		@env0:or: [s @env0:size @env0:>= 3
			@env0:and: [(s @env0:copyFrom: 1 to: 3) @env0:= '___']]])
		ifTrue: [^ super ___pyAttrStore___: aName put: aValue].
	^ AttributeError @env0:___signalNoDict___: aName on: self

]
