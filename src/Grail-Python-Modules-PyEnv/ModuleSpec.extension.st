Extension { #name : 'ModuleSpec' }

{ #category : 'Python-Initialization' }
ModuleSpec class >> __new__: aName _: aLoader [
	"``ModuleSpec(name, loader)'' -- CPython's signature, whose origin and
	submodule_search_locations are keyword-only with None defaults."

	^ self @env0:name: aName loader: aLoader origin: nil submoduleSearchLocations: nil

]

{ #category : 'Python-Initialization' }
ModuleSpec class >> __new__: aName _: aLoader _: anOrigin [
	"``ModuleSpec(name, loader, origin)''.  Origin is keyword-only in CPython
	(``origin=''), but Grail dispatches a class call by ARITY, so the positional
	form has to exist for the facade in importlib/__init__.py -- which called it
	positionally before this class existed."

	^ self @env0:name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: nil

]

{ #category : 'Python-Initialization' }
ModuleSpec class >> __new__: aName _: aLoader _: anOrigin _: locs [
	"``ModuleSpec(name, loader, origin, submodule_search_locations)''."

	^ self @env0:name: aName loader: aLoader origin: anOrigin submoduleSearchLocations: locs

]

{ #category : 'Grail-Python Protocol' }
ModuleSpec >> __repr__ [
	"CPython prints ``ModuleSpec(name='json', loader=..., origin='/path')'',
	and pydoc / test output reads it.  Omits the fields CPython omits when they
	are empty, so the common case is the short form."

	| out nm org |
	nm := self @env0:dynamicInstVarAt: #'name'.
	org := self @env0:dynamicInstVarAt: #'origin'.
	out := WriteStream @env0:on: String @env0:new.
	out @env0:nextPutAll: 'ModuleSpec(name='.
	out @env0:nextPutAll: nm @env0:printString.
	out @env0:nextPutAll: ', loader='.
	out @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'loader') @env0:printString.
	"EVERY SEND HERE IS ENV-QUALIFIED, and the three that were not made this
	method die rather than answer.  It is compiled in env 1, where
	``System myUserProfile'' is a MessageNotUnderstood sent to a Metaclass3 --
	and one Python code cannot catch, so repr() of any spec carrying an origin
	took the process down.  Every module Grail imports from a file has an
	origin, so this was every spec but the built-in ones."
	(org @env0:isNil @env0:or: [
		org @env0:== (System @env0:myUserProfile @env0:symbolList
			@env0:objectNamed: #'None')])
		@env0:ifFalse: [
			out @env0:nextPutAll: ', origin='.
			out @env0:nextPutAll: org @env0:printString].
	out @env0:nextPutAll: ')'.
	^ out @env0:contents

]
