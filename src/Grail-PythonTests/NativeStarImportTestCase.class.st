Class {
	#name : 'NativeStarImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NativeStarImportTestCase >> resultAt: aKey [
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
NativeStarImportTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'native_star_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/native_star_import.py')
		name: 'native_star_import'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'

]

{ #category : 'Grail-Tests' }
NativeStarImportTestCase >> testConstantsAndClassesStillComeAcross [
	"Controls for the two walks that already worked.  A fix to the method walk
	must not disturb the data walks it sits beside."

	self assert: (self resultAt: 'constants_still_come_across') equals: 'True'.
	self assert: (self resultAt: 'socket_type_still_comes_across') equals: 'True'.
	self assert: (self resultAt: 'error_alias_still_comes_across') equals: 'True'.

]

{ #category : 'Grail-Tests' }
NativeStarImportTestCase >> testFunctionsComeAcross [
	"THE BUG.  Every one of these was missing from the importing namespace,
	while the constants beside them arrived intact."

	self assert: (self resultAt: 'gethostname_is_callable') equals: 'True'.
	self assert: (self resultAt: 'getdefaulttimeout_came_across') equals: 'True'.
	self assert: (self resultAt: 'htons_came_across') equals: 'True'.
	self assert: (self resultAt: 'ntohs_came_across') equals: 'True'.

]

{ #category : 'Grail-Tests' }
NativeStarImportTestCase >> testFunctionsOfEveryArityComeAcross [
	"inet_aton takes one argument and inet_ntoa another; the selector-to-name
	derivation has to handle the colon forms, not just unary selectors."

	self assert: (self resultAt: 'inet_aton_came_across') equals: 'True'.
	self assert: (self resultAt: 'inet_ntoa_came_across') equals: 'True'.

]

{ #category : 'Grail-Tests' }
NativeStarImportTestCase >> testPrivateNamesStayOut [
	"``import *'' publishes public names only.  The method walk applies the
	same underscore rule the data walks do -- and it has more to exclude, since
	a native module's internal helpers are methods too."

	self assert: (self resultAt: 'private_names_stay_out') equals: 'True'.

]
