Class {
	#name : 'BuiltinExtrasTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
BuiltinExtrasTestCase >> loadFixture: fixtureName [
	"Same caching pattern as FlaskScaffoldingTestCase >> loadFixture:."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	cached := mods at: fullName asSymbol ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	(mods includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName

]

{ #category : 'Grail-Tests - ascii' }
BuiltinExtrasTestCase >> testAsciiEscapesNonAscii [
	"ascii() == repr() plus \\xHH / \\uHHHH escapes."

	| result |
	result := self eval: 'plain = ascii("abc")
acc = ascii("caf" + chr(233))
pi = ascii(chr(960))
(plain == "''abc''" and acc == "''caf\\xe9''" and pi == "''\\u03c0''")'.
	self assert: result

]

{ #category : 'Grail-Tests - ascii' }
BuiltinExtrasTestCase >> testAsciiOnContainers [
	| result |
	result := self eval: 'ascii([1, "caf" + chr(233)]) == "[1, ''caf\\xe9'']"'.
	self assert: result

]

{ #category : 'Grail-Tests - filter' }
BuiltinExtrasTestCase >> testFilterLambdaAndIterChaining [
	"filter answers an iterator: next() works and it composes."

	| result |
	result := self eval: 'it = filter(lambda v: v % 2 == 0, range(7))
first = next(it)
rest = list(it)
first == 0 and rest == [2, 4, 6]'.
	self assert: result

]

{ #category : 'Grail-Tests - filter' }
BuiltinExtrasTestCase >> testFilterNoneKeepsTruthy [
	| result |
	result := self eval: 'list(filter(None, [0, 1, "", "x", None, [], [2]])) == [1, "x", [2]]'.
	self assert: result

]

{ #category : 'Grail-Tests - filter' }
BuiltinExtrasTestCase >> testFilterWithFunction [
	| result |
	result := self eval: 'def big(x):
    return x > 2
list(filter(big, [1, 2, 3, 4])) == [3, 4]'.
	self assert: result

]

{ #category : 'Grail-Tests - help' }
BuiltinExtrasTestCase >> testHelpReturnsNone [
	"help() and help(obj) print and answer None — minimal stub."

	| result |
	result := self eval: 'help(len) is None and help() is None'.
	self assert: result

]

{ #category : 'Grail-Tests - vars' }
BuiltinExtrasTestCase >> testVarsOnInstance [
	| mod |
	mod := self loadFixture: 'vars_fixture'.
	self assert: mod @env1:vars_facts

]

{ #category : 'Grail-Tests - vars' }
BuiltinExtrasTestCase >> testVarsOnUnsupportedRaises [
	self
		should: [self eval: 'vars(5)']
		raise: TypeError

]

{ #category : 'Grail-Tests - vars' }
BuiltinExtrasTestCase >> testVarsZeroArgIsLocals [
	| mod |
	mod := self loadFixture: 'vars_fixture'.
	self assert: mod @env1:vars_zero_arg_is_locals

]
