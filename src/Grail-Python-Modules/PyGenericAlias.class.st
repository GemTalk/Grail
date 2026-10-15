"``types.GenericAlias' -- the result of subscripting a class that opts into
real parameterised generics.  Carries __origin__ / __args__ / __parameters__,
calls and proxies attribute reads through to its origin, and answers
(origin,) from __mro_entries__ so it can still be used as a base class."
Class {
	#name : 'PyGenericAlias',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PyGenericAlias class >> ___pythonValueAttrs___ [
	"All three are DATA in CPython, so a caller that reads them without
	calling must get the value rather than a bound method."

	^ IdentitySet new
		add: #'__origin__';
		add: #'__args__';
		add: #'__parameters__';
		add: #'__unpacked__';
		add: #'__typing_unpacked_tuple_args__';
		add: #'__dict__';
		yourself

]
