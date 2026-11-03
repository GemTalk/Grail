Class {
	#name : 'UnboundStrMethodsOnSurrogatesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnboundStrMethodsOnSurrogatesTestCase >> testStrMethodsThroughTheTypeTakeASurrogateString [
	"tests/python/unbound_str_methods_on_surrogates.py: str's methods called
	through the type -- str.islower(s), str.replace(s, ...) -- answer for a
	str holding lone surrogates what the bound call answers, not a
	MessageNotUnderstood that ends the session, and a str subclass's own def
	still runs.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unbound_str_methods_on_surrogates' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbound_str_methods_on_surrogates.py')
		name: 'unbound_str_methods_on_surrogates'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
