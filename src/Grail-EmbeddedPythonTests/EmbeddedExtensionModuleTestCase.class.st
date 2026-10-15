"Exercises the EmbeddedExtensionModule + CPythonObjectForwarder hand-off
against CPython's bundled _sre C extension. Each test re-imports
_sre through importlib so the routing arm in ___import__:kw: is
exercised end-to-end."
Class {
	#name : 'EmbeddedExtensionModuleTestCase',
	#superclass : 'CPythonTestCase',
	#instVars : [
		'sreModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
EmbeddedExtensionModuleTestCase >> abcCompileArguments [
	"Argument list for _sre.compile of the pattern 'abc' (no capture groups):
	pattern string, flags, bytecode, group count, group index, index-to-group."

	^ {
		'abc'.
		32.
		(OrderedCollection withAll: #(14 12 3 3 3 3 3 97 98 99 0 0 0 16 97 16 98 16 99 1)).
		0.
		KeyValueDictionary new.
		(Array with: nil)
	}

]

{ #category : 'Grail-Helpers' }
EmbeddedExtensionModuleTestCase >> importSre [

	^ importlib @env1:instance @env1:___import__: { '_sre' } kw: nil

]

{ #category : 'Grail-Setup' }
EmbeddedExtensionModuleTestCase >> setUp [

	super setUp.
	"Drop any cached _sre so each test re-exercises the routing arm."
	sys @env1:modules removeKey: #'_sre' ifAbsent: [].
	sreModule := self importSre.

]

{ #category : 'Grail-Helpers' }
EmbeddedExtensionModuleTestCase >> sreCall: attrName with: positional [
	"Two-step ___pyAttrLoad___: + value:value: shape emitted by
	CallAst for obj.attr(args)."

	| forwarder |
	forwarder := sreModule @env1:___pyAttrLoad___: attrName.
	^ forwarder @env1:value: positional value: nil

]

{ #category : 'Tests - Attribute Load' }
EmbeddedExtensionModuleTestCase >> testAttributeLoadReturnsForwarder [

	| forwarder |
	forwarder := sreModule @env1:___pyAttrLoad___: #'ascii_iscased'.

	self assert: (forwarder isKindOf: CPythonObjectForwarder).
	self assert: forwarder isCallable.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testCallMarshalsFalseResult [
	"_sre.ascii_iscased(48): '0' is not cased, marshals Python False to false."

	self assert: (self sreCall: #'ascii_iscased' with: #( 48 )) equals: false.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testCallMarshalsIntegerArgumentAndResult [
	"_sre.ascii_tolower(65): 'A' to 'a', passes an int through and back."

	self assert: (self sreCall: #'ascii_tolower' with: #( 65 )) equals: 97.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testCallMarshalsTrueResult [
	"_sre.ascii_iscased(65): 'A' is cased, marshals Python True to true."

	self assert: (self sreCall: #'ascii_iscased' with: #( 65 )) equals: true.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testCallViaDoesNotUnderstand [
	"A bare callable selector routes through doesNotUnderstand: and the
	shared dispatcher, invoking the underlying function."

	self assert: sreModule @env1:getcodesize equals: 4.
	self assert: (sreModule @env1:ascii_iscased: 65) equals: true.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testCallViaPerformEnv [
	"Explicit perform:env:withArguments: lands in cantPerform:withArguments:env:,
	not doesNotUnderstand:args:envId:.  The mirror must route it through the
	shared CPython dispatcher rather than inheriting module's dict-only
	cantPerform: (which would raise MNU)."

	self assert: (sreModule perform: #'getcodesize' env: 1 withArguments: #()) equals: 4.
	self assert: (sreModule perform: #'ascii_iscased:' env: 1 withArguments: #( 65 )) equals: true.

]

{ #category : 'Tests - Attribute Load' }
EmbeddedExtensionModuleTestCase >> testForwardedCallableInvokedWithPositionalArgs [

	| forwarder result |
	forwarder := sreModule @env1:___pyAttrLoad___: #'ascii_iscased'.

	result := forwarder @env1:value: #( 65 ) value: nil.

	self assert: result equals: true.

]

{ #category : 'Tests - Import' }
EmbeddedExtensionModuleTestCase >> testImportSreReturnsEmbeddedExtensionModule [

	self assert: (sreModule isKindOf: EmbeddedExtensionModule).
	self assert: sreModule @env1:__name__ equals: '_sre'.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testNoArgCallForwardsAndMarshalsInteger [
	"_sre.getcodesize() takes no arguments; its int result marshals back."

	self assert: (self sreCall: #'getcodesize' with: #()) equals: 4.

]

{ #category : 'Tests - Attribute Load' }
EmbeddedExtensionModuleTestCase >> testNonReplicableReturnYieldsForwarder [
	"_sre.compile returns a re.Pattern: non-replicable type that
	comes back as a CPythonObjectForwarder."

	| compileFunction result |
	compileFunction := sreModule @env1:___pyAttrLoad___: #'compile'.

	result := compileFunction @env1:value: self abcCompileArguments value: nil.

	self assert: (result isKindOf: CPythonObjectForwarder)

]

{ #category : 'Tests - Import' }
EmbeddedExtensionModuleTestCase >> testRegisteredInSysModules [

	| secondImport |
	secondImport := self importSre.

	self assert: secondImport == sreModule
		description: 'Second import should return the cached instance from sys.modules'.

]

{ #category : 'Tests - Calls' }
EmbeddedExtensionModuleTestCase >> testUnicodeVariantFunctionAlsoForwards [
	"The unicode_* family routes through the same path: unicode_tolower(65) -> 97."

	self assert: (self sreCall: #'unicode_tolower' with: #( 65 )) equals: 97.

]

{ #category : 'Tests - Import' }
EmbeddedExtensionModuleTestCase >> testUnknownModuleRaisesNotFound [

	self should: [
		importlib @env1:instance @env1:___import__: { '_definitely_not_a_module_xyz' } kw: nil
	] raise: ModuleNotFoundError.

]
