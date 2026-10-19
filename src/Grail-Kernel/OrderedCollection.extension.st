Extension { #name : 'OrderedCollection' }

{ #category : 'Grail-Introspection' }
OrderedCollection class >> ___pythonValueAttrs___ [
	"Selectors ___pyAttrLoad___ must treat as VALUE attribute reads rather
	than BoundMethod wraps.  Without this, ``obj.__dict__'' on a list
	subclass answers a callable wrapper and ``.keys()'' on it fails."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]
