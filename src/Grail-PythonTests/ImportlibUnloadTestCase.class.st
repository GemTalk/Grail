Class {
	#name : 'ImportlibUnloadTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - C Extension Loading' }
ImportlibUnloadTestCase >> testReloadReThenCallableSubWorks [
	"Regression: import re, fully unload it, then re-import and run a callable
	re.sub.  Before the removeModule: + atomic-rebuild fix, the reload left re
	half-built and the sub raised ``NameError: name 'RegexFlag' is not
	defined''."

	| mod |
	self eval: 'import re'.
	importlib removeModule: 're'.
	importlib @env1:modules removeKey: #'re_sub_callable' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/re_sub_callable.py')
		name: 're_sub_callable'.
	self assert: (mod @env1:sub_str_callable) equals: 'aXbXc'.

]

{ #category : 'Grail-Tests - C Extension Loading' }
ImportlibUnloadTestCase >> testRemoveModuleClearsSessionCaches [
	"re's pattern cache is a SessionDict living in SessionTemps under the key
	``___GrailSessionDict___re._cache''.  Because it is NOT stored on the
	module instance, a raw removeKey: would leave it behind and a re-import
	would re-bind ``_cache'' to the same stale dict.  removeModule: clears it."

	| temps key |
	self eval: 'import re
re.compile("xyz")'.
	temps := SessionTemps current.
	key := #'___GrailSessionDict___re._cache'.
	self assert: (temps at: key ifAbsent: [nil]) notNil.
	importlib removeModule: 're'.
	self assert: (temps at: key ifAbsent: [nil]) isNil.

]

{ #category : 'Grail-Tests - C Extension Loading' }
ImportlibUnloadTestCase >> testRemoveModuleUnloadsSubmodules [
	"removeModule: removes the package AND every submodule, so a partially
	loaded ``re'' subtree can never linger and shadow a fresh import."

	self eval: 'import re
re.compile("abc")'.
	self assert: (importlib @env1:lookupModule: 're') notNil.
	self assert: (importlib @env1:lookupModule: 're._parser') notNil.
	importlib removeModule: 're'.
	self assert: (importlib @env1:lookupModule: 're') isNil.
	self assert: (importlib @env1:lookupModule: 're._parser') isNil.

]
