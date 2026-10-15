Extension { #name : 'KeyValueDictionary' }

{ #category : 'Grail-Introspection' }
KeyValueDictionary class >> ___pythonValueAttrs___ [
	"Selectors ___pyAttrLoad___ must treat as VALUE attribute reads rather
	than BoundMethod wraps.  Without this, ``obj.__dict__'' on a dict
	subclass answers a callable wrapper and ``.keys()'' on it fails."

	^ IdentitySet new
		add: #'__dict__';
		yourself

]
