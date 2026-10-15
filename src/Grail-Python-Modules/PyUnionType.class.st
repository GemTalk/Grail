"PEP 604 union of types -- what ``int | str' evaluates to, CPython's
types.UnionType.  Carries __args__; flattens nested unions, as CPython does, so
``a | b | c' has three args rather than a union holding a union."
Class {
	#name : 'PyUnionType',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PyUnionType class >> ___pythonValueAttrs___ [
	"__args__ and __parameters__ are DATA, as on an alias -- and so are the
	three names the union reports for itself."
	^ IdentitySet new
		add: #'__args__';
		add: #'__parameters__';
		add: #'__origin__';
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__dict__';
		yourself

]
