Extension { #name : 'SymbolDictionary' }

{ #category : 'Grail-Subscript Protocol' }
SymbolDictionary >> __getitem__: key [
	"Return the value for key. Raises KeyError if key is not in the dictionary"

	^ super __getitem__: (key @env0:asSymbol)

]

{ #category : 'Grail-Subscript Protocol' }
SymbolDictionary >> __setitem__: key _: value [
	"Set d[key] to value"

	super __setitem__: (key @env0:asSymbol) _: value.
	"Resolve None from the calling session's symbol list -- this shared method
	 (SymbolDictionary is a restrictedClass) must not bind to the install user's None."
	^ System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'None'

]
